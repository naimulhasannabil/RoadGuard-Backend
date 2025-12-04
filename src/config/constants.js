// Alert TTL (Time To Live) in milliseconds
export const ALERT_TTL = {
  POTHOLE: 24 * 60 * 60 * 1000,
  ACCIDENT: 2 * 60 * 60 * 1000,
  FLOOD: 6 * 60 * 60 * 1000,
  BROKEN_ROAD: 7 * 24 * 60 * 60 * 1000,
  LANDSLIDE: 24 * 60 * 60 * 1000,
  ROAD_CLOSURE: 12 * 60 * 60 * 1000,
  POLICE_CHECKPOINT: 4 * 60 * 60 * 1000,
  HEAVY_TRAFFIC: 30 * 60 * 1000,
  FIRE: 3 * 60 * 60 * 1000,
  ANIMAL_CROSSING: 1 * 60 * 60 * 1000,
  ROADBLOCK: 6 * 60 * 60 * 1000,
  WEATHER_HAZARD: 1 * 60 * 60 * 1000,
  CONSTRUCTION: 7 * 24 * 60 * 60 * 1000,
  OTHER: 2 * 60 * 60 * 1000,
}

export const SEVERITY_MULTIPLIER = {
  LOW: 0.5,
  MEDIUM: 1,
  HIGH: 1.5,
  CRITICAL: 2,
}

export const VERIFICATION_THRESHOLD = {
  MIN_UPVOTES: 3,
  MIN_VOTE_RATIO: 0.7,
}

export const USER_LEVEL_THRESHOLDS = {
  BRONZE: 0,
  SILVER: 50,
  GOLD: 200,
  PLATINUM: 500,
}

export const CONTRIBUTION_POINTS = {
  REPORT_ALERT: 5,
  ALERT_VERIFIED: 10,
  ALERT_REMOVED: -15,
  VOTE_CAST: 1,
}

export const NEARBY_RADIUS = {
  NOTIFICATION: 500,
  MAP_VIEW: 10000,
}

export const SOCKET_EVENTS = {
  JOIN_LOCATION: "join_location",
  LEAVE_LOCATION: "leave_location",
  UPDATE_LOCATION: "update_location",
  NEW_ALERT: "new_alert",
  ALERT_UPDATED: "alert_updated",
  ALERT_EXPIRED: "alert_expired",
  ALERT_VERIFIED: "alert_verified",
  ALERT_REMOVED: "alert_removed",
  NEARBY_ALERT: "nearby_alert",
  SOS_NEARBY: "sos_nearby",
  BROADCAST: "broadcast",
}
