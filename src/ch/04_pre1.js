import { chapter } from "../engine/timeline.js?v=vYBbdLfo";
import { TAU, clamp, ease, lerp, seg, smoothstep } from "../engine/math.js?v=BJIlRm7-";
import { COL, HEX } from "../theme.js?v=Bj33PIbo";
import { remade } from "../lib/published.js?v=aV_CU5HV";
import { OrthographicCamera, Scene, Vector4 } from "../../vendor/three/build/three.core.js?v=q9f7JKE-";
import { GlowLines } from "../engine/lines.js?v=B_AAaaTO";
import { rig } from "../engine/rig.js?v=39-joEtk";
import { consoleLog, newCamera } from "../lib/look.js?v=BfOqFF7i";
import { gridPlane } from "../lib/env.js?v=CIN_DqPv";
import { callout, crosshair, dimLine, frame, readout, toDesign } from "../lib/hud.js?v=BgmSZjmG";
import { GlyphField, codeBlock, source } from "../lib/glyphs.js?v=DWbHICXG";
import { capture, view } from "../lib/modes.js?v=Cu3GYO-2";
import { aim, around, blueprint, dollyDist } from "./c1/view.js?v=BxrQZln-";
import { PAL } from "./c1/palette.js?v=saiYSP4J";
import { NetGPU } from "./c1/network.js?v=D20u632s";
import { arcFlicker, arcSeed, bolt, drawBolt, drawSparks } from "./pre1/arc.js?v=BxyNPBWo";
import { LABELS, circuitState, drawCircuit } from "./pre1/circuit.js?v=BsZ20r17";
import { SCOPE, makeScreen, ripple, scopeWave } from "./pre1/scope.js?v=t3nDea09";
import { apertureR, makeIris } from "./pre1/iris.js?v=DX1hWstN";
import { LENS, traceHalf } from "./pre1/lens-model.js?v=l5DjtLSU";
import { makeLens, setLens } from "./pre1/lens.js?v=CgHB4ugb";
import { FIB, GOLDEN, makePhyllo, parastichies } from "./pre1/phyllo.js?v=DT14jgjH";
import { TUN, decadeLabel, drawTunnel } from "./pre1/tunnel.js?v=BuMZgwqS";
import { MILESTONES, makeSky, setSky, timeOfYear, yearAt, yearLabel } from "./pre1/sky.js?v=dNsHxioc";
import { DUO, buildTraj, drawDuoLines, duoKeys, duoState, duoUniforms, makeDuo, orbitAt, pairCam } from "./pre1/duo.js?v=BqkwC8i9";
//#region src/ch/04_pre1.js
var ELEC = [
	.3,
	.56,
	1
];
var ELEC_HOT = [
	.78,
	.9,
	1
];
var PAPER = [
	.93,
	.92,
	.88
];
var PAPER_LIN = PAPER.map((c) => c ** 2.2);
var INK = {
	text: "#15171c",
	dim: "#5a6070",
	accent: "#1d5f86",
	gold: "#8a5c0a"
};
var LV = 1;
var O = null;
var KC = null;
function keys(T) {
	if (KC?.T === T) return KC;
	const s0 = T.section("pre1").start, b0 = Math.round(T.beatAt(s0));
	const B = (k) => T.beatTime(b0 + k), L = (s) => T.findLine(s);
	const l25 = L("AC to DC"), l26 = L("blind my vision"), l27 = L("So dizzy"), l28 = L("we can travel"), l29 = L("A.D"), l30 = L("we can unite"), l31 = L("So deeply");
	return KC = {
		T,
		s0,
		B,
		beat: B(1) - B(0),
		l25,
		l26,
		l27,
		l28,
		l29,
		l30,
		l31,
		tAC: l25.words[1].start,
		tBlind: l26.words[2].start,
		tMy: l26.words[3].start,
		tDz1: l27.words[1].start,
		tDz2: l27.words[3].start,
		tTravel: l28.words[3].start,
		tBC: l29.words[3].start,
		tCan: l30.words[2].start,
		tUnite: l30.words[3].start,
		end: T.section("c1").start,
		dk: duoKeys(T)
	};
}
function reset() {
	for (const o of [
		O.code.points,
		O.lines.mesh,
		O.floor,
		O.wall,
		O.screen,
		O.iris,
		O.phyllo.points,
		O.duo.me.points,
		O.duo.you.points
	]) o.visible = false;
	O.lines.mesh.position.set(0, 0, 0);
	O.lines.begin();
}
function render(ctx, cam) {
	O.lines.mesh.visible = true;
	O.lines.end(ctx);
	ctx.draw(O.scene, cam);
}
/**
* CODE background: a page of this film's own source (the file that draws the shot) as glyph particles, dim, typed in
* reading order from `reveal` and scrolling up. o: file, key, origin (page top-left, in the page's frame), cell, cols,
* bright, scroll, focus, aperture, pos + yaw (the page's frame: placed at pos, turned about y to face that azimuth).
*/
function codePage(ctx, cam, o, hPx = ctx.H) {
	const gf = O.code;
	gf.points.visible = true;
	gf.points.position.set(...o.pos ?? [
		0,
		0,
		0
	]);
	gf.points.rotation.set(0, o.yaw ?? 0, 0);
	gf.text(`pre1/src:${o.file}`, source(o.file));
	const lay = gf.layout(`pre1/page:${o.key}`, codeBlock(gf, {
		origin: o.origin,
		cell: o.cell,
		cols: o.cols ?? 150
	}));
	gf.set({
		a: lay,
		t: ctx.t,
		size: o.cell,
		bright: o.bright ?? .22,
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
function floor(y, intensity = 1, o = {}) {
	O.floor.visible = true;
	O.floor.position.set(0, y, 0);
	O.floor.userData.set({
		intensity,
		fade: o.fade ?? .07,
		reveal: 1,
		revealR: 60
	});
}
function overlays(ctx, K, extra = {}) {
	const ink = extra.ink;
	frame(ctx.text.overlay, ctx.t, ctx.T, {
		label: "current",
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
		ca: .3,
		vignette: .42,
		grain: .03,
		exposure: 1.05,
		...o
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
	color: o.color ?? HEX.dim,
	align: o.align ?? "left",
	alpha: o.alpha ?? .85
});
/**
* A segment clipped to the camera's view frustum widened by m (Liang–Barsky in clip space), or null. Long lines that
* run past the camera are cut where they leave the frame, so their screen-space quads stay short (GlowLines loses
* precision on quads that reach to the near plane: such lines render faint and dotted).
*/
var _v = new Vector4();
function clipToView(a, b, cam, m = 1.3) {
	const cc = (p) => {
		_v.set(p[0], p[1], p[2], 1).applyMatrix4(cam.matrixWorldInverse).applyMatrix4(cam.projectionMatrix);
		return [
			_v.x,
			_v.y,
			_v.w
		];
	};
	const A = cc(a), B = cc(b);
	let s0 = 0, s1 = 1;
	for (const f of [
		(c) => c[2] - .02,
		(c) => m * c[2] - c[0],
		(c) => m * c[2] + c[0],
		(c) => m * c[2] - c[1],
		(c) => m * c[2] + c[1]
	]) {
		const fa = f(A), fb = f(B);
		if (fa < 0 && fb < 0) return null;
		if (fa < 0) s0 = Math.max(s0, fa / (fa - fb));
		else if (fb < 0) s1 = Math.min(s1, fa / (fa - fb));
	}
	return s0 < s1 ? [a.map((v, i) => lerp(v, b[i], s0)), a.map((v, i) => lerp(v, b[i], s1))] : null;
}
function gapLines(o = {}, cam) {
	const s1 = clipToView([
		9,
		1.045,
		0
	], [
		21,
		1.045,
		0
	], cam), s2 = clipToView([
		9,
		LV,
		0
	], [
		21,
		LV,
		0
	], cam);
	if (s1) O.lines.segment(...s1, {
		color: COL.me.map((c) => c * 1.2),
		width: 2
	});
	if (s2) O.lines.segment(...s2, {
		color: COL.you.map((c) => c * 1.3),
		width: 2
	});
	if (o.current > 0) for (let i = 0; i < 24; i++) {
		const f = (i / 24 + o.lt * .5) % 1, k = o.current * (1 - f) ** 1.2;
		const x1 = 13.35 + f * f * 7.5, x2 = 13.35 - f * f * 3.5;
		O.lines.segment([
			x1,
			1.045,
			0
		], [
			x1 + .012 + .05 * f,
			1.045,
			0
		], {
			color: ELEC_HOT.map((c) => c * 2.6 * k),
			width: 4
		});
		O.lines.segment([
			x2,
			LV,
			0
		], [
			x2 - .012 - .05 * f,
			LV,
			0
		], {
			color: COL.gold.map((c) => c * 2.6 * k),
			width: 4
		});
	}
}
function scopeParams(t, K) {
	return {
		signal: ease.outCubic(seg(t, K.tAC - .04, K.tAC + .12)),
		fold: ease.inOutCubic(seg(t, K.B(6) + .03, K.B(6.5) - .02)),
		wt: 22 * ease.inCubic(seg(t, K.B(6.5) + .02, K.l26.start - .04)),
		head: -5 + 10 * ((t - K.l25.start) / K.beat % 1)
	};
}
function drawScope(ctx, st, o = {}) {
	O.screen.userData.set({
		fold: st.fold,
		tau: st.wt,
		head: st.head,
		signal: st.signal,
		persist: 2.6,
		gain: o.gain ?? 1,
		grid: o.grid ?? 1,
		width: o.width ?? .035,
		trace: COL.me,
		gridCol: [
			.09,
			.26,
			.7
		]
	});
	const w = 5 * SCOPE.div + .12, h = 4 * SCOPE.div + .12, c = [
		.14,
		.3,
		.75
	].map((v) => v * .5);
	O.lines.polyline([
		[
			-w,
			-h,
			0
		],
		[
			w,
			-h,
			0
		],
		[
			w,
			h,
			0
		],
		[
			-w,
			h,
			0
		],
		[
			-w,
			-h,
			0
		]
	], {
		color: c,
		width: 1.6
	});
}
function scopeLabels(ctx, cam, st) {
	const a = toDesign([
		-5 * SCOPE.div,
		-4 * SCOPE.div - .1,
		0
	], cam), b = toDesign([
		5 * SCOPE.div,
		-4 * SCOPE.div - .1,
		0
	], cam);
	small(ctx.text.overlay, "CH1  0.5 V/div", a[0], a[1] + 12, {
		color: HEX.me,
		alpha: .6
	});
	small(ctx.text.overlay, "5 ms/div", b[0], b[1] + 12, {
		align: "right",
		color: HEX.me,
		alpha: .6
	});
}
function irisState(t, K) {
	const step = (t0, a, b) => lerp(a, b, ease.outBack(seg(t, t0, t0 + .13), 1.1));
	let N = 2.8;
	if (t >= K.tBlind) N = step(K.tBlind, 2.8, 5.6);
	if (t >= K.tMy) N = step(K.tMy, 5.6, 11);
	let ap = apertureR(N);
	const close = ease.inOutCubic(seg(t, K.B(10), K.B(10) + .4));
	if (t >= K.B(10)) ap = lerp(apertureR(11), 0, close);
	const comp = t >= K.B(10) ? lerp(1, 1.8, ease.inQuad(seg(t, K.B(10), K.B(10) + .32))) : 1;
	return {
		N: t < K.B(10) ? N : 11 / Math.max(1 - close, .001),
		ap,
		rot: -.25 + 1.1 * (1 - ap / apertureR(2)),
		close,
		comp
	};
}
/**
* (The remake, docs/REMAKE.md §12.7 item 3) the iris as a real lens seen in macro, straight into the front element
* (pre1/lens.js): the scope's flat trace, behind the diaphragm, switches off into a point over the line's first two
* words; then irisState's rhythm, two stops a word: the blades close, the aperture ring clicks round to the next
* number, the glow through the opening and the ghosts turn from round to hexagonal, and the smallest opening throws
* the six-point star. Returns the camera.
*/
var LENS_LIGHT = [
	.5,
	.8,
	1
];
function irisLens(ctx, K, st) {
	const t = ctx.t, lt = ctx.lt, k = ease.inOutSine(seg(lt, 0, 1.5)), up = ease.inOutSine(seg(lt, .05, 1));
	const cam = persp(ctx, [
		lerp(.26, .16, k),
		lerp(.2, .13, k),
		lerp(3.12, 2.84, k)
	], [
		0,
		lerp(-.17, .03, up),
		-.3
	], {
		fov: 36,
		roll: .015 * Math.sin(lt * 1.1)
	});
	const trace = traceHalf(t, K.l26.start - .03, K.l26.words[1].start + .12, 1.15), pt = 1 - Math.min(1, trace / .25);
	setLens(O.lens, cam, ctx.H, {
		N: st.N,
		trace,
		line: 3.2 * Math.sqrt(1.15 / (trace + .1)) * (1 - .9 * pt),
		point: 34 * pt * pt,
		wash: .14,
		rim: .25 + .3 * pt,
		star: .1 * smoothstep(4, 11, st.N),
		starLen: 90,
		ghost: .35 * (2.8 / st.N) ** .4,
		key: 3.2,
		veil: 0,
		lightCol: LENS_LIGHT,
		dof: 110
	});
	ctx.pass(O.lens);
	return cam;
}
/** (The remake) the blades fly open and the light floods the glass: as published (blind), in the lens. Returns the camera. */
function blindLens(ctx, K, lt, open, flood, N) {
	const z = 2.15 - lt * .55, cam = persp(ctx, [
		.24 - lt * .18,
		-.17 + lt * .1,
		z
	], [
		0,
		0,
		-.5
	], {
		fov: 34,
		roll: -.08 + lt * .1
	});
	const gain = (11 / N) ** 2 / 64;
	setLens(O.lens, cam, ctx.H, {
		N,
		trace: 0,
		line: 0,
		point: 34 * (1 + 2 * flood),
		wash: .14 + 1.6 * gain + 4 * flood,
		rim: .55 + 1.2 * gain,
		star: .1 * (1 - open),
		starLen: 90,
		ghost: .35 + .8 * flood,
		veil: 3 * flood * flood + .15 * gain,
		veilR: .25 + 1.2 * flood,
		dof: 110,
		key: 3.2,
		lightCol: LENS_LIGHT,
		focus: z - LENS.zD / LENS.n
	});
	ctx.pass(O.lens);
	return cam;
}
function phylloState(t, K) {
	const lt = t - K.l27.start;
	const since = t >= K.tDz2 ? t - K.tDz2 : t >= K.tDz1 ? t - K.tDz1 : lt;
	return {
		alpha: GOLDEN + (t >= K.tDz2 ? -1 : 1) * .0019 * ease.inOutSine(seg(since, .12, .75)),
		rot: -lt * (.9 + .8 * seg(t, K.tDz1, K.l28.start)),
		grow: ease.outCubic(seg(t, K.l27.start, K.tDz1 + .35))
	};
}
function drawPhyllo(ctx, cam, st, o = {}, hPx = ctx.H) {
	O.phyllo.set({
		t: ctx.t,
		size: o.size ?? .0055,
		bright: o.bright ?? .32,
		sparkle: .15,
		focus: o.focus,
		aperture: o.aperture ?? 0,
		maxBlur: o.maxBlur ?? 40,
		u: {
			uAlpha: st.alpha,
			uRot: st.rot,
			uGrow: st.grow,
			uSeedR: .011,
			uDome: .05,
			uFam: 1,
			uColA: COL.me,
			uColB: COL.meDeep.map((c, i) => lerp(c, COL.me[i], .55)),
			uGold: COL.gold
		}
	}, cam, hPx);
}
function phylloHud(ctx, st, ink = false) {
	const [a, b] = parastichies(st.alpha), fib = FIB.includes(a) && FIB.includes(b);
	readout(ctx.text.overlay, 1500, 150, [
		["α", `${(st.alpha * 180 / Math.PI).toFixed(3)}°`],
		["spirals", `${a} · ${b}`],
		["", fib ? "Fibonacci  (α = golden)" : "not Fibonacci"]
	], { accent: ink ? fib ? INK.gold : INK.accent : fib ? HEX.gold : HEX.me });
}
function tunnelZ(t, K) {
	const tau = t - K.l28.start;
	return 3 - (6 * tau + 12.85 * tau * tau);
}
function tunnelHud(ctx, K, camZ, extra = []) {
	const m = Math.max(0, -camZ / TUN.gap) / 4, [, human] = decadeLabel(Math.max(0, Math.floor(m)));
	readout(ctx.text.overlay, 1500, 150, [
		["Δt", `−10^${m.toFixed(2)} s`],
		["decade", human],
		...extra
	], { accent: HEX.gold });
}
var ROMAN = [
	"XII",
	"III",
	"VI",
	"IX"
];
function tunnelLabels(ctx, cam, camZ, o = {}) {
	const L = ctx.text.scene;
	for (let k = 0; k < TUN.rings; k++) {
		const z = -k * TUN.gap, dz = camZ - z;
		if (dz < .7 || dz > (o.far ?? 20)) continue;
		const al = clamp((dz - .7) / 1.2) * Math.exp(-dz * .07), sz = clamp(300 / dz, 11, 54);
		if (k % 4 === 0) {
			const [a, b] = decadeLabel(k / 4), q = toDesign([
				0,
				TUN.R + .2,
				z
			], cam);
			if (q[2] < 1) {
				L.text(a, q[0], q[1] - sz * .2, {
					size: sz,
					weight: 700,
					color: HEX.gold,
					alpha: al
				});
				L.text(b, q[0], q[1] + sz * .75, {
					size: sz * .5,
					weight: 500,
					color: HEX.gold,
					alpha: al * .75
				});
			}
		}
		if (dz < 9) ROMAN.forEach((r, i) => {
			const a = Math.PI / 2 - i * Math.PI / 2 + (k % 2 ? 1 : -1) * .05 * (ctx.t - o.t0), q = toDesign([
				Math.cos(a) * (TUN.R - .32),
				Math.sin(a) * (TUN.R - .32),
				z
			], cam);
			if (q[2] < 1) L.text(r, q[0], q[1], {
				size: sz * .42,
				weight: 600,
				color: HEX.gold,
				alpha: al * .8
			});
		});
	}
}
/**
* (The remake, docs/REMAKE.md §4 B) "we" travel: me and you fly side by side ahead of the camera, down the tunnel.
* They overtake it from behind as the line starts and are both in the frame by the bar line (16 beats), where the
* word is sung; world positions follow the camera's z, so the tunnel and the outside view (travel) agree.
*/
var PAIR_TUN = {
	me: [.3, -.55],
	you: [.9, -.55],
	d: 1.6
};
function tunnelPair(K, t, camZ) {
	const k = ease.outCubic(seg(t, K.l28.start + .04, K.B(16))), d = lerp(-1.2, PAIR_TUN.d, k);
	const bob = (ph, a) => a * Math.sin(2.2 * t + ph);
	return {
		me: [
			PAIR_TUN.me[0] + bob(0, .015),
			PAIR_TUN.me[1] + bob(1.3, .02),
			camZ - d + bob(2, .04)
		],
		you: [
			PAIR_TUN.you[0] + bob(2.1, .015),
			PAIR_TUN.you[1] + bob(.4, .02),
			camZ - d - .08 + bob(.7, .04)
		]
	};
}
function drawTunnelPair(ctx, cam, K, camZ, o = {}) {
	const t = ctx.t, pr = tunnelPair(K, t, camZ), g = o.gain ?? 1;
	for (const [p, col] of [[pr.me, COL.me], [pr.you, COL.you]]) {
		O.lines.segment(p, p, {
			color: col.map((v) => v * 2.8 * g),
			width: 24 * (o.size ?? 1)
		});
		O.lines.segment(p, p, {
			color: col.map((v) => v * .5 * g),
			width: 72 * (o.size ?? 1)
		});
	}
	return pr;
}
function tunnelPairLabels(ctx, cam, K, pr) {
	const t = ctx.t, a = seg(t, K.B(16) - .1, K.B(16) + .1) * (1 - seg(t, K.B(17.5), K.B(18)));
	if (a <= 0) return;
	const m = toDesign(pr.me, cam), y = toDesign(pr.you, cam);
	if (m[2] < 1) small(ctx.text.overlay, "me", m[0] - 12, m[1] + 34, {
		align: "right",
		color: HEX.me,
		alpha: .85 * a,
		size: 16
	});
	if (y[2] < 1) small(ctx.text.overlay, "you", y[0] + 12, y[1] + 34, {
		color: HEX.you,
		alpha: .85 * a,
		size: 16
	});
}
var LAT = 38 * Math.PI / 180;
var POLE = [
	0,
	Math.sin(LAT),
	-Math.cos(LAT)
];
function skyState(t, K) {
	const year = yearAt(t, K.l29.start, K.tBC, K.l30.start);
	return {
		year,
		th0: 0,
		th1: -(2026 - year) * .00118
	};
}
/** The milestones already passed by the rewinding year counter: newest on top, each flashing as it is passed. */
function milestones(ctx, K, x = 1470, y = 632) {
	const L = ctx.text.overlay, t = ctx.t;
	K.mile ??= MILESTONES.map(([yr, name]) => ({
		yr,
		name,
		tp: timeOfYear(yr, K.l29.start, K.tBC, K.l30.start)
	}));
	K.mile.filter((m) => t >= m.tp).reverse().slice(0, 6).forEach((m, i) => {
		const age = t - m.tp, flash = Math.exp(-age * 10), a = (i ? .62 - i * .08 : 1) * (1 - seg(age, 1.1, 1.5));
		if (a <= 0) return;
		const when = m.yr > 0 ? String(m.yr) : `c. ${1 - m.yr} B.C`;
		L.text(`${when}  ${m.name}`, x, y + i * 30, {
			size: 19 + 5 * flash,
			weight: i ? 500 : 600,
			font: "JetBrains Mono",
			color: flash > .35 ? HEX.white : i ? HEX.dim : HEX.gold,
			align: "right",
			alpha: a,
			glow: 10 * flash,
			glowColor: HEX.gold
		});
	});
}
function yearHud(ctx, st, x = 1470, y = 470) {
	const [n, era] = yearLabel(st.year), L = ctx.text.overlay;
	L.text(n, x, y, {
		size: 64,
		weight: 700,
		font: "JetBrains Mono",
		color: HEX.gold,
		align: "right",
		glow: 12,
		glowColor: HEX.gold
	});
	L.text(era, x, y + 56, {
		size: 24,
		weight: 600,
		font: "JetBrains Mono",
		color: HEX.white,
		align: "right",
		alpha: .85
	});
	small(L, "year  (astronomical: 0 = 1 B.C)", x, y + 92, {
		align: "right",
		alpha: .55
	});
}
function pair(ctx, cam, K, o = {}, hPx = ctx.H) {
	const st = duoState(ctx.t, K.dk, O.tr);
	for (const who of ["me", "you"]) O.duo[who].set({
		t: ctx.t,
		size: o.size ?? (who === "me" ? .0056 : .0066),
		bright: (o.bright ?? .1) * (who === "you" ? 1.6 : 1),
		sparkle: o.sparkle ?? .45,
		focus: o.focus,
		aperture: o.aperture ?? 0,
		maxBlur: o.maxBlur ?? 40,
		u: duoUniforms(st, who, PAL.c1, { clipY: o.clipY })
	}, cam, hPx);
	drawDuoLines(O.lines, O.tr, st, PAL.c1, {
		clipY: o.clipY,
		...o.lines
	});
	return st;
}
function orbitPlane(o = {}) {
	const y = DUO.yTop, c = PAL.c1.dim.map((v) => v * (o.gain ?? .6));
	for (const r of [
		.5,
		1,
		1.5,
		2,
		2.5,
		3,
		3.5
	]) {
		const pts = [];
		for (let i = 0; i <= 120; i++) {
			const a = i / 120 * TAU;
			pts.push([
				Math.cos(a) * r,
				y,
				Math.sin(a) * r
			]);
		}
		O.lines.polyline(pts, {
			color: c.map((v) => v * (r % 1 ? .6 : 1)),
			width: 1.2
		});
	}
	for (let k = 0; k < 12; k++) {
		const a = k / 12 * TAU;
		O.lines.segment([
			Math.cos(a) * .5,
			y,
			Math.sin(a) * .5
		], [
			Math.cos(a) * 3.5,
			y,
			Math.sin(a) * 3.5
		], {
			color: c.map((v) => v * .5),
			width: 1
		});
	}
}
function timeAxis(ctx, cam, st, K) {
	const top = DUO.yTop, len = st.lag * st.stretch * st.v, c = PAL.c1.dim.map((v) => v * 1.4);
	if (len < .05) return;
	O.lines.segment([
		0,
		top,
		0
	], [
		0,
		top - len,
		0
	], {
		color: c,
		width: 1.2
	});
	for (let s = .5; s * st.v <= len; s += .5) {
		const y = top - s * st.v;
		O.lines.segment([
			-.06,
			y,
			0
		], [
			.06,
			y,
			0
		], {
			color: c.map((v) => v * 1.3),
			width: 1.3
		});
		if (ctx && cam) {
			const q = toDesign([
				.1,
				y,
				0
			], cam);
			small(ctx.text.overlay, `t − ${s.toFixed(1)} s`, q[0] + 10, q[1], {
				size: 14,
				alpha: .55 * st.stretch
			});
		}
	}
}
chapter({
	id: "pre1",
	from: (T) => T.section("pre1").start,
	to: (T) => T.section("c1").start,
	init(ctx) {
		const K = keys(ctx.T);
		O = {
			scene: new Scene(),
			persp: newCamera(38),
			ortho: new OrthographicCamera(-1, 1, 1, -1, .01, 400)
		};
		O.code = new GlyphField({ count: 16384 });
		O.lines = new GlowLines(24e3);
		O.floor = gridPlane({ plane: "xz" });
		O.wall = gridPlane({
			plane: "xy",
			fade: .05
		});
		O.screen = makeScreen();
		O.iris = makeIris();
		if (remade(ctx)) O.lens = makeLens();
		O.phyllo = makePhyllo();
		O.gpu = new NetGPU();
		O.tr = buildTraj(K.dk);
		O.duo = makeDuo(O.tr, O.gpu);
		O.sky = makeSky();
		O.scene.add(O.floor, O.wall, O.code.points, O.screen, O.iris, O.phyllo.points, O.duo.me.points, O.duo.you.points, O.lines.mesh);
	},
	shots: [
		{
			id: "arc",
			at: (T) => keys(T).s0,
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T), t = ctx.t, lt = t - K.s0;
				reset();
				const k = ease.inOutSine(seg(lt, 0, 2 * K.beat)), y = 1.022;
				const cam = persp(ctx, [
					lerp(12.75, 13.04, k),
					y,
					lerp(.42, .21, k)
				], [
					13.35,
					y,
					0
				], { fov: 34 });
				gapLines({
					current: ease.outCubic(seg(lt, .05, .4)),
					lt
				}, cam);
				const A = [
					13.35,
					1.045,
					0
				], B = [
					13.35,
					LV,
					0
				];
				drawBolt(O.lines, bolt(A, B, arcSeed(t), {
					depth: 6,
					rough: .3,
					branches: 4,
					reach: .7
				}), {
					core: ELEC_HOT,
					halo: ELEC,
					width: 2.6,
					gain: arcFlicker(t)
				});
				drawSparks(O.lines, A, t, K.s0, 11, {
					rate: 80,
					life: .24,
					speed: .1,
					gravity: -.25,
					color: ELEC_HOT,
					width: 1.8
				});
				drawSparks(O.lines, B, t, K.s0, 12, {
					rate: 80,
					life: .24,
					speed: .1,
					gravity: -.25,
					color: COL.gold,
					width: 1.8
				});
				render(ctx, cam);
				const a = toDesign(A, cam), b = toDesign(B, cam);
				dimLine(ctx.text.overlay, a, b, "ε → 0", {
					offset: 90,
					color: HEX.white
				});
				readout(ctx.text.overlay, 1500, 150, [["E = V/ε", "22.2 MV/m"], ["air", "3.0 MV/m"]], {
					accent: HEX.me,
					keyW: 120
				});
				overlays(ctx, K);
				const strike = Math.max(0, 1 - lt / .09) ** 2.4;
				look(ctx, {
					bloom: lerp(.8, 1.05, seg(lt, 0, .3)),
					threshold: lerp(1.1, .95, seg(lt, 0, .3)),
					vignette: .55,
					fade: .55 * strike,
					fadeCol: [
						.62,
						.8,
						1
					]
				});
			}
		},
		{
			id: "circuit",
			at: (T) => keys(T).B(2),
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T), t = ctx.t, lt = t - K.B(2);
				reset();
				const off = [
					.5,
					.37,
					0
				], at = (p) => [
					p[0] + off[0],
					p[1] + off[1],
					p[2] ?? 0
				];
				const cam = ortho(ctx, at([.1, -.02]), "front", lerp(4.85, 4.5, ease.outCubic(seg(lt, 0, .7))));
				codePage(ctx, cam, {
					file: "ch/pre1/circuit.js",
					key: "circuit",
					origin: [
						-3.75,
						2.62,
						-1
					],
					cell: .085,
					cols: 170,
					bright: .2,
					reveal: ease.outCubic(seg(lt, 0, .5)) * 1.001,
					scroll: lt * .22
				});
				O.lines.mesh.position.set(...off);
				const st = circuitState(t, K.B(3), K.beat);
				drawCircuit(O.lines, st, {
					wire: [
						.22,
						.62,
						1
					].map((c) => c * .7),
					part: COL.white.map((c) => c * 1.1),
					dot: ELEC_HOT,
					hot: COL.gold
				});
				if (t >= K.B(3)) drawSparks(O.lines, [
					-1.75,
					1.35,
					0
				], t, K.B(3), 21, {
					rate: 160,
					dur: .1,
					life: .26,
					speed: .9,
					gravity: -2.5,
					color: COL.gold,
					width: 2,
					flat: true
				});
				render(ctx, cam);
				for (const [s, p] of LABELS) {
					const q = toDesign(at(p), cam);
					small(ctx.text.overlay, s, q[0], q[1], {
						size: 14,
						align: "center",
						color: HEX.me,
						alpha: .7
					});
				}
				readout(ctx.text.overlay, 1e3, 118, [["S1", st.closed >= 1 ? "closed" : "open"], ["conducting", st.on ? st.sin >= 0 ? "D1 · D4" : "D2 · D3" : "—"]], {
					accent: HEX.me,
					keyW: 130
				});
				overlays(ctx, K, { br: "view  front · orthographic · schematic" });
				look(ctx, {
					vignette: .3,
					ca: .08
				});
			}
		},
		{
			id: "scope",
			at: (T) => keys(T).l25.start,
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T), t = ctx.t, lt = t - K.l25.start, st = scopeParams(t, K);
				reset();
				const cam = persp(ctx, around([
					0,
					0,
					0
				], lerp(4.1, 3.55, ease.inOutSine(seg(lt, 0, 1.2))), .22 - lt * .05, .07), [
					0,
					-.02,
					0
				], { fov: 42 });
				drawScope(ctx, st);
				render(ctx, cam);
				scopeLabels(ctx, cam, st);
				if (st.signal > .5) readout(ctx.text.overlay, 1500, 150, [
					["f", "50 Hz"],
					["Vrms", "1.00 V"],
					["Vp", "1.41 V"]
				], { accent: HEX.me });
				overlays(ctx, K);
				look(ctx, { bloom: 1.2 });
			}
		},
		{
			id: "rectify",
			at: (T) => keys(T).B(6),
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T), t = ctx.t, lt = t - K.B(6), st = scopeParams(t, K);
				reset();
				const cam = persp(ctx, [
					-1.25 + lt * .5,
					-.75,
					1.35
				], [
					-.15 + lt * .4,
					-.25,
					0
				], { fov: 40 });
				drawScope(ctx, st, { width: .03 });
				render(ctx, cam);
				const x = -3, q = toDesign([
					x * SCOPE.div,
					scopeWave(x, st.fold, 0) * SCOPE.div,
					0
				], cam);
				callout(ctx.text.overlay, [q[0], q[1]], st.fold > .5 ? "|sin ωt|" : "sin ωt < 0", {
					dx: 60,
					dy: 70
				});
				overlays(ctx, K);
				look(ctx, {
					bloom: 1.25,
					vignette: .5
				});
			}
		},
		{
			id: "filter",
			at: (T) => keys(T).B(6.5),
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T), t = ctx.t, st = scopeParams(t, K);
				reset();
				const cam = ortho(ctx, [
					0,
					.15,
					0
				], "front", 3.2);
				drawScope(ctx, st);
				render(ctx, cam);
				const r = ripple(Math.max(st.wt, 1e-4));
				readout(ctx.text.overlay, 1500, 150, [
					["Vdc", `${.9003.toFixed(3)} V`],
					["ripple", `${(r.pp * 100).toFixed(1)} %`],
					["ωRC", st.wt.toFixed(1)]
				], { accent: HEX.me });
				const q = toDesign([
					2.5 * SCOPE.div,
					.9003 / SCOPE.vPerDiv * SCOPE.div,
					0
				], cam);
				callout(ctx.text.overlay, [q[0], q[1]], "AC → DC", {
					dx: 70,
					dy: -80,
					color: HEX.white
				});
				overlays(ctx, K, { br: "view  front · 5 ms/div · 0.5 V/div" });
				look(ctx, {
					vignette: .3,
					bloom: 1.2
				});
			}
		},
		{
			id: "iris",
			at: (T) => keys(T).l26.start,
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T), t = ctx.t, lt = t - K.l26.start, st = irisState(t, K);
				reset();
				if (remade(ctx)) {
					irisLens(ctx, K, st);
					readout(ctx.text.overlay, 1500, 150, [
						["N", `f/${st.N.toFixed(1)}`],
						["light", `1/${Math.round((st.N / 2.8) ** 2)}`],
						["EV", `${(-2 * Math.log2(st.N / 2.8)).toFixed(1)}`]
					], { accent: HEX.me });
					overlays(ctx, K);
					look(ctx, { vignette: .5 });
					return;
				}
				const cam = persp(ctx, [
					0,
					0,
					lerp(3.3, 3.05, ease.inOutSine(seg(lt, 0, 1.4)))
				], [
					0,
					0,
					0
				], {
					fov: 44,
					roll: .04 * Math.sin(lt * .8)
				});
				O.iris.userData.set({
					ap: st.ap,
					rot: st.rot,
					light: .75,
					spike: 0,
					rim: 1,
					lightCol: ELEC,
					rimCol: ELEC,
					metal: [
						.011,
						.013,
						.019
					]
				});
				render(ctx, cam);
				[
					1.4,
					2,
					2.8,
					4,
					5.6,
					8,
					11,
					16,
					22
				].forEach((n, i) => {
					const a = Math.PI + (i - 4) * .13, q = toDesign([
						Math.cos(a) * 1.25,
						Math.sin(a) * 1.25,
						0
					], cam);
					const on = Math.abs(n - st.N) < .3 * n;
					small(ctx.text.overlay, String(n), q[0], q[1], {
						size: 15,
						align: "center",
						color: on ? HEX.white : HEX.dim,
						alpha: on ? 1 : .6
					});
				});
				readout(ctx.text.overlay, 1500, 150, [
					["N", `f/${st.N.toFixed(1)}`],
					["light", `1/${Math.round((st.N / 2.8) ** 2)}`],
					["EV", `${(-2 * Math.log2(st.N / 2.8)).toFixed(1)}`]
				], { accent: HEX.me });
				overlays(ctx, K);
				look(ctx, { vignette: .5 });
			}
		},
		{
			id: "blind",
			at: (T) => keys(T).B(10),
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T), lt = ctx.t - K.B(10);
				reset();
				const open = ease.outCubic(seg(lt, 0, .2)), flood = ease.inQuad(seg(lt, .07, .25));
				const N = 11 / (11 / 1.4) ** open, ap = apertureR(N);
				const cam = remade(ctx) ? blindLens(ctx, K, lt, open, flood, N) : persp(ctx, [
					.42 - lt * .25,
					-.28 + lt * .15,
					1.55 - lt * .6
				], [
					0,
					0,
					0
				], {
					fov: 36,
					roll: -.12 + lt * .12
				});
				if (!remade(ctx)) {
					O.iris.userData.set({
						ap,
						rot: -.25 + 1.1 * (1 - ap / apertureR(2)),
						light: .75 + 36 * flood * flood,
						spike: .22 * (1 - open),
						rim: 1,
						gain: 1,
						lightCol: ELEC,
						rimCol: ELEC,
						metal: [
							.011,
							.013,
							.019
						]
					});
					render(ctx, cam);
				}
				2 * Math.log2(11 / N);
				const ink = flood > .6;
				readout(ctx.text.overlay, 1500, 150, [
					["N", `f/${N.toFixed(1)}`],
					["light", `×${Math.round((11 / N) ** 2)}`],
					["vision", flood > .6 ? "saturated" : `${Math.round(100 * (1 - flood))} %`]
				], { accent: ink ? INK.accent : HEX.me });
				const after = ink ? Math.exp(-(lt - .25) * 3.2) : 0;
				if (after > .01) {
					const c = toDesign([
						0,
						0,
						0
					], cam), R = 150 + 60 * (lt - .25);
					ctx.text.overlay.draw((g) => {
						g.globalAlpha *= .3 * after;
						g.filter = "blur(14px)";
						g.fillStyle = "#3a4150";
						g.beginPath();
						for (let k = 0; k < 6; k++) {
							const a = -.25 + 1.1 * (1 - apertureR(1.4) / apertureR(2)) + k * TAU / 6 + .2 * (lt - .25);
							g[k ? "lineTo" : "moveTo"](c[0] + 24 + Math.cos(a) * R, c[1] - 10 + Math.sin(a) * R);
						}
						g.closePath();
						g.fill();
						g.filter = "none";
					});
				}
				overlays(ctx, K, { ink });
				look(ctx, {
					vignette: .6 * (1 - flood),
					exposure: 1.05 + 5 * flood,
					bloom: 1.1 + 2.5 * flood,
					fade: Math.min(1, flood * 1.03),
					fadeCol: PAPER_LIN
				});
			}
		},
		{
			id: "dizzy1",
			at: (T) => keys(T).l27.start,
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T), t = ctx.t, lt = t - K.l27.start, st = phylloState(t, K);
				reset();
				const cam = persp(ctx, [
					0,
					3.6 - lt * .6,
					.9
				], [
					0,
					0,
					0
				], {
					fov: 44,
					roll: .24
				});
				if (remade(ctx)) {
					drawPhyllo(ctx, cam, st, { bright: .3 });
					render(ctx, cam);
					phylloHud(ctx, st);
					overlays(ctx, K);
					look(ctx, { ca: .22 });
					return;
				}
				const tex = capture(ctx, (sub) => {
					drawPhyllo(sub, cam, st, { bright: .42 });
					render(sub, cam);
				});
				look(ctx);
				view(ctx, tex, "paper", {
					gain: 2.6,
					paper: PAPER,
					ink: [
						.07,
						.075,
						.09
					]
				});
				ctx.post.vignette = .04;
				phylloHud(ctx, st, true);
				overlays(ctx, K, { ink: true });
			}
		},
		{
			id: "dizzy2",
			at: (T) => keys(T).tDz1,
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T), t = ctx.t, lt = t - K.tDz1, st = phylloState(t, K);
				reset();
				const k = ease.inOutSine(seg(lt, 0, K.tDz2 - K.tDz1)), fov = lerp(24, 74, k), d = dollyDist(1.55, fov);
				const cam = persp(ctx, around([
					0,
					0,
					0
				], d, .5 + lt * .3, .52), [
					0,
					-.05,
					0
				], {
					fov,
					roll: -.36
				});
				drawPhyllo(ctx, cam, st, { bright: .3 });
				render(ctx, cam);
				phylloHud(ctx, st);
				overlays(ctx, K);
				look(ctx, { ca: .22 + .2 * k });
			}
		},
		{
			id: "dizzy3",
			at: (T) => keys(T).tDz2,
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T), t = ctx.t, lt = t - K.tDz2, st = phylloState(t, K);
				reset();
				const cam = persp(ctx, around([
					0,
					0,
					0
				], .95 - lt * .15, 2.1 + lt * .6, .95), [
					.08,
					0,
					-.04
				], {
					fov: 40,
					roll: .52 + lt * .3
				});
				drawPhyllo(ctx, cam, st, {
					size: .004,
					bright: .22,
					focus: .93 - lt * .15,
					aperture: .045,
					maxBlur: 46
				});
				render(ctx, cam);
				phylloHud(ctx, st);
				overlays(ctx, K);
				look(ctx, {
					vignette: .55,
					ca: .35
				});
			}
		},
		{
			id: "tunnel",
			at: (T) => keys(T).l28.start,
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T), t = ctx.t, lt = t - K.l28.start, z = tunnelZ(t, K);
				reset();
				const cam = persp(ctx, [
					.62,
					-.42,
					z
				], [
					-.12,
					.1,
					z - 10
				], {
					fov: 60,
					roll: .1 + lt * .3
				});
				drawTunnel(O.lines, z, t, K.l28.start, {
					gold: COL.gold,
					blue: ELEC,
					beat: K.beat,
					fog: .05,
					far: 34,
					gain: 1.35,
					weight: 1.35
				});
				const pr = remade(ctx) ? drawTunnelPair(ctx, cam, K, z) : null;
				render(ctx, cam);
				tunnelLabels(ctx, cam, z, { t0: K.l28.start });
				if (pr) tunnelPairLabels(ctx, cam, K, pr);
				tunnelHud(ctx, K, z);
				overlays(ctx, K);
				look(ctx, { vignette: .5 });
			}
		},
		{
			id: "travel",
			at: (T) => keys(T).tTravel,
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T), t = ctx.t, lt = t - K.tTravel, z = tunnelZ(t, K);
				reset();
				const v = 6 + 25.7 * (t - K.l28.start);
				const cam = persp(ctx, [
					1.75,
					.95,
					z + 1.2
				], [
					-.55,
					-.3,
					z - 8
				], {
					fov: 66,
					roll: -.1 - lt * .15
				});
				const tex = capture(ctx, (sub) => {
					drawTunnel(O.lines, z + 6, t, K.l28.start, {
						gold: COL.gold,
						blue: ELEC,
						beat: K.beat,
						streak: v * .05,
						far: 44,
						fog: .03,
						gain: 2.6,
						weight: 2.6
					});
					render(sub, cam);
				});
				look(ctx, { vignette: .5 });
				view(ctx, tex, "dither", {
					pix: 3,
					gain: 3.2,
					ink: [
						1,
						.86,
						.56
					],
					paper: [
						.012,
						.01,
						.016
					]
				});
				if (remade(ctx)) {
					O.lines.begin();
					drawTunnelPair(ctx, cam, K, z, {
						gain: .9,
						size: .8
					});
					render(ctx, cam);
				}
				tunnelHud(ctx, K, z, [["display", "1-bit · Bayer 8×8"]]);
				overlays(ctx, K);
			}
		},
		{
			id: "trails",
			at: (T) => keys(T).l29.start,
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T), t = ctx.t, lt = t - K.l29.start, st = skyState(t, K);
				reset();
				const cam = persp(ctx, [
					0,
					1.6,
					0
				], [
					0,
					1.6 + Math.sin(.42 + lt * .02),
					-Math.cos(.42)
				], { fov: 64 });
				setSky(O.sky, cam, {
					pole: POLE,
					th0: st.th0,
					th1: st.th1,
					ground: 1,
					gain: 1.3
				});
				ctx.pass(O.sky);
				floor(0, .2, { fade: .14 });
				render(ctx, cam);
				const p = toDesign(POLE.map((v) => v * 100), cam);
				crosshair(ctx.text.overlay, p[0], p[1], 20, {
					label: "NCP  δ +90°",
					color: HEX.gold
				});
				yearHud(ctx, st);
				milestones(ctx, K);
				overlays(ctx, K);
				look(ctx, { vignette: .45 });
			}
		},
		{
			id: "trailsTop",
			at: (T) => keys(T).tBC,
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T), t = ctx.t, lt = t - K.tBC, st = skyState(t, K);
				reset();
				const cam = persp(ctx, [
					0,
					0,
					0
				], POLE, {
					fov: 76,
					roll: -lt * .1
				});
				setSky(O.sky, cam, {
					pole: POLE,
					th0: st.th0,
					th1: st.th1,
					ground: 0,
					gain: .95,
					density: .5
				});
				ctx.pass(O.sky);
				render(ctx, cam);
				crosshair(ctx.text.overlay, 960, 540, 18, {
					label: "NCP",
					color: HEX.gold
				});
				yearHud(ctx, st, 1470, 470);
				milestones(ctx, K);
				overlays(ctx, K, { br: "view  zenith · pole" });
				look(ctx, { vignette: .5 });
			}
		},
		{
			id: "binary",
			at: (T) => keys(T).l30.start,
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T), t = ctx.t, lt = t - K.l30.start;
				reset();
				const cam = persp(ctx, around([
					0,
					DUO.yTop,
					0
				], 8.2 - lt * .8, lt * .06, .3), [
					0,
					DUO.yTop - .15,
					0
				], { fov: 40 });
				codePage(ctx, cam, {
					file: "ch/pre1/duo.js",
					key: "duo",
					origin: [
						-7.4,
						DUO.yTop + 5.6,
						-9
					],
					cell: .21,
					cols: 105,
					bright: .15,
					scroll: (t - K.l30.start) * .35,
					focus: 8.2,
					aperture: .005
				});
				orbitPlane({ gain: .5 });
				const st = pair(ctx, cam, K);
				render(ctx, cam);
				const y = toDesign(st.o.you, cam), m = toDesign(st.o.me, cam);
				if (y[0] < 1860) callout(ctx.text.overlay, [y[0], y[1] - 30], "you", {
					dx: 50,
					dy: -60,
					color: HEX.you,
					draw: seg(lt, .1, .35)
				});
				if (m[0] > 60) callout(ctx.text.overlay, [m[0], m[1] - 40], "me", {
					dx: -50,
					dy: -60,
					color: HEX.me,
					draw: seg(lt, .1, .35)
				});
				readout(ctx.text.overlay, 1500, 150, [["a", st.o.a.toFixed(2)], ["T", `${(TAU / st.o.om).toFixed(2)} s`]], { accent: HEX.you });
				overlays(ctx, K);
				look(ctx);
			}
		},
		{
			id: "youClose",
			at: (T) => keys(T).tCan,
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T), t = ctx.t;
				t - K.tCan;
				reset();
				const p = orbitAt(O.tr, t).you, dir = [
					p[0] * .5,
					0,
					p[2] * .5
				], c = [
					p[0] + .35 - dir[0] * .2,
					p[1] + .22,
					p[2] + 1.15
				];
				const cam = persp(ctx, c, [
					p[0],
					p[1] - .02,
					p[2]
				], { fov: 36 });
				const dist = Math.hypot(c[0] - p[0], c[1] - p[1], c[2] - p[2]);
				codePage(ctx, cam, {
					file: "ch/pre1/duo.js",
					key: "duo",
					origin: [
						-7.4,
						DUO.yTop + 5.6,
						-9
					],
					cell: .21,
					cols: 105,
					bright: .2,
					scroll: (t - K.l30.start) * .35,
					focus: dist,
					aperture: .018,
					maxBlur: 20
				});
				pair(ctx, cam, K, {
					focus: dist,
					aperture: .018,
					maxBlur: 26,
					size: .0026,
					bright: .1,
					sparkle: .7
				});
				render(ctx, cam);
				const q = toDesign(p, cam);
				callout(ctx.text.overlay, [q[0] + 60, q[1] - 70], "you", {
					dx: 70,
					dy: -50,
					color: HEX.you
				});
				readout(ctx.text.overlay, 1500, 150, [["you", "N 65 536"], ["colour", "#FFB36B → #FF6FA8"]], { accent: HEX.you });
				overlays(ctx, K);
				look(ctx, { vignette: .55 });
			}
		},
		{
			id: "tighten",
			at: (T) => keys(T).tUnite,
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T), t = ctx.t, lt = t - K.tUnite;
				reset();
				const cam = persp(ctx, [
					0,
					DUO.yTop + .12,
					5.4 - lt * .6
				], [
					0,
					DUO.yTop,
					0
				], { fov: 34 });
				const Z = -5.5, X0 = -6.4, X1 = 5.6, Y0 = DUO.yTop - .15, A = 1.7, n = 360, span = 1.6, pts = [];
				for (let i = 0; i <= n; i++) {
					const tt = t - span + span * i / n, o = orbitAt(O.tr, tt), hh = (o.om / (TAU * DUO.turns1)) ** (2 / 3) * Math.cos(2 * o.phi);
					pts.push([
						lerp(X0, X1, i / n),
						Y0 + hh * A * .5,
						Z
					]);
				}
				O.lines.polyline(pts, {
					color: PAL.c1.warm.map((c) => c * .55),
					width: 2.2
				});
				const axc = PAL.c1.dim.map((c) => c * 1.3);
				O.lines.segment([
					X0,
					Y0,
					Z
				], [
					5.8999999999999995,
					Y0,
					Z
				], {
					color: axc,
					width: 1.4
				});
				for (let k = 0; k <= 16; k++) {
					const x = lerp(X0, X1, k / 16);
					O.lines.segment([
						x,
						Y0 - .08,
						Z
					], [
						x,
						Y0 + (k % 4 ? .08 : .16),
						Z
					], {
						color: axc,
						width: 1.2
					});
				}
				const st = pair(ctx, cam, K, {
					bright: .075,
					lines: { trailLen: 1.2 }
				});
				render(ctx, cam);
				const q0 = toDesign([
					X0,
					Y0 + A * .62,
					Z
				], cam), q1 = toDesign([
					X1,
					Y0 - .3,
					Z
				], cam);
				small(ctx.text.overlay, "strain  h(t) ∝ ω^⅔ cos 2Φ", Math.max(110, q0[0]), q0[1], {
					alpha: .75,
					color: HEX.you,
					size: 16
				});
				small(ctx.text.overlay, "t − 1.6 s … now", Math.min(1810, q1[0]), q1[1] + 18, {
					alpha: .6,
					align: "right",
					size: 14
				});
				readout(ctx.text.overlay, 1500, 150, [["a", st.o.a.toFixed(3)], ["f_gw", `${(st.o.om / Math.PI).toFixed(2)} Hz`]], { accent: HEX.you });
				overlays(ctx, K, { br: "view  edge-on · orbit plane" });
				look(ctx);
			}
		},
		{
			id: "helix",
			at: (T) => keys(T).l31.start,
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T), lt = ctx.t - K.l31.start;
				reset();
				const unfold = ease.inOutCubic(seg(lt, 0, .6)), ty = lerp(DUO.yTop - .1, 1.5, unfold);
				const cam = persp(ctx, around([
					0,
					ty,
					0
				], lerp(3.4, 5.1, unfold) - lt * .3, .4 + lt * .35, lerp(.05, .12, unfold)), [
					0,
					ty - .05,
					0
				], { fov: 40 });
				timeAxis(ctx, cam, pair(ctx, cam, K), K);
				render(ctx, cam);
				readout(ctx.text.overlay, 1500, 150, [["worldlines", "(x, z, t)"], ["rungs", "every 36°"]], {
					accent: HEX.gold,
					keyW: 130
				});
				overlays(ctx, K);
				look(ctx);
			}
		},
		{
			id: "helixMacro",
			at: (T) => keys(T).B(29),
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T), lt = ctx.t - K.B(29);
				reset();
				const target = [
					0,
					DUO.yTop - .55,
					0
				];
				const cam = persp(ctx, around(target, 3.4, 1.1 + lt * .3, .08), target, { fov: 17 });
				codePage(ctx, cam, {
					file: "ch/pre1/duo.js",
					key: "duo-macro",
					pos: around(target, -9, 1.25, 0),
					yaw: 1.25,
					origin: [
						-4,
						2.6,
						0
					],
					cell: .1,
					cols: 130,
					bright: .3,
					scroll: lt * .3,
					focus: 3.4,
					aperture: .011,
					maxBlur: 30
				});
				const st = pair(ctx, cam, K, {
					focus: 3.4,
					aperture: .011,
					maxBlur: 18,
					size: .0026,
					bright: .09,
					lines: {
						rungW: 1.6,
						beadW: 12
					}
				});
				render(ctx, cam);
				const q = toDesign(target, cam);
				callout(ctx.text.overlay, [q[0], q[1]], `a = ${st.o.a.toFixed(3)}`, {
					dx: 90,
					dy: -80,
					color: HEX.gold
				});
				overlays(ctx, K);
				look(ctx, { vignette: .55 });
			}
		},
		{
			id: "helixTop",
			at: (T) => keys(T).B(30),
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T), t = ctx.t;
				reset();
				const lt = t - K.B(30), up = remade(ctx) ? seg(t, K.B(31), K.B(32)) : 0;
				const cam = persp(ctx, [
					0,
					DUO.yTop + 1.05,
					.001
				], [
					0,
					0,
					0
				], {
					fov: 64,
					roll: remade(ctx) ? -lt * .6 - .5 * up * up : -lt * .6
				});
				const st = pair(ctx, cam, K, {
					bright: .13,
					lines: { beadW: 9 }
				});
				render(ctx, cam);
				crosshair(ctx.text.overlay, 960, 540, 16, { color: HEX.gold });
				readout(ctx.text.overlay, 1500, 150, [["view", "down t"], ["ω", `${st.o.om.toFixed(1)} rad/s`]], { accent: HEX.gold });
				overlays(ctx, K, { br: "view  axial · t → past" });
				look(ctx, remade(ctx) ? {
					vignette: .35 + .3 * up,
					exposure: 1.05 * (1 - .75 * ease.inQuad(up))
				} : { vignette: .35 });
			}
		},
		{
			id: "spin",
			at: (T) => keys(T).B(31),
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T), t = ctx.t, lt = t - K.B(31);
				reset();
				const cam = persp(ctx, [
					1.25,
					-.7,
					1.35
				], [
					0,
					1.7,
					0
				], {
					fov: 46,
					roll: lt * .6
				});
				const tex = capture(ctx, (sub) => {
					pair(sub, cam, K, { bright: .14 });
					render(sub, cam);
				});
				look(ctx, { vignette: .5 });
				view(ctx, tex, "edges", {
					gain: 1.8,
					ink: [
						.86,
						.95,
						1
					]
				});
				readout(ctx.text.overlay, 1500, 150, [["view", "edges · sobel"], ["ω", `${orbitAt(O.tr, t).om.toFixed(1)} rad/s`]], { accent: HEX.gold });
				overlays(ctx, K);
			}
		},
		{
			id: "spin2",
			at: (T) => keys(T).B(31.5),
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T), t = ctx.t;
				reset();
				const pc = pairCam(t, K.dk);
				const cam = persp(ctx, pc.pos, pc.look, { fov: pc.fov });
				const st = pair(ctx, cam, K);
				timeAxis(null, null, st, K);
				render(ctx, cam);
				readout(ctx.text.overlay, 1500, 150, [["ω", `${st.o.om.toFixed(1)} rad/s`], ["a", st.o.a.toFixed(3)]], { accent: HEX.gold });
				overlays(ctx, K);
				look(ctx);
			}
		}
	]
});
//#endregion
