import { hash2, rng } from "../../engine/math.js?v=BJIlRm7-";
//#region src/ch/pre1/arc.js
var sub = (a, b) => [
	a[0] - b[0],
	a[1] - b[1],
	a[2] - b[2]
];
var add = (a, b) => [
	a[0] + b[0],
	a[1] + b[1],
	a[2] + b[2]
];
var mul = (a, k) => [
	a[0] * k,
	a[1] * k,
	a[2] * k
];
var len = (a) => Math.hypot(a[0], a[1], a[2]);
var cross = (a, b) => [
	a[1] * b[2] - a[2] * b[1],
	a[2] * b[0] - a[0] * b[2],
	a[0] * b[1] - a[1] * b[0]
];
var norm = (a) => mul(a, 1 / (len(a) || 1));
function displace(a, b, g, depth, rough) {
	const d = sub(b, a), n1 = norm(cross(d, Math.abs(d[1]) > .9 * len(d) ? [
		1,
		0,
		0
	] : [
		0,
		1,
		0
	])), n2 = norm(cross(norm(d), n1));
	let pts = [a, b];
	for (let k = 0; k < depth; k++) {
		const next = [pts[0]];
		for (let i = 1; i < pts.length; i++) {
			const p = pts[i - 1], q = pts[i], s = len(sub(q, p)) * rough;
			next.push(add(mul(add(p, q), .5), add(mul(n1, (g() - .5) * 2 * s), mul(n2, (g() - .5) * 2 * s))), q);
		}
		pts = next;
	}
	return pts;
}
/** Paths of one discharge from a to b: [{ pts, w }] (w: relative intensity; branches are fainter). */
function bolt(a, b, seed, { depth = 6, rough = .3, branches = 3, reach = .45 } = {}) {
	const g = rng(seed), main = displace(a, b, g, depth, rough), out = [{
		pts: main,
		w: 1
	}];
	const d = sub(b, a), L = len(d);
	for (let k = 0; k < branches; k++) {
		const p0 = main[1 + Math.floor(g() * (main.length - 2))];
		const dir = norm(add(mul(d, (.25 + g() * .4) / L), [
			(g() - .5) * 1.6,
			(g() - .5) * .6,
			(g() - .5) * 1.6
		]));
		out.push({
			pts: displace(p0, add(p0, mul(dir, L * (.18 + g() * reach))), g, depth - 2, rough * 1.1),
			w: .45
		});
	}
	return out;
}
/** Draw bolt paths. o: core (HDR colour), halo (colour), width, gain. */
function drawBolt(Lines, paths, o = {}) {
	const gain = o.gain ?? 1, core = o.core ?? [
		1,
		1,
		1
	], halo = o.halo ?? [
		.35,
		.6,
		1
	], w = o.width ?? 2.2;
	for (const { pts, w: k } of paths) {
		Lines.polyline(pts, {
			color: halo.map((c) => c * .45 * k * gain),
			width: w * 4.5
		});
		Lines.polyline(pts, {
			color: core.map((c) => c * 3.2 * k * gain),
			width: w * (k < 1 ? .7 : 1)
		});
	}
}
/**
* Sparks thrown from point p since time t0 (for `dur` seconds, or forever): `rate` per second, each living `life` s on a ballistic path.
* Drawn as short streaks (position over the last 1/60 s). Pure function of t.
*/
function drawSparks(Lines, p, t, t0, seed, o = {}) {
	const rate = o.rate ?? 60, life = o.life ?? .28, speed = o.speed ?? .5, grav = o.gravity ?? -1.2, col = o.color ?? [
		1,
		.8,
		.5
	];
	if (t < t0) return;
	const k1 = Math.min(Math.floor((t - t0) * rate), o.dur != null ? Math.floor(o.dur * rate) : Infinity), k0 = Math.max(0, Math.ceil((t - life - t0) * rate));
	for (let k = k0; k <= k1; k++) {
		const g = rng(seed * 7919 + k * 104729), tau = t - (t0 + (k + g()) / rate);
		if (tau < 0 || tau > life) continue;
		const v = [
			(g() - .5) * 2 * speed,
			g() * speed * .8 + .1 * speed,
			(g() - .5) * 2 * speed * (o.flat ? .2 : 1)
		];
		const at = (s) => [
			p[0] + v[0] * s,
			p[1] + v[1] * s + .5 * grav * s * s,
			p[2] + v[2] * s
		];
		const f = 1 - tau / life;
		Lines.segment(at(Math.max(0, tau - 1 / 60)), at(tau), {
			color: col.map((c) => c * 2.4 * f * f),
			width: o.width ?? 2.2
		});
	}
}
/** The arc strikes at t0 and re-strikes on a fixed clock: seed for time t (changes every 1/hz s). */
var arcSeed = (t, hz = 30) => Math.floor(t * hz) + 1;
/** A soft flicker in 0.85..1 for the arc brightness (small on purpose: photosensitivity). */
var arcFlicker = (t) => {
	const k = Math.floor(t * 30);
	return .85 + .15 * hash2(k, 69);
};
//#endregion
export { arcFlicker, arcSeed, bolt, drawBolt, drawSparks };
