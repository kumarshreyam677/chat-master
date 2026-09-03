const express = require("express");
const mongoose = require("mongoose");
const Conversation = require("../models/Conversation");
const Message = require("../models/Message");
const User = require("../models/User");
const { ensureAuth } = require("../passportConfig");
const { validate, conversationSchema, messageSchema } = require("../validation");

const router = express.Router();

// List all conversations for current user with lastMessage populated
router.get("/", ensureAuth, async (req, res) => {
  const convos = await Conversation.find({ participants: req.user._id })
    .populate("participants", "username avatar online lastSeen")
    .populate({ path: "lastMessage", populate: { path: "sender", select: "username avatar" } })
    .populate("listing", "title images")
    .sort({ updatedAt: -1 });

  // Attach unread count per convo
  const withCounts = await Promise.all(
    convos.map(async (c) => {
      const unread = await Message.countDocuments({
        conversation: c._id,
        sender: { $ne: req.user._id },
        readBy: { $ne: req.user._id },
      });
      const obj = c.toObject();
      obj.unread = unread;
      obj.isFavorite = (c.folders?.favorites || []).some((u) => u.equals(req.user._id));
      obj.isArchived = (c.folders?.archived || []).some((u) => u.equals(req.user._id));
      return obj;
    })
  );
  res.json({ conversations: withCounts });
});

// Create (or return existing 1:1) conversation
router.post("/", ensureAuth, validate(conversationSchema), async (req, res, next) => {
  try {
    const { participantIds, isGroup, name, listingId } = req.body;
    const ids = [...new Set([...participantIds, req.user._id.toString()])].filter((id) =>
      mongoose.isValidObjectId(id)
    );

    if (!isGroup && ids.length === 2) {
      const existing = await Conversation.findOne({
        isGroup: false,
        participants: { $all: ids, $size: 2 },
        listing: listingId || null,
      })
        .populate("participants", "username avatar online lastSeen")
        .populate("listing", "title images");
      if (existing) return res.json({ conversation: existing });
    }

    const convo = await Conversation.create({
      isGroup: !!isGroup,
      name: isGroup ? name || "New Group" : "",
      participants: ids,
      listing: listingId || null,
    });
    const populated = await convo.populate("participants", "username avatar online lastSeen");
    res.status(201).json({ conversation: populated });
  } catch (err) {
    next(err);
  }
});

// Get messages of a conversation (paginated by createdAt desc, default 50)
router.get("/:id/messages", ensureAuth, async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: "Bad ID" });
  const convo = await Conversation.findById(req.params.id);
  if (!convo || !convo.participants.some((p) => p.equals(req.user._id)))
    return res.status(404).json({ error: "Not found" });
  const limit = Math.min(parseInt(req.query.limit || "50"), 200);
  const messages = await Message.find({ conversation: convo._id })
    .populate("sender", "username avatar")
    .sort({ createdAt: 1 })
    .limit(limit);
  res.json({ messages });
});

// Send a message via REST (also emits via socket if socket layer sets req.io)
router.post("/messages", ensureAuth, validate(messageSchema), async (req, res, next) => {
  try {
    const { conversationId, text = "", attachmentUrl = "" } = req.body;
    if (!mongoose.isValidObjectId(conversationId)) return res.status(400).json({ error: "Bad ID" });
    const convo = await Conversation.findById(conversationId);
    if (!convo || !convo.participants.some((p) => p.equals(req.user._id)))
      return res.status(404).json({ error: "Not found" });
    const msg = await Message.create({
      conversation: convo._id,
      sender: req.user._id,
      text,
      attachmentUrl,
      readBy: [req.user._id],
      deliveredTo: [req.user._id],
    });
    convo.lastMessage = msg._id;
    await convo.save();
    const populated = await msg.populate("sender", "username avatar");
    if (req.app.get("io")) {
      req.app.get("io").to(`convo:${convo._id.toString()}`).emit("message:new", { message: populated });
    }
    res.status(201).json({ message: populated });
  } catch (err) {
    next(err);
  }
});

// Mark all messages in convo as read for current user
router.post("/:id/read", ensureAuth, async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: "Bad ID" });
  await Message.updateMany(
    { conversation: req.params.id, readBy: { $ne: req.user._id } },
    { $addToSet: { readBy: req.user._id } }
  );
  if (req.app.get("io")) {
    req.app.get("io").to(`convo:${req.params.id}`).emit("message:read", {
      conversationId: req.params.id,
      userId: req.user._id.toString(),
    });
  }
  res.json({ ok: true });
});

// Toggle folder tag (favorites | archived)
router.post("/:id/folder/:folder", ensureAuth, async (req, res) => {
  const { folder } = req.params;
  if (!["favorites", "archived"].includes(folder)) return res.status(400).json({ error: "Bad folder" });
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: "Bad ID" });
  const convo = await Conversation.findById(req.params.id);
  if (!convo || !convo.participants.some((p) => p.equals(req.user._id)))
    return res.status(404).json({ error: "Not found" });
  const list = convo.folders[folder] || [];
  const has = list.some((u) => u.equals(req.user._id));
  if (has) convo.folders[folder] = list.filter((u) => !u.equals(req.user._id));
  else convo.folders[folder] = [...list, req.user._id];
  await convo.save();
  res.json({ ok: true, isActive: !has });
});

// Delete conversation for me (removes from participants; cascades if empty)
router.delete("/:id", ensureAuth, async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: "Bad ID" });
  const convo = await Conversation.findById(req.params.id);
  if (!convo) return res.status(404).json({ error: "Not found" });
  convo.participants = convo.participants.filter((p) => !p.equals(req.user._id));
  if (convo.participants.length < 2 && !convo.isGroup) {
    await Conversation.findOneAndDelete({ _id: convo._id });
  } else {
    await convo.save();
  }
  res.json({ ok: true });
});

module.exports = router;
