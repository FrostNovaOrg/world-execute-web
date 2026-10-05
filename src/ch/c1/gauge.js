import { TAU, clamp, lerp } from "../../engine/math.js?v=BJIlRm7-";
import { mixc } from "./palette.js?v=saiYSP4J";
//#region src/ch/c1/gauge.js
var GAUGE = {
	a0: 1.25 * Math.PI,
	sweep: 1.5 * Math.PI,
	R: 1
};
/** Angle of value v (0..100). */
var gaugeAngle = (v) => GAUGE.a0 - clamp(v / 100) * GAUGE.sweep;
var gaugePoint = (v, r = 1) => {
	const a = gaugeAngle(v);
	return [
		Math.cos(a) * r,
		Math.sin(a) * r,
		0
	];
};
/**
* v: value 0..100 (ticks lit = floor(v)); o: gain, flash (0..1 celebration), fresh (seconds since the last tick lit);
* warm/rose/hot/dim colours from pal. c3 drains it by passing a falling v with PAL.c3 (ticks go dark from the top).
*/
function drawGauge(L, v, pal, o = {}) {
	const g = o.gain ?? 1, lit = Math.floor(v + 1e-6), flash = o.flash ?? 0, R = GAUGE.R;
	for (const [r, c, w] of [[
		1.13,
		pal.dim.map((x) => x * .9),
		1.6
	], [
		.8,
		pal.dim.map((x) => x * .6),
		1.3
	]]) {
		const pts = [];
		for (let i = 0; i <= 120; i++) {
			const a = GAUGE.a0 - i / 120 * GAUGE.sweep;
			pts.push([
				Math.cos(a) * r,
				Math.sin(a) * r,
				0
			]);
		}
		L.polyline(pts, {
			color: c.map((x) => x * g),
			width: w
		});
	}
	for (let k = 0; k <= 100; k++) {
		const a = gaugeAngle(k), c = Math.cos(a), s = Math.sin(a), major = k % 10 === 0, mid = k % 5 === 0;
		const r0 = major ? .86 : mid ? .9 : .93, on = k <= lit;
		let col;
		if (on) {
			const warm = mixc(pal.warm, pal.rose, k / 100), fresh = k === lit ? Math.exp(-(o.fresh ?? 1) * 18) : 0;
			col = mixc(warm, pal.hot, .35 * flash + .6 * fresh).map((x) => x * (1.35 + .8 * fresh + .5 * flash) * g);
		} else col = pal.dim.map((x) => x * (major ? 1.1 : .7) * g);
		L.segment([
			c * r0 * R,
			s * r0 * R,
			0
		], [
			c * R,
			s * R,
			0
		], {
			color: col,
			width: major ? 3.2 : 2.2
		});
	}
	if (v > 0) {
		const pts = [], n = Math.max(2, Math.ceil(v * 1.2));
		for (let i = 0; i <= n; i++) {
			const a = gaugeAngle(v * i / n);
			pts.push([
				Math.cos(a) * .8,
				Math.sin(a) * .8,
				0
			]);
		}
		L.polyline(pts, {
			color: mixc(pal.warm, pal.hot, flash).map((x) => x * (1.1 + .6 * flash) * g),
			width: 2.6
		});
		const p = gaugePoint(v, .8);
		L.segment(p, p, {
			color: pal.hot.map((x) => x * 2.6 * g),
			width: 12
		});
	}
}
/** Anchors for the dial numbers (every 10 %): [[text, [x, y, z]]]. */
function gaugeNumbers() {
	const out = [];
	for (let k = 0; k <= 100; k += 10) out.push([String(k), gaugePoint(k, .72)]);
	return out;
}
/** The halo leaving the dial at 100 %: an expanding, fading ring (k: 0..1 since the moment). */
function drawHalo(L, k, pal, o = {}) {
	if (k <= 0 || k >= 1) return;
	const r = lerp(1.15, o.r1 ?? 3.2, 1 - (1 - k) ** 3), f = (1 - k) ** 1.6, pts = [];
	for (let i = 0; i <= 160; i++) {
		const a = i / 160 * TAU;
		pts.push([
			Math.cos(a) * r,
			Math.sin(a) * r,
			0
		]);
	}
	L.polyline(pts, {
		color: pal.hot.map((x) => x * 2.2 * f * (o.gain ?? 1)),
		width: 3 + 6 * f
	});
}
//#endregion
export { GAUGE, drawGauge, drawHalo, gaugeAngle, gaugeNumbers, gaugePoint };
