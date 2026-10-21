import "dotenv/config";
import mongoose from "mongoose";
import connectDB from "../config/db.js";
import Channel from "../models/Channel.js";

const defaultChannels = [
  { name: "general", description: "General discussions" },
  { name: "engineering", description: "Development and engineering" },
  { name: "security", description: "Security discussions" },
  { name: "random", description: "Off-topic conversations" },
];

async function seedChannels() {
  try {
    await connectDB();

    for (const item of defaultChannels) {
      const existing = await Channel.findOne({ name: item.name });

      if (existing) {
        console.log(`Already exists: #${item.name}`);
        continue;
      }

      await Channel.create({
        ...item,
        createdBy: null,
        members: [],
      });

      console.log(`Created: #${item.name}`);
    }

    console.log("Default channel initialization complete.");
  } catch (error) {
    console.error("Channel initialization failed:", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

seedChannels();