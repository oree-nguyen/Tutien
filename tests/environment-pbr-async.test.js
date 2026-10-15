import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import vm from "node:vm";
import { transform } from "esbuild";
import * as THREE from "three";
import {
  BIOME_SURFACES,
  BiomePBRManager,
  biomePBRWorkerSource,
  generateBiomeTextureSet,
  rasterBiomePixels,
} from "../src/environment-pbr.js";

const KEYS = ["albedo", "normal", "roughnessHeight", "emissive"];
const hash = (data) => createHash("sha256").update(data).digest("hex");
const renderer = (anisotropy) => ({
  capabilities: { getMaxAnisotropy: () => anisotropy },
});

function transferResponse(request) {
  const pixels = rasterBiomePixels(request.biome, request.size, request.spec);
  const buffers = Object.fromEntries(
    KEYS.map((key) => [key, pixels[key].buffer]),
  );
  const message = structuredClone(
    { id: request.id, biome: request.biome, size: request.size, buffers },
    { transfer: Object.values(buffers) },
  );
  assert.ok(
    Object.values(buffers).every((buffer) => buffer.byteLength === 0),
    "all4 worker-side buffers were transferred, not copied",
  );
  return message;
}

class ControlledWorker {
  constructor(url) {
    this.url = url;
    this.requests = [];
    this.sent = [];
    this.terminated = false;
  }
  postMessage(request) {
    assert.equal(this.terminated, false);
    this.requests.push(request);
    this.sent.push(request);
  }
  finish() {
    const request = this.requests.shift();
    assert.ok(request, "a worker request exists");
    this.onmessage?.({ data: transferResponse(request) });
  }
  terminate() {
    this.terminated = true;
  }
}

function fixture(options = {}) {
  const workers = [],
    splatmap = new THREE.Texture();
  const manager = new BiomePBRManager({
    splatmap,
    textureSize: 32,
    renderer: renderer(8),
    workerFactory: (url) => {
      const worker = new ControlledWorker(url);
      workers.push(worker);
      return worker;
    },
    ...options,
  });
  return {
    manager,
    workers,
    dispose() {
      manager.dispose();
      splatmap.dispose();
    },
  };
}

test("offline Blob worker produces byte-identical four-channel PBR pixels for every biome", async () => {
  const replies = [];
  const context = vm.createContext({
    self: {
      postMessage(message, transfer = []) {
        assert.equal(transfer.length, message.error ? 0 : 4);
        assert.equal(new Set(transfer).size, message.error ? 0 : 4);
        replies.push(structuredClone(message, { transfer }));
      },
    },
  });
  const source = biomePBRWorkerSource();
  assert.doesNotMatch(source, /importScripts|new Worker|https?:\/\//);
  vm.runInContext(source, context);
  for (let biome = 0; biome < 7; biome++) {
    context.self.onmessage({
      data: { id: biome + 1, biome, size: 64, spec: BIOME_SURFACES[biome] },
    });
    const reply = replies.at(-1),
      direct = generateBiomeTextureSet(biome, { size: 64 });
    try {
      assert.equal(reply.id, biome + 1);
      assert.equal(reply.error, undefined);
      for (const key of KEYS)
        assert.equal(
          hash(new Uint8Array(reply.buffers[key])),
          hash(direct[key].image.data),
          `${biome}:${key}`,
        );
    } finally {
      direct.dispose();
    }
  }
  context.self.onmessage({ data: { id: 100, biome: 7, size: 64 } });
  assert.match(replies.at(-1).error, /Invalid biome/);
});

test("raster serialization remains self-contained after production minification", async () => {
  const result = await transform(
    `globalThis.exportedRaster = ${rasterBiomePixels.toString()}`,
    { minify: true, target: "es2020" },
  );
  const context = vm.createContext({});
  vm.runInContext(result.code, context);
  const minifiedFunction = context.exportedRaster.toString();
  const isolated = vm.runInNewContext(`(${minifiedFunction})`);
  for (const biome of [0, 2, 4, 6]) {
    const generated = isolated(biome, 32, BIOME_SURFACES[biome]);
    const original = rasterBiomePixels(biome, 32, BIOME_SURFACES[biome]);
    for (const key of KEYS)
      assert.equal(hash(generated[key]), hash(original[key]));
  }
});

test("all7 inactive browser biomes keep distinct real low PBR maps while high baking is asynchronous", () => {
  const f = fixture({ textureSize: 2048 });
  try {
    const { manager } = f;
    assert.equal(manager.stats().lowFallbackBiomes, 7);
    assert.equal(manager.stats().lowFallbackMaps, 28);
    assert.equal(manager.stats().lowFallbackResolution, 128);
    assert.equal(manager.stats().lowFallbackBytes, 7 * 128 * 128 * 16);
    assert.equal(manager.stats().highBudgetBytes, 64 * 1024 * 1024);
    assert.equal(
      new Set(manager.lowFallbacks.map((set) => hash(set.albedo.image.data)))
        .size,
      7,
    );
    assert.equal(
      new Set(manager.lowFallbacks.map((set) => hash(set.normal.image.data)))
        .size,
      7,
    );
    for (let biome = 0; biome < 7; biome++) {
      const set = manager.lowFallbacks[biome],
        material = manager.materials[biome];
      assert.equal(material.normalMap, set.normal);
      assert.equal(material.roughnessMap, set.roughnessHeight);
      assert.equal(material.emissiveMap, set.emissive);
      assert.equal(
        material.userData.biomePBR.uniforms.uBiomeAlbedo.value,
        set.albedo,
      );
      assert.equal(material.userData.biomePBR.fallback, true);
      for (const key of KEYS) {
        assert.equal(set[key].image.width, 128);
        assert.equal(set[key].repeat.x, 24);
        assert.equal(set[key].anisotropy, 8);
      }
    }
    const originalSin = Math.sin;
    let rasterSinCalls = 0;
    Math.sin = (...args) => {
      rasterSinCalls++;
      return originalSin(...args);
    };
    try {
      for (let biome = 0; biome < 7; biome++)
        manager.update({ x: biome, z: biome }, () => biome, true);
    } finally {
      Math.sin = originalSin;
    }
    assert.equal(
      rasterSinCalls,
      0,
      "update never invokes the expensive texture raster on the main thread",
    );
    assert.equal(manager.cache.size, 0);
    assert.equal(manager.generated, 0);
    assert.equal(f.workers.length, 1);
    assert.equal(f.workers[0].sent.length, 1);
    assert.equal(manager.stats().pendingJobs, 1);
    assert.ok(manager.stats().queuedBiomes.length <= 1);
    assert.equal(f.workers[0].sent[0].size, 2048);
    assert.equal(f.workers[0].sent[0].spec, BIOME_SURFACES[0]);
  } finally {
    f.dispose();
  }
});

test("rapid biome changes coalesce to the newest desired job and discard stale transferred buffers", async () => {
  const f = fixture();
  try {
    const m = f.manager;
    m.activate([0]);
    const worker = f.workers[0];
    const code = await (await fetch(worker.url)).text();
    assert.match(code, /self.onmessage/);
    assert.doesNotMatch(code, /importScripts|https?:\/\//);
    for (const biome of [1, 4, 3, 2, 6]) {
      m.activate([biome]);
      assert.equal(worker.requests.length, 1);
      assert.equal(m.stats().pendingJobs, 1);
      assert.ok(m.queue.length <= 1);
    }
    assert.deepEqual(m.active, [6]);
    worker.finish();
    assert.equal(m.generated, 0);
    assert.equal(m.staleResults, 1);
    assert.deepEqual(
      worker.requests.map((request) => request.biome),
      [6],
    );
    worker.finish();
    assert.equal(m.generated, 1);
    assert.equal(m.cache.size, 1);
    assert.ok(m.cache.has(6));
    assert.equal(m.pending, null);
    assert.deepEqual(m.queue, []);
    assert.equal(f.workers.length, 1);
    assert.equal(m.materials[6].normalMap, m.cache.get(6).normal);
    assert.equal(m.materials[0].normalMap, m.lowFallbacks[0].normal);
  } finally {
    f.dispose();
  }
});

test("ultra queues at most2 biomes and reducing quality preserves its current high set", () => {
  const f = fixture({ quality: "ultra" });
  try {
    const m = f.manager;
    m.activate([0, 1, 2]);
    assert.deepEqual(m.active, [0, 1]);
    assert.equal(m.pending.biome, 0);
    assert.deepEqual(m.queue, [1]);
    f.workers[0].finish();
    const kept = m.cache.get(0);
    assert.equal(m.pending.biome, 1);
    m.setQuality("balanced");
    assert.deepEqual(m.active, [0]);
    f.workers[0].finish();
    assert.equal(m.cache.size, 1);
    assert.equal(m.cache.get(0), kept);
    assert.equal(m.staleResults, 1);
    assert.equal(m.materials[1].normalMap, m.lowFallbacks[1].normal);
    m.setQuality("ultra");
    m.activate([0, 6]);
    f.workers[0].finish();
    assert.equal(m.cache.size, 2);
    assert.equal(m.stats().bytesWithoutMipmaps, 2 * 32 * 32 * 16);
    assert.ok(m.stats().bytesWithoutMipmaps <= m.stats().highBudgetBytes);
    assert.equal(
      m.stats().totalBytesWithoutMipmaps,
      m.stats().bytesWithoutMipmaps + m.stats().lowFallbackBytes,
    );
  } finally {
    f.dispose();
  }
});

test("renderer anisotropy changes affect fallback maps and a high set whose worker is still pending", () => {
  const f = fixture();
  try {
    const m = f.manager;
    m.activate([3]);
    m.configureRenderer(renderer(16));
    f.workers[0].finish();
    for (const set of [...m.lowFallbacks, ...m.cache.values()])
      for (const key of KEYS) assert.equal(set[key].anisotropy, 16);
    assert.equal(m.stats().anisotropy, 16);
  } finally {
    f.dispose();
  }
});

test("leaving gameplay terminates pending work, revokes Blob URL, and a late old callback cannot resurrect textures", async () => {
  const f = fixture();
  try {
    const m = f.manager;
    m.activate([4]);
    const worker = f.workers[0],
      late = worker.onmessage,
      request = worker.requests[0];
    m.update(null, () => 4, false);
    assert.equal(worker.terminated, true);
    assert.equal(m.worker, null);
    assert.equal(m.workerURL, null);
    assert.equal(m.pending, null);
    assert.deepEqual(m.queue, []);
    await assert.rejects(fetch(worker.url));
    late({ data: transferResponse(request) });
    assert.equal(m.cache.size, 0);
    assert.equal(m.generated, 0);
    assert.ok(
      m.materials.every(
        (material, biome) =>
          material.normalMap === m.lowFallbacks[biome].normal,
      ),
    );
    m.activate([2]);
    assert.equal(f.workers.length, 2);
    f.workers[1].finish();
    assert.ok(m.cache.has(2));
  } finally {
    f.dispose();
  }
});

test("worker construction failure keeps low physical detail and never starts a blocking high bake", () => {
  const f = fixture({
    workerFactory() {
      throw Error("CSP blocked Blob worker");
    },
  });
  try {
    const m = f.manager;
    m.activate([0]);
    assert.equal(m.pending, null);
    assert.deepEqual(m.queue, []);
    assert.equal(m.cache.size, 0);
    assert.equal(m.workerErrors, 1);
    assert.match(m.workerError, /CSP/);
    assert.equal(m.workerURL, null);
    m.activate([4]);
    assert.equal(m.workerErrors, 1);
    assert.equal(m.generated, 0);
    assert.equal(m.materials[4].normalMap, m.lowFallbacks[4].normal);
  } finally {
    f.dispose();
  }
});

test("worker error / malformed transfer / timeout clear pending state and preserve actual fallback maps", async () => {
  for (const fault of ["error", "malformed", "timeout"]) {
    const f = fixture({ workerTimeoutMs: 10 });
    try {
      const m = f.manager;
      m.activate([5]);
      const worker = f.workers[0];
      if (fault === "error")
        worker.onerror({ message: "worker crashed", preventDefault() {} });
      if (fault === "malformed")
        worker.onmessage({
          data: { id: m.pending.id, biome: 5, size: 32, buffers: {} },
        });
      if (fault === "timeout")
        await new Promise((resolve) => setTimeout(resolve, 25));
      assert.equal(m.pending, null, fault);
      assert.equal(worker.terminated, true, fault);
      assert.equal(m.workerErrors, 1, fault);
      assert.equal(m.generated, 0, fault);
      assert.equal(m.cache.size, 0, fault);
      assert.equal(
        m.materials[5].emissiveMap,
        m.lowFallbacks[5].emissive,
        fault,
      );
      assert.equal(m.materials[5].normalMap, m.lowFallbacks[5].normal, fault);
    } finally {
      f.dispose();
    }
  }
});

test("dispose releases high+all28 low textures exactly once and prevents subsequent work", () => {
  const f = fixture();
  const m = f.manager;
  m.activate([6]);
  f.workers[0].finish();
  const sets = [...m.lowFallbacks, ...m.cache.values()];
  let events = 0;
  for (const set of sets)
    for (const key of KEYS)
      set[key].addEventListener("dispose", () => events++);
  m.dispose();
  m.dispose();
  assert.equal(events, 32);
  assert.ok(sets.every((set) => set.disposed));
  assert.equal(m.cache.size, 0);
  assert.equal(m.worker, null);
  m.activate([4]);
  m.update({ x: 0, z: 0 }, () => 3);
  assert.equal(f.workers.length, 1);
  f.dispose();
});
