import { chapter } from "../engine/timeline.js?v=vYBbdLfo";
import { TAU, clamp, ease, hash, lerp, mix3, rng, seg } from "../engine/math.js?v=BJIlRm7-";
import { COL, HEX } from "../theme.js?v=Bj33PIbo";
import { remade } from "../lib/published.js?v=aV_CU5HV";
import { GLSL3, Mesh, OrthographicCamera, PlaneGeometry, Scene, ShaderMaterial, Vector2, Vector3 } from "../../vendor/three/build/three.core.js?v=q9f7JKE-";
import { Swarm } from "../engine/swarm.js?v=DTFpJa7B";
import { GlowLines } from "../engine/lines.js?v=B_AAaaTO";
import { rig } from "../engine/rig.js?v=39-joEtk";
import { consoleLog, newCamera, orbit, shake } from "../lib/look.js?v=BfOqFF7i";
import { gridPlane } from "../lib/env.js?v=CIN_DqPv";
import { callout, crosshair, dimLine, frame, readout, toDesign, viewportFrame } from "../lib/hud.js?v=BgmSZjmG";
import { GlyphField, codeBlock, codeFill, source } from "../lib/glyphs.js?v=DWbHICXG";
import { capture, view } from "../lib/modes.js?v=Cu3GYO-2";
import { claude_exports } from "../lib/claude.js?v=DXDs_lIL";
import { SearchGlyphs } from "./c2/ripples.js?v=9FP74VCc";
import { COLD, COLD_GREY, FLOOR, FOG, HOLE, ME, WARM_R, residue, ringCol, spot, viewCam } from "./c2/search.js?v=DhEdsD-I";
import { DISC, Field, Sand, antinodes, chladni, fieldSample, modeHz, nodalSegments, plateOutline, wordGrains } from "./c2/plate.js?v=BJi-uR-t";
import { dialTicks, ringLegend, stackLog } from "./c2/ui.js?v=DqkWl0di";
import { Heat, STRING, channel, graticule, lissajous, string, waterfall } from "./c2/instruments.js?v=UoA8dCQP";
import { DOT, W, Z, bubbleGone, bubblePoints, chat, designCam, dotPoints, lonelyPrompt, objGone, objPoints, pingLog, pointerLabels, pointerLines, presence, ringPoints } from "./c2/leave.js?v=gDDtQJp4";
//#region src/ch/08_c2.js
var FLOOR_Y = -.55;
var H0 = [
	0,
	.95,
	0
];
var WARM = mix3(COL.you, COL.rose, .3);
var CODE_PAL = [
	[
		.36,
		.5,
		.8
	],
	[
		.13,
		.17,
		.27
	],
	[
		.46,
		.6,
		.92
	],
	[
		.5,
		.62,
		.95
	],
	[
		.55,
		.82,
		1
	],
	[
		.26,
		.34,
		.55
	]
];
var INK = "#16181d";
var INK_DIM = "#6f737c";
var O = null;
var KC = null;
function keys(T) {
	if (KC?.T === T) return KC;
	const s0 = T.section("c2").start, b0 = Math.round(T.beatAt(s0)), B = (k) => T.beatTime(b0 + k), beat = B(1) - B(0);
	const L = (s, n = 0) => T.findLine(s, n);
	const tV = L("VIBRATIONS").start, tComp = L("COMPLETION").start, tIso = L("ISOLATION").start;
	const left = [
		0,
		1,
		2,
		3,
		4,
		5
	].map((k) => L("you have left", k));
	const word = (l, re) => (l.words.find((w) => re.test(w.text)) ?? l.words[l.words.length - 1]).start;
	const sched = [
		{
			t: s0,
			b: [1, 2],
			dur: 1.9 * beat,
			e: "inOutSine"
		},
		{
			t: B(2),
			b: [1, 3],
			dur: 1.9 * beat,
			e: "inOutSine"
		},
		{
			t: B(4),
			b: [1, 4],
			dur: 1.8 * beat,
			e: "inOutSine"
		},
		{
			t: tV,
			b: [3, 7],
			word: true,
			hold: .22,
			dur: 1.45 * beat,
			e: "inOutSine"
		},
		{
			t: B(8),
			b: [4, 7],
			dur: 1.6 * beat,
			e: "inOutSine"
		},
		{
			t: B(10),
			b: [5, 7],
			dur: .8 * beat,
			e: "outCubic"
		},
		{
			t: B(11),
			b: [5, 8],
			dur: .8 * beat,
			e: "outCubic"
		},
		{
			t: B(12),
			b: [5, 9],
			dur: .8 * beat,
			e: "outCubic"
		},
		{
			t: B(13),
			b: [6, 9],
			dur: .8 * beat,
			e: "outCubic"
		}
	];
	return KC = {
		T,
		s0,
		b0,
		B,
		beat,
		tV,
		tComp,
		tIso,
		left,
		sched,
		schedR: [
			sched[0],
			{
				t: B(2),
				b: [1, 3],
				dur: .9 * beat,
				e: "inOutSine"
			},
			{
				t: B(3),
				b: [2, 3],
				dur: .9 * beat,
				e: "inOutSine"
			},
			{
				t: B(4),
				b: [1, 4],
				dur: .9 * beat,
				e: "inOutSine"
			},
			{
				t: B(5),
				b: [2, 5],
				dur: .8 * beat,
				e: "inOutSine"
			},
			...sched.slice(3)
		],
		end: T.section("c2x").start,
		tPres: word(left[3], /left/i),
		ptr: {
			free: left[4].start + .12,
			nul: word(left[4], /left/i)
		}
	};
}
var superP = (disc) => disc <= 0 ? 999 : 2 * 40 ** (1 - disc);
function sandState(t, K, remake = false) {
	const S = remake ? K.schedR : K.sched;
	let e = 0;
	for (let i = 0; i < S.length; i++) if (t >= S[i].t) e = i;
	const cur = S[e], t0 = cur.t + (cur.hold ?? 0), morph = ease[cur.e](seg(t, t0, t0 + cur.dur));
	const big = t >= K.tV ? Math.exp(-(t - K.tV) * 2.5) : 0;
	const disc = ease.outCubic(seg(t, K.tComp, K.tComp + 1.2 * K.beat));
	const drive = 1 - ease.inOutSine(seg(t, K.left[0].start, K.left[1].start));
	const form = ease.inOutCubic(seg(t, K.left[0].start + .05, K.left[0].start + 1.5 * K.beat));
	const phase = TAU * (K.T.beatAt(t) - K.b0);
	return {
		a: e > 0 ? S[e - 1].b : null,
		b: cur.b,
		morph,
		disc,
		big,
		drive,
		form,
		collapse: 0,
		t,
		phase,
		word: cur.word ? O.word : null,
		shake: cur.word ? .006 * big : 0,
		bounce: (.05 + .1 * big) * (.3 + .7 * drive),
		jitter: (.3 + 2.5 * big) * drive,
		buzz: .0016 * drive,
		amp: (.032 + .045 * big) * drive,
		fieldK: clamp(1 - .75 * form - .25 * seg(t, K.left[0].start + 1.2, K.left[2].start)),
		super: superP(disc)
	};
}
function pal(t, K) {
	const rose = seg(t, K.tV - .4, K.tV + 1.4), cold = ease.inOutSine(seg(t, K.left[0].start + .4, K.left[5].start + .6));
	return {
		sandA: mix3(COL.me, COLD, cold),
		sandB: mix3(mix3(COL.violet, COL.rose, rose), COLD, cold),
		field: COL.rose,
		cold,
		accent: cold > .5 ? "#9fb6e6" : HEX.me
	};
}
function persp(pos, look, { fov = 38, aspect = 16 / 9, roll = 0, up = null, near = .005, inset = false } = {}) {
	const c = O.persp;
	c.fov = fov;
	c.aspect = aspect;
	c.near = near;
	c.far = 900;
	c.position.set(...pos);
	if (up) c.up.set(...up);
	else c.up.set(Math.sin(roll), Math.cos(roll), 0);
	c.lookAt(...look);
	c.updateProjectionMatrix();
	c.updateMatrixWorld();
	return rig.cam(c, {
		look,
		inset
	});
}
function ortho(center, dir, height, aspect, { inset = false } = {}) {
	const c = O.ortho, w = height * aspect, d = 40, [x, y, z] = center;
	Object.assign(c, {
		left: -w / 2,
		right: w / 2,
		top: height / 2,
		bottom: -height / 2,
		near: .01,
		far: 400,
		zoom: 1
	});
	if (dir === "top") {
		c.position.set(x, y + d, z);
		c.up.set(0, 0, -1);
	} else if (dir === "front") {
		c.position.set(x, y, z + d);
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
var orb = (ctx, o) => {
	const c = orbit(O.persp, {
		inset: true,
		aspect: ctx.aspect,
		fov: 36,
		...o
	});
	c.near = .005;
	c.far = 900;
	c.updateProjectionMatrix();
	c.updateMatrixWorld();
	return rig.cam(c, { look: o.target ?? [
		0,
		0,
		0
	] });
};
function reset() {
	for (const o of [
		O.sand.points,
		O.field.points,
		O.you.points,
		O.bits.points,
		O.code.points,
		O.fog,
		O.heat.mesh,
		O.lines.mesh,
		O.floor
	]) o.visible = false;
	if (O.codeR) O.codeR.points.visible = false;
	if (O.codeS) O.codeS.points.visible = O.fogS.visible = false;
	O.you.points.position.set(0, 0, 0);
	O.lines.begin();
}
/** Draw the scene into c (the shot's ctx, or a modes.capture sub-context). */
function render(c, cam) {
	O.lines.mesh.visible = true;
	O.lines.end(c);
	c.draw(O.scene, cam);
}
function floor(intensity, o = {}) {
	O.floor.visible = true;
	O.floor.userData.set({
		intensity,
		fade: o.fade ?? .07,
		reveal: o.reveal ?? 1,
		revealR: o.revealR ?? 200
	});
	const u = O.floor.material.uniforms;
	u.uMinor.value = o.minor ?? .25;
	u.uMajor.value = o.major ?? 1;
}
var kick = (ctx) => ctx.F.env("onset_drums", ctx.t, .005, .12);
function hardware(st, o = {}) {
	const L = O.lines, k = o.hw ?? 1, c = (s) => (o.col ?? COL.me).map((v) => v * s * k);
	if (k <= .002) return;
	L.polyline(plateOutline(st.super), {
		color: c(o.rim ?? .42),
		width: o.rimW ?? 2.2
	});
	if (o.rod === false) return;
	L.segment([
		0,
		-.015,
		0
	], [
		0,
		-.45000000000000007,
		0
	], {
		color: c(.3),
		width: 1.8
	});
	const ring = (y, r) => Array.from({ length: 33 }, (_, i) => [
		Math.cos(i / 32 * TAU) * r,
		y,
		Math.sin(i / 32 * TAU) * r
	]);
	L.polyline(ring(-.45000000000000007, .09), {
		color: c(.22),
		width: 1.4
	});
	L.polyline(ring(FLOOR_Y, .09), {
		color: c(.22),
		width: 1.4
	});
}
/** The plate: sand (me), its standing wave (you) and the hardware. o.sand / o.field override looks; field: false hides it. */
function drawPlate(ctx, cam, st, P, o = {}, hPx = ctx.H) {
	O.sand.set({
		...st,
		bounce: st.bounce * (1 + .2 * kick(ctx))
	}, {
		size: .0042,
		bright: .16,
		colA: P.sandA,
		colB: P.sandB,
		...o.sand
	}, cam, hPx);
	if (o.field !== false && st.fieldK > .002) O.field.set(st, {
		col: P.field,
		bright: .34 * st.fieldK,
		size: .0045,
		...o.field
	}, cam, hPx);
	hardware(st, o);
}
/** Marching-squares prediction of the nodal curves of mode (n, m), drawn on the plate plane. */
function refCurves(mode, color, width = 1.2, lift = .002) {
	if (!mode) return;
	for (const [p, q] of nodalSegments(`c2/${mode}`, chladni(...mode))) O.lines.segment([
		p[0],
		lift,
		p[1]
	], [
		q[0],
		lift,
		q[1]
	], {
		color,
		width
	});
}
/** A ruler along two edges of the plate: a tick every 20 mm, long ticks every 100 mm (the plate is 400 mm). */
function ruler(k = 1) {
	const c = (s) => COL.white.map((v) => v * s * k);
	for (let i = 0; i <= 20; i++) {
		const u = -1 + i / 10, long = i % 5 === 0, l = long ? .06 : .03;
		O.lines.segment([
			u,
			0,
			-1.06
		], [
			u,
			0,
			-1.06 - l
		], {
			color: c(long ? .34 : .2),
			width: 1.2
		});
		O.lines.segment([
			-1.06,
			0,
			u
		], [
			-1.06 - l,
			0,
			u
		], {
			color: c(long ? .34 : .2),
			width: 1.2
		});
	}
}
function modeRows(st) {
	if (st.disc > .5) return [["mode", "J₄(j₄,₅ r)·cos 4θ"], ["f", `${Math.round(DISC.hz)} Hz`]];
	return [["mode", `(${st.b[0]}, ${st.b[1]})`], ["f", `${Math.round(modeHz(...st.b))} Hz`]];
}
function overlays(ctx, K, br, P, o = {}) {
	frame(ctx.text.overlay, ctx.t, ctx.T, {
		label: "resonance",
		bottomRight: br,
		color: o.ink ? INK_DIM : void 0,
		alpha: o.frameAlpha
	});
	if (ctx.t < K.left[0].start) consoleLog(ctx.text.overlay, ctx.T, ctx.t, { from: K.s0 - .2 });
	else stackLog(ctx.text.overlay, ctx.t, K.left, o.ink ? {
		accent: INK_DIM,
		color: INK,
		dim: INK_DIM,
		glow: 0
	} : {
		accent: P?.accent,
		alpha: o.logAlpha
	});
}
function look(ctx, o = {}) {
	Object.assign(ctx.post, {
		bloom: 1.05,
		threshold: .9,
		ca: .3,
		vignette: .45,
		grain: .03,
		exposure: 1,
		...o
	});
}
function coldLook(ctx, P, o = {}) {
	look(ctx, {
		sat: lerp(1, .55, P.cold),
		tint: mix3([
			1,
			1,
			1
		], [
			.9,
			.96,
			1.08
		], P.cold),
		...o
	});
}
var dist3 = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
var STR_Y = (n) => .92 - (n - 1) * .46;
/** The five harmonics, stacked as in a textbook figure; string n arrives (is drawn on and plucked) at t0 + (n − 1)·dt. */
function strings(ctx, cam, t, t0, P, o = {}) {
	(o.ns ?? [
		1,
		2,
		3,
		4,
		5
	]).forEach((n, j) => {
		const ts = t0 + j * (o.dt ?? .07), draw = ease.outCubic(seg(t, ts, ts + .22)), y = o.y ?? STR_Y(n), half = o.half ?? 1.75;
		string(O.lines, {
			a: [
				-half,
				y,
				0
			],
			b: [
				half,
				y,
				0
			],
			n,
			amp: (o.amp ?? .15) * ease.outCubic(seg(t, ts + .08, ts + .4)),
			t,
			f: .9,
			draw,
			k: o.k ?? 1,
			col: P.sandA,
			env: mix3(COL.rose, COL.violet, .25)
		});
	});
}
/** The scope (in design space: world = design / 100). me drives x, you drives y; returns the beam point. */
function scope(ctx, t, K, o = {}) {
	const c = o.c ?? [
		0,
		0,
		0
	], d = o.d ?? .72, k = o.k ?? 1;
	graticule(O.lines, c, d, { k: .9 * k });
	const [a, b] = o.ratio, dl = o.delta ?? 0;
	const bp = lissajous(O.lines, {
		c,
		d,
		a,
		b,
		delta: dl,
		X: 3.3,
		Y: 3.3,
		beam: TAU * 1.7 * (t - K.B(8)),
		tau: 4.2,
		k,
		col: [
			.92,
			.95,
			1
		]
	});
	if (o.channels !== false) {
		const top = [
			c[0] - 5 * d,
			c[1] + 4 * d + .62,
			0
		], topB = [
			c[0] + 5 * d,
			top[1],
			0
		];
		const right = [
			c[0] + 5 * d + .62,
			c[1] + 4 * d,
			0
		], rightB = [
			right[0],
			c[1] - 4 * d,
			0
		];
		channel(O.lines, top, topB, [
			0,
			1,
			0
		], a * 2, .2, dl, {
			col: COL.me.map((v) => v * .8 * k),
			width: 2.2
		});
		channel(O.lines, right, rightB, [
			1,
			0,
			0
		], b * 2, .2, 0, {
			col: COL.rose.map((v) => v * .8 * k),
			width: 2.2
		});
	}
	return bp;
}
var scopeRatio = (t, K) => {
	const k = ease.inOutCubic(seg(t, K.B(9) - .06, K.B(9) + .14));
	return [lerp(1, 2, k), lerp(2, 3, k)];
};
chapter({
	id: "c2",
	from: (T) => T.section("c2").start,
	to: (T) => T.section("c2x").start,
	init(ctx) {
		O = {
			scene: new Scene(),
			persp: newCamera(36),
			persp2: newCamera(36),
			ortho: new OrthographicCamera(-1, 1, 1, -1, .01, 400),
			dcam: new OrthographicCamera(-1, 1, 1, -1, .01, 100)
		};
		O.sand = new Sand();
		O.field = new Field();
		O.heat = new Heat();
		O.you = new Swarm({ count: 65536 });
		O.bits = new Swarm({ count: 16384 });
		O.lines = new GlowLines(24e3);
		O.floor = gridPlane({
			plane: "xz",
			color: [
				.08,
				.3,
				.8
			],
			minor: .25,
			major: 1,
			fade: .07
		});
		O.floor.position.y = FLOOR_Y;
		O.floor.material.uniforms.uAxisCol.value.setRGB(.22, .36, .6);
		O.word = wordGrains("VIBRATIONS", 512, {
			width: 1.84,
			tall: 1.35
		});
		O.code = new GlyphField({ count: 65536 });
		O.code.text("c2/src", source("ch/08_c2.js"));
		O.code.points.rotation.x = -Math.PI / 2;
		O.code.points.position.set(0, 0, -12.6);
		if (remade(ctx)) {
			O.codeR = new GlyphField({
				count: 65536,
				ripples: true
			});
			O.codeR.text("c2/src", source("ch/08_c2.js"));
			O.codeR.points.rotation.x = -Math.PI / 2;
			O.codeR.points.position.set(0, 0, -12.6);
			O.codeS = new SearchGlyphs({ count: 65536 });
			O.codeS.text("c2/src", source("ch/08_c2.js"));
			O.codeS.points.rotation.x = -Math.PI / 2;
			O.codeS.points.position.set(FLOOR.c[0], 0, FLOOR.c[1]);
			const g = O.codeS._grid;
			let need = 1;
			for (let i = 1; i < O.codeS.count; i++) need += g[i][1] === g[i - 1][1] ? g[i][0] - g[i - 1][0] : 2;
			O.searchCell = Math.sqrt(Math.PI * FLOOR.r ** 2 / (need * .6)) * 1.01;
			O.fogS = new Mesh(new PlaneGeometry(60, 60).rotateX(-Math.PI / 2), new ShaderMaterial({
				glslVersion: GLSL3,
				transparent: true,
				depthWrite: false,
				depthTest: false,
				vertexShader: "out vec3 vW; void main() { vec4 w = modelMatrix * vec4(position, 1.); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }",
				fragmentShader: "uniform vec2 uC; uniform float uNear, uFar; in vec3 vW; out vec4 o; void main() { o = vec4(0., 0., 0., smoothstep(uNear, uFar, distance(vW.xz, uC))); }",
				uniforms: {
					uC: { value: new Vector2() },
					uNear: { value: 3 },
					uFar: { value: 9 }
				}
			}));
			O.fogS.position.set(ME[0], .03, ME[2]);
			O.fogS.frustumCulled = false;
		}
		const ballAt = (N, seed) => {
			const r = rng(seed), out = new Float32Array(N * 4), g = () => Math.sqrt(-2 * Math.log(Math.max(r(), 1e-6))) * Math.cos(TAU * r());
			for (let i = 0; i < N; i++) {
				let x, y, z;
				if (i % 5) {
					x = g() * .07;
					y = g() * .07;
					z = g() * .07;
				} else {
					const u = r() * 2 - 1, a = r() * TAU, q = Math.sqrt(1 - u * u), R = .14 + .12 * r();
					x = q * Math.cos(a) * R;
					y = u * R;
					z = q * Math.sin(a) * R;
				}
				out.set([
					x,
					y + H0[1],
					z,
					i % 5 ? 0 : 1
				], i * 4);
			}
			return out;
		};
		O.tex = {
			field: O.you.shape("c2/field", (N) => fieldSample(N)),
			ball: O.you.shape("c2/ball", (N) => ballAt(N, 31)),
			bubble: O.bits.shape("c2/bubble", (N) => bubblePoints(N)),
			bubbleGone: O.bits.shape("c2/bubble-gone", (N) => bubbleGone(N)),
			dot: O.bits.shape("c2/dot", (N) => dotPoints(N)),
			ring: O.bits.shape("c2/ring", (N) => ringPoints(N)),
			obj: O.bits.shape("c2/obj", (N) => objPoints(N)),
			objGone: O.bits.shape("c2/obj-gone", (N) => objGone(N)),
			floor: O.code.layout("c2/code-floor", codeBlock(O.code, {
				origin: [
					-5.4,
					0,
					0
				],
				cell: .1,
				cols: 150,
				rows: 150
			}))
		};
		if (O.codeS) O.tex.search = O.codeS.layout("c2/search-floor", codeFill(O.codeS, (x, y) => x * x + y * y < FLOOR.r ** 2, {
			cell: O.searchCell,
			width: 2 * FLOOR.r,
			height: 2 * FLOOR.r
		}));
		O.fog = new Mesh(new PlaneGeometry(40, 40).rotateX(-Math.PI / 2), new ShaderMaterial({
			glslVersion: GLSL3,
			transparent: true,
			depthWrite: false,
			depthTest: false,
			vertexShader: "out vec3 vW; void main() { vec4 w = modelMatrix * vec4(position, 1.); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }",
			fragmentShader: "uniform float uNear, uFar; in vec3 vW; out vec4 o; void main() { o = vec4(0., 0., 0., smoothstep(uNear, uFar, -vW.z)); }",
			uniforms: {
				uNear: { value: 2.5 },
				uFar: { value: 10.5 }
			}
		}));
		O.fog.position.set(0, .03, -10);
		O.fog.frustumCulled = false;
		if (O.codeR) {
			O.codeR.points.renderOrder = 1;
			O.scene.add(O.codeR.points);
		}
		if (O.codeS) {
			O.codeS.points.renderOrder = 1;
			O.fogS.renderOrder = 2;
			O.scene.add(O.codeS.points, O.fogS);
		}
		O.code.points.renderOrder = 1;
		O.fog.renderOrder = 2;
		O.you.points.renderOrder = 3;
		O.lines.mesh.renderOrder = 4;
		O.scene.add(O.floor, O.heat.mesh, O.code.points, O.fog, O.field.points, O.sand.points, O.you.points, O.bits.points, O.lines.mesh);
	},
	shots: [
		{
			id: "plate",
			at: (T) => keys(T).s0,
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T), t = ctx.t, st = sandState(t, K, remade(ctx)), P = pal(t, K), sec = t - K.s0;
				reset();
				const cam = orb(ctx, {
					r: lerp(3.5, 3.3, ease.inOutSine(sec / 2)),
					az: .35 + sec * .06,
					el: lerp(1.2, 1.12, ease.inOutSine(sec / 2))
				});
				floor(.26 * (1 - .65 * ease.inOutSine(seg(t, K.s0 + .25, K.B(2)))));
				drawPlate(ctx, cam, st, P);
				render(ctx, cam);
				readout(ctx.text.overlay, 1500, 150, modeRows(st));
				overlays(ctx, K, null, P);
				look(ctx);
			}
		},
		{
			id: "blueprint",
			at: (T) => keys(T).B(2),
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T), t = ctx.t, st = sandState(t, K, remade(ctx)), P = pal(t, K), k = ease.inOutSine(seg(t, K.B(2), remade(ctx) ? K.B(4.5) : K.B(3)));
				reset();
				const cam = ortho([
					.3 - .06 * k,
					0,
					0
				], "top", remade(ctx) ? lerp(2.75, 2.5, k) : lerp(2.75, 2.62, k), ctx.aspect);
				drawPlate(ctx, cam, st, P, {
					sand: {
						size: .0048,
						bright: .14
					},
					field: {
						bright: .5,
						size: .006
					},
					rod: false
				});
				refCurves(st.b, COL.white.map((c) => c * .28), 1.2);
				ruler();
				render(ctx, cam);
				const L = ctx.text.overlay, a = toDesign([
					-1.03,
					0,
					-1.03
				], cam), b = toDesign([
					1.03,
					0,
					-1.03
				], cam), c = toDesign([
					-1.03,
					0,
					1.03
				], cam);
				dimLine(L, a, b, "400.0 mm", {
					offset: -44,
					alpha: .7
				});
				dimLine(L, c, a, "400.0 mm", {
					offset: -44,
					alpha: .7
				});
				for (const [x, y, sg] of antinodes(`c2/${st.b}`, chladni(...st.b))) {
					const q = toDesign([
						x,
						0,
						y
					], cam);
					L.text(sg > 0 ? "+" : "−", q[0], q[1], {
						size: 19,
						weight: 600,
						color: HEX.rose,
						alpha: .7
					});
				}
				const o = toDesign([
					0,
					0,
					0
				], cam);
				crosshair(L, o[0], o[1], 16, { label: "drive" });
				readout(L, 1440, 150, [
					...modeRows(st),
					["φ", "cos nπx cos mπy − cos mπx cos nπy"],
					["plate", "Al 400 × 400 × 1 mm"]
				]);
				overlays(ctx, K, "view  top · orthographic", P);
				look(ctx, { vignette: .3 });
			}
		},
		{
			id: "plate2",
			at: (T) => keys(T).B(4),
			editOnly: true,
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T), t = ctx.t, st = sandState(t, K, true), P = pal(t, K), k = ease.inOutSine(seg(t, K.B(3.4), K.tV));
				reset();
				const cam = orb(ctx, {
					r: lerp(3.25, 2.55, k),
					az: lerp(.42, .3, k),
					el: lerp(1.13, 1.18, k)
				});
				floor(.091);
				drawPlate(ctx, cam, st, P);
				render(ctx, cam);
				readout(ctx.text.overlay, 1500, 150, modeRows(st));
				overlays(ctx, K, null, P);
				look(ctx);
			}
		},
		{
			id: "strings",
			at: (T) => keys(T).B(3),
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T), t = ctx.t, P = pal(t, K), t0 = remade(ctx) ? ctx.startOf("c2/strings") ?? K.B(3) : K.B(3), k = ease.inOutSine(seg(t, t0, remade(ctx) ? t0 + K.beat : K.B(4.5)));
				reset();
				const cam = persp([
					lerp(1.05, .55, k),
					lerp(.14, .02, k),
					5.35
				], [
					lerp(.2, .05, k),
					-.06,
					0
				], {
					fov: 34,
					aspect: ctx.aspect
				});
				strings(ctx, cam, t, t0, P);
				render(ctx, cam);
				const L = ctx.text.overlay;
				for (let n = 1; n <= 5; n++) {
					const q = toDesign([
						1.75,
						STR_Y(n),
						0
					], cam), a = seg(t, t0 + (n - 1) * .07 + .1, t0 + (n - 1) * .07 + .3);
					if (a > 0) L.text(`n = ${n}   ${n * STRING.f1} Hz`, q[0] + 30, q[1], {
						size: 17,
						weight: 600,
						color: HEX.me,
						align: "left",
						alpha: .85 * a
					});
				}
				readout(L, 1440, 132, [["string", `A₂ · ${STRING.scale} mm`], ["fₙ", `n · ${STRING.f1} Hz`]]);
				overlays(ctx, K, "strobe  0.9 Hz · long exposure", P);
				look(ctx, {
					vignette: .4,
					ca: .12
				});
			}
		},
		{
			id: "spectrum",
			at: (T) => keys(T).B(4.5),
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T), t = ctx.t, P = pal(t, K), t0 = remade(ctx) ? ctx.startOf("c2/spectrum") ?? K.B(4.5) : K.B(4.5), k = ease.inOutSine(seg(t, t0, remade(ctx) ? t0 + K.beat : K.tV));
				reset();
				render(ctx, persp([
					0,
					0,
					5
				], [
					0,
					0,
					0
				], {
					aspect: ctx.aspect,
					inset: true
				}));
				waterfall(ctx.text.scene, ctx.F, t, [
					0,
					0,
					1920,
					1080
				], {
					win: 1.6,
					rows: 48,
					height: .36,
					cam: {
						pos: [
							lerp(-.25, .2, k),
							1.62,
							2.15
						],
						look: [
							0,
							-.02,
							-1
						],
						fov: 34
					},
					labelLayer: ctx.text.overlay,
					words: ctx.T.words
				});
				readout(ctx.text.overlay, 1440, 150, [
					["source", "this song · live"],
					["bands", "16 mel · 30 Hz – 16 kHz"],
					["t", `${t.toFixed(2)} s`]
				]);
				overlays(ctx, K, "view  spectrum", P);
				look(ctx, {
					vignette: .35,
					textGlow: 1.25
				});
			}
		},
		{
			id: "vibrations",
			at: (T) => keys(T).tV,
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T), t = ctx.t, st = sandState(t, K, remade(ctx)), P = pal(t, K), k = ease.inOutCubic(seg(t, K.tV + .15, K.B(8))), sh = shake(t, .02 * st.big);
				reset();
				const cam = orb(ctx, {
					r: lerp(2.3, 3.05, k),
					az: .06 * k,
					el: lerp(1.2, 1.06, k),
					target: [
						sh[0],
						sh[1],
						sh[2] + .06 * (1 - k)
					]
				});
				drawPlate(ctx, cam, st, P, {
					sand: {
						grid: 512,
						size: .0052,
						bright: lerp(.32, .2, k),
						scatter: .002,
						hopGlow: 1.5
					},
					field: { bright: .4 * st.fieldK },
					rod: false
				});
				render(ctx, cam);
				readout(ctx.text.overlay, 1500, 150, modeRows(st));
				overlays(ctx, K, null, P);
				look(ctx, { ca: .2 + .35 * st.big });
			}
		},
		{
			id: "scope",
			at: (T) => keys(T).B(8),
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T), t = ctx.t, P = pal(t, K), t0 = remade(ctx) ? ctx.startOf("c2/scope") ?? K.B(8) : K.B(8), k = ease.inOutSine(seg(t, t0, remade(ctx) ? t0 + K.beat : K.B(10)));
				reset();
				const cam = designCam(O.dcam, ctx.aspect, lerp(1, 1.05, k));
				const ratio = scopeRatio(t, K), dl = Math.PI * (.5 + .3 * (t - K.B(8)));
				scope(ctx, t, K, {
					ratio,
					delta: dl
				});
				render(ctx, cam);
				const L = ctx.text.overlay, z = (p) => Z(p, lerp(1, 1.05, k));
				const q1 = z([600, 128]), q2 = z([1402, 868]);
				L.text("CH1 · me · x", q1[0], q1[1], {
					size: 16,
					weight: 600,
					color: HEX.me,
					align: "left",
					alpha: .85
				});
				L.text("CH2 · you · y", q2[0], q2[1], {
					size: 16,
					weight: 600,
					color: HEX.rose,
					align: "left",
					alpha: .85
				});
				const r = t < K.B(9) ? "1 : 2" : "2 : 3";
				readout(L, 1500, 150, [
					["mode", "XY"],
					["f₁ : f₂", r],
					["δ", `${(dl / Math.PI % 2).toFixed(2)} π`]
				]);
				overlays(ctx, K, "view  oscilloscope", P);
				look(ctx, {
					vignette: .4,
					bloom: 1.1,
					ca: .06
				});
			}
		},
		{
			id: "thermal",
			at: (T) => keys(T).B(10),
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T), t = ctx.t, st = sandState(t, K, remade(ctx)), P = pal(t, K), t0 = remade(ctx) ? ctx.startOf("c2/thermal") ?? K.B(10) : K.B(10), k = seg(t, t0, remade(ctx) ? t0 + K.beat : K.B(11));
				reset();
				const cam = orb(ctx, {
					r: 3.45,
					az: .55 + .08 * k,
					el: 1.08,
					target: [
						.06,
						0,
						.06
					]
				});
				const tex = capture(ctx, (sub) => {
					O.heat.set(st, {
						bright: 1.15,
						ambient: .03,
						t
					});
					hardware(st, {
						hw: .5,
						rod: false,
						col: [
							1,
							1,
							1
						]
					});
					render(sub, cam);
				});
				view(ctx, tex, "thermal", { gain: 1.5 });
				colorbar(ctx.text.overlay);
				readout(ctx.text.overlay, 1500, 150, [...modeRows(st), ["band", "LWIR 8–14 µm"]]);
				overlays(ctx, K, "view  thermal", P);
				Object.assign(ctx.post, {
					vignette: .4,
					grain: .03
				});
			}
		},
		{
			id: "panel",
			at: (T) => keys(T).B(11),
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T);
				instrumentPanel(ctx, remade(ctx) ? seg(ctx.t, K.B(12.5), K.tComp) : 0);
			}
		},
		{
			id: "converge",
			at: (T) => keys(T).B(12.5),
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T);
				instrumentPanel(ctx, seg(ctx.t, K.B(12.5), K.tComp));
			}
		},
		{
			id: "completion",
			at: (T) => keys(T).tComp,
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T), t = ctx.t, st = sandState(t, K, remade(ctx)), P = pal(t, K), lt = t - K.tComp;
				reset();
				const az = compAz(lt), cam = orb(ctx, {
					r: 6.1,
					az,
					el: 1.42,
					target: [
						0,
						0,
						-.16
					]
				});
				drawPlate(ctx, cam, st, P, { sand: { bright: .19 } });
				const sweep = ease.inOutCubic(seg(lt, 0, .55)), R = 1.13, u0 = -LEG / 2, up = Math.atan2(-Math.cos(az), -Math.sin(az));
				const at = (u, r) => {
					const a = up + (u0 + u) * TAU;
					return [
						Math.cos(a) * r,
						0,
						Math.sin(a) * r
					];
				};
				const arc = [];
				for (let i = 0; i <= Math.round(240 * sweep); i++) arc.push(at(i / 240, R));
				if (arc.length > 1) O.lines.polyline(arc, {
					color: COL.white.map((c) => c * 1.2),
					width: 2.6
				});
				if (sweep > 0 && sweep < 1) {
					const p = at(sweep, R);
					O.lines.segment(p, p, {
						color: COL.white.map((c) => c * 2.2),
						width: 13
					});
				}
				render(ctx, cam);
				const L = ctx.text.overlay, ring = (r) => (u) => toDesign(at(u, r), cam);
				dialTicks(L, ring(1.2), sweep, { alpha: .45 });
				ringLegend(ctx.text.scene, "COMPLETION", ring(1.36), {
					sweep,
					span: LEG,
					size: 58,
					t,
					glowColor: HEX.me,
					glow: 14
				});
				readout(L, 1500, 150, [
					["mode", "J₄(j₄,₅ r)·cos 4θ"],
					["r", DISC.rings.map((r) => r.toFixed(3).replace(/^1\.000$/, "1").replace(/^0/, "")).join("  ")],
					["done", `${(sweep * 100).toFixed(1)} %`]
				]);
				overlays(ctx, K, null, P);
				look(ctx);
			}
		},
		{
			id: "rise",
			at: (T) => keys(T).left[0].start,
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T), t = ctx.t, st = sandState(t, K, remade(ctx)), P = pal(t, K), k = ease.inOutSine(seg(t, K.left[0].start, K.left[1].start));
				reset();
				const cam = persp([
					lerp(2.2, 2.05, k),
					lerp(.42, .72, k),
					lerp(2.45, 2.2, k)
				], [
					0,
					lerp(.25, .78, k),
					0
				], {
					fov: 40,
					aspect: ctx.aspect
				});
				drawPlate(ctx, cam, st, P);
				const lift = ease.inCubic(seg(t, K.left[0].start + .7, K.left[1].start + .1)) * .35;
				O.you.points.visible = true;
				O.you.points.position.set(0, lift, 0);
				O.you.set({
					a: O.tex.field,
					b: O.tex.ball,
					morph: st.form,
					spread: .7,
					wave: 1.15,
					waveOrigin: [
						0,
						0,
						0
					],
					arc: .35,
					noise: .012 + .02 * (1 - st.form),
					noiseFreq: 5,
					noiseSpeed: .5,
					t,
					reveal: .14,
					size: .0065,
					minPx: 1.3,
					bright: .6,
					colA: COL.rose,
					colB: WARM,
					sparkle: .6
				}, cam, ctx.H);
				render(ctx, cam);
				const y = toDesign([
					0,
					H0[1] + lift,
					0
				], cam);
				if (st.form > .6) callout(ctx.text.overlay, [y[0] + 26, y[1] - 10], "you", {
					dx: 70,
					dy: -50,
					color: HEX.rose,
					draw: seg(st.form, .6, 1)
				});
				readout(ctx.text.overlay, 1500, 150, [["drive", `${Math.round(DISC.hz * st.drive)} Hz`], ["A", `${(st.drive * 1.2).toFixed(2)} mm`]]);
				overlays(ctx, K, null, P);
				coldLook(ctx, P);
			}
		},
		{
			id: "chat",
			at: (T) => keys(T).left[1].start,
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T), t = ctx.t, P = pal(t, K), t0 = K.left[1].start;
				reset();
				const cam = designCam(O.dcam, ctx.aspect), gone = ease.inOutSine(seg(t, t0 + .04, t0 + .7));
				O.bits.points.visible = true;
				O.bits.set({
					a: O.tex.bubble,
					b: O.tex.bubbleGone,
					morph: gone,
					spread: .55,
					arc: .25,
					noise: .06 * gone,
					noiseFreq: 1.4,
					noiseSpeed: .3,
					t,
					size: .022,
					minPx: 1.1,
					bright: .7 * seg(gone, 0, .12) * (1 - .75 * seg(gone, .35, 1)),
					colA: COL.you,
					colB: mix3(COL.you, COLD_GREY, .55),
					sparkle: .4,
					reveal: .7
				}, cam, ctx.H);
				render(ctx, cam);
				chat(ctx.text.overlay, t, t0, { gone });
				overlays(ctx, K, null, P);
				coldLook(ctx, P, {
					vignette: .35,
					ca: .08
				});
			}
		},
		{
			id: "ping",
			at: (T) => keys(T).left[2].start,
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T), t = ctx.t, P = pal(t, K), t0 = K.left[2].start, span = K.left[3].start - t0, k = ease.inOutSine(seg(t, t0, K.left[3].start));
				reset();
				if (remade(ctx)) return searchE(ctx, K);
				const cam = persp([
					lerp(.45, .2, k),
					2.2,
					3.4
				], [
					-.2,
					-.4,
					-3.5
				], {
					fov: 40,
					aspect: ctx.aspect
				});
				O.code.points.visible = true;
				O.fog.visible = true;
				O.code.set({
					a: O.tex.floor,
					size: .085,
					bright: .4,
					palette: CODE_PAL,
					t,
					focus: 4.2,
					aperture: .018,
					maxBlur: 16,
					minPx: 2,
					scroll: [
						0,
						(t - t0) * .35,
						0
					]
				}, cam, ctx.H);
				const d = lerp(2.6, 11, ease.inCubic(k)), you = [
					-.3 + .02 * d,
					.5,
					-d
				], me = [
					-1.15,
					.2,
					1.9
				];
				O.you.points.visible = true;
				O.you.points.position.set(you[0], you[1] - H0[1], you[2]);
				O.you.set({
					a: O.tex.ball,
					noise: .012,
					noiseFreq: 5,
					noiseSpeed: .5,
					t,
					reveal: .1,
					size: .009,
					minPx: 1.1,
					bright: .5,
					colA: WARM,
					sparkle: .5
				}, cam, ctx.H);
				O.lines.segment(me, me, {
					color: COL.me.map((v) => v * 1.8),
					width: 11
				});
				const cut = seg(t, t0 + .7 * span, t0 + .85 * span), n = 36;
				for (let i = 0; i < n; i++) {
					const u0 = (i + (t - t0) * 5.5 % 1) / n, u1 = u0 + .45 / n;
					if (u1 > 1) continue;
					const reach = 1 - cut * seg(u0, .25, .9);
					const p = me.map((v, j) => v + (you[j] - v) * u0), q = me.map((v, j) => v + (you[j] - v) * u1);
					O.lines.segment(p, q, {
						color: mix3(COL.me, COLD, u0).map((v) => v * .55 * reach),
						width: 2
					});
				}
				render(ctx, cam);
				pane(ctx.text.overlay);
				pingLog(ctx.text.overlay, t, t0, span, {
					y: 150,
					size: 19,
					lh: 29
				});
				const y = toDesign(you, cam);
				if (y[2] < 1) callout(ctx.text.overlay, [y[0], y[1]], `you · ${d.toFixed(1)} m`, {
					dx: 60,
					dy: -46,
					color: HEX.you,
					alpha: .7
				});
				overlays(ctx, K, null, P);
				coldLook(ctx, P, { vignette: .5 });
			}
		},
		...[
			2,
			3,
			4
		].map((i) => ({
			id: `search${i}`,
			editOnly: true,
			ownsLyrics: true,
			at: (T) => keys(T).left[i].start,
			draw(ctx) {
				reset();
				searchE(ctx, keys(ctx.T), i - 1);
			}
		})),
		{
			id: "presence",
			at: (T) => keys(T).left[3].start,
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T), t = ctx.t, P = pal(t, K), t0 = K.left[3].start, k = ease.inOutSine(seg(t, t0, K.left[4].start));
				reset();
				const s = lerp(1, 1.06, k), cam = designCam(O.dcam, ctx.aspect, s, DOT.c);
				const hollow = ease.inOutCubic(seg(t, K.tPres - .32, K.tPres + .06)), off = seg(t, K.tPres, K.tPres + .15);
				const c = W(...DOT.c), col = mix3(COL.you, COLD_GREY, off);
				O.bits.points.visible = true;
				O.bits.set({
					a: O.tex.dot,
					b: O.tex.ring,
					morph: hollow,
					spread: .45,
					wave: 1.5,
					waveOrigin: c,
					noise: .006,
					noiseFreq: 3,
					t,
					size: .03,
					minPx: 1.3,
					bright: lerp(.62, .34, off) * (1 + .12 * Math.sin(t * 5.1) * (1 - hollow)),
					colA: col,
					colB: col,
					sparkle: .3
				}, cam, ctx.H);
				render(ctx, cam);
				presence(ctx.text.overlay, t, t0, K.tPres, { s });
				overlays(ctx, K, null, P);
				coldLook(ctx, P, { vignette: .4 });
			}
		},
		{
			id: "pointer",
			at: (T) => keys(T).left[4].start,
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T), t = ctx.t, P = pal(t, K);
				K.left[4].start;
				reset();
				const cam = designCam(O.dcam, ctx.aspect);
				const tex = capture(ctx, (sub) => {
					const gone = ease.inOutSine(seg(t, K.ptr.free + .02, K.ptr.free + .5));
					O.bits.points.visible = true;
					O.bits.set({
						a: O.tex.obj,
						b: O.tex.objGone,
						morph: gone,
						spread: .6,
						noise: .03 * gone,
						noiseFreq: 1.2,
						t,
						size: .02,
						minPx: 1.2,
						bright: .9 * (1 - gone),
						colA: [
							1,
							1,
							1
						]
					}, cam, ctx.H);
					render(sub, cam);
				});
				view(ctx, tex, "paper", {
					ink: [
						.09,
						.1,
						.12
					],
					paper: [
						.86,
						.85,
						.82
					]
				});
				pointerLines(ctx.text.overlay, t, K.ptr);
				pointerLabels(ctx.text.overlay, t, K.ptr);
				overlays(ctx, K, null, P, { ink: true });
				Object.assign(ctx.post, {
					vignette: .14,
					grain: .02
				});
			}
		},
		{
			id: "prompt",
			at: (T) => keys(T).left[5].start,
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T), t = ctx.t, P = pal(t, K), t0 = K.left[5].start, k = ease.inOutSine(seg(t, t0, K.tIso));
				reset();
				if (remade(ctx)) return promptR(ctx, K, t, P, k);
				const cam = persp([
					0,
					0,
					4
				], [
					0,
					0,
					0
				], {
					fov: 36,
					aspect: ctx.aspect
				});
				const d = lerp(7, 40, ease.inCubic(k)), you = [
					lerp(1.1, 3.4, k),
					lerp(.55, 1.5, k),
					-d
				];
				O.you.points.visible = true;
				O.you.points.position.set(you[0], you[1] - H0[1], you[2]);
				O.you.set({
					a: O.tex.ball,
					noise: .012,
					noiseFreq: 5,
					noiseSpeed: .5,
					t,
					reveal: .08,
					size: .009,
					minPx: 1,
					bright: .32 * (1 - seg(k, .5, 1)),
					colA: mix3(WARM, COLD_GREY, k),
					sparkle: .5
				}, cam, ctx.H);
				render(ctx, cam);
				lonelyPrompt(ctx.text.overlay, claude_exports, t, lerp(.97, 1, k));
				overlays(ctx, K, null, P);
				coldLook(ctx, P, { vignette: .5 });
			}
		},
		{
			id: "isolation",
			at: (T) => keys(T).tIso,
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T), t = ctx.t, P = pal(t, K), k = seg(t, K.tIso, K.end);
				reset();
				if (remade(ctx)) return isolationR(ctx, K, t, P, k);
				const pull = ease.inOutSine(k), s = 1.3 * (.1 / 1.3) ** pull;
				render(ctx, persp([
					0,
					0,
					4
				], [
					0,
					0,
					0
				], { aspect: ctx.aspect }));
				const L = ctx.text.overlay;
				isolationWord(L, t, K, lonelyPrompt(L, claude_exports, t, s, {
					cur: [960, 540],
					hint: false
				}));
				motes(L, t, K, pull);
				frame(L, t, ctx.T, {
					label: "resonance",
					alpha: .5 * (1 - .5 * pull)
				});
				stackLog(L, t, K.left, {
					accent: P.accent,
					alpha: 1 - seg(t, K.B(30.8), K.B(31.8))
				});
				coldLook(ctx, P, {
					vignette: .5,
					bloom: .9
				});
			}
		}
	]
});
/**
* (The remake, EDIT.md c2) prompt → isolation as one pull-back: the box starts where the prompt shot leaves it (its
* size, its place, its hint, the frame's and the glow's strength) and the cursor drifts to the centre as the camera
* backs away, to one point in the dark (c2x's first frame, as published). The published cut re-framed it in one frame.
*/
function isolationR(ctx, K, t, P, k) {
	const pull = ease.inOutSine(k), s = .1 ** pull, m = ease.inOutSine(seg(k, 0, .4));
	const cam = persp([
		0,
		lerp(.9, 5.5, pull),
		lerp(6.5, 9, pull)
	], [
		0,
		lerp(.55, -1.2, pull),
		-6
	], {
		fov: 36,
		aspect: ctx.aspect
	});
	promptWorld(ctx, K, t, cam, { fade: ease.inOutSine(seg(k, .05, .7)) });
	render(ctx, cam);
	pane(ctx.text.overlay, 820);
	const L = ctx.text.overlay;
	isolationWord(L, t, K, lonelyPrompt(L, claude_exports, t, s, {
		toward: [960, 540],
		m,
		fill: PROMPT_FILL
	}));
	motes(L, t, K, pull);
	frame(L, t, ctx.T, {
		label: "resonance",
		alpha: .55 * (1 - .5 * pull)
	});
	stackLog(L, t, K.left, {
		accent: P.accent,
		alpha: 1 - seg(t, K.B(30.8), K.B(31.8))
	});
	coldLook(ctx, P, {
		vignette: .5,
		bloom: lerp(1.05, .9, pull)
	});
}
var LEG = .36;
var compAz = (lt) => -.1 * ease.inOutSine(seg(lt, 0, 1.2)) - .04 * lt;
/**
* Every instrument at once (string, scope, the song's spectrum, the plate), climbing together one step per beat.
* conv 0..1: the four views close in on the plate's square as COMPLETION first frames it (a 2 × 2 block of the same
* size and place), so the cut lands on one plate.
*/
function instrumentPanel(ctx, conv) {
	const K = keys(ctx.T), t = ctx.t, st = sandState(t, K, remade(ctx)), P = pal(t, K);
	reset();
	const e = ease.inOutCubic(conv), up = ease.inOutCubic(seg(t, K.B(12) - .05, K.B(12) + .12)), up2 = ease.inOutCubic(seg(t, K.B(13) - .05, K.B(13) + .12));
	const cc0 = orbit(O.persp2, {
		inset: true,
		aspect: ctx.aspect,
		fov: 36,
		r: 6.1,
		az: compAz(0),
		el: 1.42,
		target: [
			0,
			0,
			-.16
		]
	});
	cc0.updateMatrixWorld();
	const cs = [
		[
			-1.03,
			0,
			-1.03
		],
		[
			1.03,
			0,
			-1.03
		],
		[
			1.03,
			0,
			1.03
		],
		[
			-1.03,
			0,
			1.03
		]
	].map((p) => toDesign(p, cc0));
	const bx = Math.min(...cs.map((c) => c[0])), by = Math.min(...cs.map((c) => c[1])), bw = Math.max(...cs.map((c) => c[0])) - bx, bh = Math.max(...cs.map((c) => c[1])) - by;
	const X0 = lerp(0, bx, e), Y0 = lerp(0, by, e), WW = lerp(1920, bw, e), HH = lerp(1080, bh, e), g = lerp(6, 3, e);
	const w = (WW - g * 3) / 2, h = (HH - g * 3) / 2;
	const rects = [
		[
			X0 + g,
			Y0 + g,
			w,
			h
		],
		[
			X0 + g * 2 + w,
			Y0 + g,
			w,
			h
		],
		[
			X0 + g,
			Y0 + g * 2 + h,
			w,
			h
		],
		[
			X0 + g * 2 + w,
			Y0 + g * 2 + h,
			w,
			h
		]
	];
	const n = 5 + (t >= K.B(12) ? 1 : 0) + (t >= K.B(13) ? 1 : 0), ratio = [3 + up + up2, 4 + up + up2];
	const view = (i, fn) => ctx.viewport(rects[i], (wp, hp) => {
		reset();
		const cam = fn(wp, hp);
		O.lines.end(ctx).res(wp, hp);
		O.lines.mesh.visible = true;
		ctx.draw(O.scene, cam);
	});
	view(0, (wp, hp) => {
		const cam = persp([
			.45,
			.05,
			4.1
		], [
			0,
			0,
			0
		], {
			fov: 34,
			aspect: wp / hp,
			inset: true
		});
		strings(ctx, cam, t, K.B(11) - 1, P, {
			ns: [n],
			y: 0,
			amp: .34,
			half: 1.75
		});
		return cam;
	});
	view(1, (wp, hp) => {
		const cam = O.ortho, v = 2.6 * Math.max(1, wp / hp < 1.2 ? 1.25 : 1);
		Object.assign(cam, {
			left: -v * wp / hp,
			right: v * wp / hp,
			top: v,
			bottom: -v,
			near: .01,
			far: 100,
			zoom: 1
		});
		cam.position.set(0, 0, 20);
		cam.up.set(0, 1, 0);
		cam.lookAt(0, 0, 0);
		cam.updateProjectionMatrix();
		cam.updateMatrixWorld();
		scope(ctx, t, K, {
			ratio,
			delta: Math.PI * (.3 + .32 * (t - K.B(8))),
			d: .56,
			channels: false
		});
		return rig.cam(cam, {
			look: [
				0,
				0,
				0
			],
			inset: true
		});
	});
	view(3, (wp, hp) => {
		const cam = ortho([
			0,
			0,
			0
		], "top", 2.35, wp / hp, { inset: true });
		drawPlate(ctx, cam, st, P, {
			sand: {
				grid: 512,
				size: .006,
				bright: .42
			},
			field: { bright: .45 },
			rod: false
		}, hp);
		return cam;
	});
	waterfall(ctx.text.scene, ctx.F, t, rects[2], {
		win: 1.6,
		rows: 36,
		height: .36,
		cam: {
			pos: [
				0,
				1.55,
				2
			],
			look: [
				0,
				-.12,
				-1.05
			],
			fov: 36
		},
		labels: false,
		inset: true
	});
	const L = ctx.text.overlay, la = 1 - seg(conv, 0, .35);
	const labels = [
		`string · n = ${n} · ${n * STRING.f1} Hz`,
		`XY · ${Math.round(ratio[0])} : ${Math.round(ratio[1])}`,
		"spectrum · live",
		`plate · (${st.b[0]}, ${st.b[1]}) · ${Math.round(modeHz(...st.b))} Hz`
	];
	rects.forEach((r, i) => {
		viewportFrame(L, r, i < 2 && la > 0 ? labels[i] : null, { alpha: .6 * (1 - .4 * e) });
		if (i >= 2 && la > 0) L.text(labels[i], r[0] + 14, r[1] + r[3] - 16, {
			size: 14,
			weight: 600,
			color: HEX.me,
			align: "left",
			alpha: .8 * la
		});
	});
	consoleLog(L, ctx.T, t, { from: K.s0 - .2 });
	look(ctx, {
		vignette: lerp(.2, .45, e),
		textGlow: 1.25,
		ca: .1
	});
}
/** A dark pane under the console (bottom of the frame), so the log reads over a busy background. */
/**
* docs/REMAKE.md §4 E. L71–L74: on each line's first word me sends a probe; it arrives on "left" at the place where me
* looks for you, finds nothing there, and its empty result joins a column: the conversation, the timeout, the presence
* dot, the dangling reference (the published cut's four shots, now four readings). Each time me looks farther, the
* colour goes a step colder, and what you left there is cooler. No free(you): you is not destroyed, only no longer in
* this world. (§12.18) Four views of one world, a view per search (c2/search.js).
*/
var SEARCH = [
	{
		cmd: "send(you, msg)",
		res: "you left the conversation"
	},
	{
		cmd: "ping you",
		res: "Request timeout for icmp_seq 3"
	},
	{
		cmd: "status(you)",
		res: "● online  →  ○ offline"
	},
	{
		cmd: "*you",
		res: "dangling: nothing at 0x7f3a2c40"
	}
];
var leftWord = (l) => (l.words.find((w) => /left/i.test(w.text)) ?? l.words[l.words.length - 1]).start;
var R_MAX = 18;
var searchProbes = (K) => [
	1,
	2,
	3,
	4
].map((i, n) => ({
	n,
	t0: K.left[i].start,
	t1: leftWord(K.left[i])
}));
function searchRings(t, K) {
	const out = [];
	for (const p of searchProbes(K)) {
		if (t < p.t0) continue;
		const y = spot(p.n), R = Math.hypot(y[0] - ME[0], y[2] - ME[2]) / Math.max(p.t1 - p.t0, .2) * (t - p.t0);
		if (R >= R_MAX) continue;
		out.push({
			o: [ME[0], ME[2]],
			r: R,
			amp: 2.6 / Math.sqrt(1 + R / 1.5) * (1 - seg(R, R_MAX * .65, R_MAX)),
			width: .18 + .02 * R,
			wake: .45,
			col: ringCol(p.n)
		});
	}
	return out.slice(-4);
}
var RIPPLE_STYLE = {
	wavelength: .42,
	length: .75,
	lift: .07,
	col: COL.me
};
var PROMPT_FILL = "rgba(3, 5, 9, .9)";
/** A dashed circle on the floor (just above it), n dashes. */
function dashed(c, r, color, width, n = 24) {
	const ring = [];
	for (let i = 0; i <= 2 * n; i++) {
		const q = i / (2 * n) * TAU;
		ring.push([
			c[0] + Math.cos(q) * r,
			.012,
			c[2] + Math.sin(q) * r
		]);
	}
	for (let i = 0; i < 2 * n; i += 2) O.lines.polyline(ring.slice(i, i + 2), {
		color,
		width
	});
}
var SEARCH_LIGHT = 1.4;
var SEARCH_APERTURE = [
	.018,
	.014,
	.01,
	.004
];
/**
* (§12.18) Search n (0–3) in its view (c2/search.js): ① low behind me, ② up to one side, ③ the reverse from just behind
* the place, ④ straight down, the disc a sonar screen. The floor is still (the waves are what moves); where you was
* keeps a little warmth, cooler each time, and the fourth place is a hole in the code.
*/
function searchE(ctx, K, view = 0) {
	const t = ctx.t, L = ctx.text.overlay, t0 = K.left[1].start, probes = searchProbes(K), cur = probes[view];
	const send = probes.reduce((a, p) => a + (t >= p.t0 ? Math.exp(-(t - p.t0) / .12) : 0), 0);
	const lvl = probes.reduce((a, p) => a + ease.inOutSine(seg(t, p.t1, p.t1 + .5)), 0);
	const P0 = pal(t, K), c0 = pal(t0, K).cold, c1 = pal(K.left[5].start, K).cold, P = {
		...P0,
		cold: lerp(c0, c1, lvl / 4)
	};
	P.accent = P.cold > .5 ? "#9fb6e6" : HEX.me;
	const end = view < 3 ? probes[view + 1].t0 : K.left[5].start, v = viewCam(view, seg(t, cur.t0 - .05, end));
	const cam = persp(v.pos, v.look, {
		fov: v.fov,
		aspect: ctx.aspect,
		up: v.up
	});
	const place = spot(view), at = [place[0], place[2]], F = FOG[view], fu = O.fogS.material.uniforms;
	O.codeS.points.visible = O.fogS.visible = true;
	fu.uC.value.set(...F.c);
	fu.uNear.value = F.near;
	fu.uFar.value = F.far;
	const fp = [
		ME,
		[
			(ME[0] + place[0]) / 2,
			0,
			(ME[2] + place[2]) / 2
		],
		place,
		ME
	][view];
	O.codeS.set({
		a: O.tex.search,
		size: .85 * O.searchCell,
		bright: .4 * (1 - .1 * lvl) * (view === 3 ? 1.5 : 1),
		palette: CODE_PAL,
		t,
		focus: dist3(v.pos, fp),
		aperture: SEARCH_APERTURE[view],
		maxBlur: 16,
		minPx: 2,
		ripples: [...searchRings(t, K).slice(-3), {
			o: [ME[0], ME[2]],
			r: 0,
			amp: .55 + 1.2 * send,
			width: .38,
			wake: 0,
			col: COL.me
		}],
		rippleStyle: {
			...RIPPLE_STYLE,
			lift: .05,
			light: SEARCH_LIGHT
		},
		warm: view < HOLE.n ? {
			o: at,
			r: WARM_R[view],
			s: residue(view, t, cur.t1),
			col: WARM
		} : null,
		hole: view === HOLE.n ? {
			o: at,
			r: HOLE.r
		} : null
	}, cam, ctx.H);
	O.lines.segment(ME, ME, {
		color: COL.me.map((v) => v * (2.2 + 2.4 * send)),
		width: 16 + 14 * send
	});
	O.lines.segment(ME, ME, {
		color: COL.me.map((v) => v * (.35 + .5 * send)),
		width: 60 + 40 * send
	});
	const pass = t >= cur.t1 ? Math.exp(-(t - cur.t1) / .18) : 0;
	dashed(place, view === HOLE.n ? HOLE.r + .15 : .52, COLD.map((v) => v * (.5 + 1.4 * pass)), 1.6);
	if (view === 3) {
		for (let n = 0; n < 4; n++) dashed([
			ME[0],
			0,
			ME[2]
		], Math.hypot(spot(n)[0] - ME[0], spot(n)[2] - ME[2]), COLD.map((v) => v * .3), 1.1, 160);
		for (let n = 0; n < 3; n++) dashed(spot(n), .52, COLD.map((v) => v * .45), 1.3);
	}
	render(ctx, cam);
	pane(L);
	searchLog(L, t, probes, P);
	const y = toDesign([
		place[0],
		.012,
		place[2]
	], cam), d = -place[2];
	if (y[2] < 1) callout(L, [y[0], y[1]], `you · ${d.toFixed(1)} m`, {
		dx: 60,
		dy: -46,
		color: HEX.you,
		alpha: .6 * (1 - .15 * lvl)
	});
	overlays(ctx, K, null, P);
	coldLook(ctx, P, { vignette: .5 });
}
function promptWorld(ctx, K, t, cam, o = {}) {
	const t0 = K.left[1].start, fade = o.fade ?? 0;
	const v = new Vector3(0, -1400 / 1080 + 1, .5).unproject(cam).sub(cam.position).normalize();
	const k = -cam.position.y / v.y, pool = [cam.position.x + v.x * k, cam.position.z + v.z * k];
	const on = .55 + .45 * (Math.floor(t * 2) % 2 === 0 ? 1 : 0);
	O.codeR.points.visible = true;
	O.fog.visible = true;
	O.codeR.points.position.set(0, 0, -8);
	O.codeR.set({
		a: O.tex.floor,
		size: .085,
		bright: .1 * (1 - fade),
		palette: CODE_PAL,
		t,
		focus: 9,
		aperture: .016,
		maxBlur: 16,
		minPx: 2,
		scroll: [
			0,
			(t - t0) * .35,
			0
		],
		ripples: [...searchRings(t, K).slice(-3), {
			o: pool,
			r: 0,
			amp: 2.4 * on * (1 - fade),
			width: 2.2,
			wake: 0
		}],
		rippleStyle: {
			...RIPPLE_STYLE,
			lift: 0
		}
	}, cam, ctx.H);
}
function promptR(ctx, K, t, P, k) {
	const cam = persp([
		0,
		.9,
		6.5
	], [
		0,
		.55,
		-6
	], {
		fov: 36,
		aspect: ctx.aspect
	});
	promptWorld(ctx, K, t, cam);
	const d = lerp(7, 40, ease.inCubic(k)), you = [
		lerp(1.1, 3.4, k),
		lerp(.55, 1.5, k),
		-d
	];
	O.you.points.visible = true;
	O.you.points.position.set(you[0], you[1] - H0[1], you[2]);
	O.you.set({
		a: O.tex.ball,
		noise: .012,
		noiseFreq: 5,
		noiseSpeed: .5,
		t,
		reveal: .08,
		size: .009,
		minPx: 1,
		bright: .32 * (1 - seg(k, .5, 1)),
		colA: mix3(WARM, COLD_GREY, k),
		sparkle: .5
	}, cam, ctx.H);
	render(ctx, cam);
	pane(ctx.text.overlay, 820);
	lonelyPrompt(ctx.text.overlay, claude_exports, t, lerp(.97, 1, k), { fill: PROMPT_FILL });
	overlays(ctx, K, null, P);
	coldLook(ctx, P, { vignette: .5 });
}
/** The column of empty results: each command on its line's first word, its result on "left". */
function searchLog(L, t, probes, P) {
	const x = 110, y0 = 150, lh = 29, st = {
		size: 19,
		font: "JetBrains Mono",
		weight: 500,
		align: "left"
	};
	probes.forEach((p, i) => {
		const kc = seg(t, p.t0 - .02, p.t0 + .06);
		if (kc <= 0) return;
		const y = y0 + i * lh * 1.7, S = SEARCH[i];
		L.text("$", x, y, {
			...st,
			color: HEX.dim,
			alpha: kc
		});
		L.text(S.cmd, x + L.measure("$ ", st), y, {
			...st,
			color: "#e8e8e8",
			alpha: kc
		});
		const kr = seg(t, p.t1, p.t1 + .06);
		if (kr > 0) L.text(S.res, 410, y, {
			...st,
			weight: 600,
			color: i < 3 ? "#ff8fb8" : "#b8c4e6",
			alpha: kr * lerp(1, .8, P.cold)
		});
		else if (Math.floor(t * 6) % 2 === 0) L.text("…", 410, y, {
			...st,
			color: HEX.dim,
			alpha: kc * .8
		});
	});
}
function pane(L, y0 = 700) {
	L.draw((g) => {
		const gr = g.createLinearGradient(0, y0, 0, 1080);
		gr.addColorStop(0, "rgba(0,0,0,0)");
		gr.addColorStop(.4, "rgba(0,0,0,.7)");
		gr.addColorStop(1, "rgba(0,0,0,.85)");
		g.fillStyle = gr;
		g.fillRect(0, y0, 1920, 1080 - y0);
	});
}
/** The thermal camera's colour bar (inferno), with its scale. */
function colorbar(L) {
	const x = 1790, y0 = 330, y1 = 750;
	const stops = [
		"#000004",
		"#160b39",
		"#420a68",
		"#6a176e",
		"#932667",
		"#bc3754",
		"#dd513a",
		"#f37819",
		"#fca50a",
		"#f6d746",
		"#fcffa4"
	];
	L.draw((g) => {
		const gr = g.createLinearGradient(0, y1, 0, y0);
		stops.forEach((c, i) => gr.addColorStop(i / (stops.length - 1), c));
		g.fillStyle = gr;
		g.fillRect(x, y0, 16, 420);
		g.strokeStyle = "#65708a";
		g.lineWidth = 1;
		g.strokeRect(1789.5, 329.5, 17, 421);
	});
	const st = {
		size: 15,
		weight: 500,
		color: "#8a93a6",
		align: "right",
		alpha: .9
	};
	L.text("⟨w²⟩", 1806, 306, { ...st });
	L.text("max", 1780, 336, st);
	L.text("0", 1780, 744, st);
}
/** ISOLATION: set under the prompt, then its letters drift apart until each is alone in the dark. */
function isolationWord(L, t, K, box) {
	const w = "ISOLATION", size = 24, k = ease.inOutSine(seg(t, K.tIso + .1, K.end + .15)), a = seg(t, K.tIso, K.tIso + .1);
	const gap = lerp(size * .95, 205, k), y0 = 636;
	for (let i = 0; i < 9; i++) {
		const x = 960 + (i - 4) * gap, y = y0 + (hash(i * 3.17 + 5) - .5) * 64 * k;
		L.text(w[i], x, y, {
			size,
			weight: 600,
			color: "#c9d4ea",
			alpha: a * lerp(.95, .6, k),
			glow: 0
		});
	}
}
/** A few faint motes of dust sliding toward the centre as the camera pulls back (they sit at different depths). */
function motes(L, t, K, pull) {
	L.draw((g) => {
		for (let i = 0; i < 36; i++) {
			const x0 = hash(i * 1.37) * 1920, y0 = hash(i * 2.71 + 1) * 1080;
			const s = 1 / (1 + pull * (.4 + 2.6 * hash(i * 5.3 + 2)) * 2.2), x = 960 + (x0 - 960) * s, y = 540 + (y0 - 540) * s;
			g.globalAlpha = .18 * (1 - pull * .5) * (.4 + .6 * hash(i * 9.1));
			g.fillStyle = "#9fb6e6";
			g.beginPath();
			g.arc(x, y, 1.1, 0, TAU);
			g.fill();
		}
	});
}
//#endregion
