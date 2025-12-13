import { Router } from "express"
import {
  createSOS,
  getActiveSOS,
  updateSOSStatus,
  cancelSOS,
  getNearbySOSRequests,
} from "../controllers/sos.controller.js"
import { authenticate } from "../middleware/auth.middleware.js"

const router = Router()

router.post("/", authenticate, createSOS)
router.get("/active", authenticate, getActiveSOS)
router.get("/nearby", authenticate, getNearbySOSRequests)
router.put("/:id/status", authenticate, updateSOSStatus)
router.delete("/:id", authenticate, cancelSOS)

export default router
