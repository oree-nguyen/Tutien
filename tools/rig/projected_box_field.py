"""Feasible projected Newton for a source scalar field with two-sided bounds.

No epsilon-based release of a bound and no acceptance by clipping alone. Every
return requires the free residual and both active-set KKT signs to be checked.
"""

import numpy as np
from scipy.sparse.linalg import cg, LinearOperator


def projected_box_field(
    matrix, rhs, initial, upper, preconditioner=None, max_iterations=160
):
    rhs, upper = np.asarray(rhs, float), np.asarray(upper, float)
    x = np.clip(np.asarray(initial, float), 0, upper)
    if (
        not np.isfinite(rhs).all()
        or not np.isfinite(x).all()
        or not np.isfinite(upper).all()
        or np.any(upper <= 0)
    ):
        raise ValueError("Invalid bounded source field")
    diagonal = matrix.diagonal()
    assert np.all(diagonal > 0)
    dual_tolerance = 2e-6 * max(1e-12, float(np.max(np.abs(rhs))))
    linear_solves = 0
    for iteration in range(max_iterations + 1):
        gradient = matrix @ x - rhs
        lower, higher = x <= 0, x >= upper
        interior = ~lower & ~higher
        residual = float(
            np.linalg.norm(gradient[interior])
            / max(1e-12, np.linalg.norm(rhs[interior]))
        )
        low_violation = max(0.0, float(-gradient[lower].min())) if lower.any() else 0.0
        high_violation = (
            max(0.0, float(gradient[higher].max())) if higher.any() else 0.0
        )
        if residual <= 2e-6 and max(low_violation, high_violation) <= dual_tolerance:
            return x, {
                "activeSetSolves": iteration,
                "linearSolves": linear_solves,
                "freeResidual": residual,
                "lowerKktViolation": low_violation,
                "upperKktViolation": high_violation,
                "dualTolerance": dual_tolerance,
            }
        if iteration == max_iterations:
            break
        free = (
            interior
            | (lower & (gradient < -dual_tolerance))
            | (higher & (gradient > dual_tolerance))
        )
        assert free.any()
        reduced = matrix[free][:, free].tocsr()
        conditioner = None
        if preconditioner is not None:

            def apply(value):
                full = np.zeros(len(rhs))
                full[free] = value
                return (preconditioner @ full)[free]

            conditioner = LinearOperator(reduced.shape, matvec=apply, dtype=float)
        direction, info = cg(
            reduced, -gradient[free], M=conditioner, rtol=1e-7, atol=0, maxiter=1200
        )
        linear_solves += 1
        error = np.linalg.norm(reduced @ direction + gradient[free]) / max(
            1e-12, np.linalg.norm(gradient[free])
        )
        if info or error > 2e-6:
            raise RuntimeError(
                f"Bounded cloth direction failed: info={info}, residual={error}"
            )
        full = np.zeros(len(rhs))
        full[free] = direction
        accepted = False
        for candidate_direction in [full, -gradient / diagonal]:
            step = 1.0
            for _ in range(60):
                candidate = np.clip(x + step * candidate_direction, 0, upper)
                change = candidate - x
                slope = float(gradient @ change)
                energy = slope + 0.5 * float(change @ (matrix @ change))
                if slope < 0 and energy <= 1e-4 * slope:
                    accepted = True
                    break
                step *= 0.5
            if accepted:
                break
        if not accepted:
            raise RuntimeError("Bounded cloth Newton stalled before KKT acceptance")
        x = candidate
    raise RuntimeError(
        f"Bounded cloth Newton did not converge: free={residual}, lower={low_violation}, upper={high_violation}"
    )
