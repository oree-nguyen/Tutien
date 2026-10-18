"""Differentiable source-edge stretch objective for normalized LBS weights."""
import numpy as np


class SurfaceObjective:
    def __init__(self, fixed_positions, transforms, source_free, groups, edges, rest_lengths, initial_weights, target=1.47):
        self.fixed = fixed_positions
        self.transforms = transforms
        self.source_free = source_free
        self.groups = groups
        self.edges = edges
        self.rest = rest_lengths
        self.initial = initial_weights
        self.target = target
        self.last = {}

    def __call__(self, flat):
        weights = self.weights(flat)
        loss, gradient = self.evaluate_weights(weights)
        return loss, (weights * (gradient - (gradient * weights).sum(axis=1, keepdims=True))).ravel()

    def evaluate_weights(self, weights):
        source_weights = weights[self.groups]
        moving = np.einsum('nk,nkj->nj', source_weights, self.transforms)
        positions = self.fixed.copy()
        positions[self.source_free] = moving
        a, b = self.edges.T
        delta = positions[a] - positions[b]
        length = np.linalg.norm(delta, axis=1)
        ratios = length / self.rest
        excess = np.maximum(0, ratios - self.target)
        count = len(excess)
        loss = np.dot(excess, excess) / count
        direction_gradient = delta * (2 * excess / (self.rest * np.maximum(length, 1e-15) * count))[:, None]
        vertex_gradient = np.empty_like(positions)
        for k in range(3):
            vertex_gradient[:, k] = np.bincount(a, weights=direction_gradient[:, k], minlength=len(positions)) - np.bincount(b, weights=direction_gradient[:, k], minlength=len(positions))
        pose_gradient = vertex_gradient[self.source_free]
        weight_gradient = np.einsum('nj,nkj->nk', pose_gradient, self.transforms)
        gradient = np.empty_like(weights)
        for k in range(4):
            gradient[:, k] = np.bincount(self.groups, weights=weight_gradient[:, k], minlength=len(weights))
        difference = weights - self.initial
        loss += 1e-4 * np.sum(difference * difference) / len(weights)
        gradient += 2e-4 * difference / len(weights)
        self.last = {'loss': float(loss), 'maximumFreeEdgeStretch': float(ratios.max())}
        return float(loss), gradient

    def diagonal_metric(self):
        a, b = self.edges.T
        degree = np.bincount(a, weights=1/self.rest**2, minlength=len(self.fixed)) + np.bincount(b, weights=1/self.rest**2, minlength=len(self.fixed))
        centered = self.transforms - self.transforms.mean(axis=1, keepdims=True)
        source_bound = degree[self.source_free] * np.sum(centered*centered, axis=(1,2))
        return np.maximum(1e-12, 4*np.bincount(self.groups, weights=source_bound, minlength=len(self.initial))/len(self.edges) + 2e-4/len(self.initial))

    def weights(self, flat):
        logits = flat.reshape(-1, 4)
        exponent = np.exp(logits - logits.max(axis=1, keepdims=True))
        return exponent / exponent.sum(axis=1, keepdims=True)


def project_simplex_rows(values):
    ordered = -np.sort(-values, axis=1)
    sums = ordered.cumsum(axis=1) - 1
    divisor = np.arange(1, values.shape[1]+1)
    rho = (ordered - sums/divisor > 0).sum(axis=1)-1
    theta = sums[np.arange(len(values)), rho]/(rho+1)
    return np.maximum(0, values-theta[:,None])


def projected_descent(objective, initial, iterations, callback):
    x = project_simplex_rows(initial)
    y, momentum = x.copy(), 1.
    metric = objective.diagonal_metric()[:,None]
    loss, _ = objective.evaluate_weights(x)
    for iteration in range(iterations):
        fy, gradient = objective.evaluate_weights(y)
        for attempt in range(30):
            candidate = project_simplex_rows(y-gradient/metric)
            delta = candidate-y
            candidate_loss, _ = objective.evaluate_weights(candidate)
            upper = fy + np.sum(gradient*delta) + .5*np.sum(metric*delta*delta)
            if candidate_loss <= upper + 1e-14:
                break
            metric *= 2
        else:
            raise RuntimeError('Projected solver failed its descent bound')
        if candidate_loss > loss + 1e-14:
            y, momentum = x.copy(), 1.
            continue
        next_momentum = (1+np.sqrt(1+4*momentum*momentum))/2
        y = candidate + ((momentum-1)/next_momentum)*(candidate-x)
        x, loss, momentum = candidate, candidate_loss, next_momentum
        callback({'iteration': iteration, **objective.last})
    objective.evaluate_weights(x)
    return x
