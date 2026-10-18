import fs from "node:fs/promises";
import { createHash } from "node:crypto";
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { Matrix4, Vector3 } from "three";

const hero = process.env.HERO ?? "H02";
if (!["H01", "H02"].includes(hero)) throw Error("Unsupported source weapon");
const spec = JSON.parse(await fs.readFile(`data/weapons/${hero}.json`)),
  bytes = await fs.readFile(spec.source);
const hash = createHash("sha256").update(bytes).digest("hex");
if (hash !== spec.sourceSha256) throw Error("Weapon source changed");
const doc = await new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .readBinary(bytes);
const start = spec.gripSegment[0],
  end = spec.gripSegment[1],
  step = 0.01;
const sections = Array.from(
  { length: Math.floor((end - start) / step) + 1 },
  (_, i) => ({ y: start + i * step, points: [] }),
);
for (const node of doc.getRoot().listNodes()) {
  if (!node.getMesh()) continue;
  const matrix = new Matrix4().fromArray(node.getWorldMatrix());
  for (const p of node.getMesh().listPrimitives()) {
    const positions = p.getAttribute("POSITION").getArray(),
      indices = p.getIndices().getArray();
    const v = [new Vector3(), new Vector3(), new Vector3()];
    for (let i = 0; i < indices.length; i += 3) {
      for (let k = 0; k < 3; k++)
        v[k].fromArray(positions, indices[i + k] * 3).applyMatrix4(matrix);
      const low = Math.max(
        0,
        Math.ceil((Math.min(...v.map((p) => p.y)) - start) / step),
      );
      const high = Math.min(
        sections.length - 1,
        Math.floor((Math.max(...v.map((p) => p.y)) - start) / step),
      );
      for (let j = low; j <= high; j++) {
        const section = sections[j];
        for (let edge = 0; edge < 3; edge++) {
          const a = v[edge],
            b = v[(edge + 1) % 3];
          if (
            Math.abs(a.y - b.y) < 1e-12 ||
            (a.y - section.y) * (b.y - section.y) > 0
          )
            continue;
          const t = (section.y - a.y) / (b.y - a.y);
          section.points.push([a.x + (b.x - a.x) * t, a.z + (b.z - a.z) * t]);
        }
      }
    }
  }
}
const report = {
  hero,
  sourceSha256: hash,
  method:
    "Original triangle intersections with horizontal planes, 10 mm spacing; diagnostic, no grip acceptance or source modification",
  sections: sections
    .filter((s) => s.points.length)
    .map(({ y, points }) => {
      const minX = Math.min(...points.map((p) => p[0])),
        maxX = Math.max(...points.map((p) => p[0]));
      const minZ = Math.min(...points.map((p) => p[1])),
        maxZ = Math.max(...points.map((p) => p[1]));
      const center = [(minX + maxX) / 2, y, (minZ + maxZ) / 2];
      return {
        y,
        center,
        diameterX: maxX - minX,
        diameterZ: maxZ - minZ,
        radius: Math.max(
          ...points.map((p) => Math.hypot(p[0] - center[0], p[1] - center[2])),
        ),
        intersections: points.length,
      };
    }),
};
await fs.writeFile(
  `docs/hand-frames/${hero}-weapon-sections.json`,
  JSON.stringify(report, null, 2) + "\n",
);
console.log(report.sections.sort((a, b) => a.radius - b.radius).slice(0, 10));
