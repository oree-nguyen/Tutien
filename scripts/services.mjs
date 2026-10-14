import { readFile, writeFile, mkdir } from "node:fs/promises";
import { randomBytes, timingSafeEqual } from "node:crypto";
import { execFileSync } from "node:child_process";
await mkdir(".local", { recursive: true });
let config;
try {
  config = JSON.parse(await readFile(".local/services.json", "utf8"));
} catch (e) {
  if (e.code !== "ENOENT") throw e;
  config = {
    databaseUrl: `postgresql://hongioi:${randomBytes(24).toString("hex")}@127.0.0.1:54329/hongioi`,
    redisUrl: "redis://127.0.0.1:63799",
  };
  await writeFile(".local/services.json", JSON.stringify(config), {
    mode: 0o600,
  });
}
const url = new URL(config.databaseUrl);
await writeFile(
  ".local/postgres.env",
  `POSTGRES_DB=hongioi\nPOSTGRES_USER=hongioi\nPOSTGRES_PASSWORD=${decodeURIComponent(url.password)}\n`,
  { mode: 0o600 },
);
function docker(args) {
  return execFileSync("docker", args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}
async function restoreSigningKey(sql) {
  // An environment-managed key is restored by the deployment secret store.
  if (process.env.HG_ITEM_HMAC_KEY) return;
  let backup;
  try {
    backup = await readFile(".local/backups/item-signing.key");
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    if (sql.includes(Buffer.from("itemSignatureVersion")))
      throw Error(
        "Bản sao SQL có vật phẩm đã ký nhưng thiếu khóa HMAC; từ chối khôi phục",
      );
    return;
  }
  if (backup.length < 32) throw Error("Khóa ký vật phẩm sao lưu không hợp lệ");
  let active;
  try {
    active = await readFile(".local/item-signing.key");
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  if (active) {
    if (active.length !== backup.length || !timingSafeEqual(active, backup))
      throw Error(
        "Khóa HMAC hiện hành khác khóa bản sao; từ chối thay khóa hoặc khôi phục SQL",
      );
  } else {
    await writeFile(".local/item-signing.key", backup, {
      mode: 0o600,
      flag: "wx",
    });
  }
}
for (const [name, image, args] of [
  [
    "hongioi-postgres",
    "postgres@sha256:b0f9560a2de083e2cc7382e75f808c7381a32852a7ec49117deedb300e552b24",
    [
      "--env-file",
      ".local/postgres.env",
      "-p",
      "127.0.0.1:54329:5432",
      "-v",
      "hongioi-postgres:/var/lib/postgresql/data",
    ],
  ],
  [
    "hongioi-redis",
    "redis@sha256:3811787313eba226a2ef38658c6ccb91cd5e110edc89c37767de373120a0e5a0",
    ["-p", "127.0.0.1:63799:6379", "-v", "hongioi-redis:/data"],
  ],
]) {
  let exists = false;
  try {
    docker(["inspect", name]);
    exists = true;
  } catch {}
  if (exists) docker(["start", name]);
  else docker(["run", "-d", "--name", name, ...args, image]);
  if (!exists && name === "hongioi-postgres") {
    for (let i = 0; i < 80; i++) {
      try {
        docker(["exec", name, "pg_isready", "-U", "hongioi"]);
        break;
      } catch {
        await new Promise((r) => setTimeout(r, 250));
      }
    }
    try {
      const sql = await readFile(".local/backups/hongioi.sql");
      await restoreSigningKey(sql);
      execFileSync(
        "docker",
        [
          "exec",
          "-i",
          name,
          "psql",
          "-U",
          "hongioi",
          "-d",
          "hongioi",
          "-v",
          "ON_ERROR_STOP=1",
        ],
        {
          input: sql,
          stdio: ["pipe", "pipe", "pipe"],
          maxBuffer: 64 * 1024 * 1024,
        },
      );
      console.log("PostgreSQL restored from the retained development backup.");
    } catch (e) {
      if (e.code !== "ENOENT") throw e;
    }
  }
  if (!exists && name === "hongioi-redis") {
    try {
      await readFile(".local/backups/redis.rdb");
      docker(["stop", name]);
      docker(["cp", ".local/backups/redis.rdb", name + ":/data/dump.rdb"]);
      docker(["start", name]);
      console.log("Redis restored from retained development backup.");
    } catch (e) {
      if (e.code !== "ENOENT") throw e;
    }
  }
  console.log(name, "started on loopback");
}
