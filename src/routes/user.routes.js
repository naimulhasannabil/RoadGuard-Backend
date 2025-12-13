import { Router } from "express"
import {
  getProfile,
  updateProfile,
  getUserStats,
  getUserAlerts,
  getLeaderboard,
  updateLocation,
} from "../controllers/user.controller.js"
import { authenticate } from "../middleware/auth.middleware.js"

const router = Router()

router.get("/profile", authenticate, getProfile)
router.put("/profile", authenticate, updateProfile)
router.get("/stats", authenticate, getUserStats)
router.get("/alerts", authenticate, getUserAlerts)
router.get("/leaderboard", getLeaderboard)
router.post("/location", authenticate, updateLocation)

export default router
