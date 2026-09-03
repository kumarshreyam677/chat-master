const mongoose = require("mongoose");
const { Schema } = mongoose;

const UserSchema = new Schema(
  {
    username: { type: String, required: true, unique: true, index: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    avatar: { type: String, default: "" },
    bio: { type: String, default: "" },
    online: { type: Boolean, default: false },
    lastSeen: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

UserSchema.methods.toSafeJSON = function () {
  const { _id, username, email, avatar, bio, online, lastSeen, createdAt } = this;
  return { id: _id.toString(), username, email, avatar, bio, online, lastSeen, createdAt };
};

module.exports = mongoose.model("User", UserSchema);
