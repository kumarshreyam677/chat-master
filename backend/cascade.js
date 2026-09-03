// Cascade delete hooks for referential integrity.
// - Deleting a User removes their Listings (which triggers Review cascade) and their Messages.
// - Deleting a Listing removes all its Reviews and any linked Conversations + Messages.
// - Deleting a Review pulls its ID from the parent Listing's reviews array.
// - Deleting a Conversation removes all its Messages.

const User = require("./models/User");
const Listing = require("./models/Listing");
const Review = require("./models/Review");
const Conversation = require("./models/Conversation");
const Message = require("./models/Message");

// LISTING -> Reviews + linked Conversations + their Messages
Listing.schema.post("findOneAndDelete", async function (doc) {
  if (!doc) return;
  await Review.deleteMany({ _id: { $in: doc.reviews } });
  const convos = await Conversation.find({ listing: doc._id });
  const convoIds = convos.map((c) => c._id);
  await Message.deleteMany({ conversation: { $in: convoIds } });
  await Conversation.deleteMany({ _id: { $in: convoIds } });
});

// REVIEW -> pull from parent listing
Review.schema.post("findOneAndDelete", async function (doc) {
  if (!doc) return;
  await Listing.updateOne({ _id: doc.listing }, { $pull: { reviews: doc._id } });
});

// CONVERSATION -> Messages
Conversation.schema.post("findOneAndDelete", async function (doc) {
  if (!doc) return;
  await Message.deleteMany({ conversation: doc._id });
});

// USER -> Listings (each triggers listing cascade), Messages, Conversations they own (participants)
User.schema.post("findOneAndDelete", async function (doc) {
  if (!doc) return;
  const listings = await Listing.find({ owner: doc._id });
  for (const l of listings) {
    await Listing.findOneAndDelete({ _id: l._id });
  }
  await Message.deleteMany({ sender: doc._id });
  // Remove user from participant lists (do not delete group convos, but delete 1:1 that become orphan)
  const convos = await Conversation.find({ participants: doc._id });
  for (const c of convos) {
    c.participants = c.participants.filter((p) => !p.equals(doc._id));
    if (c.participants.length < 2 && !c.isGroup) {
      await Conversation.findOneAndDelete({ _id: c._id });
    } else {
      await c.save();
    }
  }
});

module.exports = { User, Listing, Review, Conversation, Message };
