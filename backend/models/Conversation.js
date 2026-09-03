const mongoose = require("mongoose");
const { Schema } = mongoose;

const ConversationSchema = new Schema(
  {
    isGroup: { type: Boolean, default: false },
    name: { type: String, default: "" }, // for groups
    avatar: { type: String, default: "" },
    participants: [{ type: Schema.Types.ObjectId, ref: "User", required: true }],
    lastMessage: { type: Schema.Types.ObjectId, ref: "Message" },
    // Per-user folder tagging
    folders: {
      favorites: [{ type: Schema.Types.ObjectId, ref: "User" }],
      archived: [{ type: Schema.Types.ObjectId, ref: "User" }],
    },
    // Optional linkage to a marketplace listing (Marketplace folder)
    listing: { type: Schema.Types.ObjectId, ref: "Listing", default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Conversation", ConversationSchema);
