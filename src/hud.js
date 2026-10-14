import { ITEMS, RECIPES, HEROES, RINGS } from "./data.js";
import { distance, ringCompatible, mismatch } from "./rules.js";
export function quickOffers(match) {
  const a = match.player,
    near = match.nearShop(),
    coins = a.wallet.brought + a.wallet.earned;
  const crafted = RECIPES.filter(
    ([, p, l]) => a.items.includes(p) && a.items.includes(l),
  ).map(([id, , , fee]) => ({ id, action: "craft", price: fee }));
  const priorities = {
    fighter: [1, 2, 10, 3, 4],
    mage: [5, 7, 11, 6, 8],
    marksman: [1, 3, 13, 4, 14],
    support: [21, 9, 11, 22, 23],
    tank: [9, 10, 11, 12, 21],
  };
  const order = priorities[HEROES[a.hero].role] ?? priorities.support;
  const bought = ITEMS.filter((i) => !near?.merchant || i.tier === 3)
    .sort(
      (a, b) =>
        (order.includes(a.id) ? order.indexOf(a.id) : -1 + 100) -
          (order.includes(b.id) ? order.indexOf(b.id) : -1 + 100) ||
        a.price - b.price,
    )
    .map((i) => ({
      id: i.id,
      action: "buy",
      price: i.price * (near?.merchant ? 0.85 : 1),
    }));
  const list = [];
  for (const o of [...crafted, ...bought]) {
    if (list.some((p) => p.id === o.id)) continue;
    list.push({
      ...o,
      name: ITEMS[o.id - 1].name,
      warning: mismatch(a.hero, o.id),
      disabled:
        !near ||
        !a.alive ||
        !!a.channel ||
        coins < o.price ||
        (o.action === "buy" && a.items.length >= 7) ||
        (o.action === "buy" && near?.merchant && (a.merchantBuys ?? 0) >= 2),
    });
    if (list.length === 2) break;
  }
  return list;
}
export function contextualActions(match) {
  const a = match.player;
  const gate = match.gates.some(
    (g) => g.end > match.time && distance(g, a) < 3.5,
  );
  const loot = match.drops.find(
    (d) =>
      (d.realm ?? 0) === (a.realm ?? 0) &&
      distance(d, a) < 3 &&
      (d.unlock <= match.time || d.team === a.team),
  );
  const shrine = match.shrines.some((s) => distance(a, s) < 4);
  const ring = shrine
    ? a.bag.find(
        (i) =>
          i.kind === "ring" &&
          ringCompatible(a.hero, i.id, RINGS[i.id - 1].slot),
      )
    : null;
  return {
    gate,
    loot,
    ring,
    canSend: gate && !!a.supports.find((s) => s.id === 17 && !s.used),
  };
}
