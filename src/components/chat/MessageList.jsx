function MessageList({ messages = [] }) {
    const safeMessages = Array.isArray(messages) ? messages : [];

    return (
        <div className="message-list">
            {safeMessages.map((message) => (
                <div key={message._id || message.id}>
                    <strong>
                        {message.sender?.username || message.user}
                    </strong>

                    <p>
                        {message.content || message.text}
                    </p>

                    <span>
                        {message.createdAt
                            ? new Date(message.createdAt).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                            })
                            : message.time}
                    </span>
                </div>
            ))}
        </div>
    );
}

export default MessageList;