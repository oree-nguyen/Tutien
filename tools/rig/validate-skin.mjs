import fs from "node:fs/promises";
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { Matrix4, Quaternion, Vector3 } from "three";
import { createHash } from "node:crypto";
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS),
  reports = [];
const handFrames = JSON.parse(
  await fs.readFile("data/rig/hand-frames.json"),
).heroes;
for (const hero of ["H01", "H02"]) {
  const doc = await io.read(`assets/rigged/${hero}-C0-rigged.glb`),
    skin = doc.getRoot().listSkins()[0],
    joints = skin.listJoints(),
    meshNode = doc
      .getRoot()
      .listNodes()
      .find((n) => n.getMesh());
  const primitive = meshNode.getMesh().listPrimitives()[0],
    p = primitive.getAttribute("POSITION").getArray(),
    indices = primitive.getIndices().getArray(),
    ids = primitive.getAttribute("JOINTS_0").getArray(),
    weights = primitive.getAttribute("WEIGHTS_0").getArray(),
    count = p.length / 3;
  const tipSamples = Object.entries(handFrames[hero].hands).flatMap(
    ([side, frame]) =>
      Object.entries(frame.fingers).map(([name, finger]) => {
        const point = finger.points[3];
        let vertex = -1,
          nearest = Infinity;
        for (let i = 0; i < count; i++) {
          const distance = Math.hypot(
            p[i * 3] - point[0],
            p[i * 3 + 1] - point[1],
            p[i * 3 + 2] - point[2],
          );
          if (distance < nearest) {
            nearest = distance;
            vertex = i;
          }
        }
        return {
          name: side + name,
          point,
          vertex,
          bindRadius: nearest,
          joint: joints.findIndex(
            (j) => j.getName() === side + "Hand" + name + "3",
          ),
        };
      }),
  );
  const keys = new Float64Array(indices.length);
  for (let i = 0; i < indices.length; i += 3)
    for (let e = 0; e < 3; e++) {
      const a = indices[i + e],
        b = indices[i + ((e + 1) % 3)];
      keys[i + e] = Math.min(a, b) * count + Math.max(a, b);
    }
  keys.sort();
  const poses = [];
  for (const strength of [0.2, 1]) {
    const worlds = new Map();
    function world(node) {
      if (worlds.has(node)) return worlds.get(node);
      const q = new Quaternion(...node.getRotation()),
        finger = node
          .getName()
          .match(/Hand(?:Thumb|Index|Middle|Ring|Pinky)([123])$/);
      if (finger)
        q.multiply(
          new Quaternion().setFromAxisAngle(
            new Vector3(1, 0, 0),
            ([60, 70, 48][Number(finger[1]) - 1] * strength * Math.PI) / 180,
          ),
        );
      const local = new Matrix4().compose(
          new Vector3(...node.getTranslation()),
          q,
          new Vector3(...node.getScale()),
        ),
        parent = node.getParentNode();
      if (parent) local.premultiply(world(parent));
      worlds.set(node, local);
      return local;
    }
    const matrices = joints.map(
        (j, k) =>
          world(j)
            .clone()
            .multiply(
              new Matrix4().fromArray(
                skin.getInverseBindMatrices().getElement(k, []),
              ),
            ).elements,
      ),
      skinned = new Float64Array(p.length);
    for (let i = 0; i < count; i++) {
      const x = p[i * 3],
        y = p[i * 3 + 1],
        z = p[i * 3 + 2];
      for (let k = 0; k < 4; k++) {
        const w = weights[i * 4 + k];
        if (!w) continue;
        const m = matrices[ids[i * 4 + k]];
        skinned[i * 3] += w * (m[0] * x + m[4] * y + m[8] * z + m[12]);
        skinned[i * 3 + 1] += w * (m[1] * x + m[5] * y + m[9] * z + m[13]);
        skinned[i * 3 + 2] += w * (m[2] * x + m[6] * y + m[10] * z + m[14]);
      }
    }
    const tipEvidence = tipSamples.map((tip) => {
      const target = new Vector3(...tip.point).applyMatrix4(
          new Matrix4().fromArray(matrices[tip.joint]),
        ),
        current = new Vector3().fromArray(skinned, tip.vertex * 3),
        radius = current.distanceTo(target);
      return {
        name: tip.name,
        bindRadius: tip.bindRadius,
        posedRadius: radius,
        radiusError: Math.abs(radius - tip.bindRadius),
      };
    });
    const maxTipAttachmentRadiusError = Math.max(
      ...tipEvidence.map((t) => t.radiusError),
    );
    const ratios = new Float64Array(keys.length);
    let n = 0,
      last = -1,
      max = 0,
      worst,
      degenerate = 0;
    for (const key of keys) {
      if (key === last) continue;
      last = key;
      const a = Math.floor(key / count),
        b = key - a * count,
        bind = Math.hypot(
          p[a * 3] - p[b * 3],
          p[a * 3 + 1] - p[b * 3 + 1],
          p[a * 3 + 2] - p[b * 3 + 2],
        );
      if (bind <= 1e-12) {
        degenerate++;
        continue;
      }
      const current = Math.hypot(
          skinned[a * 3] - skinned[b * 3],
          skinned[a * 3 + 1] - skinned[b * 3 + 1],
          skinned[a * 3 + 2] - skinned[b * 3 + 2],
        ),
        ratio = current / bind;
      ratios[n++] = ratio;
      if (ratio > max) {
        max = ratio;
        worst = {
          a,
          b,
          bindLength: bind,
          posedLength: current,
          positionA: [...p.slice(a * 3, a * 3 + 3)],
          positionB: [...p.slice(b * 3, b * 3 + 3)],
          jointsA: [...ids.slice(a * 4, a * 4 + 4)].map((k) =>
            joints[k].getName(),
          ),
          weightsA: [...weights.slice(a * 4, a * 4 + 4)],
          jointsB: [...ids.slice(b * 4, b * 4 + 4)].map((k) =>
            joints[k].getName(),
          ),
          weightsB: [...weights.slice(b * 4, b * 4 + 4)],
        };
      }
    }
    const sorted = ratios.subarray(0, n).sort(),
      q999 = sorted[Math.ceil(n * 0.999) - 1];
    poses.push({
      strength,
      uniqueNondegenerateEdges: n,
      degenerateEdges: degenerate,
      p999EdgeStretch: q999,
      maxEdgeStretch: max,
      maxTipAttachmentRadiusError,
      tipEvidence,
      passed: q999 <= 1.5 && max <= 2 && maxTipAttachmentRadiusError <= 0.003,
      worst,
    });
  }
  reports.push({
    hero,
    rigSha256: createHash("sha256")
      .update(await fs.readFile(`assets/rigged/${hero}-C0-rigged.glb`))
      .digest("hex"),
    passed: poses.every((p) => p.passed),
    poses,
  });
  console.log(
    hero,
    poses.map((p) => ({
      strength: p.strength,
      p999: p.p999EdgeStretch,
      max: p.maxEdgeStretch,
      passed: p.passed,
    })),
  );
}
await fs.writeFile(
  "docs/rig-audit/skin-strain.json",
  JSON.stringify(
    {
      passed: reports.every((r) => r.passed),
      scope:
        "Static open/closed diagnostic hand poses on full original source topology, not full animation acceptance",
      thresholds: { p999: 1.5, max: 2, tipAttachmentRadiusErrorMeters: 0.003 },
      reports,
    },
    null,
    2,
  ) + "\n",
);
if (reports.some((r) => !r.passed)) process.exitCode = 1;
