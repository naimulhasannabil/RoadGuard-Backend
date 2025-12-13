import { Router } from "express"
import {
  createAlert,
  getAlerts,
  getAlertById,
  getNearbyAlerts,
  getAlertsByArea,
  updateAlert,
  deleteAlert,
  processOfflineAlerts,
} from "../controllers/alert.controller.js"
import { authenticate, optionalAuth } from "../middleware/auth.middleware.js"
import { validate, validateQuery } from "../middleware/validate.middleware.js"
import { createAlertSchema, getAlertsQuerySchema } from "../validators/alert.validator.js"

const router = Router()

router.post("/", authenticate, validate(createAlertSchema), createAlert)
router.get("/", optionalAuth, validateQuery(getAlertsQuerySchema), getAlerts)
router.get("/nearby", optionalAuth, getNearbyAlerts)
router.get("/area", optionalAuth, getAlertsByArea)
router.get("/:id", optionalAuth, getAlertById)
router.put("/:id", authenticate, updateAlert)
router.delete("/:id", authenticate, deleteAlert)
router.post("/offline", authenticate, processOfflineAlerts)

export default router
