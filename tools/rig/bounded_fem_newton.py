"""Feasible projected Newton for a nonnegative source FEM field.

Projection is an iteration, never an acceptance shortcut: the original relative
free residual and primal/dual KKT tolerances must all hold before returning.
"""
import numpy as np
from scipy.sparse.linalg import cg,LinearOperator


def projected_newton_field(matrix,rhs,initial,preconditioner=None,max_iterations=160):
    rhs=np.asarray(rhs,dtype=float);x=np.maximum(np.asarray(initial,dtype=float),0)
    if not np.isfinite(rhs).all() or not np.isfinite(x).all():raise ValueError('Nonfinite FEM data')
    diagonal=matrix.diagonal();assert np.all(diagonal>0)
    dual_tolerance=2e-6*max(1e-12,float(np.max(np.abs(rhs))));history=[]
    for iteration in range(max_iterations+1):
        gradient=matrix@x-rhs;positive=x>0;active=~positive
        residual=float(np.linalg.norm(gradient[positive])/max(1e-12,np.linalg.norm(rhs[positive])))
        minimum=float(gradient[active].min())if active.any()else 0.
        if residual<=2e-6 and minimum>=-dual_tolerance:
            return x,{'method':'Feasible projected Newton with energy line search and unchanged primal/dual KKT checks','activeSetSolves':iteration,'freeResidual':residual,'minimumWeight':float(x.min()),'minimumActiveGradient':minimum,'dualTolerance':dual_tolerance,'history':history}
        if iteration==max_iterations:break
        free=positive|(gradient < -dual_tolerance);assert free.any()
        reduced=matrix[free][:,free].tocsr();conditioner=None
        if preconditioner is not None:
            def apply(value):
                full=np.zeros(len(rhs));full[free]=value
                return(preconditioner@full)[free]
            conditioner=LinearOperator(reduced.shape,matvec=apply,dtype=float)
        direction,info=cg(reduced,-gradient[free],M=conditioner,rtol=1e-7,atol=0,maxiter=1200)
        linear_residual=np.linalg.norm(reduced@direction+gradient[free])/max(1e-12,np.linalg.norm(gradient[free]))
        if info or linear_residual>2e-6:raise RuntimeError(f'Projected Newton direction solve rejected: info={info}, residual={linear_residual}')
        full_direction=np.zeros(len(rhs));full_direction[free]=direction
        accepted=False;kind='newton'
        for candidate_direction in [full_direction,-gradient/diagonal]:
            alpha=1.
            for _ in range(60):
                candidate=np.maximum(x+alpha*candidate_direction,0);step=candidate-x;slope=float(gradient@step)
                change=slope+.5*float(step@(matrix@step))
                if slope<0 and change<=1e-4*slope:
                    accepted=True;break
                alpha*=.5
            if accepted:break
            kind='projected-diagonal-gradient'
        if not accepted:raise RuntimeError(f'Projected Newton stalled before KKT acceptance: free residual={residual}, active gradient={minimum}')
        x=candidate
        if iteration%10==0:history.append({'iteration':iteration+1,'freeResidualBeforeStep':residual,'minimumActiveGradientBeforeStep':minimum,'step':kind,'alpha':alpha,'energyChange':change})
    raise RuntimeError(f'Projected Newton did not satisfy unchanged KKT checks within{max_iterations}iterations: residual={residual}, active gradient={minimum}')
