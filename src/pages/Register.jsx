import { useState } from "react";
import {
  ArrowRight,
  Eye,
  EyeOff,
  Mail,
  Lock,
  UserRound,
} from "lucide-react";
import "./Login.css";
import NexusLogo from "../components/NexusLogo";

const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5001/api";

function Register({ onRegister, onSwitchToLogin }) {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleRegister = async (event) => {
    event.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        `${API_URL}/users/register`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            username: username.trim(),
            email: email.trim(),
            password,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Registration failed.");
        return;
      }

      onRegister();
    } catch (err) {
      console.error("Registration error:", err);
      setError("Unable to connect to the server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-page">
      <header className="auth-header">
        <a className="auth-brand" href="/" aria-label="NEXUS home">
          <NexusLogo />
        </a>

        <div className="system-status">
          <span className="status-dot" />
          SYSTEM ONLINE
        </div>
      </header>

      <div className="auth-background register-background">
        <aside className="terminal-note">
          <p>&gt; create your identity</p>
          <p>&gt; privacy by design</p>
          <p>&gt; your space, your control</p>
          <span className="terminal-cursor">_</span>
        </aside>

        <section className="auth-card register-card">
          <div className="card-top-line" />

          <div className="auth-card-brand">
            <NexusLogo />
          </div>

          <div className="auth-divider" />

          <div className="auth-intro">
            <h2>Create your account.</h2>
            <p>Set up your identity and join your workspace.</p>
          </div>

          <form onSubmit={handleRegister} className="auth-form">
            <label htmlFor="register-username">USERNAME</label>
            <div className="auth-input-wrap">
              <UserRound size={18} aria-hidden="true" />
              <input
                id="register-username"
                type="text"
                placeholder="Choose a username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                autoComplete="username"
                required
              />
            </div>

            <label htmlFor="register-email">EMAIL ADDRESS</label>
            <div className="auth-input-wrap">
              <Mail size={18} aria-hidden="true" />
              <input
                id="register-email"
                type="email"
                placeholder="you@domain.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                required
              />
            </div>

            <label htmlFor="register-password">PASSWORD</label>
            <div className="auth-input-wrap">
              <Lock size={18} aria-hidden="true" />
              <input
                id="register-password"
                type={showPassword ? "text" : "password"}
                placeholder="At least 8 characters"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="new-password"
                minLength={8}
                required
              />
              <button
                className="password-toggle"
                type="button"
                onClick={() => setShowPassword((visible) => !visible)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            <label htmlFor="register-confirm-password">
              CONFIRM PASSWORD
            </label>
            <div className="auth-input-wrap">
              <Lock size={18} aria-hidden="true" />
              <input
                id="register-confirm-password"
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Enter your password again"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                autoComplete="new-password"
                required
              />
              <button
                className="password-toggle"
                type="button"
                onClick={() =>
                  setShowConfirmPassword((visible) => !visible)
                }
                aria-label={
                  showConfirmPassword ? "Hide password" : "Show password"
                }
              >
                {showConfirmPassword ? (
                  <EyeOff size={18} />
                ) : (
                  <Eye size={18} />
                )}
              </button>
            </div>

            {error && (
              <div className="auth-error" role="alert">
                <span>!</span>
                {error}
              </div>
            )}

            <button
              className="auth-submit"
              type="submit"
              disabled={loading}
            >
              <span>
                {loading ? "CREATING ACCOUNT..." : "CREATE ACCOUNT"}
              </span>
              {!loading && <ArrowRight size={18} />}
            </button>
          </form>

          <div className="auth-or">
            <span />
            <span>ALREADY REGISTERED?</span>
            <span />
          </div>

          <button
            className="auth-secondary"
            type="button"
            onClick={onSwitchToLogin}
          >
            BACK TO SIGN IN
          </button>

          <div className="auth-footer">
            <span className="status-dot" />
            <span className="footer-brand">NEXUS</span>
            <span>v1.0.0</span>
            <span className="footer-separator">|</span>
            <span>Secure. Private. Yours.</span>
          </div>
        </section>

        <aside className="system-panel">
          <span className="panel-heading">[ SYSTEM ]</span>
          <p><span>›</span> Create your profile</p>
          <p><span>›</span> Connect with others</p>
          <p><span>›</span> Manage your privacy</p>
        </aside>

        <div className="corner-note">
          Your identity.
          <br />
          Your space.
        </div>
      </div>
    </main>
  );
}

export default Register;