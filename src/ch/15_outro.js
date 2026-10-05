import { PROJECT } from "../engine/config.js?v=BkWxxfxi";
import { chapter } from "../engine/timeline.js?v=vYBbdLfo";
import { TAU, clamp, ease, lerp, mix3, rng, seg } from "../engine/math.js?v=BJIlRm7-";
import { COL, HEX } from "../theme.js?v=Bj33PIbo";
import { remade } from "../lib/published.js?v=aV_CU5HV";
import { MathUtils, Matrix4, Object3D, OrthographicCamera, PerspectiveCamera, Scene, Vector3 } from "../../vendor/three/build/three.core.js?v=q9f7JKE-";
import { CUR, CURSOR_LOOK, blinkOn, cursorQuad, drawCursor } from "./intro/cursor.js?v=B0VCQBJX";
import { Swarm } from "../engine/swarm.js?v=DTFpJa7B";
import { GlowLines } from "../engine/lines.js?v=B_AAaaTO";
import { rig } from "../engine/rig.js?v=39-joEtk";
import { heroWord } from "../lib/look.js?v=BfOqFF7i";
import { gridPlane } from "../lib/env.js?v=CIN_DqPv";
import { callout, crosshair, frame, readout as readout$1, toDesign } from "../lib/hud.js?v=BgmSZjmG";
import { GlyphField, codeBlock, source } from "../lib/glyphs.js?v=DWbHICXG";
import { capture, view } from "../lib/modes.js?v=Cu3GYO-2";
import { promptBox, toolCall, turnElapsed, workedFor } from "../lib/claude.js?v=DXDs_lIL";
import { around, dofDot, dofSegment, mul, ortho } from "./intro/kit.js?v=rUxrOt9G";
import { STEP, buildNetwork, drawTraces, drawnLength } from "./intro/trace.js?v=Z6WQwuol";
import { SB } from "./intro/sandbox.js?v=BIdF2cjI";
import { ORDER, SOLIDS, drawImpact, drawSolid, landState, poseVerts, restMatrix } from "./intro/solids.js?v=Cdnqob5F";
import { WORLD } from "./intro/world.js?v=Cb_W9Bs7";
import { DROP, IMPACT, TIMAEUS, fall, front, jolt } from "./intro/landing.js?v=B09chHQT";
import { makePieces, posePiece, showPiece, tracesTexture } from "./intro/obsidian.js?v=DC8IJsW2";
import { drawDust, drawFront, floorDots } from "./intro/quake.js?v=Cg5E1tXt";
import { POWER, SYNTAX, elementOf } from "./intro/palette.js?v=CBOijEC5";
import { hueDither } from "./intro/dither.js?v=D9ZTodD-";
import { glassMaterial } from "./love/glass.js?v=Bh51RBHX";
import { terminal } from "./love/backdrop.js?v=D4RftAfW";
import { R_ME, WG, dist, drawHeartGlyphs, drawHeartPoints, drawMe, finaleCamera, heartFrame, heartGlyphTextures, heartMath, heartState, heartTextures, loveKeys, meState, pxPerUnit } from "./outro/heart.js?v=CtLYCNjE";
import { R_MAX, drawTerrainClip, frontCurve, unloadState } from "./outro/world.js?v=BUEG25pY";
import { drawNetEdges, netMeshes, setNet } from "./outro/net.js?v=Cjw-UlSe";
import { drawPanelRows, fmtN } from "./outro/panel.js?v=eFtVDAPY";
import { LOGO, drawLogo, logoSize, logoWidth } from "./outro/logo.js?v=C-Y9DxnD";
import { drawLog, entry, lyricEntries } from "./outro/log.js?v=Ha_MGtjR";
//#region src/ch/15_outro.js
var WHITE = COL.white;
var GREY = [
	.62,
	.67,
	.76
];
var HGREY = "#aab4c8";
var SHIELD = [
	.72,
	.76,
	.84
];
var SHIELD_R = mul(POWER.amber, .62);
var shieldCol = () => O.remake ? SHIELD_R : SHIELD;
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
var N_ME = 1 << 18;
var CELL = CUR.w;
var H0 = 172.8 / CUR.w;
var DOT = [-CELL, -16.8];
var GLYPH_WARM = [
	[
		.9,
		.74,
		.7
	],
	[
		.34,
		.24,
		.27
	],
	[
		1,
		.64,
		.48
	],
	[
		1,
		.82,
		.5
	],
	[
		1,
		.55,
		.68
	],
	[
		.6,
		.47,
		.5
	]
];
var GLYPH_GREY = [
	[
		.78,
		.8,
		.86
	],
	[
		.24,
		.26,
		.3
	],
	[
		.7,
		.72,
		.78
	],
	[
		.86,
		.86,
		.9
	],
	[
		.92,
		.94,
		1
	],
	[
		.45,
		.48,
		.55
	]
];
var mixPal = (a, b, k) => a.map((c, i) => mix3(c, b[i], k));
var O = null;
var KC = null;
var HM = null;
function keys(T) {
	if (KC?.T === T) return KC;
	const s0 = T.section("outro").start, end = T.section("end").start, b0 = Math.round(T.beatAt(s0));
	const B = (k) => T.beatTime(b0 + k), six = (B(1) - B(0)) / 4, LK = loveKeys(T);
	const lEx = T.findLines("EXECUTION").at(-1);
	const rise = [
		B(11.5),
		B(10.5),
		B(9.5),
		B(8.5),
		B(7.5)
	];
	const nTick = (t) => clamp(Math.floor((t - B(17.75)) / six + 1e-6) + 1, 0, 9);
	const credit = (t0, spans) => entry(t0, spans, {
		prompt: "",
		credit: true,
		step: six
	});
	const cmd = (t0, s) => entry(t0, s, { step: six });
	const LOG = [
		...lyricEntries(T, LK.s0 - .2, s0),
		cmd(B(4), "unloading world…"),
		...[
			4,
			3,
			2,
			1,
			0
		].map((i) => cmd(rise[i], `free(${ORDER[i]})`)),
		cmd(B(12), "free(sandbox)"),
		cmd(B(16.5), "delete me.love"),
		cmd(B(17), "delete me.color"),
		cmd(B(17.75), "me.N = 1"),
		cmd(B(20), "power.off()"),
		credit(B(24), [
			["//", HEX.dim],
			[" world.execute ("],
			["me", HEX.me],
			[") ;"]
		]),
		credit(B(26), [
			["//", HEX.dim],
			[" Music "],
			["—", HEX.dim],
			[" Mili"]
		]),
		credit(B(28), [
			["//", HEX.dim],
			[" Visuals "],
			["—", HEX.dim],
			[" Claude Opus 5.5 Max"]
		]),
		credit(B(30), [
			["//", HEX.dim],
			[" "],
			[
				LOGO,
				null,
				"logo"
			]
		])
	].sort((a, b) => a.t0 - b.t0);
	return KC = {
		T,
		s0,
		end,
		fin: T.duration,
		B,
		six,
		LK,
		lEx,
		rise,
		nTick,
		LOG
	};
}
function persp(pos, look, { fov = 36, aspect = 16 / 9, far = 400 } = {}) {
	const c = O.cam;
	c.fov = fov;
	c.aspect = aspect;
	c.near = .01;
	c.far = far;
	c.position.set(...pos);
	const f = new Vector3(look[0] - pos[0], look[1] - pos[1], look[2] - pos[2]).normalize();
	c.up.set(...Math.abs(f.y) > .999 ? [
		0,
		0,
		-1
	] : [
		0,
		1,
		0
	]);
	c.lookAt(...look);
	c.updateProjectionMatrix();
	c.updateMatrixWorld();
	return rig.cam(c, { look });
}
/** Look from pos toward p, turned by yaw (radians about y) so p sits off-centre. */
function aimOff(pos, p, yaw, pitch = 0) {
	const d = new Vector3(p[0] - pos[0], p[1] - pos[1], p[2] - pos[2]).applyAxisAngle(new Vector3(0, 1, 0), yaw);
	d.y += pitch * d.length();
	return [
		pos[0] + d.x,
		pos[1] + d.y,
		pos[2] + d.z
	];
}
var proj = (p, cam) => toDesign(p, cam);
var monoK = (t, K) => ease.inOutSine(seg(t, K.B(2.2), K.B(4)));
var yieldK = (t, K) => 1 - .6 * ease.inOutSine(seg(t, K.s0 + .15, K.s0 + 1.1));
function worldSt(t, K) {
	const u = ease.inOutSine(seg(t, K.B(4.25), K.B(7))), s = ease.inOutSine(seg(t, K.B(4), K.B(5.75)));
	return {
		...unloadState(u, s),
		u,
		s,
		ph: (t - K.B(0)) * .35
	};
}
function solidSt(i, t, K) {
	const tR = K.rise[i], ls = landState(2 * tR - t, tR, {
		height: 2.6,
		fall: .5,
		bounce: .05
	});
	const gone = ease.inQuad(seg(t, tR + .04, tR + .42));
	return {
		...ls,
		alpha: (ls.shown ? 1 : 0) * (1 - gone),
		up: t > tR
	};
}
function hinge(k) {
	if (k <= 0) return 0;
	if (k < .78) return Math.PI / 2 * (k / .78) ** 2.2;
	const s = (k - .78) / .22;
	return Math.PI / 2 * (1 - .055 * Math.sin(Math.PI * s) * (1 - s));
}
function boxSt(t, K) {
	const B = K.B;
	return {
		lid: .9 * ease.inOutCubic(seg(t, B(12), B(13.2))),
		lidGone: ease.inQuad(seg(t, B(12.15), B(13.3))),
		open: [
			0,
			1,
			2,
			3
		].map((i) => hinge(seg(t, B(12.5 + .25 * i), B(13.5 + .25 * i)))),
		gone: [
			0,
			1,
			2,
			3
		].map((i) => 1.05 * seg(t, B(14.25 + .25 * i), B(15.25 + .25 * i))),
		shield: 1 - seg(t, B(15.5), B(16))
	};
}
/** The panel's un-fill: love → deleted, colour → drained, N 262 144 → 1 in quarters on sixteenths, dim 3 → 0. */
function panelSt(t, K) {
	const B = K.B, six = K.six;
	const untype = (str, t0, per = 1) => str.slice(0, Math.max(0, str.length - per * clamp(Math.floor((t - t0) / six + 1e-6) + 1, 0, 99)));
	const j = K.nTick(t), N = 4 ** (9 - j);
	return {
		love: t < B(16.5) ? "you" : untype("you", B(16.5)),
		color: t < B(17) ? "#7EF0FF" : untype("#7EF0FF", B(17), 2),
		N,
		j,
		dim: N === 1 ? "0" : "3",
		drain: ease.inOutSine(seg(t, B(17), B(17.75))),
		caret: t >= B(16.5) && t < B(17) ? 4 : t >= B(17) && t < B(17.75) ? 3 : t >= B(17.75) && t < B(20) ? 1 : -1
	};
}
/** me's radius and brightness through the countdown (each sixteenth: a quarter of the points, half the radius). */
function shrinkSt(t, K) {
	const x = (t - K.B(17.75)) / K.six, f = Math.floor(x);
	const steps = x < 0 ? 0 : Math.min(9, f + ease.outExpo(clamp((x - f) / .55)));
	return {
		steps,
		r: R_ME * 2 ** (-steps / 2) * (1 - clamp(steps - 8)),
		N: 4 ** (9 - K.nTick(t))
	};
}
function reset() {
	for (const ob of O.all) ob.visible = false;
	O.lines.begin();
	O.soft.begin();
}
function render(ctx, cam) {
	O.lines.end(ctx);
	O.soft.end(ctx);
	O.lines.mesh.visible = O.soft.mesh.visible = true;
	ctx.draw(O.scene, cam);
}
var dofOf = (cam, focus, aperture, maxBlur = 30) => ({
	cam,
	focus,
	aperture,
	maxBlur,
	soft: O.soft,
	n: 3
});
/** A wall of the solids' own source (intro/solids.js) behind `center`, parallel to the image plane, scrolling. */
function codeWall(ctx, cam, center, o = {}) {
	const g = O.gfWall, f = new Vector3(0, 0, -1).applyQuaternion(cam.quaternion), d = o.d ?? 3;
	g.points.position.set(center[0] + f.x * d, center[1] + f.y * d, center[2] + f.z * d);
	g.points.quaternion.copy(cam.quaternion);
	g.points.updateMatrixWorld();
	g.points.visible = true;
	const dd = cam.position.distanceTo(g.points.position);
	g.set({
		a: O.tex.wall,
		t: ctx.t,
		size: o.size ?? .085,
		minPx: 2,
		bright: o.bright ?? .25,
		palette: GLYPH_GREY,
		flicker: .04,
		scroll: [
			0,
			(ctx.t - (o.t0 ?? 0)) * .16,
			0
		],
		focus: dd,
		aperture: o.aperture ?? 0,
		maxBlur: 16
	}, cam, ctx.H);
	return g.points;
}
function viaGrid(ctx, cam, o = {}) {
	O.grid.points.visible = true;
	O.grid.set({
		a: O.tex.grid,
		t: ctx.t,
		size: o.size ?? .012,
		minPx: 1.2,
		bright: o.bright ?? .45,
		colA: o.col ?? GREY,
		sparkle: .12,
		reveal: o.reveal ?? 1,
		revealBy: "w",
		focus: o.focus ?? 5,
		aperture: o.aperture ?? 0,
		maxBlur: o.maxBlur ?? 30
	}, cam, ctx.H);
	return O.grid.points;
}
function worldFloor(k, st) {
	O.floor.visible = k > 0;
	O.floor.userData.set({
		intensity: .6 * k,
		reveal: st.unroll,
		revealR: R_MAX,
		fade: .035
	});
	return O.floor;
}
/** The sandbox's hexagonal shield (the net's faces, closed until the box opens). */
function shield(t, K, intensity, o = {}) {
	const bs = boxSt(t, K);
	setNet(O.box, {
		...bs,
		intensity: intensity * bs.shield,
		color: o.color ?? shieldCol()
	});
	O.shield.visible = intensity > 0;
	return O.shield;
}
/** The traces at full power (hops beyond the last lane), or a retracting state. */
function traces(o = {}) {
	const st = o.st ?? {
		hops: O.hopsFull,
		ring: 1,
		close: 1
	};
	const k = o.k ?? .6, R = O.remake ? {
		tipColor: POWER.gold,
		viaColor: mul(POWER.amber, k * 1.1)
	} : {};
	drawTraces(O.lines, O.net, st, {
		color: O.remake ? mul(POWER.copper, k * .83) : mul(WHITE, k),
		tip: o.tip ?? 0,
		dof: o.dof,
		inner: st.ring * (o.inner ?? 1),
		widthK: o.widthK ?? .85,
		...R
	});
	return st;
}
function solidPose(i, t, K) {
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
		const { st, P, c } = solidPose(i, t, K);
		out.push({
			st,
			P,
			c
		});
		const a = st.alpha * (o.k ?? 1);
		if (a > .002) {
			drawSolid(O.lines, O.place[i].solid, P, {
				color: mul(WHITE, (o.bright ?? 1.15) * a),
				width: o.width ?? 2.6,
				dots: (o.dots ?? 1.5) * a,
				dof: o.dof
			});
			if (st.up && st.falling) {
				const bot = P.reduce((m, p) => Math.min(m, p[1]), 9);
				dofSegment(O.lines, [
					c[0],
					Math.max(.02, bot - .7),
					c[2]
				], [
					c[0],
					bot - .04,
					c[2]
				], {
					color: mul(WHITE, .5 * a),
					width: 1.5
				}, o.dof);
			}
		}
		if (o.impact !== false) drawImpact(O.lines, c, st.impact, {
			r0: SOLID_R * .9,
			r1: .75,
			dof: o.dof,
			bright: 1.2 * (o.k ?? 1)
		});
	}
	return out;
}
/** me as the small cyan ball of love, at the middle of the sandbox, with a halo for far views. */
function meBall(ctx, K, cam, o = {}) {
	const ms = meState(ctx.t, K.LK, HM), p = ms.p;
	const ob = drawMe(ctx, O, cam, p, {
		press: ms.press,
		spin: ms.spin,
		focus: dist(p, cam.position.toArray()),
		...o
	});
	if (o.halo) O.lines.segment(p, p, {
		color: mul(o.col ?? COL.me, .3 * o.halo),
		width: 22
	});
	return ob;
}
/** A soft dark field under the console, for shots with code behind it: an ellipse feathered on every side (shade, not a box). */
function consoleBacking(L, a = .8) {
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
function overlays(ctx, K, o = {}) {
	const L = ctx.text.overlay, t = ctx.t;
	if (o.backing) consoleBacking(L, o.backing);
	if ((o.frame ?? 1) > 0) frame(L, t, ctx.T, {
		label: "shutdown",
		bottomRight: o.br,
		alpha: .55 * (o.frame ?? 1)
	});
	const gold = 1 - seg(t, K.B(3.5), K.B(4));
	drawLog(L, t, K.LOG, {
		accent: gold > .5 ? HEX.gold : HGREY,
		glow: lerp(6, 10, gold),
		alpha: o.log ?? 1,
		keep: t >= K.B(30) ? 4 : 3
	});
}
function readout(ctx, rows, o = {}) {
	readout$1(ctx.text.overlay, o.x ?? 1480, o.y ?? 150, rows, {
		accent: o.accent ?? HGREY,
		alpha: o.alpha ?? .8
	});
}
function look(ctx, K, o = {}) {
	const m = monoK(ctx.t, K);
	Object.assign(ctx.post, {
		bloom: 1.05,
		threshold: lerp(.95, .9, m),
		ca: .25 * (1 - seg(ctx.t, K.B(2), K.B(2.5))),
		vignette: lerp(.42, .45, m),
		grain: lerp(.03, .035, m),
		exposure: 1,
		tint: mix3([
			1.02,
			.985,
			.97
		], [
			1,
			1,
			1
		], m),
		sat: lerp(1, .85, m),
		...o
	});
}
function blendLook(ctx, target, k) {
	for (const key of Object.keys(target)) if (typeof target[key] === "number") ctx.post[key] = lerp(ctx.post[key], target[key], k);
}
/** The single point that is left of me (a crisp dot and a faint halo). o.k: brightness; o.flare: the extinction flare. */
function drawPoint(p, o = {}) {
	const k = o.k ?? 1;
	if (k <= .002) return;
	O.lines.segment(p, p, {
		color: mul([
			1,
			1,
			1
		], 1.5 * k),
		width: o.width ?? 13
	});
	O.lines.segment(p, p, {
		color: mul([
			.8,
			.88,
			1
		], .1 * k),
		width: (o.width ?? 13) * 3.5
	});
}
function drawWorld(ctx, K, cam, o = {}) {
	const t = ctx.t, st = worldSt(t, K), k = o.k ?? 1, obs = [];
	obs.push(worldFloor(k * (o.floor ?? 1), st));
	const fk = (1 - seg(st.u, .96, 1)) * seg(t, K.B(4.1), K.B(4.4)) * k;
	if (fk > 0) for (const pl of frontCurve(st.a, st.p, 360)) {
		O.lines.polyline(pl, {
			color: mul(WHITE, 1.25 * fk),
			width: o.frontW ?? 2.4
		});
		O.soft.polyline(pl, {
			color: mul([
				.75,
				.8,
				.9
			], .35 * fk),
			width: 16
		});
	}
	drawTerrainClip(O.lines, {
		rise: st.rise,
		ph: st.ph,
		color: mul([
			.5,
			.55,
			.66
		], k),
		width: o.terrainW ?? 1.5,
		eye: cam.position.toArray(),
		fade: o.terrainFade ?? 90,
		spacing: 2.5,
		step: 1,
		rMax: st.front
	});
	return {
		st,
		obs
	};
}
chapter({
	id: "outro",
	from: (T) => T.section("outro").start,
	to: (T) => T.duration,
	init(ctx) {
		HM = heartMath();
		O = {
			scene: new Scene(),
			cam: new PerspectiveCamera(36, 16 / 9, .01, 400),
			ocam: new OrthographicCamera(-1, 1, 1, -1, .01, 400),
			heart: new Object3D()
		};
		O.me = new Swarm({ count: 65536 });
		O.meN = new Swarm({ count: N_ME });
		O.hs = new Swarm({ count: 1 << 18 });
		O.stars = new Swarm({ count: 16384 });
		O.grid = new Swarm({ count: 900 });
		O.lines = new GlowLines(2e4);
		O.soft = new GlowLines(8e3);
		O.soft.material.uniforms.uCore.value = .04;
		O.rose = gridPlane({
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
		O.floor = gridPlane({
			plane: "xz",
			size: WORLD.R * 2,
			color: [
				.2,
				.22,
				.27
			],
			axis: [
				.42,
				.45,
				.52
			],
			minor: 1,
			major: 4,
			fade: .035
		});
		O.glass = glassMaterial();
		O.net = buildNetwork();
		O.hopsFull = Math.max(...O.net.lanes.map((l) => l.t0 + l.len / STEP), ...O.net.vias.map((v) => v.t + 2)) + 1;
		O.shield = (() => {
			const n = netMeshes({ cell: .24 });
			O.box = n;
			return n.group;
		})();
		O.remake = remade(ctx);
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
			...heartTextures(O, HM),
			grid: O.grid.shape("outro/pcb-grid", (N) => {
				const side = Math.sqrt(N), out = new Float32Array(N * 4), half = (side - 1) / 2 * .1;
				for (let i = 0; i < N; i++) {
					const x = i % side * .1 - half, z = Math.floor(i / side) * .1 - half;
					out.set([
						x,
						.001,
						z,
						Math.max(Math.abs(x), Math.abs(z)) / (half + .05)
					], i * 4);
				}
				return out;
			}),
			sphere: O.meN.shape("outro/me-sphere", (N) => {
				const g = rng(9), out = new Float32Array(N * 4), lvl = new Float32Array(N), perm = [...Array(N).keys()];
				for (let i = N - 1; i > 0; i--) {
					const j = Math.floor(g() * (i + 1));
					[perm[i], perm[j]] = [perm[j], perm[i]];
				}
				perm.forEach((p, rank) => {
					lvl[p] = rank === 0 ? 0 : Math.floor(Math.log(rank) / Math.log(4)) + 1;
				});
				for (let i = 0; i < N; i++) {
					const y = 1 - 2 * (i + .5) / N, q = Math.sqrt(1 - y * y), a = i * 2.399963229728653;
					const p = [
						q * Math.cos(a) + (g() - .5) * .006,
						y + (g() - .5) * .006,
						q * Math.sin(a) + (g() - .5) * .006
					], l = Math.hypot(...p) / R_ME;
					out.set([
						p[0] / l,
						p[1] / l,
						p[2] / l,
						(lvl[i] + .5) / 10
					], i * 4);
				}
				return out;
			})
		};
		O.gfHeart = new GlyphField({ count: 16384 });
		O.gfHeart.text("outro/heart-src", source("ch/love/curves.js"));
		const hg = heartGlyphTextures(O.gfHeart);
		O.tex.gSurf = hg.surf;
		O.tex.gDrift = hg.drift;
		O.gfWall = new GlyphField({ count: 16384 });
		O.gfWall.text("outro/solids-src", source("ch/intro/solids.js"));
		O.tex.wall = O.gfWall.layout("outro/wall", codeBlock(O.gfWall, {
			origin: [
				-3.6,
				3.2,
				0
			],
			cell: .1,
			cols: 120,
			rows: 120
		}));
		O.gfExec = new GlyphField({ count: 256 });
		O.gfExec.text("outro/exec", "EXECUTION");
		O.tex.execFrom = O.gfExec.layout("outro/exec-from", (N) => {
			const o = new Float32Array(N * 4);
			for (let i = 0; i < N; i++) o.set(i < 9 ? [
				(DOT[0] + 0) / 100,
				-DOT[1] / 100,
				0,
				i / 9
			] : [
				0,
				0,
				-1e5,
				1
			], i * 4);
			return o;
		});
		O.tex.execTo = O.gfExec.layout("outro/exec-to", codeBlock(O.gfExec, {
			origin: [
				-3.12,
				180 / 100,
				0
			],
			cell: 1.3,
			cols: 12
		}));
		O.flat = new OrthographicCamera(-9.6, 9.6, 5.4, -5.4, .01, 100);
		O.flat.position.set(0, 0, 10);
		O.flat.lookAt(0, 0, 0);
		O.flat.updateMatrixWorld();
		O.all = [
			O.me.points,
			O.meN.points,
			O.hs.points,
			O.stars.points,
			O.grid.points,
			O.lines.mesh,
			O.soft.mesh,
			O.rose,
			O.floor,
			O.shield,
			O.gfHeart.points,
			O.gfWall.points,
			O.gfExec.points
		];
		O.scene.add(...O.all);
		for (const ob of O.all) ob.visible = false;
		if (remade(ctx)) {
			const pieces = makePieces(O.place, {
				traces: tracesTexture(O.net),
				traceR: 1.6
			}), dots = floorDots({ side: 30 });
			O.R = {
				pieces,
				dots
			};
			O.all.push(...pieces, dots);
			O.scene.add(...pieces, dots);
		}
	},
	shots: [
		{
			id: "dissolve",
			at: (T) => T.section("outro").start,
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T), t = ctx.t, LK = K.LK;
				const k = ease.inOutSine(seg(t, K.s0, K.B(2) + .5));
				const c = finaleCamera(t, LK, {
					pull: 1.9 * k,
					rise: .55 * k,
					recentre: .7 * k
				});
				const cam = persp(c.pos, c.target, {
					fov: 36,
					aspect: ctx.aspect
				});
				const hs0 = heartState(t, LK);
				heartFrame(ctx, O, cam, t, LK, HM, {
					hsO: { brightK: yieldK(t, K) },
					front: [drawHeartGlyphs(ctx, O, cam, hs0, {
						k: ease.inOutSine(seg(t, K.s0 + .08, K.s0 + .7)),
						palette: GLYPH_WARM
					})]
				});
				heroWord(ctx.text.scene, "LO-O-OVE", 1830, 560, LK.LOVE[3], t, {
					size: 100,
					tracking: 18,
					align: "right",
					color: "#fff4ec",
					glowColor: HEX.rose,
					glow: 26,
					out: LK.sungEnd,
					outDur: .35
				});
				overlays(ctx, K);
				look(ctx, K);
			}
		},
		{
			id: "lift",
			at: (T) => keys(T).B(2),
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T), t = ctx.t, LK = K.LK, k = ease.inOutSine(seg(t, K.B(2), K.B(4) + .3)), m = monoK(t, K);
				const cam = persp([
					lerp(4.4, 6.4, k),
					lerp(1.1, 7.6, k),
					lerp(4.8, 7, k)
				], [
					0,
					lerp(2.9, .7, k),
					0
				], {
					fov: 40,
					aspect: ctx.aspect
				});
				const w = ease.inOutSine(seg(t, K.B(2.1), K.B(3.8))), wt = ease.inOutSine(seg(t, K.B(2.9), K.B(4)));
				const wst = worldSt(t, K), eye = cam.position.toArray();
				const posed = remade(ctx) ? posePiecesR(ctx, K, {
					k: w,
					env: [.16 * w, .55 * w]
				}) : null;
				heartFrame(ctx, O, cam, t, LK, HM, {
					bg: [worldFloor(w, wst)],
					hsO: {
						colB: mix3(mix3(WG, [
							1,
							.7,
							.72
						], .35), [
							.86,
							.86,
							.9
						], .7),
						brightK: yieldK(t, K)
					},
					lines: (L, { ms }) => {
						L.segment(ms.p, ms.p, {
							color: mul(COL.me, .3 * w),
							width: 22
						});
						drawTerrainClip(L, {
							rise: 1,
							ph: wst.ph,
							color: mul([
								.5,
								.55,
								.66
							], wt),
							width: 1.5,
							eye,
							fade: 90,
							spacing: 2.5,
							step: 1
						});
						if (posed) drawEdgesR(posed, { width: 2 });
						else drawSolids(ctx, K, {
							k: w,
							width: 2
						});
						drawBoxLines(t, K, w * .55);
						traces({ k: .5 * w });
					},
					front: [
						...posed ? posed.meshes : [],
						viaGrid(ctx, cam, {
							bright: .35 * w,
							size: .012
						}),
						shield(t, K, .16 * w),
						drawHeartGlyphs(ctx, O, cam, heartState(t, LK), { palette: mixPal(GLYPH_WARM, GLYPH_GREY, m) })
					]
				});
				overlays(ctx, K);
				look(ctx, K);
			}
		},
		{
			id: "rollback",
			at: (T) => keys(T).B(4),
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T), t = ctx.t, k = ease.inOutSine(seg(t, K.B(4), K.B(6)));
				reset();
				const cam = persp(around([
					0,
					0,
					0
				], lerp(34, 24, k), lerp(.62, .7, k), lerp(.5, .62, k)), [
					0,
					lerp(1.5, 1, k),
					0
				], {
					fov: 40,
					aspect: ctx.aspect,
					far: 800
				});
				const { st } = drawWorld(ctx, K, cam, { terrainFade: 120 });
				drawBoxLines(t, K, .6);
				traces({ k: .5 });
				if (remade(ctx)) drawSolidsR(ctx, K, {
					width: 1.8,
					dots: 1,
					env: [.2, .6]
				});
				else drawSolids(ctx, K, {
					width: 1.8,
					dots: 1
				});
				embers(ctx, K, cam);
				drawHeartGlyphs(ctx, O, cam, heartState(t, K.LK), { palette: GLYPH_GREY }).visible = true;
				meBall(ctx, K, cam, { halo: 1.2 });
				viaGrid(ctx, cam, { bright: .3 });
				shield(t, K, .2);
				render(ctx, cam);
				overlays(ctx, K);
				readout(ctx, [["world", `r ${st.front.toFixed(2)}`], ["hills", `${(st.rise * 100).toFixed(0)} %`]]);
				look(ctx, K);
			}
		},
		{
			id: "rollTop",
			at: (T) => keys(T).B(6),
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T), t = ctx.t, k = ease.inOutSine(seg(t, K.B(6), K.B(7)));
				reset();
				const cam = ortho(O.ocam, [
					0,
					0,
					0
				], "top", lerp(13, 6.4, k), ctx.aspect);
				const { st } = drawWorld(ctx, K, cam, { frontW: 2.6 });
				drawBoxLines(t, K, .7);
				traces({ k: .55 });
				if (remade(ctx)) drawSolidsR(ctx, K, {
					width: 2,
					dots: 1.2,
					env: [0, .7]
				});
				else drawSolids(ctx, K, {
					width: 2,
					dots: 1.2,
					impact: false
				});
				meBall(ctx, K, cam, { halo: 1.4 });
				viaGrid(ctx, cam, {
					bright: .4,
					size: .011
				});
				render(ctx, cam);
				overlays(ctx, K, { br: "view  top · orthographic" });
				readout(ctx, [["world", st.sq > .98 ? "unloaded" : `r ${st.a.toFixed(3)}`], ["boundary", st.sq > .98 ? "square" : `p ${st.p.toFixed(1)}`]]);
				look(ctx, K, { vignette: .38 });
			}
		},
		...[
			{
				id: "icosa",
				at: 7,
				len: 1,
				pos: (k) => [
					lerp(1.78, 1.72, k),
					.2,
					lerp(1.62, 1.56, k)
				],
				look: (k) => [
					.92,
					lerp(.3, .62, ease.inCubic(seg(k, .45, 1))),
					ROW_Z
				],
				fov: 38,
				focus: 1.45,
				free: [4]
			},
			{
				id: "row",
				at: 8,
				len: 2,
				pos: (k) => [
					lerp(1.75, 1.66, k),
					lerp(.62, .66, k),
					lerp(2.2, 2.1, k)
				],
				look: [
					.05,
					.24,
					ROW_Z
				],
				fov: 36,
				focus: 2.1,
				free: [3, 2]
			},
			{
				id: "row2",
				at: 10,
				len: 2,
				pos: (k) => [
					lerp(-1.42, -1.34, k),
					lerp(.56, .6, k),
					lerp(1.72, 1.64, k)
				],
				look: [
					-.78,
					.1,
					ROW_Z
				],
				fov: 36,
				focus: 1.45,
				free: [1, 0],
				mode: "dither"
			}
		].map((s) => ({
			id: s.id,
			at: (T) => keys(T).B(s.at),
			ownsLyrics: true,
			draw(ctx) {
				if (remade(ctx)) return leaveShotR(ctx, s);
				const K = keys(ctx.T), t = ctx.t, k = seg(t, K.B(s.at), K.B(s.at + s.len));
				reset();
				const cam = persp(s.pos(k), typeof s.look === "function" ? s.look(k) : s.look, {
					fov: s.fov,
					aspect: ctx.aspect
				});
				const dof = dofOf(cam, s.focus, .014, 24);
				codeWall(ctx, cam, s.look instanceof Function ? s.look(k) : s.look, {
					d: 3.2,
					bright: .19,
					aperture: .016,
					t0: K.B(7)
				});
				drawBoxLines(t, K, .3, dof);
				const all = drawSolids(ctx, K, {
					dof,
					width: 2.8,
					dots: 1.7
				});
				if (s.mode) {
					const tex = capture(ctx, (sub) => render(sub, cam));
					look(ctx, K);
					view(ctx, tex, s.mode, {
						pix: 3,
						gain: 2.2
					});
				} else render(ctx, cam);
				const i = s.free.find((j) => t < K.rise[j] + .45) ?? s.free.at(-1), so = O.place[i].solid;
				const q = proj(all[i].P.reduce((m, p) => p[1] > m[1] ? p : m), cam), a = all[i].st.alpha;
				if (a > .02 && q[1] > 180) callout(ctx.text.overlay, [q[0], q[1]], so.name, {
					dx: s.id === "row2" ? -70 : 70,
					dy: -60,
					color: HGREY,
					alpha: .85 * a,
					draw: ease.outCubic(seg(t, K.rise[i] - .45, K.rise[i] - .25))
				});
				overlays(ctx, K, { backing: s.mode ? 0 : .8 });
				const left = K.rise.filter((r) => t < r).length;
				readout(ctx, [
					["free", so.name],
					["V E F", `${so.nV} ${so.nE} ${so.nF}`],
					["solids", `${left} / 5`]
				]);
				if (!s.mode) look(ctx, K);
			}
		})),
		{
			id: "unbox",
			at: (T) => keys(T).B(12),
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T), t = ctx.t, k = ease.inOutSine(seg(t, K.B(12), K.B(14)));
				reset();
				const cam = persp(around([
					0,
					1.2,
					0
				], lerp(8.2, 9.4, k), lerp(.62, .5, k), lerp(.38, .5, k)), [
					.15,
					lerp(1.25, .9, k),
					0
				], {
					fov: 38,
					aspect: ctx.aspect
				});
				traces({ k: .4 });
				const bs = boxSt(t, K);
				drawNetEdges(O.lines, bs, {
					color: mul(WHITE, .95),
					width: 2.4,
					lidFade: 1 - bs.lidGone
				});
				setNet(O.box, {
					...bs,
					intensity: .5 * bs.shield,
					color: shieldCol()
				});
				O.shield.visible = true;
				meBall(ctx, K, cam, { halo: 1 });
				render(ctx, cam);
				overlays(ctx, K);
				const deg = bs.open.reduce((a, b) => a + b, 0) / 4 * 180 / Math.PI;
				readout(ctx, [
					["sandbox", deg > 89 ? "open" : "opening"],
					["walls", `${deg.toFixed(1)}°`],
					["lid", bs.lidGone > .99 ? "freed" : `+${bs.lid.toFixed(2)}`]
				]);
				look(ctx, K);
			}
		},
		{
			id: "unboxTop",
			at: (T) => keys(T).B(14),
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T), t = ctx.t, k = ease.inOutSine(seg(t, K.B(14), K.B(16)));
				reset();
				const cam = ortho(O.ocam, [
					0,
					0,
					0
				], "top", lerp(10.6, 9.4, k), ctx.aspect);
				const bs = boxSt(t, K);
				const body = (sub) => {
					traces({ k: .6 });
					drawNetEdges(O.lines, bs, {
						color: mul(WHITE, .95),
						width: 2.4,
						fade: bs.gone.map((g) => 1 - ease.inQuad(clamp(g))),
						lidFade: 0
					});
					setNet(O.box, {
						...bs,
						intensity: .55 * bs.shield,
						color: shieldCol()
					});
					O.shield.visible = true;
					meBall(sub, K, cam, { halo: 1.4 });
					render(sub, cam);
				};
				if (remade(ctx)) {
					body(ctx);
					look(ctx, K);
				} else {
					const tex = capture(ctx, body);
					look(ctx, K);
					view(ctx, tex, "paper", {
						gain: 2.6,
						paper: [
							.94,
							.93,
							.9
						],
						ink: [
							.12,
							.12,
							.15
						]
					});
				}
				const L = ctx.text.overlay, INK = remade(ctx) ? "#c9ccd6" : "#2c2d33", S = SB.S, pr = (p) => proj(p, cam);
				for (const [a, b] of [
					[[
						-S,
						0,
						-S
					], [
						S,
						0,
						-S
					]],
					[[
						S,
						0,
						-S
					], [
						S,
						0,
						S
					]],
					[[
						S,
						0,
						S
					], [
						-S,
						0,
						S
					]],
					[[
						-S,
						0,
						S
					], [
						-S,
						0,
						-S
					]]
				]) {
					const A = pr(a), B = pr(b);
					L.draw((g) => {
						g.globalAlpha *= .8 * (1 - bs.gone.reduce((m, v) => Math.max(m, v), 0) * .4);
						g.strokeStyle = INK;
						g.lineWidth = 1.4;
						g.setLineDash([6, 6]);
						g.beginPath();
						g.moveTo(...A);
						g.lineTo(...B);
						g.stroke();
					});
				}
				const faces = bs.gone.filter((g) => g < 1).length;
				if (remade(ctx)) {
					frame(L, t, ctx.T, {
						label: "shutdown",
						bottomRight: "view  top · orthographic"
					});
					drawLog(L, t, K.LOG, { alpha: 1 });
					readout$1(L, 1480, 150, [["net", "cube · 6 faces"], ["faces", `${faces + 1} / 5`]], { alpha: .9 });
				} else {
					frame(L, t, ctx.T, {
						label: "shutdown",
						bottomRight: "view  top · orthographic",
						color: "#6d6e75"
					});
					drawLog(L, t, K.LOG, {
						accent: "#6d6e75",
						glow: 0,
						alpha: 1,
						ink: INK
					});
					readout$1(L, 1480, 150, [["net", "cube · 6 faces"], ["faces", `${faces + 1} / 5`]], {
						accent: "#3b3d45",
						alpha: .9
					});
				}
			}
		},
		...[{
			id: "unfill",
			at: 16,
			r: [.62, .56],
			az: [.35, .5]
		}, {
			id: "shrink",
			at: 18,
			r: [.5, .17],
			az: [.55, .85]
		}].map((s) => ({
			id: s.id,
			at: (T) => keys(T).B(s.at),
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T), t = ctx.t, k = ease.inOutSine(seg(t, K.B(s.at), K.B(s.at + 2)));
				reset();
				const r = lerp(s.r[0], s.r[1], k), pos = around(ME_C, r, lerp(s.az[0], s.az[1], k), .1);
				const cam = persp(pos, aimOff(pos, ME_C, .15, .035), {
					fov: 30,
					aspect: ctx.aspect
				});
				viaGrid(ctx, cam, {
					bright: .5,
					size: .012,
					focus: r,
					aperture: .03,
					maxBlur: 30
				});
				traces({
					k: .45,
					dof: dofOf(cam, r, .03, 30)
				});
				const ps = panelSt(t, K), sh = shrinkSt(t, K);
				drawMeN(ctx, K, cam, ps, sh);
				render(ctx, cam);
				const L = ctx.text.scene, youCol = HEX.you;
				const num = remade(ctx) ? {
					color: SYNTAX.number,
					glowColor: SYNTAX.glow.number
				} : {};
				drawPanelRows(L, [
					{
						key: "name",
						value: "me"
					},
					{
						key: "N",
						value: fmtN(ps.N),
						...num
					},
					{
						key: "dim",
						value: ps.dim,
						...num
					},
					{
						key: "color",
						value: ps.color,
						color: ps.drain < 1 ? HEX.me : HEX.white,
						glow: 16 * (1 - ps.drain),
						glowColor: HEX.me,
						swatch: {
							color: HEX.me,
							k: 1 - ps.drain
						},
						swatchAt: 7
					},
					{
						key: "love",
						value: ps.love,
						color: youCol,
						glowColor: youCol,
						glow: 10,
						weight: 600
					}
				], {
					x: 200,
					y: 360,
					size: 46,
					lh: 66,
					caret: ps.caret,
					...remade(ctx) ? { syntax: SYNTAX } : {}
				});
				if (s.id === "shrink" && sh.r > 0) {
					const O2 = ctx.text.overlay, c = proj(ME_C, cam), rv = new Vector3().setFromMatrixColumn(cam.matrixWorld, 0).multiplyScalar(sh.r);
					const e = proj([
						ME_C[0] + rv.x,
						ME_C[1] + rv.y,
						ME_C[2] + rv.z
					], cam), R = Math.hypot(e[0] - c[0], e[1] - c[1]) + 6;
					const al = .75 * seg(t, K.B(18), K.B(18.3)) * (1 - seg(sh.steps, 8, 8.8));
					O2.draw((g) => {
						g.globalAlpha *= al;
						g.strokeStyle = HGREY;
						g.lineWidth = 1;
						g.setLineDash([3, 5]);
						g.beginPath();
						g.arc(c[0], c[1], R, 0, TAU);
						g.stroke();
					});
					callout(O2, [c[0] + R * .71, c[1] - R * .71], `r ${sh.r.toFixed(4)}`, {
						dx: 60,
						dy: -44,
						color: HGREY,
						alpha: al * 1.6
					});
				}
				overlays(ctx, K);
				look(ctx, K, { vignette: .5 });
			}
		})),
		{
			id: "point",
			at: (T) => keys(T).B(20),
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T), t = ctx.t;
				reset();
				const cam = pointCam(ctx, K, t);
				const st = traceBack(t, K);
				viaGrid(ctx, cam, {
					bright: .42,
					size: .011
				});
				traces({
					st,
					k: .62,
					tip: 1.6,
					inner: 1,
					widthK: .9
				});
				drawPoint(ME_C, { k: 1 });
				render(ctx, cam);
				const L = ctx.text.overlay, q = proj(ME_C, cam), al = seg(t, K.B(20.1), K.B(20.5));
				crosshair(L, q[0], q[1], 26, {
					color: HGREY,
					alpha: .55 * al
				});
				callout(L, [q[0], q[1]], "me  (0, 1.3, 0)", {
					dx: 110,
					dy: -90,
					color: HGREY,
					draw: ease.outCubic(al)
				});
				overlays(ctx, K, { br: "view  top · orthographic" });
				readout(ctx, [
					["N", "1"],
					["dim", "0"],
					["copper", drawnLength(O.net, st).toFixed(3)]
				]);
				look(ctx, K, { vignette: .4 });
			}
		},
		{
			id: "period",
			at: (T) => keys(T).B(24),
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T), t = ctx.t;
				reset();
				const cam = pointCam(ctx, K, t);
				const gk = 1 - ease.inOutSine(seg(t, K.B(24), K.B(26.5))), st = traceBack(t, K);
				if (gk > 0) viaGrid(ctx, cam, {
					bright: .42 * gk,
					size: .011
				});
				if (st.hops > 0 || st.ring > 0) traces({
					st,
					k: .62,
					tip: 1.6,
					inner: 1,
					widthK: .9
				});
				const ex = remade(ctx) ? enterOut(t, K) : extinction(t, K);
				drawPoint(ME_C, {
					k: ex.k,
					width: ex.w
				});
				if (ex.pop > .005) {
					O.soft.segment(ME_C, ME_C, {
						color: mul([
							.9,
							.94,
							1
						], 2.2 * ex.pop),
						width: 210
					});
					O.soft.segment(ME_C, ME_C, {
						color: mul([
							.8,
							.87,
							1
						], .4 * ex.pop),
						width: 480
					});
				}
				render(ctx, cam);
				drawFlare(ctx, cam, ex);
				const L = ctx.text.scene;
				if (remade(ctx)) titleLine(ctx, K, t);
				else {
					drawCursor(L, cursorQuad(), { alpha: blinkOn(ctx.T, t) * seg(t, K.B(24), K.B(24) + .03) });
					execWord(ctx, K, t);
				}
				overlays(ctx, K, { frame: 1 - seg(t, K.lEx.start + .3, K.lEx.end + .2) });
				look(ctx, K, { vignette: .45 });
				blendLook(ctx, CURSOR_LOOK, seg(t, K.B(24), K.B(28)));
			}
		},
		{
			id: "end",
			at: (T) => T.section("end").start,
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T), t = ctx.t;
				const fade = ease.inOutSine(seg(t, K.fin - .8, K.fin)), A = 1 - fade;
				if (remade(ctx) && t < enterAt(K) + 1) {
					reset();
					const cam = pointCam(ctx, K, t), ex = enterOut(t, K);
					drawPoint(ME_C, {
						k: ex.k,
						width: ex.w
					});
					render(ctx, cam);
					drawFlare(ctx, cam, ex);
					titleLine(ctx, K, t);
				} else if (!remade(ctx) && t < K.lEx.end + .8) {
					reset();
					const cam = pointCam(ctx, K, t), ex = extinction(t, K);
					drawPoint(ME_C, {
						k: ex.k,
						width: ex.w
					});
					render(ctx, cam);
					drawFlare(ctx, cam, ex);
					execWord(ctx, K, t);
					const fa = .55 * (1 - seg(t, K.lEx.start + .3, K.lEx.end + .2));
					if (fa > .002) frame(ctx.text.overlay, t, ctx.T, {
						label: "shutdown",
						alpha: fa
					});
				}
				endScreen(ctx, K, t, A);
				Object.assign(ctx.post, {
					...CURSOR_LOOK,
					fade
				});
			}
		}
	]
});
function drawBoxLines(t, K, k, dof) {
	const S = SB.S, H3 = SB.H, c = [
		[-S, -S],
		[S, -S],
		[S, S],
		[-S, S]
	];
	const col = mul(WHITE, k);
	for (let i = 0; i < 4; i++) {
		const [x0, z0] = c[i], [x1, z1] = c[(i + 1) % 4];
		dofSegment(O.lines, [
			x0,
			0,
			z0
		], [
			x1,
			0,
			z1
		], {
			color: col,
			width: 2.2
		}, dof);
		dofSegment(O.lines, [
			x0,
			H3,
			z0
		], [
			x1,
			H3,
			z1
		], {
			color: mul(col, 1.1),
			width: 2.3
		}, dof);
		dofSegment(O.lines, [
			x0,
			0,
			z0
		], [
			x0,
			H3,
			z0
		], {
			color: col,
			width: 2.2
		}, dof);
	}
}
function embers(ctx, K, cam) {
	const hs = heartState(ctx.t, K.LK);
	if (hs.ember > .001) drawHeartPoints(ctx, O, cam, hs);
}
/** me as declared (262 144 points on its sphere): the cyan drains toward the point facing the camera, then the
*  countdown takes three quarters of the points and half the radius per sixteenth. */
function drawMeN(ctx, K, cam, ps, sh) {
	const me = O.meN, t = ctx.t;
	me.points.visible = true;
	me.points.position.set(...ME_C);
	me.points.rotation.set(0, .9 + (t - K.B(16)) * .25, 0);
	const sc = sh.r / R_ME;
	me.points.scale.setScalar(Math.max(sc, 1e-4));
	const local = new Vector3().subVectors(cam.position, new Vector3(...ME_C)).normalize().applyMatrix4(new Matrix4().makeRotationY(-me.points.rotation.y)).multiplyScalar(R_ME);
	const ppu = pxPerUnit(cam, ME_C), lvl = 9 - K.nTick(t);
	const boost = Math.min(20, (N_ME / sh.N) ** .28), px = 1.5 * Math.min(3.6, (N_ME / sh.N) ** .11);
	me.set({
		a: O.tex.sphere,
		b: O.tex.sphere,
		morph: 1.02 * (1 - ps.drain),
		wave: R_ME * 2,
		waveOrigin: local.toArray(),
		spread: .88,
		reveal: (lvl / 10 + .08) / 1.02,
		revealBy: "w",
		t,
		size: px / ppu,
		minPx: 1,
		noise: 25e-5 * sc,
		noiseFreq: 6 / Math.max(sc, .05),
		noiseSpeed: .25,
		bright: .1 * boost,
		colA: [
			.86,
			.9,
			1
		],
		colB: COL.me,
		sparkle: .45
	}, cam, ctx.H);
	drainFront(cam, ps, local, me.points.rotation.y);
	if (sh.N <= 4) drawPoint(ME_C, { k: seg(sh.steps, 7.4, 9) });
}
/**
* The drain front (the intro's dyeFront, backwards): the colour morph is a wave from the point facing the camera; a
* point is cyan while morph > d, d = |p − origin| / (2R) · spread. The front is the circle of points at that chord.
*/
function drainFront(cam, ps, local, rotY) {
	const m = 1.02 * (1 - ps.drain);
	if (ps.drain <= 0 || ps.drain >= 1) return;
	const spread = .88, R = R_ME, chord = clamp((m - .12 / 2) / spread, 0, 1) * 2 * R, th = 2 * Math.asin(clamp(chord / (2 * R)));
	const u = new Vector3().subVectors(cam.position, new Vector3(...ME_C)).normalize();
	const v = new Vector3().crossVectors(u, new Vector3(0, 1, 0)).normalize(), w = new Vector3().crossVectors(u, v);
	const pts = [];
	for (let i = 0; i <= 120; i++) {
		const f = i / 120 * TAU, p = u.clone().multiplyScalar(Math.cos(th)).addScaledVector(v, Math.sin(th) * Math.cos(f)).addScaledVector(w, Math.sin(th) * Math.sin(f)).multiplyScalar(R * 1.004);
		pts.push([
			ME_C[0] + p.x,
			ME_C[1] + p.y,
			ME_C[2] + p.z
		]);
	}
	O.lines.polyline(pts, {
		color: mul(COL.me, 1.3 * Math.sin(Math.PI * clamp(ps.drain * 1.2))),
		width: 2
	});
}
function pointCam(ctx, K, t) {
	const k = ease.inOutSine(seg(t, K.B(20), K.B(23.75)));
	const h = lerp(4.1, H0, k), sh = ease.inOutSine(seg(t, K.B(22.25), K.B(23.75))), ppu = 1080 / h;
	const c = [
		-DOT[0] / ppu * sh,
		0,
		-DOT[1] / ppu * sh
	];
	return ortho(O.ocam, c, "top", h, ctx.aspect);
}
/** The power trace retracting into the point: the ring opens first, then every lane pulls back on sixteenths. */
function traceBack(t, K) {
	const six = K.six, tick = (t0, n) => {
		const x = (t - t0) / six;
		if (x <= 0) return 0;
		const f = Math.floor(x);
		return Math.min(n, f + ease.outExpo(clamp((x - f) / .6)));
	};
	const nr = 6, ring = 1 - tick(K.B(20.25), nr) / nr;
	return {
		hops: Math.max(0, O.hopsFull - tick(K.B(20.5), Math.ceil(O.hopsFull))),
		ring,
		close: ring >= 1 ? 1 : 0
	};
}
/** EXECUTION compiled: on the hit its nine characters burst out of the point and settle into the word above it. */
function execWord(ctx, K, t) {
	const t0 = K.lEx.start, g = O.gfExec, k = seg(t, t0, t0 + .5), fade = 1 - ease.inQuad(seg(t, K.lEx.end, K.lEx.end + .45));
	if (t < t0 || fade <= 0) return;
	g.points.position.set(0, 0, 0);
	g.points.quaternion.identity();
	g.points.scale.setScalar(1);
	g.points.updateMatrixWorld();
	g.set({
		a: O.tex.execFrom,
		b: O.tex.execTo,
		morph: ease.outCubic(k),
		spread: .35,
		arc: 1.4,
		t,
		size: .8,
		minPx: 2,
		bright: 1.25 * fade * (.35 + .65 * seg(t, t0, t0 + .12)),
		palette: [
			.92,
			.95,
			1
		],
		flicker: .08 * (1 - k)
	}, O.flat, ctx.H);
	for (const ob of O.all) ob.visible = false;
	g.points.visible = true;
	ctx.draw(O.scene, O.flat);
}
/** EXECUTION: a bright pop of the point on the hit, a thin cross flare and a ring; then it fades with the word. */
function extinction(t, K) {
	const t0 = K.lEx.start, a = t - t0;
	if (a < 0) return {
		k: 1,
		w: 13,
		pop: 0,
		ring: 0,
		a
	};
	const pop = Math.exp(-a / .09);
	return {
		k: (1 - ease.inQuad(seg(t, t0 + .06, K.lEx.end))) * (1 + 2.5 * pop),
		w: 13 * (1 - .6 * seg(t, t0, K.lEx.end)) + 10 * pop,
		pop,
		ring: seg(t, t0, t0 + 1.1),
		a
	};
}
function drawFlare(ctx, cam, ex) {
	if (ex.a < 0 || ex.a > 1.2) return;
	const q = proj(ME_C, cam);
	ctx.text.scene.draw((g) => {
		const f = ex.pop;
		if (f > .01) {
			const W = 420 + 160 * (1 - f), grd = g.createLinearGradient(q[0] - W, 0, q[0] + W, 0);
			grd.addColorStop(0, "rgba(220,232,255,0)");
			grd.addColorStop(.5, `rgba(240,245,255,${f})`);
			grd.addColorStop(1, "rgba(220,232,255,0)");
			g.fillStyle = grd;
			g.fillRect(q[0] - W, q[1] - 1.3, 2 * W, 2.6);
			const gv = g.createLinearGradient(0, q[1] - 90, 0, q[1] + 90);
			gv.addColorStop(0, "rgba(220,232,255,0)");
			gv.addColorStop(.5, `rgba(240,245,255,${.75 * f})`);
			gv.addColorStop(1, "rgba(220,232,255,0)");
			g.fillStyle = gv;
			g.fillRect(q[0] - 1, q[1] - 90, 2, 180);
		}
		const r = 8 + 78 * ease.outCubic(ex.ring), al = .55 * (1 - ex.ring) ** 1.5;
		if (al > .005) {
			g.strokeStyle = `rgba(214,224,242,${al})`;
			g.lineWidth = 1.4;
			g.beginPath();
			g.arc(q[0], q[1], r, 0, TAU);
			g.stroke();
		}
	});
}
/**
* docs/REMAKE.md §4 H. The point me has become is the full stop of the title line: from 25.75 beats `world` is typed
* to its left and `execute(me);` to its right, on sixteenths, in the cells of the cursor that has been blinking right
* of it (the title's glyphs and colours, as in the intro's prompt). The line is whole before the last word is sung and
* holds through it; on the last hit, Enter: the cursor goes, the point goes out with a last light, the line with it.
* Then a moment of black, and the end card (its own cursor, in its own prompt box). At the start of the film the same
* line, the same Enter, set the world going.
*/
var TITLE = "world.execute(me);";
var TITLE_COL = {
	white: "#f3f7ff",
	dim: "#a8b1c4",
	blue: "#98bdff",
	cyan: HEX.me
};
var TITLE_GROUP = [..."wwwwwdbbbbbbbdccdd"].map((c) => ({
	w: "white",
	d: "dim",
	b: "blue",
	c: "cyan"
})[c]);
var END_LATE = .6;
/** The last hit (the final EXECUTION's drum, 207.1 s): Enter. */
var enterAt = (K) => K.enterT ??= K.T.onsetNear("drums", K.end, .12) ?? K.end;
function titleKeys(K) {
	if (K.titleKeys) return K.titleKeys;
	const t0 = K.B(25.75), t1 = K.lEx.start - .07, cells = [
		0,
		1,
		2,
		3,
		4,
		6,
		7,
		8,
		9,
		10,
		11,
		12,
		13,
		14,
		15,
		16,
		17
	];
	return K.titleKeys = cells.map((c, i) => ({
		c,
		t: lerp(t0, t1, i / (cells.length - 1))
	}));
}
function titleLine(ctx, K, t) {
	const L = ctx.text.scene, keys = titleKeys(K), tE = enterAt(K), out = 1 - ease.inQuad(seg(t, tE + .04, tE + .4));
	if (out <= 0) return;
	const cellX = (i) => CUR.cx + (i - 6) * CELL, mid = CUR.cy + DOT[1] + 6.72 - 26.88;
	const typed = keys.filter((k) => t >= k.t);
	for (const k of typed) {
		const pop = 1 + .12 * Math.exp(-(t - k.t) / .05);
		L.text(TITLE[k.c], cellX(k.c), mid, {
			size: 84 * pop,
			weight: 600,
			font: "JetBrains Mono",
			align: "center",
			color: TITLE_COL[TITLE_GROUP[k.c]],
			glow: 10,
			glowColor: "#cfe0ff",
			alpha: out
		});
	}
	if (t < tE) {
		const n = typed.length, next = n < keys.length ? keys[n].c : 18, at = t < keys[0].t - .06 ? 6 : next;
		const idle = t < keys[0].t - .06 || n === keys.length;
		drawCursor(L, cursorQuad(cellX(at), CUR.cy), { alpha: (idle ? blinkOn(ctx.T, t) : 1) * seg(t, K.B(24), K.B(24) + .03) });
	}
}
/** Enter on the last hit: the point pops once and goes out (instead of on the sung word). */
function enterOut(t, K) {
	const t0 = enterAt(K), a = t - t0;
	if (a < 0) return {
		k: 1,
		w: 13,
		pop: 0,
		ring: 0,
		a
	};
	const pop = Math.exp(-a / .08);
	return {
		k: (1 - ease.inQuad(seg(t, t0 + .05, t0 + .45))) * (1 + 2.2 * pop),
		w: 13 * (1 - .6 * seg(t, t0, t0 + .45)) + 9 * pop,
		pop,
		ring: seg(t, t0, t0 + .9),
		a
	};
}
/**
* After the music: the credits rise out of the console and settle into a column, under the tool call that rendered
* this film (the real command and frame count) and over `✻ Worked for …` (the film-wide turn clock at the moment the
* music ended); the terminal window of love's "Question me" comes up around them. The film's cursor (the intro's first
* pixel), blinking at the centre since the full stop, steps down into an empty prompt box that opens around it, and
* waits. Paths are staged so nothing crosses: the credits rise first and slide right above the cursor's line, the
* cursor descends right of the text and then slides left into the box.
*/
function endScreen(ctx, K, t, A) {
	const late = remade(ctx) ? END_LATE : 0, B = (k) => K.B(k) + late;
	const L = ctx.text.overlay, S = ctx.text.scene, X = 560, size = 30, lh = 44, Y1 = 420;
	const frames = Math.round((PROJECT.preroll ?? 0) * 60) + Math.ceil(K.fin * 60);
	terminal(ctx, [
		500,
		182,
		920,
		604
	], {
		title: "claude  ·  ~/world-execute-mv",
		alpha: A * ease.inOutSine(seg(t, B(33), B(33.8)))
	});
	const tc = seg(t, B(33.3), B(33.9));
	if (tc > 0) toolCall(L, X, 286, "Bash", "node render.mjs --frames", [`${frames.toLocaleString("en").replace(/,/g, " ")} frames · 3840×2160 · 60 fps`], {
		size: 26,
		show: seg(t, B(33.9), B(33.95)),
		alpha: A * ease.outCubic(tc)
	});
	const ly = ease.inOutCubic(seg(t, B(32.6), B(33.8))), lx = ease.inOutCubic(seg(t, B(33.2), B(34.2)));
	const cr = K.LOG.filter((e) => e.credit);
	cr.forEach((e, i) => {
		const x0 = 110, y0 = 930 - (cr.length - 1 - i) * 43.5, y1 = Y1 + i * lh;
		const x = lerp(x0, X, lx), y = lerp(y0, y1, ly), al = lerp([
			1,
			.8,
			.66
		][Math.min(cr.length - 1 - i, 2)], 1, ly) * A;
		let xx = x;
		for (const [str, col, kind] of e.spans) {
			if (kind === "logo") {
				drawLogo(L, xx, y, logoSize(size), {
					alpha: al,
					glow: 4,
					glowColor: HGREY
				});
				xx += logoWidth(L, logoSize(size));
				continue;
			}
			L.text(str, xx, y, {
				size,
				weight: 500,
				font: "JetBrains Mono",
				align: "left",
				color: col ?? HEX.white,
				alpha: al,
				glow: 4,
				glowColor: HGREY
			});
			xx += L.measure(str, {
				size,
				font: "JetBrains Mono",
				weight: 500
			});
		}
	});
	const wf = seg(t, B(34.4), B(34.5));
	if (wf > 0) workedFor(L, X, 626, remade(ctx) ? Math.round(frames / 60) : turnElapsed(K.end), {
		size: 28,
		alpha: A * wf
	});
	const bx = X, by = 674, bs = 28;
	const gy = ease.inOutCubic(seg(t, B(33.4), B(34))), gx = ease.inOutCubic(seg(t, B(33.8), B(34.5))), sc = lerp(1, .5, ease.inOutCubic(seg(t, B(33.4), B(34.5))));
	const pb = ease.outCubic(seg(t, B(34.2), B(34.8)));
	if (pb > 0) promptBox(L, bx, by, 800 * (.3 + .7 * pb), {
		size: bs,
		text: "",
		cursor: false,
		alpha: A * pb,
		hint: pb > .9 ? "? for shortcuts" : false
	});
	const cx = lerp(CUR.cx, 616.4 + CUR.w * .5 / 2, gx), cy = lerp(CUR.cy, 712.36, gy);
	if (remade(ctx)) {
		if (pb > .6) drawCursor(S, cursorQuad(616.4 + CUR.w * .5 / 2, 712.36, .5), {
			alpha: A * blinkOn(ctx.T, t) * seg(pb, .6, .9),
			scale: .5
		});
		return;
	}
	const moving = t > B(33.4) && t < B(34.5);
	drawCursor(S, cursorQuad(cx, cy, sc), {
		alpha: A * (moving ? 1 : blinkOn(ctx.T, t)),
		scale: sc
	});
}
/**
* docs/REMAKE.md §12.7 item 1: the intro's black-glass pieces (intro/obsidian.js) in the world being unloaded, and their
* leaving, each landing of the intro played backwards (intro/landing.js and intro/quake.js, run on the time left to the
* lift-off): over the half beat before it goes, its dust falls back into its foot and the shock gathers over the floor
* into it; the floor lets go of it with a jolt of the camera, and it rises as fast as it came down, slowing, and is gone.
*/
function solidStR(i, t, K) {
	const tR = K.rise[i], f = fall(2 * tR - t, tR, {
		h: DROP,
		turn: IMPACT[ORDER[i]].turn
	}), s = tR - t;
	const gone = ease.inQuad(seg(t, tR + .04, tR + .42));
	return {
		...f,
		s,
		up: t > tR,
		tip: f.tremble ?? 0,
		flash: s >= 0 ? Math.exp(-s / .09) : 0,
		alpha: (f.shown ? 1 : 0) * (1 - gone)
	};
}
/** The landings in reverse that are under way: their fronts on the floor (closing in) and the camera's jolt (frame heights). */
function quakeR(t, K) {
	const fronts = [];
	let j = 0;
	K.rise.forEach((tR, i) => {
		const s = tR - t;
		if (s < 0 || s > 1.4) return;
		const p = IMPACT[ORDER[i]], f = front(s, { amp: p.ring });
		if (f) fronts.push({
			x: ROW_X[i],
			z: ROW_Z,
			r: f.r,
			amp: f.amp,
			w: f.w,
			ripples: p.ripples,
			col: elementOf(i).lin
		});
		j += jolt(s, p.jolt * .5);
	});
	return {
		fronts,
		jolt: j
	};
}
/** Pose the pieces and set their glass for this frame; returns { out: [{ st, P, c, a }], meshes (the ones on screen) }. */
function posePiecesR(ctx, K, o = {}) {
	const t = ctx.t, fx = o.fx ?? quakeR(t, K), out = [], meshes = [];
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
		const st = solidStR(i, t, K), { F, P } = posePiece(O.place[i], {
			dy: st.dy,
			spin: st.spin,
			tip: st.tip
		}), a = st.alpha * (o.k ?? 1);
		out.push({
			st,
			P,
			c: [
				ROW_X[i],
				0,
				ROW_Z
			],
			a
		});
		if (a <= .002) continue;
		showPiece(O.R.pieces[i], F, {
			alpha: a,
			flash: .35 * st.flash,
			ring,
			ringW,
			box: [
				SB.S,
				SB.H,
				o.env?.[0] ?? 0,
				o.env?.[1] ?? .5
			],
			...pieceLook(i)
		});
		meshes.push(O.R.pieces[i]);
	}
	return {
		out,
		meshes
	};
}
/** A piece's light in its element (as the intro's pieceLook): the glass's rim and what it mirrors of the sandbox. */
var pieceLook = (i) => ({
	rim: mul(elementOf(i).lin, 1.15),
	envRing: elementOf(i).lin,
	envHex: mul(POWER.amber, 1.25),
	envTrace: mul(POWER.amber, 1.4)
});
/** Their edges (the wireframe, now the highlight) in their elements, and the speed lines under one that is going. */
function drawEdgesR(posed, o = {}) {
	posed.out.forEach(({ st, P, a }, i) => {
		if (a <= .002) return;
		const e = elementOf(i).lin, w = o.width ?? 2.6, dots = (o.dots ?? 1.5) * a;
		drawSolid(O.lines, O.place[i].solid, P, {
			color: mul(e, (o.bright ?? 1.2) * a * (1 + .9 * st.flash)),
			width: w,
			dots: 0,
			dof: o.dof
		});
		if (dots > 0) for (const q of P) dofDot(O.lines, q, {
			color: mul(mix3(e, [
				1,
				1,
				1
			], .45), dots),
			width: w * 3
		}, o.dof);
		if (st.up && st.falling) {
			const bot = Math.min(...P.map((q) => q[1]));
			for (const q of P) if (q[1] < bot + .03) dofSegment(O.lines, [
				q[0],
				Math.max(.01, q[1] - .02 - st.v * .06),
				q[2]
			], [
				q[0],
				q[1] - .02,
				q[2]
			], {
				color: mul(e, .4 * a),
				width: 1.3
			}, o.dof);
		}
	});
	return posed.out;
}
var drawSolidsR = (ctx, K, o = {}) => drawEdgesR(posePiecesR(ctx, K, o), o);
/** The fronts closing in and the dust falling back, as glow lines. */
function drawQuakeR(K, t, o = {}) {
	K.rise.forEach((tR, i) => {
		const s = tR - t;
		if (s < 0 || s > 1.4) return;
		const p = IMPACT[ORDER[i]], col = elementOf(i).lin;
		drawFront(O.lines, ROW_X[i], ROW_Z, s, {
			ring: { amp: p.ring },
			ripples: p.ripples,
			dof: o.dof,
			bright: 1.2,
			clip: SB.S,
			color: col
		});
		drawDust(O.lines, ROW_X[i], ROW_Z, s, p.seed, p, {
			dof: o.dof,
			rim: p.rim,
			back: true,
			color: col
		});
	});
}
function leaveShotR(ctx, s) {
	const K = keys(ctx.T), t = ctx.t, k = seg(t, K.B(s.at), K.B(s.at + s.len));
	reset();
	const fx = quakeR(t, K), at = typeof s.look === "function" ? s.look(k) : s.look, pos = s.pos(k);
	const j = fx.jolt * 2 * Math.hypot(at[0] - pos[0], at[1] - pos[1], at[2] - pos[2]) * Math.tan(MathUtils.degToRad(s.fov) / 2);
	const cam = persp([
		pos[0],
		pos[1] + j,
		pos[2]
	], [
		at[0],
		at[1] + j,
		at[2]
	], {
		fov: s.fov,
		aspect: ctx.aspect
	});
	const dof = dofOf(cam, s.focus, .014, 24);
	codeWall(ctx, cam, at, {
		d: 3.2,
		bright: .19,
		aperture: .016,
		t0: K.B(7)
	});
	drawBoxLines(t, K, .3, dof);
	O.R.dots.userData.set({
		bright: .42,
		size: .007,
		color: GREY,
		t,
		focus: s.focus,
		aperture: s.mode ? 0 : .016,
		maxBlur: 24,
		clip: SB.S,
		fronts: fx.fronts
	}, cam, ctx.H);
	const all = drawSolidsR(ctx, K, {
		dof,
		width: 2.8,
		dots: 1.7,
		fx,
		env: [0, .45]
	});
	drawQuakeR(K, t, { dof });
	if (s.mode) {
		const tex = capture(ctx, (sub) => render(sub, cam));
		look(ctx, K);
		hueDither(ctx, tex, {
			pix: 3,
			gain: 2.2
		});
	} else render(ctx, cam);
	const i = s.free.find((q) => t < K.rise[q] + .45) ?? s.free.at(-1), id = ORDER[i], so = O.place[i].solid;
	const q = proj(all[i].P.reduce((m, p) => p[1] > m[1] ? p : m), cam), a = all[i].a;
	if (a > .02 && q[1] > 180) callout(ctx.text.overlay, [q[0], q[1]], so.name, {
		dx: s.id === "row2" ? -70 : 70,
		dy: -60,
		color: HGREY,
		alpha: .85 * a,
		draw: ease.outCubic(seg(t, K.rise[i] - .45, K.rise[i] - .25))
	});
	overlays(ctx, K, { backing: s.mode ? 0 : .8 });
	const left = K.rise.filter((r) => t < r).length;
	[
		["free", so.name],
		["Timaeus", TIMAEUS[id]],
		["V E F", `${so.nV} ${so.nE} ${so.nF}`],
		["solids", `${left} / 5`]
	].forEach((r, k) => readout(ctx, [r], {
		y: 150 + k * 15 * 1.55,
		...k === 1 ? { accent: elementOf(i).hex } : {}
	}));
	if (!s.mode) look(ctx, K);
}
//#endregion
