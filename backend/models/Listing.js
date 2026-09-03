const mongoose = require("mongoose");
const { Schema } = mongoose;

const ListingSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    location: { type: String, required: true },
    country: { type: String, default: "" },
    images: [
      {
        url: { type: String, required: true },
        publicId: { type: String, default: "" },
      },
    ],
    geometry: {
      type: { type: String, enum: ["Point"], default: "Point" },
      coordinates: { type: [Number], default: [0, 0] }, // [lng, lat]
    },
    owner: { type: Schema.Types.ObjectId, ref: "User", required: true },
    reviews: [{ type: Schema.Types.ObjectId, ref: "Review" }],
    category: { type: String, default: "Apartment" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Listing", ListingSchema);
