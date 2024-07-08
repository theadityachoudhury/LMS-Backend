import { NextFunction, Request, Response } from 'express';
import { loginSchema, registerSchema } from '../../Validators/Auth';
import Joi from 'joi';
import {
    INVALID_TOKEN,
    NO_TOKEN,
    SERVER_ERROR,
    USER_IS_DELETED,
    USER_IS_DISABLED,
    USER_NOT_FOUND,
    VALIDATION_ERROR,
} from '../../Utils/responseMessages';
import { CustomError } from '../../Utils/errorHandler';
import jsonwebtoken from 'jsonwebtoken';
import config from '../../Config';
import { customRequest, resUser } from '../../Typings';
import { dbQuery } from '../../Utils/connnectToDB';

export const signupValidator = async (req: Request, res: Response, next: NextFunction) => {
    try {
        await registerSchema.validateAsync(req.body);
        next();
    } catch (error: unknown) {
        console.error(error);
        let err: CustomError;
        if (error instanceof Joi.ValidationError) {
            err = {
                name: 'CustomError',
                message: error.message,
                statusCode: 400,
                reason: VALIDATION_ERROR,
            };
        } else {
            err = {
                name: 'CustomError',
                message: 'An error occurred',
                statusCode: 500,
                reason: SERVER_ERROR,
            };
        }
        next(err);
    }
};

export const loginValidator = async (req: Request, res: Response, next: NextFunction) => {
    try {
        await loginSchema.validateAsync(req.body);
        next();
    } catch (error: unknown) {
        console.error(error);
        let err: CustomError;
        if (error instanceof Joi.ValidationError) {
            err = {
                name: 'CustomError',
                message: error.message,
                statusCode: 400,
                reason: VALIDATION_ERROR,
            };
        } else {
            err = {
                name: 'CustomError',
                message: 'An error occurred',
                statusCode: 500,
                reason: SERVER_ERROR,
            };
        }
        next(err);
    }
};

export const verifyToken = async (req: customRequest, res: Response, next: NextFunction) => {
    let token: any = undefined;
    let refreshToken: any = undefined;
    refreshToken = req.cookies.refreshToken || req.cookies.refreshAccessToken;
    if (req.cookies && (req.cookies.token || req.cookies.accessToken)) {
        token = req.cookies.token || req.cookies.accessToken;
    } else if (req.headers['authorization']) {
        const authHeader = req.headers['authorization'];
        const bearerTokenMatch = authHeader && authHeader.match(/^Bearer (.+)$/);

        if (bearerTokenMatch) {
            token = bearerTokenMatch[1];
        }
    }
    if (!token) {
        return res.status(200).json({
            status: 409,
            reason: NO_TOKEN,
            success: false,
            data: null,
        });
    }

    jsonwebtoken.verify(String(token), config.JWT_SECRET, (err: any, user: any) => {
        if (err) {
            return res.status(200).json({
                status: 410,
                reason: INVALID_TOKEN,
                success: false,
                data: null,
            });
        } else {
            const dbUser = dbQuery.user.findUnique({
                where: {
                    id: user.id,
                },
            });
            if (!dbUser) {
                return res.status(200).json({
                    status: 410,
                    reason: USER_NOT_FOUND,
                    success: false,
                    data: null,
                });
            }
            req.user = user as resUser;
            req.token = {
                accessToken: token,
                refreshToken: refreshToken,
                expiresIn: new Date(),
            };
            next();
        }
    });
};

export const refreshTokenValidator = async (req: customRequest, res: Response, next: NextFunction) => {
    let refreshToken: any = undefined;
    refreshToken = req.cookies.refreshToken || req.cookies.refreshAccessToken;
    if (req.cookies && (req.cookies.refreshToken || req.cookies.refreshAccessToken)) {
        refreshToken = req.cookies.refreshToken || req.cookies.refreshAccessToken;
    }

    if (!refreshToken) {
        return res.status(200).json({
            status: 409,
            reason: NO_TOKEN,
            success: false,
            data: null,
        });
    }

    jsonwebtoken.verify(String(refreshToken), config.JWT_REFRESH_TOKEN_SECRET, (err: any, user: any) => {
        if (err) {
            return res.status(200).json({
                status: 410,
                reason: INVALID_TOKEN,
                success: false,
                data: null,
            });
        } else {
            req.user = {
                id: user.id,
                email: user.email,
                username: user.username,
                name: user.name,
                role: user.role,
                createdAt: user.createdAt,
                updatedAt: user.updatedAt,
                deleted: user.isDeleted,
                disabled: user.isDisabled,
                verified: user.verified,
            };
            req.token = {
                accessToken: '',
                refreshToken: refreshToken,
                expiresIn: new Date(),
            };
            next();
        }
    });
};

export const isUser = async (req: customRequest, res: Response, next: NextFunction) => {
    const user = await dbQuery.user.findUnique({
        where: {
            id: req.user.id,
        },
    });
    if (!user) {
        return res.status(200).json({
            status: 410,
            reason: USER_NOT_FOUND,
            success: false,
            data: null,
        });
    }

    if (req.user.disabled) {
        return res.status(200).json({
            status: 410,
            reason: USER_IS_DISABLED,
            success: false,
            data: null,
        });
    } else if (req.user.deleted) {
        return res.status(200).json({
            status: 410,
            reason: USER_IS_DELETED,
            success: false,
            data: null,
        });
    }
    next();
};
