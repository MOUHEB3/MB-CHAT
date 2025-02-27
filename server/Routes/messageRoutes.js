import express from "express";
import { allMessages, sendMessage, deleteMessage, deleteMessagesBulk } from "../Controllers/messageControllers.js";
import protect from "../middleware/authMiddleWare.js";

const router = express.Router();

// Route to fetch all messages for a chat
router.route("/:chatId").get(protect, allMessages);

// Route to send a new message
router.route("/").post(protect, sendMessage);

// New: DELETE route for bulk deleting messages
router.route("/bulk").delete(protect, deleteMessagesBulk);

// DELETE route for deleting a single message
router.route("/:messageId").delete(protect, deleteMessage);

export default router;
