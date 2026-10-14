import * as THREE from "three";
import { HEROES } from "./data.js";
export function costumeColor(hero, costume = 0) {
  return new THREE.Color(HEROES[hero].color)
    .offsetHSL(
      costume * 0.065,
      costume === 2 ? 0.12 : 0,
      costume === 1 ? -0.12 : costume === 3 ? 0.08 : 0,
    )
    .getHex();
}
export function adorn(world, group, a) {
  const h = a.hero,
    costume = a.costume ?? 0,
    skin = a.skin ?? 0,
    color = costumeColor(h, costume),
    gold = skin === 2 ? 0xffdd84 : 0x8cb9b5;
  function part(geometry, c, x, y, z, rx = 0, ry = 0, rz = 0) {
    const m = world.mesh(geometry, c, group);
    m.position.set(x, y, z);
    m.rotation.set(rx, ry, rz);
    m.castShadow = true;
    return m;
  }
  const spike = (x, y, z, c = gold, length = 0.5) =>
    part(new THREE.ConeGeometry(0.12, length, 5), c, x, y, z);
  const wing = (x, y, z, c) => {
    const m = part(
      new THREE.ConeGeometry(0.5, 1.1, 3),
      c,
      x,
      y,
      z,
      0,
      0,
      x > 0 ? -0.8 : 0.8,
    );
    m.scale.z = 0.14;
    return m;
  };
  if (h === 0) {
    for (let i = 0; i < 4; i++)
      part(
        new THREE.SphereGeometry(0.12, 4, 3),
        color,
        Math.sin(i) * 0.38,
        1.75 + Math.cos(i) * 0.16,
        0,
      );
  }
  if (h === 1) {
    part(new THREE.BoxGeometry(1.1, 0.35, 0.55), 0x777f75, 0, 1.2, 0);
    spike(-0.4, 1.5, 0);
    spike(0.4, 1.5, 0);
  }
  if (h === 2) {
    spike(-0.18, 2.05, 0, color, 0.5);
    spike(0.18, 2.05, 0, color, 0.5);
    for (let i = 0; i < 3; i++) {
      const tail = part(
        new THREE.ConeGeometry(0.14, 0.9, 6),
        color,
        (i - 1) * 0.22,
        0.55,
        0.5,
        0.9,
        0,
        (i - 1) * 0.4,
      );
      tail.name = "tail";
    }
  }
  if (h === 3) {
    wing(-0.55, 1.3, 0.22, color);
    wing(0.55, 1.3, 0.22, color);
    spike(0, 2.07, 0, gold, 0.45);
  }
  if (h === 4) {
    part(
      new THREE.TorusGeometry(0.38, 0.055, 4, 16),
      gold,
      0,
      1.82,
      0.05,
      Math.PI / 2,
    );
    part(new THREE.CircleGeometry(0.3, 12), 0xe4fff3, -0.47, 1.1, -0.1, 0, 0.6);
  }
  if (h === 5) {
    part(new THREE.SphereGeometry(0.6, 6, 4), 0x3f7b7d, 0, 0.9, 0.24);
    part(
      new THREE.CylinderGeometry(0.42, 0.42, 0.14, 6),
      gold,
      -0.5,
      0.9,
      -0.1,
      Math.PI / 2,
    );
  }
  if (h === 6) {
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      part(
        new THREE.ConeGeometry(0.16, 0.45, 4),
        0xfa9e6f,
        Math.sin(a) * 0.3,
        1.9,
        Math.cos(a) * 0.3,
        Math.sin(a) * 0.5,
        0,
        Math.cos(a) * 0.5,
      );
    }
  }
  if (h === 7) {
    for (const side of [-1, 1]) {
      const m = part(
        new THREE.SphereGeometry(0.5, 5, 4),
        color,
        side * 0.43,
        1.2,
        0.22,
      );
      m.scale.set(0.8, 1.1, 0.15);
    }
    spike(0, 2, 0, 0xe0faff, 0.3);
  }
  if (h === 8) {
    part(
      new THREE.TorusGeometry(0.45, 0.045, 4, 16, Math.PI),
      gold,
      0.58,
      1.08,
      0,
      0,
      0,
      Math.PI / 2,
    );
    part(
      new THREE.CylinderGeometry(0.14, 0.14, 0.7, 6),
      0x444662,
      -0.18,
      1.1,
      0.35,
      0,
      0,
      0.25,
    );
  }
  if (h === 9) {
    spike(-0.19, 1.97, 0, gold, 0.3);
    spike(0.19, 1.97, 0, gold, 0.3);
    for (const side of [-1, 1])
      for (let i = 0; i < 3; i++)
        part(
          new THREE.ConeGeometry(0.03, 0.32, 4),
          0xffe2a0,
          side * 0.5,
          0.9,
          (i - 1) * 0.1,
          Math.PI / 2,
        );
  }
  if (h === 10) {
    part(new THREE.BoxGeometry(0.85, 0.13, 0.36), 0xb6b594, 0, 1, -0.35, 0.2);
    for (let i = 0; i < 5; i++)
      part(
        new THREE.CylinderGeometry(0.007, 0.007, 0.78, 3),
        0xffedb0,
        0,
        1 + (i - 2) * 0.025,
        -0.4,
        0,
        0,
        Math.PI / 2,
      );
  }
  if (h === 11) {
    part(
      new THREE.TorusGeometry(0.39, 0.08, 5, 16, Math.PI * 1.7),
      color,
      0,
      1.8,
      0.1,
      0.6,
    );
    part(new THREE.SphereGeometry(0.13, 5, 4), 0xd6b3e8, 0.38, 1.8, -0.04);
  }
  if (costume === 1) {
    const cape = part(
      new THREE.ConeGeometry(0.67, 1.2, 5),
      color,
      0,
      0.87,
      0.22,
    );
    cape.scale.z = 0.4;
  }
  if (costume === 2) {
    for (let i = 0; i < 5; i++)
      spike(
        (i - 2) * 0.1,
        2.08 + (0.2 - Math.abs(i - 2) * 0.06),
        0,
        gold,
        0.26,
      );
    part(
      new THREE.TorusGeometry(0.5, 0.05, 4, 16),
      gold,
      0,
      1.08,
      0,
      Math.PI / 2,
    );
  }
  if (costume === 3) {
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      part(
        new THREE.IcosahedronGeometry(0.1),
        new THREE.Color(HEROES[h].color).offsetHSL(i * 0.05, 0.1, 0.1).getHex(),
        Math.sin(angle) * 0.37,
        1.98,
        Math.cos(angle) * 0.37,
      );
    }
  }
  if (skin) {
    const weapon = new THREE.Group();
    weapon.position.set(0.55, 1, 0);
    group.add(weapon);
    for (let i = 0; i < (skin === 2 ? 5 : 2); i++) {
      const gem = world.mesh(
        new THREE.OctahedronGeometry(skin === 2 ? 0.12 : 0.08),
        skin === 2 ? 0xffd88a : color,
        weapon,
      );
      gem.position.set(
        Math.sin(i * 2.4) * 0.18,
        0.3 + i * 0.17,
        Math.cos(i * 2.4) * 0.18,
      );
      gem.material = world.mat(skin === 2 ? 0xffd88a : color, true);
    }
    weapon.name = "skinOrnaments";
  }
}
export function animateRig(group, a, time, dt) {
  const speed = Math.min(
    1,
    Math.hypot(
      a.x - (group.userData.lastX ?? a.x),
      a.z - (group.userData.lastZ ?? a.z),
    ) /
      Math.max(dt, 0.001) /
      4,
  );
  for (const child of group.children) {
    if (child.name === "legLeft")
      child.rotation.x = Math.sin(time * 11) * 0.55 * speed;
    if (child.name === "legRight")
      child.rotation.x = -Math.sin(time * 11) * 0.55 * speed;
    if (child.name === "tail") child.rotation.z += Math.sin(time * 4) * 0.008;
    if (child.name === "skinOrnaments") child.rotation.y = time * 0.8;
  }
  group.userData.lastX = a.x;
  group.userData.lastZ = a.z;
}
