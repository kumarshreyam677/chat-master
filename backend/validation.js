const Joi = require("joi");

const registerSchema = Joi.object({
  username: Joi.string().min(3).max(30).alphanum().required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).max(128).required(),
  bio: Joi.string().max(240).allow(""),
  avatar: Joi.string().uri().allow(""),
});

const loginSchema = Joi.object({
  username: Joi.string().required(),
  password: Joi.string().required(),
});

const profileSchema = Joi.object({
  bio: Joi.string().max(240).allow(""),
  avatar: Joi.string().uri().allow(""),
});

const listingSchema = Joi.object({
  title: Joi.string().min(3).max(120).required(),
  description: Joi.string().min(10).max(4000).required(),
  price: Joi.number().min(0).required(),
  location: Joi.string().min(2).max(200).required(),
  country: Joi.string().max(120).allow(""),
  category: Joi.string().max(60).allow(""),
});

const reviewSchema = Joi.object({
  rating: Joi.number().integer().min(1).max(5).required(),
  comment: Joi.string().min(1).max(2000).required(),
});

const messageSchema = Joi.object({
  conversationId: Joi.string().required(),
  text: Joi.string().max(4000).allow(""),
  attachmentUrl: Joi.string().uri().allow(""),
}).or("text", "attachmentUrl");

const conversationSchema = Joi.object({
  participantIds: Joi.array().items(Joi.string()).min(1).required(),
  isGroup: Joi.boolean().default(false),
  name: Joi.string().max(80).allow(""),
  listingId: Joi.string().allow(null, ""),
});

const validate = (schema) => (req, res, next) => {
  const { error, value } = schema.validate(req.body, { abortEarly: false, stripUnknown: true });
  if (error) {
    return res.status(400).json({ error: "ValidationError", details: error.details.map((d) => d.message) });
  }
  req.body = value;
  next();
};

module.exports = {
  validate,
  registerSchema,
  loginSchema,
  profileSchema,
  listingSchema,
  reviewSchema,
  messageSchema,
  conversationSchema,
};
