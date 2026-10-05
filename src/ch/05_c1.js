import { chapter } from "../engine/timeline.js?v=vYBbdLfo";
import { TAU, clamp, ease, hash2, lerp, seg } from "../engine/math.js?v=BJIlRm7-";
import { HEX } from "../theme.js?v=Bj33PIbo";
import { remade } from "../lib/published.js?v=aV_CU5HV";
import { OrthographicCamera, Scene, Vector3 } from "../../vendor/three/build/three.core.js?v=q9f7JKE-";
import { Swarm } from "../engine/swarm.js?v=DTFpJa7B";
import { GlowLines } from "../engine/lines.js?v=B_AAaaTO";
import { rig } from "../engine/rig.js?v=39-joEtk";
import { consoleLog, newCamera } from "../lib/look.js?v=BfOqFF7i";
import { gridPlane } from "../lib/env.js?v=CIN_DqPv";
import { callout, frame, readout, scope, toDesign, viewportFrame } from "../lib/hud.js?v=BgmSZjmG";
import { GlyphField, source } from "../lib/glyphs.js?v=DWbHICXG";
import { capture, view } from "../lib/modes.js?v=Cu3GYO-2";
import { thinking } from "../lib/claude.js?v=DXDs_lIL";
import { alongPolylines, shapes } from "../engine/shapes.js?v=BFh0PgdI";
import { aim, around, blueprint } from "./c1/view.js?v=BxrQZln-";
import { PAL, mixc } from "./c1/palette.js?v=saiYSP4J";
import { NET, NetGPU, layerY, makeHeatPlane, netUniformValues, nodeId, nodePos } from "./c1/network.js?v=D20u632s";
import { buildTraj, drawDuoLines, duoKeys, duoState, duoUniforms, makeDuo, pairCam } from "./pre1/duo.js?v=BqkwC8i9";
import { ATT_EDGES, ATT_EDGES_DOWN, HEADS, TOKENS, attnState, drawAttn, makeAttnPlane, rowEnd } from "./c1/transformer.js?v=CeuMdNbe";
import { REW, drawAxes, drawReward, emaPolyline, plotX, plotY, rewardRun, sampleAt } from "./c1/reward.js?v=B_534TP8";
import { drawGauge, drawHalo, gaugeNumbers, gaugePoint } from "./c1/gauge.js?v=TrScagBk";
import { WALL, barPos, barProgress, makeWall } from "./c1/threadwall.js?v=BH5BYt4a";
import { CITY_R, City } from "./c1/city.js?v=DLNvyFdP";
import { BOX, boxEdges, makeArray, pressedShape, setArray } from "./c1/sandbox.js?v=CzLcnsWa";
import { banner, calligram, planeLayout, ppoLog, preferenceLog, wordMask } from "./c1/codeviz.js?v=BQglTbOj";
//#region src/ch/05_c1.js
var P1 = PAL.c1;
var PAPER = [
	.93,
	.92,
	.88
];
var INK = {
	text: "#15171c",
	dim: "#5a6070",
	accent: "#1d5f86",
	warm: "#9a4a12"
};
var O = null;
var KC = [null, null];
/** ctx: given by the draws (not by the shots' `at`): in the remake the key-word times follow the edit. */
function keys(T, ctx = null) {
	const remake = remade(ctx);
	if (KC[+remake]?.T === T) return KC[+remake];
	const s0 = T.section("c1").start, b0 = Math.round(T.beatAt(s0));
	const B = (k) => T.beatTime(b0 + k), L = (s) => T.findLine(s), beat = B(1) - B(0);
	const hit = (id, aligned) => remake ? ctx.startOf(`c1/${id}`) ?? aligned : aligned;
	const lStim = L("STIMULATIONS"), l32 = T.line(lStim.i - 2), l33 = T.line(lStim.i - 1), l35 = T.line(lStim.i + 1), l36 = T.line(lStim.i + 2), lSat = T.line(lStim.i + 3);
	const l38 = T.line(lSat.i + 1), l39 = T.line(lSat.i + 2), lExe = T.line(lSat.i + 3), l41 = T.line(lSat.i + 4), l42 = T.line(lSat.i + 5), lSim = T.line(lSat.i + 6);
	const tStim = hit("stimulations", lStim.start), w32 = l32.words, w33 = l33.words;
	const arrive = [
		-1e9,
		w32[0].start,
		w32[1].start,
		w32[2].start,
		w33[3].start,
		w33[4].start,
		w33[5].start,
		w33[6].start,
		tStim,
		tStim + .07,
		tStim + .14,
		tStim + .21
	];
	const repeat = [
		[1, w33[0].start],
		[2, w33[1].start],
		[3, w33[2].start]
	];
	return KC[+remake] = {
		T,
		s0,
		B,
		beat,
		l32,
		l33,
		l35,
		l36,
		l38,
		l39,
		l41,
		l42,
		remake,
		tStim,
		tSat: hit("satisfaction", lSat.start),
		tExe: hit("execution", lExe.start),
		tSim: hit("simulation", lSim.start),
		tI36: l36.words[1].start,
		tBe: l36.words[3].start,
		tOnly: l36.words[5].start,
		tHappy: l38.words[5].start,
		tRun: l39.words[2].start,
		net: {
			arrive,
			repeat,
			tInj: B(1) + .1,
			beat,
			D: beat / 2,
			tStim,
			down: remake
		},
		end: T.section("v2").start,
		dk: duoKeys(T)
	};
}
function reset() {
	for (const o of [
		O.lines.mesh,
		O.floor,
		O.duo.me.points,
		O.duo.you.points,
		...O.heats,
		...O.attn,
		O.curve.points,
		O.gsw.points,
		O.wallPlane,
		O.city.mesh,
		O.pressMe.points,
		O.pressYou.points,
		O.gfWall.points,
		O.gfWord.points,
		O.gfFloor.points
	]) o.visible = false;
	O.lines.begin();
}
function render(ctx, cam) {
	O.lines.mesh.visible = true;
	O.lines.end(ctx);
	ctx.draw(O.scene, cam);
}
function floor(y, intensity = 1, o = {}) {
	O.floor.visible = true;
	O.floor.position.set(0, y, 0);
	O.floor.userData.set({
		intensity,
		fade: o.fade ?? .07,
		reveal: o.reveal ?? 1,
		revealR: o.revealR ?? 60
	});
}
function overlays(ctx, K, extra = {}) {
	const ink = extra.ink;
	frame(ctx.text.overlay, ctx.t, ctx.T, {
		label: "optimise",
		bottomRight: extra.br,
		...ink ? {
			color: INK.dim,
			alpha: .8
		} : {}
	});
	consoleLog(ctx.text.overlay, ctx.T, ctx.t, {
		from: K.s0 - .2,
		...ink ? {
			color: INK.text,
			accent: INK.accent,
			glow: 0
		} : {}
	});
}
function look(ctx, o = {}) {
	Object.assign(ctx.post, {
		bloom: 1.15,
		threshold: .9,
		ca: .25,
		vignette: .42,
		grain: .03,
		exposure: 1.05,
		...o
	});
}
/**
* A designed flash on a keyword onset (lt = time since the hit): a veil of light gone after `dur` seconds, ramped
* linearly in perceived brightness (no grey tail), with exposure and bloom pushed a little longer.
*/
function hit(lt, { veil = .6, col = [
	1,
	.95,
	.88
], dur = .2, expo = .6, bloom = .8 } = {}) {
	if (lt < 0) return {};
	const k = Math.max(0, 1 - lt / dur) ** 2.4, k2 = Math.max(0, 1 - lt / (dur * 1.8)) ** 2;
	return {
		fade: veil * k,
		fadeCol: col,
		exposure: 1.05 + expo * k2,
		bloom: 1.15 + bloom * k2
	};
}
var persp = (ctx, pos, lk, o = {}) => rig.cam(aim(O.persp, pos, lk, {
	aspect: ctx.aspect,
	...o
}), {
	look: lk,
	inset: o.inset
});
var ortho = (ctx, c, dir, h, o = {}) => rig.cam(blueprint(O.ortho, c, dir, h, o.aspect ?? ctx.aspect, o), {
	look: c,
	inset: o.inset
});
var small = (L, s, x, y, o = {}) => L.text(s, x, y, {
	size: o.size ?? 15,
	weight: o.weight ?? 500,
	font: "JetBrains Mono",
	color: o.color ?? HEX.dim,
	align: o.align ?? "left",
	alpha: o.alpha ?? .85,
	rot: o.rot
});
/**
* A wall of text (CODE: a source file of this film; DATA: a generated log) as glyph particles on a vertical plane
* that stands at `pos`, turned by `yaw` about y (its face toward that azimuth). o: key, file | text, w, h (world),
* cell, cols, pageRows, bright, reveal, scroll, focus, aperture, palette.
*/
function textWall(ctx, cam, o, hPx = ctx.H) {
	const gf = O.gfWall;
	gf.points.visible = true;
	gf.text(`c1/text:${o.file ?? o.key}`, o.text ?? source(o.file));
	const lay = gf.layout(`c1/wall:${o.key}`, planeLayout(gf, {
		origin: [
			-(o.w ?? 16) / 2,
			(o.h ?? 10) / 2,
			0
		],
		cell: o.cell ?? .2,
		cols: o.cols ?? 110,
		pageRows: o.pageRows ?? 1e9
	}));
	gf.points.position.set(...o.pos);
	gf.points.rotation.set(0, o.yaw ?? 0, 0);
	gf.set({
		a: lay,
		t: ctx.t,
		size: (o.cell ?? .2) * (o.glyph ?? 1),
		bright: o.bright ?? .15,
		reveal: o.reveal ?? 1.001,
		soft: .01,
		scroll: [
			0,
			o.scroll ?? 0,
			0
		],
		minPx: 2,
		focus: o.focus,
		aperture: o.aperture ?? 0,
		maxBlur: o.maxBlur ?? 24,
		palette: o.palette
	}, cam, hPx);
}
/** The network's own source (transformer.js) on a wall behind the lattice, opposite the camera azimuth az. */
function netWall(ctx, cam, az, o = {}) {
	const d = o.dist ?? 7;
	textWall(ctx, cam, {
		file: "ch/c1/transformer.js",
		key: "netsrc",
		pos: [
			-Math.sin(az) * d,
			1.4,
			-Math.cos(az) * d
		],
		yaw: az,
		w: 17,
		h: 11,
		cell: .19,
		cols: 118,
		pageRows: 58,
		bright: .16,
		...o
	});
}
var NS = null;
function net(t, K) {
	if (NS?.t !== t || NS.K !== K) {
		NS = {
			t,
			K,
			st: attnState(t, K.net)
		};
		O.gpu.update(NS.st);
	}
	return NS.st;
}
function netPhase(t, K) {
	return {
		unwind: ease.inOutCubic(seg(t, K.s0, K.s0 + K.beat * .95)),
		inject: ease.outCubic(seg(t, K.net.tInj - .04, K.net.tInj + .3))
	};
}
function drawNet(ctx, cam, K, o = {}, hPx = ctx.H) {
	const t = ctx.t, st = net(t, K), ph = netPhase(t, K), ds = duoState(t, K.dk, O.tr);
	for (const who of ["me", "you"]) O.duo[who].set({
		t,
		size: o.size ?? (who === "me" ? .0052 : .0058),
		bright: (o.bright ?? .13) * (who === "you" ? 1.5 : 1),
		sparkle: .3,
		focus: o.focus,
		aperture: o.aperture ?? 0,
		maxBlur: o.maxBlur ?? 30,
		u: {
			...duoUniforms(ds, who, P1, ph),
			...netUniformValues(st, P1, {
				only: o.only,
				sparks: o.sparks,
				nodeR: o.nodeR,
				idle: .12
			})
		}
	}, cam, hPx);
	if (ph.unwind < 1) drawDuoLines(O.lines, O.tr, ds, P1, {
		rungs: 1 - ph.unwind,
		trail: 0
	});
	if (o.heat) for (let l = 0; l < NET.L; l++) O.heats[l].userData.set(l, l ? P1 : {
		...P1,
		cold: P1.warm,
		deep: P1.rose.map((c) => c * .5)
	}, o.heat * ph.unwind);
	if (o.edges !== false) drawAttn(O.lines, st, P1, {
		gain: (o.edgeGain ?? 1) * ph.unwind,
		width: o.edgeW ?? 1.4,
		onlyQuery: o.onlyQuery,
		layers: o.layers,
		minW: o.minW,
		cols: o.cols
	});
	if (K.remake && (o.only == null || o.only === 0)) landings(t, K, (o.land ?? 1) * ph.unwind);
	return {
		st,
		ph
	};
}
/** Remake: a token lands on its row of you's layer as it is sung: the row flashes warm from end to end, and fades. */
function landings(t, K, gain = 1) {
	const land = (a, i) => {
		const k = seg(t, a, a + .34);
		if (k <= 0 || k >= 1) return;
		const f = (1 - k) ** 2 * gain;
		O.lines.segment(rowEnd(0, i, -1, .05), rowEnd(0, i, 1, .05), {
			color: P1.warm.map((c) => c * 2.4 * f),
			width: 3 + 8 * f
		});
	};
	K.net.arrive.forEach(land);
	for (const [i, a] of K.net.repeat) land(a, i);
}
/** What each drawn layer is, top to bottom in the remake: me computes downwards and the bottom layer is what you get. */
var BLOCKS = [
	"embed",
	"block 1 · prev token",
	"block 2 · sink",
	"block 3 · → ␣you",
	"block 4 · subword"
];
var blockNames = (K) => K.remake ? [
	"block 4 · subword  → you",
	BLOCKS[3],
	BLOCKS[2],
	BLOCKS[1],
	BLOCKS[0]
] : BLOCKS;
/** Token labels beside the rows of a layer, on whichever end of the rows is further left on screen. */
function tokenLabels(ctx, cam, st, o = {}) {
	const L = ctx.text.overlay, l = o.layer ?? 0;
	for (let i = 0; i < TOKENS.length; i++) {
		const pr = st.present[i];
		if (pr <= .01) continue;
		const a = toDesign(rowEnd(l, i, -1, .12), cam), b = toDesign(rowEnd(l, i, 1, .12), cam), q = a[0] < b[0] ? a : b;
		if (q[2] >= 1) continue;
		const tk = TOKENS[i], you = i === 5;
		L.text(tk.show, q[0] - 8, q[1], {
			size: o.size ?? 16,
			weight: 600,
			font: "JetBrains Mono",
			color: you ? HEX.you : HEX.white,
			align: "right",
			alpha: (o.alpha ?? .85) * pr
		});
		if (o.ids) small(L, String(tk.id), q[0] - 8, q[1] + 16, {
			align: "right",
			size: 14,
			alpha: .5 * pr
		});
	}
}
function netHud(ctx, st) {
	const n = st.present.filter((p) => p > .5).length;
	readout(ctx.text.overlay, 1500, 150, [
		[remade(ctx) ? "to you" : "context", `${n} / 12 tokens`],
		["model", "gpt-2 bpe · 4 blocks"],
		["d", "12 of 768"]
	], { accent: HEX.me });
}
function stimRings(t, K) {
	if (t < K.tStim) return;
	for (let l = 0; l < NET.L; l++) {
		const k = seg(t, K.tStim + l * .04, K.tStim + .9 + l * .04);
		if (k <= 0 || k >= 1) continue;
		const r = lerp(.3, 2.6, ease.outCubic(k)), f = (1 - k) ** 1.5, pts = [];
		for (let i = 0; i <= 96; i++) {
			const a = i / 96 * TAU;
			pts.push([
				Math.cos(a) * r,
				layerY(l),
				Math.sin(a) * r
			]);
		}
		O.lines.polyline(pts, {
			color: P1.hot.map((c) => c * 1.3 * f),
			width: 2 + 3 * f
		});
	}
}
/** STIMULATIONS, tokenised: four byte-pair pieces in tokenizer colours, each with its id, dropping into its row. */
function tokenBlocks(ctx, K, cam) {
	const L = ctx.text.overlay, t = ctx.t, pieces = TOKENS.slice(8), size = 78, st = {
		size,
		weight: 700,
		font: "JetBrains Mono"
	}, tints = [
		"#7ef0ff",
		"#ffb36b",
		"#ff6fa8",
		"#ffd27a"
	], gap = 10;
	const ws = pieces.map((p) => L.measure(p.show, st) + 32);
	let x = 960 - (ws.reduce((a, b) => a + b, 0) + 30) / 2;
	const y = 262, h = size * 1.3;
	pieces.forEach((p, k) => {
		const t0 = K.net.arrive[8 + k], a = ease.outCubic(seg(t, t0, t0 + .1)), pop = ease.outBack(seg(t, t0, t0 + .16), 1.6);
		if (a > 0) {
			const w = ws[k], cx = x + w / 2, yy = y - 18 * (1 - pop);
			L.draw((g) => {
				g.globalAlpha *= a;
				g.fillStyle = tints[k];
				g.globalAlpha *= .22;
				g.beginPath();
				g.roundRect(x, yy - h / 2, w, h, 8);
				g.fill();
				g.globalAlpha /= .22;
				g.strokeStyle = tints[k];
				g.lineWidth = 1.5;
				g.globalAlpha *= .8;
				g.stroke();
			});
			L.text(p.show, cx, yy + 2, {
				...st,
				color: HEX.white,
				align: "center",
				alpha: a,
				glow: 12,
				glowColor: tints[k]
			});
			small(L, String(p.id), cx, yy + h / 2 + 22, {
				align: "center",
				size: 17,
				color: tints[k],
				alpha: .9 * a
			});
			const q = toDesign(rowEnd(0, 8 + k, 1, .1), cam), k2 = ease.inOutCubic(seg(t, t0 + .05, t0 + .3));
			if (k2 > 0 && q[2] < 1) L.draw((g) => {
				g.globalAlpha *= .5 * a;
				g.strokeStyle = tints[k];
				g.lineWidth = 1.2;
				g.setLineDash([4, 5]);
				g.beginPath();
				g.moveTo(cx, yy + h / 2 + 34);
				g.lineTo(lerp(cx, q[0], k2), lerp(yy + h / 2 + 34, q[1], k2));
				g.stroke();
			});
		}
		x += ws[k] + gap;
	});
}
function rewardProg(t, K) {
	return .96 * ease.inOutSine(seg(t, K.l35.start + .03, K.l36.start + .1)) ** .85;
}
function rewardHud(ctx, prog) {
	const r = sampleAt(O.run.ema, prog), steps = Math.round(prog * REW.steps), kl = .02 + .31 * prog ** .8;
	readout(ctx.text.overlay, 1500, 150, [
		["r_φ", r.toFixed(3)],
		["PPO step", steps.toLocaleString("en-US")],
		["KL(π‖π_ref)", kl.toFixed(3)]
	], {
		accent: HEX.me,
		keyW: 150
	});
}
function ppoWall(ctx, cam, prog, o = {}) {
	textWall(ctx, cam, {
		text: O.ppoText,
		key: "ppo",
		pos: [
			-.3,
			-.55,
			-1.2
		],
		w: 9.2,
		h: 5.6,
		cell: .085,
		cols: 150,
		bright: .075,
		reveal: .04 + .96 * prog,
		...o
	});
}
var PLATE = {
	c: [-1.25, -.05],
	h: 3.3
};
var SAT_INK = [
	1,
	.906,
	.722
];
function gaugeVal(t, K) {
	const q = K.beat / 8, left = Math.max(0, Math.ceil((K.tSat - t) / q - 1e-6));
	const v = clamp(100 - left, 0, 100), fresh = t - (K.tSat - left * q);
	const exact = t >= K.tSat ? 100 : v + clamp(fresh / q) * .99;
	return {
		v,
		fresh: t >= K.tSat ? t - K.tSat : fresh,
		exact
	};
}
function gaugeText(ctx, cam, g, K, o = {}) {
	const c = toDesign([
		0,
		0,
		0
	], cam), sat = ctx.t >= K.tSat, L = o.layer ?? ctx.text.scene;
	const s = sat ? "100.00" : g.exact.toFixed(2);
	L.text(`${s}%`, c[0], c[1] - 6, {
		size: o.size ?? 64,
		weight: 700,
		color: o.color ?? (sat ? HEX.white : HEX.you),
		glow: o.glow ?? 16,
		glowColor: HEX.you,
		alpha: o.alpha ?? 1
	});
	small(ctx.text.overlay, remade(ctx) ? "est. satisfaction(you)" : "satisfaction(you)", c[0], c[1] + (o.size ?? 64) * .72, {
		align: "center",
		color: o.sub ?? HEX.you,
		alpha: .75
	});
}
var WALL_T0 = (K) => K.l38.start - .05;
var ROW_DT = (K) => (K.l39.start - .9 - WALL_T0(K)) / WALL.rows;
function wallSet(ctx, cam, K, o = {}) {
	O.wallPlane.userData.set({
		t: ctx.t,
		t0: WALL_T0(K),
		rowDt: ROW_DT(K),
		doneT: K.tExe,
		doneW: .35,
		pal: P1,
		gain: o.gain ?? 1,
		focus: o.focus,
		aperture: o.aperture ?? 0,
		maxBlur: o.maxBlur ?? 18
	}, cam, ctx.H);
}
var wallO = (K) => ({
	t0: WALL_T0(K),
	rowDt: ROW_DT(K)
});
var PB = null;
/** A bar near the middle of the wall whose progress at time t is closest to p (stable: a pure function of the timing). */
function pickBar(K, t, p) {
	if (PB?.K === K && PB.t === t) return PB.bar;
	let best = [24, 48], err = 9;
	for (let c = 18; c < 30; c++) for (let r = 38; r < 58; r++) {
		const e = Math.abs(barProgress(c, r, t, wallO(K)) - p);
		if (e < err) {
			err = e;
			best = [c, r];
		}
	}
	PB = {
		K,
		t,
		bar: best
	};
	return best;
}
function wallHud(ctx, K) {
	const t = ctx.t, rows = clamp(Math.floor((t - WALL_T0(K)) / ROW_DT(K)), 0, WALL.rows);
	const ready = t >= K.l39.start - .2 ? WALL.cols * WALL.rows : Math.floor(Math.max(0, rows - 14) * WALL.cols * .92);
	readout(ctx.text.overlay, 1500, 150, [
		["threads", `${WALL.cols * WALL.rows}`],
		["loading", `${Math.max(0, WALL.cols * WALL.rows - ready)}`],
		["at 99 %", `${ready}`]
	], { accent: HEX.me });
}
/**
* The program thinks while every thread waits at 99 %: the live Claude Code status line (spinning glyph, rotating
* verb, the film's clock and running token count) under the awaited line, on a dark terminal pane.
*/
function thinkingLine(ctx, head) {
	const L = ctx.text.overlay;
	L.draw((g) => {
		g.globalAlpha *= .72;
		g.fillStyle = "#05070b";
		g.beginPath();
		g.roundRect(976, 818, 700, 118, 10);
		g.fill();
	});
	small(L, head, 1e3, 850, {
		color: HEX.white,
		alpha: .85,
		size: 18
	});
	thinking(L, 1e3, 902, ctx.t, {
		T: ctx.T,
		count: { from: 0 },
		size: 24
	});
}
function cityUpdate(ctx, K, o = {}) {
	O.city.update({
		t: ctx.t,
		F: ctx.F,
		riseT: K.tExe,
		pal: P1,
		gain: o.gain ?? 1,
		face: o.face ?? .018,
		edge: o.edge ?? .42
	});
}
/** EXECUTION compiled: the word written in city.js (a calligram facing the low camera), then raining onto the ground. */
var EXE_CAM = (lt) => ({
	pos: [
		1.05 - lt * .2,
		.2 + lt * .08,
		3.1 - lt * .5
	],
	look: [
		-.25,
		2.1,
		-1.6
	]
});
var CARPET = {
	origin: [
		-5.9,
		.012,
		-5.4
	],
	cell: .2,
	cols: 98
};
function exeWord(ctx, cam, K, o = {}, hPx = ctx.H) {
	const t = ctx.t, gf = O.gfWord;
	gf.points.visible = true;
	gf.text("c1/city-src", source("ch/c1/city.js"));
	const a = gf.layout("c1/exe-word", () => {
		const c = EXE_CAM(.15), f = new Vector3(...c.look).sub(new Vector3(...c.pos)).normalize();
		const r = f.clone().cross(new Vector3(0, 1, 0)).normalize(), u = r.clone().cross(f);
		const center = new Vector3(...c.pos).addScaledVector(f, 4.6).addScaledVector(u, 1.05);
		return calligram(gf, wordMask("EXECUTION", { rows: 72 }), {
			center: center.toArray(),
			right: r.toArray(),
			down: u.clone().negate().toArray(),
			width: 4.4,
			cell: .062
		})(gf.N);
	});
	const b = gf.layout("c1/exe-carpet", planeLayout(gf, {
		origin: CARPET.origin,
		right: [
			1,
			0,
			0
		],
		down: [
			0,
			0,
			1
		],
		cell: CARPET.cell,
		cols: CARPET.cols
	}));
	const fall = ease.inOutCubic(seg(t, K.tExe + .36, K.tExe + .82)), land = seg(t, K.tExe + .7, K.tExe + 1);
	gf.set({
		a,
		b,
		morph: fall,
		spread: .55,
		arc: 1.4,
		reveal: seg(t, K.tExe, K.tExe + .1) * 1.001,
		soft: .05,
		t,
		size: lerp(.062, .2, fall) * .82,
		minPx: 2,
		bright: (o.bright ?? 1.1) * (1 - .8 * land),
		palette: fall < .5 ? [
			1,
			.88,
			.66
		] : void 0,
		focus: o.focus,
		aperture: o.aperture ?? 0
	}, cam, hPx);
}
/** The city's source code as the ground it stands on, typed out from where the word landed. */
function carpet(ctx, cam, K, o = {}, hPx = ctx.H) {
	const gf = O.gfFloor;
	gf.points.visible = true;
	gf.text("c1/city-src", source("ch/c1/city.js"));
	const lay = gf.layout("c1/carpet", planeLayout(gf, {
		origin: CARPET.origin,
		right: [
			1,
			0,
			0
		],
		down: [
			0,
			0,
			1
		],
		cell: CARPET.cell,
		cols: CARPET.cols
	}));
	gf.set({
		a: lay,
		t: ctx.t,
		size: CARPET.cell,
		bright: o.bright ?? .2,
		reveal: seg(ctx.t, K.tExe + .66, K.tExe + 1.5) * 1.001,
		soft: .04,
		minPx: 2
	}, cam, hPx);
}
function pressed(ctx, cam, o = {}, hPx = ctx.H) {
	const z = BOX.S + .02;
	O.pressMe.points.visible = O.pressYou.points.visible = true;
	O.pressMe.points.position.set(BOX.me[0], BOX.me[1], z);
	O.pressYou.points.position.set(BOX.you[0], BOX.you[1], z);
	O.pressMe.points.scale.setScalar(.95);
	O.pressYou.points.scale.setScalar(.72);
	const common = {
		t: ctx.t,
		size: o.size ?? .012,
		sparkle: .3,
		noise: .004,
		noiseFreq: 2,
		noiseSpeed: .1,
		focus: o.focus,
		aperture: o.aperture ?? 0,
		maxBlur: o.maxBlur ?? 30
	};
	O.pressMe.set({
		...common,
		a: O.tex.pressMe,
		b: O.tex.pressMe,
		morph: .5,
		spread: .9,
		wave: 1,
		waveOrigin: [
			0,
			0,
			0
		],
		bright: o.bright ?? .2,
		colA: P1.cold,
		colB: mixc(P1.cold, P1.white, .45)
	}, cam, hPx);
	O.pressYou.set({
		...common,
		a: O.tex.pressYou,
		b: O.tex.pressYou,
		morph: .5,
		spread: .9,
		wave: 1,
		waveOrigin: [
			0,
			0,
			0
		],
		bright: (o.bright ?? .2) * 2,
		colA: P1.rose,
		colB: P1.warm
	}, cam, hPx);
}
function arrayPass(ctx, cam, o = {}) {
	setArray(O.array, cam, ctx.H, {
		pal: P1,
		...o
	});
	ctx.pass(O.array);
}
/** SIMULATION in text mode: a banner of its own letters laid on the ascii character grid (16 px cells). */
function simBanner(ctx, t0, o = {}) {
	const L = ctx.text.overlay, t = ctx.t, rows = O.banner, cell = 16, cols = rows[0].length;
	const adv = L.measure("M", {
		size: cell,
		weight: 700,
		font: "JetBrains Mono"
	}), x0 = 960 - cols * adv / 2, y0 = (o.y ?? 540) - rows.length * cell / 2;
	const typed = Math.floor(cols * ease.outCubic(seg(t, t0, t0 + .22))), a = o.alpha ?? 1;
	L.draw((g) => {
		g.globalAlpha *= .86 * a;
		g.fillStyle = "#000";
		g.fillRect(x0 - 32, y0 - cell * 1.5, (typed + 4) * adv, (rows.length + 2) * cell);
	});
	rows.forEach((row, r) => L.text(row.slice(0, typed), x0, y0 + r * cell, {
		size: cell,
		weight: 700,
		font: "JetBrains Mono",
		color: HEX.white,
		align: "left",
		alpha: a,
		glow: 10,
		glowColor: HEX.me
	}));
}
chapter({
	id: "c1",
	from: (T) => T.section("c1").start,
	to: (T) => T.section("v2").start,
	init(ctx) {
		const K = keys(ctx.T, ctx);
		O = {
			scene: new Scene(),
			persp: newCamera(38),
			ortho: new OrthographicCamera(-1, 1, 1, -1, .01, 400)
		};
		O.lines = new GlowLines(24e3);
		O.floor = gridPlane({ plane: "xz" });
		O.gpu = new NetGPU({ edges: remade(ctx) ? ATT_EDGES_DOWN : ATT_EDGES });
		O.tr = buildTraj(K.dk);
		O.duo = makeDuo(O.tr, O.gpu);
		O.heats = [
			0,
			1,
			2,
			3,
			4
		].map(() => makeHeatPlane(O.gpu));
		O.attn = [
			0,
			1,
			2,
			3
		].map(() => makeAttnPlane());
		O.attn.forEach((m, h) => {
			m.position.set(100 + h * 4, 0, 0);
			m.scale.setScalar(2.4);
		});
		O.run = rewardRun();
		O.ppoText = ppoLog(O.run);
		O.prefText = preferenceLog();
		O.banner = banner("SIMULATION", 11);
		O.curve = new Swarm({ count: 65536 });
		O.gsw = new Swarm({ count: 65536 });
		O.wallPlane = makeWall();
		O.city = new City();
		O.array = makeArray();
		O.pressMe = new Swarm({ count: 65536 });
		O.pressYou = new Swarm({ count: 16384 });
		O.gfWall = new GlyphField({ count: 16384 });
		O.gfWord = new GlyphField({ count: 4096 });
		O.gfFloor = new GlyphField({ count: 16384 });
		O.tex = {
			ema: O.curve.shape("c1/reward-ema", (N) => alongPolylines(N, [emaPolyline(O.run)], {
				jitter: .012,
				seed: 51
			})),
			ring: O.gsw.shape("c1/gauge-ring", (N) => {
				const out = new Float32Array(N * 4);
				for (let i = 0; i < N; i++) {
					const u = (i + .5) / N, a = 1.25 * Math.PI - u * 1.5 * Math.PI, j = hash2(i, 344) * 2 - 1;
					out.set([
						Math.cos(a) * (.965 + j * .03),
						Math.sin(a) * (.965 + j * .03),
						j * .02,
						u
					], i * 4);
				}
				return out;
			}),
			burst: O.gsw.shape("c1/gauge-burst", (N) => shapes.sphere(N, { r: 2.8 })),
			pressMe: O.pressMe.shape("c1/press-me2", (N) => pressedShape(N, {
				R: 1,
				depth: .5,
				seed: 7
			})),
			pressYou: O.pressYou.shape("c1/press-you2", (N) => pressedShape(N, {
				R: 1,
				depth: .5,
				seed: 9
			}))
		};
		O.scene.add(O.floor, ...O.heats, ...O.attn, O.wallPlane, O.city.mesh, O.gfFloor.points, O.gfWall.points, O.duo.me.points, O.duo.you.points, O.curve.points, O.gsw.points, O.pressMe.points, O.pressYou.points, O.gfWord.points, O.lines.mesh);
	},
	shots: [
		{
			id: "unwind",
			at: (T) => keys(T).s0,
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T, ctx), t = ctx.t, lt = t - K.s0;
				reset();
				const pc = pairCam(t, K.dk), k = ease.inOutCubic(seg(lt, .05, K.beat));
				const cam = persp(ctx, pc.pos.map((v, i) => lerp(v, [
					5.2,
					2.9,
					4.4
				][i], k)), pc.look, { fov: pc.fov });
				netWall(ctx, cam, .85, {
					reveal: ease.inQuad(seg(lt, .1, K.beat * 1.6)) * .35,
					focus: 7,
					aperture: .004
				});
				const { st } = drawNet(ctx, cam, K, { heat: .3 });
				render(ctx, cam);
				tokenLabels(ctx, cam, st, { alpha: seg(lt, .25, .45) });
				readout(ctx.text.overlay, 1500, 150, [["layers", "embed + 4 blocks"], ["nodes", "5 × 12 × 12"]], { accent: HEX.me });
				overlays(ctx, K);
				look(ctx);
			}
		},
		{
			id: "inject",
			at: (T) => keys(T).B(1),
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T, ctx), lt = ctx.t - K.B(1);
				reset();
				const cam = persp(ctx, [
					2.25 - lt * .3,
					.95 - lt * .2,
					2.5
				], [
					0,
					-.12,
					0
				], { fov: 42 });
				netWall(ctx, cam, .73, {
					reveal: .35 + .2 * seg(lt, 0, .55),
					focus: 6.5,
					aperture: .006,
					dist: 6
				});
				const { st } = drawNet(ctx, cam, K, {
					bright: .11,
					heat: .3,
					layers: [0, 0]
				});
				render(ctx, cam);
				let last = 0;
				st.present.forEach((p, i) => {
					if (p > .05) last = i;
				});
				const tk = TOKENS[last], q = toDesign(nodePos(nodeId(0, last, 6)), cam);
				callout(ctx.text.overlay, [q[0], q[1]], remade(ctx) ? `→ you   ${tk.show}` : `${tk.show}  ${tk.id}`, {
					dx: 90,
					dy: -80,
					color: remade(ctx) ? HEX.you : last === 5 ? HEX.you : HEX.white,
					size: remade(ctx) ? 20 : 18
				});
				netHud(ctx, st);
				overlays(ctx, K);
				look(ctx, { vignette: .5 });
			}
		},
		{
			id: "propagate",
			at: (T) => keys(T).l33.start,
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T, ctx), t = ctx.t;
				reset();
				const lt = t - K.l33.start, cam = persp(ctx, around([
					0,
					1.4,
					0
				], 4.8, 1.2 + lt * .15, .2), [
					0,
					1.35,
					0
				], { fov: 44 });
				netWall(ctx, cam, 1.2, {
					reveal: .55 + .25 * seg(lt, 0, .4),
					focus: 4.8,
					aperture: .005
				});
				const { st } = drawNet(ctx, cam, K, {
					bright: .11,
					edgeGain: 1.1,
					heat: .3
				});
				render(ctx, cam);
				const names = blockNames(K);
				for (let l = 0; l < NET.L; l++) {
					const q = toDesign([
						0,
						layerY(l),
						NET.n * NET.sp * .62
					], cam), lit = st.raw[l].some((v) => v > .3);
					small(ctx.text.overlay, names[l], q[0] - 20, q[1], {
						align: "right",
						color: lit ? l ? HEX.me : HEX.you : HEX.dim,
						alpha: lit ? .9 : .5,
						size: 16
					});
				}
				netHud(ctx, st);
				overlays(ctx, K);
				look(ctx, { vignette: .4 });
			}
		},
		{
			id: "nodeMacro",
			at: (T) => keys(T).B(3),
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T, ctx), lt = ctx.t - K.B(3);
				reset();
				const ql = remade(ctx) ? 0 : 1, kl = 1 - ql;
				const q3 = nodePos(nodeId(1, 3, 6)), aimAt = [
					q3[0],
					remade(ctx) ? .31 : .36,
					-.78
				], c = [
					q3[0] + 1.25 - lt * .08,
					(remade(ctx) ? .45 : .5) + lt * .05,
					-.2 - lt * .1
				];
				const cam = persp(ctx, c, aimAt, {
					fov: remade(ctx) ? 49 : 42,
					roll: .05
				});
				const d = Math.hypot(c[0] - q3[0], c[1] - q3[1], c[2] - q3[2]), qn = nodePos(nodeId(ql, 3, 6));
				netWall(ctx, cam, 1.45, {
					reveal: .8,
					focus: 6,
					aperture: .004,
					bright: .12,
					dist: 5
				});
				const { st } = drawNet(ctx, cam, K, {
					focus: d,
					aperture: .012,
					maxBlur: 14,
					size: .0034,
					bright: .08,
					onlyQuery: 3,
					layers: [0, 0],
					edgeGain: 3,
					edgeW: 2,
					minW: .004,
					cols: [6]
				});
				const A = st.attn[0], L = ctx.text.overlay, got = remade(ctx) ? st.present[3] : 1;
				O.lines.segment(qn, qn, {
					color: mixc(P1.warm, P1.hot, .6).map((v) => v * 2.2 * (.25 + .75 * got)),
					width: 16
				});
				for (let j = 0; j <= 3; j++) {
					const p = nodePos(nodeId(kl, j, 6));
					O.lines.segment(p, p, {
						color: P1.cold.map((v) => v * (.5 + 2.4 * A[36 + j])),
						width: 7 + 9 * A[36 + j]
					});
				}
				render(ctx, cam);
				const qq = toDesign(qn, cam);
				callout(L, [qq[0], qq[1]], remade(ctx) ? "you  ←  ␣can" : "query  ␣can", {
					dx: 80,
					dy: remade(ctx) ? 60 : -60,
					color: HEX.you,
					size: remade(ctx) ? 20 : 17,
					...remade(ctx) ? { alpha: .4 + .55 * got } : {}
				});
				for (let j = 0; j <= 3; j++) {
					const q = toDesign(nodePos(nodeId(kl, j, 6)), cam), w = A[36 + j];
					small(L, `${TOKENS[j].show}  ${w.toFixed(2)}`, q[0] + 16, q[1] + (remade(ctx) ? -22 : 22), {
						size: 16,
						color: w > .5 ? HEX.white : HEX.dim,
						alpha: w > .5 ? .95 : .7
					});
				}
				readout(L, 1500, 150, remade(ctx) ? [
					["head", "L4 · H2"],
					["from", "me · block 4"],
					["to", "you"]
				] : [
					["head", "L1 · H3"],
					["pattern", "previous token"],
					["softmax", "Σ = 1.00"]
				], { accent: HEX.me });
				overlays(ctx, K);
				look(ctx, { vignette: .5 });
			}
		},
		{
			id: "tokens",
			at: (T) => keys(T).B(4),
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T, ctx), lt = ctx.t - K.B(4);
				reset();
				const cam = ortho(ctx, [
					-.62,
					layerY(0),
					-.04
				], "top", lerp(3.35, 3.1, ease.outCubic(seg(lt, 0, .5))));
				const { st } = drawNet(ctx, cam, K, {
					only: 0,
					edges: false,
					bright: .1,
					size: .007
				});
				O.heats[0].userData.set(0, {
					...P1,
					cold: P1.warm,
					deep: P1.rose.map((c) => c * .5)
				}, 1);
				render(ctx, cam);
				const L = ctx.text.overlay;
				for (let i = 0; i < TOKENS.length; i++) {
					const q = toDesign(rowEnd(0, i, -1, .16), cam), pr = st.present[i], tk = TOKENS[i], you = i === 5;
					L.text(tk.show, q[0] - 118, q[1], {
						size: 20,
						weight: 600,
						font: "JetBrains Mono",
						color: you ? HEX.you : HEX.white,
						align: "right",
						alpha: .15 + .8 * pr
					});
					small(L, String(tk.id).padStart(5), q[0] - 14, q[1], {
						align: "right",
						size: 16,
						color: you ? HEX.you : HEX.me,
						alpha: .12 + .6 * pr
					});
				}
				const q0 = toDesign(nodePos(nodeId(0, 0, 0)), cam), q1 = toDesign(nodePos(nodeId(0, 0, 11)), cam), qa = toDesign(rowEnd(0, 0, -1, .16), cam);
				small(L, "dim 0", q0[0], q0[1] - 34, {
					align: "center",
					size: 14
				});
				small(L, "dim 11 of 768", q1[0], q1[1] - 34, {
					align: "center",
					size: 14
				});
				small(L, "token", qa[0] - 118, qa[1] - 34, {
					align: "right",
					size: 14
				});
				small(L, "id", qa[0] - 14, qa[1] - 34, {
					align: "right",
					size: 14
				});
				readout(L, 1610, 820, [
					[remade(ctx) ? "received" : "prompt", `${st.present.filter((p) => p > .5).length} tokens`],
					["tokenizer", "gpt-2 bpe"],
					["vocab", "50 257"]
				], { accent: HEX.you });
				overlays(ctx, K, { br: remade(ctx) ? "view  top · orthographic · you" : "view  top · orthographic · embeddings" });
				look(ctx, {
					vignette: .3,
					ca: .08
				});
			}
		},
		{
			id: "thermal",
			at: (T) => keys(T).B(5),
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T, ctx), lt = ctx.t - K.B(5);
				reset();
				const az = -.9 + lt * .25, cam = persp(ctx, around([
					0,
					1.35,
					0
				], 4.7 - lt * .3, az, .16), [
					0,
					1.3,
					0
				], { fov: 42 });
				const tex = capture(ctx, (sub) => {
					netWall(sub, cam, -.9, {
						reveal: 1.001,
						focus: 5.9,
						aperture: .004,
						bright: .09
					});
					drawNet(sub, cam, K, { heat: .35 });
					render(sub, cam);
				});
				look(ctx);
				view(ctx, tex, "thermal", { gain: 1.9 });
				readout(ctx.text.overlay, 1500, 150, [["view", "thermal"], ["scale", "inferno · activation"]], { accent: "#ffb347" });
				overlays(ctx, K);
			}
		},
		{
			id: "stimulations",
			at: (T) => keys(T).tStim,
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T, ctx), t = ctx.t, lt = t - K.tStim;
				reset();
				const cam = persp(ctx, around([
					0,
					1.4,
					0
				], 5.3 + lt * .5, .35 + lt * .12, -.02 + lt * .02), [
					0,
					1.55,
					0
				], { fov: 46 });
				netWall(ctx, cam, .35, {
					reveal: 1.001,
					focus: 5.3,
					aperture: .004,
					bright: .16 + .5 * Math.exp(-lt * 5)
				});
				const { st } = drawNet(ctx, cam, K, {
					edgeGain: 1.2,
					heat: .45,
					bright: .11
				});
				stimRings(t, K);
				render(ctx, cam);
				tokenBlocks(ctx, K, cam);
				readout(ctx.text.overlay, 1500, 820, [["active", `${Math.round(st.act.reduce((a, v) => a + (v > .5), 0))} / 720`], remade(ctx) ? ["to you", "stimulations"] : ["stimulus", "you"]], { accent: HEX.you });
				overlays(ctx, K);
				look(ctx, hit(lt, {
					veil: .5,
					col: [
						.85,
						.95,
						1
					],
					dur: .16,
					expo: .45
				}));
			}
		},
		{
			id: "heads",
			at: (T) => keys(T).B(7),
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T, ctx), t = ctx.t, lt = t - K.B(7);
				reset();
				const st = net(t, K), g = 8, w = 470, h = 600, L = ctx.text.overlay;
				HEADS.forEach((hd, i) => {
					const rect = [
						g + i * 478,
						150,
						w,
						h
					], X = 100 + i * 4, rise = ease.outCubic(seg(lt, i * .04, i * .04 + .3));
					let cam;
					ctx.viewport(rect, (wp, hp) => {
						cam = ortho(ctx, [
							X - .275,
							-.49 - .3 * (1 - rise),
							0
						], "front", 4.4, {
							aspect: wp / hp,
							inset: true
						});
						O.lines.begin();
						O.attn.forEach((m) => {
							m.visible = false;
						});
						O.attn[i].userData.set(i, st.attnNow, P1, (1.15 + .5 * st.stim) * rise, st.stim);
						O.lines.end(ctx).res(wp, hp);
						O.lines.mesh.visible = true;
						ctx.draw(O.scene, cam);
					});
					viewportFrame(L, rect, `L${hd.block} · H${hd.head}   ${hd.name}`, { labelColor: i === 2 ? HEX.you : HEX.me });
					const A = st.attnNow[i];
					let ent = 0, rows = 0, mx = 0;
					for (let r = 0; r < 12; r++) {
						if (st.present[r] <= .5) continue;
						let e = 0;
						for (let c = 0; c <= r; c++) {
							const a = A[r * 12 + c];
							if (a > 1e-6) e -= a * Math.log(a);
							mx = Math.max(mx, a);
						}
						ent += e;
						rows++;
					}
					small(L, `entropy ${(ent / Math.max(1, rows)).toFixed(2)} nats   max ${mx.toFixed(2)}`, rect[0] + 26, rect[1] + rect[3] - 58, {
						size: 16,
						color: i === 2 ? HEX.you : HEX.me,
						alpha: .8 * rise
					});
					small(L, "row = query   col = key   softmax per row", rect[0] + 26, rect[1] + rect[3] - 30, {
						size: 14,
						alpha: .6 * rise
					});
					for (let r = 0; r < 12; r++) {
						const y = 1.2 - (r + .5) * .2, qr = toDesign([
							X - 1.25,
							y,
							0
						], cam, rect), qc = toDesign([
							X - 1.2 + (r + .5) * .2,
							-1.25,
							0
						], cam, rect);
						const tk = TOKENS[r].show, col = r === 5 ? HEX.you : r >= 8 ? HEX.gold : HEX.dim, lab = tk.length > 8 ? tk.slice(0, 7) + "…" : tk;
						small(L, lab, qr[0], qr[1], {
							align: "right",
							size: 14,
							color: col,
							alpha: .85 * rise
						});
						small(L, lab, qc[0], qc[1] + 4, {
							align: "right",
							size: 14,
							color: col,
							alpha: .85 * rise,
							rot: -Math.PI / 3
						});
					}
				});
				consoleLog(L, ctx.T, t, { from: K.s0 - .2 });
				look(ctx, {
					vignette: .2,
					ca: .1
				});
			}
		},
		{
			id: "reward",
			at: (T) => keys(T).l35.start,
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T, ctx), t = ctx.t, prog = rewardProg(t, K);
				reset();
				const cam = ortho(ctx, [
					-.3,
					-.3,
					0
				], "front", 5.2);
				ppoWall(ctx, cam, prog);
				const labels = drawAxes(O.lines, P1, {
					xLabel: "PPO step",
					yLabel: "reward model  r_φ(x, y)"
				});
				drawReward(O.lines, O.run, prog, P1);
				render(ctx, cam);
				for (const [s, p, al] of labels) {
					const q = toDesign(p, cam);
					small(ctx.text.overlay, s, q[0], q[1], {
						align: al,
						size: 15,
						alpha: .75
					});
				}
				rewardHud(ctx, prog);
				overlays(ctx, K, { br: "RLHF · reward model · orthographic" });
				look(ctx, {
					vignette: .3,
					ca: .1
				});
			}
		},
		{
			id: "rewardMacro",
			at: (T) => keys(T).B(9),
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T, ctx), t = ctx.t;
				t - K.B(9);
				const prog = rewardProg(t, K);
				reset();
				const tip = [
					plotX(prog),
					plotY(sampleAt(O.run.ema, prog)),
					0
				];
				const cam = persp(ctx, [
					tip[0] - .55,
					tip[1] + .12,
					.75
				], [
					tip[0] + .05,
					tip[1] - .02,
					0
				], { fov: 36 });
				ppoWall(ctx, cam, prog, {
					focus: 1.9,
					aperture: .02,
					bright: .2
				});
				drawReward(O.lines, O.run, prog, P1, { width: 2.6 });
				O.curve.points.visible = true;
				O.curve.set({
					a: O.tex.ema,
					revealBy: "w",
					reveal: prog,
					t,
					size: .0032,
					bright: .12,
					colA: P1.cold,
					sparkle: .4,
					focus: .93,
					aperture: .016,
					maxBlur: 16
				}, cam, ctx.H);
				render(ctx, cam);
				const q = toDesign(tip, cam), r = sampleAt(O.run.ema, prog);
				callout(ctx.text.overlay, [q[0], q[1]], `r_φ = ${r.toFixed(3)}`, {
					dx: 70,
					dy: -90,
					color: HEX.white,
					size: 17
				});
				rewardHud(ctx, prog);
				overlays(ctx, K);
				look(ctx, { vignette: .55 });
			}
		},
		{
			id: "gauge",
			at: (T) => keys(T).l36.start,
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T, ctx), t = ctx.t, lt = t - K.l36.start, g = gaugeVal(t, K);
				reset();
				const cam = ortho(ctx, [
					0,
					-.05,
					0
				], "front", lerp(2.9, 2.7, ease.inOutSine(seg(lt, 0, .55))));
				drawGauge(O.lines, g.v, P1, { fresh: g.fresh });
				render(ctx, cam);
				for (const [s, p] of gaugeNumbers()) {
					const q = toDesign(p, cam);
					small(ctx.text.overlay, s, q[0], q[1], {
						align: "center",
						size: 15,
						alpha: .65
					});
				}
				gaugeText(ctx, cam, g, K);
				readout(ctx.text.overlay, 1500, 150, [["step", "1 % / 32nd note"], ["target", "100.00 %"]], { accent: HEX.you });
				overlays(ctx, K, { br: "view  front · orthographic" });
				look(ctx, { vignette: .35 });
			}
		},
		{
			id: "gaugeTilt",
			at: (T) => keys(T).tI36,
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T, ctx), t = ctx.t, lt = t - K.tI36, g = gaugeVal(t, K);
				reset();
				const cam = persp(ctx, [
					-1.9 + lt * .4,
					-.7,
					2.1
				], [
					.15,
					.05,
					0
				], { fov: 42 });
				textWall(ctx, cam, {
					text: O.prefText,
					key: "prefs",
					pos: [
						.6,
						.2,
						-2.2
					],
					yaw: -.45,
					w: 7,
					h: 6,
					cell: .15,
					cols: 70,
					bright: .15,
					scroll: lt * .5,
					focus: 3.2,
					aperture: .01
				});
				drawGauge(O.lines, g.v, P1, { fresh: g.fresh });
				O.gsw.points.visible = true;
				O.gsw.set({
					a: O.tex.ring,
					revealBy: "w",
					reveal: g.v / 100,
					t,
					size: .003,
					bright: .05,
					colA: P1.warm,
					sparkle: .8,
					focus: 2.7,
					aperture: .012,
					maxBlur: 12
				}, cam, ctx.H);
				render(ctx, cam);
				gaugeText(ctx, cam, g, K, { size: 52 });
				overlays(ctx, K);
				look(ctx, { vignette: .5 });
			}
		},
		{
			id: "gaugeMacro",
			at: (T) => keys(T).tBe,
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T, ctx), t = ctx.t, g = gaugeVal(t, K);
				reset();
				const ve = g.exact, c = gaugePoint(ve - 7, 1.16), f = gaugePoint(ve + 2, .93);
				const cam = persp(ctx, [
					c[0],
					c[1],
					.2
				], f, {
					fov: 44,
					up: [
						0,
						0,
						1
					]
				});
				drawGauge(O.lines, g.v, P1, { fresh: g.fresh });
				render(ctx, cam);
				const q = toDesign(gaugePoint(g.exact, .8), cam);
				ctx.text.scene.text(`${g.exact.toFixed(2)}%`, q[0] - 170, q[1] - 120, {
					size: 58,
					weight: 700,
					color: HEX.you,
					glow: 16,
					glowColor: HEX.you
				});
				small(ctx.text.overlay, remade(ctx) ? "est. satisfaction(you)" : "satisfaction(you)", q[0] - 170, q[1] - 72, {
					align: "center",
					color: HEX.you,
					alpha: .7
				});
				overlays(ctx, K);
				look(ctx, { vignette: .55 });
			}
		},
		{
			id: "gaugeOnly",
			at: (T) => keys(T).tOnly,
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T, ctx), t = ctx.t, lt = t - K.tOnly, g = gaugeVal(t, K);
				reset();
				const k = remade(ctx) ? ease.inOutSine(seg(t, ctx.startOf("c1/gaugeOnly") ?? K.tOnly, K.tSat)) : 0;
				const cam = remade(ctx) ? persp(ctx, [
					lerp(.75, PLATE.c[0], k),
					lerp(.45, PLATE.c[1], k),
					3.7
				], [
					lerp(0, PLATE.c[0], k),
					lerp(.02, PLATE.c[1], k),
					0
				], {
					fov: lerp(40, 2 * Math.atan(PLATE.h / 2 / 3.7) * 180 / Math.PI, k),
					roll: .05 * (1 - k)
				}) : persp(ctx, [
					.75,
					.45,
					3.7 - lt * .9
				], [
					0,
					.02,
					0
				], {
					fov: 40,
					roll: .05
				});
				drawGauge(O.lines, g.v, P1, { fresh: g.fresh });
				render(ctx, cam);
				gaugeText(ctx, cam, g, K);
				overlays(ctx, K);
				look(ctx, { vignette: .45 });
			}
		},
		{
			id: "satisfaction",
			at: (T) => keys(T).tSat,
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T, ctx), t = ctx.t, lt = t - K.tSat;
				reset();
				const cam = ortho(ctx, [...PLATE.c, 0], "front", PLATE.h - lt * .12);
				const tex = capture(ctx, (sub) => {
					const flash = Math.exp(-lt * 2.2);
					drawGauge(O.lines, 100, P1, {
						fresh: 1,
						flash
					});
					drawHalo(O.lines, seg(lt, 0, .9), P1, { r1: 3 });
					drawHalo(O.lines, seg(lt, .12, 1.1), P1, {
						r1: 2.4,
						gain: .6
					});
					O.gsw.points.visible = true;
					const burst = ease.outCubic(seg(lt, 0, 1.3));
					O.gsw.set({
						a: O.tex.ring,
						b: O.tex.burst,
						morph: burst,
						spread: .5,
						arc: .4,
						t,
						reveal: .35,
						size: .006,
						bright: .16 * (1 - .7 * burst),
						colA: P1.warm,
						colB: P1.rose,
						sparkle: .6
					}, cam, ctx.H);
					render(sub, cam);
				});
				look(ctx);
				if (remade(ctx)) {
					view(ctx, tex, "halftone", {
						pix: 7,
						angle: .52,
						gain: 2.3,
						ink: SAT_INK
					});
					ctx.post.bloom = .4;
					const L = ctx.text.scene, word = "SATISFACTION", st = {
						size: 92,
						weight: 700,
						font: "JetBrains Mono",
						tracking: 10
					};
					const struck = Math.floor(12 * ease.outCubic(seg(lt, 0, .2)) + 1e-6), adv = L.measure("M", st) + 10, x0 = 600 - adv * 12 / 2;
					for (let i = 0; i < struck; i++) L.text(word[i], x0 + adv * (i + .5), 540, {
						...st,
						color: HEX.white,
						align: "center",
						glow: 12,
						glowColor: HEX.you
					});
					gaugeText(ctx, cam, { exact: 100 }, K, { color: HEX.you });
					overlays(ctx, K, { br: "view  halftone · 45 lpi" });
					return;
				}
				view(ctx, tex, "halftone", {
					pix: 7,
					angle: .52,
					gain: 2.3,
					ink: [
						.075,
						.08,
						.095
					],
					paper: PAPER
				});
				ctx.post.vignette = .1;
				const L = ctx.text.overlay, word = "SATISFACTION", st = {
					size: 92,
					weight: 800,
					font: "JetBrains Mono",
					tracking: 10
				};
				const struck = Math.floor(12 * ease.outCubic(seg(lt, 0, .2)) + 1e-6), adv = L.measure("M", st) + 10, x0 = 600 - adv * 12 / 2;
				for (let i = 0; i < struck; i++) L.text(word[i], x0 + adv * (i + .5), 540, {
					...st,
					color: INK.text,
					align: "center",
					alpha: .95
				});
				const c = toDesign([
					0,
					0,
					0
				], cam);
				L.text("100.00%", c[0], c[1] - 6, {
					size: 60,
					weight: 700,
					font: "JetBrains Mono",
					color: INK.warm,
					align: "center"
				});
				small(L, "satisfaction(you)", c[0], c[1] + 42, {
					align: "center",
					color: INK.dim,
					alpha: .9
				});
				overlays(ctx, K, {
					ink: true,
					br: "print  halftone 45 lpi"
				});
			}
		},
		{
			id: "wall",
			at: (T) => keys(T).l38.start,
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T, ctx), lt = ctx.t - K.l38.start;
				reset();
				const z = ease.inOutCubic(seg(lt, .02, .36)), cam = ortho(ctx, [
					lerp(-5.2, 0, z),
					lerp(3.1, 0, z),
					0
				], "front", WALL.h * lerp(.3, 1.02, z));
				wallSet(ctx, cam, K);
				render(ctx, cam);
				wallHud(ctx, K);
				overlays(ctx, K, { br: "view  front · orthographic · 48 × 96 threads" });
				look(ctx, {
					vignette: .3,
					ca: .08
				});
			}
		},
		{
			id: "wallOblique",
			at: (T) => keys(T).B(17),
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T, ctx), lt = ctx.t - K.B(17);
				reset();
				const cam = persp(ctx, [
					9.5 - lt * .8,
					1.2,
					5.2
				], [
					1.2,
					-.4,
					0
				], { fov: 44 });
				wallSet(ctx, cam, K, {
					focus: 7.8,
					aperture: .012,
					maxBlur: 10
				});
				render(ctx, cam);
				wallHud(ctx, K);
				overlays(ctx, K);
				look(ctx, { vignette: .5 });
			}
		},
		{
			id: "barMacro",
			at: (T) => keys(T).B(18),
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T, ctx), t = ctx.t, lt = t - K.B(18);
				reset();
				const bar = pickBar(K, K.B(18) + .2, .45), b = barPos(...bar), e = [
					b[0] - WALL.w / WALL.cols * .44 + WALL.w / WALL.cols * .88 * barProgress(...bar, t, wallO(K)),
					b[1],
					0
				];
				const cam = persp(ctx, [
					e[0] - .16 + lt * .05,
					e[1] + .05,
					.2
				], [
					e[0] + .02,
					e[1],
					0
				], { fov: 40 });
				wallSet(ctx, cam, K, {
					focus: .21,
					aperture: .03,
					maxBlur: 18,
					gain: .6
				});
				render(ctx, cam);
				const q = toDesign([
					b[0] + .11,
					b[1] + .015,
					0
				], cam);
				callout(ctx.text.overlay, [q[0], q[1]], `thread 0x${(bar[1] * 48 + bar[0]).toString(16).toUpperCase().padStart(4, "0")}`, {
					dx: 60,
					dy: -80,
					color: HEX.me,
					size: 17
				});
				overlays(ctx, K);
				look(ctx, { vignette: .55 });
			}
		},
		{
			id: "wallLow",
			at: (T) => keys(T).tHappy,
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T, ctx), lt = ctx.t - K.tHappy;
				reset();
				const cam = persp(ctx, [
					-8.6 + lt * .6,
					2.6,
					.55
				], [
					2,
					.2,
					-.05
				], {
					fov: 46,
					roll: -.06
				});
				wallSet(ctx, cam, K, {
					focus: 5.5,
					aperture: .012,
					maxBlur: 12,
					gain: .75
				});
				render(ctx, cam);
				wallHud(ctx, K);
				overlays(ctx, K);
				look(ctx, { vignette: .5 });
			}
		},
		{
			id: "waiting",
			at: (T) => keys(T).l39.start,
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T, ctx), lt = ctx.t - K.l39.start;
				reset();
				const cam = persp(ctx, [
					1.6,
					.3,
					4.2 - lt * .8
				], [
					.6,
					.1,
					0
				], { fov: 40 });
				wallSet(ctx, cam, K, {
					focus: 4.1,
					aperture: .015,
					maxBlur: 12,
					gain: .45
				});
				render(ctx, cam);
				thinkingLine(ctx, `// ${WALL.cols * WALL.rows} threads at 99 %: ready`);
				wallHud(ctx, K);
				overlays(ctx, K);
				look(ctx, { vignette: .5 });
			}
		},
		{
			id: "waiting2",
			at: (T) => keys(T).tRun,
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T, ctx), t = ctx.t, lt = t - K.tRun;
				reset();
				const b = barPos(20, 40), e = [
					b[0] + .11,
					b[1],
					0
				];
				const cam = persp(ctx, [
					e[0] - .5,
					e[1] - .18,
					.7 - lt * .15
				], [
					e[0],
					e[1],
					0
				], {
					fov: 38,
					roll: -.05
				});
				wallSet(ctx, cam, K, {
					focus: .75,
					aperture: .03,
					maxBlur: 20,
					gain: .32 * (1 - .55 * ease.inQuad(seg(t, K.tExe - .3, K.tExe)))
				});
				render(ctx, cam);
				thinkingLine(ctx, "await Promise.all(threads);");
				overlays(ctx, K);
				look(ctx, { vignette: .55 });
			}
		},
		{
			id: "execution",
			at: (T) => keys(T).tExe,
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T, ctx), lt = ctx.t - K.tExe;
				reset();
				const c = EXE_CAM(lt), cam = persp(ctx, c.pos, c.look, {
					fov: 64,
					roll: -.04
				});
				floor(0, .45, {
					reveal: ease.outCubic(seg(lt, 0, .6)),
					revealR: 14
				});
				cityUpdate(ctx, K);
				exeWord(ctx, cam, K);
				carpet(ctx, cam, K);
				const r = ease.outCubic(seg(lt, 0, 1)) * CITY_R * 1.6, pts = [], beam = Math.exp(-lt * 8);
				for (let i = 0; i <= 128; i++) {
					const a = i / 128 * TAU;
					pts.push([
						Math.cos(a) * r,
						.01,
						Math.sin(a) * r
					]);
				}
				if (lt < 1) O.lines.polyline(pts, {
					color: P1.hot.map((v) => v * 3.2 * (1 - lt) ** 2),
					width: 3 + 5 * (1 - lt)
				});
				O.lines.segment([
					0,
					0,
					0
				], [
					0,
					14,
					0
				], {
					color: P1.hot.map((v) => v * 5 * beam),
					width: 10 + 40 * beam
				});
				render(ctx, cam);
				readout(ctx.text.overlay, 1500, 820, [
					["compile", "city.js"],
					["pillars", "1 600"],
					["source", "mel 0 … 15"]
				], { accent: HEX.you });
				overlays(ctx, K);
				look(ctx, {
					vignette: .45,
					...hit(lt, {
						veil: .85,
						col: [
							1,
							.93,
							.8
						],
						dur: .24,
						expo: .8,
						bloom: 1
					})
				});
			}
		},
		{
			id: "aerial",
			at: (T) => keys(T).B(23),
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T, ctx), t = ctx.t, lt = t - K.B(23);
				reset();
				const cam = persp(ctx, around([
					0,
					0,
					0
				], 12 - lt * .7, .6 + lt * .12, 1.02), [
					0,
					1.7,
					0
				], { fov: 44 });
				cityUpdate(ctx, K, { gain: .75 });
				exeWord(ctx, cam, K);
				carpet(ctx, cam, K);
				render(ctx, cam);
				scope(ctx.text.overlay, ctx.F, t, 1500, 150, 300, 70, { color: HEX.me });
				small(ctx.text.overlay, "mel 0 … 15  (pillar = band, delayed by r / 3.2 s)", 1500, 240, {
					size: 14,
					alpha: .6
				});
				overlays(ctx, K, { br: "view  aerial · ground = city.js" });
				look(ctx, { vignette: .45 });
			}
		},
		{
			id: "sandbox",
			at: (T) => keys(T).l41.start,
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T, ctx), lt = ctx.t - K.l41.start;
				reset();
				const k = ease.inOutCubic(seg(lt, 0, 2 * K.beat));
				const cam = persp(ctx, [
					lerp(2.4, 3.4, k),
					lerp(8.2, 6.6, k),
					lerp(4.4, 22, k)
				], [
					0,
					lerp(.4, 4.4, k),
					0
				], { fov: 46 });
				arrayPass(ctx, cam, {
					city: 0,
					marks: 0,
					fog: .03
				});
				cityUpdate(ctx, K, { gain: .6 });
				carpet(ctx, cam, K, { bright: .14 });
				pressed(ctx, cam, {
					size: .01,
					bright: .16
				});
				render(ctx, cam);
				overlays(ctx, K);
				look(ctx, { vignette: .45 });
			}
		},
		{
			id: "glass",
			at: (T) => keys(T).B(26),
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T, ctx), lt = ctx.t - K.B(26);
				reset();
				const m = [
					(BOX.me[0] + BOX.you[0]) / 2,
					(BOX.me[1] + BOX.you[1]) / 2,
					BOX.S
				], c = [
					m[0] + .15 - lt * .2,
					m[1] + 2.9 - lt * .3,
					BOX.S + 1.45
				];
				const cam = persp(ctx, c, [
					m[0],
					m[1] - .35,
					BOX.S - .7
				], { fov: 40 });
				const fd = Math.hypot(c[0] - m[0], c[1] - m[1], c[2] - m[2]);
				arrayPass(ctx, cam, {
					city: 0,
					marks: 0,
					fog: .16,
					fog0: 5,
					focus: fd,
					aperture: .03,
					gridAll: 0,
					edge: .3,
					glass: .9
				});
				cityUpdate(ctx, K, { gain: .005 });
				pressed(ctx, cam, {
					focus: fd,
					aperture: .02,
					maxBlur: 18,
					size: .0045,
					bright: .085
				});
				for (const [p, R, col] of [[
					BOX.me,
					.8227,
					P1.cold
				], [
					BOX.you,
					.62352,
					P1.warm
				]]) {
					const pts = [];
					for (let i = 0; i <= 96; i++) {
						const a = i / 96 * TAU;
						pts.push([
							p[0] + Math.cos(a) * R,
							p[1] + Math.sin(a) * R,
							BOX.S + .004
						]);
					}
					O.lines.polyline(pts, {
						color: col.map((v) => v * .36),
						width: 1.3
					});
				}
				render(ctx, cam);
				const q = toDesign([
					BOX.you[0] + .75,
					BOX.you[1] - .35,
					BOX.S
				], cam), lw = ctx.text.overlay.measure("sandbox: network disabled", {
					size: 18,
					font: "JetBrains Mono",
					weight: 600
				});
				callout(ctx.text.overlay, [q[0], q[1]], "sandbox: network disabled", {
					dx: Math.min(70, 1800 - lw - q[0]),
					dy: 70,
					color: HEX.white,
					size: 18
				});
				readout(ctx.text.overlay, 1500, 150, [
					["wall", "z = +6.00"],
					["contact", "me · you"],
					["egress", "denied"]
				], { accent: HEX.you });
				overlays(ctx, K);
				look(ctx, { vignette: .5 });
			}
		},
		{
			id: "pullback",
			at: (T) => keys(T).l42.start,
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T, ctx), lt = ctx.t - K.l42.start;
				reset();
				const k = ease.inOutSine(seg(lt, 0, 1)), d = lerp(24, 52, k);
				const cam = persp(ctx, [
					d * .32,
					6 + d * .22,
					d
				], [
					0,
					BOX.y0 - 1,
					0
				], { fov: 44 });
				arrayPass(ctx, cam, {
					city: 1,
					fog: .03,
					gridAll: 0
				});
				cityUpdate(ctx, K);
				pressed(ctx, cam, {
					size: .02,
					bright: .3
				});
				render(ctx, cam);
				overlays(ctx, K);
				look(ctx, { vignette: .45 });
			}
		},
		{
			id: "cell",
			at: (T) => keys(T).B(28),
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T, ctx), lt = ctx.t - K.B(28);
				reset();
				const d = lerp(60, 92, ease.inOutSine(seg(lt, 0, 1)));
				const cam = persp(ctx, [
					d * .5,
					18 + d * .3,
					d * .8
				], [
					0,
					BOX.y0,
					0
				], { fov: 42 });
				arrayPass(ctx, cam, {
					fog: .022,
					gridAll: 0
				});
				cityUpdate(ctx, K);
				pressed(ctx, cam, {
					size: .05,
					bright: .35
				});
				render(ctx, cam);
				const q = toDesign([
					0,
					BOX.y0 + BOX.S + 1,
					0
				], cam);
				callout(ctx.text.overlay, [q[0], q[1]], "sandbox (0, 0, 0)", {
					dx: 70,
					dy: -60,
					color: HEX.me,
					size: 17
				});
				overlays(ctx, K);
				look(ctx, { vignette: .45 });
			}
		},
		{
			id: "simulation",
			at: (T) => keys(T).tSim,
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T, ctx), lt = ctx.t - K.tSim;
				reset();
				const cam = persp(ctx, [
					120 + lt * 6,
					95 + lt * 4,
					210 + lt * 10
				], [
					0,
					0,
					0
				], { fov: 50 });
				const tex = capture(ctx, (sub) => {
					arrayPass(sub, cam, {
						fog: .011,
						skipCity: 0,
						gridAll: 0,
						gain: 1.05,
						edge: .42 * (1 + 1.2 * Math.exp(-lt * 9))
					});
					render(sub, cam);
				});
				look(ctx, { vignette: .5 });
				view(ctx, tex, "ascii", {
					cell: 16,
					tint: [
						.42,
						.92,
						1
					],
					source: .25,
					gain: .75
				});
				simBanner(ctx, K.tSim);
				overlays(ctx, K, { br: "view  text mode · 16 px cells" });
			}
		},
		{
			id: "pushIn",
			at: (T) => keys(T).B(31),
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T, ctx), t = ctx.t, lt = t - K.B(31);
				reset();
				const k = ease.inOutCubic(seg(lt, 0, K.end - K.B(31))), c = [
					BOX.C,
					BOX.y0 + BOX.C,
					BOX.C
				];
				const from = [
					120,
					95,
					210
				], to = [
					c[0] + .6,
					c[1] + .9,
					c[2] + BOX.S - .6
				];
				const cam = persp(ctx, from.map((v, i) => lerp(v, to[i], 1 - (1 - k) ** 2.2)), c.map((v, i) => lerp([
					0,
					0,
					0
				][i], v, ease.outCubic(k * 1.4))), { fov: lerp(50, 62, k) });
				const mix = 1 - ease.inOutSine(seg(lt, .02, .34));
				const settle = ease.inOutSine(seg(t, K.end - .3, K.end));
				const arr = {
					fog: lerp(lerp(.011, .03, k), .16, settle),
					fog0: lerp(0, 4, settle),
					skipCity: 0,
					gridAll: k * (1 - settle),
					marks: 1 - settle,
					city: 1 - settle,
					glass: .6 * (1 - .8 * settle)
				};
				const cellEdges = () => {
					if (settle > 0) {
						const L = O.lines;
						L.mesh.position.set(BOX.C, BOX.C, BOX.C);
						boxEdges(L, [
							1,
							1,
							1
						].map((v) => v * .95 * settle), 2.2);
					}
				};
				if (mix > .001) {
					const tex = capture(ctx, (sub) => {
						arrayPass(sub, cam, arr);
						render(sub, cam);
					});
					look(ctx, { vignette: .5 });
					view(ctx, tex, "ascii", {
						cell: 16,
						tint: [
							.42,
							.92,
							1
						],
						source: .25,
						gain: .75,
						mix,
						look: mix > .5
					});
				} else {
					arrayPass(ctx, cam, arr);
					cellEdges();
					render(ctx, cam);
					O.lines.mesh.position.set(0, 0, 0);
					look(ctx, { vignette: .5 });
				}
				simBanner(ctx, K.tSim, { alpha: 1 - ease.inCubic(seg(lt, 0, .3)) });
				overlays(ctx, K);
			}
		}
	]
});
//#endregion
