import { createClient, RedisClientType } from 'redis';
import { env } from './env';

let redisClient: RedisClientType;

export const initializeRedis = async (): Promise<RedisClientType> => {
  redisClient = createClient({
    url: `redis://${env.REDIS_HOST}:${env.REDIS_PORT}`,
    password: env.REDIS_PASSWORD || undefined,
  });

  redisClient.on('error', (err) => console.error('Redis Client Error', err));
  redisClient.on('connect', () => console.log('Redis Connected'));

  await redisClient.connect();
  return redisClient;
};

export const getRedisClient = (): RedisClientType => {
  if (!redisClient) {
    throw new Error('Redis not initialized');
  }
  return redisClient;
};

export default redisClient;
