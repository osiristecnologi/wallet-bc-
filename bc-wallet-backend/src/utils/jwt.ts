import jwt, { SignOptions, Secret } from 'jsonwebtoken';
import { env } from '../config/env';
import { v4 as uuidv4 } from 'uuid';

export interface JWTPayload {
  userId: string;
  email: string;
  type: 'access' | 'refresh';
  jti: string;
}

export const generateAccessToken = (userId: string, email: string): string => {
  const payload: JWTPayload = {
    userId,
    email,
    type: 'access',
    jti: uuidv4(),
  };

  // CORREÇÃO: Cast para Secret e SignOptions['expiresIn']
  return jwt.sign(payload, env.JWT_SECRET as Secret, {
    expiresIn: env.JWT_EXPIRES_IN as SignOptions['expiresIn'],
  });
};

export const generateRefreshToken = (userId: string, email: string): string => {
  const payload: JWTPayload = {
    userId,
    email,
    type: 'refresh',
    jti: uuidv4(),
  };

  // CORREÇÃO: Cast para Secret e SignOptions['expiresIn']
  return jwt.sign(payload, env.JWT_REFRESH_SECRET as Secret, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN as SignOptions['expiresIn'],
  });
};

export const verifyToken = (token: string, secret: string): JWTPayload => {
  try {
    // CORREÇÃO: Cast para Secret
    const decoded = jwt.verify(token, secret as Secret) as JWTPayload;
    return decoded;
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
};

export const verifyAccessToken = (token: string): JWTPayload => {
  return verifyToken(token, env.JWT_SECRET);
};

export const verifyRefreshToken = (token: string): JWTPayload => {
  return verifyToken(token, env.JWT_REFRESH_SECRET);
};

export const hashToken = (token: string): string => {
  const crypto = require('crypto');
  return crypto.createHash('sha256').update(token).digest('hex');
};
