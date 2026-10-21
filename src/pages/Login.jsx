import { useState } from "react";
import { ArrowRight, Eye, EyeOff, Mail, Lock } from "lucide-react";
import "./Login.css";
import NexusLogo from "../components/NexusLogo";

const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5001/api";

function Login({ onLogin, onSwitchToRegister }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch(
        `${API_URL}/users/login`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email, password }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Login failed");
        return;
      }

      localStorage.setItem("token", data.token);
      localStorage.setItem("userId", data.user.id);

      onLogin();
    } catch (err) {
      console.error("Login error:", err);
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

      <div className="auth-background">
        <aside className="terminal-note">
          <p>&gt; secure communication</p>
          <p>&gt; privacy by design</p>
          <p>&gt; your space, your control</p>
          <span className="terminal-cursor">_</span>
        </aside>

        <section className="auth-card">
          <div className="card-top-line" />

          <div className="auth-card-brand">
            <NexusLogo />
          </div>

          <div className="auth-divider" />

          <div className="auth-intro">
            <h2>Welcome back.</h2>
            <p>Sign in to continue to your workspace.</p>
          </div>

          <form onSubmit={handleLogin} className="auth-form">
            <label htmlFor="login-email">EMAIL ADDRESS</label>
            <div className="auth-input-wrap">
              <Mail size={18} aria-hidden="true" />
              <input
                id="login-email"
                type="email"
                placeholder="you@domain.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                required
              />
            </div>

            <label htmlFor="login-password">PASSWORD</label>
            <div className="auth-input-wrap">
              <Lock size={18} aria-hidden="true" />
              <input
                id="login-password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                required
              />
              <button
                className="password-toggle"
                type="button"
                onClick={() => setShowPassword((visible) => !visible)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
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
              <span>{loading ? "SIGNING IN..." : "SIGN IN"}</span>
              {!loading && <ArrowRight size={18} />}
            </button>
          </form>

          <div className="auth-or">
            <span />
            <span>OR</span>
            <span />
          </div>

          <button
            className="auth-secondary"
            type="button"
            onClick={onSwitchToRegister}
          >
            CREATE AN ACCOUNT
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
          <p><span>›</span> Private workspace</p>
          <p><span>›</span> Encrypted messaging</p>
          <p><span>›</span> Identity protected</p>
        </aside>

        <div className="corner-note">
          Better conversations.
          <br />
          More privacy.
        </div>
      </div>
    </main>
  );
}

export default Login;