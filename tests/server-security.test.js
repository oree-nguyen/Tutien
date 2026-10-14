import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { Store } from "../server/store.js";
import { configuration } from "../server/config.js";

let store;
const accounts = [];
const loadout = {
  hero: 0,
  branch: 0,
  rings: [1, 3],
  bones: [],
  supports: [],
  skin: 0,
  costume: 0,
  mode: "solo",
  ranked: false,
  brought: 100,
};
async function account() {
  const id = await store.register(
    `sec_${randomUUID().replaceAll("-", "").slice(0, 14)}`,
    "unique-security-test-password",
  );
  accounts.push(id);
  return id;
}
async function rawProfile(id) {
  return (
    await store.pool.query("SELECT profile FROM accounts WHERE id=$1", [id])
  ).rows[0].profile;
}
async function writeProfile(id, profile) {
  await store.pool.query("UPDATE accounts SET profile=$1 WHERE id=$2", [
    profile,
    id,
  ]);
}
test.before(async () => {
  store = new Store(await configuration());
  await store.open();
});
test.after(async () => {
  if (!store) return;
  for (const id of accounts) {
    for (const table of ["results", "ledger", "inventory", "sessions"])
      await store.pool.query(`DELETE FROM ${table} WHERE account_id=$1`, [id]);
    await store.pool.query("DELETE FROM accounts WHERE id=$1", [id]);
  }
  await store.close();
});

test("new account persists signed inventory atomically and profile returns owner-bound signatures", async () => {
  const id = await account(),
    profile = (await store.profile(id)).profile;
  assert.equal(profile.itemSignatureVersion, 1);
  assert.equal(profile.stash.length, 19);
  assert.ok(
    profile.stash.every((item) => store.itemSigner.verifyItem(id, item)),
  );
  const rows = await store.pool.query(
    "SELECT item FROM inventory WHERE account_id=$1",
    [id],
  );
  assert.equal(rows.rowCount, 19);
  assert.ok(
    rows.rows.every(({ item }) => store.itemSigner.verifyItem(id, item)),
  );
});

test("unsigned legacy database rows migrate once under lock and stripped v1 signatures are rejected", async () => {
  const id = await account(),
    legacy = await rawProfile(id);
  delete legacy.itemSignatureVersion;
  for (const item of legacy.stash) delete item.signature;
  await writeProfile(id, legacy);
  await store.pool.query("DELETE FROM inventory WHERE account_id=$1", [id]);
  const migrated = (await store.profile(id)).profile;
  assert.equal(migrated.itemSignatureVersion, 1);
  assert.ok(
    migrated.stash.every((item) => store.itemSigner.verifyItem(id, item)),
  );
  const stripped = structuredClone(migrated);
  delete stripped.stash[0].signature;
  await writeProfile(id, stripped);
  let changed = false;
  await assert.rejects(
    () =>
      store.transact(id, randomUUID(), "must-reject-stripped", () => {
        changed = true;
      }),
    /Chữ ký/,
  );
  assert.equal(changed, false);
  await writeProfile(id, migrated);
});

test("invalid stored signature prevents callback, ledger insert, wallet mutation and inventory changes", async () => {
  const id = await account(),
    valid = await rawProfile(id),
    tampered = structuredClone(valid),
    key = randomUUID();
  tampered.stash[0].value += 10000;
  await writeProfile(id, tampered);
  let called = false;
  await assert.rejects(
    () =>
      store.transact(id, key, "reject-corruption", (profile) => {
        called = true;
        profile.tb += 123;
      }),
    /Chữ ký/,
  );
  assert.equal(called, false);
  assert.equal((await rawProfile(id)).tb, valid.tb);
  const ledger = await store.pool.query(
    "SELECT count(*)::int AS n FROM ledger WHERE account_id=$1 AND idempotency_key=$2",
    [id, key],
  );
  assert.equal(ledger.rows[0].n, 0);
  const inventory = await store.pool.query(
    "SELECT item FROM inventory WHERE item_id=$1",
    [valid.stash[0].uid],
  );
  assert.equal(inventory.rows[0].item.value, valid.stash[0].value);
  await writeProfile(id, valid);
});

test("a supplied bad signature never migrates even in a legacy database row", async () => {
  const id = await account(),
    valid = await rawProfile(id),
    legacy = structuredClone(valid);
  delete legacy.itemSignatureVersion;
  legacy.stash[0].signature = `v1.${"00".repeat(32)}`;
  await writeProfile(id, legacy);
  await assert.rejects(() => store.profile(id), /Chữ ký/);
  assert.equal(
    (await rawProfile(id)).stash[0].signature,
    legacy.stash[0].signature,
  );
  await writeProfile(id, valid);
});

test("entry re-signs brought gear; authoritative PvP transfer signs recipient once despite replay", async () => {
  const owner = await account(),
    recipient = await account(),
    entry = await store.enter(owner, loadout, randomUUID());
  assert.equal(entry.gear.length, 2);
  assert.ok(
    entry.gear.every(
      (item) => item.brought && store.itemSigner.verifyItem(owner, item),
    ),
  );
  const item = entry.gear[0],
    before = (await store.profile(recipient)).profile,
    key = randomUUID(),
    result = {
      items: [item],
      tb: 123,
      value: item.value,
      kills: 1,
      outcome: "send",
      hero: 0,
    };
  await Promise.all(
    Array.from({ length: 6 }, () => store.settle(recipient, key, result)),
  );
  const next = (await store.profile(recipient)).profile,
    transferred = next.stash.filter((candidate) => candidate.uid === item.uid);
  assert.equal(next.tb, before.tb + 123);
  assert.equal(transferred.length, 1);
  assert.equal(store.itemSigner.verifyItem(recipient, transferred[0]), true);
  assert.equal(store.itemSigner.verifyItem(owner, transferred[0]), false);
  const inventory = await store.pool.query(
    "SELECT account_id,item FROM inventory WHERE item_id=$1",
    [item.uid],
  );
  assert.equal(inventory.rowCount, 1);
  assert.equal(inventory.rows[0].account_id, recipient);
  const ledger = await store.pool.query(
    "SELECT count(*)::int AS n FROM ledger WHERE account_id=$1 AND idempotency_key=$2",
    [recipient, key],
  );
  assert.equal(ledger.rows[0].n, 1);
});

test("global UUID uniqueness rolls back duplicate cross-account settlement and balances", async () => {
  const owner = await account(),
    recipient = await account(),
    item = (await store.profile(owner)).profile.stash[0],
    before = (await store.profile(recipient)).profile.tb,
    key = randomUUID();
  await assert.rejects(
    () =>
      store.settle(recipient, key, {
        items: [item],
        tb: 500,
        value: item.value,
        kills: 0,
        outcome: "send",
        hero: 0,
      }),
    /duplicate key/,
  );
  assert.equal((await store.profile(recipient)).profile.tb, before);
  assert.equal(
    (
      await store.pool.query(
        "SELECT account_id FROM inventory WHERE item_id=$1",
        [item.uid],
      )
    ).rows[0].account_id,
    owner,
  );
  assert.equal(
    (
      await store.pool.query(
        "SELECT count(*)::int AS n FROM ledger WHERE account_id=$1 AND idempotency_key=$2",
        [recipient, key],
      )
    ).rows[0].n,
    0,
  );
});
