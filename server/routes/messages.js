import express from "express";
import Message from "../models/Message.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/dm/:userId", authMiddleware, async (req, res) => {
  try {
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

    res.json({ messages });
  } catch (error) {
    console.error("Fetch DM messages error:", error);

    res.status(500).json({
      message: "Failed to fetch direct messages",
    });
  }
});

router.get("/:channel", authMiddleware, async (req, res) => {
  try {
    const messages = await Message.find({
      channel: req.params.channel,
    })
      .populate("sender", "username email")
      .sort({ createdAt: 1 });

    res.json({
      messages,
    });
  } catch (error) {
    console.error("Fetch messages error:", error);

    res.status(500).json({
      message: "Failed to fetch messages",
    });
  }
});


router.post("/", authMiddleware, async (req, res) => {
  try {
    const { channel, recipient, content, encryption = null } = req.body;

    if ((!channel && !recipient) || typeof content !== "string" || !content.trim()) {
      return res.status(400).json({
        message: "Channel or recipient and content are required",
      });
    }

    if (encryption !== null) {
      if (
        typeof encryption !== "object" ||
        encryption.algorithm !== "crypto_box_seal" ||
        encryption.version !== 1
      ) {
        return res.status(400).json({
          message: "Unsupported encryption metadata",
        });
      }

      // Sealed-box messages are currently supported only for direct messages.
      if (!recipient || channel) {
        return res.status(400).json({
          message: "Encrypted messages currently require a direct-message recipient",
        });
      }
    }

    const message = await Message.create({
      sender: req.user.userId,
      recipient: recipient || undefined,
      channel: channel || undefined,
      content,
      encryption: encryption
        ? {
            algorithm: encryption.algorithm,
            nonce: null,
            version: encryption.version,
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