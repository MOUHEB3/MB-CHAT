import { io } from "socket.io-client";

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL;

const socket = io(SOCKET_URL, {
  withCredentials: false, // Disable credentials to avoid CORS issues
  transports: ["websocket"], // Force using websockets for better performance
});

// Event listener for connection errors.
socket.on("connect_error", (err) => {
  // Handle connection errors here if needed.
});

// Log reconnection attempts.
socket.on("reconnect_attempt", () => {
  // Handle reconnection attempts here if needed.
});

// Log successful connection.
socket.on("connect", () => {
  // Handle successful connection here if needed.
});

// Listen for real-time chat deletion events.
socket.on("chatDeleted", (data) => {
  // Handle chat deletion events here if needed.
});

// Listen for real-time message deletion events.
socket.on("messageDeleted", (data) => {
  // Handle message deletion events here if needed.
});

// Log disconnections.
socket.on("disconnect", (reason) => {
  // Handle disconnections here if needed.
});

export default socket;
