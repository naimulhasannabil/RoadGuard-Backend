import { Router } from "express"
import {
  getDashboardStats,
  getAllAlerts,
  removeAlert,
  getAllUsers,
  banUser,
  unbanUser,
  promoteUser,
  getAnalytics,
  updateSystemSettings,
  getSystemSettings,
  broadcastMessage,
} from "../controllers/admin.controller.js"
import { authenticate, requireAdmin } from "../middleware/auth.middleware.js"

const router = Router()

router.use(authenticate, requireAdmin)

router.get("/dashboard", getDashboardStats)
router.get("/alerts", getAllAlerts)
router.delete("/alerts/:id", removeAlert)
router.get("/users", getAllUsers)
router.post("/users/:id/ban", banUser)
router.post("/users/:id/unban", unbanUser)
router.post("/users/:id/promote", promoteUser)
router.get("/analytics", getAnalytics)
router.get("/settings", getSystemSettings)
router.put("/settings", updateSystemSettings)
router.post("/broadcast", broadcastMessage)

export default router
