/* Client checks detect accidental edits and common tampering. A browser owner can
 * replace this module; only the authoritative server can protect online rewards. */
const capturedWallClock = Date.now;
const capturedPerformance = globalThis.performance;
const capturedMonotonicClock = capturedPerformance?.now;
const functionSource = Function.prototype.toString;
const encoder = new TextEncoder();
const decoder = new TextDecoder();
const wallClock = () => capturedWallClock.call(Date);
const monotonicClock = () =>
  capturedMonotonicClock
    ? capturedMonotonicClock.call(capturedPerformance)
    : wallClock();

function randomSalt() {
  const bytes = new Uint32Array(1);
  if (globalThis.crypto?.getRandomValues)
    globalThis.crypto.getRandomValues(bytes);
  else bytes[0] = Math.floor(Math.random() * 0xffffffff);
  return bytes[0] >>> 0;
}

function canonical(value) {
  if (value === null || typeof value === "boolean" || typeof value === "string")
    return JSON.stringify(value);
  if (typeof value === "number" && Number.isFinite(value))
    return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && Object.getPrototypeOf(value) === Object.prototype)
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`)
      .join(",")}}`;
  throw Error("Vault chỉ bảo vệ dữ liệu JSON hữu hạn");
}

function freezeDeep(value) {
  if (value && typeof value === "object") {
    for (const child of Object.values(value)) freezeDeep(child);
    Object.freeze(value);
  }
  return value;
}

function checksum(bytes, salt) {
  let hash = (0x811c9dc5 ^ salt) >>> 0;
  for (const byte of bytes) hash = Math.imul(hash ^ byte, 0x01000193) >>> 0;
  return hash;
}

function seal(value) {
  const salt = randomSalt(),
    plain = encoder.encode(canonical(value)),
    bytes = new Uint8Array(plain.length);
  let state = salt || 0x9e3779b9;
  for (let index = 0; index < plain.length; index++) {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    bytes[index] = plain[index] ^ (state & 255);
  }
  return { salt, bytes, check: checksum(plain, salt) };
}

function unseal(record) {
  const plain = new Uint8Array(record.bytes.length);
  let state = record.salt || 0x9e3779b9;
  for (let index = 0; index < plain.length; index++) {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    plain[index] = record.bytes[index] ^ (state & 255);
  }
  if (checksum(plain, record.salt) !== record.check)
    throw Error("Checksum vùng nhớ không hợp lệ");
  return JSON.parse(decoder.decode(plain));
}

/** A sealed snapshot, not encryption against an attacker controlling JavaScript.
 * Call inspect() BEFORE simulation and capture() only after legitimate changes.
 * Keep this instance private: capture() is intentionally a trusted-write API. */
export function SecureMemoryVault(initial = {}, onAlert = () => {}) {
  const records = new Map(),
    mirrors = new Map(),
    alerts = [];
  let revision = 0,
    detections = 0,
    recoveries = 0;
  function alert(fields, reason) {
    detections++;
    const event = Object.freeze({
      revision,
      fields: Object.freeze([...fields]),
      reason,
      at: wallClock(),
    });
    alerts.push(event);
    if (alerts.length > 32) alerts.shift();
    try {
      onAlert(event);
    } catch {
      // An observer must never interrupt restoration of the protected state.
    }
  }
  function expected(key) {
    try {
      return unseal(records.get(key));
    } catch {
      const restored = unseal(mirrors.get(key));
      records.set(key, seal(restored));
      recoveries++;
      alert([key], "checksum");
      return restored;
    }
  }
  function capture(values) {
    if (!values || Object.getPrototypeOf(values) !== Object.prototype)
      throw Error("Snapshot bảo mật phải là một object");
    // Validate everything before replacing any prior authoritative snapshot.
    const next = Object.entries(values).map(([key, value]) => {
      canonical(value);
      return [key, seal(value), seal(value)];
    });
    records.clear();
    mirrors.clear();
    for (const [key, record, mirror] of next) {
      records.set(key, record);
      mirrors.set(key, mirror);
    }
    revision++;
    return revision;
  }
  function inspect(target, { restore = true } = {}) {
    if (!target || typeof target !== "object")
      throw Error("Không có trạng thái để kiểm tra");
    const fields = [];
    let restored = 0;
    for (const key of records.keys()) {
      const value = expected(key);
      let matches = false;
      try {
        matches = canonical(target[key]) === canonical(value);
      } catch {
        matches = false;
      }
      if (!matches) {
        fields.push(key);
        if (restore) {
          // defineProperty avoids invoking a hostile setter on the target.
          const descriptor = Object.getOwnPropertyDescriptor(target, key);
          if (!descriptor || descriptor.configurable) {
            Object.defineProperty(target, key, {
              value,
              writable: true,
              configurable: true,
              enumerable: true,
            });
            restored++;
          } else if (descriptor.writable) {
            target[key] = value;
            restored++;
          }
        }
      }
    }
    if (fields.length) {
      recoveries += restored;
      alert(fields, "state-mismatch");
    }
    return Object.freeze({
      ok: fields.length === 0,
      detected: fields.length,
      restored,
      fields: Object.freeze(fields),
      revision,
    });
  }
  capture(initial);
  return Object.freeze({
    capture,
    inspect,
    read: (key) => (records.has(key) ? freezeDeep(expected(key)) : undefined),
    snapshot: () =>
      freezeDeep(
        Object.fromEntries([...records.keys()].map((k) => [k, expected(k)])),
      ),
    status: () =>
      Object.freeze({
        revision,
        keys: records.size,
        detections,
        recoveries,
        alerts: Object.freeze([...alerts]),
        protection: "salted-xor-fnv1a-with-independent-sealed-mirror",
        authority: "client-snapshot; online rewards require server validation",
      }),
  });
}

/** Native-code strings are diagnostic signals, never proof of a clean device. */
export function inspectClockIntegrity() {
  const wallChanged = Date.now !== capturedWallClock,
    monotonicChanged = globalThis.performance?.now !== capturedMonotonicClock;
  return Object.freeze({
    wallChanged,
    monotonicChanged,
    wallNative: /\[native code\]/.test(functionSource.call(capturedWallClock)),
    monotonicNative: capturedMonotonicClock
      ? /\[native code\]/.test(functionSource.call(capturedMonotonicClock))
      : false,
    ok: !wallChanged && !monotonicChanged,
  });
}

/** Local movement validation supplements, and never replaces, server authority.
 * Only trusted gameplay may grant dash allowance or authorize a debug teleport. */
export function TimeMovementValidator({
  now = monotonicClock,
  wallNow = wallClock,
  movementSlack = 0.6,
  clockDriftMs = 2000,
  maxFrameSeconds = 0.25,
} = {}) {
  let previous = null,
    anchor = null,
    clockStrikes = 0,
    logicalTime = 0,
    violations = 0,
    allowance = 0,
    allowanceUntil = 0,
    lastResult = null;
  const history = [];
  function reset(position = null) {
    const mono = now(),
      wall = wallNow();
    previous = position ? { x: position.x, z: position.z, mono, wall } : null;
    anchor = { mono, wall };
    history.length = 0;
    clockStrikes = 0;
    allowance = 0;
  }
  function authorizeDisplacement(meters, durationSeconds = 0.5) {
    if (!Number.isFinite(meters) || meters < 0 || meters > 100)
      throw Error("Khoảng dịch chuyển được cấp phép không hợp lệ");
    allowance += meters;
    allowanceUntil = now() + Math.max(0, Math.min(2, durationSeconds)) * 1000;
  }
  function sample({
    x,
    z,
    speed,
    dt,
    paused = false,
    teleportAuthorized = false,
  }) {
    const mono = now(),
      wall = wallNow();
    if (
      ![x, z, speed, dt, mono, wall].every(Number.isFinite) ||
      dt < 0 ||
      speed < 0
    )
      throw Error("Dữ liệu kiểm tra chuyển động không hợp lệ");
    if (!anchor) anchor = { mono, wall };
    const elapsed = previous ? (mono - previous.mono) / 1000 : 0;
    // A background tab, resumed app, or debug travel establishes a fresh sample.
    // It must not be used as evidence of speedhacking or advance an extraction.
    if (
      !previous ||
      paused ||
      teleportAuthorized ||
      elapsed > 2 ||
      elapsed < 0
    ) {
      reset({ x, z });
      return (lastResult = Object.freeze({
        ok: true,
        blocked: false,
        x,
        z,
        safeDt: 0,
        resumed: true,
        clockDrift: false,
      }));
    }
    const safeDt = Math.min(
        dt,
        maxFrameSeconds,
        Math.max(0, elapsed * 1.25 + 0.035),
      ),
      drift = Math.abs(wall - anchor.wall - (mono - anchor.mono));
    clockStrikes = drift > clockDriftMs ? clockStrikes + 1 : 0;
    const clockDrift = clockStrikes >= 3;
    logicalTime += safeDt;
    while (history.length && logicalTime - history[0].time > 1) history.shift();
    if (mono > allowanceUntil) allowance = 0;
    const displacement = Math.hypot(x - previous.x, z - previous.z),
      regular = Math.min(speed, 120) * safeDt,
      usedAllowance = Math.min(allowance, Math.max(0, displacement - regular)),
      windowDistance = history.reduce((sum, h) => sum + h.distance, 0),
      windowBudget = history.reduce((sum, h) => sum + h.budget, 0),
      limit = regular + usedAllowance + movementSlack,
      blocked =
        displacement > limit ||
        windowDistance + displacement >
          windowBudget + regular + usedAllowance + movementSlack;
    if (blocked || clockDrift) violations++;
    const acceptedX = blocked ? previous.x : x,
      acceptedZ = blocked ? previous.z : z;
    history.push({
      time: logicalTime,
      distance: blocked ? 0 : displacement,
      budget: regular + (blocked ? 0 : usedAllowance),
    });
    if (!blocked) allowance -= usedAllowance;
    previous = { x: acceptedX, z: acceptedZ, mono, wall };
    return (lastResult = Object.freeze({
      // A wall-clock correction is a signal, never an automatic movement ban.
      ok: !blocked,
      blocked,
      x: acceptedX,
      z: acceptedZ,
      safeDt,
      displacement,
      limit,
      clockDrift,
      driftMs: drift,
      resumed: false,
    }));
  }
  return Object.freeze({
    sample,
    reset,
    authorizeDisplacement,
    status: () =>
      Object.freeze({ violations, lastResult, clock: inspectClockIntegrity() }),
  });
}

/** A bounded replay cache for local diagnostics; durable rewards use SQL ledger. */
export function ReplayGuard({
  ttlMs = 120000,
  capacity = 4096,
  now = wallClock,
} = {}) {
  const seen = new Map();
  return Object.freeze({
    accept(scope, nonce) {
      if (typeof scope !== "string" || typeof nonce !== "string" || !nonce)
        return false;
      const time = now();
      for (const [key, expiry] of seen) if (expiry <= time) seen.delete(key);
      const key = JSON.stringify([scope, nonce]);
      if (seen.has(key)) return false;
      if (seen.size >= capacity) return false;
      seen.set(key, time + ttlMs);
      return true;
    },
    size: () => seen.size,
  });
}

/** Uses disposable state exclusively. Never changes the player's real wallet. */
export function runSecuritySimulation() {
  const state = {
      tb: 500,
      hp: 950,
      mp: 100,
      cooldowns: [0, 2, 4, 8],
      gate: 20,
    },
    vault = SecureMemoryVault(state),
    tests = [];
  state.tb = 999999;
  state.hp = Number.POSITIVE_INFINITY;
  state.cooldowns[3] = 0;
  state.gate = 0.01;
  const result = vault.inspect(state);
  tests.push({
    id: "memory-restore",
    name: "Khôi phục ví, HP, hồi chiêu và thời gian cổng",
    passed:
      result.detected === 4 &&
      result.restored === 4 &&
      state.tb === 500 &&
      state.hp === 950 &&
      state.gate === 20 &&
      state.cooldowns[3] === 8,
    detail: `${result.detected} trường giả lập bị phát hiện; ${result.restored} trường được khôi phục`,
  });
  tests.push({
    id: "frozen-api",
    name: "API bảo vệ được đóng băng",
    passed: Object.isFrozen(vault),
  });
  let clock = 0;
  const movement = TimeMovementValidator({
    now: () => clock,
    wallNow: () => clock,
  });
  movement.sample({ x: 0, z: 0, speed: 5, dt: 0 });
  clock += 100;
  const teleport = movement.sample({ x: 50, z: 50, speed: 5, dt: 0.1 });
  tests.push({
    id: "teleport-block",
    name: "Chặn dịch chuyển không hợp lệ",
    passed: teleport.blocked && teleport.x === 0 && teleport.z === 0,
  });
  movement.authorizeDisplacement(2.8);
  clock += 100;
  const dash = movement.sample({ x: 2.8, z: 0, speed: 5, dt: 0.1 });
  tests.push({
    id: "legitimate-dash",
    name: "Cho phép Linh Bộ được cấp quyền",
    passed: !dash.blocked,
  });
  const replay = ReplayGuard();
  const first = replay.accept("isolated-test", "gate-transaction-1"),
    duplicate = replay.accept("isolated-test", "gate-transaction-1");
  tests.push({
    id: "replay-block",
    name: "Chặn phát lại cùng mã giao dịch",
    passed: first && !duplicate,
  });
  return freezeDeep({
    passed: tests.every((test) => test.passed),
    checks: tests,
    isolated: true,
    changedRealWallet: false,
    vault: vault.status(),
    limitations: [
      "Kiểm tra JavaScript phía máy khách có thể bị thay thế trên thiết bị đã bị kiểm soát.",
      "Mô phỏng không chứng minh chống root/Frida; giao dịch online dựa vào máy chủ và sổ SQL.",
    ],
  });
}
