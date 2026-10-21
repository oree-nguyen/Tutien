"""Generate source-geometry bone heat weights, never transfer from a legacy skin."""

import argparse, json, sys, time
from pathlib import Path
import bpy
import bmesh
from scipy.sparse import coo_matrix
from scipy.sparse.csgraph import connected_components
import numpy as np

args = sys.argv[sys.argv.index("--") + 1 :]
parser = argparse.ArgumentParser()
parser.add_argument("directory", type=Path)
parser.add_argument("--voxel", type=float, default=0)
parser.add_argument("--body-only", action="store_true")
parser.add_argument("--largest-component", action="store_true")
a = parser.parse_args(args)
folder = a.directory
meta = json.loads((folder / "input.json").read_text())
p = np.fromfile(folder / "positions.bin", "<f4").reshape(-1, 3)
tri = np.fromfile(folder / "triangles.bin", "<u4").reshape(-1, 3)
bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)
mesh = bpy.data.meshes.new("ExactSourceSurface")
mesh.vertices.add(len(p))
mesh.vertices.foreach_set("co", p.ravel())
mesh.loops.add(tri.size)
mesh.loops.foreach_set("vertex_index", tri.ravel().astype(np.int32))
mesh.polygons.add(len(tri))
mesh.polygons.foreach_set("loop_start", np.arange(len(tri), dtype=np.int32) * 3)
mesh.polygons.foreach_set("loop_total", np.full(len(tri), 3, dtype=np.int32))
mesh.update()
obj = bpy.data.objects.new("ExactSourceSurface", mesh)
bpy.context.collection.objects.link(obj)
weighted_object = obj
component_report = None
if a.voxel:
    if not 0.001 <= a.voxel <= 0.01:
        raise ValueError("Voxel size outside diagnostic range")
    proxy = obj.copy()
    proxy.data = mesh.copy()
    proxy.name = "SourceDerivedVoxelProxy"
    bpy.context.collection.objects.link(proxy)
    bpy.context.view_layer.objects.active = proxy
    proxy.select_set(True)
    proxy.data.remesh_voxel_size = a.voxel
    bpy.ops.object.voxel_remesh()
    weighted_object = proxy
    if a.largest_component:
        count = len(proxy.data.vertices)
        edges = np.empty(len(proxy.data.edges) * 2, dtype=np.int32)
        proxy.data.edges.foreach_get("vertices", edges)
        edges = edges.reshape(-1, 2)
        graph = coo_matrix(
            (np.ones(len(edges), dtype=np.uint8), (edges[:, 0], edges[:, 1])),
            shape=(count, count),
        ).tocsr()
        n, labels = connected_components(graph, directed=False)
        sizes = np.bincount(labels)
        keep = int(sizes.argmax())
        remove = np.flatnonzero(labels != keep)
        component_report = {
            "components": int(n),
            "sizesDescending": sorted(sizes.tolist(), reverse=True),
            "removedProxyVertices": len(remove),
            "sourceVerticesRemoved": 0,
        }
        if len(remove):
            bm = bmesh.new()
            bm.from_mesh(proxy.data)
            bm.verts.ensure_lookup_table()
            bmesh.ops.delete(
                bm, geom=[bm.verts[int(i)] for i in remove], context="VERTS"
            )
            bm.to_mesh(proxy.data)
            bm.free()
            proxy.data.update()
        print(json.dumps({"sourceProxyComponents": component_report}), flush=True)
arm = bpy.data.armatures.new("SourceHumanoid")
rig = bpy.data.objects.new("SourceHumanoid", arm)
bpy.context.collection.objects.link(rig)
bpy.context.view_layer.objects.active = rig
rig.select_set(True)
bpy.ops.object.mode_set(mode="EDIT")
bones = {}
for record in meta["joints"]:
    b = arm.edit_bones.new(record["name"])
    b.head = record["head"]
    b.tail = record["tail"]
    b.use_deform = not record["name"].endswith("ForearmPronation") and not (
        a.body_only
        and any(
            "Hand" + finger in record["name"]
            for finger in ["Thumb", "Index", "Middle", "Ring", "Pinky"]
        )
    )
    bones[record["name"]] = b
for record in meta["joints"]:
    if record["parent"] in bones:
        bones[record["name"]].parent = bones[record["parent"]]
bpy.ops.object.mode_set(mode="OBJECT")
bpy.ops.object.select_all(action="DESELECT")
weighted_object.select_set(True)
rig.select_set(True)
bpy.context.view_layer.objects.active = rig
start = time.monotonic()
failure = None
try:
    bpy.ops.object.parent_set(type="ARMATURE_AUTO")
except RuntimeError as e:
    failure = str(e)
if a.voxel:
    for record in meta["joints"]:
        obj.vertex_groups.new(name=record["name"])
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    modifier = obj.modifiers.new("SourceProxyWeights", "DATA_TRANSFER")
    modifier.object = weighted_object
    modifier.use_vert_data = True
    modifier.data_types_verts = {"VGROUP_WEIGHTS"}
    modifier.vert_mapping = "POLYINTERP_NEAREST"
    modifier.layers_vgroup_select_src = "ALL"
    modifier.layers_vgroup_select_dst = "NAME"
    bpy.ops.object.modifier_apply(modifier=modifier.name)
name_to_joint = {x["name"]: i for i, x in enumerate(meta["joints"])}
groups = {
    g.index: name_to_joint[g.name] for g in obj.vertex_groups if g.name in name_to_joint
}
ids = np.zeros((len(p), 4), dtype="<u2")
weights = np.zeros((len(p), 4), dtype="<f4")
missing = 0
max_discarded = 0.0
ties = 0
for v in mesh.vertices:
    influences = sorted(
        [
            (g.weight, groups[g.group])
            for g in v.groups
            if g.group in groups and g.weight > 0
        ],
        reverse=True,
    )
    if not influences:
        missing += 1
        continue
    floor = influences[4][0] if len(influences) > 4 else 0
    top = [(max(0, w - floor), j) for w, j in influences[:4]]
    total = sum(w for w, j in top)
    if total <= 1e-12:
        ties += 1
        continue
    max_discarded = max(max_discarded, sum(w for w, j in influences[4:]))
    for k, (w, j) in enumerate(top):
        ids[v.index, k] = j
        weights[v.index, k] = w / total
ids.tofile(folder / "heat-ids.bin")
weights.tofile(folder / "heat-weights.bin")
report = {
    "solver": "Blender ARMATURE_AUTO bone heat; optional source-derived voxel proxy, never legacy donor transfer",
    "bodyOnlyHeat": a.body_only,
    "proxyComponentAnalysis": component_report,
    "voxelMetres": a.voxel,
    "proxyVertices": len(weighted_object.data.vertices),
    "seconds": time.monotonic() - start,
    "vertices": len(p),
    "triangles": len(tri),
    "joints": len(meta["joints"]),
    "missingWeightVertices": missing,
    "rankFiveSingularities": ties,
    "maximumDiscardedWeight": max_discarded,
    "error": failure,
    "weightsValid": failure is None and missing == 0 and ties == 0,
    "accepted": False,
    "activated": False,
    "scope": "Weight generation only; geometry/UV/images unchanged. Requires independent whole-animation, contact, provenance and appearance validation.",
}
(folder / "heat-solve.json").write_text(json.dumps(report, indent=2) + "\n")
print(json.dumps(report), flush=True)
if not report["weightsValid"]:
    raise SystemExit(2)
