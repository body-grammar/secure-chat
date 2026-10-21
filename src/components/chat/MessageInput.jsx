import { useState } from "react";
import { ArrowUp, Terminal } from "lucide-react";

function MessageInput({ onSend, activeChannel, channelName, activeDM }) {
  const [text, setText] = useState("");

  const handleSend = () => {
    const message = text.trim();
    if (!message) return;

    onSend(message);
    setText("");
  };

  return (
    <div className="message-input nexus-message-input">
      <div className="composer-prompt" aria-hidden="true">
        <Terminal size={17} />
        <span>&gt;</span>
      </div>

      <input
        type="text"
        aria-label="Write a message"
        placeholder={
          activeDM
            ? `Message @${activeDM.username || activeDM}`
            : `Message #${channelName || "general"}`
        }
        value={text}
        onChange={(event) => setText(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            handleSend();
          }
        }}
      />

      <span className="composer-key-hint">ENTER ↵</span>

      <button
        type="button"
        onClick={handleSend}
        disabled={!text.trim()}
        aria-label="Send message"
        title="Send message"
      >
        <ArrowUp size={19} />
      </button>
    </div>
  );
}

export default MessageInput;