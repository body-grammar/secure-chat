import { useEffect, useState } from "react";
import { getMessages, getDirectMessages, sendMessage } from "../../api/messages";
import socket from "../../api/socket";
import { getUserByUsername, getUserPublicKey } from "../../api/user";
import MessageList from "./MessageList";
import MessageInput from "./MessageInput";
import {
  encryptMessageForRecipient,
  decryptMessageForMe,
} from "../../crypto";

function ChatArea({ activeChannel, activeDM, encryptionKeyPair }) {
    const [messages, setMessages] = useState({});

    const token = localStorage.getItem("token");

    const decryptDirectMessage = async (message) => {
    // Leave legacy plaintext messages unchanged.
    if (!message.encryption?.algorithm) {
        return message;
    }

    if (!encryptionKeyPair?.privateKey) {
        return {
        ...message,
        content: "[Unlock your vault to read this message]",
        };
    }

    try {
        console.log("Attempting DM decryption", {
            algorithm: message.encryption?.algorithm,
            hasPublicKey: !!encryptionKeyPair?.publicKey,
            hasPrivateKey: !!encryptionKeyPair?.privateKey,
        });
        const plaintext = await decryptMessageForMe(
        message.content,
        encryptionKeyPair
        );
        console.log("DM decryption succeeded");

        console.log("Decrypted text:", plaintext);
        return { ...message, content: plaintext };
    } catch (error) {
        console.error("Failed to decrypt direct message:", error);
        return {
        ...message,
        content: "[Unable to decrypt this message]",
        };
    }
    };

    useEffect(() => {
        if(!token) return;

        socket.auth = { token };

        socket.connect();

        return () => {
            socket.disconnect();
        };
    }, [token]);

    useEffect(() => {
        const handleNewMessage = (message) => {
            setMessages((currentMessages) => ({
                ...currentMessages,
                [message.channel]: [
                    ...currentMessages[message.channel],
                    message,
                ],
            }));
        };

        socket.on("newMessage", handleNewMessage);

        return () => {
            socket.off("newMessage", handleNewMessage);
        };
    }, []);

    
    useEffect(() => {
    const handleNewDirectMessage = async (message) => {
            if (!message.encryption?.algorithm) {
            setMessages((currentMessages) => ({
                ...currentMessages,
                dm: [...(currentMessages.dm || []), message],
            }));
            return;
        }

        try {
            const plaintext = await decryptMessageForMe(
                message.content,
                encryptionKeyPair
            );

            setMessages((currentMessages) => ({
                ...currentMessages,
                dm: [
                ...(currentMessages.dm || []),
                { ...message, content: plaintext },
                ],
            }));
        } catch (error) {
            console.error("DM decryption failed:", error);
            setMessages((currentMessages) => ({
                ...currentMessages,
                dm: [
                ...(currentMessages.dm || []),
                { ...message, content: "[Unable to decrypt this message]" },
                ],
            }));
        }
    };

        socket.on("newDirectMessage", handleNewDirectMessage);
        return () => socket.off("newDirectMessage", handleNewDirectMessage);
    }, [encryptionKeyPair]);

    useEffect(() => {
        if(!token) return;

        socket.emit("joinChannel", activeChannel);
    }, [activeChannel, token]);

    useEffect(() => {
        const loadMessages = async () => {
            if (!token) return;

            try {
                if (activeDM) {
                    const user = await getUserByUsername(activeDM, token);
                        console.log("DM history target:", {
                        activeDM,
                        userId: user?._id,
                    });

                    const dmMessages = await getDirectMessages(user._id, token);

                    console.log("DM history received:", dmMessages);
                    console.log("Receiver key available:", !!encryptionKeyPair?.privateKey);
                    console.log("DM encryption metadata:", dmMessages[0]?.encryption);
                    console.log("DM content length:", dmMessages[0]?.content?.length);

                    const decryptedMessages = await Promise.all(
                    dmMessages.map((message) => decryptDirectMessage(message))
                    );

                    console.log("Messages passed to chat:", decryptedMessages);

                    setMessages((currentMessages) => ({
                        ...currentMessages,
                        dm: decryptedMessages,
                    }));
                    return;
                }

                if (activeChannel) {
                    const channelMessages = await getMessages(
                        activeChannel,
                        token
                    );

                    setMessages((currentMessages) => ({
                        ...currentMessages,
                        [activeChannel]: channelMessages,
                    }));
                }
            } catch (error) {
                console.error(
                    "Failed to load messages:",
                    error
                );
            }
        };

        loadMessages();
    }, [activeChannel, activeDM, token]);

    const handleSend = async (text) => {
        if (!text.trim()) return;

        if (!token) {
            console.error("No authentication token found");
            return;
        }

        try {
            if (activeDM) {
            if (!encryptionKeyPair?.privateKey) {
                throw new Error("Unlock your encryption vault first.");
            }

            const recipient = await getUserByUsername(activeDM, token);

            const recipientKey = await getUserPublicKey(
                recipient._id,
                token
            );

            const encrypted = await encryptMessageForRecipient(
                text,
                recipientKey.publicKey
            );

            const savedMessage = await sendMessage(
                null,
                encrypted.content,
                token,
                recipient._id,
                encrypted.encryption
            );

            setMessages((currentMessages) => ({
                ...currentMessages,
                dm: [
                ...(currentMessages.dm || []),
                {
                    ...savedMessage,
                    content: text,
                },
                ],
            }));

            socket.emit("sendDirectMessage", savedMessage);

            return;
            }

            if (activeChannel) {
                const savedMessage = await sendMessage(activeChannel, text, token);

                setMessages((currentMessages) => ({
                    ...currentMessages, 
                    [activeChannel]: [
                        ...(currentMessages[activeChannel] || []),
                        savedMessage,
                    ],
                }));

                socket.emit("sendMessage", savedMessage);
            }
        } catch (error) {
            console.error(
                "Failed to send message:",
                error
            );
        }
    };

    console.log("Messages currently rendered:", activeDM ? messages.dm : messages[activeChannel]);
    return (
        <section className="chat-area">
            <MessageList messages={
                activeDM ? messages.dm : messages[activeChannel]
            } />
            <MessageInput
                onSend={handleSend}
                activeChannel={activeChannel}
            />
        </section>
    );
}

export default ChatArea;