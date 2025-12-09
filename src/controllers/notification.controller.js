import prisma from "../config/prisma.js"

export const getNotifications = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, unreadOnly } = req.query
    const skip = (Number.parseInt(page) - 1) * Number.parseInt(limit)

    const where = { userId: req.user.id, ...(unreadOnly === "true" && { isRead: false }) }

    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({ where, skip, take: Number.parseInt(limit), orderBy: { createdAt: "desc" } }),
      prisma.notification.count({ where }),
    ])

    res.json({
      notifications,
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

export const getUnreadCount = async (req, res, next) => {
  try {
    const count = await prisma.notification.count({ where: { userId: req.user.id, isRead: false } })
    res.json({ unreadCount: count })
  } catch (error) {
    next(error)
  }
}

export const markAsRead = async (req, res, next) => {
  try {
    const { id } = req.params
    const notification = await prisma.notification.update({
      where: { id, userId: req.user.id },
      data: { isRead: true },
    })
    res.json(notification)
  } catch (error) {
    next(error)
  }
}

export const markAllAsRead = async (req, res, next) => {
  try {
    await prisma.notification.updateMany({ where: { userId: req.user.id, isRead: false }, data: { isRead: true } })
    res.json({ message: "All notifications marked as read" })
  } catch (error) {
    next(error)
  }
}

export const deleteNotification = async (req, res, next) => {
  try {
    const { id } = req.params
    await prisma.notification.delete({ where: { id, userId: req.user.id } })
    res.json({ message: "Notification deleted" })
  } catch (error) {
    next(error)
  }
}
