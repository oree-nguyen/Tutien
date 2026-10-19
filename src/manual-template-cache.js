/** URL-keyed templates. Owners lease shared GPU resources until their clones detach. */
export function createManualTemplateCache(dispose) {
  const entries = new Map();
  const owners = new WeakMap();
  function unlink(entry, owner) {
    entry.owners.delete(owner);
    const leases = owners.get(owner);
    leases?.delete(entry);
    if (!leases?.size) owners.delete(owner);
  }
  function forget(entry) {
    if (entries.get(entry.url) === entry) entries.delete(entry.url);
    for (const owner of entry.owners) unlink(entry, owner);
  }
  function evict(entry) {
    if (entry.retain || entry.owners.size) return false;
    forget(entry);
    entry.promise.then(dispose).catch(() => {});
    return true;
  }
  return {
    acquire(url, load, { owner, retain = true } = {}) {
      if (!url) throw new Error('Missing manual asset URL');
      let entry = entries.get(url);
      if (!entry) {
        entry = { url, retain, owners: new Set(), promise: null };
        entry.promise = Promise.resolve().then(load).catch(error => {
          forget(entry);
          throw error;
        });
        entries.set(url, entry);
      }
      if (owner) {
        if ((typeof owner !== 'object' && typeof owner !== 'function'))
          throw new Error('Manual asset owner must be an object');
        if (!owners.has(owner)) owners.set(owner, new Set());
        owners.get(owner).add(entry);
        entry.owners.add(owner);
      }
      return entry.promise;
    },
    release(owner) {
      const leases = owners.get(owner);
      if (!leases) return;
      for (const entry of [...leases]) {
        unlink(entry, owner);
        evict(entry);
      }
    },
    releaseUrl(url, owner) {
      const entry = entries.get(url);
      if (!entry) return false;
      if (owner) unlink(entry, owner);
      return evict(entry);
    },
    metrics() {
      let referenced = 0, leases = 0;
      for (const entry of entries.values()) {
        if (entry.owners.size) referenced++;
        leases += entry.owners.size;
      }
      return { templates: entries.size, referenced, leases };
    },
  };
}
