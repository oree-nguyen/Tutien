import { createHash } from "node:crypto";

/** Weight edits may change file bytes without changing a pose's binding.
 * Include every ancestor/mesh transform, joint order and exact inverse binds. */
export function sourceBindIdentity(doc) {
  const skins = doc.getRoot().listSkins(),
    hash = (a) =>
      createHash("sha256")
        .update(new Uint8Array(a.buffer, a.byteOffset, a.byteLength))
        .digest("hex");
  return JSON.stringify({
    skins: skins.map((s) => ({
      joints: s.listJoints().map((n) => n.getName()),
      inverseBind: hash(s.getInverseBindMatrices().getArray()),
    })),
    nodes: doc
      .getRoot()
      .listNodes()
      .map((n) => ({
        name: n.getName(),
        parent: n.getParentNode()?.getName() ?? null,
        skin: skins.indexOf(n.getSkin()),
        mesh: doc.getRoot().listMeshes().indexOf(n.getMesh()),
        translation: n.getTranslation(),
        rotation: n.getRotation(),
        scale: n.getScale(),
      })),
  });
}
