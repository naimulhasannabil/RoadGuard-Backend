import Joi from "joi"

export const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  name: Joi.string().min(2).max(100).required(),
  phone: Joi.string()
    .pattern(/^[+]?[\d\s-]+$/)
    .optional(),
  vehicleType: Joi.string().valid("CAR", "BIKE", "TRUCK", "BUS", "OTHER").optional(),
})

export const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
})
