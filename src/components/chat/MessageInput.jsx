
import { useState } from "react";

function MessageInput({ onSend, activeChannel, activeDM }) {
  const [text, setText] = useState("");

  const handleSend = () => {
    const message = text.trim();
    if (!message) return;

    onSend(message);
    setText("");
  };

  return (
    <div className="message-input">
      <input
        type="text"
        placeholder={
          activeDM
            ? `Message @${activeDM.username || activeDM}`
            : `Message #${activeChannel || "general"}`
        }
        value={text}
        onChange={(event) => setText(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") handleSend();
        }}
      />
      <button type="button" onClick={handleSend}>
        Send
      </button>
    </div>
  );
}

export default MessageInput;
