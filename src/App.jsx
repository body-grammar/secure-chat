
import { useEffect, useState } from "react";
import Login from "./pages/Login";
import AppLayout from "./layouts/AppLayout";
import { getCurrentUser } from "./api/user";
import KeyVault from "./pages/KeyVault";

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(
    !!localStorage.getItem("token")
  );

  const [vaultUnlocked, setVaultUnlocked] = useState(false);
  const [encryptionKeyPair, setEncryptionKeyPair] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) {
      setCurrentUser(null);
      return;
    }

    const loadCurrentUser = async () => {
      try {
        const user = await getCurrentUser(token);
        setCurrentUser(user);
      } catch (error) {
        console.error("Failed to load current user:", error);
      }
    };

    loadCurrentUser();
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return (
      <Login
        onLogin={() => setIsAuthenticated(true)}
      />
    );
  }

  if (!vaultUnlocked) {
    return (
      <KeyVault
        onUnlocked={(keyPair) => {
          setEncryptionKeyPair(keyPair);
          setVaultUnlocked(true);
        }}
      />
    );
  }

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
