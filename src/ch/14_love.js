import { chapter } from "../engine/timeline.js?v=vYBbdLfo";
import { TAU, clamp, ease, lerp, mix3, seg } from "../engine/math.js?v=BJIlRm7-";
import { COL, HEX } from "../theme.js?v=Bj33PIbo";
import { remade } from "../lib/published.js?v=aV_CU5HV";
import { MathUtils, Object3D, OrthographicCamera, Scene, Vector3 } from "../../vendor/three/build/three.core.js?v=q9f7JKE-";
import { makeRT } from "../engine/gpu.js?v=o4BYX3o1";
import { Swarm } from "../engine/swarm.js?v=DTFpJa7B";
import { GlowLines } from "../engine/lines.js?v=B_AAaaTO";
import { rig } from "../engine/rig.js?v=39-joEtk";
import { consoleLog, heroWord, newCamera } from "../lib/look.js?v=BfOqFF7i";
import { gridPlane } from "../lib/env.js?v=CIN_DqPv";
import { callout, crosshair, dimLine, frame, readout, toDesign, viewportFrame } from "../lib/hud.js?v=BgmSZjmG";
import { GlyphField, codeBlock, codeFill, source } from "../lib/glyphs.js?v=DWbHICXG";
import { capture, view } from "../lib/modes.js?v=Cu3GYO-2";
import { assistant, promptBox, toolCall } from "../lib/claude.js?v=DXDs_lIL";
import { shapes } from "../engine/shapes.js?v=BFh0PgdI";
import { FOURIER, PI, alongLoop, cardioidRevShape, cumLen, exitAlong, fourierChain, heart2, heartCurveShape, heartFacts, heartLoop, notebook, polarRoot, pressedShape, segmentCrosses, taubin, taubinDist, taubinNormal, taubinVolume } from "./love/curves.js?v=Ny6Hciv0";
import { glassMaterial, setGlass } from "./love/glass.js?v=Bh51RBHX";
import { fieldHeight, fieldMesh } from "./love/field.js?v=8szC0nqc";
import { drawLoss, drawTokens, exchange, wordMask } from "./love/ui.js?v=CqlQBlzl";
import { backdrop, terminal } from "./love/backdrop.js?v=D4RftAfW";
import { VEN, earth, geo, inFrame, loopsBy, rayExit, rosePts, venus, venusCell } from "./love/venus.js?v=CaQ4DhKD";
//#region src/ch/14_love.js
var WG = [
	1,
	.9,
	.74
];
var GOLD = COL.gold;
var ROSE = COL.rose;
var ME = COL.me;
var YOU = COL.you;
var COOL = [
	.72,
	.85,
	1
];
var HX = {
	wg: "#fff0d8",
	gold: HEX.gold,
	rose: HEX.rose,
	dim: HEX.dim,
	white: HEX.white,
	me: HEX.me,
	you: HEX.you,
	ink: "#1c1a1d"
};
var PAL = [
	[
		.8,
		.68,
		.64
	],
	[
		.3,
		.22,
		.25
	],
	[
		1,
		.62,
		.46
	],
	[
		1,
		.8,
		.46
	],
	[
		1,
		.5,
		.64
	],
	[
		.55,
		.44,
		.48
	]
];
var scl = (c, k) => c.map((v) => v * k);
var norm = (v) => {
	const l = Math.hypot(...v) || 1;
	return v.map((x) => x / l);
};
var add = (a, b, k = 1) => a.map((v, i) => v + b[i] * k);
var dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
var Y0 = [
	.28,
	.3,
	0
];
var M0 = [
	-.34,
	.1,
	.04
];
var YDIR = norm([
	1,
	.28,
	.3
]);
var R_ME = .075;
var R_YOU = .055;
var EQ = "(x² + y² − 1)³ − x²y³ = 0";
var TAUBIN_EQ = "(x² + 9/4·z² + y² − 1)³ − x²y³ − 9/80·z²y³ = 0";
var O = null;
var KC = null;
var M = null;
var NB = null;
function mathInit() {
	const loop = heartLoop(720), facts = heartFacts(loop), cum = cumLen(loop), loopFine = heartLoop(2880), loopCoarse = heartLoop(240);
	const sExit = exitAlong(Y0, YDIR), exit = add(Y0, YDIR, sExit), nExit = taubinNormal(exit);
	const pressC = add(exit, nExit, -.087);
	const cells = notebook(loop), cumL = cumLen(loop);
	const spokes = Array.from({ length: 24 }, (_, k) => {
		const i = k * 30;
		return {
			p: [
				loop[i][0],
				loop[i][1],
				0
			],
			u: cumL[i] / cumL[cumL.length - 1]
		};
	});
	for (const c of cells) {
		const k = Math.max(1, Math.round(c.pts.length / (c.epi ? 480 : 240)));
		c.ptsD = c.pts.filter((p, i) => i % k === 0 || i === c.pts.length - 1);
	}
	const venusC = venusCell();
	venusC.ptsD = venusC.pts;
	return {
		loop,
		loopFine,
		loopCoarse,
		cum,
		facts,
		cells,
		cellsR: cells.map((c, i) => i === 2 ? venusC : c),
		spokes,
		sExit,
		exit,
		nExit,
		pressC,
		vol: taubinVolume(56)
	};
}
function keys(T) {
	if (KC?.T === T) return KC;
	const s0 = T.section("love").start, b0 = Math.round(T.beatAt(s0)), end = T.section("outro").start;
	const B = (k) => T.beatTime(b0 + k), six = (T.beatTime(b0 + 1) - T.beatTime(b0)) / 4;
	const LOVE = T.findLines("LO-O-OVE").map((l) => l.start).filter((x) => x >= s0 - .1 && x < end + .5);
	const l117 = T.findLine("studied how to properly"), l116 = T.line(l117.i - 1);
	const q1 = T.findLine("Question me", 0), q2 = T.findLine("Question me", 1);
	const la = T.findLine("algebraic"), l124 = T.line(la.i + 2);
	return KC = {
		T,
		s0,
		B,
		end,
		six,
		LOVE,
		l116,
		l117,
		q1,
		q2,
		la,
		l124,
		l125: T.line(la.i + 3),
		l126: T.line(la.i + 4),
		cellT0: (i) => l117.start - .3 + i * .012,
		pen0: la.start + .1,
		pen1: LOVE[2] - .25,
		yGo: LOVE[2] + .3,
		tX: l124.start + .3
	};
}
function persp(pos, look, { fov = 36, aspect = 16 / 9, roll = 0 } = {}) {
	const c = O.persp;
	c.fov = fov;
	c.aspect = aspect;
	c.near = .01;
	c.far = 400;
	c.position.set(...pos);
	c.up.set(Math.sin(roll), Math.cos(roll), 0);
	c.lookAt(...look);
	c.updateProjectionMatrix();
	c.updateMatrixWorld();
	return rig.cam(c, { look });
}
function orthoWin(l, r, t, b, { inset = false } = {}) {
	const c = O.ortho;
	Object.assign(c, {
		left: l,
		right: r,
		top: t,
		bottom: b,
		near: .01,
		far: 100,
		zoom: 1
	});
	c.position.set(0, 0, 30);
	c.up.set(0, 1, 0);
	c.lookAt(0, 0, 0);
	c.updateProjectionMatrix();
	c.updateMatrixWorld();
	return rig.cam(c, {
		look: [
			0,
			0,
			0
		],
		inset
	});
}
function orthoFront(center, height, aspect) {
	const w = height * aspect;
	return orthoWin(center[0] - w / 2, center[0] + w / 2, center[1] + height / 2, center[1] - height / 2);
}
/** Spherical orbit around a target (az about y, el above the horizon). */
function orbitPos(target, r, az, el) {
	return [
		target[0] + r * Math.cos(el) * Math.sin(az),
		target[1] + r * Math.sin(el),
		target[2] + r * Math.cos(el) * Math.cos(az)
	];
}
/** Design pixels per world unit at point p. */
function pxPerUnit(cam, p) {
	if (cam.isOrthographicCamera) return 1080 / (cam.top - cam.bottom);
	return 540 / Math.tan(MathUtils.degToRad(cam.fov) / 2) / Math.max(.02, dist(cam.position.toArray(), p));
}
function hideAll() {
	for (const ob of O.all) ob.visible = false;
}
function show(...obs) {
	for (const ob of obs) ob.visible = true;
}
function ensureRT(ctx) {
	if (O.rtV === ctx.sizeVersion) return;
	O.rtBg?.dispose();
	O.rtIn?.dispose();
	O.rtBg = makeRT(ctx.W, ctx.H);
	O.rtIn = makeRT(ctx.W, ctx.H);
	O.rtV = ctx.sizeVersion;
}
function renderInto(ctx, rt, cam, obs) {
	const r = ctx.renderer;
	hideAll();
	show(...obs);
	r.setRenderTarget(rt);
	r.setClearColor(0, 1);
	r.clear(true, true, true);
	r.render(O.scene, cam);
	r.setRenderTarget(ctx.target);
}
function renderDirect(ctx, cam, obs) {
	hideAll();
	show(...obs);
	ctx.draw(O.scene, cam);
}
function stars(ctx, cam, bright = .4, hPx = ctx.H) {
	O.stars.set({
		a: O.tex.stars,
		size: .09,
		bright,
		sparkle: .5,
		t: ctx.t,
		minPx: 1.1
	}, cam, hPx);
	return O.stars.points;
}
function floor(y = -1.45, intensity = .35, o = {}) {
	O.floor.position.set(0, y, 0);
	O.floor.userData.set({
		intensity,
		fade: o.fade ?? .09,
		reveal: 1,
		revealR: 60
	});
	return O.floor;
}
/**
* A soft dark field under the console, for shots with code or glass behind it (the log stays readable): an ellipse
* feathered on every side, so it reads as shade, not as a box.
*/
function consoleBacking(L, a = .78) {
	L.draw((g) => {
		g.translate(430, 892);
		g.scale(1, .3);
		const gr = g.createRadialGradient(0, 0, 0, 0, 0, 780);
		gr.addColorStop(0, `rgba(0,0,0,${a})`);
		gr.addColorStop(.55, `rgba(0,0,0,${a * .88})`);
		gr.addColorStop(1, "rgba(0,0,0,0)");
		g.fillStyle = gr;
		g.fillRect(-780, -780, 1560, 1560);
	});
}
function overlays(ctx, K, br, o = {}) {
	if (o.backing) consoleBacking(ctx.text.overlay, o.backing);
	frame(ctx.text.overlay, ctx.t, ctx.T, {
		label: "solve",
		bottomRight: br
	});
	consoleLog(ctx.text.overlay, ctx.T, ctx.t, {
		from: K.s0 - .2,
		accent: HX.gold
	});
}
function look(ctx, o = {}) {
	Object.assign(ctx.post, {
		bloom: 1.05,
		threshold: .95,
		ca: .25,
		vignette: .42,
		grain: .03,
		exposure: 1,
		tint: [
			1.02,
			.985,
			.97
		],
		...o
	});
}
var fmt = (v, d = 4) => (Math.abs(v) < .5 * 10 ** -d ? 0 : v).toFixed(d).replace("-", "−");
function density(ppu, R, N, rho) {
	const r = R * ppu;
	return clamp(rho * PI * r * r / N, .0035, 1);
}
function drawMe(ctx, cam, p, o = {}, hPx = ctx.H) {
	const me = O.me, sc = o.scale ?? 1, R = (o.press ?? 0) > .5 ? .2 : R_ME * sc, ppu = pxPerUnit(cam, p);
	me.points.position.set(...p);
	me.points.scale.setScalar(sc);
	me.points.rotation.set(0, (o.press ?? 0) > 0 ? 0 : ctx.t * .3, 0);
	me.set({
		a: O.tex.meBall,
		b: O.tex.mePressed,
		morph: o.press ?? 0,
		spread: .35,
		arc: .02,
		t: ctx.t,
		reveal: o.reveal ?? density(ppu, R, me.N, o.rho ?? .5),
		size: o.size ?? Math.min(.006, (o.px ?? 2.4) / ppu / sc),
		bright: o.bright ?? .42,
		colA: ME,
		colB: ME,
		sparkle: .5,
		noise: o.noise ?? .005,
		noiseFreq: 14,
		noiseSpeed: .3,
		focus: o.focus ?? 5,
		aperture: o.aperture ?? 0,
		maxBlur: o.maxBlur ?? 40,
		minPx: o.minPx ?? 1.3
	}, cam, hPx);
	return me.points;
}
function drawYou(ctx, cam, p, o = {}, hPx = ctx.H) {
	const you = O.you, sc = o.scale ?? 1, ppu = pxPerUnit(cam, p);
	you.points.position.set(...p);
	you.points.scale.setScalar(sc);
	you.points.rotation.set(0, -ctx.t * .35, 0);
	you.set({
		a: O.tex.youBall,
		t: ctx.t,
		reveal: o.reveal ?? density(ppu, R_YOU * sc, you.N, o.rho ?? .5),
		size: o.size ?? Math.min(.0065, (o.px ?? 2.4) / ppu / sc),
		bright: o.bright ?? .5,
		colA: YOU,
		colB: ROSE,
		morph: 0,
		sparkle: .5,
		noise: o.noise ?? .006,
		noiseFreq: 16,
		noiseSpeed: .35,
		focus: o.focus ?? 5,
		aperture: o.aperture ?? 0,
		maxBlur: o.maxBlur ?? 40,
		minPx: o.minPx ?? 1.3
	}, cam, hPx);
	return you.points;
}
/** A soft halo for a swarm seen from far away (so it still reads as a dot). */
function halo(p, col, k = 1, w = 26) {
	O.lines.segment(p, p, {
		color: scl(col, .32 * k),
		width: w
	});
}
/** Place a glyph field `d` behind `center` along the view direction, parallel to the image plane. */
function faceCamera(g, cam, center, d) {
	const f = new Vector3(0, 0, -1).applyQuaternion(cam.quaternion);
	g.points.position.set(center[0] + f.x * d, center[1] + f.y * d, center[2] + f.z * d);
	g.points.quaternion.copy(cam.quaternion);
	g.points.scale.setScalar(1);
	g.points.updateMatrixWorld();
	return cam.position.distanceTo(g.points.position);
}
/** The code wall: this chapter's heart mathematics (love/curves.js) as a page of text behind the subject, scrolling. */
function codeWall(ctx, cam, center, o = {}) {
	const g = O.gfWall, d = faceCamera(g, cam, center, o.d ?? 3.2);
	g.set({
		a: O.tex.wall,
		t: ctx.t,
		size: o.size ?? .085,
		minPx: 2,
		bright: o.bright ?? .3,
		palette: PAL,
		flicker: .05,
		scroll: [
			0,
			(ctx.t - (o.t0 ?? 177.5)) * .11,
			0
		],
		focus: o.focus ?? d,
		aperture: o.aperture ?? 0,
		maxBlur: 18
	}, cam, ctx.H);
	return g.points;
}
/** A word made of large glyphs behind the subject (typed from t0), e.g. seen through the glass. */
function glyphWord(ctx, cam, center, t0, o = {}) {
	const g = O.gfWord;
	faceCamera(g, cam, center, o.d ?? 1.5);
	g.set({
		a: O.tex.word,
		t: ctx.t,
		size: o.size ?? .62,
		minPx: 2,
		bright: o.bright ?? 1.25,
		palette: o.color ?? [
			1,
			.84,
			.8
		],
		reveal: seg(ctx.t, t0, t0 + .5) * 1.001,
		soft: .12
	}, cam, ctx.H);
	return g.points;
}
/** A word drawn with lines of code (a calligram) on the flat overlay plane; cx, cy: centre in design px. */
function calligram(ctx, t0, cx, cy, o = {}) {
	const g = O.gfCal;
	g.points.position.set((cx - 960) / 100, (540 - cy) / 100, 0);
	g.points.quaternion.identity();
	g.points.scale.setScalar(1);
	g.points.updateMatrixWorld();
	g.set({
		a: O.tex.cal,
		t: ctx.t,
		size: .116,
		minPx: 2,
		bright: o.bright ?? 1.15,
		palette: o.palette ?? [
			[
				1,
				.86,
				.8
			],
			[
				.66,
				.44,
				.48
			],
			[
				1,
				.6,
				.5
			],
			[
				1,
				.82,
				.5
			],
			[
				1,
				.55,
				.7
			],
			[
				.8,
				.6,
				.64
			]
		],
		reveal: ease.outCubic(seg(ctx.t, t0, t0 + .6)) * 1.001,
		soft: .05,
		flicker: .08
	}, O.flat, ctx.H);
	renderDirect(ctx, O.flat, [g.points]);
}
var DOT_ME = [
	-.75,
	0,
	0
];
var DOT_YOU = [
	.75,
	0,
	0
];
var G6 = 6;
var CW = 632;
var CH = 352;
var LABEL_TOP = 30;
var LABEL_BOT = 56;
var cellRect = (i) => [
	G6 + i % 3 * 638,
	G6 + Math.floor(i / 3) * 358,
	CW,
	CH
];
var zS = (z) => Math.min(z, 1.6);
var zoomRect = (r, z, c = [960, 540]) => [
	c[0] + (r[0] - c[0]) * z,
	c[1] + (r[1] - c[1]) * z,
	r[2] * z,
	r[3] * z
];
function clipRect(r) {
	const x0 = Math.max(0, r[0]), y0 = Math.max(0, r[1]), x1 = Math.min(1920, r[0] + r[2]), y1 = Math.min(1080, r[1] + r[3]);
	return x1 - x0 > 2 && y1 - y0 > 2 ? [
		x0,
		y0,
		x1 - x0,
		y1 - y0
	] : null;
}
/** World window of cell i: the curve's box fitted into the area between the label strips. */
function cellWindow(i) {
	const [x0, y0, x1, y1] = NB[i].box, bw = x1 - x0, bh = y1 - y0;
	const top = i === 6 ? 64 : LABEL_TOP, bot = i === 6 ? 192 : LABEL_BOT;
	const k = Math.min(572 / bw, (CH - top - bot - 18) / bh);
	const cyPx = top + (CH - top - bot) / 2;
	return {
		k,
		cx: (x0 + x1) / 2,
		cy: (y0 + y1) / 2 + (cyPx - CH / 2) / k,
		W: CW / k,
		H: CH / k
	};
}
function notebookState(t, K, remake = false) {
	const L0 = K.LOVE[0];
	return (remake ? M.cellsR : M.cells).map((c, i) => {
		const t0 = remake ? K.s0 - .05 + i * .012 : K.cellT0(i), t1 = K.cellT0(i) + .95 + .06 * i;
		const draw = !!c.epi ? ease.linear(seg(t, t0, L0 - .02)) : ease.inOutSine(seg(t, t0, t1));
		const dc = Math.hypot(i % 3 - 1, Math.floor(i / 3) - 1), w0 = L0 + dc * .055;
		return {
			draw,
			t0,
			warm: ease.outCubic(seg(t, w0, w0 + .3)),
			fill: ease.outCubic(seg(t, w0 + .05, w0 + .75)),
			typed: seg(t, t0, t0 + .45)
		};
	});
}
/** Lines of one cell, in its own curve units. */
function drawCell(i, st, o = {}) {
	const c = NB[i], L = O.lines, w = st.warm;
	const col = mix3(scl(COOL, 1.2), scl(GOLD, 1.1), w), tipC = scl(WG, 2.2), lw = o.lw ?? 2.8;
	if (c.chords) {
		L.polyline(c.pts, {
			color: scl(mix3(COOL, WG, w), .45),
			width: 1.5
		});
		const n = Math.floor(st.draw * c.chords.length);
		for (let k = 0; k < n; k++) L.segment(c.chords[k][0], c.chords[k][1], {
			color: scl(mix3(COOL, ROSE, w), .2 + .1 * w),
			width: 1.1
		});
		if (n > 0 && n < c.chords.length) {
			const [a, b] = c.chords[n - 1];
			L.segment(a, b, {
				color: scl(WG, .9),
				width: 1.8
			});
			L.segment(b, b, {
				color: tipC,
				width: 12
			});
		}
		if (st.fill > 0) L.polyline(c.env, {
			color: scl(GOLD, 1.1),
			width: 2.8,
			draw: st.fill
		});
		return;
	}
	if (st.fill > 0) for (const s of [
		.8,
		.6,
		.4,
		.2
	]) {
		const k = seg(st.fill, (1 - s) * .6, (1 - s) * .6 + .4);
		if (k <= 0) continue;
		L.polyline(c.ptsD.map((p) => [
			c.c[0] + (p[0] - c.c[0]) * s,
			c.c[1] + (p[1] - c.c[1]) * s,
			0
		]), {
			color: scl(ROSE, .45 * s + .08),
			width: 1.5,
			draw: k
		});
	}
	for (const e of c.extra ?? []) L.polyline(e, {
		color: scl(col, .8),
		width: lw * .8,
		draw: st.draw
	});
	L.polyline(c.ptsD, {
		color: col,
		width: lw,
		draw: st.draw
	});
	const tip = alongLoop(c.pts, st.draw, c.cum).p;
	if (c.epi && st.draw > 0 && st.draw < 1) {
		const chain = fourierChain(st.draw * TAU);
		for (let k = 0; k < FOURIER.length; k++) {
			const [cx, cy] = chain[k], r = Math.hypot(FOURIER[k][1], FOURIER[k][2]), ring = [], nseg = r > 5 ? 64 : r > 2 ? 32 : 18;
			for (let j = 0; j <= nseg; j++) {
				const a = j / nseg * TAU;
				ring.push([
					cx + r * Math.cos(a),
					cy + r * Math.sin(a),
					0
				]);
			}
			L.polyline(ring, {
				color: scl(WG, .3),
				width: 1.3
			});
			L.segment(chain[k], chain[k + 1], {
				color: scl(WG, .8),
				width: 1.7
			});
			L.segment(chain[k + 1], chain[k + 1], {
				color: scl(WG, .8),
				width: 5
			});
		}
	}
	if (st.draw > 0 && st.draw < 1) L.segment(tip, tip, {
		color: tipC,
		width: 12
	});
}
function cellParam(i, st) {
	const c = NB[i], v = lerp(c.range[0], c.range[1], st.draw);
	return c.par === "k" ? `k = ${Math.floor(st.draw * c.chords.length)}` : `${c.par} = ${v.toFixed(3)}`;
}
/** The notebook at zoom z about the frame centre (z = 1: the whole 3×3). */
function drawNotebook(ctx, K, t, { z = 1, formulas = 1 } = {}) {
	const S = notebookState(t, K, remade(ctx)), Lo = ctx.text.overlay;
	NB = remade(ctx) ? M.cellsR : M.cells;
	for (let i = 0; i < 9; i++) {
		const R = zoomRect(cellRect(i), z), C = clipRect(R);
		if (!C) continue;
		const win = cellWindow(i), st = S[i];
		backdrop(ctx, R, {
			top: mix3([
				.0105,
				.0135,
				.025
			], [
				.026,
				.0115,
				.0135
			], st.warm),
			bottom: mix3([
				.0045,
				.0055,
				.011
			], [
				.0105,
				.0045,
				.006
			], st.warm),
			radius: 6 * zS(z)
		});
		const l = win.cx - win.W / 2 + (C[0] - R[0]) / R[2] * win.W, r = l + C[2] / R[2] * win.W;
		const tp = win.cy + win.H / 2 - (C[1] - R[1]) / R[3] * win.H, bt = tp - C[3] / R[3] * win.H;
		ctx.viewport(C, (wp, hp) => {
			const cam = orthoWin(l, r, tp, bt, { inset: true }), u = O.wall.material.uniforms, c = NB[i];
			O.wall.position.set(0, 0, -1);
			u.uMinor.value = c.step;
			u.uMajor.value = c.step * 4;
			u.uCol.value.setRGB(...mix3([
				.1,
				.28,
				.7
			], [
				.42,
				.22,
				.14
			], st.warm));
			u.uAxisCol.value.setRGB(...mix3([
				.1,
				.2,
				.42
			], [
				.34,
				.22,
				.15
			], st.warm));
			O.wall.userData.set({
				intensity: .085 + .04 * st.warm,
				fade: 0,
				reveal: 1
			});
			O.lines.begin();
			drawCell(i, st, { lw: 2.8 + .3 * (z - 1) });
			O.lines.end(ctx).res(wp, hp);
			renderDirect(ctx, cam, [O.wall, O.lines.mesh]);
		});
		viewportFrame(Lo, R, null, { alpha: .45 });
		const s = Math.min(z, 1.6), a = st.typed, c = NB[i];
		const lab = (str, x, y, o) => {
			if (x > -400 && x < 2300 && y > 20 && y < 1060) Lo.text(str, x, y, {
				font: "JetBrains Mono",
				align: "left",
				...o
			});
		};
		lab(`${String(i + 1).padStart(2, "0")}  ${c.name}`, R[0] + 14 * s, R[1] + 18 * s, {
			size: 14 * s,
			weight: 600,
			color: st.warm > .5 ? HX.gold : HX.me,
			alpha: .8
		});
		const pv = cellParam(i, st);
		lab(pv, R[0] + R[2] - 14 * s - Lo.measure(pv, { size: 14 * s }), R[1] + 18 * s, {
			size: 14 * s,
			weight: 500,
			color: HX.dim,
			alpha: .9 * a
		});
		const fy = i === 6 ? R[1] + 46 * s : R[1] + R[3] - (c.f.length === 2 ? 40 : 22) * s;
		c.f.forEach((line, j) => {
			const n = Math.ceil(line.length * clamp(a * 1.25 - j * .25));
			lab(line.slice(0, n), R[0] + 14 * s, fy + j * 20 * s, {
				size: 15.5 * s,
				weight: 500,
				color: st.warm > .5 ? HX.wg : HX.white,
				alpha: formulas < 1 ? .88 * formulas : .88
			});
		});
	}
}
/**
* (The remake, EDIT.md love) notebook ~ nbZoom as one shot: the whole page from the first beat, then one slow push into
* the middle cell (the Fourier heart) from 4.5 beats, arriving at nbZoom's last framing on the first LOVE; the spectrum
* of the heart comes in as it closes in. nbZoom leaves the edit (a relay could not travel: the page is drawn in 2D).
*/
function notebookR(ctx, K, t) {
	const k = ease.inOutSine(seg(t, K.B(4.5), K.LOVE[0])), z = lerp(1, 2.75, k);
	drawNotebook(ctx, K, t, {
		z,
		formulas: 1 - seg(z, 1.7, 2.3)
	});
	const a = seg(k, .35, .75);
	if (a > 0) {
		const st = notebookState(t, K, true)[4], L = ctx.text.overlay, tt = st.draw * TAU;
		L.draw((g) => {
			g.globalAlpha *= .8 * a;
			const x0 = 1560, bw = 22;
			for (let q = -4; q <= 4; q++) {
				const f = FOURIER.find((p) => p[0] === q), h = (f ? Math.hypot(f[1], f[2]) : 0) / 12.5 * 90;
				g.fillStyle = HX.gold;
				g.fillRect(x0 + (q + 4) * bw, 280 - Math.max(h, 1), 16, Math.max(h, 1));
			}
			g.strokeStyle = HX.dim;
			g.lineWidth = 1;
			g.beginPath();
			g.moveTo(x0, 280.5);
			g.lineTo(1758, 280.5);
			g.stroke();
		});
		L.text("|c_k|   k = −4 … 4", 1560, 305, {
			size: 14,
			align: "left",
			color: HX.dim,
			alpha: a
		});
		readout(L, 1560, 336, [["t", tt.toFixed(3)], ["z(t)", `${fourierChain(tt).at(-1).slice(0, 2).map((v) => v.toFixed(2)).join(", ")}`]], {
			accent: HX.gold,
			keyW: 70,
			alpha: a
		});
	}
	overlays(ctx, K);
	look(ctx, { vignette: lerp(.25, .35, k) });
}
/** A small graph of the heart in a viewport rect (the answer as a figure); you marked when asked. */
function drawGraph(ctx, K, t, rect, { draw = 1, youK = 0, fill = 0 } = {}) {
	const win = {
		cx: 0,
		cy: .12,
		H: 2.75
	}, a = rect[2] / rect[3], W = win.H * a;
	ctx.viewport(rect, (wp, hp) => {
		const cam = orthoWin(-W / 2, W / 2, win.cy + win.H / 2, win.cy - win.H / 2, { inset: true }), u = O.wall.material.uniforms;
		O.wall.position.set(0, 0, -1);
		u.uMinor.value = .125;
		u.uMajor.value = .5;
		u.uCol.value.setRGB(.42, .22, .14);
		u.uAxisCol.value.setRGB(.9, .66, .45);
		O.wall.userData.set({
			intensity: .2,
			fade: 0,
			reveal: 1
		});
		O.lines.begin();
		for (const s of [
			.8,
			.6,
			.4,
			.2
		]) if (fill > 0) O.lines.polyline(M.loopCoarse.map((p) => [
			p[0] * s,
			.1 * (1 - s) + p[1] * s,
			0
		]), {
			color: scl(ROSE, (.45 * s + .08) * fill),
			width: 1.5
		});
		O.lines.polyline(M.loopCoarse, {
			color: scl(GOLD, .9),
			width: 3,
			draw
		});
		if (youK > 0) {
			O.lines.segment(Y0, Y0, {
				color: scl(YOU, 2.2 * youK),
				width: 13
			});
			halo(Y0, YOU, youK, 40);
		}
		O.lines.end(ctx).res(wp, hp);
		renderDirect(ctx, cam, [O.wall, O.lines.mesh]);
	});
	viewportFrame(ctx.text.overlay, rect, "love(x, y) = 0", {
		alpha: .5,
		labelColor: HX.gold
	});
	if (youK > 0) {
		const p = toDesign(Y0, O.ortho, rect);
		crosshair(ctx.text.overlay, p[0], p[1], 26, {
			color: HX.you,
			alpha: .8 * youK,
			label: "you (0.28, 0.30)"
		});
	}
}
/**
* "Question me": the Claude Code terminal. The question is typed in the prompt box as it is sung and sent on "me"; a
* moment of `✻ Pondering…`; then the answer streams in: love's equation, then love evaluated at you. On "answer all"
* a tool call computes every property of the curve at once.
*/
function drawClaude(ctx, K, t, mode) {
	if (remade(ctx) && mode === "ask") return drawAskR(ctx, K, t);
	const L = ctx.text.overlay, X = 150, q1 = K.q1, q2 = K.q2, size = 32;
	const typed = (str, t0, t1) => str.slice(0, Math.ceil(str.length * clamp((t - t0) / Math.max(t1 - t0, .05))));
	const Q1 = "what is love?", Q2 = "and love(you)?";
	const s1 = {
		sent: t - q1.words[1].start,
		think: .16,
		answer: [[
			`love(x, y) = ${EQ}`,
			HX.gold,
			90
		], [
			"its zero set is a heart · degree 6 · singular at (0, ±1)",
			"#8a8f98",
			140
		]]
	};
	const s2 = {
		sent: t - q2.words[1].start,
		think: .12,
		answer: [[
			`love(0.28, 0.30) = ${fmt(heart2(Y0[0], Y0[1]))} < 0`,
			HX.gold,
			90
		], [
			"you are inside it",
			HX.rose,
			60
		]]
	};
	const drift = mode === "ask" ? seg(t, q1.start, q2.start) : mode === "ask2" ? seg(t, q2.start, q2.words[2].start) : seg(t, q2.words[4].start, K.LOVE[1]);
	const y0 = (mode === "all" ? 268 : 300) - 14 * ease.inOutSine(drift);
	terminal(ctx, [
		100,
		150,
		1720,
		652
	], { title: "claude  ·  ~/world-execute-mv" });
	let box = "", boxY = 520;
	if (mode === "ask") {
		if (s1.sent < 0) box = typed(Q1, q1.start, q1.words[0].end);
		else boxY = exchange(L, X, y0, Q1, s1, t, {
			size,
			T: ctx.T
		}) + 40;
		drawGraph(ctx, K, t, [
			1180,
			236,
			590,
			520
		], { draw: ease.outCubic(seg(s1.sent - s1.think, 0, .3)) });
	} else if (mode === "ask2") {
		const y1 = exchange(L, X, y0 - 40, Q1, {
			...s1,
			sent: 9
		}, t, {
			size: size * .8,
			alpha: .45,
			T: ctx.T
		});
		if (s2.sent < 0) {
			box = typed(Q2, q2.start, q2.words[0].end);
			boxY = y1 + 60;
		} else boxY = exchange(L, X, y1 + 36, Q2, s2, t, {
			size,
			T: ctx.T
		}) + 40;
		drawGraph(ctx, K, t, [
			1160,
			224,
			620,
			560
		], {
			youK: ease.outCubic(seg(s2.sent - s2.think, 0, .25)),
			fill: ease.outCubic(seg(s2.sent - s2.think, .05, .5))
		});
	} else {
		const f = M.facts, a3 = t - q2.words[4].start, rows = [
			`area       ∬ dA = ${fmt(f.area)}`,
			`perimeter  ∮ ds = ${fmt(f.per)}`,
			`width      2·max|x| = ${fmt(2 * f.xMax)}`,
			`height     max y − min y = ${fmt(f.yMax + 1)}`,
			`gradient   ∇love = (6x·g² − 2xy³, 6y·g² − 3x²y²)`,
			"singular   (0, 1) · (0, −1)",
			"centre     love(0, 0) = −1",
			`volume     ∭ dV = ${M.vol.toFixed(2)}  (Taubin)`
		];
		toolCall(L, X, y0, "Bash", "node facts.js --love --all", rows, {
			size: 26,
			show: clamp(a3 / .2)
		});
		if (t >= q2.words[5].start) assistant(L, X, y0 + 39 * (rows.length + 1.6), "answered: all", {
			size,
			t,
			t0: q2.words[5].start,
			rate: 60,
			color: HX.rose
		});
		boxY = y0 + 39 * (rows.length + 2.8);
		drawGraph(ctx, K, t, [
			1180,
			236,
			590,
			520
		], {
			fill: 1,
			youK: 1
		});
	}
	promptBox(L, X, Math.max(boxY, 520), 900, {
		size: 28,
		text: box,
		t,
		hint: box ? false : "? for shortcuts"
	});
}
/**
* (The remake, EDIT.md love) ask → ask2 as one page written on, no cut: as the second question starts, the first
* exchange shrinks and dims into the scrollback, the graph settles into its second place, and the second question is
* typed under the first. ask2 leaves the edit.
*/
function drawAskR(ctx, K, t) {
	const L = ctx.text.overlay, X = 150, q1 = K.q1, q2 = K.q2, size = 32;
	const typed = (str, t0, t1) => str.slice(0, Math.ceil(str.length * clamp((t - t0) / Math.max(t1 - t0, .05))));
	const Q1 = "what is love?", Q2 = "and love(you)?";
	const u = ease.inOutSine(seg(t, q2.start - .12, q2.start + .28));
	const s1 = {
		sent: t - q1.words[1].start + .7 * u,
		think: .16,
		answer: [[
			`love(x, y) = ${EQ}`,
			HX.gold,
			90
		], [
			"its zero set is a heart · degree 6 · singular at (0, ±1)",
			"#8a8f98",
			140
		]]
	};
	const s2 = {
		sent: t - q2.words[1].start,
		think: .12,
		answer: [[
			`love(0.28, 0.30) = ${fmt(heart2(Y0[0], Y0[1]))} < 0`,
			HX.gold,
			90
		], [
			"you are inside it",
			HX.rose,
			60
		]]
	};
	const yA = lerp(300 - 14 * ease.inOutSine(seg(t, q1.start, q2.start)), 260 - 14 * ease.inOutSine(seg(t, q2.start, q2.words[2].start)), u);
	terminal(ctx, [
		100,
		150,
		1720,
		652
	], { title: "claude  ·  ~/world-execute-mv" });
	let box = "", boxY = 520;
	if (s1.sent < 0) box = typed(Q1, q1.start, q1.words[0].end);
	else {
		const y1 = exchange(L, X, yA, Q1, s1, t, {
			size: lerp(size, size * .8, u),
			alpha: lerp(1, .45, u),
			T: ctx.T
		});
		if (t < q2.start || s2.sent < 0) {
			if (t >= q2.start) box = typed(Q2, q2.start, q2.words[0].end);
			boxY = y1 + lerp(40, 60, u);
		} else boxY = exchange(L, X, y1 + 36, Q2, s2, t, {
			size,
			T: ctx.T
		}) + 40;
	}
	drawGraph(ctx, K, t, [
		lerp(1180, 1160, u),
		lerp(236, 224, u),
		lerp(590, 620, u),
		lerp(520, 560, u)
	], {
		draw: ease.outCubic(seg(s1.sent - s1.think, 0, .3)),
		youK: ease.outCubic(seg(s2.sent - s2.think, 0, .25)),
		fill: ease.outCubic(seg(s2.sent - s2.think, .05, .5))
	});
	promptBox(L, X, Math.max(boxY, 520), 900, {
		size: 28,
		text: box,
		t,
		hint: box ? false : "? for shortcuts"
	});
}
var ramp = (u, a = .1) => u < a ? u * u / (2 * a * (1 - a)) : u > 1 - a ? 1 - (1 - u) ** 2 / (2 * a * (1 - a)) : (u - a / 2) / (1 - a);
function penState(t, K) {
	const draw = ramp(seg(t, K.pen0, K.pen1));
	const at = alongLoop(M.loop, draw, M.cum), th = Math.atan2(at.p[1], at.p[0]), r = polarRoot(heart2, th, .05, 1.8);
	return {
		draw,
		tip: [
			r * Math.cos(th),
			r * Math.sin(th),
			0
		],
		tan: at.tan,
		th
	};
}
function heartState(t, K) {
	const tL = K.LOVE[2];
	const inflate = ease.inOutCubic(seg(t, tL, tL + .9)), appear = ease.inOutCubic(seg(t, tL + .1, tL + 1.1));
	return {
		inflate,
		appear,
		pulse: K.T.pulse(t, 6) * appear,
		glow: ease.inOutSine(seg(t, K.LOVE[3] - .05, K.LOVE[3] + .5)),
		cage: ease.inOutCubic(seg(t, K.l125.words[2].start - .15, K.l125.words[2].start + .3)),
		dissolve: ease.inQuad(seg(t, K.B(31), K.end + .35))
	};
}
function youState(t, K) {
	const tau = .35, ramp = (d) => d - tau * (1 - Math.exp(-d / tau));
	const s = M.sExit / ramp(K.tX - K.yGo) * ramp(Math.max(0, t - K.yGo)), p = add(Y0, YDIR, s);
	p[1] += .012 * Math.sin(t * 1.9);
	return {
		p,
		s,
		d: taubinDist(p),
		free: s > M.sExit
	};
}
function meState(t, K) {
	const pen = penState(t, K);
	const inK = ease.inOutCubic(seg(t, K.LOVE[2] + .05, K.LOVE[2] + .85));
	const toWall = ease.inOutCubic(seg(t, K.l125.start, K.l126.start + .05));
	const press = ease.outCubic(seg(t, K.l126.start - .02, K.l126.start + .4));
	let p = mix3(pen.tip, M0, inK);
	p = mix3(p, M.pressC, toWall);
	p = add(p, [
		0,
		.01 * Math.sin(t * 1.7),
		0
	], 1 - toWall);
	return {
		p,
		press,
		pen,
		inside: inK > 0,
		scale: lerp(.5, 1, inK)
	};
}
/** The pen's lines: the drawn part of the curve (gold), the polar ray from the origin to the tip and its angle. */
function drawPenLines(st, hs, o = {}) {
	const L = O.lines, pen = st, fade = 1 - (hs?.appear ?? 0);
	if (pen.draw <= 0 || fade <= 0) return;
	const lp = (o.ppu ?? 160) > 700 ? M.loopFine : (o.ppu ?? 160) > 260 ? M.loop : M.loopCoarse;
	const n = Math.max(2, Math.ceil(pen.draw * (lp.length - 1)) + 1);
	const part = lp.slice(0, n).map((p) => [
		p[0],
		p[1],
		0
	]);
	part[part.length - 1] = pen.tip;
	L.polyline(part, {
		color: scl(GOLD, (o.k ?? .62) * fade + .04),
		width: o.width ?? 2.8
	});
	if (o.spokes !== false) for (const sp of M.spokes) {
		if (sp.u > pen.draw) break;
		L.segment([
			0,
			0,
			0
		], sp.p, {
			color: scl(WG, .1 * fade),
			width: 1.2
		});
		L.segment(sp.p, sp.p, {
			color: scl(GOLD, .7 * fade),
			width: 6
		});
	}
	if (o.ray !== false && pen.draw < 1) {
		L.segment([
			0,
			0,
			0
		], pen.tip, {
			color: scl(WG, .22 * fade),
			width: 1.3
		});
		const arc = [], a1 = pen.th < -PI / 2 ? pen.th + TAU : pen.th;
		for (let k = 0; k <= 32; k++) {
			const a = lerp(0, a1, k / 32);
			arc.push([
				.16 * Math.cos(a),
				.16 * Math.sin(a),
				0
			]);
		}
		L.polyline(arc, {
			color: scl(WG, .25 * fade),
			width: 1.2
		});
		L.segment([
			0,
			0,
			0
		], [
			0,
			0,
			0
		], {
			color: scl(WG, .6 * fade),
			width: 7
		});
	}
}
function drawHeartSwarm(ctx, cam, st, hs, o = {}, hPx = ctx.H) {
	const h = O.hs, pre = hs.inflate <= 0, ppu = pxPerUnit(cam, [
		0,
		.1,
		0
	]), vk = st.venus;
	h.points.position.set(0, 0, 0);
	h.points.rotation.set(0, 0, 0);
	h.points.scale.setScalar((1 + .012 * hs.pulse) * (1 + .12 * hs.dissolve));
	h.set({
		a: O.tex.flat,
		b: O.tex.surf,
		morph: hs.inflate,
		spread: .5,
		arc: .08,
		revealBy: pre && vk == null ? "w" : void 0,
		reveal: pre ? vk == null ? st.draw : 1 : lerp(1, o.surf ?? .2, hs.inflate) + (1 - (o.surf ?? .2)) * hs.dissolve,
		size: o.size ?? clamp(1.25 / ppu, .0012, .0075),
		bright: (o.bright ?? lerp(.05, .28, hs.inflate)) * (vk == null ? 1 : vk) * (1 + .15 * hs.pulse) * (1 + .5 * hs.dissolve),
		colA: WG,
		colB: mix3(WG, [
			1,
			.7,
			.72
		], .35),
		t: ctx.t,
		noise: 6e-4 * hs.inflate + .09 * hs.dissolve,
		noiseFreq: lerp(3, 1.2, hs.dissolve),
		noiseSpeed: .25,
		sparkle: .3,
		focus: o.focus ?? 5,
		aperture: o.aperture ?? 0,
		maxBlur: o.maxBlur ?? 50
	}, cam, hPx);
	return h.points;
}
/**
* One frame of the glass heart and what is around it: the outside layer (stars, floor, you once free and behind
* the glass), the inside layer (me, you before it leaves), the glass pass, then what is in front (surface particles,
* lines, you once free and in front). o: glass look overrides, floor, meO/youO/hsO (swarm overrides), lines(fn).
*/
function glassFrame(ctx, cam, K, o = {}) {
	const t = ctx.t, V = K.venus;
	const hs = V ? heartStateV(t, K) : heartState(t, K), ms = V ? meStateV(t, K) : meState(t, K), ys = V ? youStateV(t, K) : youState(t, K), pen = V ? {
		draw: 1,
		venus: foldK(t, K)
	} : penState(t, K);
	ensureRT(ctx);
	const camP = cam.position.toArray(), camIn = taubin(...camP) < 0;
	O.heart.scale.setScalar(1 + .012 * hs.pulse);
	O.heart.updateMatrixWorld();
	const kOut = clamp((ys.d + R_YOU) / (2 * R_YOU)), youBehind = !camIn && segmentCrosses(camP, ys.p);
	const yo = {
		focus: dist(ys.p, camP),
		...o.youO
	}, yb = yo.bright ?? .5;
	const bgObs = [...o.bg ?? []];
	if (o.stars) bgObs.push(stars(ctx, cam, o.stars));
	if (o.floorI) bgObs.push(floor(o.floorY ?? -1.45, o.floorI));
	O.lines.begin();
	if (kOut > 0 && (youBehind || camIn)) {
		bgObs.push(drawYou(ctx, cam, ys.p, {
			...yo,
			bright: yb * kOut
		}));
		halo(ys.p, YOU, kOut * (o.youHalo ?? 1));
	}
	O.lines.end(ctx);
	bgObs.push(O.lines.mesh);
	renderInto(ctx, O.rtBg, cam, bgObs);
	const inObs = [drawMe(ctx, cam, ms.p, {
		press: ms.press,
		scale: ms.scale,
		focus: dist(ms.p, camP),
		...o.meO
	})];
	if (kOut < 1) inObs.push(drawYou(ctx, cam, ys.p, {
		...yo,
		bright: yb * (1 - kOut)
	}));
	renderInto(ctx, O.rtIn, cam, inObs);
	const touchAge = t - K.tX;
	setGlass(O.glass, cam, O.heart, O.rtBg.texture, O.rtIn.texture, {
		appear: hs.appear * (1 - .45 * hs.dissolve),
		t: t - K.s0,
		pulse: hs.pulse,
		glow: hs.glow,
		cage: hs.cage,
		contour: 1,
		touch: !V && touchAge > -.25 && touchAge < 2.5 ? [...M.exit, touchAge] : null,
		press: ms.press > 0 ? [...M.exit, ms.press * (1 + .4 * hs.glow)] : null,
		...o.glass
	});
	ctx.pass(O.glass);
	const front = [drawHeartSwarm(ctx, cam, pen, hs, o.hsO)];
	O.lines.begin();
	if (!V) drawPenLines(pen, hs);
	o.lines?.(O.lines, {
		hs,
		ms,
		ys
	});
	const youFront = kOut > 0 && !youBehind && !camIn;
	if (youFront) halo(ys.p, YOU, kOut * (o.youHalo ?? 1));
	O.lines.end(ctx);
	front.push(O.lines.mesh);
	if (youFront) front.push(drawYou(ctx, cam, ys.p, {
		...yo,
		bright: yb * kOut
	}));
	renderDirect(ctx, cam, front);
	return {
		hs,
		ms,
		ys
	};
}
/**
* docs/REMAKE.md §3.3, EDIT.md love. No ascii view: it hid the contact. The camera looks along the glass where you went
* through (from behind, on you's side of the line, as youFar), so that place is on the heart's outline: me comes from
* inside toward it, after you, whose trail leads out of the frame; the cage lights on the sung word and me reaches the
* outline as the line ends. The second "trapped" (pressed) holds it there: two steps, not one.
*/
function trappedGiven(ctx, K, t, ms) {
	const k = ease.inOutSine(seg(t, K.l125.start, K.l126.start)), n = M.nExit, tan = norm([
		n[2],
		0,
		-n[0]
	]);
	const pos = add(add(M.exit, tan, lerp(1.28, 1.2, k)), [
		0,
		.4,
		0
	]);
	const cam = persp(pos, add(M.exit, n, -.3), {
		fov: 32,
		aspect: ctx.aspect
	});
	const trail = (Lg, { ys }) => {
		const pts = [];
		for (let j = 0; j <= 40; j++) pts.push(add(M.exit, YDIR, j / 40 * (ys.s - M.sExit)));
		Lg.polyline(pts, {
			color: scl(YOU, .35),
			width: 1.6
		});
	};
	glassFrame(ctx, cam, K, {
		glass: {
			body: .35,
			refr: .1,
			disp: .2
		},
		hsO: {
			surf: .08,
			bright: .16
		},
		meO: {
			focus: dist(pos, ms.p),
			aperture: .01,
			maxBlur: 12
		},
		lines: trail
	});
	readout(ctx.text.overlay, 1500, 150, [["love(me)", fmt(taubin(...ms.p))], ["cage", "24 meridians"]], { accent: HX.gold });
	overlays(ctx, K);
	look(ctx, { vignette: .45 });
}
/**
* docs/REMAKE.md §12.7 #9, love/venus.js. me is the Earth and stays where the heart will close round it (VC); you is
* Venus; VS world units per AU. Through L122, the one line sung in one breath, the 8 years are drawn as one stroke and
* the rose closes on the third LOVE, and glows; through L124 the frame goes over from me to the Sun, the petals come
* undone into two circles of their own and you goes on round its own, away (the official translation's "already": it
* was always free); on L125 the frame comes back to me, the rose folds onto the heart, and the heart closes round me.
*/
var VC = [
	0,
	.1,
	0
];
var VS = .8;
var VEQ = "you(t) − me(t) = 0.723 e^(13it/8) − e^(it)";
var vW = (p) => [
	VC[0] + VS * p[0],
	VC[1] + VS * p[1],
	0
];
var KV = null;
function keysV(T) {
	if (KV?.T === T) return KV;
	const K = keys(T);
	return KV = {
		...K,
		venus: true,
		yr0: K.la.start + .06,
		vInf: K.l125.start + .44
	};
}
/** The year at t: 0 → 8 through L122 (one stroke, closing on the third LOVE), then on to the far side by L125. */
function yrAt(t, K) {
	if (t < K.LOVE[2]) return 8 * ramp(seg(t, K.yr0, K.LOVE[2]), .08);
	return 8 + .8 * ease.inOutSine(seg(t, K.LOVE[2], K.l125.start));
}
/** The frame: 0 centred on me, 1 on the Sun. */
function frameK(t, K) {
	if (t < K.l124.start) return 0;
	if (t < K.l125.start) return ease.inOutSine(seg(t, K.l124.start + .06, K.l124.start + .8));
	return 1 - ease.inOutSine(seg(t, K.l125.start, K.l125.start + .26));
}
/** How far the rose has folded onto the heart (L125). */
var foldK = (t, K) => ease.inOutCubic(seg(t, K.l125.start + .2, K.l125.start + .46));
function venusSt(t, K) {
	const yr = yrAt(t, K), k = frameK(t, K);
	return {
		yr,
		k,
		fold: foldK(t, K),
		me: vW(inFrame(earth(yr), yr, k)),
		you: vW(inFrame(venus(yr), yr, k)),
		sun: vW(inFrame([0, 0], yr, k)),
		d: Math.hypot(...geo(yr))
	};
}
/** The glass world's states on Venus's timing: the heart closes round me on L125, me presses on its wall on L126. */
function heartStateV(t, K) {
	const inflate = ease.inOutCubic(seg(t, K.vInf, K.vInf + .45)), appear = ease.inOutCubic(seg(t, K.vInf + .03, K.vInf + .5));
	return {
		inflate,
		appear,
		pulse: K.T.pulse(t, 6) * appear,
		glow: ease.inOutSine(seg(t, K.LOVE[3] - .05, K.LOVE[3] + .5)),
		cage: ease.inOutCubic(seg(t, K.l126.start - .1, K.l126.start + .3)),
		dissolve: ease.inQuad(seg(t, K.B(31), K.end + .35))
	};
}
function meStateV(t, K) {
	const toWall = ease.inOutCubic(seg(t, K.l126.start - .08, K.l126.start + .3)), press = ease.outCubic(seg(t, K.l126.start + .14, K.l126.start + .5));
	let p = mix3(venusSt(t, K).me, M.pressC, toWall);
	p = add(p, [
		0,
		.01 * Math.sin(t * 1.7),
		0
	], 1 - toWall);
	return {
		p,
		press,
		inside: true,
		scale: 1
	};
}
function youStateV(t, K) {
	const p = add(venusSt(t, K).you, YDIR, .35 * Math.max(0, t - K.l125.start - .26));
	p[1] += .012 * Math.sin(t * 1.9);
	return {
		p,
		s: M.sExit + 9,
		d: taubinDist(p),
		free: true
	};
}
/** The third LOVE's glow on the rose: up on the word, settling to two thirds by L124. */
var roseGlow = (t, K) => ease.outCubic(seg(t, K.LOVE[2], K.LOVE[2] + .25)) * (1 - .35 * ease.inOutSine(seg(t, K.LOVE[2] + .3, K.l124.start)));
/** The rose by year yr: from 0 while it is being drawn, then the last 8 years; in the frame k; folded onto the heart. */
function roseTrail(st, from = Math.max(0, st.yr - 8)) {
	const pts = rosePts(from, st.yr, Math.max(2, Math.ceil((st.yr - from) * 300)), st.k).map(vW);
	if (st.fold <= 0) return pts;
	return pts.map((p) => {
		const q = rayExit(heart2, VC, Math.atan2(p[1] - VC[1], p[0] - VC[0]));
		return [
			lerp(p[0], q[0], st.fold),
			lerp(p[1], q[1], st.fold),
			0
		];
	});
}
/** me's own path over the year just past, in the frame k: a circle round the Sun once the frame is the Sun's. */
function meTrail(st) {
	const out = [];
	for (let i = 0; i <= 120; i++) {
		const s = st.yr - 1 + i / 120;
		out.push(vW(inFrame(earth(s), s, st.k)));
	}
	return out;
}
/**
* The rose's lines, the halos of me and you, and the Sun. o: glow (the third LOVE), fill (its nested copies, as the
* notebook's on the first LOVE; they go with the frame), alpha, gaze (me's line of sight to you, as the pen's ray
* was), bodies (false: the halos are someone else's).
*/
function drawRose(L, st, o = {}) {
	const g = o.glow ?? 0, a = o.alpha ?? 1;
	if (a <= 0) return;
	const pts = roseTrail(st), fill = (o.fill ?? 0) * (1 - st.k);
	if (fill > 0) for (const s of [
		.8,
		.6,
		.4,
		.2
	]) {
		const k = seg(fill, (1 - s) * .6, (1 - s) * .6 + .4);
		if (k > 0) L.polyline(pts.filter((_, i) => i % 2 === 0).map((p) => [
			VC[0] + (p[0] - VC[0]) * s,
			VC[1] + (p[1] - VC[1]) * s,
			0
		]), {
			color: scl(ROSE, (.45 * s + .08) * a),
			width: 1.5,
			draw: k
		});
	}
	L.polyline(pts, {
		color: scl(mix3(GOLD, WG, g), (.62 + 1.1 * g) * a),
		width: 2.8 + 1.2 * g
	});
	const tail = pts.slice(-24);
	if (tail.length > 1 && st.fold < 1) L.polyline(tail, {
		color: scl(WG, 1.4 * a * (1 - st.fold)),
		width: 3.2
	});
	if (st.k > .01) L.polyline(meTrail(st), {
		color: scl(ME, .55 * st.k * a),
		width: 1.8
	});
	if (o.gaze !== false) L.segment(st.me, st.you, {
		color: scl(WG, .16 * a * (1 - st.fold)),
		width: 1.3
	});
	if (o.bodies !== false) {
		halo(st.me, ME, .8 * a);
		halo(st.you, YOU, .8 * a);
	}
	if (st.k > .01) {
		L.segment(st.sun, st.sun, {
			color: scl(WG, 2.6 * st.k * a),
			width: 15
		});
		halo(st.sun, WG, 1.3 * st.k * a, 64);
	}
}
/** The rose's HUD: its equation (typed through L122's first words), the frame, the readings; o.labels, o.dist. */
function roseHud(ctx, K, st, cam, o = {}) {
	const L = ctx.text.overlay, t = ctx.t, typed = Math.ceil(42 * seg(t, K.la.start + .2, K.la.start + 1.4)), ea = 1 - st.fold;
	if (ea > 0) {
		L.text(VEQ.slice(0, typed), 118, 196, {
			size: 32,
			weight: 600,
			align: "left",
			color: HX.gold,
			glow: 12,
			glowColor: HX.gold,
			alpha: ea
		});
		L.text(`frame: ${st.k < .5 ? "me" : "sun"}   ·   8 yr = 13 venus yr = 5 × ${VEN.synodicDays} d`, 120, 236, {
			size: 16,
			weight: 500,
			align: "left",
			color: HX.dim,
			alpha: ea * seg(t, K.la.start + .5, K.la.start + .8)
		});
	}
	readout(L, 1500, 150, [
		["t", `${st.yr.toFixed(2)} yr`],
		["|me − you|", `${st.d.toFixed(3)} AU`],
		["retrograde", `${Math.min(VEN.loops, loopsBy(st.yr))} / ${VEN.loops}`]
	], {
		accent: HX.gold,
		keyW: 110
	});
	const a = o.labels ?? 0;
	if (a > 0) {
		const m = toDesign(st.me, cam), y = toDesign(st.you, cam);
		crosshair(L, m[0], m[1], 26, {
			label: "me",
			alpha: .55 * a
		});
		crosshair(L, y[0], y[1], 26, {
			label: "you",
			color: HX.you,
			alpha: .55 * a
		});
		if (st.k > .05) {
			const s = toDesign(st.sun, cam);
			crosshair(L, s[0], s[1], 30, {
				label: "sun",
				color: HX.wg,
				alpha: .6 * a * st.k
			});
		}
		if (o.dist) dimLine(L, m, y, `|me − you| = ${st.d.toFixed(3)} AU`, {
			offset: -64,
			color: HX.dim,
			alpha: .75 * o.dist
		});
	}
}
/** The stars, me and you as swarms at their places in the rose's world. */
function roseBodies(ctx, cam, st, o = {}) {
	const cp = cam.position.toArray();
	return [
		stars(ctx, cam, o.stars ?? .3),
		drawMe(ctx, cam, st.me, { focus: dist(st.me, cp) }),
		drawYou(ctx, cam, st.you, { focus: dist(st.you, cp) })
	];
}
chapter({
	id: "love",
	from: (T) => T.section("love").start,
	to: (T) => T.section("outro").start,
	init() {
		M = mathInit();
		O = {
			scene: new Scene(),
			persp: newCamera(36),
			ortho: new OrthographicCamera(-1, 1, 1, -1, .01, 100),
			heart: new Object3D()
		};
		O.me = new Swarm({ count: 65536 });
		O.you = new Swarm({ count: 16384 });
		O.hs = new Swarm({ count: 1 << 18 });
		O.stars = new Swarm({ count: 16384 });
		O.lines = new GlowLines(16e3);
		O.floor = gridPlane({
			plane: "xz",
			color: [
				.42,
				.17,
				.24
			],
			axis: [
				.3,
				.14,
				.17
			],
			minor: .25,
			major: 1,
			fade: .09
		});
		O.wall = gridPlane({
			plane: "xy",
			fade: 0
		});
		O.field = fieldMesh();
		O.glass = glassMaterial();
		O.tex = {
			meBall: O.me.shape("love/me-ball", (N) => shapes.ball(N, {
				r: R_ME,
				seed: 31
			})),
			mePressed: O.me.shape("love/me-pressed-r", (N) => pressedShape(N, add(M.exit, M.nExit, -.004), { origin: M.pressC })),
			youBall: O.you.shape("love/you-ball", (N) => shapes.ball(N, {
				r: R_YOU,
				seed: 32
			})),
			stars: O.stars.shape("love/stars", (N) => shapes.stars(N, {
				r0: 25,
				r1: 70
			})),
			flat: O.hs.shape("love/heart-curve", (N) => heartCurveShape(N, M.loop)),
			surf: O.hs.shape("love/heart-surface", (N) => shapes.implicit3(N, taubin, {
				box: [
					-1.3,
					-1.1,
					-.8,
					1.3,
					1.35,
					.8
				],
				uniform: true,
				seed: 21
			})),
			cardioid: O.hs.shape("love/cardioid-rev", (N) => cardioidRevShape(N))
		};
		O.gfWall = new GlyphField({ count: 16384 });
		O.gfWall.text("love/src", source("ch/love/curves.js"));
		O.tex.wall = O.gfWall.layout("love/wall", codeBlock(O.gfWall, {
			origin: [
				-3.6,
				3.2,
				0
			],
			cell: .1,
			cols: 120,
			rows: 64
		}));
		O.gfWord = new GlyphField({ count: 256 });
		O.gfWord.text("love/word", "LO-O-OVE");
		O.tex.word = O.gfWord.layout("love/word-line", codeBlock(O.gfWord, {
			origin: [
				-1.386,
				0,
				0
			],
			cell: .66,
			cols: 8
		}));
		const calSrc = source("ch/love/curves.js").replace(/\/\*[\s\S]*?\*\//g, " ").replace(/\/\/[^\n]*/g, " ").replace(/\s+/g, " ");
		O.gfCal = new GlyphField({ count: 9216 });
		O.gfCal.text("love/cal", calSrc);
		const mask = wordMask("LO-O-OVE", {
			font: "800 200px \"JetBrains Mono\"",
			height: 1.22,
			bold: 16
		});
		O.tex.cal = O.gfCal.layout("love/calligram", codeFill(O.gfCal, mask.inside, {
			cell: .105,
			width: mask.width,
			height: mask.height
		}));
		O.flat = new OrthographicCamera(-9.6, 9.6, 5.4, -5.4, .01, 100);
		O.flat.position.set(0, 0, 10);
		O.flat.lookAt(0, 0, 0);
		O.flat.updateMatrixWorld();
		O.all = [
			O.me.points,
			O.you.points,
			O.hs.points,
			O.stars.points,
			O.lines.mesh,
			O.floor,
			O.wall,
			O.field,
			O.gfWall.points,
			O.gfWord.points,
			O.gfCal.points
		];
		O.scene.add(...O.all);
	},
	shots: [
		{
			id: "dots",
			at: (T) => keys(T).s0,
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T), t = ctx.t, k = seg(t, K.s0, K.l117.start);
				const cam = persp([
					0,
					0,
					lerp(6.1, 5.75, ease.inOutSine(k))
				], [
					0,
					0,
					0
				], { aspect: ctx.aspect });
				const obs = [
					stars(ctx, cam, .12 * (1 - ease.inOutSine(seg(t, K.s0 + .15, K.l116.start + .5)))),
					drawMe(ctx, cam, DOT_ME, {
						scale: .62,
						bright: .5,
						noise: .003,
						reveal: .25
					}),
					drawYou(ctx, cam, DOT_YOU, {
						scale: .75,
						bright: .6,
						noise: .003,
						reveal: .6
					})
				];
				O.lines.begin();
				halo(DOT_ME, ME, 1.3, 22);
				halo(DOT_YOU, YOU, 1.3, 22);
				O.lines.end(ctx);
				renderDirect(ctx, cam, [...obs, O.lines.mesh]);
				const L = ctx.text.overlay, a = toDesign(DOT_ME, cam), b = toDesign(DOT_YOU, cam);
				const m = ease.outCubic(seg(t, K.l116.words[1].start, K.l116.words[1].start + .5));
				crosshair(L, a[0], a[1], 30, {
					label: "me",
					alpha: .5 * m
				});
				crosshair(L, b[0], b[1], 30, {
					label: "you",
					color: HX.you,
					alpha: .5 * m
				});
				if (m > .01) dimLine(L, a, [lerp(a[0], b[0], m), b[1]], m > .9 ? `|me − you| = ${fmt(1.5, 3)}` : "", {
					offset: 64,
					color: HX.dim,
					alpha: .75
				});
				const lk = seg(t, K.l116.start, K.l116.end + .02);
				if (lk > 0) {
					const pa = ease.outCubic(seg(t, K.l116.start - .04, K.l116.start + .3));
					terminal(ctx, [
						520,
						128,
						880,
						316
					], {
						alpha: pa,
						radius: 10,
						top: [
							.0105,
							.0105,
							.0135
						],
						bottom: [
							.006,
							.006,
							.008
						]
					});
					drawLoss(L, [
						600,
						188,
						720,
						196
					], ease.inOutSine(lk), {
						alpha: seg(t, K.l116.start, K.l116.start + .12),
						size: 16
					});
				}
				overlays(ctx, K);
				look(ctx, { vignette: .5 });
			}
		},
		{
			id: "notebook",
			at: (T) => keys(T).l117.start,
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T);
				if (remade(ctx)) return notebookR(ctx, K, ctx.t);
				drawNotebook(ctx, K, ctx.t);
				overlays(ctx, K);
				look(ctx, { vignette: .25 });
			}
		},
		{
			id: "nbZoom",
			at: (T) => keys(T).B(5),
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T), t = ctx.t;
				drawNotebook(ctx, K, t, { z: lerp(2.2, 2.75, ease.inOutSine(seg(t, K.B(5), K.LOVE[0]))) });
				const st = notebookState(t, K, remade(ctx))[4], L = ctx.text.overlay, tt = st.draw * TAU;
				L.draw((g) => {
					g.globalAlpha *= .8;
					const x0 = 1560, bw = 22;
					for (let k = -4; k <= 4; k++) {
						const f = FOURIER.find((q) => q[0] === k), h = (f ? Math.hypot(f[1], f[2]) : 0) / 12.5 * 90;
						g.fillStyle = HX.gold;
						g.fillRect(x0 + (k + 4) * bw, 280 - Math.max(h, 1), 16, Math.max(h, 1));
					}
					g.strokeStyle = HX.dim;
					g.lineWidth = 1;
					g.beginPath();
					g.moveTo(x0, 280.5);
					g.lineTo(1758, 280.5);
					g.stroke();
				});
				L.text("|c_k|   k = −4 … 4", 1560, 305, {
					size: 14,
					align: "left",
					color: HX.dim
				});
				readout(L, 1560, 336, [["t", tt.toFixed(3)], ["z(t)", `${fourierChain(tt).at(-1).slice(0, 2).map((v) => v.toFixed(2)).join(", ")}`]], {
					accent: HX.gold,
					keyW: 70
				});
				overlays(ctx, K);
				look(ctx, { vignette: .35 });
			}
		},
		{
			id: "warm",
			at: (T) => keys(T).LOVE[0],
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T), t = ctx.t;
				drawNotebook(ctx, K, t);
				const t0 = K.LOVE[0], ts = [
					0,
					.16,
					.32,
					.48
				].map((d) => t0 + d), bk = seg(t, t0, t0 + .1);
				ctx.text.overlay.draw((g) => {
					g.globalAlpha *= .72 * bk;
					g.fillStyle = "#07060a";
					g.fillRect(0, 380, 1920, 330);
				});
				drawTokens(ctx.text.overlay, [
					"LO",
					"-O",
					"-O",
					"VE"
				], ts, t, 960, 528, { size: 100 });
				ctx.text.overlay.text("tokens: 4", 960, 420, {
					size: 16,
					weight: 500,
					align: "center",
					color: HX.dim,
					alpha: bk
				});
				overlays(ctx, K);
				look(ctx, { vignette: .3 });
			}
		},
		{
			id: "ask",
			at: (T) => keys(T).q1.start,
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T);
				drawClaude(ctx, K, ctx.t, "ask");
				overlays(ctx, K);
				look(ctx);
			}
		},
		{
			id: "ask2",
			at: (T) => keys(T).q2.start,
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T);
				drawClaude(ctx, K, ctx.t, "ask2");
				overlays(ctx, K);
				look(ctx);
			}
		},
		{
			id: "landscape",
			at: (T) => keys(T).q2.words[2].start,
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T), t = ctx.t, t0 = K.q2.words[2].start, k = seg(t, t0, K.q2.words[4].start);
				const cam = persp(orbitPos([
					.1,
					-.05,
					-.15
				], 3.3, lerp(-.62, -.5, k), lerp(.5, .46, k)), [
					.1,
					-.12,
					-.15
				], {
					fov: 38,
					aspect: ctx.aspect
				});
				O.field.userData.set({
					intensity: 1,
					reveal: remade(ctx) ? 1 : ease.outCubic(seg(t, t0 - .05, t0 + .3)),
					lit: 0
				});
				const yp = [
					Y0[0],
					fieldHeight(Y0[0], Y0[1]) + .04,
					-Y0[1]
				];
				const obs = [O.field, drawYou(ctx, cam, yp, {
					bright: .55,
					focus: 3.3
				})];
				O.lines.begin();
				O.lines.segment([
					yp[0],
					0,
					yp[2]
				], [
					yp[0],
					yp[1] - .03,
					yp[2]
				], {
					color: scl(YOU, .5),
					width: 1.4
				});
				halo(yp, YOU, .8);
				O.lines.end(ctx);
				obs.push(O.lines.mesh);
				renderDirect(ctx, cam, obs);
				const L = ctx.text.overlay, q = toDesign(yp, cam);
				callout(L, [q[0], q[1]], `love(you) = ${fmt(heart2(Y0[0], Y0[1]))}`, {
					dx: 90,
					dy: -80,
					color: HX.you,
					draw: seg(t, t0 + .05, t0 + .25)
				});
				readout(L, 1500, 150, [["height", "∛love(x, y)"], ["zero set", "the heart"]], { accent: HX.gold });
				overlays(ctx, K);
				look(ctx, { vignette: .45 });
			}
		},
		{
			id: "answerAll",
			at: (T) => keys(T).q2.words[4].start,
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T);
				drawClaude(ctx, K, ctx.t, "all");
				overlays(ctx, K);
				look(ctx);
			}
		},
		{
			id: "cardioid",
			at: (T) => keys(T).LOVE[1],
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T), t = ctx.t, t0 = K.LOVE[1], sw = ease.inOutSine(seg(t, t0 + .04, K.la.start - .02)), phi = sw * PI;
				const az = lerp(.3, .55, seg(t, t0, K.la.start)), el = .36, R = 4.4, Sc = .78;
				const target = add([
					0,
					-.05,
					0
				], [
					Math.cos(az),
					0,
					-Math.sin(az)
				], -.95);
				const cam = persp(orbitPos(target, R, az, el), target, { aspect: ctx.aspect });
				const h = O.hs;
				h.points.position.set(0, 0, 0);
				h.points.rotation.set(0, 0, 0);
				h.points.scale.setScalar(Sc);
				h.set({
					a: O.tex.cardioid,
					revealBy: "w",
					reveal: sw,
					size: .007,
					bright: .2,
					colA: [
						1,
						.55,
						.62
					],
					t,
					sparkle: .4,
					noise: .002
				}, cam, ctx.H);
				const prof = [];
				for (let k = 0; k <= 240; k++) {
					const a = -PI / 2 + k / 240 * TAU, r = 1 - Math.sin(a);
					prof.push([r * Math.cos(a), r * Math.sin(a) + .875]);
				}
				const at = (x, y, f) => [
					x * Math.cos(f) * Sc,
					y * Sc,
					x * Math.sin(f) * Sc
				];
				O.lines.begin();
				O.lines.polyline(prof.map(([x, y]) => at(x, y, phi)), {
					color: scl(GOLD, 1.25),
					width: 3.2
				});
				for (let m = 1; m < 12; m++) {
					const a = m / 12 * PI;
					if (a > phi) break;
					O.lines.polyline(prof.map(([x, y]) => at(x, y, a)), {
						color: scl(ROSE, .3),
						width: 1.3
					});
				}
				for (let j = 1; j < 9; j++) {
					const th = -PI / 2 + j / 9 * PI, r = 1 - Math.sin(th), x = Math.abs(r * Math.cos(th)), y = r * Math.sin(th) + .875;
					for (const off of [0, PI]) {
						const arc = [];
						for (let k = 0; k <= 40; k++) arc.push(at(x, y, off + k / 40 * phi));
						O.lines.polyline(arc, {
							color: scl(WG, .3),
							width: 1.2
						});
					}
				}
				O.lines.segment([
					0,
					-1.35 * Sc,
					0
				], [
					0,
					1.3 * Sc,
					0
				], {
					color: scl(WG, .25),
					width: 1.3
				});
				O.lines.end(ctx);
				renderDirect(ctx, cam, [h.points, O.lines.mesh]);
				calligram(ctx, t0, 480, 548, { bright: 2.3 });
				readout(ctx.text.overlay, 1500, 150, [
					["r", "1 − sin θ"],
					["φ", `${phi.toFixed(3)}`],
					["surface", "of revolution"]
				], { accent: HX.gold });
				overlays(ctx, K);
				look(ctx, { ca: .1 });
			}
		},
		{
			id: "penWide",
			at: (T) => keys(T).la.start,
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T), t = ctx.t, k = seg(t, K.la.start, K.B(19));
				const target = [
					-.78,
					.14,
					0
				], cam = persp(orbitPos(target, lerp(4.55, 4.4, k), lerp(-.07, .02, k), .06), target, { aspect: ctx.aspect });
				const pen = penState(t, K), hs = heartState(t, K), ms = meState(t, K), yp = youState(t, K).p;
				O.lines.begin();
				drawPenLines(pen, hs);
				halo(ms.p, ME, .8);
				halo(yp, YOU, .8);
				O.lines.end(ctx);
				renderDirect(ctx, cam, [
					codeWall(ctx, cam, target, {
						d: 3.4,
						bright: .34,
						aperture: .012
					}),
					drawHeartSwarm(ctx, cam, pen, hs, { bright: .05 }),
					O.lines.mesh,
					drawMe(ctx, cam, ms.p, { scale: ms.scale }),
					drawYou(ctx, cam, yp)
				]);
				const L = ctx.text.overlay, typed = Math.ceil(25 * seg(t, K.la.start + .25, K.B(19) - .2));
				L.text(EQ.slice(0, typed), 118, 470, {
					size: 44,
					weight: 600,
					align: "left",
					color: HX.gold,
					glow: 14,
					glowColor: HX.gold
				});
				L.text("solve  F(x, y) = 0   ·   r(θ) by bisection", 120, 525, {
					size: 16,
					weight: 500,
					align: "left",
					color: HX.dim,
					alpha: seg(t, K.la.start + .5, K.la.start + .8)
				});
				const q = toDesign(ms.p, cam);
				callout(L, [q[0], q[1]], `θ = ${fmt((pen.th + TAU * 1.25) % TAU - PI / 2, 3)}`, {
					dx: 60,
					dy: -46,
					color: HX.me,
					alpha: .7
				});
				overlays(ctx, K, void 0, { backing: .8 });
				look(ctx);
			}
		},
		{
			id: "penMacro",
			at: (T) => keys(T).B(19),
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T), t = ctx.t, pen = penState(t, K), hs = heartState(t, K), ms = meState(t, K);
				const c = [
					0,
					.12,
					0
				], tip = pen.tip;
				const pos = add(add(add(tip, norm([
					tip[0] - c[0],
					tip[1] - c[1],
					0
				]), .24), pen.tan, -.1), [
					0,
					0,
					.46
				]);
				const cam = persp(pos, add(tip, pen.tan, .05), {
					fov: 38,
					aspect: ctx.aspect
				});
				const f = dist(tip, pos), ppu = pxPerUnit(cam, tip);
				O.lines.begin();
				drawPenLines(pen, hs, {
					ray: false,
					spokes: false,
					width: 3,
					k: .5,
					ppu
				});
				O.lines.end(ctx);
				renderDirect(ctx, cam, [
					drawHeartSwarm(ctx, cam, pen, hs, {
						size: 1.6 / ppu,
						bright: .2,
						focus: f,
						aperture: .03,
						maxBlur: 30
					}),
					O.lines.mesh,
					drawMe(ctx, cam, ms.p, {
						scale: ms.scale,
						rho: .45,
						bright: .34,
						focus: f,
						aperture: .008,
						maxBlur: 8
					})
				]);
				const L = ctx.text.overlay, q = toDesign(tip, cam), r = Math.hypot(tip[0], tip[1]);
				crosshair(L, q[0], q[1], 34, {
					color: HX.gold,
					alpha: .6
				});
				readout(L, 1480, 150, [
					["θ", fmt((pen.th + TAU * 1.25) % TAU - PI / 2, 4)],
					["r(θ)", fmt(r, 6)],
					["F(x, y)", fmt(heart2(tip[0], tip[1]), 9)]
				], {
					accent: HX.gold,
					keyW: 90
				});
				overlays(ctx, K);
				look(ctx, { vignette: .55 });
			}
		},
		{
			id: "blueprint",
			at: (T) => keys(T).B(21),
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T), t = ctx.t, pen = penState(t, K), hs = heartState(t, K), ms = meState(t, K), f = M.facts, yp = youState(t, K).p;
				const cam = orthoFront([
					0,
					.12,
					0
				], lerp(3.25, 3.1, ease.inOutSine(seg(t, K.B(21), K.LOVE[2]))), ctx.aspect);
				O.wall.position.set(0, 0, -2);
				const u = O.wall.material.uniforms;
				u.uMinor.value = .1;
				u.uMajor.value = .5;
				u.uCol.value.setRGB(.3, .32, .4);
				u.uAxisCol.value.setRGB(.5, .52, .6);
				O.wall.userData.set({
					intensity: .5,
					fade: 0,
					reveal: 1
				});
				O.lines.begin();
				drawPenLines(pen, hs, {
					k: 1.3,
					width: 3.6
				});
				halo(ms.p, ME, .8);
				halo(yp, YOU, .8);
				O.lines.end(ctx);
				if (remade(ctx)) {
					renderDirect(ctx, cam, [
						O.wall,
						O.lines.mesh,
						drawMe(ctx, cam, ms.p, { scale: ms.scale }),
						drawYou(ctx, cam, yp)
					]);
					look(ctx, { vignette: .38 });
				} else {
					const tex = capture(ctx, (sub) => renderDirect(sub, cam, [
						O.wall,
						O.lines.mesh,
						drawMe(ctx, cam, ms.p, { scale: ms.scale }),
						drawYou(ctx, cam, yp)
					]));
					look(ctx, { vignette: .3 });
					view(ctx, tex, "paper", {
						gain: 2.4,
						paper: [
							.95,
							.935,
							.9
						],
						ink: [
							.1,
							.09,
							.11
						]
					});
				}
				const L = ctx.text.overlay, P = (p) => toDesign(p, cam), a = seg(t, K.B(21), K.B(21) + .25), INK = remade(ctx) ? "#d9d4de" : "#2b2a31", ACC = remade(ctx) ? "#ff9ab0" : "#9a3b52";
				dimLine(L, P([
					-f.xMax,
					f.yAtX,
					0
				]), P([
					f.xMax,
					f.yAtX,
					0
				]), `2·max|x| = ${fmt(2 * f.xMax)}`, {
					offset: -300,
					alpha: .9 * a,
					color: INK
				});
				dimLine(L, P([
					f.xMax,
					-1,
					0
				]), P([
					f.xMax,
					f.yMax,
					0
				]), `max y − min y = ${fmt(f.yMax + 1)}`, {
					offset: 110,
					alpha: .9 * a,
					color: INK
				});
				callout(L, P([
					0,
					1,
					0
				]), "cusp (0, 1)", {
					dx: -60,
					dy: -120,
					draw: a,
					color: INK
				});
				callout(L, P([
					0,
					-1,
					0
				]), "tip (0, −1)", {
					dx: 70,
					dy: 60,
					draw: a,
					color: INK
				});
				for (const x of [-1, 1]) {
					const q = P([
						x,
						0,
						0
					]);
					crosshair(L, q[0], q[1], 12, {
						alpha: .8 * a,
						color: INK
					});
				}
				readout(L, 1480, 150, [
					["F", EQ.replace(" = 0", "")],
					["area", fmt(f.area)],
					["∮ ds", fmt(f.per)]
				], {
					accent: ACC,
					keyW: 70
				});
				if (remade(ctx)) {
					frame(L, t, ctx.T, {
						label: "solve",
						bottomRight: "view  front · orthographic"
					});
					consoleLog(L, ctx.T, t, {
						from: K.s0 - .2,
						accent: ACC
					});
				} else {
					frame(L, t, ctx.T, {
						label: "solve",
						bottomRight: "view  front · orthographic",
						color: "#6b6670"
					});
					consoleLog(L, ctx.T, t, {
						from: K.s0 - .2,
						accent: "#9a3b52",
						color: INK,
						glow: 0
					});
				}
			}
		},
		{
			id: "venus",
			editOnly: true,
			at: (T) => keys(T).la.start,
			ownsLyrics: true,
			draw(ctx) {
				const K = keysV(ctx.T), t = ctx.t, st = venusSt(t, K), k = ease.inOutSine(seg(t, K.la.start, K.LOVE[2]));
				const tg = add(VC, [
					lerp(.04, -.6, k),
					lerp(.12, 0, k),
					0
				]);
				const cam = persp(orbitPos(tg, lerp(1.6, 5.2, k), lerp(.5, .1, k), lerp(.22, .05, k)), tg, {
					fov: 36,
					aspect: ctx.aspect
				});
				O.lines.begin();
				drawRose(O.lines, st);
				O.lines.end(ctx);
				renderDirect(ctx, cam, [...roseBodies(ctx, cam, st), O.lines.mesh]);
				roseHud(ctx, K, st, cam, { labels: 1 - seg(t, K.la.start + .7, K.la.start + 1.2) });
				overlays(ctx, K, void 0, { backing: .6 });
				look(ctx);
			}
		},
		{
			id: "inflate",
			at: (T) => keys(T).LOVE[2],
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T), t = ctx.t, k = seg(t, K.LOVE[2], K.l124.start);
				const target = [
					-.95,
					.12,
					0
				], cam = persp(orbitPos(target, lerp(5.2, 5.05, k), lerp(.02, .2, ease.inOutSine(k)), lerp(.08, .14, k)), target, { aspect: ctx.aspect });
				const hc = [
					0,
					.15,
					0
				];
				glassFrame(ctx, cam, K, { bg: [codeWall(ctx, cam, hc, {
					d: 3.6,
					bright: .15
				}), glyphWord(ctx, cam, hc, K.LOVE[2], { d: 1.1 })] });
				ctx.text.overlay.text(TAUBIN_EQ, 120, 214, {
					size: 18,
					weight: 500,
					align: "left",
					color: HX.gold,
					alpha: .85 * seg(t, K.LOVE[2] + .2, K.LOVE[2] + .45)
				});
				overlays(ctx, K, void 0, { backing: .8 });
				look(ctx);
			}
		},
		{
			id: "rose",
			editOnly: true,
			at: (T) => keys(T).LOVE[2],
			ownsLyrics: true,
			draw(ctx) {
				const K = keysV(ctx.T), t = ctx.t, st = venusSt(t, K), k = ease.inOutSine(seg(t, K.LOVE[2], K.l124.start));
				const cam = persp(orbitPos(VC, lerp(4.8, 4.6, k), lerp(.06, .02, k), .04), VC, {
					fov: 36,
					aspect: ctx.aspect
				});
				O.lines.begin();
				drawRose(O.lines, st, {
					glow: roseGlow(t, K),
					fill: ease.outCubic(seg(t, K.LOVE[2] + .02, K.LOVE[2] + .6))
				});
				O.lines.end(ctx);
				renderDirect(ctx, cam, [
					glyphWord(ctx, cam, VC, K.LOVE[2], { d: 1.1 }),
					...roseBodies(ctx, cam, st),
					O.lines.mesh
				]);
				roseHud(ctx, K, st, cam);
				overlays(ctx, K, void 0, { backing: .6 });
				look(ctx);
			}
		},
		{
			id: "youFree",
			at: (T) => keys(T).l124.start,
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T), t = ctx.t, ys = youState(t, K), perp = norm([
					-YDIR[2],
					0,
					YDIR[0]
				]);
				const cam = persp(add(add(add(ys.p, perp, 1.35), YDIR, -.25), [
					0,
					.12,
					0
				]), add(ys.p, YDIR, .15), {
					fov: 40,
					aspect: ctx.aspect
				});
				const r = glassFrame(ctx, cam, K, {
					hsO: {
						surf: .1,
						bright: .2
					},
					glass: {
						body: .35,
						refr: .1,
						disp: .2
					},
					bg: [codeWall(ctx, cam, ys.p, {
						d: 4.2,
						bright: .2
					})]
				});
				const L = ctx.text.overlay, q = toDesign(r.ys.p, cam);
				callout(L, [q[0], q[1]], `love(you) = ${fmt(taubin(...r.ys.p))}`, {
					dx: 90,
					dy: -70,
					color: HX.you,
					alpha: .8
				});
				overlays(ctx, K, void 0, { backing: .8 });
				look(ctx);
			}
		},
		{
			id: "youGone",
			at: (T) => keys(T).l124.words[1].start,
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T), t = ctx.t, k = seg(t, K.l124.words[1].start, K.l124.words[3].start);
				const cam = persp([
					lerp(.75, .85, k),
					.5,
					lerp(4.4, 4.25, k)
				], [
					lerp(.75, .85, k),
					.35,
					0
				], {
					fov: 38,
					aspect: ctx.aspect
				});
				const r = glassFrame(ctx, cam, K);
				const L = ctx.text.overlay, q = toDesign(r.ys.p, cam);
				callout(L, [q[0], q[1]], `love(you) = ${fmt(taubin(...r.ys.p), 3)} > 0`, {
					dx: 70,
					dy: -60,
					color: HX.you,
					alpha: .75
				});
				overlays(ctx, K);
				look(ctx);
			}
		},
		{
			id: "youFar",
			at: (T) => keys(T).l124.words[3].start,
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T), t = ctx.t, k = seg(t, K.l124.words[3].start, K.l125.start);
				const cam = persp([
					lerp(-1.9, -2.05, k),
					lerp(1.45, 1.6, k),
					lerp(-4.5, -4.85, k)
				], [
					1.2,
					.2,
					.5
				], {
					fov: 40,
					aspect: ctx.aspect
				});
				const trail = (Lg, { ys }) => {
					const pts = [];
					for (let j = 0; j <= 40; j++) pts.push(add(M.exit, YDIR, j / 40 * (ys.s - M.sExit)));
					Lg.polyline(pts, {
						color: scl(YOU, .35),
						width: 1.6
					});
				};
				const r = glassFrame(ctx, cam, K, {
					youO: { scale: 1.7 },
					youHalo: 1.8,
					lines: trail
				});
				const L = ctx.text.overlay, a = toDesign(r.ms.p, cam), b = toDesign(r.ys.p, cam);
				dimLine(L, a, b, `|me − you| = ${fmt(dist(r.ms.p, r.ys.p), 3)}`, {
					offset: -60,
					color: HX.dim,
					alpha: .8
				});
				overlays(ctx, K);
				look(ctx);
			}
		},
		{
			id: "frame",
			editOnly: true,
			at: (T) => keys(T).l124.start,
			ownsLyrics: true,
			draw(ctx) {
				const K = keysV(ctx.T), t = ctx.t, st = venusSt(t, K), e = ease.inOutSine(seg(t, K.l124.start, K.l125.start));
				const cam = persp(orbitPos(VC, lerp(4.6, 3.7, e), lerp(.02, -.1, e), lerp(.04, .12, e)), VC, {
					fov: 36,
					aspect: ctx.aspect
				});
				O.lines.begin();
				drawRose(O.lines, st, {
					glow: roseGlow(t, K) * (1 - st.k),
					fill: 1
				});
				O.lines.end(ctx);
				const wk = 1 - ease.inOutSine(seg(t, K.l124.start, K.l124.start + .35));
				renderDirect(ctx, cam, [
					...wk > 0 ? [glyphWord(ctx, cam, VC, K.LOVE[2], {
						d: 1.1,
						bright: 1.25 * wk
					})] : [],
					...roseBodies(ctx, cam, st),
					O.lines.mesh
				]);
				roseHud(ctx, K, st, cam, {
					labels: seg(t, K.l124.start + .2, K.l124.start + .5),
					dist: seg(t, K.l124.start + .9, K.l124.start + 1.2)
				});
				overlays(ctx, K, void 0, { backing: .6 });
				look(ctx);
			}
		},
		{
			id: "trapped",
			at: (T) => keys(T).l125.start,
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T), t = ctx.t, ms = meState(t, K), ys = youState(t, K);
				if (remade(ctx)) return trappedGiven(ctx, K, t, ms);
				const toYou = norm(ys.p.map((v, i) => v - ms.p[i])), side = norm([
					-toYou[2],
					0,
					toYou[0]
				]);
				const pos = add(add(add(ms.p, toYou, -.3), side, .15), [
					0,
					.1,
					0
				]);
				const cam = persp(pos, add(add(pos, toYou, 1), [
					0,
					-.22,
					0
				]), {
					fov: 54,
					aspect: ctx.aspect
				});
				const tex = capture(ctx, (sub) => glassFrame(sub, cam, K, {
					glass: {
						refr: .2,
						disp: .35,
						body: .9,
						refl: .6,
						film: .5
					},
					meO: {
						focus: 1.6,
						aperture: .025,
						maxBlur: 30,
						bright: .3,
						rho: .12
					},
					hsO: {
						surf: 0,
						bright: 0
					},
					youO: { scale: 1.8 },
					youHalo: 1.6
				}));
				look(ctx);
				view(ctx, tex, "ascii", {
					cell: 18,
					tint: [
						1,
						.66,
						.62
					],
					source: .55,
					gain: 3.4
				});
				readout(ctx.text.overlay, 1500, 150, [
					["love(me)", fmt(taubin(...ms.p))],
					["cage", "24 meridians"],
					["view", "ascii"]
				], { accent: HX.gold });
				overlays(ctx, K);
			}
		},
		{
			id: "trapV",
			editOnly: true,
			at: (T) => keys(T).l125.start,
			ownsLyrics: true,
			draw(ctx) {
				const K = keysV(ctx.T), t = ctx.t, st = venusSt(t, K), e = ease.inOutSine(seg(t, K.l125.start, K.l126.start)), hs = heartStateV(t, K);
				const cam = persp(orbitPos(VC, lerp(3.7, 4.6, e), lerp(-.1, .25, e), lerp(.12, .14, e)), VC, {
					fov: 36,
					aspect: ctx.aspect
				});
				glassFrame(ctx, cam, K, {
					stars: .3,
					lines: (Lg) => drawRose(Lg, st, {
						alpha: 1 - hs.appear,
						gaze: false,
						bodies: false
					})
				});
				roseHud(ctx, K, st, cam);
				overlays(ctx, K, void 0, { backing: .6 });
				look(ctx);
			}
		},
		{
			id: "pressed",
			at: (T) => keys(T).l126.start,
			ownsLyrics: true,
			draw(ctx) {
				const K = remade(ctx) ? keysV(ctx.T) : keys(ctx.T), t = ctx.t, k = seg(t, K.l126.start, K.LOVE[3]);
				const n = M.nExit, side = norm([
					n[2],
					0,
					-n[0]
				]);
				const cam = persp(add(add(add(M.exit, n, lerp(1.02, .9, ease.inOutSine(k))), side, -.38), [
					0,
					.16,
					0
				]), add(M.exit, [
					-.06,
					-.02,
					0
				]), {
					fov: 38,
					aspect: ctx.aspect
				});
				const r = glassFrame(ctx, cam, K, {
					hsO: {
						surf: .08,
						bright: .16
					},
					glass: {
						body: .35,
						refr: .1,
						disp: .2
					}
				});
				const L = ctx.text.overlay, q = toDesign(M.exit, cam);
				callout(L, [q[0] + 120, q[1] - 150], `love(me) = ${fmt(taubin(...r.ms.p), 4)} < 0`, {
					dx: 170,
					dy: -60,
					color: HX.me,
					alpha: .75
				});
				overlays(ctx, K, void 0, { backing: .6 });
				look(ctx, { vignette: .5 });
			}
		},
		{
			id: "finale",
			at: (T) => keys(T).LOVE[3],
			ownsLyrics: true,
			draw(ctx) {
				const K = remade(ctx) ? keysV(ctx.T) : keys(ctx.T), t = ctx.t, k = ease.inOutSine(seg(t, K.LOVE[3], K.end + .5));
				const az = lerp(.42, .5, k), target = add([
					.05,
					.1,
					0
				], [
					Math.cos(az),
					0,
					-Math.sin(az)
				], .95);
				glassFrame(ctx, persp(orbitPos(target, lerp(5.3, 4.7, k), az, lerp(.1, .13, k)), target, { aspect: ctx.aspect }), K);
				heroWord(ctx.text.scene, "LO-O-OVE", 1830, 560, K.LOVE[3], t, {
					size: 100,
					tracking: 18,
					align: "right",
					color: "#fff4ec",
					glowColor: HX.rose,
					glow: 26
				});
				overlays(ctx, K);
				look(ctx);
			}
		}
	]
});
//#endregion
