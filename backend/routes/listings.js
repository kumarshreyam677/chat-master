const express = require("express");
const mongoose = require("mongoose");
const Listing = require("../models/Listing");
const Review = require("../models/Review");
const { ensureAuth } = require("../passportConfig");
const { validate, listingSchema, reviewSchema } = require("../validation");
const { upload, isConfigured, filesToImages } = require("../cloudinary");
const { geocode } = require("../mapbox");

const router = express.Router();

// GET all listings (public browse)
router.get("/", async (req, res) => {
  const listings = await Listing.find({}).populate("owner", "username avatar").sort({ createdAt: -1 });
  res.json({ listings });
});

// GET listing details
router.get("/:id", async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: "Bad ID" });
  const listing = await Listing.findById(req.params.id)
    .populate("owner", "username avatar")
    .populate({ path: "reviews", populate: { path: "author", select: "username avatar" } });
  if (!listing) return res.status(404).json({ error: "Not found" });
  res.json({ listing });
});

// CREATE listing (auth + multipart upload up to 5 images)
router.post("/", ensureAuth, upload.array("images", 5), async (req, res, next) => {
  try {
    const { error, value } = listingSchema.validate(req.body, { abortEarly: false, stripUnknown: true });
    if (error) return res.status(400).json({ error: "ValidationError", details: error.details.map((d) => d.message) });
    const images = filesToImages(req.files);
    const { coordinates, country } = await geocode(value.location);
    const listing = await Listing.create({
      ...value,
      country: value.country || country,
      images,
      geometry: { type: "Point", coordinates },
      owner: req.user._id,
    });
    const populated = await listing.populate("owner", "username avatar");
    res.status(201).json({ listing: populated });
  } catch (err) {
    next(err);
  }
});

// UPDATE listing (owner only)
router.put("/:id", ensureAuth, upload.array("images", 5), async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: "Bad ID" });
    const listing = await Listing.findById(req.params.id);
    if (!listing) return res.status(404).json({ error: "Not found" });
    if (!listing.owner.equals(req.user._id)) return res.status(403).json({ error: "Forbidden" });
    const { error, value } = listingSchema.validate(req.body, { abortEarly: false, stripUnknown: true });
    if (error) return res.status(400).json({ error: "ValidationError", details: error.details.map((d) => d.message) });
    Object.assign(listing, value);
    if (req.files && req.files.length) {
      listing.images = [...listing.images, ...filesToImages(req.files)];
    }
    if (value.location) {
      const { coordinates, country } = await geocode(value.location);
      listing.geometry = { type: "Point", coordinates };
      if (!value.country) listing.country = country;
    }
    await listing.save();
    const populated = await listing.populate("owner", "username avatar");
    res.json({ listing: populated });
  } catch (err) {
    next(err);
  }
});

// DELETE listing (owner only, cascades reviews + linked conversations)
router.delete("/:id", ensureAuth, async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: "Bad ID" });
    const listing = await Listing.findById(req.params.id);
    if (!listing) return res.status(404).json({ error: "Not found" });
    if (!listing.owner.equals(req.user._id)) return res.status(403).json({ error: "Forbidden" });
    await Listing.findOneAndDelete({ _id: listing._id }); // triggers cascade
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// REVIEWS ---------------------------------
router.post("/:id/reviews", ensureAuth, validate(reviewSchema), async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: "Bad ID" });
    const listing = await Listing.findById(req.params.id);
    if (!listing) return res.status(404).json({ error: "Not found" });
    const review = await Review.create({ ...req.body, author: req.user._id, listing: listing._id });
    listing.reviews.push(review._id);
    await listing.save();
    const populated = await review.populate("author", "username avatar");
    res.status(201).json({ review: populated });
  } catch (err) {
    next(err);
  }
});

router.delete("/:id/reviews/:reviewId", ensureAuth, async (req, res, next) => {
  try {
    const { id, reviewId } = req.params;
    if (!mongoose.isValidObjectId(id) || !mongoose.isValidObjectId(reviewId))
      return res.status(400).json({ error: "Bad ID" });
    const review = await Review.findById(reviewId);
    if (!review) return res.status(404).json({ error: "Not found" });
    if (!review.author.equals(req.user._id)) return res.status(403).json({ error: "Forbidden" });
    await Review.findOneAndDelete({ _id: review._id }); // cascade will pull from listing
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
module.exports.cloudinaryConfigured = isConfigured;
