"""Local contract tests only. Fixtures are abstract triangles, never game assets."""
import asyncio
import copy
import importlib.util
import io
import json
from pathlib import Path
import struct
import sys
import tempfile
import unittest

sys.dont_write_bytecode = True

import numpy as np
from PIL import Image
import trimesh

spec = importlib.util.spec_from_file_location("tencent_pipeline", Path(__file__).parents[1] / "tencent_3d_pipeline.py")
pipeline = importlib.util.module_from_spec(spec)
spec.loader.exec_module(pipeline)


def fixture(directory):
    """Eight detached abstract triangles: no character/weapon generation."""
    vertices = np.array([[i * 2., 0., 0.] for i in range(8) for _ in range(3)], dtype="<f4")
    for i in range(8):
        vertices[i*3+1] += [1, 0, 0]
        vertices[i*3+2] += [0, 1, 0]
    faces = np.arange(24, dtype="<u4").reshape(8, 3)
    uv = np.tile([[0,0], [1,0], [0,1]], (8,1)).astype("<f4")
    pixels = Image.new("RGBA", (2,2), (51,130,72,255))
    image = io.BytesIO()
    pixels.save(image, format="PNG")
    arrays = [vertices.tobytes(), uv.tobytes(), faces.tobytes(), image.getvalue()]
    binary, views = b"", []
    for data in arrays:
        binary += b"\x00" * (-len(binary) % 4)
        views.append({"buffer":0, "byteOffset":len(binary), "byteLength":len(data)})
        binary += data
    doc = {"asset":{"version":"2.0","extras":{"fixture":True}}, "bufferViews":views,
        "accessors":[{"bufferView":0,"componentType":5126,"count":24,"type":"VEC3","min":[0,0,0],"max":[15,1,0]},
                     {"bufferView":1,"componentType":5126,"count":24,"type":"VEC2"},
                     {"bufferView":2,"componentType":5125,"count":24,"type":"SCALAR"}],
        "images":[{"bufferView":3,"mimeType":"image/png"}], "textures":[{"source":0}],
        "materials":[{"pbrMetallicRoughness":{"baseColorTexture":{"index":0},"roughnessFactor":0.6,"metallicFactor":0.1}}],
        "meshes":[{"primitives":[{"attributes":{"POSITION":0,"TEXCOORD_0":1},"indices":2,"material":0}]}],
        "nodes":[{"name":"AbstractTestTriangles","mesh":0}], "scenes":[{"nodes":[0]}], "scene":0}
    source, segmented, labels, mapping = [directory / n for n in ("source.glb","segment.glb","labels.npy","map.json")]
    pipeline.write_glb(source, doc, binary)
    trimesh.Trimesh(vertices=vertices, faces=faces, process=False).export(segmented)
    np.save(labels, np.arange(8))
    mapping.write_text(json.dumps({"reviewed":True,"sourceSha256":pipeline.sha(source.read_bytes()),
        "labels":{str(i):name for i,name in enumerate(pipeline.SLOTS)},
        "pivots":{name:[float(i*2),0.,0.] for i,name in enumerate(pipeline.SLOTS)}}))
    return source, segmented, labels, mapping


class LocalPipelineTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory(prefix="tencent-contract-")
        self.directory = Path(self.temporary.name)
        self.paths = fixture(self.directory)

    def tearDown(self):
        self.temporary.cleanup()

    def test_actual_image_uv_and_triangle_bytes(self):
        report = pipeline.inspect_glb(str(self.paths[0]))
        self.assertEqual(report["triangles"],8)
        self.assertEqual(report["images"][0]["size"],[2,2])
        self.assertEqual(report["textureChannels"],["albedo"])
        self.assertNotIn("normal",report["textureChannels"])

    def test_reject_vertex_color_or_uv_missing(self):
        for missing in ("TEXCOORD_0", "albedo"):
            doc,binary = pipeline.read_glb(self.paths[0])
            if missing == "TEXCOORD_0":
                del doc["meshes"][0]["primitives"][0]["attributes"][missing]
            else:
                del doc["materials"][0]["pbrMetallicRoughness"]["baseColorTexture"]
            p = self.directory / (missing + ".glb")
            pipeline.write_glb(p,doc,binary)
            with self.assertRaises(pipeline.PipelineError):
                pipeline.inspect_glb(str(p))

    def test_reject_external_image_and_truncated_glb(self):
        doc,binary = pipeline.read_glb(self.paths[0])
        doc["images"][0] = {"uri":"https://example.invalid/image.png"}
        p=self.directory / "external.glb"
        pipeline.write_glb(p,doc,binary)
        with self.assertRaises(pipeline.PipelineError):
            pipeline.inspect_glb(str(p))
        p.write_bytes(self.paths[0].read_bytes()[:-1])
        with self.assertRaises(pipeline.PipelineError):
            pipeline.inspect_glb(str(p))

    def test_no_claim_for_missing_named_nodes(self):
        with self.assertRaises(pipeline.PipelineError):
            pipeline.inspect_glb(str(self.paths[0]),list(pipeline.SLOTS))

    def test_lossless_original_faces_uv_images_and_blender_joint_nodes(self):
        p=self.directory / "normalized.glb"
        report=pipeline.normalize(*self.paths,p)
        self.assertTrue(report["passed"])
        self.assertTrue(report["blender"]["passed"])
        self.assertEqual(report["before"]["images"],report["after"]["images"])
        self.assertEqual(set(report["before"]["uvHashes"]),set(report["after"]["uvHashes"]))
        self.assertEqual(report["after"]["triangles"],8)
        self.assertFalse(report["runtimeInstalled"])
        doc,_=pipeline.read_glb(p)
        origins={n["name"]:n.get("translation") for n in doc["nodes"]}
        self.assertEqual(origins["HonCot_Than"],[2.,0.,0.])
        self.assertEqual(origins["HonCot_Than_Surface"],[-2.,0.,0.])

    def test_refuse_unreviewed_or_wrong_source_mapping(self):
        p=self.paths[3]
        original=json.loads(p.read_text())
        for changed in ({"reviewed":False},{"sourceSha256":"0"*64}):
            p.write_text(json.dumps({**original,**changed}))
            with self.assertRaises(pipeline.PipelineError):
                pipeline.normalize(*self.paths,self.directory/"rejected.glb")

    def test_static_prop_keeps_real_nodes_without_fake_anatomy(self):
        path=self.paths[3]
        mapping=json.loads(path.read_text())
        mapping.update(category='environment-prop',nodes=['ArtifactRoot'],requiredSlots=['ArtifactRoot'],
            labels={str(i):'ArtifactRoot' for i in range(8)},pivots={'ArtifactRoot':[0,0,0]})
        path.write_text(json.dumps(mapping))
        report=pipeline.normalize(*self.paths,self.directory/'prop.glb')
        self.assertTrue(report['blender']['passed'])
        self.assertEqual(report['blender']['requiredNodes'],['ArtifactRoot'])
        self.assertNotIn('HonCot_Dau',report['after']['nodes'])
        self.assertEqual(report['after']['triangles'],8)

    def test_hero_cannot_omit_a_required_anatomical_region(self):
        path=self.paths[3]
        mapping=json.loads(path.read_text());mapping['requiredSlots']=['HonCot_Dau']
        path.write_text(json.dumps(mapping))
        with self.assertRaisesRegex(pipeline.PipelineError,'all six'):
            pipeline.normalize(*self.paths,self.directory/'rejected.glb')

    def test_refuse_topology_change_instead_of_guessed_uv_transfer(self):
        mesh=trimesh.load(self.paths[1],force="mesh",process=False)
        mesh.vertices[0] += [0,0,.2]
        mesh.export(self.paths[1])
        with self.assertRaisesRegex(pipeline.PipelineError,"changed geometry"):
            pipeline.normalize(*self.paths,self.directory/"rejected.glb")

    def test_refuse_empty_required_part_or_unassigned_label(self):
        p=self.paths[3]
        original=json.loads(p.read_text())
        changed=copy.deepcopy(original)
        changed["labels"]["0"]="HonCot_Than"
        p.write_text(json.dumps(changed))
        with self.assertRaisesRegex(pipeline.PipelineError,"no original faces"):
            pipeline.normalize(*self.paths,self.directory/"rejected.glb")
        changed=copy.deepcopy(original)
        del changed["labels"]["7"]
        p.write_text(json.dumps(changed))
        with self.assertRaisesRegex(pipeline.PipelineError,"Every segmentation label"):
            pipeline.normalize(*self.paths,self.directory/"rejected.glb")

    def test_html_outputs_are_not_treated_as_files(self):
        self.assertEqual(pipeline.collect_paths(["<div>"+"x"*2000+"</div>","x"*5000]),[])

    def test_changed_live_api_fails_before_job_submission(self):
        class SchemaClient:
            def view_api(self, **kwargs):
                return {"named_endpoints":{"/infer":{"parameters":[{"parameter_name":"prompt","parameter_has_default":False}]}}}
            def submit(self,**kwargs):
                raise AssertionError("Invalid schema must not submit inference")
        with self.assertRaisesRegex(pipeline.PipelineError,"API changed"):
            pipeline.call(SchemaClient(),"/infer",{"steps":30})
        with self.assertRaisesRegex(pipeline.PipelineError,"additional parameters"):
            pipeline.call(SchemaClient(),"/infer",{})

    def test_stdio_mcp_server_initializes_lists_tools_and_inspects_real_fixture(self):
        async def run():
            from mcp import ClientSession, StdioServerParameters
            from mcp.client.stdio import stdio_client
            import sys
            parameters=StdioServerParameters(command=sys.executable,args=[str(pipeline.ROOT/"tools/tencent_3d_pipeline.py"),"serve"])
            async with stdio_client(parameters) as streams:
                async with ClientSession(*streams) as client:
                    await client.initialize()
                    tools=await client.list_tools()
                    self.assertEqual({t.name for t in tools.tools},{"tencent_probe","tencent_generate","tencent_inspect_glb","tencent_normalize","tencent_asset_catalog","tencent_generate_asset"})
                    result=await client.call_tool("tencent_inspect_glb",{"path":str(self.paths[0])})
                    self.assertFalse(result.is_error)
                    self.assertIn('"triangles"',result.content[0].text)
        asyncio.run(run())


if __name__=="__main__":
    unittest.main(verbosity=2)
