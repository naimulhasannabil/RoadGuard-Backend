import prisma from "../config/prisma.js"
import { SOCKET_EVENTS } from "../config/constants.js"

// Calculate distance between two points
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3
  const φ1 = (lat1 * Math.PI) / 180
  const φ2 = (lat2 * Math.PI) / 180
  const Δφ = ((lat2 - lat1) * Math.PI) / 180
  const Δλ = ((lon2 - lon1) * Math.PI) / 180

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return R * c
}

export const sendNearbyNotifications = async (alert, io) => {
  try {
    // In a production app, you'd track user locations in real-time
    // For now, we broadcast to all connected clients
    // and let the client-side filter based on their location

    const notification = {
      type: "NEARBY_ALERT",
      title: `New ${alert.type.replace("_", " ")} Alert`,
      message: `A ${alert.severity.toLowerCase()} severity ${alert.type.toLowerCase().replace("_", " ")} was reported nearby`,
      data: {
        alertId: alert.id,
        type: alert.type,
        severity: alert.severity,
        latitude: alert.latitude,
        longitude: alert.longitude,
      },
    }

    // Emit to all connected clients
    io.emit(SOCKET_EVENTS.NEARBY_ALERT, notification)
  } catch (error) {
    console.error("Error sending nearby notifications:", error)
  }
}

export const createNotification = async (userId, type, title, message, data = null) => {
  try {
    return await prisma.notification.create({
      data: {
        userId,
        type,
        title,
        message,
        data,
      },
    })
  } catch (error) {
    console.error("Error creating notification:", error)
  }
}
