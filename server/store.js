import pg from "pg";
import { createClient } from "redis";
import { readFile } from "node:fs/promises";
import {
  randomBytes,
  randomUUID,
  scrypt,
  timingSafeEqual,
  createHash,
} from "node:crypto";
import { newProfile, loot, validateLoadout } from "../src/rules.js";
import { RINGS, BONES, SUPPORTS } from "../src/data.js";
import { promisify } from "node:util";
const hashPassword = promisify(scrypt);
const digest = (v) => createHash("sha256").update(v).digest("hex");
export class Store {
  constructor(config) {
    if (!config.databaseUrl || !config.redisUrl)
      throw Error("Database/Redis chưa được cấu hình; chạy npm run services");
    this.pool = new pg.Pool({ connectionString: config.databaseUrl, max: 15 });
    this.redis = createClient({ url: config.redisUrl });
    this.redis.on("error", () => {});
  }
  async open() {
    await this.pool.query(
      await readFile(new URL("./schema.sql", import.meta.url), "utf8"),
    );
    await this.redis.connect();
  }
  async close() {
    await this.pool.end();
    await this.redis.quit();
  }
  async register(username, password) {
    if (
      !/^[a-zA-Z0-9_]{3,24}$/.test(username) ||
      typeof password !== "string" ||
      password.length < 10 ||
      password.length > 128
    )
      throw Error("Tên3–24 ký tự; mật khẩu10–128 ký tự");
    const id = randomUUID(),
      salt = randomBytes(16).toString("hex"),
      hash = (await hashPassword(password, salt, 64)).toString("hex"),
      profile = newProfile();
    profile.stash = [
      ...RINGS.map((r) => loot("ring", r.id)),
      ...BONES.map((b) => loot("bone", b.id)),
    ];
    await this.pool.query(
      "INSERT INTO accounts(id,username,password_hash,profile) VALUES($1,$2,$3,$4)",
      [id, username, `${salt}:${hash}`, profile],
    );
    return id;
  }
  async login(username, password) {
    const {
      rows: [account],
    } = await this.pool.query(
      "SELECT id,password_hash FROM accounts WHERE username=$1",
      [username],
    );
    const salt = account?.password_hash.split(":")[0] ?? "invalid-salt",
      actual = await hashPassword(String(password), salt, 64),
      expected = Buffer.from(
        account?.password_hash.split(":")[1] ?? "00".repeat(64),
        "hex",
      );
    if (!account || !timingSafeEqual(actual, expected))
      throw Error("Tên hoặc mật khẩu không đúng");
    const token = randomBytes(32).toString("hex");
    await this.pool.query(
      "INSERT INTO sessions VALUES($1,$2,now()+interval '7 days')",
      [digest(token), account.id],
    );
    return { token, id: account.id };
  }
  async authenticate(token) {
    if (!token) return null;
    return (
      (
        await this.pool.query(
          "SELECT account_id FROM sessions WHERE token_hash=$1 AND expires_at>now()",
          [digest(token)],
        )
      ).rows[0]?.account_id ?? null
    );
  }
  async logout(token) {
    if (token)
      await this.pool.query("DELETE FROM sessions WHERE token_hash=$1", [
        digest(token),
      ]);
  }
  async profile(id) {
    return (
      await this.pool.query(
        "SELECT username,profile,revision FROM accounts WHERE id=$1",
        [id],
      )
    ).rows[0];
  }
  async transact(id, key, operation, change) {
    if (typeof key !== "string" || key.length < 8 || key.length > 120)
      throw Error("Cần idempotency key hợp lệ");
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const {
        rows: [account],
      } = await client.query(
        "SELECT profile FROM accounts WHERE id=$1 FOR UPDATE",
        [id],
      );
      if (!account) throw Error("Không có tài khoản");
      const {
        rows: [prior],
      } = await client.query(
        "SELECT result FROM ledger WHERE account_id=$1 AND idempotency_key=$2",
        [id, key],
      );
      if (prior) {
        await client.query("COMMIT");
        return prior.result;
      }
      const before = account.profile,
        next = structuredClone(before),
        result = await change(next, client);
      if (next.tb < 0 || next.nb < 0) throw Error("Số dư không đủ");
      const ids = next.stash.map((i) => i.uid);
      if (new Set(ids).size !== ids.length)
        throw Error("Phát hiện item trùng UUID");
      await client.query("DELETE FROM inventory WHERE account_id=$1", [id]);
      for (const item of next.stash)
        await client.query("INSERT INTO inventory VALUES($1,$2,$3)", [
          item.uid,
          id,
          item,
        ]);
      await client.query(
        "UPDATE accounts SET profile=$1,revision=revision+1 WHERE id=$2",
        [next, id],
      );
      await client.query(
        "INSERT INTO ledger(account_id,idempotency_key,operation,result,before_profile,after_profile) VALUES($1,$2,$3,$4,$5,$6)",
        [id, key, operation, result ?? {}, before, next],
      );
      await client.query("COMMIT");
      return result ?? {};
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
  }
  async enter(id, loadout, key, roomId = null) {
    validateLoadout(loadout);
    return this.transact(
      id,
      roomId ? "entry:" + roomId + ":" + digest(String(key)).slice(0, 48) : key,
      "match-entry",
      (profile) => {
        if (roomId && profile.activeMatch && profile.activeMatch !== roomId)
          throw Error("Tài khoản đã có trận đang diễn ra");
        const cost = loadout.supports.reduce(
          (n, s) =>
            n +
            (s.currency === "tb" ? 0 : SUPPORTS[s.id - 1].prices[s.tier - 1]),
          0,
        );
        const tbCost = loadout.supports.reduce(
          (n, s) => n + (s.currency === "tb" ? SUPPORTS[s.id - 1].tb : 0),
          0,
        );
        if (profile.tb < loadout.brought + tbCost || profile.nb < cost)
          throw Error("Không đủ tiền vào trận");
        const gear = [];
        for (const [kind, ids] of [
          ["ring", loadout.rings],
          ["bone", loadout.bones],
        ])
          for (const itemId of ids)
            if (itemId) {
              const item = profile.stash.find(
                (i) => i.kind === kind && i.id === itemId,
              );
              if (!item) throw Error("Trang bị không thuộc tài khoản");
              profile.stash = profile.stash.filter((i) => i !== item);
              gear.push({ ...item, brought: true });
            }
        if (
          loadout.skin &&
          !profile.owned.includes(`skin-${loadout.hero}-${loadout.skin}`)
        )
          throw Error("Skin chưa sở hữu");
        if (
          loadout.costume &&
          !profile.owned.includes(`costume-${loadout.hero}-${loadout.costume}`)
        )
          throw Error("Trang phục chưa sở hữu");
        profile.tb -= loadout.brought + tbCost;
        profile.nb -= cost;
        if (roomId) profile.activeMatch = roomId;
        return { gear, loadout, roomId };
      },
    );
  }
  async settle(id, key, result) {
    return this.transact(
      id,
      key,
      "match-settlement",
      async (profile, client) => {
        profile.tb += result.tb;
        profile.stash.push(...result.items);
        if (result.outcome !== "send") {
          profile.matches++;
          profile.activeMatch = null;
        }
        profile.record.unshift({
          title: result.outcome,
          value: result.value,
          kills: result.kills,
          time: Date.now(),
        });
        profile.record = profile.record.slice(0, 10);
        await client.query(
          "INSERT INTO results(id,account_id,extracted_value,kills,outcome,created_at,hero) VALUES($1,$2,$3,$4,$5,now(),$6)",
          [
            randomUUID(),
            id,
            result.value,
            result.kills,
            result.outcome,
            result.hero ?? 0,
          ],
        );
        return { committed: true };
      },
    );
  }
  async leaders() {
    return (
      await this.pool.query(
        "SELECT username,hero,value FROM(SELECT DISTINCT ON(account_id) username,hero,extracted_value::float AS value FROM results JOIN accounts ON results.account_id=accounts.id WHERE results.created_at>=date_trunc('week',now()) ORDER BY account_id,extracted_value DESC) best ORDER BY value DESC LIMIT 3",
      )
    ).rows;
  }
}
