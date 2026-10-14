import { parentPort } from "node:worker_threads";
import { encodeGraph } from "../src/systems.js";
parentPort.on("message", ({ id, data }) => {
  try {
    const { state, ...metadata } = data;
    parentPort.postMessage({
      id,
      json: JSON.stringify({ ...metadata, snapshot: encodeGraph(state) }),
    });
  } catch (e) {
    parentPort.postMessage({ id, error: e.message });
  }
});
