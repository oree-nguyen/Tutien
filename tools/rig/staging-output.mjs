import fs from "node:fs/promises";

/** Completed/hash-bound trials are immutable. Use a new directory per revision.
 * This also protects an input snapshot sharing identical local storage blocks.
 */
export async function assertUnusedStagingOutput(directory) {
  for (const name of [
    "H01-C0-rigged.glb",
    "receipt.json",
    "model-archive.json",
  ]) {
    try {
      await fs.lstat(directory + "/" + name);
    } catch (error) {
      if (error.code === "ENOENT") continue;
      throw error;
    }
    throw Error(
      "Staging output already exists; choose a new revision directory: " +
        directory +
        "/" +
        name,
    );
  }
}
