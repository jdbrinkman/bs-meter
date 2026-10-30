import assert from "node:assert/strict";
import { cohenKappa, fleissKappa, icc1, krippendorffAlpha } from "./stats";

const near = (a: number | null, b: number, tol = 1e-3) => assert.ok(a != null && Math.abs(a - b) < tol, `${a} !~ ${b}`);

// Hand-computed: units (0,0),(1,1),(0,1),(0,0) -> nominal alpha = 1 - .25/.5357 = 0.5333
near(krippendorffAlpha([[0, 0], [1, 1], [0, 1], [0, 0]], "nominal"), 0.5333);
// Perfect agreement with variation -> 1
near(krippendorffAlpha([[1, 1, 1], [3, 3, 3], [5, 5, 5], [2, 2, 2]], "ordinal"), 1);
// Missing values tolerated (unit with one value is ignored)
near(krippendorffAlpha([[1, 1], [5, 5], [3, null], [2, 2]], "ordinal"), 1);
// Near-misses hurt ordinal alpha less than far misses
const near1 = krippendorffAlpha([[1, 2], [3, 3], [4, 5], [5, 5], [2, 2], [1, 1]], "ordinal")!;
const far = krippendorffAlpha([[1, 5], [3, 3], [4, 1], [5, 5], [2, 2], [1, 1]], "ordinal")!;
assert.ok(near1 > far, "ordinal alpha should penalise far misses more");
// No variation -> undefined
assert.equal(krippendorffAlpha([[3, 3], [3, 3]], "ordinal"), null);
// Fleiss: perfect agreement across 3 raters, 2 categories -> 1
near(fleissKappa([[3, 0], [0, 3], [3, 0], [0, 3]]), 1);
// Fleiss: classic example (Wikipedia, 10 subjects x 14 raters x 5 categories) -> 0.210
near(
  fleissKappa([[0,0,0,0,14],[0,2,6,4,2],[0,0,3,5,6],[0,3,9,2,0],[2,2,8,1,1],[7,7,0,0,0],[3,2,6,3,0],[2,5,3,2,2],[6,5,2,1,0],[0,2,2,3,7]]),
  0.21, 0.005
);
// Cohen: perfect, and chance-level
near(cohenKappa([1, 2, 3, 1], [1, 2, 3, 1]), 1);
near(cohenKappa(["a", "a", "b", "b"], ["a", "b", "a", "b"]), 0);
// ICC: runs identical within game, differing between games -> 1
near(icc1([[10, 10, 10], [50, 50, 50], [90, 90, 90]]), 1);
console.log("stats tests passed");
