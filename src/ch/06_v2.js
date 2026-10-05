import { chapter } from "../engine/timeline.js?v=vYBbdLfo";
import { TAU, clamp, ease, lerp, rng, seg, smoothstep } from "../engine/math.js?v=BJIlRm7-";
import { COL, HEX } from "../theme.js?v=Bj33PIbo";
import { remade } from "../lib/published.js?v=aV_CU5HV";
import { OrthographicCamera, Scene } from "../../vendor/three/build/three.core.js?v=q9f7JKE-";
import { Swarm } from "../engine/swarm.js?v=DTFpJa7B";
import { GlowLines } from "../engine/lines.js?v=B_AAaaTO";
import { rig } from "../engine/rig.js?v=39-joEtk";
import { consoleLog, newCamera } from "../lib/look.js?v=BfOqFF7i";
import { callout, crosshair, frame, readout, toDesign } from "../lib/hud.js?v=BgmSZjmG";
import { GlyphField, codeBlock, codeFill, source } from "../lib/glyphs.js?v=DWbHICXG";
import { capture, view } from "../lib/modes.js?v=Cu3GYO-2";
import { shapes } from "../engine/shapes.js?v=BFh0PgdI";
import { alloc } from "./v2/shapeset.js?v=Bbzza00z";
import { Cloud } from "./v2/cloud.js?v=D68TnMRL";
import { ballStick, lycopene } from "./v2/molecules.js?v=Dmo9yoCr";
import { HALO, halo } from "./v2/cosmos.js?v=C-ZnjFvS";
import { QED, glyphPoints } from "./v2/glyphs.js?v=Bcui0dtv";
import { CALLIGRAM, FlowGlyphs, Ribbons, SANKEY, calligramInside, calligramText } from "./v2/flow.js?v=D3JyQS8M";
import { PEAKS, PRISM, SpectrumFan, absorbance, lum, prismRays, rayColour, transmit, transmitted } from "./v2/spectrum.js?v=DJ-i5-IJ";
import { PSI, geigerClicks, peakShape, psiShape } from "./v2/quantum.js?v=4TYWQFDa";
import { INK, PRINT_LOOK, printed } from "./v2/print.js?v=BJmTtHS6";
import { wordMask, wordPoints } from "./v2/words.js?v=CQ8-GNPh";
import { CAT, WHISKERS, breath, catSDF, catShape } from "./v2/cat.js?v=C0oAEfs6";
import { Fur } from "./v2/fur.js?v=fTfOiRaj";
import { bakeLight } from "./v2/bake.js?v=Cwn4CWiF";
//#region src/ch/06_v2.js
var V = {
	egg: [
		.55,
		.25,
		1
	],
	tom: [
		1,
		.16,
		.08
	],
	cat: [
		1,
		.5,
		.16
	],
	god: [
		1,
		.84,
		.56
	]
};
var VH = {
	egg: "#b99bff",
	tom: "#ff7a63",
	cat: "#ffb266",
	god: "#ffe3ae",
	mol: "#cfe0ff"
};
var SYN_EGG = [
	[
		.84,
		.8,
		1
	],
	[
		.32,
		.27,
		.5
	],
	[
		1,
		.5,
		.82
	],
	[
		1,
		.8,
		.46
	],
	[
		.68,
		.46,
		1
	],
	[
		.5,
		.45,
		.72
	]
];
QED.col;
var LYC_S = .1;
var PURR_HZ = 25;
var SLOW = 50;
var SC = 10 ** 1.1;
var EXI_K = .55;
var CAL_SIZE = .058;
var PROOF = {
	D: 29,
	fov: 36,
	gx: 520,
	gy: 600,
	gh: 86,
	size: 112
};
var TAN = 2 * Math.tan(PROOF.fov / 2 * Math.PI / 180);
var kpx = (h) => h * TAN / 1080;
var GLYPH_C = [
	(PROOF.gx - 960) * kpx(PROOF.D),
	0,
	(PROOF.gy - 540) * kpx(PROOF.D)
];
var GLYPH_H = PROOF.gh * kpx(PROOF.D);
var O = null;
var KC = null;
function keys(T) {
	if (KC?.T === T) return KC;
	const s0 = T.section("v2").start, b0 = Math.round(T.beatAt(s0));
	const B = (k) => T.beatTime(b0 + k), L = (s) => T.findLine(s);
	const w = (l, s) => l.words.find((x) => x.text.toLowerCase().startsWith(s)) ?? l.words[0];
	const lEgg = L("eggplant"), lGive = T.line(lEgg.i + 1), lTom = L("tomato"), lGive2 = T.line(lTom.i + 1);
	const lCat = L("tabby cat"), lPurr = L("purr"), lGod = L("only god"), lProof = L("proof");
	const tAnti = L("ANTIOXIDANTS").start, beat = B(1) - B(0);
	return KC = {
		T,
		s0,
		B,
		beat,
		end: T.section("pre2").start,
		lEgg,
		wEgg: w(lEgg, "eggplant"),
		lGive,
		wGive: w(lGive, "give"),
		tNut: L("NUTRIENTS").start,
		lTom,
		wTom: w(lTom, "tomato"),
		lGive2,
		tAnti,
		quench: [
			0,
			1,
			2,
			3
		].map((j) => tAnti + j * beat / 2),
		lCat,
		wTabby: w(lCat, "tabby"),
		wCat: w(lCat, "cat"),
		lPurr,
		wPurr: w(lPurr, "purr"),
		tEnj: L("ENJOYMENT").start,
		lGod,
		wOnly: w(lGod, "only"),
		lProof,
		wYou: w(lProof, "you"),
		wProof: w(lProof, "proof"),
		tExi: L("EXISTENCE").start
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
	c.far = 800;
	c.position.set(...pos);
	c.up.set(...up);
	c.lookAt(...look);
	c.updateProjectionMatrix();
	c.updateMatrixWorld();
	return rig.cam(c, { look });
}
function ortho(center, dir, height, aspect) {
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
	if (dir === "front") {
		c.position.set(x, y, z + d);
		c.up.set(0, 1, 0);
	} else if (dir === "top") {
		c.position.set(x, y + d, z);
		c.up.set(0, 0, -1);
	} else {
		c.position.set(x + dir[0] * d, y + dir[1] * d, z + dir[2] * d);
		c.up.set(0, 1, 0);
	}
	c.lookAt(x, y, z);
	c.updateProjectionMatrix();
	c.updateMatrixWorld();
	return rig.cam(c, { look: center });
}
/** A camera position on a sphere round a target: distance r, azimuth az (from +z towards +x), elevation el. */
var orbit = (tgt, r, az, el) => [
	tgt[0] + r * Math.cos(el) * Math.sin(az),
	tgt[1] + r * Math.sin(el),
	tgt[2] + r * Math.cos(el) * Math.cos(az)
];
/** Straight-down camera that puts the ∃/∎ glyph centre at screen (sx, sy) with a height of gh design px. */
function glyphCam(ctx, sx, sy, gh) {
	const h = GLYPH_H * 1080 / (gh * TAN), k = kpx(h);
	const P = [
		GLYPH_C[0] - (sx - 960) * k,
		0,
		GLYPH_C[2] - (sy - 540) * k
	];
	return persp(ctx, [
		P[0],
		h,
		P[2]
	], P, {
		fov: PROOF.fov,
		up: [
			0,
			0,
			-1
		]
	});
}
function reset() {
	for (const o of [
		O.me.points,
		O.mol.points,
		O.word.points,
		O.you.points,
		O.stars.points,
		O.flow.points,
		O.rib.mesh,
		O.lines.mesh,
		O.fan.fan,
		O.fan.band,
		O.record.points
	]) o.visible = false;
	if (O.cat) {
		O.cat.visible = false;
		O.youCat.points.visible = false;
	}
	for (const o of [
		O.me.points,
		O.mol.points,
		O.word.points,
		O.you.points
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
/** The same, printed as ink on paper (the Schrödinger block). */
function renderPrinted(ctx, cam, o) {
	O.lines.mesh.visible = true;
	O.lines.end(ctx);
	printed(ctx, (sub) => sub.draw(O.scene, cam), o);
}
function stars(ctx, cam, bright = .5, hPx = ctx.H) {
	O.stars.points.visible = true;
	O.stars.set({
		a: O.tex.stars,
		size: .09,
		bright,
		sparkle: .6,
		t: ctx.t,
		minPx: 1.1
	}, cam, hPx);
}
function overlays(ctx, K, br, o = {}) {
	frame(ctx.text.overlay, ctx.t, ctx.T, {
		label: "instances",
		bottomRight: br,
		color: o.paper ? INK.grey : void 0,
		alpha: o.paper ? .8 : void 0
	});
	consoleLog(ctx.text.overlay, ctx.T, ctx.t, {
		from: K.s0 - .2,
		...o.paper ? {
			color: INK.black,
			accent: INK.amber,
			glow: 0
		} : {}
	});
}
function look(ctx, o = {}) {
	Object.assign(ctx.post, {
		bloom: 1,
		threshold: .95,
		ca: .25,
		vignette: .42,
		grain: .03,
		exposure: 1,
		...o
	});
}
var paperLook = (ctx) => Object.assign(ctx.post, PRINT_LOOK);
/**
* A keyword hit: the subject discharges. hit() is the envelope (300 ms) that the shot uses to drive its subject white-hot
* (brightness × (1 + 3e)); accent(), called after look(), opens the bloom (strength, radius, lower threshold) so the
* light spills off the subject onto the dark around it, and fires a bright shockwave ring from the subject.
*/
var hit = (t, t0) => t < t0 || t > t0 + .3 ? 0 : (1 - (t - t0) / .3) ** 3;
function accent(ctx, t0, col, { x = 960, y = 540, spill = 1 } = {}) {
	const dt = ctx.t - t0;
	if (dt < 0 || dt > .6) return;
	const e = hit(ctx.t, t0), p = ctx.post;
	p.bloom *= 1 + 2.4 * spill * e;
	p.radius = Math.min(1, p.radius + .15 * spill * e);
	p.threshold = lerp(p.threshold, .5, e);
	p.exposure *= 1 + .2 * e;
	p.textGlow *= 1 + 2 * e;
	const rr = 30 + 1100 * (1 - Math.exp(-dt / .16)), a = Math.exp(-dt / .2);
	const css = (k) => `rgb(${col.map((v) => Math.round(255 * Math.min(1, v + (1 - v) * k))).join(",")})`;
	ctx.text.scene.draw((g) => {
		g.globalAlpha *= .45 * a;
		g.strokeStyle = css(0);
		g.lineWidth = 10 + 26 * a;
		g.beginPath();
		g.arc(x, y, rr, 0, TAU);
		g.stroke();
		g.globalAlpha /= .45;
		g.strokeStyle = css(.7);
		g.lineWidth = 2 + 4 * a;
		g.beginPath();
		g.arc(x, y, rr, 0, TAU);
		g.stroke();
	});
}
function dot(p, col, w = 14) {
	O.lines.segment(p, p, {
		color: col,
		width: w
	});
}
function polyCircle(c, r, e1, e2, n = 96) {
	const p = [];
	for (let i = 0; i <= n; i++) {
		const a = i / n * TAU;
		p.push([
			0,
			1,
			2
		].map((k) => c[k] + (e1[k] * Math.cos(a) + e2[k] * Math.sin(a)) * r));
	}
	return p;
}
var CODE_COL = {
	kw: "#b48cff",
	type: "#ffd27a",
	me: "#7ef0ff",
	p: "#8f96ad",
	txt: "#e2e6f2",
	cm: "#5d6478"
};
var CODE_INK = {
	kw: "#5b3aa8",
	type: "#8a5a12",
	me: "#1f6f80",
	p: "#6d717c",
	txt: "#1b1d23",
	cm: "#8d9098"
};
var PAPER_HEX = "#f1eee7";
var NEW_LINES = [
	[
		["const ", "kw"],
		["me", "me"],
		[" = ", "p"],
		["new ", "kw"],
		["Eggplant", "type"],
		["();", "p"]
	],
	[
		["me", "me"],
		[" = ", "p"],
		["new ", "kw"],
		["Tomato", "type"],
		["();", "p"]
	],
	[
		["me", "me"],
		[" = ", "p"],
		["new ", "kw"],
		["SchrödingerCat", "type"],
		["();", "p"],
		["   // (|alive⟩ + |dead⟩)/√2", "cm"]
	],
	[
		["me", "me"],
		[" = ", "p"],
		["God", "type"],
		[".getInstance();", "p"],
		["   // singleton: the only one", "cm"]
	],
	[
		["me", "me"],
		[" = ", "p"],
		["new ", "kw"],
		["TabbyCat", "type"],
		["();", "p"],
		["   // Felis catus · mackerel", "cm"]
	]
];
function newLine(ctx, K, which, t0, o = {}) {
	const L = ctx.text.overlay, segs = NEW_LINES[which], total = segs.reduce((s, [x]) => s + x.length, 0);
	const n = clamp(Math.floor((ctx.t - t0) / (K.beat / 8)) + 1, 0, total), st = {
		size: 22,
		weight: 500,
		align: "left",
		alpha: o.alpha ?? .92
	};
	const pal = o.paper ? CODE_INK : CODE_COL;
	let x = 92, left = n;
	L.text(">", x, 118, {
		...st,
		color: pal.p
	});
	x += L.measure("> ", st);
	for (const [s, c] of segs) {
		if (left <= 0) break;
		const part = s.slice(0, left);
		left -= s.length;
		L.text(part, x, 118, {
			...st,
			color: pal[c]
		});
		x += L.measure(part, st);
	}
	if (n < total || Math.floor(ctx.t * 3) % 2 === 0) L.text("█", x + 2, 118, {
		...st,
		color: pal.me,
		alpha: .7
	});
}
/** c1's closing camera (pushIn at its end) in this chapter's units: c1's cell (1, 1, 1) scaled by ½ onto the cell here. */
var C1_END = {
	pos: [
		.3,
		.45,
		2.7
	],
	at: [
		0,
		0,
		0
	]
};
function cells(fade, nb = 1) {
	const S = 6, n = 3, c0 = [
		0,
		0,
		0
	];
	const seg3 = (a, b) => {
		const m = [
			(a[0] + b[0]) / 2,
			(a[1] + b[1]) / 2,
			(a[2] + b[2]) / 2
		], own = Math.max(Math.abs(m[0]), Math.abs(m[1]), Math.abs(m[2])) <= 3.01;
		const d = Math.hypot(m[0] - c0[0], m[1] - c0[1], m[2] - c0[2]), b0 = own ? .95 : nb * .42 / (1 + ((d - 4.2) / 6) ** 2 * 1.4);
		if (b0 * fade < .012) return;
		O.lines.segment(a, b, {
			color: COL.white.map((v) => v * b0 * fade),
			width: own ? 2.2 : 1.3
		});
	};
	const v = (i) => -3 + i * S;
	for (let i = -2; i <= n; i++) for (let j = -1; j <= 2; j++) for (let k = -2; k <= n; k++) {
		const x = v(i), y = v(j), z = v(k);
		if (i < n) seg3([
			x,
			y,
			z
		], [
			x + S,
			y,
			z
		]);
		if (j < 2) seg3([
			x,
			y,
			z
		], [
			x,
			y + S,
			z
		]);
		if (k < n) seg3([
			x,
			y,
			z
		], [
			x,
			y,
			z + S
		]);
	}
}
var FLOW_SPEED = .5;
/** Flow time (s) and drain time: the stream runs from lGive; from tNut − .05 the source stops and it drains fast. */
function flowClock(t, K, a = 1) {
	const t0 = K.lGive.start + .12, tD = K.tNut - .05;
	return {
		flowT: t < tD ? Math.max(0, t - t0) : a === 1 ? tD - t0 + (t - tD) + 6 * (t - tD) ** 2 : tD - t0 + a * (t - tD + 6 * (t - tD) ** 2),
		drainT: t < tD ? -1 : tD - t0,
		drained: t < tD ? 0 : clamp((t - tD + 6 * (t - tD) ** 2) * FLOW_SPEED * a)
	};
}
function flowParams(t, K, o = {}) {
	const fc = flowClock(t, K, o.fast ?? 1);
	return {
		morph: ease.inOutCubic(seg(t, K.lGive.start + .02, K.lGive.start + .6)),
		spread: .55,
		arc: .35,
		flowT: fc.flowT,
		drainT: fc.drainT,
		speed: FLOW_SPEED,
		word: ease.inOutCubic(seg(t, K.tNut - .14, K.tNut + .14)),
		size: CAL_SIZE,
		bright: 1,
		palette: SYN_EGG,
		wordCol: [
			1,
			.9,
			.74
		],
		t,
		...o,
		fc
	};
}
var SANKEY_CAM = (ctx) => persp(ctx, [
	.05,
	.12,
	7.4
], [
	.05,
	.12,
	0
], { fov: 30 });
/** You (the sink) and its swarm (warmer as the stream is absorbed); the source is the table. */
function sankeyNodes(ctx, cam, K, o = {}) {
	const S = SANKEY, h = S.total / 2, t = ctx.t, abs = o.absorbed ?? 0, e = o.hit ?? 0;
	O.lines.segment([
		S.xR + .03,
		S.Y0 - h,
		0
	], [
		S.xR + .03,
		S.Y0 + h,
		0
	], {
		color: COL.you.map((v) => v * (1 + 1.5 * abs) * (1 + 3 * e)),
		width: 3.2
	});
	O.you.points.visible = true;
	O.you.points.position.set(S.xR + .5, S.Y0, 0);
	if (!o.open && !o.ring) {
		O.you.points.scale.setScalar(6 + 3 * abs);
		O.you.set({
			a: O.tex.you,
			size: .004,
			bright: (.5 + 1.2 * abs) * (1 + 3 * e),
			colA: COL.you,
			colB: COL.rose,
			t,
			sparkle: .3
		}, cam, ctx.H);
		return;
	}
	const u = o.open ?? 0, r = o.ring ?? 0;
	O.you.points.scale.setScalar((6 + 3 * abs) * (1 + .45 * u));
	O.you.set({
		a: O.tex.you,
		size: .004 * (1 + .2 * u),
		bright: (.5 + 1.2 * abs) * (1 + 3 * e) * (1 + .25 * u),
		colA: COL.you,
		colB: COL.rose,
		t,
		sparkle: .3 - .18 * u
	}, cam, ctx.H);
	if (r > 0 && r < 1) O.lines.polyline(polyCircle([
		S.xR + .5,
		S.Y0,
		0
	], .26 + .55 * ease.outCubic(r), [
		1,
		0,
		0
	], [
		0,
		1,
		0
	], 96), {
		color: COL.you.map((v) => v * 1.5 * (1 - r) ** 2),
		width: 2.4
	});
}
var pctOf = (B, f = 1) => `${(f === 1 ? B.dv * 100 : B.dv * f * 100).toFixed(B.dv < .1 ? 1 : 0)} %`;
var amtOf = (B, f = 1) => f === 1 ? B.amt : (parseFloat(B.amt) * f).toFixed((B.amt.split(".")[1] ?? "").length);
/**
* The source is a table (DATA): one row per nutrient, each band leaving the right edge of its row; the bands are
* tagged (name, % daily value) on dark plates in the middle column; "you" at the sink.
*/
function sankeyLabels(ctx, cam, K, o = {}) {
	const L = ctx.text.overlay, S = SANKEY, a = o.alpha ?? 1, t = ctx.t, P = (p) => toDesign(p, cam);
	const rows = o.table ?? a, f = 1 - (o.drain ?? 0);
	if (rows > 0) {
		const top = P([
			S.xL,
			S.Y0 + S.src / 2 + .06,
			0
		]), xr = P([
			S.xL,
			0,
			0
		])[0] - 14;
		if (o.me > 0) L.text("me", xr - 330, top[1] - 64, {
			size: 18,
			weight: 600,
			align: "left",
			color: HEX.me,
			alpha: .9 * o.me
		});
		L.text("USDA FDC 11209 · Eggplant, raw · per 100 g", xr, top[1] - 34, {
			size: 15,
			weight: 600,
			align: "right",
			color: "#cbbdff",
			alpha: rows
		});
		L.text("nutrient", xr - 330, top[1] - 8, {
			size: 14,
			weight: 500,
			align: "left",
			color: HEX.dim,
			alpha: rows
		});
		L.text("amount", xr - 88, top[1] - 8, {
			size: 14,
			weight: 500,
			align: "right",
			color: HEX.dim,
			alpha: rows
		});
		L.text("% DV", xr, top[1] - 8, {
			size: 14,
			weight: 500,
			align: "right",
			color: HEX.dim,
			alpha: rows
		});
		L.draw((g) => {
			g.globalAlpha *= rows * .6;
			g.strokeStyle = HEX.dim;
			g.lineWidth = 1;
			g.beginPath();
			g.moveTo(xr - 336, top[1] + 4);
			g.lineTo(xr + 4, top[1] + 4);
			g.stroke();
		});
		S.bands.forEach((B, k) => {
			const on = seg(t, (o.from ?? 0) + k * .04, (o.from ?? 0) + k * .04 + .1) * rows;
			if (on <= 0) return;
			const y = P([
				S.xL,
				B.yRow,
				0
			])[1], css = `rgb(${B.col.map((v) => Math.round(255 * Math.min(1, v) ** (1 / 2.2))).join(",")})`;
			L.draw((g) => {
				g.globalAlpha *= on;
				g.fillStyle = css;
				g.fillRect(xr + 8, y - 7, 6, 14);
			});
			L.text(B.name, xr - 330, y, {
				size: 16,
				weight: 600,
				align: "left",
				color: "#e6dcff",
				alpha: on
			});
			L.text(`${amtOf(B, f)} ${B.unit}`, xr - 88, y, {
				size: 16,
				weight: 500,
				align: "right",
				color: HEX.gold,
				alpha: on
			});
			L.text(pctOf(B, f), xr, y, {
				size: 16,
				weight: 500,
				align: "right",
				color: "#b9aee0",
				alpha: on
			});
		});
	}
	if (a > 0) S.bands.forEach((B, k) => {
		const on = seg(t, (o.from ?? 0) + .2 + k * .04, (o.from ?? 0) + .3 + k * .04) * a;
		if (on <= 0) return;
		const q = P([
			S.xM,
			B.yMid + B.w / 2,
			0
		]), text = `${B.name}  ${pctOf(B)}`, st = {
			size: 15,
			weight: 600,
			align: "center"
		}, w = L.measure(text, st) + 18;
		L.draw((g) => {
			g.globalAlpha *= on * .82;
			g.fillStyle = "#0b0914";
			g.beginPath();
			g.roundRect(q[0] - w / 2, q[1] - 12, w, 24, 5);
			g.fill();
		});
		L.text(text, q[0], q[1], {
			...st,
			color: "#efe8ff",
			alpha: on
		});
	});
	const snk = P([
		S.xR,
		S.Y0 - S.total / 2,
		0
	]), ya = o.you ?? a;
	if (ya > 0) L.text("you", snk[0] + 50, snk[1] + 30, {
		size: 18,
		weight: 600,
		color: HEX.you,
		alpha: .9 * ya
	});
}
/**
* NUTRIENTS in the remake (docs/REMAKE.md §4 B): what me gives, me no longer has. Both ends stay in the frame: as the
* stream drains into you, every row of me's table counts down to nothing (and me's total with it); you takes it in,
* opens out and sends a ring out. The word compiles in the middle as in the published cut.
*/
function nutrientsGiven(ctx, K, t, lt) {
	const k = ease.inOutSine(seg(lt, 0, .8)), cam = persp(ctx, [
		.32,
		lerp(.08, .05, k),
		lerp(7.35, 7.7, k)
	], [
		.32,
		.07,
		0
	], { fov: 30 });
	const fp = flowParams(t, K, { fast: 2 }), e = hit(t, K.tNut), d = fp.fc.drained;
	dataWall(ctx, cam, { bright: .05 * (1 - seg(lt, .1, .4)) });
	O.flow.points.visible = true;
	O.flow.set({
		...fp,
		bright: 1 + 1.6 * e
	}, cam, ctx.H);
	O.rib.set(.1 * (1 - seg(lt, .1, .45)), 1, d);
	sankeyNodes(ctx, cam, K, {
		absorbed: d,
		hit: e,
		open: ease.outCubic(seg(t, K.tNut + .04, K.tNut + .34)),
		ring: seg(t, K.tNut + .26, K.tNut + .8)
	});
	render(ctx, cam);
	sankeyLabels(ctx, cam, K, {
		from: -1,
		alpha: 1 - seg(lt, 0, .15),
		table: 1 - .45 * seg(lt, .36, .6),
		drain: d,
		you: 1,
		me: 1
	});
	look(ctx);
	{
		const q = toDesign([
			SANKEY.xR + .5,
			SANKEY.Y0,
			0
		], cam);
		accent(ctx, K.tNut, [
			1,
			.7,
			.4
		], {
			x: q[0],
			y: q[1]
		});
	}
	const dv = SANKEY.bands.reduce((s, B) => s + B.dv, 0);
	readout(ctx.text.overlay, 1500, 856, [
		["me", `${Math.round(dv * (1 - d) * 100)} % DV`],
		["you.absorb", `${Math.round(d * 100)} %`],
		["compiled", "NUTRIENTS"]
	], { accent: HEX.you });
	overlays(ctx, K);
}
var USDA_RECORD = `USDA FoodData Central  SR Legacy  NDB 11209
Eggplant, raw                      per 100 g
-------------------------------------------
Water                         92.30  g
Energy                           25  kcal
Energy                          104  kJ
Protein                        0.98  g
Total lipid (fat)              0.18  g
Ash                            0.66  g
Carbohydrate, by difference    5.88  g
Fiber, total dietary            3.0  g
Sugars, total                  3.53  g
Calcium, Ca                       9  mg
Iron, Fe                       0.23  mg
Magnesium, Mg                    14  mg
Phosphorus, P                    24  mg
Potassium, K                    229  mg
Sodium, Na                        2  mg
Zinc, Zn                       0.16  mg
Copper, Cu                    0.081  mg
Manganese, Mn                 0.232  mg
Selenium, Se                    0.3  μg
Vitamin C                       2.2  mg
Thiamin                       0.039  mg
Riboflavin                    0.037  mg
Niacin                        0.649  mg
Pantothenic acid              0.281  mg
Vitamin B-6                   0.084  mg
Folate, total                    22  μg
Choline, total                  6.9  mg
Vitamin A, RAE                    1  μg
Carotene, beta                   14  μg
Lutein + zeaxanthin              36  μg
Vitamin E                      0.30  mg
Vitamin K (phylloquinone)       3.5  μg`;
function dataWall(ctx, cam, o = {}) {
	O.record.points.visible = true;
	O.record.set({
		a: O.tex0.record,
		size: .125,
		minPx: 2,
		bright: o.bright ?? .05,
		palette: [
			.55,
			.5,
			.85
		],
		t: ctx.t,
		focus: o.focus ?? 7.4,
		aperture: o.aperture ?? .03,
		maxBlur: 20
	}, cam, ctx.H);
}
var LS = Array.from({ length: 61 }, (_, i) => 400 + i * 5);
var PR = prismRays(LS);
var OFF = [-.05, .45];
var at = (p) => [
	p[0] + OFF[0],
	p[1] + OFF[1],
	0
];
var SRC = [PR.entry[0] - PR.dir0[0] * 3, PR.entry[1] - PR.dir0[1] * 3];
var SCREEN_X = 3.3;
Math.max(...LS.map(lum));
var CELL_U = 1.35;
/** Lycopene layer thickness over the block: 0, then the three bands (A472 ≈ 1), then an optically thick fruit (≈ 32). */
var conc = (t, K) => 1.2 * ease.inOutSine(seg(t, K.B(10) + .12, K.B(10) + .3)) + 30.8 * ease.inCubic(seg(t, K.B(10) + .46, K.lGive2.start + .01));
function bench(ctx, K, o = {}) {
	const L = O.lines;
	ctx.t;
	const c = o.c ?? 0, on = o.on ?? 1, draw = o.draw ?? 1;
	const [A, B, C] = PR.corners.map(at);
	L.polyline([
		A,
		B,
		C,
		A
	], {
		color: [
			.75,
			.85,
			1
		].map((v) => v * .9),
		width: 2.4
	});
	const src = at(SRC);
	at(PR.entry);
	const cellP = [SRC[0] + PR.dir0[0] * CELL_U, SRC[1] + PR.dir0[1] * CELL_U];
	const n = [-PR.dir0[1], PR.dir0[0]];
	L.polyline([
		[-.12, -.1],
		[.02, -.1],
		[.02, .1],
		[-.12, .1],
		[-.12, -.1]
	].map(([u, v]) => at([SRC[0] + PR.dir0[0] * u + n[0] * v, SRC[1] + PR.dir0[1] * u + n[1] * v])), {
		color: [
			.8,
			.85,
			1
		].map((v) => v * .8),
		width: 1.8
	});
	const tr = transmitted(Math.max(c, .001)), after = c > .01 ? tr.rgb.map((v) => v * (.35 + .65 * tr.Y)) : [
		1,
		1,
		1
	];
	const beamW = [
		1,
		.98,
		.95
	].map((v) => v * 2.2 * on);
	const u1 = CELL_U * draw, u2 = 3 * draw;
	L.segment(src, at([SRC[0] + PR.dir0[0] * Math.min(u1, CELL_U), SRC[1] + PR.dir0[1] * Math.min(u1, CELL_U)]), {
		color: beamW,
		width: 5
	});
	if (draw > CELL_U / 3) L.segment(at(cellP), at([SRC[0] + PR.dir0[0] * u2, SRC[1] + PR.dir0[1] * u2]), {
		color: after.map((v) => v * 2.2 * on),
		width: 5
	});
	if ((o.cell ?? 0) > 0) {
		const k = o.cell, slide = (1 - ease.outCubic(k)) * 1.6, w = .16, h = .34;
		const q = ([u, v]) => at([cellP[0] + PR.dir0[0] * u + n[0] * (v + slide), cellP[1] + PR.dir0[1] * u + n[1] * (v + slide)]);
		L.polyline([
			[-.16, -.34],
			[w, -.34],
			[w, h],
			[-.16, h],
			[-.16, -.34]
		].map(q), {
			color: [
				.8,
				.88,
				1
			].map((v) => v * .85),
			width: 2
		});
		const fill = c > .01 ? tr.rgb.map((v) => v * .22 * Math.min(1, c / 4 + .2)) : [
			0,
			0,
			0
		];
		for (let j = 0; j < 7; j++) {
			const v = -.34 + (j + .5) / 7 * 2 * h;
			L.segment(q([-.14, v]), q([.14, v]), {
				color: fill,
				width: 7
			});
		}
	}
	const fan = seg(draw, .55, 1);
	if (fan <= 0) return { tr };
	for (const r of PR.rays.filter((_, i) => i % 6 === 0)) {
		const T = c > .01 ? transmit(r.l, c) : 1;
		L.segment(at(r.inside[0]), at(r.inside[1]), {
			color: rayColour(r.l).map((v) => v * .12 * T * on),
			width: 2
		});
	}
	O.fan.set(c, .9 * on, fan, 1);
	const sx = SCREEN_X + OFF[0], sc = [
		.6,
		.65,
		.8
	].map((v) => v * .55), zz = .34;
	L.polyline([
		[
			sx,
			-2.05,
			-.34
		],
		[
			sx,
			-2.05,
			zz
		],
		[
			sx,
			-.9,
			zz
		],
		[
			sx,
			-.9,
			-.34
		],
		[
			sx,
			-2.05,
			-.34
		]
	], {
		color: sc,
		width: 1.6
	});
	return { tr };
}
/** The absorbance plot (DATA): A(λ) 400–600 nm, the three bands, the transmitted spectrum at the current thickness. */
function absPanel(L, t, c, x, y, w, h, o = {}) {
	const a = o.alpha ?? 1, l0 = 400, l1 = 620, X = (l) => x + (l - l0) / 220 * w, Y = (v) => y + h - v * h * .82;
	L.draw((g) => {
		g.globalAlpha *= a;
		g.strokeStyle = HEX.dim;
		g.lineWidth = 1;
		g.beginPath();
		g.moveTo(x, y);
		g.lineTo(x, y + h);
		g.lineTo(x + w, y + h);
		g.stroke();
		for (let l = 400; l <= 600; l += 50) {
			g.beginPath();
			g.moveTo(X(l), y + h);
			g.lineTo(X(l), y + h + 6);
			g.stroke();
		}
		for (let l = l0; l < l1; l += 2) {
			const col = rayColour(l), T = c > .01 ? transmit(l, c) : 1;
			g.fillStyle = `rgb(${col.map((v) => Math.round(255 * (v * T) ** (1 / 2.2))).join(",")})`;
			g.fillRect(X(l), y + h + 12, w / 220 * 2 + .5, 10);
		}
		g.strokeStyle = "#ffd6c8";
		g.lineWidth = 2;
		g.beginPath();
		for (let l = l0; l <= l1; l += 1) {
			const px = X(l), py = Y(absorbance(l));
			l === l0 ? g.moveTo(px, py) : g.lineTo(px, py);
		}
		g.stroke();
		g.setLineDash([4, 4]);
		g.strokeStyle = "rgba(255,214,200,.5)";
		g.lineWidth = 1;
		for (const p of PEAKS) {
			g.beginPath();
			g.moveTo(X(p), Y(absorbance(p)) - 6);
			g.lineTo(X(p), y + h);
			g.stroke();
		}
		g.setLineDash([]);
	});
	PEAKS.forEach((p) => L.text(`${p}`, X(p), Y(absorbance(p)) - 18, {
		size: 14,
		weight: 600,
		color: "#ffd6c8",
		alpha: a
	}));
	L.text("A(λ)  lycopene · hexane", x, y - 16, {
		size: 14,
		weight: 500,
		align: "left",
		color: HEX.dim,
		alpha: a
	});
	L.text("λ / nm", x + w, y + h + 40, {
		size: 14,
		weight: 500,
		align: "right",
		color: HEX.dim,
		alpha: a
	});
	[
		400,
		500,
		600
	].forEach((l) => L.text(String(l), X(l), y + h + 40, {
		size: 14,
		weight: 500,
		color: HEX.dim,
		alpha: a
	}));
}
var SMILES = "CC(C)=CCCC(C)=CC=CC(C)=CC=CC(C)=CC=CC=C(C)C=CC=C(C)C=CC=C(C)CCC=C(C)C";
/**
* Radicals (ROO•): each is a restless point carrying one unpaired electron (the small dot circling it). It flies at a
* carbon of the conjugated chain and is quenched exactly on its eighth note K.quench[j]: its electron jumps onto the
* chain and pairs up (two dots, ↑↓), the pair goes out, the radical is left neutral and grey, and a pulse runs along
* the chain (the excitation delocalised over the 11 conjugated C=C, then lost as heat).
*/
var RADICALS = [
	{
		atom: 16,
		dir: [
			-.2,
			.85,
			.5
		]
	},
	{
		atom: 9,
		dir: [
			.35,
			-.8,
			.5
		]
	},
	{
		atom: 23,
		dir: [
			-.25,
			.75,
			-.6
		]
	},
	{
		atom: 5,
		dir: [
			.3,
			.85,
			.45
		]
	}
];
var molAtom = (i) => O.lyco.atoms[i].p.map((v) => v * LYC_S);
function molState(t, K) {
	const tx = O.tex;
	return {
		a: tx.lycoFlat,
		b: tx.lyco,
		morph: ease.inOutCubic(seg(t, K.B(13) + .04, K.tAnti - .02)),
		spread: .35,
		arc: .06
	};
}
function radicals(ctx, cam, K, o = {}) {
	const t = ctx.t, L = O.lines, glow = [], Lt = ctx.text.overlay;
	RADICALS.forEach((R, j) => {
		const q = K.quench[j], tgt = molAtom(R.atom), d0 = Math.hypot(...R.dir), dir = R.dir.map((v) => v / d0);
		if (t < q - 1.25) return;
		const app = ease.inOutSine(seg(t, q - 1.25, q)), after = seg(t, q, q + 1.4), live = t < q;
		const d = live ? 2.2 * (1 - app) + .12 : .12 + .45 * ease.outCubic(after), jit = live ? .06 * (1 - .6 * app) : 0;
		const n = (k) => (Math.sin(t * (31 + 7 * j) + k * 2.1 + j) + .6 * Math.sin(t * (53 + 3 * j) + k * 1.3)) * jit;
		const p = [
			tgt[0] + dir[0] * d + n(0),
			tgt[1] + dir[1] * d + n(1),
			tgt[2] + dir[2] * d + n(2)
		];
		if (live) {
			dot(p, [
				1,
				.22,
				.28
			].map((v) => v * 2.6), 20);
			dot(p, [
				1,
				.22,
				.28
			].map((v) => v * .5), 52);
			const a = t * 21 + j * 2;
			dot([
				p[0] + Math.cos(a) * .1,
				p[1] + Math.sin(a) * .1,
				p[2] + Math.sin(a * .7) * .05
			], [
				1,
				.95,
				.85
			].map((v) => v * 3), 9);
			const s = toDesign(p, cam);
			if (s[2] < 1 && (o.labels ?? true)) Lt.text("ROO•", s[0] + 22, s[1] - 20, {
				size: 16,
				weight: 600,
				align: "left",
				color: "#ff8a8a",
				alpha: .9 * seg(t, q - 1.25, q - 1.05)
			});
		} else {
			const dt = t - q, jump = seg(dt, 0, .07), fade = 1 - seg(dt, .12, .5);
			dot(p, [
				.55,
				.58,
				.7
			].map((v) => v * .9), 10);
			const off = [
				-dir[2] * .045,
				0,
				dir[0] * .045
			];
			if (fade > 0) {
				dot([
					lerp(p[0], tgt[0], jump) + off[0],
					lerp(p[1], tgt[1], jump),
					lerp(p[2], tgt[2], jump) + off[2]
				], [
					1,
					.95,
					.85
				].map((v) => v * 3 * fade), 10);
				dot([
					tgt[0] - off[0],
					tgt[1],
					tgt[2] - off[2]
				], [
					1,
					.95,
					.85
				].map((v) => v * 3 * fade), 10);
				L.polyline(polyCircle(tgt, .06 + .2 * seg(dt, 0, .3), [
					1,
					0,
					0
				], [
					0,
					1,
					0
				], 48), {
					color: [
						1,
						.55,
						.45
					].map((v) => v * 2 * fade),
					width: 2.6
				});
				const s = toDesign(tgt, cam);
				if (s[2] < 1) Lt.text("↑↓", s[0] + 18, s[1] + 24, {
					size: 22,
					weight: 700,
					align: "left",
					color: "#fff0e8",
					alpha: fade
				});
			}
			if (dt < .9) glow.push({
				o: tgt,
				r: dt * 5.5,
				w: .22,
				amp: 3.2 * Math.exp(-dt / .35)
			});
		}
	});
	return glow.slice(-3);
}
var YOU_TOM = [
	1.79,
	.345,
	-.26
];
var TOM_SHIFT = -.4;
var TOM_ATOMS = [
	23,
	28,
	16,
	9
];
var TOM_H = 2.9;
var molShiftB = (t, K) => TOM_SHIFT * (1 - ease.inOutCubic(seg(t, K.B(13) + .04, K.tAnti - .02)));
/** The radicals round you until each one's quench beat, then on the chain; returns the chain's glow pulses. */
function radicalsGiven(ctx, cam, K, shift) {
	const t = ctx.t, L = O.lines, glow = [], Lt = ctx.text.overlay, Y = YOU_TOM;
	RADICALS.forEach((R, j) => {
		const q = K.quench[j], a0 = molAtom(TOM_ATOMS[j]), tgt = [
			a0[0] + shift,
			a0[1],
			a0[2]
		], d0 = Math.hypot(...R.dir), dir = R.dir.map((v) => v / d0);
		if (t < q) {
			const ph = (5.2 + 1.4 * j) * t + j * TAU / 4 + .4, rho = .24 + .035 * Math.sin(3.1 * t + j), tilt = (j % 2 ? 1 : -1) * (.5 + .15 * j);
			const jit = .03, n = (k) => (Math.sin(t * (31 + 7 * j) + k * 2.1 + j) + .6 * Math.sin(t * (53 + 3 * j) + k * 1.3)) * jit;
			const o = [
				Y[0] + rho * Math.cos(ph) + n(0),
				Y[1] + rho * .8 * Math.sin(ph) + n(1),
				Y[2] + rho * tilt * Math.sin(ph) + n(2)
			];
			const h = ease.inCubic(seg(t, q - .16, q)), p = [
				0,
				1,
				2
			].map((i) => lerp(o[i], tgt[i], h));
			dot(p, [
				1,
				.22,
				.28
			].map((v) => v * 2.6), 18);
			dot(p, [
				1,
				.22,
				.28
			].map((v) => v * .5), 44);
			const a = t * 21 + j * 2;
			dot([
				p[0] + Math.cos(a) * .07,
				p[1] + Math.sin(a) * .07,
				p[2] + Math.sin(a * .7) * .035
			], [
				1,
				.95,
				.85
			].map((v) => v * 3), 8);
			const sp = toDesign(p, cam);
			if (sp[2] < 1 && j === 0 && h === 0) Lt.text("ROO•", sp[0] + 20, sp[1] - 18, {
				size: 15,
				weight: 600,
				align: "left",
				color: "#ff8a8a",
				alpha: .8 * seg(t, K.lGive2.start + .1, K.lGive2.start + .3)
			});
		} else {
			const dt = t - q, jump = seg(dt, 0, .07), fade = 1 - seg(dt, .12, .5), p = [
				0,
				1,
				2
			].map((i) => tgt[i] + dir[i] * .45 * ease.outCubic(seg(t, q, q + 1.4)));
			dot(p, [
				.55,
				.58,
				.7
			].map((v) => v * .9), 10);
			const off = [
				-dir[2] * .045,
				0,
				dir[0] * .045
			];
			if (fade > 0) {
				dot([
					lerp(p[0], tgt[0], jump) + off[0],
					lerp(p[1], tgt[1], jump),
					lerp(p[2], tgt[2], jump) + off[2]
				], [
					1,
					.95,
					.85
				].map((v) => v * 3 * fade), 10);
				dot([
					tgt[0] - off[0],
					tgt[1],
					tgt[2] - off[2]
				], [
					1,
					.95,
					.85
				].map((v) => v * 3 * fade), 10);
				L.polyline(polyCircle(tgt, .06 + .2 * seg(dt, 0, .3), [
					1,
					0,
					0
				], [
					0,
					1,
					0
				], 48), {
					color: [
						1,
						.55,
						.45
					].map((v) => v * 2 * fade),
					width: 2.6
				});
				const sp = toDesign(tgt, cam);
				if (sp[2] < 1) Lt.text("↑↓", sp[0] + 18, sp[1] + 24, {
					size: 22,
					weight: 700,
					align: "left",
					color: "#fff0e8",
					alpha: fade
				});
			}
			if (dt < .9) glow.push({
				o: tgt,
				r: dt * 5.5,
				w: .22,
				amp: 3.2 * Math.exp(-dt / .35)
			});
		}
	});
	return glow.slice(-3);
}
/** you in the tomato block: shaken while radicals are round it, a little calmer at each quench, then still and warm. */
function youGiven(ctx, cam, K) {
	const t = ctx.t, A = K.quench.reduce((a, q) => a + (1 - seg(t, q, q + .2)), 0) / 4, calm = 1 - A;
	const kick = K.quench.reduce((a, q) => a + (t >= q ? Math.exp(-(t - q) / .12) : 0), 0);
	const j = .012 * A, n = (k) => (Math.sin(t * 37 + k * 2.3) + .6 * Math.sin(t * 61 + k * 1.7)) * j;
	O.you.points.visible = true;
	O.you.points.position.set(YOU_TOM[0] + n(0), YOU_TOM[1] + n(1), YOU_TOM[2] + n(2));
	O.you.points.scale.setScalar(4.2 * (1 + .12 * calm));
	O.you.set({
		a: O.tex.you,
		size: .004,
		bright: (.55 + .45 * calm + .3 * A * (.5 + .5 * Math.sin(t * 43))) * (1 + .6 * kick),
		colA: COL.you,
		colB: COL.rose,
		t,
		sparkle: .12 + .5 * A
	}, cam, ctx.H);
	const s = toDesign(YOU_TOM, cam);
	if (s[2] < 1) ctx.text.overlay.text("you", s[0] + 46, s[1] + 58, {
		size: 18,
		weight: 600,
		color: HEX.you,
		alpha: .9
	});
}
function skeletalGiven(ctx, K, t, lt) {
	const cam = ortho([
		lerp(-.1, .1, lt),
		-.05,
		0
	], "front", TOM_H, ctx.aspect), sh = TOM_SHIFT;
	const d = ease.inOutSine(seg(t, K.lGive2.start + .02, K.B(13) - .04));
	const sk = skeletal(O.lyco, [
		sh,
		0,
		0
	], LYC_S * 1.42, d, [
		1,
		.92,
		.88
	].map((v) => v * 1.3), { width: 2.8 });
	if (d < 1) dot(sk.tip, COL.white.map((v) => v * 2.5), 12);
	O.mol.points.visible = true;
	O.mol.points.position.x = sh;
	O.mol.set({
		...molState(t, K),
		morph: 0,
		t,
		revealBy: "w",
		reveal: d,
		size: .006,
		bright: .3,
		shade: 0
	}, cam, ctx.H);
	radicalsGiven(ctx, cam, K, sh);
	youGiven(ctx, cam, K);
	render(ctx, cam);
	const L = ctx.text.overlay, n = Math.floor(d * 69);
	L.text(SMILES.slice(0, n), 960, 760, {
		size: 17,
		weight: 500,
		color: "#ffc8b8",
		alpha: .9
	});
	L.text("SMILES", 960, 730, {
		size: 14,
		weight: 500,
		color: HEX.dim,
		alpha: .9
	});
	const conj = O.lyco.order.slice(0, Math.floor(d * O.lyco.order.length)).filter((b) => b.order === 2).length;
	readout(L, 1480, 150, [["lycopene", O.lyco.formula], ["C=C", `${Math.min(conj, 13)} (${Math.max(0, Math.min(11, conj - 1))} conjugated)`]], { accent: VH.tom });
	overlays(ctx, K, "skeletal formula · all-trans");
	look(ctx, { vignette: .3 });
}
function standUpGiven(ctx, K, t, lt) {
	const k = ease.inOutCubic(seg(lt, 0, K.tAnti - K.B(13))), az = lerp(0, .95, k), el = lerp(0, .32, k), r = lerp(TOM_H / 2 / Math.tan(14 * Math.PI / 180), 3.3, k);
	const tgt = [
		lerp(0, .4, k),
		lerp(-.05, -.2, k),
		0
	], cam = persp(ctx, orbit(tgt, r, az, el), tgt, { fov: lerp(28, 40, k) });
	const sh = molShiftB(t, K), ms = molState(t, K);
	O.mol.points.visible = true;
	O.mol.points.position.x = sh;
	O.mol.set({
		...ms,
		t,
		size: .011,
		bright: .26,
		shade: .75 * ms.morph,
		rim: .5,
		focus: r,
		aperture: .012 * k,
		maxBlur: 20
	}, cam, ctx.H);
	if (k < 1) skeletal(O.lyco, [
		sh,
		0,
		0
	], LYC_S * 1.42, 1, [
		1,
		.92,
		.88
	].map((v) => v * 1.3 * (1 - k)), { width: 2.8 });
	radicalsGiven(ctx, cam, K, sh);
	youGiven(ctx, cam, K);
	render(ctx, cam);
	readout(ctx.text.overlay, 1480, 150, [["lycopene", O.lyco.formula], ["M", `${O.lyco.mass.toFixed(2)} g/mol`]], { accent: VH.tom });
	overlays(ctx, K);
	look(ctx);
}
function antioxGiven(ctx, K, t, lt) {
	const az = .95 + lt * .12, el = .32, r = 3.3, tgt = [
		.4,
		-.2,
		0
	];
	const cam = persp(ctx, orbit(tgt, r, az, el), tgt, { fov: 40 });
	const glow = radicalsGiven(ctx, cam, K, 0), e = hit(t, K.tAnti);
	O.mol.points.visible = true;
	O.mol.set({
		...molState(t, K),
		t,
		size: .011,
		bright: .22 * (1 + 3 * e),
		shade: .75,
		rim: .5,
		focus: r,
		aperture: .012,
		maxBlur: 20,
		glow
	}, cam, ctx.H);
	youGiven(ctx, cam, K);
	const thermal = t >= K.quench[2] && t < K.quench[3];
	if (thermal) {
		O.lines.mesh.visible = true;
		O.lines.end(ctx);
		const tex = capture(ctx, (sub) => sub.draw(O.scene, cam));
		view(ctx, tex, "thermal", { gain: 1.1 });
	} else render(ctx, cam);
	const L = ctx.text.scene, word = "ANTIOXIDANTS", q0 = K.quench[0], e0 = toDesign(molAtom(3), cam), e1 = toDesign(molAtom(28), cam), [A0, A1] = e0[0] <= e1[0] ? [e0, e1] : [e1, e0];
	const ang = Math.atan2(A1[1] - A0[1], A1[0] - A0[0]), up = [Math.sin(ang), -Math.cos(ang)], hitS = toDesign(molAtom(TOM_ATOMS[0]), cam);
	const len = Math.hypot(A1[0] - A0[0], A1[1] - A0[1]), size = clamp(len / 12 * 1.05, 44, 82);
	[...word].forEach((ch, j) => {
		const f = (j + .5) / 12, x = lerp(A0[0], A1[0], f) + up[0] * size * 1.1, y = lerp(A0[1], A1[1], f) + up[1] * size * 1.1;
		const dd = Math.hypot(x - hitS[0], y - hitS[1]) / len, on = seg(t, q0 + dd * .35 - .02, q0 + dd * .35 + .06);
		if (on <= 0) return;
		L.text(ch, x, y, {
			size,
			weight: 800,
			color: "#fff3ee",
			glow: 18,
			glowColor: VH.tom,
			alpha: on,
			scale: .85 + .15 * on,
			rot: ang
		});
	});
	const n = K.quench.filter((q) => t >= q).length;
	readout(ctx.text.overlay, 1480, 820, [["you · ROO•", String(K.quench.length - n)], ["me · antiox", `${Math.round(100 * (1 - n / K.quench.length))} %`]], { accent: VH.tom });
	overlays(ctx, K, thermal ? "thermal · ΔT from the quench" : null);
	if (thermal) Object.assign(ctx.post, {
		tonemap: 2,
		bloom: .15,
		ca: 0
	});
	else {
		look(ctx);
		accent(ctx, K.tAnti, [
			1,
			.55,
			.45
		], {
			x: hitS[0],
			y: hitS[1],
			spill: .45
		});
	}
}
/** The state of the box over the block: fringe visibility, the relative phase (shown slowed), the dead amplitude. */
function psiState(t, K) {
	const V = ease.inOutSine(seg(t, K.lCat.start + .15, K.wTabby.start + .15)) * (1 - seg(t, K.tEnj, K.tEnj + .08));
	const ph = t > K.lPurr.start ? TAU * PURR_HZ / SLOW * (t - K.lPurr.start) : 0;
	return {
		a: PSI.a,
		d: PSI.d,
		sigma: PSI.sigma,
		k: PSI.k,
		phase: ph + .6,
		V,
		dAmp: 1 - ease.inCubic(seg(t, K.tEnj, K.tEnj + .16))
	};
}
/** The sandbox cube (half-size h) with its lid hinged at the back edge and opened by `lid` radians. */
function box(h, col, width, lid = 0) {
	const L = O.lines, c = [
		[
			-h,
			-h,
			-h
		],
		[
			h,
			-h,
			-h
		],
		[
			h,
			-h,
			h
		],
		[
			-h,
			-h,
			h
		]
	];
	const top = [
		[
			-h,
			h,
			-h
		],
		[
			h,
			h,
			-h
		],
		[
			h,
			h + 2 * h * Math.sin(lid),
			-h + 2 * h * Math.cos(lid)
		],
		[
			-h,
			h + 2 * h * Math.sin(lid),
			-h + 2 * h * Math.cos(lid)
		]
	];
	const hw = [[
		-h,
		h,
		h
	], [
		h,
		h,
		h
	]];
	for (let i = 0; i < 4; i++) L.segment(c[i], c[(i + 1) % 4], {
		color: col,
		width
	});
	L.segment(c[0], [
		-h,
		h,
		-h
	], {
		color: col,
		width
	});
	L.segment(c[1], [
		h,
		h,
		-h
	], {
		color: col,
		width
	});
	L.segment(c[2], hw[1], {
		color: col,
		width
	});
	L.segment(c[3], hw[0], {
		color: col,
		width
	});
	if (lid > .02) L.segment(hw[0], hw[1], {
		color: col,
		width
	});
	for (let i = 0; i < 4; i++) L.segment(top[i], top[(i + 1) % 4], {
		color: col,
		width
	});
}
function blochSphere(col, width, phi, o = {}) {
	const L = O.lines, r = o.r ?? 1, X = [
		1,
		0,
		0
	], Y = [
		0,
		1,
		0
	], Z = [
		0,
		0,
		1
	], c0 = [
		0,
		0,
		0
	];
	L.polyline(polyCircle(c0, r, X, Z, 128), {
		color: col.map((v) => v * .9),
		width: width * .8
	});
	L.polyline(polyCircle(c0, r, X, Y, 128), {
		color: col.map((v) => v * .45),
		width: width * .6
	});
	L.polyline(polyCircle(c0, r, Z, Y, 128), {
		color: col.map((v) => v * .45),
		width: width * .6
	});
	for (const s of [-1, 1]) L.polyline(polyCircle([
		0,
		s * r * .5,
		0
	], r * .866, X, Z, 96), {
		color: col.map((v) => v * .25),
		width: width * .45
	});
	L.segment([
		0,
		-r * 1.25,
		0
	], [
		0,
		r * 1.25,
		0
	], {
		color: col.map((v) => v * .6),
		width: width * .7
	});
	L.segment([
		-r * 1.2,
		0,
		0
	], [
		r * 1.2,
		0,
		0
	], {
		color: col.map((v) => v * .35),
		width: width * .5
	});
	L.segment([
		0,
		0,
		-r * 1.2
	], [
		0,
		0,
		r * 1.2
	], {
		color: col.map((v) => v * .35),
		width: width * .5
	});
	const v = [
		Math.cos(phi) * r,
		0,
		-Math.sin(phi) * r
	], acc = o.acc ?? V.cat;
	L.segment(c0, v, {
		color: acc.map((x) => x * 2),
		width: width * 1.8
	});
	dot([
		v[0] * 1.06,
		0,
		v[2] * 1.06
	], acc.map((x) => x * 2.4), 16);
	const trail = [];
	for (let i = 0; i <= 24; i++) {
		const a = phi - i / 24 * 1.2;
		trail.push([
			Math.cos(a) * r,
			0,
			-Math.sin(a) * r
		]);
	}
	for (let i = 1; i < trail.length; i++) L.segment(trail[i - 1], trail[i], {
		color: acc.map((x) => x * 1.6 * (1 - i / trail.length)),
		width: width * 1.5
	});
	return v;
}
/** The 25 Hz purr as a scope trace (the last 200 ms: five periods), 40 ms divisions. */
function scopeTrace(L, t, x, y, w, h, o = {}) {
	const span = .2, n = 260, A = h * .38;
	L.draw((g) => {
		g.globalAlpha *= o.alpha ?? .9;
		g.strokeStyle = o.grid ?? HEX.dim;
		g.lineWidth = 1;
		g.strokeRect(x + .5, y + .5, w, h);
		g.globalAlpha *= .5;
		g.beginPath();
		for (let k = 1; k < 5; k++) {
			g.moveTo(x + k * w / 5, y);
			g.lineTo(x + k * w / 5, y + h);
		}
		g.moveTo(x, y + h / 2);
		g.lineTo(x + w, y + h / 2);
		g.stroke();
		g.globalAlpha *= 2;
		g.strokeStyle = o.color ?? VH.cat;
		g.lineWidth = 1.8;
		g.beginPath();
		for (let i = 0; i <= n; i++) {
			const tau = t - span + span * i / n, v = Math.sin(TAU * PURR_HZ * tau) * (.85 + .15 * Math.sin(TAU * 1.9 * tau));
			const px = x + w * i / n, py = y + h / 2 - v * A;
			i ? g.lineTo(px, py) : g.moveTo(px, py);
		}
		g.stroke();
	});
	L.text("40 ms / div", x + w - 6, y + h + 18, {
		size: 14,
		weight: 500,
		align: "right",
		color: o.grid ?? HEX.dim,
		alpha: .9
	});
}
/** The experiment's clock: one half-life (60 min) passes between "If I'm a tabby cat" and the measurement. */
var expMin = (t, K) => 60 * (t - K.lCat.start) / (K.tEnj - K.lCat.start);
var YOU_R = CAT.you.r;
var CAT_N = 1 << 18;
var CAT_LIGHT = [
	-.45,
	.8,
	.5
];
var CAT_AT = [
	-.55,
	.22,
	-.1
];
var TAIL_FROM = .6;
var norm3 = (v) => {
	const l = Math.hypot(...v);
	return v.map((x) => x / l);
};
var BREATH = {
	beats: 6,
	rise: .038
};
var RIPPLE = {
	len: .085,
	hz: 5,
	depth: .3,
	lift: .007,
	reach: .9
};
var TK = null;
/** Key times of the tabby block (remake). The key word's events happen on the cut the edit gives its shot. */
function tabbyKeys(ctx) {
	const T = ctx.T, K = keys(T);
	if (TK?.T === T) return TK;
	const hitAt = (k) => T.onsetNear("drums", K.B(k), .06) ?? K.B(k);
	return TK = {
		T,
		K,
		tEnj: ctx.startOf("v2/enjoyment") ?? K.tEnj,
		stripes: [K.wTabby.start, K.wCat.start + .22],
		purr: hitAt(20),
		got: hitAt(20.5),
		twitch: [K.B(18.25), K.B(23.3)]
	};
}
/** The cat at t: b (how far the ribcage stands out, 0..1), purr (its strength, 0..1), ears (flick angles), tail (curl). */
function catLife(t, TK) {
	const K = TK.K, u = ((t - TK.purr) / (BREATH.beats * K.beat) % 1 + 1) % 1;
	const on = ease.outCubic(seg(t, TK.purr, TK.purr + .3));
	const flick = (t0) => {
		const k = seg(t, t0, t0 + .2);
		return k > 0 && k < 1 ? Math.sin(k * Math.PI) ** 2 * Math.cos(k * 7) : 0;
	};
	return {
		b: breath(u),
		purr: on * (.85 + .15 * Math.cos(TAU * u)),
		ears: [.45 * flick(TK.twitch[0]), .4 * flick(TK.twitch[1])],
		tail: .16 * Math.sin(TAU * (t - K.lCat.start) / (K.beat * 5))
	};
}
/** The cat is made when a shot first draws it (four seconds: an edit that does not show it should not wait for it). */
function makeCat() {
	const S = catShape(CAT_N), tailAt = CAT.tail[Math.round((CAT.tail.length - 1) * TAIL_FROM)];
	O.cat = new Fur(S, CAT_N, bakeLight(S, CAT_N, catSDF, norm3(CAT_LIGHT)), {
		ears: CAT.ears,
		tail: {
			pivot: tailAt,
			from: TAIL_FROM
		}
	});
	O.youCat = new Swarm({
		count: O.you.N,
		bands: true
	});
	O.scene.add(...O.cat.objects, O.youCat.points);
}
/**
* me (the cat) and you, and the purr between them. o: focus, aperture (depth of field), bright.
* → { life, grow (you's size), you (world, its centre) }
*/
function drawCat(ctx, cam, TK, o = {}) {
	if (!O.cat) makeCat();
	const t = ctx.t, L = O.lines, life = catLife(t, TK);
	const enj = ease.outCubic(seg(t, TK.tEnj, TK.tEnj + .35)), e = hit(t, TK.tEnj);
	const th = CAT.throat, d0 = Math.hypot(th[0], th[1] - YOU_R, th[2]), kR = TAU / RIPPLE.len, wR = TAU * RIPPLE.hz;
	const front = Math.max(0, t - TK.purr) * (d0 - YOU_R) / (TK.got - TK.purr);
	const got = ease.outCubic(seg(t, TK.got, TK.got + .6)), kg = seg(t, TK.got, TK.got + .34), kick = kg > 0 && kg < 1 ? (1 - kg) ** 2 : 0;
	const grow = (1 + .06 * got + .18 * kick) * (1 + .15 * enj), you = O.youCat, yc = [
		0,
		YOU_R * grow,
		0
	], sc = YOU_R / .035 * grow;
	const ripple = {
		o: th,
		k: kR,
		phase: wR * (t - TK.purr),
		front
	};
	you.points.visible = true;
	you.points.position.set(...yc);
	you.points.scale.setScalar(sc);
	you.set({
		a: O.tex.you,
		size: .0062 * (1 + .5 * enj),
		bright: (.5 + .45 * got + .4 * kick) * (1 + 1.3 * enj) * (1 + 3 * e),
		colA: COL.you,
		colB: COL.rose,
		sparkle: .3,
		t: t - TK.purr - kR * d0 / wR,
		sine: [
			RIPPLE.lift * 1.6 * got * life.purr / sc,
			kR * sc,
			wR
		],
		bands: {
			...ripple,
			depth: .75 * life.purr
		},
		noise: 3e-4 * got * life.purr,
		noiseFreq: 60,
		noiseSpeed: 14,
		focus: o.focus,
		aperture: o.aperture ?? 0,
		maxBlur: 24
	}, cam, ctx.H);
	O.cat.visible = true;
	O.cat.set({
		t,
		light: CAT_LIGHT,
		bright: o.bright,
		key: 1.3 * (1 - .38 * got),
		amb: .1 * (1 - .3 * got),
		stripes: seg(t, TK.stripes[0], TK.stripes[1]),
		breath: BREATH.rise * life.b,
		purr: life.purr,
		ripple: {
			...ripple,
			depth: RIPPLE.depth * life.purr,
			lift: RIPPLE.lift * life.purr,
			reach: RIPPLE.reach
		},
		you: {
			c: yc,
			col: COL.you,
			i: (.4 + .8 * got + .3 * kick + .9 * enj) * (1 + 1.2 * e),
			reach: .5
		},
		ears: life.ears,
		tail: life.tail,
		focus: o.focus,
		aperture: o.aperture ?? 0
	}, cam, ctx.H);
	for (const [a, b] of WHISKERS) if (Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]) > .12) L.segment(a, b, {
		color: COL.white.map((v) => v * .55),
		width: 1.5
	});
	if (kg > 0 && kg < 1) L.polyline(polyCircle([
		0,
		.015,
		0
	], YOU_R * grow + .24 * ease.outCubic(kg), [
		1,
		0,
		0
	], [
		0,
		0,
		1
	], 72), {
		color: COL.you.map((v) => v * 1.2 * (1 - kg) ** 2),
		width: 2.4
	});
	return {
		life,
		grow,
		you: yc
	};
}
/** The purr on a scope: five periods of the 25 Hz wave, triggered (it stands still, as on a scope); its height is the purr's strength. */
function purrScope(L, x, y, w, h, amp) {
	const n = 240, A = h * .4 * amp;
	L.draw((g) => {
		g.globalAlpha *= .9;
		g.strokeStyle = HEX.dim;
		g.lineWidth = 1;
		g.strokeRect(x + .5, y + .5, w, h);
		g.globalAlpha *= .5;
		g.beginPath();
		for (let k = 1; k < 5; k++) {
			g.moveTo(x + k * w / 5, y);
			g.lineTo(x + k * w / 5, y + h);
		}
		g.moveTo(x, y + h / 2);
		g.lineTo(x + w, y + h / 2);
		g.stroke();
		g.globalAlpha *= 2;
		g.strokeStyle = HEX.me;
		g.lineWidth = 1.8;
		g.beginPath();
		for (let i = 0; i <= n; i++) {
			const px = x + w * i / n, py = y + h / 2 - Math.sin(5 * TAU * i / n) * A;
			i ? g.lineTo(px, py) : g.moveTo(px, py);
		}
		g.stroke();
	});
	L.text("40 ms / div", x + w - 6, y + h + 18, {
		size: 14,
		weight: 500,
		align: "right",
		color: HEX.dim,
		alpha: .9
	});
}
function purrPanel(ctx, life) {
	const L = ctx.text.overlay;
	readout(L, 1400, 150, [
		["purr", "25 Hz"],
		["breath", `${Math.round(60 / (BREATH.beats * keys(ctx.T).beat))} / min`],
		["to", "you"]
	], { accent: HEX.me });
	purrScope(L, 1400, 232, 380, 96, .06 + .94 * life.purr);
}
function haloSpin(t, K) {
	return [
		0,
		1,
		2,
		3
	].map((c) => [...HALO.axes[c], [
		.12,
		-.3,
		.26,
		.09
	][c] * (t - K.lGod.start - .445)]);
}
function meState(t, K) {
	const tx = O.tex;
	if (t < K.tEnj) return {
		a: tx.psi,
		b: tx.psi,
		morph: 0,
		size: .0048,
		bright: .42,
		psi: psiState(t, K),
		noise: 0,
		sparkle: .1
	};
	if (t < K.lGod.start) {
		const m = ease.inOutCubic(seg(t, K.tEnj + .03, K.tEnj + .36));
		return {
			a: tx.psi,
			b: tx.peak,
			morph: m,
			spread: .3,
			arc: .02,
			size: lerp(.0048, .0026, m),
			bright: lerp(.42, .5, m),
			psi: psiState(t, K),
			noise: 0,
			sparkle: .15
		};
	}
	if (t < K.wProof.start) {
		const m = ease.inOutCubic(seg(t, K.lGod.start + .04, K.lGod.start + .85));
		return {
			a: tx.peak,
			b: tx.halo,
			morph: m,
			spread: .2,
			arc: .015,
			size: lerp(.0026, .004, m),
			bright: lerp(.5, .32, m),
			spin: haloSpin(t, K),
			noise: 0
		};
	}
	if (t < K.B(31.5) - .1) {
		const m = ease.inOutCubic(seg(t, K.wProof.start + .01, K.wProof.start + .45));
		return {
			a: tx.halo,
			b: tx.exists,
			morph: m,
			spread: .55,
			arc: .06,
			spin: haloSpin(t, K),
			spinA: true,
			size: .07 * (QED.size / .07) ** m,
			bright: .34 * (QED.bright * EXI_K / .34) ** m,
			variance: 1 - m,
			noise: 0,
			sparkle: QED.sparkle
		};
	}
	{
		const m = ease.inOutCubic(seg(t, K.B(31.5) - .1, K.end - .04));
		return {
			a: tx.exists,
			b: tx.qed,
			morph: m,
			spread: .12,
			size: QED.size,
			bright: QED.bright * lerp(EXI_K, 1, m),
			variance: 0,
			noise: 0,
			sparkle: QED.sparkle
		};
	}
}
var cosmicK = (t, K) => ease.inOutCubic(seg(t, K.lGod.start + .02, K.B(26) + .05));
function drawMe(ctx, cam, K, o = {}, hPx = ctx.H) {
	const st = meState(ctx.t, K), me = O.me;
	me.points.visible = true;
	if (o.scale) me.points.scale.setScalar(o.scale);
	me.set({
		sparkle: .15,
		shade: 0,
		rim: 0,
		noise: .0012,
		noiseFreq: 4,
		...st,
		t: ctx.t,
		...o,
		bright: o.bright ?? st.bright,
		size: o.size ?? st.size
	}, cam, hPx);
	return st;
}
/** The flat skeletal copy of a ball-and-stick sampling: each particle moves onto its bond (or atom) in the 2D formula. */
function flatten(bs, mol, scale2) {
	const N = bs.pos.length / 4, S = alloc(N), A = mol.atoms, r = rng(121);
	const q2 = (i) => {
		if (A[i].q) return A[i].q;
		const b = mol.bonds.find((b) => b.a === i || b.b === i);
		return A[b.a === i ? b.b : b.a].q;
	};
	const segs = mol.bonds.map((b) => ({
		b,
		pa: A[b.a].p,
		pb: A[b.b].p
	}));
	for (let n = 0; n < N; n++) {
		const p = [
			bs.pos[n * 4] / scale2,
			bs.pos[n * 4 + 1] / scale2,
			bs.pos[n * 4 + 2] / scale2
		];
		let best = null, bd = 1e9;
		for (const s of segs) {
			const ab = [
				s.pb[0] - s.pa[0],
				s.pb[1] - s.pa[1],
				s.pb[2] - s.pa[2]
			], ap = [
				p[0] - s.pa[0],
				p[1] - s.pa[1],
				p[2] - s.pa[2]
			];
			const tt = clamp((ab[0] * ap[0] + ab[1] * ap[1] + ab[2] * ap[2]) / (ab[0] ** 2 + ab[1] ** 2 + ab[2] ** 2));
			const d = Math.hypot(ap[0] - ab[0] * tt, ap[1] - ab[1] * tt, ap[2] - ab[2] * tt);
			if (d < bd) {
				bd = d;
				best = {
					s,
					tt
				};
			}
		}
		const qa = q2(best.s.b.a), qb = q2(best.s.b.b);
		S.pos.set([
			(lerp(qa[0], qb[0], best.tt) + (r() - .5) * .08) * scale2 * 1.42,
			(lerp(qa[1], qb[1], best.tt) + (r() - .5) * .08) * scale2 * 1.42,
			(r() - .5) * .004,
			bs.pos[n * 4 + 3]
		], n * 4);
		S.col.set(bs.col.subarray(n * 4, n * 4 + 4), n * 4);
	}
	return S;
}
/** ∃ and ∎ in the halo's object space (the ground plane under the proof camera, divided by the halo scale). */
var glyphWorld = (u, v) => [
	(GLYPH_C[0] + u * GLYPH_H / 2) / SC,
	0,
	(GLYPH_C[2] - v * GLYPH_H / 2) / SC
];
/**
* Re-order target points so that a morph from `src` is a coherent expansion or contraction: both sets are sorted by
* azimuth about their own centres (in the xz plane) and paired rank by rank, then by radius inside blocks of 512.
*/
function pairByAngle(src, dst, N, cs = [0, 0], cd = [0, 0], extra = []) {
	const sA = new Float64Array(N), sR = new Float64Array(N), dA = new Float64Array(N), dR = new Float64Array(N);
	for (let i = 0; i < N; i++) {
		const sx = src.pos[i * 4] - cs[0], sz = src.pos[i * 4 + 2] - cs[1], dx = dst.pos[i * 4] - cd[0], dz = dst.pos[i * 4 + 2] - cd[1];
		sA[i] = Math.atan2(sz, sx);
		sR[i] = Math.hypot(sx, sz);
		dA[i] = Math.atan2(dz, dx);
		dR[i] = Math.hypot(dx, dz);
	}
	const si = Array.from({ length: N }, (_, i) => i).sort((a, b) => sA[a] - sA[b]);
	const di = Array.from({ length: N }, (_, i) => i).sort((a, b) => dA[a] - dA[b]);
	const outs = [dst, ...extra].map(() => alloc(N));
	for (let s = 0; s < N; s += 512) {
		const sb = si.slice(s, s + 512).sort((a, b) => sR[a] - sR[b]), db = di.slice(s, s + 512).sort((a, b) => dR[a] - dR[b]);
		sb.forEach((a, k) => {
			const d = db[k];
			[dst, ...extra].forEach((X, m) => {
				for (const f of [
					"pos",
					"col",
					"nrm"
				]) for (let j = 0; j < 4; j++) outs[m][f][a * 4 + j] = X[f][d * 4 + j];
			});
		});
	}
	return outs;
}
chapter({
	id: "v2",
	from: (T) => T.section("v2").start,
	to: (T) => T.section("pre2").start,
	init(ctx) {
		O = {
			scene: new Scene(),
			persp: newCamera(38),
			ortho: new OrthographicCamera(-1, 1, 1, -1, .01, 200)
		};
		O.me = new Cloud({ count: 1 << 18 });
		O.mol = new Cloud({ count: 65536 });
		O.word = new Cloud({ count: 65536 });
		O.you = new Swarm({ count: 4096 });
		O.stars = new Swarm({ count: 16384 });
		O.lines = new GlowLines(16e3);
		O.gf = new GlyphField({ count: 16384 });
		O.gf.text("v2/eggplant-src", calligramText(source("ch/v2/food.js")));
		const cal = O.gf.layout("v2/calligram", codeFill(O.gf, calligramInside, CALLIGRAM));
		const nm = wordMask("NUTRIENTS", {
			height: .5,
			tracking: 30
		});
		const word = O.gf.layout("v2/nutrients", codeFill(O.gf, nm.inside, {
			center: [
				.6,
				SANKEY.Y0,
				.01
			],
			cell: .05,
			width: nm.width + .1,
			height: .6
		}));
		O.flow = new FlowGlyphs(O.gf, cal, word);
		O.record = new GlyphField({ count: 4096 });
		O.record.text("v2/usda-record", USDA_RECORD);
		O.tex0 = { record: O.record.layout("v2/usda-wall2", codeBlock(O.record, {
			origin: [
				-.9,
				2.3 + SANKEY.Y0,
				-3.4
			],
			cell: .115,
			cols: 60
		})) };
		O.rib = new Ribbons();
		O.fan = new SpectrumFan(PRISM, SCREEN_X, OFF);
		O.lyco = lycopene();
		let lycoBS = null;
		const lycoGen = (N) => lycoBS ??= ballStick(N, O.lyco, {
			scale: LYC_S,
			tint: [
				1.05,
				.9,
				.85
			],
			seed: 141
		});
		let PK = null;
		const pk = (N) => PK ??= peakShape(N);
		let HL = null;
		const hl = (N) => HL ??= pairByAngle(pk(N), halo(N), N, [PSI.a[0], PSI.a[2]])[0];
		let EQ = null;
		const eq = (N) => EQ ??= pairByAngle(hl(N), glyphPoints(N, "exists", {
			toWorld: glyphWorld,
			lum: true
		}), N, [0, 0], [GLYPH_C[0] / SC, GLYPH_C[2] / SC], [glyphPoints(N, "qed", {
			toWorld: glyphWorld,
			lum: true
		})]);
		const wm = wordMask("EXISTENCE", {
			height: .19,
			tracking: 32
		}), wx = GLYPH_C[0] + (.4 + 118 / 691) * GLYPH_H + wm.width / 2;
		const wordTo = (x, y) => [
			wx + x,
			.002,
			GLYPH_C[2] - y
		];
		let WD = null;
		const wd = (N) => WD ??= wordPoints(N, "EXISTENCE", {
			col: [
				1,
				.8,
				.5
			],
			height: .19,
			tracking: 32,
			toWorld: wordTo
		});
		O.tex = {
			psi: O.me.shape("v2/psi", (N) => psiShape(N)),
			peak: O.me.shape("v2/peak", pk),
			halo: O.me.shape("v2/halo-from-peak", hl),
			exists: O.me.shape("v2/glyph-exists2", (N) => eq(N)[0]),
			qed: O.me.shape("v2/glyph-qed2", (N) => eq(N)[1]),
			lyco: O.mol.shape("v2/lycopene", lycoGen),
			lycoFlat: O.mol.shape("v2/lycopene-flat", (N) => flatten(lycoGen(N), O.lyco, LYC_S)),
			word: O.word.shape("v2/word-existence2", wd),
			dust: O.word.shape("v2/word-dust2", (N) => {
				const S = wd(N), D = alloc(N), r = rng(201);
				D.col.set(S.col);
				D.nrm.set(S.nrm);
				for (let i = 0; i < N; i++) {
					const a = r() * TAU, rr = .4 + 1.6 * r();
					D.pos.set([
						S.pos[i * 4] + Math.cos(a) * rr,
						(r() - .5) * .4,
						S.pos[i * 4 + 2] + Math.sin(a) * rr,
						S.pos[i * 4 + 3]
					], i * 4);
				}
				return D;
			}),
			stars: O.stars.shape("v2/stars", (N) => shapes.stars(N, {
				r0: 30,
				r1: 90
			})),
			you: O.you.shape("v2/you", (N) => shapes.ball(N, { r: .035 }))
		};
		O.cells = 0;
		for (let i = 0; i < O.gf.N; i++) if (cal.image.data[i * 4 + 2] > -1e4) O.cells++;
		O.scene.add(O.record.points, O.stars.points, O.rib.mesh, O.fan.fan, O.fan.band, O.me.points, O.mol.points, O.word.points, O.you.points, O.flow.points, O.lines.mesh);
	},
	shots: [
		{
			id: "cell",
			at: (T) => keys(T).s0,
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T), t = ctx.t, lt = t - K.s0;
				reset();
				const k = ease.outCubic(seg(lt, 0, 1.7)), z = lerp(2.95, 2.62, k), x = lerp(.35, -.35, ease.inOutSine(seg(lt, .1, .95)));
				const h = ease.inOutSine(seg(lt, 0, .45)), pos = [
					x,
					lerp(.3, .38, k),
					z
				], at = [
					x * .55 - .3,
					.28,
					0
				];
				const cam = persp(ctx, pos.map((v, i) => lerp(C1_END.pos[i], v, h)), at.map((v, i) => lerp(C1_END.at[i], v, h)), { fov: lerp(62, 57, k) });
				cells(1 - .6 * seg(t, K.wEgg.start - .2, K.B(2)), ease.inOutSine(seg(lt, .04, .5)));
				O.flow.points.visible = true;
				O.flow.set({
					morph: 0,
					reveal: 1.02 * ease.inOutSine(seg(t, K.s0 + .06, K.wEgg.start + .1)),
					soft: .03,
					size: CAL_SIZE,
					bright: .95,
					palette: SYN_EGG,
					t
				}, cam, ctx.H);
				render(ctx, cam);
				newLine(ctx, K, 0, K.lEgg.start);
				readout(ctx.text.overlay, 1480, 150, [
					["instance", "me"],
					["class", "Eggplant"],
					["extends", "Solanum"]
				], { accent: VH.egg });
				overlays(ctx, K);
				look(ctx);
			}
		},
		{
			id: "calligram",
			at: (T) => keys(T).B(2),
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T), t = ctx.t, lt = t - K.B(2);
				reset();
				const k = ease.inOutSine(seg(lt, 0, K.lGive.start - K.B(2))), cam = ortho([
					lerp(.05, -.55, k),
					lerp(0, .32, k),
					0
				], "front", lerp(3.1, 2.5, k), ctx.aspect);
				O.flow.points.visible = true;
				O.flow.set({
					morph: 0,
					size: CAL_SIZE,
					bright: .95,
					palette: SYN_EGG,
					t
				}, cam, ctx.H);
				render(ctx, cam);
				readout(ctx.text.overlay, 1480, 150, [
					["chars", String(O.cells)],
					["cell", ".05 × .03"],
					["font", "JetBrains Mono"]
				], { accent: VH.egg });
				overlays(ctx, K, "codeFill · calligram");
				look(ctx, { vignette: .3 });
			}
		},
		{
			id: "decompile",
			at: (T) => keys(T).lGive.start,
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T), t = ctx.t, lt = t - K.lGive.start;
				reset();
				const cam = SANKEY_CAM(ctx), fp = flowParams(t, K);
				dataWall(ctx, cam, { bright: .05 * seg(lt, .1, .5) });
				O.flow.points.visible = true;
				O.flow.set(fp, cam, ctx.H);
				O.rib.set(.1 * seg(lt, .2, .6), ease.inOutSine(seg(lt, .1, .6)));
				sankeyNodes(ctx, cam, K, { absorbed: 0 });
				render(ctx, cam);
				sankeyLabels(ctx, cam, K, {
					from: K.lGive.start + .35,
					alpha: seg(lt, .3, .5)
				});
				readout(ctx.text.overlay, 1500, 880, [["decompile", `${Math.round(fp.morph * 100)} %`], ["chars", String(O.cells)]], { accent: VH.egg });
				overlays(ctx, K, "Sankey · width ∝ % daily value");
				look(ctx);
			}
		},
		{
			id: "sankey",
			at: (T) => keys(T).wGive.start,
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T), t = ctx.t, lt = t - K.wGive.start;
				reset();
				const k = ease.inOutSine(seg(lt, 0, K.tNut - K.wGive.start)), cam = persp(ctx, [
					lerp(-.05, .35, k),
					lerp(.12, -.04, k),
					lerp(7.3, 6.5, k)
				], [
					lerp(.05, .45, k),
					0,
					0
				], { fov: 30 });
				const fp = flowParams(t, K);
				dataWall(ctx, cam);
				O.flow.points.visible = true;
				O.flow.set(fp, cam, ctx.H);
				O.rib.set(.1, 1);
				sankeyNodes(ctx, cam, K, { absorbed: .15 });
				render(ctx, cam);
				sankeyLabels(ctx, cam, K, { from: K.lGive.start + .35 });
				const dv = SANKEY.bands.reduce((s, B) => s + B.dv, 0);
				readout(ctx.text.overlay, 1500, 880, [
					["per 100 g", "25 kcal"],
					["Σ bands", `${Math.round(dv * 100)} % DV`],
					["me → you", "streaming"]
				], { accent: VH.egg });
				overlays(ctx, K, "Sankey · width ∝ % daily value");
				look(ctx);
			}
		},
		{
			id: "nutrients",
			at: (T) => keys(T).tNut,
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T), t = ctx.t, lt = t - K.tNut;
				reset();
				if (remade(ctx)) return nutrientsGiven(ctx, K, t, lt);
				const k = ease.outCubic(seg(lt, 0, .6)), cam = persp(ctx, [
					lerp(.35, .2, k),
					lerp(-.04, .02, k),
					lerp(6.5, 6.9, k)
				], [
					lerp(.45, .2, k),
					0,
					0
				], { fov: 30 });
				const fp = flowParams(t, K), e = hit(t, K.tNut);
				dataWall(ctx, cam, { bright: .05 * (1 - seg(lt, .1, .4)) });
				O.flow.points.visible = true;
				O.flow.set({
					...fp,
					bright: 1 + 1.6 * e
				}, cam, ctx.H);
				O.rib.set(.1 * (1 - seg(lt, .1, .45)), 1, fp.fc.drained);
				sankeyNodes(ctx, cam, K, {
					absorbed: fp.fc.drained,
					hit: e
				});
				render(ctx, cam);
				sankeyLabels(ctx, cam, K, {
					from: -1,
					alpha: 1 - seg(lt, 0, .15),
					table: 1 - seg(lt, .1, .4)
				});
				look(ctx);
				{
					const q = toDesign([
						SANKEY.xR + .5,
						SANKEY.Y0,
						0
					], cam);
					accent(ctx, K.tNut, [
						1,
						.7,
						.4
					], {
						x: q[0],
						y: q[1]
					});
				}
				readout(ctx.text.overlay, 1500, 880, [["you.absorb", `${Math.round(fp.fc.drained * 100)} %`], ["compiled", "NUTRIENTS"]], { accent: HEX.you });
				overlays(ctx, K);
			}
		},
		{
			id: "prism",
			at: (T) => keys(T).lTom.start,
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T), lt = ctx.t - K.lTom.start;
				reset();
				const a = -.12 + lt * .1, cam = persp(ctx, [
					.15 + 5.6 * Math.sin(a),
					-.45 + .4,
					5.6 * Math.cos(a)
				], [
					.15,
					-.45,
					0
				], { fov: 36 });
				bench(ctx, K, { draw: ease.outCubic(seg(lt, .02, .45)) });
				render(ctx, cam);
				newLine(ctx, K, 1, K.lTom.start);
				readout(ctx.text.overlay, 1480, 150, [
					["glass", "SF11 · n_d 1.785"],
					["deviation", "64.7° … 74.1°"],
					["λ", "400 – 700 nm"]
				], { accent: VH.tom });
				overlays(ctx, K, "n(λ) = 1.739 + 0.0159 / λ²");
				look(ctx);
			}
		},
		{
			id: "absorb",
			at: (T) => keys(T).B(10),
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T), t = ctx.t, lt = t - K.B(10), c = conc(t, K);
				reset();
				const k = ease.inOutCubic(seg(lt, .08, .42)), P0 = [
					.55,
					-.45,
					5.3
				], P1 = [
					1.95,
					-1.3,
					1.5
				], T0 = [
					.55,
					-.6,
					0
				], T1 = [
					3.25,
					-1.4,
					0
				];
				const cam = persp(ctx, [
					0,
					1,
					2
				].map((i) => lerp(P0[i], P1[i], k)), [
					0,
					1,
					2
				].map((i) => lerp(T0[i], T1[i], k)), { fov: lerp(36, 34, k) });
				const { tr } = bench(ctx, K, {
					c,
					cell: seg(lt, 0, .2)
				});
				render(ctx, cam);
				const L = ctx.text.overlay, pa = seg(lt, .05, .2);
				absPanel(L, t, c, 1250, 170, 540, 170, { alpha: pa });
				const sw = `rgb(${tr.rgb.map((v) => Math.round(255 * v ** (1 / 2.2))).join(",")})`;
				L.draw((g) => {
					g.globalAlpha *= pa;
					g.fillStyle = sw;
					g.fillRect(1250, 430, 70, 38);
					g.strokeStyle = "#ffffff";
					g.globalAlpha *= .5;
					g.lineWidth = 1;
					g.strokeRect(1250.5, 430.5, 70, 38);
				});
				L.text("transmitted", 1336, 441, {
					size: 18,
					weight: 600,
					align: "left",
					color: "#ffe6dc",
					alpha: pa
				});
				L.text(tr.hex, 1336, 463, {
					size: 18,
					weight: 600,
					align: "left",
					color: sw,
					alpha: pa
				});
				readout(L, 1250, 510, [["A(472)", c.toFixed(1)], ["T(472)", transmit(472, c).toExponential(1)]], { accent: VH.tom });
				overlays(ctx, K, "lycopene · 444 · 472 · 503 nm");
				look(ctx);
			}
		},
		{
			id: "skeletal",
			at: (T) => keys(T).lGive2.start,
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T), t = ctx.t, lt = t - K.lGive2.start;
				reset();
				if (remade(ctx)) return skeletalGiven(ctx, K, t, lt);
				const cam = ortho([
					lerp(-.1, .1, lt),
					-.05,
					0
				], "front", 2.3, ctx.aspect);
				const d = ease.inOutSine(seg(t, K.lGive2.start + .02, K.B(13) - .04));
				const sk = skeletal(O.lyco, [
					0,
					0,
					0
				], LYC_S * 1.42, d, [
					1,
					.92,
					.88
				].map((v) => v * 1.3), { width: 2.8 });
				if (d < 1) dot(sk.tip, COL.white.map((v) => v * 2.5), 12);
				O.mol.points.visible = true;
				O.mol.set({
					...molState(t, K),
					morph: 0,
					t,
					revealBy: "w",
					reveal: d,
					size: .006,
					bright: .3,
					shade: 0
				}, cam, ctx.H);
				render(ctx, cam);
				const L = ctx.text.overlay, n = Math.floor(d * 69);
				L.text(SMILES.slice(0, n), 960, 760, {
					size: 17,
					weight: 500,
					color: "#ffc8b8",
					alpha: .9
				});
				L.text("SMILES", 960, 730, {
					size: 14,
					weight: 500,
					color: HEX.dim,
					alpha: .9
				});
				const conj = O.lyco.order.slice(0, Math.floor(d * O.lyco.order.length)).filter((b) => b.order === 2).length;
				readout(L, 1480, 150, [["lycopene", O.lyco.formula], ["C=C", `${Math.min(conj, 13)} (${Math.max(0, Math.min(11, conj - 1))} conjugated)`]], { accent: VH.tom });
				overlays(ctx, K, "skeletal formula · all-trans");
				look(ctx, { vignette: .3 });
			}
		},
		{
			id: "standUp",
			at: (T) => keys(T).B(13),
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T), t = ctx.t, lt = t - K.B(13);
				reset();
				if (remade(ctx)) return standUpGiven(ctx, K, t, lt);
				const k = ease.inOutCubic(seg(lt, 0, K.tAnti - K.B(13))), az = lerp(0, .95, k), el = lerp(0, .32, k), r = lerp(4.6, 3.3, k);
				const tgt = [
					lerp(0, .4, k),
					lerp(0, -.2, k),
					0
				], cam = persp(ctx, [
					tgt[0] + r * Math.cos(el) * Math.sin(az),
					tgt[1] + r * Math.sin(el),
					r * Math.cos(el) * Math.cos(az)
				], tgt, { fov: lerp(28, 40, k) });
				const ms = molState(t, K);
				O.mol.points.visible = true;
				O.mol.set({
					...ms,
					t,
					size: .011,
					bright: .26,
					shade: .75 * ms.morph,
					rim: .5,
					focus: r,
					aperture: .012 * k,
					maxBlur: 20
				}, cam, ctx.H);
				if (k < 1) skeletal(O.lyco, [
					0,
					0,
					0
				], LYC_S * 1.42, 1, [
					1,
					.92,
					.88
				].map((v) => v * 1.3 * (1 - k)), { width: 2.8 });
				radicals(ctx, cam, K);
				render(ctx, cam);
				readout(ctx.text.overlay, 1480, 150, [["lycopene", O.lyco.formula], ["M", `${O.lyco.mass.toFixed(2)} g/mol`]], { accent: VH.tom });
				overlays(ctx, K);
				look(ctx);
			}
		},
		{
			id: "antiox",
			at: (T) => keys(T).tAnti,
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T), t = ctx.t, lt = t - K.tAnti;
				reset();
				if (remade(ctx)) return antioxGiven(ctx, K, t, lt);
				const az = .95 + lt * .12, el = .32, r = 3.3, tgt = [
					.4,
					-.2,
					0
				];
				const cam = persp(ctx, [
					tgt[0] + r * Math.cos(el) * Math.sin(az),
					tgt[1] + r * Math.sin(el),
					r * Math.cos(el) * Math.cos(az)
				], tgt, { fov: 40 });
				const glow = radicals(ctx, cam, K), e = hit(t, K.tAnti);
				O.mol.points.visible = true;
				O.mol.set({
					...molState(t, K),
					t,
					size: .011,
					bright: .22 * (1 + 3 * e),
					shade: .75,
					rim: .5,
					focus: r,
					aperture: .012,
					maxBlur: 20,
					glow
				}, cam, ctx.H);
				const thermal = t >= K.quench[2] && t < K.quench[3];
				if (thermal) {
					O.lines.mesh.visible = true;
					O.lines.end(ctx);
					const tex = capture(ctx, (sub) => sub.draw(O.scene, cam));
					view(ctx, tex, "thermal", { gain: 1.1 });
				} else render(ctx, cam);
				const L = ctx.text.scene, word = "ANTIOXIDANTS", q0 = K.quench[0], e0 = toDesign(molAtom(3), cam), e1 = toDesign(molAtom(28), cam), [A0, A1] = e0[0] <= e1[0] ? [e0, e1] : [e1, e0];
				const ang = Math.atan2(A1[1] - A0[1], A1[0] - A0[0]), up = [Math.sin(ang), -Math.cos(ang)], hitS = toDesign(molAtom(RADICALS[0].atom), cam);
				const len = Math.hypot(A1[0] - A0[0], A1[1] - A0[1]), size = clamp(len / 12 * 1.05, 44, 82);
				[...word].forEach((ch, j) => {
					const f = (j + .5) / 12, x = lerp(A0[0], A1[0], f) + up[0] * size * 1.1, y = lerp(A0[1], A1[1], f) + up[1] * size * 1.1;
					const dd = Math.hypot(x - hitS[0], y - hitS[1]) / len, on = seg(t, q0 + dd * .35 - .02, q0 + dd * .35 + .06);
					if (on <= 0) return;
					L.text(ch, x, y, {
						size,
						weight: 800,
						color: "#fff3ee",
						glow: 18,
						glowColor: VH.tom,
						alpha: on,
						scale: .85 + .15 * on,
						rot: ang
					});
				});
				const n = K.quench.filter((q) => t >= q).length;
				readout(ctx.text.overlay, 1480, 820, [["quenched", `${n} / ${K.quench.length}`], ["k_q(¹O₂)", "3.1 × 10¹⁰ M⁻¹s⁻¹"]], { accent: VH.tom });
				overlays(ctx, K, thermal ? "thermal · ΔT from the quench" : null);
				if (thermal) Object.assign(ctx.post, {
					tonemap: 2,
					bloom: .15,
					ca: 0
				});
				else {
					look(ctx);
					accent(ctx, K.tAnti, [
						1,
						.55,
						.45
					], {
						x: toDesign(molAtom(RADICALS[0].atom), cam)[0],
						y: toDesign(molAtom(RADICALS[0].atom), cam)[1],
						spill: .45
					});
				}
			}
		},
		{
			id: "box",
			at: (T) => keys(T).lCat.start,
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T), t = ctx.t, lt = t - K.lCat.start;
				reset();
				const a = .55 + lt * .12, cam = persp(ctx, [
					3.2 * Math.sin(a),
					1.35,
					3.2 * Math.cos(a)
				], [
					0,
					-.02,
					0
				], { fov: 38 });
				box(PSI.box, [
					.9,
					.92,
					1
				].map((v) => v * 1.1), 2.4);
				drawMe(ctx, cam, K, { reveal: .45 });
				renderPrinted(ctx, cam);
				newLine(ctx, K, 2, K.lCat.start, { paper: true });
				const L = ctx.text.overlay, A = toDesign([
					PSI.a[0],
					PSI.a[1] + .45,
					PSI.a[2]
				], cam), D = toDesign([
					PSI.d[0],
					PSI.d[1] + .45,
					PSI.d[2]
				], cam);
				callout(L, [A[0], A[1]], "|alive⟩", {
					dx: -90,
					dy: -70,
					color: INK.amber,
					draw: seg(lt, .1, .35)
				});
				callout(L, [D[0], D[1]], "|dead⟩", {
					dx: 90,
					dy: -70,
					color: INK.grey,
					draw: seg(lt, .15, .4)
				});
				L.text("|ψ⟩ = ( |alive⟩ + |dead⟩ ) / √2", 960, 900, {
					size: 30,
					weight: 600,
					color: INK.black,
					alpha: seg(lt, .05, .3)
				});
				readout(L, 1480, 150, [["P(alive)", "0.50"], ["V", psiState(t, K).V.toFixed(2)]], { accent: INK.amber });
				overlays(ctx, K, null, { paper: true });
				paperLook(ctx);
			}
		},
		{
			id: "fringes",
			at: (T) => keys(T).B(18),
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T), t = ctx.t, lt = t - K.B(18);
				reset();
				const cam = ortho([
					lerp(-.06, .06, lt),
					-.12,
					0
				], "front", 1.6, ctx.aspect);
				drawMe(ctx, cam, K, {
					cut: {
						plane: [
							0,
							0,
							1,
							0
						],
						mode: "slab",
						soft: .22,
						glow: 0,
						dim: 0
					},
					size: .0062,
					bright: .55
				});
				const ps = psiState(t, K), pts = [];
				for (let i = 0; i <= 400; i++) {
					const x = -.95 + 1.9 * i / 400, ga = Math.exp(-((x - PSI.a[0]) ** 2) / (4 * PSI.sigma ** 2)), gd = Math.exp(-((x - PSI.d[0]) ** 2) / (4 * PSI.sigma ** 2));
					const I = ga * ga + gd * gd + 2 * ps.V * ga * gd * Math.cos(PSI.k[0] * x + ps.phase);
					pts.push([
						x,
						-.86 + I * .1,
						.5
					]);
				}
				O.lines.polyline(pts, {
					color: [
						.95,
						.95,
						1
					].map((v) => v * 1.2),
					width: 2.2
				});
				O.lines.segment([
					-.95,
					-.86,
					.5
				], [
					.95,
					-.86,
					.5
				], {
					color: [
						.8,
						.8,
						.9
					].map((v) => v * .6),
					width: 1.2
				});
				renderPrinted(ctx, cam, { gain: 3.2 });
				const L = ctx.text.overlay;
				L.text("I(x) = |ψa|² + |ψd|² + 2 V |ψa| |ψd| cos(k x + φ)", 960, 175, {
					size: 26,
					weight: 600,
					color: INK.black,
					stroke: PAPER_HEX,
					strokeWidth: 8,
					alpha: seg(lt, 0, .2)
				});
				L.text(`fringe spacing 2π/k = ${(TAU / PSI.k[0]).toFixed(3)}`, 960, 212, {
					size: 16,
					weight: 500,
					color: INK.grey,
					stroke: PAPER_HEX,
					strokeWidth: 7,
					alpha: seg(lt, .1, .3)
				});
				readout(L, 1480, 820, [["V", ps.V.toFixed(2)], ["φ", `${(ps.phase * 180 / Math.PI % 360).toFixed(0)}°`]], { accent: INK.amber });
				overlays(ctx, K, "slab z ∈ ±0.16", { paper: true });
				paperLook(ctx);
			}
		},
		{
			id: "bloch",
			at: (T) => keys(T).lPurr.start,
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T), t = ctx.t, lt = t - K.lPurr.start;
				reset();
				const ps = psiState(t, K), a = .5 + lt * .1, cam = persp(ctx, [
					4.6 * Math.sin(a),
					.95,
					4.6 * Math.cos(a)
				], [
					-.35,
					0,
					0
				], { fov: 36 });
				const v = blochSphere([
					.9,
					.92,
					1
				].map((x) => x * 1.1), 2.4, ps.phase);
				renderPrinted(ctx, cam);
				const L = ctx.text.overlay, N = toDesign([
					0,
					1.3,
					0
				], cam), Sd = toDesign([
					0,
					-1.3,
					0
				], cam), q = toDesign(v, cam);
				L.text("|0⟩ = |alive⟩", N[0], N[1] - 20, {
					size: 22,
					weight: 600,
					color: INK.amber
				});
				L.text("|1⟩ = |dead⟩", Sd[0], Sd[1] + 24, {
					size: 22,
					weight: 600,
					color: INK.grey
				});
				L.text("φ", q[0] + 18, q[1] - 16, {
					size: 22,
					weight: 600,
					color: INK.black
				});
				scopeTrace(L, t, 1330, 700, 420, 110, {
					color: INK.amber,
					grid: INK.grey
				});
				readout(L, 1330, 640, [["ω / 2π", `${PURR_HZ.toFixed(1)} Hz`], ["shown", `× 1/${SLOW}`]], { accent: INK.amber });
				overlays(ctx, K, "Bloch sphere · |ψ⟩ = (|0⟩ + e^(iφ) |1⟩) / √2", { paper: true });
				paperLook(ctx);
			}
		},
		{
			id: "geiger",
			at: (T) => keys(T).B(21),
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T), t = ctx.t, lt = t - K.B(21);
				reset();
				const a = .8 + lt * .08, cam = persp(ctx, [
					3.9 * Math.sin(a),
					1.7,
					3.9 * Math.cos(a)
				], [
					1.2,
					.05,
					0
				], { fov: 34 });
				box(PSI.box, [
					.9,
					.92,
					1
				].map((v) => v * .8), 2);
				drawMe(ctx, cam, K, {
					reveal: .35,
					bright: .7
				});
				renderPrinted(ctx, cam);
				const L = ctx.text.overlay, x0 = 980, x1 = 1760, y0 = 300, y1 = 700, span = 2.4, now = t;
				const X = (tc) => x1 - (now - tc) / span * 780;
				const clicks = geigerClicks(now - span, now, 7);
				L.draw((g) => {
					g.strokeStyle = "rgba(80,110,160,.28)";
					g.lineWidth = 1;
					for (let k = 0; k <= 12; k++) {
						const tx = Math.ceil((now - span) * 5) / 5 + k / 5, px = X(tx);
						if (px < x0) continue;
						g.beginPath();
						g.moveTo(px, y0);
						g.lineTo(px, y1);
						g.stroke();
					}
					for (let k = 0; k <= 8; k++) {
						const py = y0 + k * 400 / 8;
						g.beginPath();
						g.moveTo(x0, py);
						g.lineTo(x1, py);
						g.stroke();
					}
					g.strokeStyle = INK.black;
					g.lineWidth = 1.6;
					g.beginPath();
					g.moveTo(x0, 660);
					for (const c of clicks) {
						const px = X(c);
						g.lineTo(px - 2, 660);
						g.lineTo(px, 550 - 60 * (c * 97.3 % 1));
						g.lineTo(px + 2, 660);
					}
					g.lineTo(x1, 660);
					g.stroke();
					g.strokeStyle = INK.amber;
					g.lineWidth = 2.2;
					g.beginPath();
					for (let i = 0; i <= 120; i++) {
						const tc = now - span + span * i / 120, m = expMin(tc, K), P = m <= 0 ? 0 : 1 - 2 ** (-m / 60);
						const px = X(tc), py = 640 - P * 460 * .5;
						i ? g.lineTo(px, py) : g.moveTo(px, py);
					}
					g.stroke();
				});
				const m = expMin(t, K), P = 1 - 2 ** (-m / 60);
				L.text(`P(decay) = ${P.toFixed(2)}`, x1, 278, {
					size: 16,
					weight: 600,
					align: "right",
					color: INK.amber
				});
				L.text("counts", x0, 278, {
					size: 16,
					weight: 600,
					align: "left",
					color: INK.black
				});
				readout(L, 1480, 760, [
					["t", `${Math.floor(m)} min ${String(Math.floor(m % 1 * 60)).padStart(2, "0")} s`],
					["t½", "60 min"],
					["counts", String(geigerClicks(K.B(21) - 1, t, 7).length)]
				], { accent: INK.amber });
				overlays(ctx, K, "strip chart · 5 mm/s", { paper: true });
				paperLook(ctx);
			}
		},
		{
			id: "measure",
			at: (T) => keys(T).tEnj,
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T), t = ctx.t, lt = t - K.tEnj;
				reset();
				const lid = 1.9 * ease.outCubic(seg(lt, 0, .32)), a = .9 + lt * .15, cam = persp(ctx, [
					3.3 * Math.sin(a),
					1.9,
					3.3 * Math.cos(a)
				], [
					-.15,
					.05,
					0
				], { fov: 38 });
				box(PSI.box, COL.white.map((v) => v * .9), 2.2, lid);
				const e = hit(t, K.tEnj);
				drawMe(ctx, cam, K, { bright: meState(t, K).bright * (1 + 3 * e) });
				const L = O.lines, on = seg(lt, .02, .25);
				for (let j = 0; j < 9; j++) {
					const x = -.6 + j * .15, z = -.2 + .3 * Math.sin(j * 1.7);
					L.segment([
						x * .7,
						2.6,
						z + .4
					], [
						PSI.a[0] + x * .25,
						.1,
						PSI.a[2] + z * .2
					], {
						color: COL.you.map((v) => v * .35 * on),
						width: 7
					});
				}
				O.you.points.visible = true;
				O.you.points.position.set(-.1, 2.3, .5);
				O.you.points.scale.setScalar(4);
				O.you.set({
					a: O.tex.you,
					size: .004,
					bright: 1.2 * on,
					colA: COL.you,
					colB: COL.rose,
					t,
					sparkle: .3
				}, cam, ctx.H);
				render(ctx, cam);
				const pk = toDesign(PSI.a, cam), Lt = ctx.text.scene;
				const k = seg(lt, 0, .1);
				if (k > 0) {
					const x = pk[0] + 150, y = pk[1] - 40, st2 = {
						size: 96,
						weight: 800,
						align: "left",
						color: "#fff1e0",
						glow: 24,
						glowColor: VH.cat,
						alpha: k
					};
					const w = Lt.measure("ENJOYMENT", st2);
					Lt.text("ENJOYMENT", x + 34, y, st2);
					Lt.draw((g) => {
						g.globalAlpha *= k;
						g.strokeStyle = "#fff1e0";
						g.lineWidth = 7;
						g.shadowColor = VH.cat;
						g.shadowBlur = 20;
						g.beginPath();
						g.moveTo(x + 8, y - 58);
						g.lineTo(x + 8, y + 58);
						g.stroke();
						g.beginPath();
						g.moveTo(x + 50 + w, y - 58);
						g.lineTo(x + 84 + w, y);
						g.lineTo(x + 50 + w, y + 58);
						g.stroke();
					});
				}
				readout(ctx.text.overlay, 1480, 150, [
					["observer", "you"],
					["P(alive)", lt < .03 ? "0.50" : "1.00"],
					["⟨dead|ψ⟩", lt < .03 ? "0.71" : "0"]
				], { accent: HEX.you });
				overlays(ctx, K, "measure()");
				look(ctx);
				accent(ctx, K.tEnj, [
					1,
					.7,
					.38
				], {
					x: pk[0],
					y: pk[1]
				});
			}
		},
		{
			id: "tabby",
			editOnly: true,
			at: (T) => keys(T).lCat.start,
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T), TK = tabbyKeys(ctx), lt = ctx.t - K.lCat.start;
				reset();
				const cam = persp(ctx, orbit(CAT_AT, lerp(4.5, 4.1, ease.inOutSine(seg(lt, 0, 1.3))), .3 + lt * .04, .62), CAT_AT, { fov: 38 });
				drawCat(ctx, cam, TK);
				render(ctx, cam);
				const q = toDesign([
					0,
					0,
					0
				], cam);
				ctx.text.overlay.text("you", q[0] + 6, q[1] + 34, {
					size: 18,
					weight: 600,
					color: HEX.you,
					alpha: .85
				});
				newLine(ctx, K, 4, K.lCat.start);
				readout(ctx.text.overlay, 1480, 150, [
					["instance", "me"],
					["class", "TabbyCat"],
					["around", "you"]
				], { accent: HEX.me });
				overlays(ctx, K);
				look(ctx);
			}
		},
		{
			id: "stripes",
			editOnly: true,
			at: (T) => keys(T).wTabby.start,
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T), TK = tabbyKeys(ctx), t = ctx.t, lt = t - K.wTabby.start;
				reset();
				const tgt = [
					-.62,
					.15,
					-.22
				], cam = persp(ctx, orbit(tgt, 3.5 - lt * .1, .12 - lt * .05, 1.08), tgt, { fov: 38 });
				drawCat(ctx, cam, TK);
				render(ctx, cam);
				readout(ctx.text.overlay, 1480, 150, [["coat", "mackerel tabby"], ["markings", `${Math.round(100 * seg(t, TK.stripes[0], TK.stripes[1]))} %`]], { accent: HEX.me });
				overlays(ctx, K, "view  from above");
				look(ctx);
			}
		},
		{
			id: "purr",
			editOnly: true,
			at: (T) => keys(T).lPurr.start,
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T), TK = tabbyKeys(ctx), lt = ctx.t - K.lPurr.start;
				reset();
				const tgt = [
					-.3,
					.2,
					.02
				], cam = persp(ctx, orbit(tgt, 2.5 - lt * .1, .42 + lt * .04, .44), tgt, { fov: 38 });
				const { life } = drawCat(ctx, cam, TK);
				render(ctx, cam);
				purrPanel(ctx, life);
				overlays(ctx, K);
				look(ctx);
			}
		},
		{
			id: "youPurr",
			editOnly: true,
			at: (T) => keys(T).B(21),
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T), TK = tabbyKeys(ctx), lt = ctx.t - K.B(21);
				reset();
				const tgt = [
					-.02,
					.2,
					.04
				], r = 1.95 - lt * .08, cam = persp(ctx, orbit(tgt, r, .18 - lt * .04, .78), tgt, { fov: 36 });
				const { life } = drawCat(ctx, cam, TK, {
					focus: r,
					aperture: .0015
				});
				render(ctx, cam);
				purrPanel(ctx, life);
				overlays(ctx, K);
				look(ctx);
			}
		},
		{
			id: "enjoyment",
			editOnly: true,
			at: (T) => keys(T).tEnj,
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T), TK = tabbyKeys(ctx), lt = ctx.t - TK.tEnj;
				reset();
				const tgt = [
					-.4,
					.25,
					-.05
				], cam = persp(ctx, orbit(tgt, 3.3 + lt * .15, .24 + lt * .04, .55), tgt, { fov: 38 });
				const { you } = drawCat(ctx, cam, TK);
				render(ctx, cam);
				const q = toDesign(you, cam), Lt = ctx.text.scene, k = seg(lt, 0, .1);
				if (k > 0) {
					const st = {
						size: 88,
						weight: 800,
						align: "left",
						color: "#fff1e0",
						glow: 24,
						glowColor: HEX.you,
						alpha: k
					};
					Lt.text("ENJOYMENT", Math.min(q[0] + 120, 1850 - Lt.measure("ENJOYMENT", st)), q[1] - 190, st);
				}
				overlays(ctx, K);
				look(ctx);
				accent(ctx, TK.tEnj, [
					1,
					.7,
					.38
				], {
					x: q[0],
					y: q[1]
				});
			}
		},
		{
			id: "catTurn",
			editOnly: true,
			at: (T) => keys(T).lCat.start,
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T), TK = tabbyKeys(ctx), t = ctx.t, u = seg(t, ctx.shot.start, ctx.shot.start + K.beat * 8);
				reset();
				const cam = persp(ctx, orbit(CAT_AT, 4.2, .3 + TAU * u, ctx.row.el ?? .62), CAT_AT, { fov: 38 });
				drawCat(ctx, cam, TK);
				render(ctx, cam);
				overlays(ctx, K, "development view");
				look(ctx);
			}
		},
		{
			id: "cosmic",
			at: (T) => keys(T).lGod.start,
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T), t = ctx.t, z = cosmicK(t, K);
				reset();
				const sc = 10 ** (z * 1.1), r = 1.15 * 10 ** (z * 1.45), el = lerp(.95, .42, z), az = .3 + z * .5;
				const tgt = [
					PSI.a[0] * (1 - smoothstep(0, .5, z)),
					0,
					0
				];
				const cam = persp(ctx, [
					tgt[0] + r * Math.cos(el) * Math.sin(az),
					r * Math.sin(el),
					r * Math.cos(el) * Math.cos(az)
				], tgt, { fov: 40 });
				stars(ctx, cam, .5 * z);
				if (z < .5) box(PSI.box, COL.white.map((v) => v * .5 * (1 - z * 2)), 1.6, 1.9);
				drawMe(ctx, cam, K, {
					scale: sc,
					size: lerp(.0026, .012, z) * (r / 1.15) ** .75
				});
				render(ctx, cam);
				newLine(ctx, K, 3, K.lGod.start);
				const k = lerp(-.7, 20.9, z), e = Math.floor(k), mant = 10 ** (k - e);
				readout(ctx.text.overlay, 1480, 150, [["radius", `${mant.toFixed(2)} × 10^${e} m`], ["zoom", `10^${Math.max(0, Math.round(k + .7))}`]], { accent: VH.god });
				overlays(ctx, K);
				look(ctx);
			}
		},
		{
			id: "halo",
			at: (T) => keys(T).B(26),
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T), t = ctx.t, lt = t - K.B(26);
				reset();
				const a = .5 + lt * .1, cam = persp(ctx, [
					19 * Math.sin(a),
					-6.5,
					19 * Math.cos(a)
				], [
					0,
					2.8,
					0
				], { fov: 48 });
				stars(ctx, cam, .55);
				drawMe(ctx, cam, K, {
					scale: SC,
					shade: 0,
					size: .085,
					bright: .38
				});
				render(ctx, cam);
				const g = toDesign([
					0,
					0,
					0
				], cam), L = ctx.text.overlay, acam = Math.atan2(cam.position.z, cam.position.x);
				crosshair(L, g[0], g[1], 20, {
					label: "centre",
					alpha: .5,
					color: VH.god
				});
				HALO.gaps.forEach((r, k) => {
					const aa = acam + (k ? -.42 : .42), q = toDesign([
						Math.cos(aa) * r * SC,
						0,
						Math.sin(aa) * r * SC
					], cam);
					if (q[2] < 1) callout(L, [q[0], q[1]], k ? "gap 3:2" : "gap 2:1", {
						dx: k ? -130 : 130,
						dy: 110,
						color: VH.god,
						draw: seg(lt, .08 + .1 * k, .32 + .1 * k),
						alpha: .85
					});
				});
				newLine(ctx, K, 3, K.lGod.start, { alpha: .6 });
				readout(L, 1480, 150, [["instances", t < K.wOnly.start ? "…" : "1"], ["gap 2:1", `r = ${HALO.gaps[0].toFixed(3)} R`]], { accent: VH.god });
				overlays(ctx, K);
				look(ctx);
			}
		},
		{
			id: "you",
			at: (T) => keys(T).lProof.start,
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T), t = ctx.t, lt = t - K.lProof.start;
				reset();
				const cam = persp(ctx, [
					0,
					lerp(33, PROOF.D, ease.outCubic(seg(lt, 0, K.wProof.start - K.lProof.start))),
					0
				], [
					0,
					0,
					0
				], {
					fov: PROOF.fov,
					up: [
						0,
						0,
						-1
					]
				});
				stars(ctx, cam, .4);
				drawMe(ctx, cam, K, {
					scale: SC,
					shade: 0,
					size: .07,
					bright: .34
				});
				const y = ease.outBack(seg(t, K.wYou.start, K.wYou.start + .25));
				youAt(ctx, cam, y);
				render(ctx, cam);
				if (y > 0) crosshair(ctx.text.overlay, 960, 540, 34, {
					label: "you",
					ring: true,
					color: HEX.you,
					alpha: .8 * clamp(y)
				});
				overlays(ctx, K);
				look(ctx, { ca: 0 });
			}
		},
		{
			id: "proof",
			at: (T) => keys(T).wProof.start,
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T), lt = ctx.t - K.wProof.start;
				reset();
				const cam = persp(ctx, [
					0,
					PROOF.D,
					0
				], [
					0,
					0,
					0
				], {
					fov: PROOF.fov,
					up: [
						0,
						0,
						-1
					]
				});
				stars(ctx, cam, .35 * (1 - seg(lt, 0, .5)));
				drawMe(ctx, cam, K, {
					scale: SC,
					shade: 0
				});
				youAt(ctx, cam, 1);
				render(ctx, cam);
				typedLine(ctx, K);
				overlays(ctx, K);
				look(ctx, { ca: 0 });
			}
		},
		{
			id: "exists",
			at: (T) => keys(T).tExi,
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T), t = ctx.t, k = ease.outExpo(seg(t, K.tExi, K.tExi + .34));
				reset();
				const cam = glyphCam(ctx, lerp(PROOF.gx, 640, k), lerp(PROOF.gy, 540, k), Math.exp(lerp(Math.log(PROOF.gh), Math.log(691.2), k)));
				const e = hit(t, K.tExi);
				drawMe(ctx, cam, K, {
					scale: SC,
					shade: 0,
					bright: meState(t, K).bright * (1 + 3 * e)
				});
				youAt(ctx, cam, 1 - seg(t, K.tExi, K.tExi + .1));
				drawWord(ctx, cam, K, e);
				render(ctx, cam);
				typedLine(ctx, K, 1 - seg(t, K.tExi, K.tExi + .12));
				overlays(ctx, K);
				look(ctx, {
					vignette: .3,
					ca: 0
				});
				accent(ctx, K.tExi, [
					1,
					.8,
					.5
				], {
					x: PROOF.gx,
					y: PROOF.gy
				});
			}
		},
		{
			id: "qed",
			at: (T) => keys(T).B(31.5),
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T), t = ctx.t, k = ease.inOutCubic(seg(t, K.B(31.5), K.end));
				reset();
				const cam = glyphCam(ctx, lerp(640, 960, k), 540, lerp(691.2, 1080, k));
				drawMe(ctx, cam, K, {
					scale: SC,
					shade: 0
				});
				drawWord(ctx, cam, K, 0, 1 - seg(t, K.B(31.5), K.B(31.5) + .12));
				render(ctx, cam);
				overlays(ctx, K);
				look(ctx, {
					vignette: .3,
					ca: 0
				});
			}
		}
	]
});
function youAt(ctx, cam, y) {
	if (y <= 0) return;
	O.you.points.visible = true;
	O.you.points.scale.setScalar(y * 8);
	O.you.set({
		a: O.tex.you,
		size: .004,
		bright: 2.2,
		colA: COL.you,
		colB: COL.rose,
		t: ctx.t,
		sparkle: .3
	}, cam, ctx.H);
	dot([
		0,
		0,
		0
	], COL.you.map((v) => v * 2.2 * y), 16);
	dot([
		0,
		0,
		0
	], COL.you.map((v) => v * .45 * y), 46);
}
/** EXISTENCE in gold points, condensing from dust on the hit. */
function drawWord(ctx, cam, K, e = 0, fade = 1) {
	const m = ease.outCubic(seg(ctx.t, K.tExi - .05, K.tExi + .12));
	if (m <= 0 || fade <= 0) return;
	O.word.points.visible = true;
	O.word.set({
		a: O.tex.dust,
		b: O.tex.word,
		morph: m,
		spread: .3,
		arc: .1,
		t: ctx.t,
		size: .006,
		bright: 1.1 * fade * (1 + 2 * e),
		sparkle: .1,
		variance: .3
	}, cam, ctx.H);
}
/** "∃! x : God(x)": the ∃ is made of points (me); the rest is typed on 32nd-note triplets, then the witness and the proof. */
function typedLine(ctx, K, alpha = 1) {
	const t = ctx.t, L = ctx.text.scene, step = K.beat / 12;
	const str = "! x : God(x)", n = clamp(Math.floor((t - K.wProof.start - .22) / step) + 1, 0, 12);
	const st = {
		size: PROOF.size,
		weight: 600,
		align: "left",
		alpha,
		glow: 14,
		glowColor: VH.god
	};
	const x0 = PROOF.gx + PROOF.size * .3;
	L.text(str.slice(0, n), x0, PROOF.gy + 2, {
		...st,
		color: HEX.white
	});
	[[
		["witness  ", HEX.dim],
		["x := ", HEX.white],
		["me", HEX.me]
	], [
		["proof    ", HEX.dim],
		["God(me) := ", HEX.white],
		["you", HEX.you]
	]].forEach((segs, r) => {
		const t0 = K.wProof.start + .22 + 12 * step + .06 + r * .14;
		let x = PROOF.gx - 40;
		const total = segs.reduce((s, [a]) => s + a.length, 0);
		let left = clamp(Math.floor((t - t0) / (step * .7)) + 1, 0, total);
		const s2 = {
			size: 40,
			weight: 600,
			align: "left",
			alpha,
			glow: 8
		};
		for (const [s, c] of segs) {
			if (left <= 0) break;
			const part = s.slice(0, left);
			left -= s.length;
			L.text(part, x, PROOF.gy + 110 + r * 54, {
				...s2,
				color: c,
				glowColor: c
			});
			x += L.measure(part, s2);
		}
	});
}
/** Skeletal formula (GlowLines) in the plane z = center[2], drawn bond by bond up to `draw`. */
function skeletal(mol, center, s, draw, col, o = {}) {
	const A = mol.atoms, n = mol.order.length, labelled = new Set(mol.labels.map((l) => l[0]));
	const P = (i) => [
		center[0] + A[i].q[0] * s,
		center[1] + A[i].q[1] * s,
		center[2]
	];
	const done = draw * n;
	mol.order.forEach((b, k) => {
		const f = clamp(done - k);
		if (f <= 0) return;
		let a = P(b.a), c = P(b.b);
		const gap = .32 * s, dx = c[0] - a[0], dy = c[1] - a[1], L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L;
		if (labelled.has(b.a)) a = [
			a[0] + ux * gap,
			a[1] + uy * gap,
			a[2]
		];
		if (labelled.has(b.b)) c = [
			c[0] - ux * gap,
			c[1] - uy * gap,
			c[2]
		];
		O.lines.segment(a, [
			lerp(a[0], c[0], f),
			lerp(a[1], c[1], f),
			a[2]
		], {
			color: col,
			width: o.width ?? 2.6
		});
		if (b.order === 2) {
			let nx = -uy, ny = ux;
			const ring = (o.rings ?? []).find((R) => R.includes(b.a) && R.includes(b.b));
			if (ring) {
				const q = ring.reduce((m, i) => [m[0] + A[i].q[0] / ring.length, m[1] + A[i].q[1] / ring.length], [0, 0]), ctr = [center[0] + q[0] * s, center[1] + q[1] * s];
				const mx = (a[0] + c[0]) / 2 - ctr[0], my = (a[1] + c[1]) / 2 - ctr[1];
				if (nx * mx + ny * my > 0) {
					nx = -nx;
					ny = -ny;
				}
			} else if (ny > 0) {
				nx = -nx;
				ny = -ny;
			}
			const off = .18 * s, ins = .16, f2 = clamp((f - ins) / (1 - 2 * ins));
			const a2 = [
				lerp(a[0], c[0], ins) + nx * off,
				lerp(a[1], c[1], ins) + ny * off,
				a[2]
			], c2 = [
				lerp(a[0], c[0], .84) + nx * off,
				lerp(a[1], c[1], .84) + ny * off,
				a[2]
			];
			if (f2 > 0) O.lines.segment(a2, [
				lerp(a2[0], c2[0], f2),
				lerp(a2[1], c2[1], f2),
				a[2]
			], {
				color: col.map((v) => v * .85),
				width: (o.width ?? 2.6) * .8
			});
		}
	});
	const k = Math.min(n - 1, Math.floor(done)), b = mol.order[k], f = clamp(done - k), a = P(b.a), c = P(b.b);
	return {
		P,
		tip: [
			lerp(a[0], c[0], f),
			lerp(a[1], c[1], f),
			a[2]
		]
	};
}
//#endregion
