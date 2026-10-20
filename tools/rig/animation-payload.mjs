import { createHash } from "node:crypto";
import { Bone, Group, QuaternionKeyframeTrack, VectorKeyframeTrack, AnimationClip } from "three";

export const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const arrayHash = (a) => a ? sha256(new Uint8Array(a.buffer, a.byteOffset, a.byteLength)) : null;

/** Compare decoded payload bytes after export; buffer packing is allowed to differ. */
export function immutablePayload(doc) {
  return {
    meshes: doc.getRoot().listMeshes().map((mesh) => ({
      name: mesh.getName(),
      primitives: mesh.listPrimitives().map((p) => ({
        mode: p.getMode(), material: p.getMaterial()?.getName() ?? null,
        attributes: Object.fromEntries(p.listSemantics().map((s) => [s, arrayHash(p.getAttribute(s).getArray())])),
        indices: arrayHash(p.getIndices()?.getArray()),
      })),
    })),
    images: doc.getRoot().listTextures().map((t) => ({name: t.getName(), mime: t.getMimeType(), sha256: arrayHash(t.getImage())})),
    skins: doc.getRoot().listSkins().map((s) => ({joints: s.listJoints().map((j) => j.getName()), inverseBind: arrayHash(s.getInverseBindMatrices().getArray())})),
    nodes: doc.getRoot().listNodes().map((n) => ({name: n.getName(), parent: n.getParentNode()?.getName() ?? null, translation: n.getTranslation(), rotation: n.getRotation(), scale: n.getScale()})),
  };
}

export function animationSignature(animation) {
  return animation.listChannels().map((c) => ({
    node: c.getTargetNode().getName(), path: c.getTargetPath(), interpolation: c.getSampler().getInterpolation(),
    times: arrayHash(c.getSampler().getInput().getArray()), values: arrayHash(c.getSampler().getOutput().getArray()),
  }));
}

/** A separate Three hierarchy verifies runtime binding and FK without a renderer. */
export function threeRig(doc) {
  const joints = new Set(doc.getRoot().listSkins().flatMap((s) => s.listJoints()));
  const nodes = new Map(doc.getRoot().listNodes().map((n) => {
    const node = joints.has(n) ? new Bone() : new Group();
    node.name = n.getName();
    node.position.fromArray(n.getTranslation());
    node.quaternion.fromArray(n.getRotation());
    node.scale.fromArray(n.getScale());
    return [n, node];
  }));
  const root = new Group();
  for (const [source, target] of nodes)
    if (source.getParentNode()) nodes.get(source.getParentNode()).add(target);
    else root.add(target);
  const clips = doc.getRoot().listAnimations().map((a) => new AnimationClip(a.getName(), -1, a.listChannels().map((c) => {
    const sampler = c.getSampler(), path = c.getTargetPath(), name = c.getTargetNode().getName();
    const Track = path === "rotation" ? QuaternionKeyframeTrack : VectorKeyframeTrack;
    return new Track(name + "." + ({rotation:"quaternion",translation:"position",scale:"scale"}[path]), sampler.getInput().getArray(), sampler.getOutput().getArray());
  })));
  return {root, clips};
}
