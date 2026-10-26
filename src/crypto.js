import sodium from "libsodium-wrappers-sumo";

const VAULT_KEY = "nexus_encrypted_keypair";

export function getVaultStorageKey(userId) {
  if (!userId) {
    throw new Error("User ID is required to access the key vault.");
  }

  return `${VAULT_KEY}:${userId}`;
}

export async function generateKeyPair() {
  await sodium.ready;

  const encryptionKeys = sodium.crypto_box_keypair();
  const signingKeys = sodium.crypto_sign_keypair();

  try {
    return {
      publicKey: sodium.to_base64(encryptionKeys.publicKey),
      privateKey: sodium.to_base64(encryptionKeys.privateKey),
      signingPublicKey: sodium.to_base64(signingKeys.publicKey),
      signingPrivateKey: sodium.to_base64(signingKeys.privateKey),
    };
  } finally {
    sodium.memzero(encryptionKeys.privateKey);
    sodium.memzero(signingKeys.privateKey);
  }
}

export async function saveKeyPair(keyPair, passphrase, userId) {
  await sodium.ready;

  if (!userId) {
    throw new Error("User ID is required to save the key vault.");
  }

  if (!passphrase || passphrase.length < 12) {
    throw new Error("Use a passphrase of at least 12 characters.");
  }

  if (
    !keyPair.publicKey ||
    !keyPair.privateKey ||
    !keyPair.signingPublicKey ||
    !keyPair.signingPrivateKey
  ) {
    throw new Error("Both encryption and signing keys are required.");
  }

  const salt = sodium.randombytes_buf(16);
  const nonce = sodium.randombytes_buf(
    sodium.crypto_secretbox_NONCEBYTES
  );

  const vaultKey = sodium.crypto_pwhash(
    sodium.crypto_secretbox_KEYBYTES,
    passphrase,
    salt,
    sodium.crypto_pwhash_OPSLIMIT_INTERACTIVE,
    sodium.crypto_pwhash_MEMLIMIT_INTERACTIVE,
    sodium.crypto_pwhash_ALG_ARGON2ID13
  );

  const privateKeyBytes = sodium.from_base64(keyPair.privateKey);
  const signingPrivateKeyBytes = sodium.from_base64(
    keyPair.signingPrivateKey
  );

  try {
    const privateKeys = JSON.stringify({
      privateKey: keyPair.privateKey,
      signingPrivateKey: keyPair.signingPrivateKey,
    });

    const privateKeysBytes = sodium.from_string(privateKeys);

    try {
      const ciphertext = sodium.crypto_secretbox_easy(
        privateKeysBytes,
        nonce,
        vaultKey
      );

      const vault = {
        userId,
        publicKey: keyPair.publicKey,
        signingPublicKey: keyPair.signingPublicKey,
        ciphertext: sodium.to_base64(ciphertext),
        salt: sodium.to_base64(salt),
        nonce: sodium.to_base64(nonce),
        version: 2,
      };

      localStorage.setItem(
        getVaultStorageKey(userId),
        JSON.stringify(vault)
      );
    } finally {
      sodium.memzero(privateKeysBytes);
    }
  } finally {
    sodium.memzero(vaultKey);
    sodium.memzero(privateKeyBytes);
    sodium.memzero(signingPrivateKeyBytes);
  }
}

export async function unlockKeyPair(passphrase, userId) {
  await sodium.ready;

  if (!userId) {
    throw new Error("User ID is required to unlock the key vault.");
  }

  if (!passphrase) {
    throw new Error("Enter your vault passphrase.");
  }

  const accountVaultKey = getVaultStorageKey(userId);
  const accountStored = localStorage.getItem(accountVaultKey);
  const legacyStored = localStorage.getItem(VAULT_KEY);

  const usingLegacy = !accountStored && Boolean(legacyStored);
  const stored = accountStored || legacyStored;

  if (!stored) {
    throw new Error("No saved NEXUS key vault found for this account.");
  }

  let vault;

  try {
    vault = JSON.parse(stored);
  } catch {
    throw new Error("The saved key vault is corrupted.");
  }

  if (!usingLegacy && vault.userId !== userId) {
    throw new Error("This vault belongs to a different account.");
  }

  if (!vault.publicKey || !vault.ciphertext || !vault.salt || !vault.nonce) {
    throw new Error("The saved key vault is incomplete.");
  }

  const salt = sodium.from_base64(vault.salt);
  const nonce = sodium.from_base64(vault.nonce);
  const ciphertext = sodium.from_base64(vault.ciphertext);

  const vaultKey = sodium.crypto_pwhash(
    sodium.crypto_secretbox_KEYBYTES,
    passphrase,
    salt,
    sodium.crypto_pwhash_OPSLIMIT_INTERACTIVE,
    sodium.crypto_pwhash_MEMLIMIT_INTERACTIVE,
    sodium.crypto_pwhash_ALG_ARGON2ID13
  );

  let decryptedBytes;

  try {
    try {
      decryptedBytes = sodium.crypto_secretbox_open_easy(
        ciphertext,
        nonce,
        vaultKey
      );
    } catch {
      throw new Error("Incorrect passphrase or corrupted key vault.");
    }

    let privateKey;
    let signingPrivateKey;
    let signingPublicKey = vault.signingPublicKey || null;
    const needsVaultUpgrade = vault.version !== 2;

    if (vault.version === 2) {
      let privateKeys;

      try {
        privateKeys = JSON.parse(sodium.to_string(decryptedBytes));
      } catch {
        throw new Error("The saved key vault is corrupted.");
      }

      privateKey = privateKeys.privateKey;
      signingPrivateKey = privateKeys.signingPrivateKey;

      if (!privateKey || !signingPrivateKey || !vault.signingPublicKey) {
        throw new Error("The saved signing key vault is incomplete.");
      }
    } else {
      // Preserve the existing encryption key and add a signing key pair.
      privateKey = sodium.to_base64(decryptedBytes);

      const signingKeys = sodium.crypto_sign_keypair();

      try {
        signingPublicKey = sodium.to_base64(signingKeys.publicKey);
        signingPrivateKey = sodium.to_base64(signingKeys.privateKey);
      } finally {
        sodium.memzero(signingKeys.publicKey);
        sodium.memzero(signingKeys.privateKey);
      }
    }

    const privateKeyBytes = sodium.from_base64(privateKey);

    try {
      const derivedPublicKey = sodium.crypto_scalarmult_base(
        privateKeyBytes
      );

      try {
        if (sodium.to_base64(derivedPublicKey) !== vault.publicKey) {
          throw new Error(
            "The decrypted private key does not match this vault's public key."
          );
        }
      } finally {
        sodium.memzero(derivedPublicKey);
      }
    } finally {
      sodium.memzero(privateKeyBytes);
    }

    if (signingPrivateKey && signingPublicKey) {
      const signingPrivateKeyBytes = sodium.from_base64(signingPrivateKey);

      try {
        const derivedSigningPublicKey = sodium.crypto_sign_ed25519_sk_to_pk(
          signingPrivateKeyBytes
        );

        try {
          if (
            sodium.to_base64(derivedSigningPublicKey) !== signingPublicKey
          ) {
            throw new Error(
              "The signing private key does not match this vault's public key."
            );
          }
        } finally {
          sodium.memzero(derivedSigningPublicKey);
        }
      } finally {
        sodium.memzero(signingPrivateKeyBytes);
      }
    }

    const keyPair = {
      publicKey: vault.publicKey,
      privateKey,
      signingPublicKey,
      signingPrivateKey,
      needsVaultUpgrade,
    };

    // Migrate only after successful decryption and verification.
    if (usingLegacy) {
      localStorage.setItem(
        accountVaultKey,
        JSON.stringify({
          ...vault,
          userId,
        })
      );
    }

    return keyPair;
  } finally {
    if (decryptedBytes) {
      sodium.memzero(decryptedBytes);
    }

    sodium.memzero(vaultKey);
    sodium.memzero(salt);
    sodium.memzero(nonce);
    sodium.memzero(ciphertext);
  }
}

export async function testKeyVault() {
    const passphrase = "NEXUS-demo-passphrase-2026!";

    const original = await generateKeyPair();

    await saveKeyPair(original, passphrase);

    const restored = await unlockKeyPair(passphrase);

    if (
        original.publicKey !== restored.publicKey ||
        original.privateKey !== restored.privateKey
    ) {
        throw new Error("Key vault verification failed.");
    }

    try {
        await unlockKeyPair("wrong-passphrase");
        throw new Error("Vault incorrectly accepted a wrong passphrase.");
    } catch (error) {
        if (error.message === "Vault incorrectly accepted a wrong passphrase.") {
            throw error;
        }
    }
    return true;
}

export async function signMessage(plaintext, signingPrivateKey) {
  await sodium.ready;

  if (typeof plaintext !== "string" || plaintext.length === 0) {
    throw new Error("Message cannot be empty.");
  }

  if (typeof signingPrivateKey !== "string") {
    throw new Error("Your signing key is missing.");
  }

  const privateKeyBytes = sodium.from_base64(signingPrivateKey);
  const messageBytes = sodium.from_string(plaintext);

  try {
    if (
      privateKeyBytes.length !== sodium.crypto_sign_SECRETKEYBYTES
    ) {
      throw new Error("Your signing private key is invalid.");
    }

    const signature = sodium.crypto_sign_detached(
      messageBytes,
      privateKeyBytes
    );

    return sodium.to_base64(signature);
  } finally {
    sodium.memzero(privateKeyBytes);
    sodium.memzero(messageBytes);
  }
}

export async function verifyMessageSignature(
  plaintext,
  signatureBase64,
  signingPublicKey
) {
  await sodium.ready;

  if (
    typeof plaintext !== "string" ||
    typeof signatureBase64 !== "string" ||
    typeof signingPublicKey !== "string"
  ) {
    return false;
  }

  let messageBytes;
  let signatureBytes;
  let publicKeyBytes;

  try {
    messageBytes = sodium.from_string(plaintext);
    signatureBytes = sodium.from_base64(signatureBase64);
    publicKeyBytes = sodium.from_base64(signingPublicKey);

    if (
      signatureBytes.length !== sodium.crypto_sign_BYTES ||
      publicKeyBytes.length !== sodium.crypto_sign_PUBLICKEYBYTES
    ) {
      return false;
    }

    return sodium.crypto_sign_verify_detached(
      signatureBytes,
      messageBytes,
      publicKeyBytes
    );
  } catch {
    return false;
  } finally {
    if (messageBytes) sodium.memzero(messageBytes);
    if (signatureBytes) sodium.memzero(signatureBytes);
    if (publicKeyBytes) sodium.memzero(publicKeyBytes);
  }
}

export async function encryptMessageForRecipient(
  plaintext,
  recipientPublicKey
) {
  await sodium.ready;

  if (typeof plaintext !== "string" || plaintext.length === 0) {
    throw new Error("Message cannot be empty.");
  }

  if (typeof recipientPublicKey !== "string") {
    throw new Error("Recipient public key is missing.");
  }

  const messageBytes = sodium.from_string(plaintext);
  const publicKeyBytes = sodium.from_base64(recipientPublicKey);

  if (publicKeyBytes.length !== sodium.crypto_box_PUBLICKEYBYTES) {
    throw new Error("Recipient public key is invalid.");
  }

  try {
    const ciphertext = sodium.crypto_box_seal(
      messageBytes,
      publicKeyBytes
    );

    return {
      content: sodium.to_base64(ciphertext),
      encryption: {
        algorithm: "crypto_box_seal",
        nonce: null,
        version: 1,
      },
    };
  } finally {
    sodium.memzero(messageBytes);
  }
}

export async function decryptMessageForMe(
  encryptedContent,
  encryptionKeyPair
) {
  await sodium.ready;

  if (
    !encryptionKeyPair?.publicKey ||
    !encryptionKeyPair?.privateKey
  ) {
    throw new Error("Your encryption vault is locked.");
  }

  const publicKey = sodium.from_base64(encryptionKeyPair.publicKey);
  const privateKey = sodium.from_base64(encryptionKeyPair.privateKey);

  // Verify that the public and private keys belong together.
  const derivedPublicKey = sodium.crypto_scalarmult_base(privateKey);

  try {
    const keysMatch =
      derivedPublicKey.length === publicKey.length &&
      derivedPublicKey.every((byte, index) => byte === publicKey[index]);

    if (!keysMatch) {
      throw new Error("Your encryption key pair does not match.");
    }
  } finally {
    sodium.memzero(derivedPublicKey);
  }

  const ciphertext = sodium.from_base64(encryptedContent);

  try {
    const plaintextBytes = sodium.crypto_box_seal_open(
      ciphertext,
      publicKey,
      privateKey
    );

    try {
      return sodium.to_string(plaintextBytes);
    } finally {
      sodium.memzero(plaintextBytes);
    }
  } catch {
    throw new Error(
      "Unable to decrypt this message with your current key."
    );
  } finally {
    sodium.memzero(privateKey);
  }
}

export async function testEncryptionRoundTrip(publicKeyBase64, privateKeyBase64) {
  await sodium.ready;

  const testText = "NEXUS encryption test";
  const publicKey = sodium.from_base64(publicKeyBase64);
  const privateKey = sodium.from_base64(privateKeyBase64);

  try {
    const ciphertext = sodium.crypto_box_seal(
      sodium.from_string(testText),
      publicKey
    );

    const decrypted = sodium.crypto_box_seal_open(
      ciphertext,
      publicKey,
      privateKey
    );

    sodium.memzero(decrypted);
  } catch (error) {
    console.error("Encryption round-trip failed:", error);
  } finally {
    sodium.memzero(privateKey);
  }
}

export function getEncryptedVaultForUser(userId) {
  if (!userId) {
    throw new Error("User ID is required to access the key vault.");
  }

  const stored = localStorage.getItem(getVaultStorageKey(userId));

  if (!stored) {
    throw new Error("No account-specific key vault was found.");
  }

  let vault;

  try {
    vault = JSON.parse(stored);
  } catch {
    throw new Error("The saved key vault is corrupted.");
  }

  if (
    vault.userId !== userId ||
    !vault.publicKey ||
    !vault.ciphertext ||
    !vault.salt ||
    !vault.nonce
  ) {
    throw new Error("The saved key vault is incomplete or belongs to another account.");
  }

  return vault;
}

export async function restoreTrustedKeyPair(userId, trustedVault) {
  await sodium.ready;

  if (
    !userId ||
    trustedVault?.userId !== userId ||
    typeof trustedVault.publicKey !== "string" ||
    !trustedVault.protectedValue
  ) {
    throw new Error(
      "Trusted-device data is invalid or belongs to another account."
    );
  }

  const { unlockForTrustedDevice } = await import("./trustedDevice.js");

  const restoredValue = await unlockForTrustedDevice(
    userId,
    trustedVault.protectedValue
  );

  let restored;

  try {
    restored = JSON.parse(restoredValue);
  } catch {
    // Older trusted-device entries stored only the encryption private key.
    throw new Error(
      "This trusted-device vault needs your vault passphrase. Unlock it manually to upgrade."
    );
  }

  const { privateKey, signingPrivateKey } = restored;

  if (
    typeof privateKey !== "string" ||
    typeof signingPrivateKey !== "string" ||
    typeof trustedVault.signingPublicKey !== "string"
  ) {
    throw new Error(
      "Trusted-device signing keys are incomplete. Unlock with your vault passphrase."
    );
  }

  const encryptionPrivateBytes = sodium.from_base64(privateKey);
  const signingPrivateBytes = sodium.from_base64(signingPrivateKey);

  try {
    const encryptionPublicBytes =
      sodium.crypto_scalarmult_base(encryptionPrivateBytes);

    try {
      if (
        sodium.to_base64(encryptionPublicBytes) !== trustedVault.publicKey
      ) {
        throw new Error("Trusted-device encryption key verification failed.");
      }
    } finally {
      sodium.memzero(encryptionPublicBytes);
    }

    const derivedSigningPublicKey =
      sodium.crypto_sign_ed25519_sk_to_pk(signingPrivateBytes);

    try {
      if (
        sodium.to_base64(derivedSigningPublicKey) !==
        trustedVault.signingPublicKey
      ) {
        throw new Error("Trusted-device signing key verification failed.");
      }
    } finally {
      sodium.memzero(derivedSigningPublicKey);
    }

    const keyPair = {
      publicKey: trustedVault.publicKey,
      privateKey,
      signingPublicKey: trustedVault.signingPublicKey,
      signingPrivateKey,
    };

    await testEncryptionRoundTrip(keyPair.publicKey, keyPair.privateKey);

    return keyPair;
  } finally {
    sodium.memzero(encryptionPrivateBytes);
    sodium.memzero(signingPrivateBytes);
  }
}

export async function inspectVaultWithPassphrase(passphrase, userId) {
  await sodium.ready;

  const stored = localStorage.getItem(getVaultStorageKey(userId));
  if (!stored) throw new Error("No account vault found.");

  const vault = JSON.parse(stored);
  if (vault.userId !== userId || vault.version !== 2) {
    throw new Error("This is not the expected version-2 account vault.");
  }

  const salt = sodium.from_base64(vault.salt);
  const nonce = sodium.from_base64(vault.nonce);
  const ciphertext = sodium.from_base64(vault.ciphertext);
  const key = sodium.crypto_pwhash(
    sodium.crypto_secretbox_KEYBYTES,
    passphrase,
    salt,
    sodium.crypto_pwhash_OPSLIMIT_INTERACTIVE,
    sodium.crypto_pwhash_MEMLIMIT_INTERACTIVE,
    sodium.crypto_pwhash_ALG_ARGON2ID13
  );

  try {
    const decrypted = sodium.crypto_secretbox_open_easy(
      ciphertext, nonce, key
    );

    try {
      const keys = JSON.parse(sodium.to_string(decrypted));
      const encryptionPrivate = sodium.from_base64(keys.privateKey);
      const signingPrivate = sodium.from_base64(keys.signingPrivateKey);

      try {
        return {
          encryptionKeyMatchesVault:
            sodium.to_base64(
              sodium.crypto_scalarmult_base(encryptionPrivate)
            ) === vault.publicKey,
          signingKeyMatchesVault:
            sodium.to_base64(
              sodium.crypto_sign_ed25519_sk_to_pk(signingPrivate)
            ) === vault.signingPublicKey,
          vaultPublicKey: vault.publicKey,
          vaultSigningPublicKey: vault.signingPublicKey,
        };
      } finally {
        sodium.memzero(encryptionPrivate);
        sodium.memzero(signingPrivate);
      }
    } finally {
      sodium.memzero(decrypted);
    }
  } finally {
    sodium.memzero(key);
    sodium.memzero(salt);
    sodium.memzero(nonce);
    sodium.memzero(ciphertext);
  }
}