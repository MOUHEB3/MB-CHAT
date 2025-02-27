import express from "express";
import dotenv from "dotenv";
import mongoose from "mongoose";
import userRoutes from "./Routes/userRoutes.js";
import chatRoutes from "./Routes/chatRoutes.js";
import messageRoutes from "./Routes/messageRoutes.js";
import cors from "cors";
import { Server } from "socket.io";
import chalk from "chalk"; // 🎨 Import Chalk for Colored Logs

dotenv.config();

const app = express();

// Middleware
app.use(express.json());
app.use(
  cors({
    origin: "*",
    credentials: true,
  })
);

// Connect to MongoDB
const connect_db = async () => {
  try {
    await mongoose.connect(process.env.DATABASE);
    console.log(chalk.green.bold("✅ Connected to MongoDB"));
  } catch (error) {
    console.error(chalk.red.bold("❌ Database Connection Error:"), error.message);
  }
};
connect_db();

// Routes
app.use("/user", userRoutes);
app.use("/chats", chatRoutes);
app.use("/message", messageRoutes);
app.use("/api/chat", chatRoutes);

app.get("/", (req, res) => {
  res.send("Welcome to Chat Now 2025");
});

// Start HTTP Server
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(chalk.blue.bold(`🚀 Server running on port ${PORT}`));
});

// Initialize Socket.IO
const io = new Server(server, {
  cors: {
    origin: "*",
    credentials: true,
  },
  pingTimeout: 60000,
});

// Store the Socket.IO instance in the Express app's locals
app.locals.io = io;

// Store online users (Map for multiple socket connections per user)
const onlineUsers = new Map();

/** ==============================
 *  ✅ Socket.IO Event Handlers ✅
 *  ============================== */

// Handle user setup & online status
const handleUserSetup = (socket, userId) => {
  socket.userId = userId;

  if (!onlineUsers.has(userId)) {
    onlineUsers.set(userId, new Set());
    io.emit("user online", userId);
  }

  onlineUsers.get(userId).add(socket.id);
  socket.join(userId);
  socket.emit("connected");

  console.log(
    chalk.green(
      `🟢 User Connected: ${chalk.bold(userId)} | Socket: ${chalk.cyan(socket.id)}`
    )
  );
};

// Handle joining a chat room
const handleJoinChat = (socket, room) => {
  socket.join(room);
  console.log(
    chalk.magenta(
      `📌 Socket ${chalk.cyan(socket.id)} joined room: ${chalk.yellow(room)}`
    )
  );
};

// Handle typing indicators
const handleTyping = (socket, room) => {
  socket.to(room).emit("typing", room);
  console.log(
    chalk.blue(
      `✍️ User ${chalk.bold(socket.userId)} is typing in ${chalk.yellow(room)}`
    )
  );
};

const handleStopTyping = (socket, room) => {
  socket.to(room).emit("stop typing", room);
  console.log(
    chalk.gray(
      `✋ User ${chalk.bold(socket.userId)} stopped typing in ${chalk.yellow(room)}`
    )
  );
};

// Handle new message delivery
const handleNewMessage = (socket, newMessageStatus) => {
  const chat = newMessageStatus.chat;
  if (!chat.users) {
    console.log(chalk.red("⚠️ Chat users not found!"));
    return;
  }

  chat.users.forEach((user) => {
    if (user._id !== newMessageStatus.sender._id) {
      socket.to(user._id).emit("message received", newMessageStatus);
    }
  });

  console.log(
    chalk.green(
      `📩 New Message from ${chalk.bold(newMessageStatus.sender._id)} to ${chalk.yellow(
        chat._id
      )}`
    )
  );
};

// Handle disconnection & online status updates
const handleDisconnect = (socket) => {
  if (!socket.userId) return;

  const userSockets = onlineUsers.get(socket.userId);
  if (userSockets) {
    userSockets.delete(socket.id);

    if (userSockets.size === 0) {
      onlineUsers.delete(socket.userId);
      io.emit("user offline", socket.userId);
      console.log(chalk.red(`🔴 User Disconnected: ${chalk.bold(socket.userId)}`));
    }
  }

  console.log(chalk.gray(`❌ Socket Disconnected: ${chalk.cyan(socket.id)}`));
};

/** ==============================
 *  🔥 Socket.IO Connection 🔥
 *  ============================== */
io.on("connection", (socket) => {
  console.log(chalk.blue(`🔗 New Socket Connected: ${chalk.cyan(socket.id)}`));

  socket.on("setup", (userId) => handleUserSetup(socket, userId));
  socket.on("join chat", (room) => handleJoinChat(socket, room));
  socket.on("typing", (room) => handleTyping(socket, room));
  socket.on("stop typing", (room) => handleStopTyping(socket, room));
  socket.on("new message", (newMessageStatus) =>
    handleNewMessage(socket, newMessageStatus)
  );
  socket.on("disconnect", () => handleDisconnect(socket));
});
