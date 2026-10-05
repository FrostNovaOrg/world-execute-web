import { TAU, hash2, rng } from "../../engine/math.js?v=BJIlRm7-";
import { alloc, put } from "./shapeset.js?v=Bbzza00z";
//#region src/ch/v2/quantum.js
var PSI = {
	a: [
		-.3,
		0,
		0
	],
	d: [
		.3,
		0,
		0
	],
	sigma: .24,
	k: [
		40,
		0,
		0
	],
	box: .82
};
var COL_ALIVE = [
	1,
	.55,
	.2
];
var COL_DEAD = [
	.55,
	.55,
	.75
];
var gauss = (r) => {
	const u = Math.max(1e-9, r()), v = r();
	return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * v);
};
/** N points from the two packets (equal weights): x ~ N(centre, σ²) per axis, clipped to the box. col.a = lobe (0/1). */
function psiShape(N, { seed = 181 } = {}) {
	const r = rng(seed), S = alloc(N), s = PSI.sigma / Math.SQRT2, B = PSI.box - .02;
	for (let i = 0; i < N; i++) {
		const lobe = i & 1, c = lobe ? PSI.d : PSI.a;
		let p;
		do
			p = [
				c[0] + gauss(r) * s,
				c[1] + gauss(r) * s * 1.15,
				c[2] + gauss(r) * s
			];
		while (Math.abs(p[0]) > B || Math.abs(p[1]) > B || Math.abs(p[2]) > B);
		put(S, i, p, (lobe ? COL_DEAD : COL_ALIVE).map((v) => v * (.8 + .4 * r())), [
			0,
			0,
			0
		], r(), lobe);
	}
	return S;
}
/** The collapsed state: most points in a narrow packet at |alive⟩, a few in a faint wider halo. */
function peakShape(N, { seed = 191 } = {}) {
	const r = rng(seed), S = alloc(N), c = PSI.a;
	for (let i = 0; i < N; i++) {
		const w = i % 7 === 0 ? .09 : .022;
		const p = [
			c[0] + gauss(r) * w,
			c[1] + gauss(r) * w,
			c[2] + gauss(r) * w
		];
		put(S, i, p, COL_ALIVE.map((v) => v * (.85 + .3 * r())), [
			0,
			0,
			0
		], r(), 0);
	}
	return S;
}
/**
* Decay events of the watched sample between t0 and t1 (song seconds): a Poisson train of mean rate `rate` per
* second, deterministic (hashed per 1 ms slot), so every render agrees. Returns sorted click times.
*/
function geigerClicks(t0, t1, rate = 9, seed = 7) {
	const out = [], dt = .001, p = rate * dt;
	for (let k = Math.floor(t0 / dt); k * dt < t1; k++) if (hash2(k, seed) < p) out.push(k * dt);
	return out;
}
//#endregion
export { COL_ALIVE, COL_DEAD, PSI, geigerClicks, peakShape, psiShape };
