import mongoose from "mongoose";

const dmConversationSchema = new mongoose.Schema(
  {
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
    ],
  },
  { timestamps: true }
);

dmConversationSchema.index({ participants: 1 });

export default mongoose.model("DMConversation", dmConversationSchema);