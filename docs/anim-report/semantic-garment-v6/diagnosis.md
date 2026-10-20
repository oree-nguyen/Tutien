# H01 source support diagnosis: v4–v6

The cuff ownership correction is retained, but **none of v4, v5 or v6 is accepted or activated**. V6 is `.local/rig-candidates/semantic-garment-v6/H01-C0-rigged.glb`, SHA-256 `c24b7cdbe874b745ad54d9e951ebeedd85db465f759c91dcc768c58871eae143`.

V4 changes 39,088 original source-face labels, moving 16,094 left and 22,810 right lower-robe faces, plus 184 residual faces, into their corresponding sleeves. Its joint-ID/weight arrays remain byte-identical to v3, independently checked against the receipt-bound source-mapped v3 GLB. The isolated front/side/back sleeve and two-panel images show the gold cuff tails with the sleeves. This is a provisional source ownership correction, not acceptance of the complete garment pattern: lower-robe regions still contain multiple layers/components and rough albedo-derived boundaries. See [cuff review](../semantic-garment-cuff-review/semantic-cuff-review.json).

V5 fixes a concrete solver error: joints with zero boundary/target RHS previously retained arbitrary original weights. Spine1 consequently jumped near the torso target boundary. Zero-RHS fields now solve to zero; original weights are used only as CG initial guesses. V6 additionally tests a properly area-scaled surface FEM operator and nonnegative per-bone energy solve. Its [screening fixture](screening-scale-fixture.json) verifies physical-scale behavior under uniform and local mesh refinement. The [first unconstrained FEM attempt](unconstrained-fem-rejection.json) rejected negative support values; the bounded solve records its limited [KKT scope](bounded-field-scope.json) before normalization and four-influence reduction.

The full original source geometry, UVs, images, skeleton and legacy clips remain present. Protected hand weights remain exact. V5 and v6 each pass bind, exact coverage of **1,499,726** source triangles, and **146,771** source-copy comparisons with **0 mm** opening at bind, midpoint and held poses. Midpoint and held still fail the unchanged p99.9 ≤ 1.5 / maximum ≤ 2.0 limits. See [v5 multipose](../semantic-garment-v5/multipose-summary.json) and [v6 multipose](multipose-summary.json).

| V6 region | Midpoint p99.9 / max | Held p99.9 / max |
| --- | ---: | ---: |
| Remaining source | 1.249183 / 1.456973 | 1.449992 / 1.482072 |
| Left robe | 1.668129 / 2.913948 | 2.506926 / 5.354764 |
| Right robe | 3.127240 / 9.107096 | 5.178130 / 15.897433 |
| Robe torso | 1.364284 / 1.676615 | 1.748694 / 2.288246 |
| Left sleeve | 1.278394 / 1.430341 | 1.604548 / 2.122578 |
| Right sleeve | 2.826046 / 3.814508 | 4.396204 / 6.027843 |

The diagnostic [source-edge report](source-support-strain.json) counts **2,249,589 unique nonzero original source edges**. Its global percentiles have a different denominator from the all-primitive per-triangle-edge percentiles above. At the held pose, v5/v6 unique-edge p99.9 is 3.849458/3.480655, while the maximum worsens from 13.359178 to 15.897433. The normalized full-joint field before four-influence reduction still reaches 11.636381 in v6, so the reduction is not the only cause.

The report records the top 20 edges in each compared field with original source IDs, exact adjacent source faces, semantic connected component, original and transformed positions, dense and four-bone weights, fixed/protected/soft-target membership, and joint-motion/weight-gradient decomposition.

The largest exported failure is source edge **650350–652067**, in right-robe component whose first source face is **10419** and which contains **113,312** faces. Its adjacent source faces are **1108575/1108619**. Source endpoints are approximately `[-0.185633, 0.856120, -0.064465]` and `[-0.184911, 0.856084, -0.064506]` metres. A **0.724461 mm** edge becomes **11.5171 mm**, or **15.897433×**. Both endpoints are free and unprotected; this is inside one connected source surface, not a split seam opening.

On that same edge, the dense field already stretches **9.696661×**. The four-bone gradient contributes about **11.027 mm** of relative displacement, while the averaged rigid-bone motion of the bind edge contributes about **0.660 mm**. RightForeArm weight changes by **−0.0106672** and RightHand by **−0.0055688** across less than a millimetre. Their large held-pose displacements dominate the result. Continuous subtract-fifth reduction magnifies this existing binding gradient; it does not introduce a discrete rank jump here. The worst dense edge, **125496–657354**, is about `[-0.212, 0.753, -0.035]` m inside the lower Hips target patch and still stretches **11.636381×**.

The source Laplacian objective smooths support values; it does not constrain posed edge lengths. Further CG iterations cannot add that missing constraint. The next correction being tested is source-indexed surface deformation/corrective morphing on the actual original vertices, coupled over the mechanically proven UV groups, with protected hands fixed. It must be measured against source edges at the required poses and preserve original face/UV/image identity. This adds deformation freedom without manufacturing hidden body surfaces or declaring an existing sewn boundary free. A pose-aware weight fit remains another possible option; these results do not prove linear-blend weights globally infeasible or corrective deformation mathematically necessary.

The sampled wrist-to-waist [path witness](cuff-waist-paths.json) has a largest necessary edge bound of 1.743341, below the maximum threshold of 2.0. It neither proves whole-garment feasibility nor proves the source cloth impossible. Full animation, area/orientation, cross-section, collision, exact weapon contact and device gates remain separate and unpassed.

Focused regression: `OPENBLAS_NUM_THREADS=1 python3 -m unittest discover -s tools/rig -p test_source_garment_graph.py` passes **13** tests without PyAMG. `node --test tests/rig-source-graph.test.js` passes its one wrapper test and executes the same 13 Python regressions. No failed candidate GLB belongs in Git.
