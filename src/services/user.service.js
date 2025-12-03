import prisma from "../config/prisma.js"
import { USER_LEVEL_THRESHOLDS } from "../config/constants.js"

export const updateUserLevel = async (userId) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { contributionScore: true, level: true },
    })

    if (!user) return

    let newLevel = "BRONZE"

    if (user.contributionScore >= USER_LEVEL_THRESHOLDS.PLATINUM) {
      newLevel = "PLATINUM"
    } else if (user.contributionScore >= USER_LEVEL_THRESHOLDS.GOLD) {
      newLevel = "GOLD"
    } else if (user.contributionScore >= USER_LEVEL_THRESHOLDS.SILVER) {
      newLevel = "SILVER"
    }

    if (newLevel !== user.level) {
      await prisma.user.update({
        where: { id: userId },
        data: { level: newLevel },
      })

      // Create notification for level up
      await prisma.notification.create({
        data: {
          userId,
          type: "SYSTEM",
          title: "Level Up! 🎉",
          message: `Congratulations! You've reached ${newLevel} level!`,
        },
      })
    }
  } catch (error) {
    console.error("Error updating user level:", error)
  }
}

export const calculateUserReputation = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      totalReports: true,
      verifiedReports: true,
      contributionScore: true,
    },
  })

  if (!user || user.totalReports === 0) return 0

  const verificationRate = user.verifiedReports / user.totalReports
  const reputation = (verificationRate * 0.6 + (user.contributionScore / 500) * 0.4) * 100

  return Math.min(Math.round(reputation), 100)
}
