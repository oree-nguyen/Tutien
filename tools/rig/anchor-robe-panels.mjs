import fs from "node:fs/promises";
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS),
  doc = await io.read("assets/rigged/H01-C0-robe-panels-diagnostic.glb");
for (const node of doc
  .getRoot()
  .listNodes()
  .filter((n) => /H01_Ao_Vat(Trai|Phai)$/.test(n.getName()))) {
  const hip = node
    .getSkin()
    .listJoints()
    .findIndex((j) => j.getName() === "Hips");
  if (hip < 0) throw Error("Missing hip joint");
  for (const p of node.getMesh().listPrimitives()) {
    const ids = p.getAttribute("JOINTS_0").getArray(),
      weights = p.getAttribute("WEIGHTS_0").getArray();
    for (let i = 0; i < ids.length; i += 4) {
      ids[i] = hip;
      ids[i + 1] = ids[i + 2] = ids[i + 3] = 0;
      weights[i] = 1;
      weights[i + 1] = weights[i + 2] = weights[i + 3] = 0;
    }
  }
}
await fs.mkdir(".local/rig-candidates/panel-anchored", { recursive: true });
await io.write(".local/rig-candidates/panel-anchored/H01-C0-rigged.glb", doc);
