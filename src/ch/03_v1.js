import { chapter } from "../engine/timeline.js?v=vYBbdLfo";
import { TAU, clamp, ease, hash2, lerp, seg } from "../engine/math.js?v=BJIlRm7-";
import { COL, HEX } from "../theme.js?v=Bj33PIbo";
import { remade } from "../lib/published.js?v=aV_CU5HV";
import { Matrix4, OrthographicCamera, Scene, Vector3, Vector4 } from "../../vendor/three/build/three.core.js?v=q9f7JKE-";
import { Swarm, rot4 } from "../engine/swarm.js?v=DTFpJa7B";
import { GlowLines } from "../engine/lines.js?v=B_AAaaTO";
import { rig } from "../engine/rig.js?v=39-joEtk";
import { consoleLog, newCamera } from "../lib/look.js?v=BfOqFF7i";
import { callout, crosshair, dimLine, frame, readout, toDesign, viewportFrame } from "../lib/hud.js?v=BgmSZjmG";
import { GlyphField, onShape, source } from "../lib/glyphs.js?v=DWbHICXG";
import { capture, view } from "../lib/modes.js?v=Cu3GYO-2";
import { alongPolylines, shapes } from "../engine/shapes.js?v=BFh0PgdI";
import { rippleKey } from "./v1/ripples.js?v=BTY5Vkje";
import { HeightSheet, asciiView } from "./v1/instruments.js?v=DO8R0tWi";
import { BLU, INK, InkFills, InkLines, K, RED, SERIF, YEL, arrowhead, caption, dimension, inkMul, label, note, paperLook, press, type } from "./v1/print.js?v=s4nGKvJp";
//#region src/ch/03_v1.js
var W4 = 3;
var S4 = 2;
var LV = 1;
var AMP = 2.2;
var XS = 6;
var XF = 3;
var VERTS = Array.from({ length: 16 }, (_, v) => [
	0,
	1,
	2,
	3
].map((j) => v & 1 << j ? 1 : -1));
var EDGES = [];
var EDGE_DIM = [];
for (let v = 0; v < 16; v++) for (let d = 0; d < 4; d++) if (!(v & 1 << d)) {
	EDGES.push([v, v | 1 << d]);
	EDGE_DIM.push(d);
}
var fLim = (x) => LV + AMP * Math.sin(x) / x;
var TWO_PI_DIGITS = "6.28318530717958647692528676655900576839433879875021";
var V1SYN = [
	[
		.62,
		.93,
		1
	],
	[
		.13,
		.19,
		.27
	],
	[
		.95,
		.8,
		.5
	],
	[
		1,
		.78,
		.38
	],
	[
		.42,
		.92,
		1
	],
	[
		.3,
		.4,
		.56
	]
];
var O = null;
var KC = [null, null];
/** ctx: given by the draws (not by the shots' `at`): in the remake a key word's event happens on the cut the edit gives its shot. */
function keys(T, ctx = null) {
	const remake = remade(ctx);
	if (KC[+remake]?.T === T) return KC[+remake];
	const s0 = T.section("v1").start, b0 = Math.round(T.beatAt(s0)), bar0 = Math.round(T.barAt(s0));
	const B = (k) => T.beatTime(b0 + k), BAR = (k) => T.barTime(bar0 + k), L = (s) => T.findLine(s);
	const l12 = L("set of points"), l15 = L("I'm a circle"), l21 = L("approach infinity"), l19 = L("sit on all");
	const l22 = T.line(l21.i + 1);
	const word = (id, s) => remake ? ctx.startOf(`v1/${id}`) ?? L(s).start : L(s).start, tDim = word("split", "DIMENSION");
	return KC[+remake] = {
		T,
		remake,
		s0,
		B,
		BAR,
		l12,
		l13: T.line(l12.i + 1),
		wPoints: l12.words.at(-1),
		tDim,
		unfold: [
			B(4),
			B(4.5),
			B(5),
			tDim
		],
		l15,
		tCirc: word("circumference", "CIRCUMFERENCE"),
		l18: L("sine wave"),
		l19,
		tTan: word("tangents", "TANGENTS"),
		l21,
		l22,
		tYou: l22.words[1].start,
		tLim: word("limit", "LIMITATIONS"),
		end: T.section("pre1").start
	};
}
function persp(ctx, pos, look, { fov = 38, aspect = ctx.aspect, inset = false } = {}) {
	const c = O.persp;
	c.fov = fov;
	c.aspect = aspect;
	c.near = .01;
	c.far = 500;
	c.position.set(...pos);
	c.up.set(0, 1, 0);
	c.lookAt(...look);
	c.updateProjectionMatrix();
	c.updateMatrixWorld();
	return rig.cam(c, {
		look,
		inset
	});
}
function ortho(center, dir, height, aspect, { inset = false } = {}) {
	const c = O.ortho, w = height * aspect, d = 30, [x, y, z] = center;
	Object.assign(c, {
		left: -w / 2,
		right: w / 2,
		top: height / 2,
		bottom: -height / 2,
		near: .01,
		far: 200,
		zoom: 1
	});
	if (dir === "front") {
		c.position.set(x, y, z + d);
		c.up.set(0, 1, 0);
	} else if (dir === "top") {
		c.position.set(x, y + d, z);
		c.up.set(0, 0, -1);
	} else {
		c.position.set(x + d, y, z);
		c.up.set(0, 1, 0);
	}
	c.lookAt(x, y, z);
	c.updateProjectionMatrix();
	c.updateMatrixWorld();
	return rig.cam(c, {
		look: center,
		inset
	});
}
/**
* The pose from which a perspective camera frames the plane z = 0 exactly as an orthographic front view of height h
* centred on c does (the published cut's plates are such views): where two shots have to be for the cut between them
* to be a match.
*/
function plateView(c, h, fov = 36) {
	return {
		pos: [
			c[0],
			c[1],
			h / 2 / Math.tan(fov * Math.PI / 360)
		],
		look: [
			c[0],
			c[1],
			0
		],
		fov
	};
}
var mixView = (A, B, k) => ({
	pos: A.pos.map((v, i) => lerp(v, B.pos[i], k)),
	look: A.look.map((v, i) => lerp(v, B.look[i], k)),
	fov: lerp(A.fov, B.fov, k)
});
var viewCam = (ctx, V) => persp(ctx, V.pos, V.look, { fov: V.fov });
function reset() {
	for (const o of [
		O.me.points,
		O.stars.points,
		O.lines.mesh,
		O.code.points,
		O.floor.points
	]) o.visible = false;
	for (const o of [
		O.me.points,
		O.code.points,
		O.floor.points
	]) {
		o.position.set(0, 0, 0);
		o.rotation.set(0, 0, 0);
		o.scale.setScalar(1);
	}
	O.lines.begin();
	O.ink.begin();
	O.fills.begin();
}
function render(c, cam) {
	O.lines.mesh.visible = true;
	O.lines.end(c);
	c.draw(O.scene, cam);
}
var kick = (ctx) => ctx.F.env("onset_drums", ctx.t, .005, .12);
function overlays(ctx, K, extra = {}) {
	frame(ctx.text.overlay, ctx.t, ctx.T, {
		label: "definitions",
		bottomRight: extra.br
	});
	consoleLog(ctx.text.overlay, ctx.T, ctx.t, { from: K.s0 - .2 });
}
function look(ctx, o = {}) {
	Object.assign(ctx.post, {
		bloom: 1.15,
		threshold: .9,
		ca: .3,
		vignette: .42,
		grain: .03,
		exposure: 1.05,
		...o
	});
}
/** Ink the figure into the private target (fill(sub) draws with O.ink / O.fills, or renders extra layers), then print it. */
function plate(ctx, cam, fill, o = {}) {
	const tex = capture(ctx, (sub) => {
		O.ink.begin();
		O.fills.begin();
		fill(sub);
		O.ink.end(sub);
		O.fills.end();
		sub.draw(O.inkScene, cam);
		o.after?.(sub);
	});
	press(ctx, tex, { seed: o.seed ?? 1 });
	paperLook(ctx, o.look);
}
function paperOverlays(ctx, K, extra = {}) {
	frame(ctx.text.overlay, ctx.t, ctx.T, {
		label: "definitions",
		bottomRight: extra.br,
		color: INK.grey,
		alpha: .95
	});
	consoleLog(ctx.text.overlay, ctx.T, ctx.t, {
		from: K.s0 - .2,
		color: INK.K,
		accent: INK.red,
		glow: 0
	});
}
/** A margin note in the book face: small spaced capitals for the key, italic for the value. */
function margin(L, x, y, rows, o = {}) {
	rows.forEach(([k, v], i) => {
		const word = /^[A-Z ]+$/.test(k);
		type(L, k, x, y + i * 26, {
			size: word ? 15 : 19,
			weight: word ? 600 : 400,
			italic: !word,
			tracking: word ? 1.4 : 0,
			align: "left",
			color: INK.soft
		});
		label(L, v, x + (o.keyW ?? 92), y + i * 26, {
			size: 21,
			align: "left",
			color: o.color ?? INK.K
		});
	});
}
function pointsState(t, K) {
	return {
		thin: ease.inOutCubic(seg(t, K.l12.start + .15, K.B(1) + .3)),
		code: ease.inOutSine(seg(t, K.B(1) + .12, K.B(2) + .05)),
		collapse: ease.inOutCubic(seg(t, K.wPoints.start - .1, K.wPoints.end + .12))
	};
}
function drawPoints(ctx, cam, st, o = {}, hPx = ctx.H) {
	if (st.code >= 1) return;
	const me = O.me;
	me.points.visible = true;
	me.points.scale.setScalar(1.25);
	me.points.rotation.y = o.rotY ?? 0;
	me.set({
		a: O.tex.sphere,
		b: O.tex.sphere,
		morph: st.code,
		wave: 2,
		waveOrigin: [
			0,
			1,
			0
		],
		spread: .75,
		noise: .03 * (1 - st.thin),
		noiseFreq: 1.4,
		t: ctx.t,
		revealBy: "w",
		reveal: .012 ** st.thin,
		size: .012 * (.045 / .012) ** st.thin,
		bright: (.9 + .22 * kick(ctx)) * 3 ** st.thin * (o.brightK ?? 1),
		colA: COL.me,
		colB: [
			0,
			0,
			0
		],
		sparkle: .25,
		...o.swarm
	}, cam, hPx);
}
function drawCodeSphere(ctx, cam, st, o = {}, hPx = ctx.H) {
	if (st.code <= 0) return;
	const gf = O.code;
	gf.points.visible = true;
	gf.points.scale.setScalar(1.25);
	gf.points.rotation.y = o.rotY ?? 0;
	const fade = 1 - ease.inCubic(seg(st.collapse, .5, 1));
	gf.set({
		a: O.tex.codeSphere,
		b: O.tex.codePoint,
		morph: st.collapse,
		spread: .35,
		arc: .3,
		reveal: st.code * 1.04,
		soft: .05,
		t: ctx.t,
		size: o.size ?? .058,
		minPx: 2,
		bright: (o.bright ?? 1.1) * fade,
		palette: o.palette ?? V1SYN,
		focus: o.focus ?? 5,
		aperture: o.aperture ?? 0,
		maxBlur: o.maxBlur ?? 40
	}, cam, hPx);
}
function dimState(t, K) {
	const u = K.unfold.map((s) => ease.outExpo(seg(t, s - .03, s + .3)));
	const t4 = K.remake ? K.tDim + .07 : K.tDim;
	if (K.remake) u[3] = ease.inOutCubic(seg(t, t4, t4 + .4));
	const spin = Math.max(0, t - t4);
	const R = rot4({
		xw: spin * .8 + ease.inOutCubic(seg(t, t4, t4 + .6)) * .35,
		zw: spin * .55
	});
	const D = new Matrix4().set(u[0], 0, 0, 0, 0, u[2], 0, 0, 0, 0, u[1], 0, 0, 0, 0, u[3]);
	return {
		u,
		M: R.clone().multiply(D),
		S: K.remake ? S4 * (W4 - u[3]) / W4 : S4
	};
}
function project(M, v, S = S4) {
	const p = new Vector4(...v).applyMatrix4(M), k = S / Math.max(W4 - p.w, .05);
	return [
		p.x * k,
		p.y * k,
		p.z * k
	];
}
function drawDims(ctx, cam, st, o = {}, hPx = ctx.H) {
	const me = O.me, u = st.u, rotY = o.rotY ?? 0;
	me.points.visible = true;
	me.points.scale.setScalar(S4);
	me.points.rotation.y = rotY;
	const density = .12 + .88 * u[0] * (.35 + .65 * u[1]);
	me.set({
		a: O.tex.tess,
		rot4: st.M,
		w4: W4,
		t: ctx.t,
		size: .011,
		bright: (.55 + .15 * kick(ctx)) * density,
		colA: COL.me,
		sparkle: .5,
		spread: 0
	}, cam, hPx);
	const rY = new Matrix4().makeRotationY(rotY), P = VERTS.map((v) => new Vector3(...project(st.M, v, st.S)).applyMatrix4(rY).toArray());
	const g = 1.45 + .35 * kick(ctx);
	if (u[0] < .02) O.lines.segment([
		0,
		0,
		0
	], [
		0,
		0,
		0
	], {
		color: COL.white.map((c) => c * 3),
		width: 16
	});
	for (const [a, b] of EDGES) O.lines.segment(P[a], P[b], {
		color: COL.me.map((c) => c * g),
		width: o.lineW ?? 3.6
	});
	for (const p of P) O.lines.segment(p, p, {
		color: COL.white.map((c) => c * 2.2),
		width: (o.lineW ?? 3.6) * 2.4
	});
	return P;
}
/**
* The remake's figure in the glowing world, from the single point on: the same tesseract, its swarm dimmed while it is
* still a point, a segment or a square (262 144 points on so little would burn out), and the far vertex marked as you.
*/
function drawDimsYou(ctx, cam, st, o = {}) {
	const me = O.me, u = st.u, g = 1.45 + .35 * kick(ctx), w = o.lineW ?? 3.6;
	const P = VERTS.map((v) => project(st.M, v, st.S));
	if (u[0] > .02) {
		me.points.visible = true;
		me.points.scale.setScalar(st.S);
		me.points.rotation.y = 0;
		const room = lerp(lerp(.05, .3, u[1]), 1, u[2]);
		me.set({
			a: O.tex.tess,
			rot4: st.M,
			w4: W4,
			t: ctx.t,
			size: .011,
			bright: (.55 + .15 * kick(ctx)) * room * seg(u[0], .02, .5),
			colA: COL.me,
			sparkle: .5,
			spread: 0
		}, cam, ctx.H);
		const tri = o.tri ?? 0;
		EDGES.forEach(([a, b], e) => O.lines.segment(P[a], P[b], {
			color: (tri > 0 ? dimCol(e, tri) : COL.me).map((c) => c * g),
			width: w
		}));
		for (const p of P) O.lines.segment(p, p, {
			color: COL.white.map((c) => c * 2.2),
			width: w * 2.4
		});
	}
	if (u[0] < .5) {
		const a = (o.point ?? 1) * (1 - seg(u[0], .02, .5));
		O.lines.segment([
			0,
			0,
			0
		], [
			0,
			0,
			0
		], {
			color: COL.white.map((c) => c * 3 * a),
			width: 19
		});
		O.lines.segment([
			0,
			0,
			0
		], [
			0,
			0,
			0
		], {
			color: COL.me.map((c) => c * 1.1 * a),
			width: 52
		});
	}
	if (o.you > 0) youMark(youAt(P), o.you, o.swell ?? 1);
	return P;
}
/**
* Where you is in the remake's figure: on its far vertex. While the figure is still one point that vertex is the point
* itself, and you would read as me's point turning warm: you wait beside it instead, a second dot, on the side the
* first dimension carries you to.
*/
var YOU_BESIDE = .11;
var youAt = (P) => [
	Math.max(P[15][0], YOU_BESIDE),
	P[15][1],
	P[15][2]
];
var HERO = {
	dx: 372,
	dy: 164,
	r: 6.8
};
/**
* The dims camera: above the point, then swinging down and round as the square becomes a cube. cam: 'steps' holds a
* view per dimension instead. Once the cube stands, the camera backs off and sets it where the sheet that follows has
* its perspective view (HERO); the sheet keeps this same camera, so on the cut the cube stays where it is.
*/
function dimsCam(ctx, K, t, mode) {
	const lt = t - K.l13.start, h = ease.inOutSine(seg(t, K.unfold[2] + .3, K.tDim - .04));
	const aim = (az, el, r, y) => {
		r = lerp(r, HERO.r, h);
		const pos = [
			r * Math.cos(el) * Math.sin(az),
			y + r * Math.sin(el),
			r * Math.cos(el) * Math.cos(az)
		], s = 2 * r * Math.tan(20 * Math.PI / 180) / 1080 * h;
		const right = [
			Math.cos(az),
			0,
			-Math.sin(az)
		], up = [
			-Math.sin(el) * Math.sin(az),
			Math.cos(el),
			-Math.sin(el) * Math.cos(az)
		];
		const off = right.map((v, i) => -v * HERO.dx * s - up[i] * HERO.dy * s);
		return persp(ctx, pos.map((v, i) => v + off[i]), [
			off[0],
			y + off[1],
			off[2]
		], { fov: 40 });
	};
	if (mode === "steps") {
		if (t < K.unfold[0]) return aim(-.5, 1.2, 3, 0);
		if (t < K.unfold[1]) return aim(-.2, .24, 3.1, 0);
		if (t < K.unfold[2]) return aim(-.5, 1.12, 3.3, 0);
		return aim(lerp(-.42 + (t - K.unfold[2]) * .2, -.6 + lt * .2, h), .485, 4.1, .1);
	}
	const k = ease.inOutSine(seg(t, K.unfold[1] - .06, K.unfold[2] + .42));
	return aim(-.66 + lt * .2 + k * .06, lerp(1.12, .485, k), lerp(3, 4.1, k), lerp(0, .1, k));
}
var YOU_AT = [
	"",
	"(1)",
	"(1, 1)",
	"(1, 1, 1)"
];
var EUCLID = [
	"Def. I.1  A point is that which has no part.",
	"Def. I.2  A line is breadthless length.",
	"Def. I.5  A surface is that which has length and breadth only.",
	"Def. XI.1  A solid is that which has length, breadth and depth."
];
/** The same object in ink: black edges, and (tri: true) the w = −1 cube in blue and the eight w-edges in red. */
function inkDims(st, o = {}) {
	const P = VERTS.map((v) => project(st.M, v, st.S)), w = o.w ?? 3.4;
	EDGES.forEach(([a, b], e) => {
		const d = EDGE_DIM[e], ink = !o.tri ? K : d === 3 ? RED : VERTS[a][3] < 0 ? BLU : K;
		O.ink.segment(P[a], P[b], {
			ink,
			width: w
		});
	});
	for (const p of P) O.ink.dot(p, { width: w * 2.6 });
	return P;
}
function circleState(t, K) {
	const draw = ease.inOutSine(seg(t, K.BAR(2) + .08, K.B(11)));
	const roll = ease.inOutSine(seg(t, K.B(12), K.tCirc + .1)), th = roll * TAU;
	return {
		draw,
		roll,
		th,
		c: [
			th,
			1,
			0
		]
	};
}
function ringPts(st, n = 160) {
	const [cx, cy] = st.c, out = [];
	for (let i = 0; i <= n; i++) {
		const a = -Math.PI / 2 + i / n * TAU;
		out.push([
			cx + Math.cos(a - st.th),
			cy + Math.sin(a - st.th),
			0
		]);
	}
	return out;
}
function cycloidPts(th, n = 200) {
	const out = [];
	for (let i = 0; i <= n; i++) {
		const a = i / n * th;
		out.push([
			a - Math.sin(a),
			1 - Math.cos(a),
			0
		]);
	}
	return out;
}
var mirror = (pts) => pts.map((p) => [
	p[0],
	-p[1],
	p[2] ?? 0
]);
function drawCircle(ctx, cam, st, o = {}, hPx = ctx.H) {
	const L = O.lines, [cx, cy] = st.c, g = o.gain ?? 1;
	const ring = ringPts(st);
	L.polyline(ring, {
		color: COL.white.map((c) => c * 1.3 * g),
		width: o.w ?? 3.2,
		draw: st.draw
	});
	const tipA = -Math.PI / 2 + st.draw * TAU - st.th, tip = [
		cx + Math.cos(tipA),
		cy + Math.sin(tipA),
		0
	];
	if (st.draw > 0 && st.draw < 1) L.segment(tip, tip, {
		color: COL.white.map((c) => c * 4),
		width: 14
	});
	if (st.draw > 0) L.segment([
		cx,
		cy,
		0
	], st.draw < 1 ? tip : [
		cx + Math.cos(-Math.PI / 2 - st.th),
		cy + Math.sin(-Math.PI / 2 - st.th),
		0
	], {
		color: COL.me.map((c) => c * .9 * g * (o.arm ?? 1)),
		width: 2 * (o.arm ?? 1)
	});
	if (st.roll > 0) {
		L.polyline(cycloidPts(st.th), {
			color: COL.me.map((c) => c * 1.4 * g),
			width: o.cw ?? 2.6
		});
		L.segment([
			0,
			0,
			0
		], [
			st.th,
			0,
			0
		], {
			color: COL.gold.map((c) => c * 2 * g * (o.line ?? 1)),
			width: o.gw ?? 4.5
		});
		const rim = [
			st.th - Math.sin(st.th),
			1 - Math.cos(st.th),
			0
		];
		L.segment(rim, rim, {
			color: COL.gold.map((c) => c * 3),
			width: 12
		});
	}
	if (o.you) youMark([
		TAU,
		0,
		0
	], .8 + .7 * ease.outCubic(seg(st.roll, .97, 1)));
	if (o.reflect) {
		const r = o.reflect;
		L.polyline(mirror(ring), {
			color: COL.white.map((c) => c * .9 * r),
			width: 2.6,
			draw: st.draw
		});
		if (st.roll > 0) L.polyline(mirror(cycloidPts(st.th)), {
			color: COL.me.map((c) => c * r),
			width: 2
		});
		L.segment([
			-6,
			0,
			0
		], [
			14,
			0,
			0
		], {
			color: COL.me.map((c) => c * .5 * r),
			width: 1.4
		});
	}
	if (o.swarm === false) return;
	const me = O.me;
	me.points.visible = true;
	me.points.position.set(cx, cy, 0);
	me.points.rotation.z = -st.th;
	me.set({
		a: O.tex.ring,
		revealBy: "w",
		reveal: st.draw,
		t: ctx.t,
		size: .014,
		bright: .3 + .08 * kick(ctx),
		colA: COL.me,
		sparkle: .4,
		noise: .004,
		...o.swarm
	}, cam, hPx);
}
/** Remake: you's label on the ground line and, in the wide view, the distance from the circle's start to you: 2πr. */
function youOnGround(ctx, cam, o = {}) {
	const L = ctx.text.overlay, v = toDesign([
		TAU,
		0,
		0
	], cam);
	if (v[2] < 1 && v[0] > -80 && v[0] < 2e3) youLabel(L, v, "you", {
		dx: 34,
		dy: -64
	});
	if (o.span && (o.alpha ?? 1) > .01) {
		const a = toDesign([
			0,
			0,
			0
		], cam);
		dimLine(L, a, v, "2πr", {
			offset: 58,
			color: HEX.you,
			alpha: .55 * (o.alpha ?? 1),
			size: 19
		});
	}
}
var OMEGA = TAU / 1.846;
var SINE = {
	c: [
		.6,
		0,
		0
	],
	h: 5,
	x0: -1.2
};
/**
* Remake: where sin x has to be seen from for it to lie on the wave the turning radius draws, as that is at time t0
* (y = sin(φ − (x − x0)), φ the radius' angle): the sine shot's framing, slid along x to the matching phase.
* t: the view keeps sliding after t0 as that wave was travelling (the curve on screen does not stop on the cut).
*/
function sineMatch(t0, K, t = t0) {
	const ph = OMEGA * (t0 - K.BAR(4));
	return plateView([
		((SINE.c[0] - SINE.x0 - ph + Math.PI) % TAU + TAU + Math.PI) % TAU - Math.PI - OMEGA * (t - t0),
		SINE.c[1],
		0
	], SINE.h, 40);
}
function sineCurve(x0, x1, n, f) {
	const p = [];
	for (let i = 0; i <= n; i++) {
		const x = lerp(x0, x1, i / n);
		p.push([
			x,
			f(x),
			0
		]);
	}
	return p;
}
function tangent(x, len) {
	const d = [1, Math.cos(x)], k = len / 2 / Math.hypot(...d);
	return [[
		x - d[0] * k,
		Math.sin(x) - d[1] * k,
		0
	], [
		x + d[0] * k,
		Math.sin(x) + d[1] * k,
		0
	]];
}
function youDot(p, s = 1) {
	O.lines.segment(p, p, {
		color: COL.you.map((c) => c * 3.2 * s),
		width: 15
	});
	O.lines.segment(p, p, {
		color: COL.you.map((c) => c * .9 * s),
		width: 34
	});
}
/** The remake's you: the same warm dot, larger, so it is never taken for a vertex of me's figure. */
function youMark(p, s = 1, k = 1) {
	O.lines.segment(p, p, {
		color: COL.you.map((c) => c * 4 * s),
		width: 22 * k
	});
	O.lines.segment(p, p, {
		color: COL.you.map((c) => c * 1.1 * s),
		width: 58 * k
	});
}
/**
* You received something: a warm ring opens around you and fades (drawn on the glowing text layer, in design units).
* at: design position; t0: when it arrives; every reception in the remake uses this one gesture.
*/
function youRing(ctx, at, t0, o = {}) {
	const k = seg(ctx.t, t0, t0 + (o.dur ?? .34));
	if (k <= 0 || k >= 1) return;
	const r = lerp(o.r0 ?? 12, o.r1 ?? 62, ease.outCubic(k));
	(o.layer ?? ctx.text.scene).draw((g) => {
		g.globalAlpha *= (1 - k) ** 1.5;
		g.strokeStyle = o.color ?? HEX.you;
		g.lineWidth = o.lw ?? 2.6;
		g.beginPath();
		g.arc(at[0], at[1], r, 0, TAU);
		g.stroke();
	});
}
/** "you" and what you now have, beside the mark: larger than the HUD's readouts, in you's colour. */
function youLabel(L, at, text, o = {}) {
	callout(L, [at[0], at[1]], text, {
		dx: o.dx ?? 58,
		dy: o.dy ?? -52,
		color: o.color ?? HEX.you,
		size: o.size ?? 21,
		alpha: o.alpha ?? .95,
		draw: o.draw ?? 1
	});
}
var youX = (t, K, remake = false) => lerp(-2.6, 1.9, ease.inOutSine(seg(t, remake ? K.l19.start + .12 : K.B(20), K.tTan)));
function limCurvePts(X0, X1, n, xs = XS) {
	const p = [];
	for (let i = 0; i <= n; i++) {
		const X = lerp(X0, X1, i / n), x = 10 ** (X / xs);
		p.push([
			X,
			fLim(x),
			0
		]);
	}
	return p;
}
/** The flight: X on the flight's scale (3 units a decade), accelerating exponentially; x = 2⁵³ on the half-beat B27.5. */
var X53 = 159 * Math.log10(2);
var FLY_A = 4.5;
function flyX(t, K) {
	const u = (t - K.BAR(6)) / (K.B(27.5) - K.BAR(6)), e = Math.expm1(FLY_A);
	if (u <= 1) return -1.2 + (X53 + 1.2) * Math.expm1(FLY_A * Math.max(0, u)) / e;
	return X53 + (X53 + 1.2) * FLY_A * (e + 1) / e * (u - 1);
}
var SUP = "⁰¹²³⁴⁵⁶⁷⁸⁹";
var sup = (n) => String(n).split("").map((c) => SUP[+c]).join("");
function codeSlice(src, marker, nChars) {
	let i = src.indexOf(marker);
	if (i < 0) i = 0;
	let n = 0, j = i;
	for (; j < src.length && n < nChars; j++) if (!/\s/.test(src[j])) n++;
	return src.slice(i, j);
}
/** Code lines for the tangents: real lines of this file, trimmed to a length. */
function codeLines(src, n, len) {
	const lines = src.split("\n").map((s) => s.trim()).filter((s) => s.length > len * .7 && !s.startsWith("import"));
	const out = [];
	for (let i = 0; i < n; i++) {
		const s = lines[(i * 7 + 3) % lines.length];
		out.push(s.length > len ? s.slice(0, len) : s);
	}
	return out;
}
/** Lines of code laid flat along +x on the floor (y = 0): row r at z = z0 − r·pitch. */
function floorLayout(field, { adv = .16, pitch = .34, z0 = 3, cols = 132 } = {}) {
	return (N) => {
		const out = new Float32Array(N * 4), grid = field._grid ?? [], n = Math.max(1, field.count);
		for (let i = 0; i < N; i++) {
			const p = grid[i];
			if (!p || p[0] >= cols) out.set([
				0,
				0,
				-1e5,
				1
			], i * 4);
			else out.set([
				p[0] * adv,
				0,
				z0 - p[1] * pitch,
				i / n
			], i * 4);
		}
		return out;
	};
}
/** A page of code standing on the XY plane (a wall), top-left at origin. */
function wallLayout(field, { origin = [
	0,
	0,
	0
], cell = .12, cols = 120, rows = 36 } = {}) {
	return (N) => {
		const out = new Float32Array(N * 4), grid = field._grid ?? [], n = Math.max(1, field.count);
		for (let i = 0; i < N; i++) {
			const p = grid[i];
			if (!p || p[0] >= cols || p[1] >= rows) out.set([
				0,
				0,
				-1e5,
				1
			], i * 4);
			else out.set([
				origin[0] + p[0] * cell * .6,
				origin[1] - p[1] * cell,
				origin[2],
				i / n
			], i * 4);
		}
		return out;
	};
}
chapter({
	id: "v1",
	from: (T) => T.section("v1").start,
	to: (T) => T.section("pre1").start,
	init() {
		O = {
			scene: new Scene(),
			inkScene: new Scene(),
			floorScene: new Scene(),
			persp: newCamera(38),
			ortho: new OrthographicCamera(-1, 1, 1, -1, .01, 200)
		};
		O.me = new Swarm({ count: 1 << 18 });
		O.stars = new Swarm({ count: 16384 });
		O.lines = new GlowLines(12e3);
		O.ink = new InkLines(16384);
		O.fills = new InkFills(8192);
		O.tex = {
			sphere: O.me.shape("v1/sphere", (N) => {
				const out = shapes.sphere(N, { r: 1 });
				for (let i = 0; i < N; i++) out[i * 4 + 3] = rippleKey(i);
				return out;
			}),
			stars: O.stars.shape("v1/stars", (N) => shapes.stars(N, {
				r0: 25,
				r1: 70
			})),
			tess: O.me.shape("v1/tesseract", (N) => shapes.tesseract(N, {
				s: 1,
				jitter: .006
			})),
			ring: O.me.shape("v1/ring-ordered", (N) => {
				const out = new Float32Array(N * 4);
				for (let i = 0; i < N; i++) {
					const u = (i + .5) / N, a = -Math.PI / 2 + u * TAU, j = (hash2(i, 411) * 2 - 1) * .012;
					out.set([
						Math.cos(a) * (1 + j),
						Math.sin(a) * (1 + j),
						j,
						u
					], i * 4);
				}
				return out;
			}),
			sineLine: O.me.shape("v1/sine-line", (N) => alongPolylines(N, [sineCurve(-7, 7, 800, Math.sin)], {
				jitter: .01,
				seed: 41
			}))
		};
		const src = source("ch/03_v1.js");
		O.code = new GlyphField({ count: 4096 });
		O.code.text("v1/points-src", codeSlice(src, "// ---------------------------------------------------------------- subject: points", 2200));
		O.tex.codeSphere = O.code.layout("v1/code-sphere", onShape(O.code, (n) => shapes.sphere(n, { r: 1 })));
		O.tex.codePoint = O.code.layout("v1/code-point", onShape(O.code, (n) => shapes.point(n, { r: .006 })));
		O.floor = new GlyphField({ count: 16384 });
		O.floor.text("v1/limit-src", codeSlice(src, "// ---------------------------------------------------------------- subject: the limit", 12e3));
		O.tex.codeFloor = O.floor.layout("v1/code-floor", floorLayout(O.floor));
		O.tex.codeWall = O.floor.layout("v1/code-wall", wallLayout(O.floor, {
			origin: [
				-3.2,
				3.6,
				-2.6
			],
			cell: .13,
			cols: 150,
			rows: 27
		}));
		O.tanLines = codeLines(src, 44, 46);
		O.scene.add(O.stars.points, O.me.points, O.code.points, O.lines.mesh);
		O.floorScene.add(O.floor.points);
		O.inkScene.add(O.fills.mesh, O.ink.mesh);
		O.sheet = new HeightSheet(400);
		O.sheetScene = new Scene();
		O.sheetScene.add(O.sheet.points);
	},
	shots: [
		{
			id: "orbit",
			at: (T) => keys(T).s0,
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T, ctx), t = ctx.t, st = pointsState(t, K);
				reset();
				const az = .5 + t * .09, el = .22 + .08 * Math.sin(t * .4);
				const cam = persp(ctx, [
					5.2 * Math.cos(el) * Math.sin(az),
					5.2 * Math.sin(el),
					5.2 * Math.cos(el) * Math.cos(az)
				], [
					0,
					0,
					0
				]);
				const rotY = az - .55 + (t - K.s0) * .12;
				const sk = 1 - ease.inOutSine(seg(t, K.s0, K.B(1)));
				if (sk > 0) {
					O.stars.points.visible = true;
					O.stars.set({
						a: O.tex.stars,
						size: .09,
						bright: .55 * sk,
						sparkle: .7,
						t,
						minPx: 1.1
					}, cam, ctx.H);
				}
				drawPoints(ctx, cam, st, { rotY });
				drawCodeSphere(ctx, cam, st, { rotY });
				render(ctx, cam);
				overlays(ctx, K);
				const n = st.code > .5 ? O.code.count : Math.round(262144 * .012 ** st.thin);
				readout(ctx.text.overlay, 1500, 150, [
					["object", "me"],
					[st.code > .5 ? "glyphs" : "points", n.toLocaleString("en").replace(/,/g, " ")],
					["dim", "3"]
				]);
				look(ctx);
			}
		},
		{
			id: "macro",
			at: (T) => keys(T).B(2),
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T, ctx), t = ctx.t, st = pointsState(t, K);
				reset();
				const k = seg(t, K.B(2), K.B(3)), a = .9 + k * .25, rotY = .5 + t * .09 - .55 + (t - K.s0) * .12;
				const tgt = [
					Math.sin(a + .9) * 1.2,
					.05,
					Math.cos(a + .9) * 1.2
				];
				const cam = persp(ctx, [
					Math.sin(a) * 1.8,
					.2,
					Math.cos(a) * 1.8
				], tgt, { fov: 34 });
				drawPoints(ctx, cam, st, {
					rotY,
					brightK: .3
				});
				drawCodeSphere(ctx, cam, st, {
					rotY,
					size: .032,
					bright: .68,
					focus: lerp(.66, 1.1, ease.inOutCubic(seg(k, .35, .9))),
					aperture: .026,
					maxBlur: 40
				});
				if (st.collapse > .01) O.lines.segment([
					0,
					0,
					0
				], [
					0,
					0,
					0
				], {
					color: COL.white.map((c) => c * 3 * st.collapse),
					width: 16
				});
				render(ctx, cam);
				const f = toDesign(tgt, cam);
				crosshair(ctx.text.overlay, f[0], f[1], 26, {
					label: "p ∈ ℝ³",
					ring: true
				});
				overlays(ctx, K);
				look(ctx, {
					bloom: 1.2,
					vignette: .55
				});
			}
		},
		{
			id: "top",
			at: (T) => keys(T).B(3),
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T, ctx), t = ctx.t, st = pointsState(t, K);
				reset();
				const cam = ortho([
					0,
					0,
					0
				], "top", lerp(3.6, 2.9, ease.inOutSine(ctx.p)), ctx.aspect), rotY = .5 + t * .09 - .55 + (t - K.s0) * .12;
				const dot = ease.outCubic(seg(st.collapse, .55, 1));
				plate(ctx, cam, (sub) => {
					if (dot > 0) O.ink.dot([
						0,
						0,
						0
					], { width: 15 * dot });
					drawCodeSphere(ctx, cam, st, {
						rotY,
						palette: [
							1.5,
							1.5,
							1.5
						],
						bright: 1.2,
						size: .05
					});
					O.me.points.visible = false;
					O.lines.mesh.visible = false;
					sub.draw(O.scene, cam);
					O.code.points.visible = false;
				});
				const L = ctx.text.overlay, c = toDesign([
					0,
					0,
					0
				], cam);
				if (dot > .6) note(L, [c[0] + 4, c[1] - 4], "p ∈ ℝ⁰", {
					dx: 52,
					dy: -44,
					alpha: seg(dot, .6, 1),
					text: { size: 26 }
				});
				caption(L, 1832, 978, "I.1", "A point is that which has no part.", { head: "Def." });
				margin(L, 1500, 150, [["DIM", st.collapse > .98 ? "0" : "3"], ["POINTS", st.collapse > .98 ? "1" : O.code.count.toLocaleString("en").replace(/,/g, " ")]]);
				paperOverlays(ctx, K, { br: "" });
			}
		},
		{
			id: "dim1",
			at: (T) => keys(T).B(4),
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T, ctx), t = ctx.t, st = dimState(t, K);
				reset();
				const cam = ortho([
					0,
					0,
					0
				], "front", lerp(2.2, 2.05, ctx.p), ctx.aspect), e = S4 / W4;
				plate(ctx, cam, () => {
					O.ink.segment([
						-1.55,
						0,
						0
					], [
						1.55,
						0,
						0
					], { width: 1.3 });
					for (const x of [
						-.6666666666666666,
						0,
						e
					]) O.ink.segment([
						x,
						-.035,
						0
					], [
						x,
						.035,
						0
					], { width: 1.3 });
					const x0 = e * st.u[0];
					O.ink.segment([
						-x0,
						0,
						0
					], [
						x0,
						0,
						0
					], {
						ink: RED,
						width: 9
					});
					O.ink.dot([
						-x0,
						0,
						0
					], { width: 19 });
					O.ink.dot([
						x0,
						0,
						0
					], { width: 19 });
				});
				const L = ctx.text.overlay, ax = toDesign([
					1.55,
					0,
					0
				], cam);
				L.draw((g) => {
					g.fillStyle = INK.K;
					arrowhead(g, ax[0] + 14, ax[1], 0, 16, 4.4);
				});
				label(L, "x", ax[0] + 30, ax[1] - 2);
				for (const [x, s] of [
					[-.6666666666666666, "−1"],
					[0, "0"],
					[e, "1"]
				]) {
					const q = toDesign([
						x,
						0,
						0
					], cam);
					type(L, s, q[0], q[1] + 34, { size: 24 });
				}
				const a = toDesign([
					-.6666666666666666 * st.u[0],
					0,
					0
				], cam), b = toDesign([
					e * st.u[0],
					0,
					0
				], cam);
				if (st.u[0] > .3) dimension(L, a, b, "length", {
					offset: -70,
					gap: true,
					alpha: seg(st.u[0], .3, .9)
				});
				caption(L, 1832, 978, "I.2", "A line is breadthless length.", { head: "Def." });
				margin(L, 1500, 150, [["DIM", "1"], ["SPACE", "ℝ¹"]]);
				paperOverlays(ctx, K, { br: "view  front · orthographic" });
			}
		},
		{
			id: "dim2",
			at: (T) => keys(T).B(4.5),
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T, ctx), t = ctx.t, st = dimState(t, K);
				reset();
				const cam = ortho([
					0,
					0,
					0
				], "top", lerp(2.4, 2.3, ctx.p), ctx.aspect), e = S4 / W4, x0 = e * st.u[0], z0 = e * st.u[1];
				plate(ctx, cam, () => {
					if (z0 > .002) O.fills.quad([
						-x0,
						0,
						-z0
					], [
						x0,
						0,
						-z0
					], [
						x0,
						0,
						z0
					], [
						-x0,
						0,
						z0
					], YEL);
					for (const z of [-z0, z0]) O.ink.segment([
						-x0,
						0,
						z
					], [
						x0,
						0,
						z
					], {
						ink: RED,
						width: 7
					});
					for (const x of [-x0, x0]) if (z0 > .002) O.ink.segment([
						x,
						0,
						-z0
					], [
						x,
						0,
						z0
					], {
						ink: BLU,
						width: 7
					});
					for (const x of [-x0, x0]) for (const z of [-z0, z0]) O.ink.dot([
						x,
						0,
						z
					], { width: 13 });
				});
				const L = ctx.text.overlay, c = [
					[
						-.6666666666666666,
						0,
						e
					],
					[
						e,
						0,
						e
					],
					[
						e,
						0,
						-.6666666666666666
					]
				].map((p) => toDesign(p, cam));
				if (st.u[1] > .3) {
					const al = seg(st.u[1], .3, .8);
					dimension(L, c[0], c[1], "length", {
						offset: 58,
						gap: true,
						alpha: al,
						text: { color: INK.red }
					});
					dimension(L, c[1], c[2], "breadth", {
						offset: 58,
						gap: true,
						level: true,
						alpha: al,
						text: { color: INK.blue }
					});
				}
				caption(L, 1832, 978, "I.5", "A surface is that which has length and breadth only.", { head: "Def." });
				margin(L, 1500, 150, [["DIM", "2"], ["SPACE", "ℝ²"]]);
				paperOverlays(ctx, K, { br: "view  top · orthographic" });
			}
		},
		{
			id: "dim3",
			at: (T) => keys(T).B(5),
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T, ctx), t = ctx.t, st = dimState(t, K);
				reset();
				const lt = t - K.B(5), cam = persp(ctx, [
					3.6 * Math.sin(.75 + lt * .25),
					1.9,
					3.6 * Math.cos(.75 + lt * .25)
				], [
					0,
					.1,
					0
				], { fov: 40 });
				const P = drawDims(ctx, cam, st);
				for (let j = 1; j <= 7; j++) {
					const sj = dimState(t - j * .035, K), Q = VERTS.map((v) => project(sj.M, v)), k = (1 - j / 8) ** 1.5 * .55;
					for (const [a, b] of EDGES) if (VERTS[a][1] > 0 && VERTS[b][1] > 0 && Math.abs(Q[a][1] - P[a][1]) > .004) O.lines.segment(Q[a], Q[b], {
						color: COL.me.map((c) => c * k),
						width: 2
					});
				}
				render(ctx, cam);
				const v = toDesign(P[15], cam);
				callout(ctx.text.overlay, [v[0], v[1]], "(1, 1, 1)", {
					dx: 60,
					dy: -60,
					draw: seg(t, K.B(5) + .15, K.B(5) + .4)
				});
				readout(ctx.text.overlay, 1500, 150, [["dim", "3"], ["space", "ℝ³"]]);
				overlays(ctx, K);
				look(ctx);
			}
		},
		{
			id: "dims",
			editOnly: true,
			at: (T) => keys(T).l13.start,
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T, ctx), t = ctx.t, st = dimState(t, K), ps = pointsState(t, K);
				reset();
				const cam = dimsCam(ctx, K, t, ctx.row.cam), n = st.u.filter((v, i) => i < 3 && v > .5).length;
				drawCodeSphere(ctx, cam, ps, {
					rotY: .5 + t * .09 - .55 + (t - K.s0) * .12,
					size: .05,
					bright: .9
				});
				const you = ease.outBack(seg(t, K.l13.start, K.l13.start + .22), 2.2);
				const got = Math.max(...K.unfold.slice(0, 3).map((tu) => {
					const k = seg(t, tu + .1, tu + .44);
					return k > 0 && k < 1 ? (1 - k) ** 2 : 0;
				}));
				const P = drawDimsYou(ctx, cam, st, {
					you: you * (1 + .3 * got),
					swell: 1 + .4 * got,
					point: ps.collapse
				});
				if (st.u[2] > 0) for (let j = 1; j <= 7; j++) {
					const sj = dimState(t - j * .035, K), Q = VERTS.map((v) => project(sj.M, v, sj.S)), k = (1 - j / 8) ** 1.5 * .55;
					for (const [a, b] of EDGES) if (VERTS[a][1] > 0 && VERTS[b][1] > 0 && Math.abs(Q[a][1] - P[a][1]) > .004) O.lines.segment(Q[a], Q[b], {
						color: COL.me.map((c) => c * k),
						width: 2
					});
				}
				render(ctx, cam);
				const L = ctx.text.overlay, v = toDesign(youAt(P), cam);
				if (you > .3) youLabel(L, v, `you ${YOU_AT[n]}`.trim(), { draw: seg(t, K.l13.start + .05, K.l13.start + .3) });
				for (const tu of K.unfold.slice(0, 3)) youRing(ctx, v, tu + .1, {
					r1: 92,
					lw: 3.4
				});
				readout(L, 1500, 150, [["dim", `${n}`], ["space", `ℝ${SUP[n]}`]]);
				overlays(ctx, K, { br: EUCLID[n] });
				look(ctx);
			}
		},
		{
			id: "split",
			at: (T) => keys(T).tDim,
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T, ctx), t = ctx.t, st = dimState(t, K);
				reset();
				if (remade(ctx)) return dimensionSheet(ctx, K, st);
				const x0 = 60, y0 = 96, w = 900, h = 352, pr = t - K.tDim, yD = 448;
				const views = [
					{
						rect: [
							x0,
							y0,
							w,
							h
						],
						label: "TOP",
						top: true,
						cam: (a) => ortho([
							-1.9,
							0,
							.3
						], "top", 4, a, { inset: true })
					},
					{
						rect: [
							960,
							y0,
							w,
							h
						],
						label: "PERSPECTIVE  ·  ℝ⁴ → ℝ³",
						top: true,
						cam: (a) => persp(ctx, [
							5.6 * Math.sin(.6 + t * .3),
							1.45,
							5.6 * Math.cos(.6 + t * .3)
						], [
							0,
							-.25,
							0
						], {
							fov: 40,
							aspect: a,
							inset: true
						})
					},
					{
						rect: [
							x0,
							448,
							w,
							h
						],
						label: "FRONT",
						cam: (a) => ortho([
							-1.9,
							.3,
							0
						], "front", 4, a, { inset: true })
					},
					{
						rect: [
							960,
							448,
							w,
							h
						],
						label: "RIGHT SIDE",
						cam: (a) => ortho([
							0,
							.3,
							0
						], "side", 4, a, { inset: true })
					}
				];
				const tex = capture(ctx, (sub) => {
					for (const v of views) sub.viewport(v.rect, (wp, hp) => {
						const cam = v.cam(wp / hp);
						O.ink.begin();
						O.fills.begin();
						const P = inkDims(st, {
							w: 4.8,
							tri: true
						});
						O.ink.end(sub).res(wp, hp);
						O.fills.end();
						sub.draw(O.inkScene, cam);
						v.you = toDesign(P[15], cam, v.rect);
					});
				});
				press(ctx, tex, { seed: 4 });
				paperLook(ctx);
				const L = ctx.text.overlay;
				for (const v of views) type(L, v.label, v.rect[0] + v.rect[2] - 26, v.top ? v.rect[1] + 28 : v.rect[1] + v.rect[3] - 24, {
					size: 15,
					weight: 600,
					tracking: 3,
					color: INK.soft,
					align: "right"
				});
				const WS = {
					font: "Space Grotesk",
					size: 84,
					weight: 700,
					tracking: 22
				}, half = L.measure("DIMENSION", WS) / 2 - 11 + 30;
				const k = ease.outCubic(seg(pr, 0, .16)), stamp = ease.outBack(seg(pr, 0, .09), 2), xa = 84, xb = 1836;
				L.draw((g) => {
					g.strokeStyle = INK.K;
					g.lineWidth = 2;
					g.strokeRect(x0, y0, w * 2, h * 2);
					g.lineWidth = 1;
					g.strokeStyle = INK.soft;
					g.beginPath();
					g.moveTo(960, 110);
					g.lineTo(960, 394);
					g.moveTo(960, 502);
					g.lineTo(960, 786);
					g.stroke();
					g.strokeStyle = INK.K;
					g.fillStyle = INK.K;
					g.lineWidth = 1.6;
					g.beginPath();
					const la = lerp(960 - half, xa, k), lb = lerp(960 + half, xb, k);
					g.moveTo(960 - half, yD);
					g.lineTo(la, yD);
					g.moveTo(960 + half, yD);
					g.lineTo(lb, yD);
					if (k > .98) {
						g.moveTo(xa, 418);
						g.lineTo(xa, 478);
						g.moveTo(xb, 418);
						g.lineTo(xb, 478);
					}
					g.stroke();
					if (k > .98) {
						arrowhead(g, xa, yD, Math.PI, 24, 6.5);
						arrowhead(g, xb, yD, 0, 24, 6.5);
					}
				});
				L.text("DIMENSION", 960, 451, {
					...WS,
					color: INK.K,
					scale: 1.12 - .12 * stamp,
					alpha: clamp(pr / .03)
				});
				titleBlock(L, 1236, 814, t);
				sheetNotes(L, 104, 132);
				paperOverlays(ctx, K);
			}
		},
		{
			id: "circleDraw",
			at: (T) => keys(T).BAR(2),
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T, ctx), t = ctx.t, st = circleState(t, K);
				reset();
				if (remade(ctx)) return circleLit(ctx, K, st);
				const cam = ortho([
					0,
					1,
					0
				], "front", 3.1, ctx.aspect), a0 = -Math.PI / 2, d = st.draw, C = [
					0,
					1,
					0
				];
				const at = (a) => [
					Math.cos(a),
					1 + Math.sin(a),
					0
				];
				plate(ctx, cam, () => {
					for (let j = 0; j < 3; j++) {
						const f0 = j / 3, f1 = Math.min(d, (j + 1) / 3);
						if (f1 <= f0 + .001) break;
						const n = Math.max(2, Math.ceil(60 * (f1 - f0) * 3)), fan = [C];
						for (let i = 0; i <= n; i++) fan.push(at(a0 + lerp(f0, f1, i / n) * TAU));
						O.fills.fan(fan, [
							RED,
							YEL,
							BLU
						][j]);
					}
					for (let j = 0; j < 12; j++) if (d * 12 >= j + .02) O.ink.segment(C, at(a0 + j / 12 * TAU), { width: 1.4 });
					O.ink.polyline(ringPts(st, 200), {
						width: 4,
						draw: d
					});
					const tip = at(a0 + d * TAU);
					O.ink.segment(C, tip, { width: 3.2 });
					O.ink.dot(C, { width: 11 });
					if (d < 1) O.ink.dot(tip, { width: 12 });
				});
				const L = ctx.text.overlay, c = toDesign(C, cam), A = toDesign(at(a0), cam);
				label(L, "O", c[0] - 26, c[1] - 16);
				label(L, "A", A[0] + 20, A[1] + 22);
				dimension(L, c, A, "r", {
					offset: 64,
					gap: true,
					level: true,
					draw: ease.outCubic(seg(t, K.BAR(2), K.BAR(2) + .25))
				});
				label(L, "x² + y² = 1", c[0] + 250, c[1] - 300, {
					size: 30,
					align: "left",
					alpha: seg(t, K.BAR(2) + .3, K.BAR(2) + .6)
				});
				caption(L, 1832, 978, "I.15", "A circle is a plane figure contained by one line…", { head: "Def." });
				margin(L, 1500, 150, [["RADII", `${Math.min(12, Math.floor(d * 12 + .98))} · equal`]], { keyW: 80 });
				paperOverlays(ctx, K, { br: "view  front · orthographic" });
			}
		},
		{
			id: "circleMacro",
			at: (T) => keys(T).B(10),
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T, ctx), t = ctx.t, st = circleState(t, K);
				reset();
				const a = -Math.PI / 2 + st.draw * TAU, tip = [
					Math.cos(a),
					1 + Math.sin(a),
					0
				];
				const k = ease.inOutCubic(seg(t, K.B(11) - .06, K.B(12) - .03));
				const cam = persp(ctx, [
					lerp(tip[0] * 1.35 + .1, .35, k),
					lerp(tip[1] + (tip[1] - 1) * .35 + .12, 1.2, k),
					lerp(.75, 3.7, k)
				], [
					lerp(tip[0], 0, k),
					lerp(tip[1], 1, k),
					0
				], { fov: 36 });
				drawCircle(ctx, cam, st, {
					gain: .72,
					you: remade(ctx),
					swarm: {
						focus: lerp(.82, 3.7, k),
						aperture: .03,
						maxBlur: 36,
						size: lerp(.007, .012, k),
						bright: lerp(.12, .24, k)
					}
				});
				render(ctx, cam);
				if (remade(ctx)) youOnGround(ctx, cam);
				overlays(ctx, K);
				look(ctx, {
					bloom: .75,
					threshold: 1.2,
					vignette: .55
				});
			}
		},
		{
			id: "rollWide",
			at: (T) => keys(T).B(12),
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T, ctx), t = ctx.t, st = circleState(t, K);
				reset();
				const cam = persp(ctx, [
					1.2,
					2.3,
					7.2
				], [
					Math.PI,
					.9,
					0
				], { fov: 42 });
				if (remade(ctx) && !ctx.row.ascii) {
					drawCircle(ctx, cam, st, {
						w: 4.4,
						cw: 3,
						gw: 5.5,
						gain: .85,
						reflect: .4,
						you: true,
						swarm: { bright: .22 }
					});
					render(ctx, cam);
					youOnGround(ctx, cam, { span: true });
					readout(ctx.text.overlay, 1500, 150, [["θ", `${st.th.toFixed(3)} rad`], ["arc", `${st.th.toFixed(3)}`]]);
					overlays(ctx, K);
					look(ctx, {
						bloom: .9,
						threshold: 1.05,
						vignette: .45
					});
					return;
				}
				const tex = capture(ctx, (sub) => {
					drawCircle(ctx, cam, st, {
						w: 9,
						cw: 7,
						gw: 10,
						gain: 1.3,
						reflect: .45,
						swarm: { bright: .5 }
					});
					render(sub, cam);
				});
				asciiView(ctx, tex, {
					cell: 17,
					tint: COL.me,
					source: .55,
					gain: 1.6
				});
				readout(ctx.text.overlay, 1500, 150, [["θ", `${st.th.toFixed(3)} rad`], ["arc", `${st.th.toFixed(3)}`]]);
				overlays(ctx, K, { br: "view  text mode · 17 px cells" });
				look(ctx, {
					bloom: .6,
					threshold: 1.1,
					ca: .15,
					vignette: .4
				});
			}
		},
		{
			id: "rollTrack",
			at: (T) => keys(T).B(13),
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T, ctx), t = ctx.t, st = circleState(t, K);
				reset();
				const cx = st.c[0], lt = t - K.B(13), cam = persp(ctx, [
					cx - 1.65 - lt * .15,
					.36,
					2.5
				], [
					cx - .42,
					.9,
					0
				], { fov: 44 });
				drawCircle(ctx, cam, st, {
					gain: .72,
					reflect: .2,
					you: remade(ctx),
					swarm: {
						focus: 2.7,
						aperture: .02,
						bright: .14
					}
				});
				render(ctx, cam);
				if (remade(ctx)) youOnGround(ctx, cam);
				O.floor.points.visible = true;
				O.floor.set({
					a: O.tex.codeWall,
					t,
					size: .1,
					minPx: 2,
					bright: .5,
					palette: V1SYN,
					focus: 2.6,
					aperture: .012,
					maxBlur: 20,
					scroll: [
						0,
						0,
						0
					]
				}, cam, ctx.H);
				ctx.draw(O.floorScene, cam);
				overlays(ctx, K);
				look(ctx, { ca: .3 });
			}
		},
		{
			id: "roll",
			editOnly: true,
			at: (T) => keys(T).l15.end,
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T, ctx), t = ctx.t, st = circleState(t, K), cx = st.c[0], t0 = ctx.shot.start;
				reset();
				const A = plateView([
					0,
					1,
					0
				], 3.1), C = plateView([
					Math.PI,
					1.05,
					0
				], 4.7);
				const ride = {
					pos: [
						cx - 1.15,
						.7,
						3.35
					],
					look: [
						cx + .2,
						.95,
						0
					],
					fov: 40
				};
				const a = ease.inOutSine(seg(t, t0 + .06, K.B(12) + .34)), c = ease.inOutSine(seg(t, K.B(13) + .02, K.tCirc - .05));
				const cam = viewCam(ctx, mixView(mixView(A, ride, a), C, c)), near = a * (1 - c);
				const notes = 1 - ease.inOutSine(seg(t, t0 + .04, K.B(12)));
				drawCircle(ctx, cam, st, {
					gain: lerp(.85, .72, near),
					arm: lerp(1, ARM, notes),
					reflect: .3 * near,
					you: true,
					swarm: {
						noise: .004 * near,
						focus: lerp(4.8, 2.9, near),
						aperture: .02 * near,
						bright: lerp(.22, .14, near)
					}
				});
				if (notes > 0) circleRadii(st, notes);
				render(ctx, cam);
				if (notes > 0) circleLabels(ctx, cam, K, notes);
				youOnGround(ctx, cam, {
					span: true,
					alpha: c
				});
				if (near > .01) {
					O.floor.points.visible = true;
					O.floor.set({
						a: O.tex.codeWall,
						t,
						size: .1,
						minPx: 2,
						bright: .5 * near,
						palette: V1SYN,
						focus: 2.6,
						aperture: .012,
						maxBlur: 20,
						scroll: [
							0,
							0,
							0
						]
					}, cam, ctx.H);
					ctx.draw(O.floorScene, cam);
				}
				readout(ctx.text.overlay, 1500, 150, [["θ", `${st.th.toFixed(3)} rad`], ["arc", `${st.th.toFixed(3)}`]]);
				overlays(ctx, K);
				look(ctx, {
					bloom: lerp(.9, 1.1, near),
					threshold: 1.05,
					vignette: .45
				});
			}
		},
		{
			id: "circumference",
			at: (T) => keys(T).tCirc,
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T, ctx), t = ctx.t, st = circleState(t, K), pr = t - K.tCirc;
				reset();
				if (remade(ctx)) return circumferenceLit(ctx, K, st);
				const cam = ortho([
					Math.PI,
					1.05,
					0
				], "front", lerp(4.7, 4.5, ease.outCubic(ctx.p)), ctx.aspect), [cx, cy] = st.c;
				plate(ctx, cam, () => {
					O.ink.segment([
						-1.2,
						0,
						0
					], [
						TAU + 2.4,
						0,
						0
					], { width: 1.4 });
					O.ink.polyline(cycloidPts(TAU, 240), {
						width: 1.5,
						dash: [.09, .55]
					});
					O.ink.polyline(cycloidPts(st.th, 240), { width: 2.4 });
					O.ink.polyline(ringPts(st, 200), { width: 3.6 });
					const rim = [
						st.th - Math.sin(st.th),
						1 - Math.cos(st.th),
						0
					];
					O.ink.segment([
						cx,
						cy,
						0
					], rim, {
						ink: BLU,
						width: 2.6
					});
					O.ink.dot([
						cx,
						cy,
						0
					], { width: 9 });
					O.ink.dot(rim, { width: 12 });
					if (pr < .05) O.ink.segment([
						0,
						0,
						0
					], [
						st.th,
						0,
						0
					], {
						ink: YEL,
						width: 9
					});
					for (const x of [0, TAU]) O.ink.segment([
						x,
						-.09,
						0
					], [
						x,
						.09,
						0
					], { width: 1.6 });
				});
				const L = ctx.text.overlay, a = toDesign([
					0,
					0,
					0
				], cam), b = toDesign([
					TAU,
					0,
					0
				], cam);
				const grow = pr < 0 ? 0 : ease.outBack(seg(pr, 0, .2), 1.4);
				circumWord(L, a, b, lerp(.06, 1, grow));
				label(L, "0", a[0], a[1] + 34, { size: 24 });
				label(L, "2π", b[0], b[1] + 34, { size: 24 });
				const n = Math.floor(seg(pr, .12, .62) * 52), mid = (a[0] + b[0]) / 2;
				if (pr > .08) {
					label(L, "C = 2πr =", mid - 16, a[1] + 92, {
						size: 28,
						align: "right"
					});
					type(L, TWO_PI_DIGITS.slice(0, Math.max(1, n)), mid, a[1] + 92, {
						size: 26,
						align: "left"
					});
				}
				label(L, "O", toDesign([
					cx,
					cy,
					0
				], cam)[0] + 18, toDesign([
					cx,
					cy,
					0
				], cam)[1] - 18, { size: 24 });
				caption(L, 1832, 1008, 16, "One turn unrolls the circumference: C = 2πr.");
				paperOverlays(ctx, K, { br: "" });
			}
		},
		{
			id: "sineProj",
			at: (T) => keys(T).BAR(4),
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T, ctx), lt = ctx.t - K.BAR(4);
				reset();
				if (remade(ctx)) return sineLit(ctx, K);
				const cam = ortho(SINE.c, "front", SINE.h, ctx.aspect), kw = 1.2;
				const C = [
					-2.6,
					0,
					0
				], ph = OMEGA * lt, p = [
					C[0] + Math.cos(ph),
					Math.sin(ph),
					0
				], x0 = SINE.x0, grow = ease.outCubic(seg(lt, 0, .8)) * 7;
				const th = (ph % TAU + TAU) % TAU;
				plate(ctx, cam, () => {
					O.ink.segment([
						C[0] - 1.25,
						0,
						0
					], [
						x0 + 7.4,
						0,
						0
					], { width: 1.3 });
					O.ink.segment([
						C[0],
						-1.25,
						0
					], [
						C[0],
						1.25,
						0
					], { width: 1.1 });
					O.ink.segment([
						x0,
						-1.3,
						0
					], [
						x0,
						1.3,
						0
					], { width: 1.3 });
					for (const y of [-1, 1]) O.ink.segment([
						x0 - .05,
						y,
						0
					], [
						x0 + .05,
						y,
						0
					], { width: 1.3 });
					const circ = [];
					for (let i = 0; i <= 160; i++) {
						const a = i / 160 * TAU;
						circ.push([
							C[0] + Math.cos(a),
							Math.sin(a),
							0
						]);
					}
					O.ink.polyline(circ, { width: 3.2 });
					const arc = [];
					for (let i = 0; i <= 48; i++) {
						const a = i / 48 * th;
						arc.push([
							C[0] + .3 * Math.cos(a),
							.3 * Math.sin(a),
							0
						]);
					}
					if (th > .02) {
						O.fills.fan([C, ...arc], YEL);
						O.ink.polyline(arc, { width: 1.3 });
					}
					O.ink.segment(C, p, {
						ink: BLU,
						width: 4
					});
					O.ink.segment([
						p[0],
						0,
						0
					], p, {
						ink: RED,
						width: 2.2,
						dash: [.07, .55]
					});
					O.ink.segment(p, [
						x0,
						p[1],
						0
					], {
						width: 1.3,
						dash: [.07, .5]
					});
					O.ink.segment([
						x0,
						0,
						0
					], [
						x0,
						p[1],
						0
					], {
						ink: RED,
						width: 7
					});
					O.ink.polyline(sineCurve(x0, x0 + grow, 360, (x) => Math.sin(ph - (x - x0) * kw)), { width: 3.6 });
					O.ink.dot(p, { width: 12 });
					O.ink.dot([
						x0,
						p[1],
						0
					], { width: 12 });
					O.ink.dot(C, { width: 8 });
				});
				const L = ctx.text.overlay, q = toDesign([
					x0,
					p[1],
					0
				], cam), cc = toDesign(C, cam), ax = toDesign([
					x0 + 7.4,
					0,
					0
				], cam);
				L.draw((g) => {
					g.fillStyle = INK.K;
					arrowhead(g, ax[0] + 12, ax[1], 0, 16, 4.4);
				});
				label(L, "t", ax[0] + 24, ax[1] + 22);
				label(L, "θ", cc[0] + 58 * Math.cos(th / 2), cc[1] - 58 * Math.sin(th / 2), {
					size: 26,
					color: INK.K
				});
				for (const [y, s] of [[1, "1"], [-1, "−1"]]) {
					const r = toDesign([
						x0,
						y,
						0
					], cam);
					type(L, s, r[0] - 26, r[1], {
						size: 22,
						align: "right"
					});
				}
				label(L, "sin θ", q[0] + 26, q[1] + (p[1] >= 0 ? -24 : 26), {
					size: 28,
					align: "left",
					color: INK.red
				});
				caption(L, 1832, 978, 17, "The sine: the height of a turning radius, drawn out in time.");
				margin(L, 1500, 150, [["θ", `${th.toFixed(3)} rad`], ["sin θ", `${Math.sin(ph).toFixed(3)}`]], { keyW: 80 });
				paperOverlays(ctx, K, { br: "view  front · orthographic" });
			}
		},
		{
			id: "sineSheet",
			at: (T) => keys(T).B(18),
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T, ctx), t = ctx.t, lt = t - K.B(18);
				reset();
				const cam = persp(ctx, [
					-5.5 + lt * .6,
					1.45,
					2.9
				], [
					1,
					-.3,
					-.6
				], { fov: 40 });
				const HEAT = 1.3 + .2 * kick(ctx), GAIN = 1.25, PW = 3;
				const tex = capture(ctx, (sub) => {
					O.sheet.set({
						w: 14,
						d: 7,
						amp: .35,
						k: 1.2,
						omega: OMEGA,
						t,
						size: .03,
						bright: HEAT,
						pow: PW,
						focus: 4.2,
						aperture: .02,
						maxBlur: 26
					}, cam, ctx.H);
					sub.draw(O.sheetScene, cam);
				});
				view(ctx, tex, "thermal", { gain: GAIN });
				const L = ctx.text.overlay;
				const bx = 1792, by = 330, bh = 380, lv = (y) => 1 - Math.exp(-HEAT * (y / .35 * .5 + .5) ** PW * GAIN);
				L.draw((g) => {
					const gr = g.createLinearGradient(0, 710, 0, by);
					[
						"#000004",
						"#320a5e",
						"#781c6d",
						"#bc3754",
						"#ed6925",
						"#fbb61a",
						"#fcffa4"
					].forEach((c, i, a) => gr.addColorStop(i / (a.length - 1), c));
					g.fillStyle = gr;
					g.fillRect(bx, by, 16, bh);
					g.strokeStyle = "#8a8f98";
					g.lineWidth = 1;
					g.strokeRect(1792.5, 330.5, 15, 379);
					g.beginPath();
					for (const y of [
						-.35,
						0,
						.35
					]) {
						const yy = by + bh * (1 - lv(y));
						g.moveTo(1786, yy);
						g.lineTo(bx, yy);
					}
					g.stroke();
				});
				for (const [v, y] of [
					["+0.35", .35],
					["0", 0],
					["−0.35", -.35]
				]) L.text(v, 1780, by + bh * (1 - lv(y)), {
					size: 14,
					font: "JetBrains Mono",
					weight: 500,
					color: "#b9bec8",
					align: "right"
				});
				const yv = .35 * Math.sin(1.2 - OMEGA * t), q = toDesign([
					1,
					yv,
					-.6
				], cam);
				crosshair(L, q[0], q[1], 22, {
					label: `y ${yv >= 0 ? "+" : "−"}${Math.abs(yv).toFixed(3)}`,
					color: "#e8e8e8"
				});
				readout(L, 1440, 150, [["y", "sin(kx − ωt)"], ["ω", "2π / bar"]], { accent: "#fbb61a" });
				overlays(ctx, K, { br: "view  thermal · y → heat" });
			}
		},
		{
			id: "youRide",
			at: (T) => keys(T).B(20),
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T, ctx), t = ctx.t, xy = youX(t, K, remade(ctx));
				reset();
				const dr = ease.inOutSine(ctx.p), own = {
					pos: [
						lerp(.8, .25, dr),
						.9,
						lerp(7.2, 6.5, dr)
					],
					look: [
						lerp(0, .35, dr),
						.1,
						0
					],
					fov: 40
				};
				const cam = viewCam(ctx, remade(ctx) ? mixView(sineMatch(ctx.shot.start, K, t), own, ease.inOutSine(seg(t, ctx.shot.start, ctx.shot.start + .55))) : own);
				O.lines.polyline(sineCurve(-7, 7, 500, Math.sin), {
					color: COL.me.map((c) => c * 1.2),
					width: 2.8
				});
				const [ta, tb] = tangent(xy, 2.2), P = [
					xy,
					Math.sin(xy),
					0
				], dx = .9, Q = [
					xy + dx,
					P[1],
					0
				], R = [
					xy + dx,
					P[1] + dx * Math.cos(xy),
					0
				];
				O.lines.segment(ta, tb, {
					color: COL.you.map((c) => c * 1.5),
					width: 2.6
				});
				O.lines.segment(P, Q, {
					color: COL.you.map((c) => c * .55),
					width: 1.6
				});
				O.lines.segment(Q, R, {
					color: COL.you.map((c) => c * .55),
					width: 1.6
				});
				if (remade(ctx)) youMark(P);
				else youDot(P);
				O.me.points.visible = true;
				O.me.set({
					a: O.tex.sineLine,
					t,
					size: .014,
					bright: remade(ctx) ? .45 * ease.inOutSine(seg(t, ctx.shot.start, ctx.shot.start + .3)) : .45,
					colA: COL.me,
					sparkle: .4
				}, cam, ctx.H);
				render(ctx, cam);
				if (remade(ctx)) {
					const v = toDesign(P, cam);
					youRing(ctx, v, K.l19.start + .02);
					youLabel(ctx.text.overlay, v, "you", {
						dx: -52,
						dy: 58,
						draw: seg(t, K.l19.start, K.l19.start + .25)
					});
				}
				const q = toDesign(tb, cam), qm = toDesign([
					xy + dx / 2,
					P[1],
					0
				], cam), qr = toDesign([
					xy + dx,
					P[1] + dx * Math.cos(xy) / 2,
					0
				], cam);
				callout(ctx.text.overlay, [q[0], q[1]], `y′ = cos x = ${Math.cos(xy).toFixed(2)}`, {
					dx: 60,
					dy: -50,
					color: HEX.you
				});
				const sm = {
					size: 15,
					font: "JetBrains Mono",
					weight: 500,
					color: HEX.you,
					alpha: .75
				};
				ctx.text.overlay.text("dx", qm[0], qm[1] + (Math.cos(xy) > 0 ? 20 : -20), sm);
				if (Math.abs(Math.cos(xy)) > .12) ctx.text.overlay.text("dy", qr[0] + 26, qr[1], sm);
				overlays(ctx, K);
				look(ctx);
			}
		},
		{
			id: "youClose",
			at: (T) => keys(T).B(22),
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T, ctx), t = ctx.t, xy = youX(t, K, remade(ctx));
				reset();
				const P = [
					xy,
					Math.sin(xy),
					0
				], cam = persp(ctx, [
					xy - .9,
					P[1] + .35,
					1.5
				], P, { fov: 36 });
				O.lines.polyline(sineCurve(xy - 4, xy + 4, 300, Math.sin), {
					color: COL.me.map((c) => c * .9),
					width: 2.2
				});
				const [ta, tb] = tangent(xy, 1.8);
				O.lines.segment(ta, tb, {
					color: COL.you.map((c) => c * 1.6),
					width: 3
				});
				if (remade(ctx)) youMark(P, .8);
				else youDot(P);
				O.me.points.visible = true;
				O.me.set({
					a: O.tex.sineLine,
					t,
					size: .008,
					bright: .2,
					colA: COL.me,
					sparkle: .4,
					focus: 1.75,
					aperture: .035,
					maxBlur: 40
				}, cam, ctx.H);
				render(ctx, cam);
				overlays(ctx, K);
				look(ctx, {
					bloom: 1.3,
					vignette: .55
				});
			}
		},
		{
			id: "tangents",
			at: (T) => keys(T).tTan,
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T, ctx), pr = ctx.t - K.tTan, k = ease.outCubic(seg(pr, 0, .3));
				reset();
				const cam = ortho([
					0,
					0,
					0
				], "front", 4.4, ctx.aspect), xy = 1.9, P = [
					xy,
					Math.sin(xy),
					0
				];
				O.lines.polyline(sineCurve(-7.6, 7.6, 400, Math.sin), {
					color: COL.me.map((c) => c * .35),
					width: 1.6
				});
				const [ta, tb] = tangent(xy, 3.4);
				O.lines.segment(ta, tb, {
					color: COL.you.map((c) => c * 1.4),
					width: 2.4
				});
				if (remade(ctx)) youMark(P, .9);
				else youDot(P, .9);
				render(ctx, cam);
				const S = ctx.text.scene, n = O.tanLines.length;
				for (let i = 0; i < n; i++) {
					const f = i / (n - 1);
					if (f > k + .001) break;
					const x = lerp(-7.3, 7.3, f);
					if (Math.abs(x - xy) < .12) continue;
					const [a, b] = tangent(x, 1), A = toDesign(a, cam), B = toDesign(b, cam), m = toDesign([
						x,
						Math.sin(x),
						0
					], cam);
					const on = ease.outCubic(seg(k - f, 0, .12));
					S.text(O.tanLines[i], m[0], m[1], {
						size: 15,
						font: "JetBrains Mono",
						weight: 500,
						color: i % 3 ? HEX.me : "#dff8ff",
						alpha: (.55 + .3 * (i % 2)) * on,
						rot: Math.atan2(B[1] - A[1], B[0] - A[0])
					});
				}
				tangentWord(S, cam, P, pr, remade(ctx));
				readout(ctx.text.overlay, 1500, 150, [["envelope", "sin x"], ["lines", `${Math.round(k * n)}`]]);
				overlays(ctx, K, { br: "view  front · orthographic" });
				look(ctx, {
					vignette: .35,
					ca: .12
				});
			}
		},
		{
			id: "fly",
			at: (T) => keys(T).BAR(6),
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T, ctx), t = ctx.t, X = flyX(t, K);
				reset();
				const cam = persp(ctx, [
					X - 2.4,
					1.7,
					3.4
				], [
					X + 3,
					1,
					0
				], { fov: 44 });
				const quant = t >= K.B(27.5);
				const scene = (sub) => {
					O.lines.begin();
					O.lines.polyline(limCurvePts(Math.max(-1.5, X - 4), X + 30, 2400, XF), {
						color: COL.me.map((c) => c * 1.5),
						width: 3
					});
					O.lines.segment([
						-2,
						LV,
						0
					], [
						X + 80,
						LV,
						0
					], {
						color: COL.you.map((c) => c * .35),
						width: 1.6
					});
					render(sub, cam);
					O.floor.points.visible = true;
					const P = 21.12, k0 = Math.floor((X - 6) / P);
					for (let j = 0; j < 3; j++) {
						O.floor.points.position.set((k0 + j) * P, 0, 0);
						O.floor.set({
							a: O.tex.codeFloor,
							t,
							size: .14,
							minPx: 2,
							bright: .34,
							palette: V1SYN,
							focus: 4.4,
							aperture: .02,
							maxBlur: 30
						}, cam, ctx.H);
						sub.draw(O.floorScene, cam);
					}
				};
				if (!quant) scene(ctx);
				else {
					const tex = capture(ctx, scene);
					view(ctx, tex, "dither", remade(ctx) ? {
						pix: 3,
						ink: ONE_BIT,
						gain: 1.7
					} : {
						pix: 3,
						ink: [
							.1,
							.1,
							.12
						],
						paper: [
							.94,
							.92,
							.87
						],
						gain: 1.7
					});
				}
				const L = ctx.text.overlay, ink = quant && !remade(ctx) ? INK.K : HEX.me;
				for (let d = 0, last = -1e9; d <= 30; d++) {
					const q = toDesign([
						d * XF,
						0,
						0
					], cam);
					if (!(q[2] < 1 && q[0] > 60 && q[0] < 1860 && q[1] < 1040) || Math.abs(q[0] - last) < 64) continue;
					last = q[0];
					L.text(`10${sup(d)}`, q[0], q[1] + 28, {
						size: 18,
						weight: 600,
						font: "JetBrains Mono",
						color: ink,
						alpha: .85
					});
				}
				const x = 10 ** (Math.max(-.4, X) / XF), rows = [["x", `≈ ${x.toExponential(1)}`], ["f(x) − L", `${(fLim(x) - LV).toExponential(1)}`]];
				if (x >= 2 ** 53) rows.push(["x + 1 == x", "true"]);
				readout(L, 1440, 150, rows, {
					keyW: 140,
					accent: ink
				});
				if (quant && remade(ctx)) overlays(ctx, K, { br: "view  1 bit · float64 exhausted" });
				else if (quant) {
					frame(L, t, ctx.T, {
						label: "definitions",
						bottomRight: "view  1 bit · float64 exhausted",
						color: INK.grey,
						alpha: .95
					});
					consoleLog(L, ctx.T, t, {
						from: K.s0 - .2,
						color: INK.K,
						accent: INK.red,
						glow: 0
					});
				} else {
					overlays(ctx, K);
					look(ctx, { ca: .4 + .5 * seg(t, K.BAR(6) + 1, K.BAR(7)) });
				}
			}
		},
		{
			id: "asymptote",
			at: (T) => keys(T).BAR(7),
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T, ctx), t = ctx.t, lit = ease.inOutCubic(seg(t, K.tYou - .02, K.tYou + .42));
				reset();
				if (remade(ctx)) return asymptoteLit(ctx, K, lit);
				const cam = ortho([
					lerp(7.4, 7.9, ease.inOutSine(ctx.p)),
					1.35,
					0
				], "front", lerp(7.6, 7.25, ease.inOutSine(ctx.p)), ctx.aspect);
				plate(ctx, cam, () => {
					graphPaper(0, 14.6);
					O.ink.polyline(limCurvePts(0, 14.6, 2400), { width: 3.2 });
					O.ink.segment([
						-1,
						0,
						0
					], [
						15,
						0,
						0
					], { width: 1.4 });
					if (lit > 0) O.ink.segment([
						0,
						LV,
						0
					], [
						lerp(0, 14.6, lit),
						LV,
						0
					], {
						ink: RED,
						width: 3.6
					});
				}, { seed: 6 });
				const L = ctx.text.overlay;
				axisLabels(L, cam);
				if (lit > .5) {
					const q = toDesign([
						12.9,
						LV,
						0
					], cam);
					label(L, "y = L", q[0], q[1] - 30, {
						size: 30,
						color: INK.red,
						alpha: seg(lit, .5, 1)
					});
				}
				caption(L, 1832, 978, 18, "f(x) = L + A sin x ⁄ x, on a logarithmic scale.");
				paperOverlays(ctx, K, { br: "semi-log · 3 cycles" });
			}
		},
		{
			id: "limit",
			at: (T) => keys(T).tLim,
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T, ctx), lt = ctx.t - K.tLim, eps = lerp(.6, .06, ease.inOutCubic(seg(lt, 0, .4)));
				reset();
				if (remade(ctx)) return limitLit(ctx, K, lt, eps);
				const cam = ortho([
					7.6,
					1.3,
					0
				], "front", 7.1, ctx.aspect), L = ctx.text.overlay;
				const WS = {
					font: SERIF,
					size: 66,
					weight: 700,
					tracking: 9
				}, half = (L.measure("LIMITATIONS", WS) / 2 + 22) / (1080 / 7.1);
				const wx = [10.6 - half, 10.6 + half];
				const split = (y, o) => {
					O.ink.segment([
						0,
						y,
						0
					], [
						wx[0],
						y,
						0
					], o);
					O.ink.segment([
						wx[1],
						y,
						0
					], [
						15,
						y,
						0
					], o);
				};
				plate(ctx, cam, () => {
					graphPaper(0, 14.8);
					O.ink.polyline(limCurvePts(0, wx[0], 2e3), { width: 3.2 });
					O.ink.polyline(limCurvePts(wx[1], 14.8, 400), { width: 3.2 });
					O.ink.segment([
						-1,
						0,
						0
					], [
						15,
						0,
						0
					], { width: 1.4 });
					split(LV, {
						ink: RED,
						width: 3.6
					});
					for (const s of [1, -1]) split(LV + s * eps, {
						ink: RED,
						width: 1.6,
						dash: [.35, .55]
					});
					for (const [xa, xb] of [[0, wx[0]], [wx[1], 15]]) O.fills.quad([
						xa,
						LV - eps,
						0
					], [
						xb,
						LV - eps,
						0
					], [
						xb,
						LV + eps,
						0
					], [
						xa,
						LV + eps,
						0
					], inkMul(RED, .12));
				}, { seed: 7 });
				axisLabels(L, cam);
				const a = toDesign([
					wx[0],
					LV,
					0
				], cam), b = toDesign([
					wx[1],
					LV,
					0
				], cam), stamp = ease.outBack(seg(lt, 0, .1), 2);
				L.text("LIMITATIONS", (a[0] + b[0]) / 2, a[1] + 3, {
					...WS,
					color: INK.red,
					scale: 1.1 - .1 * stamp,
					alpha: clamp(lt / .03)
				});
				label(L, "lim", 150, 178, {
					italic: false,
					size: 40,
					align: "left"
				});
				label(L, "x→∞", 154, 214, {
					size: 18,
					align: "left"
				});
				label(L, "f(x) = L", 222, 178, {
					size: 40,
					align: "left"
				});
				margin(L, 150, 262, [["ε", eps.toFixed(3)]], {
					keyW: 36,
					color: INK.red
				});
				caption(L, 1832, 1008, "ε–N", "For every ε > 0 there is an N with |f(x) − L| < ε for all x > N.", {
					size: 18,
					head: "Def."
				});
				paperOverlays(ctx, K, { br: "" });
			}
		},
		{
			id: "gap",
			at: (T) => keys(T).B(31),
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T, ctx), lt = ctx.t - K.B(31);
				reset();
				const gapY = 1.045, push = ease.inOutSine(seg(lt, 0, .46)), z = lerp(.9, .42, push);
				const cy = LV + (remade(ctx) ? lerp(GAP_Y0, .022, push) : .022);
				const cam = persp(ctx, [
					12.75,
					cy,
					z
				], [
					13.35,
					cy,
					0
				], { fov: 34 });
				O.lines.segment([
					9,
					gapY,
					0
				], [
					21,
					gapY,
					0
				], {
					color: COL.me.map((c) => c * 1.2),
					width: 2
				});
				O.lines.segment([
					9,
					LV,
					0
				], [
					21,
					LV,
					0
				], {
					color: COL.you.map((c) => c * 1.3),
					width: 2
				});
				render(ctx, cam);
				const a = toDesign([
					13.35,
					gapY,
					0
				], cam), b = toDesign([
					13.35,
					LV,
					0
				], cam);
				dimLine(ctx.text.overlay, a, b, "ε > 0", {
					offset: 90,
					color: HEX.white
				});
				overlays(ctx, K);
				look(ctx, {
					bloom: .8,
					threshold: 1.1,
					vignette: .55
				});
			}
		}
	]
});
var GAP_Y0 = .08450704225352114 * Math.tan(17 * Math.PI / 180) * Math.hypot(.6, .9);
var MONO = "JetBrains Mono";
/** A label in the HUD's face, on the flat overlay. */
var hudText = (L, s, x, y, o = {}) => L.text(s, x, y, {
	size: 18,
	font: MONO,
	weight: 500,
	color: HEX.white,
	alpha: .85,
	align: "center",
	...o
});
/** A formula, in light: as code writes it (the HUD's face, upright), a size up from the labels. */
var formula = (L, s, x, y, o = {}) => L.text(s, x, y, {
	font: MONO,
	size: 28,
	weight: 500,
	color: HEX.white,
	alpha: .92,
	align: "center",
	...o
});
/** The pen for a sheet's furniture (title block, notes) in light: hairlines and small type in the HUD's colours. */
var LIGHT = {
	line: HEX.dim,
	alpha: .85,
	text: (L, s, x, y, o = {}) => L.text(s, x, y, {
		font: MONO,
		size: Math.round((o.size ?? 22) * .9),
		weight: o.weight ?? 500,
		tracking: o.tracking ?? 0,
		color: (o.weight ?? 500) >= 700 ? HEX.me : "#8f9ab3",
		align: o.align ?? "center",
		alpha: .9
	})
};
/** A reception: 1 as it arrives at t0, falling to 0 over d seconds (the swell of you's mark). */
var pulse = (t, t0, d = .34) => {
	const k = seg(t, t0, t0 + d);
	return k > 0 && k < 1 ? (1 - k) ** 2 : 0;
};
/** The 1-bit view's lit pixels, on the dark (display colour): me's light. */
var ONE_BIT = [
	.62,
	.94,
	1
];
var SHEET = {
	x0: 60,
	y0: 96,
	W: 1800,
	H: 704,
	yD: 748
};
var DIM_VIEWS = [
	{
		rect: [
			92,
			112,
			330,
			286
		],
		label: "TOP",
		dir: "top"
	},
	{
		rect: [
			92,
			404,
			330,
			286
		],
		label: "FRONT",
		dir: "front"
	},
	{
		rect: [
			432,
			404,
			330,
			286
		],
		label: "RIGHT SIDE",
		dir: "side"
	}
];
/**
* The tesseract's drawing colours as the fourth dimension opens (k: 0..1, how far): the cell w = −1 deep blue, the eight
* edges along w violet, the rest me's own colour. At 0 every edge is me's, as the cube was on the cut.
*/
function dimCol(e, k) {
	const c = EDGE_DIM[e] === 3 ? COL.violet : VERTS[EDGES[e][0]][3] < 0 ? COL.meDeep : COL.me;
	return COL.me.map((v, i) => lerp(v, c[i], k));
}
/**
* The tesseract as a small view's line drawing in light (you's vertex warm); returns its vertices. k: the lines' widths
* are in design px of whatever they are drawn into, and a viewport counts as a whole frame (engine/lines.js), so a view
* k times smaller than the frame draws them k times wider to keep the frame's hairline.
*/
function litDims(st, k = 1) {
	const P = VERTS.map((v) => project(st.M, v, st.S));
	EDGES.forEach(([a, b], e) => O.lines.segment(P[a], P[b], {
		color: dimCol(e, st.u[3]).map((c) => c * 1.2),
		width: 2.4 * k
	}));
	for (const p of P) O.lines.segment(p, p, {
		color: COL.white.map((c) => c * 1.6),
		width: 5 * k
	});
	youMark(P[15], .75, .3 * k);
	return P;
}
/**
* Remake: DIMENSION, drawn in light where the cube stands. `dims` ends with its camera where this sheet has its big view
* (HERO) and the sheet keeps that camera, so on the cut the figure stays where it is and the drawing gathers round it:
* the three small views at the left, the title block and the notes, and under them all the overall dimension line,
* whose value is the word. Four frames on, the fourth dimension opens (a second cube recedes inside the first) and
* you, on the far vertex, receives its fourth coordinate.
*/
function dimensionSheet(ctx, K, st) {
	const t = ctx.t, pr = t - K.tDim, L = ctx.text.overlay, S = ctx.text.scene, { x0, y0, W, yD } = SHEET;
	const cam = dimsCam(ctx, K, t), got = pulse(t, K.tDim + .1);
	const P = drawDimsYou(ctx, cam, st, {
		you: 1 + .3 * got,
		swell: 1 + .4 * got,
		point: 0,
		tri: st.u[3]
	});
	render(ctx, cam);
	O.me.points.visible = false;
	const views = DIM_VIEWS.map((v) => ({ ...v }));
	for (const v of views) ctx.viewport(v.rect, (wp, hp) => {
		const c = ortho([
			0,
			0,
			0
		], v.dir, 2.8, wp / hp, { inset: true });
		O.lines.begin();
		const Q = litDims(st, 1080 / v.rect[3]);
		O.lines.end(ctx).res(wp, hp);
		ctx.draw(O.scene, c);
		v.you = toDesign(Q[15], c, v.rect);
	});
	L.draw((g) => {
		g.globalAlpha *= .5;
		g.strokeStyle = HEX.dim;
		g.lineWidth = 1.2;
		g.strokeRect(x0, y0, W, SHEET.H);
	});
	for (const v of views) viewportFrame(L, v.rect, v.label, {
		labelPos: "bottom",
		alpha: .45
	});
	L.text("PERSPECTIVE  ·  ℝ⁴ → ℝ³", x0 + W - 26, y0 + 28, {
		size: 14,
		font: MONO,
		weight: 600,
		color: HEX.me,
		align: "right",
		alpha: .7
	});
	const v = toDesign(youAt(P), cam);
	youLabel(L, v, "you (1, 1, 1, 1)");
	youRing(ctx, v, K.tDim + .1, {
		r1: 92,
		lw: 3.4
	});
	const WS = {
		font: MONO,
		size: 84,
		weight: 700,
		tracking: 22
	}, half = L.measure("DIMENSION", WS) / 2 - 11 + 30;
	const k = ease.outCubic(seg(pr, 0, .16)), stamp = ease.outBack(seg(pr, 0, .09), 2), xa = x0 + 24, xb = x0 + W - 24;
	S.draw((g, px) => {
		g.strokeStyle = HEX.white;
		g.fillStyle = HEX.white;
		g.lineWidth = 1.8;
		g.shadowColor = HEX.me;
		g.shadowBlur = 6 * px;
		g.beginPath();
		g.moveTo(960 - half, yD);
		g.lineTo(lerp(960 - half, xa, k), yD);
		g.moveTo(960 + half, yD);
		g.lineTo(lerp(960 + half, xb, k), yD);
		if (k > .98) {
			g.moveTo(xa, yD - 30);
			g.lineTo(xa, yD + 30);
			g.moveTo(xb, yD - 30);
			g.lineTo(xb, yD + 30);
		}
		g.stroke();
		if (k > .98) {
			arrowhead(g, xa, yD, Math.PI, 24, 6.5);
			arrowhead(g, xb, yD, 0, 24, 6.5);
		}
	});
	S.text("DIMENSION", 960, yD + 3, {
		...WS,
		color: HEX.white,
		glow: 12,
		glowColor: HEX.me,
		scale: 1.12 - .12 * stamp,
		alpha: clamp(pr / .03)
	});
	titleBlock(L, 1236, 814, t, LIGHT);
	sheetNotes(L, 452, 140, "1.  Projection ℝ⁴ → ℝ³:  p′ = 4p ⁄ 3(3 − w).", LIGHT, ["2.  The cell w = −1 in deep blue; the eight edges along w in violet.", "3.  All 32 edges of equal length (2)."]);
	overlays(ctx, K);
	look(ctx, { ca: .1 });
}
/** The pen's radii in light: every one it has passed, all equal. a: how much of them is left (they clear away in `roll`). */
function circleRadii(st, a = 1) {
	const C = [
		0,
		1,
		0
	], a0 = -Math.PI / 2;
	for (let j = 0; j < 12; j++) {
		if (st.draw * 12 < j + .02) break;
		const q = a0 + j / 12 * TAU;
		O.lines.segment(C, [
			Math.cos(q),
			1 + Math.sin(q),
			0
		], {
			color: COL.me.map((c) => c * .5 * a),
			width: 1.8
		});
	}
	O.lines.segment(C, C, {
		color: COL.white.map((c) => c * 2 * a),
		width: 10
	});
}
/** The circle's labels: its centre, the radius measured, its equation (a: as for circleRadii). */
function circleLabels(ctx, cam, K, a = 1) {
	const L = ctx.text.overlay, t = ctx.t, c = toDesign([
		0,
		1,
		0
	], cam), A = toDesign([
		0,
		0,
		0
	], cam);
	hudText(L, "O", c[0] - 26, c[1] - 18, { alpha: .85 * a });
	hudText(L, "A", A[0] + 22, A[1] + 22, { alpha: .85 * a });
	const r = ease.outCubic(seg(t, K.BAR(2), K.BAR(2) + .25));
	if (r > 0) {
		dimLine(L, c, A, "", {
			offset: 64,
			color: HEX.white,
			alpha: .8 * a * r
		});
		formula(L, "r", c[0] - 64 - 22, (c[1] + A[1]) / 2, {
			size: 28,
			alpha: .9 * a * r
		});
	}
	formula(L, "x² + y² = 1", c[0] + 250, c[1] - 300, {
		size: 32,
		align: "left",
		alpha: .92 * a * seg(t, K.BAR(2) + .3, K.BAR(2) + .6)
	});
}
/** Remake: the pen draws the circle in light, and every radius it passes, all equal; framed as `roll` opens. */
var ARM = 1.6;
function circleLit(ctx, K, st) {
	const cam = viewCam(ctx, plateView([
		0,
		1,
		0
	], 3.1));
	circleRadii(st);
	O.lines.polyline(ringPts(st, 200), {
		color: COL.me.map((c) => c * .12),
		width: 1.6
	});
	if (st.draw <= 0) {
		O.lines.segment([
			0,
			1,
			0
		], [
			0,
			0,
			0
		], {
			color: COL.me.map((c) => c * .9 * .85 * ARM),
			width: 2 * ARM
		});
		O.lines.segment([
			0,
			0,
			0
		], [
			0,
			0,
			0
		], {
			color: COL.white.map((c) => c * 4),
			width: 14
		});
	}
	drawCircle(ctx, cam, st, {
		gain: .85,
		arm: ARM,
		you: true,
		swarm: {
			noise: 0,
			focus: 4.8,
			aperture: 0,
			bright: .22
		}
	});
	render(ctx, cam);
	circleLabels(ctx, cam, K);
	readout(ctx.text.overlay, 1500, 150, [["radii", `${Math.min(12, Math.floor(st.draw * 12 + .98))} · equal`]]);
	overlays(ctx, K, { br: "Def. I.15  A circle is a plane figure contained by one line…" });
	look(ctx, {
		bloom: .9,
		threshold: 1.05,
		vignette: .45
	});
}
/**
* Remake: CIRCUMFERENCE in light, framed as `roll` leaves it: the whole ground line, the circle one turn along it, you at
* its far end. The unrolled line grows into the word, letter-spaced to run exactly from 0 to 2π, and gives it its
* light; the line's end arrives at you just after the word lands (the ring).
*/
function circumferenceLit(ctx, K, st) {
	const pr = ctx.t - K.tCirc, L = ctx.text.overlay, S = ctx.text.scene;
	const cam = viewCam(ctx, plateView([
		Math.PI,
		1.05,
		0
	], lerp(4.7, 4.5, ease.outCubic(ctx.p))));
	const grow = pr < 0 ? 0 : ease.outBack(seg(pr, 0, .2), 1.4);
	drawCircle(ctx, cam, st, {
		gain: .85,
		you: true,
		line: 1 - .7 * clamp(grow),
		swarm: {
			noise: 0,
			focus: 4.8,
			aperture: 0,
			bright: .22
		}
	});
	for (const x of [0, TAU]) O.lines.segment([
		x,
		-.09,
		0
	], [
		x,
		.09,
		0
	], {
		color: COL.white.map((c) => c * .9),
		width: 2
	});
	render(ctx, cam);
	const a = toDesign([
		0,
		0,
		0
	], cam), b = toDesign([
		TAU,
		0,
		0
	], cam), o = toDesign([
		st.c[0],
		st.c[1],
		0
	], cam);
	circumWord(S, a, b, lerp(.06, 1, grow), {
		fill: HEX.gold,
		glow: 10,
		font: MONO
	});
	hudText(L, "0", a[0], a[1] + 36, { size: 20 });
	hudText(L, "2π", b[0], b[1] + 36, { size: 20 });
	hudText(L, "O", o[0] + 18, o[1] - 18, { size: 20 });
	youLabel(L, b, "you", {
		dx: 34,
		dy: -64
	});
	youRing(ctx, b, K.tCirc + .1, {
		r0: 22,
		r1: 104,
		lw: 4,
		dur: .5
	});
	const n = Math.floor(seg(pr, .12, .62) * 52), mid = (a[0] + b[0]) / 2;
	if (pr > .08) {
		hudText(L, "C = 2πr =", mid - 16, a[1] + 92, {
			size: 24,
			align: "right"
		});
		hudText(L, TWO_PI_DIGITS.slice(0, Math.max(1, n)), mid, a[1] + 92, {
			size: 24,
			align: "left",
			color: HEX.gold
		});
	}
	readout(L, 1500, 150, [["θ", `${st.th.toFixed(3)} rad`], ["arc", `${st.th.toFixed(3)}`]]);
	overlays(ctx, K, { br: "One turn unrolls the circumference: C = 2πr" });
	look(ctx, {
		bloom: .9,
		threshold: 1.05,
		vignette: .45
	});
}
/**
* Remake: the sine in light. A turning radius (on a circle of me's points, as in the block before), the height of its
* end carried across and set down on a graph, drawn out in time. Only me: this is the supposition. The wave has sin x's
* own wavelength, so that `youRide`'s curve lies on it at the cut.
*/
function sineLit(ctx, K) {
	const t = ctx.t, lt = t - K.BAR(4), cam = viewCam(ctx, plateView(SINE.c, SINE.h, 40)), L = ctx.text.overlay;
	const C = [
		-2.6,
		0,
		0
	], ph = OMEGA * lt, p = [
		C[0] + Math.cos(ph),
		Math.sin(ph),
		0
	], x0 = SINE.x0, grow = ease.outCubic(seg(lt, 0, .8)) * 7;
	const th = (ph % TAU + TAU) % TAU, axis = {
		color: COL.white.map((c) => c * .32),
		width: 1.4
	};
	O.lines.segment([
		C[0] - 1.25,
		0,
		0
	], [
		x0 + 7.4,
		0,
		0
	], axis);
	O.lines.segment([
		C[0],
		-1.25,
		0
	], [
		C[0],
		1.25,
		0
	], axis);
	O.lines.segment([
		x0,
		-1.3,
		0
	], [
		x0,
		1.3,
		0
	], axis);
	for (const y of [-1, 1]) O.lines.segment([
		x0 - .05,
		y,
		0
	], [
		x0 + .05,
		y,
		0
	], axis);
	const circ = [];
	for (let i = 0; i <= 160; i++) {
		const a = i / 160 * TAU;
		circ.push([
			C[0] + Math.cos(a),
			Math.sin(a),
			0
		]);
	}
	O.lines.polyline(circ, {
		color: COL.white.map((c) => c * 1.1),
		width: 3
	});
	if (th > .02) {
		const arc = [];
		for (let i = 0; i <= 48; i++) {
			const a = i / 48 * th;
			arc.push([
				C[0] + .3 * Math.cos(a),
				.3 * Math.sin(a),
				0
			]);
		}
		O.lines.polyline(arc, {
			color: COL.gold.map((c) => c * 1.2),
			width: 2
		});
	}
	O.lines.segment(C, p, {
		color: COL.me.map((c) => c * 1.6),
		width: 3.6
	});
	O.lines.segment([
		p[0],
		0,
		0
	], p, {
		color: COL.gold.map((c) => c * .8),
		width: 1.6
	});
	O.lines.segment(p, [
		x0,
		p[1],
		0
	], {
		color: COL.white.map((c) => c * .28),
		width: 1.2
	});
	O.lines.segment([
		x0,
		0,
		0
	], [
		x0,
		p[1],
		0
	], {
		color: COL.gold.map((c) => c * 2.2),
		width: 6
	});
	O.lines.polyline(sineCurve(x0, x0 + grow, 360, (x) => Math.sin(ph - (x - x0))), {
		color: COL.me.map((c) => c * 1.2),
		width: 2.8
	});
	for (const q of [p, [
		x0,
		p[1],
		0
	]]) O.lines.segment(q, q, {
		color: COL.white.map((c) => c * 2.4),
		width: 11
	});
	O.lines.segment(C, C, {
		color: COL.white.map((c) => c * 2),
		width: 8
	});
	const me = O.me;
	me.points.visible = true;
	me.points.position.set(C[0], 0, 0);
	me.set({
		a: O.tex.ring,
		revealBy: "w",
		reveal: 1,
		t,
		size: .012,
		bright: .2 + .06 * kick(ctx),
		colA: COL.me,
		sparkle: .4,
		noise: .003
	}, cam, ctx.H);
	render(ctx, cam);
	const q = toDesign([
		x0,
		p[1],
		0
	], cam), cc = toDesign(C, cam), ax = toDesign([
		x0 + 7.4,
		0,
		0
	], cam);
	L.draw((g) => {
		g.globalAlpha *= .6;
		g.fillStyle = HEX.white;
		arrowhead(g, ax[0] + 12, ax[1], 0, 16, 4.4);
	});
	formula(L, "t", ax[0] + 24, ax[1] + 24, { size: 24 });
	formula(L, "θ", cc[0] + 58 * Math.cos(th / 2), cc[1] - 58 * Math.sin(th / 2), {
		size: 24,
		color: HEX.gold
	});
	for (const [y, v] of [[1, "1"], [-1, "−1"]]) {
		const r = toDesign([
			x0,
			y,
			0
		], cam);
		hudText(L, v, r[0] - 26, r[1], {
			size: 18,
			align: "right"
		});
	}
	formula(L, "sin θ", q[0] + 26, q[1] + (p[1] >= 0 ? -24 : 26), {
		size: 26,
		align: "left",
		color: HEX.gold
	});
	readout(L, 1500, 150, [["θ", `${th.toFixed(3)} rad`], ["sin θ", `${Math.sin(ph).toFixed(3)}`]]);
	overlays(ctx, K, { br: "The sine: the height of a turning radius, drawn out in time" });
	look(ctx);
}
/** Semi-log graph paper as a graticule of light: a cycle per decade (1…9), and fine rules every 0.1 in y. */
function gridLit(X0, X1) {
	const c = COL.meDeep;
	for (let d = 0; d < 6; d++) for (let m = 1; m <= 9; m++) {
		const X = XS * (d + Math.log10(m));
		if (X < X0 || X > X1) continue;
		O.lines.segment([
			X,
			-.55,
			0
		], [
			X,
			3.55,
			0
		], {
			color: c.map((v) => v * (m === 1 ? .55 : .22)),
			width: m === 1 ? 1.5 : 1.1
		});
	}
	for (let i = -5; i <= 35; i++) O.lines.segment([
		X0,
		i / 10,
		0
	], [
		X1,
		i / 10,
		0
	], {
		color: c.map((v) => v * (i % 5 ? .14 : .34)),
		width: i % 5 ? 1 : 1.4
	});
}
function axisLabelsLit(L, cam) {
	for (let d = 0; d <= 2; d++) {
		const q = toDesign([
			d * XS,
			0,
			0
		], cam);
		hudText(L, `10${sup(d)}`, q[0], q[1] + 30, { size: 18 });
	}
	const q = toDesign([
		14.6,
		0,
		0
	], cam);
	formula(L, "x", q[0] + 24, q[1] + 30, { size: 24 });
}
/**
* Remake: the limit's graph in light: f(x) = L + A sin x ⁄ x on a logarithmic scale, in me's colour. Your line has been
* there all along (dim, as in the flight); on "you" it lights from the left as the asymptote: y = L is you.
*/
function asymptoteLit(ctx, K, lit) {
	const e = ease.inOutSine(ctx.p), cam = ortho([
		lerp(7.4, 7.9, e),
		1.35,
		0
	], "front", lerp(7.6, 7.25, e), ctx.aspect), L = ctx.text.overlay;
	gridLit(0, 14.6);
	O.lines.polyline(limCurvePts(0, 14.6, 2400), {
		color: COL.me.map((c) => c * 1.3),
		width: 3
	});
	O.lines.segment([
		-1,
		0,
		0
	], [
		15,
		0,
		0
	], {
		color: COL.white.map((c) => c * .4),
		width: 1.4
	});
	O.lines.segment([
		-1,
		LV,
		0
	], [
		15,
		LV,
		0
	], {
		color: COL.you.map((c) => c * .3),
		width: 1.6
	});
	if (lit > 0) O.lines.segment([
		0,
		LV,
		0
	], [
		lerp(0, 14.6, lit),
		LV,
		0
	], {
		color: COL.you.map((c) => c * 1.6),
		width: 3.4
	});
	render(ctx, cam);
	axisLabelsLit(L, cam);
	if (lit > .5) youLabel(L, toDesign([
		10.4,
		LV,
		0
	], cam), "you   y = L", {
		dx: 40,
		dy: -58,
		draw: seg(lit, .5, 1)
	});
	overlays(ctx, K, { br: "f(x) = L + A sin x ⁄ x, on a logarithmic scale" });
	look(ctx, {
		bloom: .85,
		threshold: 1.05,
		vignette: .5
	});
}
/**
* Remake: LIMITATIONS in light, on the same graph: the word is pressed onto your line (the punch of the cut, from the
* glide before it), and the ε-band closes on the line and never reaches zero.
*/
function limitLit(ctx, K, lt, eps) {
	const cam = ortho([
		7.6,
		1.3,
		0
	], "front", 7.1, ctx.aspect), L = ctx.text.overlay, S = ctx.text.scene;
	const WS = {
		font: MONO,
		size: 66,
		weight: 700,
		tracking: 9
	}, half = (L.measure("LIMITATIONS", WS) / 2 + 22) / (1080 / 7.1);
	const wx = [10.6 - half, 10.6 + half];
	const split = (y, o) => {
		O.lines.segment([
			-1,
			y,
			0
		], [
			wx[0],
			y,
			0
		], o);
		O.lines.segment([
			wx[1],
			y,
			0
		], [
			15,
			y,
			0
		], o);
	};
	gridLit(0, 14.8);
	O.lines.polyline(limCurvePts(0, wx[0], 2e3), {
		color: COL.me.map((c) => c * 1.3),
		width: 3
	});
	O.lines.polyline(limCurvePts(wx[1], 14.8, 400), {
		color: COL.me.map((c) => c * 1.3),
		width: 3
	});
	O.lines.segment([
		-1,
		0,
		0
	], [
		15,
		0,
		0
	], {
		color: COL.white.map((c) => c * .4),
		width: 1.4
	});
	split(LV, {
		color: COL.you.map((c) => c * 1.6),
		width: 3.4
	});
	for (const s of [1, -1]) split(LV + s * eps, {
		color: COL.you.map((c) => c * .45),
		width: 1.4
	});
	render(ctx, cam);
	const a = toDesign([
		wx[0],
		LV,
		0
	], cam), b = toDesign([
		wx[1],
		LV,
		0
	], cam), stamp = ease.outBack(seg(lt, 0, .1), 2);
	S.text("LIMITATIONS", (a[0] + b[0]) / 2, a[1] + 3, {
		...WS,
		color: HEX.you,
		glow: 14,
		glowColor: HEX.you,
		scale: 1.1 - .1 * stamp,
		alpha: clamp(lt / .03)
	});
	axisLabelsLit(L, cam);
	const wl = L.measure("lim", {
		font: MONO,
		size: 40,
		weight: 500
	});
	formula(L, "lim", 150, 178, {
		size: 40,
		align: "left"
	});
	formula(L, "x→∞", 150 + wl / 2, 214, { size: 18 });
	formula(L, "f(x) = L", 150 + wl + 20, 178, {
		size: 40,
		align: "left"
	});
	readout(L, 150, 262, [["ε", eps.toFixed(3)]], {
		keyW: 36,
		accent: HEX.you
	});
	overlays(ctx, K, { br: "Def. ε–N  for every ε > 0 there is an N with |f(x) − L| < ε for all x > N" });
	look(ctx, {
		bloom: .85,
		threshold: 1.05,
		vignette: .5
	});
}
/** Semi-log graph paper in the pale grid ink: a cycle per decade (1…9), and fine rules every 0.1 in y. */
function graphPaper(X0, X1) {
	for (let d = 0; d < 6; d++) for (let m = 1; m <= 9; m++) {
		const X = XS * (d + Math.log10(m));
		if (X < X0 || X > X1) continue;
		O.ink.segment([
			X,
			-.55,
			0
		], [
			X,
			3.55,
			0
		], {
			ink: BLU,
			width: m === 1 ? 1.6 : 1,
			density: m === 1 ? .5 : .28
		});
	}
	for (let i = -5; i <= 35; i++) O.ink.segment([
		X0,
		i / 10,
		0
	], [
		X1,
		i / 10,
		0
	], {
		ink: BLU,
		width: i % 5 ? .9 : 1.5,
		density: i % 5 ? .2 : .44
	});
}
function axisLabels(L, cam) {
	for (let d = 0; d <= 2; d++) {
		const q = toDesign([
			d * XS,
			0,
			0
		], cam);
		type(L, `10${sup(d)}`, q[0], q[1] + 30, { size: 22 });
	}
	const q = toDesign([
		14.6,
		0,
		0
	], cam);
	label(L, "x", q[0] + 24, q[1] + 30);
}
/** The engineering title block: counts of the object, the projection symbol, scale, and a units field. */
function titleBlock(L, x, y, t, pen = null) {
	const w = 624, h = 76;
	L.draw((g) => {
		if (pen) g.globalAlpha *= pen.alpha;
		g.strokeStyle = pen ? pen.line : INK.K;
		g.lineWidth = 1.5;
		g.strokeRect(x, y, w, h);
		g.lineWidth = 1;
		g.beginPath();
		g.moveTo(x, y + h / 2);
		g.lineTo(x + w, y + h / 2);
		for (const cx of [
			250,
			372,
			494
		]) {
			g.moveTo(x + cx, y + h / 2);
			g.lineTo(x + cx, y + h);
		}
		g.moveTo(x + 494, y);
		g.lineTo(x + 494, y + h / 2);
		g.stroke();
		const sx = x + 515, sy = y + 19;
		g.beginPath();
		g.moveTo(sx, sy - 9);
		g.lineTo(sx + 26, sy - 14);
		g.lineTo(sx + 26, sy + 14);
		g.lineTo(sx, sy + 9);
		g.closePath();
		g.stroke();
		g.beginPath();
		g.arc(sx + 58, sy, 14, 0, TAU);
		g.stroke();
		g.beginPath();
		g.arc(sx + 58, sy, 8, 0, TAU);
		g.stroke();
	});
	const s = (str, xx, yy, o = {}) => (pen ? pen.text : type)(L, str, x + xx, y + yy, {
		size: 15,
		align: "left",
		...o
	});
	s("TESSERACT  {4, 3, 3}", 12, 20, {
		weight: 700,
		size: 17,
		tracking: 1.5
	});
	s("8 cells · 24 faces · 32 edges · 16 vertices", 236, 20, {
		italic: true,
		size: 15
	});
	s("SCALE  1 : 1", 12, 58, {
		weight: 600,
		tracking: 1
	});
	s("DRAWN  me", 262, 58, {
		weight: 600,
		tracking: 1
	});
	s("SHEET 1/1", 384, 58, {
		weight: 600,
		tracking: 1
	});
	s("UNITS", 503, 58, {
		weight: 600,
		size: 14,
		tracking: 1
	});
	s("d_model", 553, 58, {
		weight: 500,
		size: 14,
		font: "JetBrains Mono"
	});
}
/** General notes, as an engineering sheet carries them (all true of the object drawn). */
function sheetNotes(L, x, y, first = "1.  Projection ℝ⁴ → ℝ³:  p′ = 2p ⁄ (3 − w).", pen = null, rest = ["2.  The cell w = −1 in blue; the eight edges along w in red.", "3.  All 32 edges of equal length (2)."]) {
	const T = pen ? pen.text : type;
	T(L, "NOTES", x, y, {
		size: 15,
		weight: 700,
		tracking: 2,
		align: "left"
	});
	[first, ...rest].forEach((s, i) => T(L, s, x, y + 28 + i * 24, {
		size: 16,
		italic: true,
		align: "left",
		color: INK.soft
	}));
}
/**
* CIRCUMFERENCE set on the ground line from x = 0 to 2π (a, b: those points in design space), scaled up from a line.
* o.fill, o.glow: the word in light (no outline; glow in design px) instead of the published cut's inked letters;
* o.font: its face (the book face by default).
*/
function circumWord(L, a, b, sy, o = {}) {
	const word = "CIRCUMFERENCE", size = 150, span = b[0] - a[0];
	L.draw((g, px) => {
		g.font = `700 ${size}px "${o.font ?? "STIX Two Text"}"`;
		g.textBaseline = "alphabetic";
		g.textAlign = "left";
		const raw = g.measureText(word).width, sp = (span - raw) / 12;
		g.translate(a[0], a[1] - 6);
		g.scale(1, sy);
		if (o.glow) {
			g.shadowColor = o.fill;
			g.shadowBlur = o.glow * px;
		}
		let x = 0;
		for (const ch of word) {
			g.fillStyle = o.fill ?? INK.yellow;
			g.fillText(ch, x, 0);
			if (!o.glow) {
				g.lineWidth = 1.6 / Math.max(sy, .2);
				g.strokeStyle = INK.K;
				g.strokeText(ch, x, 0);
			}
			x += g.measureText(ch).width + sp;
		}
	});
}
/** TANGENTS along you's tangent: each letter slides out from the point of contact to its place, baseline on the line. */
function tangentWord(S, cam, P, pr, beside = false) {
	if (pr < 0) return;
	const word = "TANGENTS", size = 64, tr = 10, st = {
		size,
		font: "JetBrains Mono",
		weight: 700
	};
	const [a, b] = tangent(P[0], 1), A = toDesign(a, cam), B = toDesign(b, cam), p = toDesign(P, cam);
	const ang = Math.atan2(B[1] - A[1], B[0] - A[0]), ux = Math.cos(ang), uy = Math.sin(ang), nx = uy, ny = -ux;
	const adv = S.measure("M", st) + tr, total = adv * 8 - tr, start = beside ? -total - 64 : -total * .55;
	[...word].forEach((ch, i) => {
		const k = ease.outExpo(seg(pr, i * .012, i * .012 + .22)), s = lerp(0, start + adv * (i + .5), k), lift = size * .42;
		S.text(ch, p[0] + ux * s + nx * lift, p[1] + uy * s + ny * lift, {
			...st,
			color: HEX.you,
			alpha: clamp(pr / .03),
			rot: ang,
			glow: 10,
			glowColor: HEX.you
		});
	});
}
//#endregion
