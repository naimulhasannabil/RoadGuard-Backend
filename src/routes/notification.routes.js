import { Router } from "express"
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  getUnreadCount,
} from "../controllers/notification.controller.js"
import { authenticate } from "../middleware/auth.middleware.js"

const router = Router()

router.get("/", authenticate, getNotifications)
router.get("/unread-count", authenticate, getUnreadCount)
router.put("/:id/read", authenticate, markAsRead)
router.put("/read-all", authenticate, markAllAsRead)
router.delete("/:id", authenticate, deleteNotification)

export default router
