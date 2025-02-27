import handler from "express-async-handler";
import Message from "../Models/messageModel.js";
import User from "../Models/userModel.js";
import Chat from "../Models/chatModel.js";

// Returns all messages in the chat (without filtering by clear status)
export const allMessages = handler(async (req, res) => {
  try {
    const messages = await Message.find({ chat: req.params.chatId })
      .populate("sender", "name email image")
      .populate("reciever")
      .populate("chat");
    res.json(messages);
  } catch (error) {
    res.status(400);
    throw new Error(error.message);
  }
});

// Creates and sends a new message in the chat
export const sendMessage = handler(async (req, res) => {
  const { content, chatId } = req.body;

  if (!content || !chatId) {
    console.log("Invalid data passed into request");
    return res.sendStatus(400);
  }

  let newMessage = {
    sender: req.user._id,
    content: content,
    chat: chatId,
  };

  try {
    let message = await Message.create(newMessage);

    message = await message.populate("sender", "name pic");
    message = await message.populate("chat");
    message = await message.populate("reciever");
    message = await User.populate(message, {
      path: "chat.users",
      select: "name email image",
    });

    // Update the latest message for the chat
    await Chat.findByIdAndUpdate(chatId, { latestMessage: message });
    res.json(message);
  } catch (error) {
    res.status(400);
    throw new Error(error.message);
  }
});

// Hard-deletes a message: removes it entirely from the database.
// This deletion will remove the message for all users.
export const deleteMessage = handler(async (req, res) => {
  const { messageId } = req.params;

  // Find the message
  const message = await Message.findById(messageId);
  if (!message) {
    res.status(404);
    throw new Error("Message not found");
  }

  // Ensure the requesting user is part of the chat.
  const chat = await Chat.findById(message.chat);
  if (
    !chat ||
    !chat.users.some((user) => user.toString() === req.user._id.toString())
  ) {
    res.status(403);
    throw new Error("Unauthorized");
  }

  // Hard delete: Remove the message from the database entirely.
  await Message.findByIdAndDelete(messageId);

  // Emit Socket.IO event for real-time update to all users in the chat.
  const io = req.app.locals.io;
  if (io) {
    io.to(chat._id.toString()).emit("messageDeleted", {
      messageId,
      chatId: chat._id,
    });
  }

  res
    .status(200)
    .json({ message: "Message deleted for all users", messageId });
});

// Bulk delete controller: deletes multiple messages given an array of message IDs.
export const deleteMessagesBulk = handler(async (req, res) => {
  const { messageIds } = req.body;

  if (!messageIds || !Array.isArray(messageIds) || messageIds.length === 0) {
    res.status(400);
    throw new Error("Invalid or missing messageIds array");
  }

  // Fetch messages to validate existence and authorization
  const messages = await Message.find({ _id: { $in: messageIds } });

  if (messages.length === 0) {
    res.status(404);
    throw new Error("No messages found for deletion");
  }

  // Check authorization for each message: ensure the requesting user is part of the chat.
  for (let msg of messages) {
    const chat = await Chat.findById(msg.chat);
    if (!chat || !chat.users.some((user) => user.toString() === req.user._id.toString())) {
      res.status(403);
      throw new Error("Unauthorized to delete one or more messages");
    }
  }

  // Perform bulk deletion
  const result = await Message.deleteMany({ _id: { $in: messageIds } });

  // Emit Socket.IO event for each deleted message to update all connected clients
  const io = req.app.locals.io;
  if (io) {
    messages.forEach((msg) => {
      io.to(msg.chat.toString()).emit("messageDeleted", {
        messageId: msg._id,
        chatId: msg.chat,
      });
    });
  }

  res.status(200).json({ message: "Messages deleted", deletedCount: result.deletedCount });
});

// Fetches messages for a chat.
// If the current user has cleared the chat,
// only returns messages created after the clearedAt timestamp.
export const fetchMessages = handler(async (req, res) => {
  const { chatId } = req.params;
  
  // Retrieve the chat document to check its clearedFor status
  const chat = await Chat.findById(chatId);
  if (!chat) {
    res.status(404);
    throw new Error("Chat not found");
  }

  // Debug: Log the entire clearedFor array for this chat
  console.log("ClearedFor for chat:", chat.clearedFor);

  // Find the clearedFor entry for the current user
  const clearEntry = chat.clearedFor.find(
    (entry) => entry.user.toString() === req.user._id.toString()
  );

  // Build the query for fetching messages from this chat
  const query = { chat: chatId };

  if (clearEntry) {
    // Log the original clearedAt value for debugging
    console.log("Original clearedAt for user:", clearEntry.clearedAt);
    // Use the clearedAt value without an extra offset:
    query.createdAt = { $gt: clearEntry.clearedAt };
  }

  // Log the final query for debugging
  console.log("Final query:", query);

  const messages = await Message.find(query)
    .populate("sender", "name email")
    .populate("chat");

  // Log the number of messages found for debugging
  console.log("Fetched messages count:", messages.length);
  
  res.status(200).json(messages);
});
