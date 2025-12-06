import { SOCKET_EVENTS } from "../config/constants.js"

export const sendNearbyNotifications = async (alert, io) => {
  try {
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
    io.emit(SOCKET_EVENTS.NEARBY_ALERT, notification)
  } catch (error) {
    console.error("Error sending nearby notifications:", error)
  }
}
