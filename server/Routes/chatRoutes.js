import express from "express";
import protect from "../middleware/authMiddleWare.js";
import {
  accessChat,
  fetchChats,
  fetchGroups,
  createGroupChat,
  groupExit,
  addSelfGroup,
  addMemberToGroup,
  getUsersInGroup,
  deleteChat,

} from "../Controllers/chatControllers.js";

const Router = express.Router();

// Chat Routes
Router.route("/").post(protect, accessChat);
Router.route("/").get(protect, fetchChats);

// Group Chat Routes
Router.route("/createGroup").post(protect, createGroupChat);
Router.route("/fetchGroups").get(protect, fetchGroups);
Router.route("/groupExit").put(protect, groupExit);
Router.route("/addSelfToGroup").put(protect, addSelfGroup);
Router.route("/addMember").put(protect, addMemberToGroup);
Router.route("/groupInfo").post(protect, getUsersInGroup);

// Delete chat (clear for the current user)
Router.route("/:chatId").delete(protect, deleteChat);




export default Router;
