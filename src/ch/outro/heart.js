import { clamp, ease, lerp, mix3, rng, seg } from "../../engine/math.js?v=BJIlRm7-";
import { COL } from "../../theme.js?v=Bj33PIbo";
import { MathUtils } from "../../../vendor/three/build/three.core.js?v=q9f7JKE-";
import { makeRT } from "../../engine/gpu.js?v=o4BYX3o1";
import { onShape } from "../../lib/glyphs.js?v=DWbHICXG";
import { shapes } from "../../engine/shapes.js?v=BFh0PgdI";
import { exitAlong, pressedShape, taubin, taubinNormal } from "../love/curves.js?v=Ny6Hciv0";
import { setGlass } from "../love/glass.js?v=Bh51RBHX";
//#region src/ch/outro/heart.js
var LIFT = 1.45;
var WG = [
	1,
	.9,
	.74
];
var ME = COL.me;
var norm = (v) => {
	const l = Math.hypot(...v) || 1;
	return v.map((x) => x / l);
};
var add = (a, b, k = 1) => a.map((v, i) => v + b[i] * k);
var dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
var up = (p) => [
	p[0],
	p[1] + LIFT,
	p[2]
];
var Y0 = [
	.28,
	.3,
	0
];
var YDIR = norm([
	1,
	.28,
	.3
]);
var R_ME = .075;
/** Where me floats to once released (love coordinates): 1.3 above the floor, the intro's ME_C. */
var ME_REST = [
	0,
	-.1499999999999999,
	0
];
var HEART_BOX = [
	-1.3,
	-1.1,
	-.8,
	1.3,
	1.35,
	.8
];
/** love's key times (the ones its finale depends on), from Timing. */
function loveKeys(T) {
	const s0 = T.section("love").start, b0 = Math.round(T.beatAt(s0)), end = T.section("outro").start;
	return {
		T,
		s0,
		end,
		LOVE: T.findLines("LO-O-OVE").map((l) => l.start).filter((x) => x >= s0 - .1 && x < end + .5),
		B: (k) => T.beatTime(b0 + k),
		sungEnd: T.findLines("LO-O-OVE").at(-1).end
	};
}
/** Precomputed geometry: the exit point where you left and me pressed against the wall. */
function heartMath() {
	const sExit = exitAlong(Y0, YDIR), exit = add(Y0, YDIR, sExit), nExit = taubinNormal(exit);
	return {
		sExit,
		exit,
		nExit,
		pressC: add(exit, nExit, -.087)
	};
}
/** Shape textures: love's (same generators, seeds and counts) under this chapter's keys, plus the embers. */
function heartTextures(O, HM) {
	const surf = (N) => shapes.implicit3(N, taubin, {
		box: HEART_BOX,
		uniform: true,
		seed: 21
	});
	return {
		meBall: O.me.shape("outro/me-ball", (N) => shapes.ball(N, {
			r: R_ME,
			seed: 31
		})),
		mePressed: O.me.shape("outro/me-pressed", (N) => pressedShape(N, add(HM.exit, HM.nExit, -.004), { origin: HM.pressC })),
		stars: O.stars.shape("outro/stars", (N) => shapes.stars(N, {
			r0: 25,
			r1: 70
		})),
		surf: O.hs.shape("outro/heart-surface", surf),
		drift: O.hs.shape("outro/heart-embers", (N) => driftOf(surf(N), 77))
	};
}
function driftOf(src, seed) {
	const N = src.length / 4, r = rng(seed), out = new Float32Array(N * 4);
	for (let i = 0; i < N; i++) {
		const p = [
			src[i * 4],
			src[i * 4 + 1],
			src[i * 4 + 2]
		], n = taubinNormal(p), d = .25 + 2.4 * r() ** 1.7, rise = .8 + 3.2 * r() ** 1.3;
		out.set([
			p[0] + n[0] * d + (r() - .5) * .6,
			p[1] + n[1] * d * .5 + rise,
			p[2] + n[2] * d + (r() - .5) * .6,
			r()
		], i * 4);
	}
	return out;
}
/** The heart as its own source code (love/curves.js): one glyph per character on the surface, and their drift. */
function heartGlyphTextures(gf) {
	const surf = (n) => shapes.implicit3(n, taubin, {
		box: HEART_BOX,
		uniform: true,
		seed: 57
	});
	return {
		surf: gf.layout("outro/heart-glyphs", onShape(gf, surf)),
		drift: gf.layout("outro/heart-glyphs-drift", onShape(gf, (n) => driftOf(surf(n), 91)))
	};
}
/**
* The heart decompiles: as its points lift off, the characters of the code that computes it appear on the surface
* and drift away with them. k: 0..1 how much of the code has appeared; col: glyph colour (rose-gold → grey).
*/
function drawHeartGlyphs(ctx, O, cam, hs, o = {}) {
	const g = O.gfHeart, ppu = pxPerUnit(cam, up([
		0,
		.1,
		0
	])), k = o.k ?? 1;
	g.points.position.set(0, LIFT, 0);
	g.points.quaternion.identity();
	g.points.scale.setScalar(1 + .12 * hs.dissolve);
	g.points.updateMatrixWorld();
	g.set({
		a: O.tex.gSurf,
		b: O.tex.gDrift,
		morph: hs.drift,
		spread: .72,
		arc: .1,
		t: ctx.t,
		reveal: o.reveal ?? .4,
		soft: .02,
		size: clamp((o.px ?? 20) / ppu, .02, .14),
		minPx: 4,
		bright: .95 * k * hs.ember * (o.brightK ?? 1),
		palette: o.palette,
		noise: .02 + .06 * hs.drift,
		noiseFreq: 1.2,
		noiseSpeed: .25,
		flicker: .1
	}, cam, ctx.H);
	return g.points;
}
/**
* love's finale state at time t, continued past the cut (love coordinates). love's dissolve would run on to 1 (every
* surface point shown, the curl noise at full strength: a bright blur); past the cut it levels off instead, at the
* same rate (an exponential approach with love's slope at the cut), and the drift takes over.
*/
function heartState(t, LK) {
	const tL = LK.LOVE[2], a = LK.B(31), b = LK.end + .35;
	let dissolve = ease.inQuad(seg(t, a, b));
	if (t > LK.end) {
		const x0 = seg(LK.end, a, b), d0 = x0 * x0, s0 = 2 * x0 / (b - a), A = DISSOLVE_MAX - d0;
		dissolve = d0 + A * (1 - Math.exp(-(t - LK.end) * s0 / A));
	}
	const clear = ease.inOutSine(seg(t, LK.end + .05, LK.end + 1.25));
	const appear = ease.inOutCubic(seg(t, tL + .1, tL + 1.1)) * (1 - clear);
	return {
		appear,
		clear,
		dissolve,
		cage: 1,
		pulse: LK.T.pulse(t, 6) * appear,
		glow: ease.inOutSine(seg(t, LK.LOVE[3] - .05, LK.LOVE[3] + .5)) * (1 - clear),
		drift: ease.inQuad(seg(t, LK.end + .08, LK.end + 1.2)) * .3 + .7 * seg(t, LK.end + 1.2, LK.end + 3.9) + 0,
		ember: 1 - ease.inOutSine(seg(t, LK.end + 1, LK.end + 3.2))
	};
}
var DISSOLVE_MAX = .42;
/** me: pressed on the wall where you left; after the cut it lets go and floats to the middle. */
function meState(t, LK, HM) {
	const release = ease.inOutCubic(seg(t, LK.end + .15, LK.end + .9));
	const float = ease.inOutSine(seg(t, LK.end + .25, LK.end + 2.6));
	const pl = mix3(HM.pressC, ME_REST, float);
	const spin = .3 * Math.max(0, t - LK.end - .5) * seg(t, LK.end + .5, LK.end + 1.5);
	return {
		p: up(pl),
		pl,
		press: 1 - release,
		float,
		spin
	};
}
/** love's finale camera, continued; after love's move ends it pulls back (pull) and recentres. */
function finaleCamera(t, LK, { pull = 0, recentre = 0, rise = 0, az: daz = 0 } = {}) {
	const k = ease.inOutSine(seg(t, LK.LOVE[3], LK.end + .5));
	const az = lerp(.42, .5, k) + daz;
	const target = up(add([
		.05,
		.1,
		0
	], [
		Math.cos(az),
		0,
		-Math.sin(az)
	], .95 * (1 - recentre)));
	target[1] += rise;
	const r = lerp(5.3, 4.7, k) + pull, el = lerp(.1, .13, k) + rise * .08;
	return {
		target,
		pos: [
			target[0] + r * Math.cos(el) * Math.sin(az),
			target[1] + r * Math.sin(el),
			target[2] + r * Math.cos(el) * Math.cos(az)
		]
	};
}
function pxPerUnit(cam, p) {
	if (cam.isOrthographicCamera) return 1080 / (cam.top - cam.bottom);
	return 540 / Math.tan(MathUtils.degToRad(cam.fov) / 2) / Math.max(.02, dist(cam.position.toArray(), p));
}
var density = (ppu, R, N, rho) => {
	const r = R * ppu;
	return clamp(rho * Math.PI * r * r / N, .0035, 1);
};
/** me as love draws it (pixel-sized points, count by projected area). o.col: colour (cyan → white in the outro). */
function drawMe(ctx, O, cam, p, o = {}, hPx = ctx.H) {
	const me = O.me, sc = o.scale ?? 1, press = o.press ?? 0, R = lerp(R_ME * sc, .2, press), ppu = pxPerUnit(cam, p);
	me.points.visible = true;
	me.points.position.set(...p);
	me.points.scale.setScalar(sc);
	me.points.rotation.set(0, o.spin ?? 0, 0);
	const col = o.col ?? ME;
	me.set({
		a: O.tex.meBall,
		b: O.tex.mePressed,
		morph: press,
		spread: .35,
		arc: .02,
		t: ctx.t,
		reveal: o.reveal ?? density(ppu, R, me.N, o.rho ?? .5),
		size: o.size ?? Math.min(.006, (o.px ?? 2.4) / ppu / sc),
		bright: o.bright ?? .42,
		colA: col,
		colB: col,
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
/** The heart's surface points (love's drawHeartSwarm at inflate = 1), flying off as embers. */
function drawHeartPoints(ctx, O, cam, hs, o = {}, hPx = ctx.H) {
	const h = O.hs, ppu = pxPerUnit(cam, up([
		0,
		.1,
		0
	])), col0 = mix3(WG, [
		1,
		.7,
		.72
	], .35);
	h.points.visible = true;
	h.points.position.set(0, LIFT, 0);
	h.points.rotation.set(0, 0, 0);
	h.points.scale.setScalar((1 + .012 * hs.pulse) * (1 + .12 * hs.dissolve));
	h.set({
		a: O.tex.surf,
		b: O.tex.drift,
		morph: hs.drift,
		spread: .72,
		arc: .1,
		reveal: (.2 + .8 * hs.dissolve) * (1 - .75 * hs.drift),
		size: o.size ?? clamp(1.25 / ppu, .0012, .0075),
		bright: .28 * (1 + .15 * hs.pulse) * (1 + .5 * hs.dissolve) * hs.ember * (o.brightK ?? 1),
		colA: col0,
		colB: o.colB ?? mix3(col0, [
			.86,
			.86,
			.9
		], .7),
		t: ctx.t,
		noise: 6e-4 + .09 * hs.dissolve * (1 - .3 * hs.drift),
		noiseFreq: lerp(3, 1.2, hs.dissolve),
		noiseSpeed: .25,
		sparkle: .3 + .25 * hs.drift,
		focus: o.focus ?? 5,
		aperture: o.aperture ?? 0,
		maxBlur: o.maxBlur ?? 50
	}, cam, hPx);
	return h.points;
}
function drawStars(ctx, O, cam, bright, hPx = ctx.H) {
	O.stars.points.visible = true;
	O.stars.points.position.set(0, LIFT, 0);
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
/** love's floor (rose grid, lifted to y = 0). */
function roseFloor(O, intensity) {
	O.rose.position.set(0, 0, 0);
	O.rose.userData.set({
		intensity,
		fade: .09,
		reveal: 1,
		revealR: 60
	});
	return O.rose;
}
/**
* love's glassFrame, continued: the outside layer (stars, floor, o.bg), the inside layer (me), the glass pass while
* it clears, then the front layer (the heart's points, o.front, lines drawn by o.lines(L, state)).
*/
function heartFrame(ctx, O, cam, t, LK, HM, o = {}) {
	const hs = heartState(t, LK), ms = meState(t, LK, HM);
	if (O.rtV !== ctx.sizeVersion) {
		O.rtBg?.dispose();
		O.rtIn?.dispose();
		O.rtBg = makeRT(ctx.W, ctx.H);
		O.rtIn = makeRT(ctx.W, ctx.H);
		O.rtV = ctx.sizeVersion;
	}
	const camP = cam.position.toArray(), glassOn = hs.appear > .001;
	O.heart.position.set(0, LIFT, 0);
	O.heart.scale.setScalar(1 + .012 * hs.pulse);
	O.heart.updateMatrixWorld();
	const L = O.lines;
	const bg = [
		...o.stars ? [drawStars(ctx, O, cam, o.stars)] : [],
		...o.floorI ? [roseFloor(O, o.floorI)] : [],
		...o.bg ?? []
	];
	const meObj = () => drawMe(ctx, O, cam, ms.p, {
		press: ms.press,
		spin: ms.spin,
		focus: dist(ms.p, camP),
		...o.meO
	});
	if (glassOn) {
		L.begin();
		L.end(ctx);
		bg.push(L.mesh);
		renderLayer(ctx, O, O.rtBg, cam, bg);
		renderLayer(ctx, O, O.rtIn, cam, [meObj()]);
		setGlass(O.glass, cam, O.heart, O.rtBg.texture, O.rtIn.texture, {
			appear: hs.appear * (1 - .45 * hs.dissolve),
			t: t - LK.s0,
			pulse: hs.pulse,
			glow: hs.glow,
			cage: hs.cage,
			contour: 1,
			press: ms.press > 0 ? [...HM.exit, ms.press * (1 + .4 * hs.glow)] : null
		});
		ctx.pass(O.glass);
	} else renderLayer(ctx, O, null, cam, [...bg, meObj()]);
	const front = [...hs.ember > .001 ? [drawHeartPoints(ctx, O, cam, hs, o.hsO)] : [], ...o.front ?? []];
	L.begin();
	o.lines?.(L, {
		hs,
		ms
	});
	L.end(ctx);
	front.push(L.mesh);
	renderLayer(ctx, O, null, cam, front);
	return {
		hs,
		ms
	};
}
/** Render a set of objects into a private target (cleared) or, with rt = null, on top of the shot's target. */
function renderLayer(ctx, O, rt, cam, obs) {
	for (const ob of O.all) ob.visible = false;
	for (const ob of obs) ob.visible = true;
	if (rt) {
		const r = ctx.renderer;
		r.setRenderTarget(rt);
		r.setClearColor(0, 1);
		r.clear(true, true, true);
		r.render(O.scene, cam);
		r.setRenderTarget(ctx.target);
	} else ctx.draw(O.scene, cam);
}
//#endregion
export { HEART_BOX, LIFT, ME_REST, R_ME, WG, dist, drawHeartGlyphs, drawHeartPoints, drawMe, drawStars, finaleCamera, heartFrame, heartGlyphTextures, heartMath, heartState, heartTextures, loveKeys, meState, pxPerUnit, renderLayer, roseFloor, up };
