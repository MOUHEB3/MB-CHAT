import User from "../Models/userModel.js";
import Chat from "../Models/chatModel.js";
import handler from "express-async-handler";

// Access (one-on-one) Chat: returns existing chat or creates a new one.
// Automatically "restores" the chat if the current user previously deleted it.
export const accessChat = handler(async (req, res) => {
  const { userId } = req.body;

  if (!userId) {
    console.log("User ID not sent in request body");
    return res.sendStatus(400);
  }

  // Look for an existing one-on-one chat between these two users
  let isChat = await Chat.find({
    isGroupChat: false,
    $and: [
      { users: { $elemMatch: { $eq: req.user._id } } },
      { users: { $elemMatch: { $eq: userId } } },
    ],
  })
    .populate("users", "-password")
    .populate("latestMessage");

  // Populate the latest message's sender
  isChat = await User.populate(isChat, {
    path: "latestMessage.sender",
    select: "name email",
  });

  // If a chat already exists, restore it if the current user is in deletedBy
  if (isChat.length > 0) {
    const existingChat = isChat[0];
    const currentUserId = req.user._id.toString();

    // If user previously deleted this chat, remove them from deletedBy and update clearedFor
    if (existingChat.deletedBy.includes(req.user._id)) {
      // Remove the user from deletedBy
      existingChat.deletedBy = existingChat.deletedBy.filter(
        (id) => id.toString() !== req.user._id.toString()
      );
      
      // Set clearedFor to current time plus a 1-second offset
      // This ensures that all messages created before now are excluded
      const nowPlusOffset = new Date(Date.now() + 1000);
      
      const clearedIndex = existingChat.clearedFor.findIndex(
        (entry) => entry.user.toString() === req.user._id.toString()
      );
      if (clearedIndex !== -1) {
        existingChat.clearedFor[clearedIndex].clearedAt = nowPlusOffset;
      } else {
        existingChat.clearedFor.push({
          user: req.user._id,
          clearedAt: nowPlusOffset,
        });
      }
      await existingChat.save();
    }

    return res.status(200).json(existingChat);
  } else {
    // Otherwise, create a new chat
    const chatData = {
      chatName: "sender",
      isGroupChat: false,
      users: [req.user._id, userId],
    };

    try {
      const createdChat = await Chat.create(chatData);
      const fullChat = await Chat.findOne({ _id: createdChat._id })
        .populate("users", "-password")
        .populate("latestMessage.sender", "name email");
      return res.status(200).json(fullChat);
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  }
});

// Fetch all chats for the current user
export const fetchChats = handler(async (req, res) => {
  try {
    Chat.find({ users: { $elemMatch: { $eq: req.user._id } } })
      .populate("users", "-password")
      .populate("groupAdmin", "-password")
      .populate("latestMessage")
      .sort({ updatedAt: -1 })
      .then(async (results) => {
        results = await User.populate(results, {
          path: "latestMessage.sender",
          select: "name email",
        });
        res.status(200).send(results);
      });
  } catch (error) {
    res.status(400);
    throw new Error(error.message);
  }
});

// Fetch all group chats
export const fetchGroups = handler(async (req, res) => {
  try {
    const allGroups = await Chat.where("isGroupChat").equals(true);
    res.status(200).send(allGroups);
  } catch (error) {
    res.status(400);
    throw new Error(error.message);
  }
});

// Create a new group chat
export const createGroupChat = handler(async (req, res) => {
  if (!req.body.users || !req.body.name) {
    return res.status(400).send({ message: "Data is insufficient" });
  }

  const users = req.body.users;
  users.push(req.user);

  try {
    const groupChat = await Chat.create({
      chatName: req.body.name,
      users: users,
      isGroupChat: true,
      groupAdmin: req.user,
    });

    const fullGroupChat = await Chat.findOne({ _id: groupChat._id })
      .populate("users", "-password")
      .populate("groupAdmin", "-password");

    res.status(200).json(fullGroupChat);
  } catch (error) {
    res.status(400);
    throw new Error(error.message);
  }
});

// Exit a group chat
export const groupExit = handler(async (req, res) => {
  const { chatId, userId } = req.body;

  const removed = await Chat.findByIdAndUpdate(
    chatId,
    { $pull: { users: userId } },
    { new: true }
  )
    .populate("users", "-password")
    .populate("groupAdmin", "-password");

  if (!removed) {
    res.status(404);
    throw new Error("Chat Not Found");
  } else {
    res.json(removed);
  }
});

// Add self to a group chat
export const addSelfGroup = handler(async (req, res) => {
  const { chatId, userId } = req.body;
  const added = await Chat.findByIdAndUpdate(
    chatId,
    { $push: { users: userId } },
    { new: true }
  )
    .populate("users", "-password")
    .populate("groupAdmin", "-password");
  if (!added) {
    res.status(404);
    throw new Error("Chat Not Found");
  } else {
    res.json(added);
  }
});

// Add members to an existing group chat
export const addMemberToGroup = handler(async (req, res) => {
  const { groupId, usersToAdd } = req.body;

  if (!groupId || !usersToAdd || !Array.isArray(usersToAdd) || usersToAdd.length === 0) {
    return res.status(400).send({ message: "Invalid data provided" });
  }

  // Fetch the group first to check existing members
  const group = await Chat.findById(groupId);
  if (!group) {
    return res.status(404).send({ message: "Group not found" });
  }

  // Determine which users are already in the group
  const alreadyAdded = usersToAdd.filter((userId) =>
    group.users.some((memberId) => memberId.toString() === userId)
  );

  if (alreadyAdded.length > 0) {
    return res.status(200).json({
      alreadyAdded: true,
      message: "User is already in the group",
      alreadyMembers: alreadyAdded,
    });
  }

  try {
    const updatedGroup = await Chat.findByIdAndUpdate(
      groupId,
      { $addToSet: { users: { $each: usersToAdd } } },
      { new: true }
    )
      .populate("users", "-password")
      .populate("groupAdmin", "-password");

    res.status(200).json(updatedGroup);
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
});

// Get details about users in a group
export const getUsersInGroup = handler(async (req, res) => {
  const { groupId } = req.body;

  if (!groupId) {
    return res.status(400).send({ message: "Invalid data provided" });
  }

  try {
    const group = await Chat.findById(groupId).populate("users", "name _id image");
    if (!group) {
      return res.status(404).send({ message: "Group not found" });
    }

    const adminId = group.groupAdmin ? group.groupAdmin._id : null;
    const userMappings = group.users.map((user) => ({
      userId: user._id,
      username: user.name,
      userImage: user.image,
    }));
    const userNamesSet = new Set(group.users.map((user) => user.name));
    const userNames = Array.from(userNamesSet);

    res.status(200).json({ adminId, userNames, userMappings });
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
});

// Delete (clear) chat for current user: messages will be hidden for you
export const deleteChat = handler(async (req, res) => {
  const { chatId } = req.params;
  
  const chat = await Chat.findById(chatId);
  if (!chat) {
    return res.status(404).json({ message: "Chat not found" });
  }

  if (!chat.users.some((user) => user.toString() === req.user._id.toString())) {
    return res.status(403).json({ message: "Unauthorized" });
  }

  // Ensure the arrays exist
  chat.deletedBy = chat.deletedBy || [];
  chat.clearedFor = chat.clearedFor || [];

  // Soft delete: add current user to deletedBy if not already present
  if (!chat.deletedBy.some((id) => id.toString() === req.user._id.toString())) {
    chat.deletedBy.push(req.user._id);
  }

  // Update clearedFor: set clearedAt for the user to current time
  const clearedIndex = chat.clearedFor.findIndex(
    (entry) => entry.user.toString() === req.user._id.toString()
  );
  if (clearedIndex !== -1) {
    chat.clearedFor[clearedIndex].clearedAt = new Date();
  } else {
    chat.clearedFor.push({
      user: req.user._id,
      clearedAt: new Date(),
    });
  }

  const updatedChat = await chat.save();

  // Emit real-time event to all users in the chat if needed
  const io = req.app.locals.io;
  if (io) {
    chat.users.forEach((user) => {
      io.to(user.toString()).emit("chatDeleted", { chatId, userId: req.user._id });
    });
  }

  res.status(200).json({ chatId, message: "Chat deleted for user", chat: updatedChat });
});
