import { TAU, rng, smoothstep } from "../../engine/math.js?v=BJIlRm7-";
//#region src/ch/title/galaxy-model.js
var DEG = Math.PI / 180;
var GAL = Object.freeze({
	arms: 2,
	pitch: 15 * DEG,
	rIn: .8,
	rOut: 5.4,
	rMax: 6.6,
	e0: .05,
	th0: 0,
	hR: 1.5,
	hz: .15,
	hRy: 1.8,
	hzy: .045,
	hRd: 2.1,
	hzd: .07,
	bulge: Object.freeze({
		re: .72,
		q: .75,
		n: 2,
		mMax: 2.4
	}),
	v0: .055,
	rc: .3,
	rCR: 4.4,
	dYoung: .55,
	kYoung: 3.2,
	dDust: .75,
	kDust: 22,
	alpha: 2.1,
	LMAX: 1e3
});
var COT = 1 / Math.tan(GAL.pitch);
/** Angular speed of a star at radius r (flat rotation curve outside the core). */
var omega = (r) => GAL.v0 / Math.sqrt(r * r + GAL.rc * GAL.rc);
/** The pattern speed (slower than the stars inside corotation). */
var OMEGA_P = omega(GAL.rCR);
/** Orientation of the ellipse of size a (radians). */
var theta = (a) => GAL.th0 - COT * Math.log(Math.max(a, .001) / GAL.rIn);
/** Ellipticity of the orbit of size a (0 inside the bulge and beyond the rim). */
var ecc = (a) => GAL.e0 * smoothstep(GAL.rIn * .6, GAL.rIn * 1.5, a) * (1 - smoothstep(GAL.rOut, GAL.rMax, a));
/** The azimuth (one of two; the other arm is π away) where the arm phase is psi at radius r. */
var phiAt = (r, psi) => theta(r) + (psi - 2 * COT * ecc(r) + Math.atan2(2 * COT, r / GAL.hR)) / 2;
/**
* How strongly star formation lights each arm along its length (0..1): the two arms differ, brighten and fade in
* stretches (side: which arm, the sign of cos(Ψ/2)). The young light of the glow uses the same function.
*/
var armLight = (r, side) => {
	const l = Math.log(Math.max(r, .05));
	return .5 + .3 * Math.sin(2.6 * l + 1.7 * side + .4) + .2 * Math.sin(5.3 * l + 2.9 * side + 1.1);
};
/** Sérsic n → the Prugniel–Simien deprojection's exponents p and b. */
var ps = (n) => ({
	p: 1 - .6097 / n + .05463 / (n * n),
	b: 2 * n - 1 / 3 + .009876 / n
});
var BULGE_PS = Object.freeze(ps(GAL.bulge.n));
/** Bulge luminosity density at the elliptical radius m (in units of re), with a tiny core. */
var bulgeRho = (m) => (m + .008) ** -BULGE_PS.p * Math.exp(-BULGE_PS.b * m ** (1 / GAL.bulge.n));
/**
* Where a star is at galaxy time tg (seconds since the line exploded), from its orbit elements o = [a, ψ0, y, mode]:
*   mode 0  a disc orbit: the ellipse of size a turned to θ(a), run at Ω(a) − Ωp, in the frame that turns at Ωp
*   mode 1  locked to the pattern (young stars, knots): the polar position (a, ψ0) of the pattern frame
*   mode 2  a circular orbit at Ω(a) (the bulge)
* The shader in galaxy.js computes exactly this.
*/
function orbitPos(o, tg, out = [
	0,
	0,
	0
]) {
	const a = o[0], psi0 = o[1], y = o[2], mode = o[3];
	if (mode > .5) {
		const ang = psi0 + (mode > 1.5 ? omega(a) : OMEGA_P) * tg;
		out[0] = a * Math.cos(ang);
		out[1] = y;
		out[2] = a * Math.sin(ang);
		return out;
	}
	const e = ecc(a), psi = psi0 + (omega(a) - OMEGA_P) * tg;
	const qx = a * Math.cos(psi), qz = a * (1 - 2 * e) * Math.sin(psi), th = theta(a) + OMEGA_P * tg, c = Math.cos(th), s = Math.sin(th);
	out[0] = c * qx - s * qz;
	out[1] = y;
	out[2] = s * qx + c * qz;
	return out;
}
var KIND = Object.freeze({
	bulge: 0,
	old: 1,
	young: 2,
	knot: 3
});
/** Truncated power law on [1, LMAX] with dN/dL ∝ L^−alpha; u in [0, 1). */
function lumAt(u) {
	const b = GAL.alpha - 1;
	return (1 - u * (1 - GAL.LMAX ** -b)) ** (-1 / b);
}
var BULGE_CDF = null;
/** The bulge's radial distribution (elliptical radius m in units of re), tabulated once. */
function bulgeCdf() {
	if (BULGE_CDF) return BULGE_CDF;
	const n = 4096, mMax = GAL.bulge.mMax, c = /* @__PURE__ */ new Float64Array(4097);
	for (let i = 1; i <= n; i++) {
		const m = (i - .5) / n * mMax;
		c[i] = c[i - 1] + bulgeRho(m) * m * m;
	}
	for (let i = 0; i <= n; i++) c[i] /= c[n];
	return BULGE_CDF = {
		c,
		n,
		mMax
	};
}
function sampleBulgeM(u) {
	const { c, n, mMax } = bulgeCdf();
	let lo = 0, hi = n;
	while (hi - lo > 1) {
		const mid = lo + hi >> 1;
		if (c[mid] < u) lo = mid;
		else hi = mid;
	}
	const k = (u - c[lo]) / Math.max(c[hi] - c[lo], 1e-12);
	return (lo + k) / n * mMax;
}
var laplace = (r, h) => (r() < .5 ? -1 : 1) * -h * Math.log(1 - r());
/** von Mises deviate around 0 with concentration k (rejection from the uniform: cheap at k ≈ 3–6). */
function vonMises(r, k) {
	for (;;) {
		const x = (r() * 2 - 1) * Math.PI;
		if (r() < Math.exp(k * (Math.cos(x) - 1))) return x;
	}
}
/** Radius with surface density ∝ exp(−r / h)·w(r) (rejection from the Gamma(2, h) proposal). */
function discR(r, h, w = () => 1) {
	for (;;) {
		const x = -h * Math.log(Math.max(r() * r(), 1e-300));
		if (x < GAL.rMax && r() < w(x)) return x;
	}
}
var youngW = (x) => smoothstep(GAL.rIn * .75, GAL.rIn * 1.3, x) * (1 - smoothstep(GAL.rOut, GAL.rMax, x));
/** A young star's pattern-frame polar position (r, φ): downstream of the ridge, on either arm, as the arm is lit. */
function youngSpot(r, k = GAL.kYoung) {
	for (;;) {
		const x = discR(r, GAL.hRy, youngW), side = r() < .5 ? 0 : 1;
		if (r() < armLight(x, side)) return [x, phiAt(x, GAL.dYoung + vonMises(r, k)) + side * Math.PI];
	}
}
var CLUSTERS = null;
/**
* The galaxy's star clusters (one list for every swarm: the burst's stars and the field share the same arms).
* [{ r, phi, y, s (radius), w (richness) }], the richest first.
*/
function clusters() {
	if (CLUSTERS) return CLUSTERS;
	const r = rng(9157), out = [];
	for (let i = 0; i < 340; i++) {
		const [x, phi] = youngSpot(r, 6);
		out.push({
			r: x,
			phi,
			y: laplace(r, GAL.hzy * .5),
			s: .018 + .05 * r() ** 2,
			w: lumAt(r() * .995)
		});
	}
	out.sort((a, b) => b.w - a.w);
	let acc = 0;
	for (const c of out) {
		acc += c.w;
		c.acc = acc;
	}
	return CLUSTERS = out;
}
function pickCluster(r) {
	const C = clusters(), u = r() * C.at(-1).acc;
	let lo = 0, hi = C.length - 1;
	while (lo < hi) {
		const m = lo + hi >> 1;
		if (C[m].acc < u) lo = m + 1;
		else hi = m;
	}
	return C[lo];
}
var gauss = (r) => Math.sqrt(-2 * Math.log(Math.max(r(), 1e-12))) * Math.cos(TAU * r());
/** Old stars (the disc's and the bulge's giants) are fainter than the young arms' supergiants. */
var OLD_LUM = .3;
/**
* Orbit elements and looks for N stars. Returns { orb, look } (Float32Array N·4 each):
*   orb  = [a, ψ0, y, mode] (see orbitPos)
*   look = [L, kind, tint (0..1, the spread of colour within a population), size (knots: world diameter; else 0)]
* o: seed; mix: fractions of { bulge, old, young } (they are normalised); knots: how many HII knots (taken from the
* end of the table); lum: [u0, u1], the part of the luminosity function drawn from (the burst's stars are the bright
* ones); skip(i): slots to leave empty (zeros).
*/
function starTables(N, { seed = 1, mix = {
	bulge: .22,
	old: .54,
	young: .24
}, knots = 0, lum = [0, 1], skip = null } = {}) {
	const r = rng(seed), orb = new Float32Array(N * 4), look = new Float32Array(N * 4);
	const tot = mix.bulge + mix.old + mix.young, fb = mix.bulge / tot, fo = fb + mix.old / tot;
	const C = clusters(), knotFrom = N - knots;
	for (let i = 0; i < N; i++) {
		if (skip?.(i)) continue;
		const L = lumAt(lum[0] + (lum[1] - lum[0]) * r()), tint = r();
		if (i >= knotFrom) {
			const c = C[(i - knotFrom) % Math.min(C.length, 90)], k = Math.floor((i - knotFrom) / 90);
			const dr = c.s * .7 * gauss(r), dp = c.s * .7 * gauss(r) / c.r;
			orb.set([
				c.r + dr,
				c.phi + dp,
				c.y + laplace(r, .006),
				1
			], i * 4);
			look.set([
				.6 + .8 * r() / (1 + k),
				KIND.knot,
				tint,
				.03 + .045 * r() * c.s / .068
			], i * 4);
			continue;
		}
		const u = r();
		if (u < fb) {
			const m = sampleBulgeM(r()) * GAL.bulge.re, cz = r() * 2 - 1, ph = r() * TAU, q = Math.sqrt(1 - cz * cz);
			const x = m * q * Math.cos(ph), z = m * q * Math.sin(ph), y = m * cz * GAL.bulge.q;
			orb.set([
				Math.hypot(x, z),
				Math.atan2(z, x),
				y,
				2
			], i * 4);
			look.set([
				L * OLD_LUM,
				KIND.bulge,
				tint,
				0
			], i * 4);
		} else if (u < fo) {
			orb.set([
				discR(r, GAL.hR),
				r() * TAU,
				laplace(r, GAL.hz),
				0
			], i * 4);
			look.set([
				L * OLD_LUM,
				KIND.old,
				tint,
				0
			], i * 4);
		} else if (r() < .5) {
			const c = pickCluster(r), dr = c.s * gauss(r), dp = c.s * gauss(r) / c.r;
			orb.set([
				Math.max(.3, c.r + dr),
				c.phi + dp,
				c.y + laplace(r, .012),
				1
			], i * 4);
			look.set([
				L,
				KIND.young,
				tint,
				0
			], i * 4);
		} else {
			const [x, phi] = youngSpot(r);
			orb.set([
				x,
				phi,
				laplace(r, GAL.hzy),
				1
			], i * 4);
			look.set([
				L,
				KIND.young,
				tint,
				0
			], i * 4);
		}
	}
	return {
		orb,
		look
	};
}
/** Positions (x, y, z, 0) at galaxy time tg of every star of a table (a swarm's shape texture; empty slots stay 0). */
function positionsAt(orb, tg) {
	const N = orb.length / 4, out = new Float32Array(N * 4), p = [
		0,
		0,
		0
	], o = [
		0,
		0,
		0,
		0
	];
	for (let i = 0; i < N; i++) {
		o[0] = orb[i * 4];
		o[1] = orb[i * 4 + 1];
		o[2] = orb[i * 4 + 2];
		o[3] = orb[i * 4 + 3];
		if (o[0] === 0 && o[1] === 0 && o[2] === 0 && o[3] === 0) continue;
		orbitPos(o, tg, p);
		out[i * 4] = p[0];
		out[i * 4 + 1] = p[1];
		out[i * 4 + 2] = p[2];
	}
	return out;
}
/** The readout's numbers. */
var READOUT = Object.freeze([
	["arms", `${GAL.arms}`],
	["pitch", `${(GAL.pitch / DEG).toFixed(1)}°`],
	["h_R", `${GAL.hR.toFixed(2)}`],
	["h_z", `${GAL.hz.toFixed(2)}`]
]);
//#endregion
export { BULGE_PS, COT, GAL, KIND, OMEGA_P, READOUT, armLight, bulgeRho, clusters, ecc, lumAt, omega, orbitPos, phiAt, positionsAt, starTables, theta };
