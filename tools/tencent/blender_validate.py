"""Import only: never rebuild, remesh, unwrap or re-encode Tencent materials."""
import json
from pathlib import Path
import sys
import bpy

source, report = sys.argv[sys.argv.index("--") + 1:]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=source)
required = ("HonCot_Dau", "HonCot_Than", "HonCot_TayTrai", "HonCot_TayPhai",
            "HonCot_ChanTrai", "HonCot_ChanPhai", "HonCot_NgoaiPhu", "HonKhi_VuKhi")
meshes = [obj for obj in bpy.data.objects if obj.type == "MESH"]
checks = {
    "allNamedSlots": all(name in bpy.data.objects for name in required),
    "nonEmptyMesh": bool(meshes),
    "uvOnEveryMesh": bool(meshes) and all(len(obj.data.uv_layers) > 0 for obj in meshes),
    "imageMaterials": bool(meshes) and all(any(
        slot.material and slot.material.use_nodes and any(
            n.type == "TEX_IMAGE" and n.image for n in slot.material.node_tree.nodes
        ) for slot in obj.material_slots) for obj in meshes),
}
Path(report).write_text(json.dumps({"passed": all(checks.values()), "checks": checks,
    "blenderVersion": bpy.app.version_string, "meshObjects": len(meshes),
    "scope": "Headless GLB import/material/node validation only; no visual acceptance or rig certification"}, indent=2))
if not all(checks.values()):
    raise RuntimeError("Tencent GLB failed Blender import validation")
