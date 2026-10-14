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
  const target = skill.headingOnly
    ? null
    : nearestVisible(
        match,
        actor,
        Math.max(skill.range, skill.radius ?? 0) + 1,
      );
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
  const magnitude = skill.headingOnly ? Math.hypot(chosen.x, chosen.z) : 1;
  const direction = skill.headingOnly
    ? { x: chosen.x / magnitude, z: chosen.z / magnitude }
    : chosen;
  const length = skill.headingOnly
    ? skill.range
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
