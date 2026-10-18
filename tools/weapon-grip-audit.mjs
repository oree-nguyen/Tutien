import fs from "node:fs/promises";
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { Matrix4, Vector3 } from "three";
import { createHash } from "node:crypto";
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
for (const [hero, file, kind] of [
  ["H01", "H01-W0-source.glb", "staff"],
  ["H02", "H02-W0-source.glb", "hammer"],
]) {
  const input = "public/models/hunyuan-original/" + file,
    doc = await io.read(input),
    node = doc
      .getRoot()
      .listNodes()
      .find((n) => n.getMesh()),
    p = node.getMesh().listPrimitives()[0].getAttribute("POSITION"),
    matrix = new Matrix4().fromArray(node.getWorldMatrix()),
    points = [],
    a = [],
    v = new Vector3();
  for (let i = 0; i < p.getCount(); i++) {
    p.getElement(i, a);
    points.push(v.fromArray(a).applyMatrix4(matrix).clone());
  }
  const low = Math.min(...points.map((p) => p.y).slice(0, 1));
  let minY = Infinity,
    maxY = -Infinity;
  for (const p of points) {
    minY = Math.min(minY, p.y);
    maxY = Math.max(maxY, p.y);
  }
  const length = maxY - minY,
    headEnd = kind === "hammer" ? 0.4 : maxY,
    gripT = kind === "hammer" ? 0.35 : null,
    gripY =
      kind === "hammer" ? headEnd - gripT * (headEnd - minY) : minY + 1.64,
    section = points.filter((p) => Math.abs(p.y - gripY) < 0.01);
  if (section.length < 10) throw Error("Grip section too sparse");
  let minX = Infinity,
    maxX = -Infinity,
    minZ = Infinity,
    maxZ = -Infinity;
  for (const p of section) {
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x);
    minZ = Math.min(minZ, p.z);
    maxZ = Math.max(maxZ, p.z);
  }
  const center = [(minX + maxX) / 2, gripY, (minZ + maxZ) / 2],
    radius = Math.max(
      ...section.map((p) => Math.hypot(p.x - center[0], p.z - center[2])),
    );
  const spec = {
    hero,
    kind,
    source: input,
    sourceSha256: createHash("sha256")
      .update(await fs.readFile(input))
      .digest("hex"),
    shaftAxis: [0, 1, 0],
    shaftRadius: radius,
    gripSegment: [minY + 0.15, headEnd - 0.1],
    gripT,
    gripPivot: center,
    headEnd,
    topEnd: maxY,
    baseEnd: minY,
    length,
    measuredSection: {
      minX,
      maxX,
      minZ,
      maxZ,
      vertices: section.length,
      halfThicknessWindow: 0.01,
    },
    eyeHeightTarget: kind === "staff" ? 1.64 : null,
    eyeHeightStatus:
      kind === "staff"
        ? "head-region initial target; visual eye landmark validation pending"
        : null,
  };
  await fs.writeFile(
    `data/weapons/${hero}.json`,
    JSON.stringify(spec, null, 2) + "\n",
  );
  console.log(
    hero,
    "shaft radius",
    radius,
    "grip",
    center,
    "base",
    minY,
    "top",
    maxY,
  );
}
