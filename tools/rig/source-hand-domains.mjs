import assert from "node:assert/strict";

/** Recorded source components only; not an anatomical approval or spatial crop. */
export function sourceHandDomains(fans, index, touched, hands) {
  assert.equal(fans.length, touched.length);
  const parent = Uint32Array.from(fans, (_, i) => i),
    first = new Map();
  const find = (v) => {
    assert(
      Number.isInteger(v) && v >= 0 && v < parent.length,
      "Missing source vertex",
    );
    while (parent[v] !== v) {
      parent[v] = parent[parent[v]];
      v = parent[v];
    }
    return v;
  };
  const join = (a, b) => {
    parent[find(b)] = find(a);
  };
  for (let v = 0; v < fans.length; v++) {
    if (first.has(fans[v])) join(first.get(fans[v]), v);
    else first.set(fans[v], v);
  }
  assert.equal(index.length % 3, 0);
  for (let at = 0; at < index.length; at += 3) {
    join(index[at], index[at + 1]);
    join(index[at], index[at + 2]);
  }
  const roots = new Set();
  return hands.map((hand) => {
    const seeds = hand.measuredSeeds.flatMap((seed) => seed.currentSourceFans);
    assert(seeds.length, "Missing measured side seeds");
    const components = new Set(
      seeds.map((f) => {
        assert(first.has(f), "Missing measured source fan");
        return find(first.get(f));
      }),
    );
    assert.equal(components.size, 1, "Side seeds disagree on source component");
    const root = [...components][0];
    assert(!roots.has(root), "Hand domains overlap");
    roots.add(root);
    const mask = Uint8Array.from(fans, (_, v) =>
      Number(touched[v] && find(v) === root),
    );
    assert.equal(
      mask.reduce((a, b) => a + b, 0),
      hand.vertices,
      "Stale recorded hand domain",
    );
    return { side: hand.side, mask };
  });
}
