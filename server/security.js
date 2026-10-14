import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import {
  closeSync,
  constants,
  fsyncSync,
  mkdirSync,
  openSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

function secretBytes(value) {
  if (Buffer.isBuffer(value) || value instanceof Uint8Array)
    return Buffer.from(value);
  if (typeof value !== "string") throw Error("Thiếu khóa HMAC vật phẩm");
  const trimmed = value.trim();
  if (/^[a-fA-F0-9]{64,}$/.test(trimmed) && trimmed.length % 2 === 0)
    return Buffer.from(trimmed, "hex");
  if (trimmed.startsWith("base64:"))
    return Buffer.from(trimmed.slice(7), "base64");
  return Buffer.from(trimmed, "utf8");
}

function persistedSecret(keyPath) {
  const path = keyPath instanceof URL ? fileURLToPath(keyPath) : keyPath;
  mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
  let descriptor;
  try {
    descriptor = openSync(
      path,
      constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL,
      0o600,
    );
    const key = randomBytes(32);
    writeFileSync(descriptor, key);
    fsyncSync(descriptor);
    return key;
  } catch (error) {
    if (error.code !== "EEXIST") throw error;
    const readDescriptor = openSync(
      path,
      constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0),
    );
    try {
      return readFileSync(readDescriptor);
    } finally {
      closeSync(readDescriptor);
    }
  } finally {
    if (descriptor !== undefined) closeSync(descriptor);
  }
}

function canonicalItem(accountId, item) {
  if (typeof accountId !== "string" || !accountId || accountId.length > 200)
    throw Error("Chủ sở hữu vật phẩm không hợp lệ");
  if (
    !item ||
    typeof item !== "object" ||
    typeof item.uid !== "string" ||
    !item.uid ||
    item.uid.length > 200
  )
    throw Error("UUID vật phẩm không hợp lệ");
  if (
    !["ring", "bone", "weapon", "boss", "fragment", "material"].includes(
      item.kind,
    ) ||
    !Number.isInteger(item.id) ||
    item.id < 1
  )
    throw Error("Loại vật phẩm không hợp lệ");
  for (const field of ["tier", "w", "value", "count"])
    if (
      item[field] !== undefined &&
      (!Number.isFinite(item[field]) || item[field] < 0)
    )
      throw Error("Dữ liệu định lượng vật phẩm không hợp lệ");
  if (
    item.tier !== undefined &&
    (!Number.isInteger(item.tier) || item.tier < 1)
  )
    throw Error("Bậc vật phẩm không hợp lệ");
  if (
    item.count !== undefined &&
    (!Number.isInteger(item.count) || item.count < 1)
  )
    throw Error("Số lượng vật phẩm không hợp lệ");
  if (item.code !== undefined && typeof item.code !== "string")
    throw Error("Mã vật phẩm không hợp lệ");
  if (item.brought !== undefined && typeof item.brought !== "boolean")
    throw Error("Nguồn gốc vật phẩm không hợp lệ");
  // Fixed order and explicit null preserve absent tier; no unofficial stats added.
  return JSON.stringify([
    "hg-item-v1",
    accountId,
    item.uid,
    item.kind,
    item.id,
    item.tier ?? null,
    item.code ?? null,
    item.w ?? null,
    item.value ?? null,
    item.brought ?? false,
    item.count ?? 1,
  ]);
}

/** Server-only signer. Never import this module in a client entry point or send
 * the key to a WebView. Item mutation requires verification then re-signing in
 * the existing locked SQL transaction; HMAC alone does not prevent replay. */
export function createItemSigner({
  key = process.env.HG_ITEM_HMAC_KEY,
  keyPath = new URL("../.local/item-signing.key", import.meta.url),
} = {}) {
  const secret =
    key === undefined ? persistedSecret(keyPath) : secretBytes(key);
  if (secret.length < 32) throw Error("Khóa HMAC phải có ít nhất 32 byte");
  function digest(accountId, item) {
    return createHmac("sha256", secret)
      .update(canonicalItem(accountId, item))
      .digest();
  }
  function signItem(accountId, item) {
    return {
      ...item,
      signature: `v1.${digest(accountId, item).toString("hex")}`,
    };
  }
  function verifyItem(accountId, item) {
    try {
      if (
        typeof item?.signature !== "string" ||
        !/^v1\.[a-f0-9]{64}$/.test(item.signature)
      )
        return false;
      const supplied = Buffer.from(item.signature.slice(3), "hex"),
        expected = digest(accountId, item);
      return (
        supplied.length === expected.length &&
        timingSafeEqual(supplied, expected)
      );
    } catch {
      return false;
    }
  }
  function assertItem(accountId, item) {
    if (!verifyItem(accountId, item))
      throw Error("Chữ ký hoặc chủ sở hữu vật phẩm không hợp lệ");
    return item;
  }
  return Object.freeze({
    signItem,
    verifyItem,
    assertItem,
    algorithm: "HMAC-SHA256/v1",
  });
}
