"""Offline pose-space cloth fitting math. No runtime or acceptance shortcuts.

Four-support reduction preserves the evaluated point and total weight at ONE
pose. It deliberately makes no promise about another pose or a whole animation.
"""

import numpy as np


def merge_joint_supports(ids, weights):
    """Coalesce identical bone IDs only; equal posed points are not identities."""
    ids, weights = np.asarray(ids), np.asarray(weights, float)
    if (
        ids.ndim != 2
        or weights.shape != ids.shape
        or not np.isfinite(weights).all()
        or np.any(weights < 0)
    ):
        raise ValueError("Invalid joint supports")
    result = weights.copy()
    for k in range(1, ids.shape[1]):
        for j in range(k):
            duplicate = ids[:, j] == ids[:, k]
            result[duplicate, j] += result[duplicate, k]
            result[duplicate, k] = 0
    return result


def reduce_four_stable(points, weights, batch_size=2048):
    """Exact frozen point with the nearest feasible four-coefficient vector.

    Exhaustively examines all supports of size one through four. This avoids
    an arbitrary null-space choice replacing a tiny cloth blend by radically
    different bone coefficients. Coefficient proximity bounds errors at other
    poses, but is NOT a proof that motion, normals or edges pass their gates.
    Duplicate joint IDs should be merged by the caller before this reduction.
    """
    from itertools import combinations

    points, weights = np.asarray(points, float), np.asarray(weights, float)
    if (
        points.ndim != 3
        or points.shape[2] != 3
        or weights.shape != points.shape[:2]
        or not 4 <= points.shape[1] <= 8
        or not np.isfinite(points).all()
        or not np.isfinite(weights).all()
        or np.any(weights < 0)
        or np.any(weights.sum(1) <= 0)
    ):
        raise ValueError("Invalid stable four-support data")
    selected = np.zeros((len(points), 4), np.uint16)
    result = np.zeros((len(points), 4))
    already_sparse = (weights > 0).sum(1) <= 4
    if already_sparse.any():
        slots = np.argsort(
            -(weights[already_sparse] > 0).astype(int), axis=1, kind="stable"
        )[:, :4]
        selected[already_sparse] = slots
        result[already_sparse] = np.take_along_axis(
            weights[already_sparse], slots, axis=1
        )
    remaining = np.flatnonzero(~already_sparse)
    for start in range(0, len(remaining), batch_size):
        rows = remaining[start : start + batch_size]
        p, w = points[rows], weights[rows]
        target = np.einsum("nkj,nk->nj", p, w)
        total = w.sum(1)
        centre = target / total[:, None]
        scale = np.maximum(np.linalg.norm(p - centre[:, None], axis=2).max(1), 1e-12)
        matrix = np.concatenate(
            [
                np.ones((len(w), 1, p.shape[1])),
                ((p - centre[:, None]) / scale[:, None, None]).transpose(0, 2, 1),
            ],
            axis=1,
        )
        rhs = np.zeros((len(w), 4))
        rhs[:, 0] = total
        best = np.full(len(w), np.inf)
        best_slots, best_values = np.zeros((len(w), 4), np.uint16), np.zeros(
            (len(w), 4)
        )
        for size in range(1, 5):
            for support in combinations(range(p.shape[1]), size):
                columns = np.array(support)
                prior = w[:, columns]
                a = matrix[:, :, columns]
                residual = rhs - np.einsum("nck,nk->nc", a, prior)
                value = prior + np.einsum(
                    "nkc,nc->nk", np.linalg.pinv(a, rcond=1e-12), residual
                )
                valid = (value >= -1e-12).all(1)
                value = np.maximum(value, 0)
                valid &= (
                    np.max(np.abs(np.einsum("nck,nk->nc", a, value) - rhs), axis=1)
                    <= 1e-10
                )
                full = np.zeros_like(w)
                full[:, columns] = value
                score = ((full - w) ** 2).sum(1)
                better = valid & (score < best)
                if better.any():
                    best[better] = score[better]
                    best_slots[better] = 0
                    best_values[better] = 0
                    best_slots[better, :size] = columns
                    best_values[better, :size] = value[better]
        actual = (
            np.take_along_axis(p, best_slots[:, :, None], axis=1)
            * best_values[:, :, None]
        ).sum(1)
        if (
            not np.isfinite(best).all()
            or np.linalg.norm(actual - target, axis=1).max(initial=0) > 1e-9
            or np.abs(best_values.sum(1) - total).max(initial=0) > 1e-10
        ):
            raise ValueError(
                "Stable support enumeration failed its point/sum constraints"
            )
        selected[rows], result[rows] = best_slots, best_values
    return selected, result


def reduce_four(points, weights, batch_size=16384):
    points = np.asarray(points, dtype=np.float64)
    weights = np.asarray(weights, dtype=np.float64)
    if points.ndim != 3 or points.shape[2] != 3 or weights.shape != points.shape[:2]:
        raise ValueError("Expected candidate points and their nonnegative weights")
    if (
        points.shape[1] < 4
        or not np.isfinite(points).all()
        or not np.isfinite(weights).all()
        or (weights < 0).any()
        or (weights.sum(1) <= 0).any()
    ):
        raise ValueError("Invalid reduction data")
    selected = np.zeros((len(points), 4), dtype=np.uint16)
    result = np.zeros((len(points), 4), dtype=np.float64)
    for start in range(0, len(points), batch_size):
        end = min(start + batch_size, len(points))
        p, w = points[start:end], weights[start:end].copy()
        target = np.einsum("nkj,nk->nj", p, w)
        for _ in range(points.shape[1] - 4):
            count = (w > 0).sum(1)
            if (count <= 4).all():
                break
            for size in range(5, points.shape[1] + 1):
                rows = np.flatnonzero(count == size)
                if not len(rows):
                    continue
                slots = np.argsort(~(w[rows] > 0), axis=1, kind="stable")[:, :size]
                values = np.take_along_axis(w[rows], slots, axis=1)
                candidates = np.take_along_axis(p[rows], slots[:, :, None], axis=1)
                centre = target[rows] / values.sum(1)[:, None]
                relative = candidates - centre[:, None]
                scale = np.maximum(
                    np.max(np.linalg.norm(relative, axis=2), axis=1), 1e-12
                )
                matrix = np.concatenate(
                    [
                        np.ones((len(rows), 1, size)),
                        (relative / scale[:, None, None]).transpose(0, 2, 1),
                    ],
                    axis=1,
                )
                _, _, vh = np.linalg.svd(matrix, full_matrices=True)
                direction = vh[:, -1]
                pivot = np.argmax(np.abs(direction), axis=1)
                direction *= np.where(
                    direction[np.arange(len(rows)), pivot] < 0, -1, 1
                )[:, None]
                ratios = np.divide(
                    values,
                    direction,
                    out=np.full_like(values, np.inf),
                    where=direction > 0,
                )
                gone = ratios.argmin(1)
                distance = ratios[np.arange(len(rows)), gone]
                if not np.isfinite(distance).all():
                    raise ValueError("Null-space elimination has no positive direction")
                changed = values - distance[:, None] * direction
                if changed.min() < -1e-12:
                    raise ValueError("Reduction produced a negative support")
                changed[np.arange(len(rows)), gone] = 0
                changed = np.maximum(changed, 0)
                w[rows[:, None], slots] = changed
        if ((w > 0).sum(1) > 4).any():
            raise ValueError("Reduction failed to reach four supports")
        slots = np.argsort(~(w > 0), axis=1, kind="stable")[:, :4]
        values = np.take_along_axis(w, slots, axis=1)
        actual = np.sum(
            np.take_along_axis(p, slots[:, :, None], axis=1) * values[:, :, None],
            axis=1,
        )
        if (
            np.max(np.linalg.norm(actual - target, axis=1), initial=0) > 1e-9
            or np.max(np.abs(values.sum(1) - weights[start:end].sum(1)), initial=0)
            > 1e-12
        ):
            raise ValueError(
                "Pose-space reduction failed its independent point/sum residual"
            )
        selected[start:end], result[start:end] = slots, values
    return selected, result


def floor_upper(base_y, delta_y, free, floor):
    if (
        not np.isfinite(base_y).all()
        or not np.isfinite(delta_y).all()
        or not np.isfinite(floor)
    ):
        raise ValueError("Nonfinite floor constraint")
    if np.any(free & (base_y < floor)):
        raise ValueError("Baseline already violates the requested free-cloth floor")
    upper = np.ones(len(base_y))
    down = free & (delta_y < 0)
    upper[down] = np.minimum(1, (base_y[down] - floor) / -delta_y[down])
    upper[~free] = 0
    return upper


def feasible_segment(base, displacement, edges, lengths, ratio):
    """Largest common step from a verified feasible origin into length balls.

    Only edges touched by the displacement constrain the step. Unchanged
    failures elsewhere must still be reported by the full exported-mesh gate.
    """
    a, b = edges.T
    origin = (base[a] - base[b]) / lengths[:, None]
    delta = (displacement[a] - displacement[b]) / lengths[:, None]
    varying = np.linalg.norm(delta, axis=1) > 1e-14
    if np.any(varying & (np.linalg.norm(origin, axis=1) > ratio + 1e-9)):
        raise ValueError(
            "Cannot claim a feasible segment from an infeasible active baseline"
        )
    quadratic = np.einsum("ij,ij->i", delta[varying], delta[varying])
    linear = 2 * np.einsum("ij,ij->i", origin[varying], delta[varying])
    constant = np.einsum("ij,ij->i", origin[varying], origin[varying]) - ratio * ratio
    discriminant = np.maximum(0, linear * linear - 4 * quadratic * constant)
    root = np.maximum(0, (-linear + np.sqrt(discriminant)) / (2 * quadratic))
    return min(1.0, float(root.min(initial=1.0)))


def repair_alpha(
    base, delta, edges, lengths, alpha, upper, ratio, passes=100, log=None
):
    """Cyclic subgradient projections onto edge balls, with disjoint updates.

    Each tangent half-space contains its entire convex length ball; projecting
    it then the box is Fejer-monotone relative to every feasible field. Edge
    colours prohibit concurrent writes to a shared source fan. This repairs
    local failures before any final global feasible-segment safeguard.
    """
    used = [0] * len(base)
    colours = np.empty(len(edges), np.uint16)
    for i, (a, b) in enumerate(edges):
        mask = used[a] | used[b]
        bit = (mask + 1) & ~mask
        colours[i] = bit.bit_length() - 1
        used[a] |= bit
        used[b] |= bit
    order = np.argsort(colours, kind="stable")
    starts = np.r_[
        0, np.flatnonzero(colours[order][1:] != colours[order][:-1]) + 1, len(order)
    ]
    groups = [order[starts[i] : starts[i + 1]] for i in range(len(starts) - 1)]
    history = []
    value = alpha.copy()
    for iteration in range(passes):
        for selected in groups:
            a, b = edges[selected].T
            length = lengths[selected]
            vector = (
                base[a]
                - base[b]
                + delta[a] * value[a, None]
                - delta[b] * value[b, None]
            ) / length[:, None]
            norm = np.linalg.norm(vector, axis=1)
            bad = norm > ratio
            if not bad.any():
                continue
            a, b, length, norm = a[bad], b[bad], length[bad], norm[bad]
            normal = vector[bad] / norm[:, None]
            ga = np.einsum("ij,ij->i", normal, delta[a]) / length
            gb = -np.einsum("ij,ij->i", normal, delta[b]) / length
            # Locked endpoint variables have zero delta. Both updates use the
            # same pre-update vector, and no endpoint occurs twice per colour.
            denominator = ga * ga + gb * gb
            if np.any(denominator < 1e-28):
                raise ValueError("Violated length ball has no movable support")
            step = (norm - ratio) / denominator
            value[a] = np.clip(value[a] - step * ga, 0, upper[a])
            value[b] = np.clip(value[b] - step * gb, 0, upper[b])
        if iteration % 10 == 9 or iteration == passes - 1:
            a, b = edges.T
            vector = (
                base[a]
                - base[b]
                + delta[a] * value[a, None]
                - delta[b] * value[b, None]
            ) / lengths[:, None]
            norm = np.linalg.norm(vector, axis=1)
            measure = {
                "repairPass": iteration + 1,
                "activeMaximum": float(norm.max(initial=0)),
                "edgesOverRatio": int((norm > ratio + 1e-8).sum()),
            }
            history.append(measure)
            if log is not None:
                log(measure)
            if measure["activeMaximum"] <= ratio + 1e-8:
                break
    return value, {"edgeColours": len(groups), "history": history}


def fit_alpha(
    base,
    delta,
    edges,
    lengths,
    free,
    desired,
    upper,
    ratio,
    iterations,
    log=None,
    repair_passes=0,
):
    """Convex one-scalar field fit with edge balls and per-vertex box bounds."""
    if iterations <= 0 or not 1 < ratio < 2 or np.any(upper < 0) or np.any(upper > 1):
        raise ValueError("Invalid scalar cloth fit parameters")
    free = np.asarray(free, bool) & (upper > 0)
    direction = delta.copy()
    direction[~free] = 0
    active = np.any(
        np.abs(direction[edges[:, 0]]) + np.abs(direction[edges[:, 1]]) > 1e-14, axis=1
    )
    selected, length = edges[active], lengths[active]
    left, right = selected.T
    offset = (base[left] - base[right]) / length[:, None]
    if np.max(np.linalg.norm(offset, axis=1), initial=0) > ratio + 1e-9:
        raise ValueError("Active baseline is infeasible; do not conceal its failures")
    row = np.max(
        (np.abs(direction[left]) + np.abs(direction[right])) / length[:, None], axis=1
    )
    incident = np.bincount(
        selected.ravel(), weights=np.repeat(1 / length, 2), minlength=len(base)
    )
    tau = 0.95 / np.maximum(np.abs(direction).sum(1) * incident, 1e-12)
    tau[~free] = 0
    sigma = 0.95 / np.maximum(row, 1e-12)
    dual = np.zeros((len(selected), 3))
    alpha = np.zeros(len(base))
    extrapolated = alpha.copy()
    history = []
    for iteration in range(iterations):
        vector = (
            offset
            + (
                direction[left] * extrapolated[left, None]
                - direction[right] * extrapolated[right, None]
            )
            / length[:, None]
        )
        dual += sigma[:, None] * vector
        norm = np.linalg.norm(dual, axis=1)
        dual *= np.maximum(0, 1 - sigma * ratio / np.maximum(norm, 1e-30))[:, None]
        flux = dual / length[:, None]
        divergence = np.stack(
            [
                np.bincount(left, weights=flux[:, k], minlength=len(base))
                - np.bincount(right, weights=flux[:, k], minlength=len(base))
                for k in range(3)
            ],
            axis=1,
        )
        gradient = np.einsum("ij,ij->i", divergence, direction)
        value = np.clip((alpha - tau * gradient + tau * desired) / (1 + tau), 0, upper)
        value[~free] = 0
        extrapolated, alpha = 2 * value - alpha, value
        if iteration % 25 == 24 or iteration == iterations - 1:
            posed = base + alpha[:, None] * direction
            measure = {
                "iteration": iteration + 1,
                "activeMaximum": float(
                    np.max(
                        np.linalg.norm(posed[left] - posed[right], axis=1) / length,
                        initial=0,
                    )
                ),
                "meanAlpha": float(alpha[free].mean()) if free.any() else 0,
            }
            history.append(measure)
            if log is not None:
                log(measure)
    repair = None
    if repair_passes:
        alpha, repair = repair_alpha(
            base, direction, selected, length, alpha, upper, ratio, repair_passes, log
        )
    step = feasible_segment(base, alpha[:, None] * direction, selected, length, ratio)
    if step < 1:
        alpha *= step * (1 - 1e-6)
    if (
        not np.isfinite(alpha).all()
        or np.any(alpha < 0)
        or np.any(alpha > upper + 1e-12)
        or np.any(alpha[~free] != 0)
    ):
        raise ValueError("Scalar fit violated its actual bounds")
    return alpha, {
        "activeEdges": int(active.sum()),
        "feasibleSegmentStep": step,
        "history": history,
        "repair": repair,
    }


def scalar_gram(delta, edges, lengths, free):
    """Assemble the exact free-variable K^T K, retaining all vector channels."""
    from scipy.sparse import coo_matrix

    rows = np.flatnonzero(free)
    mapping = np.full(len(delta), -1, dtype=np.int32)
    mapping[rows] = np.arange(len(rows))
    a, b = edges.T
    diagonal = np.bincount(
        edges.ravel(), weights=np.repeat(1 / lengths**2, 2), minlength=len(delta)
    ) * np.einsum("ij,ij->i", delta, delta)
    both = free[a] & free[b]
    off = -np.einsum("ij,ij->i", delta[a[both]], delta[b[both]]) / lengths[both] ** 2
    i, j = mapping[a[both]], mapping[b[both]]
    return coo_matrix(
        (
            np.r_[diagonal[rows], off, off],
            (np.r_[np.arange(len(rows)), i, j], np.r_[np.arange(len(rows)), j, i]),
        ),
        shape=(len(rows), len(rows)),
    ).tocsr()


def fit_alpha_admm(
    base,
    delta,
    edges,
    lengths,
    free,
    desired,
    upper,
    ratio,
    iterations,
    log=None,
    boxed=False,
):
    """Global scalar field solve; AMG-preconditioned SPD step, explicit boxes.

    Small regression fixtures use an exact sparse factorization. Real source
    meshes require the pinned PyAMG dependency; missing it fails explicitly.
    """
    from scipy.sparse import eye
    from scipy.sparse.linalg import cg, factorized

    free = np.asarray(free, bool) & (upper > 0)
    rows = np.flatnonzero(free)
    if not len(rows):
        raise ValueError("No movable cloth field")
    direction = delta.copy()
    direction[~free] = 0
    active = np.any(
        np.abs(direction[edges[:, 0]]) + np.abs(direction[edges[:, 1]]) > 1e-14, axis=1
    )
    selected, length = edges[active], lengths[active]
    a, b = selected.T
    offset = (base[a] - base[b]) / length[:, None]
    if np.max(np.linalg.norm(offset, axis=1), initial=0) > ratio + 1e-9:
        raise ValueError("Active baseline is infeasible; refusing masked approval")
    rho, eta, relaxation = 1.0, 0.0 if boxed else 1.0, 1.6
    matrix = rho * scalar_gram(direction, selected, length, free) + (1 + eta) * eye(
        len(rows), format="csr"
    )
    if len(rows) <= 512:
        direct = factorized(matrix.tocsc())
        preconditioner = None
    else:
        import pyamg

        hierarchy = pyamg.smoothed_aggregation_solver(
            matrix,
            symmetry="symmetric",
            max_levels=12,
            max_coarse=512,
            coarse_solver="splu",
        )
        preconditioner = hierarchy.aspreconditioner(cycle="V")
        direct = None
    if boxed:
        from projected_box_field import projected_box_field

        if direct is not None:
            from scipy.sparse.linalg import LinearOperator

            box_conditioner = LinearOperator(matrix.shape, matvec=direct, dtype=float)
        else:
            box_conditioner = preconditioner

    def adjoint(values):
        flux = values / length[:, None]
        divergence = np.stack(
            [
                np.bincount(a, weights=flux[:, k], minlength=len(base))
                - np.bincount(b, weights=flux[:, k], minlength=len(base))
                for k in range(3)
            ],
            axis=1,
        )
        return np.einsum("ij,ij->i", direction, divergence)[rows]

    alpha = np.zeros(len(base))
    x = np.zeros(len(rows))
    y, v = x.copy(), x.copy()
    z, u = offset.copy(), np.zeros_like(offset)
    history, max_linear_residual, total_cg, maximum_box_residual = [], 0.0, 0, 0.0
    for iteration in range(iterations):
        rhs = desired[rows] + eta * (y - v) + rho * adjoint(z - u - offset)
        if boxed:
            x, kkt = projected_box_field(matrix, rhs, x, upper[rows], box_conditioner)
            maximum_box_residual = max(maximum_box_residual, kkt["freeResidual"])
            total_cg += kkt["linearSolves"]
        elif direct is not None:
            x = direct(rhs)
        else:
            count = [0]

            def callback(_):
                count[0] += 1

            x, info = cg(
                matrix,
                rhs,
                x0=x,
                M=preconditioner,
                rtol=1e-9,
                atol=1e-12,
                maxiter=120,
                callback=callback,
            )
            total_cg += count[0]
            if info != 0:
                raise ValueError(f"Global cloth SPD solve did not converge: {info}")
        if not boxed:
            residual = np.linalg.norm(matrix @ x - rhs) / max(1.0, np.linalg.norm(rhs))
            max_linear_residual = max(max_linear_residual, float(residual))
            if not np.isfinite(x).all() or residual > 1e-7:
                raise ValueError("Inaccurate global cloth linear solve")
        alpha[rows] = x
        actual = (
            offset
            + (direction[a] * alpha[a, None] - direction[b] * alpha[b, None])
            / length[:, None]
        )
        relaxed = relaxation * actual + (1 - relaxation) * z
        proposal = relaxed + u
        norm = np.linalg.norm(proposal, axis=1)
        z = proposal * np.minimum(1, ratio / np.maximum(norm, 1e-30))[:, None]
        u += relaxed - z
        if boxed:
            y = x.copy()
        else:
            relaxed_box = relaxation * x + (1 - relaxation) * y
            y = np.clip(relaxed_box + v, 0, upper[rows])
            v += relaxed_box - y
        if iteration % 10 == 9 or iteration == iterations - 1:
            bounded = np.zeros(len(base))
            bounded[rows] = y
            posed = base + bounded[:, None] * direction
            measure = {
                "iteration": iteration + 1,
                "activeMaximum": float(
                    np.max(
                        np.linalg.norm(posed[a] - posed[b], axis=1) / length, initial=0
                    )
                ),
                "edgePrimalResidual": float(
                    np.linalg.norm(actual - z, axis=1).max(initial=0)
                ),
                "boxPrimalResidual": float(np.max(np.abs(x - y), initial=0)),
                "meanAlpha": float(y.mean()),
                "cgIterations": total_cg,
            }
            history.append(measure)
            if log is not None:
                log(measure)
    alpha[:] = 0
    alpha[rows] = y
    step = feasible_segment(base, alpha[:, None] * direction, selected, length, ratio)
    if step < 1:
        alpha *= step * (1 - 1e-6)
    if (
        not np.isfinite(alpha).all()
        or np.any(alpha < 0)
        or np.any(alpha > upper + 1e-12)
    ):
        raise ValueError("ADMM cloth field violated its actual bounds")
    return alpha, {
        "algorithm": (
            "ADMM scalar field with bounded Newton"
            if boxed
            else "ADMM scalar field with exact normalized vector Gram"
        ),
        "activeEdges": int(active.sum()),
        "feasibleSegmentStep": step,
        "maximumRelativeLinearResidual": max_linear_residual if not boxed else None,
        "maximumBoxFreeResidual": maximum_box_residual if boxed else None,
        "totalCgIterations": total_cg,
        "history": history,
    }
