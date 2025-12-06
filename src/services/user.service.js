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
    if (user.contributionScore >= USER_LEVEL_THRESHOLDS.PLATINUM) newLevel = "PLATINUM"
    else if (user.contributionScore >= USER_LEVEL_THRESHOLDS.GOLD) newLevel = "GOLD"
    else if (user.contributionScore >= USER_LEVEL_THRESHOLDS.SILVER) newLevel = "SILVER"

    if (newLevel !== user.level) {
      await prisma.user.update({ where: { id: userId }, data: { level: newLevel } })
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
