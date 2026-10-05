import { TAU, lerp, rng } from "../../engine/math.js?v=BJIlRm7-";
//#region src/ch/inst2/crack.js
function clip(a, b, h) {
	let t0 = 0, t1 = 1;
	const dx = b[0] - a[0], dy = b[1] - a[1];
	for (const [p, q] of [
		[-dx, a[0] + h],
		[dx, h - a[0]],
		[-dy, a[1] + h],
		[dy, h - a[1]]
	]) {
		if (p === 0) {
			if (q < 0) return null;
			continue;
		}
		const r = q / p;
		if (p < 0) {
			if (r > t1) return null;
			if (r > t0) t0 = r;
		} else {
			if (r < t0) return null;
			if (r < t1) t1 = r;
		}
	}
	return [t0, t1];
}
/** { segs: [{ a, b, d0, d1, ring }], shards: [{ poly, c, d }], maxD }. */
function crackPattern(seed, { radials = 13, rings = 5, R = 3.6, impact = [0, 0], h = 1.6 } = {}) {
	const r = rng(seed), segs = [], add = (a, b, d0, d1, ring) => {
		const c = clip(a, b, h);
		if (!c) return;
		const A = [lerp(a[0], b[0], c[0]), lerp(a[1], b[1], c[0])], B = [lerp(a[0], b[0], c[1]), lerp(a[1], b[1], c[1])];
		segs.push({
			a: A,
			b: B,
			d0: lerp(d0, d1, c[0]),
			d1: lerp(d0, d1, c[1]),
			ring
		});
	};
	const ang = Array.from({ length: radials }, (_, i) => (i + (r() - .5) * .6) / radials * TAU);
	const rad = Array.from({ length: rings }, (_, j) => R * ((j + 1) / rings) ** 1.45 * (.92 + r() * .14));
	const node = ang.map((a) => rad.map((q) => {
		const aa = a + (r() - .5) * .16, qq = q * (1 + (r() - .5) * .1);
		return [impact[0] + Math.cos(aa) * qq, impact[1] + Math.sin(aa) * qq];
	}));
	const dist = ang.map(() => []);
	for (let i = 0; i < radials; i++) {
		let prev = impact, d = 0;
		for (let j = 0; j < rings; j++) {
			const n = node[i][j], len = Math.hypot(n[0] - prev[0], n[1] - prev[1]), nx = -(n[1] - prev[1]) / len, ny = (n[0] - prev[0]) / len;
			let p = prev;
			for (let k = 1; k <= 3; k++) {
				const u = k / 3, jag = k < 3 ? (r() - .5) * .16 * len : 0;
				const q = [lerp(prev[0], n[0], u) + nx * jag, lerp(prev[1], n[1], u) + ny * jag], l = Math.hypot(q[0] - p[0], q[1] - p[1]);
				add(p, q, d, d + l, false);
				d += l;
				p = q;
			}
			dist[i][j] = d;
			prev = n;
			if (r() < .22) {
				const fa = Math.atan2(n[1] - impact[1], n[0] - impact[0]) + (r() < .5 ? -1 : 1) * (.35 + r() * .4), fl = .25 + r() * .5;
				add(n, [n[0] + Math.cos(fa) * fl, n[1] + Math.sin(fa) * fl], d, d + fl, false);
			}
		}
	}
	for (let j = 0; j < rings; j++) for (let i = 0; i < radials; i++) {
		if (r() > .8) continue;
		const a = node[i][j], b = node[(i + 1) % radials][j], m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
		const bow = .9 + r() * .06, mid = [impact[0] + (m[0] - impact[0]) * bow, impact[1] + (m[1] - impact[1]) * bow];
		const d0 = Math.max(dist[i][j], dist[(i + 1) % radials][j]) + .15, l1 = Math.hypot(mid[0] - a[0], mid[1] - a[1]), l2 = Math.hypot(b[0] - mid[0], b[1] - mid[1]);
		add(a, mid, d0, d0 + l1, true);
		add(mid, b, d0 + l1, d0 + l1 + l2, true);
	}
	const shards = [];
	for (let j = 1; j < rings; j++) for (let i = 0; i < radials; i++) {
		const i2 = (i + 1) % radials, poly = [
			node[i][j - 1],
			node[i][j],
			node[i2][j],
			node[i2][j - 1]
		];
		const c = poly.reduce((s, p) => [s[0] + p[0] / 4, s[1] + p[1] / 4], [0, 0]);
		if (Math.abs(c[0]) > h * .92 || Math.abs(c[1]) > h * .92) continue;
		shards.push({
			poly: poly.map((p) => [Math.max(-h, Math.min(h, p[0])), Math.max(-h, Math.min(h, p[1]))]),
			c,
			d: Math.max(dist[i][j], dist[i2][j]) + .3,
			j,
			seed: r()
		});
	}
	return {
		segs,
		shards,
		maxD: Math.max(...segs.map((s) => s.d1))
	};
}
/** The cube's faces: centre, in-plane axes u, v and outward normal n, for a cube of half-size h centred at c. */
function cubeFaces(c, h) {
	const F = [];
	for (const [n, u, v] of [
		[
			[
				0,
				0,
				1
			],
			[
				1,
				0,
				0
			],
			[
				0,
				1,
				0
			]
		],
		[
			[
				0,
				0,
				-1
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
			]
		],
		[
			[
				1,
				0,
				0
			],
			[
				0,
				0,
				-1
			],
			[
				0,
				1,
				0
			]
		],
		[
			[
				-1,
				0,
				0
			],
			[
				0,
				0,
				1
			],
			[
				0,
				1,
				0
			]
		],
		[
			[
				0,
				1,
				0
			],
			[
				1,
				0,
				0
			],
			[
				0,
				0,
				-1
			]
		],
		[
			[
				0,
				-1,
				0
			],
			[
				1,
				0,
				0
			],
			[
				0,
				0,
				1
			]
		]
	]) F.push({
		n,
		u,
		v,
		c: c.map((x, k) => x + n[k] * h)
	});
	return F;
}
var onFace = (f, x, y, lift = 0) => [
	0,
	1,
	2
].map((k) => f.c[k] + f.u[k] * x + f.v[k] * y + f.n[k] * lift);
//#endregion
export { crackPattern, cubeFaces, onFace };
