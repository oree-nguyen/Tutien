import { execFileSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
await mkdir(".local/backups", { recursive: true });
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
  "PostgreSQL and Redis development backups saved under ignored .local/backups (contents not logged).",
);
