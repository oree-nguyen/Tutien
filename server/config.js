import { readFile } from "node:fs/promises";
export async function configuration() {
  let local = {};
  try {
    local = JSON.parse(
      await readFile(
        new URL("../.local/services.json", import.meta.url),
        "utf8",
      ),
    );
  } catch (e) {
    if (e.code !== "ENOENT") throw e;
  }
  return {
    restore: process.env.HG_RESTORE_MATCHES !== "0",
    databaseUrl: process.env.DATABASE_URL ?? local.databaseUrl,
    redisUrl: process.env.REDIS_URL ?? local.redisUrl,
    port: Number(process.env.PORT ?? 3001),
    host: process.env.BIND_HOST ?? "127.0.0.1",
    origins: (
      process.env.APP_ORIGINS ??
      "http://localhost:5173,http://127.0.0.1:5173,http://localhost:4173,http://127.0.0.1:4173,https://localhost"
    ).split(","),
  };
}
