import { FALL } from "./fall.js?v=Hm51cYJ-";
//#region src/ch/c3/collapse.js
var G = 9.8;
var DT = 1 / 600;
var SPAN = 1.25;
var PHYS = {
	mu: .5,
	bounce: .4,
	cap: .25,
	strike: .35,
	lean: 1.2,
	damp: 4,
	roll: 60,
	twist: 100,
	drag: 3,
	iter: 12
};
var FLAT = Math.cos(5 * Math.PI / 180);
var SLEEP = {
	tilt: Math.cos(2 * Math.PI / 180),
	v: .03,
	w: .3
};
var UP = [
	0,
	1,
	0
];
var dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
var cross = (a, b) => [
	a[1] * b[2] - a[2] * b[1],
	a[2] * b[0] - a[0] * b[2],
	a[0] * b[1] - a[1] * b[0]
];
var mv = (M, v) => [
	dot(M[0], v),
	dot(M[1], v),
	dot(M[2], v)
];
var mtv = (M, v) => [
	M[0][0] * v[0] + M[1][0] * v[1] + M[2][0] * v[2],
	M[0][1] * v[0] + M[1][1] * v[1] + M[2][1] * v[2],
	M[0][2] * v[0] + M[1][2] * v[1] + M[2][2] * v[2]
];
/** The rotation matrix of q (the same rotation as c3/shards.js qRot). */
function rot([x, y, z, w]) {
	return [
		[
			1 - 2 * (y * y + z * z),
			2 * (x * y - z * w),
			2 * (x * z + y * w)
		],
		[
			2 * (x * y + z * w),
			1 - 2 * (x * x + z * z),
			2 * (y * z - x * w)
		],
		[
			2 * (x * z - y * w),
			2 * (y * z + x * w),
			1 - 2 * (x * x + y * y)
		]
	];
}
var qmul = (a, b) => [
	a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1],
	a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0],
	a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3],
	a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2]
];
var qnorm = (q) => {
	const l = Math.hypot(...q);
	return q.map((c) => c / l);
};
/** A world-frame inverse inertia applied to a: R Ib⁻¹ Rᵀ a. */
var iw = (R, Ii, a) => mv(R, mv(Ii, mtv(R, a)));
/**
* A plate cut from the plane z = 0 along polygon poly ([[x, y], …], either winding): its mass (= area), centroid,
* vertices about the centroid, and inertia about the centroid (body frame) with its inverse.
*/
function plate(poly) {
	const n = poly.length;
	let S = 0, cx = 0, cy = 0;
	for (let k = 0; k < n; k++) {
		const [x0, y0] = poly[k], [x1, y1] = poly[(k + 1) % n], w = x0 * y1 - x1 * y0;
		S += w;
		cx += (x0 + x1) * w;
		cy += (y0 + y1) * w;
	}
	cx /= 3 * S;
	cy /= 3 * S;
	let sxx = 0, syy = 0, sxy = 0;
	for (let k = 0; k < n; k++) {
		const x0 = poly[k][0] - cx, y0 = poly[k][1] - cy, x1 = poly[(k + 1) % n][0] - cx, y1 = poly[(k + 1) % n][1] - cy, w = x0 * y1 - x1 * y0;
		sxx += (x0 * x0 + x0 * x1 + x1 * x1) * w;
		syy += (y0 * y0 + y0 * y1 + y1 * y1) * w;
		sxy += (x0 * y1 + 2 * x0 * y0 + 2 * x1 * y1 + x1 * y0) * w;
	}
	const s = Math.sign(S);
	sxx *= s / 12;
	syy *= s / 12;
	sxy *= s / 24;
	const det = sxx * syy - sxy * sxy;
	return {
		m: Math.abs(S) / 2,
		c: [cx, cy],
		verts: poly.map((p) => [
			p[0] - cx,
			p[1] - cy,
			0
		]),
		I: [
			[
				syy,
				-sxy,
				0
			],
			[
				-sxy,
				sxx,
				0
			],
			[
				0,
				0,
				sxx + syy
			]
		],
		Iinv: [
			[
				sxx / det,
				sxy / det,
				0
			],
			[
				sxy / det,
				syy / det,
				0
			],
			[
				0,
				0,
				1 / (sxx + syy)
			]
		]
	};
}
/**
* How piece i lets go (its row of c3/fall.js, the approved draws): rel, seconds after the cue (0.10–0.18); v, a small push (at most
* 0.15 units/s) outward from the disc's centre in x and off the disc's plane to one side in z; w, a spin of 1.5–5 rad/s
* about an axis at least 45° off the plate's normal (z), so that it turns over as it falls; e, its restitution.
* c: the piece's centroid in the disc (radius r).
*/
function launch(i, c, { r = .93, from = .1, to = .18 } = {}) {
	const [h1, h2, h3, h4, h5, ax0, ax1, ax2, h40, h41] = FALL[i];
	const rel = from + (to - from) * h1, side = h2 < .5 ? -1 : 1;
	let v = [
		.07 * c[0] / r + .04 * (h3 - .5),
		.05 * (h4 - .5),
		side * (.03 + .05 * h5)
	];
	const sp = Math.hypot(...v);
	if (sp > .15) v = v.map((u) => u * .15 / sp);
	const om = 1.5 + 3.5 * h40;
	return {
		rel,
		v,
		w: [
			ax0,
			ax1,
			ax2
		].map((u) => u * om),
		e: .2 + .1 * h41
	};
}
/**
* Let plate P go. pose: { x: its centroid, q: its rotation } at the release; L: launch(); floor: the floor's y.
* → { n, dt, X, Q } the samples (centroid, rotation) every dt from the release; hit, the first strike (s after the
* release), at, where (the vertex that struck), hitV, how fast it struck; flat, when it first lies flat; rest, when it
* falls asleep (still, from then on).
*/
function simulate(P, pose, L, { floor, span = SPAN, dt = DT, ...o } = {}) {
	const { mu, bounce, cap, strike, lean, damp, roll, twist, drag, iter } = {
		...PHYS,
		...o
	};
	const n = Math.round(span / dt) + 1, X = new Float64Array(n * 3), Q = new Float64Array(n * 4), m = P.m, NV = P.verts.length;
	const x = pose.x.slice(), v = L.v.slice();
	let q = qnorm(pose.q), R = rot(q), Lm = mv(R, mv(P.I, mtv(R, L.w)));
	let hit = null, at = null, hitV = 0, flat = null, rest = null, asleep = false;
	const r = new Array(NV), tgt = new Float64Array(NV), kn = new Float64Array(NV), jn = new Float64Array(NV), jt = new Float64Array(NV * 2);
	for (let s = 0; s < n; s++) {
		X.set(x, s * 3);
		Q.set(q, s * 4);
		if (asleep || s === n - 1) continue;
		R = rot(q);
		v[1] -= G * dt;
		let w = iw(R, P.Iinv, Lm);
		const C = [];
		for (let k = 0; k < NV; k++) {
			const rk = mv(R, P.verts[k]);
			if (x[1] + rk[1] <= floor + 1e-4) {
				C.push(k);
				r[k] = rk;
			}
		}
		for (const k of C) {
			const rk = r[k], vy = v[1] + cross(w, rk)[1];
			tgt[k] = hit == null && vy < -bounce ? Math.min(-L.e * vy, cap) : 0;
			kn[k] = 1 / m + dot(UP, cross(iw(R, P.Iinv, cross(rk, UP)), rk));
			jn[k] = 0;
			jt[2 * k] = jt[2 * k + 1] = 0;
		}
		if (C.length && hit == null) {
			let lo = C[0];
			for (const k of C) if (r[k][1] < r[lo][1]) lo = k;
			hit = s * dt;
			at = [
				x[0] + r[lo][0],
				floor,
				x[2] + r[lo][2]
			];
			hitV = -(v[1] + cross(w, r[lo])[1]);
			Lm = Lm.map((c) => c * strike);
			w = iw(R, P.Iinv, Lm);
		}
		const ny0 = R[1][2], up = 1 - Math.abs(ny0) * Math.SQRT2;
		if (C.length && up > 0) {
			const hx = R[0][2], hz = R[2][2], hl = Math.hypot(hx, hz), k = -(ny0 < 0 ? -1 : 1) * lean * G * up * dt / hl;
			v[0] += hx * k;
			v[2] += hz * k;
		}
		for (let it = 0; it < iter && C.length; it++) for (const k of C) {
			const rk = r[k];
			let vc = cross(w, rk);
			let d = (tgt[k] - (v[1] + vc[1])) / kn[k];
			const j0 = jn[k];
			jn[k] = Math.max(0, j0 + d);
			d = jn[k] - j0;
			if (d) {
				v[1] += d / m;
				const a = cross(rk, [
					0,
					d,
					0
				]);
				Lm = [
					Lm[0] + a[0],
					Lm[1] + a[1],
					Lm[2] + a[2]
				];
				w = iw(R, P.Iinv, Lm);
			}
			vc = cross(w, rk);
			const sx = v[0] + vc[0], sz = v[2] + vc[2], sl = Math.hypot(sx, sz);
			if (sl < 1e-12) continue;
			const td = [
				sx / sl,
				0,
				sz / sl
			], kt = 1 / m + dot(td, cross(iw(R, P.Iinv, cross(rk, td)), rk));
			let ax = jt[2 * k] - td[0] * sl / kt, az = jt[2 * k + 1] - td[2] * sl / kt;
			const lim = mu * jn[k], al = Math.hypot(ax, az);
			if (al > lim) {
				ax *= lim / al;
				az *= lim / al;
			}
			const dx = ax - jt[2 * k], dz = az - jt[2 * k + 1];
			jt[2 * k] = ax;
			jt[2 * k + 1] = az;
			v[0] += dx / m;
			v[2] += dz / m;
			const a = cross(rk, [
				dx,
				0,
				dz
			]);
			Lm = [
				Lm[0] + a[0],
				Lm[1] + a[1],
				Lm[2] + a[2]
			];
			w = iw(R, P.Iinv, Lm);
		}
		if (C.length) {
			const nrm = [
				R[0][2],
				R[1][2],
				R[2][2]
			], f = Math.exp(-damp * dt), fn = Math.exp(-roll * dt) / f, fy = Math.exp(-twist * dt) / f;
			w = w.map((c) => c * f);
			const wn = dot(w, nrm) * (1 - fn);
			w = [
				w[0] - nrm[0] * wn,
				w[1] - nrm[1] * wn,
				w[2] - nrm[2] * wn
			];
			w[1] *= fy;
			Lm = mv(R, mv(P.I, mtv(R, w)));
			const fd = Math.exp(-drag * dt);
			v[0] *= fd;
			v[2] *= fd;
		}
		x[0] += v[0] * dt;
		x[2] += v[2] * dt;
		x[1] += (v[1] + (C.length ? 0 : G * dt / 2)) * dt;
		const dq = qmul([
			w[0],
			w[1],
			w[2],
			0
		], q);
		q = qnorm(q.map((c, j) => c + dq[j] * dt / 2));
		R = rot(q);
		let lo = Infinity;
		for (const b of P.verts) lo = Math.min(lo, x[1] + dot(R[1], b));
		if (lo < floor) x[1] += floor - lo;
		if (!C.length) continue;
		const ny = R[1][2];
		if (flat == null && Math.abs(ny) > FLAT) flat = (s + 1) * dt;
		if (Math.abs(ny) > SLEEP.tilt && Math.hypot(...v) < SLEEP.v && Math.hypot(...w) < SLEEP.w) {
			const axis = cross([
				R[0][2],
				R[1][2],
				R[2][2]
			], [
				0,
				Math.sign(ny),
				0
			]), sa = Math.hypot(...axis);
			if (sa > 1e-12) {
				const ang = Math.atan2(sa, Math.abs(ny)), k = Math.sin(ang / 2) / sa;
				q = qnorm(qmul([
					axis[0] * k,
					axis[1] * k,
					axis[2] * k,
					Math.cos(ang / 2)
				], q));
			}
			x[1] = floor;
			v[0] = v[1] = v[2] = 0;
			Lm = [
				0,
				0,
				0
			];
			asleep = true;
			rest = (s + 1) * dt;
		}
	}
	return {
		n,
		dt,
		X,
		Q,
		hit,
		at,
		hitV,
		flat,
		rest
	};
}
/** The pose at tau seconds after the release (before it: the release; after the last sample: the last). */
function sampleAt(S, tau) {
	const u = Math.max(0, tau) / S.dt, i = Math.min(S.n - 1, Math.floor(u)), j = Math.min(S.n - 1, i + 1), k = i === j ? 0 : u - i;
	const x = [
		0,
		1,
		2
	].map((c) => S.X[i * 3 + c] + (S.X[j * 3 + c] - S.X[i * 3 + c]) * k);
	if (k === 0) return {
		x,
		q: [...S.Q.subarray(i * 4, i * 4 + 4)]
	};
	const a = S.Q.subarray(i * 4, i * 4 + 4), b = S.Q.subarray(j * 4, j * 4 + 4), sg = a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3] < 0 ? -1 : 1;
	return {
		x,
		q: qnorm([
			0,
			1,
			2,
			3
		].map((c) => a[c] + (sg * b[c] - a[c]) * k))
	};
}
//#endregion
export { DT, G, PHYS, SPAN, launch, plate, sampleAt, simulate };
