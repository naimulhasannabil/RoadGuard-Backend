import prisma from "../config/prisma.js"
import { CONTRIBUTION_POINTS, SOCKET_EVENTS } from "../config/constants.js"

export const getDashboardStats = async (req, res, next) => {
  try {
    const [
      totalUsers,
      totalAlerts,
      activeAlerts,
      verifiedAlerts,
      totalSOS,
      recentAlerts,
      alertsByType,
      alertsBySeverity,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.alert.count(),
      prisma.alert.count({ where: { status: "ACTIVE" } }),
      prisma.alert.count({ where: { isVerified: true } }),
      prisma.sOSRequest.count({ where: { status: "ACTIVE" } }),
      prisma.alert.findMany({
        orderBy: { createdAt: "desc" },
        take: 10,
        include: { reporter: { select: { name: true } } },
      }),
      prisma.alert.groupBy({ by: ["type"], _count: true }),
      prisma.alert.groupBy({ by: ["severity"], _count: true }),
    ])

    res.json({
      stats: { totalUsers, totalAlerts, activeAlerts, verifiedAlerts, totalSOS },
      recentAlerts,
      alertsByType,
      alertsBySeverity,
    })
  } catch (error) {
    next(error)
  }
}

export const getAllAlerts = async (req, res, next) => {
  try {
    const { page = 1, limit = 50, status, type, severity } = req.query
    const skip = (Number.parseInt(page) - 1) * Number.parseInt(limit)

    const where = { ...(status && { status }), ...(type && { type }), ...(severity && { severity }) }

    const [alerts, total] = await Promise.all([
      prisma.alert.findMany({
        where,
        skip,
        take: Number.parseInt(limit),
        orderBy: { createdAt: "desc" },
        include: {
          images: true,
          reporter: { select: { id: true, name: true, email: true, level: true } },
          _count: { select: { votes: true } },
        },
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

export const removeAlert = async (req, res, next) => {
  try {
    const { id } = req.params
    const { reason } = req.body
    const io = req.app.get("io")

    const alert = await prisma.alert.findUnique({ where: { id }, select: { reporterId: true } })
    if (!alert) return res.status(404).json({ error: "Alert not found" })

    await prisma.alert.update({
      where: { id },
      data: { status: "REMOVED", removedAt: new Date(), removeReason: reason },
    })
    await prisma.user.update({
      where: { id: alert.reporterId },
      data: { contributionScore: { decrement: Math.abs(CONTRIBUTION_POINTS.ALERT_REMOVED) } },
    })

    io.emit(SOCKET_EVENTS.ALERT_REMOVED, { id, reason })
    res.json({ message: "Alert removed successfully" })
  } catch (error) {
    next(error)
  }
}

export const getAllUsers = async (req, res, next) => {
  try {
    const { page = 1, limit = 50, role, isBanned, search } = req.query
    const skip = (Number.parseInt(page) - 1) * Number.parseInt(limit)

    const where = {
      ...(role && { role }),
      ...(isBanned !== undefined && { isBanned: isBanned === "true" }),
      ...(search && {
        OR: [{ name: { contains: search, mode: "insensitive" } }, { email: { contains: search, mode: "insensitive" } }],
      }),
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: Number.parseInt(limit),
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          level: true,
          contributionScore: true,
          totalReports: true,
          verifiedReports: true,
          isBanned: true,
          banReason: true,
          createdAt: true,
          lastActiveAt: true,
        },
      }),
      prisma.user.count({ where }),
    ])

    res.json({
      users,
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

export const banUser = async (req, res, next) => {
  try {
    const { id } = req.params
    const { reason } = req.body

    const user = await prisma.user.update({
      where: { id },
      data: { isBanned: true, banReason: reason },
      select: { id: true, email: true, name: true, isBanned: true, banReason: true },
    })

    await prisma.refreshToken.deleteMany({ where: { userId: id } })
    res.json({ message: "User banned successfully", user })
  } catch (error) {
    next(error)
  }
}

export const unbanUser = async (req, res, next) => {
  try {
    const { id } = req.params
    const user = await prisma.user.update({
      where: { id },
      data: { isBanned: false, banReason: null },
      select: { id: true, email: true, name: true, isBanned: true },
    })
    res.json({ message: "User unbanned successfully", user })
  } catch (error) {
    next(error)
  }
}

export const promoteUser = async (req, res, next) => {
  try {
    const { id } = req.params
    const { role } = req.body
    const user = await prisma.user.update({
      where: { id },
      data: { role },
      select: { id: true, email: true, name: true, role: true },
    })
    res.json({ message: "User role updated", user })
  } catch (error) {
    next(error)
  }
}

export const getAnalytics = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const end = endDate ? new Date(endDate) : new Date()

    const alerts = await prisma.alert.findMany({
      where: { createdAt: { gte: start, lte: end } },
      select: { createdAt: true, type: true, severity: true, latitude: true, longitude: true, area: true },
    })

    const alertsByArea = alerts.reduce((acc, alert) => {
      const area = alert.area || "Unknown"
      acc[area] = (acc[area] || 0) + 1
      return acc
    }, {})

    const topAreas = Object.entries(alertsByArea)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)

    const hourlyDistribution = alerts.reduce((acc, alert) => {
      const hour = new Date(alert.createdAt).getHours()
      acc[hour] = (acc[hour] || 0) + 1
      return acc
    }, {})

    const topContributors = await prisma.user.findMany({
      orderBy: { contributionScore: "desc" },
      take: 10,
      select: { id: true, name: true, contributionScore: true, totalReports: true, verifiedReports: true },
    })

    res.json({
      totalAlerts: alerts.length,
      alertsByArea,
      topCongestedAreas: topAreas,
      hourlyDistribution,
      topContributors,
      dateRange: { start, end },
    })
  } catch (error) {
    next(error)
  }
}

export const getSystemSettings = async (req, res, next) => {
  try {
    const settings = await prisma.systemSetting.findMany()
    res.json(settings.reduce((acc, s) => ({ ...acc, [s.key]: s.value }), {}))
  } catch (error) {
    next(error)
  }
}

export const updateSystemSettings = async (req, res, next) => {
  try {
    const { settings } = req.body
    for (const [key, value] of Object.entries(settings)) {
      await prisma.systemSetting.upsert({ where: { key }, update: { value }, create: { key, value } })
    }
    res.json({ message: "Settings updated successfully" })
  } catch (error) {
    next(error)
  }
}

export const broadcastMessage = async (req, res, next) => {
  try {
    const { title, message, type = "EMERGENCY_BROADCAST" } = req.body
    const io = req.app.get("io")

    const users = await prisma.user.findMany({ select: { id: true } })
    await prisma.notification.createMany({ data: users.map((u) => ({ userId: u.id, type, title, message })) })

    io.emit(SOCKET_EVENTS.BROADCAST, { title, message, type })
    res.json({ message: "Broadcast sent successfully" })
  } catch (error) {
    next(error)
  }
}
