import MessageList from "./MessageList";
import MessageInput from "./MessageInput";
import { useState } from "react";

function ChatArea({ activeChannel }) {
    const [messages, setMessages] = useState({
        general: [
            {
                id: 1,
                user: "Alice",
                text: "Welcome to the general channel.",
                time: "10:42 AM",
            },
        ],

        engineering: [
            {
                id: 2,
                user: "Bob",
                text: "The build is ready for review.",
                time: "10:43 AM",
            },
        ],

        security: [
            {
                id: 3,
                user: "Charlie",
                text: "Security audit completed.",
                time: "10:45 AM",
            },
        ],

        random: [],
    });

    const handleSend = (text) => {
        if(!text.trim()) return;

        const newMessage = {
            id: Date.now(),
            user: "user@arch",
            text: text,
            time: new Date().toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
            }),
        };

        setMessages((currentMessages) => ({
            ...currentMessages,

            [activeChannel]: [
                ...currentMessages[activeChannel],
                newMessage,
            ],
        }));
    };

    return (
        <section className="chat-area">
            <MessageList messages={messages[activeChannel]} />
            <MessageInput onSend={handleSend} activeChannel={activeChannel} />
        </section>
    );
}

export default ChatArea;