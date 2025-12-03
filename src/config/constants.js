// Alert TTL (Time To Live) in milliseconds based on type
export const ALERT_TTL = {
  POTHOLE: 24 * 60 * 60 * 1000, // 24 hours
  ACCIDENT: 2 * 60 * 60 * 1000, // 2 hours
  FLOOD: 6 * 60 * 60 * 1000, // 6 hours
  BROKEN_ROAD: 7 * 24 * 60 * 60 * 1000, // 7 days
  LANDSLIDE: 24 * 60 * 60 * 1000, // 24 hours
  ROAD_CLOSURE: 12 * 60 * 60 * 1000, // 12 hours
  POLICE_CHECKPOINT: 4 * 60 * 60 * 1000, // 4 hours
  HEAVY_TRAFFIC: 30 * 60 * 1000, // 30 minutes
  FIRE: 3 * 60 * 60 * 1000, // 3 hours
  ANIMAL_CROSSING: 1 * 60 * 60 * 1000, // 1 hour
  ROADBLOCK: 6 * 60 * 60 * 1000, // 6 hours
  WEATHER_HAZARD: 1 * 60 * 60 * 1000, // 1 hour
  CONSTRUCTION: 7 * 24 * 60 * 60 * 1000, // 7 days
  OTHER: 2 * 60 * 60 * 1000, // 2 hours
}

// Severity multipliers for TTL
export const SEVERITY_MULTIPLIER = {
  LOW: 0.5,
  MEDIUM: 1,
  HIGH: 1.5,
  CRITICAL: 2,
}

// Verification thresholds
export const VERIFICATION_THRESHOLD = {
  MIN_UPVOTES: 3,
  MIN_VOTE_RATIO: 0.7, // 70% upvotes
}

// User level thresholds
export const USER_LEVEL_THRESHOLDS = {
  BRONZE: 0,
  SILVER: 50,
  GOLD: 200,
  PLATINUM: 500,
}

// Contribution points
export const CONTRIBUTION_POINTS = {
  REPORT_ALERT: 5,
  ALERT_VERIFIED: 10,
  ALERT_REMOVED: -15,
  VOTE_CAST: 1,
}

// Nearby alert radius in meters
export const NEARBY_RADIUS = {
  NOTIFICATION: 500, // 500m for push notifications
  MAP_VIEW: 10000, // 10km for map view
}

// WebSocket events
export const SOCKET_EVENTS = {
  // Client to Server
  JOIN_LOCATION: "join_location",
  LEAVE_LOCATION: "leave_location",
  UPDATE_LOCATION: "update_location",

  // Server to Client
  NEW_ALERT: "new_alert",
  ALERT_UPDATED: "alert_updated",
  ALERT_EXPIRED: "alert_expired",
  ALERT_VERIFIED: "alert_verified",
  ALERT_REMOVED: "alert_removed",
  NEARBY_ALERT: "nearby_alert",
  SOS_NEARBY: "sos_nearby",
  BROADCAST: "broadcast",
}
