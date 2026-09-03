const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const bcrypt = require("bcrypt");
const User = require("./models/User");

passport.use(
  new LocalStrategy({ usernameField: "username", passwordField: "password" }, async (username, password, done) => {
    try {
      const user = await User.findOne({ username });
      if (!user) return done(null, false, { message: "Invalid credentials" });
      const ok = await bcrypt.compare(password, user.passwordHash);
      if (!ok) return done(null, false, { message: "Invalid credentials" });
      return done(null, user);
    } catch (err) {
      return done(err);
    }
  })
);

passport.serializeUser((user, done) => done(null, user._id.toString()));
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user || false);
  } catch (err) {
    done(err);
  }
});

function ensureAuth(req, res, next) {
  if (req.isAuthenticated && req.isAuthenticated()) return next();
  return res.status(401).json({ error: "Unauthorized" });
}

module.exports = { passport, ensureAuth };
