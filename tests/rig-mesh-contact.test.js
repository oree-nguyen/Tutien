import test from "node:test";
import assert from "node:assert/strict";
import { Vector3 } from "three";
import { MeshContact } from "../tools/rig/mesh-contact.mjs";

const positions = new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1]);
const indices = new Uint32Array([0, 2, 1, 0, 1, 3, 0, 3, 2, 1, 2, 3]);
test("source triangle contact distinguishes interior, exterior and surface without mutating source arrays", () => {
  const beforePositions = positions.slice(),
    beforeIndices = indices.slice(),
    mesh = new MeshContact(positions, indices);
  try {
    const inside = mesh.distance(new Vector3(0.1, 0.1, 0.1), { parity: true });
    assert.equal(inside.inside, true);
    assert.equal(inside.ambiguous, false);
    assert.ok(Math.abs(inside.signedDistance + 0.1) < 1e-7);
    const outside = mesh.distance(new Vector3(1, 1, 1), { parity: true });
    assert.equal(outside.inside, false);
    assert.equal(outside.ambiguous, false);
    assert.ok(Math.abs(outside.signedDistance - 2 / Math.sqrt(3)) < 1e-7);
    const surface = mesh.distance(new Vector3(0.2, 0.2, 0), { parity: true });
    assert.ok(surface.distance < 1e-7);
    assert.deepEqual(positions, beforePositions);
    assert.deepEqual(indices, beforeIndices);
  } finally {
    mesh.dispose();
  }
});

test("mesh query catches a deep intrusion that a source-vertex distance-only check would miss", () => {
  const mesh = new MeshContact(positions, indices);
  try {
    const point = new Vector3(0.2, 0.2, 0.2),
      nearestVertex = Math.min(
        ...[
          new Vector3(),
          new Vector3(1, 0, 0),
          new Vector3(0, 1, 0),
          new Vector3(0, 0, 1),
        ].map((v) => v.distanceTo(point)),
      );
    const result = mesh.distance(point, { parity: true });
    assert.ok(nearestVertex > 0.3);
    assert.equal(result.inside, true);
    assert.ok(Math.abs(result.distance - 0.2) < 1e-7);
    assert.deepEqual(result.votes, [true, true, true]);
  } finally {
    mesh.dispose();
  }
});

test("adaptive contact detects triangle interior crossing when all three vertices are outside", async () => {
  const { verifyContactSurface } = await import(
    "../tools/rig/contact-surface.mjs"
  );
  const points = [
      new Vector3(-0.2, -0.2, 0.2),
      new Vector3(1.4, -0.2, 0.2),
      new Vector3(-0.2, 1.4, 0.2),
    ],
    mesh = new MeshContact(positions, indices),
    hand = {
      primitive: {
        getIndices: () => ({ getArray: () => new Uint32Array([0, 1, 2]) }),
      },
      mask: new Uint8Array([1, 1, 1]),
      position: (i) => points[i].clone(),
    };
  try {
    assert.ok(
      points.every((point) => !mesh.distance(point, { parity: true }).inside),
    );
    const result = verifyContactSurface(mesh, hand, (p) => p, { limit: 0.003 });
    assert.equal(result.passed, false);
    assert.ok(result.maximumSampledIntrusion > 0.003);
  } finally {
    mesh.dispose();
  }
});

test("unresolved triangle bounds reject instead of accepting an outside center as proof", async () => {
  const { verifyContactSurface } = await import(
    "../tools/rig/contact-surface.mjs"
  );
  const points = [
      new Vector3(0.1, 0.1, -0.001),
      new Vector3(0.2, 0.1, -0.001),
      new Vector3(0.1, 0.2, -0.001),
    ],
    mesh = new MeshContact(positions, indices),
    hand = {
      primitive: {
        getIndices: () => ({ getArray: () => new Uint32Array([0, 1, 2]) }),
      },
      mask: new Uint8Array([1, 1, 1]),
      position: (i) => points[i].clone(),
    };
  try {
    const shallow = verifyContactSurface(mesh, hand, (p) => p, {
      limit: 0.003,
      maxDepth: 0,
    });
    assert.equal(shallow.passed, false);
    assert.equal(shallow.unresolvedTriangles, 1);
    const verified = verifyContactSurface(mesh, hand, (p) => p, {
      limit: 0.003,
      maxDepth: 8,
    });
    assert.equal(verified.passed, true);
    assert.ok(verified.subdivisions > 0);
    assert.ok(verified.maximumCertifiedUpperBound <= 0.003);
  } finally {
    mesh.dispose();
  }
});

test("surface audit rejects an open or unmatched triangle chain", async () => {
  const { auditSurface } = await import("../tools/rig/audit-surface.mjs");
  assert.equal(
    auditSurface(positions, indices).closedOrientedParityChain,
    true,
  );
  assert.equal(
    auditSurface(positions, indices.slice(3)).closedOrientedParityChain,
    false,
  );
  assert.equal(
    auditSurface(positions, new Uint32Array([...indices, 0, 2, 1]))
      .closedOrientedParityChain,
    false,
  );
});
