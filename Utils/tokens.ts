import jwt from 'jsonwebtoken';
import { resUser } from '../Types';
import Config from '../Config';
import { randomUUID } from 'crypto';
import crypto from 'crypto';

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
  // Serialize user data and add a timestamp
  const userData = JSON.stringify({
    ...user,
    exp: Date.now() + 24 * 60 * 60 * 1000, // Set expiry time to 24 hours
  });

  // Generate a unique identifier
  const uniqueId = randomUUID();

  // Create HMAC-SHA256 hash
  const hmac = crypto.createHmac('sha256', Config.HASH_SECRET);
  hmac.update(uniqueId + userData);

  // Final token combining uniqueId and HMAC hash
  const token = `${uniqueId}.${hmac.digest('hex')}`;

  return token;
}
