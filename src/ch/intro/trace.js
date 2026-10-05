import { TAU, clamp, ease } from "../../engine/math.js?v=BJIlRm7-";
import { arcLengths, atLength, dofDot, dofPolyline, dofSegment, headOf, mul } from "./kit.js?v=rUxrOt9G";
//#region src/ch/intro/trace.js
var S = 1.5;
var TRACE_Y = .002;
var STEP = .17;
var up = (p, y = TRACE_Y) => [
	p[0],
	y,
	p[1]
];
/** Offset an open 2D polyline by d to its left (miter joins, exact for the 45° chamfers used here). */
function offset2(pts, d) {
	const n = pts.length, out = [];
	const nrm = (a, b) => {
		const dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz);
		return [-dz / l, dx / l];
	};
	for (let i = 0; i < n; i++) {
		if (i === 0 || i === n - 1) {
			const m = i === 0 ? nrm(pts[0], pts[1]) : nrm(pts[n - 2], pts[n - 1]);
			out.push([pts[i][0] + m[0] * d, pts[i][1] + m[1] * d]);
			continue;
		}
		const m0 = nrm(pts[i - 1], pts[i]), m1 = nrm(pts[i], pts[i + 1]), bis = [m0[0] + m1[0], m0[1] + m1[1]], k = d / (1 + m0[0] * m1[0] + m0[1] * m1[1]);
		out.push([pts[i][0] + bis[0] * k, pts[i][1] + bis[1] * k]);
	}
	return out;
}
/** Walk the square ring (half-size s) by arc length u from its north-west corner, clockwise seen from above. */
function ringPoint(u, s) {
	const L = 8 * s;
	u = (u % L + L) % L;
	const side = Math.floor(u / (2 * s)), k = u - side * 2 * s;
	if (side === 0) return [-s + k, -s];
	if (side === 1) return [s, -s + k];
	if (side === 2) return [s - k, s];
	return [-s, s - k];
}
function ringArc(u0, u1, s) {
	const dir = Math.sign(u1 - u0) || 1;
	8 * s;
	const lo = Math.min(u0, u1), hi = Math.max(u0, u1), cs = [];
	for (let k = -2; k <= 6; k++) {
		const c = k * 2 * s;
		if (c > lo + 1e-6 && c < hi - 1e-6) cs.push(c);
	}
	cs.sort((a, b) => (a - b) * dir);
	return [
		ringPoint(u0, s),
		...cs.map((c) => ringPoint(c, s)),
		ringPoint(u1, s)
	];
}
/** Arc-length position on the ring of a point that lies on it. */
function ringU(p, s) {
	const [x, z] = p, e = 1e-6;
	if (Math.abs(z + s) < e) return x + s;
	if (Math.abs(x - s) < e) return 2 * s + z + s;
	if (Math.abs(z - s) < e) return 4 * s + (s - x);
	return 6 * s + (s - z);
}
/**
* Build the network once. Returns { lanes: [{ pts3, acc, len, t0 (sixteenths), w, main }], rings: [...fronts],
* vias: [{ p, t (sixteenths at which the trace reaches it) }], pads, contacts }.
*/
function buildNetwork() {
	const arms = [
		{
			c: [
				[.13, 0],
				[.62, 0],
				[.82, .2],
				[S, .2]
			],
			bus: true
		},
		{
			c: [
				[-.13, 0],
				[-.55, 0],
				[-.8, -.25],
				[-1.5, -.25]
			],
			bus: true
		},
		{
			c: [
				[.4, 0],
				[.4, -.5],
				[.65, -.75],
				[.65, -1.5]
			],
			from: [0, .27]
		},
		{
			c: [
				[-.38, 0],
				[-.38, .45],
				[-.62, .69],
				[-.62, S]
			],
			from: [1, .25]
		}
	];
	const lanes = [], vias = [], contacts = [];
	const add = (pts2, t0, w, main) => {
		const p3 = pts2.map((p) => up(p)), acc = arcLengths(p3);
		lanes.push({
			pts: p3,
			acc,
			len: acc.at(-1),
			t0,
			w,
			main
		});
		return lanes.at(-1);
	};
	arms.forEach((a, i) => {
		const t0 = a.from ? a.from[1] / STEP : 0;
		const main = add(a.c, t0, 3.2, true);
		contacts.push({
			p: a.c.at(-1),
			t: t0 + main.len / STEP
		});
		if (a.from) vias.push({
			p: up(a.c[0], TRACE_Y),
			t: t0,
			r: .03
		});
		if (a.bus) for (const d of [-.055, .055]) {
			const o = offset2(a.c, d).slice(1), first = Math.hypot(a.c[1][0] - a.c[0][0], a.c[1][1] - a.c[0][1]);
			const lane = add(o, t0 + first / STEP + .5, 1.8, false);
			contacts.push({
				p: o.at(-1),
				t: lane.t0 + lane.len / STEP
			});
		}
		const mid = a.c[2], dir = [a.c[3][0] - a.c[2][0], a.c[3][1] - a.c[2][1]], l = Math.hypot(...dir), u = [dir[0] / l, dir[1] / l], n = [-u[1], u[0]];
		for (const [f, side] of [[.25, 1], [.6, -1]]) {
			const b = [mid[0] + dir[0] * f, mid[1] + dir[1] * f], e = [b[0] + (u[0] + n[0] * side) * .1, b[1] + (u[1] + n[1] * side) * .1], e2 = [e[0] + n[0] * side * .08, e[1] + n[1] * side * .08];
			const tb = t0 + (Math.hypot(mid[0] - a.c[0][0], mid[1] - a.c[0][1]) + l * f) / STEP;
			const s = add([
				b,
				e,
				e2
			], tb, 1.6, false);
			vias.push({
				p: up(e2),
				t: tb + s.len / STEP,
				r: .022
			});
		}
	});
	const outer = contacts.filter((c) => Math.abs(Math.abs(c.p[0]) - 1.5) < 1e-6 || Math.abs(Math.abs(c.p[1]) - 1.5) < 1e-6).map((c) => ({
		...c,
		u: ringU(c.p, S)
	})).sort((a, b) => a.u - b.u);
	const rings = [];
	outer.forEach((c, i) => {
		const prev = outer[(i - 1 + outer.length) % outer.length];
		const gapN = (outer[(i + 1) % outer.length].u - c.u + 8 * S) % (8 * S), gapP = (c.u - prev.u + 8 * S) % (8 * S);
		for (const [target, dirSign] of [[c.u + gapN / 2, 1], [c.u - gapP / 2, -1]]) {
			const pts = ringArc(c.u, target, S).map((p) => up(p)), acc = arcLengths(pts);
			rings.push({
				pts,
				acc,
				len: acc.at(-1),
				t0: c.t,
				w: 2.6,
				dir: dirSign
			});
		}
	});
	const inner = [];
	for (let k = 0; k < 4; k++) {
		const p = ringArc(k * 2 * 1.44, (k + 1) * 2 * 1.44, 1.44).map((q) => up(q)), acc = arcLengths(p);
		inner.push({
			pts: p,
			acc,
			len: acc.at(-1)
		});
	}
	return {
		lanes,
		rings,
		inner,
		vias,
		contacts,
		S
	};
}
/**
* Growth state at song time t. start: time of the first sixteenth; sixteenth: its duration; ringEnd: when the ring
* closes (all fronts meet). hops is a continuous count of sixteenths: integer steps with a fast ease inside each
* sixteenth (a tick-tick-tick draw). Pass hops/ring directly for a reversed (shutdown) animation.
*/
function traceState(t, { start, sixteenth, ringStart, ringEnd }) {
	const x = (t - start) / sixteenth, f = Math.floor(x), frac = x - f;
	const hops = x <= 0 ? 0 : f + ease.outExpo(clamp(frac / .6));
	const rx = (t - ringStart) / sixteenth, rn = (ringEnd - ringStart) / sixteenth, rf = Math.floor(rx);
	const ring = rx <= 0 ? 0 : clamp((rf + ease.outExpo(clamp((rx - rf) / .6))) / rn);
	return {
		hops,
		ring,
		close: ring >= 1 ? 1 : 0
	};
}
/** Length of each lane drawn at a hop count (lanes start at their own hop offset). */
var laneDrawn = (lane, hops) => clamp((hops - lane.t0) * STEP, 0, lane.len);
/**
* Draw the network. o: color (HDR rgb), tip (brightness of growing tips), dof (see kit.dofSegment), inner (0..1 inner
* ring), vias (bool), widthK. Returns the list of growing tip points (for callouts).
* (the remake's colours, intro/palette.js: tipColor, the growing tips; viaColor, the vias; viaFlash, the colour a via
* flares in for a moment as the trace reaches it)
*/
function drawTraces(L, net, st, o = {}) {
	const col = o.color ?? [
		.7,
		.74,
		.8
	], wk = o.widthK ?? 1, dof = o.dof, tips = [], tc = o.tipColor ?? [
		1,
		1,
		1
	], vc = o.viaColor ?? col;
	for (const lane of net.lanes) {
		const d = laneDrawn(lane, st.hops);
		if (d <= 0) continue;
		const pts = headOf(lane.pts, lane.acc, d);
		dofPolyline(L, pts, {
			color: mul(col, lane.main ? 1 : .7),
			width: lane.w * wk
		}, dof);
		if (d < lane.len - 1e-4) {
			tips.push(pts.at(-1));
			dofDot(L, pts.at(-1), {
				color: mul(tc, (o.tip ?? 3) * (lane.main ? 1 : .6)),
				width: (lane.main ? 11 : 7) * wk
			}, dof);
		} else dofDot(L, pts.at(-1), {
			color: mul(col, 1.2),
			width: 6 * wk
		}, dof);
	}
	for (const r of net.rings) {
		const d = st.ring * r.len;
		if (d <= 0) continue;
		const pts = headOf(r.pts, r.acc, d);
		dofPolyline(L, pts, {
			color: mul(col, .95),
			width: r.w * wk
		}, dof);
		if (st.ring < 1) {
			tips.push(pts.at(-1));
			dofDot(L, pts.at(-1), {
				color: mul(tc, o.tip ?? 3),
				width: 10 * wk
			}, dof);
		}
	}
	if ((o.inner ?? 0) > 0) for (const r of net.inner) dofPolyline(L, headOf(r.pts, r.acc, r.len * o.inner), {
		color: mul(col, .45),
		width: 1.4 * wk
	}, dof);
	if (o.vias !== false) for (const v of net.vias) {
		if (st.hops < v.t) continue;
		const k = clamp((st.hops - v.t) / 2), ring = [];
		for (let i = 0; i <= 16; i++) {
			const a = i / 16 * TAU;
			ring.push([
				v.p[0] + Math.cos(a) * v.r,
				v.p[1],
				v.p[2] + Math.sin(a) * v.r
			]);
		}
		dofPolyline(L, ring, {
			color: mul(vc, .9 * k),
			width: 1.6 * wk
		}, dof);
		dofDot(L, v.p, {
			color: mul(vc, 1.1 * k),
			width: 5 * wk
		}, dof);
		if (o.viaFlash) {
			const age = st.hops - v.t, f = Math.min(1, age / .5) * Math.exp(-Math.max(0, age - .5) / 1.2);
			if (f > .01) dofDot(L, v.p, {
				color: mul(o.viaFlash, 2.4 * f),
				width: 12 * wk
			}, dof);
		}
	}
	return tips;
}
/**
* Current: bright pulses running outwards along every drawn lane, evenly spaced, speed v (units/s). A pure function
* of t. o: color, width, spacing, tail (length of the streak behind each pulse), dof; head (the remake: a colour for
* the pulse's hot head, a dot at its front).
*/
function drawCurrent(L, net, st, t, o = {}) {
	const v = o.speed ?? 1.6, sp = o.spacing ?? .26, tail = o.tail ?? .07, col = o.color ?? [
		1,
		1,
		1
	];
	let count = 0;
	for (const [i, lane] of net.lanes.entries()) {
		const d = laneDrawn(lane, st.hops);
		if (d < .05) continue;
		const phase = (t * v + i * .137) % sp;
		for (let s = phase; s < d; s += sp) {
			const [p, dir] = atLength(lane.pts, lane.acc, s), q = [
				p[0] - dir[0] * tail,
				p[1],
				p[2] - dir[2] * tail
			];
			const fade = Math.min(1, s / .15, (d - s) / .1);
			dofSegment(L, q, p, {
				color: mul(col, (lane.main ? 1 : .6) * fade * (o.bright ?? 1)),
				width: o.width ?? 5
			}, o.dof);
			if (o.head) dofDot(L, p, {
				color: mul(o.head, (lane.main ? 1 : .6) * fade * (o.bright ?? 1) * 1.5),
				width: (o.width ?? 5) * 1.25
			}, o.dof);
			count++;
		}
	}
	return count;
}
/** Total drawn copper length (for a live readout). */
function drawnLength(net, st) {
	let s = 0;
	for (const lane of net.lanes) s += laneDrawn(lane, st.hops);
	for (const r of net.rings) s += st.ring * r.len;
	return s;
}
//#endregion
export { S, STEP, TRACE_Y, buildNetwork, drawCurrent, drawTraces, drawnLength, laneDrawn, traceState };
