import argon2 from 'argon2';

export const hashPassword = async (password: string): Promise<string> => {
  return await argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 65536, // 64 MB
    timeCost: 3,
    parallelism: 4,
  });
};

export const verifyPassword = async (hash: string, password: string): Promise<boolean> => {
  try {
    return await argon2.verify(hash, password);
  } catch (error) {
    console.error('Password verification error:', error);
    return false;
  }
};

export const hashPin = async (pin: string): Promise<string> => {
  return await argon2.hash(pin, {
    type: argon2.argon2id,
    memoryCost: 4096, // 4 MB for PIN
    timeCost: 3,
    parallelism: 1,
  });
};

export const verifyPin = async (hash: string, pin: string): Promise<boolean> => {
  try {
    return await argon2.verify(hash, pin);
  } catch (error) {
    return false;
  }
};
