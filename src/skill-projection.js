import { distance } from "./rules.js";
import { canSee, realmOf } from "./systems.js";

// Shared projection math; Match.cast still decides and applies the action.
// Remote snapshots contain only server-visible actors, so an online guide
// predicts from that snapshot and never reconstructs hidden enemy positions.
function nearestVisible(match, actor, range) {
  if (!match) return null;
  if (typeof match.nearest === "function") return match.nearest(actor, range);
  let target = null,
    nearest = range;
  for (const candidate of match.actors ?? []) {
    const enemy =
      actor !== candidate &&
      realmOf(actor) === realmOf(candidate) &&
      candidate.alive &&
      !candidate.extracted &&
      (actor.team === -1
        ? candidate.kind === "hero"
        : candidate.team === -1 || actor.team !== candidate.team);
    if (
      !enemy ||
      candidate.downedUntil ||
      candidate.untargetableUntil > match.time ||
      !canSee(match, actor, candidate)
    )
      continue;
    const d = distance(actor, candidate);
    if (d < nearest) {
      nearest = d;
      target = candidate;
    }
  }
  return target;
}

export function projectSkillCast(match, actor, skill, aim = null) {
  const friendly = ["heal", "shield"].includes(skill.shape);
  const locked = ["target", "chain"].includes(skill.shape);
  let target = skill.headingOnly
    ? null
    : friendly
      ? ((match?.actors ?? [])
          .filter(
            (t) =>
              t.kind === "hero" &&
              t.team === actor.team &&
              t.alive &&
              !t.extracted &&
              !t.downedUntil &&
              realmOf(t) === realmOf(actor) &&
              distance(t, actor) <= skill.range,
          )
          .sort(
            (a, b) =>
              a.hp / Math.max(1, match.getStats?.(a)?.hp ?? a.maxHp ?? a.hp) -
              b.hp / Math.max(1, match.getStats?.(b)?.hp ?? b.maxHp ?? b.hp),
          )[0] ?? actor)
      : nearestVisible(
          match,
          actor,
          locked
            ? skill.range + 0.5
            : Math.max(skill.range, skill.radius ?? 0) + 1,
        );
  if (!skill.headingOnly && aim?.targetId != null) {
    const candidate = match?.actors?.find((a) => a.id === aim.targetId);
    const sameTeam =
      candidate?.team === actor.team && candidate?.kind === "hero";
    if (
      candidate?.alive &&
      !candidate.extracted &&
      !candidate.downedUntil &&
      !(candidate.untargetableUntil > match.time) &&
      realmOf(candidate) === realmOf(actor) &&
      distance(candidate, actor) <= skill.range + (friendly ? 0 : 0.5) &&
      canSee(match, actor, candidate) &&
      (friendly
        ? sameTeam
        : candidate.team === -1 || candidate.team !== actor.team)
    )
      target = candidate;
  }
  const targetDistance = target ? distance(actor, target) : 0;
  const valid = (value) =>
    Number.isFinite(value?.x) &&
    Number.isFinite(value?.z) &&
    Math.hypot(value.x, value.z) > 1e-8;
  const fallback = valid(actor.dir) ? actor.dir : { x: 0, z: 1 };
  const automatic =
    target && targetDistance > 1e-8
      ? {
          x: (target.x - actor.x) / targetDistance,
          z: (target.z - actor.z) / targetDistance,
        }
      : fallback;
  const chosen = aim == null ? automatic : valid(aim) ? aim : fallback;
  const manualDistance = !skill.headingOnly && Number.isFinite(aim?.distance);
  const magnitude = Math.hypot(chosen.x, chosen.z);
  const direction = { x: chosen.x / magnitude, z: chosen.z / magnitude };
  const length = skill.headingOnly
    ? skill.range
    : manualDistance
      ? Math.max(0, Math.min(skill.range, aim.distance))
      : skill.range === 0
        ? 0
        : target
          ? Math.min(skill.range, targetDistance)
          : skill.range * 0.65;
  return {
    direction,
    distance: length,
    point: {
      x: actor.x + direction.x * length,
      z: actor.z + direction.z * length,
    },
    targetId: target?.id ?? null,
    target,
    snapshotPrediction: !!match?.online,
  };
}

export function skillIndicatorKind(skill) {
  if (["line", "dash"].includes(skill.shape)) return "line";
  if (skill.shape === "cone") return "cone";
  if (["zone", "healzone", "circle", "protect", "reveal"].includes(skill.shape))
    return "aoe";
  return "lock";
}

export function previewSkillHits(match, actor, skill, projection) {
  if (!match) return [];
  const kind = skillIndicatorKind(skill);
  const friendly = ["heal", "shield", "healzone", "protect"].includes(
    skill.shape,
  );
  return (match.actors ?? []).filter((target) => {
    if (
      !target.alive ||
      target.extracted ||
      target.downedUntil ||
      target.untargetableUntil > match.time ||
      realmOf(target) !== realmOf(actor) ||
      !canSee(match, actor, target)
    )
      return false;
    const sameTeam = target.kind === "hero" && target.team === actor.team;
    if (
      friendly
        ? !sameTeam
        : target === actor || (target.team !== -1 && sameTeam)
    )
      return false;
    const dx = target.x - actor.x,
      dz = target.z - actor.z;
    const along = dx * projection.direction.x + dz * projection.direction.z;
    const side = Math.abs(
      dx * projection.direction.z - dz * projection.direction.x,
    );
    if (kind === "line")
      return (
        along >= -0.7 &&
        along <= skill.range + 0.6 &&
        side <= (skill.hitboxWidth ?? 1.8) / 2
      );
    if (kind === "cone")
      return (
        along >= -0.7 &&
        along <= skill.range + 0.6 &&
        side <=
          Math.max(
            0.6,
            along * Math.tan(((skill.coneAngle ?? 120) * Math.PI) / 360),
          )
      );
    if (kind === "lock") return target.id === projection.targetId;
    return distance(target, projection.point) <= (skill.radius ?? 1) + 0.5;
  });
}
