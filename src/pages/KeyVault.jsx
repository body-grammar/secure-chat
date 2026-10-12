
import { useState } from "react";
import { ShieldCheck, KeyRound, LockKeyhole } from "lucide-react";
import {
  generateKeyPair,
  saveKeyPair,
  unlockKeyPair,
  testEncryptionRoundTrip,
} from "../crypto";
import { registerPublicKey } from "../api/user";

export default function KeyVault({ onUnlocked }) {
  const [mode, setMode] = useState("unlock");
  const [passphrase, setPassphrase] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const vaultExists = Boolean(
    localStorage.getItem("nexus_encrypted_keypair")
  );

  
async function handleSubmit(event) {
  event.preventDefault();
  setError("");
  setLoading(true);

  try {
    const token = localStorage.getItem("token");

    if (!token) {
      throw new Error("Your session has expired. Please log in again.");
    }

    let keyPair;

    if (mode === "create") {
      if (passphrase.length < 12) {
        throw new Error("Use a passphrase of at least 12 characters.");
      }

      if (vaultExists) {
        throw new Error(
          "A vault already exists in this browser. Unlock it instead."
        );
      }

      keyPair = await generateKeyPair();
      await saveKeyPair(keyPair, passphrase);
    } else {
      keyPair = await unlockKeyPair(passphrase);
      await testEncryptionRoundTrip(
        keyPair.publicKey,
        keyPair.privateKey
      );
    }
    const vaultPublicKey = keyPair.publicKey;
    console.log("Vault public key length:", vaultPublicKey.length);
    const serverUser = await registerPublicKey(keyPair.publicKey, token);

    console.log(
      "Vault public key matches server:",
      serverUser.publicKey === keyPair.publicKey
    );
    onUnlocked(keyPair);
  } catch (err) {
    setError(err.message || "Unable to open the key vault.");
  } finally {
    setLoading(false);
  }
}

  return (
    <main className="key-vault-page">
      <section className="key-vault-card">
        <div className="key-vault-icon">
          <ShieldCheck size={32} />
        </div>

        <h1>NEXUS Key Vault</h1>
        <p>
          Protect your encryption key with a passphrase.
          Your vault is stored in this browser.
        </p>

        <div className="key-vault-tabs">
          <button
            type="button"
            className={mode === "unlock" ? "active" : ""}
            onClick={() => {
              setMode("unlock");
              setError("");
            }}
          >
            <LockKeyhole size={16} /> Unlock vault
          </button>

          <button
            type="button"
            className={mode === "create" ? "active" : ""}
            disabled={vaultExists}
            onClick={() => {
              setMode("create");
              setError("");
            }}
          >
            <KeyRound size={16} /> Create vault
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <label htmlFor="vault-passphrase">Vault passphrase</label>
          <input
            id="vault-passphrase"
            type="password"
            value={passphrase}
            onChange={(event) => setPassphrase(event.target.value)}
            placeholder="Enter a strong passphrase"
            autoComplete="current-password"
            required
          />

          {mode === "create" && (
            <small>Use at least 12 characters. Keep it somewhere safe.</small>
          )}

          {error && <p className="key-vault-error">{error}</p>}

          <button type="submit" disabled={loading}>
            {loading
              ? "Please wait..."
              : mode === "create"
                ? "Create encryption keys"
                : "Unlock encryption keys"}
          </button>
        </form>

        <small>
          Losing your passphrase may mean losing access to this private key.
        </small>
      </section>
    </main>
  );
}
