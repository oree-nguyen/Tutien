const smoothstep=(x,a,b)=>{if(x<=a)return 0;if(x>=b)return 1;const t=(x-a)/(b-a);return t*t*(3-2*t);};
export function terrainHeight(x, z) {
  const r = Math.hypot(x, z),
    fade = smoothstep(r, 15, 24);
  return (
    fade *
    smoothstep(
      Math.min(Math.abs(x) / 10, Math.abs(z) / 6),
      1,
      1.8,
    ) *
    (Math.sin(x * 0.045) * Math.cos(z * 0.057) * 0.8 +
      Math.sin((x + z) * 0.09) * 0.18 +
      3.2 *
        Math.exp(-((x + 52) ** 2 + (z + 44) ** 2) / 650) *
        (0.7 + 0.3 * Math.sin((x - z) * 0.22)) +
      2.1 * Math.exp(-(x * x + (z + 72) ** 2) / 500) -
      1.8 *
        Math.exp(
          -(((x + 62 + Math.sin(z * 0.1) * 3) / 4) ** 2) - ((z + 20) / 25) ** 2,
        ))
  );
}
export const groundHeight = (x, z) =>
  Math.hypot(x, z) < 14 ? 0.83 : terrainHeight(x, z) + 0.08;
