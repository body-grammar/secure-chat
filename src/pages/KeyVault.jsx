import { useEffect, useState } from "react";
import { ShieldCheck, KeyRound, LockKeyhole } from "lucide-react";
import {
  generateKeyPair,
  saveKeyPair,
  unlockKeyPair,
  testEncryptionRoundTrip,
  getVaultStorageKey,
  getEncryptedVaultForUser,
  restoreTrustedKeyPair,
} from "../crypto";
import { registerPublicKey } from "../api/user";
import {
  protectForTrustedDevice,
  saveTrustedDeviceVault,
  getTrustedDeviceVault,
  unlockForTrustedDevice,
  hasTrustedDevice,
  forgetTrustedDevice,
  validateTrustedVault,
} from "../trustedDevice";

export default function KeyVault({ currentUser, onUnlocked }) {
  const [mode, setMode] = useState("unlock");
  const [passphrase, setPassphrase] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [trustDevice, setTrustDevice] = useState(false);
  const [checkingTrustedDevice, setCheckingTrustedDevice] = useState(true);
  const [trustedDeviceAvailable, setTrustedDeviceAvailable] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function checkTrustedDevice() {
      try {
        if (!currentUser?._id) return;

        const available = await hasTrustedDevice(currentUser._id);

        if (!cancelled) {
          setTrustedDeviceAvailable(available);
        }
      } catch {
        if (!cancelled) {
          setTrustedDeviceAvailable(false);
        }
      } finally {
        if (!cancelled) {
          setCheckingTrustedDevice(false);
        }
      }
    }

    checkTrustedDevice();

    return () => {
      cancelled = true;
    };
  }, [currentUser?._id]);

  useEffect(() => {
    if (checkingTrustedDevice || !trustedDeviceAvailable) return;

    let cancelled = false;

    async function autoUnlock() {
      console.log("[NEXUS] Trusted-device auto-unlock started");
      try {
        const trustedVault = await getTrustedDeviceVault(currentUser?._id);

        if (cancelled) return;

        if (!validateTrustedVault(currentUser._id, trustedVault)) {
          throw new Error("Trusted-device data is invalid.");
        }

        if (!trustedVault || cancelled) return;

        const keyPair = await restoreTrustedKeyPair(
          currentUser._id,
          trustedVault
        );

        console.log("[NEXUS] Trusted-device key restored and verified");

        if (cancelled) return;

        const token = localStorage.getItem("token");

        if (!token) {
          throw new Error("Your session has expired. Please log in again.");
        }

        await registerPublicKey(
          keyPair.publicKey,
          keyPair.signingPublicKey,
          token
        );

        if (keyPair.needsVaultUpgrade) {
          await saveKeyPair(keyPair, passphrase, currentUser._id);
        }

        console.log("[NEXUS] Calling onUnlocked");

        if (!cancelled) {
          onUnlocked(keyPair);
        }
      } catch {
        // Keep the passphrase form available if trusted unlock fails.
        if (!cancelled) {
          setTrustedDeviceAvailable(false);
        }
      }
    }

    autoUnlock();

    return () => {
      cancelled = true;
    };
  }, [
    checkingTrustedDevice,
    trustedDeviceAvailable,
    currentUser?._id,
    onUnlocked,
  ]);

  const vaultExists = Boolean(
    currentUser?._id &&
      localStorage.getItem(getVaultStorageKey(currentUser._id))
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
        await saveKeyPair(keyPair, passphrase, currentUser._id);
      } else {
        keyPair = await unlockKeyPair(passphrase, currentUser._id);
        await testEncryptionRoundTrip(
          keyPair.publicKey,
          keyPair.privateKey
        );
      }
      await registerPublicKey(
        keyPair.publicKey,
        keyPair.signingPublicKey,
        token
      );

      if (trustDevice) {
        const protectedValue = await protectForTrustedDevice(
          currentUser._id,
          JSON.stringify({
            privateKey: keyPair.privateKey,
            signingPrivateKey: keyPair.signingPrivateKey,
          })
        );

        await saveTrustedDeviceVault(currentUser._id, {
          userId: currentUser._id,
          publicKey: keyPair.publicKey,
          signingPublicKey: keyPair.signingPublicKey,
          protectedValue,
        });
      }

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

        {checkingTrustedDevice && (
          <p className="vault-status">
            Checking this device…
          </p>
        )}

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
          <label className="trust-device-option">
            <input
              type="checkbox"
              checked={trustDevice}
              onChange={(event) => setTrustDevice(event.target.checked)}
            />
            Trust this device
          </label>

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
