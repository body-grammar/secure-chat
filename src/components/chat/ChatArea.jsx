import { useEffect, useState } from "react";
import {
  getMessages,
  getDirectMessages,
  sendMessage,
  updateMessageStatus,
} from "../../api/messages";
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
        // Leave ordinary, unencrypted messages unchanged.
        if (!message.encryption?.algorithm) {
            return message;
        }

        if (!encryptionKeyPair?.privateKey || !encryptionKeyPair?.publicKey) {
            return {
            ...message,
            content: "[Unlock your vault to read this message]",
            };
        }

        const currentUserId = localStorage.getItem("userId");

        const senderId =
            typeof message.sender === "object"
            ? message.sender?._id
            : message.sender;

        const isSender = String(senderId) === String(currentUserId);

        // Select the ciphertext encrypted for the current user.
        const encryptedContent = isSender
            ? message.encryption.senderContent
            : message.encryption.recipientContent;

        // Older messages may not have the new fields.
        const ciphertext = encryptedContent || message.content;

        try {
            const plaintext = await decryptMessageForMe(
            ciphertext,
            encryptionKeyPair
            );

            return {
            ...message,
            content: plaintext,
            };
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
            try {
                await updateMessageStatus(message._id, "delivered", token);

                socket.emit("messageStatusUpdate", {
                messageId: message._id,
                status: "delivered",
                });
            } catch (error) {
                console.error("Failed to mark message as delivered:", error);
            }

            // Keep ordinary, unencrypted messages unchanged.
            if (!message.encryption?.algorithm) {
                setMessages((currentMessages) => ({
                ...currentMessages,
                dm: [...(currentMessages.dm || []), message],
                }));
                return;
            }

            try {
                // Use the same sender/recipient logic as message history.
                const decryptedMessage = await decryptDirectMessage(message);

                setMessages((currentMessages) => ({
                ...currentMessages,
                dm: [
                    ...(currentMessages.dm || []),
                    decryptedMessage,
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
    const handleMessageStatusUpdated = ({ messageId, status }) => {
        setMessages((currentMessages) => ({
        ...currentMessages,
        dm: (currentMessages.dm || []).map((message) =>
            message._id === messageId
            ? { ...message, status }
            : message
        ),
        }));
    };

    socket.on("messageStatusUpdated", handleMessageStatusUpdated);

    return () => {
        socket.off("messageStatusUpdated", handleMessageStatusUpdated);
    };
    }, []);

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

                    console.log(
                        "Newest DM:",
                        dmMessages.length
                            ? {
                                id: dmMessages[dmMessages.length - 1]._id,
                                encryption: dmMessages[dmMessages.length - 1].encryption,
                                contentLength: dmMessages[dmMessages.length - 1].content?.length,
                            }
                            : "No messages"
                    );

                    console.log(
                        "History message ID:",
                        dmMessages[dmMessages.length - 1]?._id
                    );

                    console.log("DM history received:", dmMessages);
                    console.log("DM history raw data:", JSON.stringify(dmMessages, null, 2));
                    console.log("Receiver key available:", !!encryptionKeyPair?.privateKey);
                    console.log("DM encryption metadata:", dmMessages[0]?.encryption);
                    console.log("DM content length:", dmMessages[0]?.content?.length);
                    console.log(
                        "History ciphertext check:",
                        dmMessages.slice(-3).map((message) => ({
                            id: message._id,
                            algorithm: message.encryption?.algorithm,
                            contentType: typeof message.content,
                            contentLength: message.content?.length,
                            hasEncryptionMetadata: !!message.encryption?.algorithm,
                        }))
                    );
                    const decryptedMessages = await Promise.all(
                        dmMessages.map((message) => decryptDirectMessage(message))
                    );

                    // Mark messages sent by the other person as read.
                    const currentUserId = localStorage.getItem("userId");

                    const unreadMessages = dmMessages.filter((message) => {
                        const senderId =
                            typeof message.sender === "object"
                            ? message.sender?._id
                            : message.sender;

                        const recipientId =
                            typeof message.recipient === "object"
                            ? message.recipient?._id
                            : message.recipient;

                        return (
                            String(recipientId || "") === String(currentUserId || "") &&
                            senderId &&
                            String(senderId) !== String(currentUserId) &&
                            message.status !== "read"
                        );
                    });

                    const readResults = await Promise.allSettled(
                        unreadMessages.map((message) =>
                            updateMessageStatus(message._id, "read", token)
                        )
                    );

                    setMessages((currentMessages) => ({
                        ...currentMessages,
                        dm: decryptedMessages.map((message) =>
                            unreadMessages.some(
                            (unread) => unread._id === message._id
                            )
                            ? { ...message, status: "read" }
                            : message
                        ),
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
    }, [activeChannel, activeDM, token, encryptionKeyPair]);

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

            const senderKey = await getUserPublicKey(
                localStorage.getItem("userId"),
                token
            );

            const encryptedForRecipient = await encryptMessageForRecipient(
                text,
                recipientKey.publicKey
            );

            const encryptedForSender = await encryptMessageForRecipient(
                text,
                senderKey.publicKey
            );

            const encryption = {
                ...encryptedForRecipient.encryption,
                senderContent: encryptedForSender.content,
                recipientContent: encryptedForRecipient.content,
            };

            const savedMessage = await sendMessage(
                null,
                encryptedForRecipient.content,
                token,
                recipient._id,
                encryption
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