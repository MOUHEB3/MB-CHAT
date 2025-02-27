// userController.js

import express from "express";
import userModel from "../Models/userModel.js";
import Chat from "../Models/chatModel.js"; // Import Chat model
import handler from "express-async-handler";
import { generateToken } from "../Config/generateToken.js";

export const loginController = handler(async (req, res) => {
  const { name, password } = req.body;
  const user = await userModel.findOne({ name });
  if (user && (await user.matchPassword(password))) {
    const imageBase64 = user.image ? user.image.toString("base64") : null;
    const response = {
      _id: user._id,
      name: user.name,
      email: user.email,
      isAdmin: user.isAdmin,
      image: imageBase64,
      token: generateToken(user._id),
    };
    res.json(response);
  } else {
    res.status(401);
    throw new Error("Invalid username and password");
  }
});

export const registerController = handler(async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const image = req.file;

    if (!name || !email || !password) {
      res.status(400).json({ error: "Blank fields" });
      return;
    }

    const emailExist = await userModel.findOne({ email });
    if (emailExist) {
      res.status(400).json({ error: "Email already exists" });
      return;
    }

    const userExist = await userModel.findOne({ name });
    if (userExist) {
      res.status(400).json({ error: "Username already exists" });
      return;
    }

    let user;
    if (image) {
      user = await userModel.create({
        name,
        email,
        password,
        image: image.buffer,
      });
    } else {
      user = await userModel.create({ name, email, password });
    }

    if (user) {
      res.status(201).json({
        token: generateToken(user._id),
      });
    } else {
      res.status(400).json({ error: "Registration error" });
    }
  } catch (error) {
    console.error("Registration failed:", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export const fetchAllUsersController = handler(async (req, res) => {
  const keyword = req.query.search
    ? {
        $or: [
          { name: { $regex: req.query.search, $options: "i" } },
          { email: { $regex: req.query.search, $options: "i" } },
        ],
      }
    : {};

  const users = await userModel.find(keyword).find({
    _id: { $ne: req.user._id },
  });
  res.send(users);
});

// Fetch users who are not in a specific group
export const fetchUsersNotInGroup = handler(async (req, res) => {
  const { groupId } = req.query; // Get groupId from query params

  if (!groupId) {
    return res.status(400).json({ message: "Group ID is required" });
  }

  try {
    // Find the group and get its users
    const group = await Chat.findById(groupId).populate("users", "_id");

    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    // Get all users **excluding** the ones already in the group
    const users = await userModel.find({
      _id: { $nin: group.users }, // Exclude users in the group
    });

    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
