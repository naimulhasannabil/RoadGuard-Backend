import { Router } from "express"
import multer from "multer"
import { uploadImages, deleteImage } from "../controllers/upload.controller.js"
import { authenticate } from "../middleware/auth.middleware.js"

const router = Router()

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9)
    const ext = file.originalname.split(".").pop()
    cb(null, `alert-${uniqueSuffix}.${ext}`)
  },
})

const fileFilter = (req, file, cb) => {
  const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/heic"]
  cb(null, allowedTypes.includes(file.mimetype))
}

const upload = multer({ storage, fileFilter, limits: { fileSize: 5 * 1024 * 1024, files: 5 } })

router.post("/", authenticate, upload.array("images", 5), uploadImages)
router.delete("/:publicId", authenticate, deleteImage)

export default router
