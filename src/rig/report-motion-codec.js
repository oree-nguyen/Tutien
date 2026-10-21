const MAGIC = 0x4d414748;
/** Small, offline binary motion container. All mesh/texture data stays in GLB. */
export function encodeReportMotion(data) {
  const chunks = [],
    offsets = [],
    add = (values) => {
      const a = Float32Array.from(values),
        offset = offsets.reduce((n, v) => n + v, 0);
      chunks.push(a);
      offsets.push(a.length);
      return { offset, length: a.length };
    };
  const header = {
    ...data,
    curves: data.curves.map((c) => ({
      name: c.name,
      duration: c.duration,
      times: add(c.tracks[0].times),
      tracks: c.tracks.map((t) => ({
        name: t.name,
        type: t.type,
        values: add(t.values),
      })),
    })),
    weaponKeys: data.weaponKeys.map((k) => ({
      name: k.name,
      values: add(
        k.keys.flatMap((f) => [
          ...f.position,
          ...f.quaternion,
          f.visible ? 1 : 0,
        ]),
      ),
    })),
  };
  const json = new TextEncoder().encode(JSON.stringify(header)),
    padded = Math.ceil(json.length / 4) * 4,
    buffer = new ArrayBuffer(
      12 + padded + offsets.reduce((a, b) => a + b, 0) * 4,
    ),
    view = new DataView(buffer);
  view.setUint32(0, MAGIC, true);
  view.setUint32(4, 1, true);
  view.setUint32(8, json.length, true);
  new Uint8Array(buffer, 12, json.length).set(json);
  let start = 12 + padded;
  for (const chunk of chunks) {
    new Float32Array(buffer, start, chunk.length).set(chunk);
    start += chunk.byteLength;
  }
  return buffer;
}
export function decodeReportMotion(buffer) {
  if (!(buffer instanceof ArrayBuffer) || buffer.byteLength < 12)
    throw Error("Invalid motion buffer");
  const view = new DataView(buffer);
  if (view.getUint32(0, true) !== MAGIC || view.getUint32(4, true) !== 1)
    throw Error("Unsupported motion header");
  const size = view.getUint32(8, true),
    start = 12 + Math.ceil(size / 4) * 4;
  if (size > 65536 || start > buffer.byteLength)
    throw Error("Truncated motion header");
  const data = JSON.parse(
    new TextDecoder().decode(new Uint8Array(buffer, 12, size)),
  );
  if (!["H01", "H02"].includes(data.hero) || data.curves?.length !== 2)
    throw Error("Invalid motion hero/clips");
  const array = (record) => {
    if (
      !Number.isSafeInteger(record.offset) ||
      !Number.isSafeInteger(record.length) ||
      record.offset < 0 ||
      record.length < 1 ||
      start + (record.offset + record.length) * 4 > buffer.byteLength
    )
      throw Error("Motion data outside buffer");
    const a = new Float32Array(
      buffer,
      start + record.offset * 4,
      record.length,
    );
    if (!a.every(Number.isFinite)) throw Error("Nonfinite motion sample");
    return a;
  };
  data.curves = data.curves.map((c) => {
    const times = array(c.times);
    return {
      ...c,
      tracks: c.tracks.map((t) => ({ ...t, times, values: array(t.values) })),
    };
  });
  data.weaponKeys = data.weaponKeys.map((k) => {
    const values = array(k.values);
    if (values.length % 8) throw Error("Malformed weapon curve");
    return { name: k.name, values, count: values.length / 8 };
  });
  return data;
}
