import { NextFunction, Request, Response } from 'express';
import { dbQuery } from '../../Utils/connnectToDB';
import { User, customRequest, resUser } from '../../Types';
import { responseHandler } from '../../Utils/responseHandler';
import {
    DB_ERROR,
    INCORRECR_PASSWORD,
    INVALID_TOKEN,
    LOGIN_SUCCESS,
    MAX_SESSIONS,
    NO_TOKEN,
    NO_TOKEN_FOUND,
    NO_TOKEN_PASSWORD_RESET,
    PASSWORD_RESET_LINK_SENT,
    PASSWORD_RESET_SUCCESS,
    SERVER_ERROR,
    TOKEN_EXPIRED,
    TOKEN_REFRESH,
    USER_EXISTS,
    USER_FOUND,
    USER_IS_DELETED,
    USER_IS_DISABLED,
    USER_LOGGED_OUT,
    USER_NOT_FOUND,
    USER_REGISTERED,
} from '../../Utils/responseMessages';
import { CustomError } from '../../Utils/errorHandler';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { comparePassword, hashPassword } from '../../Utils/hash';
import { loginAlertMail, sendPasswordResetMail, sendWelcomeMail } from '../../Utils/mailer';
import { generateAccessToken, generateRefreshToken, generateResetPasswordToken } from '../../Utils/tokens';
import { randomUUID } from 'crypto';
import config from '../../Config';
import { passwordGenerator } from '../../Utils/passwordGenerator';

/**
 * Register Function
 *
 * @returns {string} - 400 User Exists
 * @returns {string} - 201 User Registered
 * @returns {string} - 400 Database Error
 * @returns {string} - 500 Internal Server Error
 *
 */
export const register = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { email, password, username, name } = req.body;

        // Check if the user already exists
        let user: User | null = await dbQuery.user.findUnique({
            where: { email },
        });

        if (!user) {
            user = await dbQuery.user.findUnique({
                where: { username },
            });
        }

        if (user) {
            return responseHandler(
                {
                    status: 400,
                    success: false,
                    message: USER_EXISTS,
                    data: null,
                },
                req,
                res,
            );
        }

        // Create a new user
        const newUser = await dbQuery.user.create({
            data: {
                email,
                password: hashPassword(password),
                username,
                name: {
                    first: name.first,
                    last: name.last || '',
                },
            },
        });

        // Respond with the newly created user
        responseHandler(
            {
                status: 201,
                success: true,
                message: USER_REGISTERED,
                data: newUser,
            },
            req,
            res,
        );
        sendWelcomeMail(email, name.first).catch((error) => console.error(error));
    } catch (error: unknown) {
        console.error(error);
        let err: CustomError;
        if (error instanceof PrismaClientKnownRequestError) {
            err = {
                name: 'CustomError',
                message: error.message,
                statusCode: 400,
                reason: DB_ERROR,
            };
        } else {
            err = {
                name: 'CustomError',
                message: 'An internal server error occurred',
                statusCode: 500,
                reason: SERVER_ERROR,
            };
        }
        return next(err);
    }
};

/**
 * Login Function
 *
 * @returns {string} - 404 User Not Found
 * @returns {string} - 401 Incorrect Password
 * @returns {string} - 403 Max Sessions
 * @returns {string} - 200 Login Successful
 * @returns {string} - 400 Database Error
 * @returns {string} - 500 Internal Server Error
 *
 */
export const login = async (req: customRequest, res: Response, next: NextFunction) => {
    try {
        const { password, recognition } = req.body;
        const { username, email } = recognition;
        let user: User | null;
        if (email) {
            user = await dbQuery.user.findUnique({
                where: { email },
            });
        } else {
            user = await dbQuery.user.findUnique({
                where: { username },
            });
        }
        if (!user) {
            return responseHandler(
                {
                    status: 404,
                    success: false,
                    message: USER_NOT_FOUND,
                    data: null,
                },
                req,
                res,
            );
        }

        if (user.deleted) {
            return responseHandler(
                {
                    status: 402,
                    success: false,
                    message: USER_IS_DELETED,
                    data: null,
                },
                req,
                res,
            );
        }

        if (user.disabled) {
            return responseHandler(
                {
                    status: 405,
                    success: false,
                    message: USER_IS_DISABLED,
                    data: null,
                },
                req,
                res,
            );
        }

        // Check if the password is correct
        if (!comparePassword(password, user.password)) {
            return responseHandler(
                {
                    status: 401,
                    success: false,
                    message: INCORRECR_PASSWORD,
                    data: null,
                },
                req,
                res,
            );
        }

        const refreshTokenColl = await dbQuery.refreshToken.findFirst({
            where: {
                userId: user.id,
            },
        });

        const tokens = refreshTokenColl?.token || [];

        const resUser: resUser = {
            id: user.id,
            email: user.email,
            username: user.username,
            name: user.name,
            role: user.role,
            deleted: user.deleted,
            disabled: user.disabled,
            verified: user.verified,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
        };

        const accessToken: string = generateAccessToken(resUser);
        const refreshToken: string = generateRefreshToken(resUser);
        const ua: string = req.headers['user-agent'] || 'Unkown';

        const now = new Date();
        const validTokens = tokens.filter((token) => token.expiresIn > now);

        if (validTokens.length >= 4) {
            return responseHandler(
                {
                    status: 403,
                    success: false,
                    message: MAX_SESSIONS,
                    data: { validTokens, tempAccessToken: accessToken },
                },
                req,
                res,
            );
        }

        const accessTokenExpiresIn = new Date(Date.now() + 4 * 60 * 60 * 1000);
        validTokens.push({
            accessToken: accessToken,
            refreshToken: refreshToken,
            expiresIn: accessTokenExpiresIn, // Adjust the expiration time as needed
            lastUsed: now,
            instanceName: ua,
            tokenid: randomUUID(),
        });

        if (refreshTokenColl) {
            await dbQuery.refreshToken.update({
                where: { id: refreshTokenColl.id },
                data: { token: validTokens },
            });
        } else {
            await dbQuery.refreshToken.create({
                data: {
                    userId: user.id,
                    token: validTokens,
                },
            });
        }

        res.cookie('accessToken', accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'live',
            sameSite: 'strict',
            maxAge: 4 * 60 * 60 * 1000, //how much time?
        });

        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'live',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });
        // Respond with the access token and refresh token
        responseHandler(
            {
                status: 200,
                success: true,
                message: LOGIN_SUCCESS,
                data: { accessToken, refreshToken, user: resUser, expiresIn: accessTokenExpiresIn },
            },
            req,
            res,
        );
        loginAlertMail(user.email, user.name.first, req.device.type, req.headers['user-agent'] || 'Unknown').catch((error) => console.error(error));
    } catch (error) {
        console.error(error);
        let err: CustomError;
        if (error instanceof PrismaClientKnownRequestError) {
            err = {
                name: 'CustomError',
                message: error.message,
                statusCode: 400,
                reason: DB_ERROR,
            };
        } else {
            err = {
                name: 'CustomError',
                message: SERVER_ERROR,
                statusCode: 500,
                reason: SERVER_ERROR,
            };
        }
        return next(err);
    }
};

export const continueWithGoogle = async (req: customRequest, res: Response, next: NextFunction) => {
    var newUser = false;
    try {
        const { credential } = req.body;
        // const ticket = await client.verifyIdToken({
        //     idToken: credential,
        //     audience: config.GOOGLE_CLIENT_ID,
        // });

        // const payload: any = ticket.getPayload();
        var payload: any;

        try {
            const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${credential}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error('Error fetching user data from google');
            }
            payload = await response.json();
        } catch (error) {
            console.error(error);
            throw new Error('Error fetching user data from google');
        }

        let user = await dbQuery.user.findFirst({
            where: {
                email: payload.email,
            },
        });

        if (!user) {
            //create username as given_name + family_name + randomUUID where first 4 letters from random uuid is taken
            newUser = true;
            user = await dbQuery.user.create({
                data: {
                    email: payload.email,
                    username: `${payload.given_name}${payload.family_name}${randomUUID().slice(0, 5)}`.toLowerCase(),
                    password: hashPassword(passwordGenerator(16)),
                    name: {
                        first: payload.given_name,
                        last: payload.family_name || '',
                    },
                    verified: true,
                },
            });
        }

        if (user.deleted) {
            return responseHandler(
                {
                    status: 402,
                    success: false,
                    message: USER_IS_DELETED,
                    data: null,
                },
                req,
                res,
            );
        }

        if (user.disabled) {
            return responseHandler(
                {
                    status: 405,
                    success: false,
                    message: USER_IS_DISABLED,
                    data: null,
                },
                req,
                res,
            );
        }

        const refreshTokenColl = await dbQuery.refreshToken.findFirst({
            where: {
                userId: user.id,
            },
        });

        const tokens = refreshTokenColl?.token || [];

        const resUser: resUser = {
            id: user.id,
            email: user.email,
            username: user.username,
            name: user.name,
            role: user.role,
            deleted: user.deleted,
            disabled: user.disabled,
            verified: user.verified,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
        };

        const accessToken: string = generateAccessToken(resUser);
        const refreshToken: string = generateRefreshToken(resUser);
        const ua: string = req.headers['user-agent'] || 'Unkown';

        const now = new Date();
        const validTokens = tokens.filter((token) => token.expiresIn > now);

        if (validTokens.length >= 4) {
            return responseHandler(
                {
                    status: 403,
                    success: false,
                    message: MAX_SESSIONS,
                    data: { validTokens, tempAccessToken: accessToken },
                },
                req,
                res,
            );
        }

        const accessTokenExpiresIn = new Date(Date.now() + 4 * 60 * 60 * 1000);
        validTokens.push({
            accessToken: accessToken,
            refreshToken: refreshToken,
            expiresIn: accessTokenExpiresIn, // Adjust the expiration time as needed
            lastUsed: now,
            instanceName: ua,
            tokenid: randomUUID(),
        });

        if (refreshTokenColl) {
            await dbQuery.refreshToken.update({
                where: { id: refreshTokenColl.id },
                data: { token: validTokens },
            });
        } else {
            await dbQuery.refreshToken.create({
                data: {
                    userId: user.id,
                    token: validTokens,
                },
            });
        }

        res.cookie('accessToken', accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'live',
            sameSite: 'strict',
            maxAge: 4 * 60 * 60 * 1000, //how much time?
        });

        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'live',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });
        // Respond with the access token and refresh token
        responseHandler(
            {
                status: 200,
                success: true,
                message: LOGIN_SUCCESS,
                data: { accessToken, refreshToken, user: resUser, expiresIn: accessTokenExpiresIn },
            },
            req,
            res,
        );
        if (newUser) {
            sendWelcomeMail(user.email, user.name.first).catch((error) => console.error(error));
        }
        loginAlertMail(user.email, user.name.first, req.device.type, req.headers['user-agent'] || 'Unknown').catch((error) => console.error(error));
    } catch (error) {
        console.error(error);
        let err: CustomError;
        if (error instanceof PrismaClientKnownRequestError) {
            err = {
                name: 'CustomError',
                message: error.message,
                statusCode: 400,
                reason: DB_ERROR,
            };
        } else {
            err = {
                name: 'CustomError',
                message: SERVER_ERROR,
                statusCode: 500,
                reason: SERVER_ERROR,
            };
        }
        next(err);
    }
};

/**
 * Logout Function
 *
 * @returns {string} - 200 Logout Successful
 * @returns {string} - 500 Internal Server Error
 * @returns {string} - 400 Database Error
 *
 */
export const logout = async (req: customRequest, res: Response, next: NextFunction) => {
    try {
        res.clearCookie('accessToken');
        res.clearCookie('refreshToken');
        const refreshToken = req.cookies.refreshToken;
        if (!refreshToken) {
            return responseHandler(
                {
                    status: 200,
                    success: true,
                    message: USER_LOGGED_OUT,
                    data: null,
                },
                req,
                res,
            );
        }

        // pull the refresh token from the database of user userid
        const refreshTokenColl = await dbQuery.refreshToken.findFirst({
            where: {
                userId: req.user.id,
            },
        });

        if (!refreshTokenColl) {
            return responseHandler(
                {
                    status: 200,
                    success: true,
                    message: USER_LOGGED_OUT,
                    data: null,
                },
                req,
                res,
            );
        }

        const tokens = refreshTokenColl.token;
        const validTokens = tokens.filter((token) => token.refreshToken !== refreshToken);

        await dbQuery.refreshToken.update({
            where: { id: refreshTokenColl.id },
            data: { token: validTokens },
        });

        responseHandler(
            {
                status: 200,
                success: true,
                message: USER_LOGGED_OUT,
                data: null,
            },
            req,
            res,
        );
    } catch (error) {
        console.error(error);
        let err: CustomError;
        if (error instanceof PrismaClientKnownRequestError) {
            err = {
                name: 'CustomError',
                message: error.message,
                statusCode: 400,
                reason: DB_ERROR,
            };
        } else {
            err = {
                name: 'CustomError',
                message: 'An internal server error occurred',
                statusCode: 500,
                reason: SERVER_ERROR,
            };
        }
        return next(err);
    }
};

/**
 * Refresh Token Function
 *
 * @returns {string} - 400 No Refresh Token Provided
 * @returns {string} - 400 No Refresh Token Found
 * @returns {string} - 400 Invalid Refresh Token
 * @returns {string} - 400 Refresh Token Expired
 * @returns {string} - 200 Token Refreshed
 * @returns {string} - 400 Database Error
 * @returns {string} - 500 Internal Server Error
 *
 */
export const refreshToken = async (req: customRequest, res: Response, next: NextFunction) => {
    try {
        const refreshToken = req.cookies.refreshToken || req.cookies.refreshAccessToken;

        if (!refreshToken) {
            return responseHandler(
                {
                    status: 400,
                    success: false,
                    message: NO_TOKEN,
                    data: null,
                },
                req,
                res,
            );
        }

        // pull the refresh token from the database of user userid
        const refreshTokenColl = await dbQuery.refreshToken.findFirst({
            where: {
                userId: req.user.id,
            },
        });
        if (!refreshTokenColl) {
            return responseHandler(
                {
                    status: 400,
                    success: false,
                    message: NO_TOKEN_FOUND,
                    data: null,
                },
                req,
                res,
            );
        }

        const tokens = refreshTokenColl.token;
        const validToken = tokens.find((token) => token.refreshToken === refreshToken);
        if (!validToken) {
            return responseHandler(
                {
                    status: 400,
                    success: false,
                    message: INVALID_TOKEN,
                    data: null,
                },
                req,
                res,
            );
        }

        const now = new Date();
        if (validToken.expiresIn < now) {
            // Remove the expired token
            const newTokens = tokens.filter((token) => token.refreshToken !== refreshToken);
            await dbQuery.refreshToken.update({
                where: { id: refreshTokenColl.id },
                data: { token: newTokens },
            });
            return responseHandler(
                {
                    status: 400,
                    success: false,
                    message: TOKEN_EXPIRED,
                    data: null,
                },
                req,
                res,
            );
        }

        const accessToken: string = generateAccessToken(req.user);
        // Respond with the access token and refresh token
        //update the access token in the database
        // const ua: string = req.headers["user-agent"] || "Unkown";
        const newToken = {
            accessToken: accessToken,
            refreshToken: refreshToken,
            expiresIn: validToken.expiresIn, // Adjust the expiration time as needed
            lastUsed: now,
            instanceName: validToken.instanceName,
            tokenid: randomUUID(),
        };

        const newTokens = tokens.map((token) => {
            if (token.refreshToken === refreshToken) {
                return newToken;
            }
            return token;
        });

        await dbQuery.refreshToken.update({
            where: { id: refreshTokenColl.id },
            data: { token: newTokens },
        });

        res.cookie('accessToken', accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'live',
            sameSite: 'strict',
            maxAge: 4 * 60 * 60 * 1000,
        });

        responseHandler(
            {
                status: 200,
                success: true,
                message: TOKEN_REFRESH,
                data: { accessToken, refreshToken },
            },
            req,
            res,
        );
    } catch (error) {
        console.error(error);
        let err: CustomError;
        if (error instanceof PrismaClientKnownRequestError) {
            err = {
                name: 'CustomError',
                message: error.message,
                statusCode: 400,
                reason: DB_ERROR,
            };
        } else {
            err = {
                name: 'CustomError',
                message: 'An internal server error occurred',
                statusCode: 500,
                reason: SERVER_ERROR,
            };
        }
        next(err);
    }
};

/**
 * User Function
 *
 * @returns {string} - 200 User Found
 * @returns {string} - 404 User Not Found
 * @returns {string} - 400 Database Error
 * @returns {string} - 500 Internal Server Error
 *
 */
export const getUser = async (req: customRequest, res: Response, next: NextFunction) => {
    try {
        const user = await dbQuery.user.findUnique({
            where: { id: req.user.id },
            select: {
                id: true,
                email: true,
                username: true,
                name: true,
                role: true,
                createdAt: true,
                updatedAt: true,
            },
        });
        if (!user) {
            return responseHandler(
                {
                    status: 404,
                    success: false,
                    message: USER_NOT_FOUND,
                    data: null,
                },
                req,
                res,
            );
        }
        responseHandler(
            {
                status: 200,
                success: true,
                message: USER_FOUND,
                data: user,
            },
            req,
            res,
        );
    } catch (error) {
        console.error(error);
        let err: CustomError;
        if (error instanceof PrismaClientKnownRequestError) {
            err = {
                name: 'CustomError',
                message: error.message,
                statusCode: 400,
                reason: DB_ERROR,
            };
        } else {
            err = {
                name: 'CustomError',
                message: 'An internal server error occurred',
                statusCode: 500,
                reason: SERVER_ERROR,
            };
        }
        next(err);
    }
};

export const resetPasswordLink = async (req: Request, res: Response, next: NextFunction) => {
    const type = 'PASS_RESET';
    try {
        const { email, username } = req.body.recognition;
        const user = await dbQuery.user.findFirst({
            where: {
                OR: [{ email }, { username }],
            },
        });

        if (!user) {
            return responseHandler(
                {
                    status: 404,
                    success: false,
                    message: USER_NOT_FOUND,
                    data: null,
                },
                req,
                res,
            );
        }

        if (user.deleted) {
            return responseHandler(
                {
                    status: 402,
                    success: false,
                    message: USER_IS_DELETED,
                    data: null,
                },
                req,
                res,
            );
        }

        if (user.disabled) {
            return responseHandler(
                {
                    status: 405,
                    success: false,
                    message: USER_IS_DISABLED,
                    data: null,
                },
                req,
                res,
            );
        }

        // Send the password reset link to the user's email
        const resetToken = generateResetPasswordToken(user);
        //save the token in the database
        const auth = await dbQuery.auth.findFirst({
            where: {
                userId: user.id,
                type,
            },
        });
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

        if (auth) {
            await dbQuery.auth.update({
                where: { id: auth.id },
                data: {
                    token: resetToken,
                    expiresAt: expiresAt,
                },
            });
        } else {
            await dbQuery.auth.create({
                data: {
                    userId: user.id,
                    type,
                    token: resetToken,
                    expiresAt: expiresAt,
                },
            });
        }
        responseHandler(
            {
                status: 200,
                success: true,
                message: PASSWORD_RESET_LINK_SENT,
                data: null,
            },
            req,
            res,
        );

        sendPasswordResetMail(user.email, user.name.first, `${config.FRONTEND_URL}/reset/${resetToken}`, expiresAt.toLocaleString()).catch((error) =>
            console.error(error),
        );
    } catch (error) {
        console.error(error);
        let err: CustomError;
        if (error instanceof PrismaClientKnownRequestError) {
            err = {
                name: 'CustomError',
                message: error.message,
                statusCode: 400,
                reason: DB_ERROR,
            };
        } else {
            err = {
                name: 'CustomError',
                message: 'An internal server error occurred',
                statusCode: 500,
                reason: SERVER_ERROR,
            };
        }
        next(err);
    }
};

/**
 * Reset Password Function
 * @param {string} token
 * @param {string} password
 * @returns {string} - 404 Token not found
 * @returns {string} - 403Token expired
 * @returns {string} - 200 Password reset successful
 * @returns {string} - 400 Database Error
 * @returns {string} - 500 Internal Server Error
 * @returns {string} - 401 User not found
 * @returns {string} - 402 User is deleted
 * @returns {string} - 405 User is disabled
 *
 */

export const isActiveResetLink = async (req: Request, res: Response, next: NextFunction) => {
    const type = 'PASS_RESET';
    try {
        const { token } = req.params;
        const auth = await dbQuery.auth.findFirst({
            where: {
                token,
                type,
            },
        });

        if (!auth) {
            return responseHandler(
                {
                    status: 404,
                    success: false,
                    message: NO_TOKEN_FOUND,
                    data: null,
                },
                req,
                res,
            );
        }

        const expiresAt = new Date(auth.expiresAt);
        const now = new Date();
        if (expiresAt < now) {
            return responseHandler(
                {
                    status: 403,
                    success: false,
                    message: TOKEN_EXPIRED,
                    data: {
                        isActive: false,
                    },
                },
                req,
                res,
            );
        }

        const user = await dbQuery.user.findUnique({
            where: {
                id: auth.userId,
            },
        });

        if (!user) {
            return responseHandler(
                {
                    status: 401,
                    success: false,
                    message: USER_NOT_FOUND,
                    data: null,
                },
                req,
                res,
            );
        }

        if (user.deleted) {
            return responseHandler(
                {
                    status: 402,
                    success: false,
                    message: USER_IS_DELETED,
                    data: null,
                },
                req,
                res,
            );
        }

        if (user.disabled) {
            return responseHandler(
                {
                    status: 405,
                    success: false,
                    message: USER_IS_DISABLED,
                    data: null,
                },
                req,
                res,
            );
        }

        responseHandler(
            {
                status: 200,
                success: true,
                message: 'Token is active',
                data: {
                    isActive: true,
                },
            },
            req,
            res,
        );
    } catch (error) {
        console.error(error);
        let err: CustomError;
        if (error instanceof PrismaClientKnownRequestError) {
            err = {
                name: 'CustomError',
                message: error.message,
                statusCode: 400,
                reason: DB_ERROR,
            };
        } else {
            err = {
                name: 'CustomError',
                message: 'An internal server error occurred',
                statusCode: 500,
                reason: SERVER_ERROR,
            };
        }
        next(err);
    }
};

export const resetPassword = async (req: Request, res: Response, next: NextFunction) => {
    const type = 'PASS_RESET';
    try {
        const { token } = req.params;
        const { password, revokeSessions } = req.body;

        if (!token || !password) {
            return responseHandler(
                {
                    status: 404,
                    success: false,
                    message: NO_TOKEN_PASSWORD_RESET,
                    data: null,
                },
                req,
                res,
            );
        }

        const auth = await dbQuery.auth.findFirst({
            where: {
                token,
                type,
            },
        });

        if (!auth) {
            return responseHandler(
                {
                    status: 404,
                    success: false,
                    message: INVALID_TOKEN,
                    data: null,
                },
                req,
                res,
            );
        }

        const expiresAt = new Date(auth.expiresAt);
        const now = new Date();
        if (expiresAt < now) {
            return responseHandler(
                {
                    status: 403,
                    success: false,
                    message: TOKEN_EXPIRED,
                    data: null,
                },
                req,
                res,
            );
        }

        const user = await dbQuery.user.findUnique({
            where: {
                id: auth.userId,
            },
        });

        if (!user) {
            return responseHandler(
                {
                    status: 401,
                    success: false,
                    message: USER_NOT_FOUND,
                    data: null,
                },
                req,
                res,
            );
        }

        if (user.deleted) {
            return responseHandler(
                {
                    status: 402,
                    success: false,
                    message: USER_IS_DELETED,
                    data: null,
                },
                req,
                res,
            );
        }

        if (user.disabled) {
            return responseHandler(
                {
                    status: 405,
                    success: false,
                    message: USER_IS_DISABLED,
                    data: null,
                },
                req,
                res,
            );
        }

        await dbQuery.$transaction(async (transaction) => {
            // Update the user's password
            await transaction.user.update({
                where: {
                    id: user.id,
                },
                data: {
                    password: hashPassword(password),
                },
            });

            // Delete the auth token
            await transaction.auth.delete({
                where: {
                    id: auth.id,
                    type,
                },
            });

            // Revoke all the user's sessions
            if (revokeSessions) {
                await transaction.refreshToken.deleteMany({
                    where: {
                        userId: user.id,
                    },
                });
            }
        });

        responseHandler(
            {
                status: 200,
                success: true,
                message: PASSWORD_RESET_SUCCESS,
                data: null,
            },
            req,
            res,
        );
    } catch (error) {
        console.error(error);
        let err: CustomError;
        if (error instanceof PrismaClientKnownRequestError) {
            err = {
                name: 'CustomError',
                message: error.message,
                statusCode: 400,
                reason: DB_ERROR,
            };
        } else {
            err = {
                name: 'CustomError',
                message: 'An internal server error occurred',
                statusCode: 500,
                reason: SERVER_ERROR,
            };
        }
        next(err);
    }
};
