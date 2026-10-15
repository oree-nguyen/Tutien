import { spawn } from "node:child_process";
import { createServer } from "node:net";
const children = [];
async function requireFreePort(port) {
  await new Promise((resolve, reject) => {
    const probe = createServer();
    probe.once("error", () =>
      reject(
        Error(
          `QA port ${port} is already in use; finish the previous QA run first.`,
        ),
      ),
    );
    probe.listen(port, "127.0.0.1", () => probe.close(resolve));
  });
}
async function run(command, args = [], env = {}) {
  return new Promise((resolve, reject) => {
    const p = spawn(command, args, {
      stdio: "inherit",
      env: { ...process.env, ...env },
    });
    p.on("exit", (code) =>
      code === 0 ? resolve() : reject(Error(`${command} exited ${code}`)),
    );
  });
}
function service(command, args, env) {
  const p = spawn(command, args, {
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, ...env },
  });
  p.stdout.on("data", (d) => process.stdout.write(d));
  p.stderr.on("data", (d) => process.stderr.write(d));
  children.push(p);
  return p;
}
async function wait(url) {
  for (let i = 0; i < 80; i++) {
    try {
      if ((await fetch(url)).ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 250));
  }
  throw Error("Service readiness failed: " + url);
}
try {
  await Promise.all([3101, 5175, 4175].map(requireFreePort));
  await run("npm", ["run", "services"]);
  await run("node", ["scripts/verify-goal.mjs", "--record", "rules"]);
  await run("node", ["scripts/verify-goal.mjs", "--record", "master-rules"]);
  await run("npm", ["run", "build"]);
  await run("node", ["scripts/verify-goal.mjs", "--record", "server"]);
  service("node", ["server/index.js"], {
    PORT: "3101",
    HG_RESTORE_MATCHES: "0",
    APP_ORIGINS: "http://127.0.0.1:5175,http://localhost:5175",
  });
  await wait("http://127.0.0.1:3101/api/health");
  service(
    "node",
    [
      "--input-type=module",
      "--eval",
      `import { createServer } from 'vite';
       const server = await createServer({ server: {
         host: '127.0.0.1', port: 5175, strictPort: true, hmr: false,
         watch: { ignored: ['**/android/**', '**/release/**', '**/docs/**', '**/acceptance/**', '**/test-results/**'] }
       }});
       await server.listen(); server.printUrls();`,
    ],
    { HG_API_TARGET: "http://127.0.0.1:3101" },
  );
  await wait("http://127.0.0.1:5175");
  await run("node", ["scripts/verify-goal.mjs", "--record", "browser"], {
    GAME_URL: "http://127.0.0.1:5175",
  });
  await run("node", ["scripts/verify-goal.mjs", "--record", "online-browser"], {
    GAME_URL: "http://127.0.0.1:5175",
  });
  await run("npm", ["run", "test:upgrade-ui"], {
    GAME_URL: "http://127.0.0.1:5175",
  });
  await run("npm", ["run", "test:master-ui"], {
    GAME_URL: "http://127.0.0.1:5175",
  });
  await run("npm", ["run", "test:overhaul-ui"], {
    GAME_URL: "http://127.0.0.1:5175",
  });
  service(
    "node",
    [
      "node_modules/vite/bin/vite.js",
      "preview",
      "--host",
      "127.0.0.1",
      "--port",
      "4175",
      "--strictPort",
    ],
    {},
  );
  await wait("http://127.0.0.1:4175");
  await run("node", ["scripts/verify-goal.mjs", "--record", "artifacts"], {
    GAME_URL: "http://127.0.0.1:4175",
  });
  await run("node", ["tests/timeline.mjs"]);
  await run("node", ["tests/load.mjs"]);
  console.log(
    "Automated checks completed. Run npm run verify:reuse for the full goal including physical-device evidence.",
  );
} catch (e) {
  console.error(e.message);
  process.exitCode = 1;
} finally {
  for (const p of children) p.kill("SIGTERM");
}
