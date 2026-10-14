import { execFileSync } from "node:child_process";
import { mkdir, writeFile, readFile, chmod } from "node:fs/promises";
await mkdir(".local/backups", { recursive: true });
let signingKey;
if (!process.env.HG_ITEM_HMAC_KEY) {
  try {
    signingKey = await readFile(".local/item-signing.key");
    if (signingKey.length < 32)
      throw Error("Khóa ký vật phẩm cục bộ không hợp lệ");
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}
const sql = execFileSync(
  "docker",
  [
    "exec",
    "hongioi-postgres",
    "pg_dump",
    "-U",
    "hongioi",
    "-d",
    "hongioi",
    "--no-owner",
    "--no-privileges",
  ],
  { maxBuffer: 64 * 1024 * 1024 },
);
if (
  !process.env.HG_ITEM_HMAC_KEY &&
  !signingKey &&
  sql.includes(Buffer.from("itemSignatureVersion"))
)
  throw Error(
    "Từ chối sao lưu SQL có vật phẩm đã ký nhưng thiếu khóa HMAC cục bộ",
  );
if (signingKey) {
  await writeFile(".local/backups/item-signing.key", signingKey, {
    mode: 0o600,
  });
  await chmod(".local/backups/item-signing.key", 0o600);
}
await writeFile(".local/backups/hongioi.sql", sql, { mode: 0o600 });
execFileSync("docker", ["exec", "hongioi-redis", "redis-cli", "SAVE"], {
  stdio: "pipe",
});
execFileSync(
  "docker",
  ["cp", "hongioi-redis:/data/dump.rdb", ".local/backups/redis.rdb"],
  { stdio: "pipe" },
);
console.log(
  "PostgreSQL/Redis and the local item-signing key, when present, were backed up under ignored .local/backups. Environment-managed HMAC keys remain the deployment's responsibility; no secrets logged.",
);
