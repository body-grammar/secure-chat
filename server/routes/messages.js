import express from "express";
import Message from "../models/Message.js";
import authMiddleware from "../middleware/authMiddleware.js";
import Channel from "../models/Channel.js";
import User from "../models/User.js";
import sodium from "libsodium-wrappers";
import { ReceiptIcon } from "lucide-react";
import mongoose from "mongoose";
import DMConversation from "../models/DMConversation.js";

const router = express.Router();

router.post("/dm/conversations/:userId", authMiddleware, async (req, res) => {
  try {
    const currentUserId = req.user.userId;
    const selectedUserId = req.params.userId;

    if (currentUserId === selectedUserId) {
      return res.status(400).json({
        message: "You cannot start a conversation with yourself",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(selectedUserId)) {
      return res.status(400).json({
        message: "Invalid user ID",
      });
    }

    const selectedUser = await User.findById(selectedUserId).select(
      "_id username email"
    );

    if (!selectedUser) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    const participants = [
      new mongoose.Types.ObjectId(currentUserId),
      new mongoose.Types.ObjectId(selectedUserId),
    ];

    const existingConversation = await DMConversation.findOne({
      participants: { $all: participants, $size: 2 },
    });

    if (!existingConversation) {
      await DMConversation.create({ participants });
    }

    return res.status(200).json({
      message: "Conversation saved",
      user: selectedUser,
    });
  } catch (error) {
    console.error("Save DM conversation error:", error);

    return res.status(500).json({
      message: "Failed to save conversation",
    });
  }
});

// Get users with whom the current user has exchanged direct messages
router.get("/dm/conversations", authMiddleware, async (req, res) => {
  try {
    const currentUserId = new mongoose.Types.ObjectId(req.user.userId);

    // Find explicitly selected DM conversations.
    const savedConversations = await DMConversation.find({
      participants: currentUserId,
    })
      .populate("participants", "username email")
      .lean();

    const savedUsers = savedConversations.flatMap((conversation) =>
      conversation.participants
        .filter(
          (user) => user._id.toString() !== currentUserId.toString()
        )
        .map((user) => ({
          _id: user._id,
          username: user.username,
          email: user.email,
        }))
    );

    // Find users with whom the current user has exchanged messages.
    const messagedUsers = await Message.aggregate([
      {
        $match: {
          channel: { $exists: false },
          $or: [
            { sender: currentUserId },
            { recipient: currentUserId },
          ],
        },
      },
      {
        $group: {
          _id: {
            $cond: [
              { $eq: ["$sender", currentUserId] },
              "$recipient",
              "$sender",
            ],
          },
        },
      },
      { $match: { _id: { $ne: null } } },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" },
      {
        $project: {
          _id: "$user._id",
          username: "$user.username",
          email: "$user.email",
        },
      },
    ]);

    // Combine both lists without duplicates.
    const uniqueUsers = new Map();

    [...savedUsers, ...messagedUsers].forEach((user) => {
      uniqueUsers.set(user._id.toString(), user);
    });

    const conversations = [...uniqueUsers.values()].sort((a, b) =>
      a.username.localeCompare(b.username)
    );

    return res.json({ conversations });
  } catch (error) {
    console.error("Fetch DM conversations error:", error);

    return res.status(500).json({
      message: "Failed to fetch DM conversations",
    });
  }
});

router.get("/dm/:userId", authMiddleware, async (req, res) => {
  try {
    if (req.params.userId === req.user.userId) {
      return res.status(400).json({
        message: "You cannot fetch a conversation with yourself",
      });
    }

    const otherUser = await User.findById(req.params.userId);

    if (!otherUser) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    const messages = await Message.find({
      $or: [
        {
          sender: req.user.userId,
          recipient: req.params.userId,
        },
        {
          sender: req.params.userId,
          recipient: req.user.userId,
        },
      ],
      channel: { $exists: false },
    })
      .populate("sender", "username email")
      .populate("recipient", "username email")
      .sort({ createdAt: 1 });

    return res.json({ messages });
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(400).json({
        message: "Invalid user ID",
      });
    }

    console.error("Fetch DM messages error:", error);

    return res.status(500).json({
      message: "Failed to fetch direct messages",
    });
  }
});

router.get("/:channel", authMiddleware, async (req, res) => {
  try {
    const channel = await Channel.findOne({
      _id: req.params.channel,
      members: req.user.userId,
    });

    if (!channel) {
      return res.status(404).json({
        message: "Channel not found or access denied",
      });
    }

    const messages = await Message.find({
      channel: channel._id.toString(),
    })
      .populate("sender", "username email")
      .sort({ createdAt: 1 });

    return res.json({ messages });
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(400).json({
        message: "Invalid channel ID",
      });
    }

    console.error("Fetch messages error:", error);
    return res.status(500).json({
      message: "Failed to fetch messages",
    });
  }
});

router.patch("/:messageId/status", authMiddleware, async (req, res) => {
  try {
    const { status } = req.body;

    if (!["delivered", "read"].includes(status)) {
      return res.status(400).json({
        message: "Status must be delivered or read",
      });
    }

    const message = await Message.findById(req.params.messageId);

    if (!message) {
      return res.status(404).json({
        message: "Message not found",
      });
    }

    // Only the recipient can acknowledge a direct message.
    if (
      !message.recipient ||
      message.recipient.toString() !== req.user.userId
    ) {
      return res.status(403).json({
        message: "Only the recipient can update this message status",
      });
    }

    // Status can advance from sent → delivered → read, never backwards.
    const rank = { sent: 0, delivered: 1, read: 2 };

    if (rank[status] > rank[message.status]) {
      message.status = status;
      await message.save();
    }

    // Notify the original sender in real time.
    const io = req.app.get("io");

    io.to(`user:${message.sender.toString()}`).emit(
      "messageStatusUpdated",
      {
        messageId: message._id.toString(),
        status: message.status,
      }
    );

    return res.json({ message });
  } catch (error) {
    console.error("Update message status error:", error);
    return res.status(500).json({
      message: "Failed to update message status",
    });
  }
});

router.post("/", authMiddleware, async (req, res) => {
  try {
    const {
      channel,
      recipient,
      content,
      encryption = null,
      signature = null,
      signingKeyVersion = 1,
    } = req.body;

    if ((!channel && !recipient) || typeof content !== "string" || !content.trim()) {
      return res.status(400).json({
        message: "Channel or recipient and content are required",
      });
    }

    if (recipient || channel) {
      if (typeof signature !== "string" || !signature.trim()) {
        return res.status(400).json({
          message: "Direct messages must include a digital signature",
        });
      }

      if (signingKeyVersion !== 1) {
        return res.status(400).json({
          message: "Unsupported signing key version",
        });
      }

      await sodium.ready;

      try {
        const signatureBytes = sodium.from_base64(signature);

        if (signatureBytes.length !== sodium.crypto_sign_BYTES) {
          return res.status(400).json({
            message: "Invalid digital signature",
          });
        }
      } catch {
        return res.status(400).json({
          message: "Digital signature must be valid Base64",
        });
      }
    }

    if ((recipient || channel) && !encryption) {
      return res.status(400).json({
        message: "Direct messages must be encrypted",
      });
    }
    if (encryption !== null) {
      if (
        typeof encryption !== "object" ||
        encryption === null ||
        encryption.algorithm !== "crypto_box_seal" ||
        encryption.version !== 1
      ) {
        return res.status(400).json({
          message: "Unsupported encryption metadata",
        });
      }

      await sodium.ready;

      const minimumLength = sodium.crypto_box_SEALBYTES + 1;

      if (recipient) {
        // Preserve the existing direct-message encryption format.
        if (
          typeof encryption.senderContent !== "string" ||
          !encryption.senderContent.trim() ||
          typeof encryption.recipientContent !== "string" ||
          !encryption.recipientContent.trim()
        ) {
          return res.status(400).json({
            message: "Encrypted message payloads are required",
          });
        }

        try {
          const contentBytes = sodium.from_base64(content);
          const senderBytes = sodium.from_base64(encryption.senderContent);
          const recipientBytes = sodium.from_base64(
            encryption.recipientContent
          );

          if (
            contentBytes.length < minimumLength ||
            senderBytes.length < minimumLength ||
            recipientBytes.length < minimumLength
          ) {
            return res.status(400).json({
              message: "Invalid encrypted message payload",
            });
          }
        } catch {
          return res.status(400).json({
            message: "Encrypted message payloads must be valid Base64",
          });
        }
      } else if (channel) {
        // Channel messages need a separate encrypted copy for every member.
        if (
          !Array.isArray(encryption.recipientContents) ||
          encryption.recipientContents.length === 0
        ) {
          return res.status(400).json({
            message: "Encrypted copies for channel members are required",
          });
        }

        const seenUserIds = new Set();

        try {
          for (const item of encryption.recipientContents) {
            if (
              !item ||
              typeof item.userId !== "string" ||
              !item.userId.trim() ||
              typeof item.content !== "string" ||
              !item.content.trim()
            ) {
              return res.status(400).json({
                message: "Invalid encrypted channel recipient",
              });
            }

            if (seenUserIds.has(item.userId)) {
              return res.status(400).json({
                message: "Duplicate channel recipient",
              });
            }

            seenUserIds.add(item.userId);

            const encryptedBytes = sodium.from_base64(item.content);

            if (encryptedBytes.length < minimumLength) {
              return res.status(400).json({
                message: "Invalid encrypted channel message payload",
              });
            }
          }
        } catch {
          return res.status(400).json({
            message: "Encrypted channel payloads must be valid Base64",
          });
        }

        // The main content field also needs to contain ciphertext.
        try {
          const contentBytes = sodium.from_base64(content);

          if (contentBytes.length < minimumLength) {
            return res.status(400).json({
              message: "Invalid encrypted message payload",
            });
          }
        } catch {
          return res.status(400).json({
            message: "Encrypted message payloads must be valid Base64",
          });
        }
      } else {
        return res.status(400).json({
          message: "A recipient or channel is required for encrypted messages",
        });
      }
    }

    if (channel) {
      const channelDoc = await Channel.findOne({
        _id: channel,
        members: req.user.userId,
      }).select("members");

      if (!channelDoc) {
        return res.status(403).json({
          message: "You must join this channel before sending messages",
        });
      }

      const memberIds = channelDoc.members.map((memberId) =>
        String(memberId)
      );

      const recipientContents = encryption?.recipientContents;

      if (!Array.isArray(recipientContents)) {
        return res.status(400).json({
          message: "Encrypted copies for channel members are required",
        });
      }

      const recipientIds = recipientContents.map((item) =>
        String(item.userId)
      );

      const hasDuplicates = new Set(recipientIds).size !== recipientIds.length;

      const allMembersIncluded =
        recipientIds.length === memberIds.length &&
        memberIds.every((memberId) => recipientIds.includes(memberId));

      if (hasDuplicates || !allMembersIncluded) {
        return res.status(400).json({
          message: "Encrypted recipients must match channel members",
        });
      }
    }

    if (recipient) {
      const recipientExists = await User.exists({
        _id: recipient,
      });

      if (!recipientExists) {
        return res.status(404).json({
          message: "Recipient not found",
        });
      }
    }

    const message = await Message.create({
      sender: req.user.userId,
      recipient: recipient || undefined,
      channel: channel || undefined,
      content,
      signature: signature || null,
      signingKeyVersion,
      encryption: encryption
        ? {
            algorithm: encryption.algorithm,
            nonce: null,
            version: encryption.version,
            senderContent: encryption.senderContent || null,
            recipientContent: encryption.recipientContent || null,
            recipientContents: Array.isArray(encryption.recipientContents)
              ? encryption.recipientContents.map((item) => ({
                  userId: item.userId,
                  content: item.content,
                }))
              : [],
          }
        : undefined,
    });

    res.status(201).json({ message });
  } catch (error) {
    console.error("Send message error:", error);

    res.status(500).json({
      message: "Failed to send message",
    });
  }
});

export default router;