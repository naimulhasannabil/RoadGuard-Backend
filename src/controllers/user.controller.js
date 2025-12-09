import prisma from "../config/prisma.js"
import { USER_LEVEL_THRESHOLDS } from "../config/constants.js"

export const getProfile = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        avatar: true,
        role: true,
        vehicleType: true,
        level: true,
        contributionScore: true,
        totalReports: true,
        verifiedReports: true,
        createdAt: true,
        lastActiveAt: true,
      },
    })
    res.json(user)
  } catch (error) {
    next(error)
  }
}

export const updateProfile = async (req, res, next) => {
  try {
    const { name, phone, avatar, vehicleType } = req.body

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        ...(name && { name }),
        ...(phone && { phone }),
        ...(avatar && { avatar }),
        ...(vehicleType && { vehicleType }),
      },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        avatar: true,
        role: true,
        vehicleType: true,
        level: true,
        contributionScore: true,
      },
    })

    res.json(user)
  } catch (error) {
    next(error)
  }
}

export const getUserStats = async (req, res, next) => {
  try {
    const userId = req.user.id

    const [user, alertStats, recentAlerts] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: { totalReports: true, verifiedReports: true, contributionScore: true, level: true },
      }),
      prisma.alert.groupBy({ by: ["type"], where: { reporterId: userId }, _count: true }),
      prisma.alert.findMany({
        where: { reporterId: userId },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          type: true,
          severity: true,
          status: true,
          isVerified: true,
          upvotes: true,
          createdAt: true,
        },
      }),
    ])

    const currentScore = user.contributionScore
    let nextLevel = null
    let progressToNextLevel = 100

    const levels = Object.entries(USER_LEVEL_THRESHOLDS).sort((a, b) => a[1] - b[1])
    for (let i = 0; i < levels.length; i++) {
      if (levels[i][1] > currentScore) {
        nextLevel = levels[i][0]
        const prevThreshold = i > 0 ? levels[i - 1][1] : 0
        progressToNextLevel = ((currentScore - prevThreshold) / (levels[i][1] - prevThreshold)) * 100
        break
      }
    }

    res.json({
      ...user,
      alertsByType: alertStats,
      recentAlerts,
      nextLevel,
      progressToNextLevel: Math.min(progressToNextLevel, 100),
    })
  } catch (error) {
    next(error)
  }
}

export const getUserAlerts = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status } = req.query
    const skip = (Number.parseInt(page) - 1) * Number.parseInt(limit)

    const where = { reporterId: req.user.id, ...(status && { status }) }

    const [alerts, total] = await Promise.all([
      prisma.alert.findMany({
        where,
        skip,
        take: Number.parseInt(limit),
        orderBy: { createdAt: "desc" },
        include: { images: true, _count: { select: { votes: true } } },
      }),
      prisma.alert.count({ where }),
    ])

    res.json({
      alerts,
      pagination: {
        page: Number.parseInt(page),
        limit: Number.parseInt(limit),
        total,
        totalPages: Math.ceil(total / Number.parseInt(limit)),
      },
    })
  } catch (error) {
    next(error)
  }
}

export const getLeaderboard = async (req, res, next) => {
  try {
    const { limit = 10, period = "all" } = req.query

    let dateFilter = {}
    if (period === "week") dateFilter = { createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } }
    else if (period === "month") dateFilter = { createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } }

    const users = await prisma.user.findMany({
      where: { isBanned: false, ...dateFilter },
      orderBy: { contributionScore: "desc" },
      take: Number.parseInt(limit),
      select: {
        id: true,
        name: true,
        avatar: true,
        level: true,
        contributionScore: true,
        totalReports: true,
        verifiedReports: true,
      },
    })

    res.json(users.map((user, index) => ({ ...user, rank: index + 1 })))
  } catch (error) {
    next(error)
  }
}

export const updateLocation = async (req, res, next) => {
  try {
    const { latitude, longitude } = req.body
    const io = req.app.get("io")

    io.emit("user_location_update", { userId: req.user.id, latitude, longitude, timestamp: new Date() })

    await prisma.user.update({ where: { id: req.user.id }, data: { lastActiveAt: new Date() } })

    res.json({ success: true })
  } catch (error) {
    next(error)
  }
}
