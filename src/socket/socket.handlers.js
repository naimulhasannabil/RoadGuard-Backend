import jwt from "jsonwebtoken"
import { SOCKET_EVENTS } from "../config/constants.js"

// Store connected users with their locations
const connectedUsers = new Map()

export const setupSocketHandlers = (io) => {
  // Authentication middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth.token

    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET)
        socket.userId = decoded.userId
      } catch (err) {
        // Continue without authentication for public data
      }
    }

    next()
  })

  io.on("connection", (socket) => {
    console.log(`Client connected: ${socket.id}`)

    // Track user connection
    if (socket.userId) {
      connectedUsers.set(socket.userId, {
        socketId: socket.id,
        location: null,
      })
    }

    // Handle location updates
    socket.on(SOCKET_EVENTS.UPDATE_LOCATION, (data) => {
      const { latitude, longitude } = data

      if (socket.userId) {
        connectedUsers.set(socket.userId, {
          socketId: socket.id,
          location: { latitude, longitude },
        })
      }

      // Join location-based room (grid cell)
      const gridCell = getGridCell(latitude, longitude)
      socket.join(gridCell)
    })

    // Handle joining specific location areas
    socket.on(SOCKET_EVENTS.JOIN_LOCATION, (data) => {
      const { latitude, longitude, radius } = data
      const gridCell = getGridCell(latitude, longitude)
      socket.join(gridCell)

      // Also join adjacent cells for smoother updates
      const adjacentCells = getAdjacentGridCells(latitude, longitude)
      adjacentCells.forEach((cell) => socket.join(cell))
    })

    // Handle leaving location areas
    socket.on(SOCKET_EVENTS.LEAVE_LOCATION, (data) => {
      const { latitude, longitude } = data
      const gridCell = getGridCell(latitude, longitude)
      socket.leave(gridCell)

      const adjacentCells = getAdjacentGridCells(latitude, longitude)
      adjacentCells.forEach((cell) => socket.leave(cell))
    })

    // Handle disconnection
    socket.on("disconnect", () => {
      console.log(`Client disconnected: ${socket.id}`)

      if (socket.userId) {
        connectedUsers.delete(socket.userId)
      }
    })

    // Handle errors
    socket.on("error", (error) => {
      console.error(`Socket error for ${socket.id}:`, error)
    })
  })
}

// Grid cell size in degrees (approximately 1km)
const GRID_SIZE = 0.01

const getGridCell = (latitude, longitude) => {
  const latCell = Math.floor(latitude / GRID_SIZE)
  const lonCell = Math.floor(longitude / GRID_SIZE)
  return `cell_${latCell}_${lonCell}`
}

const getAdjacentGridCells = (latitude, longitude) => {
  const cells = []
  const latCell = Math.floor(latitude / GRID_SIZE)
  const lonCell = Math.floor(longitude / GRID_SIZE)

  for (let i = -1; i <= 1; i++) {
    for (let j = -1; j <= 1; j++) {
      if (i !== 0 || j !== 0) {
        cells.push(`cell_${latCell + i}_${lonCell + j}`)
      }
    }
  }

  return cells
}

// Export for use in controllers
export const getConnectedUsers = () => connectedUsers
