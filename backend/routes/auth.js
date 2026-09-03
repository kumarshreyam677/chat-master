const express = require("express");
const bcrypt = require("bcrypt");
const User = require("../models/User");
const { passport, ensureAuth } = require("../passportConfig");
const { validate, registerSchema, loginSchema, profileSchema } = require("../validation");

const router = express.Router();

router.post("/register", validate(registerSchema), async (req, res, next) => {
  try {
    const { username, email, password, bio = "", avatar = "" } = req.body;
    const exists = await User.findOne({ $or: [{ username }, { email }] });
    if (exists) return res.status(409).json({ error: "Username or email already in use" });
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ username, email, passwordHash, bio, avatar });
    req.login(user, (err) => {
      if (err) return next(err);
      res.status(201).json({ user: user.toSafeJSON() });
    });
  } catch (err) {
    next(err);
  }
});

router.post("/login", validate(loginSchema), (req, res, next) => {
  passport.authenticate("local", (err, user, info) => {
    if (err) return next(err);
    if (!user) return res.status(401).json({ error: info?.message || "Invalid credentials" });
    req.login(user, (err2) => {
      if (err2) return next(err2);
      res.json({ user: user.toSafeJSON() });
    });
  })(req, res, next);
});

router.post("/logout", (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err);
    req.session.destroy(() => res.json({ ok: true }));
  });
});

router.get("/me", (req, res) => {
  if (!req.user) return res.json({ user: null });
  res.json({ user: req.user.toSafeJSON() });
});

router.put("/me", ensureAuth, validate(profileSchema), async (req, res, next) => {
  try {
    Object.assign(req.user, req.body);
    await req.user.save();
    res.json({ user: req.user.toSafeJSON() });
  } catch (err) {
    next(err);
  }
});

router.get("/users", ensureAuth, async (req, res) => {
  const q = (req.query.q || "").trim();
  const filter = q ? { username: { $regex: q, $options: "i" } } : {};
  const users = await User.find(filter).limit(50);
  res.json({ users: users.filter((u) => !u._id.equals(req.user._id)).map((u) => u.toSafeJSON()) });
});

module.exports = router;
