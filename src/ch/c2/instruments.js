import { TAU, clamp, lerp } from "../../engine/math.js?v=BJIlRm7-";
import { Mesh, PerspectiveCamera, PlaneGeometry } from "../../../vendor/three/build/three.core.js?v=q9f7JKE-";
import { shaderMaterial } from "../../engine/gpu.js?v=o4BYX3o1";
import { rig } from "../../engine/rig.js?v=39-joEtk";
import { toDesign } from "../../lib/hud.js?v=BgmSZjmG";
//#region src/ch/c2/instruments.js
/** An A string (110 Hz; 648 mm scale length). The harmonics are exact integer multiples: f_n = n·f₁. */
var STRING = {
	f1: 110,
	scale: 648
};
/**
* One string vibrating in harmonic n, drawn with GlowLines. o: a, b (fixed ends, world), up (unit displacement
* direction), n, amp (world), t (film time), f (apparent strobe frequency of the fundamental, Hz), k (0..1 intensity),
* draw (0..1 draw-on from a), col (string), env (the long exposure), node (node dots), pts (samples), width.
*/
function string(L, o) {
	const { a, b, n } = o, up = o.up ?? [
		0,
		1,
		0
	], P = o.pts ?? 160, k = o.k ?? 1, amp = o.amp ?? .15, draw = o.draw ?? 1;
	if (k <= .002 || draw <= 0) return;
	const at = (u, y) => [
		0,
		1,
		2
	].map((i) => a[i] + (b[i] - a[i]) * u + up[i] * y);
	const shape = (c, uMax = draw) => {
		const pts = [];
		for (let i = 0; i <= P; i++) {
			const u = i / P * uMax;
			pts.push(at(u, amp * Math.sin(n * Math.PI * u) * c));
		}
		return pts;
	};
	const phase = TAU * (o.f ?? 1) * n * (o.t ?? 0), env = o.env ?? [
		1,
		.28,
		.55
	], col = o.col ?? [
		.42,
		.92,
		1
	];
	const G = o.ghosts ?? 9;
	for (let g = 0; g < G; g++) L.polyline(shape(Math.cos((g + .5) / G * Math.PI)), {
		color: env.map((v) => v * .09 * k),
		width: 2.2
	});
	for (let j = 3; j >= 1; j--) L.polyline(shape(Math.cos(phase - j * .22)), {
		color: col.map((v) => v * .12 * k * (4 - j) / 3),
		width: 2.4
	});
	L.polyline(shape(Math.cos(phase)), {
		color: col.map((v) => v * .95 * k),
		width: o.width ?? 3
	});
	for (let j = 0; j <= n; j++) {
		const u = j / n;
		if (u > draw + 1e-6) break;
		const p = at(u, 0);
		if (j === 0 || j === n) L.segment(at(u, -amp * .55), at(u, amp * .55), {
			color: [
				.7,
				.75,
				.85
			].map((v) => v * .5 * k),
			width: 2.4
		});
		else L.segment(p, p, {
			color: (o.node ?? [
				.95,
				.97,
				1
			]).map((v) => v * 1.1 * k),
			width: 8
		});
	}
}
/**
* The scope's graticule (10 × 8 divisions, minor ticks on the centre axes) around centre c, division size d, in the
* plane spanned by ex, ey (world unit vectors). k: intensity.
*/
function graticule(L, c, d, o = {}) {
	const ex = o.ex ?? [
		1,
		0,
		0
	], ey = o.ey ?? [
		0,
		1,
		0
	], k = o.k ?? 1, col = o.col ?? [
		.35,
		.5,
		.75
	];
	const P = (x, y) => [
		0,
		1,
		2
	].map((i) => c[i] + ex[i] * x * d + ey[i] * y * d);
	const line = (p, q, s, w = 1.3) => L.segment(p, q, {
		color: col.map((v) => v * s * k),
		width: w
	});
	for (let i = -5; i <= 5; i++) line(P(i, -4), P(i, 4), i === 0 ? .32 : Math.abs(i) === 5 ? .36 : .12, Math.abs(i) === 5 ? 1.6 : 1.2);
	for (let j = -4; j <= 4; j++) line(P(-5, j), P(5, j), j === 0 ? .32 : Math.abs(j) === 4 ? .36 : .12, Math.abs(j) === 4 ? 1.6 : 1.2);
	for (let i = -25; i <= 25; i++) if (i % 5) line(P(i / 5, -.1), P(i / 5, .1), .3);
	for (let j = -20; j <= 20; j++) if (j % 5) line(P(-.1, j / 5), P(.1, j / 5), .3);
}
/**
* A Lissajous trace x = X·sin(a·s + δ), y = Y·sin(b·s), s ∈ [0, 2π), with phosphor persistence behind the beam.
* o: c, d (as graticule), ex, ey, a, b, delta, X, Y (divisions), beam (beam position s, radians), tau (persistence, rad),
* k, col, pts. Returns the beam point.
*/
function lissajous(L, o) {
	const { c, d, a, b } = o, ex = o.ex ?? [
		1,
		0,
		0
	], ey = o.ey ?? [
		0,
		1,
		0
	], k = o.k ?? 1, P = o.pts ?? 720, col = o.col ?? [
		.9,
		.95,
		1
	];
	const X = o.X ?? 3.4, Y = o.Y ?? 3.4, dl = o.delta ?? 0, tau = o.tau ?? 5, beam = o.beam ?? 0;
	const at = (s) => {
		const x = X * Math.sin(a * s + dl), y = Y * Math.sin(b * s);
		return [
			0,
			1,
			2
		].map((i) => c[i] + (ex[i] * x + ey[i] * y) * d);
	};
	let prev = at(0);
	for (let i = 1; i <= P; i++) {
		const s = i / P * TAU, p = at(s), behind = ((beam - s) % TAU + TAU) % TAU;
		const e = .16 + .84 * Math.exp(-behind / tau);
		L.segment(prev, p, {
			color: col.map((v) => v * e * k),
			width: 2.6
		});
		prev = p;
	}
	const bp = at((beam % TAU + TAU) % TAU);
	L.segment(bp, bp, {
		color: col.map((v) => v * 2.4 * k),
		width: 11
	});
	return bp;
}
/** One input channel as a small sine trace along a baseline: from p to q, `cycles` cycles, amplitude h (world). */
function channel(L, p, q, up, cycles, h, phase, o = {}) {
	const P = o.pts ?? 160, pts = [];
	for (let i = 0; i <= P; i++) {
		const u = i / P, y = h * Math.sin(TAU * cycles * u + phase);
		pts.push([
			0,
			1,
			2
		].map((j) => p[j] + (q[j] - p[j]) * u + up[j] * y));
	}
	L.polyline(pts, {
		color: o.col ?? [
			.42,
			.92,
			1
		],
		width: o.width ?? 2
	});
}
var hz2mel = (f) => f < 1e3 ? 3 * f / 200 : 15 + 27 * Math.log(f / 1e3) / Math.log(6.4);
var M0 = hz2mel(30);
var M1 = hz2mel(16e3);
/** Position 0..1 across the 16 band centres of a frequency (for axis ticks). */
var hzPos = (f) => clamp(((hz2mel(f) - M0) / ((M1 - M0) / 17) - 1) / 15);
var catmull = (p0, p1, p2, p3, u) => .5 * (2 * p1 + (-p0 + p2) * u + (2 * p0 - 5 * p1 + 4 * p2 - p3) * u * u + (-p0 + 3 * p1 - 3 * p2 + p3) * u * u * u);
var bandsBuf = /* @__PURE__ */ new Float32Array(16);
var WCAM = new PerspectiveCamera(30, 16 / 9, .1, 100);
/**
* A waterfall of the song's spectrum at time t, drawn on a text layer inside rect [x, y, w, h] (design units).
* o: win (seconds shown), rows, height (ridge scale), cam { pos, look, fov }, col (newest ridge), old (oldest ridge),
* words (T.words, to mark sung words on the time axis), labels (false hides the axis labels), labelLayer (draw the
* labels there, e.g. the crisp overlay), k (alpha).
* World: x ∈ [−1, 1] across the bands, z = age (0 now … −depth), y = level.
*/
function waterfall(Lr, F, t, rect, o = {}) {
	const win = o.win ?? 1.6, rows = o.rows ?? 48, depth = o.depth ?? 2.4, hgt = o.height ?? .42, k = o.k ?? 1, S = 64;
	const cp = o.cam ?? {}, look = cp.look ?? [
		0,
		.05,
		-1.05
	];
	let cam = WCAM;
	cam.fov = cp.fov ?? 30;
	cam.aspect = rect[2] / rect[3];
	cam.position.set(...cp.pos ?? [
		0,
		1.35,
		2.35
	]);
	cam.lookAt(...look);
	cam.updateProjectionMatrix();
	cam.updateMatrixWorld();
	cam = rig.cam(cam, {
		look,
		inset: o.inset
	});
	const P = (p) => toDesign(p, cam, rect);
	const step = win / rows, tq = Math.floor(t / step) * step;
	const ridges = [];
	for (let j = rows; j >= 0; j--) {
		const tj = tq - j * step, age = t - tj;
		if (age > win) continue;
		const z = -age / win * depth, v = F.bands(Math.max(0, tj), bandsBuf), pts = [];
		for (let i = 0; i <= S; i++) {
			const f = i / S * 15, b = Math.floor(Math.min(f, 14.999)), u = f - b, g = (q) => v[clamp(q, 0, 15)];
			const lv = clamp(catmull(g(b - 1), g(b), g(b + 1), g(b + 2), u), 0, 1.1);
			pts.push(P([
				i / S * 2 - 1,
				lv * hgt,
				z
			]));
		}
		ridges.push({
			age,
			z,
			pts,
			base: [P([
				-1,
				0,
				z
			]), P([
				1,
				0,
				z
			])]
		});
	}
	const newCol = o.col ?? [
		255,
		150,
		200
	], oldCol = o.old ?? [
		90,
		70,
		170
	];
	Lr.draw((g) => {
		g.save();
		g.beginPath();
		g.rect(...rect);
		g.clip();
		g.globalAlpha *= k;
		g.lineJoin = "round";
		for (const r of ridges) {
			const e = 1 - r.age / win;
			g.beginPath();
			g.moveTo(...r.pts[0]);
			for (const p of r.pts) g.lineTo(p[0], p[1]);
			g.lineTo(...r.base[1]);
			g.lineTo(...r.base[0]);
			g.closePath();
			g.fillStyle = "#000";
			g.fill();
			g.beginPath();
			g.moveTo(...r.pts[0]);
			for (const p of r.pts) g.lineTo(p[0], p[1]);
			const c = [
				0,
				1,
				2
			].map((i) => Math.round(lerp(oldCol[i], newCol[i], e ** 1.5)));
			g.strokeStyle = `rgba(${c[0]},${c[1]},${c[2]},${(.25 + .75 * e ** 2).toFixed(3)})`;
			g.lineWidth = r.age < step * 1.01 ? 2.4 : 1.4;
			g.stroke();
		}
		g.restore();
	});
	if (o.labels === false) return;
	const L = o.labelLayer ?? Lr, st = {
		size: o.labelSize ?? 15,
		font: "JetBrains Mono",
		weight: 500,
		color: HEXDIM,
		alpha: .85 * k
	};
	const b0 = P([
		-1,
		0,
		0
	]), b1 = P([
		1,
		0,
		0
	]), d1 = P([
		1,
		0,
		-depth
	]);
	L.draw((g) => {
		g.globalAlpha *= .5 * k;
		g.strokeStyle = HEXDIM;
		g.lineWidth = 1;
		g.beginPath();
		g.moveTo(...b0);
		g.lineTo(...b1);
		g.lineTo(...d1);
		g.stroke();
	});
	for (const [f, s] of [
		[250, "250"],
		[1e3, "1k"],
		[4e3, "4k"],
		[16e3, "16k Hz"]
	]) {
		const q = P([
			hzPos(f) * 2 - 1,
			0,
			0
		]);
		L.draw((g) => {
			g.globalAlpha *= .6 * k;
			g.strokeStyle = HEXDIM;
			g.lineWidth = 1;
			g.beginPath();
			g.moveTo(q[0], q[1] + 6);
			g.lineTo(q[0], q[1] + 13);
			g.stroke();
		});
		L.text(s, q[0], q[1] + 26, {
			...st,
			align: f === 16e3 ? "right" : "center"
		});
	}
	for (const age of [
		0,
		.5,
		1,
		1.5
	]) {
		if (age > win) continue;
		const q = P([
			1.04,
			0,
			-age / win * depth
		]);
		L.text(age ? `−${age.toFixed(1)} s` : "now", q[0] + 10, q[1], {
			...st,
			align: "left"
		});
	}
	if (o.words) for (const w of o.words) {
		if (w.start > t || w.start < t - win) continue;
		const q = P([
			-1.04,
			0,
			-(t - w.start) / win * depth
		]);
		L.text(w.text, q[0] - 10, q[1], {
			...st,
			align: "right",
			color: "#c9a3d8",
			alpha: .9 * k
		});
	}
}
var HEXDIM = "#65708a";
var HEAT_VERT = `
out vec2 vP;
void main() { vP = position.xz; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`;
var HEAT_FRAG = `
uniform float uN1, uM1, uN2, uM2, uMorph, uBright, uAmbient, uT;
in vec2 vP; out vec4 o;
float chl(vec2 p, float n, float m) { return cos(n * PI * p.x) * cos(m * PI * p.y) - cos(m * PI * p.x) * cos(n * PI * p.y); }
void main() {
  vec2 p = vP;
  float d = clamp(length(p) / 1.414, 0., 1.) * .55, k = smoothstep(d, d + .45, uMorph);
  float w = mix(uN1 > .5 ? chl(p, uN1, uM1) : 0., chl(p, uN2, uM2), k) * .5;
  // heat diffuses a little: blend in a softened copy (the mode's energy averaged over a small disc)
  float s = 0.;
  for (int i = 0; i < 6; i++) { float a = float(i) * TAU / 6.; vec2 q = p + vec2(cos(a), sin(a)) * .035; s += pow(mix(uN1 > .5 ? chl(q, uN1, uM1) : 0., chl(q, uN2, uM2), k) * .5, 2.); }
  float e = mix(w * w, s / 6., .45);
  float noise = (hash12(floor(gl_FragCoord.xy / 2.) + floor(uT * 30.) * 7.1) - .5) * .018;   // sensor noise
  o = vec4(vec3(max(0., e * uBright + uAmbient + noise)), 1.);
}`;
/** The plate's time-averaged energy density as a grey heat map on the plate plane (view it through modes 'thermal'). */
var Heat = class {
	constructor() {
		const U = (n) => Object.fromEntries(n.map((k) => [k, { value: 0 }]));
		this.mesh = new Mesh(new PlaneGeometry(2, 2, 1, 1).rotateX(-Math.PI / 2), shaderMaterial({
			vertex: HEAT_VERT,
			fragment: HEAT_FRAG,
			uniforms: U([
				"uN1",
				"uM1",
				"uN2",
				"uM2",
				"uMorph",
				"uBright",
				"uAmbient",
				"uT"
			]),
			depthWrite: false
		}));
		this.mesh.frustumCulled = false;
	}
	/** st: the sand state (a, b, morph); o: bright, ambient, t. */
	set(st, o = {}) {
		const u = this.mesh.material.uniforms, a = st.a ?? [0, 0], b = st.b ?? [0, 0];
		u.uN1.value = a[0];
		u.uM1.value = a[1];
		u.uN2.value = b[0];
		u.uM2.value = b[1];
		u.uMorph.value = st.morph ?? 1;
		u.uBright.value = o.bright ?? 1;
		u.uAmbient.value = o.ambient ?? .02;
		u.uT.value = o.t ?? 0;
		this.mesh.visible = true;
		return this;
	}
};
//#endregion
export { Heat, STRING, channel, graticule, hzPos, lissajous, string, waterfall };
