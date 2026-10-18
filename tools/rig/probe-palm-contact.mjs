import fs from "node:fs/promises";
import { createHash } from "node:crypto";
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { Vector3, Ray, Triangle, DoubleSide } from "three";
import sharp from "sharp";
import { MeshContact } from "./mesh-contact.mjs";
const hero = process.env.HERO ?? "H02",
  side = hero === "H02" ? "Left" : "Right",
  source = `public/models/hunyuan-original/${hero}-C0-source.glb`,
  bytes = await fs.readFile(source),
  doc = await new NodeIO().registerExtensions(ALL_EXTENSIONS).readBinary(bytes),
  p = doc.getRoot().listMeshes()[0].listPrimitives()[0],
  positions = p.getAttribute("POSITION").getArray(),
  mesh = new MeshContact(positions, p.getIndices().getArray()),
  frame = JSON.parse(await fs.readFile("data/rig/hand-frames.json")).heroes[
    hero
  ].hands[side],
  n = new Vector3(...frame.n),
  wrist = new Vector3(...frame.wrist),
  middle = new Vector3(...frame.fingers.Middle.points[0]),
  image = await sharp(p.getMaterial().getBaseColorTexture().getImage())
    .raw()
    .toBuffer({ resolveWithObject: true }),
  candidates = [];
try {
  for (const ratio of [1.1, 1.2, 1.3, 1.4, 1.5]) {
    const seed = wrist.clone().lerp(middle, ratio),
      ray = new Ray(seed.clone().addScaledVector(n, 0.12), n.clone().negate()),
      hits = mesh.bvh
        .raycast(ray, DoubleSide)
        .sort((a, b) => a.distance - b.distance),
      unique = [];
    for (const hit of hits)
      if (
        hit.point.distanceTo(seed) < 0.09 &&
        (!unique.length || hit.point.distanceTo(unique.at(-1).point) > 1e-5)
      )
        unique.push(hit);
    if (unique.length < 2) continue;
    const hit = unique[0],
      ids = [0, 1, 2].map((k) =>
        mesh.geometry.index.getX(hit.faceIndex * 3 + k),
      ),
      triangle = new Triangle(
        ...ids.map((i) => new Vector3().fromArray(positions, i * 3)),
      ),
      bary = triangle.getBarycoord(hit.point, new Vector3()).toArray(),
      uv = [0, 0];
    for (let k = 0; k < 3; k++) {
      const sample = p.getAttribute("TEXCOORD_0").getElement(ids[k], []);
      uv[0] += sample[0] * bary[k];
      uv[1] += sample[1] * bary[k];
    }
    const x = Math.round(uv[0] * (image.info.width - 1)),
      y = Math.round(uv[1] * (image.info.height - 1)),
      offset = (y * image.info.width + x) * image.info.channels;
    candidates.push({
      ratio,
      center: hit.point.toArray(),
      normal: triangle.getNormal(new Vector3()).toArray(),
      sourceFaceIds: ids,
      barycentric: bary,
      sourceAlbedoRgb: [...image.data.slice(offset, offset + 3)],
      distancePastMiddleMcp: seed.distanceTo(middle),
      status:
        "source-surface measurement; distal palm/proximal finger identity requires visual review",
    });
  }
  const report = {
    hero,
    hand: side,
    source,
    sourceSha256: createHash("sha256").update(bytes).digest("hex"),
    scope:
      "Additional measured contacts near distal palm/proximal finger base; does not change joints, weights, geometry, texture or canonical hand calibration",
    palmCandidates: candidates,
  };
  await fs.writeFile(
    `docs/hand-frames/${hero}-distal-contact-probe.json`,
    JSON.stringify(report, null, 2) + "\n",
  );
  console.log(report);
} finally {
  mesh.dispose();
}
