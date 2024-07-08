import Joi from 'joi';

const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required().pattern(new RegExp('^[a-zA-Z0-9]{8,30}$')),
  username: Joi.string().min(3).max(30).required(),
  name: Joi.object({
    first: Joi.string().required(),
    last: Joi.string().optional(),
  }).required(),
});

const loginSchema = Joi.object({
  recognition: Joi.object({
    username: Joi.string().min(3).max(30).optional(),
    email: Joi.string().email().optional(),
  })
    .xor('username', 'email')
    .required(),
  password: Joi.string().min(8).required(),
});

export { registerSchema, loginSchema };
