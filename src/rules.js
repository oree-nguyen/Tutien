import {
  HEROES,
  SKILLS,
  ITEMS,
  RECIPES,
  BONES,
  RINGS,
  SUPPORTS,
} from "./data.js";
export const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
export const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
export const uid = () =>
  globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
export function validateLoadout(l) {
  if (
    !Number.isInteger(l.hero) ||
    !HEROES[l.hero] ||
    ![0, 1, 2].includes(l.branch)
  )
    throw Error("Nhân vật/nhánh không hợp lệ");
  if (
    !Array.isArray(l.rings) ||
    l.rings.length !== 2 ||
    !Array.isArray(l.bones) ||
    l.bones.length > 7 ||
    new Set(l.bones).size !== l.bones.length ||
    l.bones.some((id) => !Number.isInteger(id) || id < 1 || id > 7)
  )
    throw Error("Khe trang bị không hợp lệ");
  if (
    ![0, 1, 2].includes(l.skin ?? 0) ||
    ![0, 1, 2, 3].includes(l.costume ?? 0)
  )
    throw Error("Skin không hợp lệ");
  for (const c of l.supports)
    if (
      !Number.isInteger(c.id) ||
      c.id < 1 ||
      c.id > 18 ||
      !Number.isInteger(c.tier) ||
      c.tier < 1 ||
      c.tier > ({ 1: 4, 2: 2, 3: 2, 4: 4, 18: 4 }[c.id] ?? 1)
    )
      throw Error("Trợ phẩm/cấp không hợp lệ");
  for (const c of l.supports)
    if (
      (c.currency && !["nb", "tb"].includes(c.currency)) ||
      (c.currency === "tb" && !SUPPORTS[c.id - 1].tb)
    )
      throw Error("Loại tiền mua Trợ phẩm không hợp lệ");
  if (
    l.supports.length > 3 ||
    new Set(l.supports.map((s) => s.id)).size !== l.supports.length
  )
    throw Error("Tối đa 3 loại Trợ phẩm");
  if (l.supports.some((s) => s.id === 1) && l.supports.some((s) => s.id === 4))
    throw Error("Duy Linh và Bội Linh không được mang chung");
  if (!Number.isFinite(l.brought) || l.brought < 0 || l.brought > 300)
    throw Error("Vốn mang vào tối đa 300 TB");
  for (let i = 0; i < 2; i++)
    if (l.rings[i] && !ringCompatible(l.hero, l.rings[i], i + 1))
      throw Error("Hồn hoàn sai khe hoặc sai Tag");
}
export const ringCompatible = (hero, id, slot) =>
  RINGS[id - 1]?.slot === slot && RINGS[id - 1].heroes.includes(hero);
export function mismatch(hero, item) {
  let r = HEROES[hero].role,
    g = ITEMS[item - 1].group;
  return r === "fighter"
    ? ["Hồn công", "Hỗ trợ"].includes(g)
    : r === "marksman"
      ? ["Khống chế", "Hỗ trợ"].includes(g)
      : r === "mage"
        ? g === "Cường công"
        : g === "Cường công";
}
export const backlash = (hero, items) =>
  Math.min(0.08, items.filter((i) => mismatch(hero, i)).length * 0.04);
export function stats(a) {
  const h = HEROES[a.hero],
    s = {
      hp: h.hp,
      atk: h.atk,
      power: h.power,
      armor: h.armor,
      resist: h.resist,
      speed: h.speed,
      mp: h.mp,
      range: h.range,
      as: 1,
      regen: 2,
      heal: 1,
      shield: 1,
    };
  // GDD does not provide level growth; the sandbox keeps base stats and unlocks R at level 1.
  const add = (o) => {
    for (let [k, v] of Object.entries(o)) s[k] = (s[k] ?? 0) + v;
  };
  for (let id of a.items ?? []) add(ITEMS[id - 1].stats);
  for (let id of a.bones ?? []) add(BONES[id - 1].stats);
  if (a.skin) {
    const vip = a.skin === 2 && !a.ranked;
    add(
      h.role === "fighter" || h.role === "marksman"
        ? {
            atk: vip ? 6 : 2,
            hp: vip ? ([1, 9].includes(a.hero) ? 25 : 20) : 8,
            armor: vip ? 2 : 0,
          }
        : a.hero === 5
          ? { hp: vip ? 28 : 8, armor: vip ? 3 : 1, resist: vip ? 2 : 0 }
          : { power: vip ? 6 : 2, hp: vip ? 20 : 8, resist: vip ? 2 : 0 },
    );
  }
  if (a.hero === 2 && a.branch === 0) {
    s.hp *= 0.94;
    s.armor -= 4;
  }
  if (a.hero === 2 && a.branch === 2) s.atk *= 0.92;
  if (a.hero === 1 && a.branch === 2) s.armor -= 5;
  if (a.hero === 8 && a.branch === 0) s.as *= 0.9;
  if (a.hero === 8 && a.branch === 2) s.as += 0.2;
  if (a.rings?.includes(8)) s.speed -= 0.1;
  const p = backlash(a.hero, a.items ?? []);
  if (h.role === "fighter") s.atk *= 1 - p;
  else if (h.role === "marksman") s.as *= 1 - p;
  else if (h.role === "mage") s.power *= 1 - p;
  else {
    s.heal *= 1 - p;
    s.shield *= 1 - p;
  }
  const stacks = a.stacks ?? 0;
  if (a.hero === 2) {
    s.speed *= 1 + 0.04 * stacks;
  }
  if (a.hero === 5) {
    const k = a.rings?.includes(8) && a.hp < s.hp * 0.4 ? 2 : 1;
    s.armor += stacks * 3 * k;
    s.resist += stacks * 2 * k;
  }
  if (a.hero === 9) s.atk *= 1 + stacks * (a.branch === 1 ? 0.0075 : 0.015);
  const now = a.now ?? 0;
  for (const b of a.buffs ?? [])
    if (
      b.end > now &&
      (b.type !== "outOfCombat" || now - (a.lastCombat ?? -20) > 5)
    )
      add(b.stats ?? {});
  return s;
}
export function skillFor(a, k) {
  let s = { ...SKILLS[a.hero][k] },
    h = a.hero,
    b = a.branch;
  const mul = (m) => {
    s.base *= m;
    s.scale *= m;
  };
  if (h === 0) {
    if (b === 0) {
      if ([0, 1, 3].includes(k)) mul(0.92);
      if (k === 0) s.slow = 0.25;
      if (k === 1) s.cc = 1.45;
    }
    if (b === 1 && k === 1) {
      s.cc = 0;
      s.slow = 0.45;
    }
    if (b === 2) {
      if (k === 0) s.range -= 1;
      if (k === 3) s.cd += 10;
    }
  }
  if (h === 1) {
    if (b === 1) {
      if ([2, 3].includes(k)) {
        s.radius *= 1.25;
        s.range *= 1.25;
      }
      if ([0, 3].includes(k)) mul(0.88);
      if (k === 2) s.slow = 0.4;
    }
    if (b === 2 && k === 0) mul(0.9);
  }
  if (h === 2) {
    if (b === 1) {
      if (k === 0) {
        s.range += 1;
        s.dash += 1;
      }
      if (k === 3) mul(0.85);
    }
  }
  if (h === 3) {
    if (b === 0 && k === 0) mul(1.2);
    if (b === 1 && [0, 3].includes(k)) mul(0.9);
    if (b === 2 && k === 3) {
      s.radius = 5.5;
      s.slow = 0.15;
      mul(0.88);
    }
  }
  if (h === 4) {
    if (b === 0 && k === 0) mul(0.8);
    if (b === 0 && k === 1) mul(1.25);
    if (b === 1 && k === 1) mul(0.85);
    if (b === 1 && k === 2) {
      s.radius = 15;
      s.range = 15;
      s.duration = 4.5;
      s.cd -= 3;
    }
    if (b === 2 && k === 3) s.duration = 3.8;
  }
  if (h === 5) {
    if (b === 0 && [0, 2].includes(k)) mul(0.85);
    if (b === 1 && k === 2) s.radius = 4;
    if (b === 2 && [0, 2].includes(k)) s.cd += 2;
  }
  if (h === 6) {
    if ([0, 1].includes(k))
      mul(b === 0 ? 1.18 : b === 1 ? 0.88 : k === 0 ? 0.85 : 1);
    if (k === 3) s.radius = b === 0 ? 3.6 : b === 1 ? 5.4 : 4.5;
    if (b === 2 && k === 2) {
      s.cd -= 3;
      s.range = s.dash = 4.5;
    }
  }
  if (h === 7) {
    if (b === 0 && k === 0) mul(0.85);
    if (b === 0 && k === 1) s.slow = 0.38;
    if (k === 3) {
      if (b === 0) s.cc = 1.35;
      if (b === 1) s.cc = 0;
      if (b === 2) mul(0.82);
    }
  }
  if (h === 8) {
    if (b === 0 && k === 0) s.range = 13;
    if (b === 0 && k === 3) {
      s.radius *= 0.75;
      mul(1.25);
    }
    if (b === 1 && [0, 3].includes(k)) mul(0.9);
    if (b === 1 && k === 1) s.duration = 6.5;
    if (b === 2 && k === 0) mul(0.75);
  }
  if (h === 9) {
    if (b === 1 && k === 1) mul(1.4);
    if (b === 2 && k === 2) s.range = s.dash = 5.5;
    if (b === 2 && k === 3) s.duration = 5.5;
  }
  if (h === 10) {
    if (b === 0 && [0, 2].includes(k)) mul(0.75);
    if (b === 0 && [1, 3].includes(k)) mul(1.22);
    if (b === 1 && k === 0) mul(1.25);
    if (b === 1 && [1, 3].includes(k)) mul(0.75);
    if (b === 2 && k === 2) s.slow = 0.35;
    if (b === 2 && k === 3) s.base = 32;
  }
  if (h === 11) {
    if (b === 0 && k === 1) s.cc = 0.65;
    if (b === 1 && k === 2) s.cd -= 3;
    if (b === 1 && k === 3) mul(0.85);
    if (b === 2 && k === 0) mul(0.82);
    if (b === 2 && k === 1) s.cc = 1.35;
    if (b === 2 && k === 3) s.slow = 0.35;
  }
  const r = a.rings ?? [];
  if (r.includes(1) && k === 0) mul(0.9);
  if (r.includes(2) && k === 0) {
    mul(0.8);
    s.burnRing = true;
  }
  if (r.includes(3) && k === 2) s.slow *= 0.5;
  if (r.includes(4) && k === 0) s.cd += 1;
  if (r.includes(6) && k === 1) s.mp += 6;
  if (r.includes(7) && k === 1) s.duration -= 0.5;
  if (r.includes(9) && k === 1) s.radius *= 0.85;
  if (r.includes(11) && k === 2) mul(0.85);
  if (r.includes(12) && k === 2) s.mp += 8;
  if (a.items?.includes(19) && ["zone", "circle"].includes(s.shape))
    s.duration += 0.5;
  return s;
}
export function spend(wallet, amount) {
  if (
    !Number.isFinite(amount) ||
    amount < 0 ||
    wallet.brought + wallet.earned < amount
  )
    throw Error("Không đủ Thanh bảo");
  const n = Math.min(wallet.brought, amount);
  wallet.brought -= n;
  wallet.earned -= amount - n;
}
export function buy(a, id, merchant = false) {
  if (a.items.length >= 7) throw Error("Đã đủ 7 ô Bổ phẩm");
  if (!ITEMS[id - 1]) throw Error("Vật phẩm không tồn tại");
  if (merchant && ITEMS[id - 1].tier !== 3)
    throw Error("Thương nhân chỉ giảm giá Bậc Thiên");
  if (merchant && (a.merchantBuys ?? 0) >= 2)
    throw Error("Đã dùng 2 lượt giảm giá");
  spend(a.wallet, ITEMS[id - 1].price * (merchant ? 0.85 : 1));
  a.items.push(id);
  if (merchant) a.merchantBuys = (a.merchantBuys ?? 0) + 1;
}
export function sell(a, index) {
  const id = a.items[index];
  if (!id) throw Error("Ô trống");
  a.items.splice(index, 1);
  a.wallet.earned += ITEMS[id - 1].price * 0.6;
}
export function craft(a, id) {
  const r = RECIPES.find((r) => r[0] === id);
  if (!r || !a.items.includes(r[1]) || !a.items.includes(r[2]))
    throw Error("Thiếu hai nguyên liệu");
  spend(a.wallet, r[3]);
  a.items.splice(a.items.indexOf(r[1]), 1);
  a.items.splice(a.items.indexOf(r[2]), 1);
  a.items.push(id);
}
export function dismantle(a, index) {
  const r = RECIPES.find((r) => r[0] === a.items[index]);
  if (!r) throw Error("Chỉ tháo được Bậc Thiên");
  a.items[index] = r[2];
  a.wallet.earned += (ITEMS[r[0] - 1].price - ITEMS[r[2] - 1].price) * 0.5;
}
export const weight = (items) => items.reduce((s, i) => s + i.w, 0);
export function addLoot(a, item) {
  if (item.kind === "material") {
    const old = a.bag.find((i) => i.code === item.code && i.count < 5);
    if (old) {
      old.count++;
      return true;
    }
  }
  if (a.bag.length >= 24 || weight(a.bag) + item.w > 48) return false;
  a.bag.push({ ...item, uid: item.uid ?? uid(), count: item.count ?? 1 });
  return true;
}
export function extractionTime(w, tier = 0) {
  if (w < 0 || w > 48) throw Error("Gói đồ vượt 48 điểm tải");
  const base = 20 + 2 * Math.ceil(w / 4);
  return tier
    ? Math.max(
        15,
        Number(
          (base * (1 - [0.4, 0.45, 0.5, 0.55][clamp(tier, 1, 4) - 1])).toFixed(
            1,
          ),
        ),
      )
    : base;
}
export const gateReduction = (ve) => 1 - 0.928 * (ve ? 0.85 : 1);
export function hardCC(target, duration, now) {
  target.ccHistory = (target.ccHistory ?? []).filter((e) => now - e.time < 5);
  if ((target.immuneCC ?? 0) > now) return 0;
  const sum = target.ccHistory.reduce((s, e) => s + e.duration, 0),
    n = target.ccHistory.length;
  let d = Math.min(
    duration * (n === 0 ? 1 : n === 1 ? 0.7 : 0.4),
    Math.max(0, 2.5 - sum),
  );
  if (sum + d >= 2.5 - 1e-8) target.immuneCC = now + 1.5;
  target.ccHistory.push({ time: now, duration: d });
  target.ccUntil = Math.max(target.ccUntil ?? now, now) + d;
  return d;
}
export function resolveDamage(
  raw,
  defense,
  bonus = 0,
  reduction = 0,
  shield = 0,
) {
  const damage = Math.max(
    0,
    ((raw * 100) / (100 + Math.max(-90, defense))) *
      (1 + bonus) *
      (1 - reduction),
  );
  return {
    damage,
    shield: Math.max(0, shield - damage),
    hpDamage: Math.max(0, damage - shield),
  };
}
export function siphonCounter(wallet, flow, earned, now) {
  if (now >= flow.end || flow.total >= 150) return 0;
  const n = Math.min(
    Math.max(0, earned) * 0.15,
    wallet.earned,
    150 - flow.total,
  );
  wallet.earned -= n;
  flow.total += n;
  return n;
}
export function appraise(value, tier = 0) {
  if (!tier) return value;
  const bonus = [1.2, 1.35, 1.68, 1.92][tier - 1] - 1;
  return (
    value + (Math.min(value, 1500) + Math.max(0, value - 1500) * 0.5) * bonus
  );
}
export function deathSettlement(a, rng = Math.random) {
  const chance = [0, 0.1, 0.25, 0.5, 0.7][
    a.supports.find((s) => s.id === 1)?.tier ?? 0
  ];
  const gear = [...a.gear],
    saved = gear.filter((i) => i.brought && rng() < chance),
    ids = new Set(saved.map((i) => i.uid));
  return {
    refund: a.wallet.brought * 0.5,
    saved,
    dropped: [...a.bag, ...gear.filter((i) => !ids.has(i.uid))],
    earned: a.wallet.earned,
  };
}
export function gateWave(t) {
  if (t >= 1200 && t < 1320) return 4;
  for (let i = 1; i <= 3; i++) if (t >= i * 300 && t < i * 300 + 120) return i;
  return 0;
}
export function newProfile() {
  return {
    version: 1,
    nb: 2000,
    eventTickets: 1,
    tb: 5000,
    stash: [],
    owned: [],
    record: [],
    matches: 0,
  };
}
export function loot(kind, id = 1, brought = false) {
  const base = { uid: uid(), id, kind, brought, count: 1 };
  return kind === "ring"
    ? {
        ...base,
        code: `HR-${String(id).padStart(2, "0")}`,
        name: RINGS[id - 1].name,
        w: 2,
        value: 120,
      }
    : kind === "bone"
      ? {
          ...base,
          code: `HB-${String(id).padStart(2, "0")}`,
          name: BONES[id - 1].name,
          w: 4,
          value: id === 7 ? 600 : 180,
        }
      : kind === "weapon"
        ? {
            ...base,
            code: "TK-" + id,
            name: id === 3 ? "Tiên khí Truyền Thuyết" : "Tiên khí cổ",
            w: 3,
            value: id === 3 ? 700 : 220,
          }
        : kind === "boss"
          ? {
              ...base,
              code: "BOSS",
              name: "Hòm Tinh Hoa Boss",
              w: 6,
              value: 350,
            }
          : kind === "fragment"
            ? { ...base, code: "MAP", name: "Tàn Đồ Bí Bảo", w: 1, value: 20 }
            : {
                ...base,
                code: "MAT-" + id,
                name: "Linh thạch nguyên liệu",
                w: 1,
                value: 15,
              };
}
