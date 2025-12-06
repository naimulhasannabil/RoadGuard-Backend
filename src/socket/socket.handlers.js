import jwt from "jsonwebtoken"
import { SOCKET_EVENTS } from "../config/constants.js"

const connectedUsers = new Map()
const GRID_SIZE = 0.01

const getGridCell = (lat, lon) => `cell_${Math.floor(lat / GRID_SIZE)}_${Math.floor(lon / GRID_SIZE)}`

export const setupSocketHandlers = (io) => {
  io.use((socket, next) => {
    const token = socket.handshake.auth.token
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET)
        socket.userId = decoded.userId
      } catch {}
    }
    next()
  })

  io.on("connection", (socket) => {
    console.log(`Client connected: ${socket.id}`)
    if (socket.userId) connectedUsers.set(socket.userId, { socketId: socket.id, location: null })

    socket.on(SOCKET_EVENTS.UPDATE_LOCATION, ({ latitude, longitude }) => {
      if (socket.userId) connectedUsers.set(socket.userId, { socketId: socket.id, location: { latitude, longitude } })
      socket.join(getGridCell(latitude, longitude))
    })

    socket.on(SOCKET_EVENTS.JOIN_LOCATION, ({ latitude, longitude }) => {
      socket.join(getGridCell(latitude, longitude))
    })

    socket.on(SOCKET_EVENTS.LEAVE_LOCATION, ({ latitude, longitude }) => {
      socket.leave(getGridCell(latitude, longitude))
    })

    socket.on("disconnect", () => {
      console.log(`Client disconnected: ${socket.id}`)
      if (socket.userId) connectedUsers.delete(socket.userId)
    })
  })
}

export const getConnectedUsers = () => connectedUsers
