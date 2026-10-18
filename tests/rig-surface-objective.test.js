import test from "node:test";
import { execFileSync } from "node:child_process";
test("surface objective gradient matches finite differences, weld accumulation and normalized-weight invariance", () => {
  execFileSync("python3", ["tools/rig/test_surface_objective.py"], {
    env: { ...process.env, OPENBLAS_NUM_THREADS: "1" },
    timeout: 30000,
  });
});
