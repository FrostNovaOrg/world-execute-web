import { chapter } from "../engine/timeline.js?v=vYBbdLfo";
import { TAU, clamp, ease, hash, lerp, seg, smoothstep } from "../engine/math.js?v=BJIlRm7-";
import { COL, HEX } from "../theme.js?v=Bj33PIbo";
import { remade } from "../lib/published.js?v=aV_CU5HV";
import { OrthographicCamera, Scene, Vector3 } from "../../vendor/three/build/three.core.js?v=q9f7JKE-";
import { GlowLines } from "../engine/lines.js?v=B_AAaaTO";
import { rig } from "../engine/rig.js?v=39-joEtk";
import { newCamera, shake } from "../lib/look.js?v=BfOqFF7i";
import { callout, crosshair, dimLine, frame, readout, scope, toDesign, viewportFrame } from "../lib/hud.js?v=BgmSZjmG";
import { GlyphField, codeBlock, source } from "../lib/glyphs.js?v=DWbHICXG";
import { capture, view } from "../lib/modes.js?v=Cu3GYO-2";
import { ForkLines, ForkSwarm, PATH, axisOf, grid, lenOf, nodePos, pidOf, procPos } from "./chant/fork.js?v=Cxw_Ux4G";
import { NPROC, TOKENIZER, TOKENS, bombText, debrisLayout, nodeLayout, psText, rankText } from "./chant/code.js?v=C56NtK9k";
import { aliveLevels, deadShare } from "./chant/death.js?v=BsC_9PAy";
//#region src/ch/12_chant.js
var RED = [
	1,
	.14,
	.08
];
var HOT = [
	1,
	.9,
	.8
];
var CYAN = COL.me;
var ARMED = [
	1.12,
	1.02,
	.95
];
/** Colour ramps through a neutral (never through purple): cyan copies of me → grey → execution red / white. */
var ramp = (a, b, c, k) => k < .5 ? a.map((v, i) => lerp(v, b[i], k * 2)) : b.map((v, i) => lerp(v, c[i], k * 2 - 1));
var lineCol = (k) => ramp([
	.36,
	.7,
	.8
], [
	.66,
	.58,
	.5
], [
	.9,
	.1,
	.06
], k);
var membCol = (k) => ramp(CYAN, [
	.76,
	.66,
	.58
], RED, k);
var nuclCol = (k) => ramp([
	.75,
	.95,
	1
], [
	.95,
	.92,
	.9
], HOT, k);
var HEXR = HEX.red;
var BOMB = ":(){ :|:& };:";
var ASH = [
	.36,
	.35,
	.34
];
var LIVE = [
	.9 / 1.35,
	.1 / 1.35,
	.06 / 1.35
];
var RED_Y1 = [
	.9 / .267,
	.1 / .267,
	.06 / .267
];
var ASH_MEMB = [
	.42,
	.41,
	.4
];
var ASH_NUCL = [
	.62,
	.6,
	.58
];
var RED_HOT = [
	1.2,
	.17,
	.1
];
var deathOf = (ctx, K) => remade(ctx) ? aliveLevels(ctx.t, K.X, K.B(1) - K.B(0)) : null;
var mix3 = (a, b, k) => a.map((v, i) => lerp(v, b[i], k));
var RHO = .6;
var SPLIT = .34;
var SUP = "⁰¹²³⁴⁵⁶⁷⁸⁹";
var sup = (n) => String(n).split("").map((d) => SUP[+d]).join("");
var fmt = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
var SCRIPTS = [
	{
		word: "Ein",
		lang: "de",
		font: "JetBrains Mono",
		weight: 800,
		size: 176
	},
	{
		word: "Dos",
		lang: "es",
		font: "JetBrains Mono",
		weight: 800,
		size: 176
	},
	{
		word: "Trois",
		lang: "fr",
		font: "JetBrains Mono",
		weight: 800,
		size: 164
	},
	{
		word: "넷",
		lang: "ko",
		font: "Apple SD Gothic Neo",
		weight: 800,
		size: 210
	},
	{
		word: "Fem",
		lang: "sv",
		font: "JetBrains Mono",
		weight: 800,
		size: 176
	},
	{
		word: "六",
		lang: "zh",
		font: "PingFang SC",
		weight: 600,
		size: 220
	}
];
var O = null;
var KC = null;
var logDur = (k) => .05 + .036 * k;
var KILL = .5;
function keys(T) {
	if (KC?.T === T) return KC;
	const s0 = T.section("chant").start, b0 = Math.round(T.beatAt(s0)), B = (k) => T.beatTime(b0 + k);
	const X = [null], H = [null], C = [null];
	for (let k = 1; k <= 12; k++) {
		const l = T.line(85 + k);
		if (l.text !== "EXECUTION") throw new Error(`chant: line ${85 + k} is '${l.text}', expected EXECUTION`);
		X.push(l.start);
		H.push(B(2 * (k - 1) + .5));
	}
	X.push(T.line(104).start);
	H.push(B(30.5));
	for (let n = 1; n <= 6; n++) C.push(T.line(97 + n).start);
	const S = [null];
	for (let k = 1; k <= 12; k++) {
		const n = k <= 4 ? 1 : k <= 8 ? 2 : 4;
		S.push(Array.from({ length: n }, (_, j) => B(2 * (k - 1) + .5 + j * 1.5 / n)));
	}
	const q = (B(30) - B(29)) / 4, ARM = [X[13] - 2 * q, X[13] - q];
	const log = [];
	for (let k = 1; k <= 12; k++) {
		log.push({
			t: X[k],
			s: "> EXECUTION",
			cmd: true
		});
		const n = 2 ** k, D = logDur(k);
		for (let i = 0; i < n; i++) {
			const p = 2 ** (k - 1) + (i >> 1);
			log.push({
				t: X[k] + .02 + D * (i + 1) / n,
				s: `[pid ${String(p).padStart(5)}] fork() = ${2 * p + (i & 1)}`
			});
		}
	}
	for (let n = 1; n <= 6; n++) log.push({
		t: C[n],
		s: `> ${T.line(97 + n).text}`,
		cmd: true
	});
	log.push({
		t: X[13],
		s: "> EXECUTION",
		cmd: true
	});
	for (let i = 0; i < 4096; i++) log.push({
		t: X[13] + .03 + KILL * (i + 1) / 4096,
		s: `[pid ${String(4096 + i).padStart(5)}] +++ killed by SIGKILL +++`
	});
	return KC = {
		T,
		s0,
		b0,
		B,
		X,
		H,
		C,
		S,
		ARM,
		log,
		logB: log.map((e) => e.t >= X[9] && e.t < X[13] && !e.cmd ? {
			t: e.t,
			s: e.s.replace(/^\[pid +\d+\] fork\(\) = (\d+)$/, (m, c) => `[pid ${c.padStart(5)}] +++ killed by SIGKILL +++`)
		} : e),
		end: T.section("c3").start
	};
}
function forkState(t, K) {
	let G = 0, k = 0;
	for (let j = 1; j <= 12; j++) {
		G += ease.outCubic(seg(t, K.X[j], K.X[j] + SPLIT));
		if (t >= K.X[j]) k = j;
	}
	const heat = Array.from({ length: 12 }, (_, i) => t >= K.X[i + 1] ? Math.exp(-(t - K.X[i + 1]) * 3.2) : 0);
	let pulse = 0, pulseOn = 0;
	for (let j = 2; j <= 12; j++) {
		const a = K.B(2 * (j - 1) - 1), b = K.X[j];
		if (t >= a && t < b) {
			pulse = PATH[j - 1] * (t - a) / (b - a);
			pulseOn = seg(t, a, a + .05) * (1 - seg(t, b - .02, b));
		}
	}
	let procs = 1, pidMax = 1;
	if (k >= 1) {
		const n = 2 ** k, m = clamp(Math.floor((t - K.X[k] - .02) / logDur(k) * n), 0, n);
		procs = 2 ** (k - 1) + Math.ceil(m / 2);
		pidMax = m ? n + m - 1 : n - 1;
	}
	const boom = t >= K.X[13] ? t - K.X[13] : 0;
	if (boom > 0) procs = 4096 - clamp(Math.floor((boom - .03) / KILL * 4096), 0, 4096);
	let charge = 0;
	for (let n = 1; n <= 6; n++) if (t >= K.C[n]) charge = lerp(PATH[2 * n - 2], PATH[2 * n], ease.outCubic(seg(t, K.C[n], K.C[n] + .22)));
	const lastHit = k ? t - K.X[k] : 9;
	return {
		t,
		G,
		k,
		heat,
		pulse,
		pulseOn,
		procs,
		pidMax,
		boom,
		charge,
		lastHit,
		red: smoothstep(2.2, 5.2, G)
	};
}
var _f = new Vector3();
var _u = new Vector3();
function persp(ctx, pos, look, { fov = 38, aspect = ctx.aspect, roll = 0, up = null, inset = false } = {}) {
	const c = O.persp;
	c.fov = fov;
	c.aspect = aspect;
	c.near = .01;
	c.far = 600;
	c.position.set(...pos);
	_f.set(look[0] - pos[0], look[1] - pos[1], look[2] - pos[2]).normalize();
	_u.set(...up ?? [
		0,
		1,
		0
	]).applyAxisAngle(_f, -roll);
	c.up.copy(_u);
	c.lookAt(...look);
	c.updateProjectionMatrix();
	c.updateMatrixWorld();
	return rig.cam(c, {
		look,
		inset
	});
}
/**
* (the remake, docs/REMAKE.md §12.13: a viewer's note at 2:38) wide6 → monge6 jumped in size, place and angle at once.
* wide6's camera now comes in on monge6's axis: from its published start it turns onto monge6's direction and target
* and closes in, faster towards the cut, so that the cut on the drum changes one thing only: the cube comes closer.
*/
var MONGE6 = {
	target: [
		-.55,
		-.45,
		-.55
	],
	dir: [
		1,
		.84,
		1.3
	]
};
function wide6Cam(ctx, lt) {
	const u = ease.inOutSine(seg(lt, 0, ctx.dur)), push = seg(lt, 0, ctx.dur) ** 2;
	const az1 = Math.atan2(MONGE6.dir[0], MONGE6.dir[2]), el1 = Math.asin(MONGE6.dir[1] / Math.hypot(...MONGE6.dir));
	const az = lerp(.6, az1, u), el = lerp(Math.atan2(15.6, 24), el1, u), r = lerp(Math.hypot(24, 15.6), 19, push);
	const c = [
		0,
		-.6,
		0
	].map((v, i) => lerp(v, MONGE6.target[i], u));
	return persp(ctx, [
		c[0] + r * Math.cos(el) * Math.sin(az),
		c[1] + r * Math.sin(el),
		c[2] + r * Math.cos(el) * Math.cos(az)
	], c, { fov: 30 });
}
function ortho(center, dir, height, aspect, { roll = 0, inset = false } = {}) {
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
		c.up.set(Math.sin(roll), Math.cos(roll), 0);
	} else if (dir === "top") {
		c.position.set(x, y + d, z);
		c.up.set(Math.sin(roll), 0, -Math.cos(roll));
	} else if (dir === "iso") {
		const k = d / Math.sqrt(3);
		c.position.set(x + k, y + k, z + k);
		c.up.set(0, 1, 0);
	} else if (Array.isArray(dir)) {
		const k = d / Math.hypot(...dir);
		c.position.set(x + dir[0] * k, y + dir[1] * k, z + dir[2] * k);
		c.up.set(0, 1, 0);
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
var VIEW_AXIS = {
	side: 0,
	top: 1,
	front: 2
};
function reset() {
	for (const o of [
		O.swarm.points,
		O.hero.points,
		O.lines.mesh,
		O.fx.mesh,
		O.floor,
		O.wall,
		O.wallX,
		O.glyphs.points,
		O.code.points
	]) o.visible = false;
	O.fx.begin();
}
/**
* A wall of text far behind the subject: CODE (the film's own source) or DATA (a process table, the rank dump). One
* layout per text; dim, defocused with the scene, drifting slowly. o: origin, cell, cols, rows, size, bright, palette,
* scroll (units/s), focus, aperture.
*/
function textWall(ctx, cam, key, str, o = {}, hPx = ctx.H) {
	const gf = O.code.text(`chant/${key}`, str), org = o.origin ?? [
		-10,
		6,
		-7
	], cell = o.cell ?? .2, cols = o.cols ?? 110, rows = o.rows ?? 64;
	const lay = gf.layout(`chant/${key}-${org.join(",")}-${cell}-${cols}-${rows}`, codeBlock(gf, {
		origin: org,
		cell,
		cols,
		rows
	}));
	gf.points.rotation.set(o.rx ?? 0, o.ry ?? 0, 0);
	gf.points.position.set(...o.pos ?? [
		0,
		0,
		0
	]);
	gf.points.updateMatrixWorld();
	gf.set({
		a: lay,
		t: ctx.t,
		size: o.size ?? (o.cell ?? .2) * .8,
		bright: o.bright ?? .22,
		palette: o.palette ?? [
			.62,
			.11,
			.08
		],
		minPx: 2,
		scroll: [
			0,
			(o.scroll ?? .25) * (ctx.lt ?? 0),
			0
		],
		focus: o.focus,
		aperture: o.aperture ?? 0,
		maxBlur: o.maxBlur ?? 18,
		reveal: o.reveal
	}, cam, hPx);
	gf.points.visible = true;
}
/**
* The processes as characters of the bomb: glyph i sits on process (i mod 2^k), morphing from generation k−1 to k with
* the division, so the field divides exactly like the tree (one character per live process).
*/
function glyphNodes(ctx, cam, st, o = {}, hPx = ctx.H) {
	const k = clamp(st.k, 1, 12), a = O.glyphs.layout(`chant/node-${k - 1}`, nodeLayout(k - 1)), b = O.glyphs.layout(`chant/node-${k}`, nodeLayout(k));
	const [focus, aperture, maxBlur] = o.dof ?? [
		5,
		0,
		30
	];
	O.glyphs.set({
		a,
		b,
		morph: clamp(st.G - (k - 1)),
		spread: .35,
		arc: .02,
		t: ctx.t,
		reveal: 2 ** k / NPROC + 1e-4,
		soft: 1e-5,
		size: o.size ?? .15,
		bright: o.bright ?? .9,
		palette: o.palette ?? nuclCol(st.red),
		flicker: .12,
		minPx: 3,
		focus,
		aperture,
		maxBlur
	}, cam, hPx);
	O.glyphs.points.visible = true;
}
/** The last EXECUTION decompiles the tree: every character leaves along its ray, decelerating, cooling to red. */
function glyphDebris(ctx, cam, st, o = {}, hPx = ctx.H) {
	const a = O.glyphs.layout("chant/node-12", nodeLayout(12)), b = O.glyphs.layout("chant/debris", debrisLayout());
	const K = 2.4, m = (1 - Math.exp(-st.boom * K)) / (1 - Math.exp(-1.25 * K)), cool = seg(st.boom, .05, .7);
	O.glyphs.set({
		a,
		b,
		morph: clamp(m),
		spread: .2,
		arc: .25,
		t: ctx.t,
		reveal: 1.001,
		size: o.size ?? .13,
		bright: (o.bright ?? 1) * (1 - .5 * cool),
		palette: HOT.map((v, i) => lerp(v, RED[i], cool)),
		flicker: .25,
		minPx: 3
	}, cam, hPx);
	O.glyphs.points.visible = true;
}
/** Draw a shot through an instrument view (lib/modes.js): body(sub) draws into a private target. */
function instrument(ctx, mode, body, opts = {}) {
	const tex = capture(ctx, (sub) => body(sub));
	view(ctx, tex, mode, opts);
}
/** Brightness gains that compensate the exact overlap of orthographic views (per level for lines; processes). */
function viewGains(view, G) {
	const v = VIEW_AXIS[view];
	if (v == null) return {
		lines: null,
		procs: 1
	};
	const lines = [];
	let n = 0, np = 0;
	for (let j = 1; j <= 12; j++) {
		lines.push(2 ** (-.8 * n));
		if (axisOf(j) === v) n++;
	}
	for (let j = 1; j <= 12; j++) if (axisOf(j) === v) np += clamp(G - (j - 1));
	return {
		lines,
		procs: 2 ** (-.6 * np)
	};
}
/** The processes turn white as the last two levels are armed (then stay white through the detonation). */
var armed = (st) => clamp((st.charge - PATH[10]) / (PATH[12] - PATH[10]));
/** Per-particle brightness: the cells hold fewer particles as they divide (262 144 / 2^G each). */
var procBright = (G) => .006 * 2 ** (G * .4) * lerp(.08, 1, clamp(G));
/** The fork tree (branches + processes) for one camera. o: view, bright, lineBright, dof [focus, aperture, maxBlur], swarm {…}, lines {…}. */
function drawTree(ctx, cam, st, o = {}, wPx = ctx.W, hPx = ctx.H) {
	const g = viewGains(o.view, st.G), flash = .3 * Math.exp(-Math.max(0, st.lastHit) * 5) * (st.k && st.k <= 12 ? 1 : 0);
	const [focus, aperture, maxBlur] = o.dof ?? [
		5,
		0,
		30
	], near = o.near ?? [0, 0], fog = o.fog ?? [1e3, 0];
	O.lines.mesh.visible = O.swarm.points.visible = true;
	const lc = lineCol(st.red), kick = ctx.F.env("onset_drums", ctx.t, .005, .12);
	const K = keys(ctx.T), alive = deathOf(ctx, K), dead = alive ? deadShare(ctx.t, K.X, K.B(1) - K.B(0)) : 0;
	const death = alive ? {
		heat: alive,
		col: ASH,
		colHot: LIVE,
		chargeCol: RED_Y1
	} : {};
	O.lines.set({
		G: st.G,
		heat: st.heat,
		col: lc,
		colHot: HOT,
		gain: g.lines ?? void 0,
		bright: (o.lineBright ?? 1) * .9 * (1 + .12 * kick),
		w0: 3.2,
		w1: 1.1,
		lvlDim: .45,
		focus,
		aperture: aperture * .6,
		maxBlur: 10,
		near,
		fog,
		pulse: st.pulse,
		pulseW: st.pulseOn * .2,
		pulseCol: HOT.map((c) => c * 1.6),
		charge: st.charge,
		chargeW: st.charge > 0 ? .04 : 0,
		chargeCol: ARMED,
		boom: st.boom,
		fade: o.lineFade ?? 1,
		...death,
		...o.lines
	}, cam, hPx).res(wPx, hPx);
	O.swarm.set({
		G: st.G,
		t: ctx.t,
		rho: RHO,
		stagger: .35,
		arc: .05,
		cursor: 1,
		cursorW: .17,
		wobble: .03,
		boom: st.boom,
		size: .008,
		bright: procBright(st.G) * (o.bright ?? 1),
		gain: g.procs,
		sparkle: .25,
		minPx: 1.2,
		focus,
		aperture,
		maxBlur,
		near,
		fog,
		memb: membCol(st.red),
		nucl: nuclCol(st.red),
		colHot: HOT,
		flash,
		lit: armed(st),
		...alive ? {
			memb: mix3(membCol(st.red), ASH_MEMB, dead),
			nucl: mix3(nuclCol(st.red), ASH_NUCL, dead),
			colHot: RED_HOT
		} : {},
		...o.swarm
	}, cam, hPx);
}
/**
* Level of detail for close-ups: one process drawn by its own dense swarm (65 536 particles pinned to the path
* prefix `pre` of length `preLen`), following exactly the same state as the main swarm.
*/
function drawHero(ctx, cam, st, pre, preLen, o = {}, hPx = ctx.H) {
	const [focus, aperture, maxBlur] = o.dof ?? [
		5,
		0,
		30
	], L = lenOf(Math.min(preLen + 1, 12));
	O.hero.points.visible = true;
	O.hero.set({
		G: st.G,
		t: ctx.t,
		rho: RHO,
		stagger: .35,
		arc: .05,
		wobble: .025,
		boom: st.boom,
		pre,
		preLen,
		size: .011 * L,
		bright: .028 * (o.bright ?? 1),
		sparkle: .2,
		minPx: 1,
		focus,
		aperture,
		maxBlur,
		near: o.near,
		fog: o.fog,
		memb: membCol(st.red),
		nucl: nuclCol(st.red),
		colHot: HOT,
		flash: .3 * Math.exp(-Math.max(0, st.lastHit) * 5) * (st.k <= 12 ? 1 : 0),
		lit: armed(st),
		...heroDeath(ctx, st),
		...o.heroSwarm
	}, cam, hPx);
}
/** (the remake) the close-up process in the colours of chant/death.js */
function heroDeath(ctx, st) {
	const K = keys(ctx.T);
	if (!deathOf(ctx, K)) return {};
	const dead = deadShare(ctx.t, K.X, K.B(1) - K.B(0));
	return {
		memb: mix3(membCol(st.red), ASH_MEMB, dead),
		nucl: mix3(nuclCol(st.red), ASH_NUCL, dead),
		colHot: RED_HOT
	};
}
function render(ctx, cam) {
	O.fx.mesh.visible = true;
	O.fx.end(ctx);
	ctx.draw(O.scene, cam);
}
var OFF = [.125, .125];
function floor(y, intensity = .3, o = {}) {
	O.floor.visible = true;
	O.floor.position.set(0, y, 0);
	O.floor.userData.set({
		intensity,
		fade: o.fade ?? .08,
		reveal: o.reveal ?? 1,
		revealR: o.revealR ?? 60
	});
}
/** A ring of radius r around c in the plane normal to axis a (0 x, 1 y, 2 z). */
function ring(c, a, r, color, width = 2.2, n = 128) {
	const pts = [];
	for (let i = 0; i <= n; i++) {
		const t = i / n * TAU, u = Math.cos(t) * r, v = Math.sin(t) * r;
		pts.push(a === 0 ? [
			c[0],
			c[1] + u,
			c[2] + v
		] : a === 1 ? [
			c[0] + u,
			c[1],
			c[2] + v
		] : [
			c[0] + u,
			c[1] + v,
			c[2]
		]);
	}
	O.fx.polyline(pts, {
		color,
		width
	});
}
/** A shockwave ring facing the camera (a sphere's silhouette), radius r around the origin. */
function shock(cam, r, color, width = 2, n = 160) {
	const f = new Vector3(), u = new Vector3(), v = new Vector3();
	cam.getWorldDirection(f);
	u.set(0, 1, 0).cross(f).normalize();
	v.copy(f).cross(u).normalize();
	const pts = [];
	for (let i = 0; i <= n; i++) {
		const a = i / n * TAU;
		pts.push([
			0,
			1,
			2
		].map((j) => (u.getComponent(j) * Math.cos(a) + v.getComponent(j) * Math.sin(a)) * r));
	}
	O.fx.polyline(pts, {
		color,
		width
	});
}
/** The sandbox: the cube the 16³ lattice exactly fills after the 12th fork. */
function sandbox(k = 1, s = 2) {
	if (k <= 0) return;
	const col = COL.white.map((c) => c * .22 * k);
	for (let a = 0; a < 3; a++) for (const u of [-s, s]) for (const v of [-s, s]) {
		const p = [
			0,
			0,
			0
		], q = [
			0,
			0,
			0
		], b = (a + 1) % 3, c = (a + 2) % 3;
		p[a] = -s;
		q[a] = s;
		p[b] = q[b] = u;
		p[c] = q[c] = v;
		O.fx.segment(p, q, {
			color: col,
			width: 1.4
		});
	}
}
/** The flare of a division: a thin streak along the split axis through the dividing cell, and a small cross. */
function flare(st, k, c, scale = 1) {
	const tau = st.t - KC.X[k];
	if (tau < 0 || tau > .5) return;
	const a = axisOf(k), L = lenOf(k) * scale, f = Math.exp(-tau * 7), grow = ease.outCubic(seg(tau, 0, .12));
	const e = [
		0,
		0,
		0
	];
	e[a] = 1;
	const p = (s) => [
		c[0] + e[0] * s,
		c[1] + e[1] * s,
		c[2] + e[2] * s
	];
	O.fx.segment(p(-L * 1.5 * grow), p(L * 1.5 * grow), {
		color: HOT.map((v) => v * .9 * f),
		width: 1.3
	});
	O.fx.segment(p(-L * .55 * grow), p(L * .55 * grow), {
		color: HOT.map((v) => v * 1.6 * f),
		width: 2.6
	});
	const b = (a + 1) % 3, q = [...c];
	q[b] -= L * .35 * f;
	const r = [...c];
	r[b] += L * .35 * f;
	O.fx.segment(q, r, {
		color: HOT.map((v) => v * 1.2 * f),
		width: 1.6
	});
}
/** The live process count, big enough to read: the value rolls from 2^(k−1) to 2^k as the log prints. */
function counter(L, st, x = 104, y = 206, o = {}) {
	if (!st.k) return;
	const a = o.alpha ?? 1, fresh = Math.exp(-Math.max(0, st.lastHit) * 3), k = Math.min(st.k, 12), ink = o.ink;
	L.text("processes", x, y, {
		size: 17,
		weight: 500,
		color: ink ? "#4a4d55" : HEX.dim,
		align: "left",
		alpha: a,
		tracking: 1
	});
	const v = fmt(st.procs), style = {
		size: o.size ?? 50,
		weight: 600,
		align: "left"
	};
	L.text(v, x - 2, y + 46, {
		...style,
		color: ink ? "#101216" : HEX.white,
		alpha: a,
		glow: ink ? 0 : 16 * fresh,
		glowColor: HEXR
	});
	const w = L.measure(v, style), exp = st.boom > 0 ? `2¹² → 0` : st.procs < 2 ** k ? `2${sup(k - 1)} → 2${sup(k)}` : `= 2${sup(k)}`;
	L.text(exp, x + w + 16, y + 52, {
		size: 22,
		weight: 600,
		color: ink ? "#b3261e" : HEXR,
		align: "left",
		alpha: a
	});
}
/** The easter egg: the 4096 processes were ranks of one distributed job. Typed under the counter from t0. */
function worldSize(L, t, t0, x = 104, y = 318, o = {}) {
	if (t < t0) return;
	const s = "dist.init_process_group(\"nccl\", world_size=4096)", n = Math.ceil(seg(t, t0, t0 + .45) * 48);
	const k = s.indexOf("world_size"), head = s.slice(0, Math.min(n, k)), mid = n > k ? s.slice(k, Math.min(n, k + 15)) : "", tail = n > k + 15 ? s.slice(k + 15, n) : "";
	const st = {
		size: o.size ?? 17,
		weight: 500,
		align: "left",
		alpha: o.alpha ?? .9
	};
	L.text(head, x, y, {
		...st,
		color: HEX.dim
	});
	const w0 = L.measure(head, st);
	L.text(mid, x + w0, y, {
		...st,
		weight: 700,
		color: "#ffd9d2",
		glow: 10,
		glowColor: HEXR
	});
	L.text(tail, x + w0 + L.measure(mid, {
		...st,
		weight: 700
	}), y, {
		...st,
		color: HEX.dim
	});
}
function overlays(ctx, K, st, o = {}) {
	const L = ctx.text.overlay, ink = o.ink;
	if (o.frame !== false) frame(L, ctx.t, ctx.T, {
		label: "fork",
		bottomRight: o.br ?? `${BOMB}   bash fork bomb`,
		color: ink ? "#5a5d66" : void 0
	});
	else L.text(o.br ?? `${BOMB}   bash fork bomb`, 1840, 1028, {
		size: 14,
		weight: 500,
		color: HEX.dim,
		align: "right",
		alpha: .55
	});
	if (o.readout !== false && st.k) {
		const rows = st.k >= 12 && ctx.t >= K.H[12] ? [
			["world_size", "4096"],
			["pid ≤", fmt(st.pidMax)],
			["|path|", PATH[12].toFixed(3)]
		] : [
			["depth", `${Math.min(st.k, 12)} / 12`],
			["pid ≤", fmt(st.pidMax)],
			["|path|", PATH[Math.min(st.k, 12)].toFixed(3)]
		];
		readout(L, o.rx ?? 1540, o.ry ?? 150, rows, {
			accent: ink ? "#b3261e" : HEXR,
			keyW: rows[0][0] === "world_size" ? 116 : 86
		});
	}
	if (o.counter !== false) counter(L, st, o.cx, o.cy, { ink });
	if (o.world) worldSize(L, ctx.t, K.H[12], o.cx ?? 104, (o.cy ?? 206) + 112);
	forkLog(L, K, ctx.t, o.lx, {
		ink,
		remake: remade(ctx)
	});
}
/** The console: the last lines of the fork() log, newest at the bottom, in the film's console style. */
function forkLog(L, K, t, x = 110, o = {}) {
	const log = o.remake ? K.logB : K.log, ink = o.ink;
	let lo = 0, hi = log.length - 1, n = -1;
	while (lo <= hi) {
		const m = lo + hi >> 1;
		if (log[m].t <= t) {
			n = m;
			lo = m + 1;
		} else hi = m - 1;
	}
	if (n < 0) return;
	const keep = 5, size = 23, lh = size * 1.42, y = 936;
	for (let a = 0; a < keep && n - a >= 0; a++) {
		const e = log[n - a], yy = y - a * lh, alpha = [
			1,
			.5,
			.3,
			.2,
			.13
		][a];
		L.text(e.s, x, yy, {
			size,
			weight: 500,
			align: "left",
			color: ink ? e.cmd ? "#101216" : a === 0 ? "#b3261e" : "#5a5d66" : e.cmd ? HEX.white : a === 0 ? o.remake && t >= K.X[9] && t < K.end ? "#ededed" : "#ffb2a6" : HEX.dim,
			alpha,
			glow: a === 0 && !ink ? 8 : 0,
			glowColor: HEXR
		});
	}
}
/** A numeral of the count in its own script: it decodes through glyphs of that script, then locks. (The remake,
* docs/REMAKE.md §3.3: it appears as itself, with no other glyphs first, on its cut: the sung onset.) */
var POOL = {
	lat: "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&$@",
	zh: "零一二三四五七八九十百千万亿兆"
};
var COUNT_SHOT = [
	null,
	"ein",
	"dos",
	"trois",
	"net",
	"fem",
	"liu"
];
function numeral(ctx, n, x, y, o = {}) {
	const t = ctx.t, t0 = remade(ctx) ? Math.min(KC.C[n], ctx.startOf(`chant/${COUNT_SHOT[n]}`) ?? KC.C[n]) : KC.C[n];
	if (t < t0) return;
	const S = SCRIPTS[n - 1], f = Math.floor(t * 30), dec = .13;
	let s = "";
	for (let i = 0; i < S.word.length; i++) {
		if (remade(ctx) || t >= t0 + dec * (i + 1) / S.word.length) {
			s += S.word[i];
			continue;
		}
		const h = hash(i * 31.7 + f * 7.3 + n * 3.1);
		s += S.lang === "ko" ? String.fromCharCode(44032 + Math.floor(h * 11172)) : S.lang === "zh" ? POOL.zh[Math.floor(h * POOL.zh.length)] : POOL.lat[Math.floor(h * POOL.lat.length)];
	}
	const pop = ease.outBack(seg(t, t0, t0 + .16), 1.2), size = S.size * (o.scale ?? 1), al = o.align ?? "center";
	ctx.text.scene.text(s, x, y, {
		size,
		weight: S.weight,
		font: remade(ctx) && S.lang === "zh" ? "Noto Sans SC" : S.font,
		color: HEX.white,
		glow: 24,
		glowColor: HEXR,
		scale: .9 + .1 * pop,
		align: al,
		tracking: S.lang === "ko" || S.lang === "zh" ? 0 : size * .05
	});
	const L = ctx.text.overlay, ty = y + size * .66, tx = al === "left" ? x + 8 : x;
	L.text(`${S.lang} · ${n}`, tx, ty, {
		size: 22,
		weight: 600,
		color: HEXR,
		align: al,
		alpha: seg(t, t0 + .04, t0 + .14),
		tracking: 4
	});
	let xx = al === "left" ? tx : tx - 150, row = [];
	for (let i = 0; i < n; i++) row.push(SCRIPTS[i]);
	row.forEach((r, i) => {
		const font = r.lang === "ko" ? "Apple SD Gothic Neo" : r.lang === "zh" ? remade(ctx) ? "Noto Sans SC" : "PingFang SC" : "JetBrains Mono";
		L.text(r.word, xx, ty + 36, {
			size: 18,
			weight: 600,
			font,
			color: i === n - 1 ? HEX.white : HEX.dim,
			align: "left",
			alpha: .85
		});
		xx += L.measure(r.word, {
			size: 18,
			weight: 600,
			font
		}) + 14;
	});
	const toks = TOKENS[n - 1], ts = {
		size: 18,
		weight: 600,
		align: "center",
		font: "JetBrains Mono"
	}, gap = 6, a = seg(t, t0 + .1, t0 + .24);
	if (a <= 0) return;
	const widths = toks.map(([p]) => Math.max(36, L.measure(p, ts) + 22)), total = widths.reduce((u, v) => u + v, 0) + gap * (toks.length - 1);
	const by = ty + 78;
	let bx = al === "left" ? tx : tx - total / 2;
	const x0 = bx;
	L.draw((g) => {
		g.globalAlpha *= .9 * a;
		g.strokeStyle = HEXR;
		g.lineWidth = 1.3;
		let xb = x0;
		widths.forEach((w) => {
			g.strokeRect(xb + .5, by - 16.5, w - 1, 32);
			xb += w + gap;
		});
	});
	toks.forEach(([p, id], i) => {
		const cx = bx + widths[i] / 2;
		L.text(p, cx, by, {
			...ts,
			color: HEX.white,
			alpha: a
		});
		L.text(String(id), cx, by + 33, {
			size: 15,
			weight: 500,
			align: "center",
			color: HEXR,
			alpha: a
		});
		bx += widths[i] + gap;
	});
	if (o.tokenizer) L.text(TOKENIZER, al === "left" ? x0 : tx, by + 58, {
		size: 14,
		weight: 500,
		align: al,
		color: HEX.dim,
		alpha: .8 * a
	});
}
function look(ctx, o = {}) {
	Object.assign(ctx.post, {
		bloom: 1,
		threshold: .95,
		ca: .16,
		vignette: .42,
		grain: .03,
		exposure: 1,
		...o
	});
}
function begin(ctx) {
	const K = keys(ctx.T);
	reset();
	HEXR = HEX.red;
	return [K, forkState(ctx.t, K)];
}
/** Camera shake that decays after each hit (deterministic). */
var jolt = (st, amp = .02) => shake(st.t, amp * Math.exp(-Math.max(0, st.lastHit) * 8));
var add = (a, b) => a.map((v, i) => v + b[i]);
/** Hero of hit k: the all-plus corner process (PID 2^k − 1) dividing along axis k. */
var HERO = (k) => (1 << k - 1) - 1;
/**
* A hit: close on the hero process as it divides (flare, counter), with every other process dividing behind it.
* dir: camera direction from the hero; dist: distance in units of the split length; up, fov, roll (Dutch angle);
* shift: where the hero sits off-centre (split lengths); ap: aperture; aim: frame this point instead (no hero LOD).
*/
function hitShot(id, k, { dir, dist, up = null, fov = 34, roll = 0, shift = [0, 0], ap = .04, bright = 1, aim = null, mode = null, modeOpts = {}, string = false }) {
	return {
		id,
		at: (T) => keys(T).X[k],
		ownsLyrics: true,
		draw(ctx) {
			const [K, st] = begin(ctx), lt = ctx.t - K.X[k], L = lenOf(k), hero = procPos(HERO(k), k - 1), c = aim ?? hero;
			const push = lerp(1.1, 1, ease.outCubic(seg(lt, 0, .3))), D = dist * L * push, sh = jolt(st, .012 * L), n = Math.hypot(...dir);
			const pos = add(add(c, dir.map((v) => v * D / n)), sh);
			const f = new Vector3(-dir[0], -dir[1], -dir[2]).normalize(), r = new Vector3().crossVectors(f, new Vector3(...up ?? [
				0,
				1,
				0
			])).normalize(), u = new Vector3().crossVectors(r, f);
			const cam = persp(ctx, pos, add(c, [
				0,
				1,
				2
			].map((i) => (-r.getComponent(i) * shift[0] - u.getComponent(i) * shift[1]) * L)), {
				fov,
				up,
				roll: roll * (1 - .25 * ease.outCubic(seg(lt, 0, .3)))
			});
			const focus = Math.hypot(pos[0] - hero[0], pos[1] - hero[1], pos[2] - hero[2]), dof = [
				focus,
				ap * Math.min(1, .35 / L),
				24
			], near = [focus * .35, focus * .8];
			const body = (cx) => {
				if (aim) drawTree(cx, cam, st, {
					dof,
					near,
					bright: bright * 1.3,
					lines: { ws: .8 }
				});
				else {
					const hn = 2 ** k - 1, crowd = lerp(.45, 1, seg(k, 3, 12));
					drawTree(cx, cam, st, {
						dof,
						near,
						bright,
						lines: {
							ws: .8,
							hiNode: hn,
							hiGain: 1.6,
							loGain: .38 * crowd
						},
						swarm: {
							hiNode: hn,
							hiGain: 0,
							loGain: .6 * crowd,
							size: .0075 * L ** .5
						}
					});
					drawHero(cx, cam, st, HERO(k), k - 1, {
						dof,
						near
					});
				}
				flare(st, k, hero);
				if (aim) flare(st, k, procPos(0, k - 1));
				render(cx, cam);
			};
			look(ctx, { vignette: .5 });
			if (mode) instrument(ctx, mode, body, modeOpts);
			else body(ctx);
			const kids = [2 * (2 ** k - 1), 2 * (2 ** k - 1) + 1], q = toDesign(procPos(HERO(k) | 1 << k - 1, st.G), cam);
			if (string) forkString(ctx, cam, st, k);
			else callout(ctx.text.overlay, [q[0], q[1]], `pid ${2 ** k - 1} → ${kids[0]}, ${kids[1]}`, {
				dx: 56,
				dy: -52,
				color: HEXR,
				draw: seg(lt, .04, .16)
			});
			overlays(ctx, K, st, { br: mode ? `view  ${mode}` : void 0 });
		}
	};
}
/**
* The fork bomb forking, literally: the hero process is the string `:(){ :|:& };:` itself, and on the hit it becomes two
* copies that ride the two child processes apart (screen space, locked to their projected positions).
*/
function forkString(ctx, cam, st, k) {
	const lt = ctx.t - KC.X[k], L = ctx.text.scene, pair = [HERO(k), HERO(k) | 1 << k - 1];
	const style = {
		size: 50,
		weight: 700,
		align: "center",
		font: "JetBrains Mono",
		tracking: 2
	};
	const split = ease.outCubic(seg(lt, 0, SPLIT));
	pair.forEach((bits, i) => {
		const p = procPos(bits, st.G), q = toDesign(p, cam), hot = Math.exp(-lt * 6);
		if (i === 1 && split <= .02) return;
		L.text(BOMB, q[0], q[1] - 70, {
			...style,
			color: "#ffe8e2",
			glow: 14 + 18 * hot,
			glowColor: HEXR,
			alpha: i ? split : 1
		});
		ctx.text.overlay.text(`pid ${pidOf(bits, k)}`, q[0], q[1] - 30, {
			size: 16,
			weight: 600,
			align: "center",
			color: HEXR,
			alpha: .9 * (i ? split : 1)
		});
	});
}
var revealShot = (id, k, draw) => ({
	id,
	at: (T) => keys(T).H[k],
	ownsLyrics: true,
	draw
});
/**
* (The remake, docs/REMAKE.md §12.7 item 8) Replays. The EXECUTIONs come in fours, the fourth sung higher; on the 4th,
* 8th and 12th the camera goes into the dividing process's flare and four frames of this film's own past flash by on the
* sung and drummed onsets (+½, +1, +1½, +1¾ beat), as if every forked world were replaying what happened: the beginning,
* being together, the loss. The first two in the chant's red, the 12th (the death sentence) in the machine's dots,
* each frame frozen and cut off. Each memory is drawn by its own shot at its own time (engine.renderShotAt).
*/
var MEMORY = {
	4: [
		[
			"title/execute",
			16.4,
			"world"
		],
		[
			"v1/circleDraw",
			34.75,
			"circle"
		],
		[
			"v1/youRide",
			39.35,
			"tangent"
		],
		[
			"pre1/helix",
			57.8,
			"helix"
		]
	],
	8: [
		[
			"c1/aerial",
			70.05,
			"city"
		],
		[
			"c1/cell",
			72.75,
			"cell"
		],
		[
			"v2/youPurr",
			84,
			"purr"
		],
		[
			"pre2/gate",
			100,
			"gate"
		]
	],
	12: [
		[
			"c2/vibrations",
			107,
			"plate"
		],
		[
			"c2/rise",
			111.4,
			"left"
		],
		[
			"c2x/crack",
			124.75,
			"heart"
		],
		[
			"bridge/assert",
			128.3,
			"assert"
		]
	]
};
var memShot = (k, j) => ({
	id: `mem${k}${"abcd"[j]}`,
	editOnly: true,
	ownsLyrics: true,
	at: (T) => {
		const K = keys(T);
		return K.X[k] + (K.B(1) - K.B(0)) * [
			.5,
			1,
			1.5,
			1.75
		][j];
	},
	draw(ctx) {
		const [K, st] = begin(ctx), [src, t0, name] = MEMORY[k][j], dead = k === 12, lt = ctx.t - ctx.shot.start;
		const tau = dead ? t0 : t0 + .5 * lt;
		const tex = capture(ctx, (sub) => ctx.engine.renderShotAt(src, tau, sub.target));
		if (dead) view(ctx, tex, "halftone", {
			ink: [
				.9,
				.9,
				.88
			],
			paper: [
				0,
				0,
				0
			],
			pix: 6,
			gain: 1.5
		});
		else view(ctx, tex, "duotone", {
			ink: [
				1,
				.3,
				.22
			],
			paper: [
				0,
				0,
				0
			],
			gain: 1.5
		});
		const m = Math.floor(tau + 5), ss = String(Math.floor((tau + 5) % 60)).padStart(2, "0");
		overlays(ctx, K, st, { br: `replay · ${Math.floor(m / 60)}:${ss} · ${name}${dead ? "   +++ killed +++" : ""}` });
	}
});
/** Split screens: views [{ rect, label, view, cam(aspect) }]. */
function splitViews(ctx, st, views, o = {}) {
	O.fx.end(ctx);
	for (const v of views) {
		ctx.viewport(v.rect, (wp, hp) => {
			const cam = v.cam(wp / hp);
			reset();
			drawTree(ctx, cam, st, {
				view: v.view,
				...o,
				...v.opts
			}, wp, hp);
			if (v.hero) drawHero(ctx, cam, st, v.hero[0], v.hero[1], v.opts, hp);
			ctx.draw(O.scene, cam);
		});
		viewportFrame(ctx.text.overlay, v.rect, v.label, { labelColor: HEXR });
	}
}
/** View j of the hold after hit k (j = 0 is the hold shot itself): the machine's eye flicking faster as it forks. */
var subShot = (id, k, j, draw) => ({
	id,
	at: (T) => keys(T).S[k][j],
	ownsLyrics: true,
	draw
});
/** The path (bits) of the generation-k process nearest to point p: at each level, the branch toward p. */
function nearest(p, k) {
	const c = [
		0,
		0,
		0
	];
	let bits = 0;
	for (let j = 1; j <= k; j++) {
		const a = axisOf(j), s = p[a] >= c[a] ? 1 : 0;
		bits |= s << j - 1;
		c[a] += (s ? 1 : -1) * lenOf(j);
	}
	return bits;
}
/**
* Macro on one process (its own dense swarm) with the lattice around it as bokeh. bits/k: the process's path and
* generation; from: camera offset from it; o.aim: look-at offset; o.focus: focus distance (rack focus), default on it.
*/
function macro(ctx, st, bits, k, from, o = {}) {
	const c = procPos(bits, st.G), pos = add(c, from), d = Math.hypot(...from);
	const cam = persp(ctx, pos, add(c, o.aim ?? [
		0,
		0,
		0
	]), {
		fov: o.fov ?? 34,
		roll: o.roll ?? 0
	});
	const dof = [
		o.focus ?? d,
		o.ap ?? .035,
		o.maxBlur ?? 22
	], near = [d * .35, d * .8];
	drawTree(ctx, cam, st, {
		dof,
		near,
		fog: [d + (o.fogAt ?? .7), o.fogK ?? .5],
		bright: o.crowd ?? 1,
		lineBright: o.lineBright ?? 1,
		lines: { ws: .8 },
		swarm: {
			hiNode: pidOf(bits, k),
			hiGain: 0,
			loGain: .8
		}
	});
	drawHero(ctx, cam, st, bits, k, {
		dof,
		near,
		bright: o.hero ?? 1
	});
	return {
		cam,
		c,
		d
	};
}
/** The clock edge on its way down the tree: distance travelled / root-to-leaf length (the same for every leaf). */
function clockTag(L, st, x = 1876, y = 996) {
	if (st.pulseOn <= 0 || !st.k) return;
	L.text(`clock edge  ${st.pulse.toFixed(3)} / ${PATH[Math.min(st.k, 12)].toFixed(3)}   skew 0.000`, x, y, {
		size: 15,
		weight: 500,
		align: "right",
		color: HEX.dim,
		alpha: .85 * st.pulseOn
	});
}
/** A tomographic section: restrict an orthographic camera (from ortho()) to the slab [−lo, +hi] around its target. */
function slab(c, lo, hi) {
	c.near = 40 - hi;
	c.far = 40 + lo;
	c.updateProjectionMatrix();
	return c;
}
/**
* Monge's projection: the tree flattened onto three faces of its sandbox (the plan on the floor, the elevation on the
* back wall, the profile on the side wall), each pass exposure-compensated like the matching orthographic view.
*/
function mongeViews(ctx, cam, st, s = 3, o = {}) {
	const tree = [O.lines.mesh, O.swarm.points], rest = [
		O.floor,
		O.wall,
		O.wallX,
		O.fx.mesh,
		O.code.points,
		O.glyphs.points,
		O.hero.points
	];
	const vis = rest.map((m) => m.visible);
	rest.forEach((m) => {
		m.visible = false;
	});
	for (const [view, sc, ps] of [
		[
			"top",
			[
				1,
				.001,
				1
			],
			[
				0,
				-s,
				0
			]
		],
		[
			"front",
			[
				1,
				1,
				.001
			],
			[
				0,
				0,
				-s
			]
		],
		[
			"side",
			[
				.001,
				1,
				1
			],
			[
				-s,
				0,
				0
			]
		]
	]) {
		drawTree(ctx, cam, st, {
			view,
			bright: o.bright ?? .5,
			lineBright: o.lineBright ?? .55,
			...o.tree
		});
		for (const m of tree) {
			m.scale.set(...sc);
			m.position.set(...ps);
			m.updateMatrixWorld();
		}
		ctx.draw(O.scene, cam);
	}
	for (const m of tree) {
		m.scale.set(1, 1, 1);
		m.position.set(0, 0, 0);
		m.updateMatrixWorld();
	}
	rest.forEach((m, i) => {
		m.visible = vis[i];
	});
	const hi = o.rim ?? 2, gc = RED.map((c) => c * .2), rc = COL.white.map((c) => c * .3);
	for (let a = 0; a < 3; a++) {
		const b = (a + 1) % 3, c = (a + 2) % 3, P = (u, v) => {
			const p = [
				0,
				0,
				0
			];
			p[a] = -s;
			p[b] = u;
			p[c] = v;
			return p;
		};
		for (let u = -s; u <= hi + 1e-6; u += .5) {
			const rim = Math.abs(u - hi) < 1e-6;
			O.fx.segment(P(u, -s), P(u, hi), {
				color: rim ? rc : gc,
				width: rim ? 1.6 : 1
			});
			O.fx.segment(P(-s, u), P(hi, u), {
				color: rim ? rc : gc,
				width: rim ? 1.6 : 1
			});
		}
	}
	const q = procPos(nearest(o.from ?? [
		1.5,
		1.5,
		1.5
	], 12), st.G), lc = COL.white.map((c) => c * .22);
	for (let a = 0; a < 3; a++) {
		const f = [...q];
		f[a] = -s;
		O.fx.segment(q, f, {
			color: lc,
			width: 1.1
		});
		O.fx.segment(f, f, {
			color: lc.map((c) => c * 3),
			width: 9
		});
	}
}
chapter({
	id: "chant",
	from: (T) => T.section("chant").start,
	to: (T) => T.section("c3").start,
	init() {
		O = {
			scene: new Scene(),
			persp: newCamera(38),
			ortho: new OrthographicCamera(-1, 1, 1, -1, .01, 200)
		};
		O.swarm = new ForkSwarm(1 << 18);
		O.hero = new ForkSwarm(65536);
		O.lines = new ForkLines();
		O.fx = new GlowLines(4096);
		O.floor = grid({
			plane: "xz",
			offset: OFF
		});
		O.wall = grid({
			plane: "xy",
			offset: OFF
		});
		O.wallX = grid({
			plane: "yz",
			offset: OFF
		});
		O.glyphs = new GlyphField({ count: 4096 }).text("chant/bomb", bombText);
		O.code = new GlyphField({ count: 16384 });
		O.src = {
			chant: source("ch/12_chant.js"),
			fork: source("ch/chant/fork.js"),
			ps6: psText(6),
			ranks: rankText
		};
		O.scene.add(O.code.points, O.floor, O.wall, O.wallX, O.lines.mesh, O.swarm.points, O.hero.points, O.glyphs.points, O.fx.mesh);
	},
	shots: [
		{
			id: "ignite",
			at: (T) => T.section("chant").start,
			ownsLyrics: true,
			draw(ctx) {
				const [K, st] = begin(ctx), t = ctx.t;
				const push = ease.outCubic(seg(t, K.X[1] + .02, K.X[1] + .3)), sh = jolt(st, .015);
				const cam = persp(ctx, [
					sh[0],
					sh[1],
					lerp(16, 6.2, push)
				], [
					0,
					0,
					0
				], { fov: 32 });
				if (t < K.X[1]) ctx.text.scene.draw((g) => {
					g.fillStyle = HEX.white;
					g.fillRect(940, 537, 40, 6);
				});
				else {
					drawTree(ctx, cam, st, {
						bright: 1.8,
						swarm: { size: .007 }
					});
					flare(st, 1, [
						0,
						0,
						0
					], 1.2);
					const k = ease.outCubic(seg(st.lastHit, 0, .3)), core = Math.exp(-st.lastHit * 14);
					O.fx.segment([
						-.17,
						0,
						0
					], [
						.17,
						0,
						0
					], {
						color: HOT.map((c) => c * 2.2 * core),
						width: 5
					});
					ring([
						0,
						0,
						0
					], 2, .25 + 1.3 * k, HOT.map((c) => c * 1.1 * (1 - k) ** 2), 1.6);
				}
				render(ctx, cam);
				overlays(ctx, K, st, { readout: t >= K.X[1] });
				look(ctx);
			}
		},
		revealShot("pair", 1, (ctx) => {
			const [K, st] = begin(ctx), t = ctx.t, az = .5 + (t - K.H[1]) * .22;
			const cam = persp(ctx, [
				4.8 * Math.sin(az),
				-.7,
				4.8 * Math.cos(az)
			], [
				0,
				.1,
				0
			], { fov: 38 });
			textWall(ctx, cam, "src-chant", O.src.chant, {
				origin: [
					-10.5,
					5.8,
					-6
				],
				cell: .16,
				cols: 130,
				rows: 72,
				bright: .2,
				scroll: .45,
				focus: 4.8,
				aperture: .004,
				maxBlur: 8,
				reveal: ease.outCubic(seg(t, K.H[1], K.H[1] + .5))
			});
			drawTree(ctx, cam, st);
			render(ctx, cam);
			for (const [bits, dx] of [[0, -1], [1, 1]]) {
				const p = procPos(bits, st.G), q = toDesign([
					p[0],
					p[1] + .55,
					p[2]
				], cam);
				callout(ctx.text.overlay, [q[0], q[1]], `pid ${pidOf(bits, 1)}`, {
					dx: dx * 50,
					dy: -46,
					color: HEXR,
					draw: seg(t, K.H[1] + .05, K.H[1] + .3)
				});
			}
			overlays(ctx, K, st);
			look(ctx);
		}),
		hitShot("hit2", 2, {
			dir: [
				.1,
				.06,
				1
			],
			dist: 5.6,
			aim: [
				0,
				0,
				0
			]
		}),
		revealShot("H", 2, (ctx) => {
			const [K, st] = begin(ctx), t = ctx.t, lt = t - K.H[2];
			const cam = ortho([
				0,
				lerp(.05, 0, ease.outCubic(seg(lt, 0, .6))),
				0
			], "front", lerp(4.1, 3.9, ease.outCubic(seg(lt, 0, .6))), ctx.aspect);
			const dark = remade(ctx);
			if (dark) {
				look(ctx, { vignette: .3 });
				drawTree(ctx, cam, st, {
					view: "front",
					bright: 1,
					swarm: { fade: .15 }
				});
				for (let b = 0; b < 4; b++) {
					const p = procPos(b, st.G);
					O.fx.segment(p, p, {
						color: [
							1.6,
							1.5,
							1.45
						],
						width: 13
					});
				}
				render(ctx, cam);
			} else {
				look(ctx, { vignette: .12 });
				instrument(ctx, "paper", (sub) => {
					drawTree(sub, cam, st, {
						view: "front",
						bright: 1.3,
						swarm: { fade: .15 }
					});
					for (let b = 0; b < 4; b++) {
						const p = procPos(b, st.G);
						O.fx.segment(p, p, {
							color: [
								3,
								3,
								3
							],
							width: 15
						});
					}
					render(sub, cam);
				}, { gain: 2.2 });
			}
			const L = ctx.text.overlay, a = toDesign([
				-1,
				-1,
				0
			], cam), b = toDesign([
				1,
				-1,
				0
			], cam), c = toDesign([
				-1,
				1,
				0
			], cam);
			const ink = dark ? "#e4e2e0" : "#15171c", red = dark ? HEXR : "#b3261e", la = seg(t, K.H[2] + .05, K.H[2] + .25);
			dimLine(L, a, b, "2a₁ = 2.000", {
				offset: 76,
				color: red,
				alpha: la
			});
			dimLine(L, a, c, "2a₂ = 2.000", {
				offset: -76,
				color: red,
				alpha: seg(t, K.H[2] + .1, K.H[2] + .3)
			});
			for (let bits = 0; bits < 4; bits++) {
				const p = procPos(bits, st.G), q = toDesign(p, cam), up = bits >= 2;
				L.text(`pid ${pidOf(bits, 2)}`, q[0] + (bits & 1 ? 20 : -20), q[1] + (up ? -22 : 30), {
					size: 17,
					weight: 600,
					align: bits & 1 ? "left" : "right",
					color: ink,
					alpha: la
				});
			}
			L.text(dark ? "H-tree: every root-to-leaf path = a₁ + a₂ (zero clock skew)" : "fig. 2 — H-tree: every root-to-leaf path = a₁ + a₂ (zero clock skew)", 960, 985, {
				size: 16,
				weight: 500,
				align: "center",
				color: dark ? HEX.dim : "#3c3f47",
				alpha: seg(t, K.H[2] + .15, K.H[2] + .35)
			});
			overlays(ctx, K, st, dark ? { br: "view  front · orthographic" } : {
				br: "view  front · orthographic · paper",
				ink: true
			});
		}),
		hitShot("hit3", 3, {
			dir: [
				1,
				.16,
				.1
			],
			dist: 3.4,
			roll: .1
		}),
		revealShot("cube", 3, (ctx) => {
			const [K, st] = begin(ctx), t = ctx.t, az = -.72 + (t - K.H[3]) * .35;
			const cam = persp(ctx, [
				5.6 * Math.sin(az),
				2.5,
				5.6 * Math.cos(az)
			], [
				0,
				0,
				0
			], { fov: 40 });
			floor(-2.2, .25);
			drawTree(ctx, cam, st);
			sandbox(seg(t, K.H[3] + .1, K.H[3] + .5));
			render(ctx, cam);
			const v = toDesign([
				1,
				1,
				1
			], cam);
			callout(ctx.text.overlay, [v[0], v[1]], "pid 15 · (1, 1, 1)", {
				dx: 60,
				dy: -60,
				color: HEXR,
				draw: seg(t, K.H[3] + .1, K.H[3] + .35)
			});
			overlays(ctx, K, st);
			look(ctx);
		}),
		hitShot("hit4", 4, {
			dir: [
				.14,
				.18,
				1
			],
			dist: 3.6,
			roll: -.14,
			shift: [.35, 0],
			mode: "thermal",
			modeOpts: { gain: 1.8 }
		}),
		revealShot("top4", 4, (ctx) => {
			const [K, st] = begin(ctx), t = ctx.t, lt = t - K.H[4];
			const cam = ortho([
				0,
				0,
				0
			], "top", lerp(4.7, 4.3, ease.inOutSine(seg(lt, 0, 1.2))), ctx.aspect, { roll: lt * .05 });
			look(ctx, { vignette: .3 });
			instrument(ctx, "thermal", (sub) => {
				drawTree(sub, cam, st, {
					view: "top",
					bright: 1.2
				});
				render(sub, cam);
			}, { gain: 1.8 });
			const a = toDesign([
				-1.5,
				0,
				1
			], cam), b = toDesign([
				-.5,
				0,
				1
			], cam);
			dimLine(ctx.text.overlay, a, b, "pitch 1.000", {
				offset: 64,
				color: HEX.white,
				alpha: seg(t, K.H[4] + .05, K.H[4] + .25)
			});
			ctx.text.overlay.text("thermal · inferno · T ∝ 2^−age", 1876, 1e3, {
				size: 14,
				weight: 500,
				align: "right",
				color: HEX.dim,
				alpha: .7
			});
			overlays(ctx, K, st, { br: "view  top · orthographic · thermal" });
		}),
		hitShot("hit5", 5, {
			dir: [
				1,
				.1,
				.22
			],
			dist: 4.6,
			roll: .22,
			shift: [-.5, 0],
			string: true
		}),
		revealShot("cad5", 5, (ctx) => {
			const [K, st] = begin(ctx), t = ctx.t, gp = 6, w = 951, h = 531;
			splitViews(ctx, st, [
				{
					rect: [
						gp,
						gp,
						w,
						h
					],
					label: "XY · front",
					view: "front",
					cam: (a) => ortho([
						0,
						0,
						0
					], "front", 4.6, a, { inset: true })
				},
				{
					rect: [
						963,
						gp,
						w,
						h
					],
					label: "XZ · top",
					view: "top",
					cam: (a) => ortho([
						0,
						0,
						0
					], "top", 4.6, a, { inset: true })
				},
				{
					rect: [
						gp,
						543,
						w,
						h
					],
					label: "ZY · side",
					view: "side",
					cam: (a) => ortho([
						0,
						0,
						1.6
					], "side", 4.6, a, { inset: true })
				},
				{
					rect: [
						963,
						543,
						w,
						h
					],
					label: "XYZ · perspective",
					cam: (a) => persp(ctx, [
						5.6 * Math.sin(.7 + t * .3),
						2.2,
						5.6 * Math.cos(.7 + t * .3)
					], [
						0,
						0,
						0
					], {
						fov: 40,
						aspect: a,
						inset: true
					})
				}
			]);
			overlays(ctx, K, st, {
				readout: false,
				frame: false,
				cx: 1010,
				cy: 600
			});
			look(ctx, { vignette: .2 });
		}),
		subShot("low5", 5, 1, (ctx) => {
			const [K, st] = begin(ctx), az = -.42 + ctx.lt * .6, R = lerp(5.2, 4.5, ease.outCubic(ctx.p));
			const cam = persp(ctx, [
				R * Math.sin(az),
				-2.02,
				R * Math.cos(az)
			], [
				0,
				-.5,
				0
			], {
				fov: 60,
				roll: -.07
			});
			floor(-2.3, .34, { fade: .08 });
			drawTree(ctx, cam, st, { bright: 1.2 });
			render(ctx, cam);
			clockTag(ctx.text.overlay, st);
			overlays(ctx, K, st, { br: "view  low angle · perspective" });
			look(ctx);
		}),
		hitShot("hit6", 6, {
			dir: [
				.1,
				1,
				.16
			],
			dist: 4.6,
			up: [
				0,
				0,
				-1
			],
			fov: 38,
			roll: -.35,
			mode: "ascii",
			modeOpts: {
				cell: 14,
				tint: [
					1,
					.32,
					.24
				],
				source: .35,
				gain: 2.4
			}
		}),
		revealShot("wide6", 6, (ctx) => {
			const [K, st] = begin(ctx), t = ctx.t, lt = t - K.H[6], k = ease.inOutSine(seg(lt, 0, ctx.dur * 1.25)), az = .6 + .35 * k;
			const cam = remade(ctx) ? wide6Cam(ctx, lt) : persp(ctx, [
				24 * Math.sin(az),
				lerp(15, 2.2, k),
				24 * Math.cos(az)
			], [
				0,
				lerp(-.6, .6, k),
				0
			], { fov: 30 });
			textWall(ctx, cam, "ps6", O.src.ps6, {
				origin: [
					-6.5,
					7.2,
					-9
				],
				cell: .21,
				cols: 30,
				rows: 66,
				bright: .3,
				scroll: .7,
				palette: [
					.75,
					.16,
					.1
				],
				rx: 0,
				pos: [
					0,
					0,
					0
				]
			});
			drawTree(ctx, cam, st, { bright: 1.3 });
			sandbox(.8);
			render(ctx, cam);
			const q = toDesign([
				0,
				0,
				0
			], cam);
			crosshair(ctx.text.overlay, q[0], q[1], 90, {
				label: `${st.procs} procs`,
				color: HEXR
			});
			scope(ctx.text.overlay, ctx.F, t, 1560, 900, 240, 56, {
				color: HEXR,
				alpha: .6
			});
			overlays(ctx, K, st);
			look(ctx);
		}),
		subShot("monge6", 6, 1, (ctx) => {
			const [K, st] = begin(ctx), s = ease.outCubic(ctx.p);
			const cam = ortho(MONGE6.target, [
				1,
				lerp(MONGE6.dir[1], .72, s),
				1.3
			], lerp(8.6, 8, s), ctx.aspect);
			mongeViews(ctx, cam, st, 3, {
				bright: .3,
				lineBright: .38
			});
			drawTree(ctx, cam, st, { bright: 1.15 });
			render(ctx, cam);
			clockTag(ctx.text.overlay, st);
			overlays(ctx, K, st, { br: "view  axonometric · Monge projection" });
			look(ctx, { vignette: .3 });
		}),
		hitShot("hit7", 7, {
			dir: [
				.2,
				.14,
				1
			],
			dist: 4.6,
			fov: 38,
			roll: .2,
			shift: [.5, .2]
		}),
		revealShot("front7", 7, (ctx) => {
			const [K, st] = begin(ctx), t = ctx.t;
			t - K.H[7];
			const cam = ortho([
				0,
				0,
				0
			], "front", lerp(5.2, 4.6, ease.outCubic(ctx.p)), ctx.aspect);
			look(ctx, { vignette: .3 });
			instrument(ctx, "ascii", (sub) => {
				drawTree(sub, cam, st, {
					view: "front",
					bright: 1.4
				});
				render(sub, cam);
			}, {
				cell: 15,
				tint: [
					1,
					.32,
					.24
				],
				source: .35,
				gain: 2
			});
			const a = toDesign([
				-1.75,
				-1.5,
				0
			], cam), b = toDesign([
				1.75,
				-1.5,
				0
			], cam);
			dimLine(ctx.text.overlay, a, b, "x ∈ ±(1 + ½ + ¼)", {
				offset: 74,
				color: HEXR,
				alpha: seg(t, K.H[7] + .05, K.H[7] + .25)
			});
			overlays(ctx, K, st, { br: "view  front · orthographic · ascii" });
		}),
		subShot("code7", 7, 1, (ctx) => {
			const [K, st] = begin(ctx), lt = ctx.lt, a0 = -.85, az = a0 + lt * .5, R = lerp(7.6, 5.9, ease.outCubic(ctx.p));
			const cam = persp(ctx, [
				R * Math.sin(az),
				1.3 - lt * 1.4,
				R * Math.cos(az)
			], [
				0,
				-.05,
				0
			], {
				fov: 38,
				roll: .05
			});
			textWall(ctx, cam, "src-fork", O.src.fork, {
				origin: [
					-8.4,
					5.2,
					0
				],
				cell: .15,
				cols: 112,
				rows: 70,
				pos: [
					-Math.sin(a0) * 6,
					0,
					-Math.cos(a0) * 6
				],
				ry: a0,
				bright: .24,
				scroll: .8,
				palette: [
					.66,
					.13,
					.09
				],
				focus: R + 6,
				aperture: .004,
				maxBlur: 8
			});
			drawTree(ctx, cam, st, { bright: 1.1 });
			render(ctx, cam);
			clockTag(ctx.text.overlay, st);
			overlays(ctx, K, st, { br: "view  perspective · ch/chant/fork.js" });
			look(ctx);
		}),
		hitShot("hit8", 8, {
			dir: [
				1,
				.12,
				.22
			],
			dist: 6,
			fov: 40,
			roll: -.28,
			shift: [-.6, 0]
		}),
		revealShot("tri8", 8, (ctx) => {
			const [K, st] = begin(ctx), gp = 8, w = 1888 / 3, h = w * .9, y0 = 513.5999999999999 / 2 - 30, z = lerp(4.9, 4.4, ease.outCubic(ctx.p));
			splitViews(ctx, st, [
				{
					rect: [
						gp,
						y0,
						w,
						h
					],
					label: "XY · front",
					view: "front",
					cam: (a) => ortho([
						0,
						0,
						0
					], "front", z, a, { inset: true })
				},
				{
					rect: [
						645.3333333333334,
						y0,
						w,
						h
					],
					label: "XZ · top",
					view: "top",
					cam: (a) => ortho([
						0,
						0,
						0
					], "top", z, a, { inset: true })
				},
				{
					rect: [
						1282.6666666666667,
						y0,
						w,
						h
					],
					label: "ZY · side",
					view: "side",
					cam: (a) => ortho([
						0,
						0,
						0
					], "side", z, a, { inset: true })
				}
			]);
			overlays(ctx, K, st, {
				br: "orthographic · three views",
				cy: 150,
				frame: false
			});
			look(ctx, { vignette: .2 });
		}),
		subShot("dither8", 8, 1, (ctx) => {
			const [K, st] = begin(ctx), lt = ctx.lt, az = 1.95 + lt * 1.1, R = lerp(6.9, 6, ease.outCubic(ctx.p));
			const cam = persp(ctx, [
				R * Math.sin(az),
				2.7 - lt * 1.6,
				R * Math.cos(az)
			], [
				0,
				0,
				0
			], {
				fov: 40,
				roll: -.12
			});
			look(ctx);
			instrument(ctx, "dither", (sub) => {
				drawTree(sub, cam, st, { bright: 1.4 });
				sandbox(.8);
				render(sub, cam);
			}, {
				pix: 3,
				gain: 2.2,
				ink: [
					1,
					.9,
					.86
				]
			});
			clockTag(ctx.text.overlay, st);
			overlays(ctx, K, st, { br: "view  dither · 1-bit · bayer 8×8" });
		}),
		hitShot("hit9", 9, {
			dir: [
				.18,
				1,
				.12
			],
			dist: 6,
			up: [
				0,
				0,
				-1
			],
			fov: 42,
			roll: .4
		}),
		revealShot("orbit9", 9, (ctx) => {
			const [K, st] = begin(ctx), lt = ctx.t - K.H[9], az = 2.2 + lt * 1.3, R = lerp(6.8, 5.9, ease.outCubic(ctx.p));
			const cam = persp(ctx, [
				R * Math.sin(az),
				1.7 - lt * 2,
				R * Math.cos(az)
			], [
				0,
				0,
				0
			], { fov: 38 });
			const dof = [
				R - .9,
				.014,
				16
			];
			drawTree(ctx, cam, st, {
				dof,
				fog: [R - 1.6, .4],
				bright: .18,
				lines: { ws: .8 }
			});
			glyphNodes(ctx, cam, st, {
				dof,
				size: .17,
				bright: 1.1
			});
			sandbox(.7);
			render(ctx, cam);
			overlays(ctx, K, st, { br: `${BOMB}   512 processes · one character each` });
			look(ctx);
		}),
		subShot("macro9", 9, 1, (ctx) => {
			const [K, st] = begin(ctx), a = .55 + ctx.lt * 2.4, bits = nearest([
				.25,
				.75,
				-.75
			], 9);
			const { cam, c } = macro(ctx, st, bits, 9, [
				.46 * Math.sin(a),
				.17,
				.46 * Math.cos(a)
			], {
				fov: 36,
				roll: .12,
				ap: .04,
				aim: [
					.06 * Math.cos(a),
					-.02,
					-.06 * Math.sin(a)
				]
			});
			render(ctx, cam);
			const q = toDesign(c, cam);
			crosshair(ctx.text.overlay, q[0], q[1], 26, {
				label: `pid ${pidOf(bits, 9)} · (¼, ¾, −¾)`,
				color: HEXR,
				ring: true
			});
			overlays(ctx, K, st);
			look(ctx, { vignette: .5 });
		}),
		subShot("ascii9", 9, 2, (ctx) => {
			const [K, st] = begin(ctx);
			const cam = ortho([
				0,
				0,
				0
			], "side", lerp(4.9, 4.3, ease.outCubic(ctx.p)), ctx.aspect);
			look(ctx, { vignette: .3 });
			instrument(ctx, "ascii", (sub) => {
				drawTree(sub, cam, st, {
					view: "side",
					bright: 1.4
				});
				render(sub, cam);
			}, {
				cell: 13,
				tint: [
					1,
					.88,
					.82
				],
				source: .25,
				gain: 2.2
			});
			overlays(ctx, K, st, { br: "view  side · orthographic · ascii" });
		}),
		subShot("eyes9", 9, 3, (ctx) => {
			const [K, st] = begin(ctx), lt = ctx.lt, gp = 6, w = 632, h = 352, R = 8.8, views = [];
			const deg = (a) => (Math.round(a * 180 / Math.PI) % 360 + 360) % 360;
			for (let i = 0; i < 9; i++) {
				const r = Math.floor(i / 3), c = i % 3, el = [
					.62,
					.16,
					-.36
				][r], az = -1.05 + c * 1.05 + (r - 1) * .35 + lt * (r === 1 ? -1.4 : 1.4);
				views.push({
					rect: [
						gp + c * 638,
						gp + r * 358,
						w,
						h
					],
					label: `eye ${i} · az ${deg(az)}° · el ${Math.round(el * 180 / Math.PI)}°`,
					cam: (a) => persp(ctx, [
						R * Math.cos(el) * Math.sin(az),
						R * Math.sin(el),
						R * Math.cos(el) * Math.cos(az)
					], [
						0,
						0,
						0
					], {
						fov: 34,
						aspect: a,
						inset: true
					})
				});
			}
			splitViews(ctx, st, views, {
				bright: .9,
				lineBright: .85
			});
			overlays(ctx, K, st, {
				readout: false,
				frame: false,
				cx: 670,
				cy: 398
			});
			look(ctx, { vignette: .15 });
		}),
		hitShot("hit10", 10, {
			dir: [
				.16,
				.22,
				1
			],
			dist: 7,
			fov: 44,
			roll: -.22,
			shift: [.8, .3],
			mode: "halftone",
			modeOpts: {
				pix: 8,
				ink: [
					1,
					.36,
					.28
				],
				gain: 1.8
			}
		}),
		revealShot("wide10", 10, (ctx) => {
			const [K, st] = begin(ctx), t = ctx.t, lt = t - K.H[10], az = -.78 + lt * .9, R = lerp(19, 15.5, ease.outCubic(ctx.p));
			const cam = persp(ctx, [
				R * Math.sin(az),
				7.2 - lt * 7,
				R * Math.cos(az)
			], [
				0,
				.2,
				0
			], {
				fov: 30,
				roll: .05
			});
			floor(-2.3, .3, { fade: .065 });
			drawTree(ctx, cam, st, { bright: 1.2 });
			sandbox(.8);
			render(ctx, cam);
			scope(ctx.text.overlay, ctx.F, t, 1560, 900, 240, 56, {
				color: HEXR,
				alpha: .6
			});
			overlays(ctx, K, st);
			look(ctx);
		}),
		subShot("macro10", 10, 1, (ctx) => {
			const [K, st] = begin(ctx), lt = ctx.lt, bits = nearest([
				-.1,
				-.3,
				.3
			], 10), from = [
				.2 - lt * .3,
				.36,
				.5
			];
			const d = Math.hypot(...from), f = lerp(d * .5, d, ease.inOutCubic(seg(ctx.p, .15, .75)));
			const { cam, c } = macro(ctx, st, bits, 10, from, {
				fov: 40,
				roll: -.2,
				ap: .05,
				focus: f,
				aim: [
					.05,
					-.03,
					0
				]
			});
			render(ctx, cam);
			const q = toDesign(c, cam);
			crosshair(ctx.text.overlay, q[0], q[1], 22, {
				label: `pid ${pidOf(bits, 10)} · focus ${f.toFixed(2)}`,
				color: HEXR,
				ring: true
			});
			overlays(ctx, K, st);
			look(ctx, { vignette: .5 });
		}),
		subShot("thermal10", 10, 2, (ctx) => {
			const [K, st] = begin(ctx), lt = ctx.lt, az = .5 + lt * 1.2, c = [
				1.25,
				.9,
				1.25
			];
			const cam = persp(ctx, [
				c[0] + 2.8 * Math.sin(az),
				c[1] + 1.2 - lt * 1.5,
				c[2] + 2.8 * Math.cos(az)
			], c, {
				fov: 44,
				roll: .16
			});
			look(ctx, { vignette: .3 });
			instrument(ctx, "thermal", (sub) => {
				drawTree(sub, cam, st, {
					bright: 1.3,
					dof: [
						3,
						.012,
						14
					]
				});
				render(sub, cam);
			}, { gain: 1.9 });
			clockTag(ctx.text.overlay, st);
			overlays(ctx, K, st, { br: "view  thermal · inferno" });
		}),
		subShot("bsp10", 10, 3, (ctx) => {
			const [K, st] = begin(ctx), lt = ctx.lt, gp = 6, W2 = 951, H1 = 1068, H2 = 531, W4 = 945 / 2, H4 = 525 / 2;
			const x1 = 963, y2 = 543, x3 = 1441.5, y3 = 811.5, az = .75 + lt * 1.6;
			const bits = nearest([
				1.2,
				.7,
				1.4
			], 10), pid = pidOf(bits, 10), c = procPos(bits, st.G);
			splitViews(ctx, st, [
				{
					rect: [
						gp,
						gp,
						W2,
						H1
					],
					label: "XYZ · perspective · 1/2",
					cam: (a) => persp(ctx, [
						9.4 * Math.sin(az),
						2.8 - lt * 2,
						9.4 * Math.cos(az)
					], [
						0,
						-.2,
						0
					], {
						fov: 40,
						aspect: a,
						inset: true
					})
				},
				{
					rect: [
						x1,
						gp,
						W2,
						H2
					],
					label: "XY · front · 1/4",
					view: "front",
					cam: (a) => ortho([
						0,
						0,
						0
					], "front", 4.3, a, { inset: true })
				},
				{
					rect: [
						x1,
						y2,
						W4,
						H2
					],
					label: "XZ · top · 1/8",
					view: "top",
					cam: (a) => ortho([
						0,
						0,
						0
					], "top", 4.9, a, { inset: true })
				},
				{
					rect: [
						x3,
						y2,
						W4,
						H4
					],
					label: "ZY · side · 1/16",
					view: "side",
					cam: (a) => ortho([
						0,
						0,
						0
					], "side", 4.3, a, { inset: true })
				},
				{
					rect: [
						x3,
						y3,
						W4,
						H4
					],
					label: `pid ${pid} · 1/16`,
					cam: (a) => persp(ctx, add(c, [
						.22 - lt * .3,
						.12,
						.46
					]), c, {
						fov: 34,
						aspect: a,
						inset: true
					}),
					opts: {
						dof: [
							.52,
							.03,
							16
						],
						near: [.2, .42],
						swarm: {
							hiNode: pid,
							hiGain: 0,
							loGain: .8
						}
					},
					hero: [bits, 10]
				}
			], { bright: 1.2 });
			overlays(ctx, K, st, {
				frame: false,
				readout: false,
				br: "the frame forks · binary partition"
			});
			look(ctx, { vignette: .2 });
		}),
		hitShot("hit11", 11, {
			dir: [
				1,
				.2,
				.3
			],
			dist: 8,
			fov: 46,
			roll: .24,
			shift: [.6, -.4],
			mode: "edges",
			modeOpts: {
				ink: [
					1,
					.42,
					.34
				],
				gain: 7
			}
		}),
		revealShot("split11", 11, (ctx) => {
			const [K, st] = begin(ctx), t = ctx.t, gp = 6, w = 951, h = 1068, lt = t - K.H[11];
			const c = procPos(HERO(11) | 1024, st.G);
			splitViews(ctx, st, [{
				rect: [
					gp,
					gp,
					w,
					h
				],
				label: "XY · front · orthographic",
				view: "front",
				cam: (a) => ortho([
					0,
					0,
					0
				], "front", 4.5, a, { inset: true })
			}, {
				rect: [
					963,
					gp,
					w,
					h
				],
				label: `pid 4095 · ×24`,
				cam: (a) => persp(ctx, [
					c[0] + .1 + lt * .35,
					c[1] + .06,
					c[2] + .75
				], c, {
					fov: 34,
					aspect: a,
					inset: true
				}),
				opts: {
					dof: [
						.76,
						.03,
						22
					],
					near: [.3, .6],
					swarm: {
						hiNode: 4095,
						hiGain: 0,
						loGain: .7
					}
				},
				hero: [2047, 11]
			}]);
			const q = toDesign(c, ortho([
				0,
				0,
				0
			], "front", 4.5, w / h, { inset: true }), [
				gp,
				gp,
				w,
				h
			]);
			crosshair(ctx.text.overlay, q[0], q[1], 20, {
				color: HEXR,
				ring: true
			});
			overlays(ctx, K, st, {
				readout: false,
				frame: false,
				cx: 1010,
				lx: 1016
			});
			look(ctx, { vignette: .2 });
		}),
		subShot("fly11", 11, 1, (ctx) => {
			const [K, st] = begin(ctx), lt = ctx.lt, x = -1.6 + lt * 4;
			const cam = persp(ctx, [
				x,
				.25,
				.5
			], [
				x + 3,
				.05,
				.3
			], {
				fov: 62,
				roll: .2 + lt * 1.1
			});
			drawTree(ctx, cam, st, {
				near: [.06, .4],
				fog: [2.2, .6],
				dof: [
					1.1,
					.02,
					14
				],
				bright: 1.3,
				lines: { ws: .9 }
			});
			render(ctx, cam);
			overlays(ctx, K, st, { br: "view  inside the lattice · perspective" });
			look(ctx, { vignette: .55 });
		}),
		subShot("halftone11", 11, 2, (ctx) => {
			const [K, st] = begin(ctx), lt = ctx.lt;
			const cam = ortho([
				.4,
				0,
				.25
			], "top", lerp(3.3, 2.8, ease.outCubic(ctx.p)), ctx.aspect, { roll: .3 + lt * .5 });
			look(ctx);
			instrument(ctx, "halftone", (sub) => {
				drawTree(sub, cam, st, {
					view: "top",
					bright: 1.9
				});
				render(sub, cam);
			}, {
				pix: 8,
				ink: [
					1,
					.36,
					.28
				],
				gain: 2.8,
				angle: .8
			});
			overlays(ctx, K, st, { br: "view  top · orthographic · halftone" });
		}),
		subShot("wide11", 11, 3, (ctx) => {
			const [K, st] = begin(ctx), lt = ctx.lt, a0 = 2.5, az = a0 + lt * 1.4, R = lerp(14, 11.5, ease.outCubic(ctx.p));
			const cam = persp(ctx, [
				R * Math.sin(az),
				3.4 - lt * 3,
				R * Math.cos(az)
			], [
				0,
				0,
				0
			], {
				fov: 32,
				roll: -.06
			});
			textWall(ctx, cam, "src-chant", O.src.chant, {
				origin: [
					-10,
					6.2,
					0
				],
				cell: .18,
				cols: 112,
				rows: 70,
				pos: [
					-Math.sin(a0) * 8,
					0,
					-Math.cos(a0) * 8
				],
				ry: a0,
				bright: .22,
				scroll: .9,
				focus: R + 8,
				aperture: .003,
				maxBlur: 8
			});
			drawTree(ctx, cam, st, { bright: 1.15 });
			sandbox(.8);
			render(ctx, cam);
			clockTag(ctx.text.overlay, st);
			overlays(ctx, K, st);
			look(ctx);
		}),
		hitShot("hit12", 12, {
			dir: [
				1,
				.72,
				.12
			],
			dist: 4.4,
			fov: 40,
			roll: -.14,
			shift: [.9, .25],
			ap: .05
		}),
		revealShot("full", 12, (ctx) => {
			const [K, st] = begin(ctx), lt = ctx.t - K.H[12], az = .62 + lt * .45, R = 7.6;
			const cam = persp(ctx, [
				R * Math.sin(az),
				-2.2 + lt * 1.8,
				R * Math.cos(az)
			], [
				0,
				.3,
				0
			], { fov: 40 });
			textWall(ctx, cam, "ranks", O.src.ranks, {
				origin: [
					-5.1,
					6.2,
					0
				],
				cell: .19,
				cols: 90,
				rows: 66,
				rx: 0,
				pos: [
					-Math.sin(.7) * 7,
					0,
					-Math.cos(.7) * 7
				],
				ry: .7,
				bright: .22,
				scroll: .5,
				palette: [
					.72,
					.15,
					.1
				],
				reveal: ease.inOutSine(seg(lt, 0, .16))
			});
			drawTree(ctx, cam, st, {
				dof: [
					6,
					.012,
					14
				],
				fog: [5.8, .45]
			});
			sandbox(1);
			render(ctx, cam);
			overlays(ctx, K, st, { world: true });
			look(ctx);
		}),
		subShot("edges12", 12, 1, (ctx) => {
			const [K, st] = begin(ctx), lt = ctx.lt;
			const cam = ortho([
				.1,
				.95 - lt * .8,
				1
			], "side", lerp(2.9, 2.5, ease.outCubic(ctx.p)), ctx.aspect);
			look(ctx, { vignette: .3 });
			instrument(ctx, "edges", (sub) => {
				drawTree(sub, cam, st, {
					view: "side",
					bright: 1.2
				});
				render(sub, cam);
			}, {
				ink: [
					1,
					.42,
					.34
				],
				gain: 2.4
			});
			overlays(ctx, K, st, {
				world: true,
				br: "view  side · orthographic · edges"
			});
		}),
		subShot("macro12", 12, 2, (ctx) => {
			const [K, st] = begin(ctx), lt = ctx.lt, r = nearest([
				.4,
				-.1,
				.1
			], 12), a = -.5 + lt * 2.6;
			const { cam, c } = macro(ctx, st, r, 12, [
				.3 * Math.sin(a),
				-.1,
				.3 * Math.cos(a)
			], {
				fov: 38,
				roll: -.1,
				ap: .045,
				aim: [
					.04 * Math.cos(a),
					.01,
					-.04 * Math.sin(a)
				]
			});
			render(ctx, cam);
			const q = toDesign(c, cam);
			crosshair(ctx.text.overlay, q[0], q[1], 26, {
				label: `rank ${r} · pid ${pidOf(r, 12)}`,
				color: HEXR,
				ring: true
			});
			overlays(ctx, K, st, { world: true });
			look(ctx, { vignette: .5 });
		}),
		subShot("slices12", 12, 3, (ctx) => {
			const [K, st] = begin(ctx), gp = 6, w = 1890 / 4, h = 1050 / 4, views = [];
			for (let i = 0; i < 16; i++) {
				const y = 1.875 - .25 * i, r = i >> 2, c = i & 3;
				views.push({
					rect: [
						gp + c * 478.5,
						gp + r * 268.5,
						w,
						h
					],
					label: `${String(i + 1).padStart(2, "0")} · y ${y >= 0 ? "+" : "−"}${Math.abs(y).toFixed(3)}`,
					cam: (a) => slab(ortho([
						0,
						y,
						0
					], "top", 4.4, a, {
						roll: ctx.lt * .4,
						inset: true
					}), .124, .126)
				});
			}
			splitViews(ctx, st, views, { bright: 1.5 });
			overlays(ctx, K, st, {
				readout: false,
				frame: false,
				counter: false,
				br: "tomography · 16 sections · Δy = 0.250 · 256 processes each"
			});
			look(ctx, { vignette: .15 });
		}),
		{
			id: "ein",
			at: (T) => keys(T).C[1],
			ownsLyrics: true,
			draw(ctx) {
				const [K, st] = begin(ctx);
				const lt = ctx.t - K.C[1], cam = ortho([
					-1.2 + lt * .15,
					.08,
					0
				], "front", 5.3 - lt * .3, ctx.aspect);
				drawTree(ctx, cam, st, {
					view: "front",
					lines: { lvlDim: .22 }
				});
				render(ctx, cam);
				numeral(ctx, 1, 440, 470, { tokenizer: true });
				overlays(ctx, K, st, {
					br: "view  front · orthographic",
					counter: false,
					rx: 1668
				});
				look(ctx, { vignette: .3 });
			}
		},
		{
			id: "dos",
			at: (T) => keys(T).C[2],
			ownsLyrics: true,
			draw(ctx) {
				const [K, st] = begin(ctx);
				const lt = ctx.t - K.C[2], cam = ortho([
					1.4,
					0,
					0
				], "top", 5.1 - lt * .3, ctx.aspect, { roll: -lt * .06 });
				textWall(ctx, cam, "src-fork", O.src.fork, {
					origin: [
						-6.5,
						3.4,
						0
					],
					cell: .12,
					cols: 110,
					rows: 56,
					bright: .2,
					scroll: .35,
					rx: -Math.PI / 2,
					pos: [
						0,
						-2.7,
						0
					]
				});
				drawTree(ctx, cam, st, {
					view: "top",
					lines: { lvlDim: .22 }
				});
				render(ctx, cam);
				numeral(ctx, 2, 1490, 470);
				overlays(ctx, K, st, {
					br: "view  top · orthographic",
					counter: false
				});
				look(ctx, { vignette: .3 });
			}
		},
		{
			id: "trois",
			at: (T) => keys(T).C[3],
			ownsLyrics: true,
			draw(ctx) {
				const [K, st] = begin(ctx);
				const lt = ctx.t - K.C[3], cam = ortho([
					-1.6 + lt * .2,
					.3,
					1.3
				], "iso", 6 - lt * .35, ctx.aspect);
				drawTree(ctx, cam, st);
				sandbox(.9);
				render(ctx, cam);
				numeral(ctx, 3, 480, 470);
				overlays(ctx, K, st, {
					br: "view  isometric · orthographic",
					counter: false,
					rx: 150,
					ry: 170
				});
				look(ctx, { vignette: .3 });
			}
		},
		{
			id: "net",
			at: (T) => keys(T).C[4],
			ownsLyrics: true,
			draw(ctx) {
				const [K, st] = begin(ctx), gp = 6, w = 951, h = 531;
				splitViews(ctx, st, [
					{
						rect: [
							gp,
							gp,
							w,
							h
						],
						label: "XY · front",
						view: "front",
						cam: (a) => ortho([
							0,
							0,
							0
						], "front", 4.6, a, { inset: true })
					},
					{
						rect: [
							963,
							gp,
							w,
							h
						],
						label: "XZ · top",
						view: "top",
						cam: (a) => ortho([
							0,
							0,
							0
						], "top", 4.6, a, { inset: true })
					},
					{
						rect: [
							gp,
							543,
							w,
							h
						],
						label: "ZY · side",
						view: "side",
						cam: (a) => ortho([
							0,
							0,
							1.6
						], "side", 4.6, a, { inset: true })
					}
				]);
				const r4 = [
					963,
					543,
					w,
					h
				];
				viewportFrame(ctx.text.overlay, r4, "count", { labelColor: HEXR });
				numeral(ctx, 4, r4[0] + w / 2, r4[1] + h / 2 - 34);
				overlays(ctx, K, st, {
					readout: false,
					counter: false,
					frame: false,
					br: "orthographic · three views"
				});
				look(ctx, { vignette: .2 });
			}
		},
		{
			id: "fem",
			at: (T) => keys(T).C[5],
			ownsLyrics: true,
			draw(ctx) {
				const [K, st] = begin(ctx), lt = ctx.t - K.C[5];
				const c = nodePos(8191), pos = [
					c[0] + .05 + lt * .08,
					c[1] + .12,
					c[2] + .72
				];
				const cam = persp(ctx, pos, [
					c[0] - .2,
					c[1] - .03,
					c[2]
				], {
					fov: 36,
					roll: .08
				});
				const f = Math.hypot(pos[0] - c[0], pos[1] - c[1], pos[2] - c[2]);
				drawTree(ctx, cam, st, {
					dof: [
						f,
						.035,
						22
					],
					near: [f * .4, f * .8],
					fog: [f + .6, .5],
					lines: { ws: .8 },
					swarm: {
						hiNode: 8191,
						hiGain: 0,
						loGain: .8
					}
				});
				drawHero(ctx, cam, st, 4095, 12, {
					dof: [
						f,
						.035,
						22
					],
					near: [f * .4, f * .8]
				});
				const q = toDesign(c, cam);
				crosshair(ctx.text.overlay, q[0], q[1], 24, {
					label: "pid 8191 = 2¹³ − 1",
					color: HEXR,
					ring: true
				});
				render(ctx, cam);
				numeral(ctx, 5, 470, 470);
				overlays(ctx, K, st, { counter: false });
				look(ctx, { vignette: .5 });
			}
		},
		{
			id: "liu",
			at: (T) => keys(T).C[6],
			ownsLyrics: true,
			draw(ctx) {
				const [K, st] = begin(ctx);
				const cam = persp(ctx, [
					-9 + (ctx.t - K.C[6]) * .8,
					-3.4,
					9.6
				], [
					0,
					.9,
					0
				], { fov: 40 });
				floor(-2.4, .22, { fade: .05 });
				drawTree(ctx, cam, st, {
					bright: .8,
					fog: [12.5, .35]
				});
				sandbox(1);
				render(ctx, cam);
				numeral(ctx, 6, 1470, 400);
				overlays(ctx, K, st, { counter: false });
				look(ctx);
			}
		},
		{
			id: "arm1",
			at: (T) => keys(T).ARM[0],
			ownsLyrics: true,
			draw(ctx) {
				const [K, st] = begin(ctx), lt = ctx.lt;
				const cam = persp(ctx, [
					3.6 - lt * 2,
					-2.3,
					6.6
				], [
					0,
					.1,
					0
				], {
					fov: 40,
					roll: .3
				});
				look(ctx);
				instrument(ctx, "dither", (sub) => {
					drawTree(sub, cam, st, { bright: 1.1 });
					render(sub, cam);
				}, {
					pix: 4,
					gain: 1.5,
					ink: [
						1,
						.95,
						.92
					]
				});
				overlays(ctx, K, st, {
					counter: false,
					br: "view  dither · armed"
				});
			}
		},
		{
			id: "arm2",
			at: (T) => keys(T).ARM[1],
			ownsLyrics: true,
			draw(ctx) {
				const [K, st] = begin(ctx), lt = ctx.lt;
				const { cam, c } = macro(ctx, st, 4095, 12, [
					.26,
					.19 - lt * .3,
					.3
				], {
					fov: 40,
					roll: -.3,
					ap: .018,
					aim: [
						-.5,
						-.52,
						-.62
					],
					crowd: .25,
					lineBright: .55,
					fogAt: 1.1,
					fogK: .9
				});
				render(ctx, cam);
				const q = toDesign(c, cam);
				crosshair(ctx.text.overlay, q[0], q[1], 24, {
					label: "pid 8191",
					color: HEXR,
					ring: true
				});
				overlays(ctx, K, st, { counter: false });
				look(ctx, { vignette: .5 });
			}
		},
		{
			id: "boom",
			at: (T) => keys(T).X[13],
			ownsLyrics: true,
			draw(ctx) {
				const [K, st] = begin(ctx), sh = jolt(st, .04);
				const cam = persp(ctx, [
					5.8 + sh[0],
					2 + sh[1],
					7
				], [
					0,
					0,
					0
				], { fov: 44 });
				drawTree(ctx, cam, st, { lines: { ws: .75 } });
				const core = Math.exp(-st.boom * 9);
				O.fx.segment([
					0,
					0,
					0
				], [
					0,
					0,
					0
				], {
					color: HOT.map((c) => c * 3 * core),
					width: 20 + 60 * (1 - core)
				});
				const k = ease.outCubic(seg(st.boom, 0, .9));
				shock(cam, 2.4 + 10 * k, HOT.map((c) => c * 1.1 * (1 - k)), 2.2);
				ring([
					0,
					0,
					0
				], 1, 2.2 + 9 * k, RED.map((c) => c * .9 * (1 - k)), 1.6);
				render(ctx, cam);
				overlays(ctx, K, st, { world: true });
				look(ctx);
			}
		},
		{
			id: "debris",
			at: (T) => keys(T).H[13],
			ownsLyrics: true,
			draw(ctx) {
				const [K, st] = begin(ctx), t = ctx.t, lt = t - K.H[13];
				const cam = persp(ctx, [
					0,
					3 + lt,
					24 + lt * 3
				], [
					0,
					0,
					0
				], { fov: 38 });
				const fade = 1 - ease.inCubic(seg(t, K.H[13], K.end));
				drawTree(ctx, cam, st, {
					swarm: { fade: fade * .5 },
					lines: {
						fade,
						ws: .8
					}
				});
				glyphDebris(ctx, cam, st, {
					bright: 1.2 * fade * fade,
					size: .3
				});
				const k = ease.outCubic(seg(st.boom, 0, .9));
				shock(cam, 2.4 + 10 * k, HOT.map((c) => c * (1 - k) * fade), 1.8);
				ring([
					0,
					0,
					0
				], 1, 2.2 + 9 * k, RED.map((c) => c * .8 * (1 - k) * fade), 1.4);
				render(ctx, cam);
				overlays(ctx, K, st, { world: true });
				look(ctx);
			}
		},
		...[
			4,
			8,
			12
		].flatMap((k) => [
			0,
			1,
			2,
			3
		].map((j) => memShot(k, j)))
	]
});
//#endregion
