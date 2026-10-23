/** Shading-normal vs deformed-triangle diagnostics, never a fidelity certificate.
 * Position-preserving support reduction does not preserve a blended rotation.
 */
export function measureSkinNormalAgreement({
  positions,
  posed,
  normals,
  indices,
  ids,
  weights,
  matrices,
}) {
  const count = positions.length / 3;
  if (
    !Number.isInteger(count) ||
    posed.length !== positions.length ||
    normals.length !== positions.length ||
    ids.length !== count * 4 ||
    weights.length !== ids.length ||
    indices.length % 3
  )
    throw Error("Invalid skin normal layout");
  const transformed = new Float64Array(normals.length);
  for (let v = 0; v < count; v++) {
    const x = normals[v * 3],
      y = normals[v * 3 + 1],
      z = normals[v * 3 + 2];
    for (let k = 0; k < 4; k++) {
      const w = weights[v * 4 + k],
        m = matrices[ids[v * 4 + k]];
      if (!Number.isFinite(w) || w < 0 || !m)
        throw Error("Invalid normal skin support");
      if (!w) continue;
      transformed[v * 3] += w * (m[0] * x + m[4] * y + m[8] * z);
      transformed[v * 3 + 1] += w * (m[1] * x + m[5] * y + m[9] * z);
      transformed[v * 3 + 2] += w * (m[2] * x + m[6] * y + m[10] * z);
    }
    for (let k = 0; k < 3; k++)
      if (
        !Number.isFinite(transformed[v * 3 + k]) ||
        !Number.isFinite(positions[v * 3 + k]) ||
        !Number.isFinite(posed[v * 3 + k])
      )
        throw Error("Nonfinite normal/surface evaluation");
  }
  const alignment = (p, n, a, b, c) => {
    const x = p[b * 3] - p[a * 3],
      y = p[b * 3 + 1] - p[a * 3 + 1],
      z = p[b * 3 + 2] - p[a * 3 + 2],
      u = p[c * 3] - p[a * 3],
      v = p[c * 3 + 1] - p[a * 3 + 1],
      w = p[c * 3 + 2] - p[a * 3 + 2],
      gx = y * w - z * v,
      gy = z * u - x * w,
      gz = x * v - y * u,
      nx = n[a * 3] + n[b * 3] + n[c * 3],
      ny = n[a * 3 + 1] + n[b * 3 + 1] + n[c * 3 + 1],
      nz = n[a * 3 + 2] + n[b * 3 + 2] + n[c * 3 + 2],
      denom = Math.hypot(gx, gy, gz) * Math.hypot(nx, ny, nz);
    return denom > 1e-24
      ? Math.max(-1, Math.min(1, (gx * nx + gy * ny + gz * nz) / denom))
      : null;
  };
  let measured = 0,
    bindDegenerate = 0,
    posedDegenerate = 0,
    bindOpposed = 0,
    posedOpposed = 0,
    newOpposed = 0,
    maximumAngleDegrees = 0,
    sumAngle = 0;
  for (let i = 0; i < indices.length; i += 3) {
    const [a, b, c] = [indices[i], indices[i + 1], indices[i + 2]];
    if ([a, b, c].some((v) => !Number.isInteger(v) || v < 0 || v >= count))
      throw Error("Invalid normal triangle");
    const before = alignment(positions, normals, a, b, c),
      after = alignment(posed, transformed, a, b, c);
    if (before === null) bindDegenerate++;
    if (after === null) posedDegenerate++;
    if (before < 0 && before !== null) bindOpposed++;
    if (after < 0 && after !== null) posedOpposed++;
    if (before !== null && before >= 0 && after !== null && after < 0)
      newOpposed++;
    if (after !== null) {
      const angle = (Math.acos(after) * 180) / Math.PI;
      maximumAngleDegrees = Math.max(maximumAngleDegrees, angle);
      sumAngle += angle;
      measured++;
    }
  }
  return {
    triangles: indices.length / 3,
    measured,
    bindDegenerate,
    posedDegenerate,
    bindOpposed,
    posedOpposed,
    newOpposed,
    maximumAngleDegrees,
    meanAngleDegrees: measured ? sumAngle / measured : null,
    diagnosticOnly: true,
    scope:
      "Actual four-weight shader normal direction vs posed geometric triangle normal. Includes source disagreements separately; does not measure normal-map shading, penetration, volume or whole-animation fidelity.",
  };
}
