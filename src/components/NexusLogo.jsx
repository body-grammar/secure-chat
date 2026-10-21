export default function NexusLogo({ compact = false, className = "" }) {
  return (
    <span
      className={`nexus-logo ${compact ? "nexus-logo-compact" : ""} ${className}`}
      aria-label="NEXUS Secure Chat"
    >
      <svg
        className="nexus-logo-mark"
        viewBox="0 0 100 100"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="nexus-cyan" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#31B9FF" />
            <stop offset="100%" stopColor="#079FE8" />
          </linearGradient>
        </defs>

        <path
          fill="url(#nexus-cyan)"
          d="M12 16 H31 L69 60 V16 H88 V84 H69 L31 40 V84 H12 Z"
        />
        <path
          fill="#071017"
          opacity=".32"
          d="M31 16 L31 40 L69 84 L69 60 Z"
        />
      </svg>

      {!compact && (
        <span className="nexus-logo-copy">
          <span className="nexus-logo-name">NEXUS</span>
          <span className="nexus-logo-subtitle">SECURE CHAT</span>
        </span>
      )}
    </span>
  );
}