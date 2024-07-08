import jwt from "jsonwebtoken";
import { resUser } from "../Types";
import Config from "../Config";

export function generateAccessToken(user: resUser) {
    //i do not want others to decode the token so is it possible to encrypt the token
    return jwt.sign(user, Config.JWT_SECRET, { expiresIn: "4h", algorithm: "HS256" });
}

export function generateRefreshToken(user: resUser) {
    return jwt.sign(user, Config.JWT_REFRESH_TOKEN_SECRET, { expiresIn: "7d", algorithm: "HS256" });
}
