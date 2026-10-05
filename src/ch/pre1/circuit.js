import { TAU, clamp, lerp } from "../../engine/math.js?v=BJIlRm7-";
//#region src/ch/pre1/circuit.js
var P = {
	src: [-3.1, 0],
	srcR: .4,
	pivot: [-2.35, 1.35],
	contact: [-1.75, 1.35],
	T: [0, .75],
	R: [.75, 0],
	B: [0, -.75],
	L: [-.75, 0],
	hop: [-1.3, -1.35],
	capX: 2.3,
	loadX: 3.3,
	rail: 1.8
};
var v3 = (p) => [
	p[0],
	p[1],
	0
];
var AC_TOP = [
	[-3.1, .4],
	[-3.1, 1.35],
	P.pivot,
	P.contact,
	[0, 1.35],
	P.T
];
var AC_BOT = [
	[-3.1, -.4],
	[-3.1, -1.35],
	[0, -1.35],
	P.B
];
var DC_LOOP = [
	P.R,
	[1.5, 0],
	[1.5, P.rail],
	[P.loadX, P.rail],
	[P.loadX, .45],
	[P.loadX, -.45],
	[P.loadX, -P.rail],
	[-1.3, -P.rail],
	[-1.3, 0],
	P.L
];
var DIODES = {
	D1: [P.T, P.R],
	D2: [P.B, P.R],
	D3: [P.L, P.T],
	D4: [P.L, P.B]
};
function pathLen(pts) {
	let s = 0;
	for (let i = 1; i < pts.length; i++) s += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
	return s;
}
function along(pts, s) {
	const total = pathLen(pts);
	s = (s % total + total) % total;
	for (let i = 1; i < pts.length; i++) {
		const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
		if (s <= l) {
			const k = l > 0 ? s / l : 0;
			return [
				lerp(pts[i - 1][0], pts[i][0], k),
				lerp(pts[i - 1][1], pts[i][1], k),
				0
			];
		}
		s -= l;
	}
	return v3(pts.at(-1));
}
function diode(Lines, a, b, col, w) {
	const m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], d = [b[0] - a[0], b[1] - a[1]], l = Math.hypot(...d), u = [d[0] / l, d[1] / l], n = [-u[1], u[0]], s = .13;
	const base = [m[0] - u[0] * s, m[1] - u[1] * s], tip = [m[0] + u[0] * s, m[1] + u[1] * s];
	Lines.segment(v3(a), v3(base), {
		color: col,
		width: w
	});
	Lines.segment(v3(tip), v3(b), {
		color: col,
		width: w
	});
	const b1 = [base[0] + n[0] * s, base[1] + n[1] * s], b2 = [base[0] - n[0] * s, base[1] - n[1] * s];
	Lines.polyline([
		v3(b1),
		v3(tip),
		v3(b2),
		v3(b1)
	], {
		color: col,
		width: w
	});
	Lines.segment(v3([tip[0] + n[0] * s, tip[1] + n[1] * s]), v3([tip[0] - n[0] * s, tip[1] - n[1] * s]), {
		color: col,
		width: w * 1.2
	});
}
/** State at time t: closed (0..1 switch travel), on (current flowing), phase of the AC cycle. */
function circuitState(t, tClose, period) {
	const closed = clamp((t - tClose) / .09);
	const on = t >= tClose + .09 ? 1 : 0, th = TAU * (t - tClose) / period;
	return {
		closed,
		on,
		th,
		sin: Math.sin(th),
		live: clamp((t - tClose - .09) / .25)
	};
}
/** Draw the schematic and its moving charges. o: wire, part, dot colours (HDR), gain. */
function drawCircuit(Lines, st, o = {}) {
	const g = o.gain ?? 1, wire = (o.wire ?? [
		.25,
		.5,
		1
	]).map((c) => c * g * (.55 + .45 * st.live)), part = (o.part ?? [
		.9,
		.95,
		1
	]).map((c) => c * g * .9);
	const dot = (o.dot ?? [
		.55,
		.8,
		1
	]).map((c) => c * g), hot = (o.hot ?? [
		1,
		.86,
		.6
	]).map((c) => c * g), W = 2, Wp = 2.4;
	Lines.polyline([
		[
			-3.1,
			.4,
			0
		],
		[
			-3.1,
			1.35,
			0
		],
		v3(P.pivot)
	], {
		color: wire,
		width: W
	});
	Lines.polyline([
		v3(P.contact),
		[
			0,
			1.35,
			0
		],
		v3(P.T)
	], {
		color: wire,
		width: W
	});
	Lines.polyline(AC_BOT.map(v3), {
		color: wire,
		width: W
	});
	Lines.polyline([
		v3(P.R),
		[
			1.5,
			0,
			0
		],
		[
			1.5,
			P.rail,
			0
		],
		[
			P.loadX,
			P.rail,
			0
		],
		[
			P.loadX,
			.45,
			0
		]
	], {
		color: wire,
		width: W
	});
	Lines.polyline([
		[
			P.loadX,
			-.45,
			0
		],
		[
			P.loadX,
			-P.rail,
			0
		],
		[
			-1.3,
			-P.rail,
			0
		],
		[
			-1.3,
			-1.45,
			0
		]
	], {
		color: wire,
		width: W
	});
	const hop = [];
	for (let i = 0; i <= 12; i++) {
		const a = -Math.PI / 2 + i / 12 * Math.PI;
		hop.push([
			P.hop[0] - Math.cos(a) * .1,
			P.hop[1] + Math.sin(a) * .1,
			0
		]);
	}
	Lines.polyline(hop, {
		color: wire,
		width: W
	});
	Lines.polyline([
		[
			-1.3,
			-1.25,
			0
		],
		[
			-1.3,
			0,
			0
		],
		v3(P.L)
	], {
		color: wire,
		width: W
	});
	Lines.polyline([[
		P.capX,
		P.rail,
		0
	], [
		P.capX,
		.09,
		0
	]], {
		color: wire,
		width: W
	});
	Lines.polyline([[
		P.capX,
		-.09,
		0
	], [
		P.capX,
		-P.rail,
		0
	]], {
		color: wire,
		width: W
	});
	const circ = [];
	for (let i = 0; i <= 64; i++) {
		const a = i / 64 * TAU;
		circ.push([
			P.src[0] + Math.cos(a) * P.srcR,
			P.src[1] + Math.sin(a) * P.srcR,
			0
		]);
	}
	Lines.polyline(circ, {
		color: part,
		width: Wp
	});
	const sg = [];
	for (let i = 0; i <= 32; i++) {
		const x = -.24 + i / 32 * .48;
		sg.push([
			P.src[0] + x,
			P.src[1] + Math.sin(x / .48 * TAU + (st.on ? st.th : 0)) * .12,
			0
		]);
	}
	Lines.polyline(sg, {
		color: part,
		width: 2
	});
	const ang = lerp(.55, 0, st.closed), lever = [
		P.pivot[0] + Math.cos(ang) * .62,
		P.pivot[1] + Math.sin(ang) * .62,
		0
	];
	Lines.segment(v3(P.pivot), lever, {
		color: part,
		width: Wp
	});
	for (const p of [P.pivot, P.contact]) Lines.segment(v3(p), v3(p), {
		color: part.map((c) => c * 1.2),
		width: 9
	});
	const pos = st.sin >= 0, k = st.on * Math.abs(st.sin);
	for (const [name, [a, b]] of Object.entries(DIODES)) diode(Lines, a, b, st.on && (pos && (name === "D1" || name === "D4") || !pos && (name === "D2" || name === "D3")) ? part.map((c, i) => lerp(c, hot[i] * 1.6, k)) : part.map((c) => c * .6), Wp);
	for (const y of [.09, -.09]) Lines.segment([
		P.capX - .2,
		y,
		0
	], [
		P.capX + .2,
		y,
		0
	], {
		color: part,
		width: Wp * 1.2
	});
	const zig = [[
		P.loadX,
		.45,
		0
	]];
	for (let i = 1; i < 12; i++) zig.push([
		P.loadX + (i % 2 ? .12 : -.12),
		.45 - i * .9 / 12,
		0
	]);
	zig.push([
		P.loadX,
		-.45,
		0
	]);
	Lines.polyline(zig, {
		color: part,
		width: Wp
	});
	for (const p of [[P.capX, P.rail], [P.capX, -P.rail]]) Lines.segment(v3(p), v3(p), {
		color: wire.map((c) => c * 1.6),
		width: 9
	});
	if (!st.on) return;
	const slosh = -Math.cos(st.th) * .16;
	for (const [pts, n, phase] of [[
		AC_TOP,
		11,
		0
	], [
		AC_BOT,
		9,
		.5
	]]) {
		const Ls = pathLen(pts);
		for (let i = 0; i < n; i++) Lines.segment(along(pts, (i + phase) / n * Ls + (pts === AC_TOP ? slosh : -slosh)), along(pts, (i + phase) / n * Ls + (pts === AC_TOP ? slosh : -slosh)), {
			color: dot.map((c) => c * st.live),
			width: 8
		});
	}
	const cond = pos ? [DIODES.D1, DIODES.D4] : [DIODES.D2, DIODES.D3];
	for (const [a, b] of cond) for (let i = 0; i < 3; i++) {
		const f = ((i / 3 + st.th / TAU * 3) % 1 + 1) % 1, p = [
			lerp(a[0], b[0], f),
			lerp(a[1], b[1], f),
			0
		];
		Lines.segment(p, p, {
			color: hot.map((c) => c * 1.4 * k),
			width: 8
		});
	}
	const Ld = pathLen(DC_LOOP), run = st.th / TAU * 2.2;
	for (let i = 0; i < 26; i++) {
		const p = along(DC_LOOP, (i / 26 + run) % 1 * Ld);
		Lines.segment(p, p, {
			color: dot.map((c) => c * 1.1 * st.live),
			width: 8
		});
	}
}
/** Label anchors (world) for the HUD. */
var LABELS = [
	["V~ 50 Hz", [
		-3.1,
		-.72,
		0
	]],
	["S1", [
		-2.05,
		1.62,
		0
	]],
	["D1–D4", [
		.62,
		.72,
		0
	]],
	["C1 470 µF", [
		2.3,
		-.42,
		0
	]],
	["R_L 1 kΩ", [
		3.62,
		0,
		0
	]]
];
//#endregion
export { LABELS, circuitState, drawCircuit };
