import { chapter } from "../engine/timeline.js?v=vYBbdLfo";
import { TAU, clamp, ease, lerp, rng, seg } from "../engine/math.js?v=BJIlRm7-";
import { COL, HEX } from "../theme.js?v=Bj33PIbo";
import { remade } from "../lib/published.js?v=aV_CU5HV";
import { PerspectiveCamera, Scene } from "../../vendor/three/build/three.core.js?v=q9f7JKE-";
import { CUR, CURSOR_LOOK, blinkOn, drawCursor, projectQuad } from "./intro/cursor.js?v=B0VCQBJX";
import { Swarm, shapeTexture } from "../engine/swarm.js?v=DTFpJa7B";
import { GlowLines } from "../engine/lines.js?v=B_AAaaTO";
import { rig } from "../engine/rig.js?v=39-joEtk";
import { newCamera, orbit } from "../lib/look.js?v=BfOqFF7i";
import { frame as frame$1, readout as readout$1, toDesign } from "../lib/hud.js?v=BgmSZjmG";
import { capture, view } from "../lib/modes.js?v=Cu3GYO-2";
import { thinking } from "../lib/claude.js?v=DXDs_lIL";
import { circle, mul, persp, scrim } from "./intro/kit.js?v=rUxrOt9G";
import { BAR, CELL, DIST, EM, GROUPS, KEYS, LINE_R, NCELL, TEXT, X0, cellX, cursorAt, inkArea, lineTextures, promptPose, typingState } from "./title/code.js?v=BHDi1kEh";
import { shapes } from "../engine/shapes.js?v=BFh0PgdI";
import { READOUT, positionsAt } from "./title/galaxy-model.js?v=CZR9RU_6";
import { Galaxy } from "./title/galaxy.js?v=DKOfylqX";
import { CARD_GROUPS, cardGroundPoint, cardInk, cardStars, titlePush } from "./title/card.js?v=CcS9PMP9";
import { CLAUDE_LOGO } from "./title/claude-logo.js?v=DYdnNarP";
import { basis, flightState, latticeMaterial } from "./title/lattice.js?v=DpybgBeN";
import { BOX, boxFor, drawPromptBox } from "./title/prompt.js?v=D3T1ir73";
import { BEAM_SYNTAX, GLYPH, beamField, latticeCamera } from "./title/beams.js?v=CTmPaA5f";
import { CREDITS_R, drawSign, rideAt, rideD, signAt } from "./title/credits.js?v=Lqv2XLuW";
//#region src/ch/02_title.js
var GCOL = {
	white: [
		.9,
		.94,
		1
	],
	dim: [
		.4,
		.45,
		.56
	],
	blue: [
		.32,
		.52,
		1
	],
	cyan: COL.me
};
var GAL = {
	white: COL.me,
	dim: [
		.28,
		.62,
		1
	],
	blue: [
		.2,
		.5,
		1
	],
	cyan: [
		.6,
		.97,
		1
	]
};
var HOT = [
	1,
	1,
	1
];
var NG = 65536;
var O = null;
var KC = null;
function keys(T) {
	if (KC?.T === T) return KC;
	const s0 = T.section("inst1").start, b0 = Math.round(T.beatAt(s0)), bar0 = Math.round(T.barAt(s0));
	const B = (k) => T.beatTime(b0 + k), BAR = (k) => T.barTime(bar0 + k);
	const l11 = T.findLine("world.execute");
	return KC = {
		T,
		s0,
		B,
		BAR,
		v1: T.section("v1").start,
		keyT: KEYS.map((k) => B(k) + .02),
		tType: T.beatTime(Math.round(T.beatAt(l11.start))),
		enterKey: B(7.5),
		enter: BAR(2),
		flight: BAR(4),
		gather: BAR(7)
	};
}
/**
* (The remake, docs/REMAKE.md §4 A) the title was typed over the intro's last bars (01_intro.js titlePrompt): Enter half
* a beat before inst1, the explosion on inst1's first beat. execute plays its whole pull-back (8 beats), then the
* galaxy from above (4) and in the disc (4); the flight and the gather keep their time.
*/
var KR = null;
function keysR(T) {
	if (KR?.T === T) return KR;
	const K = keys(T);
	const h = T.onsetNear("drums", K.s0, .06), enter = h != null ? h - 1 / 60 : K.s0;
	const h16 = T.onsetNear("drums", K.flight, .06), pass = h16 != null ? h16 - 1 / 60 : K.flight;
	return KR = {
		...K,
		remake: true,
		keyT: [...LINE_R.TEXT].map((_, i) => K.B(-4) + i * .05),
		enterKey: K.B(-.5),
		enter,
		beat: K.B(1) - K.B(0),
		gTop: K.BAR(1),
		cred: K.BAR(2),
		gMacro: K.B(12),
		pass
	};
}
var kk = (ctx) => remade(ctx) ? keysR(ctx.T) : keys(ctx.T);
var typeSt = (t, K) => typingState(t, K.keyT);
var burstSt = (t, K) => ({
	k: ease.outCubic(seg(t, K.enter + .02, K.enter + 1.6)),
	flash: t >= K.enter ? Math.exp(-(t - K.enter) / .09) : 0,
	lt: t - K.enter
});
/** The cursor's position in cells: after each key it slides one cell in 60 ms (the close-up camera tracks exactly this). */
function cursorCell(t, K) {
	const ty = typeSt(t, K);
	return ty.n === 0 ? 0 : ty.n - 1 + ease.outCubic(clamp((t - ty.last) / .06));
}
var cursorX = (t, K) => cellX(0) + cursorCell(t, K) * CELL + CELL / 2;
var gatherK = (t, K) => ease.inOutCubic(seg(t, K.gather, K.v1 - .1));
function reset() {
	for (const s of Object.values(O.code)) {
		s.points.visible = false;
		s.points.rotation.set(0, 0, 0);
		s.points.scale.setScalar(1);
	}
	O.me.points.visible = O.stars.points.visible = false;
	if (O.beams) O.beams.gf.points.visible = false;
	if (O.card) for (const g of CARD_GROUPS) O.card[g].points.visible = false;
	O.lines.begin();
	O.soft.begin();
}
function render(ctx, cam) {
	O.lines.mesh.visible = O.soft.mesh.visible = true;
	O.lines.end(ctx);
	O.soft.end(ctx);
	ctx.draw(O.scene, cam);
}
function stars(ctx, cam, bright = .55) {
	if (bright <= 0) return;
	O.stars.points.visible = true;
	O.stars.set({
		a: O.tex.stars,
		size: .09,
		bright,
		sparkle: .7,
		t: ctx.t,
		minPx: 1.1
	}, cam, ctx.H);
}
var kick = (ctx) => ctx.F.env("onset_drums", ctx.t, .005, .12);
/**
* The orbiting camera of `execute` and `gather` (lib/look.js orbit), handed to the rig like every camera (intro/kit.js
* persp for the others). The film's own orbit() left the world matrix to the render: what was projected before it (the
* prompt box, the typing cursor) used the new position with the last frame's turn (three's lookAt), on a shot's first
* frame the last shot's. The remake brings it up to date (docs/REMAKE.md §12.5); the published edit keeps it (§12.17).
*/
function orbitCam(ctx, o) {
	const last = remade(ctx) ? null : O.cam.quaternion.clone(), cam = orbit(O.cam, {
		...o,
		inset: true
	});
	if (o.spin) cam.rotateZ(o.spin);
	if (last) {
		const q = cam.quaternion.clone();
		cam.quaternion.copy(last);
		cam.updateWorldMatrix(true, false);
		cam.quaternion.copy(q);
	} else cam.updateMatrixWorld();
	return rig.cam(cam, { look: o.target ?? [
		0,
		0,
		0
	] });
}
/** The typed line (before Enter) or the galaxy it becomes (after). o: swarm overrides (dof, size), bright. */
function drawCode(ctx, cam, K, o = {}) {
	const t = ctx.t, ty = typeSt(t, K), bu = burstSt(t, K), n = TEXT.length;
	for (const g of GROUPS) {
		const s = O.code[g];
		s.points.visible = true;
		if (t < K.enter) s.set({
			a: O.tex[g].cloud,
			b: O.tex[g].glyph,
			revealBy: "w",
			reveal: ty.n / n,
			wave: NCELL * CELL,
			waveOrigin: [
				X0,
				0,
				0
			],
			spread: .97,
			morph: (ty.front + .75) / NCELL * .97,
			arc: .06,
			t,
			size: o.size ?? .0065,
			minPx: 1.1,
			bright: o.bright ?? .42,
			colA: mul(GCOL[g], 1.2),
			colB: GCOL[g],
			sparkle: .12,
			...o.swarm
		}, cam, ctx.H);
		else {
			s.points.rotation.y = bu.k * .6 + bu.lt * .12;
			s.set({
				a: O.tex[g].glyph,
				b: O.tex[g].galaxy,
				revealBy: "w",
				reveal: 1,
				morph: bu.k,
				spread: .55,
				arc: 2.2,
				noise: .02 + .25 * (1 - bu.k) * bu.k,
				noiseFreq: .6,
				t,
				size: o.size ?? lerp(.0065, .026, bu.k),
				minPx: 1.1,
				bright: o.bright ?? lerp(.42, .5, bu.k),
				colA: GCOL[g],
				colB: GAL[g],
				sparkle: .3,
				...o.swarm
			}, cam, ctx.H);
		}
	}
	return {
		ty,
		bu
	};
}
/** The cursor at its cell, projected: one cell of the line, drawn on the scene text layer like the intro's last frame. */
function drawTypingCursor(ctx, cam, K, o = {}) {
	const t = ctx.t, ty = typeSt(t, K);
	if (t >= K.enterKey) return;
	const on = ty.typing || t < K.keyT[0] ? 1 : blinkOn(ctx.T, t), c = cursorCell(t, K), q = projectQuad(cursorAt(0).map((p) => [
		p[0] + c * CELL,
		p[1],
		p[2]
	]), cam);
	drawCursor(ctx.text.scene, q, {
		alpha: on * (o.alpha ?? 1),
		scale: Math.sqrt(Math.hypot(q[1][0] - q[0][0], q[1][1] - q[0][1]) / CUR.w)
	});
}
/** Enter: the box drops below a status line (as the CLI does when a prompt is submitted). 0 before Enter, 1 after. */
var submitK = (t, K) => ease.outCubic(seg(t, K.enterKey, K.enterKey + .08));
/**
* The prompt box around the line (fades in on the drop, drops a line on Enter, fades on the explosion) and, between
* Enter and the explosion, the thinking line `✻ Executing…` under the submitted line, on the film's turn clock.
* o: dof (lens for the border), alpha.
*/
var BOX_R = boxFor(LINE_R);
function prompt(ctx, cam, K, o = {}) {
	const t = ctx.t, sub = submitK(t, K), B = K.remake ? BOX_R : BOX;
	const a = (K.remake ? 1 : ease.outCubic(seg(t, K.s0 + .03, K.s0 + .5))) * (1 - ease.inCubic(seg(t, K.enter, K.enter + .12))) * (o.alpha ?? 1);
	drawPromptBox(ctx, O.lines, cam, {
		alpha: a,
		dy: sub * 4.35 * EM,
		dof: o.dof,
		hint: (1 - sub) * (o.hint ?? 1),
		border: [
			.2,
			.22,
			.27
		],
		...K.remake ? { box: B } : {}
	});
	if (t < K.enterKey || t > K.enter + .1) return;
	const p = toDesign([
		B.promptX,
		B.mid - 2.2 * EM,
		0
	], cam), q = toDesign([
		B.promptX + EM,
		B.mid - 2.2 * EM,
		0
	], cam);
	const em = Math.hypot(q[0] - p[0], q[1] - p[1]), al = ease.outCubic(seg(t, K.enterKey, K.enterKey + .06)) * (1 - seg(t, K.enter, K.enter + .1));
	thinking(ctx.text.overlay, p[0], p[1], t, {
		T: ctx.T,
		count: { from: 0 },
		verb: "Executing",
		size: em * .55,
		alpha: al
	});
}
function frame(ctx, o = {}) {
	frame$1(ctx.text.overlay, ctx.t, ctx.T, {
		label: "execute",
		bottomRight: o.br,
		alpha: .55 * (o.alpha ?? 1)
	});
}
function look(ctx, o = {}) {
	Object.assign(ctx.post, {
		bloom: 1.1,
		threshold: .9,
		ca: .1,
		vignette: .48,
		grain: .035,
		exposure: 1,
		...o
	});
}
function readout(ctx, rows, o = {}) {
	readout$1(ctx.text.overlay, o.x ?? 1480, o.y ?? 150, rows, {
		accent: o.accent ?? HEX.me,
		alpha: o.alpha ?? .75
	});
}
function flight(ctx, K, { yaw = 0, pitch = 0, roll = 0, ro = [
	0,
	0,
	0
], sway = 1, fade = 1, beam = 1 } = {}) {
	const t = ctx.t, u = O.lattice.uniforms, st = flightState(t, K.flight, ctx.T.beatAt.bind(ctx.T), K.gather);
	u.uRes.value.set(ctx.W, ctx.H);
	u.uT.value = st.lt;
	u.uZ.value = st.z;
	u.uPulse.value = st.pulse;
	u.uFade.value = fade;
	u.uRoll.value = roll;
	u.uBasis.value.copy(basis(yaw, pitch));
	u.uRo.value.set(...ro);
	u.uSway.value = sway;
	u.uSS.value = 2;
	u.uBeam.value = beam;
	ctx.pass(O.lattice);
	return st;
}
/**
* The beams' code, over the ray-marched pass: glyph streams on the z-beams, filmed by the matching camera, flowing
* forward along the beams. Glyphs fade out with distance like the lattice's fog (a depth cut plus the sprites' own
* sub-pixel dimming). o: the setup (as flight), bright, flow (units/s), reveal (0..1 of the depth window).
* (The matching camera is not handed to the rig: the shot's picture is the ray-marched pass, whose camera lives in the
* shader's uniforms, so a relay or a lens shift would move the glyphs off their beams.)
*/
function codeBeams(ctx, K, st, setup, o = {}) {
	reset();
	const cam = latticeCamera(O.bcam, st, setup, ctx.aspect), flow = (o.flow ?? 1.6) * st.lt, far = st.z + (o.far ?? 34);
	O.beams.gf.points.visible = true;
	O.beams.gf.set({
		a: O.beams.tex,
		scroll: [
			0,
			0,
			flow
		],
		reveal: (far - flow - -12) / 130,
		soft: 14 / 130,
		size: GLYPH,
		minPx: 5,
		bright: o.bright ?? .9,
		palette: BEAM_SYNTAX,
		t: ctx.t
	}, cam, ctx.H);
	render(ctx, cam);
}
function flightHud(ctx, K, st, br) {
	scrim(ctx.text.overlay, [
		[
			1450,
			120,
			400,
			100
		],
		[
			1560,
			1e3,
			340,
			60
		],
		[
			60,
			30,
			300,
			44
		],
		[
			1660,
			30,
			220,
			44
		]
	], { alpha: .6 });
	frame(ctx, { br });
	const v = 5.2 + 3 * seg(ctx.t, K.flight, K.gather) ** 3;
	readout(ctx, [
		["z", st.z.toFixed(2)],
		["v", `${v.toFixed(2)} u/s`],
		["cells", `${Math.floor(st.z / 4)}`]
	]);
}
function flightLook(ctx, o = {}) {
	look(ctx, {
		bloom: 1.2,
		threshold: .85,
		ca: .12 + .12 * kick(ctx),
		vignette: .55,
		exposure: 1,
		...o
	});
}
function creditView(ctx, K, t, setup) {
	O.ccam ??= new PerspectiveCamera(64, 16 / 9, .05, 300);
	const st = flightState(t, K.flight, ctx.T.beatAt.bind(ctx.T), K.gather);
	return {
		st,
		cam: latticeCamera(O.ccam, st, setup, ctx.aspect)
	};
}
var CREDIT_PAIR = [[-430, 150], [430, -150]];
function creditsFlight(ctx, K, setup) {
	const t = ctx.t, beat = K.B(1) - K.B(0), t0 = ctx.startOf("title/flight") ?? K.flight, cut = ctx.startOf("title/flightSide") ?? K.BAR(5);
	if (t >= cut) return;
	const { st, cam } = creditView(ctx, K, t, setup);
	if (t < t0) return;
	CREDIT_PAIR.forEach((at, i) => {
		const s = signAt(rideAt(st, {}, at, 4, rideD(t, t0, cut - .25, cut)), cam);
		if (s) drawSign(ctx.text.overlay, CREDITS_R[i], {
			...s,
			alpha: clamp((s.d - 1) / 1.6) * clamp((t - t0) / .1),
			t,
			t0,
			q: beat / 32
		});
	});
}
function creditsSide(ctx, K, setup) {
	const t = ctx.t, t0 = ctx.startOf("title/flightSide") ?? K.BAR(5), yaw = 1.25 - .1 * .9, D = 4.8;
	const cam = creditView(ctx, K, t, setup).cam, c = cam.position;
	const s = signAt([
		c.x + D * Math.sin(yaw),
		c.y + .35,
		c.z + D * Math.cos(yaw)
	], cam);
	if (s) drawSign(ctx.text.overlay, CREDITS_R[2], {
		...s,
		t,
		t0,
		q: (K.B(1) - K.B(0)) / 32
	});
}
function creditsBack(ctx, K, setup) {
	const t = ctx.t, cut = ctx.startOf("title/flightBack") ?? K.BAR(6), end = ctx.startOf("title/flightTop") ?? K.B(26);
	const { st, cam } = creditView(ctx, K, t, setup);
	const s = signAt(rideAt(st, { yaw: Math.PI }, [0, 0], 2.6, lerp(2.6, 3.5, seg(t, cut, end))), cam);
	if (s) drawSign(ctx.text.overlay, CREDITS_R[3], {
		...s,
		t,
		t0: cut - 1,
		q: (K.B(1) - K.B(0)) / 32
	});
}
function drawGather(ctx, cam, K, o = {}) {
	const t = ctx.t, k = gatherK(t, K), me = O.me;
	me.points.visible = true;
	me.points.rotation.y = .5 + t * .09 - .55 + (t - K.v1) * .12;
	me.points.scale.setScalar(1.25);
	me.set({
		a: O.tex.galaxy,
		b: O.tex.sphere,
		morph: k,
		spread: .6,
		arc: 1.2 * (1 - k),
		noise: .03 + .05 * (1 - k),
		noiseFreq: 1.6,
		t,
		size: .012,
		bright: .9 + .22 * kick(ctx),
		colA: COL.me,
		colB: COL.me,
		sparkle: .25,
		...o.swarm
	}, cam, ctx.H);
	return k;
}
var tgOf = (t, K) => t - K.enter;
var CARD_EM = 118;
var CARD_BASE = 560;
var CARD_H = 1;
var P0 = promptPose();
var LIE = {
	r: 13,
	el: .12,
	y: .6
};
var TOP = {
	r: 15,
	el: 1.35
};
var CARD_SIZE = .022 * TOP.r / 5.5;
var SPIN = .14;
var CARD_NEAR = .6;
/** Bar 1: from the line's level view down to LIE (the camera's height and its tilt on one easing). */
function lyingPose(lt, K) {
	const k = ease.inOutSine(seg(lt, .06, K.gTop - K.enter));
	return {
		r: lerp(P0.r, LIE.r, k),
		az: 0,
		el: LIE.el * k,
		target: [
			0,
			lerp(P0.y, LIE.y, k),
			0
		]
	};
}
/**
* Bars 2–4: the view from above, one push straight on through the title (titlePush: from rest, never slowing, slow
* over bars 2 and 3, ever faster on bar 4). The camera and its target go on together along the line of sight (a pure
* translation: the title is the target, which an orbit must not reach), by the title's whole distance.
*/
function topPose(lt, K) {
	const G = K.gTop - K.enter, X = K.pass - K.enter;
	const go = TOP.r * CARD_NEAR * titlePush(seg(lt, G, X));
	return {
		r: TOP.r,
		az: 0,
		el: TOP.el,
		target: [
			0,
			CARD_H - go * Math.sin(TOP.el),
			-1.5 - go * Math.cos(TOP.el)
		],
		spin: SPIN * (seg(lt, G, X) - .5)
	};
}
function tourCam(ctx, K, pose) {
	const p = pose(ctx.t - K.enter, K);
	return {
		cam: orbitCam(ctx, {
			...p,
			aspect: ctx.aspect,
			fov: 40
		}),
		r: p.r
	};
}
/** The camera from above on bar 2's downbeat, before the push; the title is laid out as it sees it. */
function lockCam(K) {
	if (O.lockCam) return O.lockCam;
	const cam = new PerspectiveCamera(40, 16 / 9, .01, 500);
	orbit(cam, {
		inset: true,
		...topPose(K.gTop - K.enter, K),
		aspect: 16 / 9,
		fov: 40
	});
	cam.updateMatrixWorld();
	return O.lockCam = cam;
}
/** A point of the title's plane (level, CARD_H over the disc), given in design pixels as seen from above; `near`: the
*  point drawn that far of the way from the camera (CARD_NEAR from above). */
function cardPoint(K, x, y, near = 1) {
	const p = cardGroundPoint(lockCam(K), x, y, CARD_H), c = lockCam(K).position;
	return [
		c.x + near * (p[0] - c.x),
		c.y + near * (p[1] - c.y),
		c.z + near * (p[2] - c.z)
	];
}
/** The title's stars as swarm shapes, lying in its plane, in the letters as the view from above sees them. */
function cardShapes(K) {
	if (O.cardTex) return O.cardTex;
	const cam = lockCam(K), ink = cardInk({
		em: CARD_EM,
		base: CARD_BASE,
		weight: 800
	});
	O.cardTex = {};
	CARD_GROUPS.forEach((g, i) => {
		O.cardTex[g] = O.card[g].shape(`title/card6-${g}`, (N) => cardStars(N, ink[g], cam, {
			perPx: .62,
			seed: 11 + i,
			ground: CARD_H
		}));
	});
	return O.cardTex;
}
/**
* The card. It has no entrance of its own: the ignition's front (ignition()) lights its stars as it lights the
* galaxy's, from the nucleus outwards (the swarm's morph as a wave from the nucleus, from black to the stars' colours,
* the stars staying where they are; a little ahead of the galaxy's front, so its ends are lit when the galaxy's rim
* is), so the two come on together. On bar 4 the camera flies at it and through it (topPose): it grows from the
* middle of the frame without bound and its stars stream out past the edges, brightening, each still a star and not
* a growing disc (the swarms' cap).
*/
var CARD_COL = {
	...GCOL,
	dim: mul(GCOL.dim, 1.6)
};
var CARD_WAVE = 10;
var CARD_SPREAD = .9;
function drawCard(ctx, cam, K, o = {}, at = 1) {
	const t = ctx.t, front = ignition(t, K).r;
	if (front <= 0) return;
	const tex = cardShapes(K), near = titlePush(seg(t, K.gTop, K.pass)), c = lockCam(K).position;
	for (const g of CARD_GROUPS) {
		O.card[g].points.visible = true;
		O.card[g].points.position.set(c.x * (1 - at), c.y * (1 - at), c.z * (1 - at));
		O.card[g].points.scale.setScalar(at);
		O.card[g].set({
			a: tex[g],
			b: tex[g],
			morph: clamp((front + 1.2) * CARD_SPREAD / CARD_WAVE),
			wave: CARD_WAVE,
			waveOrigin: [
				0,
				0,
				0
			],
			spread: CARD_SPREAD,
			arc: 0,
			size: CARD_SIZE * at,
			minPx: 1.4,
			cap: 9,
			bright: 1.35 * (1 + 1.5 * near * near),
			colA: [
				0,
				0,
				0
			],
			colB: CARD_COL[g],
			sparkle: .3,
			t,
			...o
		}, cam, ctx.H);
	}
}
/**
* Bar 3: the credits (the end card's comment lines, typed at machine speed) and, under them, the Claude logo as
* Anthropic gives it (title/claude-logo.js), in the card's plane so they move with the words; on the overlay, after
* the grade, so the logo keeps its own colours. On bar 4 they fly at the lens with the sign, and fade as they speed up
* (the overlay is not motion-blurred).
*/
var CREDITS = [[
	["//", HEX.dim],
	[" Music "],
	["—", HEX.dim],
	[" Mili"]
], [
	["//", HEX.dim],
	[" Visuals "],
	["—", HEX.dim],
	[" Claude Opus 5.5 Max"]
]];
var LOGO_H = 56;
function cardCredits(ctx, cam, K, near = 1) {
	const t = ctx.t, out = 1 - ease.inOutSine(seg(seg(t, K.gMacro, K.pass), .3, .55));
	if (t < K.cred || out <= .002) return;
	const L = ctx.text.overlay, at = (x, y) => toDesign(cardPoint(K, x, y, near), cam), y0 = 660, c0 = at(960, y0);
	const ex = [0, 1].map((i) => (at(1060, y0)[i] - c0[i]) / 100), k = Math.hypot(...ex), rot = Math.atan2(ex[1], ex[0]);
	const lock = {
		size: 30,
		weight: 500,
		font: "JetBrains Mono",
		align: "left"
	}, style = {
		...lock,
		size: 30 * k,
		rot
	}, q = K.beat / 32;
	const w = Math.max(...CREDITS.map((sp) => sp.reduce((s, [x]) => s + L.measure(x, lock), 0)));
	CREDITS.forEach((sp, j) => {
		let n = Math.floor((t - K.cred) / q), x = 960 - w / 2;
		for (const [s, col] of sp) {
			const shown = s.slice(0, Math.max(0, n)), p = at(x, y0 + j * 44);
			n -= s.length;
			if (shown) L.text(shown, p[0], p[1], {
				...style,
				color: col ?? HEX.white,
				alpha: out,
				glow: 4,
				glowColor: HEX.me
			});
			x += L.measure(s, lock);
		}
	});
	const la = out * ease.inOutSine(seg(t, K.cred + .12, K.cred + .5));
	if (la <= .002) return;
	const lc = at(960, 778), s = LOGO_H * k / CLAUDE_LOGO.h;
	O.logoPaths ??= CLAUDE_LOGO.paths.map((p) => ({
		fill: p.fill,
		path: new Path2D(p.d)
	}));
	L.draw((g) => {
		g.globalAlpha *= la;
		g.translate(lc[0], lc[1]);
		g.rotate(rot);
		g.translate(-CLAUDE_LOGO.w * s / 2, -CLAUDE_LOGO.h * s / 2);
		g.scale(s, s);
		for (const p of O.logoPaths) {
			g.fillStyle = p.fill;
			g.fill(p.path);
		}
	});
}
/**
* The typed line's points through the burst: pressed into the galaxy's plane from the cursor back (the stagger follows
* the line, a fuse lit where Enter was struck), each along a short curve to its orbit (a little swirl, no scatter).
*/
function lineR(t, K) {
	const bu = burstSt(t, K);
	return {
		morph: bu.k,
		spread: .4,
		order: {
			x0: LINE_R.cellX(0),
			x1: LINE_R.cellX(LINE_R.TEXT.length) + CELL,
			w: .85
		},
		arc: .25,
		swirl: -.6,
		noise: .03 * bu.k * (1 - bu.k),
		noiseFreq: .6,
		t,
		size: .0065,
		bright: .42,
		sparkle: .3
	};
}
/** The ignition: the radius inside which the galaxy is lit (from the nucleus to the rim in about a beat) and its front. */
function ignition(t, K) {
	const u = seg(t, K.enter + .08, K.enter + .08 + 1.6 * K.beat);
	return {
		r: lerp(-1.6, 7.8, ease.outQuad(u)),
		w: 1.6,
		flash: 1.4 * (1 - u) * seg(u, 0, .08)
	};
}
function drawGalaxyR(ctx, cam, K, o = {}) {
	O.gal.draw(ctx, cam, {
		tg: tgOf(ctx.t, K),
		line: lineR(ctx.t, K),
		reveal: ignition(ctx.t, K),
		...o
	});
}
function executeR(ctx, K) {
	const t = ctx.t, lt = t - K.enter, { cam } = tourCam(ctx, K, lyingPose);
	stars(ctx, cam, .4 * ease.inOutSine(seg(lt, .15, 1.2)));
	drawGalaxyR(ctx, cam, K);
	prompt(ctx, cam, K);
	const bu = burstSt(t, K), cp = [
		LINE_R.cellX(LINE_R.TEXT.length) + CELL / 2,
		(BAR.y0 + BAR.y1) / 2,
		0
	];
	if (bu.flash > .01) {
		O.lines.segment(cp, cp, {
			color: mul(HOT, 3 * bu.flash),
			width: 24
		});
		O.lines.segment(cp, cp, {
			color: mul(COL.me, 1.2 * bu.flash),
			width: 120
		});
	}
	const r1 = ease.outExpo(seg(lt, 0, .7)) * 2.2, f1 = 1 - seg(lt, .05, .7);
	if (f1 > 0) O.lines.polyline(circle(cp, r1, 96, "xy"), {
		color: mul(COL.me, 1.6 * f1),
		width: 1.5 + 5 * f1
	});
	const ig = ignition(t, K), f2 = (1 - seg(ig.r, 4.5, 7.8)) * seg(ig.r, .2, .8);
	if (f2 > 0) O.lines.polyline(circle([
		0,
		0,
		0
	], ig.r, 160), {
		color: mul(COL.me, 1.4 * f2),
		width: 1.5 + 4 * f2
	});
	drawCard(ctx, cam, K);
	render(ctx, cam);
	drawTypingCursor(ctx, cam, K);
	frame(ctx);
	readout(ctx, [["exit", lt < .3 ? "…" : "0"], ["points", `${O.visibleR.toLocaleString("en").replace(/,/g, " ")}`]]);
	look(ctx, {
		bloom: 1.1 + .05 * f1,
		ca: .03 + .3 * f1
	});
}
function galaxyTopR(ctx, K) {
	const { cam } = tourCam(ctx, K, topPose);
	stars(ctx, cam, .3);
	drawGalaxyR(ctx, cam, K);
	drawCard(ctx, cam, K, {}, CARD_NEAR);
	render(ctx, cam);
	cardCredits(ctx, cam, K, CARD_NEAR);
	frame(ctx, { br: "view  top" });
	readout(ctx, READOUT, { y: 840 });
	look(ctx, { ca: .03 });
}
function galaxyMacroR(ctx, K) {
	const { cam } = tourCam(ctx, K, topPose);
	stars(ctx, cam, .3);
	drawGalaxyR(ctx, cam, K);
	drawCard(ctx, cam, K, {}, CARD_NEAR);
	render(ctx, cam);
	cardCredits(ctx, cam, K, CARD_NEAR);
	frame(ctx);
	const dn = ease.inOutSine(seg(ctx.t, K.gMacro, K.gMacro + 1.8));
	look(ctx, {
		ca: .03,
		vignette: lerp(.48, .6, dn),
		exposure: lerp(1, 1.2, dn)
	});
}
/**
* The gather from the new galaxy: its glow and dust go out first, the field's stars hand over to the swarm `me` on
* their own places (the swarm's start shape is the field at the hand-over), and the swarm gathers into the sphere. The
* galaxy is turned and scaled as the swarm is; its turn starts at rest and reaches the published gather's speed before
* the sphere closes, so the last frames (morph 1) are the published ones: v1's first frame.
*/
var gatherKR = (t, K) => ease.inOutCubic(seg(t, K.gather + .3, K.v1 - .1));
function gatherRotR(t, K) {
	const pub = (x) => .5 + x * .09 - .55 + (x - K.v1) * .12, te = K.v1 - .1;
	if (t >= te) return pub(t);
	const u = seg(t, K.gather, te);
	return pub(te) - .21 * (te - K.gather) * (.5 - u ** 3 + u ** 4 / 2);
}
function drawGatherR(ctx, cam, K) {
	const t = ctx.t, rotY = gatherRotR(t, K), out = ease.inOutSine(seg(t, K.gather, K.gather + .32)), xf = ease.inOutSine(seg(t, K.gather + .08, K.gather + .42));
	if (out < 1 || xf < 1) O.gal.draw(ctx, cam, {
		tg: tgOf(t, K),
		rotY,
		scale: 1.25,
		glow: 1 - out,
		dust: 1 - out,
		field: 1 - xf,
		line: {
			morph: 1,
			fade: 1 - out
		}
	});
	O.tex.galaxyR ??= O.me.shape("title/galaxy-remake", () => positionsAt(O.gal.fieldTab.orb, tgOf(K.gather + .25, K)));
	const k = gatherKR(t, K), ramp = ease.inOutSine(seg(t, K.gather + .4, K.gather + 1)), me = O.me;
	me.points.visible = xf > 0;
	me.points.rotation.y = rotY;
	me.points.scale.setScalar(1.25);
	me.set({
		a: O.tex.galaxyR,
		b: O.tex.sphere,
		morph: k,
		spread: .6,
		arc: 1.2 * (1 - k),
		noise: (.03 + .05 * (1 - k)) * ramp,
		noiseFreq: 1.4,
		t,
		size: .012,
		bright: (.9 + .22 * kick(ctx)) * xf,
		colA: [
			.64,
			.9,
			1
		],
		colB: COL.me,
		sparkle: .25
	}, cam, ctx.H);
	return k;
}
/**
* A three-armed spiral galaxy on the XZ plane: logarithmic-looking arms (angle grows with radius), a gaussian disc
* that thins towards the rim, and an ellipsoidal bulge (flattened 0.55) at the centre.
*/
function galaxy(N, { r = 5, arms = 3, twist = 4.2, seed = 31 } = {}) {
	const g = rng(seed), out = new Float32Array(N * 4);
	const gauss = () => Math.sqrt(-2 * Math.log(Math.max(g(), 1e-9))) * Math.cos(TAU * g());
	for (let i = 0; i < N; i++) {
		if (g() < .22) {
			const rad = .55 * g() ** 1.6, y = g() * 2 - 1, a = g() * TAU, q = Math.sqrt(1 - y * y);
			out.set([
				q * Math.cos(a) * rad,
				y * rad * .55,
				q * Math.sin(a) * rad,
				0
			], i * 4);
			continue;
		}
		const u = Math.sqrt(g()), a = Math.floor(g() * arms) / arms * TAU + u * twist + gauss() * .16 * (1 - u * .4);
		const rr = u * r, dust = (.12 + .3 * u) * gauss();
		out.set([
			Math.cos(a) * rr + dust * .6,
			gauss() * (.035 + .06 * (1 - u)),
			Math.sin(a) * rr + dust * .6,
			0
		], i * 4);
	}
	return out;
}
chapter({
	id: "title",
	from: (T) => T.section("inst1").start,
	to: (T) => T.section("v1").start,
	init(ctx) {
		O = {
			scene: new Scene(),
			cam: newCamera(40)
		};
		O.me = new Swarm({ count: 1 << 18 });
		O.stars = new Swarm({ count: 16384 });
		O.lines = new GlowLines(2048);
		O.soft = new GlowLines(2048);
		O.soft.material.uniforms.uCore.value = .04;
		O.code = Object.fromEntries(GROUPS.map((g) => [g, new Swarm({ count: NG })]));
		const density = NG / Math.max(...GROUPS.map(inkArea)) * .98;
		O.tex = {
			galaxy: O.me.shape("title/galaxy", (N) => galaxy(N)),
			sphere: O.me.shape("title/sphere", (N) => shapes.sphere(N, { r: 1 })),
			stars: O.stars.shape("title/stars", (N) => shapes.stars(N, {
				r0: 25,
				r1: 70
			}))
		};
		GROUPS.forEach((g, i) => {
			const tx = lineTextures(NG, g, density, 3 + i);
			for (let q = 0; q < NG; q++) if (tx.glyph[q * 4 + 3] < 2) O.visible = (O.visible ?? 0) + 1;
			O.tex[g] = {
				glyph: O.code[g].shape(`title/glyph-${g}`, () => tx.glyph),
				cloud: O.code[g].shape(`title/cloud-${g}`, () => tx.cloud),
				galaxy: O.code[g].shape(`title/galaxy-${g}`, (N) => {
					const a = galaxy(N, { seed: 41 + i });
					for (let q = 0; q < N; q++) if (tx.glyph[q * 4 + 3] > 2) a.set([
						0,
						0,
						-1e6,
						9
					], q * 4);
					return a;
				})
			};
		});
		if (remade(ctx)) {
			O.card = Object.fromEntries(CARD_GROUPS.map((g) => [g, new Swarm({
				count: 16384,
				cap: true
			})]));
			const glyphs = [];
			O.visibleR = 0;
			GROUPS.forEach((g, i) => {
				const ink = LINE_R.inkArea(g);
				if (ink <= 0) return;
				const S = Math.ceil(Math.sqrt(ink * density + LINE_R.TEXT.length)), n = S * S, tx = LINE_R.lineTextures(n, g, density, 3 + i);
				for (let q = 0; q < n; q++) if (tx.glyph[q * 4 + 3] < 2) O.visibleR++;
				glyphs.push({
					a: shapeTexture(`title/glyphR-${g}`, n, () => tx.glyph),
					n,
					col: GCOL[g],
					skip: (q) => tx.glyph[q * 4 + 3] > 2
				});
			});
			O.gal = new Galaxy({ glyphs });
		}
		O.lattice = latticeMaterial();
		O.beams = beamField();
		O.bcam = new PerspectiveCamera(64, 16 / 9, .05, 300);
		O.scene.add(O.stars.points, ...GROUPS.map((g) => O.code[g].points), O.me.points, O.beams.gf.points, O.lines.mesh, O.soft.mesh);
		if (O.card) O.scene.add(...CARD_GROUPS.map((g) => O.card[g].points));
	},
	shots: [
		{
			id: "prompt",
			at: (T) => T.section("inst1").start,
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T), t = ctx.t, k = ease.inOutSine(seg(t, K.s0, K.tType));
				reset();
				const cy = (BAR.y0 + BAR.y1) / 2, tx = (cellX(0) + CELL / 2 + cursorX(t, K)) / 2, ty = lerp(cy, cy + .22 * EM, k);
				const out = ease.outCubic(seg(t, K.s0, K.tType)), d = DIST * (1 + 1.25 * out), cam = persp(O.cam, [
					tx + .12 * k,
					ty + .05 * k,
					d
				], [
					tx,
					ty,
					0
				], {
					fov: 40,
					aspect: ctx.aspect
				});
				drawCode(ctx, cam, K);
				prompt(ctx, cam, K);
				render(ctx, cam);
				drawTypingCursor(ctx, cam, K);
				frame(ctx, { alpha: ease.outCubic(seg(t, K.s0 + .03, K.s0 + .35)) });
				const g = ease.outCubic(seg(t, K.s0 + .02, K.s0 + .5));
				look(ctx, { ca: .02 });
				for (const key of Object.keys(CURSOR_LOOK)) if (typeof CURSOR_LOOK[key] === "number") ctx.post[key] = lerp(CURSOR_LOOK[key], ctx.post[key], g);
			}
		},
		{
			id: "type",
			at: (T) => keys(T).tType,
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T), t = ctx.t, k = seg(t, K.tType, K.B(6));
				reset();
				const tgt = [
					cursorX(t, K) - .05,
					.1 * EM,
					0
				], yaw = lerp(.62, .5, k), r = lerp(1.3, 1.18, k);
				const cam = persp(O.cam, [
					tgt[0] + Math.sin(yaw) * r,
					tgt[1] + .16,
					Math.cos(yaw) * r
				], tgt, {
					fov: 38,
					aspect: ctx.aspect
				});
				const focus = r;
				drawCode(ctx, cam, K, {
					swarm: {
						focus,
						aperture: .03,
						maxBlur: 26
					},
					size: .0042,
					bright: .3
				});
				prompt(ctx, cam, K, {
					dof: {
						cam,
						focus,
						aperture: .03,
						maxBlur: 26,
						soft: O.soft,
						n: 10
					},
					hint: 0
				});
				render(ctx, cam);
				drawTypingCursor(ctx, cam, K, { alpha: .7 });
				frame(ctx);
				readout(ctx, [["ln", "1"], ["col", `${typeSt(t, K).n + 1}`]]);
				look(ctx, {
					vignette: .55,
					ca: .02
				});
			}
		},
		{
			id: "line",
			at: (T) => keys(T).B(6),
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T), t = ctx.t, k = ease.inOutSine(seg(t, K.B(6), K.enter)), dn = submitK(t, K) * 1.1 * EM;
				reset();
				const cam = persp(O.cam, [
					lerp(.18, .08, k),
					.25 * EM + lerp(.3, .16, k) - dn,
					lerp(7, 6.55, k)
				], [
					0,
					.25 * EM - dn,
					0
				], {
					fov: 40,
					aspect: ctx.aspect
				});
				drawCode(ctx, cam, K);
				prompt(ctx, cam, K);
				render(ctx, cam);
				drawTypingCursor(ctx, cam, K);
				frame(ctx);
				readout(ctx, [["status", t < K.enterKey ? "ready" : "running"], ["args", "me"]]);
				look(ctx, { ca: .02 });
			}
		},
		{
			id: "execute",
			at: (T) => keys(T).enter,
			ownsLyrics: true,
			draw(ctx) {
				const K = kk(ctx), lt = ctx.t - K.enter;
				reset();
				if (remade(ctx)) {
					executeR(ctx, K);
					return;
				}
				const pull = ease.inOutCubic(seg(lt, .12, 3.4));
				const cam = orbitCam(ctx, {
					r: lerp(DIST, 13, pull),
					az: lerp(0, .9, pull),
					el: lerp(0, 1.02, pull),
					target: [
						0,
						lerp(.25 * EM - 1.1 * EM, 0, pull),
						0
					],
					aspect: ctx.aspect,
					fov: 40
				});
				stars(ctx, cam, .55 * ease.inOutSine(seg(lt, .15, 1.6)));
				const { bu } = drawCode(ctx, cam, K);
				prompt(ctx, cam, K);
				const cp = [
					cellX(TEXT.length) + CELL / 2,
					(BAR.y0 + BAR.y1) / 2,
					0
				];
				if (bu.flash > .01) {
					O.lines.segment(cp, cp, {
						color: mul(HOT, 3 * bu.flash),
						width: 24
					});
					O.lines.segment(cp, cp, {
						color: mul(COL.me, 1.2 * bu.flash),
						width: 120
					});
				}
				const r1 = ease.outExpo(seg(lt, 0, 1.1)) * 3.2, f1 = 1 - seg(lt, .05, 1.1);
				if (f1 > 0) O.lines.polyline(circle(cp, r1, 96, "xy"), {
					color: mul(COL.me, 1.6 * f1),
					width: 1.5 + 5 * f1
				});
				const r2 = ease.outExpo(seg(lt, .1, 1.5)) * 11, f2 = 1 - seg(lt, .2, 1.5);
				if (f2 > 0) O.lines.polyline(circle([
					0,
					0,
					0
				], r2, 128), {
					color: mul(COL.me, 1.2 * f2),
					width: 1.5 + 6 * f2
				});
				render(ctx, cam);
				drawTypingCursor(ctx, cam, K);
				frame(ctx);
				readout(ctx, [["exit", lt < .3 ? "…" : "0"], ["points", `${O.visible.toLocaleString("en").replace(/,/g, " ")}`]]);
				look(ctx, {
					bloom: 1.15,
					ca: .1 + .25 * f1
				});
			}
		},
		{
			id: "galaxyTop",
			at: (T) => keys(T).BAR(3),
			ownsLyrics: true,
			draw(ctx) {
				const K = kk(ctx), t = ctx.t, k = seg(t, K.gTop ?? K.BAR(3), K.gMacro ?? K.B(14));
				reset();
				if (remade(ctx)) {
					galaxyTopR(ctx, K);
					return;
				}
				const cam = persp(O.cam, [
					0,
					lerp(10.5, 9.6, k),
					.001
				], [
					0,
					0,
					0
				], {
					fov: 44,
					aspect: ctx.aspect,
					roll: lerp(.2, .35, k)
				});
				stars(ctx, cam, .35);
				drawCode(ctx, cam, K, {
					size: .022,
					bright: .42
				});
				render(ctx, cam);
				frame(ctx, { br: "view  top" });
				readout(ctx, [
					["arms", "3"],
					["twist", "4.20 rad"],
					["r", "5.00"]
				]);
				look(ctx, { ca: .03 });
			}
		},
		{
			id: "galaxyCover",
			editOnly: true,
			at: (T) => keysR(T).gTop,
			ownsLyrics: true,
			draw(ctx) {
				const K = kk(ctx), R = ctx.row;
				reset();
				const cam = orbitCam(ctx, {
					r: R.r ?? 19,
					az: R.az ?? 0,
					el: R.el ?? 1.56,
					target: [
						0,
						0,
						0
					],
					aspect: ctx.aspect,
					fov: 40
				});
				drawGalaxyR(ctx, cam, K);
				render(ctx, cam);
				look(ctx, {
					ca: 0,
					vignette: 0,
					grain: 0
				});
			}
		},
		{
			id: "galaxyMacro",
			at: (T) => keys(T).B(14),
			ownsLyrics: true,
			draw(ctx) {
				const K = kk(ctx), t = ctx.t, k = seg(t, K.gMacro ?? K.B(14), K.flight);
				reset();
				if (remade(ctx)) {
					galaxyMacroR(ctx, K);
					return;
				}
				const u = ease.inOutSine(k), pos = [
					lerp(-4.2, -.9, u),
					lerp(.42, .24, u),
					lerp(3.2, .95, u)
				], dir = [
					3.3,
					-.3,
					-2.25
				];
				const cam = persp(O.cam, pos, [
					pos[0] + dir[0],
					pos[1] + dir[1],
					pos[2] + dir[2]
				], {
					fov: 50,
					aspect: ctx.aspect,
					roll: lerp(.05, -.1, u)
				});
				drawCode(ctx, cam, K, {
					size: .008,
					bright: .3,
					swarm: {
						focus: 2.2,
						aperture: .016,
						maxBlur: 18
					}
				});
				render(ctx, cam);
				frame(ctx);
				look(ctx, { vignette: .6 });
			}
		},
		{
			id: "flight",
			at: (T) => keys(T).flight,
			ownsLyrics: true,
			transitionIn: {
				type: "zoom",
				dur: .6,
				bias: .5
			},
			draw(ctx) {
				const K = keys(ctx.T), setup = { roll: .15 * Math.sin((ctx.t - K.flight) * .6) };
				flightHud(ctx, K, flight(ctx, K, setup), "cam  forward");
				if (remade(ctx)) creditsFlight(ctx, K, setup);
				flightLook(ctx);
			}
		},
		{
			id: "flightSide",
			at: (T) => keys(T).BAR(5),
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T), setup = {
					yaw: 1.25 - .1 * (ctx.t - K.BAR(5)),
					pitch: .05,
					sway: .5
				};
				const k = ease.outCubic(seg(ctx.t, K.BAR(5), K.BAR(5) + .35));
				const st = flight(ctx, K, {
					...setup,
					beam: lerp(1, .12, k)
				});
				codeBeams(ctx, K, st, setup, {
					bright: 1.25 * k,
					far: 40
				});
				flightHud(ctx, K, st, "cam  side");
				if (remade(ctx)) creditsSide(ctx, K, setup);
				flightLook(ctx);
			}
		},
		{
			id: "flightBack",
			at: (T) => keys(T).BAR(6),
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T), lt = ctx.t - K.BAR(6);
				let st = null;
				const setup = {
					yaw: Math.PI + .08 * Math.sin(lt * 1.3),
					roll: -.12 * lt
				};
				const tex = capture(ctx, (sub) => {
					st = flight(sub, K, setup);
				});
				flightLook(ctx);
				view(ctx, tex, "ascii", {
					cell: 14,
					tint: [
						.42,
						.92,
						1
					],
					source: .45,
					gain: 1.9
				});
				flightHud(ctx, K, st, "cam  rear · ascii");
				if (remade(ctx)) creditsBack(ctx, K, setup);
			}
		},
		{
			id: "flightTop",
			at: (T) => keys(T).B(26),
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T);
				flightHud(ctx, K, flight(ctx, K, {
					pitch: -1.3,
					roll: .3 + (ctx.t - K.B(26)) * .4,
					ro: [
						0,
						.6,
						0
					],
					sway: .3
				}), "cam  top");
				flightLook(ctx);
			}
		},
		{
			id: "flightOut",
			at: (T) => keys(T).B(27),
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T), lt = ctx.t - K.B(27);
				flightHud(ctx, K, flight(ctx, K, {
					roll: .5 * ease.inOutCubic(seg(lt, 0, .45)),
					fade: 1 - seg(ctx.t, K.gather - .12, K.gather) * .5
				}), "cam  forward");
				flightLook(ctx);
			}
		},
		{
			id: "gatherTop",
			at: (T) => keys(T).gather,
			ownsLyrics: true,
			transitionIn: {
				type: "fade",
				dur: .3
			},
			draw(ctx) {
				const K = keys(ctx.T), t = ctx.t, k = seg(t, K.gather, K.B(30));
				reset();
				const cam = persp(O.cam, [
					0,
					lerp(15, 12.5, k),
					.001
				], [
					0,
					0,
					0
				], {
					fov: 40,
					aspect: ctx.aspect,
					roll: -.2 - .3 * k
				});
				stars(ctx, cam, .45);
				const g = remade(ctx) ? drawGatherR(ctx, cam, kk(ctx)) : drawGather(ctx, cam, K);
				render(ctx, cam);
				frame(ctx, { br: "view  top" });
				readout(ctx, [["gather", `${(g * 100).toFixed(0)} %`], ["points", "262 144"]]);
				look(ctx, {
					bloom: 1.15,
					ca: .03
				});
			}
		},
		{
			id: "gather",
			at: (T) => keys(T).B(30),
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T), t = ctx.t;
				reset();
				const k = gatherK(t, K);
				O.cam.near = .01;
				O.cam.far = 500;
				const cam = orbitCam(ctx, {
					r: lerp(11, 5.2, k),
					az: .5 + t * .09,
					el: .22 + .08 * Math.sin(t * .4),
					aspect: ctx.aspect,
					fov: 38
				});
				stars(ctx, cam);
				if (remade(ctx)) drawGatherR(ctx, cam, kk(ctx));
				else drawGather(ctx, cam, K);
				render(ctx, cam);
				frame(ctx);
				Object.assign(ctx.post, {
					bloom: 1.15,
					threshold: .9,
					ca: lerp(.03, .3, ease.inOutSine(seg(t, K.B(30), K.v1 - .15))),
					vignette: .42,
					grain: .03,
					exposure: 1.05
				});
			}
		}
	]
});
//#endregion
