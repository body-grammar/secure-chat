function MessageList({ messages }) {
    return (
        <div className="message-list">
            {messages.map((message) => (
                <div className="message" key={message.id}>
                    <div className="message-meta">
                        <strong>{message.user}</strong>
                        <span>{message.time}</span>
                    </div>

                    <p>{message.text}</p>
                </div>
            ))}
        </div>
    );
}

export default MessageList;