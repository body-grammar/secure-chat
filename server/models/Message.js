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
      senderContent: {
        type: String,
        default: null,
      },
      recipientContent: {
        type: String,
        default: null,
      },
      recipientContents: [
        {
          userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
          },
          content: {
            type: String,
            required: true,
          },
        },
      ],
    },

    signature: {
      type: String,
      default: null,
    },
    signingKeyVersion: {
      type: Number,
      default: 1,
    },

    status: {
      type: String,
      enum: ["sent", "delivered", "read"],
      default: "sent",
    },

  },
  {
    timestamps: true,
  }
);

const Message = mongoose.model("Message", messageSchema);

export default Message;