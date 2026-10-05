import { clamp } from "../../engine/math.js?v=BJIlRm7-";
//#region src/ch/pre1/lens-model.js
var LENS = Object.freeze({
	rIn: 1,
	rMid: 1.12,
	rOut: 1.32,
	rf: 2.6,
	zApex: 0,
	n: 1.45,
	zB1: -.4,
	rB1: .93,
	zB2: -.62,
	rB2: .86,
	zD: -.86,
	rH: .8,
	zL: -1.15,
	zR: -1.6
});
var STOPS = [
	1.4,
	2,
	2.8,
	4,
	5.6,
	8,
	11,
	16,
	22
];
var NMAX = 1.4;
/** Stops down from f/1.4 (a stop is a factor √2 in N and half the light): 1.4 → 0, 2.8 → 2, 5.6 → 4, 11 → 5.95. */
var stopIndex = (N) => 2 * Math.log2(N / NMAX);
/** Distance from the axis to the edge of the opening at an angle phi from a side's normal (|phi| ≤ 30°). */
function edgeRadius(phi, a, rho) {
	const e = rho - a;
	return -e * Math.cos(phi) + Math.sqrt(rho * rho - e * e * Math.sin(phi) ** 2);
}
/** Where two neighbouring blade edges meet (the corners). */
var cornerRadius = (a, rho) => edgeRadius(Math.PI / 6, a, rho);
/** Area of the opening (Simpson over half a side, twelve times), clipped by the housing. */
function openingArea(a, rho, rH = LENS.rH) {
	const m = 64, h = Math.PI / 6 / m;
	let s = 0;
	for (let i = 0; i <= m; i++) {
		const r = Math.min(edgeRadius(i * h, a, rho), rH);
		s += (i === 0 || i === m ? 1 : i % 2 ? 4 : 2) * r * r / 2;
	}
	return 12 * s * h / 3;
}
/**
* How hexagonal the opening is at f-number N: 0 a circle, 1 a regular hexagon. Round wide open (the blades' curved
* edges follow the housing), a rounded hexagon at f/5.6, all but straight-sided at f/11 and beyond.
*/
var hexness = (N) => clamp(1 - Math.exp(-((Math.max(0, stopIndex(N) - 1.7) / 2.1) ** 1.6)));
var C30 = Math.cos(Math.PI / 6);
/**
* The radius of the blade edges that gives the corners at kappa times the inradius (1 ≤ kappa < 1/cos 30°), from
* edgeRadius(30°) = kappa·a: rho = a (kappa² + 1 − 2 kappa cos 30°) / (2 (1 − kappa cos 30°)).
*/
function rhoFor(a, kappa) {
	const k = Math.min(kappa, 1 / C30 - 1e-6);
	return a * (k * k + 1 - 2 * k * C30) / (2 * (1 - k * C30));
}
/** The corner-to-inradius ratio of a given hexness (1: round … 1/cos 30°: hexagon). */
var kappaOf = (h) => 1 + clamp(h) * (1 / C30 - 1) * .985;
/** The diaphragm at f-number N: inradius a, blade-edge radius rho, the corners rc, its rotation. */
function aperture(N, { rH = LENS.rH } = {}) {
	const kappa = kappaOf(hexness(N));
	if (N <= 1.4) return {
		a: rH,
		rho: rH,
		rc: rH,
		kappa: 1,
		rot: bladeRot(N),
		area: Math.PI * rH * rH
	};
	const target = Math.PI * rH * rH * (NMAX / N) ** 2;
	let lo = 0, hi = rH;
	for (let i = 0; i < 48; i++) {
		const m = (lo + hi) / 2;
		if (openingArea(m, rhoFor(m, kappa), rH) < target) lo = m;
		else hi = m;
	}
	const a = (lo + hi) / 2, rho = rhoFor(a, kappa);
	return {
		a,
		rho,
		rc: Math.min(cornerRadius(a, rho), rH),
		kappa,
		rot: bladeRot(N),
		area: openingArea(a, rho, rH)
	};
}
/** The blades turn as they close (the published iris's rotation: f/2 at −.25 rad). */
var bladeRot = (N) => -.25 + 1.1 * (1 - 2 / N);
/**
* The aperture ring: the f-numbers are engraved a step apart, clockwise from 1.4; the ring turns so that the stop that
* is set sits at the index (on the fixed ring inside it, at the angle `index`).
*/
var RING = Object.freeze({
	index: 152 * Math.PI / 180,
	step: 7 * Math.PI / 180
});
/** The ring's turn with f-number N set. */
var ringTurn = (N) => RING.index + stopIndex(N) * RING.step;
/**
* The scope's DC trace, seen through the lens behind the diaphragm, switched off as a CRT is: the line draws in to a
* point at its middle between t0 and t1. Returns its half-length (L0 before, 0 after).
*/
function traceHalf(t, t0, t1, L0) {
	const k = clamp((t - t0) / (t1 - t0));
	return L0 * (1 - k * k * (3 - 2 * k)) ** 1.6;
}
/**
* Where the light (on the axis at depth zL) is seen from the camera at c, through the front element: the point of the
* bezel plane (z = 0) that the ray to it crosses. The ghosts lie on the line from it through the axis.
*/
function lightImage(c, { zL = LENS.zL, rf = LENS.rf, zApex = LENS.zApex, n = LENS.n } = {}) {
	let x = [c[0] * -zL / (c[2] - zL), c[1] * -zL / (c[2] - zL)];
	for (let it = 0; it < 12; it++) {
		const miss = throughFront(c, x, {
			zL,
			rf,
			zApex,
			n
		});
		if (!miss) break;
		x = [x[0] - miss[0] * .75, x[1] - miss[1] * .75];
	}
	return x;
}
/** Where the ray from the camera at c through the point x of the bezel plane meets the light plane, refracted by the front element. */
function throughFront(c, x, { zL = LENS.zL, rf = LENS.rf, zApex = LENS.zApex, n = LENS.n } = {}) {
	let d = [
		x[0] - c[0],
		x[1] - c[1],
		-c[2]
	];
	const l = Math.hypot(...d);
	d = d.map((v) => v / l);
	const cs = [
		0,
		0,
		zApex - rf
	], oc = [
		c[0] - cs[0],
		c[1] - cs[1],
		c[2] - cs[2]
	];
	const b = oc[0] * d[0] + oc[1] * d[1] + oc[2] * d[2], h = b * b - (oc[0] ** 2 + oc[1] ** 2 + oc[2] ** 2) + rf * rf;
	if (h < 0) return null;
	const t = -b - Math.sqrt(h), p = c.map((v, i) => v + d[i] * t), nn = p.map((v, i) => (v - cs[i]) / rf);
	const eta = 1 / n, ci = -(nn[0] * d[0] + nn[1] * d[1] + nn[2] * d[2]), k = 1 - eta * eta * (1 - ci * ci);
	const r = d.map((v, i) => eta * v + (eta * ci - Math.sqrt(k)) * nn[i]);
	const s = (zL - p[2]) / r[2];
	return [p[0] + r[0] * s, p[1] + r[1] * s];
}
//#endregion
export { LENS, NMAX, RING, STOPS, aperture, bladeRot, cornerRadius, edgeRadius, hexness, kappaOf, lightImage, openingArea, rhoFor, ringTurn, stopIndex, throughFront, traceHalf };
