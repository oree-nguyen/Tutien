import * as T from "three";
import { groundHeight } from "./art.js";
import {
  projectSkillCast,
  previewSkillHits,
  skillIndicatorKind,
} from "./skill-projection.js";

function geometry(vertices, indices) {
  const g = new T.BufferGeometry();
  g.setAttribute("position", new T.Float32BufferAttribute(vertices, 3));
  if (indices) g.setIndex(indices);
  const uv = [];
  for (let i = 0; i < vertices.length; i += 3)
    uv.push(vertices[i], vertices[i + 2]);
  g.setAttribute("uv", new T.Float32BufferAttribute(uv, 2));
  g.computeVertexNormals();
  g.userData.groundBase = new Float32Array(vertices);
  return g;
}
function ringGeometry(radius, width = 0.035, segments = 96) {
  const v = [],
    idx = [];
  for (let i = 0; i <= segments; i++) {
    const a = (i / segments) * Math.PI * 2;
    for (const r of [Math.max(0, radius - width), radius + width])
      v.push(Math.sin(a) * r, 0, Math.cos(a) * r);
    if (i < segments) {
      const n = i * 2;
      idx.push(n, n + 1, n + 2, n + 1, n + 3, n + 2);
    }
  }
  return geometry(v, idx);
}
function material(opacity = 0.65) {
  return new T.MeshBasicMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity,
    side: T.DoubleSide,
    depthWrite: false,
    blending: T.AdditiveBlending,
  });
}
function chevrons(radial = false) {
  return new T.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: T.DoubleSide,
    blending: T.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uColor: { value: new T.Color(0x38bdf8) },
      uRadial: { value: radial ? 1 : 0 },
    },
    vertexShader:
      "varying vec2 vPosition;void main(){vPosition=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}",
    fragmentShader:
      "uniform float uTime;uniform float uRadial;uniform vec3 uColor;varying vec2 vPosition;void main(){float wave=mix(vPosition.y-abs(vPosition.x)*.65,length(vPosition),uRadial);float phase=fract(wave*1.8-uTime*1.7);float band=1.0-smoothstep(.06,.18,abs(phase-.5));float edge=smoothstep(.02,.12,abs(vPosition.x));gl_FragColor=vec4(uColor,.14+band*.55+edge*.06);}",
  });
}

export class SkillIndicatorRenderer {
  constructor(scene, skill) {
    this.scene = scene;
    this.skill = skill;
    this.kind = skillIndicatorKind(skill);
    const group = (this.group = new T.Group());
    group.name = "skillshot-guide";
    group.userData.skillKey = `${skill.shape}:${skill.range}:${skill.radius ?? 1}`;
    this.groundMeshes = [];
    this.hitRings = [];
    const add = (geo, mat, name) => {
      const mesh = new T.Mesh(geo, mat);
      mesh.name = name;
      mesh.renderOrder = 12;
      mesh.frustumCulled = false;
      group.add(mesh);
      this.groundMeshes.push(mesh);
      return mesh;
    };
    add(
      ringGeometry(Math.max(0.1, skill.range)),
      material(0.65),
      "cast-range-ring",
    );
    for (let i = 0; i < 4; i++) {
      const a = (i * Math.PI) / 2,
        r = skill.range;
      const tick = add(
        geometry(
          [
            -0.04,
            0,
            r - 0.17,
            0.04,
            0,
            r - 0.17,
            -0.04,
            0,
            r + 0.17,
            0.04,
            0,
            r + 0.17,
          ],
          [0, 1, 2, 1, 3, 2],
        ),
        material(0.9),
        "range-cardinal-" + i,
      );
      tick.rotation.y = a;
    }
    if (this.kind === "line") {
      const range = Math.max(0.2, skill.range),
        w = (skill.hitboxWidth ?? 1.8) / 2,
        tip = Math.min(0.7, range * 0.3);
      this.arrow = add(
        geometry(
          [
            -w,
            0,
            0,
            w,
            0,
            0,
            -w,
            0,
            range - tip,
            w,
            0,
            range - tip,
            0,
            0,
            range,
          ],
          [0, 1, 2, 1, 3, 2, 2, 3, 4],
        ),
        chevrons(),
        "linear-scrolling-chevrons",
      );
      this.arrow.userData.hitboxWidth = w * 2;
    } else if (this.kind === "cone") {
      const v = [0, 0, 0],
        indices = [],
        angle = ((skill.coneAngle ?? 120) * Math.PI) / 180;
      for (let i = 0; i <= 64; i++) {
        const t = -angle / 2 + (i / 64) * angle;
        v.push(Math.sin(t) * skill.range, 0, Math.cos(t) * skill.range);
        if (i < 64) indices.push(0, i + 1, i + 2);
      }
      this.fan = add(geometry(v, indices), chevrons(true), "cone-sector");
      this.fan.userData.angleDegrees = skill.coneAngle ?? 120;
      const arc = [],
        arcidx = [];
      for (let i = 0; i <= 64; i++) {
        const t = -angle / 2 + (i / 64) * angle;
        for (const r of [skill.range - 0.035, skill.range + 0.035])
          arc.push(Math.sin(t) * r, 0, Math.cos(t) * r);
        if (i < 64) {
          const n = i * 2;
          arcidx.push(n, n + 1, n + 2, n + 1, n + 3, n + 2);
        }
      }
      add(geometry(arc, arcidx), material(0.95), "cone-bright-arc");
    } else {
      this.reticle = add(
        ringGeometry(this.kind === "aoe" ? skill.radius || 1 : 0.65, 0.055),
        material(0.9),
        "area-target",
      );
      this.center = add(
        geometry(
          [-0.09, 0, -0.09, 0.09, 0, -0.09, -0.09, 0, 0.09, 0.09, 0, 0.09],
          [0, 1, 2, 1, 3, 2],
        ),
        material(0.8),
        "area-center",
      );
    }
    const lineGeo = new T.BufferGeometry();
    lineGeo.setAttribute(
      "position",
      new T.BufferAttribute(new Float32Array(33 * 3), 3),
    );
    this.link = new T.Line(
      lineGeo,
      new T.LineBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.95,
        depthWrite: false,
        blending: T.AdditiveBlending,
      }),
    );
    this.link.name =
      this.kind === "aoe" ? "parabolic-cast-arc" : "target-lock-tether";
    this.link.frustumCulled = false;
    this.link.visible = false;
    group.add(this.link);
    this.scene.add(group);
  }
  ground(mesh, actor) {
    mesh.updateMatrix();
    const base = mesh.geometry.userData.groundBase,
      pos = mesh.geometry.attributes.position;
    if (!base) return;
    this.group.updateMatrixWorld(true);
    const point = new T.Vector3(),
      inverse = new T.Matrix4().copy(mesh.matrixWorld).invert();
    for (let i = 0; i < pos.count; i++) {
      point.set(base[i * 3], 0, base[i * 3 + 2]).applyMatrix4(mesh.matrixWorld);
      point.y = groundHeight(point.x, point.z) + 0.06;
      point.applyMatrix4(inverse);
      pos.setXYZ(i, point.x, point.y, point.z);
    }
    pos.needsUpdate = true;
  }
  update(actor, skill, aim, canceled, match, time = 0) {
    const p = projectSkillCast(match, actor, skill, aim),
      g = this.group;
    g.position.set(actor.x, groundHeight(actor.x, actor.z) + 0.06, actor.z);
    g.rotation.y = Math.atan2(p.direction.x, p.direction.z);
    for (let i = 0; i < 4; i++)
      g.getObjectByName("range-cardinal-" + i).rotation.y =
        (i * Math.PI) / 2 - g.rotation.y;
    const target = this.kind === "lock" && skill.range === 0 ? actor : p.target;
    let point = this.kind === "lock" && target ? target : p.point;
    const selfPoint = this.kind === "lock" && !target;
    if (selfPoint) point = actor;
    if (this.center) {
      const world = new T.Vector3(
        point.x,
        groundHeight(point.x, point.z) + 0.06,
        point.z,
      );
      g.updateMatrixWorld(true);
      const local = g.worldToLocal(world);
      this.center.position.copy(local);
      this.reticle.position.copy(local);
    }
    this.link.visible =
      this.kind === "aoe" ||
      (this.kind === "lock" && target && target !== actor);
    if (this.link.visible) {
      const positions = this.link.geometry.attributes.position,
        world = new T.Vector3();
      g.updateMatrixWorld(true);
      for (let i = 0; i < 33; i++) {
        const t = i / 32,
          x = actor.x + (point.x - actor.x) * t,
          z = actor.z + (point.z - actor.z) * t;
        const y =
          this.kind === "aoe"
            ? groundHeight(x, z) +
              0.1 +
              1.1 * (1 - t) +
              Math.sin(Math.PI * t) *
                Math.min(2, distance2(actor, point) * 0.25)
            : groundHeight(x, z) + 0.8;
        world.set(x, y, z);
        g.worldToLocal(world);
        positions.setXYZ(i, world.x, world.y, world.z);
      }
      positions.needsUpdate = true;
    }
    const hits = previewSkillHits(match, actor, skill, p);
    while (this.hitRings.length < hits.length) {
      const mesh = new T.Mesh(ringGeometry(0.65, 0.055, 32), material(0.9));
      mesh.name = "hit-preview";
      mesh.renderOrder = 13;
      mesh.frustumCulled = false;
      g.add(mesh);
      this.hitRings.push(mesh);
      this.groundMeshes.push(mesh);
    }
    g.updateMatrixWorld(true);
    this.hitRings.forEach((ring, i) => {
      const hit = hits[i];
      ring.visible = !!hit;
      if (!hit) return;
      ring.position.copy(
        g.worldToLocal(
          new T.Vector3(hit.x, groundHeight(hit.x, hit.z) + 0.06, hit.z),
        ),
      );
    });
    for (const mesh of this.groundMeshes) {
      if (mesh.visible) this.ground(mesh, actor);
    }
    g.traverse((node) => {
      const m = node.material;
      if (!m) return;
      const color = canceled
        ? 0xef4444
        : node.name === "hit-preview"
          ? 0xff853d
          : 0x38bdf8;
      if (m.color) m.color.setHex(color);
      if (m.uniforms) {
        m.uniforms.uColor.value.setHex(color);
        m.uniforms.uTime.value = time;
      }
    });
    g.userData.canceled = canceled;
    g.userData.projectedPoint = p.point;
    g.userData.snapshotPrediction = p.snapshotPrediction;
    g.userData.hitActorIds = hits.map((a) => a.id);
    g.userData.indicatorKind = this.kind;
    return p;
  }
  dispose() {
    this.scene.remove(this.group);
    const geos = new Set(),
      mats = new Set();
    this.group.traverse((o) => {
      if (o.geometry) geos.add(o.geometry);
      if (o.material) mats.add(o.material);
    });
    for (const g of geos) g.dispose();
    for (const m of mats) m.dispose();
  }
}
const distance2 = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
