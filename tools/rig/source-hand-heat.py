"""Reweight real source hand crops with sealed source-derived bone-heat proxies.
Only weights return to the original indexed source; no proxy geometry is exported.
The crop/blend remains diagnostic until independent mesh/contact/appearance gates.
"""

import argparse
import hashlib
import json
import shutil
import sys
import time
from pathlib import Path
import bpy
import bmesh
import numpy as np
from mathutils import Vector

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("input", type=Path)
parser.add_argument("output", type=Path)
a = parser.parse_args(sys.argv[sys.argv.index("--") + 1 :])
if (
    a.input.resolve() == a.output.resolve()
    or Path(".local/rig-candidates").resolve() not in a.output.resolve().parents
):
    raise ValueError("Use separate staging folders")
meta = json.loads((a.input / "input.json").read_text())
upstream = json.loads((a.input / "heat-solve.json").read_text())
if not upstream["weightsValid"]:
    raise ValueError("Missing parent weights")
for filename, key in [("positions.bin", "positions"), ("triangles.bin", "triangles")]:
    if (
        hashlib.sha256((a.input / filename).read_bytes()).hexdigest()
        != meta["original"][key]
    ):
        raise ValueError("Source payload changed")
p = np.fromfile(a.input / "positions.bin", "<f4").reshape(-1, 3)
blender_positions = p[:, [0, 2, 1]].copy()
blender_positions[:, 1] *= -1
tri = np.fromfile(a.input / "triangles.bin", "<u4").reshape(-1, 3)
ids = np.fromfile(a.input / "heat-ids.bin", "<u2").reshape(-1, 4)
weights = np.fromfile(a.input / "heat-weights.bin", "<f4").reshape(-1, 4)
frames = json.loads(Path("data/rig/hand-frames.json").read_text())["heroes"][
    meta["hero"]
]["hands"]
name_index = {r["name"]: i for i, r in enumerate(meta["joints"])}
started = time.monotonic()
reports = []
bpy.ops.wm.read_factory_settings(use_empty=True)
for side, frame in frames.items():
    points = np.array(
        [frame["wrist"]]
        + [point for finger in frame["fingers"].values() for point in finger["points"]]
    )
    lo = points.min(0) - 0.022
    hi = points.max(0) + 0.022
    selected = np.flatnonzero(((p >= lo) & (p <= hi)).all(1))
    remap = np.full(len(p), -1, dtype=np.int64)
    remap[selected] = np.arange(len(selected))
    faces = tri[(remap[tri] >= 0).all(1)]
    local_faces = remap[faces]
    if len(local_faces) < 100:
        raise ValueError("Empty actual source hand crop")

    def object_mesh(name, positions, faces):
        mesh = bpy.data.meshes.new(name)
        mesh.from_pydata(positions.tolist(), [], faces.tolist())
        mesh.update()
        obj = bpy.data.objects.new(name, mesh)
        bpy.context.collection.objects.link(obj)
        return obj

    target = object_mesh(
        side + "ExactSourceHand", blender_positions[selected], local_faces
    )
    scale = 100.0
    proxy = object_mesh(
        side + "SourceProxy", blender_positions[selected] * scale, local_faces
    )
    bm = bmesh.new()
    bm.from_mesh(proxy.data)
    bmesh.ops.holes_fill(bm, edges=[e for e in bm.edges if e.is_boundary], sides=0)
    bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
    bm.to_mesh(proxy.data)
    bm.free()
    bpy.context.view_layer.objects.active = proxy
    modifier = proxy.modifiers.new("SourceDerivedVoxel", "REMESH")
    modifier.mode = "VOXEL"
    modifier.voxel_size = 0.0012 * scale
    bpy.ops.object.modifier_apply(modifier=modifier.name)
    arm_data = bpy.data.armatures.new(side + "MeasuredHandRig")
    arm = bpy.data.objects.new(side + "MeasuredHandRig", arm_data)
    bpy.context.collection.objects.link(arm)
    bpy.context.view_layer.objects.active = arm
    arm.select_set(True)
    bpy.ops.object.mode_set(mode="EDIT")
    convert = lambda p: Vector((p[0], -p[2], p[1])) * scale
    root = arm_data.edit_bones.new(side + "Hand")
    root.head = convert(frame["wrist"])
    root.tail = convert(frame["fingers"]["Middle"]["points"][0])
    for finger, config in frame["fingers"].items():
        parent = root
        for k in range(3):
            bone = arm_data.edit_bones.new(side + "Hand" + finger + str(k + 1))
            bone.head = convert(config["points"][k])
            bone.tail = convert(config["points"][k + 1])
            bone.parent = parent
            parent = bone
    bpy.ops.object.mode_set(mode="OBJECT")
    bpy.ops.object.select_all(action="DESELECT")
    proxy.select_set(True)
    arm.select_set(True)
    bpy.context.view_layer.objects.active = arm
    bpy.ops.object.parent_set(type="ARMATURE_AUTO")
    arm.scale = (1 / scale,) * 3
    bpy.context.view_layer.update()
    print(
        json.dumps(
            {
                "side": side,
                "proxyVertices": len(proxy.data.vertices),
                "proxyWeightedVertices": sum(
                    any(g.weight > 0 for g in v.groups) for v in proxy.data.vertices
                ),
            }
        ),
        flush=True,
    )
    finger_names = [
        side + "Hand" + f + str(k + 1) for f in frame["fingers"] for k in range(3)
    ]
    for name in [side + "Hand"] + finger_names:
        target.vertex_groups.new(name=name)
    bpy.ops.object.select_all(action="DESELECT")
    target.select_set(True)
    bpy.context.view_layer.objects.active = target
    transfer = target.modifiers.new("ActualSourceHandTransfer", "DATA_TRANSFER")
    transfer.object = proxy
    transfer.use_vert_data = True
    transfer.data_types_verts = {"VGROUP_WEIGHTS"}
    transfer.vert_mapping = "POLYINTERP_NEAREST"
    transfer.layers_vgroup_select_src = "ALL"
    transfer.layers_vgroup_select_dst = "NAME"
    bpy.ops.object.modifier_apply(modifier=transfer.name)
    field = np.zeros((len(selected), len(meta["joints"])))
    for v in target.data.vertices:
        for group in v.groups:
            field[
                v.index, name_index[target.vertex_groups[group.group].name]
            ] += group.weight
    total = field.sum(1)
    if total.min() < 1e-10:
        raise RuntimeError(
            "Unweighted actual source hand vertices: " + str(int((total < 1e-10).sum()))
        )
    field /= total[:, None]
    longitudinal = (p[selected] - np.array(frame["wrist"])) @ np.array(frame["f"])
    blend = np.clip((longitudinal + 0.005) / 0.030, 0, 1)
    blend = blend * blend * (3 - 2 * blend)
    original = np.zeros_like(field)
    for k in range(4):
        original[np.arange(len(selected)), ids[selected, k]] += weights[selected, k]
    combined = field * blend[:, None] + original * (1 - blend[:, None])
    order = np.argsort(-combined, axis=1, kind="stable")[:, :5]
    rank = np.take_along_axis(combined, order, axis=1)
    reduced = np.maximum(rank[:, :4] - rank[:, 4, None], 0)
    total = reduced.sum(1)
    if total.min() < 1e-12:
        raise ValueError("Four-weight hand reduction singularity")
    ids[selected] = order[:, :4]
    weights[selected] = reduced / total[:, None]
    counts = {
        name: int(
            ((ids[selected] == name_index[name]) & (weights[selected] > 1e-4))
            .any(1)
            .sum()
        )
        for name in finger_names
    }
    if any(n == 0 for n in counts.values()):
        raise RuntimeError("A source finger has no influence: " + str(counts))
    reports.append(
        {
            "side": side,
            "sourceVertices": len(selected),
            "proxyVertices": len(proxy.data.vertices),
            "sourceFingerInfluenceCounts": counts,
            "blendLongitudinalMetres": [-0.005, 0.025],
            "acceptedAnatomyMask": False,
        }
    )
    print(json.dumps(reports[-1]), flush=True)
    for obj in [target, proxy, arm]:
        bpy.data.objects.remove(obj, do_unlink=True)
if (
    not np.isfinite(weights).all()
    or weights.min() < 0
    or np.max(np.abs(weights.sum(1) - 1)) > 1e-5
):
    raise ValueError("Invalid final weights")
a.output.mkdir(parents=True, exist_ok=True)
for file in ["input.json", "positions.bin", "triangles.bin"]:
    shutil.copyfile(a.input / file, a.output / file)
ids.astype("<u2").tofile(a.output / "heat-ids.bin")
weights.astype("<f4").tofile(a.output / "heat-weights.bin")
report = {
    "method": "Sealed real source-hand crops, Blender bone heat at100x numerical scale, transfer to the exact original crop, smooth wrist transition, all30source finger influences present",
    "parent": str(a.input),
    "parentSolveSha256": hashlib.sha256(
        (a.input / "heat-solve.json").read_bytes()
    ).hexdigest(),
    "hands": reports,
    "missingWeightVertices": 0,
    "weightsValid": True,
    "seconds": time.monotonic() - started,
    "accepted": False,
    "activated": False,
    "scope": "Source weight candidate only. No proxy triangles exported. Crop is diagnostic, not anatomical/contact approval; whole-mesh strain and real finger/shaft/floor contact remain mandatory.",
}
(a.output / "heat-solve.json").write_text(json.dumps(report, indent=2) + "\n")
print(json.dumps({"finished": True, "seconds": report["seconds"]}), flush=True)
