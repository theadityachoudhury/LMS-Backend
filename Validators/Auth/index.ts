import Joi from 'joi';

// Register Schema
export const registerSchema = Joi.object({
    email: Joi.string()
        .email({ tlds: { allow: false } })
        .required()
        .messages({
            'string.empty': 'Email is required',
            'string.email': 'Invalid email address',
        }),
    username: Joi.string().min(3).max(20).required().messages({
        'string.empty': 'Username is required',
        'string.min': 'Username must be at least 3 characters long',
        'string.max': 'Username must be at most 20 characters long',
    }),
    name: Joi.object({
        first: Joi.string().min(2).max(50).required().messages({
            'string.empty': 'First name is required',
            'string.min': 'First name must be at least 2 characters long',
            'string.max': 'First name must be at most 50 characters long',
        }),
        last: Joi.string().min(2).max(50).required().messages({
            'string.empty': 'Last name is required',
            'string.min': 'Last name must be at least 2 characters long',
            'string.max': 'Last name must be at most 50 characters long',
        }),
    }).required(),
    password: Joi.string()
        .min(8)
        .max(50)
        .pattern(new RegExp(/[A-Z]/))
        .pattern(new RegExp(/[a-z]/))
        .pattern(new RegExp(/[0-9]/))
        .pattern(new RegExp(/[!@#$%^&*(),.?":{}|<>]/))
        .required()
        .messages({
            'string.empty': 'Password is required',
            'string.min': 'Password must be at least 8 characters long',
            'string.max': 'Password must be at most 50 characters long',
            'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
        }),
    confirmPassword: Joi.any().valid(Joi.ref('password')).required().messages({
        'any.only': 'Passwords do not match',
        'string.empty': 'Confirm password is required',
    }),
});

export const loginSchema = Joi.object({
    recognition: Joi.object({
        username: Joi.string().min(3).max(30).optional(),
        email: Joi.string().email().optional(),
    })
        .xor('username', 'email')
        .required(),
    password: Joi.string().min(8).required(),
});
