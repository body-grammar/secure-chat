import express from "express";
import Channel from "../models/Channel.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

// Create a channel
router.post("/", authMiddleware, async (req, res) => {
  try {
    const { name, description = "" } = req.body;

    if (typeof name !== "string" || !name.trim()) {
      return res.status(400).json({
        message: "Channel name is required",
      });
    }

    const normalizedName = name.trim().toLowerCase();

    if (normalizedName.length < 2 || normalizedName.length > 40) {
      return res.status(400).json({
        message: "Channel name must be 2–40 characters long",
      });
    }

    const existingChannel = await Channel.findOne({
      name: normalizedName,
    });

    if (existingChannel) {
      return res.status(409).json({
        message: "A channel with this name already exists",
      });
    }

    const channel = await Channel.create({
      name: normalizedName,
      description:
        typeof description === "string" ? description.trim() : "",
      createdBy: req.user.userId,
      members: [req.user.userId],
    });

    return res.status(201).json({ channel });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message: "A channel with this name already exists",
      });
    }

    console.error("Create channel error:", error);
    return res.status(500).json({
      message: "Failed to create channel",
    });
  }
});

 // Discover available channels without joining them
router.get("/discover", authMiddleware, async (req, res) => {
  try {
    const channels = await Channel.find({})
      .select("name description createdAt members")
      .sort({ name: 1 });

    const availableChannels = channels.map((channel) => ({
      _id: channel._id,
      name: channel.name,
      description: channel.description,
      createdAt: channel.createdAt,
      memberCount: channel.members.length,
      isMember: channel.members.some(
        (memberId) =>
          String(memberId) === String(req.user.userId)
      ),
    }));

    return res.json({ channels: availableChannels });
  } catch (error) {
    console.error("Discover channels error:", error);
    return res.status(500).json({
      message: "Failed to discover channels",
    });
  }
});

router.post("/:channelId/join", authMiddleware, async (req, res) => {
  try {
    const channel = await Channel.findById(req.params.channelId);

    if (!channel) {
      return res.status(404).json({ message: "Channel not found" });
    }

    const userId = req.user.userId;
    const alreadyMember = channel.members.some(
      (memberId) => String(memberId) === String(userId)
    );

    if (!alreadyMember) {
      channel.members.push(userId);
      await channel.save();
    }

    return res.json({
      message: alreadyMember
        ? "You have already joined this channel"
        : "Successfully joined channel",
      channel,
    });
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(400).json({ message: "Invalid channel ID" });
    }

    console.error("Join channel error:", error);
    return res.status(500).json({ message: "Failed to join channel" });
  }
});

router.get("/:channelId", authMiddleware, async (req, res) => {
  try {
    const channel = await Channel.findOne({
      _id: req.params.channelId,
      members: req.user.userId,
    });

    if (!channel) {
      return res.status(404).json({
        message: "Channel not found",
      });
    }

    return res.json({ channel });
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(400).json({
        message: "Invalid channel ID",
      });
    }

    console.error("Fetch channel error:", error);
    return res.status(500).json({
      message: "Failed to fetch channel",
    });
  }
});

// List channels the authenticated user belongs to
router.get("/", authMiddleware, async (req, res) => {
  try {
    const channels = await Channel.find({
      members: req.user.userId,
    }).sort({ createdAt: -1 });

    return res.json({ channels });
  } catch (error) {
    console.error("Fetch channels error:", error);
    return res.status(500).json({
      message: "Failed to fetch channels",
    });
  }
});

export default router;