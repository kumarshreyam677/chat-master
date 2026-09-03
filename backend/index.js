require("dotenv").config();

const path = require("path");
const http = require("http");
const express = require("express");
const cors = require("cors");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const mongoose = require("mongoose");
const { Server } = require("socket.io");

// Import models & hooks (side effect: registers cascade middleware)
require("./cascade");

const { passport } = require("./passportConfig");
const authRouter = require("./routes/auth");
const listingsRouter = require("./routes/listings");
const chatsRouter = require("./routes/chats");
const { MAPBOX_TOKEN } = require("./mapbox");
const { isConfigured: cloudinaryConfigured } = require("./cloudinary");
const Message = require("./models/Message");
const Conversation = require("./models/Conversation");
const User = require("./models/User");

const {
  MONGO_URL,
  DB_NAME,
  SESSION_SECRET = "dev_secret",
  CORS_ORIGINS = "*",
} = process.env;
const PORT = Number(process.env.PORT || 8001);
const allowedOrigins = CORS_ORIGINS.split(",").map((origin) => origin.trim()).filter(Boolean);
const isProduction = process.env.NODE_ENV === "production";

async function main() {
  await mongoose.connect(MONGO_URL, { dbName: DB_NAME });
  console.log(`[wispr] MongoDB connected: ${DB_NAME}`);

  const app = express();
  const server = http.createServer(app);
  const io = new Server(server, {
    cors: {
      origin: allowedOrigins.includes("*") ? true : allowedOrigins,
      credentials: true,
    },
  });
  app.set("io", io);
  app.set("trust proxy", 1);

  app.use(
    cors({
      origin: (origin, cb) => {
        if (!origin || allowedOrigins.includes("*") || allowedOrigins.includes(origin)) return cb(null, true);
        return cb(new Error("Origin is not allowed by CORS"));
      },
      credentials: true,
    })
  );
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true }));

  const sessionMiddleware = session({
    name: "wispr.sid",
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: MONGO_URL, dbName: DB_NAME, collectionName: "sessions" }),
    cookie: {
      httpOnly: true,
      sameSite: isProduction ? "none" : "lax",
      secure: isProduction,
      maxAge: 1000 * 60 * 60 * 24 * 14,
    },
  });
  app.use(sessionMiddleware);
  app.use(passport.initialize());
  app.use(passport.session());

  // Health
  app.get("/api/health", (_req, res) =>
    res.json({
      ok: true,
      cloudinaryConfigured,
      mapboxConfigured: !!MAPBOX_TOKEN,
      time: new Date().toISOString(),
    })
  );

  // Public config (client needs Mapbox token to render maps)
  app.get("/api/config", (_req, res) => {
    res.json({ mapboxToken: MAPBOX_TOKEN || "", cloudinaryConfigured });
  });

  app.use("/api/auth", authRouter);
  app.use("/api/listings", listingsRouter);
  app.use("/api/chats", chatsRouter);

  // Error handler
  app.use((err, _req, res, _next) => {
    console.error("[wispr] error", err);
    res.status(err.status || 500).json({ error: err.message || "Server error" });
  });

  // Socket.io — reuse express session so req.user is available
  io.engine.use(sessionMiddleware);
  io.engine.use(passport.initialize());
  io.engine.use(passport.session());

  io.on("connection", (socket) => {
    const req = socket.request;
    const user = req.user;
    if (!user) {
      socket.emit("unauthorized");
      return socket.disconnect(true);
    }
    const userId = user._id.toString();
    socket.join(`user:${userId}`);

    // Mark online + broadcast
    User.findByIdAndUpdate(userId, { online: true, lastSeen: new Date() }).catch(() => {});
    socket.broadcast.emit("presence:update", { userId, online: true });

    socket.on("conversation:join", ({ conversationId }) => {
      if (conversationId) socket.join(`convo:${conversationId}`);
    });

    socket.on("conversation:leave", ({ conversationId }) => {
      if (conversationId) socket.leave(`convo:${conversationId}`);
    });

    socket.on("typing", ({ conversationId, isTyping }) => {
      if (!conversationId) return;
      socket.to(`convo:${conversationId}`).emit("typing", {
        conversationId,
        userId,
        username: user.username,
        isTyping: !!isTyping,
      });
    });

    socket.on("message:send", async ({ conversationId, text, attachmentUrl }, ack) => {
      try {
        const convo = await Conversation.findById(conversationId);
        if (!convo || !convo.participants.some((p) => p.equals(user._id))) {
          if (ack) ack({ error: "Not found" });
          return;
        }
        const msg = await Message.create({
          conversation: convo._id,
          sender: user._id,
          text: text || "",
          attachmentUrl: attachmentUrl || "",
          readBy: [user._id],
          deliveredTo: [user._id],
        });
        convo.lastMessage = msg._id;
        await convo.save();
        const populated = await msg.populate("sender", "username avatar");
        io.to(`convo:${convo._id.toString()}`).emit("message:new", { message: populated });
        // Also emit to each participant's user room so their sidebar refreshes
        convo.participants.forEach((p) =>
          io.to(`user:${p.toString()}`).emit("conversation:bump", {
            conversationId: convo._id.toString(),
            lastMessage: populated,
          })
        );
        if (ack) ack({ message: populated });
      } catch (err) {
        console.error(err);
        if (ack) ack({ error: err.message });
      }
    });

    socket.on("message:read", async ({ conversationId }) => {
      try {
        await Message.updateMany(
          { conversation: conversationId, readBy: { $ne: user._id } },
          { $addToSet: { readBy: user._id } }
        );
        io.to(`convo:${conversationId}`).emit("message:read", {
          conversationId,
          userId,
        });
      } catch (e) {
        // ignore
      }
    });

    socket.on("disconnect", async () => {
      await User.findByIdAndUpdate(userId, { online: false, lastSeen: new Date() }).catch(() => {});
      socket.broadcast.emit("presence:update", { userId, online: false, lastSeen: new Date() });
    });
  });

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`[wispr] Server on :${PORT}  cloudinary=${cloudinaryConfigured} mapbox=${!!MAPBOX_TOKEN}`);
  });
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
