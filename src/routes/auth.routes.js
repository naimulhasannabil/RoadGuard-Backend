import { Router } from "express"
import { register, login, logout, refreshToken, getCurrentUser } from "../controllers/auth.controller.js"
import { authenticate } from "../middleware/auth.middleware.js"
import { validate } from "../middleware/validate.middleware.js"
import { registerSchema, loginSchema } from "../validators/auth.validator.js"

const router = Router()

router.post("/register", validate(registerSchema), register)
router.post("/login", validate(loginSchema), login)
router.post("/logout", authenticate, logout)
router.post("/refresh-token", refreshToken)
router.get("/me", authenticate, getCurrentUser)

export default router
