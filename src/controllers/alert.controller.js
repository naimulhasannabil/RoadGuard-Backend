import prisma from "../config/prisma.js"
import {
  ALERT_TTL,
  SEVERITY_MULTIPLIER,
  CONTRIBUTION_POINTS,
  SOCKET_EVENTS,
  NEARBY_RADIUS,
} from "../config/constants.js"
import { updateUserLevel } from "../services/user.service.js"
import { sendNearbyNotifications } from "../services/notification.service.js"

const calculateExpirationTime = (type, severity) => {
  const baseTTL = ALERT_TTL[type] || ALERT_TTL.OTHER
  const multiplier = SEVERITY_MULTIPLIER[severity] || 1
  return new Date(Date.now() + baseTTL * multiplier)
}

const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3
  const φ1 = (lat1 * Math.PI) / 180
  const φ2 = (lat2 * Math.PI) / 180
  const Δφ = ((lat2 - lat1) * Math.PI) / 180
  const Δλ = ((lon2 - lon1) * Math.PI) / 180
  const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export const createAlert = async (req, res, next) => {
  try {
    const { type, severity, title, description, latitude, longitude, address, roadName, area, imageUrls } = req.body
    const io = req.app.get("io")

    const expiresAt = calculateExpirationTime(type, severity)

    const alert = await prisma.alert.create({
      data: {
        type,
        severity,
        title,
        description,
        latitude,
        longitude,
        address,
        roadName,
        area,
        expiresAt,
        status: "ACTIVE",
        reporterId: req.user.id,
        images: imageUrls?.length > 0 ? { create: imageUrls.map((url) => ({ url })) } : undefined,
      },
      include: { images: true, reporter: { select: { id: true, name: true, level: true, avatar: true } } },
    })

    await prisma.user.update({
      where: { id: req.user.id },
      data: { totalReports: { increment: 1 }, contributionScore: { increment: CONTRIBUTION_POINTS.REPORT_ALERT } },
    })

    await updateUserLevel(req.user.id)
    io.emit(SOCKET_EVENTS.NEW_ALERT, alert)
    await sendNearbyNotifications(alert, io)

    res.status(201).json(alert)
  } catch (error) {
    next(error)
  }
}

export const getAlerts = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 50,
      type,
      severity,
      status = "ACTIVE",
      verified,
      latitude,
      longitude,
      radius = NEARBY_RADIUS.MAP_VIEW,
    } = req.query
    const skip = (Number.parseInt(page) - 1) * Number.parseInt(limit)

    const where = {
      ...(status && { status }),
      ...(type && { type }),
      ...(severity && { severity }),
      ...(verified === "true" && { isVerified: true }),
      expiresAt: { gt: new Date() },
    }

    const [alerts, total] = await Promise.all([
      prisma.alert.findMany({
        where,
        skip,
        take: Number.parseInt(limit),
        orderBy: [{ severity: "desc" }, { createdAt: "desc" }],
        include: {
          images: true,
          reporter: { select: { id: true, name: true, level: true, avatar: true } },
          _count: { select: { votes: true } },
        },
      }),
      prisma.alert.count({ where }),
    ])

    let alertsWithDistance = alerts
    if (latitude && longitude) {
      alertsWithDistance = alerts
        .map((alert) => ({
          ...alert,
          distance: calculateDistance(
            Number.parseFloat(latitude),
            Number.parseFloat(longitude),
            alert.latitude,
            alert.longitude,
          ),
        }))
        .filter((alert) => alert.distance <= Number.parseFloat(radius))
        .sort((a, b) => a.distance - b.distance)
    }

    res.json({
      alerts: alertsWithDistance,
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

export const getAlertById = async (req, res, next) => {
  try {
    const { id } = req.params

    const alert = await prisma.alert.findUnique({
      where: { id },
      include: {
        images: true,
        reporter: { select: { id: true, name: true, level: true, avatar: true, contributionScore: true } },
        votes: { select: { userId: true, isUpvote: true } },
      },
    })

    if (!alert) return res.status(404).json({ error: "Alert not found" })

    let userVote = null
    if (req.user) {
      const vote = alert.votes.find((v) => v.userId === req.user.id)
      userVote = vote ? (vote.isUpvote ? "upvote" : "downvote") : null
    }

    res.json({ ...alert, userVote, votes: undefined })
  } catch (error) {
    next(error)
  }
}

export const getNearbyAlerts = async (req, res, next) => {
  try {
    const { latitude, longitude, radius = NEARBY_RADIUS.NOTIFICATION } = req.query

    if (!latitude || !longitude) return res.status(400).json({ error: "Latitude and longitude are required" })

    const alerts = await prisma.alert.findMany({
      where: { status: "ACTIVE", expiresAt: { gt: new Date() } },
      include: { images: true, reporter: { select: { id: true, name: true, level: true } } },
    })

    const nearbyAlerts = alerts
      .map((alert) => ({
        ...alert,
        distance: calculateDistance(
          Number.parseFloat(latitude),
          Number.parseFloat(longitude),
          alert.latitude,
          alert.longitude,
        ),
      }))
      .filter((alert) => alert.distance <= Number.parseFloat(radius))
      .sort((a, b) => a.distance - b.distance)

    res.json(nearbyAlerts)
  } catch (error) {
    next(error)
  }
}

export const getAlertsByArea = async (req, res, next) => {
  try {
    const { area, roadName, type, severity } = req.query

    const alerts = await prisma.alert.findMany({
      where: {
        status: "ACTIVE",
        expiresAt: { gt: new Date() },
        ...(area && { area: { contains: area, mode: "insensitive" } }),
        ...(roadName && { roadName: { contains: roadName, mode: "insensitive" } }),
        ...(type && { type }),
        ...(severity && { severity }),
      },
      include: { images: true, reporter: { select: { id: true, name: true, level: true } } },
      orderBy: { createdAt: "desc" },
    })

    res.json(alerts)
  } catch (error) {
    next(error)
  }
}

export const updateAlert = async (req, res, next) => {
  try {
    const { id } = req.params
    const { severity, description, status } = req.body
    const io = req.app.get("io")

    const existingAlert = await prisma.alert.findUnique({ where: { id }, select: { reporterId: true } })

    if (!existingAlert) return res.status(404).json({ error: "Alert not found" })
    if (existingAlert.reporterId !== req.user.id && req.user.role !== "ADMIN") {
      return res.status(403).json({ error: "Not authorized to update this alert" })
    }

    const alert = await prisma.alert.update({
      where: { id },
      data: { ...(severity && { severity }), ...(description && { description }), ...(status && { status }) },
      include: { images: true, reporter: { select: { id: true, name: true, level: true } } },
    })

    io.emit(SOCKET_EVENTS.ALERT_UPDATED, alert)
    res.json(alert)
  } catch (error) {
    next(error)
  }
}

export const deleteAlert = async (req, res, next) => {
  try {
    const { id } = req.params
    const io = req.app.get("io")

    const existingAlert = await prisma.alert.findUnique({ where: { id }, select: { reporterId: true } })

    if (!existingAlert) return res.status(404).json({ error: "Alert not found" })
    if (existingAlert.reporterId !== req.user.id && req.user.role !== "ADMIN") {
      return res.status(403).json({ error: "Not authorized to delete this alert" })
    }

    await prisma.alert.delete({ where: { id } })
    io.emit(SOCKET_EVENTS.ALERT_REMOVED, { id })
    res.json({ message: "Alert deleted successfully" })
  } catch (error) {
    next(error)
  }
}

export const processOfflineAlerts = async (req, res, next) => {
  try {
    const { alerts } = req.body
    const io = req.app.get("io")
    const createdAlerts = []

    for (const alertData of alerts) {
      try {
        const expiresAt = calculateExpirationTime(alertData.type, alertData.severity)

        const alert = await prisma.alert.create({
          data: {
            type: alertData.type,
            severity: alertData.severity,
            title: alertData.title,
            description: alertData.description,
            latitude: alertData.latitude,
            longitude: alertData.longitude,
            address: alertData.address,
            roadName: alertData.roadName,
            area: alertData.area,
            expiresAt,
            status: "ACTIVE",
            reporterId: req.user.id,
            reportedAt: new Date(alertData.timestamp) || new Date(),
          },
          include: { images: true, reporter: { select: { id: true, name: true, level: true } } },
        })

        createdAlerts.push(alert)
        io.emit(SOCKET_EVENTS.NEW_ALERT, alert)
      } catch (err) {
        console.error("Failed to process offline alert:", err)
      }
    }

    await prisma.user.update({
      where: { id: req.user.id },
      data: {
        totalReports: { increment: createdAlerts.length },
        contributionScore: { increment: CONTRIBUTION_POINTS.REPORT_ALERT * createdAlerts.length },
      },
    })

    res.json({ message: `Processed ${createdAlerts.length} of ${alerts.length} offline alerts`, alerts: createdAlerts })
  } catch (error) {
    next(error)
  }
}
