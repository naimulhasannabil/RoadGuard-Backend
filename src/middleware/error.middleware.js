export const errorHandler = (err, req, res, next) => {
  console.error("Error:", err)

  if (err.code === "P2002") {
    return res.status(409).json({
      error: "A record with this value already exists",
      field: err.meta?.target,
    })
  }

  if (err.code === "P2025") {
    return res.status(404).json({ error: "Record not found" })
  }

  if (err.name === "ValidationError") {
    return res.status(400).json({ error: "Validation failed", details: err.details })
  }

  if (err.name === "JsonWebTokenError") {
    return res.status(401).json({ error: "Invalid token" })
  }

  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({ error: "File too large. Maximum size is 5MB" })
  }

  if (err.code === "LIMIT_FILE_COUNT") {
    return res.status(400).json({ error: "Too many files. Maximum is 5 files" })
  }

  res.status(err.status || 500).json({
    error: err.message || "Internal server error",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  })
}
