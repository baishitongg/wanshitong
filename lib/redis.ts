import { createClient, type RedisClientType } from "redis";

type GlobalRedis = typeof globalThis & {
  redisClient?: RedisClientType;
  redisConnectPromise?: Promise<RedisClientType | null>;
};

const globalForRedis = globalThis as GlobalRedis;
const redisUrl = process.env.REDIS_URL;

export async function getRedisClient() {
  if (!redisUrl) return null;

  if (!globalForRedis.redisClient) {
    const client = createClient({ url: redisUrl });

    client.on("error", (error) => {
      console.error("[redis] client error:", error);
    });

    globalForRedis.redisClient = client;
  }

  if (!globalForRedis.redisClient.isOpen) {
    globalForRedis.redisConnectPromise ??= globalForRedis.redisClient
      .connect()
      .then(() => globalForRedis.redisClient ?? null)
      .catch((error) => {
        console.error("[redis] connection failed:", error);
        globalForRedis.redisConnectPromise = undefined;
        return null;
      });

    return globalForRedis.redisConnectPromise;
  }

  return globalForRedis.redisClient;
}

export async function getJsonCache<T>(key: string): Promise<T | undefined> {
  try {
    const redis = await getRedisClient();
    if (!redis) return undefined;

    const value = await redis.get(key);
    if (value === null) return undefined;

    return JSON.parse(value) as T;
  } catch (error) {
    console.error(`[redis] cache read failed for ${key}:`, error);
    return undefined;
  }
}

export async function setJsonCache(
  key: string,
  value: unknown,
  ttlSeconds: number,
) {
  try {
    const redis = await getRedisClient();
    if (!redis) return;

    await redis.set(key, JSON.stringify(value), { EX: ttlSeconds });
  } catch (error) {
    console.error(`[redis] cache write failed for ${key}:`, error);
  }
}

export async function deleteRedisKeys(keys: string[]) {
  try {
    const redis = await getRedisClient();
    const uniqueKeys = [...new Set(keys)];

    if (!redis || uniqueKeys.length === 0) return;

    await redis.del(uniqueKeys);
  } catch (error) {
    console.error("[redis] cache delete failed:", error);
  }
}
