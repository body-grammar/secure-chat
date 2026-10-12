import { Check, CheckCheck } from "lucide-react";

function MessageList({ messages = [] }) {
  const safeMessages = Array.isArray(messages) ? messages : [];
  const currentUserId = localStorage.getItem("userId");

  return (
    <div className="message-list">
      {safeMessages.map((message) => {
        const senderId =
            typeof message.sender === "object"
                ? message.sender?._id
                : message.sender;

        const isOwnMessage =
            String(senderId || "") === String(currentUserId || "") ||
            message.user === "user@arch";

        return (
          <div key={message._id || message.id}>
            <strong>
              {message.sender?.username || message.user}
            </strong>

            <p>{message.content || message.text}</p>

            <span>
              {message.createdAt
                ? new Date(message.createdAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : message.time}

              {isOwnMessage && message.recipient && (
                <span
                  title={
                    message.status === "read"
                      ? "Read"
                      : message.status === "delivered"
                      ? "Delivered"
                      : "Sent"
                  }
                  style={{ marginLeft: "6px" }}
                >
                  {message.status === "read" ||
                  message.status === "delivered" ? (
                    <CheckCheck
                      size={14}
                      color={message.status === "read" ? "#3987F5" : "currentColor"}
                    />
                  ) : (
                    <Check size={14} />
                  )}
                </span>
              )}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default MessageList;