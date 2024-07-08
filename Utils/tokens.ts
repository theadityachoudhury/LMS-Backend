import jwt from 'jsonwebtoken';
import { resUser } from '../Types';
import Config from '../Config';
import { randomUUID } from 'crypto';

export function generateAccessToken(user: resUser) {
  //i do not want others to decode the token so is it possible to encrypt the token
  return jwt.sign(user, Config.JWT_SECRET, {
    expiresIn: '4h',
    algorithm: 'HS256',
  });
}

export function generateRefreshToken(user: resUser) {
  return jwt.sign(user, Config.JWT_REFRESH_TOKEN_SECRET, {
    expiresIn: '7d',
    algorithm: 'HS256',
  });
}

export function generateResetPasswordToken(user: resUser) {
  //generate a token that can be used in a link using the user information but it should not be able to decode the token and add an expiry time without using jwt.sign
  return randomUUID() + Buffer.from(JSON.stringify(user)).toString('base64') + Date.now() + randomUUID();
}
