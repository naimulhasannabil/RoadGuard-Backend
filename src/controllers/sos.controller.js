import prisma from "../config/prisma.js"
import { SOCKET_EVENTS, NEARBY_RADIUS } from "../config/constants.js"

export const createSOS = async (req, res, next) => {
  try {
    const { type, description, latitude, longitude, address } = req.body
    const io = req.app.get("io")

    const activeSOS = await prisma.sOSRequest.findFirst({ where: { userId: req.user.id, status: "ACTIVE" } })
    if (activeSOS) return res.status(400).json({ error: "You already have an active SOS request" })

    const sos = await prisma.sOSRequest.create({
      data: { type, description, latitude, longitude, address, userId: req.user.id },
      include: { user: { select: { id: true, name: true, phone: true } } },
    })

    io.emit(SOCKET_EVENTS.SOS_NEARBY, { ...sos, message: `Emergency ${type} request nearby!` })
    res.status(201).json(sos)
  } catch (error) {
    next(error)
  }
}

export const getActiveSOS = async (req, res, next) => {
  try {
    const sos = await prisma.sOSRequest.findFirst({ where: { userId: req.user.id, status: "ACTIVE" } })
    res.json(sos)
  } catch (error) {
    next(error)
  }
}

export const getNearbySOSRequests = async (req, res, next) => {
  try {
    const { latitude, longitude, radius = NEARBY_RADIUS.MAP_VIEW } = req.query

    if (!latitude || !longitude) return res.status(400).json({ error: "Latitude and longitude are required" })

    const sosRequests = await prisma.sOSRequest.findMany({
      where: { status: "ACTIVE" },
      include: { user: { select: { id: true, name: true, phone: true } } },
    })

    const nearby = sosRequests.filter((sos) => {
      const R = 6371e3
      const φ1 = (Number.parseFloat(latitude) * Math.PI) / 180
      const φ2 = (sos.latitude * Math.PI) / 180
      const Δφ = ((sos.latitude - Number.parseFloat(latitude)) * Math.PI) / 180
      const Δλ = ((sos.longitude - Number.parseFloat(longitude)) * Math.PI) / 180
      const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2
      return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) <= Number.parseFloat(radius)
    })

    res.json(nearby)
  } catch (error) {
    next(error)
  }
}

export const updateSOSStatus = async (req, res, next) => {
  try {
    const { id } = req.params
    const { status } = req.body

    const sos = await prisma.sOSRequest.update({
      where: { id },
      data: {
        status,
        ...(status === "RESPONDED" && { respondedAt: new Date() }),
        ...(status === "RESOLVED" && { resolvedAt: new Date() }),
      },
    })

    res.json(sos)
  } catch (error) {
    next(error)
  }
}

export const cancelSOS = async (req, res, next) => {
  try {
    const { id } = req.params

    const sos = await prisma.sOSRequest.findUnique({ where: { id } })
    if (!sos) return res.status(404).json({ error: "SOS request not found" })
    if (sos.userId !== req.user.id && req.user.role !== "ADMIN")
      return res.status(403).json({ error: "Not authorized" })

    await prisma.sOSRequest.update({ where: { id }, data: { status: "CANCELLED" } })
    res.json({ message: "SOS request cancelled" })
  } catch (error) {
    next(error)
  }
}
