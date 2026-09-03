const mongoose = require("mongoose");
const { Schema } = mongoose;

const ReviewSchema = new Schema(
  {
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, required: true, trim: true },
    author: { type: Schema.Types.ObjectId, ref: "User", required: true },
    listing: { type: Schema.Types.ObjectId, ref: "Listing", required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Review", ReviewSchema);
