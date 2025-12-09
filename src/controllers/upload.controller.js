import { v2 as cloudinary } from "cloudinary"
import fs from "fs"

if (process.env.CLOUDINARY_CLOUD_NAME) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  })
}

export const uploadImages = async (req, res, next) => {
  try {
    const files = req.files
    if (!files || files.length === 0) return res.status(400).json({ error: "No files uploaded" })

    const uploadedImages = []

    for (const file of files) {
      if (process.env.CLOUDINARY_CLOUD_NAME) {
        const result = await cloudinary.uploader.upload(file.path, {
          folder: "roadguard/alerts",
          transformation: [{ width: 1200, height: 1200, crop: "limit" }, { quality: "auto" }, { fetch_format: "auto" }],
        })
        uploadedImages.push({ url: result.secure_url, publicId: result.public_id })
        fs.unlinkSync(file.path)
      } else {
        const baseUrl = process.env.BASE_URL || "http://localhost:5000"
        uploadedImages.push({ url: `${baseUrl}/uploads/${file.filename}`, publicId: file.filename })
      }
    }

    res.json({ message: "Images uploaded successfully", images: uploadedImages })
  } catch (error) {
    if (req.files) req.files.forEach((f) => fs.existsSync(f.path) && fs.unlinkSync(f.path))
    next(error)
  }
}

export const deleteImage = async (req, res, next) => {
  try {
    const { publicId } = req.params
    if (process.env.CLOUDINARY_CLOUD_NAME) {
      await cloudinary.uploader.destroy(publicId)
    } else {
      const filePath = `uploads/${publicId}`
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath)
    }
    res.json({ message: "Image deleted successfully" })
  } catch (error) {
    next(error)
  }
}
