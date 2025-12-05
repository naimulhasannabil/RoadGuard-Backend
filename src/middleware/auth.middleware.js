import jwt from "jsonwebtoken"
import prisma from "../config/prisma.js"

export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Access token required" })
    }

    const token = authHeader.split(" ")[1]

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET)

      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          level: true,
          isBanned: true,
          contributionScore: true,
        },
      })

      if (!user) {
        return res.status(401).json({ error: "User not found" })
      }

      if (user.isBanned) {
        return res.status(403).json({ error: "Account has been banned" })
      }

      req.user = user
      next()
    } catch (jwtError) {
      if (jwtError.name === "TokenExpiredError") {
        return res.status(401).json({ error: "Token expired", code: "TOKEN_EXPIRED" })
      }
      return res.status(401).json({ error: "Invalid token" })
    }
  } catch (error) {
    console.error("Auth middleware error:", error)
    res.status(500).json({ error: "Authentication failed" })
  }
}

export const requireAdmin = (req, res, next) => {
  if (req.user?.role !== "ADMIN") {
    return res.status(403).json({ error: "Admin access required" })
  }
  next()
}

export const requireTrustedOrAdmin = (req, res, next) => {
  if (req.user?.role !== "ADMIN" && req.user?.role !== "TRUSTED_DRIVER") {
    return res.status(403).json({ error: "Trusted driver or admin access required" })
  }
  next()
}

export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization

    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1]

      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET)
        const user = await prisma.user.findUnique({
          where: { id: decoded.userId },
          select: { id: true, email: true, name: true, role: true, level: true },
        })
        req.user = user
      } catch {
        // Continue without user
      }
    }
    next()
  } catch (error) {
    next()
  }
}
