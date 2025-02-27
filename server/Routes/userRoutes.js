// userRoutes.js

import express from "express";
import multer from "multer";
import { loginController, registerController, fetchAllUsersController } from "../Controllers/userControllers.js";
import protect from "../middleware/authMiddleWare.js";

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const Router = express.Router();

Router.post("/login", loginController);
Router.post("/register", upload.single("image"), registerController);
Router.get("/fetchUsers", protect, fetchAllUsersController);

export default Router;
