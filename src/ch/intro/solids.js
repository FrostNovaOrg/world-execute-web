import { clamp, ease, rng } from "../../engine/math.js?v=BJIlRm7-";
import { MathUtils, Matrix4, Quaternion, Vector3 } from "../../../vendor/three/build/three.core.js?v=q9f7JKE-";
import { circle, dofDot, dofPolyline, dofSegment, mul } from "./kit.js?v=rUxrOt9G";
//#region src/ch/intro/solids.js
var PHI = (1 + Math.sqrt(5)) / 2;
var norm = (v) => {
	const l = Math.hypot(...v);
	return v.map((x) => x / l);
};
var signs = (n) => Array.from({ length: 1 << n }, (_, k) => Array.from({ length: n }, (_, j) => k & 1 << j ? -1 : 1));
var RAW = {
	tetra: [
		[
			1,
			1,
			1
		],
		[
			1,
			-1,
			-1
		],
		[
			-1,
			1,
			-1
		],
		[
			-1,
			-1,
			1
		]
	],
	cube: signs(3),
	octa: [
		[
			1,
			0,
			0
		],
		[
			-1,
			0,
			0
		],
		[
			0,
			1,
			0
		],
		[
			0,
			-1,
			0
		],
		[
			0,
			0,
			1
		],
		[
			0,
			0,
			-1
		]
	],
	dodeca: [...signs(3), ...signs(2).flatMap(([a, b]) => [
		[
			0,
			a / PHI,
			b * PHI
		],
		[
			a / PHI,
			b * PHI,
			0
		],
		[
			a * PHI,
			0,
			b / PHI
		]
	])],
	icosa: signs(2).flatMap(([a, b]) => [
		[
			0,
			a,
			b * PHI
		],
		[
			a,
			b * PHI,
			0
		],
		[
			a * PHI,
			0,
			b
		]
	])
};
var NAMES = {
	tetra: "tetrahedron",
	cube: "cube",
	octa: "octahedron",
	dodeca: "dodecahedron",
	icosa: "icosahedron"
};
var ORDER = [
	"tetra",
	"cube",
	"octa",
	"dodeca",
	"icosa"
];
/** Faces of a convex polytope from its vertices: planes through vertex triples with every vertex on one side. */
function hullFaces(V) {
	const faces = [], seen = /* @__PURE__ */ new Set();
	for (let i = 0; i < V.length; i++) for (let j = i + 1; j < V.length; j++) for (let k = j + 1; k < V.length; k++) {
		const a = new Vector3(...V[i]), b = new Vector3(...V[j]), c = new Vector3(...V[k]);
		const n = new Vector3().crossVectors(b.clone().sub(a), c.clone().sub(a));
		if (n.lengthSq() < 1e-10) continue;
		n.normalize();
		let d = n.dot(a);
		const side = V.map((v) => n.dot(new Vector3(...v)) - d);
		if (side.every((s) => s <= 1e-6)) {} else if (side.every((s) => s >= -1e-6)) {
			n.negate();
			d = -d;
		} else continue;
		const on = V.map((v, q) => [q, n.dot(new Vector3(...v)) - d]).filter(([, s]) => Math.abs(s) < 1e-6).map(([q]) => q);
		const key = on.join(",");
		if (seen.has(key)) continue;
		seen.add(key);
		const cen = on.reduce((s, q) => s.add(new Vector3(...V[q])), new Vector3()).multiplyScalar(1 / on.length);
		const u = new Vector3(...V[on[0]]).sub(cen).normalize(), w = new Vector3().crossVectors(n, u);
		on.sort((p, q) => {
			const P = new Vector3(...V[p]).sub(cen), Q = new Vector3(...V[q]).sub(cen);
			return Math.atan2(P.dot(w), P.dot(u)) - Math.atan2(Q.dot(w), Q.dot(u));
		});
		faces.push({
			v: on,
			n: n.toArray(),
			c: cen.toArray()
		});
	}
	return faces;
}
/** All five solids with unit circumradius. Each: { id, name, V, E, F, faces, edges, inradius, dihedral (deg) }. */
var SOLIDS = Object.fromEntries(ORDER.map((id) => {
	const V = RAW[id].map(norm), faces = hullFaces(V), edges = [], es = /* @__PURE__ */ new Set();
	for (const f of faces) for (let i = 0; i < f.v.length; i++) {
		const a = f.v[i], b = f.v[(i + 1) % f.v.length], k = a < b ? `${a},${b}` : `${b},${a}`;
		if (!es.has(k)) {
			es.add(k);
			edges.push([Math.min(a, b), Math.max(a, b)]);
		}
	}
	const n0 = new Vector3(...faces[0].n), adj = faces.find((f) => f !== faces[0] && f.v.filter((q) => faces[0].v.includes(q)).length === 2);
	const dihedral = 180 - MathUtils.radToDeg(n0.angleTo(new Vector3(...adj.n)));
	const inradius = new Vector3(...faces[0].n).dot(new Vector3(...faces[0].c));
	return [id, {
		id,
		name: NAMES[id],
		V,
		faces,
		edges,
		nV: V.length,
		nE: edges.length,
		nF: faces.length,
		inradius,
		dihedral
	}];
}));
/**
* Rest pose: rotate so face 0 points straight down, then yaw by `yaw`; `scale` = circumradius. Returns a Matrix4
* that maps unit-solid coordinates to world, with the face on the floor at `pos` (x, z) and y = floor.
*/
function restMatrix(solid, { pos = [0, 0], floor = 0, scale = 1, yaw = 0 } = {}) {
	const q = new Quaternion().setFromUnitVectors(new Vector3(...solid.faces[0].n), new Vector3(0, -1, 0));
	const qy = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), yaw);
	return new Matrix4().compose(new Vector3(pos[0], floor + solid.inradius * scale, pos[1]), qy.multiply(q), new Vector3(scale, scale, scale));
}
/**
* Landing: a fall under constant acceleration from `height` onto the floor at tLand, then a small damped bounce and a
* settling wobble of the tilt. Returns { dy, tilt, impact (0 before, then 0..1 over the ring life), falling }.
*/
function landState(t, tLand, { height = 3.2, fall = .34, bounce = .06 } = {}) {
	if (t < tLand) {
		const k = clamp(1 - (tLand - t) / fall);
		return {
			dy: height * (1 - k * k),
			tilt: (1 - k) * .5,
			impact: 0,
			falling: t > tLand - fall ? 1 : 0,
			shown: t > tLand - fall
		};
	}
	const s = t - tLand, w = 26, damp = Math.exp(-s * 9);
	return {
		dy: bounce * Math.abs(Math.sin(s * w)) * damp,
		tilt: .06 * Math.sin(s * w * .8) * damp,
		impact: clamp(s / .55),
		falling: 0,
		shown: true
	};
}
/** World-space vertices of a solid for a pose (Matrix4) plus a vertical offset and a tilt about x. */
function poseVerts(solid, M, dy = 0, tilt = 0) {
	const T = new Matrix4().makeTranslation(0, dy, 0), piv = new Vector3().setFromMatrixPosition(M);
	const R = new Matrix4().makeTranslation(piv.x, piv.y, piv.z).multiply(new Matrix4().makeRotationZ(tilt)).multiply(new Matrix4().makeTranslation(-piv.x, -piv.y, -piv.z));
	const F = T.multiply(R).multiply(M);
	return solid.V.map((v) => new Vector3(...v).applyMatrix4(F).toArray());
}
/**
* Draw a solid's edges (draw 0..1 grows every edge from its first vertex) and vertex dots. o: color, width, dof,
* dots (brightness), edgeK (per-edge brightness function i => k, for scan highlights).
*/
function drawSolid(L, solid, P, o = {}) {
	const col = o.color ?? [
		.9,
		.93,
		1
	], w = o.width ?? 2.6, d = o.draw ?? 1;
	solid.edges.forEach(([a, b], i) => {
		const k = o.edgeK ? o.edgeK(i, P[a], P[b]) : 1, e = P[b].map((x, j) => P[a][j] + (x - P[a][j]) * d);
		dofSegment(L, P[a], e, {
			color: mul(col, k),
			width: w
		}, o.dof);
	});
	if ((o.dots ?? 0) > 0) for (const p of P) dofDot(L, p, {
		color: mul([
			1,
			1,
			1
		], o.dots),
		width: w * 3
	}, o.dof);
}
/** Impact ring on the floor under a solid: radius grows, brightness fades. */
function drawImpact(L, c, k, o = {}) {
	if (k <= 0 || k >= 1) return;
	const r = (o.r0 ?? .1) + ease.outCubic(k) * (o.r1 ?? .9), fade = (1 - k) ** 1.6;
	dofPolyline(L, circle([
		c[0],
		.003,
		c[2]
	], r, 72), {
		color: mul(o.color ?? [
			1,
			1,
			1
		], (o.bright ?? 1.6) * fade),
		width: (o.width ?? 2.2) * (1 + (1 - k))
	}, o.dof);
	if (k < .35) dofPolyline(L, circle([
		c[0],
		.003,
		c[2]
	], r * .55, 48), {
		color: mul(o.color ?? [
			1,
			1,
			1
		], .8 * (1 - k / .35)),
		width: 1.4
	}, o.dof);
}
/**
* Particles on the solids' edges (for the dissolve into "me"): N points distributed by edge length over a list of
* placements [{ solid, M }], in world space minus `origin`. w = index of the solid / count (0..1).
*/
function edgeCloud(N, placements, { origin = [
	0,
	0,
	0
], jitter = .004, seed = 71 } = {}) {
	const r = rng(seed), segs = [];
	let total = 0;
	placements.forEach(({ solid, M }, si) => {
		const P = solid.V.map((v) => new Vector3(...v).applyMatrix4(M));
		for (const [a, b] of solid.edges) {
			const len = P[a].distanceTo(P[b]);
			segs.push({
				a: P[a],
				b: P[b],
				len,
				acc: total,
				w: (si + .5) / placements.length
			});
			total += len;
		}
	});
	const out = new Float32Array(N * 4);
	let s = 0;
	for (let i = 0; i < N; i++) {
		const d = (i + r()) / N * total;
		while (s < segs.length - 1 && segs[s].acc + segs[s].len < d) s++;
		const g = segs[s], k = (d - g.acc) / g.len, j = () => (r() - .5) * 2 * jitter;
		out[i * 4] = g.a.x + (g.b.x - g.a.x) * k + j() - origin[0];
		out[i * 4 + 1] = g.a.y + (g.b.y - g.a.y) * k + j() - origin[1];
		out[i * 4 + 2] = g.a.z + (g.b.z - g.a.z) * k + j() - origin[2];
		out[i * 4 + 3] = g.w;
	}
	return out;
}
/** "V − E + F = 2" with the solid's numbers. */
var euler = (s) => `${s.nV} − ${s.nE} + ${s.nF} = ${s.nV - s.nE + s.nF}`;
//#endregion
export { ORDER, SOLIDS, drawImpact, drawSolid, edgeCloud, euler, landState, poseVerts, restMatrix };
