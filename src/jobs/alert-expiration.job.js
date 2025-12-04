import prisma from "../config/prisma.js"
import { SOCKET_EVENTS } from "../config/constants.js"

export const startAlertExpirationJob = (io) => {
  // Run every minute
  const INTERVAL = 60 * 1000

  const checkExpiredAlerts = async () => {
    try {
      // Find and update expired alerts
      const expiredAlerts = await prisma.alert.findMany({
        where: {
          status: { in: ["ACTIVE", "PENDING", "VERIFIED"] },
          expiresAt: { lte: new Date() },
        },
        select: { id: true },
      })

      if (expiredAlerts.length > 0) {
        const ids = expiredAlerts.map((a) => a.id)

        // Update status to expired
        await prisma.alert.updateMany({
          where: { id: { in: ids } },
          data: { status: "EXPIRED" },
        })

        // Broadcast expiration to connected clients
        ids.forEach((id) => {
          io.emit(SOCKET_EVENTS.ALERT_EXPIRED, { id })
        })

        console.log(`Expired ${expiredAlerts.length} alerts`)
      }
    } catch (error) {
      console.error("Error in alert expiration job:", error)
    }
  }

  // Run immediately and then on interval
  checkExpiredAlerts()
  setInterval(checkExpiredAlerts, INTERVAL)

  console.log("🕐 Alert expiration job started")
}
