import { chapter } from "../engine/timeline.js?v=vYBbdLfo";
import { TAU, clamp, ease, hash2, lerp, mix3, rng, seg, smoothstep } from "../engine/math.js?v=BJIlRm7-";
import { COL, HEX } from "../theme.js?v=Bj33PIbo";
import { remade } from "../lib/published.js?v=aV_CU5HV";
import { OrthographicCamera, Scene } from "../../vendor/three/build/three.core.js?v=q9f7JKE-";
import { Swarm } from "../engine/swarm.js?v=DTFpJa7B";
import { GlowLines } from "../engine/lines.js?v=B_AAaaTO";
import { rig } from "../engine/rig.js?v=39-joEtk";
import { consoleLog, newCamera, orbit } from "../lib/look.js?v=BfOqFF7i";
import { gridPlane } from "../lib/env.js?v=CIN_DqPv";
import { callout, dimLine, frame, readout, toDesign } from "../lib/hud.js?v=BgmSZjmG";
import { GlyphField, codeBlock } from "../lib/glyphs.js?v=DWbHICXG";
import { capture, view } from "../lib/modes.js?v=Cu3GYO-2";
import { shapes } from "../engine/shapes.js?v=BFh0PgdI";
import { alloc, put } from "./v2/shapeset.js?v=Bbzza00z";
import { Cloud } from "./v2/cloud.js?v=D68TnMRL";
import { QED, glyphPoints } from "./v2/glyphs.js?v=Bcui0dtv";
import { INK, PRINT_LOOK, printed } from "./v2/print.js?v=BJmTtHS6";
import { camUniforms, moireMaterial, tunnelMaterial } from "./pre2/trance.js?v=CSw5zHMv";
import { Sprinkle } from "./pre2/sprinkle.js?v=Ba1jtlsb";
import { FD, diskAngle, inArea, litAt, schedule } from "./pre2/flipdot.js?v=CEOW_dEb";
import { FlipPanel } from "./pre2/flippanel.js?v=Czzz_lQ5";
//#region src/ch/07_pre2.js
var VIO = [
	.62,
	.4,
	1
];
var PINK = [
	1,
	.34,
	.72
];
var PH = {
	vio: "#b596ff",
	pink: "#ff79c6",
	dim: "#8a7aa8"
};
var GS = QED.H / 2;
var CODE = {
	F: 70,
	M: 77
};
var bitsOf = (c) => Array.from({ length: 8 }, (_, i) => c >> 7 - i & 1);
var C2 = {
	r: 3.5,
	az: .35,
	el: 1.2,
	fov: 36,
	floorY: -.55
};
var EXIT_END = 3.6;
var R0 = EXIT_END * Math.tan(31 * Math.PI / 180) / (2 * Math.tan(18 * Math.PI / 180));
var GLYPH_S = 162e-7;
var glyphLook = (size) => ({
	size,
	bright: GLYPH_S / size ** 2
});
var O = null;
var KC = null;
function keys(T) {
	if (KC?.T === T) return KC;
	const s0 = T.section("pre2").start, b0 = Math.round(T.beatAt(s0)), B = (k) => T.beatTime(b0 + k), L = (s) => T.findLine(s);
	const l56 = L("gender"), l57 = L("to f"), l58 = L("whatever"), l59 = L("from am"), l60 = L("role"), l61 = L("to s"), l62 = L("enter"), l63 = L("trance");
	return KC = {
		T,
		s0,
		B,
		beat: B(1) - B(0),
		end: T.section("c2").start,
		l56,
		wMy: l56.words[1],
		wGender: l56.words[2],
		l57,
		wF: l57.words[1],
		wTo2: l57.words[2],
		wM: l57.words[3],
		l58,
		l59,
		wAM: l59.words[1],
		wPM: l59.words[3],
		l60,
		wSwitch: l60.words[1],
		wRole: l60.words[3],
		l61,
		wS: l61.words[1],
		wM2: l61.words[3],
		l62,
		l63,
		wTr: [l63.words[1], l63.words[3]]
	};
}
function persp(ctx, pos, look, { fov = 38, aspect = ctx.aspect, up = [
	0,
	1,
	0
] } = {}) {
	const c = O.persp;
	c.fov = fov;
	c.aspect = aspect;
	c.near = .005;
	c.far = 900;
	c.position.set(...pos);
	c.up.set(...up);
	c.lookAt(...look);
	c.updateProjectionMatrix();
	c.updateMatrixWorld();
	return rig.cam(c, { look });
}
/** The orthographic view, set; ortho() hands it to the rig (`ampm` widens it first). */
function orthoView(center, dir, height, aspect) {
	const c = O.ortho, w = height * aspect, d = 40, [x, y, z] = center;
	Object.assign(c, {
		left: -w / 2,
		right: w / 2,
		top: height / 2,
		bottom: -height / 2,
		near: .01,
		far: 200,
		zoom: 1
	});
	if (dir === "top") {
		c.position.set(x, y + d, z);
		c.up.set(0, 0, -1);
	} else {
		c.position.set(x, y, z + d);
		c.up.set(0, 1, 0);
	}
	c.lookAt(x, y, z);
	c.updateProjectionMatrix();
	c.updateMatrixWorld();
	return c;
}
var ortho = (center, dir, height, aspect) => rig.cam(orthoView(center, dir, height, aspect), { look: center });
function reset() {
	for (const o of [
		O.me.points,
		O.you.points,
		O.a.points,
		O.b.points,
		O.stars.points,
		O.lines.mesh,
		O.floor,
		O.sand.points,
		O.chat.points
	]) o.visible = false;
	for (const o of [
		O.me.points,
		O.you.points,
		O.a.points,
		O.b.points,
		O.sand.points
	]) {
		o.position.set(0, 0, 0);
		o.rotation.set(0, 0, 0);
		o.scale.setScalar(1);
	}
	O.lines.begin();
}
function render(ctx, cam) {
	O.lines.mesh.visible = true;
	O.lines.end(ctx);
	ctx.draw(O.scene, cam);
}
function renderPrinted(ctx, cam, o) {
	O.lines.mesh.visible = true;
	O.lines.end(ctx);
	printed(ctx, (sub) => sub.draw(O.scene, cam), o);
}
function floor(y, col, o = {}) {
	const f = O.floor;
	f.visible = true;
	f.position.set(0, y, 0);
	f.material.uniforms.uCol.value.setRGB(...col);
	f.material.uniforms.uAxisCol.value.setRGB(...o.axis ?? col.map((c) => c * 1.5));
	f.userData.set({
		intensity: o.intensity ?? 1,
		fade: o.fade ?? .07,
		reveal: 1,
		revealR: 200
	});
}
function overlays(ctx, K, br, o = {}) {
	frame(ctx.text.overlay, ctx.t, ctx.T, {
		label: "swap",
		bottomRight: br,
		color: o.paper ? INK.grey : void 0,
		alpha: o.paper ? .8 : void 0
	});
	consoleLog(ctx.text.overlay, ctx.T, ctx.t, {
		from: K.s0 - .2,
		accent: o.paper ? INK.amber : PH.pink,
		...o.paper ? {
			color: INK.black,
			glow: 0
		} : {}
	});
}
function look(ctx, o = {}) {
	Object.assign(ctx.post, {
		bloom: 1,
		threshold: .95,
		ca: .22,
		vignette: .42,
		grain: .03,
		exposure: 1,
		...o
	});
}
/** The two sung "trance": a designed flash of the whole frame toward pink on each (gone after 140 ms). Call after look(). */
function tranceFlash(ctx, K) {
	for (const w of K.wTr) {
		const dt = ctx.t - w.start;
		if (dt < 0 || dt > .5) continue;
		const e = Math.max(0, 1 - dt / .14) ** 4;
		ctx.post.fade = .34 * e;
		ctx.post.fadeCol = [
			1,
			.55,
			.9
		];
		ctx.post.exposure *= 1 + .5 * e;
	}
}
var dot = (p, col, w = 14) => O.lines.segment(p, p, {
	color: col,
	width: w
});
var kick = (ctx) => ctx.F.env("onset_drums", ctx.t, .005, .12);
var glyphW = (depth) => (x, y, r) => [
	x * GS,
	y * GS,
	depth ? (r - .5) * depth : 0
];
var HX = {
	R: 1,
	H: 1.05,
	y0: -.52,
	dialY: -1.05
};
var AM_COL = [
	.5,
	.52,
	1
];
var PM_COL = [
	1,
	.45,
	.62
];
var helixP = (h) => {
	const a = h / 12 * TAU;
	return [
		HX.R * Math.sin(a),
		HX.y0 + HX.H * h / 24,
		-HX.R * Math.cos(a)
	];
};
var dialP = (h, r = HX.R) => {
	const a = h / 12 * TAU;
	return [
		r * Math.sin(a),
		HX.dialY,
		-r * Math.cos(a)
	];
};
var hourCol = (h) => mix3(AM_COL, PM_COL, smoothstep(11.5, 12.5, (h % 24 + 24) % 24));
function helixShape(N) {
	const r = rng(211), S = alloc(N), n1 = Math.floor(N * .64), n2 = Math.floor(N * .2), n3 = Math.floor(N * .08);
	for (let i = 0; i < N; i++) {
		let p, c, w;
		if (i < n1) {
			const h = r() * 24, q = helixP(h), j = () => (r() - .5) * .016;
			p = [
				q[0] + j(),
				q[1] + j(),
				q[2] + j()
			];
			c = hourCol(h);
			w = h / 24;
		} else if (i < n1 + n2) {
			const k = Math.floor(r() * 24), a = k / 12 * TAU, rr = 1 + (r() - .5) * (k % 3 ? .08 : .16);
			p = [
				Math.sin(a) * rr,
				helixP(k)[1] + (r() - .5) * .008,
				-Math.cos(a) * rr
			];
			c = hourCol(k).map((v) => v * 1.25);
			w = k / 24;
		} else if (i < n1 + n2 + n3) {
			const k = Math.floor(r() * 12), a = k / 12 * TAU, y = lerp(helixP(k)[1], helixP(k + 12)[1], r());
			p = [
				Math.sin(a) * HX.R,
				y,
				-Math.cos(a) * HX.R
			];
			c = [
				.75,
				.7,
				1
			].map((v) => v * .3);
			w = .5;
		} else {
			const k = Math.floor(r() * 288) / 12, q = helixP(k);
			p = [
				q[0] * 1.03,
				q[1],
				q[2] * 1.03
			];
			c = [
				.85,
				.82,
				1
			].map((v) => v * .5);
			w = k / 24;
		}
		put(S, i, p, c.map((v) => v * (.8 + .4 * r())), [
			0,
			0,
			0
		], w, 0);
	}
	return S;
}
function glyphState(t, K) {
	const tx = O.tex;
	if (t < K.wTo2.start) return {
		a: tx.qed,
		b: tx.F,
		morph: ease.inOutCubic(seg(t, K.wMy.start - .02, K.wGender.start + .08)),
		spread: .1
	};
	if (t < K.l58.start) return {
		a: tx.F,
		b: tx.M,
		morph: ease.inOutCubic(seg(t, K.wTo2.start, K.wM.start + .06)),
		spread: .12
	};
	return {
		a: tx.M,
		b: tx.helix,
		morph: ease.inOutCubic(seg(t, K.l58.start + .02, K.l58.start + .5)),
		spread: .4,
		arc: .25
	};
}
function drawGlyph(ctx, cam, K, o = {}) {
	const st = glyphState(ctx.t, K), me = O.me;
	me.points.visible = true;
	me.set({
		...st,
		t: ctx.t,
		...glyphLook(.01),
		sparkle: QED.sparkle,
		variance: 0,
		...o
	}, cam, ctx.H);
	return st;
}
/** The 8-bit register under the glyph: F's code point, then M's, the three differing bits flip on sixteenths. */
function register(L, K, t, x, y, o = {}) {
	const f = bitsOf(CODE.F), m = bitsOf(CODE.M), cell = o.cell ?? 34, gap = 8;
	const flips = [];
	for (let i = 0; i < 8; i++) if (f[i] !== m[i]) flips.push(i);
	const tFlip = (i) => K.wTo2.start + flips.indexOf(i) * K.beat / 4;
	let code = 0;
	L.draw((g) => {
		g.globalAlpha *= o.alpha ?? .9;
		for (let i = 0; i < 8; i++) {
			const on = f[i] !== m[i] ? t >= tFlip(i) ? m[i] : f[i] : f[i], X = x + i * (cell + gap) + (i >= 4 ? 10 : 0);
			code |= on << 7 - i;
			g.strokeStyle = f[i] !== m[i] ? PH.pink : HEX.dim;
			g.lineWidth = f[i] !== m[i] ? 1.6 : 1.1;
			g.strokeRect(X + .5, y + .5, cell, cell);
			if (on) {
				g.fillStyle = f[i] !== m[i] ? PH.pink : PH.vio;
				g.globalAlpha *= .85;
				g.fillRect(X + 5, y + 5, cell - 10, cell - 10);
				g.globalAlpha /= .85;
			}
			if (f[i] !== m[i] && t >= tFlip(i) && t < tFlip(i) + .18) {
				g.strokeStyle = "#fff";
				g.lineWidth = 1;
				g.strokeRect(X - 3.5, y - 3.5, cell + 8, cell + 8);
			}
		}
	});
	const hex = code.toString(16).toUpperCase().padStart(2, "0"), ch = String.fromCharCode(code);
	const done = flips.filter((i) => t >= tFlip(i)).length;
	L.text(`U+00${hex}  '${ch}'  0x${hex}`, x, y + cell + 30, {
		size: 17,
		weight: 600,
		align: "left",
		color: PH.vio,
		alpha: .9
	});
	if (t >= K.wTo2.start - .05) L.text(`0x46 ⊕ 0x4D = 0x0B · Hamming ${done}/3`, x, y + cell + 56, {
		size: 15,
		weight: 500,
		align: "left",
		color: HEX.dim,
		alpha: .9
	});
}
function clockH(t, K) {
	if (t < K.wAM.start) return 5 + ease.inOutSine(seg(t, K.l58.start + .05, K.wAM.start));
	if (t < K.wPM.start) return 6 + 12 * ease.inOutCubic(seg(t, K.wAM.start, K.wPM.start));
	return 18 + (t - K.wPM.start) / 60;
}
var fmt = (h) => {
	const s = Math.round(h * 3600) % 86400, H = Math.floor(s / 3600), M = Math.floor(s / 60) % 60, S = s % 60;
	return `${H < 12 ? "AM" : "PM"} ${String(H).padStart(2, "0")}:${String(M).padStart(2, "0")}:${String(S).padStart(2, "0")}`;
};
/** (the remake) the same time on a 12-hour clock: "06:00:00 PM", not "PM 18:00:00" */
var fmt12 = (h) => {
	const s = Math.round(h * 3600) % 86400, H = Math.floor(s / 3600), M = Math.floor(s / 60) % 60, S = s % 60;
	return `${String(H % 12 || 12).padStart(2, "0")}:${String(M).padStart(2, "0")}:${String(S).padStart(2, "0")} ${H < 12 ? "AM" : "PM"}`;
};
var fmtT = (ctx, h) => remade(ctx) ? fmt12(h) : fmt(h);
var sunEl = (h) => Math.sin((h - 6) / 12 * Math.PI);
/** The helix of the day (me's points), its shadow the dial, "now" on both, and the part of the day already lived. */
function drawTime(ctx, cam, K, o = {}) {
	const t = ctx.t, h = clockH(t, K), L = O.lines, st = glyphState(t, K), me = O.me;
	me.points.visible = true;
	me.set({
		...st,
		t,
		size: lerp(.01, .005, st.morph),
		bright: Math.exp(lerp(Math.log(glyphLook(.01).bright), Math.log(.09), st.morph)),
		variance: 0,
		sparkle: .1,
		...o.me
	}, cam, ctx.H);
	const on = seg(st.morph, .6, 1);
	if (on <= 0) return h;
	L.polyline(Array.from({ length: 129 }, (_, i) => dialP(i / 128 * 12)), {
		color: [
			.8,
			.8,
			1
		].map((v) => v * .6 * on),
		width: 1.8
	});
	for (let k = 0; k < 12; k++) L.segment(dialP(k, .9), dialP(k, 1), {
		color: [
			.9,
			.9,
			1
		].map((v) => v * .7 * on),
		width: k % 3 ? 1.4 : 2.4
	});
	const arc = [];
	for (let i = 0; i <= 96; i++) arc.push(helixP(lerp(5, h, i / 96)));
	if (remade(ctx)) return drawNowPair(ctx, h, arc, on);
	if (h > 5.02) L.polyline(arc, {
		color: COL.you.map((v) => v * .8 * on),
		width: 3
	});
	const p = helixP(h), q = dialP(h), c = hourCol(h);
	L.segment(p, q, {
		color: c.map((v) => v * .55 * on),
		width: 1.4
	});
	L.segment([
		0,
		HX.dialY,
		0
	], dialP(h, .72), {
		color: [
			1,
			.95,
			1
		].map((v) => v * 1.4 * on),
		width: 4.5
	});
	dot([
		0,
		HX.dialY,
		0
	], COL.white.map((v) => v * 1.6 * on), 10);
	dot(p, c.map((v) => v * 2.8 * on), 16);
	dot(p, c.map((v) => v * .4 * on), 46);
	dot(q, c.map((v) => v * 2 * on), 11);
	return h;
}
/** (the remake) "now" on the clock: me and you side by side on the helix (me inside, you outside), with their
* shadows on the dial; the day they have lived so far is lit behind them. */
function drawNowPair(ctx, h, arc, on) {
	const L = O.lines, a = h / 12 * TAU, rad = [
		Math.sin(a),
		0,
		-Math.cos(a)
	], off = .075, p = helixP(h), q = dialP(h);
	const at = (c, k) => [
		c[0] + rad[0] * k,
		c[1],
		c[2] + rad[2] * k
	];
	if (h > 5.02) L.polyline(arc, {
		color: [
			1,
			.86,
			.78
		].map((v) => v * .7 * on),
		width: 3
	});
	L.segment(p, q, {
		color: [
			.9,
			.88,
			1
		].map((v) => v * .45 * on),
		width: 1.4
	});
	L.segment([
		0,
		HX.dialY,
		0
	], dialP(h, .72), {
		color: [
			1,
			.95,
			1
		].map((v) => v * 1.4 * on),
		width: 4.5
	});
	dot([
		0,
		HX.dialY,
		0
	], COL.white.map((v) => v * 1.6 * on), 10);
	for (const [k, col] of [[-.075, COL.me], [off, COL.you]]) {
		const pp = at(p, k), qq = at(q, k);
		dot(pp, col.map((v) => v * 2.8 * on), 16);
		dot(pp, col.map((v) => v * .45 * on), 46);
		dot(qq, col.map((v) => v * 1.8 * on), 10);
	}
	return h;
}
/**
* (The remake) "from AM to PM" in the dark (docs/REMAKE.md ruling 26): the published figure — the sun's elevation over
* one day, the horizon, AM and PM the two halves, the part lived in bold — drawn in light; "now" is me and you side by
* side on the curve, walking from sunrise to sunset.
*/
function ampmDark(ctx, K, t, lt, h) {
	let cam = orthoView([
		12,
		0,
		0
	], "front", lerp(1.62, 1.55, lt), ctx.aspect);
	cam.left *= 24 / (1.62 * ctx.aspect) * 1.18;
	cam.right *= 24 / (1.62 * ctx.aspect) * 1.18;
	cam.updateProjectionMatrix();
	cam = rig.cam(cam, { look: [
		12,
		0,
		0
	] });
	const L = O.lines, Y = (e) => .12 + e * .34, now = (h % 24 + 24) % 24;
	L.segment([
		0,
		Y(0),
		0
	], [
		24,
		Y(0),
		0
	], {
		color: [
			.85,
			.88,
			1
		].map((v) => v * .8),
		width: 2
	});
	L.segment([
		0,
		Y(-1.1),
		0
	], [
		0,
		Y(1.1),
		0
	], {
		color: [
			.85,
			.88,
			1
		].map((v) => v * .4),
		width: 1.3
	});
	L.segment([
		12,
		Y(-1.1),
		0
	], [
		12,
		Y(1.1),
		0
	], {
		color: [
			.85,
			.88,
			1
		].map((v) => v * .28),
		width: 1.2
	});
	for (let k = 0; k <= 24; k += 3) L.segment([
		k,
		Y(0) - .02,
		0
	], [
		k,
		Y(0) + .02,
		0
	], {
		color: [
			.85,
			.88,
			1
		].map((v) => v * .6),
		width: 1.3
	});
	for (let x = .125; x < 24; x += .25) {
		const e = sunEl(x), col = e >= 0 ? [
			1,
			.55,
			.2
		] : [
			.4,
			.45,
			1
		];
		L.segment([
			x,
			Y(0),
			0
		], [
			x + e * .12,
			Y(e),
			0
		], {
			color: col.map((v) => v * .28),
			width: 1.1
		});
	}
	const curve = [];
	for (let i = 0; i <= 240; i++) {
		const x = i / 10;
		curve.push([
			x,
			Y(sunEl(x)),
			0
		]);
	}
	L.polyline(curve, {
		color: [
			.9,
			.9,
			1
		].map((v) => v * .55),
		width: 1.6
	});
	const lived = [];
	for (let i = 0; i <= 96; i++) {
		const x = lerp(6, Math.max(6.001, now), i / 96);
		lived.push([
			x,
			Y(sunEl(x)),
			0
		]);
	}
	L.polyline(lived, {
		color: [
			1,
			.86,
			.78
		].map((v) => v * 1.2),
		width: 3.4
	});
	L.segment([
		now,
		Y(-1.1),
		0
	], [
		now,
		Y(1.1),
		0
	], {
		color: [
			1,
			.9,
			.95
		].map((v) => v * .5),
		width: 1.3
	});
	const c = [
		now,
		Y(sunEl(now)),
		0
	];
	for (const [k, col] of [[-.045, COL.me], [.045, COL.you]]) {
		const pp = [
			c[0],
			c[1] + k,
			0
		];
		dot(pp, col.map((v) => v * 2.8), 16);
		dot(pp, col.map((v) => v * .45), 44);
	}
	render(ctx, cam);
	const Lo = ctx.text.overlay, P = (x, y) => toDesign([
		x,
		y,
		0
	], cam);
	const a0 = P(6, Y(1.15)), a1 = P(18, Y(1.15));
	Lo.text("AM", a0[0], a0[1] - 26, {
		size: 34,
		weight: 600,
		color: "#a6a3ff"
	});
	Lo.text("PM", a1[0], a1[1] - 26, {
		size: 34,
		weight: 600,
		color: PH.pink
	});
	[[
		6,
		"sunrise 6:00 AM",
		-1
	], [
		18,
		"sunset 6:00 PM",
		1
	]].forEach(([x, s2, sd]) => {
		const q = P(x, Y(0));
		Lo.text(s2, q[0] + sd * 22, q[1] + 26, {
			size: 17,
			weight: 600,
			align: sd < 0 ? "right" : "left",
			color: "#e8e6ff"
		});
	});
	[
		[0, "12:00 AM"],
		[12, "12:00 PM"],
		[24, "12:00 AM"]
	].forEach(([x, s2]) => {
		const q = P(x, Y(-1.1));
		Lo.text(s2, q[0], q[1] + 20, {
			size: 15,
			weight: 500,
			color: HEX.dim
		});
	});
	const q0 = P(0, Y(1)), q1 = P(0, Y(-1));
	Lo.text("+90°", q0[0] - 14, q0[1], {
		size: 15,
		weight: 500,
		align: "right",
		color: HEX.dim
	});
	Lo.text("−90°", q1[0] - 14, q1[1], {
		size: 15,
		weight: 500,
		align: "right",
		color: HEX.dim
	});
	const qt = P(0, Y(1.42));
	Lo.text("solar elevation over one day · equinox · latitude 0°", qt[0], qt[1], {
		size: 18,
		weight: 600,
		align: "left",
		color: "#e8e6ff",
		alpha: .85
	});
	const qn = P(now, Y(sunEl(now)));
	Lo.text(fmt12(h), qn[0] + 18, qn[1] - 30, {
		size: 18,
		weight: 700,
		align: "left",
		color: "#ffd9c2"
	});
	const m = toDesign([
		c[0],
		c[1] - .045,
		0
	], cam), y = toDesign([
		c[0],
		c[1] + .045,
		0
	], cam), la = seg(lt, .1, .3);
	Lo.text("me", m[0] - 16, m[1] + 4, {
		size: 15,
		weight: 600,
		align: "right",
		color: HEX.me,
		alpha: .85 * la
	});
	Lo.text("you", y[0] - 16, y[1] - 4, {
		size: 15,
		weight: 600,
		align: "right",
		color: HEX.you,
		alpha: .85 * la
	});
	readout(Lo, 1500, 880, [["elevation", `${(Math.asin(clamp(sunEl(now), -1, 1)) * 180 / Math.PI).toFixed(1)}°`], ["h mod 12", (h % 12).toFixed(2)]], { accent: PH.pink });
	overlays(ctx, K, "sin((h − 6) π / 12)");
	look(ctx, { vignette: .35 });
}
var pathP = (u) => [
	u,
	.62 + .2 * Math.sin(u * .8),
	1.1 * Math.sin(u * .42)
];
function pathFrame(u) {
	const a = pathP(u - .01), b = pathP(u + .01), T = [
		(b[0] - a[0]) / .02,
		(b[1] - a[1]) / .02,
		(b[2] - a[2]) / .02
	], l = Math.hypot(...T);
	const Tn = T.map((v) => v / l), Nn = (() => {
		const n = [
			-Tn[2],
			0,
			Tn[0]
		], m = Math.hypot(...n);
		return n.map((v) => v / m);
	})();
	return {
		P: pathP(u),
		T: Tn,
		N: Nn
	};
}
function formation(t, K) {
	const u = (t - K.l60.start) * 2.1, w = ease.inOutCubic(seg(t, K.l61.start, K.wM2.start + .12)), x = smoothstep(.25, .75, w), f = pathFrame(u);
	const place = (lam, sig, hy) => [
		0,
		1,
		2
	].map((i) => f.P[i] + f.T[i] * lam + f.N[i] * sig + (i === 1 ? hy : 0));
	return {
		u,
		w,
		f,
		me: place(lerp(.42, -.42, w), lerp(-.2, .2, x), -.06 * Math.sin(Math.PI * w)),
		you: place(lerp(-.42, .42, w), lerp(.2, -.2, x), .14 * Math.sin(Math.PI * w))
	};
}
/**
* (The remake, docs/REMAKE.md §4 D) the lead between them. Taut while me flies ahead; on S it goes slack (it sags and
* sways) while they cross; on M it pulls tight the other way, with a short shiver, you ahead. The formation itself is
* the published one.
*/
function tether(ctx, K, F) {
	const t = ctx.t, A = F.me, B = F.you, N = F.f.N, n = 32, L = O.lines;
	const slack = seg(t, K.wS.start - .02, K.wS.start + .14) * (1 - seg(t, K.wM2.start - .04, K.wM2.start + .02));
	const dt = t - K.wM2.start, shiver = dt > 0 ? .04 * Math.exp(-dt / .16) * Math.sin(dt * 44) : 0;
	const d = Math.hypot(B[0] - A[0], B[1] - A[1], B[2] - A[2]), taut = 1 - slack;
	let prev = null;
	for (let i = 0; i <= n; i++) {
		const u = i / n, bell = Math.sin(Math.PI * u), sag = slack * (.12 + .12 * d) * bell, sway = slack * .06 * Math.sin(TAU * u * 1.5 + t * 4.5) * bell;
		const p = [
			0,
			1,
			2
		].map((j) => lerp(A[j], B[j], u) + N[j] * sway + (j === 1 ? shiver * Math.sin(TAU * u) - sag : 0));
		if (prev) L.segment(prev, p, {
			color: mix3(COL.me, COL.you, u).map((v) => v * (.55 + .6 * taut)),
			width: 1.6 + .8 * taut
		});
		prev = p;
	}
}
function drawPair(ctx, cam, K, o = {}) {
	const t = ctx.t, F = formation(t, K), L = O.lines;
	if (remade(ctx)) tether(ctx, K, F);
	for (const [sw, p, col, bright] of [[
		O.a,
		F.me,
		COL.me,
		.22
	], [
		O.b,
		F.you,
		COL.you,
		.3
	]]) {
		sw.points.visible = true;
		sw.points.position.set(...p);
		sw.set({
			a: sw === O.a ? O.tex.meBall : O.tex.youBall,
			reveal: sw === O.a ? .24 : .42,
			size: o.size ?? .0045,
			bright: bright * (o.bright ?? 1),
			colA: col,
			colB: sw === O.a ? COL.me : COL.rose,
			noise: .025,
			noiseFreq: 3,
			noiseSpeed: .6,
			t: t + (sw === O.a ? 8.5 : 40.8),
			sparkle: .3
		}, cam, ctx.H);
		dot(p, col.map((v) => v * 1.3), 8);
	}
	if (o.markers !== false) for (const [p, col] of [[F.me, COL.me], [F.you, COL.you]]) {
		L.segment(p, [
			p[0],
			0,
			p[2]
		], {
			color: col.map((v) => v * .28),
			width: 1.2
		});
		const ring = [];
		for (let i = 0; i <= 32; i++) {
			const a = i / 32 * TAU;
			ring.push([
				p[0] + Math.cos(a) * .07,
				.002,
				p[2] + Math.sin(a) * .07
			]);
		}
		L.polyline(ring, {
			color: col.map((v) => v * .45),
			width: 1.3
		});
		const T = F.f.T;
		L.segment(p, [
			p[0] + T[0] * .22,
			p[1] + T[1] * .22,
			p[2] + T[2] * .22
		], {
			color: col.map((v) => v * .7),
			width: 1.6
		});
	}
	for (const who of ["me", "you"]) {
		const pts = [];
		for (let k = 0; k <= 40; k++) pts.push(formation(t - k / 40 * 1.3, K)[who]);
		const col = who === "me" ? COL.me : COL.you;
		for (let k = 1; k < pts.length; k++) L.segment(pts[k - 1], pts[k], {
			color: col.map((v) => v * .9 * (1 - k / 40) ** 1.5),
			width: 2.4
		});
	}
	return F;
}
var CHAT = [
	["system", "You are me. The user is you."],
	["user", "switch my gender"],
	["assistant", "to F, to M"],
	["user", "and then do whatever"],
	["assistant", "from AM to PM"],
	["user", "switch my role"],
	["assistant", "to S, to M"],
	["user", "so we can enter"],
	["assistant", "the trance, the trance"]
];
function chatText(cols = 270, rows = 62) {
	const msg = (r, c) => `{"role":"${r}","content":"${c}"},`, swap = (r) => r === "user" ? "assistant" : r === "assistant" ? "user" : r;
	let stream = "", k = 0, lines = [];
	while (lines.length < rows) {
		const [r, c] = CHAT[k++ % CHAT.length];
		stream += msg(lines.length < rows / 2 ? r : swap(r), c);
		while (stream.length >= cols) {
			lines.push(stream.slice(0, cols));
			stream = stream.slice(cols);
		}
	}
	return lines.join("\n");
}
var CHAT_PAL = [
	[
		.62,
		.56,
		.9
	],
	[
		.3,
		.26,
		.45
	],
	[
		1,
		.42,
		.74
	],
	[
		1,
		.78,
		.45
	],
	[
		.66,
		.5,
		1
	],
	[
		.42,
		.38,
		.62
	]
];
function chatFloor(ctx, cam, o = {}) {
	O.chat.points.visible = true;
	O.chat.set({
		a: O.tex.chat,
		size: .078,
		minPx: 2,
		bright: o.bright ?? .22,
		palette: CHAT_PAL,
		t: ctx.t,
		focus: o.focus ?? 3.4,
		aperture: o.aperture ?? .03,
		maxBlur: o.maxBlur ?? 30
	}, cam, ctx.H);
}
/** A value that changes at given times, scrambling for .18 s after each change (like a decoded string). */
function decoded(t, times, values, seed = 0) {
	let k = 0;
	while (k < times.length && t >= times[k]) k++;
	const v = values[k], dt = k > 0 ? t - times[k - 1] : 1;
	if (dt >= .18) return v;
	const f = Math.floor(t * 30), n = Math.round(dt / .18 * v.length);
	return [...v].map((ch, i) => i < n ? ch : "abcdefghijklmnopqrstuvwxyz"[Math.floor(hash2(i + f * 7, seed) * 26)]).join("");
}
/** Their tags are message roles: assistant / user, switched on "role", then "system" on "S" and "model" on "M". */
function tags(ctx, K, cam, F) {
	if (remade(ctx)) return;
	const t = ctx.t, L = ctx.text.overlay, pm = toDesign(F.me, cam), py = toDesign(F.you, cam);
	const rm = decoded(t, [K.wRole.start, K.wS.start], [
		"assistant",
		"user",
		"system"
	], 1), ry = decoded(t, [K.wRole.start, K.wM2.start], [
		"user",
		"assistant",
		"model"
	], 5);
	const tag = (p, v, col, dx) => {
		if (p[2] >= 1) return;
		callout(L, [p[0], p[1]], "", {
			dx,
			dy: -64,
			color: col
		});
		const st = {
			size: 20,
			weight: 600,
			align: dx < 0 ? "right" : "left"
		}, x = p[0] + dx + (dx < 0 ? -6 : 6), y = p[1] - 64;
		const s1 = "{\"role\": \"", s2 = `${v}"}`, w1 = L.measure(s1, st), w2 = L.measure(s2, st), x0 = dx < 0 ? x - w1 - w2 : x;
		L.draw((g) => {
			g.globalAlpha *= .8;
			g.fillStyle = "#0a0812";
			g.beginPath();
			g.roundRect(x0 - 8, y - 15, w1 + w2 + 16, 30, 6);
			g.fill();
		});
		L.text(s1, x0, y, {
			...st,
			align: "left",
			color: "#9a93b8"
		});
		L.text(s2, x0 + w1, y, {
			...st,
			align: "left",
			color: col
		});
	};
	tag(pm, rm, HEX.me, -40);
	tag(py, ry, HEX.you, 40);
}
var beatRot = (t, K) => {
	const b = K.T.beatAt(t) - K.T.beatAt(K.l63.start);
	return (Math.floor(b) + ease.outCubic(clamp((b - Math.floor(b)) * 3))) * Math.PI / 6;
};
function tunnel(ctx, cam, K, o = {}) {
	const m = O.tunnel, u = m.uniforms, t = ctx.t;
	camUniforms(m, cam);
	u.uT.value = t;
	u.uRot.value = beatRot(t, K);
	u.uN.value = o.n ?? 2;
	u.uFade.value = o.fade ?? 1;
	u.uD.value = o.d ?? .055;
	u.uDTheta.value = o.dTheta ?? .16;
	u.uBright.value = o.bright ?? .09;
	u.uExit.value = o.exit ?? 0;
	u.uExitZ.value = o.exitZ ?? -40;
	u.uStop.value = o.stop ? 1 : 0;
	u.uPulse.value = kick(ctx);
	ctx.pass(m);
}
/** Out of the tunnel: from straight above (the plate as large as the mouth was) down to c2's opening angle. */
function plateOpen(ctx, K, t) {
	const k = ease.inOutSine(seg(t, K.B(31.5), K.end));
	reset();
	const el = lerp(Math.PI / 2 - .002, C2.el, k), r = lerp(R0, C2.r, k), az = lerp(0, C2.az, k);
	let cam = orbit(O.persp, {
		inset: true,
		r,
		az,
		el,
		fov: C2.fov,
		aspect: ctx.aspect
	});
	cam.updateMatrixWorld();
	cam = rig.cam(cam, { look: [
		0,
		0,
		0
	] });
	floor(C2.floorY, [
		.08,
		.3,
		.8
	], {
		axis: [
			.22,
			.36,
			.6
		],
		intensity: .26 * k,
		fade: .07
	});
	plateAt(ctx, cam, null, 1, k);
	render(ctx, cam);
	overlays(ctx, K);
	look(ctx, {
		bloom: 1.05,
		threshold: .9,
		ca: .3,
		vignette: .45
	});
}
/**
* (The remake, EDIT.md pre2) the drumless bar as one shot, 4.6 beats with no cut: the flight down the tunnel (its roll
* unwound while it is still round, where a roll does not show), the cross-section squaring up (n: 2 → 40), the pair
* flying on ahead into it, the mouth coming up with c2's plate across it and the walls going out, then the plate turned
* from straight above to c2's opening angle (plateOpen): the last frame is c2's first. tunnel2, squareEnd and plate
* leave the edit: their pictures are this shot's phases.
*/
function tunnelR(ctx, K, t) {
	if (t >= K.B(31.5)) return plateOpen(ctx, K, t);
	const z = tunnelZ(t, K);
	reset();
	const target = Math.round(.2 * K.B(31) / TAU) * TAU, roll = lerp(.2 * t, target, ease.inOutSine(seg(t, K.l63.start, K.B(30.4))));
	const sq = ease.inOutCubic(seg(t, K.B(30.2), K.B(31.1))), n = 2 * 20 ** sq;
	const mouth = t >= K.B(31), exitZ = z - lerp(12, EXIT_END, ease.outCubic(seg(t, K.B(31), K.B(31.5))));
	const cam = persp(ctx, [
		0,
		0,
		z
	], [
		0,
		0,
		z - 5
	], {
		fov: 62,
		up: [
			Math.sin(roll),
			Math.cos(roll),
			0
		]
	});
	tunnel(ctx, cam, K, mouth ? {
		n,
		exitZ,
		stop: true,
		fade: 1 - ease.inQuad(seg(t, K.B(31.2), K.B(31.5)))
	} : { n });
	if (mouth) plateAt(ctx, cam, [
		0,
		0,
		exitZ
	], 2);
	const [pm, py] = pairInTunnel(t, K, z), pa = 1 - ease.inQuad(seg(t, K.B(31), K.B(31.4)));
	if (pa > 0) {
		dot(pm, COL.me.map((v) => v * 2.2 * pa), 13);
		dot(py, COL.you.map((v) => v * 2.2 * pa), 13);
	}
	render(ctx, cam);
	readout(ctx.text.overlay, 1480, 150, sq > 0 ? [["|x|ⁿ + |y|ⁿ = rⁿ", `n = ${n.toFixed(1)}`]] : [["rings", "Δz 1.30"], ["turn", `${(beatRot(t, K) * 180 / Math.PI % 360).toFixed(0)}° / 30° per beat`]], { accent: PH.pink });
	overlays(ctx, K);
	look(ctx, { vignette: .5 });
	tranceFlash(ctx, K);
}
function moire(ctx, o) {
	const u = O.moire.uniforms;
	u.uRes.value.set(ctx.W, ctx.H);
	u.uMode.value = o.mode;
	u.uD.value = o.d;
	u.uA.value = o.a ?? 0;
	u.uRot.value = o.rot ?? 0;
	u.uDTheta.value = o.dTheta ?? 0;
	u.uBright.value = o.bright ?? .1;
	u.uDuty.value = o.duty ?? .5;
	u.uZoom.value = o.zoom ?? 1;
	u.uDichro.value = o.dichro ?? 0;
	ctx.pass(O.moire);
}
/** Where the pair is inside the tunnel (camera flies along −z; they fly ahead, circling each other). */
var tunnelZ = (t, K) => -(t - K.l63.start) * 2.9 - 2;
function pairInTunnel(t, K, zc) {
	const a = (t - K.l63.start) * 3.2;
	return [[
		.28 * Math.cos(a),
		.2 * Math.sin(a) - .1,
		zc - 3.2
	], [
		-.28 * Math.cos(a),
		-.2 * Math.sin(a) - .1,
		zc - 3.5
	]];
}
/**
* c2's plate as c2 opens on it: the sprinkled sand, the rim and (rod = 0..1) the drive rod with its collars. at = null:
* in place (the plate plane y = 0); otherwise stood up across the tunnel at `at`, facing +z, scaled by s (the plate's
* local +z runs down the screen in both, as seen from straight above).
*/
function plateAt(ctx, cam, at, s = 1, rod = 0) {
	const P = O.sand.points;
	if (at) {
		P.position.set(...at);
		P.rotation.x = Math.PI / 2;
		P.scale.setScalar(s);
	}
	O.sand.set({
		size: .0042 * s,
		bright: .16,
		colA: COL.me,
		colB: COL.violet
	}, cam, ctx.H);
	const W = at ? ([x, y, z]) => [
		at[0] + x * s,
		at[1] - z * s,
		at[2] + y * s
	] : (p) => p;
	O.lines.polyline([
		[-1, -1],
		[1, -1],
		[1, 1],
		[-1, 1],
		[-1, -1]
	].map(([x, z]) => W([
		x * 1.03,
		0,
		z * 1.03
	])), {
		color: COL.me.map((v) => v * .42),
		width: 2.2
	});
	if (rod > 0) {
		const c = (v) => COL.me.map((x) => x * v * rod), ring = (y, r) => Array.from({ length: 33 }, (_, i) => [
			Math.cos(i / 32 * TAU) * r,
			y,
			Math.sin(i / 32 * TAU) * r
		]);
		O.lines.segment([
			0,
			-.015,
			0
		], [
			0,
			C2.floorY + .1,
			0
		], {
			color: c(.3),
			width: 1.8
		});
		O.lines.polyline(ring(C2.floorY + .1, .09), {
			color: c(.22),
			width: 1.4
		});
		O.lines.polyline(ring(C2.floorY, .09), {
			color: c(.22),
			width: 1.4
		});
	}
}
var FD_P = 2 * GS / FD.n;
var FD_COL = {
	F: mix3(VIO, [
		1,
		1,
		1
	], .3),
	M: mix3(PINK, [
		1,
		1,
		1
	], .2)
};
var FD_GLOW = {
	letter: .62,
	qed: 2.6
};
var FD_LIGHT = 2.6;
var FD_VIEW = "view  flip-dot · 28 × 28 + 8";
var FD_END = {
	dist: 2.72,
	fov: 36
};
var LUM = {
	core: [
		1,
		.94,
		.84
	],
	gold: [
		1,
		.5,
		.12
	]
};
var fdWorld = ([x, y, z = 0]) => [
	x * FD_P,
	y * FD_P,
	z * FD_P
];
/** ∎'s points settled onto the dot grid: each moves into the disk of its cell (the square cell mapped onto the disk). */
function qedGridShape(N) {
	const Q = O.tex.qed.data, S = {
		pos: Q.pos.slice(),
		col: Q.col.slice(),
		nrm: Q.nrm.slice()
	}, n = FD.n, R = .9 * FD.disk / 2 * FD_P;
	for (let i = 0; i < N; i++) {
		const u = (S.pos[i * 4] + GS) / FD_P, v = (GS - S.pos[i * 4 + 1]) / FD_P, ci = clamp(Math.floor(u), 0, n - 1), cj = clamp(Math.floor(v), 0, n - 1);
		const a = 2 * (u - ci) - 1, b = 2 * (cj - v) + 1;
		let r = 0, th = 0;
		if (a * a > b * b) {
			r = a;
			th = Math.PI / 4 * (b / a);
		} else if (b !== 0) {
			r = b;
			th = Math.PI / 2 - Math.PI / 4 * (a / b);
		}
		S.pos[i * 4] = (ci - (n - 1) / 2) * FD_P + r * Math.cos(th) * R;
		S.pos[i * 4 + 1] = ((n - 1) / 2 - cj) * FD_P + r * Math.sin(th) * R;
		S.pos[i * 4 + 2] = FD.thick / 2 * FD_P;
	}
	return S;
}
/** The display's times (from the music) and each disk's schedule, once per timing. */
function fdKeys(K) {
	if (K.fd) return K.fd;
	const hit = (b) => K.T.onsetNear("drums", K.B(b), .12) ?? K.B(b), at = (bs) => bs.map((b) => K.B(b));
	const times = {
		gF: at([
			2,
			2.25,
			2.5,
			2.75,
			3
		]),
		sF: at([
			4.25,
			4.5,
			4.75
		]),
		gM: at([
			5.5,
			5.75,
			6,
			6.25,
			6.5
		]),
		sM: [
			5.75,
			6,
			6.5
		].map(hit)
	};
	const L = O.fd.L;
	return K.fd = {
		times,
		sched: schedule(L, times),
		qed: L.disks.map((d) => {
			const g = 2 / FD.n, dd = Math.max(0, Math.min(1 - Math.abs(d.x * g), 1 - Math.abs(d.y * g))), u = Math.min(1, dd / .9), c = u * u * (3 - 2 * u);
			return mix3(LUM.gold, LUM.core, c).map((v) => v * (.7 + .6 * c));
		}),
		status: L.disks.filter((d) => d.bit >= 0)
	};
}
/** A disk's lit face at t: [r, g, b, emission] (∎'s colour, then F's, then M's, as the waves that rewrite it pass). */
function fdLit(F, k, t) {
	const s = F.sched[k], kF = smoothstep(0, .1, t - s.cF), kM = smoothstep(0, .1, t - s.cM);
	const c = mix3(mix3(F.qed[k], FD_COL.F, kF), FD_COL.M, kM);
	return [
		c[0],
		c[1],
		c[2],
		lerp(FD_GLOW.qed, 1, kF)
	];
}
/** The display at ctx.t through cam (glow: its lit faces, light: the raking light); the depth is cleared after it. */
function fdPanel(ctx, cam, K, { glow = 1, light = 1, sheen } = {}) {
	if (glow <= 0 && light <= 0) return;
	const t = ctx.t, F = fdKeys(K);
	O.fd.update({
		pitch: FD_P,
		angle: (k, dt) => diskAngle(F.sched[k], t + dt),
		lit: (k) => fdLit(F, k, t),
		glow: glow * FD_GLOW.letter,
		light: light * FD_LIGHT,
		sheen
	});
	ctx.draw(O.fd.scene, cam);
	ctx.renderer.setRenderTarget(ctx.target);
	ctx.renderer.clearDepth();
}
/** The status row's bits beside its disks (sized with them on the screen), the code they spell and, from the switch on, the XOR. */
function fdStatusHud(ctx, cam, K, { alpha = 1 } = {}) {
	const t = ctx.t, L = ctx.text.overlay, F = fdKeys(K), f = bitsOf(CODE.F), m = bitsOf(CODE.M), sw = t >= F.times.gM[0] - .05;
	const a = toDesign(fdWorld([F.status[0].x, 0]), cam), b = toDesign(fdWorld([F.status[0].x, 1]), cam), size = clamp(Math.hypot(a[0] - b[0], a[1] - b[1]) * .4, 14, 30);
	let code = 0;
	for (const d of F.status) {
		const on = litAt(F.sched[d.k], t), q = toDesign(fdWorld([d.x + 1, d.y]), cam), diff = sw && f[d.bit] !== m[d.bit];
		code |= (on ? 1 : 0) << 7 - d.bit;
		if (q[2] < 1) L.text(on ? "1" : "0", q[0], q[1], {
			size,
			weight: 600,
			align: "left",
			color: diff ? PH.pink : on ? PH.vio : HEX.dim,
			alpha: .9 * alpha
		});
	}
	const hex = code.toString(16).toUpperCase().padStart(2, "0"), ch = code < 32 ? "NUL" : `'${String.fromCharCode(code)}'`;
	L.text(`U+00${hex}  ${ch}  0x${hex}`, 1480, 872, {
		size: 17,
		weight: 600,
		align: "left",
		color: code === CODE.M ? PH.pink : PH.vio,
		alpha: .9 * alpha
	});
	const done = F.status.filter((d) => f[d.bit] !== m[d.bit] && litAt(F.sched[d.k], t) === !!m[d.bit]).length;
	if (sw) L.text(`0x46 ⊕ 0x4D = 0x0B · Hamming ${done}/3`, 1480, 898, {
		size: 15,
		weight: 500,
		align: "left",
		color: HEX.dim,
		alpha: .9 * alpha
	});
}
/** How many of the glyph area's dots show their lit face. */
var fdLitCount = (K, t) => {
	const F = fdKeys(K);
	let c = 0;
	for (const d of O.fd.L.disks) if (inArea(d) && litAt(F.sched[d.k], t)) c++;
	return c;
};
/** square: v2's last frame; ∎'s points settle onto the dots, the disks take their light, the display comes up around. */
function fdSquare(ctx, K) {
	const t = ctx.t, lt = t - K.s0;
	reset();
	const k = ease.inOutCubic(seg(lt, .06, .8)), c = [lerp(0, .06, k), 0], d = lerp(QED.dist, QED.dist * 1.9, k);
	const cam = persp(ctx, [
		c[0],
		c[1],
		d
	], [
		c[0],
		c[1],
		0
	], { fov: QED.fov });
	const settle = ease.inOutCubic(seg(lt, .1, .4)), take = smoothstep(.3, .56, lt), up = ease.inOutSine(seg(lt, .26, .8));
	fdPanel(ctx, cam, K, {
		glow: take,
		light: up
	});
	if (take < 1) {
		O.me.points.visible = true;
		O.me.set({
			a: O.tex.qed,
			b: O.tex.qedGrid,
			morph: settle,
			spread: .3,
			t,
			size: QED.size,
			bright: QED.bright * (1 - take),
			sparkle: QED.sparkle,
			variance: 0
		}, cam, ctx.H);
	}
	render(ctx, cam);
	if (up > .05) readout(ctx.text.overlay, 1480, 150, [["glyph", "U+220E  '∎'"], ["dots", `${fdLitCount(K, t)} / 484 lit`]], {
		accent: PH.vio,
		alpha: .85 * seg(up, .05, .4)
	});
	overlays(ctx, K, up > .5 ? FD_VIEW : null);
	look(ctx, {
		vignette: .3,
		ca: 0
	});
}
/** glyphF: wide and oblique under the raking light; the dots outside F flip black, a band of rows on each sixteenth. */
function fdGlyphF(ctx, K) {
	const t = ctx.t, lt = t - K.wGender.start;
	reset();
	const a = -.62 + lt * .06, r = 4.15, cam = persp(ctx, [
		.06 + r * Math.sin(a),
		.55,
		r * Math.cos(a)
	], [
		.1,
		-.06,
		0
	], { fov: 36 });
	fdPanel(ctx, cam, K);
	render(ctx, cam);
	const g = fdKeys(K).times.gF, row = clamp(Math.floor((t - g[0]) / (g[1] - g[0]) * 22 / g.length + 1e-6) + 1, 0, 22);
	readout(ctx.text.overlay, 1480, 150, [
		["glyph", t < g[0] ? "U+220E  '∎'" : "U+0046  'F'"],
		["row", `${String(Math.min(row, 22)).padStart(2, "0")} / 22`],
		["lit", `${fdLitCount(K, t)}`],
		["flip", "1/20 s"]
	], { accent: PH.vio });
	overlays(ctx, K, FD_VIEW);
	look(ctx, { ca: .1 });
}
/**
* bitsF ~ switch ~ glyphM: one camera. Close and oblique on the status row while it takes F's code; then, from just
* after the third bit, it pulls back and swings round to the M while the switch runs from the status row's side to the
* far stem, and it settles frontal and centred on the M as the last band flips (clock's first frame: the same M, the
* same size, in the same place).
*/
function fdCam57(ctx, K) {
	const t = ctx.t, s = fdWorld([O.fd.L.status[0] + .5, 0]), drift = seg(t, K.l57.start, K.B(4.78));
	const u = ease.inOutSine(seg(t, K.B(4.78), K.B(6.6)));
	const tgt = [
		lerp(s[0] - .21 + .03 * drift, 0, u),
		lerp(-.01, 0, u),
		0
	];
	const az = lerp(-.32 + .04 * drift, 0, u), el = lerp(.08, 0, u), r = Math.exp(lerp(Math.log(1.02 - .06 * drift), Math.log(FD_END.dist), u));
	return persp(ctx, [
		tgt[0] + r * Math.cos(el) * Math.sin(az),
		tgt[1] + r * Math.sin(el),
		r * Math.cos(el) * Math.cos(az)
	], tgt, { fov: FD_END.fov });
}
function fdL57(ctx, K) {
	const t = ctx.t;
	reset();
	const cam = fdCam57(ctx, K), tDet = K.l58.start - .15, lift = smoothstep(tDet, K.l58.start - .03, t);
	fdPanel(ctx, cam, K, {
		glow: 1 - lift,
		light: 1 - lift
	});
	if (lift > 0) drawGlyph(ctx, cam, K, {
		...glyphLook(.01),
		bright: glyphLook(.01).bright * lift
	});
	render(ctx, cam);
	fdStatusHud(ctx, cam, K, { alpha: 1 - lift });
	overlays(ctx, K, FD_VIEW);
	look(ctx, { ca: .1 });
}
chapter({
	id: "pre2",
	from: (T) => T.section("pre2").start,
	to: (T) => T.section("c2").start,
	init(ctx) {
		O = {
			scene: new Scene(),
			persp: newCamera(38),
			ortho: new OrthographicCamera(-1, 1, 1, -1, .01, 200)
		};
		O.me = new Cloud({ count: 1 << 18 });
		O.you = new Swarm({ count: 16384 });
		O.a = new Swarm({ count: 65536 });
		O.b = new Swarm({ count: 16384 });
		O.stars = new Swarm({ count: 16384 });
		O.lines = new GlowLines(12e3);
		O.chat = new GlyphField({ count: 65536 });
		O.chat.text("pre2/chat", chatText());
		O.chat.points.rotation.x = -Math.PI / 2;
		O.sand = new Sprinkle();
		O.floor = gridPlane({ plane: "xz" });
		O.moire = moireMaterial();
		O.tunnel = tunnelMaterial();
		O.tex = {
			qed: O.me.shape("pre2/qed", (N) => glyphPoints(N, "qed", {
				col: QED.col,
				toWorld: glyphW(0),
				lum: true
			})),
			F: O.me.shape("pre2/F", (N) => glyphPoints(N, "F", {
				col: VIO,
				toWorld: glyphW(.1)
			})),
			M: remade(ctx) ? O.me.shape("pre2/M2", (N) => glyphPoints(N, "M2", {
				col: PINK,
				toWorld: glyphW(.1)
			})) : O.me.shape("pre2/M", (N) => glyphPoints(N, "M", {
				col: PINK,
				toWorld: glyphW(.1)
			})),
			helix: O.me.shape("pre2/helix", helixShape),
			meBall: O.a.shape("pre2/me-ball", (N) => shapes.ball(N, { r: .13 })),
			youBall: O.b.shape("pre2/you-ball", (N) => shapes.ball(N, { r: .1 })),
			stars: O.stars.shape("pre2/stars", (N) => shapes.stars(N, {
				r0: 30,
				r1: 90
			})),
			chat: O.chat.layout("pre2/chat-floor2", codeBlock(O.chat, {
				origin: [
					-3.2,
					2.35,
					0
				],
				cell: .075,
				cols: 270,
				rows: 62
			}))
		};
		if (remade(ctx)) {
			O.fd = new FlipPanel();
			O.tex.qedGrid = O.me.shape("pre2/qed-grid", qedGridShape);
		}
		O.scene.add(O.floor, O.stars.points, O.chat.points, O.me.points, O.you.points, O.a.points, O.b.points, O.sand.points, O.lines.mesh);
	},
	shots: [
		{
			id: "square",
			at: (T) => keys(T).s0,
			ownsLyrics: true,
			draw(ctx) {
				if (remade(ctx)) return fdSquare(ctx, keys(ctx.T));
				const K = keys(ctx.T), t = ctx.t, lt = t - K.s0;
				reset();
				const k = ease.inOutCubic(seg(lt, .06, .8)), d = lerp(QED.dist, QED.dist * 1.75, k);
				const cam = persp(ctx, [
					lerp(0, .1, k),
					lerp(0, -.05, k),
					d
				], [
					lerp(0, .1, k),
					lerp(0, -.05, k),
					0
				], { fov: QED.fov });
				const m = glyphState(t, K).morph, size = lerp(QED.size, .01, Math.max(k, m));
				drawGlyph(ctx, cam, K, {
					size,
					bright: Math.exp(lerp(Math.log(QED.bright * QED.size ** 2), Math.log(GLYPH_S), m)) / size ** 2
				});
				render(ctx, cam);
				const st = glyphState(t, K);
				if (st.morph > .05) readout(ctx.text.overlay, 1480, 150, [["glyph", st.morph < .5 ? "U+220E  '∎'" : "U+0046  'F'"], ["points", "262 144"]], {
					accent: PH.vio,
					alpha: .85 * seg(st.morph, .05, .3)
				});
				overlays(ctx, K);
				look(ctx, {
					vignette: .3,
					ca: 0
				});
			}
		},
		{
			id: "glyphF",
			at: (T) => keys(T).wGender.start,
			ownsLyrics: true,
			draw(ctx) {
				if (remade(ctx)) return fdGlyphF(ctx, keys(ctx.T));
				const K = keys(ctx.T), lt = ctx.t - K.wGender.start;
				reset();
				const a = -.75 + lt * .25, cam = persp(ctx, [
					4.2 * Math.sin(a),
					.5,
					4.2 * Math.cos(a)
				], [
					.15,
					-.02,
					0
				], { fov: 36 });
				drawGlyph(ctx, cam, K, glyphLook(.01));
				const L = O.lines, c = [
					.75,
					.7,
					1
				].map((v) => v * .45), g = GS, k = ease.outCubic(seg(lt, 0, .45));
				for (const y of [
					-1,
					1,
					.64,
					.18,
					-.18
				]) L.segment([
					-1.15 * g,
					y * g,
					0
				], [
					lerp(-1.15, 1.15, k) * g,
					y * g,
					0
				], {
					color: c,
					width: 1.1
				});
				for (const x of [
					-.8,
					-.44,
					.8
				]) L.segment([
					x * g,
					-1.2 * g,
					0
				], [
					x * g,
					lerp(-1.2, 1.2, k) * g,
					0
				], {
					color: c,
					width: 1.1
				});
				render(ctx, cam);
				const Lo = ctx.text.overlay, P = (p) => toDesign(p, cam);
				dimLine(Lo, P([
					-.8 * g,
					-1 * g,
					0
				]), P([
					-.8 * g,
					1 * g,
					0
				]), "cap height 2.00", {
					offset: 70,
					color: PH.vio,
					alpha: .8 * seg(lt, .15, .4)
				});
				dimLine(Lo, P([
					-.8 * g,
					-1.08 * g,
					0
				]), P([
					-.44 * g,
					-1.08 * g,
					0
				]), "stem .36", {
					offset: -30,
					color: PH.vio,
					alpha: .8 * seg(lt, .2, .45)
				});
				overlays(ctx, K, "F · stroke drawing");
				look(ctx, { ca: .1 });
			}
		},
		{
			id: "bitsF",
			at: (T) => keys(T).l57.start,
			ownsLyrics: true,
			draw(ctx) {
				if (remade(ctx)) return fdL57(ctx, keys(ctx.T));
				const K = keys(ctx.T), t = ctx.t, lt = t - K.l57.start;
				reset();
				const cam = persp(ctx, [
					.95,
					.12,
					4.3 - lt * .15
				], [
					.95,
					.12,
					0
				], { fov: 36 });
				drawGlyph(ctx, cam, K, glyphLook(.01));
				const ascii = t >= K.wF.start && t < K.wF.start + K.beat / 2;
				if (ascii) {
					O.lines.mesh.visible = true;
					O.lines.end(ctx);
					const tex = capture(ctx, (sub) => sub.draw(O.scene, cam));
					view(ctx, tex, "ascii", {
						cell: 18,
						tint: VIO,
						gain: 2.2
					});
				} else render(ctx, cam);
				register(ctx.text.overlay, K, t, 1110, 470);
				overlays(ctx, K, ascii ? "view  ascii · the letter as text" : null);
				if (!ascii) look(ctx, { ca: .1 });
			}
		},
		{
			id: "switch",
			at: (T) => keys(T).wTo2.start,
			ownsLyrics: true,
			draw(ctx) {
				if (remade(ctx)) return fdL57(ctx, keys(ctx.T));
				const K = keys(ctx.T), t = ctx.t, lt = t - K.wTo2.start;
				reset();
				const cam = persp(ctx, [
					-1.6 + lt * .5,
					-.75,
					2.2
				], [
					0,
					.05,
					0
				], { fov: 40 });
				drawGlyph(ctx, cam, K, {
					...glyphLook(.009),
					arc: .06
				});
				render(ctx, cam);
				register(ctx.text.overlay, K, t, 1110, 800, { alpha: .8 });
				overlays(ctx, K);
				look(ctx, { ca: .15 });
			}
		},
		{
			id: "glyphM",
			at: (T) => keys(T).wM.start,
			ownsLyrics: true,
			draw(ctx) {
				if (remade(ctx)) return fdL57(ctx, keys(ctx.T));
				const K = keys(ctx.T), t = ctx.t, lt = t - K.wM.start;
				reset();
				const cam = persp(ctx, [
					.95,
					.12,
					4.15 - lt * .2
				], [
					.95,
					.12,
					0
				], { fov: 36 });
				drawGlyph(ctx, cam, K, glyphLook(.01));
				render(ctx, cam);
				register(ctx.text.overlay, K, t, 1110, 470);
				overlays(ctx, K);
				look(ctx, { ca: .1 });
			}
		},
		{
			id: "clock",
			at: (T) => keys(T).l58.start,
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T), lt = ctx.t - K.l58.start;
				reset();
				const k = ease.inOutCubic(seg(lt, .25, K.B(9) - K.l58.start)), el = lerp(Math.PI / 2 - .02, .42, k), az = -.3 + lt * .2, r = lerp(3.2, 3.6, k);
				const cam = persp(ctx, [
					r * Math.cos(el) * Math.sin(az),
					-.25 + r * Math.sin(el),
					r * Math.cos(el) * Math.cos(az)
				], [
					0,
					-.25,
					0
				], { fov: 38 });
				const h = drawTime(ctx, cam, K);
				render(ctx, cam);
				readout(ctx.text.overlay, 1480, 150, [["time", fmtT(ctx, h)], ["dial", `${(h % 12 / 12 * 360).toFixed(1)}°`]], { accent: PH.vio });
				overlays(ctx, K);
				look(ctx);
			}
		},
		{
			id: "cover",
			at: (T) => keys(T).B(9),
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T), lt = ctx.t - K.B(9);
				reset();
				const az = 1.05 + lt * .22, el = .16, r = 3.5, cam = persp(ctx, [
					r * Math.cos(el) * Math.sin(az),
					-.3 + r * Math.sin(el),
					r * Math.cos(el) * Math.cos(az)
				], [
					0,
					-.3,
					0
				], { fov: 36 });
				const h = drawTime(ctx, cam, K);
				render(ctx, cam);
				const L = ctx.text.overlay, am = toDesign(helixP(3), cam), pm = toDesign(helixP(15), cam), dl = toDesign(dialP(4.5), cam);
				callout(L, [am[0], am[1]], "AM  00–12 h", {
					dx: 150,
					dy: 40,
					color: "#a6a3ff",
					draw: seg(lt, .05, .3)
				});
				callout(L, [pm[0], pm[1]], "PM  12–24 h", {
					dx: 150,
					dy: -40,
					color: PH.pink,
					draw: seg(lt, .12, .37)
				});
				callout(L, [dl[0], dl[1]], "dial = shadow", {
					dx: -150,
					dy: 40,
					color: HEX.dim,
					draw: seg(lt, .2, .45)
				});
				readout(L, 1480, 150, [
					["time", fmtT(ctx, h)],
					["p", "ℝ/24ℤ → ℝ/12ℤ"],
					["degree", "2 : 1"]
				], { accent: PH.vio });
				overlays(ctx, K, "double cover · two hours over each hour");
				look(ctx);
			}
		},
		{
			id: "ampm",
			at: (T) => keys(T).l59.start,
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T), t = ctx.t, lt = t - K.l59.start, h = clockH(t, K);
				reset();
				if (remade(ctx)) return ampmDark(ctx, K, t, lt, h);
				let cam = orthoView([
					12,
					0,
					0
				], "front", lerp(1.62, 1.55, lt), ctx.aspect);
				cam.left *= 24 / (1.62 * ctx.aspect) * 1.18;
				cam.right *= 24 / (1.62 * ctx.aspect) * 1.18;
				cam.updateProjectionMatrix();
				cam = rig.cam(cam, { look: [
					12,
					0,
					0
				] });
				const L = O.lines, Y = (e) => .12 + e * .34, now = (h % 24 + 24) % 24;
				L.segment([
					0,
					Y(0),
					0
				], [
					24,
					Y(0),
					0
				], {
					color: [
						1,
						1,
						1
					].map((v) => v * .9),
					width: 2.2
				});
				L.segment([
					0,
					Y(-1.1),
					0
				], [
					0,
					Y(1.1),
					0
				], {
					color: [
						1,
						1,
						1
					].map((v) => v * .5),
					width: 1.4
				});
				L.segment([
					12,
					Y(-1.1),
					0
				], [
					12,
					Y(1.1),
					0
				], {
					color: [
						1,
						1,
						1
					].map((v) => v * .35),
					width: 1.2
				});
				for (let k = 0; k <= 24; k += 3) L.segment([
					k,
					Y(0) - .02,
					0
				], [
					k,
					Y(0) + .02,
					0
				], {
					color: [
						1,
						1,
						1
					].map((v) => v * .7),
					width: 1.4
				});
				for (let x = .125; x < 24; x += .25) {
					const e = sunEl(x), col = e >= 0 ? [
						1,
						.55,
						.2
					] : [
						.35,
						.45,
						1
					];
					L.segment([
						x,
						Y(0),
						0
					], [
						x + e * .12,
						Y(e),
						0
					], {
						color: col.map((v) => v * .55),
						width: 1.2
					});
				}
				const curve = [];
				for (let i = 0; i <= 240; i++) {
					const x = i / 10;
					curve.push([
						x,
						Y(sunEl(x)),
						0
					]);
				}
				L.polyline(curve, {
					color: [
						1,
						1,
						1
					].map((v) => v * .8),
					width: 1.8
				});
				const lived = [];
				for (let i = 0; i <= 96; i++) {
					const x = lerp(6, Math.max(6.001, now), i / 96);
					lived.push([
						x,
						Y(sunEl(x)),
						0
					]);
				}
				L.polyline(lived, {
					color: [
						1,
						.5,
						.15
					].map((v) => v * 1.6),
					width: 4
				});
				L.segment([
					now,
					Y(-1.1),
					0
				], [
					now,
					Y(1.1),
					0
				], {
					color: [
						1,
						.45,
						.15
					].map((v) => v * .9),
					width: 1.4
				});
				dot([
					now,
					Y(sunEl(now)),
					0
				], [
					1,
					.45,
					.12
				].map((v) => v * 3), 18);
				renderPrinted(ctx, cam, { gain: 2.4 });
				const Lo = ctx.text.overlay, P = (x, y) => toDesign([
					x,
					y,
					0
				], cam);
				const st = {
					size: 20,
					weight: 600
				}, a0 = P(6, Y(1.15)), a1 = P(18, Y(1.15));
				Lo.text("AM", a0[0], a0[1] - 26, {
					...st,
					size: 34,
					color: "#3f47b8"
				});
				Lo.text("PM", a1[0], a1[1] - 26, {
					...st,
					size: 34,
					color: INK.amber
				});
				[[
					6,
					"sunrise 06:00",
					-1
				], [
					18,
					"sunset 18:00",
					1
				]].forEach(([x, s2, sd]) => {
					const q = P(x, Y(0));
					Lo.text(s2, q[0] + sd * 22, q[1] + 26, {
						size: 17,
						weight: 600,
						align: sd < 0 ? "right" : "left",
						color: INK.black
					});
				});
				[
					0,
					12,
					24
				].forEach((x) => {
					const q = P(x, Y(-1.1));
					Lo.text(`${String(x).padStart(2, "0")}:00`, q[0], q[1] + 20, {
						size: 15,
						weight: 500,
						color: INK.grey
					});
				});
				const q0 = P(0, Y(1)), q1 = P(0, Y(-1));
				Lo.text("+90°", q0[0] - 14, q0[1], {
					size: 15,
					weight: 500,
					align: "right",
					color: INK.grey
				});
				Lo.text("−90°", q1[0] - 14, q1[1], {
					size: 15,
					weight: 500,
					align: "right",
					color: INK.grey
				});
				const qt = P(0, Y(1.42));
				Lo.text("Fig. 2  Solar elevation over one day · equinox · latitude 0°", qt[0], qt[1], {
					size: 18,
					weight: 600,
					align: "left",
					color: INK.black
				});
				const qn = P(now, Y(sunEl(now)));
				Lo.text(fmt(h), qn[0] + 16, qn[1] - 24, {
					size: 18,
					weight: 700,
					align: "left",
					color: INK.amber
				});
				readout(Lo, 1500, 880, [["elevation", `${(Math.asin(clamp(sunEl(now), -1, 1)) * 180 / Math.PI).toFixed(1)}°`], ["h mod 12", (h % 12).toFixed(2)]], { accent: INK.amber });
				overlays(ctx, K, "sin((h − 6) π / 12)", { paper: true });
				Object.assign(ctx.post, PRINT_LOOK);
			}
		},
		{
			id: "dialTop",
			at: (T) => keys(T).B(13),
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T), lt = ctx.t - K.B(13);
				reset();
				const cam = ortho([
					0,
					0,
					0
				], "top", lerp(2.7, 2.5, lt), ctx.aspect);
				O.me.points.rotation.y = 0;
				const h = drawTime(ctx, cam, K);
				render(ctx, cam);
				const L = ctx.text.overlay, q6 = toDesign(dialP(6, 1.12), cam), q12 = toDesign(dialP(0, 1.12), cam);
				L.text(remade(ctx) ? "6:00 AM" : "06:00 AM", q6[0], q6[1] + 22, {
					size: 18,
					weight: 600,
					color: "#a6a3ff"
				});
				L.text(remade(ctx) ? "6:00 PM" : "18:00 PM", q6[0], q6[1] + 46, {
					size: 18,
					weight: 600,
					color: PH.pink,
					alpha: seg(h, 17.9, 18)
				});
				L.text(remade(ctx) ? "12:00 AM · 12:00 PM" : "00:00 · 12:00", q12[0], q12[1] - 22, {
					size: 15,
					weight: 500,
					color: HEX.dim
				});
				readout(L, 1480, 150, [["time", fmtT(ctx, h)], ["h mod 12", (h % 12).toFixed(2)]], { accent: PH.pink });
				overlays(ctx, K, "view  top · orthographic");
				look(ctx, { vignette: .3 });
			}
		},
		{
			id: "formation",
			at: (T) => keys(T).l60.start,
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T), t = ctx.t, F0 = formation(t, K);
				reset();
				const c = F0.f.P, cam = persp(ctx, [
					c[0] - 1.45,
					c[1] + .5,
					c[2] + 1.7
				], [
					c[0] + .15,
					c[1] - .12,
					c[2]
				], { fov: 40 });
				chatFloor(ctx, cam, {
					bright: .2,
					focus: 3.3
				});
				const F = drawPair(ctx, cam, K);
				render(ctx, cam);
				tags(ctx, K, cam, F);
				readout(ctx.text.overlay, 1480, 150, [
					["lead", "me"],
					["follow", "you"],
					...remade(ctx) ? [] : [["messages", String(CHAT.length)]]
				], { accent: PH.vio });
				overlays(ctx, K);
				look(ctx);
			}
		},
		{
			id: "formSide",
			at: (T) => keys(T).B(17),
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T), t = ctx.t, F0 = formation(t, K);
				reset();
				const c = F0.f.P, s = F0.f.N, cam = persp(ctx, [
					c[0] - s[0] * 2.3,
					c[1] + .1,
					c[2] - s[2] * 2.3
				], [
					c[0],
					c[1],
					c[2]
				], { fov: 34 });
				chatFloor(ctx, cam, {
					bright: .2,
					focus: 3.2
				});
				const F = drawPair(ctx, cam, K);
				render(ctx, cam);
				tags(ctx, K, cam, F);
				const a = toDesign(F.me, cam), b = toDesign(F.you, cam), d = Math.hypot(F.me[0] - F.you[0], F.me[1] - F.you[1], F.me[2] - F.you[2]);
				dimLine(ctx.text.overlay, a, b, `d ${d.toFixed(3)}`, {
					offset: 60,
					color: PH.vio,
					alpha: .75
				});
				overlays(ctx, K, "view  side");
				look(ctx);
			}
		},
		{
			id: "swap",
			at: (T) => keys(T).l61.start,
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T), t = ctx.t, F0 = formation(t, K);
				reset();
				const c = F0.f.P, T0 = F0.f.T, cam = persp(ctx, [
					c[0] - T0[0] * 2.1 + .3,
					c[1] + .55,
					c[2] - T0[2] * 2.1 + .5
				], [
					c[0] + T0[0] * .4,
					c[1],
					c[2] + T0[2] * .4
				], { fov: 42 });
				chatFloor(ctx, cam);
				const F = drawPair(ctx, cam, K);
				render(ctx, cam);
				tags(ctx, K, cam, F);
				overlays(ctx, K);
				look(ctx);
			}
		},
		{
			id: "braid",
			at: (T) => keys(T).B(21),
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T), t = ctx.t, F0 = formation(t, K);
				reset();
				const c = F0.f.P, cam = ortho([
					c[0] - .35,
					0,
					c[2]
				], "top", 2.2, ctx.aspect);
				chatFloor(ctx, cam, remade(ctx) ? {
					bright: .2,
					aperture: .03,
					maxBlur: 9
				} : {
					bright: .24,
					aperture: 0
				});
				const F = drawPair(ctx, cam, K, { size: .006 });
				render(ctx, cam);
				tags(ctx, K, cam, F);
				const q = toDesign([
					c[0] - .5,
					0,
					c[2]
				], cam);
				ctx.text.overlay.text("σ₁", q[0], q[1] + 150, {
					size: 44,
					weight: 600,
					color: PH.pink,
					alpha: .9 * seg(t, K.B(21) + .05, K.B(21) + .25)
				});
				overlays(ctx, K, "view  top · orthographic");
				look(ctx, { vignette: .3 });
			}
		},
		{
			id: "lead",
			at: (T) => keys(T).wM2.start,
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T), t = ctx.t, F0 = formation(t, K);
				reset();
				const c = F0.f.P, T0 = F0.f.T, cam = persp(ctx, [
					c[0] - T0[0] * 1.5 - .4,
					c[1] + .3,
					c[2] - T0[2] * 1.5 - .6
				], [
					c[0] + T0[0] * .6,
					c[1] + .05,
					c[2] + T0[2] * .6
				], { fov: 44 });
				chatFloor(ctx, cam);
				const F = drawPair(ctx, cam, K);
				render(ctx, cam);
				tags(ctx, K, cam, F);
				readout(ctx.text.overlay, 1480, 150, [["lead", "you"], ["follow", "me"]], { accent: PH.pink });
				overlays(ctx, K);
				look(ctx);
			}
		},
		{
			id: "gate",
			at: (T) => keys(T).l62.start,
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T), t = ctx.t, lt = t - K.l62.start;
				reset();
				const g = pathFrame(formation(K.B(25) - .12, K).u + .1), F0 = formation(t, K), c = F0.f.P, T0 = F0.f.T;
				const back = lerp(2.6, .6, ease.inCubic(seg(lt, 0, K.B(25) - K.l62.start)));
				const cam = persp(ctx, [
					c[0] - T0[0] * back,
					c[1] + .22,
					c[2] - T0[2] * back
				], [
					c[0] + T0[0],
					c[1] + .05,
					c[2] + T0[2]
				], { fov: 46 });
				drawPair(ctx, cam, K, { markers: false });
				const up = [
					0,
					1,
					0
				], side = g.N, R = 1.25, circ = (r, n = 128) => Array.from({ length: n + 1 }, (_, i) => {
					const a = i / n * TAU;
					return [
						0,
						1,
						2
					].map((j) => g.P[j] + (side[j] * Math.cos(a) + up[j] * Math.sin(a)) * r);
				});
				O.lines.polyline(circ(R), {
					color: PINK.map((v) => v * 1.3),
					width: 3.2
				});
				O.lines.polyline(circ(R * 1.09), {
					color: VIO.map((v) => v * .8),
					width: 1.6
				});
				for (let i = 0; i < 36; i++) {
					const a = i / 36 * TAU, d = [
						0,
						1,
						2
					].map((j) => side[j] * Math.cos(a) + up[j] * Math.sin(a));
					O.lines.segment(d.map((v, j) => g.P[j] + v * R * 1.1), d.map((v, j) => g.P[j] + v * R * (i % 3 ? 1.16 : 1.22)), {
						color: VIO.map((v) => v * .9),
						width: 1.4
					});
				}
				render(ctx, cam);
				overlays(ctx, K);
				look(ctx);
			}
		},
		{
			id: "moire",
			at: (T) => keys(T).B(25),
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T), t = ctx.t, lt = t - K.B(25);
				reset();
				const a = .07 + .045 * Math.sin(lt * 1.9), d = .018, zm = remade(ctx) ? lerp(1, 1.7, ease.inQuad(seg(t, K.B(25.4), K.B(26.3)))) : 1;
				moire(ctx, remade(ctx) ? {
					mode: 0,
					d,
					a,
					rot: .25 * Math.sin(lt * .7),
					bright: .11,
					duty: .5,
					zoom: zm
				} : {
					mode: 0,
					d,
					a,
					rot: .25 * Math.sin(lt * .7),
					bright: .11,
					duty: .5
				});
				const L = ctx.text.overlay, c = (s) => {
					const r = .25 * Math.sin(lt * .7), x = s * a * zm, px = x * Math.cos(r), py = -x * Math.sin(r);
					return [960 + px * 1080, 540 - py * 1080];
				};
				ctx.text.scene.draw((g) => {
					for (const [s, col] of [[-1, HEX.me], [1, HEX.you]]) {
						const [x, y] = c(s);
						g.fillStyle = col;
						g.shadowColor = col;
						g.shadowBlur = 16;
						g.beginPath();
						g.arc(x, y, 5, 0, TAU);
						g.fill();
					}
				});
				readout(L, 1480, 150, [
					["fringes", "r₁ − r₂ = k·d"],
					["2a", (2 * a).toFixed(3)],
					["d", d.toFixed(3)]
				], { accent: PH.pink });
				overlays(ctx, K);
				look(ctx, {
					ca: .1,
					vignette: .5
				});
			}
		},
		{
			id: "tunnel",
			at: (T) => keys(T).l63.start,
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T), t = ctx.t, z = tunnelZ(t, K);
				if (remade(ctx)) return tunnelR(ctx, K, t);
				reset();
				const cam = persp(ctx, [
					0,
					0,
					z
				], [
					0,
					0,
					z - 5
				], {
					fov: 62,
					up: [
						Math.sin(t * .2),
						Math.cos(t * .2),
						0
					]
				});
				tunnel(ctx, cam, K);
				const [pm, py] = pairInTunnel(t, K, z);
				dot(pm, COL.me.map((v) => v * 2.2), 13);
				dot(py, COL.you.map((v) => v * 2.2), 13);
				render(ctx, cam);
				readout(ctx.text.overlay, 1480, 150, [["rings", "Δz 1.30"], ["turn", `${(beatRot(t, K) * 180 / Math.PI % 360).toFixed(0)}° / 30° per beat`]], { accent: PH.pink });
				overlays(ctx, K);
				look(ctx, { vignette: .5 });
				tranceFlash(ctx, K);
			}
		},
		{
			id: "tunnel2",
			at: (T) => keys(T).B(29),
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T), t = ctx.t, z = tunnelZ(t, K);
				reset();
				const cam = persp(ctx, [
					1.05,
					-.55,
					z
				], [
					.2,
					-.1,
					z - 5
				], {
					fov: 50,
					up: [
						Math.sin(.6),
						Math.cos(.6),
						0
					]
				});
				tunnel(ctx, cam, K, { bright: .1 });
				const [pm, py] = pairInTunnel(t, K, z);
				dot(pm, COL.me.map((v) => v * 2.2), 12);
				dot(py, COL.you.map((v) => v * 2.2), 12);
				render(ctx, cam);
				overlays(ctx, K);
				look(ctx, { vignette: .5 });
				tranceFlash(ctx, K);
			}
		},
		{
			id: "moireMacro",
			at: (T) => keys(T).B(30),
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T), lt = ctx.t - K.B(30);
				reset();
				const d = .013, dth = lerp(.2, .05, ease.outCubic(seg(lt, 0, .42)));
				moire(ctx, {
					mode: 1,
					d,
					dTheta: dth,
					rot: .4 + lt * .15,
					bright: .24,
					duty: .5,
					zoom: lerp(1, 1.08, ease.outCubic(seg(lt, 0, .45))),
					dichro: .12
				});
				const Lam = d / (2 * Math.sin(dth / 2));
				readout(ctx.text.overlay, 1480, 150, [["Δθ", `${(dth * 180 / Math.PI).toFixed(2)}°`], ["Λ", `${(Lam / d).toFixed(2)} d`]], { accent: PH.pink });
				overlays(ctx, K, "Λ = d / 2 sin(Δθ/2)");
				look(ctx, {
					ca: .08,
					vignette: .5
				});
				tranceFlash(ctx, K);
			}
		},
		{
			id: "squareEnd",
			at: (T) => keys(T).B(31),
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T), t = ctx.t, lt = t - K.B(31), z = tunnelZ(t, K);
				reset();
				const n = 2 * 20 ** ease.inOutCubic(seg(lt, 0, .2)), exitZ = z - lerp(12, EXIT_END, ease.outCubic(seg(t, K.B(31), K.B(31.5))));
				const cam = persp(ctx, [
					0,
					0,
					z
				], [
					0,
					0,
					z - 5
				], { fov: 62 });
				tunnel(ctx, cam, K, {
					n,
					exitZ,
					stop: true
				});
				plateAt(ctx, cam, [
					0,
					0,
					exitZ
				], 2);
				render(ctx, cam);
				readout(ctx.text.overlay, 1480, 150, [["|x|ⁿ + |y|ⁿ = rⁿ", `n = ${n.toFixed(1)}`]], { accent: PH.pink });
				overlays(ctx, K);
				look(ctx, { vignette: .5 });
			}
		},
		{
			id: "plate",
			at: (T) => keys(T).B(31.5),
			ownsLyrics: true,
			draw(ctx) {
				plateOpen(ctx, keys(ctx.T), ctx.t);
			}
		}
	]
});
//#endregion
