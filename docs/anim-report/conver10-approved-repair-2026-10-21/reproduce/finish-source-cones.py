"""Repair isolated residual maximum-strain edges without worsening percentile.

Local frozen-pose experiment, never runtime activation. The independent full
source validator still applies unchanged p999<=1.5 / maximum<=2 afterwards.
"""
import argparse
import hashlib
import json
import re
import time
from pathlib import Path

import cvxpy as cp
import numpy as np
from scipy.sparse import coo_matrix


def sha(p):
    return hashlib.sha256(p.read_bytes()).hexdigest()


parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("previous", type=Path)
parser.add_argument("output", type=Path)
parser.add_argument("--anatomical-zero-slots", action="store_true", help="Replace only exactly-zero hand support IDs by actual same-chain joints before solving; positive parent influences stay identical")
args = parser.parse_args()
root = Path(".local/rig-candidates").resolve()
if root not in args.output.resolve().parents or args.output.exists():
    raise ValueError("New separate staging output required")
prior = json.loads((args.previous / "solve.json").read_text())
base = Path(prior["base"])
for name, expected in prior["inputHashes"].items():
    if sha(base / name) != expected:
        raise ValueError("Changed source " + name)
if sha(args.previous / "result-weights.bin") != prior["outputWeightsSha256"]:
    raise ValueError("Changed parent weight state")
args.output.mkdir()
p = np.fromfile(base / "positions.bin", "<f4").reshape(-1, 3).astype(float)
tri = np.fromfile(base / "triangles.bin", "<u4").reshape(-1, 3)
weld = np.fromfile(base / "source-welds.u32bin", "<u4")
_, reps, inverse = np.unique(weld, return_index=True, return_inverse=True)
points, tri = p[reps], inverse[tri]
source_ids = np.fromfile(base / "result-ids.bin", "<u2").reshape(-1, 4)
ids = source_ids[reps].copy()
original = np.fromfile(args.previous / "result-weights.bin", "<f4").reshape(-1, 4)
weights = original[reps].astype(float)
zero_slot_changes = 0
if args.anatomical_zero_slots:
    meta = json.loads((base / "input.json").read_text())
    names = [j["name"] for j in meta["joints"]]
    hands = json.loads(Path("data/rig/hand-frames.json").read_text())["heroes"][prior["parameters"]["hero"]]["hands"]
    for side, hand in hands.items():
        landmarks = np.array([hand["wrist"]]+[p for f in hand["fingers"].values() for p in f["points"]])
        selected = ((points>=landmarks.min(0)-.022)&(points<=landmarks.max(0)+.022)).all(1)
        for v in np.flatnonzero(selected):
            active = np.flatnonzero(weights[v]>0)
            if not any(names[ids[v,k]].startswith(side+"Hand") for k in active):
                continue
            order = active[np.argsort(-weights[v,active])]
            preferred = [names.index(side+"Hand")]
            for k in order:
                name = names[ids[v,k]]
                finger = re.fullmatch(side+r"Hand(Thumb|Index|Middle|Ring|Pinky)[123]",name)
                if finger:
                    preferred.extend(names.index(side+"Hand"+finger[1]+str(i)) for i in [1,2,3])
            preferred.extend(names.index(side+s) for s in ["ForearmPronation","ForeArm","Arm"])
            used = set(ids[v,active])
            for k in np.flatnonzero(weights[v]==0):
                available = [j for j in preferred if j not in used]
                new = available[0] if available else ids[v,order[0]]
                zero_slot_changes += int(ids[v,k]!=new)
                ids[v,k] = new
                used.add(new)
    if np.any((ids!=source_ids[reps]) & (weights!=0)):
        raise ValueError("An active parent influence was changed")
pose_count = json.loads((base / "feasibility-input.json").read_text())["poseCount"]
matrices = np.fromfile(base / "feasibility-matrices.bin", "<f8").reshape(pose_count, -1, 4, 4).transpose(0, 1, 3, 2)
protected = np.zeros(len(points), bool)
np.logical_or.at(protected, inverse, np.fromfile(base / "protected.bin", "u1").astype(bool))
transformed = np.stack([np.stack([np.einsum("nij,nj->ni", m[ids[:, k], :3, :3], points)+m[ids[:, k], :3, 3] for k in range(4)], axis=1) for m in matrices])
origin = np.einsum("pnkj,nk->pnj", transformed, weights)
coeff = transformed-origin[:, :, None, :]
edges = np.unique(np.sort(np.concatenate([tri[:, [0, 1]], tri[:, [1, 2]], tri[:, [2, 0]]]), axis=1), axis=0)
length = np.linalg.norm(points[edges[:, 0]]-points[edges[:, 1]], axis=1)
edges, length = edges[length>1e-12], length[length>1e-12]
left, right = edges.T


def posed(w):
    return np.einsum("pnkj,nk->pnj", transformed, w)


def ratios(w):
    q = posed(w)
    return np.linalg.norm(q[:, left]-q[:, right], axis=2)/length[None, :]


def metrics(r):
    rows = [{"p999": float(np.quantile(row, .999)), "maximum": float(row.max())} for row in r]
    return {"p999": max(r["p999"] for r in rows), "maximum": max(r["maximum"] for r in rows), "poses": rows}


before = ratios(weights)
worst = before.max(0)
seeds = np.flatnonzero(worst>1.95)
attempts = []
record = {k: prior[k] for k in ["base", "assetSha256", "poseFile", "poseSha256", "inputHashes", "poseCount"]}
record.update({"parameters": {"hero": prior["parameters"]["hero"], "algorithmVersion": "local-source-cones-1", "anatomicalZeroSlots":args.anatomical_zero_slots},
               "parent": str(args.previous), "parentSolveSha256": sha(args.previous/"solve.json"),
               "scriptSha256": sha(Path(__file__)), "initial": metrics(before), "attempts": attempts,
               "accepted": False, "activated": False, "outputWritten": False,"zeroWeightSlotsChanged":zero_slot_changes,
               "scope": "Local maximum repair with every touched edge constrained on both poses; <=1.49 edges remain<=1.49, percentile-tail edges cannot worsen, worst edges capped1.95. Full all-source/readback skin/contact/animation gates remain mandatory."})
for rings in [3, 6, 12]:
    start = time.monotonic()
    free = np.zeros(len(points), bool)
    free[edges[seeds].ravel()] = True
    for _ in range(rings):
        free[edges[free[edges].any(1)].ravel()] = True
    free &= ~protected
    selected = free[edges].any(1)
    e, lens = edges[selected], length[selected]
    if not free.any() or free.sum()>25000:
        attempts.append({"rings": rings, "rejected": "No free source vertices or patch exceeds25000 budget"})
        break
    lookup = np.full(len(points), -1, int)
    lookup[free] = np.arange(free.sum())
    q0 = posed(weights)
    delta = cp.Variable((int(free.sum()), 4))
    flat = cp.reshape(delta, (int(free.sum())*4,), order="C")
    constraints = [cp.sum(delta, axis=1)==0, delta>=-weights[free], delta<=1-weights[free]]
    for pose in range(pose_count):
        rows, cols, values = [], [], []
        for endpoint, sign in [(0, 1), (1, -1)]:
            v = e[:, endpoint]
            active = free[v]
            edge_index = np.flatnonzero(active)
            for k in range(4):
                for axis in range(3):
                    rows.append(edge_index*3+axis)
                    cols.append(lookup[v[active]]*4+k)
                    values.append(sign*coeff[pose, v[active], k, axis]/lens[active])
        matrix = coo_matrix((np.concatenate(values), (np.concatenate(rows), np.concatenate(cols))), shape=(len(e)*3, int(free.sum())*4)).tocsr()
        constant = (q0[pose, e[:, 0]]-q0[pose, e[:, 1]])/lens[:, None]
        bound = np.minimum(1.95, np.maximum(1.49, before[pose, selected]))
        constraints.append(cp.norm(cp.reshape(matrix@flat, (len(e), 3), order="C")+constant, axis=1)<=bound)
    problem = cp.Problem(cp.Minimize(cp.sum_squares(delta)), constraints)
    error = None
    try:
        problem.solve(solver="CLARABEL", max_iter=150, tol_gap_abs=1e-8, tol_gap_rel=1e-8, tol_feas=1e-9, time_limit=55)
    except Exception as exc:
        error = str(exc)
    attempt = {"rings": rings, "freeVertices": int(free.sum()), "constrainedEdges": len(e), "status": problem.status, "error": error, "seconds": time.monotonic()-start}
    attempts.append(attempt)
    if problem.status=="optimal" and delta.value is not None:
        result = weights.copy()
        result[free] += delta.value
        result[free] = np.maximum(result[free], 0)
        result[free] /= result[free].sum(1)[:, None]
        final = ratios(result)
        attempt["final"] = metrics(final)
        if final.max()<=1.9501 and metrics(final)["p999"]<=record["initial"]["p999"]+1e-5:
            output = original.copy()
            changed = free[inverse]
            output[changed] = result[inverse[changed]]
            if not np.array_equal(output[~changed], original[~changed]):
                raise ValueError("Changed frozen source supports")
            output.astype("<f4").tofile(args.output/"result-weights.bin")
            result_ids=source_ids.copy()
            if args.anatomical_zero_slots:
                result_ids[:]=ids[inverse]
                if np.any((result_ids!=source_ids)&(original!=0)):
                    raise ValueError("A positive parent support ID changed on a source UV copy")
                result_ids.astype('<u2').tofile(args.output/'result-ids.bin')
            record.update({"outputWritten": True, "outputWeightsSha256": sha(args.output/"result-weights.bin"), "final": metrics(final), "jointIdsChanged":bool(zero_slot_changes), "outputIdsSha256":sha(args.output/'result-ids.bin') if args.anatomical_zero_slots else None, "protectedWeightsPreserved": True})
            break
    (args.output/"solve.json").write_text(json.dumps(record, indent=2)+"\n")
(args.output/"solve.json").write_text(json.dumps(record, indent=2)+"\n")
print(json.dumps(record), flush=True)
if not record["outputWritten"]:
    raise SystemExit(2)
