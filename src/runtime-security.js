import {
  SecureMemoryVault,
  TimeMovementValidator,
  runSecuritySimulation,
  inspectClockIntegrity,
} from "./security.js";
const guards = new WeakMap();
const monotonic =
  globalThis.performance?.now.bind(globalThis.performance) ??
  Date.now.bind(Date);
const clone = (value) => JSON.parse(JSON.stringify(value));
const playerFields = [
  "hp",
  "mp",
  "shield",
  "level",
  "essence",
  "wallet",
  "cooldowns",
  "items",
  "rings",
  "bones",
  "gear",
  "bag",
  "skin",
  "ranked",
  "stats",
];
const methods = [
  "step",
  "fixed",
  "cast",
  "attack",
  "shop",
  "pickup",
  "pickupSelected",
  "useSupport",
  "beginExtraction",
  "cancelExtraction",
  "equipRing",
  "activateBone",
  "activateItem",
  "usePortal",
  "damage",
  "heal",
  "reward",
  "kill",
  "move",
  "dash",
  "applyCC",
];
function protect(match) {
  let actor = match.player,
    channelReference = match.player.channel,
    depth = 0,
    trusted = 0,
    credit = 0,
    last = monotonic(),
    vault;
  const movement = TimeMovementValidator(),
    originalStats = match.getStats;
  const values = () => {
    const a = match.player;
    const state = { time: match.time, x: a.x, z: a.z };
    for (const key of playerFields)
      if (a[key] !== undefined) state[key] = clone(a[key]);
    state.channel = a.channel
      ? {
          elapsed: a.channel.elapsed,
          total: a.channel.total,
          paused: a.channel.paused ?? 0,
        }
      : null;
    return state;
  };
  function capture() {
    actor = match.player;
    channelReference = actor.channel;
    vault.capture(values());
  }
  function inspect() {
    if (trusted || !match.player) return { ok: true, detected: 0 };
    if (match.player !== actor) match.player = actor;
    if (match.getStats !== originalStats) match.getStats = originalStats;
    const state = values(),
      result = vault.inspect(state);
    if (!result.ok) {
      match.time = state.time;
      actor.x = state.x;
      actor.z = state.z;
      for (const key of playerFields) if (key in state) actor[key] = state[key];
      actor.channel = state.channel ? channelReference : null;
      if (actor.channel && state.channel)
        Object.assign(actor.channel, state.channel);
      movement.reset(actor);
    }
    return result;
  }
  vault = SecureMemoryVault(values());
  movement.reset(actor);
  if (match.online) {
    Object.defineProperty(match, "onAuthoritativeState", {
      configurable: false,
      value: () => {
        capture();
        movement.reset(match.player);
      },
    });
  } else {
    for (const name of methods) {
      const original = match[name];
      if (typeof original !== "function") continue;
      Object.defineProperty(match, name, {
        enumerable: false,
        configurable: false,
        writable: false,
        value: function (...args) {
          if (depth || trusted) {
            if (name === "dash" && args[0] === match.player) {
              const previous = { x: actor.x, z: actor.z };
              const result = original.apply(this, args);
              movement.authorizeDisplacement(
                Math.min(
                  100,
                  Math.hypot(actor.x - previous.x, actor.z - previous.z),
                ),
              );
              return result;
            }
            return original.apply(this, args);
          }
          inspect();
          if (name === "step" || name === "fixed") {
            const now = monotonic(),
              elapsed = Math.max(0, (now - last) / 1000);
            last = now;
            credit = Math.min(0.12, credit + elapsed);
            const requested = Number(args[0]);
            if (!Number.isFinite(requested) || requested < 0)
              throw Error("Bước thời gian không hợp lệ");
            args[0] = Math.min(requested, credit, 0.1);
            credit -= args[0];
          }
          depth++;
          try {
            return original.apply(this, args);
          } finally {
            depth--;
            if ((name === "step" || name === "fixed") && !match.result) {
              const sample = movement.sample({
                x: actor.x,
                z: actor.z,
                speed: originalStats.call(match, actor).speed,
                dt: args[0],
              });
              if (sample.blocked) {
                actor.x = sample.x;
                actor.z = sample.z;
              }
            } else if (name === "cast" || name === "usePortal")
              movement.reset(actor);
            capture();
          }
        },
      });
    }
  }
  return Object.freeze({
    inspect,
    status: () => ({
      vault: vault.status(),
      movement: movement.status(),
      clock: inspectClockIntegrity(),
      online: !!match.online,
      serverAuthority: !!match.online,
      limitations:
        "Kiểm tra phía máy khách có thể bị thay thế; ví/kho online do máy chủ kiểm soát. Sandbox ngoại tuyến cho phép thay đổi có chủ đích.",
    }),
    simulate: runSecuritySimulation,
    sandbox(fn) {
      if (match.online) throw Error("Không cấp quyền Sandbox cho trận online");
      trusted++;
      depth++;
      try {
        return fn();
      } finally {
        depth--;
        trusted--;
        capture();
        movement.reset(match.player);
        credit = 0;
        last = monotonic();
      }
    },
  });
}
export function ensureRuntimeSecurity(match) {
  if (!match?.player) return null;
  if (!guards.has(match)) guards.set(match, protect(match));
  const guard = guards.get(match);
  guard.inspect();
  return guard;
}
export function securityFacade(getMatch) {
  const nativeStatus = () => {
    try {
      const value = globalThis.HongioiNativeSecurity?.status?.();
      return value
        ? { available: true, ...JSON.parse(value) }
        : {
            available: false,
            reason: "Chưa chạy trong Android WebView có native bridge",
          };
    } catch {
      return { available: false, reason: "Không đọc được trạng thái native" };
    }
  };
  return Object.freeze({
    status: () => ({
      ...(ensureRuntimeSecurity(getMatch())?.status() ?? {
        online: false,
        clock: inspectClockIntegrity(),
        vault: { detections: 0 },
        serverAuthority: false,
      }),
      native: nativeStatus(),
      layers: [
        "Vault + snapshot",
        "Đồng hồ + chuyển động",
        "Tầm nhìn máy chủ",
        "HMAC + SQL ledger",
        "Kiểm tra native + R8",
      ],
    }),
    simulate: runSecuritySimulation,
  });
}
