import { TAU, lerp, rng } from "../../engine/math.js?v=BJIlRm7-";
//#region src/ch/love/curves.js
var PI = Math.PI;
/** (x² + y² − 1)³ − x²y³ */
var heart2 = (x, y) => {
	const g = x * x + y * y - 1;
	return g * g * g - x * x * y * y * y;
};
/** Taubin's heart with y up. */
var taubin = (x, y, z) => {
	const g = x * x + 2.25 * z * z + y * y - 1, y3 = y * y * y;
	return g * g * g - x * x * y3 - .1125 * z * z * y3;
};
function taubinGrad(x, y, z) {
	const g = x * x + 2.25 * z * z + y * y - 1, g2 = 3 * g * g, y2 = y * y, y3 = y2 * y;
	return [
		g2 * 2 * x - 2 * x * y3,
		g2 * 2 * y - 3 * x * x * y2 - .3375 * z * z * y2,
		g2 * 4.5 * z - .225 * z * y3
	];
}
/** First-order signed distance to Taubin's surface (negative inside). */
function taubinDist(p) {
	const g = taubinGrad(...p);
	return taubin(...p) / (Math.hypot(...g) + 1e-9);
}
function taubinNormal(p) {
	const g = taubinGrad(...p), l = Math.hypot(...g) || 1;
	return g.map((v) => v / l);
}
/** Smallest r in (r0, r1] where f(r cos a, r sin a) changes sign, refined by bisection. */
function polarRoot(f, a, r0 = .02, r1 = 2, n = 500) {
	const c = Math.cos(a), s = Math.sin(a), dr = (r1 - r0) / n;
	let lo = r0, flo = f(lo * c, lo * s);
	for (let k = 1; k <= n; k++) {
		const r = r0 + k * dr, fr = f(r * c, r * s);
		if (Math.sign(fr) !== Math.sign(flo)) {
			let a0 = lo, b0 = r;
			for (let i = 0; i < 50; i++) {
				const m = (a0 + b0) / 2;
				if (Math.sign(f(m * c, m * s)) === Math.sign(flo)) a0 = m;
				else b0 = m;
			}
			return (a0 + b0) / 2;
		}
		lo = r;
		flo = fr;
	}
	return r1;
}
/** The algebraic heart as a loop from the bottom tip (0, −1), counter-clockwise: [x, y, 0, u] with u ∈ [0, 1]. */
function heartLoop(n = 720) {
	const pts = [];
	for (let i = 0; i <= n; i++) {
		const a = -PI / 2 + i / n * TAU, r = polarRoot(heart2, a, .05, 1.8);
		pts.push([
			r * Math.cos(a),
			r * Math.sin(a),
			0,
			i / n
		]);
	}
	return pts;
}
/** Measured properties of the loop (a star-shaped polygon about the origin). */
function heartFacts(loop) {
	let area = 0, per = 0, xMax = 0, yAtX = 0, yMax = -9, xAtY = 0;
	for (let i = 1; i < loop.length; i++) {
		const [x0, y0] = loop[i - 1], [x1, y1] = loop[i];
		area += (x0 * y1 - x1 * y0) / 2;
		per += Math.hypot(x1 - x0, y1 - y0);
		if (x1 > xMax) {
			xMax = x1;
			yAtX = y1;
		}
		if (y1 > yMax) {
			yMax = y1;
			xAtY = x1;
		}
	}
	return {
		area,
		per,
		xMax,
		yAtX,
		yMax,
		xAtY
	};
}
/** Point on a polyline at arc-length fraction u, with the unit tangent there. */
function alongLoop(pts, u, cum) {
	const total = cum[cum.length - 1], d = Math.min(Math.max(u, 0), 1) * total;
	let lo = 0, hi = cum.length - 1;
	while (hi - lo > 1) {
		const m = lo + hi >> 1;
		if (cum[m] <= d) lo = m;
		else hi = m;
	}
	const a = pts[lo], b = pts[hi], k = (d - cum[lo]) / Math.max(cum[hi] - cum[lo], 1e-9);
	const tx = b[0] - a[0], ty = b[1] - a[1], tz = (b[2] ?? 0) - (a[2] ?? 0), l = Math.hypot(tx, ty, tz) || 1;
	return {
		p: [
			a[0] + tx * k,
			a[1] + ty * k,
			(a[2] ?? 0) + tz * k
		],
		tan: [
			tx / l,
			ty / l,
			tz / l
		],
		i: lo
	};
}
function cumLen(pts) {
	const c = [0];
	for (let i = 1; i < pts.length; i++) c.push(c[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1], (pts[i][2] ?? 0) - (pts[i - 1][2] ?? 0)));
	return c;
}
var FOURIER = [
	[
		-1,
		0,
		12.5
	],
	[
		-3,
		0,
		-3
	],
	[
		2,
		0,
		-2.5
	],
	[
		-2,
		0,
		-2.5
	],
	[
		3,
		0,
		1
	],
	[
		1,
		0,
		.5
	],
	[
		4,
		0,
		-.5
	],
	[
		-4,
		0,
		-.5
	]
];
var fourierHeart = (t) => [16 * Math.sin(t) ** 3, 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)];
/** Partial sums of the epicycle chain at t: [[0,0], after c_{k1}, ..., z(t)]. */
function fourierChain(t) {
	let x = 0, y = 0;
	const out = [[
		0,
		0,
		0
	]];
	for (const [k, re, im] of FOURIER) {
		const c = Math.cos(k * t), s = Math.sin(k * t);
		x += re * c - im * s;
		y += re * s + im * c;
		out.push([
			x,
			y,
			0
		]);
	}
	return out;
}
var polarPts = (rf, a0, a1, n) => Array.from({ length: n + 1 }, (_, i) => {
	const a = lerp(a0, a1, i / n), r = rf(a);
	return [
		r * Math.cos(a),
		r * Math.sin(a),
		0
	];
});
var paramPts = (f, a0, a1, n) => Array.from({ length: n + 1 }, (_, i) => {
	const [x, y] = f(lerp(a0, a1, i / n));
	return [
		x,
		y,
		0
	];
});
var rot90 = ([x, y]) => [-y, x];
var cbrt = Math.cbrt;
function box(polys) {
	let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
	for (const pts of polys) for (const [x, y] of pts) {
		x0 = Math.min(x0, x);
		y0 = Math.min(y0, y);
		x1 = Math.max(x1, x);
		y1 = Math.max(y1, y);
	}
	return [
		x0,
		y0,
		x1,
		y1
	];
}
/**
* The nine cells, in reading order. Each: name, formula lines, parameter symbol and range (for the live readout),
* pts (the pen's path), extra polylines, a centre for nested (scaled) copies, and a grid step in curve units.
*/
function notebook(loop) {
	const C = [];
	C.push({
		name: "cardioid",
		f: ["r = 1 − sin θ"],
		par: "θ",
		range: [-PI / 2, 1.5 * PI],
		pts: polarPts((a) => 1 - Math.sin(a), -PI / 2, 1.5 * PI, 480),
		c: [0, -.8],
		step: .25
	});
	const ph = (a) => 2 - 2 * Math.sin(a) + Math.sin(a) * Math.sqrt(Math.abs(Math.cos(a))) / (Math.sin(a) + 1.4);
	C.push({
		name: "polar heart",
		f: ["r = 2 − 2 sin θ + sin θ·√|cos θ| / (sin θ + 1.4)"],
		par: "θ",
		range: [-PI / 2, 1.5 * PI],
		pts: polarPts(ph, -PI / 2, 1.5 * PI, 900),
		c: [0, -1.6],
		step: .5
	});
	C.push({
		name: "rhodonea",
		f: ["r = cos 4θ"],
		par: "θ",
		range: [0, TAU],
		pts: polarPts((a) => Math.cos(4 * a), 0, TAU, 1400),
		c: [0, 0],
		step: .25
	});
	const N = 160, P = (k) => rot90([Math.cos(TAU * k / N), Math.sin(TAU * k / N)]);
	const chords = Array.from({ length: N }, (_, k) => [[...P(k), 0], [...P(2 * k % N), 0]]);
	const env = paramPts((a) => rot90([(2 * Math.cos(a) + Math.cos(2 * a)) / 3, (2 * Math.sin(a) + Math.sin(2 * a)) / 3]), 0, TAU, 360);
	C.push({
		name: "times table",
		f: ["k ↦ 2k  (mod 160)", "envelope: a cardioid"],
		par: "k",
		range: [0, N],
		pts: polarPts(() => 1, PI / 2, PI / 2 + TAU, 240),
		chords,
		env,
		c: [0, 0],
		step: .25
	});
	C.push({
		name: "fourier heart · 8 epicycles",
		f: ["x = 16 sin³t", "y = 13 cos t − 5 cos 2t − 2 cos 3t − cos 4t"],
		par: "t",
		range: [0, TAU],
		pts: paramPts(fourierHeart, 0, TAU, 900),
		c: [0, -3],
		step: 2,
		epi: true
	});
	C.push({
		name: "x² + (y − ∛x²)² = 1",
		f: ["x = sin s,  y = ∛(sin²s) + cos s"],
		par: "s",
		range: [0, TAU],
		pts: paramPts((s) => [Math.sin(s), cbrt(Math.sin(s) ** 2) + Math.cos(s)], 0, TAU, 900),
		c: [0, .15],
		step: .25
	});
	C.push({
		name: "lemniscate",
		f: ["(x² + y²)² = x² − y²"],
		par: "t",
		range: [0, TAU],
		pts: paramPts((t) => {
			const s = Math.sin(t), c = Math.cos(t), d = 1 + s * s;
			return [c / d, s * c / d];
		}, 0, TAU, 720),
		c: [0, 0],
		step: .25
	});
	C.push({
		name: "algebraic heart",
		f: ["(x² + y² − 1)³ − x²y³ = 0"],
		par: "θ",
		range: [-PI / 2, 1.5 * PI],
		pts: loop.map((p) => [
			p[0],
			p[1],
			0
		]),
		c: [0, .1],
		step: .25
	});
	const disc = paramPts((a) => [-1 + Math.cos(a) / 4, Math.sin(a) / 4], 0, TAU, 160);
	C.push({
		name: "mandelbrot · main cardioid",
		f: ["c = e^(iθ)/2 − e^(2iθ)/4", "|c + 1| = 1/4"],
		par: "θ",
		range: [0, TAU],
		pts: paramPts((a) => [Math.cos(a) / 2 - Math.cos(2 * a) / 4, Math.sin(a) / 2 - Math.sin(2 * a) / 4], 0, TAU, 600),
		extra: [disc],
		c: [-.12, 0],
		step: .125
	});
	for (const c of C) {
		c.box = box([c.pts, ...c.extra ?? []]);
		c.cum = cumLen(c.pts);
	}
	return C;
}
/** The 2D heart evenly along the ordered loop, w = position along it (for the pen's ordered reveal). */
function heartCurveShape(N, loop, { sigma = .006, seed = 5 } = {}) {
	const out = new Float32Array(N * 4), L = loop.length - 1, r = rng(seed);
	const gauss = () => (r() + r() + r() - 1.5) * 2 * sigma;
	for (let i = 0; i < N; i++) {
		const u = (i + .5) / N * L, k = Math.floor(u), f = u - k, a = loop[k], b = loop[Math.min(L, k + 1)];
		out.set([
			a[0] + (b[0] - a[0]) * f + gauss(),
			a[1] + (b[1] - a[1]) * f + gauss(),
			gauss(),
			(i + .5) / N
		], i * 4);
	}
	return out;
}
/**
* Surface of revolution of the cardioid r = 1 − sin θ about its axis (y), area-uniform; w = azimuth mod π, over π
* (the sweep of the flat curve); a fraction 1 − keep gets w = 9 and is never revealed (a sparse shell).
*/
function cardioidRevShape(N, { seed = 9, scale = 1, yOff = .875, keep = .3 } = {}) {
	const M = 4e3, xs = [], ys = [], cdf = [0];
	for (let i = 0; i <= M; i++) {
		const a = -PI / 2 + i / M * PI, r = 1 - Math.sin(a);
		xs.push(r * Math.cos(a));
		ys.push(r * Math.sin(a));
	}
	for (let i = 1; i <= M; i++) cdf.push(cdf[i - 1] + (xs[i] + xs[i - 1]) / 2 * Math.hypot(xs[i] - xs[i - 1], ys[i] - ys[i - 1]));
	const tot = cdf[M], r = rng(seed), out = new Float32Array(N * 4);
	for (let i = 0; i < N; i++) {
		const d = r() * tot;
		let lo = 0, hi = M;
		while (hi - lo > 1) {
			const m = lo + hi >> 1;
			if (cdf[m] <= d) lo = m;
			else hi = m;
		}
		const k = (d - cdf[lo]) / Math.max(cdf[hi] - cdf[lo], 1e-12), x = lerp(xs[lo], xs[hi], k), y = lerp(ys[lo], ys[hi], k);
		const phi = r() * TAU;
		out.set([
			x * Math.cos(phi) * scale,
			(y + yOff) * scale,
			x * Math.sin(phi) * scale,
			r() < keep ? phi % PI / PI : 9
		], i * 4);
	}
	return out;
}
/** Points on Taubin's surface near a contact point c (within radius R), pushed just inside: me pressed on the wall. */
function pressedShape(N, c, { R = .19, depth = .045, seed = 13, origin = [
	0,
	0,
	0
] } = {}) {
	const r = rng(seed), out = new Float32Array(N * 4);
	let n = 0, tries = 0;
	while (n < N && tries++ < N * 3e3) {
		let p = [
			c[0] + (r() * 2 - 1) * R,
			c[1] + (r() * 2 - 1) * R,
			c[2] + (r() * 2 - 1) * R
		];
		for (let it = 0; it < 6; it++) {
			const f = taubin(...p), g = taubinGrad(...p), g2 = g[0] * g[0] + g[1] * g[1] + g[2] * g[2];
			if (g2 < 1e-12) break;
			p = p.map((v, j) => v - f * g[j] / g2);
		}
		const d = Math.hypot(p[0] - c[0], p[1] - c[1], p[2] - c[2]);
		if (d > R || Math.abs(taubin(...p)) > 1e-6 || r() > 1 - (d / R) ** 3) continue;
		const nn = taubinNormal(p), k = .006 + depth * r() ** 2.2 * (1 - (d / R) ** 2);
		out.set([
			p[0] - nn[0] * k - origin[0],
			p[1] - nn[1] * k - origin[1],
			p[2] - nn[2] * k - origin[2],
			d / R
		], n * 4);
		n++;
	}
	for (let k = n; k < N; k++) {
		const src = n ? Math.floor(r() * n) : 0;
		out.copyWithin(k * 4, src * 4, src * 4 + 4);
	}
	return out;
}
/** Exit point of a ray from inside the heart (bisection on the sign change of Taubin's function). */
function exitAlong(p0, dir, sMax = 3) {
	let a = 0, b = sMax;
	const at = (s) => taubin(p0[0] + dir[0] * s, p0[1] + dir[1] * s, p0[2] + dir[2] * s);
	for (let k = 1; k <= 300; k++) {
		const s = k / 300 * sMax;
		if (at(s) > 0) {
			a = s - sMax / 300;
			b = s;
			break;
		}
	}
	for (let i = 0; i < 60; i++) {
		const m = (a + b) / 2;
		if (at(m) > 0) b = m;
		else a = m;
	}
	return (a + b) / 2;
}
/** Does the segment a → b cross Taubin's surface? (for choosing which layer an object renders into) */
function segmentCrosses(a, b, n = 64) {
	const s0 = Math.sign(taubin(...a));
	for (let i = 1; i <= n; i++) {
		const k = i / n;
		if (Math.sign(taubin(a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k)) !== s0) return true;
	}
	return false;
}
/** Numerical volume of Taubin's heart (stratified Monte Carlo, deterministic). */
function taubinVolume(n = 60) {
	const bx = [
		-1.2,
		-1.05,
		-.72,
		1.2,
		1.3,
		.72
	], r = rng(77);
	let inside = 0, tot = 0;
	for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) for (let k = 0; k < n; k++) {
		const x = lerp(bx[0], bx[3], (i + r()) / n), y = lerp(bx[1], bx[4], (j + r()) / n), z = lerp(bx[2], bx[5], (k + r()) / n);
		tot++;
		if (taubin(x, y, z) < 0) inside++;
	}
	return inside / tot * (bx[3] - bx[0]) * (bx[4] - bx[1]) * (bx[5] - bx[2]);
}
//#endregion
export { FOURIER, PI, alongLoop, cardioidRevShape, cumLen, exitAlong, fourierChain, fourierHeart, heart2, heartCurveShape, heartFacts, heartLoop, notebook, polarRoot, pressedShape, segmentCrosses, taubin, taubinDist, taubinGrad, taubinNormal, taubinVolume };
