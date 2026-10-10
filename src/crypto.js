
import sodium from "libsodium-wrappers-sumo";

const VAULT_KEY = "nexus_encrypted_keypair";

export async function generateKeyPair() {
    await sodium.ready;

    const keyPair = sodium.crypto_box_keypair();

    return {
        publicKey: sodium.to_base64(keyPair.publicKey),
        privateKey: sodium.to_base64(keyPair.privateKey),
    };
}

export async function saveKeyPair(keyPair, passphrase) {
    await sodium.ready;

    if (!passphrase || passphrase.length < 12) {
        throw new Error("Use a passphrase of at least 12 characters.");
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

    try {
        const ciphertext = sodium.crypto_secretbox_easy(
            privateKeyBytes,
            nonce,
            vaultKey
        );

        const vault = {
            publicKey: keyPair.publicKey,
            ciphertext: sodium.to_base64(ciphertext),
            salt: sodium.to_base64(salt),
            nonce: sodium.to_base64(nonce),
        };

        localStorage.setItem(VAULT_KEY, JSON.stringify(vault));
    } finally {
        sodium.memzero(vaultKey);
        sodium.memzero(privateKeyBytes);
    }
}


export async function unlockKeyPair(passphrase) {
    await sodium.ready;

    const stored = localStorage.getItem(VAULT_KEY);

    if (!stored) {
        throw new Error("No saved NEXUS key pair found.");
    }

    if (!passphrase) {
        throw new Error("Enter your vault passphrase.");
    }

    const vault = JSON.parse(stored);

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

    try {
        const privateKeyBytes = sodium.crypto_secretbox_open_easy(
            ciphertext,
            nonce,
            vaultKey
        );

        try {
            return {
                publicKey: vault.publicKey,
                privateKey: sodium.to_base64(privateKeyBytes),
            };
        } finally {
            sodium.memzero(privateKeyBytes);
        }
    } catch {
        throw new Error("Incorrect passphrase or corrupted key vault.");
    } finally {
        sodium.memzero(vaultKey);
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

    console.log("NEXUS key vault test passed.");
    return true;
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
