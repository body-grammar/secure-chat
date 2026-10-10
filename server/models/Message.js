import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    channel: {
      type: String,
      trim: true,
    },

    
    content: {
      type: String,
      required: true,
      trim: true,
    },

    encryption: {
      algorithm: {
        type: String,
        default: null,
      },
      nonce: {
        type: String,
        default: null,
      },
      version: {
        type: Number,
        default: null,
      },
    },

  },
  {
    timestamps: true,
  }
);

const Message = mongoose.model("Message", messageSchema);

export default Message;