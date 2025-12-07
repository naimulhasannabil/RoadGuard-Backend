import Joi from "joi"

export const createAlertSchema = Joi.object({
  type: Joi.string()
    .valid(
      "POTHOLE",
      "ACCIDENT",
      "FLOOD",
      "BROKEN_ROAD",
      "LANDSLIDE",
      "ROAD_CLOSURE",
      "POLICE_CHECKPOINT",
      "HEAVY_TRAFFIC",
      "FIRE",
      "ANIMAL_CROSSING",
      "ROADBLOCK",
      "WEATHER_HAZARD",
      "CONSTRUCTION",
      "OTHER",
    )
    .required(),
  severity: Joi.string().valid("LOW", "MEDIUM", "HIGH", "CRITICAL").required(),
  title: Joi.string().max(200).optional(),
  description: Joi.string().max(1000).optional(),
  latitude: Joi.number().min(-90).max(90).required(),
  longitude: Joi.number().min(-180).max(180).required(),
  address: Joi.string().max(500).optional(),
  roadName: Joi.string().max(200).optional(),
  area: Joi.string().max(200).optional(),
  imageUrls: Joi.array().items(Joi.string().uri()).max(5).optional(),
})

export const getAlertsQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(50),
  type: Joi.string().optional(),
  severity: Joi.string().optional(),
  status: Joi.string().optional(),
  verified: Joi.string().optional(),
  latitude: Joi.number().optional(),
  longitude: Joi.number().optional(),
  radius: Joi.number().optional(),
})
