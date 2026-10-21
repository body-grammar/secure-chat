import Register from "./pages/Register";
import { useCallback, useEffect, useState } from "react";
import Login from "./pages/Login";
import AppLayout from "./layouts/AppLayout";
import { getCurrentUser } from "./api/user";
import KeyVault from "./pages/KeyVault";

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(
    !!localStorage.getItem("token")
  );

  const [showRegister, setShowRegister] = useState(false);

  const [vaultUnlocked, setVaultUnlocked] = useState(false);
  const [encryptionKeyPair, setEncryptionKeyPair] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);

  const handleVaultUnlocked = useCallback((keyPair) => {
    console.log("[NEXUS] App received unlocked key pair");
    setEncryptionKeyPair(keyPair);
    setVaultUnlocked(true);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) {
      setCurrentUser(null);
      setIsLoadingUser(false);
      return;
    }

    const loadCurrentUser = async () => {
      setIsLoadingUser(true);
      try {
        const user = await getCurrentUser(token);
        console.log("[NEXUS] Current user loaded:", user?._id);
        setCurrentUser(user);
      } catch (error) {
        console.error("Failed to load current user:", error);
        console.log("[NEXUS] User loading failed; status:", error.message);
        setCurrentUser(null);

        if (error.message.includes("(401)") || error.message.includes("(403)")) {
          localStorage.removeItem("token");
          setIsAuthenticated(false);
          setVaultUnlocked(false);
          setEncryptionKeyPair(null);
        }
      } finally {
        setIsLoadingUser(false);
      }
    };

    loadCurrentUser();
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    if (showRegister) {
      return (
        <Register
          onRegister={() => setShowRegister(false)}
          onSwitchToLogin={() => setShowRegister(false)}
        />
      );
    }

    return (
      <Login
        onLogin={() => {
          setCurrentUser(null);
          setIsLoadingUser(true);
          setIsAuthenticated(true);
        }}
        onSwitchToRegister={() => setShowRegister(true)}
      />
    );
  }

  if (isLoadingUser) {
    return <p>Loading your account...</p>;
  }

  if (!currentUser?._id) {
    localStorage.removeItem("token");

    return (
      <Login
        onLogin={() => {
          setCurrentUser(null);
          setIsLoadingUser(true);
          setIsAuthenticated(true);
        }}
        onSwitchToRegister={() => setShowRegister(true)}
      />
    );
  }

  if (!vaultUnlocked) {
    return (
      <KeyVault
        currentUser={currentUser}
        onUnlocked={handleVaultUnlocked}
      />
    );
  }

  console.log("Current user:", currentUser?._id, currentUser?.username);

  return (
    <AppLayout
      currentUser={currentUser}
      encryptionKeyPair={encryptionKeyPair}
      onLogout={() => {
        localStorage.removeItem("token");
        setCurrentUser(null);
        setIsAuthenticated(false);
        setVaultUnlocked(false);
        setEncryptionKeyPair(null);
      }}
    />
  );
}

export default App;
