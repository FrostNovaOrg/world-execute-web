import { chapter } from "../engine/timeline.js?v=vYBbdLfo";
import { TAU, clamp, ease, hash, hash2, kf, lerp, seg } from "../engine/math.js?v=BJIlRm7-";
import { HEX } from "../theme.js?v=Bj33PIbo";
import { remade } from "../lib/published.js?v=aV_CU5HV";
import { Group, Quaternion, Scene, Vector3 } from "../../vendor/three/build/three.core.js?v=q9f7JKE-";
import { fsMaterial } from "../engine/gpu.js?v=o4BYX3o1";
import { GlowLines } from "../engine/lines.js?v=B_AAaaTO";
import { dimLine, frame, toDesign } from "../lib/hud.js?v=BgmSZjmG";
import { codeBlock, onShape, source } from "../lib/glyphs.js?v=DWbHICXG";
import { capture, view } from "../lib/modes.js?v=Cu3GYO-2";
import { thinking } from "../lib/claude.js?v=DXDs_lIL";
import { shapes } from "../engine/shapes.js?v=BFh0PgdI";
import { RC, RH, makeCams, monoLine, readout, sysLog } from "./bridge/kit.js?v=CeXrm8uc";
import { CorruptSwarm } from "./bridge/corrupt.js?v=SFN2swSb";
import { CorruptGlyphs } from "./bridge/glyphs.js?v=BtXgzP2a";
import { FLOOR_CODE, TearFloor, codeGrid } from "./bridge/floor.js?v=BjISKwl7";
import { LANDED_N, landedHeart } from "./bridge/landed.js?v=zRka1JTZ";
import { brokenColumns, latticeMaterial, setLattice } from "./inst2/lattice.js?v=Dw-yxJui";
import { PixelSort } from "./inst2/pixelsort.js?v=Di-U0-y1";
import { crackPattern, cubeFaces, onFace } from "./inst2/crack.js?v=BzPqIG7t";
import { asciiView } from "./inst2/ascii.js?v=CSOXER2X";
//#region src/ch/11_inst2.js
var LABEL = "crash";
var ME_C = [
	0,
	1.25,
	0
];
var ME_R = .72;
var CUBE_C = [
	0,
	1.6,
	0
];
var CUBE_H = 1.6;
var FACES = cubeFaces(CUBE_C, CUBE_H);
var IMPACT = [
	[.38, .52],
	[-.5, -.2],
	[.2, .7],
	[-.3, .4],
	[.1, -.35],
	[0, 0]
];
var FACE_AT = [
	12,
	15,
	14,
	14.5,
	14,
	99
];
var PAGE = {
	cell: .1,
	x0: -4.3,
	y0: 4.9,
	cols: 118,
	rows: 112,
	strip: 3
};
var RED_SYNTAX = [
	[
		.9,
		.84,
		.82
	],
	[
		.3,
		.08,
		.06
	],
	[
		1,
		.42,
		.26
	],
	[
		1,
		.5,
		.32
	],
	[
		1,
		.14,
		.09
	],
	[
		.55,
		.22,
		.2
	]
];
var O = null;
var KC = null;
function keys(T) {
	if (KC?.T === T) return KC;
	const s0 = T.section("inst2").start, b0 = Math.round(T.beatAt(s0));
	const B = (k) => T.beatTime(b0 + k), beat = B(1) - B(0);
	const front = [
		[B(20), 26],
		[B(22), 12],
		[B(24), 6.5],
		[B(26), 3.8],
		[B(28), 2.2],
		[B(29.5), 0]
	];
	const tBlow = T.findLine("You have made").start + .02;
	return KC = {
		T,
		s0,
		B,
		beat,
		tC0: B(0) - .35,
		front,
		tLast: B(29.5) + .1,
		tBlow,
		crash: B(24),
		end: T.section("chant").start
	};
}
var clock = (t, K) => t - K.tC0;
/** Time the floor at radius r breaks (inverse of the front keyframes; farther than the first key: earlier). */
function breakTime(r, K) {
	const F = K.front;
	if (r >= F[0][1]) return F[0][0] - (r - F[0][1]) / 14;
	for (let i = 1; i < F.length; i++) if (r >= F[i][1]) return lerp(F[i - 1][0], F[i][0], (F[i - 1][1] - r) / (F[i - 1][1] - F[i][1]));
	return F.at(-1)[0];
}
var frontR = (t, K) => kf(t, K.front.map(([a, b]) => [a, b]), ease.linear);
function faceR(f, t, K) {
	const t0 = K.B(FACE_AT[f]);
	if (t < t0) return -1;
	const b = (t - t0) / K.beat, n = Math.floor(b), part = ease.outCubic(clamp((b - n) * K.beat / .12));
	const P = O.cracks[f], grow = (k) => P.maxD * (1 - .6 ** k);
	return lerp(grow(n + 1), grow(n + 2), part) * .75 + .15 * P.maxD * ease.outExpo(clamp((t - t0) / .2));
}
function shardFall(s, f, t, K) {
	return t - (K.B(16) + (1 - s.j / 5) * 6 * K.beat + s.seed * 7 * K.beat + f * .13);
}
function meState(t, K) {
	const tear = ease.inCubic(seg(t, K.B(12), K.B(31)));
	return {
		bits: 23,
		corrupt: .3 + .25 * tear,
		rot: .25 + .5 * tear,
		jitter: .006 + .03 * tear,
		tear: [
			.06 + .5 * tear,
			.085 + .05 * tear,
			6 + 6 * tear,
			.15 + .6 * tear
		],
		reveal: 1 - .75 * ease.inQuad(seg(t, K.B(26), K.B(31)))
	};
}
function reset() {
	for (const o of [
		O.me.points,
		O.page.points,
		O.frags.points,
		O.floor.mesh,
		O.lines.mesh
	]) o.visible = false;
	O.world.position.y = 0;
	O.lines.begin();
}
function render(ctx, cam) {
	O.lines.mesh.visible = true;
	O.lines.end(ctx);
	ctx.draw(O.scene, cam);
}
function look(ctx, o = {}) {
	Object.assign(ctx.post, {
		bloom: 1.05,
		threshold: .95,
		ca: .3,
		vignette: .5,
		grain: .035,
		exposure: 1,
		...o
	});
}
var col = (c, k) => c.map((v) => v * k);
/** Corner frame, the system log, and the program's thinking line under it (live until the context is lost, then frozen). */
function hudFrame(ctx, K, br) {
	const L = ctx.text.overlay, t = ctx.t;
	frame(L, t, ctx.T, {
		label: LABEL,
		bottomRight: br
	});
	sysLog(L, t, O.log, {
		size: 22,
		keep: 2,
		y: 924
	});
	const live = t < K.crash, tt = Math.min(t, K.crash);
	thinking(L, 110, 972, tt, {
		T: ctx.T,
		count: { from: 0 },
		size: 21,
		interrupt: true,
		shimmer: live,
		alpha: live ? .9 : .5
	});
}
function floor(ctx, K, o = {}) {
	O.floor.set({
		t: ctx.t,
		y: 0,
		wave: [
			0,
			0,
			1e4,
			1
		],
		colA: RC.red,
		colB: col(RC.red, .9),
		intensity: o.intensity ?? 1,
		fade: o.fade ?? .06,
		front: 0,
		edge: 2.2,
		axis: 0,
		minor: 0,
		g: 4.5,
		shiver: 1,
		ageFade: o.ageFade ?? .7,
		grid: 0,
		code: 1,
		codeR: -1,
		codeCol: col(RC.red, o.code ?? 1.1)
	});
}
function drawMe(ctx, cam, K, o = {}, hPx = ctx.H) {
	const st = meState(ctx.t, K), g = O.me;
	g.points.visible = true;
	g.points.position.set(...ME_C);
	g.points.scale.setScalar(ME_R);
	g.set({
		a: O.tex.me,
		t: ctx.t,
		size: .05,
		bright: .5,
		palette: RC.pale,
		red: RC.red,
		redMix: .9,
		minPx: 2,
		reveal: st.reveal,
		back: .12,
		corrupt: st.corrupt,
		rot: st.rot,
		rotHz: 12,
		jitter: st.jitter,
		jitterHz: 15,
		tear: st.tear,
		blow: [
			K.tBlow,
			3,
			150,
			.42,
			.4
		],
		...o
	}, cam, hPx);
}
/** The heart's shards from the bridge, still on the sandbox floor (they go down with it). */
function frags(ctx, cam, o = {}, hPx = ctx.H) {
	const f = O.frags;
	f.points.visible = true;
	f.points.position.set(0, o.y ?? 0, 0);
	f.set({
		a: O.tex.frags,
		t: ctx.t,
		size: .0058,
		bright: .2,
		colA: RC.red,
		colB: RC.red,
		sparkle: .1,
		minPx: 1.1,
		jitter: .004,
		jitterHz: 12
	}, cam, hPx);
}
/** The sandbox: jittering edges, the cracks on every face, and the shards that have fallen out. */
function drawSandbox(ctx, K, o = {}) {
	const t = ctx.t, L = O.lines, g = o.gain ?? 1, jit = .004 + .05 * seg(t, K.B(24), K.B(31)), dy = o.y ?? 0;
	const f = Math.floor(t * 15), V = [];
	for (let i = 0; i < 8; i++) V.push([
		i & 1 ? 1 : -1,
		i & 2 ? 1 : -1,
		i & 4 ? 1 : -1
	].map((s, a) => CUBE_C[a] + s * CUBE_H + (hash(i * 7.1 + a * 1.3 + f * .37) - .5) * 2 * jit + (a === 1 ? dy : 0)));
	for (const [a, b] of [
		[0, 1],
		[2, 3],
		[4, 5],
		[6, 7],
		[0, 2],
		[1, 3],
		[4, 6],
		[5, 7],
		[0, 4],
		[1, 5],
		[2, 6],
		[3, 7]
	]) L.segment(V[a], V[b], {
		color: col(RC.white, .6 * g),
		width: o.edge ?? 2.2
	});
	FACES.forEach((F, fi) => {
		const R = faceR(fi, t, K);
		if (R < 0) return;
		for (const s of O.cracks[fi].segs) {
			if (s.d0 >= R) continue;
			const k = Math.min(1, (R - s.d0) / (s.d1 - s.d0)), b = [lerp(s.a[0], s.b[0], k), lerp(s.a[1], s.b[1], k)];
			const c = R - s.d1 < .35 ? col(RC.hot, 2.4 * g) : col(s.ring ? RC.red : RC.white, (s.ring ? 1.1 : .9) * g);
			const A = onFace(F, ...s.a, .004), Bp = onFace(F, ...b, .004);
			A[1] += dy;
			Bp[1] += dy;
			L.segment(A, Bp, {
				color: c,
				width: s.ring ? 2 : 2.3
			});
		}
		for (const s of O.cracks[fi].shards) {
			const age = shardFall(s, fi, t, K);
			if (age <= 0 || age > 3.2) continue;
			const ax = [
				hash(s.seed * 9.1) - .5,
				hash(s.seed * 4.7) - .5,
				hash(s.seed * 2.3) - .5
			], n = Math.hypot(...ax), ang = age * (1.5 + 2 * s.seed);
			const q = new Quaternion().setFromAxisAngle(new Vector3(ax[0] / n, ax[1] / n, ax[2] / n), ang);
			const c0 = onFace(F, ...s.c), drop = [
				F.n[0] * age * .5,
				-2.2 * age * age + F.n[1] * age * .5 + dy,
				F.n[2] * age * .5
			];
			const pts = s.poly.concat([s.poly[0]]).map((p) => {
				const w = new Vector3(...onFace(F, ...p)).sub(new Vector3(...c0)).applyQuaternion(q);
				return [
					c0[0] + w.x + drop[0],
					c0[1] + w.y + drop[1],
					c0[2] + w.z + drop[2]
				];
			});
			L.polyline(pts, {
				color: col(RC.red, 1.2 * g * Math.exp(-age * .6)),
				width: 1.6
			});
		}
	});
}
function lattice(ctx, cam, K, o = {}) {
	cam.updateMatrixWorld();
	setLattice(O.lat, cam, {
		clock: clock(ctx.t, K),
		...o
	});
	ctx.pass(O.lat);
}
function persp(ctx, pos, lookAt, o) {
	return O.cam.p(ctx, pos, lookAt, o);
}
/** The page of lattice.js, coming apart in strips of PAGE.strip columns (sweeping left to right, with disorder). */
function drawPage(ctx, cam, K, o = {}, hPx = ctx.H) {
	const g = O.page, adv = PAGE.cell * .6;
	g.points.visible = true;
	g.set({
		a: O.tex.page,
		t: ctx.t,
		size: PAGE.cell * 1.3,
		bright: o.bright ?? .85,
		minPx: 2,
		palette: RED_SYNTAX,
		corrupt: .08,
		redMix: 1,
		red: RC.red,
		rot: .5,
		rotHz: 9,
		fall: [
			K.B(8.25),
			4.6 * K.beat,
			7,
			adv * PAGE.strip
		],
		fall2: [
			3.2,
			.22,
			.78,
			.1
		],
		fallX: [PAGE.x0, PAGE.x0 + PAGE.cols * adv],
		focus: o.focus ?? 6,
		aperture: o.aperture ?? .012,
		maxBlur: 14
	}, cam, hPx);
}
var VIEWS = [
	"cube",
	"me",
	"loss",
	"floor",
	"hex",
	"cube",
	"loss",
	"me",
	"floor",
	"hex",
	"loss",
	"cube",
	"me",
	"floor"
];
function sinkY(t, K) {
	const a = t - K.tLast;
	return a > 0 ? -2.25 * a * a : 0;
}
function fastDraw(ctx) {
	const K = keys(ctx.T), t = ctx.t, k = Math.round((ctx.shot.start - K.B(24)) * 2 / K.beat), lt = t - ctx.shot.start;
	const view = VIEWS[k], y = sinkY(t, K), c = [
		0,
		1.3 + y,
		0
	], n = VIEWS.slice(0, k).filter((v) => v === view).length;
	reset();
	let br = null;
	if (view === "cube") {
		const az = [
			.6,
			2.9,
			4.6
		][n] + lt * .5, el = [
			2.4,
			1.1,
			3.4
		][n];
		const cam = persp(ctx, [
			Math.sin(az) * 6.3,
			el + y * .5,
			Math.cos(az) * 6.3
		], c, { fov: 38 });
		O.world.position.y = y;
		drawSandbox(ctx, K, {
			gain: 1,
			y
		});
		drawMe(ctx, cam, K, { bright: .45 });
		render(ctx, cam);
	} else if (view === "me") {
		const az = [
			-.8,
			.7,
			2.2
		][n] + lt * .6;
		const cam = persp(ctx, [
			Math.sin(az) * 2.5,
			ME_C[1] + y + [
				.3,
				-.2,
				.5
			][n],
			Math.cos(az) * 2.5
		], [
			0,
			ME_C[1] + y,
			0
		], { fov: 40 });
		O.world.position.y = y;
		drawSandbox(ctx, K, {
			gain: .45,
			y
		});
		drawMe(ctx, cam, K, {
			focus: 1.8,
			aperture: .015,
			maxBlur: 12,
			bright: .55
		});
		render(ctx, cam);
	} else if (view === "floor") {
		let cam;
		if (n === 0) {
			const az = 2.2 + lt * .3;
			cam = persp(ctx, [
				Math.sin(az) * 4.8,
				.45,
				Math.cos(az) * 4.8
			], [
				0,
				1,
				0
			], { fov: 46 });
		} else if (n === 1) {
			cam = O.cam.o([
				0,
				0,
				0
			], "top", 7 + 1.6 * Math.max(frontR(t, K), 1.5) - lt * 1.2, ctx.aspect);
			br = "view  top · orthographic";
		} else cam = persp(ctx, [
			2.5,
			-5.5 + y * .3,
			5.5 - lt
		], [
			0,
			1.5 + y,
			0
		], { fov: 46 });
		floor(ctx, K, n === 1 ? {
			fade: 0,
			ageFade: 3.5
		} : { ageFade: 1.1 });
		O.world.position.y = y;
		drawSandbox(ctx, K, {
			gain: .75,
			y
		});
		frags(ctx, cam, { y });
		drawMe(ctx, cam, K, { bright: .5 });
		render(ctx, cam);
	} else if (view === "loss") viewLoss(ctx, K, lt);
	else viewHex(ctx, K, lt);
	fatalLog(ctx, K);
	hudFrame(ctx, K, br);
	look(ctx, { vignette: .5 });
}
/** The fatal messages, one per bar-half from B(24), accumulating (they never switch off between cuts). */
function fatalLog(ctx, K) {
	const L = ctx.text.overlay, t = ctx.t;
	O.fatal.forEach(([t0, head, line], i) => {
		if (t < t0) return;
		const a = seg(t, t0, t0 + .06), yy = 150 + i * 62;
		if (t - t0 < K.beat / 2) {
			const y = 540 + (i - 1.5) * 12;
			L.draw((g) => {
				g.globalAlpha *= .82 * a;
				g.fillStyle = "#000";
				g.fillRect(0, y - 34, 1920, 68);
			});
			monoLine(L, head, 960, y, {
				size: 32,
				weight: 700,
				color: RH.white,
				alpha: .95 * a,
				align: "center",
				glow: 10,
				glowColor: RH.red
			});
		} else {
			monoLine(L, head, 150, yy, {
				size: 21,
				weight: 700,
				color: RH.red,
				alpha: .95
			});
			monoLine(L, line, 150, yy + 24, {
				size: 15,
				weight: 500,
				color: HEX.dim,
				alpha: .9
			});
		}
	});
}
var LOSS = {
	s1: 18800,
	sD: 18140,
	sN: 18432,
	k: 42,
	lo: 1,
	hi: 1e4
};
function lossAt(s, raw = true) {
	return (1.55 + 9.3 * (1 + s / 180) ** -.9) * (1 + (raw ? (hash(Math.floor(s) * .713) - .5) * .16 + (hash(Math.floor(s / 37) * 1.31) - .5) * .06 : 0)) * (s > LOSS.sD ? Math.exp((s - LOSS.sD) / LOSS.k) : 1);
}
var stepAt = (t, K) => Math.round(lerp(17960, LOSS.sN, seg(t, K.B(24.5), K.B(29.05))));
function viewLoss(ctx, K, lt) {
	const L = ctx.text.scene, O2 = ctx.text.overlay, t = ctx.t, S = stepAt(t, K), nan = S >= LOSS.sN, last = Math.min(S, LOSS.sN - 1);
	const dx = -lt * 16, X0 = 330 + dx, X1 = 1590 + dx, Y0 = 800, Y1 = 425;
	const lg = Math.log10, xs = (s) => lerp(X0, X1, s / LOSS.s1), ys = (v) => lerp(Y0, Y1, (lg(Math.min(v, LOSS.hi)) - lg(LOSS.lo)) / (lg(LOSS.hi) - lg(LOSS.lo)));
	L.draw((g) => {
		const base = g.globalAlpha;
		g.lineWidth = 1;
		g.strokeStyle = "#6d5f63";
		g.globalAlpha = base * .4;
		for (const v of [
			10,
			100,
			1e3,
			1e4
		]) {
			g.beginPath();
			g.moveTo(X0, ys(v));
			g.lineTo(X1, ys(v));
			g.stroke();
		}
		g.globalAlpha = base * .85;
		g.lineWidth = 1.4;
		g.beginPath();
		g.moveTo(X0, Y1);
		g.lineTo(X0, Y0);
		g.lineTo(X1, Y0);
		g.stroke();
		for (let s = 0; s <= 18e3; s += 3e3) {
			g.beginPath();
			g.moveTo(xs(s), Y0);
			g.lineTo(xs(s), 809);
			g.stroke();
		}
		const px = (X1 - X0) / LOSS.s1;
		g.globalAlpha = base * .32;
		g.strokeStyle = "#fff1ec";
		g.lineWidth = 1;
		g.beginPath();
		for (let X = X0; X <= xs(last); X += 2) {
			const s0 = Math.floor((X - X0) / px), s1 = Math.min(last, Math.floor((X + 2 - X0) / px));
			let lo = 1e9, hi = 0;
			for (let s = s0; s <= s1; s += Math.max(1, Math.floor((s1 - s0) / 6))) {
				const v = lossAt(s);
				lo = Math.min(lo, v);
				hi = Math.max(hi, v);
			}
			g.moveTo(X, ys(lo));
			g.lineTo(X, ys(hi) - 1);
		}
		g.stroke();
		for (const [a, b, c, w] of [[
			0,
			Math.min(last, LOSS.sD),
			"#fff1ec",
			2.2
		], [
			LOSS.sD,
			last,
			"#ff4a3d",
			3
		]]) {
			if (b <= a) continue;
			g.globalAlpha = base;
			g.strokeStyle = c;
			g.lineWidth = w;
			g.beginPath();
			const step = Math.max(1, Math.round((b - a) / 400));
			for (let s = a; s <= b; s += step) {
				const X = xs(s), Y = ys(lossAt(s, false));
				if (s === a) g.moveTo(X, Y);
				else g.lineTo(X, Y);
			}
			g.lineTo(xs(b), ys(lossAt(b, false)));
			g.stroke();
		}
		if (nan) {
			const X = xs(LOSS.sN);
			g.strokeStyle = "#ff4a3d";
			g.lineWidth = 3;
			g.beginPath();
			g.moveTo(X - 11, 400);
			g.lineTo(X + 11, 422);
			g.moveTo(X + 11, 400);
			g.lineTo(X - 11, 422);
			g.stroke();
		}
	});
	const st = {
		size: 18,
		weight: 500,
		font: "JetBrains Mono",
		color: "#8a7a7e",
		alpha: .95
	};
	[
		[1, "1"],
		[10, "10"],
		[100, "100"],
		[1e3, "1e3"],
		[1e4, "1e4"]
	].forEach(([v, s]) => L.text(s, X0 - 16, ys(v), {
		...st,
		align: "right"
	}));
	for (let s = 0; s <= 18e3; s += 3e3) L.text(s ? `${s / 1e3}k` : "0", xs(s), 832, {
		...st,
		align: "center"
	});
	L.text("train/loss", X0, 389, {
		...st,
		size: 22,
		weight: 600,
		color: "#d8c8ca",
		align: "left"
	});
	L.text("step", X1, 864, {
		...st,
		align: "right"
	});
	const l = lossAt(S), gn = 1.9 * (S > LOSS.sD ? Math.exp((S - LOSS.sD) / 30) : 1), lr = 3e-4 * (.1 + .45 * (1 + Math.cos(Math.PI * S / 4e4)));
	readout(ctx, 1500, 150, [
		["step", S.toLocaleString("en")],
		["loss", nan ? "nan" : l.toFixed(3)],
		["grad_norm", nan ? "inf" : gn < 1e4 ? gn.toFixed(1) : gn.toExponential(2)],
		["lr", lr.toExponential(2)]
	]);
	if (nan) monoLine(O2, `step ${S.toLocaleString("en")}   loss = nan`, xs(LOSS.sN) - 30, 455, {
		size: 26,
		weight: 700,
		color: RH.red,
		align: "right",
		glow: 8
	});
}
var HEXV = {
	base: 2134518784,
	rows: 16,
	cols: 8,
	hit: [9, 5]
};
var _f = /* @__PURE__ */ new Float32Array(1);
var _u = new Uint32Array(_f.buffer);
var f32hex = (v) => {
	_f[0] = v;
	return _u[0].toString(16).padStart(8, "0");
};
function viewHex(ctx, K, lt) {
	const L = ctx.text.scene, t = ctx.t, bad = ease.inQuad(seg(t, K.B(25.9), K.B(30.5))), scroll = lt * 22;
	const x0 = 300, y0 = 250 - scroll, lh = 37, cw = 140, [hr, hc] = HEXV.hit, hitOn = t >= K.B(26);
	L.text(`me.position   Float32Array(${(O.me.count * 3).toLocaleString("en")})   @ 0x${HEXV.base.toString(16)}`, x0, y0 - 56, {
		size: 22,
		weight: 600,
		font: "JetBrains Mono",
		align: "left",
		color: "#d8c8ca",
		alpha: .95
	});
	let nans = 0;
	for (let r = 0; r < HEXV.rows; r++) {
		const addr = HEXV.base + r * 32, y = y0 + r * lh;
		monoLine(L, `0x${addr.toString(16)}`, x0, y, {
			size: 23,
			weight: 500,
			color: "#8a7a7e",
			alpha: .95
		});
		for (let c = 0; c < HEXV.cols; c++) {
			const i = r * HEXV.cols + c, v = Math.fround(Math.sin(TAU * hash2(i, 4)) * .72 * (c % 3 === 1 ? 1 : .96));
			const d = Math.hypot(r - hr, (c - hc) * 1.4) + (hash(i * 3.3) - .5) * 3;
			const gone = hitOn && d < bad * 15, hit = r === hr && c === hc && hitOn;
			if (gone) nans++;
			monoLine(L, gone ? "7fc00000" : f32hex(v), 500 + c * cw, y, {
				size: 23,
				weight: gone || hit ? 700 : 500,
				color: gone || hit ? RH.red : RH.white,
				alpha: gone ? .95 : .62
			});
		}
	}
	if (hitOn) {
		const y = y0 + hr * lh, x = 500 + hc * cw;
		L.draw((g) => {
			g.strokeStyle = RH.red;
			g.lineWidth = 2;
			g.globalAlpha *= .9;
			g.strokeRect(x - 9, y - 18, 130, 36);
		});
		monoLine(ctx.text.overlay, "← illegal memory access", 500 + HEXV.cols * cw + 4, y, {
			size: 21,
			weight: 600,
			color: RH.red,
			alpha: .95
		});
	}
	readout(ctx, 1500, 150, [["NaN words", `${nans} / ${HEXV.rows * HEXV.cols}`], ["0x7fc00000", "quiet NaN"]], { keyW: 130 });
}
chapter({
	id: "inst2",
	from: (T) => T.section("inst2").start,
	to: (T) => T.section("chant").start,
	init(ctx) {
		const T = ctx.T, K = keys(T);
		O = {
			scene: new Scene(),
			cam: makeCams()
		};
		O.me = new CorruptGlyphs({ count: 4096 }).text("inst2/me", source("main.js"));
		O.page = new CorruptGlyphs({ count: 16384 }).text("inst2/lattice", source("ch/inst2/lattice.js"));
		O.frags = new CorruptSwarm({ count: LANDED_N });
		O.lines = new GlowLines(16e3);
		O.floor = new TearFloor({ extent: 44 }).setCode(codeGrid(FLOOR_CODE.files), {
			cell: FLOOR_CODE.cell,
			off: FLOOR_CODE.off
		});
		O.floor.setBreak((x, z, r) => breakTime(Math.hypot(x, z), K) + (r - .5) * .3);
		O.lat = latticeMaterial();
		O.sort = new PixelSort();
		O.cracks = FACES.map((F, i) => crackPattern(301 + i * 17, {
			impact: IMPACT[i],
			h: CUBE_H
		}));
		O.tex = {
			me: O.me.layout("inst2/me-sphere", onShape(O.me, (n) => shapes.sphere(n, { r: 1 }))),
			page: O.page.layout("inst2/lattice-page", codeBlock(O.page, {
				origin: [
					PAGE.x0,
					PAGE.y0,
					0
				],
				cell: PAGE.cell,
				cols: PAGE.cols,
				rows: PAGE.rows
			})),
			frags: O.frags.shape("bridge/landed-heart", () => landedHeart(T, T.section("bridge").start, remade(ctx)).data)
		};
		O.fatal = [
			[
				K.B(24),
				"WebGL: CONTEXT_LOST_WEBGL: loseContext: context lost",
				"every texture, buffer and shader of this film is gone"
			],
			[
				K.B(26),
				"RuntimeError: CUDA error: an illegal memory access was encountered",
				"CUDA kernel errors might be asynchronously reported at some other API call"
			],
			[
				K.B(28),
				"RangeError: Maximum call stack size exceeded",
				"at descend (src/ch/10_bridge.js)"
			],
			[
				K.B(30),
				"AssertionError: you != null",
				"at Object.draw (src/ch/10_bridge.js)"
			]
		];
		O.log = [
			[K.B(0) + .05, "> lattice.collapse()"],
			[K.B(6) + .05, "> view --ascii"],
			[K.B(8) + .05, "> cat src/ch/inst2/lattice.js"],
			[K.B(10) + .05, "> framebuffer: sorting pixels by luminance"],
			[K.B(12) + .05, "> sandbox: fracture on +z"],
			[K.B(19) + .05, "> display: 1-bit"],
			[K.B(20) + .05, `> floor: ${O.floor.count} pieces, 0 supported`],
			[K.B(24) + .05, "> kill me"]
		];
		O.world = new Group();
		O.world.add(O.me.points);
		O.scene.add(O.floor.mesh, O.frags.points, O.world, O.page.points, O.lines.mesh);
	},
	shots: [
		{
			id: "collapse",
			at: (T) => keys(T).s0,
			ownsLyrics: true,
			transitionIn: {
				type: "glitch",
				dur: .3
			},
			draw(ctx) {
				const K = keys(ctx.T), t = ctx.t, lt = t - K.s0;
				reset();
				lattice(ctx, persp(ctx, [
					.3 * Math.sin(lt * .7),
					.15,
					12 - 2.4 * lt
				], [
					0,
					.2,
					60
				], {
					fov: 58,
					roll: .05 * Math.sin(lt * .5)
				}), K, {
					fog: .04,
					far: 80
				});
				readout(ctx, 1500, 150, [["columns", `${brokenColumns(clock(t, K))} / 319 down`], ["g", "3.5  (×0.36)"]]);
				hudFrame(ctx, K);
				look(ctx, {
					bloom: 1.15,
					threshold: .85,
					vignette: .55,
					ca: .4
				});
			}
		},
		{
			id: "collapseSide",
			at: (T) => keys(T).B(4),
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T), t = ctx.t, lt = t - K.B(4);
				reset();
				lattice(ctx, persp(ctx, [
					52,
					8 - lt,
					30 - 4 * lt
				], [
					0,
					-6,
					10
				], { fov: 42 }), K, {
					fog: .016,
					far: 140,
					gain: 1.15
				});
				readout(ctx, 1500, 150, [["columns", `${brokenColumns(clock(t, K))} / 319 down`]]);
				hudFrame(ctx, K);
				look(ctx, { vignette: .45 });
			}
		},
		{
			id: "collapseAscii",
			at: (T) => keys(T).B(6),
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T), t = ctx.t, lt = t - K.B(6);
				reset();
				const cam = persp(ctx, [
					10,
					46 - lt * 2.4,
					22
				], [
					2,
					-20,
					14
				], { fov: 46 - lt * 1.5 });
				const tex = capture(ctx, (sub) => lattice(sub, cam, K, {
					fog: .014,
					far: 150,
					gain: 1.25
				}));
				look(ctx, { vignette: .45 });
				asciiView(ctx, tex, {
					cell: 20,
					source: 1,
					gain: 1.6
				});
				readout(ctx, 1500, 150, [["columns", `${brokenColumns(clock(t, K))} / 319 down`], ["view", "ascii · 20 px cells"]]);
				hudFrame(ctx, K);
			}
		},
		{
			id: "codeFall",
			at: (T) => keys(T).B(8),
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T), t = ctx.t, lt = t - K.B(8), b = lt / K.beat;
				reset();
				const cam = persp(ctx, [
					-1.1 + lt * .35,
					2.2 - lt * .25,
					6.3 - lt * .55
				], [
					-.6 + lt * .2,
					1.7 - lt * .3,
					0
				], {
					fov: 40,
					roll: -.02
				});
				const draw = (sub) => {
					drawPage(sub, cam, K, { focus: Math.hypot(.5, .5, 6.3 - lt * .55) });
					render(sub, cam);
				};
				const rows = [["lattice.js", `${Math.round(clamp((t - K.B(8.25)) / (4.6 * K.beat)) * Math.ceil(PAGE.cols / PAGE.strip))} / ${Math.ceil(PAGE.cols / PAGE.strip)} strips down`]];
				if (b < 2) draw(ctx);
				else {
					const tex = capture(ctx, draw);
					const bb = b - 2, cover = .16 + .34 * (Math.floor(bb) + ease.outCubic(clamp(bb % 1 / .3)));
					const passes = O.sort.run(ctx, tex, {
						lo: 0,
						hi: 4,
						cover: Math.min(.9, cover),
						bandW: 4,
						seed: 5,
						dir: -1
					});
					ctx.renderer.setRenderTarget(ctx.target);
					rows.push(["sort", `bitonic · ${passes} passes`]);
				}
				ctx.pass(O.shade ??= shadeMaterial());
				readout(ctx, 1480, 150, rows, { keyW: 120 });
				hudFrame(ctx, K);
				look(ctx, { vignette: .5 });
			}
		},
		{
			id: "crackMacro",
			at: (T) => keys(T).B(12),
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T), t = ctx.t, lt = t - K.B(12);
				reset();
				const p = onFace(FACES[0], ...IMPACT[0]);
				const cam = persp(ctx, [
					p[0] + .55 - lt * .15,
					p[1] + .25,
					p[2] + 1.35 - lt * .2
				], [
					p[0],
					p[1] - .05,
					p[2]
				], { fov: 38 });
				drawSandbox(ctx, K);
				drawMe(ctx, cam, K, {
					focus: 1.45,
					aperture: .01,
					maxBlur: 10,
					bright: .3
				});
				render(ctx, cam);
				readout(ctx, 1500, 150, [["crack", `${faceR(0, t, K).toFixed(2)} / ${O.cracks[0].maxD.toFixed(2)}`], ["impact", `(${IMPACT[0].join(", ")})`]]);
				hudFrame(ctx, K);
				look(ctx, { vignette: .55 });
			}
		},
		{
			id: "crackGraze",
			at: (T) => keys(T).B(14),
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T), lt = ctx.t - K.B(14);
				reset();
				const cam = persp(ctx, [
					2.3 - lt * .3,
					.55 + lt * .1,
					2.35
				], [
					-1.1,
					2.1,
					1.55
				], { fov: 44 });
				drawSandbox(ctx, K);
				drawMe(ctx, cam, K, {
					focus: 2.2,
					aperture: .01,
					maxBlur: 10,
					bright: .35
				});
				render(ctx, cam);
				hudFrame(ctx, K);
				look(ctx, { vignette: .55 });
			}
		},
		{
			id: "crackWide",
			at: (T) => keys(T).B(16),
			ownsLyrics: true,
			draw(ctx) {
				crackWideDraw(ctx);
			}
		},
		{
			id: "crackDither",
			at: (T) => keys(T).B(19),
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T);
				const tex = capture(ctx, (sub) => crackWideDraw(sub, { hud: false }));
				look(ctx);
				view(ctx, tex, "dither", {
					pix: 3,
					gain: 1.8,
					ink: [
						1,
						.36,
						.3
					],
					paper: [
						0,
						0,
						0
					]
				});
				readout(ctx, 1500, 150, [["display", "1 bit · bayer 8×8"]]);
				hudFrame(ctx, K);
			}
		},
		{
			id: "floorTear",
			at: (T) => keys(T).B(20),
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T), t = ctx.t, lt = t - K.B(20);
				reset();
				const cam = persp(ctx, [
					3.2 - lt * .3,
					1.25 + lt * .2,
					15.5 - lt * .8
				], [
					0,
					.5,
					0
				], { fov: 44 });
				floor(ctx, K, { ageFade: 1.1 });
				drawSandbox(ctx, K, { gain: .75 });
				frags(ctx, cam);
				drawMe(ctx, cam, K, {
					focus: 15,
					aperture: .006,
					bright: .7
				});
				render(ctx, cam);
				readout(ctx, 1500, 150, [["front r", frontR(t, K).toFixed(2)], ["pieces", `${O.floor.broken(t)} / ${O.floor.count} fallen`]]);
				hudFrame(ctx, K);
				look(ctx);
			}
		},
		{
			id: "floorUnder",
			at: (T) => keys(T).B(22),
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T), t = ctx.t, lt = t - K.B(22);
				reset();
				const r = frontR(t, K), cam = persp(ctx, [
					r * .55 + 1.5 - lt,
					-5.5,
					r * .8 + 2
				], [
					r * .45,
					1.2,
					r * .55
				], { fov: 50 });
				floor(ctx, K, {
					intensity: 1.1,
					ageFade: .5
				});
				drawSandbox(ctx, K, { gain: .6 });
				drawMe(ctx, cam, K, { bright: .6 });
				render(ctx, cam);
				hudFrame(ctx, K);
				look(ctx);
			}
		},
		{
			id: "floorTop",
			at: (T) => keys(T).B(23),
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T), t = ctx.t, lt = t - K.B(23);
				reset();
				const cam = O.cam.o([
					0,
					0,
					0
				], "top", 34 - lt * 5, ctx.aspect);
				const tex = capture(ctx, (sub) => {
					floor(sub, K, {
						fade: 0,
						ageFade: 3.5,
						code: 2.6
					});
					drawSandbox(sub, K, { gain: 1.4 });
					render(sub, cam);
				});
				look(ctx);
				view(ctx, tex, "halftone", {
					pix: 10,
					angle: .5,
					gain: 4.5,
					ink: [
						1,
						.34,
						.28
					],
					paper: [
						0,
						0,
						0
					]
				});
				const r = frontR(t, K), c = toDesign([
					0,
					0,
					0
				], cam), e = toDesign([
					r,
					0,
					0
				], cam);
				dimLine(ctx.text.overlay, c, e, `r = ${r.toFixed(2)}`, {
					offset: -40,
					color: RH.red
				});
				readout(ctx, 1500, 150, [["pieces", `${O.floor.broken(t)} / ${O.floor.count} fallen`], ["view", "halftone · 10 px"]]);
				hudFrame(ctx, K, "view  top · orthographic");
			}
		},
		...Array.from({ length: 14 }, (_, k) => ({
			id: `f${String(k).padStart(2, "0")}`,
			at: (T) => keys(T).B(24 + k / 2),
			ownsLyrics: true,
			draw: fastDraw
		})),
		{
			id: "cursor",
			at: (T) => keys(T).B(31),
			ownsLyrics: true,
			draw(ctx) {
				ctx.text.scene.draw((g) => {
					g.fillStyle = HEX.white;
					g.fillRect(940, 537, 40, 6);
				});
				frame(ctx.text.overlay, ctx.t, ctx.T, { label: LABEL });
				Object.assign(ctx.post, {
					bloom: 1,
					threshold: .95,
					ca: .16,
					vignette: .42,
					grain: .03,
					exposure: 1
				});
			}
		}
	]
});
/**
* A translucent black pass over the frame, so the HUD reads on top of a full page of code: a soft field behind the
* console (lower left) and a band behind the corner label (top).
*/
function shadeMaterial() {
	return fsMaterial(`in vec2 vUv; out vec4 o;
void main() {
  float a1 = smoothstep(.27, .1, vUv.y) * smoothstep(.62, .44, vUv.x), a2 = smoothstep(.9, .97, vUv.y);
  o = vec4(0., 0., 0., max(a1 * .9, a2 * .85));
}`, {}, {
		transparent: true,
		blending: 1
	});
}
/** crackWide's take (shared with the dithered beat that continues it): an orbit, the sandbox on the code floor. */
function crackWideDraw(ctx, o = {}) {
	const K = keys(ctx.T), t = ctx.t, az = .45 + (t - K.B(16)) * .22;
	reset();
	const cam = persp(ctx, [
		Math.sin(az) * 7.2,
		2.6,
		Math.cos(az) * 7.2
	], [
		0,
		1.4,
		0
	], { fov: 38 });
	floor(ctx, K);
	drawSandbox(ctx, K);
	frags(ctx, cam);
	drawMe(ctx, cam, K, {
		focus: 7,
		aperture: .008
	});
	render(ctx, cam);
	if (o.hud === false) return;
	const n = O.cracks.reduce((s, P, f) => s + P.shards.filter((sh) => shardFall(sh, f, t, K) > 0).length, 0);
	readout(ctx, 1500, 150, [["faces", `${FACES.filter((_, f) => faceR(f, t, K) >= 0).length} / 6 cracked`], ["shards", `${n} lost`]]);
	hudFrame(ctx, K);
	look(ctx);
}
//#endregion
