const DB_NAME = "nexus-trusted-device";
const STORE_NAME = "keys";

function getDeviceKeyId(userId) {
  if (!userId) {
    throw new Error("User ID is required for trusted-device access.");
  }

  return `device-key:${userId}`;
}

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function storeValue(key, value) {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).put(value, key);

    transaction.oncomplete = () => {
      db.close();
      resolve();
    };

    transaction.onerror = () => {
      db.close();
      reject(transaction.error);
    };
  });
}

async function readValue(key) {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readonly");
    const request = transaction.objectStore(STORE_NAME).get(key);

    request.onsuccess = () => {
      db.close();
      resolve(request.result);
    };

    request.onerror = () => {
      db.close();
      reject(request.error);
    };
  });
}

export async function getOrCreateDeviceKey(userId) {
  if (!globalThis.crypto?.subtle || !globalThis.indexedDB) {
    throw new Error("Trusted-device storage is unavailable in this browser.");
  }

  const keyId = getDeviceKeyId(userId);
  let key = await readValue(keyId);

  if (!key) {
    key = await crypto.subtle.generateKey(
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"]
    );

    await storeValue(keyId, key);
  }

  return key;
}

export async function protectForTrustedDevice(userId, value) {
  if (!userId || typeof value !== "string" || !value) {
    throw new Error("User ID and private key are required.");
  }

  const key = await getOrCreateDeviceKey(userId);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plaintext = new TextEncoder().encode(value);
  const additionalData = new TextEncoder().encode(`NEXUS:${userId}`);

  try {
    const ciphertext = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv, additionalData },
      key,
      plaintext
    );

    return {
      userId,
      iv: Array.from(iv),
      ciphertext: Array.from(new Uint8Array(ciphertext)),
    };
  } finally {
    plaintext.fill(0);
    additionalData.fill(0);
  }
}

export async function unlockForTrustedDevice(userId, protectedValue) {
  if (
    !userId ||
    protectedValue?.userId !== userId ||
    !Array.isArray(protectedValue.iv) ||
    protectedValue.iv.length !== 12 ||
    !Array.isArray(protectedValue.ciphertext) ||
    protectedValue.ciphertext.length === 0
  ) {
    throw new Error("Trusted-device data is invalid or belongs to another account.");
  }

  const key = await readValue(getDeviceKeyId(userId));

  if (!key) {
    throw new Error("This device has not been trusted for this account.");
  }

  const iv = new Uint8Array(protectedValue.iv);
  const ciphertext = new Uint8Array(protectedValue.ciphertext);
  const additionalData = new TextEncoder().encode(`NEXUS:${userId}`);

  try {
    const plaintext = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv, additionalData },
      key,
      ciphertext
    );

    try {
      return new TextDecoder().decode(plaintext);
    } finally {
      new Uint8Array(plaintext).fill(0);
    }
  } catch {
    throw new Error("Unable to unlock this account on the trusted device.");
  } finally {
    additionalData.fill(0);
  }
}

export async function forgetTrustedDevice(userId) {
  const keyId = getDeviceKeyId(userId);
  const vaultId = `trusted-vault:${userId}`;

  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);

    store.delete(keyId);
    store.delete(vaultId);

    transaction.oncomplete = () => {
      db.close();
      resolve();
    };

    transaction.onerror = () => {
      db.close();
      reject(transaction.error);
    };

    transaction.onabort = () => {
      db.close();
      reject(transaction.error || new Error("Unable to untrust this device."));
    };
  });
}

export async function saveTrustedDeviceVault(userId, protectedVault) {
  if (!userId || !protectedVault) {
    throw new Error("User ID and protected vault are required.");
  }

  const storageKey = `trusted-vault:${userId}`;

  await storeValue(storageKey, protectedVault);
}

export async function getTrustedDeviceVault(userId) {
  if (!userId) {
    throw new Error("User ID is required.");
  }

  return readValue(`trusted-vault:${userId}`);
}

export async function removeTrustedDeviceVault(userId) {
  if (!userId) {
    throw new Error("User ID is required.");
  }

  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).delete(`trusted-vault:${userId}`);

    transaction.oncomplete = () => {
      db.close();
      resolve();
    };

    transaction.onerror = () => {
      db.close();
      reject(transaction.error);
    };
  });
}

export async function hasTrustedDevice(userId) {
  if (!userId) {
    return false;
  }

  const [deviceKey, protectedVault] = await Promise.all([
    readValue(getDeviceKeyId(userId)),
    readValue(`trusted-vault:${userId}`),
  ]);

  return Boolean(deviceKey && protectedVault);
}

export function validateTrustedVault(userId, trustedVault) {
  if (
    typeof userId !== "string" ||
    !userId ||
    !trustedVault ||
    trustedVault.userId !== userId ||
    typeof trustedVault.publicKey !== "string" ||
    !trustedVault.publicKey ||
    !trustedVault.protectedValue ||
    trustedVault.protectedValue.userId !== userId
  ) {
    return false;
  }

  const { iv, ciphertext } = trustedVault.protectedValue;

  if (
    !Array.isArray(iv) ||
    iv.length !== 12 ||
    !iv.every(
      (byte) => Number.isInteger(byte) && byte >= 0 && byte <= 255
    )
  ) {
    return false;
  }

  if (
    !Array.isArray(ciphertext) ||
    ciphertext.length === 0 ||
    !ciphertext.every(
      (byte) => Number.isInteger(byte) && byte >= 0 && byte <= 255
    )
  ) {
    return false;
  }

  return true;
}