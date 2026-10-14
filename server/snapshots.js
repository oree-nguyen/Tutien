import { Worker } from "node:worker_threads";
let worker,
  next = 1;
const jobs = new Map();
export function serializeSnapshot(data) {
  if (!worker) {
    worker = new Worker(new URL("./snapshot-worker.js", import.meta.url));
    worker.on("message", (m) => {
      const job = jobs.get(m.id);
      if (!job) return;
      jobs.delete(m.id);
      m.error ? job.reject(Error(m.error)) : job.resolve(m.json);
    });
    worker.on("error", (error) => {
      for (const job of jobs.values()) job.reject(error);
      jobs.clear();
      worker = null;
    });
    worker.unref();
  }
  return new Promise((resolve, reject) => {
    const id = next++;
    jobs.set(id, { resolve, reject });
    worker.postMessage({ id, data });
  });
}
