import { chapter } from "../engine/timeline.js?v=vYBbdLfo";
import { TAU, clamp, ease, lerp, rng, seg } from "../engine/math.js?v=BJIlRm7-";
import { COL, HEX } from "../theme.js?v=Bj33PIbo";
import { remade } from "../lib/published.js?v=aV_CU5HV";
import { MathUtils, Matrix4, OrthographicCamera, PerspectiveCamera, Scene, Vector3 } from "../../vendor/three/build/three.core.js?v=q9f7JKE-";
import { CUR, CURSOR_LOOK, blinkOn, cursorMesh, cursorQuad, drawCursor, setCursorMesh } from "./intro/cursor.js?v=B0VCQBJX";
import { dataTexture } from "../engine/gpu.js?v=o4BYX3o1";
import { Swarm } from "../engine/swarm.js?v=DTFpJa7B";
import { GlowLines } from "../engine/lines.js?v=B_AAaaTO";
import { consoleLog } from "../lib/look.js?v=BfOqFF7i";
import { gridPlane } from "../lib/env.js?v=CIN_DqPv";
import { callout, dimLine, frame, readout as readout$1, toDesign } from "../lib/hud.js?v=BgmSZjmG";
import { GlyphField, codeBlock, source } from "../lib/glyphs.js?v=DWbHICXG";
import { capture, view } from "../lib/modes.js?v=Cu3GYO-2";
import { thinking } from "../lib/claude.js?v=DXDs_lIL";
import { around, circle, dofDot, dofSegment, mixc, mul, ortho, persp, scrim, viewDepth } from "./intro/kit.js?v=rUxrOt9G";
import { buildNetwork, drawCurrent, drawTraces, drawnLength, traceState } from "./intro/trace.js?v=Z6WQwuol";
import { SB, drawBoxEdges, sandboxState, shieldMesh } from "./intro/sandbox.js?v=BIdF2cjI";
import { ORDER, SOLIDS, drawImpact, drawSolid, edgeCloud, euler, landState, poseVerts, restMatrix } from "./intro/solids.js?v=Cdnqob5F";
import { drawPanel, panelState } from "./intro/panel.js?v=VBBXg03Z";
import { WORLD, drawTerrain } from "./intro/world.js?v=Cb_W9Bs7";
import { arcText, decodeStr, faceText } from "./intro/type.js?v=CuOppAhI";
import { MONO_SYNTAX, calligram, onPlaced, sphereShell, textMask } from "./intro/calligram.js?v=BpZEMGYM";
import { drawHeHistogram, heInit } from "./intro/histogram.js?v=B3QY5s_1";
import { WORLD_SYNTAX, codeWorld } from "./intro/codeworld.js?v=CtrlDRpP";
import { DROP, IMPACT, TIMAEUS, fall, front, jolt, live, shieldWave } from "./intro/landing.js?v=B09chHQT";
import { faceCloud, makePieces, posePiece, showPiece, tracesTexture } from "./intro/obsidian.js?v=DC8IJsW2";
import { drawDust, drawFront, floorDots, shieldRipple } from "./intro/quake.js?v=Cg5E1tXt";
import { POWER, SYNTAX, elementOf } from "./intro/palette.js?v=CBOijEC5";
import { hueDither } from "./intro/dither.js?v=D9ZTodD-";
import { titleKeys } from "./intro/title-keys.js?v=C9tlklxs";
import { LINE_R, PROMPT_R } from "./title/code.js?v=BHDi1kEh";
//#region src/ch/01_intro.js
var GREY = [
	.62,
	.67,
	.76
];
var WHITE = COL.white;
var HGREY = "#aab4c8";
var SHIELD = [
	.72,
	.8,
	.95
];
var SHIELD_R = mul(POWER.amber, .62);
var ROW_Z = .45;
var ROW_X = [
	-1,
	-.5,
	0,
	.5,
	1
];
var SOLID_R = .21;
var YAW = [
	.35,
	.5,
	.2,
	.12,
	.42
];
var ME_C = [
	0,
	1.3,
	0
];
var ME_R = .5;
var CUR3 = {
	w: .16,
	h: .028
};
var WORD = {
	c: [
		0,
		1.3,
		.2
	],
	capH: .4,
	leading: .45,
	tracking: .08,
	cell: .028
};
var PAGE = {
	cell: .03,
	cols: 150,
	rows: 60
};
var O = null;
var KC = null;
function keys(T) {
	if (KC?.T === T) return KC;
	const B = (k) => T.beatTime(k), L = (s) => T.findLine(s);
	const l0 = L("Switch on the power"), l1 = L("Remember to put on"), l2 = L("PROTECTION"), l5 = L("OBJECT CREATION"), l6 = L("Fill in my data");
	const l7 = L("INITIALIZATION"), l8 = L("Set up our new world"), l9 = L("And let's begin the"), l10 = L("SIMULATION");
	const s16 = (B(1) - B(0)) / 4;
	return KC = {
		T,
		B,
		s0: T.section("intro").start,
		end: T.section("inst1").start,
		s16,
		l0,
		l1,
		l2,
		l5,
		l6,
		l7,
		l8,
		l9,
		l10,
		on: l0.words[1].start,
		put: l1.words[2].start,
		creation: l5.words[1].start,
		land: [
			B(8),
			B(9),
			B(10),
			B(11),
			B(12)
		],
		trace: {
			start: B(1.25),
			sixteenth: s16,
			ringStart: B(4),
			ringEnd: B(6)
		},
		box: {
			t0: l2.start,
			tTop: B(7),
			tShield0: l2.start + .08,
			tShield1: B(7.6),
			tLock0: B(7.1),
			tLock1: B(7.85)
		},
		panel: [
			[B(16.25), B(16.75)],
			[B(16.75), B(17.75)],
			[B(17.75), B(18)],
			[B(18), B(19.75)],
			[B(21.25), B(22.25)]
		],
		word: {
			m1: [l5.start, B(14.5)],
			m2: [B(15) + .06, B(15.6)],
			fade: [B(15.4), B(15.95)],
			me: [B(15.35), B(15.85)],
			end: l6.start
		}
	};
}
var traceSt = (t, K) => traceState(t, K.trace);
var boxSt = (t, K) => sandboxState(t, K.box, ease);
var powerSt = (t, K) => ({
	on: t >= K.on ? 1 : 0,
	spread: ease.outCubic(seg(t, K.on, K.on + .9))
});
function solidSt(i, t, K) {
	const ls = landState(t, K.land[i], {
		height: 3.3,
		fall: .36
	});
	const gone = ease.inCubic(seg(t, K.l5.start, K.l5.start + .3));
	return {
		...ls,
		alpha: (ls.shown ? 1 : 0) * (1 - gone)
	};
}
function initRing(t, K) {
	const n = Math.round((K.B(23) - K.l7.start) / K.s16), x = (t - K.l7.start) / ((K.B(23) - K.l7.start) / n), f = Math.floor(x);
	return x <= 0 ? 0 : Math.min(1, (f + ease.outExpo(clamp((x - f) / .5))) / n);
}
function meSt(t, K) {
	return {
		born: t >= K.word.me[0],
		fadeIn: ease.inOutSine(seg(t, K.word.me[0], K.word.me[1])),
		dye: seg(t, K.B(20) + .02, K.B(21) - .05),
		ring: initRing(t, K),
		wake: ease.outCubic(seg(t, K.B(23), K.B(23) + .6))
	};
}
function wordSt(t, K) {
	const w = K.word;
	return {
		on: t >= w.m1[0] && t < w.end,
		m1: ease.inOutCubic(seg(t, w.m1[0], w.m1[1])),
		m2: ease.inCubic(seg(t, w.m2[0], w.m2[1])),
		stage2: t >= w.m2[0]
	};
}
var R_MAX = WORLD.R * 1.45;
function worldSt(t, K) {
	const u = ease.outCubic(seg(t, K.B(24), K.B(27.5)));
	return {
		unroll: (2.6 + (R_MAX - 2.6) * u) / R_MAX,
		front: 2.6 + (R_MAX - 2.6) * u,
		frontK: 1 - seg(t, K.B(26.5), K.B(28)),
		rise: ease.inOutSine(seg(t, K.B(25), K.B(29))),
		ph: (t - K.B(24)) * .35
	};
}
function reset() {
	for (const o of [
		O.me.points,
		O.grid.points,
		O.page.points,
		O.word.points,
		O.terra.points,
		O.lines.mesh,
		O.soft.mesh,
		O.floor,
		O.shield,
		O.glass,
		O.cur
	]) o.visible = false;
	if (O.R) for (const o of O.R.all) o.visible = false;
	O.me.points.position.set(...ME_C);
	O.me.points.rotation.set(0, 0, 0);
	O.me.points.scale.setScalar(1);
	O.lines.begin();
	O.soft.begin();
}
function render(ctx, cam) {
	O.lines.mesh.visible = O.soft.mesh.visible = true;
	O.lines.end(ctx);
	O.soft.end(ctx);
	ctx.draw(O.scene, cam);
}
function dotGrid(ctx, cam, K, o = {}) {
	const t = ctx.t, pw = powerSt(t, K);
	O.grid.points.visible = true;
	O.grid.set({
		a: O.tex.grid,
		b: O.tex.grid,
		morph: pw.spread * 1.05,
		wave: 9.5,
		waveOrigin: [
			0,
			0,
			0
		],
		spread: .92,
		t,
		size: o.size ?? .012,
		minPx: 1.2,
		bright: (o.bright ?? .5) * (o.fade ?? 1),
		colA: mul(GREY, .3),
		colB: GREY,
		sparkle: .12,
		focus: o.focus ?? 5,
		aperture: o.aperture ?? 0,
		maxBlur: o.maxBlur ?? 30
	}, cam, ctx.H);
}
function cursor3D(ctx, K, level = 1) {
	const t = ctx.t, lit = t >= K.on ? 1 : blinkOn(ctx.T, t);
	setCursorMesh(O.cur, level * 1.35 * lit, remade(ctx) && t >= K.on ? POWER.cursor : void 0);
}
var dofOf = (cam, focus, aperture, maxBlur = 40) => ({
	cam,
	focus,
	aperture,
	maxBlur,
	soft: O.soft,
	n: 3
});
function overlays(ctx, K, o = {}) {
	const L = ctx.text.overlay, cyan = ctx.t >= K.B(19.75);
	if (o.backing) scrim(L, [[
		60,
		820,
		remade(ctx) ? 560 : 820,
		190
	], [
		1450,
		120,
		400,
		100
	]], { alpha: .7 * o.backing });
	if ((o.frame ?? 1) > 0) frame(L, ctx.t, ctx.T, {
		label: "boot",
		bottomRight: o.br,
		alpha: .55 * (o.frame ?? 1)
	});
	consoleLog(L, ctx.T, ctx.t, {
		from: K.s0 - .2,
		accent: cyan ? HEX.me : HGREY,
		glow: cyan ? 10 : 6,
		alpha: o.console ?? 1
	});
}
/** `✻ Initializing…` under the console's current line, on the film's one turn clock (INITIALIZATION → the world). */
function thinkingLine(ctx, K) {
	const t = ctx.t, a = ease.outCubic(seg(t, K.l7.start, K.l7.start + .12)) * (1 - seg(t, K.B(24) - .12, K.B(24)));
	if (a > .01) thinking(ctx.text.overlay, 110, 976, t, {
		T: ctx.T,
		count: { from: 0 },
		verb: "Initializing",
		size: 24,
		alpha: a
	});
}
function look(ctx, K, o = {}) {
	const mono = ctx.t < K.B(19.75);
	Object.assign(ctx.post, {
		bloom: 1.05,
		threshold: .9,
		ca: mono ? 0 : .04,
		vignette: .45,
		grain: .035,
		exposure: 1,
		...o
	});
}
function readout(ctx, rows, o = {}) {
	readout$1(ctx.text.overlay, o.x ?? 1480, o.y ?? 150, rows, {
		accent: o.accent ?? HGREY,
		alpha: o.alpha ?? .8
	});
}
/** (the remake) the read-out's values in the power's amber while it is booting the board (L1, L2). */
var amberHud = (ctx) => remade(ctx) ? { accent: POWER.hex } : {};
var proj = (p, cam) => toDesign(p, cam);
var inFront = (pts) => pts.every((p) => p[2] < 1 && p[2] > -1);
function drawNet(ctx, K, o = {}) {
	const st = traceSt(ctx.t, K);
	const R = remade(ctx), cop = o.copper ?? .62;
	return {
		st,
		tips: drawTraces(O.lines, O.net, st, {
			color: o.color ?? (R ? mul(POWER.copper, cop) : mul(WHITE, .75)),
			tip: o.tip ?? 2.2,
			dof: o.dof,
			inner: o.inner ?? st.ring,
			widthK: o.widthK ?? 1,
			...R ? {
				tipColor: POWER.gold,
				viaColor: mul(POWER.amber, cop * 1.35),
				viaFlash: POWER.gold
			} : {}
		}),
		pulses: o.current ? drawCurrent(O.lines, O.net, st, ctx.t, {
			dof: o.dof,
			bright: o.current,
			width: o.currentW ?? 5,
			speed: 1.7,
			...R ? {
				color: POWER.amber,
				head: POWER.gold
			} : {}
		}) : 0
	};
}
/** "Switch on": the power front runs out across the board from the cursor as a ring (it leads the via grid's wave). */
function powerRing(ctx, K) {
	const k = seg(ctx.t, K.on, K.on + .95);
	if (k <= 0 || k >= 1) return;
	const r = .12 + ease.outCubic(k) * 3.6, f = (1 - k) ** 1.5;
	O.lines.polyline(circle([
		0,
		.003,
		0
	], r, 160), {
		color: mul(WHITE, 1.5 * f),
		width: 1.5 + 2.5 * f
	});
	O.lines.polyline(circle([
		0,
		.003,
		0
	], r * .82, 120), {
		color: mul(GREY, .45 * f),
		width: 1.2
	});
}
function shield(t, intensity, o = {}) {
	O.shield.userData.set({
		reveal: o.reveal ?? 1.3,
		pulse: o.pulse ?? -1,
		intensity,
		color: o.color ?? SHIELD,
		t,
		fres: 1,
		center: [
			0,
			0,
			0
		],
		frontColor: o.frontColor
	});
}
function drawBox(ctx, K, o = {}) {
	const st = boxSt(ctx.t, K);
	drawBoxEdges(O.lines, {
		S: SB.S,
		H: SB.H,
		extrude: st.extrude,
		color: o.color ?? mul(WHITE, .95),
		width: o.width ?? 2.6,
		dof: o.dof,
		corner: st.extrude > .02 ? 1.6 : 0
	});
	if (st.shield > 0) shield(ctx.t, o.shield ?? .9, {
		reveal: st.shield,
		pulse: st.pulse,
		color: o.shieldColor,
		frontColor: o.shieldFront
	});
	return st;
}
function solidVerts(i, t, K) {
	const p = O.place[i], st = solidSt(i, t, K);
	return {
		st,
		P: poseVerts(p.solid, p.M, st.dy, st.tilt),
		c: [
			ROW_X[i],
			0,
			ROW_Z
		]
	};
}
function drawSolids(ctx, K, o = {}) {
	const t = ctx.t, out = [];
	for (let i = 0; i < 5; i++) {
		const { st, P, c } = solidVerts(i, t, K);
		out.push({
			st,
			P,
			c
		});
		if (st.alpha <= 0) continue;
		const hi = o.highlight?.(i) ?? 0, topY = P.reduce((m, p) => Math.max(m, p[1]), 0);
		drawSolid(O.lines, O.place[i].solid, P, {
			color: mul(WHITE, (o.bright ?? 1.2) * st.alpha * (1 + hi)),
			width: o.width ?? 2.6,
			dots: (o.dots ?? 1.6) * st.alpha,
			dof: o.dof
		});
		if (st.falling) O.lines.segment([
			c[0],
			topY + .05,
			c[2]
		], [
			c[0],
			topY + .55,
			c[2]
		], {
			color: mul(WHITE, .45 * st.alpha),
			width: 1.4
		});
		drawImpact(O.lines, c, st.impact, {
			r0: SOLID_R * .9,
			r1: .75,
			dof: o.dof,
			bright: 1.3
		});
	}
	return out;
}
function drawMe(ctx, K, cam, o = {}) {
	const t = ctx.t, st = meSt(t, K);
	if (!st.born) return st;
	const me = O.me, white = [
		.86,
		.9,
		1
	];
	me.points.visible = true;
	const breathe = 1 + .018 * st.wake * Math.sin((t - K.B(23)) * TAU / (K.B(2) - K.B(0)));
	me.points.scale.setScalar(breathe);
	me.points.rotation.y = 1.2 + (t - K.B(15)) * .12;
	const local = new Vector3().subVectors(cam.position, new Vector3(...ME_C)).normalize().applyMatrix4(new Matrix4().makeRotationY(-me.points.rotation.y)).multiplyScalar(ME_R);
	me.set({
		a: O.tex.sphere,
		b: O.tex.sphere,
		morph: st.dye * 1.02,
		wave: ME_R * 2,
		waveOrigin: local.toArray(),
		spread: .88,
		t,
		size: .005,
		minPx: 1.1,
		noise: .011 * st.wake,
		noiseFreq: 3.5,
		noiseSpeed: .25,
		bright: .13 * (1 + .2 * st.wake) * st.fadeIn * (o.brightK ?? 1),
		colA: white,
		colB: COL.me,
		sparkle: .2 + .3 * st.wake,
		...o.swarm
	}, cam, ctx.H);
	return st;
}
/**
* OBJECT CREATION in code: the characters of the solids' source sit on the solids' edges, peel off as the lines fade,
* fly into the calligram of the two words (m1), hold, then compile onto the sphere of me (m2) and give way to its points.
*/
function drawWord(ctx, K, cam, o = {}) {
	const t = ctx.t, st = o.st ?? wordSt(t, K), gf = O.word, m10 = o.t0 ?? K.word.m1[0];
	if (!st.on) return st;
	gf.points.visible = true;
	const peel = ease.outCubic(seg(t, m10, m10 + .12)), fade = 1 - ease.inCubic(seg(t, K.word.fade[0], K.word.fade[1]));
	const k = st.stage2 ? st.m2 : st.m1, size = WORD.cell * 1.3 * (st.stage2 ? lerp(1, .6, k) : lerp(.55, 1, k));
	if (o.glyphs) gf.material.uniforms.uG.value = o.glyphs;
	gf.set({
		a: st.stage2 ? O.tex.wWord : o.from ?? O.tex.wEdges,
		b: st.stage2 ? O.tex.wSphere : O.tex.wWord,
		morph: k,
		spread: st.stage2 ? .35 : .55,
		arc: st.stage2 ? .2 : .5,
		size,
		minPx: 2,
		bright: (o.bright ?? 1.7) * peel * fade,
		palette: MONO_SYNTAX,
		t,
		...o.glyph
	}, cam, ctx.H);
	return st;
}
/**
* (the remake) OBJECT CREATION in colour: every character keeps the element of the piece whose face it left (initRemake:
* O.tex.wPieceG), and as the characters compile onto me's sphere the five colours mix to white, the white of me's
* points that take over from them: me is born white.
*/
var WORD_WHITE = [
	.96,
	1,
	1.08
];
function wordColours(t, K) {
	const k = ease.inCubic(seg(t, K.word.m2[0], K.word.m2[1]));
	return {
		glyphs: O.tex.wPieceG,
		glyph: { palette: [...[
			0,
			1,
			2,
			3,
			4
		].map((i) => mixc(mul(elementOf(i).lin, 1.15), WORD_WHITE, k)), WORD_WHITE] }
	};
}
/** (the remake) a piece's read-out: its element in its own colour, its numbers grey. */
function readoutR(ctx, i, rows, o = {}) {
	readout(ctx, [["Timaeus", TIMAEUS[ORDER[i]]]], {
		...o,
		accent: elementOf(i).hex
	});
	readout(ctx, rows, {
		...o,
		y: (o.y ?? 150) + 23.25
	});
}
function drawWorld(ctx, K, cam, o = {}) {
	const st = worldSt(ctx.t, K), fl = o.floor ?? 1, tk = o.terrain ?? fl;
	if (fl > 0) {
		O.floor.visible = true;
		O.floor.userData.set({
			intensity: .7 * fl,
			reveal: st.unroll,
			revealR: R_MAX,
			fade: o.fade ?? .035
		});
	}
	if (st.frontK > 0 && st.front < WORLD.R * 1.4) {
		const pts = circle([
			0,
			.01,
			0
		], st.front, 240).filter((p) => Math.abs(p[0]) < WORLD.R && Math.abs(p[2]) < WORLD.R);
		for (let i = 1; i < pts.length; i++) if (Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][2] - pts[i - 1][2]) < 2) O.lines.segment(pts[i - 1], pts[i], {
			color: mul(COL.me, 1.4 * st.frontK * fl),
			width: 2.4
		});
	}
	if (tk > 0) drawTerrain(O.lines, {
		rise: st.rise,
		ph: st.ph,
		color: mul([
			.18,
			.55,
			1
		], tk),
		width: o.terrainW ?? 1.5,
		eye: cam.position.toArray(),
		fade: o.terrainFade ?? 80,
		spacing: 2.5,
		step: 1,
		zMin: o.zMin
	});
	return st;
}
/** The world written in code: the same terrain, its heights carried by rows of the program's source (CODE). */
function drawCodeWorld(ctx, K, cam, o = {}) {
	const w = worldSt(ctx.t, K);
	O.world.update(w.rise, w.ph);
	O.terra.points.visible = true;
	O.terra.set({
		a: O.world.tex,
		reveal: o.reveal ?? 1.001,
		soft: .025,
		size: .66,
		minPx: 2.4,
		bright: o.bright ?? 1,
		palette: WORLD_SYNTAX,
		t: ctx.t
	}, cam, ctx.H);
	return w;
}
chapter({
	id: "intro",
	from: (T) => T.section("intro").start,
	to: (T) => T.section("inst1").start,
	init(ctx) {
		O = {
			scene: new Scene(),
			cam: new PerspectiveCamera(38, 16 / 9, .01, 800),
			ocam: new OrthographicCamera(-1, 1, 1, -1, .01, 400)
		};
		O.me = new Swarm({ count: 1 << 18 });
		O.grid = new Swarm({ count: 16384 });
		O.lines = new GlowLines(16e3);
		O.soft = new GlowLines(8e3);
		O.soft.material.uniforms.uCore.value = .04;
		O.floor = gridPlane({
			plane: "xz",
			size: WORLD.R * 2,
			fade: .035,
			minor: 1,
			major: 4
		});
		O.cur = cursorMesh(CUR3);
		O.shield = shieldMesh({
			pattern: "hex",
			cell: .24,
			frontCol: remade(ctx)
		});
		O.glass = shieldMesh({
			S: WORLD.R,
			H: WORLD.H,
			pattern: "glass",
			cell: 2.5
		});
		O.net = buildNetwork();
		O.place = ORDER.map((id, i) => ({
			id,
			solid: SOLIDS[id],
			M: restMatrix(SOLIDS[id], {
				pos: [ROW_X[i], ROW_Z],
				scale: SOLID_R,
				yaw: YAW[i]
			})
		}));
		O.tex = {
			grid: O.grid.shape("intro/pcb-grid", (N) => {
				const side = Math.sqrt(N), out = new Float32Array(N * 4), half = (side - 1) / 2 * .1;
				for (let i = 0; i < N; i++) {
					const x = i % side * .1 - half, z = Math.floor(i / side) * .1 - half;
					out.set([
						x,
						.001,
						z,
						Math.hypot(x, z) / (half * 1.42)
					], i * 4);
				}
				return out;
			}),
			sphere: O.me.shape("intro/me-sphere", (N) => {
				const g = rng(9), out = new Float32Array(N * 4);
				for (let i = 0; i < N; i++) {
					const y = 1 - 2 * (i + .5) / N, q = Math.sqrt(1 - y * y), a = i * 2.399963229728653;
					const p = [
						q * Math.cos(a) + (g() - .5) * .006,
						y + (g() - .5) * .006,
						q * Math.sin(a) + (g() - .5) * .006
					], l = Math.hypot(...p) / (ME_R * (1 + (g() - .5) * .012));
					out.set([
						p[0] / l,
						p[1] / l,
						p[2] / l,
						0
					], i * 4);
				}
				return out;
			})
		};
		O.page = new GlyphField({ count: 16384 });
		O.page.text("intro/solids-src", source("ch/intro/solids.js"));
		O.tex.page = O.page.layout("intro/page", codeBlock(O.page, {
			origin: [
				-1.35,
				PAGE.rows * PAGE.cell / 2,
				0
			],
			cell: PAGE.cell,
			cols: PAGE.cols,
			rows: PAGE.rows
		}));
		O.page.points.rotation.x = -Math.PI / 2;
		O.page.points.position.set(0, .002, ROW_Z);
		O.word = new GlyphField({ count: 4096 });
		O.word.text("intro/word-src", source("ch/intro/solids.js"));
		const cal = calligram(O.word, textMask(["OBJECT", "CREATION"], {
			capH: WORD.capH,
			leading: WORD.leading,
			tracking: WORD.tracking
		}), {
			center: WORD.c,
			cell: WORD.cell
		});
		O.wordPlaced = cal.placed;
		O.tex.wWord = O.word.layout("intro/word", () => cal.arr);
		O.tex.wEdges = O.word.layout("intro/word-edges", (N) => onPlaced(cal, (n) => edgeCloud(n, O.place, { jitter: .002 }), N));
		O.tex.wSphere = O.word.layout("intro/word-sphere", (N) => onPlaced(cal, (n) => sphereShell(n, ME_R * 1.02, ME_C), N));
		O.terra = new GlyphField({ count: 65536 });
		O.terra.text("intro/world-src", source("ch/intro/world.js") + "\n" + source("ch/01_intro.js"));
		O.world = codeWorld(O.terra, "intro/code-world");
		O.he = heInit({
			total: 262144,
			fanIn: 512
		});
		O.scene.add(O.floor, O.grid.points, O.page.points, O.glass, O.shield, O.me.points, O.word.points, O.terra.points, O.lines.mesh, O.soft.mesh, O.cur);
		if (remade(ctx)) initRemake(cal);
	},
	shots: [
		{
			id: "cursor",
			at: (T) => T.section("intro").start,
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T), t = ctx.t;
				reset();
				drawCursor(ctx.text.scene, cursorQuad(), { alpha: blinkOn(ctx.T, t) });
				overlays(ctx, K, { frame: 0 });
				look(ctx, K, {
					...CURSOR_LOOK,
					ca: 0,
					vignette: .55,
					grain: lerp(.02, .035, seg(t, K.s0, K.on))
				});
			}
		},
		{
			id: "trace",
			at: (T) => keys(T).on,
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T), t = ctx.t;
				reset();
				const h0 = CUR3.w * 1080 / CUR.w, cam = ortho(O.ocam, [
					0,
					0,
					0
				], "top", lerp(h0, 4.1, ease.inOutSine(seg(t, K.on + .1, K.B(3)))), ctx.aspect);
				const g = remade(ctx) ? 1 - ease.inOutSine(seg(t, K.on, K.on + .35)) : 0;
				cursor3D(ctx, K, remade(ctx) ? 1 - g : 1);
				dotGrid(ctx, cam, K, {
					size: .011,
					bright: .75
				});
				const { st } = drawNet(ctx, K, { current: .6 });
				powerRing(ctx, K);
				render(ctx, cam);
				overlays(ctx, K, {
					frame: 0,
					br: "view  top · orthographic"
				});
				readout(ctx, [
					["net", "VCC"],
					["hop", `${Math.floor(st.hops)}`.padStart(2, "0")],
					["copper", drawnLength(O.net, st).toFixed(3)]
				], {
					alpha: seg(t, K.on + .1, K.on + .3) * .8,
					...amberHud(ctx)
				});
				look(ctx, K, { vignette: .5 });
				if (g > 0) {
					drawCursor(ctx.text.scene, cursorQuad(), { alpha: g });
					const CL = {
						...CURSOR_LOOK,
						ca: 0,
						vignette: .55
					};
					for (const key of Object.keys(CL)) if (typeof CL[key] === "number") ctx.post[key] = lerp(ctx.post[key], CL[key], g);
				}
			}
		},
		{
			id: "current",
			at: (T) => keys(T).B(3),
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T), t = ctx.t, k = ease.outQuad(seg(t, K.B(3), K.B(4)));
				reset();
				const eye = [
					lerp(1.18, 1.06, k),
					.34,
					lerp(.62, .5, k)
				];
				const cam = persp(O.cam, eye, [
					.42,
					0,
					.04
				], {
					fov: 34,
					aspect: ctx.aspect
				});
				const focus = viewDepth([
					.72,
					0,
					.12
				], cam), dof = dofOf(cam, focus, .018, 22);
				cursor3D(ctx, K);
				dotGrid(ctx, cam, K, {
					bright: .45,
					size: .006,
					focus,
					aperture: .018,
					maxBlur: 22
				});
				const { pulses } = drawNet(ctx, K, {
					dof,
					current: 1.1,
					currentW: 6,
					widthK: 1.25
				});
				render(ctx, cam);
				overlays(ctx, K, { frame: 0 });
				readout(ctx, [["pulses", `${pulses}`], ["v", "1.70 u/s"]], {
					alpha: .6,
					...amberHud(ctx)
				});
				look(ctx, K, { vignette: .55 });
			}
		},
		{
			id: "boundary",
			at: (T) => keys(T).B(4),
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T), t = ctx.t, k = seg(t, K.B(4), K.put);
				reset();
				const r = lerp(5.3, 4.8, ease.inOutSine(k)), cam = persp(O.cam, around([
					0,
					0,
					0
				], r, lerp(.62, .76, k), .72), [
					0,
					-.2,
					0
				], {
					fov: 38,
					aspect: ctx.aspect
				});
				cursor3D(ctx, K);
				dotGrid(ctx, cam, K, {
					bright: .5,
					size: .01,
					focus: r,
					aperture: .012,
					maxBlur: 16
				});
				const { st } = drawNet(ctx, K, {
					current: .5,
					widthK: 1,
					dof: dofOf(cam, r, .008, 14)
				});
				render(ctx, cam);
				const fr = ease.outCubic(seg(t, K.B(4), K.B(4) + .45));
				overlays(ctx, K, { frame: fr });
				readout(ctx, [["boundary", `${(st.ring * 100).toFixed(1)} %`], ["copper", drawnLength(O.net, st).toFixed(3)]], {
					alpha: fr * .8,
					...amberHud(ctx)
				});
				look(ctx, K);
			}
		},
		{
			id: "ringTop",
			at: (T) => keys(T).put,
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T), t = ctx.t;
				reset();
				const cam = ortho(O.ocam, [
					0,
					0,
					0
				], "top", lerp(4.05, 3.8, ease.inOutSine(seg(t, K.put, K.l2.start))), ctx.aspect);
				cursor3D(ctx, K);
				dotGrid(ctx, cam, K, {
					bright: .42,
					size: .01
				});
				const { st } = drawNet(ctx, K, {
					widthK: .9,
					current: .4
				});
				render(ctx, cam);
				const L = ctx.text.overlay, a = proj([
					-SB.S,
					0,
					-SB.S
				], cam), b = proj([
					SB.S,
					0,
					-SB.S
				], cam), c = proj([
					SB.S,
					0,
					SB.S
				], cam);
				const on = st.ring >= 1 ? 1 : 0;
				dimLine(L, a, b, on ? "3.000" : "", {
					offset: -34,
					color: HGREY,
					alpha: .8
				});
				dimLine(L, b, c, on ? "3.000" : "", {
					offset: 34,
					color: HGREY,
					alpha: .8
				});
				overlays(ctx, K, { br: "view  top · orthographic" });
				readout(ctx, [["boundary", on ? "closed" : `${(st.ring * 100).toFixed(1)} %`], ["area", on ? "9.000" : "—"]], amberHud(ctx));
				look(ctx, K, { vignette: .35 });
			}
		},
		{
			id: "protection",
			at: (T) => keys(T).l2.start,
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T), t = ctx.t, k = ease.inOutSine(seg(t, K.l2.start, K.B(8)));
				reset();
				const cam = persp(O.cam, around([
					0,
					1.3,
					0
				], 8.6, lerp(.5, .6, k), lerp(.3, .34, k)), [
					.35,
					1.4,
					0
				], {
					fov: 38,
					aspect: ctx.aspect
				});
				cursor3D(ctx, K, .8);
				dotGrid(ctx, cam, K, {
					bright: .4,
					size: .012
				});
				drawNet(ctx, K, {
					widthK: .8,
					tip: 0
				});
				const st = drawBox(ctx, K, remade(ctx) ? {
					shieldColor: SHIELD_R,
					shieldFront: mul(POWER.gold, 1.5)
				} : {});
				if (remade(ctx)) drawSolidsR(ctx, K, {
					width: 2,
					env: [.3 * clamp(st.shield), 1.1 * st.extrude]
				});
				else drawSolids(ctx, K, { width: 2 });
				render(ctx, cam);
				const S = SB.S, y0 = 1.1, y1 = 1.85, q = [
					[
						-S * .86,
						y1,
						S
					],
					[
						S * .86,
						y1,
						S
					],
					[
						-S * .86,
						y0,
						S
					]
				].map((p) => proj(p, cam));
				faceText(ctx.text.scene, decodeStr("PROTECTION", K.l2.start, t, .4), q, {
					full: "PROTECTION",
					size: 100,
					color: HEX.white,
					glow: 16,
					glowColor: remade(ctx) ? POWER.glow : "#c9d6f0",
					alpha: clamp(st.extrude * 1.5)
				});
				overlays(ctx, K);
				readout(ctx, [
					["sandbox", "3 × 3 × 3"],
					["shield", `${Math.min(100, st.shield / 1.3 * 100).toFixed(0)} %`],
					["lock", st.locked ? "engaged" : st.pulse >= 0 ? "scanning" : "—"]
				], amberHud(ctx));
				look(ctx, K);
			}
		},
		...[
			{
				id: "tetra",
				i: 0,
				r: 1.55,
				az: .95,
				el: .78,
				azD: .12,
				fov: 34,
				look: [
					0,
					.12,
					0
				]
			},
			{
				id: "cube",
				i: 1,
				r: 1.35,
				az: -.55,
				el: .36,
				azD: -.1,
				fov: 34,
				look: [
					0,
					.16,
					0
				]
			},
			{
				id: "octa",
				i: 2,
				r: 1.15,
				az: .28,
				el: .02,
				azD: .08,
				fov: 36,
				look: [
					0,
					.3,
					0
				],
				mode: "dither"
			},
			{
				id: "dodeca",
				i: 3,
				r: 1.3,
				az: -.25,
				el: 1.02,
				azD: -.06,
				fov: 34,
				look: [
					0,
					.1,
					0
				]
			}
		].map((s) => ({
			id: s.id,
			at: (T) => keys(T).land[s.i],
			ownsLyrics: true,
			draw(ctx) {
				if (remade(ctx)) return landShotR(ctx, s);
				const K = keys(ctx.T), t = ctx.t, lt = t - K.land[s.i];
				reset();
				const c = [
					ROW_X[s.i],
					0,
					ROW_Z
				], tgt = [
					c[0] + s.look[0],
					s.look[1],
					c[2] + s.look[2]
				];
				const cam = persp(O.cam, around(tgt, s.r - lt * .12, s.az + lt * s.azD, s.el), tgt, {
					fov: s.fov,
					aspect: ctx.aspect
				});
				const dof = dofOf(cam, s.r, .016, 26);
				if (!s.mode) dotGrid(ctx, cam, K, {
					bright: .5,
					size: .006,
					focus: s.r,
					aperture: .02,
					maxBlur: 26
				});
				drawNet(ctx, K, {
					widthK: 1,
					tip: 0,
					dof
				});
				drawBoxEdges(O.lines, {
					extrude: 1,
					color: mul(WHITE, .55),
					width: 2,
					dof
				});
				if (!s.mode) shield(t, .35);
				const all = drawSolids(ctx, K, {
					dof,
					width: s.mode ? 3.4 : 2.8,
					dots: 1.8
				});
				if (s.mode) view(ctx, capture(ctx, (sub) => render(sub, cam)), s.mode, {
					pix: 4,
					gain: 2.2,
					look: false
				});
				else render(ctx, cam);
				const so = O.place[s.i].solid, q = proj(all[s.i].P.reduce((m, p) => p[1] > m[1] ? p : m), cam);
				callout(ctx.text.overlay, [q[0], q[1]], so.name, {
					dx: s.az > 0 ? 70 : -70,
					dy: -60,
					color: HGREY,
					draw: ease.outCubic(seg(lt, .04, .22))
				});
				overlays(ctx, K, s.mode ? { br: "view  1-bit · bayer 8×8" } : {});
				readout(ctx, [
					["V − E + F", euler(so)],
					["faces", `${so.nF}`],
					["dihedral", `${so.dihedral.toFixed(2)}°`]
				]);
				look(ctx, K, s.mode ? {
					tonemap: 2,
					bloom: 0,
					ca: 0,
					grain: 0,
					vignette: .15
				} : {});
			}
		})),
		{
			id: "icosaFall",
			at: (T) => keys(T).B(11.5),
			ownsLyrics: true,
			draw(ctx) {
				if (remade(ctx)) return icosaFallR(ctx);
				const K = keys(ctx.T), t = ctx.t, k = ease.outQuad(seg(t, K.B(11.5), K.B(12)));
				reset();
				const cam = persp(O.cam, [
					lerp(1.35, 1.3, k),
					.5,
					2.6500000000000004
				], [
					.55,
					.42,
					ROW_Z
				], {
					fov: 36,
					aspect: ctx.aspect
				});
				const dof = dofOf(cam, 2.3, .012, 20);
				dotGrid(ctx, cam, K, {
					bright: .45,
					size: .008,
					focus: 2.3,
					aperture: .016
				});
				drawNet(ctx, K, {
					tip: 0,
					dof
				});
				drawBoxEdges(O.lines, {
					extrude: 1,
					color: mul(WHITE, .5),
					width: 2,
					dof
				});
				shield(t, .3);
				drawSolids(ctx, K, {
					dof,
					width: 2.4
				});
				render(ctx, cam);
				overlays(ctx, K);
				readout(ctx, [
					["V − E + F", euler(SOLIDS.icosa)],
					["faces", "20"],
					["dihedral", `${SOLIDS.icosa.dihedral.toFixed(2)}°`]
				]);
				look(ctx, K);
			}
		},
		{
			id: "row",
			at: (T) => keys(T).B(12),
			ownsLyrics: true,
			draw(ctx) {
				if (remade(ctx)) return rowR(ctx);
				const K = keys(ctx.T), t = ctx.t, k = ease.inOutSine(seg(t, K.B(12), K.l5.start));
				reset();
				const cam = ortho(O.ocam, [
					0,
					0,
					ROW_Z
				], "top", lerp(1.62, 1.5, k), ctx.aspect);
				O.page.points.visible = true;
				O.page.set({
					a: O.tex.page,
					size: PAGE.cell * 1.15,
					minPx: 1.5,
					bright: .15,
					palette: MONO_SYNTAX,
					scroll: [
						0,
						(t - K.B(12)) * .09,
						0
					],
					t
				}, cam, ctx.H);
				const sx = lerp(-1.45, 1.45, ease.inOutSine(seg(t, K.B(12.3), K.l5.start - .05)));
				drawSolids(ctx, K, {
					width: 2.6,
					highlight: (i) => Math.exp(-(((ROW_X[i] - sx) / .16) ** 2)) * .9
				});
				if (t > K.B(12.3) && t < K.l5.start) O.lines.segment([
					sx,
					.5,
					-.14999999999999997
				], [
					sx,
					.5,
					1.05
				], {
					color: mul(WHITE, 1.1),
					width: 2
				});
				render(ctx, cam);
				const L = ctx.text.overlay, cs = ROW_X.map((x) => proj([
					x,
					0,
					.79
				], cam)), al = seg(t, K.B(12.4), K.B(12.9));
				dimLine(L, cs[1], cs[2], "0.500", {
					offset: 28,
					color: HGREY,
					alpha: .8 * al
				});
				dimLine(L, cs[0], cs[4], "2.000", {
					offset: 78,
					color: HGREY,
					alpha: .8 * al
				});
				overlays(ctx, K, {
					br: "view  top · solids.js",
					backing: .8
				});
				readout(ctx, [
					["solids", "5 / 5"],
					["Σ V E F", "50 90 50"],
					["χ", "5 × 2"]
				]);
				look(ctx, K, { vignette: .5 });
			}
		},
		{
			id: "creation",
			at: (T) => keys(T).l5.start,
			ownsLyrics: true,
			draw(ctx) {
				if (remade(ctx)) return creationR(ctx);
				const K = keys(ctx.T), t = ctx.t, k = ease.outCubic(seg(t, K.l5.start, K.creation));
				reset();
				const tgt = [
					0,
					.95,
					.2
				], cam = persp(O.cam, around(tgt, lerp(3.75, 3.55, k), lerp(-.16, -.12, k), lerp(.15, .12, k)), tgt, {
					fov: 38,
					aspect: ctx.aspect
				});
				drawNet(ctx, K, {
					tip: 0,
					widthK: .6,
					color: mul(WHITE, .35)
				});
				drawSolids(ctx, K, { width: 2.4 });
				drawWord(ctx, K, cam);
				render(ctx, cam);
				overlays(ctx, K);
				readout(ctx, [["decompile", "solids.js"], ["glyphs", `${Math.round(O.wordPlaced * wordSt(t, K).m1)} / ${O.wordPlaced}`]], { y: 860 });
				look(ctx, K);
			}
		},
		{
			id: "birth",
			at: (T) => keys(T).creation,
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T), t = ctx.t, k = ease.inOutSine(seg(t, K.creation, K.l6.start));
				reset();
				const tgt = [
					0,
					1.3,
					.1
				], cam = persp(O.cam, around(tgt, lerp(3.3, 2.65, k), lerp(.1, .16, k), lerp(.06, .1, k)), tgt, {
					fov: 38,
					aspect: ctx.aspect
				});
				const c0 = remade(ctx) ? creationAt(ctx, K) : 0;
				if (remade(ctx)) drawSolidsR(ctx, K, {
					width: 2.2,
					c0
				});
				else drawSolids(ctx, K, { width: 2.2 });
				const ws = remade(ctx) ? drawWord(ctx, K, cam, {
					st: wordStR(t, K, c0),
					t0: c0,
					from: O.tex.wFaces,
					...wordColours(t, K)
				}) : drawWord(ctx, K, cam);
				drawMe(ctx, K, cam, { swarm: {
					focus: 2.8,
					aperture: .006,
					maxBlur: 10
				} });
				render(ctx, cam);
				overlays(ctx, K);
				readout(ctx, [["compile", `${(ws.m2 * 100).toFixed(0)} %`], ["object", ws.m2 >= 1 ? "me" : "…"]], { y: 860 });
				look(ctx, K);
			}
		},
		{
			id: "panel",
			at: (T) => keys(T).l6.start,
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T), t = ctx.t;
				reset();
				const st = panelState(t, K.panel), open = ease.outCubic(seg(t, K.l6.start, K.l6.start + .3));
				const z = lerp(1, 1.07, ease.inOutSine(seg(t, K.l6.start, K.B(20)))), cx = 960, cy = 470;
				const nk = seg(t, K.panel[1][1] + .05, K.panel[1][1] + .35);
				drawPanel(ctx.text.scene, st, {
					x: cx + -260 * z,
					y: cy + -208 * z,
					size: 60 * z,
					lh: 84 * z,
					open,
					noteK: nk,
					cyan: ease.outCubic(seg(t, K.B(19.75), K.B(20))),
					...remade(ctx) ? { syntax: SYNTAX } : {}
				});
				overlays(ctx, K);
				look(ctx, K, {
					vignette: .5,
					bloom: .9
				});
			}
		},
		{
			id: "dye",
			at: (T) => keys(T).B(20),
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T), t = ctx.t, k = ease.inOutSine(seg(t, K.B(20), K.B(21)));
				reset();
				const cam = persp(O.cam, around(ME_C, lerp(3.05, 2.8, k), lerp(.12, .2, k), .1), [
					ME_C[0] + .28,
					ME_C[1] - .02,
					ME_C[2]
				], {
					fov: 34,
					aspect: ctx.aspect
				});
				dyeFront(cam, drawMe(ctx, K, cam));
				render(ctx, cam);
				const c = proj([
					ME_C[0] + ME_R * .72,
					ME_C[1] + ME_R * .72,
					ME_C[2]
				], cam);
				callout(ctx.text.overlay, [c[0], c[1]], "color  #7EF0FF", {
					dx: 90,
					dy: -70,
					color: HEX.me,
					draw: ease.outCubic(seg(t, K.B(20), K.B(20.4)))
				});
				overlays(ctx, K);
				readout(ctx, [["dye", `${(meSt(t, K).dye * 100).toFixed(0)} %`]], { accent: HEX.me });
				look(ctx, K);
			}
		},
		{
			id: "null",
			at: (T) => keys(T).B(21),
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T), t = ctx.t, k = seg(t, K.B(21), K.l7.start);
				reset();
				const C = new Vector3(...ME_C), nrm = new Vector3(-.35, .1, 1).normalize(), tg = new Vector3(nrm.z, 0, -nrm.x).normalize();
				const D = lerp(1.95, 1.85, ease.inOutSine(k)), pos = C.clone().addScaledVector(nrm, D), at = C.clone().addScaledVector(tg, lerp(.84, .8, k));
				const cam = persp(O.cam, pos.toArray(), at.toArray(), {
					fov: 40,
					aspect: ctx.aspect,
					roll: lerp(.03, .05, k)
				});
				drawMe(ctx, K, cam, {
					swarm: {
						focus: Math.sqrt(D * D - ME_R * ME_R),
						aperture: .012,
						maxBlur: 14,
						size: .0024,
						minPx: 1
					},
					brightK: 1.15
				});
				render(ctx, cam);
				const st = panelState(t, K.panel)[4], n = Math.round(st.k * 4), L = ctx.text.scene, sz = 56, style = {
					size: sz,
					align: "left",
					font: "JetBrains Mono"
				};
				L.text("love", 1130, 540, {
					...style,
					weight: 500,
					color: "#8d97ad",
					glow: 6,
					glowColor: "#6b7690"
				});
				L.text("null".slice(0, n), 1331.6, 540, {
					...style,
					weight: 600,
					color: "#7d879c",
					glow: 6,
					glowColor: "#6b7690"
				});
				if (st.typing || n === 0) drawCursor(L, cursorQuad(1130 + sz * .6 * (6 + n) + sz * .3, 563.52, sz / 84), {
					alpha: .85 * (st.typing ? 1 : blinkOn(ctx.T, t)),
					scale: sz / 84
				});
				overlays(ctx, K);
				look(ctx, K, { vignette: .55 });
			}
		},
		{
			id: "init",
			at: (T) => keys(T).l7.start,
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T), t = ctx.t, k = ease.outQuad(seg(t, K.l7.start, K.B(23)));
				reset();
				const cam = persp(O.cam, around(ME_C, lerp(4.1, 3.85, k), 0, .03), [
					.42,
					ME_C[1] - .1,
					0
				], {
					fov: 34,
					aspect: ctx.aspect
				});
				const st = drawMe(ctx, K, cam);
				render(ctx, cam);
				const R = drawInitRing(ctx, cam, st);
				const c = proj(ME_C, cam);
				const w0 = remade(ctx) ? Math.min(K.l7.start, ctx.startOf("intro/init") ?? K.l7.start) : K.l7.start;
				arcText(ctx.text.scene, decodeStr("INITIALIZATION", w0, t, .5), c[0], c[1], R + 74, -Math.PI / 2, {
					size: 50,
					tracking: 12,
					glow: 16
				});
				drawHeHistogram(ctx.text.overlay, O.he, {
					x: 1330,
					y: 470,
					w: 420,
					h: 190,
					k: st.ring * O.he.total,
					alpha: ease.outCubic(seg(t, w0, w0 + .2))
				});
				overlays(ctx, K);
				thinkingLine(ctx, K);
				look(ctx, K);
			}
		},
		{
			id: "wake",
			at: (T) => keys(T).B(23),
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T), t = ctx.t, k = seg(t, K.B(23), K.B(24));
				reset();
				const cam = persp(O.cam, around(ME_C, lerp(2.6, 2.35, ease.outCubic(k)), lerp(-.35, -.45, k), lerp(.18, .24, k)), ME_C, {
					fov: 36,
					aspect: ctx.aspect
				});
				drawBoxEdges(O.lines, {
					extrude: 1,
					color: mul(WHITE, .32),
					width: 2
				});
				shield(t, .07, { color: mixc(SHIELD, COL.me, .5) });
				drawMe(ctx, K, cam, { swarm: {
					focus: 2.4,
					aperture: .01,
					maxBlur: 14
				} });
				const rr = lerp(ME_R * 1.3, 3.2, ease.outCubic(k)), fade = 1 - k;
				O.lines.polyline(circle([
					0,
					ME_C[1] * (1 - k),
					0
				], rr, 120), {
					color: mul(COL.me, 1.4 * fade),
					width: 2.4
				});
				render(ctx, cam);
				overlays(ctx, K);
				readout(ctx, [["init", "100 %"], ["state", "running"]], { accent: HEX.me });
				thinkingLine(ctx, K);
				look(ctx, K);
			}
		},
		{
			id: "unroll",
			at: (T) => keys(T).B(24),
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T), t = ctx.t, k = ease.inOutSine(seg(t, K.B(24), K.B(26)));
				reset();
				const cam = persp(O.cam, [
					lerp(-5.2, -5.9, k),
					lerp(4.1, 4.6, k),
					lerp(-6.4, -7.2, k)
				], [
					lerp(3.5, 4.5, k),
					.2,
					lerp(6, 7.5, k)
				], {
					fov: 44,
					aspect: ctx.aspect
				});
				cursor3D(ctx, K, .6);
				drawBoxEdges(O.lines, {
					extrude: 1,
					color: mul(WHITE, .45),
					width: 2.2
				});
				shield(t, .1, { color: mixc(SHIELD, COL.me, .5) });
				drawMe(ctx, K, cam);
				const w = drawWorld(ctx, K, cam);
				render(ctx, cam);
				overlays(ctx, K);
				readout(ctx, [["world", `r ${w.front.toFixed(2)}`], ["grid", "1 / 4"]], { accent: HEX.me });
				if (remade(ctx)) titlePrompt(ctx, K);
				look(ctx, K);
			}
		},
		{
			id: "terrain",
			at: (T) => keys(T).B(26),
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T), t = ctx.t, k = ease.inOutSine(seg(t, K.B(26), K.B(28)));
				reset();
				const cam = persp(O.cam, around([
					0,
					1,
					0
				], lerp(9, 15, k), lerp(2.3, 2.1, k), lerp(.14, .4, k)), [
					0,
					lerp(1.4, 2.2, k),
					0
				], {
					fov: 44,
					aspect: ctx.aspect
				});
				drawBoxEdges(O.lines, {
					extrude: 1,
					color: mul(WHITE, .5),
					width: 2.2
				});
				shield(t, .22, { color: mixc(SHIELD, COL.me, .5) });
				drawMe(ctx, K, cam);
				drawWorld(ctx, K, cam);
				render(ctx, cam);
				overlays(ctx, K);
				readout(ctx, [["terrain", "Σ sin · cos"], ["rise", `${(worldSt(t, K).rise * 100).toFixed(0)} %`]], { accent: HEX.me });
				if (remade(ctx)) titlePrompt(ctx, K);
				look(ctx, K);
			}
		},
		{
			id: "vista",
			at: (T) => keys(T).B(28),
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T), t = ctx.t, k = ease.outQuad(seg(t, K.B(28), K.l10.start));
				reset();
				const cam = persp(O.cam, around([
					0,
					0,
					0
				], lerp(30, 34, k), lerp(.55, .62, k), lerp(.5, .56, k)), [
					0,
					1,
					0
				], {
					fov: 40,
					aspect: ctx.aspect
				});
				const wipe = ease.inOutSine(seg(t, K.B(28), K.B(28) + .55)), zf = lerp(-WORLD.R - 1, WORLD.R + 1, wipe);
				drawBoxEdges(O.lines, {
					extrude: 1,
					color: mul(WHITE, .6),
					width: 1.8
				});
				shield(t, .3, { color: mixc(SHIELD, COL.me, .5) });
				drawMe(ctx, K, cam, { brightK: 1.4 });
				drawWorld(ctx, K, cam, {
					terrainFade: 120,
					floor: 1 - wipe,
					terrain: 1,
					zMin: zf
				});
				drawCodeWorld(ctx, K, cam, { reveal: (zf + WORLD.R) / (2 * WORLD.R) });
				if (wipe > 0 && wipe < 1) O.lines.segment([
					-WORLD.R,
					.05,
					zf
				], [
					WORLD.R,
					.05,
					zf
				], {
					color: mul(COL.me, 1.2 * Math.sin(Math.PI * wipe)),
					width: 2.2
				});
				render(ctx, cam);
				overlays(ctx, K, { backing: wipe });
				readout(ctx, [["world", "world.js"], ["glyphs", `${O.world.placed}`]], {
					accent: HEX.me,
					alpha: .8 * wipe
				});
				if (remade(ctx)) titlePrompt(ctx, K);
				look(ctx, K);
			}
		},
		{
			id: "simulation",
			at: (T) => keys(T).l10.start,
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T), t = ctx.t;
				reset();
				const RM = remade(ctx), pull = ease.outCubic(seg(t, K.l10.start, K.B(31) + .05));
				const fall = RM ? ease.inCubic(seg(t, K.B(30.9), K.B(31.42))) : ease.inCubic(seg(t, K.B(31) - .02, K.B(31.8)));
				const dist = 108 * Math.pow(380 / 108, pull) * Math.pow(60, fall), tgt = [
					0,
					WORLD.H * .47,
					0
				];
				const cam = persp(O.cam, around(tgt, dist, lerp(.3, .6, pull), lerp(.2, .36, pull)), tgt, {
					fov: 40,
					aspect: ctx.aspect,
					far: 6e4
				});
				const vis = 1 - ease.inCubic(RM ? seg(t, K.B(31.1), K.B(31.42)) : seg(t, K.B(31), K.B(31.75)));
				if (RM) {
					const c = promptCursor(LINE_R.TEXT.length), s = ctx.W / 1920;
					cam.setViewOffset(ctx.W, ctx.H, -(c[0] - 960) * fall * s, -(c[1] - 540) * fall * s, ctx.W, ctx.H);
				}
				if (vis > .01) {
					drawBoxEdges(O.lines, {
						extrude: 1,
						color: mul(WHITE, .6 * vis),
						width: 1.6
					});
					drawMe(ctx, K, cam, { brightK: 1.6 * vis });
					drawCodeWorld(ctx, K, cam, { bright: vis });
				}
				O.glass.userData.set({
					reveal: 1.3,
					pulse: -1,
					intensity: .55 * vis,
					color: [
						.55,
						.88,
						1
					],
					t,
					fres: 1.2,
					center: [
						0,
						0,
						0
					]
				});
				drawBoxEdges(O.lines, {
					S: WORLD.R,
					H: WORLD.H,
					extrude: 1,
					color: mul(COL.me, 1.1 * vis),
					width: 2,
					corner: 1.4 * vis
				});
				render(ctx, cam);
				if (RM) cam.clearViewOffset();
				const R = WORLD.R, y0 = WORLD.H * .42, y1 = WORLD.H * .58, q = [
					[
						-R * .8,
						y1,
						R
					],
					[
						R * .8,
						y1,
						R
					],
					[
						-R * .8,
						y0,
						R
					]
				].map((p) => proj(p, cam));
				if (inFront(q) && !remade(ctx)) faceText(ctx.text.scene, decodeStr("SIMULATION", K.l10.start, t, .4), q, {
					full: "SIMULATION",
					size: 100,
					color: HEX.white,
					glow: 16,
					glowColor: HEX.me,
					alpha: vis
				});
				const ca = ease.outCubic(seg(t, K.B(31) + .08, K.B(31.4)));
				if (!remade(ctx)) drawCursor(ctx.text.scene, cursorQuad(), { alpha: ca });
				else titlePrompt(ctx, K);
				overlays(ctx, K, {
					frame: vis,
					console: vis
				});
				look(ctx, K);
				const g = seg(t, K.B(31), K.B(31.75));
				for (const key of Object.keys(CURSOR_LOOK)) if (typeof CURSOR_LOOK[key] === "number") ctx.post[key] = lerp(ctx.post[key], CURSOR_LOOK[key], g);
			}
		}
	]
});
/**
* docs/REMAKE.md §4 A, §12.9. From the last word of L8 the official code's line for these words,
* `world.startSimulation();` (title/code.js LINE_R), is typed in a Claude Code prompt box under the world, with the
* words sung as it appears (intro/title-keys.js): `world` with "world", the dot on the first beat of bar 8, `start`
* with "begin", `Simulation();` with SIMULATION. The box has the terminal's dark behind it, so the line reads over the
* world, and it stays where it is, at its size (PROMPT_R), to the end: in the drum rest the world falls into the
* cursor at the end of the line as its last keys are struck (the simulation shot). Enter half a beat before inst1
* (beat 31.5): the box drops a line, `✻ Executing…` thinks for half a beat, and on 15.07 s the line explodes
* (title/execute, whose first camera sees it right there). Drawn on the scene text layer, in the typed line's colours.
* (Until the fifth round the line was the title, `world.execute(me);`, which the big title repeated seconds later; it
* is the program's last line, and is typed at the film's end. In the fourth the box came up to the middle of the
* frame, growing, in the drum rest.)
*/
var TITLE = LINE_R.TEXT;
var NC = LINE_R.NCELL;
var TITLE_COL = {
	white: "#f3f7ff",
	dim: "#a8b1c4",
	blue: "#98bdff",
	cyan: HEX.me
};
/** The middle of the cursor bar under cell i of the line in the prompt box (design px). */
var promptCursor = (i) => [960 + (i + .5 - NC / 2) * .6 * PROMPT_R.em, PROMPT_R.base + .15 * PROMPT_R.em];
function titleSchedule(K) {
	if (K.title) return K.title;
	const w = K.l8.words[K.l8.words.length - 1].start, begin = K.l9.words.find((x) => x.text === "begin").start;
	return K.title = {
		keys: titleKeys({
			world: w,
			bar8: K.B(28),
			begin,
			sim: K.l10.start,
			enterKey: K.B(31.5),
			beat: K.B(1) - K.B(0)
		}),
		enterKey: K.B(31.5),
		open: w - .12
	};
}
function titlePrompt(ctx, K) {
	const t = ctx.t, TK = titleSchedule(K);
	if (t < TK.open) return;
	const L = ctx.text.scene, n = TK.keys.filter((k) => t >= k).length;
	const e = PROMPT_R.em, cell = .6 * e, base = PROMPT_R.base, x0 = 960 - NC / 2 * cell, g = seg(t, K.B(30.4), K.B(30.9));
	const a = ease.outCubic(seg(t, TK.open, TK.open + .15));
	const sub = ease.outCubic(seg(t, TK.enterKey, TK.enterKey + .08)), dy = sub * 4.35 * e;
	const bx0 = x0 - 2 * e, bx1 = x0 + NC * cell + 1.2 * e, by0 = base - 1.37 * e + dy, by1 = base + .73 * e + dy;
	L.draw((gc, sc) => {
		gc.globalAlpha *= a;
		if ("filter" in gc) gc.filter = `blur(${.4 * e * sc}px)`;
		gc.fillStyle = `rgba(6, 7, 10, ${.96 * (1 - g)})`;
		gc.beginPath();
		gc.roundRect(bx0 - .3 * e, by0 - .3 * e, bx1 - bx0 + .6 * e, by1 - by0 + 1.7 * e, .6 * e);
		gc.fill();
		if ("filter" in gc) gc.filter = "none";
		gc.beginPath();
		gc.roundRect(bx0, by0, bx1 - bx0, by1 - by0, .45 * e);
		gc.globalAlpha *= .85;
		gc.strokeStyle = "#5c6270";
		gc.lineWidth = Math.max(1.2, 1.6 * e / 84);
		gc.stroke();
	});
	const mono = {
		font: "JetBrains Mono",
		weight: 600,
		align: "left",
		size: e
	};
	L.text(">", x0 - 1.2 * e, base - .32 * e + dy, {
		...mono,
		weight: 500,
		color: "#e8e8e8",
		alpha: .8 * a
	});
	L.text("? for shortcuts", bx0 + .8 * e, base + 1.63 * e + dy, {
		...mono,
		weight: 500,
		size: .72 * e,
		color: "#5b606b",
		alpha: a * (1 - sub)
	});
	for (let i = 0; i < n; i++) {
		const age = t - TK.keys[i], pop = 1 + .12 * Math.exp(-age / .05);
		L.text(TITLE[i], x0 + i * cell + cell * .5, base - .32 * e, {
			...mono,
			align: "center",
			size: e * pop,
			color: TITLE_COL[LINE_R.GROUP_OF[i]],
			glow: 10 * e / 84,
			glowColor: "#cfe0ff",
			alpha: a
		});
	}
	if (t < TK.enterKey) {
		const idle = n >= TITLE.length ? blinkOn(ctx.T, t) : 1, cx = x0 + n * cell;
		L.draw((gc) => {
			gc.globalAlpha *= a * idle;
			gc.fillStyle = "#ffffff";
			gc.shadowColor = "#cfe0ff";
			gc.shadowBlur = 18 * e / 84;
			gc.fillRect(cx, base + .1 * e, cell, .1 * e);
		});
	} else thinking(ctx.text.overlay, x0 - 1.2 * e, base - .32 * e + 2.2 * e, t, {
		T: ctx.T,
		count: { from: 0 },
		verb: "Executing",
		size: .55 * e,
		alpha: ease.outCubic(seg(t, TK.enterKey, TK.enterKey + .06))
	});
}
/**
* The colour morph is a wave over the sphere from the point facing the camera (see drawMe): a particle turns cyan
* when morph passes d = |p − origin| / (2R) · spread. The front is the small circle of points at that chord from the
* origin, i.e. at angle θ = 2 asin(chord / 2R) — drawn as a thin cyan ring sliding over me.
*/
function dyeFront(cam, st) {
	if (st.dye <= 0 || st.dye >= 1) return;
	const chord = clamp((st.dye * 1.02 - .12 / 2) / .88, 0, 1) * 2 * ME_R, th = 2 * Math.asin(clamp(chord / (2 * ME_R)));
	const u = new Vector3().subVectors(cam.position, new Vector3(...ME_C)).normalize();
	const v = new Vector3().crossVectors(u, new Vector3(0, 1, 0)).normalize(), w = new Vector3().crossVectors(u, v);
	const pts = [];
	for (let i = 0; i <= 96; i++) {
		const f = i / 96 * TAU, p = u.clone().multiplyScalar(Math.cos(th)).addScaledVector(v, Math.sin(th) * Math.cos(f)).addScaledVector(w, Math.sin(th) * Math.sin(f)).multiplyScalar(ME_R * 1.004);
		pts.push([
			ME_C[0] + p.x,
			ME_C[1] + p.y,
			ME_C[2] + p.z
		]);
	}
	O.lines.polyline(pts, {
		color: mul(COL.me, 1.5 * Math.sin(Math.PI * clamp(st.dye * 1.3))),
		width: 2.2
	});
}
function drawInitRing(ctx, cam, st) {
	const L = ctx.text.overlay, c = proj(ME_C, cam), e = proj([
		ME_C[0] + ME_R,
		ME_C[1],
		ME_C[2]
	], cam), R = Math.hypot(e[0] - c[0], e[1] - c[1]) * 1.42;
	const n = 120, on = Math.floor(st.ring * n + 1e-6);
	L.draw((g) => {
		for (let i = 0; i < n; i++) {
			const a = -Math.PI / 2 + i / n * TAU, lit = i < on, r0 = R, r1 = R + (i % 10 === 0 ? 22 : 12);
			g.globalAlpha = lit ? .95 : .3;
			g.strokeStyle = lit ? HEX.me : HEX.dim;
			g.lineWidth = lit ? 2.6 : 1.3;
			g.beginPath();
			g.moveTo(c[0] + Math.cos(a) * r0, c[1] + Math.sin(a) * r0);
			g.lineTo(c[0] + Math.cos(a) * r1, c[1] + Math.sin(a) * r1);
			g.stroke();
		}
		g.globalAlpha = .45;
		g.strokeStyle = HEX.dim;
		g.lineWidth = 1;
		g.beginPath();
		g.arc(c[0], c[1], R - 9, 0, TAU);
		g.stroke();
		if (st.ring > 0) {
			g.globalAlpha = .9;
			g.strokeStyle = HEX.me;
			g.lineWidth = 2;
			g.beginPath();
			g.arc(c[0], c[1], R - 9, -Math.PI / 2, -Math.PI / 2 + st.ring * TAU);
			g.stroke();
		}
	});
	L.text(`${(st.ring * 100).toFixed(0)} %`, c[0] + R + 40, c[1] + 6, {
		size: 24,
		weight: 600,
		align: "left",
		color: st.ring >= 1 ? HEX.me : HGREY
	});
	return R;
}
/**
* docs/REMAKE.md §12.7 item 1. The five solids are pieces of black glass (intro/obsidian.js): flat faces parted by one
* hard light from above, the sandbox mirrored in them, the wireframe kept as the highlight on their edges. Each falls
* under a heavy gravity and lands on its drum hit (intro/landing.js): a shock runs out over the floor's dots to the
* shield, which ripples where it meets it and keeps it in; dust is thrown up; the camera standing on the floor jolts
* for two or three frames (intro/quake.js). Every landing is seen from the floor, the piece large and left of centre
* (the five land in the same place in the frame) and the next one falling in on the right; the read-out adds the
* solid's element in Plato's Timaeus. OBJECT CREATION: the faces decompile into glyph cells while the characters of
* the solids' source leave from them and spell the words.
*/
var ENV_LAND = [.3, 1.2];
var LANDR = {
	tetra: {
		r: .8,
		az: -.36,
		azD: .06
	},
	cube: {
		r: .74,
		az: -.3,
		azD: -.05
	},
	octa: {
		r: .74,
		az: -.1,
		azD: .05
	},
	dodeca: {
		r: .9,
		az: -.34,
		azD: -.05
	}
};
var AIM = {
	eye: .075,
	fov: 36,
	yaw: .2,
	pitch: -.025
};
var READ_LOW = { y: 790 };
var RIPPLE = {
	flare: 12,
	push: .035
};
function initRemake(cal) {
	const pieces = makePieces(O.place, {
		traces: tracesTexture(O.net),
		traceR: 1.6
	});
	const dots = floorDots({ side: 128 }), shieldR = shieldRipple({
		S: SB.S,
		H: SB.H,
		cell: .24
	});
	O.R = {
		pieces,
		dots,
		shield: shieldR,
		all: [
			...pieces,
			dots,
			shieldR
		],
		h: O.place.map((p) => Math.max(...p.solid.V.map((v) => new Vector3(...v).applyMatrix4(p.M).y)))
	};
	O.tex.wFaces = O.word.layout("intro/word-faces", (N) => onPlaced(cal, (n) => faceCloud(n, O.place), N));
	const from = faceCloud(cal.placed, O.place), g = O.word.glyphTex.image.data, d = new Float32Array(g.length);
	const lum = MONO_SYNTAX.map((c) => .2126 * c[0] + .7152 * c[1] + .0722 * c[2]);
	for (let i = 0; i < O.word.N; i++) d.set([
		g[i * 4],
		i < cal.placed ? Math.round(from[i * 4 + 3] * 5 - .5) : 5,
		g[i * 4 + 2] * lum[g[i * 4 + 1]],
		0
	], i * 4);
	O.tex.wPieceG = dataTexture(d, O.word.S, O.word.S);
	O.scene.add(...O.R.all);
}
/** OBJECT CREATION starts on its cut (the sung onset), which the edit may put before the aligned start of the line. */
var creationAt = (ctx, K) => Math.min(K.l5.start, ctx.startOf?.("intro/creation") ?? K.l5.start);
function wordStR(t, K, c0) {
	const w = K.word;
	return {
		on: t >= c0 && t < w.end,
		m1: ease.inOutCubic(seg(t, c0, w.m1[1])),
		m2: ease.inCubic(seg(t, w.m2[0], w.m2[1])),
		stage2: t >= w.m2[0]
	};
}
/** A piece at t: its fall and landing, the flash of the impact, and (from c0) its faces decompiling, its edges going last. */
function solidStR(i, t, K, c0 = K.l5.start) {
	const f = fall(t, K.land[i], {
		h: DROP,
		turn: IMPACT[ORDER[i]].turn
	});
	const dis = ease.inOutSine(seg(t, c0 - .02, c0 + .34)), edge = 1 - ease.inQuad(seg(t, c0 + .06, c0 + .36));
	return {
		...f,
		shown: f.shown && t >= K.l2.start && edge > 0,
		tip: f.tremble ?? 0,
		flash: f.s >= 0 ? Math.exp(-f.s / .09) : 0,
		dis,
		edge
	};
}
/**
* The impacts under way: their fronts on the floor, where those meet the shield, and the camera's jolt (frame heights).
* (Each carries its piece's element: the colour it lights the floor's dots and the shield in.)
*/
function quakeR(t, K) {
	const fronts = [], shields = [], L = live(t, K.land, 1.4);
	let j = 0;
	for (const { i, s } of L) {
		const p = IMPACT[ORDER[i]], f = front(s, { amp: p.ring }), w = shieldWave(s), col = elementOf(i).lin;
		if (f) fronts.push({
			x: ROW_X[i],
			z: ROW_Z,
			r: f.r,
			amp: f.amp,
			w: f.w,
			ripples: p.ripples,
			col
		});
		if (w) shields.push({
			x: ROW_X[i],
			y: 0,
			z: ROW_Z,
			r: w.r,
			k: w.k,
			w: w.w,
			col
		});
		j += jolt(s, p.jolt);
	}
	return {
		fronts,
		shields,
		jolt: j
	};
}
/**
* A piece's light in its element's colour (intro/palette.js): the glass's bevel and decompiling cells, what it mirrors
* of the sandbox (the amber shield and copper, its own landing's rings), its edges, and its vertices a little whiter.
*/
var pieceLook = (i) => ({
	rim: mul(elementOf(i).lin, 1.15),
	envRing: elementOf(i).lin,
	envHex: mul(POWER.amber, 1.25),
	envTrace: mul(POWER.amber, 1.4)
});
function pieceEdges(i, P, o) {
	const e = elementOf(i).lin, w = o.width ?? 2.6;
	drawSolid(O.lines, O.place[i].solid, P, {
		color: mul(e, o.k),
		width: w,
		dots: 0,
		dof: o.dof
	});
	if (o.dots > 0) for (const p of P) dofDot(O.lines, p, {
		color: mul(mixc(e, [
			1,
			1,
			1
		], .45), o.dots),
		width: w * 3
	}, o.dof);
}
function drawSolidsR(ctx, K, o = {}) {
	const t = ctx.t, c0 = o.c0 ?? K.l5.start, fx = o.fx ?? quakeR(t, K), env = o.env ?? ENV_LAND, out = [];
	const ring = fx.fronts.map((f) => [
		f.x,
		f.z,
		f.r,
		f.amp
	]), ringW = fx.fronts.map((f) => [
		f.w,
		0,
		0,
		0
	]);
	for (let i = 0; i < 5; i++) {
		const st = solidStR(i, t, K, c0), p = O.place[i], { F, P } = posePiece(p, {
			dy: st.dy,
			spin: st.spin,
			tip: st.tip
		}), c = [
			ROW_X[i],
			0,
			ROW_Z
		];
		out.push({
			st,
			P,
			c
		});
		if (!st.shown) continue;
		const hi = o.highlight?.(i) ?? 0;
		showPiece(O.R.pieces[i], F, {
			alpha: o.alpha ?? 1,
			dis: st.dis,
			seed: i * 3.1,
			flash: .35 * st.flash + .3 * hi,
			ring,
			ringW,
			box: [
				SB.S,
				SB.H,
				env[0],
				env[1]
			],
			...pieceLook(i)
		});
		pieceEdges(i, P, {
			k: (o.bright ?? 1.25) * st.edge * (1 + hi + .9 * st.flash),
			width: o.width ?? 2.6,
			dots: (o.dots ?? 1) * st.edge,
			dof: o.dof
		});
		if (st.falling && st.v > .5) {
			const top = Math.max(...P.map((q) => q[1]));
			for (const q of P) if (q[1] > top - .03) dofSegment(O.lines, [
				q[0],
				q[1] + .02,
				q[2]
			], [
				q[0],
				q[1] + .02 + st.v * .06,
				q[2]
			], {
				color: mul(elementOf(i).lin, .4),
				width: 1.3
			}, o.dof);
		}
	}
	return out;
}
/** The fronts and the dust of the impacts under way, as glow lines (the dots and the shield take the shock themselves). */
function drawQuakeR(K, t, o = {}) {
	for (const { i, s } of live(t, K.land, 1.4)) {
		const p = IMPACT[ORDER[i]], col = elementOf(i).lin;
		drawFront(O.lines, ROW_X[i], ROW_Z, s, {
			ring: { amp: p.ring },
			ripples: p.ripples,
			dof: o.dof,
			bright: o.ring ?? 1.3,
			clip: SB.S,
			color: col
		});
		drawDust(O.lines, ROW_X[i], ROW_Z, s, p.seed, p, {
			dof: o.dof,
			rim: p.rim,
			bright: o.dust ?? 1,
			color: col
		});
	}
}
function floorR(ctx, cam, fx, o = {}) {
	O.R.dots.userData.set({
		bright: o.bright ?? .5,
		size: o.size ?? .006,
		minPx: 1.2,
		color: GREY,
		sparkle: .12,
		t: ctx.t,
		focus: o.focus ?? 5,
		aperture: o.aperture ?? 0,
		maxBlur: o.maxBlur ?? 30,
		clip: SB.S,
		fronts: fx.fronts
	}, cam, ctx.H);
}
/** Look from E toward P, turned right by yaw (radians about the vertical) and up by pitch, so P sits left of centre. */
function aimAt(E, P, yaw, pitch) {
	const d = new Vector3(P[0] - E[0], P[1] - E[1], P[2] - E[2]).applyAxisAngle(new Vector3(0, 1, 0), -yaw);
	d.y += pitch * d.length();
	return [
		E[0] + d.x,
		E[1] + d.y,
		E[2] + d.z
	];
}
/** A camera on the floor, shaken by `j` frame heights (the jolt moves eye and aim together: the picture jumps, it does not tilt). */
function floorCam(ctx, E, look, fov, j) {
	const fh = 2 * Math.hypot(look[0] - E[0], look[1] - E[1], look[2] - E[2]) * Math.tan(MathUtils.degToRad(fov) / 2);
	return persp(O.cam, [
		E[0],
		E[1] + j * fh,
		E[2]
	], [
		look[0],
		look[1] + j * fh,
		look[2]
	], {
		fov,
		aspect: ctx.aspect
	});
}
function landShotR(ctx, s) {
	const K = keys(ctx.T), t = ctx.t, i = s.i, lt = t - K.land[i];
	ORDER[i];
	const so = O.place[i].solid, c = LANDR[s.id];
	reset();
	const fx = quakeR(t, K), r = c.r - lt * .1, az = c.az + lt * c.azD, P = [
		ROW_X[i],
		O.R.h[i] * .5,
		ROW_Z
	];
	const E = [
		P[0] + r * Math.sin(az),
		AIM.eye,
		P[2] + r * Math.cos(az)
	];
	const cam = floorCam(ctx, E, aimAt(E, P, AIM.yaw, AIM.pitch), AIM.fov, fx.jolt);
	const focus = viewDepth(P, cam), dof = dofOf(cam, focus, .016, 24);
	floorR(ctx, cam, fx, s.mode ? {
		bright: .45,
		size: .008
	} : {
		focus,
		aperture: .02,
		maxBlur: 26
	});
	drawNet(ctx, K, {
		widthK: .8,
		tip: 0,
		dof,
		copper: .45
	});
	drawBoxEdges(O.lines, {
		extrude: 1,
		color: mul(WHITE, .5),
		width: 2,
		dof
	});
	if (!s.mode) O.R.shield.userData.set({
		intensity: .17,
		impacts: fx.shields,
		...RIPPLE,
		color: SHIELD_R
	});
	const all = drawSolidsR(ctx, K, {
		dof,
		width: s.mode ? 3.4 : 2.8,
		fx
	});
	drawQuakeR(K, t, { dof });
	if (s.mode) hueDither(ctx, capture(ctx, (sub) => render(sub, cam)), {
		pix: 4,
		gain: 2.2,
		look: false
	});
	else render(ctx, cam);
	const hy = Math.max(...all[i].P.map((p) => p[1])), q = all[i].P.filter((p) => p[1] > hy - .01).map((p) => proj(p, cam)).reduce((m, p) => p[0] > m[0] ? p : m);
	callout(ctx.text.overlay, [q[0], q[1]], so.name, {
		dx: 70,
		dy: -40,
		color: HGREY,
		draw: ease.outCubic(seg(lt, .04, .22))
	});
	overlays(ctx, K, s.mode ? { br: "view  1-bit · bayer 8×8" } : {});
	readoutR(ctx, i, [
		["V − E + F", euler(so)],
		["faces", `${so.nF}`],
		["dihedral", `${so.dihedral.toFixed(2)}°`]
	], READ_LOW);
	look(ctx, K, s.mode ? {
		tonemap: 2,
		bloom: 0,
		ca: 0,
		grain: 0,
		vignette: .15
	} : {});
}
/** The last one falls: from the floor in front of its place, looking up into its fall; it lands on the cut to the top view. */
function icosaFallR(ctx) {
	const K = keys(ctx.T), t = ctx.t, k = ease.outQuad(seg(t, K.B(11.5), K.B(12))), x = ROW_X[4];
	reset();
	const fx = quakeR(t, K);
	const cam = floorCam(ctx, [
		x - lerp(.34, .32, k),
		.07,
		ROW_Z + lerp(.98, .94, k)
	], [
		x + .03,
		lerp(.4, .32, k),
		ROW_Z
	], 38, fx.jolt), focus = viewDepth([
		x,
		.2,
		ROW_Z
	], cam), dof = dofOf(cam, focus, .014, 22);
	floorR(ctx, cam, fx, {
		focus,
		aperture: .018,
		maxBlur: 22
	});
	drawNet(ctx, K, {
		tip: 0,
		dof,
		widthK: .8,
		copper: .45
	});
	drawBoxEdges(O.lines, {
		extrude: 1,
		color: mul(WHITE, .5),
		width: 2,
		dof
	});
	O.R.shield.userData.set({
		intensity: .18,
		impacts: fx.shields,
		...RIPPLE,
		color: SHIELD_R
	});
	drawSolidsR(ctx, K, {
		dof,
		width: 2.6,
		fx
	});
	drawQuakeR(K, t, { dof });
	render(ctx, cam);
	overlays(ctx, K);
	readoutR(ctx, 4, [
		["V − E + F", euler(SOLIDS.icosa)],
		["faces", "20"],
		["dihedral", `${SOLIDS.icosa.dihedral.toFixed(2)}°`]
	], READ_LOW);
	look(ctx, K);
}
/** The row from above on the listing of its source; the icosahedron lands on the cut (its rings follow the front: water). */
function rowR(ctx) {
	const K = keys(ctx.T), t = ctx.t, k = ease.inOutSine(seg(t, K.B(12), K.l5.start));
	reset();
	const fx = quakeR(t, K), H = lerp(1.62, 1.5, k), cam = ortho(O.ocam, [
		0,
		0,
		ROW_Z + fx.jolt * H
	], "top", H, ctx.aspect);
	O.page.points.visible = true;
	O.page.set({
		a: O.tex.page,
		size: PAGE.cell * 1.15,
		minPx: 1.5,
		bright: .15,
		palette: MONO_SYNTAX,
		scroll: [
			0,
			(t - K.B(12)) * .09,
			0
		],
		t
	}, cam, ctx.H);
	const sx = lerp(-1.45, 1.45, ease.inOutSine(seg(t, K.B(12.3), K.l5.start - .05)));
	drawSolidsR(ctx, K, {
		width: 2.6,
		fx,
		env: [.15, .8],
		highlight: (i) => Math.exp(-(((ROW_X[i] - sx) / .16) ** 2)) * .9
	});
	drawQuakeR(K, t, {
		ring: .75,
		dust: .9
	});
	if (t > K.B(12.3) && t < K.l5.start) O.lines.segment([
		sx,
		.5,
		-.14999999999999997
	], [
		sx,
		.5,
		1.05
	], {
		color: mul(WHITE, 1.1),
		width: 2
	});
	render(ctx, cam);
	const L = ctx.text.overlay, cs = ROW_X.map((x) => proj([
		x,
		0,
		.79
	], cam)), al = seg(t, K.B(12.4), K.B(12.9));
	dimLine(L, cs[1], cs[2], "0.500", {
		offset: 28,
		color: HGREY,
		alpha: .8 * al
	});
	dimLine(L, cs[0], cs[4], "2.000", {
		offset: 78,
		color: HGREY,
		alpha: .8 * al
	});
	overlays(ctx, K, {
		br: "view  top · solids.js",
		backing: .8
	});
	readout(ctx, [
		["solids", "5 / 5"],
		["Σ V E F", "50 90 50"],
		["χ", "5 × 2"]
	]);
	look(ctx, K, { vignette: .5 });
}
/** OBJECT CREATION: the faces decompile into glyph cells, the characters leave from them and spell the words. */
function creationR(ctx) {
	const K = keys(ctx.T), t = ctx.t, c0 = creationAt(ctx, K), k = ease.outCubic(seg(t, c0, K.creation));
	reset();
	const tgt = [
		0,
		.95,
		.2
	], cam = persp(O.cam, around(tgt, lerp(3.75, 3.55, k), lerp(-.16, -.12, k), lerp(.15, .12, k)), tgt, {
		fov: 38,
		aspect: ctx.aspect
	});
	drawNet(ctx, K, {
		tip: 0,
		widthK: .6,
		copper: .35
	});
	drawSolidsR(ctx, K, {
		width: 2.4,
		c0,
		env: [.12, .6]
	});
	const ws = wordStR(t, K, c0);
	drawWord(ctx, K, cam, {
		st: ws,
		t0: c0,
		from: O.tex.wFaces,
		...wordColours(t, K)
	});
	render(ctx, cam);
	overlays(ctx, K);
	readout(ctx, [["decompile", "solids.js"], ["glyphs", `${Math.round(O.wordPlaced * ws.m1)} / ${O.wordPlaced}`]], { y: 860 });
	look(ctx, K);
}
//#endregion
