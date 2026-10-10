import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/register", async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({
        message: "Username, email, and password are required",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const existingUser = await User.findOne({
      $or: [
        { username },
        { email: normalizedEmail },
      ],
    });

    if (existingUser) {
      return res.status(409).json({
        message: "Username or email already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await User.create({
      username,
      email: normalizedEmail,
      password: hashedPassword,
    });

    res.status(201).json({
      message: "User registered successfully",
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("Registration error:", error);

    res.status(500).json({
      message: "Registration failed",
    });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const normalizedEmail = email.trim().toLowerCase();

    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required",
      });
    }

    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    const passwordMatches = await bcrypt.compare(
      password,
      user.password
    );

    console.log("Password matches:", passwordMatches);

    if (!passwordMatches) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    const token = jwt.sign(
      {
        userId: user._id,
        username: user.username,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "1h",
      }
    );

    res.json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("Login error:", error);

    res.status(500).json({
      message: "Login failed",
    });
  }
});

router.get("/me", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select(
      "-password"
    );

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    res.json({
      user,
    });
  } catch (error) {
    console.error("Fetch user error:", error);

    res.status(500).json({
      message: "Failed to fetch user",
    });
  }
});

router.get("/", authMiddleware, async (req, res) => {
  try {
    const users = await User.find({
      _id: { $ne: req.user.userId },
    }).select("_id username");

    res.json({ users });
  } catch (error) {
    console.error("Fetch users error:", error);
    res.status(500).json({
      message: "Failed to fetch users",
    });
  }
});

router.get("/username/:username", authMiddleware, async (req, res) => {
    try {
        const user = await User.findOne({
            username: req.params.username
        }).select("_id username email");

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        res.json({ user });
    } catch (error) {
        console.error("User lookup error:", error);
        res.status(500).json({ message: "Failed to find user" });
    }
});


router.put("/public-key", authMiddleware, async (req, res) => {
  try {
    const { publicKey } = req.body;

    if (
      typeof publicKey !== "string" ||
      publicKey.length < 20 ||
      publicKey.length > 500
    ) {
      return res.status(400).json({
        message: "A valid public key is required",
      });
    }

    const user = await User.findByIdAndUpdate(
      req.user.userId,
      { publicKey },
      { new: true, runValidators: true }
    ).select("_id username publicKey publicKeyVersion");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ user });
  } catch (error) {
    console.error("Public key registration error:", error);
    res.status(500).json({
      message: "Failed to register public key",
    });
  }
});

router.get("/:userId/public-key", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId)
      .select("_id username publicKey publicKeyVersion");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!user.publicKey) {
      return res.status(404).json({
        message: "This user has not registered an encryption key",
      });
    }

    res.json({
      userId: user._id,
      username: user.username,
      publicKey: user.publicKey,
      publicKeyVersion: user.publicKeyVersion,
    });
  } catch (error) {
    console.error("Public key lookup error:", error);
    res.status(500).json({
      message: "Failed to retrieve public key",
    });
  }
});

export default router;