import { getChannel } from "../../api/channels";
import { Hash, LockKeyhole, Users, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import {
  getMessages,
  getDirectMessages,
  sendMessage,
  updateMessageStatus,
} from "../../api/messages";
import socket from "../../api/socket";
import { getUserByUsername, getUserPublicKey, getUserById } from "../../api/user";
import MessageList from "./MessageList";
import MessageInput from "./MessageInput";
import {
  encryptMessageForRecipient,
  decryptMessageForMe,
  signMessage,
  verifyMessageSignature,
} from "../../crypto";

function ChatArea({ activeChannel, channelName, activeDM, encryptionKeyPair }) {
    const [messages, setMessages] = useState({});
    const [loadingMessages, setLoadingMessages] = useState(false);

    const token = localStorage.getItem("token");

    const decryptDirectMessage = async (message) => {
    if (!message.encryption?.algorithm) return message;

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

    const encryptedContent = isSender
        ? message.encryption.senderContent
        : message.encryption.recipientContent;

    const ciphertext = encryptedContent || message.content;

    try {
        const plaintext = await decryptMessageForMe(
        ciphertext,
        encryptionKeyPair
        );

        // Legacy messages may not contain signatures.
        if (!message.signature) {
        return {
            ...message,
            content: plaintext,
            signatureVerified: false,
            signatureStatus: "unsigned",
        };
        }

        // A sender cannot be verified if their identity or key is unavailable.
        if (!senderId) {
        return {
            ...message,
            content: plaintext,
            signatureVerified: false,
            signatureStatus: "unverifiable",
        };
        }

        const senderKey = await getUserPublicKey(senderId, token);
        const valid = await verifyMessageSignature(
        plaintext,
        message.signature,
        senderKey.signingPublicKey
        );

        console.log(
            "Message signature verification:",
            valid ? "VERIFIED" : "INVALID"
        );

        return {
        ...message,
        content: plaintext,
        signatureVerified: valid,
        signatureStatus: valid ? "verified" : "invalid",
        };
    } catch (error) {
        console.error("DM decryption or signature verification failed:", error);

        return {
        ...message,
        content: "[Unable to decrypt or verify this message]",
        signatureVerified: false,
        signatureStatus: "unverifiable",
        };
    }
    };

    const decryptChannelMessage = async (message) => {
        if (!message.encryption?.algorithm) {
            return message;
        }

        if (
            !encryptionKeyPair?.privateKey ||
            !encryptionKeyPair?.publicKey
        ) {
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

        const recipientCopy = message.encryption.recipientContents?.find(
            (item) => String(item.userId) === String(currentUserId)
        );

        if (!recipientCopy?.content) {
            return {
                ...message,
                content: "[No encrypted copy available for this account]",
                signatureStatus: "unavailable",
            };
        }

        try {
            const plaintext = await decryptMessageForMe(
                recipientCopy.content,
                encryptionKeyPair
            );

            if (!message.signature || !senderId) {
                return {
                    ...message,
                    content: plaintext,
                    signatureVerified: false,
                    signatureStatus: "unverifiable",
                };
            }

            const senderKey = await getUserPublicKey(senderId, token);

            const valid = await verifyMessageSignature(
                plaintext,
                message.signature,
                senderKey.signingPublicKey
            );

            return {
                ...message,
                content: plaintext,
                signatureVerified: valid,
                signatureStatus: valid ? "verified" : "invalid",
            };
        } catch (error) {
            console.error(
                "Channel decryption or signature verification failed:",
                error
            );

            return {
                ...message,
                content: "[Unable to decrypt or verify this message]",
                signatureVerified: false,
                signatureStatus: "unverifiable",
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
        const handleNewMessage = async (message) => {
            try {
                const decryptedMessage = await decryptChannelMessage(message);

                console.log("CHANNEL MESSAGE DEBUG", {
                    originalSender: message.sender,
                    decryptedSender: decryptedMessage.sender,
                    tokenExists: Boolean(token),
                });

                // Check both the decrypted message and the original socket message.
                let sender =
                decryptedMessage.sender ?? message.sender;

                const senderId =
                typeof sender === "object" && sender !== null
                    ? sender._id || sender.id
                    : sender;

                // Resolve the sender's username if it isn't already available.
                if (
                senderId &&
                (typeof sender !== "object" ||
                    sender === null ||
                    !sender.username)
                ) {
                try {
                    sender = await getUserById(senderId, token);
                } catch (error) {
                    console.error("Failed to resolve message sender:", error);
                }
                }

                const resolvedMessage = {
                ...decryptedMessage,
                sender:
                    typeof sender === "object" && sender !== null
                    ? sender
                    : decryptedMessage.sender ?? message.sender,
                };

                setMessages((currentMessages) => ({
                ...currentMessages,
                [message.channel]: [
                    ...(currentMessages[message.channel] || []),
                    resolvedMessage,
                ],
                }));
            } catch (error) {
                console.error("Failed to process new channel message:", error);
            }
        };

        socket.on("newMessage", handleNewMessage);

        return () => {
            socket.off("newMessage", handleNewMessage);
        };
    }, [encryptionKeyPair, token]);

    useEffect(() => { 
        
        const handleNewDirectMessage = async (message) => {
            try {
                await updateMessageStatus(message._id, "delivered", token);
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
        if (!activeChannel && !activeDM) return;
        let cancelled = false;

        const loadMessages = async () => {
            if (!token) return;
            setLoadingMessages(true);

            try {
                if (activeDM) {
                    const user = await getUserByUsername(activeDM, token);

                    const dmMessages = await getDirectMessages(user._id, token);
                    if (cancelled) return;

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

                    if (cancelled) return;

                    const decryptedChannelMessages = await Promise.all(
                        channelMessages.map((message) =>
                            decryptChannelMessage(message)
                        )
                    );

                    if (cancelled) return;

                    setMessages((currentMessages) => ({
                        ...currentMessages,
                        [activeChannel]: decryptedChannelMessages,
                    }));
                }
            } catch (error) {
                console.error("Failed to load messages:", error);
            } finally {
                if (!cancelled) {
                    setLoadingMessages(false);
                }
            }
        };

        loadMessages();

        return () => {
            cancelled = true;
        };
    }, [activeChannel, activeDM, token, encryptionKeyPair]);

    const handleSend = async (text) => {
        if (!text.trim()) return;

        if (!token) {
            console.error("No authentication token found");
            return;
        }

        try {
            if (activeDM) {
                if (
                    !encryptionKeyPair?.privateKey ||
                    !encryptionKeyPair?.signingPrivateKey
                    ) {
                    throw new Error(
                        "Unlock your encryption and signing keys first."
                    );
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

                const signature = await signMessage(
                    text,
                    encryptionKeyPair.signingPrivateKey
                );

                const savedMessage = await sendMessage(
                    null,
                    encryptedForRecipient.content,
                    token,
                    recipient._id,
                    encryption,
                    signature,
                    1
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
                if (
                    !encryptionKeyPair?.privateKey ||
                    !encryptionKeyPair?.signingPrivateKey
                ) {
                    throw new Error(
                        "Unlock your encryption and signing keys first."
                    );
                }

                // Get the channel and its current members.
                const channel = await getChannel(activeChannel, token);

                if (!Array.isArray(channel.members) || channel.members.length === 0) {
                    throw new Error("This channel has no members.");
                }

                // Encrypt a separate copy for every member, including yourself.
                const recipientContents = await Promise.all(
                    channel.members.map(async (member) => {
                        const userId =
                            typeof member === "object" ? member._id : member;

                        if (!userId) {
                            throw new Error(
                                "Could not identify a channel member."
                            );
                        }

                        const userKey = await getUserPublicKey(userId, token);

                        if (!userKey.publicKey) {
                            throw new Error(
                                `A public encryption key is missing for a channel member.`
                            );
                        }

                        const encrypted = await encryptMessageForRecipient(
                            text,
                            userKey.publicKey
                        );

                        return {
                            userId: String(userId),
                            content: encrypted.content,
                        };
                    })
                );

                // Sign the original plaintext.
                const signature = await signMessage(
                    text,
                    encryptionKeyPair.signingPrivateKey
                );

                // Use the sender's encrypted copy for the main content field.
                const senderCopy = recipientContents.find(
                    (item) => item.userId === String(localStorage.getItem("userId"))
                );

                if (!senderCopy) {
                    throw new Error(
                        "Could not find your encrypted copy of the message."
                    );
                }

                const encryption = {
                    algorithm: "crypto_box_seal",
                    nonce: null,
                    version: 1,
                    recipientContents,
                };

                const savedMessage = await sendMessage(
                    activeChannel,
                    senderCopy.content,
                    token,
                    null,
                    encryption,
                    signature,
                    1
                );

                // Show the original plaintext locally after successful submission.
                // Resolve the sender before displaying the message locally.
                const currentUser = await getUserById(
                    localStorage.getItem("userId"),
                    token
                    );

                    setMessages((currentMessages) => ({
                    ...currentMessages,
                    [activeChannel]: [
                        ...(currentMessages[activeChannel] || []),
                        {
                        ...savedMessage,
                        sender: currentUser,
                        content: text,
                        },
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

  return (
    <section className="chat-area nexus-chat-area">
      <header className="chat-channel-header">
        <div className="chat-channel-heading">
          <div className="chat-channel-icon">
            {activeDM ? (
              <LockKeyhole size={19} />
            ) : (
              <Hash size={20} />
            )}
          </div>

          <div className="chat-channel-title">
            <h2>{activeDM || (channelName ? `#${channelName}` : "Messages")}</h2>
            <p>
              {activeDM
                ? "PRIVATE CONVERSATION"
                : "NEXUS WORKSPACE · CHANNEL"}
            </p>
          </div>
        </div>

        <div className="chat-header-status">
          <span className="chat-status-dot" />
          <span>{activeDM ? "DIRECT MESSAGE" : "CHANNEL ACTIVE"}</span>
          <span className="chat-header-divider" />
          <ShieldCheck size={16} />
          <span>{activeDM ? "E2E ENCRYPTION" : "WORKSPACE"}</span>
        </div>
      </header>

      <div className="chat-message-region">
        {loadingMessages ? (
            <div className="chat-loading">
            <span className="chat-loading-spinner" />
            <p>Loading messages...</p>
            </div>
        ) : (
            <MessageList
            messages={activeDM ? messages.dm : messages[activeChannel]}
            />
        )}
      </div>

      <div className="chat-composer-region">
        <MessageInput
            onSend={handleSend}
            activeChannel={activeChannel}
            channelName={channelName}
            activeDM={activeDM}
        />

        <div className="chat-security-footer">
          <span>
            <LockKeyhole size={12} />
            {activeDM ? "DIRECT MESSAGE" : "NEXUS WORKSPACE"}
          </span>
          <span className="security-footer-separator">|</span>
          <span className="security-footer-encryption">
            <ShieldCheck size={13} />
            {activeDM ? "E2E ENCRYPTION" : "SECURE SESSION"}
          </span>
        </div>
      </div>
    </section>
  );
}

export default ChatArea;