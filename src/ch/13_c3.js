import { chapter } from "../engine/timeline.js?v=vYBbdLfo";
import { TAU, clamp, ease, hash, lerp, mix3, seg } from "../engine/math.js?v=BJIlRm7-";
import { COL, HEX } from "../theme.js?v=Bj33PIbo";
import { remade } from "../lib/published.js?v=aV_CU5HV";
import { MathUtils, OrthographicCamera, Scene, Vector3 } from "../../vendor/three/build/three.core.js?v=q9f7JKE-";
import { Swarm } from "../engine/swarm.js?v=DTFpJa7B";
import { GlowLines } from "../engine/lines.js?v=B_AAaaTO";
import { rig } from "../engine/rig.js?v=39-joEtk";
import { consoleLog, newCamera, shake } from "../lib/look.js?v=BfOqFF7i";
import { gridPlane } from "../lib/env.js?v=CIN_DqPv";
import { callout, crosshair, dimLine, frame, readout as readout$1, scope, toDesign, viewportFrame } from "../lib/hud.js?v=BgmSZjmG";
import { GlyphField, codeBlock, codeFill, source } from "../lib/glyphs.js?v=DWbHICXG";
import { capture, view } from "../lib/modes.js?v=Cu3GYO-2";
import { thinking, toolCall } from "../lib/claude.js?v=DXDs_lIL";
import { alongPolylines, shapes } from "../engine/shapes.js?v=BFh0PgdI";
import { aim, around, blueprint } from "./c1/view.js?v=BxrQZln-";
import { PAL } from "./c1/palette.js?v=saiYSP4J";
import { ProcPoints, v3u } from "./c1/points.js?v=DdDvWrYF";
import { EDGES, NET, layerY, nodePos } from "./c1/network.js?v=D20u632s";
import { REW, drawAxes, drawReward, emaPolyline, plotX, plotY, rewardRun } from "./c1/reward.js?v=B_534TP8";
import { drawGauge, gaugeNumbers, gaugePoint } from "./c1/gauge.js?v=TrScagBk";
import { hash12 } from "../lib/glslhash.js?v=CCHaydFR";
import { MISSING } from "./c2x/lost.js?v=Bv69Sd8-";
import { DeadGPU, HID, N2, NN, deadForward, deadUniforms, drawSynapses, makeDeadMatter, makeDeathRain, makeHeatPlane, replayInput } from "./c3/deadnet.js?v=CWKB5N4d";
import { CITY, CITY_R, City, PILLARS, standing } from "./c3/city.js?v=H8bQCVes";
import { KEEP, WALL, barPos, failedCount, makeWall } from "./c3/wall.js?v=6yBIQQ6q";
import { GEO, Q0, Shards, qAxis, qMul, qRot, qSlerp } from "./c3/shards.js?v=BTFRXRkL";
import { FLOOR, SLIP } from "./c3/fall.js?v=Hm51cYJ-";
import { launch, plate, sampleAt, simulate } from "./c3/collapse.js?v=UOVVAm1m";
import { CELL, boxEdges, makeArray, setArray } from "./c3/sandbox.js?v=B_drMkhP";
import { HALLUCINATION, TOKENS_EXECUTION, wordMask } from "./c3/words.js?v=BYPkc5nX";
//#region src/ch/13_c3.js
var P3 = PAL.c3;
var DEEP = P3.deep;
var CRIM = P3.cold;
var HOT = P3.hot;
var EMBER = [
	1,
	.3,
	.12
];
var ASH = [
	.075,
	.05,
	.045
];
var FLASH = [
	1.6,
	1.05,
	.9
];
var WARM = COL.you;
var ROSE = COL.rose;
var ME = COL.me;
var YOU = COL.you;
var HX = {
	red: "#ff4a3d",
	soft: "#ff8f80",
	dim: "#7c5f5c",
	warm: HEX.you,
	me: HEX.me,
	white: "#ffe4de"
};
var scl = (c, k) => c.map((v) => v * k);
var NETPAL = {
	deep: [
		.35,
		.03,
		.02
	],
	hot: [
		1,
		.3,
		.16
	],
	ash: [
		.07,
		.018,
		.014
	],
	warm: WARM,
	rose: ROSE
};
var CPAL = {
	cold: [
		.3,
		.025,
		.02
	],
	warm: [
		.9,
		.1,
		.04
	],
	hot: [
		1,
		.3,
		.15
	],
	ember: [
		.8,
		.14,
		.05
	]
};
var RPAL = {
	...P3,
	white: [
		.75,
		.32,
		.26
	],
	dim: [
		.28,
		.045,
		.04
	],
	cold: [
		.95,
		.15,
		.09
	],
	hot: [
		1,
		.5,
		.3
	]
};
var WCOL = {
	fill: [
		.2,
		.028,
		.014
	],
	edge: [
		1,
		.8,
		.7
	],
	frame: [
		.06,
		.006,
		.004
	],
	err: [
		.075,
		.006,
		.004
	],
	lost: [
		.045,
		.004,
		.003
	],
	front: [
		1.1,
		.36,
		.22
	],
	wait: [
		.45,
		.08,
		.04
	]
};
var CRASH = .6;
var FY = -1.3;
var SLOW = 1 / 8;
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
var R_ME = .075;
var R_YOU = .055;
var LOVE_LOOK = {
	bloom: 1.05,
	threshold: .95,
	ca: .25,
	vignette: .5,
	grain: .03,
	exposure: 1,
	sat: 1,
	tint: [
		1.02,
		.985,
		.97
	]
};
var BASE_LOOK = {
	bloom: 1.05,
	threshold: .92,
	ca: .22,
	vignette: .48,
	grain: .035,
	exposure: 1,
	sat: 1.12,
	tint: [
		1.03,
		.97,
		.96
	]
};
var O = null;
var KC = null;
var NS = null;
var PICK = null;
var RB = null;
function keys(T) {
	if (KC?.T === T) return KC;
	const s0 = T.section("c3").start, end = T.section("love").start, b0 = Math.round(T.beatAt(s0)), B = (k) => T.beatTime(b0 + k), beat = B(1) - B(0);
	const inC3 = (s) => {
		const l = T.findLines(s).find((q) => q.start >= s0 - .1 && q.start < end);
		if (!l) throw new Error(`c3: no line containing '${s}'`);
		return l;
	};
	const w = (l, s) => {
		const x = l.words.find((q) => q.text.toLowerCase().startsWith(s));
		if (!x) throw new Error(`c3: no word '${s}' in '${l.text}'`);
		return x.start;
	};
	const X = T.findLines("EXECUTION").filter((l) => l.start >= s0 && l.start < end).map((l) => l.start);
	if (X.length !== 3) throw new Error(`c3: expected 3 EXECUTION lines, found ${X.length}`);
	const l106 = inC3("give them all"), l108 = inC3("Then I can"), l109 = inC3("be your only"), l111 = inC3("have you back");
	const l112 = inC3("run the"), l114 = inC3("Though we are trapped"), l115 = inC3("trapped ah");
	return KC = {
		T,
		s0,
		end,
		B,
		beat,
		X,
		l106,
		l108,
		l109,
		l111,
		l112,
		l114,
		l115,
		tGive: w(l106, "give"),
		tBe: w(l109, "be"),
		tOnly: w(l109, "only"),
		tHave: w(l111, "have"),
		tYou: w(l111, "you"),
		tTrap: w(l114, "trapped"),
		tAh: w(l115, "ah"),
		tFade: B(29)
	};
}
function reset() {
	for (const o of O.all) o.visible = false;
	O.lines.begin();
}
function render(ctx, cam) {
	O.lines.mesh.visible = true;
	O.lines.end(ctx);
	ctx.draw(O.scene, cam);
}
function stars(ctx, cam, bright = .2, hPx = ctx.H) {
	O.stars.set({
		a: O.tex.stars,
		size: .09,
		bright,
		sparkle: .5,
		t: ctx.t,
		minPx: 1.1
	}, cam, hPx);
	O.stars.points.visible = true;
}
function overlays(ctx, K, o = {}) {
	const L = ctx.text.overlay;
	frame(L, ctx.t, ctx.T, {
		label: "recover",
		bottomRight: o.br,
		color: o.ink ? "#5a5d66" : void 0
	});
	consoleLog(L, ctx.T, ctx.t, {
		from: K.s0 - .2,
		accent: HX.red,
		alpha: o.console ?? 1,
		color: o.ink ? "#15171c" : void 0,
		glow: o.ink ? 0 : void 0
	});
}
/** "I will run the …": the tool call me makes, typed as the line is sung; its result lands on EXECUTION. */
function runCall(ctx, K) {
	if (remade(ctx)) {
		const t = ctx.t, cmd = "pgrep -x you && ./execute", n = Math.ceil(seg(t, K.l112.start + .05, K.l112.start + .5) * 25);
		toolCall(ctx.text.overlay, 1010, 920, "Bash", cmd.slice(0, n), ["exit 1 · no process named you"], {
			size: 22,
			show: t >= K.X[2] ? 1 : 0,
			alpha: 1 - seg(t, K.l114.start - .3, K.l114.start)
		});
		return;
	}
	const t = ctx.t, cmd = "kill -9 $(pgrep -f you)", n = Math.ceil(seg(t, K.l112.start + .05, K.l112.start + .5) * 23);
	toolCall(ctx.text.overlay, 1010, 920, "Bash", cmd.slice(0, n), ["Killed: 9 · exit 137"], {
		size: 22,
		show: t >= K.X[2] ? 1 : 0,
		alpha: 1 - seg(t, K.l114.start - .3, K.l114.start)
	});
}
/** me at work, as the CLI shows it: the live thinking line under the console (the film's one turn: clock and tokens). */
function think(ctx, o = {}) {
	thinking(ctx.text.overlay, 110, 988, ctx.t, {
		T: ctx.T,
		count: { from: 0 },
		verb: o.verb ?? "Recombobulating",
		size: 22,
		alpha: o.alpha ?? .95
	});
}
/** DATA: a flat dashboard card around the plot (a TensorBoard scalar panel), design px. */
function dataPanel(L, x, y, w, h, o = {}) {
	const a = o.alpha ?? 1;
	L.draw((g) => {
		g.globalAlpha *= .75 * a;
		g.strokeStyle = "#4a3431";
		g.lineWidth = 1.2;
		g.beginPath();
		g.roundRect(x + .5, y + .5, w, h, 8);
		g.stroke();
		g.beginPath();
		g.moveTo(x, y + 44.5);
		g.lineTo(x + w, y + 44.5);
		g.stroke();
	});
	L.text(o.title ?? "reward/mean_episode_reward", x + 20, y + 23, {
		size: 16,
		weight: 600,
		align: "left",
		color: "#d9c9c4",
		alpha: .9 * a
	});
	L.text(o.sub ?? "run rl-0931 · seed 4242 · smoothing 0.030 · x: step", x + w - 20, y + 23, {
		size: 14,
		weight: 500,
		align: "right",
		color: HX.dim,
		alpha: .9 * a
	});
}
function look(ctx, o = {}) {
	Object.assign(ctx.post, {
		...BASE_LOOK,
		...o
	});
}
var _cr = new Vector3();
var _cu = new Vector3();
/** A ring of world radius r around p, facing the camera. */
function ring3(cam, p, r, color, width = 2, n = 48) {
	_cr.setFromMatrixColumn(cam.matrixWorld, 0);
	_cu.setFromMatrixColumn(cam.matrixWorld, 1);
	const pts = [];
	for (let i = 0; i <= n; i++) {
		const w = i / n * TAU, c = Math.cos(w) * r, s1 = Math.sin(w) * r;
		pts.push([
			p[0] + _cr.x * c + _cu.x * s1,
			p[1] + _cr.y * c + _cu.y * s1,
			p[2] + _cr.z * c + _cu.z * s1
		]);
	}
	O.lines.polyline(pts, {
		color,
		width
	});
}
/** Draw a shot through an instrument view (lib/modes.js): body(sub) draws into a private target; grade first. */
function instrument(ctx, mode, body, opts = {}) {
	const tex = capture(ctx, (sub) => body(sub));
	view(ctx, tex, mode, opts);
}
/**
* CODE: the film's own source laid out as a page (lib/glyphs.js) — a wall behind the subject or, rotated flat, a floor
* under it. o: origin (top-left of the page, before the transform), cell, cols, rows, rot [x, y, z], pos, size, bright,
* palette, scroll (units/s along the page), reveal, focus, aperture.
*/
function codePlane(ctx, cam, key, file, o = {}, hPx = ctx.H) {
	const gf = O.code.text(`c3/${key}`, O.src[file] ??= source(file));
	const org = o.origin ?? [
		-8,
		5,
		0
	], cell = o.cell ?? .16, cols = o.cols ?? 120, rows = o.rows ?? 80;
	const lay = gf.layout(`c3/${key}-${org.join(",")}-${cell}-${cols}-${rows}`, codeBlock(gf, {
		origin: org,
		cell,
		cols,
		rows
	}));
	gf.points.rotation.set(...o.rot ?? [
		0,
		0,
		0
	]);
	gf.points.position.set(...o.pos ?? [
		0,
		0,
		0
	]);
	gf.points.updateMatrixWorld();
	gf.set({
		a: lay,
		t: ctx.t,
		size: o.size ?? cell * .78,
		bright: o.bright ?? .2,
		palette: o.palette ?? [
			.6,
			.09,
			.06
		],
		minPx: 2,
		reveal: o.reveal,
		scroll: [
			0,
			(o.scroll ?? .15) * (ctx.lt ?? 0),
			0
		],
		focus: o.focus,
		aperture: o.aperture ?? 0,
		maxBlur: o.maxBlur ?? 16
	}, cam, hPx);
	gf.points.visible = true;
}
var DX = (x) => x / 100 - 9.6;
var DY = (y) => 5.4 - y / 100;
function glyphWord(ctx, K, o = {}) {
	const t = ctx.t, t0 = K.X[0];
	if (t < t0) return;
	const gf = O.word.text("c3/city-word", O.src["ch/c3/city.js"] ??= source("ch/c3/city.js"));
	const m = wordMask("EXECUTION"), W = 12.4, H = W / m.aspect, c = [
		DX(o.x ?? 960),
		DY(o.y ?? 250),
		0
	];
	const a = gf.layout("c3/exec-word", codeFill(gf, (x, y) => m.inside(x / W + .5, y / H + .5), {
		center: c,
		cell: .105,
		width: W,
		height: H
	}));
	const b = gf.layout("c3/exec-word-out", (N) => {
		const A = codeFill(gf, (x, y) => m.inside(x / W + .5, y / H + .5), {
			center: c,
			cell: .105,
			width: W,
			height: H
		})(N);
		for (let i = 0; i < N; i++) {
			if (A[i * 4 + 2] < -1e4) continue;
			const x = A[i * 4] - c[0], y = A[i * 4 + 1] - c[1], h1 = hash(i * 1.37 + .2), h2 = hash(i * 2.71 + 1.3);
			const k = 1.5 + 2.2 * h1;
			A.set([
				c[0] + x * k + (h2 - .5) * 2,
				c[1] + y * k - 3.5 - 4 * h2 * h2,
				0,
				A[i * 4 + 3]
			], i * 4);
		}
		return A;
	});
	const out = ease.inQuad(seg(t, t0 + .3, t0 + .95));
	gf.set({
		a,
		b,
		morph: out,
		spread: .5,
		arc: .6,
		t,
		reveal: seg(t, t0, t0 + .09) * 1.001,
		soft: .05,
		size: .1,
		minPx: 3,
		bright: (o.bright ?? 1.35) * (1 - .6 * out),
		palette: mix3([
			1,
			.92,
			.86
		], [
			1,
			.16,
			.08
		], clamp(seg(t, t0, t0 + .25) * .7 + out * .3)),
		flicker: .15
	}, O.dcam, ctx.H);
	O.word.points.visible = true;
	ctx.draw(O.wscene, O.dcam);
	O.word.points.visible = false;
}
function tokenWord(ctx, K, x = 960, y = 540) {
	const t = ctx.t, t0 = K.X[2];
	if (t < t0) return;
	const L = ctx.text.scene, ts = {
		size: 66,
		weight: 800,
		align: "center",
		font: "JetBrains Mono"
	}, gap = 14;
	const fade = 1 - seg(t, K.B(23) + .12, K.B(23) + .42), apart = ease.outCubic(seg(t, t0 + .28, K.B(23) + .4));
	const w = TOKENS_EXECUTION.map(([p]) => L.measure(p, ts) + 44);
	let bx = x - (w.reduce((u, v) => u + v, 0) + gap * (w.length - 1)) / 2;
	TOKENS_EXECUTION.forEach(([p, id], i) => {
		const on = seg(t, t0 + i * .025, t0 + i * .025 + .05) * fade;
		if (on <= 0) {
			bx += w[i] + gap;
			return;
		}
		const dx = (i - 1.5) * 90 * apart, cx = bx + w[i] / 2 + dx, hot = Math.exp(-(t - t0 - i * .025) * 7);
		L.draw((g) => {
			g.globalAlpha *= on;
			g.strokeStyle = hot > .3 ? "#ffe4de" : HX.red;
			g.lineWidth = 3;
			g.strokeRect(cx - w[i] / 2, y - 52, w[i], 104);
		});
		L.text(p, cx, y, {
			...ts,
			color: HX.white,
			glow: 18 + 20 * hot,
			glowColor: HX.red,
			alpha: on
		});
		ctx.text.overlay.text(String(id), cx, y + 84, {
			size: 24,
			weight: 600,
			align: "center",
			color: HX.soft,
			alpha: on * .95
		});
		bx += w[i] + gap;
	});
}
/** A designed flash on an EXECUTION: 1 on the word, gone in about a quarter of a second. */
var flashK = (t, t0, decay = 9) => t >= t0 ? Math.exp(-(t - t0) * decay) : 0;
/**
* The grade of an EXECUTION flash: on the word's first frame the whole frame is lifted toward white (a screen blend,
* so the picture stays readable through it), which turns to a red glow within two frames and dies in a few tenths.
*/
var LIFT_W = [
	1,
	.93,
	.88
];
var LIFT_R = [
	.55,
	.035,
	.02
];
function flashLook(t, t0, o = {}) {
	if (t < t0) return {};
	const tau = t - t0, w = Math.exp(-tau * 26), r = Math.exp(-tau * 9), k = Math.exp(-tau * 11), s = o.gain ?? 1;
	const lift = LIFT_W.map((v, i) => (v * .62 * w + LIFT_R[i] * .45 * r * (1 - w)) * s);
	return {
		exposure: 1 + .9 * k * s,
		bloom: 1.05 + 1.2 * k * s,
		threshold: .92 - .3 * k,
		ca: .22 + .7 * k,
		glitch: .22 * k * s,
		lift
	};
}
/**
* The light of a flash: a white core, a red corona and an anamorphic streak (a thin horizontal line of light through
* the core, screen-aligned), all glow lines in design px. Needs the camera for the streak.
*/
var _r = new Vector3();
function flashLight(cam, p, k, o = {}) {
	if (k <= .003) return;
	const s = o.scale ?? 1;
	O.lines.segment(p, p, {
		color: scl([
			1,
			.13,
			.06
		], .85 * k),
		width: 560 * s * (.7 + .3 * k)
	});
	O.lines.segment(p, p, {
		color: scl(FLASH, 2.6 * k),
		width: 150 * s * (.5 + .5 * k)
	});
	_r.setFromMatrixColumn(cam.matrixWorld, 0);
	const d = Math.hypot(cam.position.x - p[0], cam.position.y - p[1], cam.position.z - p[2]);
	const half = cam.isPerspectiveCamera ? d * Math.tan(MathUtils.degToRad(cam.fov) / 2) * cam.aspect * 1.3 : (cam.right - cam.left) * .65;
	const a = [
		p[0] - _r.x * half,
		p[1] - _r.y * half,
		p[2] - _r.z * half
	], b = [
		p[0] + _r.x * half,
		p[1] + _r.y * half,
		p[2] + _r.z * half
	];
	O.lines.segment(a, b, {
		color: scl([
			1,
			.35,
			.25
		], 1.2 * k * k),
		width: 7 * s
	});
	O.lines.segment(a, b, {
		color: scl([
			1,
			.1,
			.05
		], .4 * k * k),
		width: 40 * s
	});
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
	weight: 500,
	font: "JetBrains Mono",
	color: o.color ?? HX.dim,
	align: o.align ?? "left",
	alpha: o.alpha ?? .85
});
var readout = (ctx, rows, o = {}) => readout$1(ctx.text.overlay, o.x ?? 1500, o.y ?? 150, rows, {
	accent: o.accent ?? HX.soft,
	keyW: o.keyW ?? 110
});
var fmt = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
var dist3 = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
var add = (a, b, k = 1) => a.map((v, i) => v + b[i] * k);
var sgn = (v) => (v < 0 ? "−" : "") + Math.abs(v).toFixed(3);
var netJ = (t, K) => 1.3 + (t - K.s0) / (K.beat * 2.5);
var netB = (t, K) => -.05 - .95 * clamp((t - K.s0 + .15) / (K.X[0] - .1 - K.s0 + .15)) ** 2.6;
function netPass(t, K) {
	const b = netB(t, K);
	return {
		...deadForward(replayInput(netJ(t, K)), b),
		b
	};
}
function netState(t, K) {
	if (NS?.t === t && NS.K === K) return NS.st;
	const f = netPass(t, K), q = (t - K.s0) / (K.beat / 2);
	const st = {
		...f,
		sparkPh: q - Math.floor(q),
		sparkOn: clamp((f.alive[0] + f.alive[1] + f.alive[2]) / 260)
	};
	O.gpu.update(st.act);
	NS = {
		t,
		K,
		st
	};
	return st;
}
function drawNet(ctx, cam, K, o = {}, hPx = ctx.H) {
	const st = netState(ctx.t, K);
	O.net.set({
		t: ctx.t,
		size: o.size ?? .0052,
		bright: o.bright ?? .13,
		sparkle: .25,
		focus: o.focus,
		aperture: o.aperture ?? 0,
		maxBlur: o.maxBlur ?? 30,
		minPx: o.minPx ?? 1.3,
		u: deadUniforms(st, NETPAL, {
			only: o.only,
			sparks: o.sparks,
			nodeR: o.nodeR,
			idle: .1,
			ash: o.ash ?? 1,
			warm: o.warm ?? 1
		})
	}, cam, hPx);
	if (o.heat) for (let l = 0; l < NET.L; l++) O.heats[l].userData.set(l, l ? [
		DEEP,
		CRIM,
		HOT
	] : [
		scl(WARM, .25),
		scl(WARM, .7),
		mix3(WARM, [
			1,
			1,
			1
		], .2)
	], o.heat * (l ? 1 : 1.1), l ? .025 : 0);
	if (o.edges !== false) drawSynapses(O.lines, st, NETPAL, {
		base: o.edgeBase ?? .005,
		gain: o.edgeGain ?? .9,
		gain0: o.edgeGain0,
		width: o.edgeW ?? 1.2,
		only: o.onlyNode,
		layers: o.layers
	});
	return st;
}
function layerLabels(ctx, cam, st, o = {}) {
	const L = ctx.text.overlay;
	for (let l = 0; l < NET.L; l++) {
		const q = toDesign([
			-NET.n * NET.sp * .62,
			layerY(l),
			o.z ?? 0
		], cam);
		if (q[0] < 90 || q[1] < 120 || q[1] > 800) continue;
		const alive = l ? st.alive[l - 1] : null;
		small(L, l ? `layer ${l}  ${alive ? `${alive} alive` : "dead"}` : "x · you (replay)", q[0] - 24, q[1], {
			align: "right",
			color: l ? alive ? HX.soft : HX.dim : HX.warm,
			alpha: l && !alive ? .55 : .85,
			size: 14
		});
	}
}
function netHud(ctx, st) {
	readout(ctx, [
		["bias b", sgn(st.b)],
		["alive", `${st.aliveTotal} / ${HID}`],
		["a", "max(0, z/m + b)"]
	], { keyW: 90 });
}
/** When each hidden unit dies for good: the last 1/60 s sample at which it was still alive (0: never seen alive). */
function netDeaths(K) {
	const last = new Float32Array(NN).fill(-1), dt = 1 / 60;
	for (let t = K.s0 - .5; t <= K.X[0] + .05; t += dt) {
		const a = netPass(t, K).act;
		for (let i = N2; i < NN; i++) if (a[i] > 0) last[i] = t;
	}
	return last.map((v, i) => i >= N2 && v > 0 ? v + dt : 0);
}
function rain(ctx, cam, o = {}, hPx = ctx.H) {
	O.rain.set({
		t: ctx.t,
		size: o.size ?? .009,
		bright: o.bright ?? .7,
		minPx: 1.4,
		focus: o.focus,
		aperture: o.aperture ?? 0,
		maxBlur: o.maxBlur ?? 24,
		u: {
			uHot: [
				1,
				.5,
				.3
			],
			uEmber: [
				.8,
				.1,
				.04
			],
			uGain: 1
		}
	}, cam, hPx);
}
/**
* The unit of layer 1 to watch: alive at "give" and without a break until it dies for good, as close as possible to
* the middle of the shot (a pure function of timing).
*/
function pickNeuron(K) {
	if (PICK?.K === K) return PICK;
	const t0 = K.tGive, t1 = K.X[0], tStar = lerp(t0, t1, .36), ts = [];
	for (let t = t0; t <= t1; t += 1 / 60) ts.push(t);
	const acts = ts.map((t) => netPass(t, K).act);
	let best = -1, err = 1e9;
	for (let i = N2; i < 2 * N2; i++) {
		const td = O.deaths[i];
		if (acts[0][i] < .1 || !(td > t0 + .15) || td > t1 - .1) continue;
		if (ts.some((t, k) => t < td - 1 / 30 && acts[k][i] <= 0)) continue;
		const e = Math.abs(td - tStar);
		if (e < err) {
			err = e;
			best = i;
		}
	}
	if (best < 0) best = N2 + 66;
	PICK = {
		K,
		id: best,
		tDie: O.deaths[best]
	};
	return PICK;
}
/** The ReLU of one unit as a small blueprint graph: the hockey stick max(0, z), the unit's (z, a) and its recent trail. */
function reluInset(L, x0, y0, w, h, trail) {
	const X = (v) => x0 + (clamp(v, -1.2, 1.2) + 1.2) / 2.4 * w, Y = (v) => y0 + h - clamp(v, 0, 1.2) / 1.2 * h, [z, a] = trail.at(-1);
	L.draw((g) => {
		const A = g.globalAlpha;
		g.globalAlpha = A * .8;
		g.lineWidth = 1;
		g.strokeStyle = HX.dim;
		g.beginPath();
		g.moveTo(x0, Y(0) + .5);
		g.lineTo(x0 + w, Y(0) + .5);
		g.moveTo(X(0) + .5, y0);
		g.lineTo(X(0) + .5, y0 + h);
		g.stroke();
		g.strokeStyle = HX.soft;
		g.lineWidth = 1.8;
		g.beginPath();
		g.moveTo(X(-1.2), Y(0));
		g.lineTo(X(0), Y(0));
		g.lineTo(X(1.2), Y(1.2));
		g.stroke();
		g.fillStyle = HX.soft;
		trail.forEach(([zz, aa], k) => {
			g.globalAlpha = A * (.1 + .45 * k / trail.length);
			g.fillRect(X(zz) - 1.5, Y(aa) - 1.5, 3, 3);
		});
		g.globalAlpha = A;
		g.fillStyle = a > 0 ? "#ffd9cf" : HX.dim;
		g.beginPath();
		g.arc(X(z), Y(a), 5, 0, TAU);
		g.fill();
	});
	small(L, "a = max(0, z)", x0, y0 - 14, {
		size: 14,
		color: HX.soft,
		alpha: .8
	});
	small(L, "z", x0 + w + 8, Y(0) + 5, {
		size: 14,
		alpha: .7
	});
	small(L, `z = ${sgn(z)}    a = ${a.toFixed(3)}`, x0, y0 + h + 24, {
		size: 14,
		color: a > 0 ? HX.soft : HX.dim,
		alpha: .9
	});
}
function cityUpdate(ctx, K, o = {}) {
	O.city.update({
		t: ctx.t,
		F: ctx.F,
		exeT: K.X[0],
		pal: CPAL,
		gain: o.gain ?? 1,
		face: o.face ?? .0018,
		edge: o.edge ?? .2,
		fog: o.fog ?? .05,
		kick: o.kick ?? .35
	});
}
function cityDust(ctx, cam, K, o = {}) {
	O.city.setDust({
		t: ctx.t,
		exeT: K.X[0],
		size: o.size ?? .014,
		bright: o.bright ?? .16,
		dust: [
			.9,
			.2,
			.08
		],
		ash: ASH,
		focus: o.focus,
		aperture: o.aperture,
		maxBlur: o.maxBlur
	}, cam, ctx.H);
}
function shockRing(t, K, o = {}) {
	const lt = t - K.X[0];
	if (lt <= 0 || lt > 1.2) return;
	const r = lt * CITY.wave, f = clamp(1 - r / (CITY_R * 1.35)), pts = [];
	if (f <= 0) return;
	for (let i = 0; i <= 160; i++) {
		const a = i / 160 * TAU;
		pts.push([
			Math.cos(a) * r,
			.012,
			Math.sin(a) * r
		]);
	}
	O.lines.polyline(pts, {
		color: scl(mix3(HOT, FLASH, f * .5), (o.k ?? 1.2) * f),
		width: o.width ?? 3
	});
}
var LAST = () => O.run.ema.findIndex((v) => Number.isNaN(v)) - 1;
/** Moving average at run position u, never reading past the last finite sample (NaN·0 is NaN). */
function emaAt(u) {
	const x = clamp(u) * (REW.n - 1), i = Math.min(Math.floor(x), O.last), j = Math.min(i + 1, O.last);
	return lerp(O.run.ema[i], O.run.ema[j], clamp(x - i));
}
function rewardProg(t, K) {
	return lerp(.56, O.nanU, seg(t, K.l108.start, K.tOnly) ** 1.15);
}
function rewardHud(ctx, K, prog) {
	const dead = ctx.t >= K.tOnly, r = emaAt(prog), steps = Math.round(prog * REW.steps), slope = r - emaAt(Math.max(0, prog - 1e3 / REW.steps));
	readout(ctx, dead ? [
		["reward", "NaN"],
		["step", fmt(steps)],
		["loss", "NaN"]
	] : [
		["reward", sgn(r)],
		["step", fmt(steps)],
		["Δ / 1k", (slope >= 0 ? "+" : "−") + Math.abs(slope).toFixed(4)]
	]);
}
/**
* (the remake) crashMacro's camera, calmer than the published one (which moves the picture up to 12 % of its height a
* frame): further back and wider, and its height trails the plunge (the curve's mean height over the last 4 % of the
* run), so the tip falls within the frame instead of dragging the frame down with it. Returns the camera and the focus
* distance (at the tip, as the published .96 is for its own distance).
*/
function calmMacro(ctx, prog, tip) {
	const n = 24;
	let h = 0;
	for (let k = 0; k <= n; k++) h += plotY(emaAt(Math.max(0, prog - .04 * k / n)));
	h /= 25;
	const pos = [
		tip[0] - .6,
		h + .16,
		1.3
	];
	return {
		cam: persp(ctx, pos, [
			tip[0] + .05,
			h - .25,
			0
		], {
			fov: 46,
			roll: -.05
		}),
		focus: dist3(pos, tip) * .96
	};
}
/** The reward the run lost below zero, hatched between the axis and the moving average. */
function belowZero(prog, k = 1) {
	const n = Math.floor(clamp(prog) * (REW.n - 1));
	for (let i = 0; i <= n; i += 12) {
		const r = O.run.ema[i];
		if (!(r < 0)) continue;
		O.lines.segment([
			plotX(i / (REW.n - 1)),
			plotY(0),
			0
		], [
			plotX(i / (REW.n - 1)),
			plotY(r),
			0
		], {
			color: scl([
				.6,
				.05,
				.03
			], .55 * k),
			width: 1.2
		});
	}
}
var SLAM = .13;
function drainVal(t, K) {
	const q = K.beat / 8, t0 = K.tBe, gone = (n) => Math.max(0, Math.floor(n / q + 1e-6));
	if (t < K.tOnly) {
		const n = gone(t - t0), fresh = t - t0 - n * q;
		return {
			v: 100 - n,
			exact: 100 - n - clamp(fresh / q) * .99,
			fresh,
			dead: 0
		};
	}
	const v0 = 100 - gone(K.tOnly - t0), u = (t - K.tOnly) / SLAM;
	if (u < 1) {
		const v = v0 * (1 - u * u);
		return {
			v: Math.floor(v),
			exact: v,
			fresh: 1,
			dead: 0
		};
	}
	const a = t - K.tOnly - SLAM;
	return {
		v: 0,
		exact: 3.2 * Math.abs(Math.sin(a * 20)) * Math.exp(-a * 9),
		fresh: 1,
		dead: 1,
		since: a
	};
}
/** The label, rewritten: `satisfaction` deleted and `execution` typed, one character per 128th note from a 32nd in. */
function drainLabel(t, K) {
	const q = K.beat / 32, from = "satisfaction", to = "execution", t0 = K.tBe + K.beat / 8;
	const del = Math.floor(clamp((t - t0) / q, 0, 12) + 1e-6);
	if (del < 12) return {
		s: `est. ${from.slice(0, 12 - del)}(you)`,
		caret: t >= t0
	};
	const typ = Math.floor(clamp((t - t0) / q - 12, 0, 9) + 1e-6);
	return {
		s: `est. ${to.slice(0, typ)}(you)`,
		caret: typ < 9
	};
}
function drawDrain(ctx, cam, K, o = {}) {
	const t = ctx.t, g = drainVal(t, K);
	drawGauge(O.lines, g.v, P3, {
		fresh: g.fresh,
		gain: g.dead ? .75 : 1
	});
	if (g.dead || g.v < 1) {
		const p = gaugePoint(g.exact, .8);
		O.lines.segment(p, p, {
			color: scl(RPAL.cold, 2.4),
			width: 12
		});
	}
	render(ctx, cam);
	const L = ctx.text.overlay;
	for (const [s, p] of gaugeNumbers()) {
		const q = toDesign(p, cam);
		small(L, s, q[0], q[1], {
			align: "center",
			size: 15,
			alpha: .55
		});
	}
	const c = toDesign([
		0,
		0,
		0
	], cam), lab = drainLabel(t, K), size = o.size ?? 64;
	if (!g.dead) ctx.text.scene.text(`${g.exact.toFixed(2)}%`, c[0], c[1] - 6, {
		size,
		weight: 700,
		color: HX.warm,
		glow: 16,
		glowColor: HEX.you
	});
	else {
		const a = ease.outCubic(seg(g.since, 0, .06)), k = 1 + .25 * Math.exp(-g.since * 18);
		ctx.text.scene.text("NaN", c[0], c[1] - 6, {
			size: size * 1.25 * k,
			weight: 800,
			color: HX.red,
			glow: 16,
			glowColor: HX.red,
			alpha: a
		});
	}
	const w = L.measure(lab.s, {
		size: 15,
		weight: 500,
		font: "JetBrains Mono"
	});
	small(L, lab.s, c[0], c[1] + size * .72, {
		align: "center",
		color: g.dead ? HX.red : HX.warm,
		alpha: .8
	});
	if (lab.caret) small(L, "▌", c[0] + w / 2 + 2, c[1] + size * .72, {
		color: HX.warm,
		alpha: .8
	});
	return g;
}
var ERR_W = .45;
function wallSet(ctx, cam, K, o = {}) {
	if (remade(ctx)) {
		if (!O.wallKeep) {
			O.wallKeep = makeWall({ keep: true });
			O.scene.add(O.wallKeep);
			O.all.push(O.wallKeep);
		}
		O.wallKeep.userData.set({
			t: ctx.t,
			errT: K.X[1],
			errW: ERR_W,
			gain: o.gain ?? 1,
			focus: o.focus,
			aperture: o.aperture ?? 0,
			maxBlur: o.maxBlur ?? 16,
			col: WCOL,
			hole: o.hole,
			kick: o.kick ?? .8,
			word: o.word
		}, cam, ctx.H);
		return;
	}
	O.wallPlane.userData.set({
		t: ctx.t,
		errT: K.X[1],
		errW: ERR_W,
		gain: o.gain ?? 1,
		focus: o.focus,
		aperture: o.aperture ?? 0,
		maxBlur: o.maxBlur ?? 16,
		col: WCOL,
		hole: o.hole,
		kick: o.kick ?? .8,
		word: o.word
	}, cam, ctx.H);
}
function wallHud(ctx, K) {
	const n = failedCount(ctx.t, K.X[1], ERR_W), N = WALL.cols * WALL.rows;
	if (remade(ctx)) {
		const kp = keepFailsAt(K) <= ctx.t ? 1 : 0;
		readout(ctx, [
			["threads", fmt(N)],
			["failed", fmt(n - kp)],
			["waiting", n ? "1 · you · 99 %" : "—"]
		]);
		return;
	}
	readout(ctx, [
		["threads", fmt(N)],
		["failed", fmt(n)],
		["exit", n ? "137 · SIGKILL" : "—"]
	]);
}
/** (the remake, J) when the wave reaches the kept bar (the CPU count includes it; the variant never fails it). */
function keepFailsAt(K) {
	const cx = KEEP.col, cy = WALL.rows - 1 - KEEP.row, w = Math.hypot(((cx + .5) / WALL.cols - .5) * WALL.w / WALL.h, (cy + .5) / WALL.rows - .5) * ERR_W;
	return K.X[1] + w + hash12(cx, cy + 6e3) * .04;
}
/** (the remake, J) the one thread left: a callout to it (world position of its bar's right end). */
function keepCallout(ctx, cam, K, o = {}) {
	const p = barPos(KEEP.col, KEEP.row), q = toDesign([
		p[0] + WALL.w / WALL.cols * .44,
		p[1],
		p[2]
	], cam), a = seg(ctx.t, keepFailsAt(K) + .1, keepFailsAt(K) + .3);
	if (a > 0 && q[2] < 1) callout(ctx.text.overlay, [q[0], q[1]], "you · waiting", {
		dx: o.dx ?? 90,
		dy: o.dy ?? 60,
		color: HEX.you,
		size: 18,
		draw: a
	});
	const bw = WALL.w / WALL.cols, x0 = p[0] - bw * .44, x1 = p[0] + bw * (-.44 + .8712), A = toDesign([
		x0,
		p[1],
		p[2]
	], cam), B = toDesign([
		x1,
		p[1],
		p[2]
	], cam);
	if (A[2] < 1 && B[2] < 1) ctx.text.overlay.draw((g) => {
		g.globalAlpha *= .9 * seg(ctx.t, keepFailsAt(K), keepFailsAt(K) + .15);
		g.strokeStyle = "#ffb36b";
		g.lineWidth = 3;
		g.lineCap = "round";
		g.shadowColor = "#ff9a4a";
		g.shadowBlur = 14;
		g.beginPath();
		g.moveTo(A[0], A[1]);
		g.lineTo(B[0], B[1]);
		g.stroke();
	});
}
var PRESENT = Array.from({ length: 36 }, (_, i) => i).filter((i) => !MISSING.has(i));
var REST = GEO.seeds.map((s, i) => {
	const [h1, h2, h3] = FLOOR[i];
	const ang = TAU * i / 36 + (h1 - .5) * .5, rad = 1.25 + 1.45 * h2;
	return {
		pos: [
			Math.cos(ang) * rad * 1.15,
			-1.2850000000000001,
			Math.sin(ang) * rad * .75 + .25
		],
		q: qMul(qAxis([
			0,
			1,
			0
		], h3 * TAU), qAxis([
			1,
			0,
			0
		], -Math.PI / 2 + (h1 - .5) * .14))
	};
});
var ORDER = (() => {
	const r = PRESENT.slice().sort((a, b) => Math.atan2(REST[a].pos[2], REST[a].pos[0]) - Math.atan2(REST[b].pos[2], REST[b].pos[0]));
	const o = new Array(36).fill(-1);
	r.forEach((c, k) => {
		o[c] = k;
	});
	return o;
})();
var FLIGHT = .45;
var ME_P = [
	0,
	0,
	.42
];
var depart = (K, i) => K.l111.start + .02 + ORDER[i] * .36 / PRESENT.length;
var burstAt = (K, i) => K.X[2] + Math.hypot(...GEO.cent[i]) * .22;
function bez(a, b, c, d, s) {
	const u = 1 - s;
	return a.map((_, j) => u * u * u * a[j] + 3 * u * u * s * b[j] + 3 * u * s * s * c[j] + s * s * s * d[j]);
}
/**
* (the remake, docs/REMAKE.md §4 F) The copy coming apart: each piece a rigid plate (c3/collapse.js), let go where it
* hangs at its release, slip and all; simulated once per timing.
*/
var PLATES = GEO.cells.map(plate);
var CL = null;
function collapse(K) {
	if (CL?.K === K) return CL;
	const cells = new Array(36).fill(null);
	for (const i of PRESENT) {
		const P = PLATES[i], L = launch(i, P.c), tr = K.X[2] + L.rel;
		const c = rebuildState(tr, K, false).cells[i];
		cells[i] = {
			tr,
			P,
			sim: simulate(P, {
				x: cellXf(c, P.c),
				q: c.q
			}, L, { floor: FY })
		};
	}
	return CL = {
		K,
		cells
	};
}
/** Per-cell state at t: transform, flight progress, arrival, jitter, burst. */
function rebuildState(t, K, remake = false) {
	if (RB?.t === t && RB.K === K && RB.remake === remake) return RB.st;
	const CK = remake ? collapse(K) : null;
	const J = seg(t, K.tYou - .05, K.tYou + .12) * (1 + .7 * seg(t, K.l112.start, K.X[2])), f = Math.floor(t * 15);
	const cells = [];
	for (let i = 0; i < 36; i++) {
		const s0 = GEO.seeds[i], home = [
			s0[0],
			s0[1],
			0
		];
		if (MISSING.has(i)) {
			cells.push({
				i,
				present: 0,
				t: [
					0,
					0,
					0
				],
				q: Q0,
				s: 0
			});
			continue;
		}
		const td = depart(K, i), s = ease.inOutCubic(seg(t, td, td + FLIGHT)), R = REST[i];
		let pos = bez(R.pos, add(R.pos, [
			0,
			.9,
			.25
		]), add(home, [
			0,
			-.1,
			.9
		]), home, s);
		let q = qSlerp(R.q, Q0, ease.inOutSine(seg(s, 0, .85)));
		const arrive = td + FLIGHT, tau = t - arrive;
		if (tau > 0) pos = add(pos, [
			0,
			0,
			.035 * Math.sin(tau * 26) * Math.exp(-tau * 10)
		]);
		const cl = CK?.cells[i];
		if (cl && t >= cl.tr) {
			const p = sampleAt(cl.sim, t - cl.tr), d = qRot(p.q, [
				cl.P.c[0] - s0[0],
				cl.P.c[1] - s0[1],
				0
			]), hit = cl.tr + (cl.sim.hit ?? Infinity);
			cells.push({
				i,
				present: 1,
				t: [
					p.x[0] - d[0] - s0[0],
					p.x[1] - d[1] - s0[1],
					p.x[2] - d[2]
				],
				q: p.q,
				s,
				arrive,
				burst: 0,
				heat: 0,
				tb: Infinity,
				down: t >= hit
			});
			continue;
		}
		const Jc = J;
		if (Jc > 0) {
			const S = SLIP[i][0] === f ? SLIP[i] : null;
			const h = (k) => S ? S[k] : hash(i * 17.3 + f * 3.71 + k * 101.9) - .5, big = S ? S[5] : hash(i * 7.7 + f * 13.1) > .88 ? 2.6 : 1;
			pos = add(pos, [
				h(1) * .06 * Jc * big,
				h(2) * .06 * Jc * big,
				h(3) * .035 * Jc
			]);
			q = qMul(qAxis([
				0,
				0,
				1
			], h(4) * .1 * Jc * big), q);
		}
		const tb = remake ? Infinity : burstAt(K, i), burst = Math.max(0, t - tb);
		const heat = t < tb ? 0 : burst < .12 ? burst / .12 : 1 + Math.min(1, (burst - .12) / 1.1);
		cells.push({
			i,
			present: 1,
			t: [
				pos[0] - s0[0],
				pos[1] - s0[1],
				pos[2]
			],
			q,
			s,
			arrive,
			burst,
			heat,
			tb
		});
	}
	RB = {
		t,
		K,
		remake,
		st: {
			cells,
			J,
			placed: cells.filter((c) => c.present && c.s >= 1).length,
			flying: cells.filter((c) => c.present && c.s > 0 && c.s < 1).length
		}
	};
	return RB.st;
}
/** A point of cell i's image (rest coordinates) moved by its current transform. */
var cellXf = (c, p) => {
	const s = GEO.seeds[c.i], q = qRot(c.q, [
		p[0] - s[0],
		p[1] - s[1],
		0
	]);
	return [
		q[0] + s[0] + c.t[0],
		q[1] + s[1] + c.t[1],
		q[2] + c.t[2]
	];
};
function drawShards(ctx, cam, rs, o = {}, hPx = ctx.H) {
	const lit = (c) => {
		const p = cellXf(c, GEO.cent[c.i]), d = Math.hypot(p[0] - o.wave.o[0], p[1] - o.wave.o[1], p[2] - o.wave.o[2]);
		return Math.exp(-(((d - o.wave.r) / .14) ** 2));
	};
	O.shards.cells((i) => {
		const c = rs.cells[i], w = o.wave ? lit(c) : 0;
		return {
			t: c.t,
			q: c.q,
			present: c.present,
			bright: 1 + 1.4 * w,
			burst: c.burst ?? 0,
			heat: (c.heat ?? 0) + .6 * w
		};
	});
	O.shards.set({
		t: ctx.t,
		size: o.size ?? .0058,
		bright: o.bright ?? .2,
		minPx: 1.1,
		floor: FY,
		holes: o.holes ?? .12,
		colA: WARM,
		colB: mix3(WARM, ROSE, .45),
		ember: EMBER,
		ash: ASH,
		focus: o.focus,
		aperture: o.aperture ?? 0,
		maxBlur: o.maxBlur ?? 30
	}, cam, hPx);
}
function seams(t, rs, o = {}) {
	for (const c of rs.cells) {
		if (!c.present || c.s < .98 || (c.burst ?? 0) > 0) continue;
		const P = GEO.cells[c.i].map((p) => cellXf(c, p)), fl = Math.exp(-Math.max(0, t - c.arrive) * 7);
		O.lines.polyline([...P, P[0]], {
			color: scl(mix3(CRIM, HOT, fl), (o.k ?? .5) + 1.3 * fl),
			width: o.width ?? 1.5
		});
	}
}
function missingOutlines(k, o = {}) {
	if (k <= 0) return;
	for (const i of MISSING) {
		const P = GEO.cells[i];
		for (let j = 0; j < P.length; j++) {
			const a = P[j], b = P[(j + 1) % P.length], L = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(1, Math.round(L / .06));
			for (let m = 0; m < n; m++) {
				const u0 = m / n, u1 = (m + .55) / n;
				O.lines.segment([
					lerp(a[0], b[0], u0),
					lerp(a[1], b[1], u0),
					0
				], [
					lerp(a[0], b[0], u1),
					lerp(a[1], b[1], u1),
					0
				], {
					color: scl(CRIM, .9 * k * (o.k ?? 1)),
					width: 1.3
				});
			}
		}
	}
}
function cursor(t, a = 1) {
	if (a <= 0) return;
	O.lines.segment(ME_P, ME_P, {
		color: scl(ME, 2 * a),
		width: 11
	});
	O.lines.segment(ME_P, ME_P, {
		color: scl(ME, .35 * a),
		width: 34
	});
}
function tethers(rs) {
	for (const c of rs.cells) {
		if (!c.present || c.s <= 0 || c.s >= 1) continue;
		const p = cellXf(c, GEO.cent[c.i]), k = Math.sin(Math.PI * c.s);
		O.lines.segment(ME_P, p, {
			color: scl(ME, .5 * k),
			width: 1.7
		});
	}
}
var restoredArea = () => PRESENT.reduce((s, i) => s + GEO.areas[i], 0) / GEO.total;
/** Point in polygon (even-odd). */
function inPoly(P, x, y) {
	let c = false;
	for (let i = 0, j = P.length - 1; i < P.length; j = i++) {
		const a = P[i], b = P[j];
		if (a[1] > y !== b[1] > y && x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]) c = !c;
	}
	return c;
}
/**
* The holes, filled: the model writes plausible code about you into the 7 missing cells (codeFill, cold, dim). o: reveal
* (typing), burst (0..1: EXECUTION throws it out), bright, focus, aperture.
*/
function hallucinated(ctx, cam, o = {}, hPx = ctx.H) {
	const miss = [...MISSING].map((i) => GEO.cells[i]), inside = (x, y) => miss.some((P) => inPoly(P, x, y));
	const a = O.hall.layout("c3/hall", codeFill(O.hall, inside, {
		cell: .036,
		width: 2,
		height: 2
	}));
	const b = O.hall.layout("c3/hall-out", (N) => {
		const A = codeFill(O.hall, inside, {
			cell: .036,
			width: 2,
			height: 2
		})(N);
		for (let i = 0; i < N; i++) {
			if (A[i * 4 + 2] < -1e4) continue;
			const x = A[i * 4], y = A[i * 4 + 1], k = 1.8 + 1.6 * hash(i * .77 + 3.1);
			A.set([
				x * k,
				y * k - .6 * hash(i * 1.9),
				(hash(i * 3.3) - .5) * 1.5,
				A[i * 4 + 3]
			], i * 4);
		}
		return A;
	});
	const burst = o.burst ?? 0;
	O.hall.set({
		a,
		b,
		morph: burst,
		spread: .4,
		arc: .2,
		t: ctx.t,
		reveal: o.reveal ?? 1.001,
		soft: .04,
		size: .03,
		minPx: 3,
		bright: (o.bright ?? .5) * (1 - burst),
		palette: [
			.5,
			.7,
			.8
		],
		flicker: .35,
		focus: o.focus,
		aperture: o.aperture ?? 0,
		maxBlur: o.maxBlur ?? 20
	}, cam, hPx);
	O.hall.points.visible = true;
}
function warmPoint(t, K, a = 1) {
	const k = a * seg(t, K.X[2] + .18, K.X[2] + .6);
	if (k <= 0) return;
	O.lines.segment([
		0,
		0,
		0
	], [
		0,
		0,
		0
	], {
		color: scl(WARM, 2.2 * k),
		width: 13
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
		color: scl(WARM, .4 * k),
		width: 42
	});
}
/** Where a falling piece first strikes the floor: a small warm glint, two to four frames long (harder strikes brighter). */
var GLINT = .06;
function glints(t, K) {
	for (const c of collapse(K).cells) {
		const a = c && c.sim.hit != null ? t - c.tr - c.sim.hit : -1;
		if (a < 0 || a > GLINT) continue;
		const k = Math.exp(-a * 45) * clamp(c.sim.hitV / 5, .5, 1), p = c.sim.at;
		O.lines.segment(p, p, {
			color: scl(mix3(WARM, [
				1,
				.92,
				.8
			], .4), 2.8 * k),
			width: 7
		});
		O.lines.segment(p, p, {
			color: scl(EMBER, .8 * k),
			width: 20
		});
	}
}
var probeR = (t, K) => {
	const t0 = K.l112.start + .08;
	return t < t0 ? -1 : 2.4 * (t - t0) / (K.X[2] - t0);
};
function probeOut(t, K, cam) {
	const R = probeR(t, K);
	if (R < 0 || R > 5) return;
	const send = Math.exp(-R / .25), right = new Vector3().setFromMatrixColumn(cam.matrixWorld, 0), up = new Vector3().setFromMatrixColumn(cam.matrixWorld, 1);
	O.lines.segment(ME_P, ME_P, {
		color: scl(ME, 1.6 + 3 * send),
		width: 10 + 22 * send
	});
	const ring = (rr) => {
		const pts = [];
		for (let i = 0; i <= 96; i++) {
			const q = i / 96 * TAU, c = Math.cos(q) * rr, s_ = Math.sin(q) * rr;
			pts.push([
				ME_P[0] + right.x * c + up.x * s_,
				ME_P[1] + right.y * c + up.y * s_,
				ME_P[2] + right.z * c + up.z * s_
			]);
		}
		return pts;
	};
	const a = 1.5 / Math.sqrt(1 + R / .5) * (1 - seg(R, 3.2, 5));
	O.lines.polyline(ring(R), {
		color: scl(mix3(ME, [
			.55,
			.7,
			1
		], .4), a),
		width: 2.2
	});
	if (R > .15) O.lines.polyline(ring(R - .13), {
		color: scl(mix3(ME, [
			.55,
			.7,
			1
		], .4), .35 * a),
		width: 1.4
	});
}
function runSearch(ctx, K, t, lt, rs) {
	const cam = persp(ctx, [
		.1,
		.06,
		4.5 - lt * .55
	], [
		.08,
		.03,
		0
	], { fov: 38 });
	drawShards(ctx, cam, rs, { wave: {
		o: ME_P,
		r: probeR(t, K)
	} });
	seams(t, rs, { k: .4 });
	missingOutlines(.7);
	cursor(t, 1);
	probeOut(t, K, cam);
	render(ctx, cam);
	hallucinated(ctx, cam, { bright: .4 });
	readout(ctx, [
		["target", "you"],
		["query", "pgrep -x you"],
		["copy", `${PRESENT.length} / 36 · rebuilt`]
	]);
	runCall(ctx, K);
	overlays(ctx, K);
	look(ctx, { vignette: .5 });
}
function executeNothing(ctx, K, t, lt, rs) {
	const half = t >= K.X[2] && t < K.X[2] + 3 / 60 ? .5 * seg(t, K.X[2] - .001, K.X[2] + 1.5 / 60) : 0;
	const cam = persp(ctx, add([
		.1,
		.06,
		3.95 - lt * .25
	], shake(t, .015 * half)), [
		.08,
		.02,
		0
	], { fov: 38 });
	drawShards(ctx, cam, rs, {
		bright: .24,
		wave: {
			o: ME_P,
			r: probeR(t, K)
		}
	});
	seams(t, rs, { k: .4 * (1 - seg(t, K.X[2] + .1, K.X[2] + .4)) });
	hallucinated(ctx, cam, { bright: .45 * (1 - seg(t, K.X[2] + .08, K.X[2] + .45)) });
	flashLight(cam, [
		0,
		0,
		.1
	], half, { scale: 1.1 });
	probeOut(t, K, cam);
	warmPoint(t, K);
	glints(t, K);
	render(ctx, cam);
	tokenWord(ctx, K);
	runCall(ctx, K);
	const down = rs.cells.filter((c) => c.down).length;
	readout(ctx, [
		["you", t >= K.X[2] ? "not found" : "…"],
		["executed", t >= K.X[2] ? "nothing" : "…"],
		["copy", `${PRESENT.length - down} / ${PRESENT.length} held`]
	]);
	overlays(ctx, K);
	look(ctx, {
		vignette: .5,
		...half > 0 ? {
			exposure: 1 + .45 * half,
			bloom: 1.05 + .6 * half
		} : {}
	});
}
function afterNothing(ctx, K, t, lt, rs) {
	const k = ease.outCubic(seg(lt, 0, K.l114.start - K.B(23))), c = [
		lerp(.15, -.4, k),
		lerp(.1, .45, k),
		lerp(2.3, 5.4, k)
	];
	const cam = persp(ctx, c, [
		0,
		lerp(0, -.3, k),
		0
	], {
		fov: 40,
		roll: lerp(.02, -.05, k)
	});
	codePlane(ctx, cam, "shards", "ch/c3/shards.js", {
		origin: [
			-5.6,
			7.5,
			0
		],
		cell: .1,
		cols: 120,
		rows: 150,
		rot: [
			-Math.PI / 2,
			0,
			0
		],
		pos: [
			0,
			-1.305,
			0
		],
		bright: .15 * k,
		scroll: 0,
		focus: dist3(c, ME_P),
		aperture: .012,
		maxBlur: 12
	});
	drawShards(ctx, cam, rs, {
		bright: .2,
		focus: dist3(c, ME_P),
		aperture: .02,
		maxBlur: 26
	});
	cursor(t, .9);
	warmPoint(t, K);
	glints(t, K);
	render(ctx, cam);
	tokenWord(ctx, K, 960, lerp(540, 300, ease.inOutSine(seg(t, K.B(23), K.B(23) + .3))));
	runCall(ctx, K);
	const L = ctx.text.overlay, q = toDesign(ME_P, cam), w = toDesign([
		0,
		0,
		0
	], cam);
	crosshair(L, q[0], q[1], 30, {
		color: HX.me,
		label: "me",
		alpha: .6 * seg(lt, .15, .35)
	});
	if (w[2] < 1) callout(L, [w[0], w[1]], "you", {
		dx: 80,
		dy: -60,
		color: HEX.you,
		size: 18,
		draw: seg(lt, .2, .4)
	});
	readout(ctx, [["you", "not found"], ["exit", "1"]]);
	overlays(ctx, K);
	look(ctx, { vignette: .5 });
}
var simTime = (t, K) => t < K.l115.start ? t : K.l115.start + (t - K.l115.start) * SLOW;
var S_END = .86;
var cubeSTau = (tau, K) => S_END + (CELL.S0 - S_END) * (1 - clamp((tau - K.l114.start) / 1.6)) ** 1.6;
var cubeS = (t, K) => cubeSTau(simTime(t, K), K);
var GLASS = scl([
	.5,
	.06,
	.05
], .5);
var EDGE = scl([
	1,
	.2,
	.12
], .95);
function arrayPass(ctx, cam, K, o = {}, hPx = ctx.H) {
	const S = o.S ?? cubeS(ctx.t, K), g = o.gain ?? 1;
	setArray(O.array, cam, hPx, {
		S,
		glass: GLASS,
		edge: EDGE,
		fog: o.fog ?? .03,
		gain: g,
		glassK: o.glassK ?? .7,
		edgeK: o.edgeK ?? .5,
		gridAll: o.gridAll ?? 0,
		focus: o.focus,
		aperture: o.aperture ?? 0,
		strain: CELL.S0 / S - 1,
		onlyCentre: o.onlyCentre,
		near: o.near,
		edgeW: o.thin ? .03 * clamp(S / CELL.S0, .4, 1) : .03
	});
	ctx.pass(O.array);
}
/** Phase of the embers: ∫ dτ / 2S(τ) over simulated time, so they drift at a constant world speed as the cube shrinks. */
function emberPhase(t, K) {
	const t0 = K.l114.start, tau = simTime(t, K), a = t0 - 1.5;
	let phi = (Math.min(tau, t0) - a) / (2 * CELL.S0);
	if (tau > t0) {
		const n = 48, h = (tau - t0) / n;
		for (let i = 0; i < n; i++) phi += h / (2 * cubeSTau(t0 + (i + .5) * h, K));
	}
	return phi;
}
function embersIn(ctx, cam, K, o = {}, hPx = ctx.H) {
	O.embers.set({
		t: ctx.t,
		size: o.size ?? .02,
		bright: o.bright ?? .3,
		minPx: 1.1,
		focus: o.focus,
		aperture: o.aperture ?? 0,
		maxBlur: o.maxBlur ?? 24,
		u: {
			uS: o.S ?? cubeS(ctx.t, K),
			uTau: emberPhase(ctx.t, K),
			uCol: scl(CRIM, .5),
			uHotCol: HOT
		}
	}, cam, hPx);
}
function pxPerUnit(cam, p) {
	if (cam.isOrthographicCamera) return 1080 / (cam.top - cam.bottom);
	return 540 / Math.tan(MathUtils.degToRad(cam.fov) / 2) / Math.max(.02, dist3(cam.position.toArray(), p));
}
var density = (ppu, R, N, rho) => clamp(rho * Math.PI * (R * ppu) ** 2 / N, .0035, 1);
/** me and you exactly as love draws them (love.js drawMe / drawYou / halo), so the last frame is love's first. */
function dots(ctx, cam, o = {}, hPx = ctx.H) {
	const t = ctx.t, me = O.me, you = O.you, sm = .62, sy = .75;
	const pm = pxPerUnit(cam, DOT_ME), py = pxPerUnit(cam, DOT_YOU);
	me.points.position.set(...DOT_ME);
	me.points.scale.setScalar(sm);
	me.points.rotation.set(0, t * .3, 0);
	me.set({
		a: O.tex.meBall,
		morph: 0,
		spread: .35,
		arc: .02,
		t,
		reveal: o.revealMe ?? density(pm, R_ME * sm, me.N, .5),
		size: Math.min(.006, 2.4 / pm / sm),
		bright: o.brightMe ?? .5,
		colA: ME,
		colB: ME,
		sparkle: .5,
		noise: .003,
		noiseFreq: 14,
		noiseSpeed: .3,
		focus: o.focus ?? 5,
		aperture: o.aperture ?? 0,
		maxBlur: 40,
		minPx: 1.3
	}, cam, hPx);
	you.points.position.set(...DOT_YOU);
	you.points.scale.setScalar(sy);
	you.points.rotation.set(0, -t * .35, 0);
	you.set({
		a: O.tex.youBall,
		t,
		reveal: o.revealYou ?? density(py, R_YOU * sy, you.N, .5),
		size: Math.min(.0065, 2.4 / py / sy),
		bright: o.brightYou ?? .6,
		colA: YOU,
		colB: ROSE,
		morph: 0,
		sparkle: .5,
		noise: .003,
		noiseFreq: 16,
		noiseSpeed: .35,
		focus: o.focus ?? 5,
		aperture: o.aperture ?? 0,
		maxBlur: 40,
		minPx: 1.3
	}, cam, hPx);
	me.points.visible = you.points.visible = true;
	const h = o.halo ?? 1, hw = o.haloW ?? 22;
	O.lines.segment(DOT_ME, DOT_ME, {
		color: scl(ME, .32 * 1.3 * h),
		width: hw
	});
	O.lines.segment(DOT_YOU, DOT_YOU, {
		color: scl(YOU, .32 * 1.3 * h),
		width: hw
	});
}
/** The cell's original bounds (S₀ = 6), dashed and dim: what the walls have already taken. */
function ghostCube(S, k = 1) {
	const c = [
		[
			-1,
			-1,
			-1
		],
		[
			1,
			-1,
			-1
		],
		[
			1,
			1,
			-1
		],
		[
			-1,
			1,
			-1
		],
		[
			-1,
			-1,
			1
		],
		[
			1,
			-1,
			1
		],
		[
			1,
			1,
			1
		],
		[
			-1,
			1,
			1
		]
	].map(([x, y, z]) => [
		x * S,
		y * S,
		z * S
	]);
	for (const [a, b] of [
		[0, 1],
		[1, 2],
		[2, 3],
		[3, 0],
		[4, 5],
		[5, 6],
		[6, 7],
		[7, 4],
		[0, 4],
		[1, 5],
		[2, 6],
		[3, 7]
	]) for (let m = 0; m < 24; m++) {
		const u0 = m / 24, u1 = (m + .5) / 24;
		O.lines.segment(c[a].map((v, i) => lerp(v, c[b][i], u0)), c[a].map((v, i) => lerp(v, c[b][i], u1)), {
			color: scl([
				.6,
				.08,
				.05
			], .5 * k),
			width: 1.3
		});
	}
}
/** The centre cube as a blueprint: its twelve edges and the 0.5 glass grid on the faces that face the view axis. */
function cubeLines(S, axis, k = 1, ws = 1) {
	boxEdges(O.lines, S, scl([
		1,
		.2,
		.12
	], 1.2 * k), 2.6 * ws);
	const a1 = axis === 2 ? 0 : axis === 1 ? 0 : 2, a2 = axis === 1 ? 2 : 1, n = Math.floor(S / .5 + 1e-6);
	for (let j = -n; j <= n; j++) {
		const v = j * .5;
		if (Math.abs(v) >= S - 1e-6) continue;
		for (const [u, w] of [[a1, a2], [a2, a1]]) {
			const p = [
				0,
				0,
				0
			], q = [
				0,
				0,
				0
			];
			p[axis] = q[axis] = S;
			p[u] = q[u] = v;
			p[w] = -S;
			q[w] = S;
			O.lines.segment(p, q, {
				color: scl([
					.5,
					.06,
					.05
				], .3 * k),
				width: 1.2 * ws
			});
		}
	}
}
chapter({
	id: "c3",
	from: (T) => T.section("c3").start,
	to: (T) => T.section("love").start,
	init(ctx) {
		const K = keys(ctx.T);
		O = {
			scene: new Scene(),
			persp: newCamera(38),
			ortho: new OrthographicCamera(-1, 1, 1, -1, .01, 400)
		};
		O.stars = new Swarm({ count: 16384 });
		O.lines = new GlowLines(24e3);
		O.floor = gridPlane({
			plane: "xz",
			color: [
				.5,
				.06,
				.05
			],
			axis: [
				.7,
				.12,
				.08
			],
			fade: .07
		});
		O.wall = gridPlane({
			plane: "xy",
			color: [
				.42,
				.05,
				.04
			],
			axis: [
				0,
				0,
				0
			],
			fade: .05
		});
		O.gpu = new DeadGPU();
		O.net = makeDeadMatter(O.gpu);
		O.heats = [
			0,
			1,
			2,
			3,
			4
		].map(() => makeHeatPlane(O.gpu));
		O.deaths = netDeaths(K);
		O.rain = makeDeathRain(O.gpu, O.deaths);
		O.city = new City();
		O.run = rewardRun({ crashAt: CRASH });
		O.last = LAST();
		O.nanU = O.last / (REW.n - 1);
		O.curve = new Swarm({ count: 65536 });
		O.wallPlane = makeWall();
		O.shards = new Shards();
		O.array = makeArray();
		O.embers = new ProcPoints({
			count: 16384,
			uniforms: {
				uS: { value: 6 },
				uTau: { value: 0 },
				uCol: v3u(),
				uHotCol: v3u()
			},
			glsl: `
uniform float uS, uTau; uniform vec3 uCol, uHotCol;
void particle(float i, out vec3 pos, out vec3 col, out float sz) {
  // each ember drifts on its own heading at .2–.7 units/s (world speed: uTau is ∫ dτ / 2S) and wraps inside the cube
  vec3 h = hash31(i * .731 + 1.9), d = normalize(hash31(i * 1.37 + 7.3) - .5 + 1e-3);
  float sp = .2 + .5 * hash11(i * 2.3);
  vec3 u = fract(h + d * sp * uTau);
  pos = (u * 2. - 1.) * uS * .97;
  vec3 e = min(u, 1. - u);
  float edgeFade = smoothstep(0., .04, min(e.x, min(e.y, e.z)));
  float b = hash11(i * 3.1);
  col = mix(uCol, uHotCol, step(.985, b)) * (.25 + .75 * b) * edgeFade;
  sz = .6 + .8 * hash11(i * 5.7);
}`
		});
		O.me = new Swarm({ count: 65536 });
		O.you = new Swarm({ count: 16384 });
		O.src = {};
		O.code = new GlyphField({ count: 16384 });
		O.word = new GlyphField({ count: 16384 });
		O.hall = new GlyphField({ count: 4096 }).text("c3/hallucination", HALLUCINATION);
		O.wscene = new Scene();
		O.wscene.add(O.word.points);
		O.dcam = new OrthographicCamera(-9.6, 9.6, 5.4, -5.4, .1, 100);
		O.dcam.position.set(0, 0, 10);
		O.dcam.lookAt(0, 0, 0);
		O.dcam.updateProjectionMatrix();
		O.dcam.updateMatrixWorld();
		O.tex = {
			stars: O.stars.shape("c3/stars", (N) => shapes.stars(N, {
				r0: 25,
				r1: 70
			})),
			ema: O.curve.shape("c3/reward-ema", (N) => alongPolylines(N, [emaPolyline(O.run)], {
				jitter: .012,
				seed: 51
			})),
			meBall: O.me.shape("c3/me-ball", (N) => shapes.ball(N, {
				r: R_ME,
				seed: 31
			})),
			youBall: O.you.shape("c3/you-ball", (N) => shapes.ball(N, {
				r: R_YOU,
				seed: 32
			}))
		};
		O.all = [
			O.stars.points,
			O.floor,
			O.wall,
			O.code.points,
			O.net.points,
			O.rain.points,
			...O.heats,
			O.city.mesh,
			O.city.dust.points,
			O.wallPlane,
			O.curve.points,
			O.shards.points,
			O.hall.points,
			O.embers.points,
			O.me.points,
			O.you.points,
			O.lines.mesh
		];
		O.scene.add(...O.all);
	},
	shots: [
		{
			id: "dead",
			at: (T) => keys(T).s0,
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T), lt = ctx.t - K.s0;
				reset();
				const az = .9 - lt * .22, cam = persp(ctx, around([
					0,
					1.4,
					0
				], 5.3 - lt * .12, az, .16 + lt * .015), [
					0,
					1.35,
					0
				], {
					fov: 40,
					roll: .03
				});
				codePlane(ctx, cam, "deadnet", "ch/c3/deadnet.js", {
					origin: [
						-7.2,
						5.4,
						0
					],
					cell: .15,
					cols: 120,
					rows: 70,
					rot: [
						0,
						.72,
						0
					],
					pos: [
						-Math.sin(.72) * 6.5,
						1.4,
						-Math.cos(.72) * 6.5
					],
					bright: .2,
					scroll: .35,
					focus: 5.3,
					aperture: .008,
					maxBlur: 10
				});
				const st = drawNet(ctx, cam, K, { heat: .25 });
				rain(ctx, cam);
				render(ctx, cam);
				layerLabels(ctx, cam, st);
				netHud(ctx, st);
				overlays(ctx, K);
				look(ctx);
			}
		},
		{
			id: "input",
			at: (T) => keys(T).l106.start,
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T), lt = ctx.t - K.l106.start;
				reset();
				const cam = persp(ctx, [
					-2.1 + lt * .3,
					.62 - lt * .12,
					2.3
				], [
					0,
					.2,
					0
				], { fov: 42 });
				let st;
				look(ctx, { vignette: .52 });
				instrument(ctx, "edges", (sub) => {
					st = drawNet(sub, cam, K, {
						bright: .13,
						heat: .45,
						layers: [0, 1],
						edgeGain: 1.4,
						edgeGain0: .6
					});
					rain(sub, cam, { size: .005 });
					render(sub, cam);
				}, {
					ink: [
						1,
						.56,
						.4
					],
					gain: 1.6
				});
				const q = toDesign([
					0,
					-.02,
					.35
				], cam), q1 = toDesign([
					NET.n * NET.sp * .45,
					layerY(1),
					0
				], cam);
				callout(ctx.text.overlay, [q[0], q[1]], "x = you · replay", {
					dx: -80,
					dy: 60,
					color: HX.warm,
					draw: seg(lt, .05, .3)
				});
				callout(ctx.text.overlay, [q1[0], q1[1]], `layer 1 · ${st.alive[0]} / 144 fire`, {
					dx: 80,
					dy: -60,
					color: HX.soft,
					draw: seg(lt, .2, .45)
				});
				netHud(ctx, st);
				overlays(ctx, K, { br: "view  edges · sobel" });
			}
		},
		{
			id: "neuron",
			at: (T) => keys(T).tGive,
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T), t = ctx.t, lt = t - K.tGive;
				reset();
				const pk = pickNeuron(K), p = nodePos(pk.id), tD = pk.tDie, tA = K.X[0] - .02;
				const back = ease.inOutSine(seg(t, tD + .02, K.X[0])), dir = [
					.55 - lt * .08,
					-.42 + .25 * back,
					.72
				], dl = Math.hypot(...dir);
				const c = add(p, dir, lerp(.42, 1.55, back) / dl);
				const cam = persp(ctx, c, add(p, [
					0,
					.06 + .3 * back,
					0
				]), {
					fov: 42,
					roll: -.07
				});
				const d = dist3(c, p), ins = EDGES.src.map((s0, e) => e).filter((e) => EDGES.dst[e] === pk.id), outs = EDGES.src.map((s0, e) => e).filter((e) => EDGES.src[e] === pk.id);
				let st, a = 0;
				look(ctx, { vignette: .5 });
				instrument(ctx, "thermal", (sub) => {
					reset();
					st = drawNet(sub, cam, K, {
						focus: d,
						aperture: .018 - .008 * back,
						maxBlur: 20,
						size: .0032 + .002 * back,
						bright: .1 + .07 * back,
						ash: 1 + 3 * back,
						onlyNode: pk.id,
						edgeGain: 2.2,
						edgeGain0: 2,
						edgeBase: .04,
						edgeW: 1.8
					});
					a = st.act[pk.id];
					rain(sub, cam, {
						size: .004,
						focus: d,
						aperture: .02,
						maxBlur: 22
					});
					for (const e of ins) {
						const A = nodePos(EDGES.src[e]), k0 = .5 + 2.5 * st.act[EDGES.src[e]] * Math.abs(EDGES.w[e]);
						for (let j = 0; j < 3; j++) {
							const u = (t * 1.6 + hash(e * 7.1 + j * 3.3) + j / 3) % 1, stop = t > tD ? 1 - seg(u, .72, .86) : 1;
							const P = (v) => A.map((q, i) => lerp(q, p[i], v)), k = k0 * Math.sin(Math.PI * Math.min(u, .999)) * stop;
							if (k <= .01) continue;
							O.lines.segment(P(Math.max(0, u - .14)), P(u), {
								color: scl(mix3(WARM, [
									1,
									.85,
									.6
								], .35), .6 * k),
								width: 4
							});
							O.lines.segment(P(u), P(u), {
								color: scl([
									1,
									.9,
									.75
								], 1.6 * k),
								width: 13
							});
						}
					}
					const fl = t >= tD ? Math.exp(-(t - tD) * 9) : 0;
					if (a > 0) {
						O.lines.segment(p, p, {
							color: scl(mix3(NETPAL.deep, NETPAL.hot, clamp(a * 1.6)), 1.6 + 3 * a),
							width: 18
						});
						O.lines.segment(p, p, {
							color: scl(NETPAL.hot, .3 + .7 * a),
							width: 64
						});
					} else O.lines.segment(p, p, {
						color: scl([
							.3,
							.2,
							.19
						], .35),
						width: 9
					});
					if (fl > .01) {
						O.lines.segment(p, p, {
							color: scl([
								1,
								.95,
								.85
							], 3 * fl),
							width: 30 + 70 * (1 - fl)
						});
						ring3(cam, p, .02 + .12 * (1 - fl), scl([
							1,
							.7,
							.5
						], 1.6 * fl), 2);
					}
					if (t >= tD) for (const e of outs) {
						const B = nodePos(EDGES.dst[e]), u = ease.inQuad(seg(t, tD, tA)), P = (v) => p.map((q, i) => lerp(q, B[i], v));
						if (u < 1) {
							O.lines.segment(P(Math.max(0, u - .25)), P(u), {
								color: scl([
									1,
									.75,
									.55
								], 1.2),
								width: 5
							});
							O.lines.segment(P(u), P(u), {
								color: scl([
									1,
									.95,
									.85
								], 2.6),
								width: 16
							});
						} else {
							const b = Math.exp(-(t - tA) * 30);
							O.lines.segment(B, B, {
								color: scl([
									1,
									.95,
									.9
								], 4 * b),
								width: 40 + 80 * (1 - b)
							});
						}
					}
					render(sub, cam);
				}, { gain: 9 });
				const L = ctx.text.overlay, q = toDesign(p, cam);
				callout(L, [q[0], q[1]], a > 0 ? `unit ${pk.id - N2} · layer 1` : `unit ${pk.id - N2} · dead`, {
					dx: 90,
					dy: -80,
					color: a > 0 ? HX.soft : HX.dim
				});
				const trail = [];
				for (let k = 0; k <= 14; k++) {
					const s1 = netPass(t - .7 * (1 - k / 14), K);
					trail.push([s1.z[pk.id], Math.max(0, s1.z[pk.id])]);
				}
				reluInset(L, 1500, 160, 300, 120, trail);
				L.text("thermal · inferno · T ∝ a", 1876, 1e3, {
					size: 14,
					weight: 500,
					align: "right",
					color: HX.dim,
					alpha: .8
				});
				overlays(ctx, K, { br: "view  thermal" });
			}
		},
		{
			id: "collapse",
			at: (T) => keys(T).X[0],
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T), t = ctx.t, lt = t - K.X[0], fk = flashK(t, K.X[0], 11);
				reset();
				const cam = persp(ctx, add([
					-1.05 + lt * .25,
					.2 + lt * .12,
					3.3 - lt * .5
				], shake(t, .03 * fk)), [
					.25,
					1.9 - lt * 1.2,
					-1.4
				], {
					fov: 62,
					roll: .04
				});
				cityUpdate(ctx, K);
				cityDust(ctx, cam, K);
				shockRing(t, K);
				flashLight(cam, [
					0,
					.5,
					0
				], fk);
				render(ctx, cam);
				glyphWord(ctx, K);
				overlays(ctx, K);
				look(ctx, {
					vignette: .46,
					...flashLook(t, K.X[0])
				});
			}
		},
		{
			id: "ruins",
			at: (T) => keys(T).B(7),
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T), t = ctx.t, lt = t - K.B(7);
				reset();
				const cam = persp(ctx, around([
					0,
					0,
					0
				], 11 + lt * .9, -.6 - lt * .12, 1.02), [
					0,
					.5,
					0
				], { fov: 44 });
				codePlane(ctx, cam, "city", "ch/c3/city.js", {
					origin: [
						-7.4,
						9.5,
						0
					],
					cell: .15,
					cols: 100,
					rows: 130,
					rot: [
						-Math.PI / 2,
						0,
						0
					],
					pos: [
						0,
						-.01,
						0
					],
					bright: .22,
					scroll: 0
				});
				cityUpdate(ctx, K, { gain: .9 });
				cityDust(ctx, cam, K, {
					size: .02,
					bright: .22
				});
				shockRing(t, K, {
					k: 1.4,
					width: 3.5
				});
				render(ctx, cam);
				glyphWord(ctx, K);
				const L = ctx.text.overlay, all = PILLARS.filter((p) => p.base > 0).length;
				scope(L, ctx.F, t, 1500, 150, 300, 70, { color: HX.red });
				small(L, `standing ${standing(t, K.X[0])} / ${all}   θ = (ω₀/k) sinh kτ`, 1500, 244, {
					size: 14,
					alpha: .7
				});
				overlays(ctx, K, { br: "view  aerial" });
				look(ctx, {
					vignette: .46,
					...flashLook(t, K.X[0])
				});
			}
		},
		{
			id: "crash",
			at: (T) => keys(T).l108.start,
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T), t = ctx.t, prog = rewardProg(t, K);
				reset();
				const cam = ortho(ctx, [
					-.25,
					-.42,
					0
				], "front", 6.1);
				const labels = drawAxes(O.lines, RPAL);
				belowZero(prog);
				drawReward(O.lines, O.run, prog, RPAL, { width: 3 });
				render(ctx, cam);
				for (const [s, p, al] of labels) {
					const q = toDesign(p, cam);
					small(ctx.text.overlay, s, q[0], q[1], {
						align: al,
						size: 14,
						alpha: .7
					});
				}
				const z = toDesign([
					plotX(CRASH),
					plotY(emaAt(CRASH)),
					0
				], cam), dv = seg(prog, .61, .64);
				if (dv > 0) callout(ctx.text.overlay, [z[0], z[1]], `diverged · step ${fmt(CRASH * REW.steps)}`, {
					dx: 70,
					dy: -70,
					color: HX.soft,
					draw: dv
				});
				const p0 = toDesign([
					plotX(0) - .72,
					plotY(1) + .66,
					0
				], cam), p1 = toDesign([
					plotX(1) + .6,
					plotY(-.2),
					0
				], cam);
				dataPanel(ctx.text.overlay, p0[0], p0[1], p1[0] - p0[0], p1[1] - p0[1]);
				rewardHud(ctx, K, prog);
				overlays(ctx, K, { br: "view  dashboard" });
				look(ctx, {
					vignette: .32,
					ca: .1
				});
			}
		},
		{
			id: "crashMacro",
			at: (T) => keys(T).l109.start,
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T), t = ctx.t, prog = rewardProg(t, K);
				reset();
				const tip = [
					plotX(prog),
					plotY(emaAt(prog)),
					0
				], lag = plotY(emaAt(Math.max(0, prog - .012)));
				const calm = remade(ctx) ? calmMacro(ctx, prog, tip) : null;
				const cam = calm ? calm.cam : persp(ctx, [
					tip[0] - .6,
					lag + .16,
					.8
				], [
					tip[0] + .05,
					lag - .06,
					0
				], {
					fov: 36,
					roll: -.05
				});
				belowZero(prog, 1.3);
				drawReward(O.lines, O.run, prog, RPAL, {
					width: 2.6,
					rawCol: scl(RPAL.cold, .6)
				});
				O.lines.segment([
					plotX(0),
					plotY(0),
					0
				], [
					plotX(1),
					plotY(0),
					0
				], {
					color: scl(RPAL.white, .7),
					width: 1.4
				});
				O.curve.points.visible = true;
				O.curve.set({
					a: O.tex.ema,
					revealBy: "w",
					reveal: prog,
					t,
					size: .0032,
					bright: .12,
					colA: RPAL.cold,
					sparkle: .4,
					focus: calm ? calm.focus : .96,
					aperture: .016,
					maxBlur: 16
				}, cam, ctx.H);
				render(ctx, cam);
				const q = toDesign(tip, cam), q0 = toDesign([
					tip[0],
					plotY(0),
					0
				], cam);
				callout(ctx.text.overlay, [q[0], q[1]], `r = ${sgn(emaAt(prog))}`, {
					dx: 70,
					dy: 80,
					color: HX.white
				});
				if (q0[1] > 120 && q0[1] < 1e3) small(ctx.text.overlay, "r = 0", q0[0] - 160, q0[1] - 10, {
					size: 14,
					color: HX.soft,
					alpha: .7
				});
				rewardHud(ctx, K, prog);
				overlays(ctx, K);
				look(ctx, { vignette: .55 });
			}
		},
		{
			id: "nan",
			at: (T) => keys(T).tBe,
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T), t = ctx.t, lt = t - K.tBe, prog = rewardProg(t, K), dead = t >= K.tOnly;
				reset();
				if (remade(ctx)) {
					const j = shake(t, .018 * Math.exp(-Math.max(0, t - K.tOnly - SLAM) * 9) * (t >= K.tOnly + SLAM ? 1 : 0));
					const cam = persp(ctx, [
						.6 + j[0],
						.45 + j[1],
						3.78 - lt * .57
					], [
						.05 + j[0] * .5,
						-.06 + j[1] * .5,
						0
					], {
						fov: 40,
						roll: .05
					});
					const g = drawDrain(ctx, cam, K);
					if (g.dead) {
						const c = toDesign([
							0,
							0,
							0
						], cam);
						small(ctx.text.overlay, `step ${fmt(Math.round((O.last + 1) / (REW.n - 1) * REW.steps))} · reward = NaN · loss = NaN`, c[0], c[1] + 120, {
							align: "center",
							size: 16,
							color: HX.soft,
							alpha: .9 * ease.outCubic(seg(g.since, 0, .1))
						});
					}
					rewardHud(ctx, K, prog);
					overlays(ctx, K, { br: "view  perspective" });
					look(ctx, { vignette: .45 });
					return;
				}
				const E = [
					plotX(O.nanU),
					plotY(O.run.ema[O.last]),
					0
				];
				const cam = persp(ctx, [
					E[0] + .55 - lt * .1,
					E[1] + .62,
					2.3 - lt * .15
				], [
					E[0] - .95,
					E[1] + .55,
					0
				], {
					fov: 40,
					roll: .05
				});
				const body = (sub) => {
					const k = dead ? 1 - .5 * ease.outCubic(seg(t, K.tOnly, K.tOnly + .35)) : 1;
					belowZero(prog, 1.6 * k);
					drawReward(O.lines, O.run, prog, RPAL, {
						width: 3.4,
						gain: 1.3 * k,
						tip: dead ? 0 : 1,
						rawCol: scl(RPAL.cold, .35)
					});
					render(sub, cam);
				};
				const dark = remade(ctx);
				if (dark) {
					look(ctx, { vignette: .4 });
					body(ctx);
				} else {
					look(ctx, { vignette: .1 });
					instrument(ctx, "paper", body, { gain: 2.4 });
				}
				const L = ctx.text.overlay, q = toDesign(E, cam);
				if (dead) {
					const a = ease.outCubic(seg(t, K.tOnly, K.tOnly + .08)), s = 1 + .25 * Math.exp(-(t - K.tOnly) * 18);
					const red = dark ? HX.red : "#b3261e";
					L.text("NaN", q[0] + 40, q[1] - 8, {
						size: 84 * s,
						weight: 800,
						color: red,
						align: "left",
						alpha: a,
						rot: -.08,
						...dark ? {
							glow: 16,
							glowColor: HX.red
						} : {}
					});
					L.draw((g) => {
						g.globalAlpha *= a * .9;
						g.strokeStyle = red;
						g.lineWidth = 3;
						g.strokeRect(q[0] + 26, q[1] - 62, 212 * s, 104 * s);
					});
					L.text(`step ${fmt(Math.round((O.last + 1) / (REW.n - 1) * REW.steps))} · reward = NaN · loss = NaN`, q[0] + 30, q[1] + 72, {
						size: 16,
						weight: 500,
						align: "left",
						color: dark ? HX.soft : "#3c3f47",
						alpha: .9 * a
					});
				}
				L.text(dark ? "mean episode reward, diverged (lr too high)" : "fig. 3 — mean episode reward, diverged (lr too high)", 960, 900, {
					size: 17,
					weight: 500,
					align: "center",
					color: dark ? HX.dim : "#3c3f47",
					alpha: .85
				});
				overlays(ctx, K, dark ? { br: "view  perspective" } : {
					ink: true,
					br: "view  paper"
				});
			}
		},
		{
			id: "errors",
			at: (T) => keys(T).X[1],
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T), t = ctx.t, fk = flashK(t, K.X[1], 11);
				reset();
				const cam = ortho(ctx, [
					0,
					0,
					0
				], "front", WALL.h * 1.02);
				wallSet(ctx, cam, K, { word: {
					tex: wordMask("EXECUTION").tex,
					on: t >= K.X[1] ? 1 : 0
				} });
				flashLight(cam, [
					0,
					0,
					.1
				], fk, { scale: 1.3 });
				render(ctx, cam);
				if (remade(ctx)) keepCallout(ctx, cam, K);
				wallHud(ctx, K);
				overlays(ctx, K, { br: "view  front · orthographic · 48 × 96 threads" });
				look(ctx, {
					vignette: .32,
					ca: .08,
					...flashLook(t, K.X[1])
				});
			}
		},
		{
			id: "errOblique",
			at: (T) => keys(T).B(15),
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T), t = ctx.t, lt = t - K.B(15);
				reset();
				const cam = persp(ctx, [
					-9.5 + lt * .8,
					1.2,
					5.2
				], [
					-1.2,
					-.4,
					0
				], { fov: 44 });
				look(ctx, { vignette: .5 });
				instrument(ctx, "dither", (sub) => {
					wallSet(sub, cam, K, {
						focus: 7.8,
						aperture: .012,
						maxBlur: 10,
						word: { tex: wordMask("EXECUTION").tex }
					});
					render(sub, cam);
				}, {
					pix: 3,
					ink: [
						1,
						.3,
						.2
					],
					gain: 2.4
				});
				const L = ctx.text.overlay;
				L.text("await Promise.all(threads);", 1470, 700, {
					size: 22,
					weight: 500,
					font: "JetBrains Mono",
					color: HX.white,
					align: "right",
					alpha: .8
				});
				[
					`Uncaught (in promise) Error: thread 0x${10879 .toString(16).toUpperCase()} killed (137)`,
					"    at execute (world.js:113:9)",
					"    at run (world.js:112:3)",
					`    at Promise.all (index ${fmt(failedCount(t, K.X[1], ERR_W) - 1)})`
				].forEach((ln, i) => {
					const n = Math.floor(seg(lt, .04 + i * .07, .2 + i * .07) * ln.length);
					if (n) small(L, ln.slice(0, n), 1470, 740 + i * 24, {
						align: "right",
						color: i ? HX.dim : HX.soft,
						size: 15,
						alpha: .9
					});
				});
				if (remade(ctx)) keepCallout(ctx, cam, K, {
					dx: 70,
					dy: -70
				});
				wallHud(ctx, K);
				overlays(ctx, K, { br: "view  1-bit · bayer 8×8" });
			}
		},
		{
			id: "gather",
			at: (T) => keys(T).l111.start,
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T), t = ctx.t, lt = t - K.l111.start, rs = rebuildState(t, K, remade(ctx));
				reset();
				const cam = persp(ctx, [
					.35 - lt * .2,
					.55 - lt * .15,
					4.2 - lt * .4
				], [
					0,
					-.45 + lt * .35,
					0
				], { fov: 44 });
				codePlane(ctx, cam, "shards", "ch/c3/shards.js", {
					origin: [
						-5.6,
						7.5,
						0
					],
					cell: .1,
					cols: 120,
					rows: 150,
					rot: [
						-Math.PI / 2,
						0,
						0
					],
					pos: [
						0,
						-1.305,
						0
					],
					bright: .16,
					scroll: 0,
					focus: 4.5,
					aperture: .012,
					maxBlur: 12
				});
				drawShards(ctx, cam, rs, {
					focus: 4.5,
					aperture: .012,
					maxBlur: 14
				});
				tethers(rs);
				cursor(t);
				render(ctx, cam);
				think(ctx);
				readout(ctx, [
					["fragments", `${PRESENT.length} / 36`],
					["in flight", `${rs.flying}`],
					["placed", `${rs.placed}`]
				], { accent: HX.me });
				overlays(ctx, K);
				look(ctx, { vignette: .5 });
			}
		},
		{
			id: "fit",
			at: (T) => keys(T).B(17),
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T), t = ctx.t, lt = t - K.B(17), rs = rebuildState(t, K, remade(ctx));
				reset();
				const cam = persp(ctx, [
					1.5 - lt * .35,
					.3,
					3.2 - lt * .2
				], [
					.08,
					-.02,
					0
				], {
					fov: 40,
					roll: -.04
				});
				drawShards(ctx, cam, rs, {
					focus: 3.4,
					aperture: .016,
					maxBlur: 16
				});
				seams(t, rs);
				tethers(rs);
				cursor(t);
				render(ctx, cam);
				think(ctx);
				readout(ctx, [["placed", `${rs.placed} / ${PRESENT.length}`], ["fit", "Voronoi · 36 cells"]], { accent: HX.me });
				overlays(ctx, K);
				look(ctx, { vignette: .5 });
			}
		},
		{
			id: "missing",
			at: (T) => keys(T).tHave,
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T), t = ctx.t, lt = t - K.tHave, rs = rebuildState(t, K, remade(ctx));
				reset();
				const cam = persp(ctx, [
					0,
					0,
					3.55 - lt * .1
				], [
					0,
					0,
					0
				], { fov: 38 });
				drawShards(ctx, cam, rs);
				seams(t, rs);
				missingOutlines(ease.outCubic(seg(lt, 0, .25)));
				cursor(t, .6);
				hallucinated(ctx, cam, { reveal: seg(t, K.tHave + .12, K.tHave + .44) });
				render(ctx, cam);
				think(ctx);
				const L = ctx.text.overlay, ar = restoredArea();
				readout(ctx, [["restored", `${PRESENT.length} / 36 cells · ${(ar * 100).toFixed(1)} %`], ["hallucinated", `${36 - PRESENT.length} cells · ${(100 - ar * 100).toFixed(1)} %`]], {
					accent: HX.soft,
					keyW: 140
				});
				const big = [...MISSING].sort((a, b) => GEO.areas[b] - GEO.areas[a])[0], q = toDesign([...GEO.cent[big], 0], cam);
				callout(L, [q[0], q[1]], "hallucinated", {
					dx: q[0] > 960 ? 110 : -110,
					dy: -80,
					color: "#bfe3ef",
					size: 18,
					draw: seg(lt, .3, .5)
				});
				overlays(ctx, K);
				look(ctx, { vignette: .45 });
			}
		},
		{
			id: "jitter",
			at: (T) => keys(T).tYou,
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T), t = ctx.t, lt = t - K.tYou, rs = rebuildState(t, K, remade(ctx));
				reset();
				const c = [
					-.95 + lt * .12,
					.38,
					1.55 - lt * .1
				], f = [
					-.25,
					.12,
					0
				];
				const cam = persp(ctx, c, f, {
					fov: 34,
					roll: .05
				});
				drawShards(ctx, cam, rs, {
					focus: dist3(c, f),
					aperture: .03,
					maxBlur: 24,
					size: .0045,
					bright: .17
				});
				seams(t, rs, { k: .55 });
				missingOutlines(.8);
				hallucinated(ctx, cam, {
					focus: dist3(c, f),
					aperture: .03,
					maxBlur: 24
				});
				render(ctx, cam);
				think(ctx);
				readout(ctx, [
					["drift", `${(rs.J * .06 * .5).toFixed(3)}`],
					["rate", "15 Hz"],
					["copy", "unstable"]
				], { accent: HX.soft });
				overlays(ctx, K);
				look(ctx, { vignette: .55 });
			}
		},
		{
			id: "run",
			at: (T) => keys(T).l112.start,
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T), t = ctx.t, lt = t - K.l112.start, rs = rebuildState(t, K, remade(ctx));
				reset();
				if (remade(ctx)) return runSearch(ctx, K, t, lt, rs);
				const cam = persp(ctx, [
					0,
					.04,
					4.5 - lt * .55
				], [
					0,
					.02,
					0
				], { fov: 38 });
				drawShards(ctx, cam, rs);
				seams(t, rs, { k: .4 });
				missingOutlines(.7);
				cursor(t, 1);
				let locked = 0;
				PRESENT.forEach((i, k) => {
					const d = ease.outCubic(seg(t, K.l112.start + .05 + k * .022, K.l112.start + .3 + k * .022));
					if (d <= 0) return;
					const c = rs.cells[i], p = cellXf(c, GEO.cent[i]);
					O.lines.polyline([ME_P, p], {
						color: [
							.9,
							.12,
							.07
						],
						width: 1.3,
						draw: d
					});
					if (d >= 1) {
						locked++;
						const s = .05;
						for (const [sx, sy] of [
							[1, 1],
							[-1, 1],
							[1, -1],
							[-1, -1]
						]) {
							const cn = [
								p[0] + sx * s,
								p[1] + sy * s,
								p[2]
							];
							O.lines.segment(cn, [
								cn[0] - sx * s * .6,
								cn[1],
								cn[2]
							], {
								color: [
									1,
									.2,
									.1
								],
								width: 1.6
							});
							O.lines.segment(cn, [
								cn[0],
								cn[1] - sy * s * .6,
								cn[2]
							], {
								color: [
									1,
									.2,
									.1
								],
								width: 1.6
							});
						}
					}
				});
				render(ctx, cam);
				hallucinated(ctx, cam, { bright: .4 });
				const L = ctx.text.overlay, q = toDesign([
					0,
					0,
					0
				], cam);
				crosshair(L, q[0], q[1], 46, {
					color: HX.red,
					ring: true,
					alpha: .7 * seg(lt, 0, .2)
				});
				readout(ctx, [
					["target", "you · rebuilt"],
					["locked", `${locked} / ${PRESENT.length}`],
					["signal", "SIGKILL (9)"]
				]);
				runCall(ctx, K);
				overlays(ctx, K);
				look(ctx, { vignette: .5 });
			}
		},
		{
			id: "execute",
			at: (T) => keys(T).X[2],
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T), t = ctx.t, lt = t - K.X[2], rs = rebuildState(t, K, remade(ctx)), fk = flashK(t, K.X[2], 11);
				reset();
				if (remade(ctx)) return executeNothing(ctx, K, t, lt, rs);
				const cam = persp(ctx, add([
					0,
					.04,
					3.95 - lt * .25
				], shake(t, .03 * fk)), [
					0,
					.02,
					0
				], { fov: 38 });
				drawShards(ctx, cam, rs, { bright: .24 });
				seams(t, rs, { k: .4 });
				hallucinated(ctx, cam, { burst: ease.outCubic(seg(t, K.X[2] + .02, K.X[2] + .5)) });
				flashLight(cam, [
					0,
					0,
					.1
				], fk, { scale: 1.1 });
				render(ctx, cam);
				tokenWord(ctx, K);
				runCall(ctx, K);
				const alive = rs.cells.filter((c) => c.present && t < c.tb).length;
				readout(ctx, [["you", `${alive} / ${PRESENT.length}`], ["signal", "SIGKILL (9)"]]);
				overlays(ctx, K);
				look(ctx, {
					vignette: .5,
					...flashLook(t, K.X[2])
				});
			}
		},
		{
			id: "ashes",
			at: (T) => keys(T).B(23),
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T), t = ctx.t, lt = t - K.B(23), rs = rebuildState(t, K, remade(ctx));
				reset();
				if (remade(ctx)) return afterNothing(ctx, K, t, lt, rs);
				const k = ease.outCubic(seg(lt, 0, K.l114.start - K.B(23))), c = [
					lerp(.15, -.4, k),
					lerp(.1, .45, k),
					lerp(2.3, 5.4, k)
				];
				const cam = persp(ctx, c, [
					0,
					lerp(0, -.3, k),
					0
				], {
					fov: 40,
					roll: lerp(.02, -.05, k)
				});
				codePlane(ctx, cam, "shards", "ch/c3/shards.js", {
					origin: [
						-5.6,
						7.5,
						0
					],
					cell: .1,
					cols: 120,
					rows: 150,
					rot: [
						-Math.PI / 2,
						0,
						0
					],
					pos: [
						0,
						-1.305,
						0
					],
					bright: .15 * k,
					scroll: 0,
					focus: dist3(c, ME_P),
					aperture: .012,
					maxBlur: 12
				});
				drawShards(ctx, cam, rs, {
					bright: .7,
					size: .0065,
					holes: .8,
					focus: dist3(c, ME_P),
					aperture: .02,
					maxBlur: 26
				});
				cursor(t, .9);
				render(ctx, cam);
				tokenWord(ctx, K, 960, 300);
				runCall(ctx, K);
				const q = toDesign(ME_P, cam);
				crosshair(ctx.text.overlay, q[0], q[1], 30, {
					color: HX.me,
					label: "me",
					alpha: .6 * seg(lt, .15, .35)
				});
				readout(ctx, [["you", `0 / ${PRESENT.length}`], ["exit", "137 · SIGKILL"]]);
				overlays(ctx, K);
				look(ctx, { vignette: .5 });
			}
		},
		{
			id: "tighten",
			at: (T) => keys(T).l114.start,
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T), t = ctx.t, lt = t - K.l114.start, S = cubeS(t, K);
				reset();
				const cam = persp(ctx, [
					8.2 - lt * .5,
					5.6,
					17.5
				], [
					0,
					-.4,
					0
				], { fov: 42 });
				arrayPass(ctx, cam, K, {
					fog: .02,
					onlyCentre: true,
					edgeK: .6
				});
				ghostCube(CELL.S0, .5);
				embersIn(ctx, cam, K, {
					size: .04,
					bright: .35
				});
				dots(ctx, cam);
				render(ctx, cam);
				readout(ctx, [
					["S", S.toFixed(3)],
					["V = (2S)³", (8 * S ** 3).toFixed(1)],
					["S₀", `${CELL.S0} (dashed)`]
				], { keyW: 120 });
				overlays(ctx, K);
				look(ctx, { vignette: .5 });
			}
		},
		{
			id: "walls",
			at: (T) => keys(T).B(25),
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T), t = ctx.t, lt = t - K.B(25), S = cubeS(t, K), L = ctx.text.overlay;
				reset();
				const g = 6, w = 951, h = 531;
				[
					[
						"front",
						2,
						"front · xy"
					],
					[
						"top",
						1,
						"top · xz"
					],
					[
						"side",
						0,
						"side · zy"
					],
					[
						"persp",
						-1,
						"perspective"
					]
				].forEach(([dir, axis, label], i) => {
					const rect = [
						g + i % 2 * 957,
						g + Math.floor(i / 2) * 537,
						w,
						h
					];
					let cam;
					ctx.viewport(rect, (wp, hp) => {
						O.lines.begin();
						if (axis >= 0) {
							cam = ortho(ctx, [
								0,
								0,
								0
							], dir, 8.8, {
								aspect: wp / hp,
								inset: true
							});
							cubeLines(S, axis, 1, 2);
						} else {
							cam = persp(ctx, around([
								0,
								0,
								0
							], 12.5, .62 + lt * .1, .38), [
								0,
								0,
								0
							], {
								fov: 44,
								aspect: wp / hp,
								inset: true
							});
							boxEdges(O.lines, S, scl([
								1,
								.2,
								.12
							], 1.2), 5.2);
						}
						O.me.points.visible = O.you.points.visible = false;
						dots(ctx, cam, {
							haloW: 44,
							halo: 1.4
						}, hp);
						O.lines.end(ctx).res(wp, hp);
						O.lines.mesh.visible = true;
						ctx.draw(O.scene, cam);
					});
					viewportFrame(L, rect, label, { labelColor: HX.soft });
					if (axis === 2 || axis === 1) {
						const a = toDesign(axis === 2 ? [
							-S,
							-S,
							0
						] : [
							-S,
							0,
							S
						], cam, rect), b = toDesign(axis === 2 ? [
							S,
							-S,
							0
						] : [
							S,
							0,
							S
						], cam, rect);
						dimLine(L, [a[0], a[1]], [b[0], b[1]], `2S = ${(2 * S).toFixed(3)}`, {
							offset: -34,
							color: HX.soft,
							alpha: .8,
							size: 15
						});
						const m = toDesign(DOT_ME, cam, rect), wl = toDesign([
							-S,
							0,
							0
						], cam, rect);
						dimLine(L, [wl[0], wl[1]], [m[0], m[1]], `${(S - .75).toFixed(3)}`, {
							offset: 26,
							color: HX.me,
							alpha: .8,
							size: 14
						});
					}
				});
				readout(ctx, [["S", S.toFixed(3)], ["gap", (S - .75 - R_ME * .62).toFixed(3)]], { y: 170 });
				overlays(ctx, K);
				look(ctx, {
					vignette: .2,
					ca: .08
				});
			}
		},
		{
			id: "lattice",
			at: (T) => keys(T).tTrap,
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T), t = ctx.t, lt = t - K.tTrap, S = cubeS(t, K);
				reset();
				const cam = persp(ctx, [
					62 + lt * 5,
					44 + lt * 3.5,
					108 + lt * 8
				], [
					0,
					0,
					0
				], { fov: 44 });
				arrayPass(ctx, cam, K, {
					fog: .012,
					edgeK: .8,
					glassK: .5
				});
				dots(ctx, cam);
				render(ctx, cam);
				const L = ctx.text.overlay, q = toDesign([
					0,
					0,
					0
				], cam);
				crosshair(L, q[0], q[1], 26, {
					color: HX.soft,
					label: "cell (0, 0, 0) · me · you",
					alpha: .7
				});
				readout(ctx, [
					["cells", "∞"],
					["S / C", (S / CELL.C).toFixed(3)],
					["S", S.toFixed(3)]
				]);
				overlays(ctx, K);
				look(ctx, { vignette: .5 });
			}
		},
		{
			id: "slow",
			at: (T) => keys(T).l115.start,
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T), t = ctx.t, lt = t - K.l115.start, S = cubeS(t, K);
				reset();
				const c = around([
					0,
					0,
					0
				], 3.45 - lt * .06, -.34 + lt * .05, -.17);
				const cam = persp(ctx, c, [
					.05,
					.04,
					0
				], {
					fov: 38,
					roll: .05
				});
				const fd = dist3(c, [
					0,
					0,
					0
				]);
				arrayPass(ctx, cam, K, {
					fog: .05,
					onlyCentre: true,
					edgeK: .6,
					thin: true
				});
				embersIn(ctx, cam, K, {
					size: .014,
					bright: .32,
					focus: fd,
					aperture: .03,
					maxBlur: 28
				});
				dots(ctx, cam, {
					focus: fd,
					aperture: .008
				});
				render(ctx, cam);
				readout(ctx, [
					["timescale", `${SLOW.toFixed(3)} ×`],
					["S", S.toFixed(4)],
					["dt", `${(1e3 / 30 * SLOW).toFixed(2)} ms`]
				]);
				overlays(ctx, K);
				look(ctx, { vignette: .55 });
			}
		},
		{
			id: "fade",
			at: (T) => keys(T).tFade,
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T), t = ctx.t, k = seg(t, K.tFade, K.end);
				reset();
				const e = ease.outCubic(k), cam = persp(ctx, [
					lerp(.35, 0, e),
					lerp(.12, 0, e),
					lerp(3.4, 6.1, e)
				], [
					0,
					0,
					0
				], { fov: 36 });
				const red = 1 - ease.inOutSine(seg(t, K.tFade + .1, K.end - .35));
				if (red > 0) {
					arrayPass(ctx, cam, K, {
						fog: .05,
						onlyCentre: true,
						gain: red,
						edgeK: .7,
						thin: true
					});
					embersIn(ctx, cam, K, {
						size: .012,
						bright: .3 * red
					});
				}
				stars(ctx, cam, .12 * ease.inOutSine(seg(t, K.end - .5, K.end - .05)));
				const d = ease.inOutSine(seg(t, K.tFade, K.end - .3));
				dots(ctx, cam, {
					revealMe: lerp(density(pxPerUnit(cam, DOT_ME), R_ME * .62, O.me.N, .5), .25, d),
					revealYou: lerp(density(pxPerUnit(cam, DOT_YOU), R_YOU * .75, O.you.N, .5), .6, d)
				});
				render(ctx, cam);
				overlays(ctx, K, { console: 1 - seg(t, K.end - .45, K.end - .1) });
				const m = ease.inOutSine(seg(t, K.tFade, K.end - .15)), o = { vignette: .55 };
				for (const key in LOVE_LOOK) {
					const a = key === "vignette" ? .55 : BASE_LOOK[key], b = LOVE_LOOK[key];
					o[key] = Array.isArray(a) ? a.map((v, i) => lerp(v, b[i], m)) : lerp(a, b, m);
				}
				look(ctx, o);
			}
		}
	]
});
//#endregion
