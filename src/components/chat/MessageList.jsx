import { Check, CheckCheck } from "lucide-react";

function MessageList({ messages = [] }) {
  const safeMessages = Array.isArray(messages) ? messages : [];
  const currentUserId = localStorage.getItem("userId");

  if (safeMessages.length === 0) {
    return (
      <div className="message-list nexus-message-list">
        <div className="chat-empty-state">
          <div className="empty-state-icon">N_</div>
          <p className="empty-state-title">No messages yet</p>
          <p className="empty-state-subtitle">
            Your conversation starts here.
          </p>
          <span className="empty-state-prompt">&gt; awaiting input_</span>
        </div>
      </div>
    );
  }

  return (
    <div className="message-list nexus-message-list">
      <div className="chat-session-marker">
        <span />
        SESSION STREAM
        <span />
      </div>

      {safeMessages.map((message, index) => {
        const senderId =
          typeof message.sender === "object"
            ? message.sender?._id
            : message.sender;

        const isOwnMessage =
          String(senderId || "") === String(currentUserId || "") ||
          message.user === "user@arch";

        const senderName =
          message.sender?.username || message.user || "Unknown user";

        const timestamp = message.createdAt
          ? new Date(message.createdAt).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })
          : message.time;

        return (
          <article
            className={`message-row ${
              isOwnMessage ? "message-own" : "message-incoming"
            }`}
            key={message._id || message.id || `${senderName}-${index}`}
          >
            <div className="message-avatar">
              {senderName.charAt(0).toUpperCase()}
            </div>

            <div className="message-content">
              <div className="message-heading">
                <strong>{senderName}</strong>
                <span className="message-timestamp">{timestamp}</span>
              </div>

              <div className="message-bubble">
                <p>{message.content || message.text}</p>
              </div>

              <div className="message-meta">
                {isOwnMessage && message.recipient && (
                  <span
                    className={`message-receipt message-receipt-${message.status || "sent"}`}
                    title={
                      message.status === "read"
                        ? "Read"
                        : message.status === "delivered"
                          ? "Delivered"
                          : "Sent"
                    }
                  >
                    {message.status === "read" ||
                    message.status === "delivered" ? (
                      <CheckCheck
                        size={14}
                        color={
                          message.status === "read"
                            ? "#08b9f5"
                            : "currentColor"
                        }
                      />
                    ) : (
                      <Check size={14} />
                    )}
                    <span>{message.status || "sent"}</span>
                  </span>
                )}
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}

export default MessageList;