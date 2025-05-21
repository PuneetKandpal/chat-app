import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import { getMessages, getTimeFilteredMessages, sendMessage } from "../controllers/message.controller.js";

const router = express.Router();

router.get("/all-messages/:id", protectRoute, getMessages);
router.get("/time-filtered-messages", protectRoute, getTimeFilteredMessages);
router.post("/send/:id", protectRoute, sendMessage);

export default router;
