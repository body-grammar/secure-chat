import { useState } from "react";

function MessageInput({ onSend, activeChannel }) {
    const [text, setText] = useState("");

    return (
        <div className="message-input">
            <input type="text" placeholder={`Message #${activeChannel}`} value={text} onChange={(event) => setText(event.target.value)} onKeyDown={(event) => {
                if(event.key === "Enter") {
                    onSend(text);
                    setText("");
                }
            }} />
            <button onClick={() => {
                onSend(text);
                setText("");
            }}>Send</button>
        </div>
    );
}

export default MessageInput;