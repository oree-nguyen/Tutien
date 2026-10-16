#!/usr/bin/env python3
"""Official public Gradio clients and lossless, fail-closed GLB part packaging.

No local geometry generator or substitute assets. The active workflow is manual
Hunyuan web creation with offline GLB inspection/normalization. Legacy network
CLI commands remain opt-in; no MCP server is provided.
"""
from __future__ import annotations

import argparse
import copy
import hashlib
import inspect
import json
import os
import re
from pathlib import Path
import shutil
import struct
import subprocess
import sys
import time
from contextlib import redirect_stdout

import numpy as np

sys.path.insert(0, str(Path(__file__).parent / "tencent"))
import providers

ROOT = Path(__file__).resolve().parents[1]
SPACES = {
    "concept": "black-forest-labs/FLUX.1-schnell",
    "shape": "tencent/Hunyuan3D-2.1",
    "parts": "tencent/Hunyuan3D-Part",
}
SLOTS = ("HonCot_Dau", "HonCot_Than", "HonCot_TayTrai", "HonCot_TayPhai",
         "HonCot_ChanTrai", "HonCot_ChanPhai", "HonCot_NgoaiPhu", "HonKhi_VuKhi")
HEROES = {
    "H01": {
        "name": "Lâm Dật",
        "body": "male young adult cultivator, elegant green and white layered silk robes with gold embroidered vine and lotus borders, long dark hair tied back, jade belt, anatomically correct hands with five fingers, empty hands, no weapon, no staff, no floating accessories",
        "weapon": "Moc Tinh Truong, one isolated ornate jade-green living wood staff, twisting vines, carved gold fittings, lotus crown and jade gem, complete staff visible, no hands, no person",
    },
    "H05": {
        "name": "Tịch Dao",
        "body": "female adult serene elegant cultivator, white and pale jade-blue layered silk robes with gold cloud and crane embroidery, long dark hair, jade belt, anatomically correct hands with five fingers, empty hands, no weapon, no mirror, no floating accessories",
        "weapon": "Nguyet Linh Kinh, one isolated celestial floating mirror artifact, intricately carved crescent moon and golden cloud metal rim, transparent silvery galaxy mirror disk, whole artifact visible, no hands, no person",
    },
}


def sha(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def save_json(path: Path, value: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n")
    temporary.replace(path)


class PipelineError(RuntimeError):
    pass


def read_glb(path: Path) -> tuple[dict, bytes]:
    data = path.read_bytes()
    if len(data) < 20:
        raise PipelineError("Truncated GLB")
    magic, version, size = struct.unpack_from("<4sII", data)
    if magic != b"glTF" or version != 2 or size != len(data):
        raise PipelineError("Invalid GLB 2.0 header/length")
    offset, document, binary = 12, None, None
    while offset < size:
        if offset + 8 > size:
            raise PipelineError("Truncated chunk header")
        length, kind = struct.unpack_from("<I4s", data, offset)
        offset += 8
        if length % 4 or offset + length > size:
            raise PipelineError("Invalid chunk length/alignment")
        chunk = data[offset:offset + length]
        if kind == b"JSON" and document is None:
            document = json.loads(chunk)
        elif kind == b"BIN\x00" and binary is None:
            binary = chunk
        else:
            raise PipelineError("Unexpected or duplicate GLB chunk")
        offset += length
    if not document or binary is None or document.get("asset", {}).get("version") != "2.0":
        raise PipelineError("GLB requires JSON and embedded BIN")
    if len(document.get("buffers", [])) != 1 or document["buffers"][0].get("uri"):
        raise PipelineError("Only one embedded GLB buffer is accepted")
    if document["buffers"][0]["byteLength"] > len(binary):
        raise PipelineError("Buffer exceeds BIN chunk")
    return document, binary


def write_glb(path: Path, document: dict, binary: bytes) -> None:
    document["buffers"] = [{"byteLength": len(binary)}]
    raw = json.dumps(document, separators=(",", ":")).encode()
    raw += b" " * (-len(raw) % 4)
    binary += b"\x00" * (-len(binary) % 4)
    data = struct.pack("<4sII", b"glTF", 2, 28 + len(raw) + len(binary))
    data += struct.pack("<I4s", len(raw), b"JSON") + raw
    data += struct.pack("<I4s", len(binary), b"BIN\x00") + binary
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(data)


def view_bytes(document: dict, binary: bytes, index: int) -> bytes:
    view = document["bufferViews"][index]
    start, count = view.get("byteOffset", 0), view["byteLength"]
    if view.get("buffer", 0) != 0 or start < 0 or count < 0 or start + count > len(binary):
        raise PipelineError("BufferView outside embedded BIN")
    return binary[start:start + count]


def accessor_array(document: dict, binary: bytes, index: int) -> np.ndarray:
    a = document["accessors"][index]
    if "sparse" in a or a.get("normalized"):
        raise PipelineError("Sparse/normalized accessors need explicit conversion")
    types = {5120: "i1", 5121: "u1", 5122: "<i2", 5123: "<u2", 5125: "<u4", 5126: "<f4"}
    widths = {"SCALAR": 1, "VEC2": 2, "VEC3": 3, "VEC4": 4, "MAT4": 16}
    dtype, width = np.dtype(types[a["componentType"]]), widths[a["type"]]
    view = document["bufferViews"][a["bufferView"]]
    data = view_bytes(document, binary, a["bufferView"])
    stride = view.get("byteStride", dtype.itemsize * width)
    start, count = a.get("byteOffset", 0), a["count"]
    if count <= 0 or stride < dtype.itemsize * width or start < 0:
        raise PipelineError("Invalid accessor count/stride/offset")
    if start + (count - 1) * stride + width * dtype.itemsize > len(data):
        raise PipelineError("Accessor exceeds BufferView")
    return np.ndarray((count, width), dtype=dtype, buffer=data,
                      offset=start, strides=(stride, dtype.itemsize)).copy()


def inspect_glb(path: str, required_nodes: list[str] | None = None) -> dict:
    source = Path(path).resolve()
    document, binary = read_glb(source)
    images = []
    for i, image in enumerate(document.get("images", [])):
        if image.get("uri") or "bufferView" not in image:
            raise PipelineError("Image must be embedded, not an external/data URI")
        raw = view_bytes(document, binary, image["bufferView"])
        from PIL import Image
        import io
        with Image.open(io.BytesIO(raw)) as decoded:
            decoded.verify()
        with Image.open(io.BytesIO(raw)) as decoded:
            dimensions = list(decoded.size)
        images.append({"index": i, "sha256": sha(raw), "bytes": len(raw), "size": dimensions})
    if not images:
        raise PipelineError("No embedded image texture; vertex color is insufficient")
    triangles, channels, uv_hashes = 0, set(), []
    for mesh in document.get("meshes", []):
        for primitive in mesh.get("primitives", []):
            if primitive.get("mode", 4) != 4 or primitive.get("extensions"):
                raise PipelineError("Only uncompressed triangle primitives accepted")
            attributes = primitive.get("attributes", {})
            if "POSITION" not in attributes or "TEXCOORD_0" not in attributes:
                raise PipelineError("Every primitive requires positions and UV0")
            positions = accessor_array(document, binary, attributes["POSITION"])
            uv = accessor_array(document, binary, attributes["TEXCOORD_0"])
            if positions.shape[1] != 3 or uv.shape[1] != 2 or len(positions) != len(uv) or not np.isfinite(positions).all() or not np.isfinite(uv).all():
                raise PipelineError("Invalid positions/UV")
            uv_hashes.append(sha(uv.tobytes()))
            if "indices" in primitive:
                indices = accessor_array(document, binary, primitive["indices"]).ravel()
            else:
                indices = np.arange(len(positions))
            if len(indices) % 3 or np.any(indices >= len(positions)):
                raise PipelineError("Invalid triangle indices")
            triangles += len(indices) // 3
            material = document.get("materials", [])[primitive["material"]]
            pbr = material.get("pbrMetallicRoughness", {})
            if "baseColorTexture" not in pbr:
                raise PipelineError("Every primitive must use an actual albedo image")
            for name, info in [("albedo", pbr.get("baseColorTexture")),
                               ("metallicRoughness", pbr.get("metallicRoughnessTexture")),
                               ("normal", material.get("normalTexture")),
                               ("emissive", material.get("emissiveTexture"))]:
                if info:
                    texture = document["textures"][info["index"]]
                    if info.get("texCoord", 0) != 0 or "source" not in texture:
                        raise PipelineError("Only verified UV0 embedded textures accepted")
                    if texture["source"] >= len(images):
                        raise PipelineError("Texture references missing image")
                    channels.add(name)
    if not triangles:
        raise PipelineError("Empty mesh")
    nodes = [n.get("name", "") for n in document.get("nodes", [])]
    missing = sorted(set(required_nodes or []) - set(nodes))
    if missing:
        raise PipelineError("Missing nodes: " + ", ".join(missing))
    return {"path": str(source), "sha256": sha(source.read_bytes()), "bytes": source.stat().st_size,
            "triangles": triangles, "nodes": nodes, "images": images,
            "textureChannels": sorted(channels), "uvHashes": uv_hashes,
            "scope": "Structural GLB/UV/embedded-image validation; not final art or rig acceptance"}


def get_client(role: str, output: Path):
    if providers.active():
        with redirect_stdout(sys.stderr):
            return providers.get_client(role, output)
    from gradio_client import Client
    options = {"verbose": False, "download_files": str(output), "httpx_kwargs": {"timeout": 30},
               "analytics_enabled": False}
    token = os.environ.get("HF_TOKEN") or os.environ.get("HUGGING_FACE_HUB_TOKEN")
    if token:
        options["token" if "token" in inspect.signature(Client).parameters else "hf_token"] = token
    with redirect_stdout(sys.stderr):
        return Client(SPACES[role], **options)


def call(client, endpoint: str, values: dict, timeout: int = 900):
    schema = client.view_api(print_info=False, return_format="dict")
    definition = schema.get("named_endpoints", {}).get(endpoint)
    if endpoint == '/generation_all' and getattr(client, 'provider', None) == 'modelscope':
        endpoints = schema.get('named_endpoints', {})
        # Only the specific missing/broken texture branch permits shape fallback.
        # Queue/auth/schema errors propagate; they never switch identities.
        if definition is None and '/shape_generation' in endpoints:
            return providers.project_fallback(client, values, client.pipeline_output)
    if definition is None:
        raise PipelineError(f"Official Space does not expose {endpoint}; inspect live schema")
    parameters = definition.get("parameters", [])
    names = {p["parameter_name"] for p in parameters}
    unsupported = set(values) - names
    if unsupported:
        raise PipelineError(f"Live {endpoint} API changed; unsupported: {sorted(unsupported)}")
    required = [p["parameter_name"] for p in parameters
                if not p.get("parameter_has_default", False) and p["parameter_name"] not in values]
    if required:
        raise PipelineError(f"Live {endpoint} requires additional parameters: {required}")
    # Legacy entry points also respect the shared quota breaker. Probe/list API
    # remain usable; signing in may revalidate quota, signing out cannot evade it.
    queue_path = ROOT / "assets/tencent/queue.json"
    if queue_path.is_file() and not providers.active():
        from datetime import datetime, timezone
        from huggingface_hub import get_token
        provider = json.loads(queue_path.read_text()).get("providerBackoff", {})
        if provider.get("nextRetryAt") and datetime.fromisoformat(provider["nextRetryAt"]) > datetime.now(timezone.utc):
            auth = bool(os.environ.get("HF_TOKEN") or os.environ.get("HUGGING_FACE_HUB_TOKEN") or get_token())
            recorded_auth = provider.get("authPresent", provider.get("authEnvironmentPresent", False))
            if not (auth and not recorded_auth):
                raise PipelineError("ZeroGPU quota deferred until " + provider["nextRetryAt"] + "; no job submitted")
    with redirect_stdout(sys.stderr):
        job = client.submit(api_name=endpoint, **values)
        try:
            return job.result(timeout=max(timeout, 3600) if getattr(client, "provider", None) == "private-hunyuan21" else timeout)
        except Exception as error:
            job.cancel()
            if (endpoint == '/generation_all' and getattr(client, 'provider', None) == 'modelscope'
                    and ('NameError' in str(error) or 'texgen_worker' in str(error))
                    and '/shape_generation' in schema.get('named_endpoints', {})):
                return providers.project_fallback(client, values, client.pipeline_output)
            raise


def collect_paths(result) -> list[Path]:
    found = []
    if isinstance(result, str):
        if len(result) < 4096:
            p = Path(result)
            try:
                if p.is_file():
                    found.append(p)
            except OSError:
                pass
    elif isinstance(result, (tuple, list)):
        for value in result:
            found.extend(collect_paths(value))
    elif isinstance(result, dict):
        for key in ("value", "path", "name"):
            if key in result:
                found.extend(collect_paths(result[key]))
    return list(dict.fromkeys(found))


def probe(output: Path) -> dict:
    report = {"recordedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()), "spaces": {}, "passed": True}
    for role, name in SPACES.items():
        try:
            c = get_client(role, output / "downloads")
            schema = c.view_api(print_info=False, return_format="dict")
            report["spaces"][role] = {"space": name if not providers.active() else getattr(c, "provider", "modelscope"), "connected": True,
                                      "endpoints": list(schema.get("named_endpoints", {}))}
            save_json(output / (role + "-api.json"), schema)
        except Exception as error:
            report["passed"] = False
            report["spaces"][role] = {"space": name, "connected": False,
                                      "errorType": type(error).__name__, "error": str(error)[:500]}
    save_json(output / "connectivity.json", report)
    return report


def generate(hero: str, output: Path, seed: int = 42) -> dict:
    if hero not in HEROES:
        raise PipelineError("Supported initial heroes: H01, H05")
    output.mkdir(parents=True, exist_ok=True)
    report = {"hero": hero, "status": "running", "assets": {}, "runtimeInstalled": False,
              "spaces": SPACES, "seed": seed, "recordedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())}
    report_path = output / "run.json"
    save_json(report_path, report)
    try:
        flux = get_client("concept", output / "downloads")
        shape = get_client("shape", output / "downloads")
        parts = get_client("parts", output / "downloads")
        from gradio_client import handle_file
        for kind in ("body", "weapon"):
            destination = output / kind
            destination.mkdir(exist_ok=True)
            posture = "front view, symmetric A-pose, arms 35 degrees from body, feet apart, full body, " if kind == "body" else "isolated object, "
            prompt = posture + HEROES[hero][kind] + ", clean solid white background, Oriental fantasy xianxia style, PBR material, ultra detailed, no text, no watermark"
            save_json(destination / "prompt.json", {"hero": hero, "kind": kind, "prompt": prompt, "seed": seed})
            result = call(flux, "/infer", {"prompt": prompt, "seed": seed, "randomize_seed": False,
                                          "width": 1024, "height": 1024, "num_inference_steps": 4})
            images = [p for p in collect_paths(result) if p.suffix.lower() in (".png", ".jpg", ".webp", ".jpeg")]
            if not images:
                raise PipelineError("FLUX returned no downloadable image")
            image = destination / ("concept" + images[0].suffix.lower())
            shutil.copy2(images[0], image)
            result = call(shape, "/generation_all", {"image": handle_file(str(image)), "steps": 30,
                "octree_resolution": 256, "check_box_rembg": True})
            meshes = [p for p in collect_paths(result) if p.suffix.lower() == ".glb"]
            accepted = []
            for mesh in meshes:
                try:
                    accepted.append((mesh, inspect_glb(str(mesh))))
                except (PipelineError, KeyError, ValueError):
                    continue
            if len(accepted) != 1:
                raise PipelineError("Expected exactly one textured UV GLB from generation_all")
            mesh = destination / "textured_mesh.glb"
            shutil.copy2(accepted[0][0], mesh)
            result = call(parts, "/segment", {"mesh_path": handle_file(str(mesh)), "postprocess": True,
                                               "postprocess_threshold": 0.95, "seed": seed})
            files = collect_paths(result)
            labels = next((p for p in files if p.suffix == ".npy"), None)
            segmented = next((p for p in files if p.suffix == ".glb"), None)
            if labels is None or segmented is None:
                raise PipelineError("P3-SAM returned no label array/segmented GLB")
            shutil.copy2(labels, destination / "face_id.npy")
            shutil.copy2(segmented, destination / "segment_mesh.glb")
            # Same client session is essential: X-Part consumes server-side gr_state.
            result = call(parts, "/generate", {"mesh_path": handle_file(str(mesh)), "seed": seed})
            xpart = []
            for number, p in enumerate(collect_paths(result)):
                if p.suffix.lower() == ".glb":
                    target = destination / f"xpart-{number}-{p.name}"
                    shutil.copy2(p, target)
                    xpart.append({"path": str(target), "sha256": sha(target.read_bytes())})
            if not xpart:
                raise PipelineError("X-Part returned no decomposition mesh")
            report["assets"][kind] = {"source": inspect_glb(str(mesh)), "xpartReferenceOnly": xpart,
                "status": "awaiting-reviewed-semantic-part-map",
                "note": "X-Part geometry is not substituted for the original textured mesh."}
            save_json(report_path, report)
        report["status"] = "awaiting-reviewed-semantic-part-map"
    except Exception as error:
        report.update(status="blocked", errorType=type(error).__name__, error=str(error)[:600])
    save_json(report_path, report)
    return report


def normalize(source: Path, segmented: Path, label_file: Path, mapping_file: Path, output: Path) -> dict:
    """Cut original indexed faces, retaining all original image/UV bytes exactly.

    Map JSON contains reviewed label->slot names and source-space joint pivots.
    Reject topology changes, nonidentity source transforms and ambiguous labels.
    """
    before = inspect_glb(str(source))
    document, binary = read_glb(source)
    if document.get("skins") or document.get("animations"):
        raise PipelineError("Rigged input requires a dedicated skin-preserving path")
    mesh_nodes = [n for n in document.get("nodes", []) if "mesh" in n]
    if len(mesh_nodes) != 1 or len(document.get("meshes", [])) != 1:
        raise PipelineError("Normalize currently requires one generated mesh node")
    for node in document.get("nodes", []):
        if (node.get("matrix", [1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]) != [1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]
            or node.get("translation", [0,0,0]) != [0,0,0] or node.get("rotation", [0,0,0,1]) != [0,0,0,1]
            or node.get("scale", [1,1,1]) != [1,1,1]):
            raise PipelineError("Nonidentity input transforms need explicit verified coordinate mapping")
    import trimesh
    seg = trimesh.load(str(segmented), force="mesh", process=False)
    labels = np.load(label_file, allow_pickle=False).reshape(-1)
    if len(labels) != len(seg.faces) or not np.issubdtype(labels.dtype, np.integer):
        raise PipelineError("Segmentation face labels do not match triangle count")
    mapping = json.loads(mapping_file.read_text())
    if mapping.get("sourceSha256") != before["sha256"] or mapping.get("reviewed") is not True:
        raise PipelineError("Semantic map requires explicit review and exact source SHA")
    category = mapping.get("category", "hero")
    if category not in {"hero", "weapon", "bone", "external-bone", "soul-ring", "beast", "mutant-beast", "boss", "environment-prop", "terrain", "world-prop", "effect-carrier", "shader-surface"}:
        raise PipelineError("Unknown catalog asset category")
    node_names = mapping.get("nodes", list(SLOTS))
    if (not isinstance(node_names, list) or not node_names or len(set(node_names)) != len(node_names)
        or any(not isinstance(n, str) or not re.fullmatch(r"[A-Za-z][A-Za-z0-9_]{0,79}", n) for n in node_names)):
        raise PipelineError("Semantic node names must be unique nonempty identifiers")
    if category == "hero" and node_names != list(SLOTS):
        raise PipelineError("Hero normalization must retain all eight equipment nodes")
    assignments = mapping["labels"]
    pivots = mapping["pivots"]
    if set(assignments.values()) - set(node_names):
        raise PipelineError("Unknown equipment slot")
    if set(map(str, np.unique(labels))) - set(assignments):
        raise PipelineError("Every segmentation label, including -1, needs an explicit assignment")
    def triangle_key(vertices):
        return tuple(sorted(tuple(np.round(v, 6)) for v in vertices))
    label_by_triangle = {}
    for triangle, label in zip(seg.vertices[seg.faces], labels):
        key = triangle_key(triangle)
        if key in label_by_triangle and label_by_triangle[key] != int(label):
            raise PipelineError("Ambiguous duplicate segmented triangle")
        label_by_triangle[key] = int(label)
    grouped = {name: [] for name in node_names}
    original_faces = 0
    for primitive in document["meshes"][0]["primitives"]:
        points = accessor_array(document, binary, primitive["attributes"]["POSITION"])
        indices = (accessor_array(document, binary, primitive["indices"]).ravel()
                   if "indices" in primitive else np.arange(len(points))).reshape(-1, 3)
        selections = {}
        for face in indices:
            label = label_by_triangle.get(triangle_key(points[face]))
            if label is None:
                raise PipelineError("P3-SAM changed geometry; refusing guessed UV transfer")
            selections.setdefault(assignments[str(label)], []).append(face)
        original_faces += len(indices)
        for name, selected in selections.items():
            binary += b"\x00" * (-len(binary) % 4)
            values = np.array(selected, dtype="<u4").ravel()
            offset = len(binary)
            binary += values.tobytes()
            view_index = len(document.setdefault("bufferViews", []))
            document["bufferViews"].append({"buffer": 0, "byteOffset": offset,
                                           "byteLength": values.nbytes, "target": 34963})
            accessor_index = len(document["accessors"])
            document["accessors"].append({"bufferView": view_index, "componentType": 5125,
                                          "count": len(values), "type": "SCALAR"})
            p = copy.deepcopy(primitive)
            p["indices"] = accessor_index
            grouped[name].append(p)
    if original_faces != len(labels):
        raise PipelineError("P3-SAM changed face count; refusing guessed UV transfer")
    required = mapping.get("requiredSlots", list(SLOTS[:6]) if category == "hero" else node_names)
    if category == "hero" and not set(SLOTS[:6]).issubset(required):
        raise PipelineError("Hero requires all six nonempty anatomical regions")
    if not required or set(required) - set(node_names) or any(not grouped[n] for n in required):
        raise PipelineError("Required semantic body/weapon part has no original faces")
    document["meshes"], document["nodes"] = [], [{"name": "HonGioi_Tencent_Asset", "children": []}]
    for name in node_names:
        pivot = pivots.get(name)
        if pivot is None or len(pivot) != 3 or not np.isfinite(pivot).all():
            raise PipelineError("A finite source-space joint origin is required for every slot")
        index = len(document["nodes"])
        document["nodes"][0]["children"].append(index)
        node = {"name": name, "translation": pivot, "extras": {"hasGeometry": bool(grouped[name])}}
        document["nodes"].append(node)
        if grouped[name]:
            mesh_index = len(document["meshes"])
            document["meshes"].append({"name": name + "_OriginalUV", "primitives": grouped[name]})
            node["children"] = [len(document["nodes"])]
            document["nodes"].append({"name": name + "_Surface", "mesh": mesh_index,
                                      "translation": [-float(v) for v in pivot]})
    document["scenes"], document["scene"] = [{"nodes": [0]}], 0
    document.setdefault("asset", {})["extras"] = {"sourceSha256": before["sha256"],
        "processing": "Original mesh faces; segmentation labels; reviewed semantic map",
        "provenance": "Source origin must be verified separately against the actual remote generation run",
        "uvTransfer": "None: original attribute accessors and image buffers retained byte-for-byte",
        "assetCategory": category, "validationRequiredNodes": node_names}
    candidate = output.with_suffix(".candidate.glb")
    write_glb(candidate, document, binary)
    after = inspect_glb(str(candidate), node_names)
    if ([i["sha256"] for i in before["images"]] != [i["sha256"] for i in after["images"]]
        or set(before["uvHashes"]) != set(after["uvHashes"]) or after["triangles"] != original_faces):
        raise PipelineError("UV/image/face preservation verification failed")
    blender_report = output.with_suffix(".blender.json")
    result = subprocess.run(["blender", "--background", "--factory-startup", "--python-exit-code", "1",
        "--python", str(ROOT / "tools/tencent/blender_validate.py"), "--", str(candidate), str(blender_report)],
        capture_output=True, text=True, timeout=180)
    if result.returncode != 0 or not blender_report.is_file():
        raise PipelineError("Blender import validation failed: " + result.stderr[-1000:])
    imported = json.loads(blender_report.read_text())
    if not imported.get("passed"):
        raise PipelineError("Blender did not retain all required nodes/UV/image materials")
    candidate.replace(output)
    report = {"passed": True, "before": before, "after": inspect_glb(str(output), node_names),
              "blender": imported, "runtimeInstalled": False, "visualReviewRequired": True}
    save_json(output.with_suffix(".validation.json"), report)
    return report


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest="command", required=True)
    p = commands.add_parser("probe")
    p.add_argument("--output", type=Path, default=ROOT / ".local/tencent-3d/probe")
    p = commands.add_parser("generate")
    p.add_argument("hero", choices=HEROES)
    p.add_argument("--output", type=Path)
    p.add_argument("--seed", type=int, default=42)
    p = commands.add_parser("inspect")
    p.add_argument("path")
    p = commands.add_parser("normalize")
    for name in ("source", "segmented", "labels", "mapping", "output"):
        p.add_argument(name, type=Path)
    args = parser.parse_args()
    try:
        if args.command == "probe":
            result = probe(args.output)
            code = 0 if result["passed"] else 2
        elif args.command == "generate":
            result = generate(args.hero, args.output or ROOT / ".local/tencent-3d" / args.hero, args.seed)
            code = 2 if result["status"] == "blocked" else 3
        elif args.command == "inspect":
            result, code = inspect_glb(args.path), 0
        else:
            result = normalize(args.source, args.segmented, args.labels, args.mapping, args.output)
            code = 0
        print(json.dumps(result, ensure_ascii=False, indent=2))
        return code
    except Exception as error:
        print(json.dumps({"passed": False, "errorType": type(error).__name__, "error": str(error)[:1000]}), file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
