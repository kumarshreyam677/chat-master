const mongoose = require("mongoose");
const { Schema } = mongoose;

const MessageSchema = new Schema(
  {
    conversation: { type: Schema.Types.ObjectId, ref: "Conversation", required: true, index: true },
    sender: { type: Schema.Types.ObjectId, ref: "User", required: true },
    text: { type: String, default: "" },
    attachmentUrl: { type: String, default: "" },
    readBy: [{ type: Schema.Types.ObjectId, ref: "User" }],
    deliveredTo: [{ type: Schema.Types.ObjectId, ref: "User" }],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Message", MessageSchema);
