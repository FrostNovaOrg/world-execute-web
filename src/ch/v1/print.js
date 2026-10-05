import { linearRGB } from "../../engine/math.js?v=BJIlRm7-";
import { BufferAttribute, BufferGeometry, DynamicDrawUsage, Float32BufferAttribute, InstancedBufferAttribute, InstancedBufferGeometry, Mesh, Vector2, Vector3 } from "../../../vendor/three/build/three.core.js?v=q9f7JKE-";
import { fsMaterial, shaderMaterial } from "../../engine/gpu.js?v=o4BYX3o1";
//#region src/ch/v1/print.js
var PAPER = "#f2ede2";
var INK = {
	K: "#1d1c21",
	red: "#c63a2c",
	yellow: "#e2a72a",
	blue: "#2b5ba6",
	grey: "#8d877a",
	soft: "#6f6a60"
};
/** Ink densities for the three plates [red, yellow, blue]; black is all three. */
var K = [
	1,
	1,
	1
];
var RED = [
	1,
	0,
	0
];
var YEL = [
	0,
	1,
	0
];
var BLU = [
	0,
	0,
	1
];
var inkMul = (ink, k) => ink.map((v) => v * k);
var MAX_BLEND = {
	blending: 5,
	blendEquation: 104,
	blendSrc: 201,
	blendDst: 201
};
var LINE_VERT = `
in vec3 aA, aB, aCol; in vec4 aP; in vec2 aD;   // aP: width (design px), density, u0, u1 (arc length at the ends); aD: dash period, on-fraction
uniform vec2 uRes;
out vec3 vCol; out vec2 vQ; out float vU, vL, vPx; out vec2 vD;
void clipPlane(float fa, float fb, inout float s0, inout float s1) {
  if (fa < 0. && fb < 0.) { s0 = 1.; s1 = 0.; return; }
  if (fa < 0.) s0 = max(s0, fa / (fa - fb));
  else if (fb < 0.) s1 = min(s1, fa / (fa - fb));
}
void main() {
  vec4 ca = projectionMatrix * modelViewMatrix * vec4(aA, 1.), cb = projectionMatrix * modelViewMatrix * vec4(aB, 1.);
  float s0 = 0., s1 = 1.; const float W0 = 1e-3, G = 3.;
  clipPlane(ca.w - W0, cb.w - W0, s0, s1);
  clipPlane(G * ca.w - ca.x, G * cb.w - cb.x, s0, s1); clipPlane(G * ca.w + ca.x, G * cb.w + cb.x, s0, s1);
  clipPlane(G * ca.w - ca.y, G * cb.w - cb.y, s0, s1); clipPlane(G * ca.w + ca.y, G * cb.w + cb.y, s0, s1);
  if (s0 >= s1) { gl_Position = vec4(2., 2., 2., 1.); vCol = vec3(0.); vQ = vec2(0.); vU = 0.; vL = 0.; vPx = 0.; vD = vec2(0.); return; }
  vec4 c0 = ca; ca = mix(c0, cb, s0); cb = mix(c0, cb, s1);
  float u0 = mix(aP.z, aP.w, s0), u1 = mix(aP.z, aP.w, s1);
  vec2 sa = ca.xy / ca.w * uRes * .5, sb = cb.xy / cb.w * uRes * .5;
  vec2 dir = sb - sa; float len = length(dir); dir = len > 1e-4 ? dir / len : vec2(1., 0.);
  vec2 nrm = vec2(-dir.y, dir.x);
  float hw = aP.x * .5 * uRes.y / 1080.;       // half-width in pixels
  float px = max(hw, .6), q = px + 1.;         // hairlines stay .6 px wide and print lighter instead; 1 px margin for AA
  float along = position.x;
  vec2 sp = mix(sa, sb, along) + dir * (along * 2. - 1.) * q + nrm * position.y * q;
  vec4 c = mix(ca, cb, along);
  gl_Position = vec4(sp / (uRes * .5) * c.w, c.z, c.w);
  vCol = aCol * aP.y * min(1., hw / .6);
  vQ = vec2((along * 2. - 1.) * (len * .5 + q), position.y * q);
  vL = len * .5; vPx = px;
  vU = mix(u0, u1, along); vD = aD;
}`;
var LINE_FRAG = `
in vec3 vCol; in vec2 vQ; in float vU, vL, vPx; in vec2 vD; out vec4 o;
void main() {
  if (vD.x > 0. && fract(vU / vD.x) > vD.y) discard;
  float dx = max(abs(vQ.x) - vL, 0.), d = length(vec2(dx, vQ.y));   // pixels from the segment (round caps)
  float a = clamp(vPx + .5 - d, 0., 1.);
  if (a <= 0.) discard;
  o = vec4(vCol * a, 1.);
}`;
/** Crisp anti-aliased strokes in ink (no glow), with optional dashes. Same calling pattern as GlowLines. */
var InkLines = class {
	constructor(max = 16384) {
		this.max = max;
		const g = new InstancedBufferGeometry();
		g.setAttribute("position", new Float32BufferAttribute([
			0,
			-1,
			0,
			1,
			-1,
			0,
			1,
			1,
			0,
			0,
			1,
			0
		], 3));
		g.setIndex([
			0,
			1,
			2,
			0,
			2,
			3
		]);
		const attr = (n) => new InstancedBufferAttribute(new Float32Array(max * n), n).setUsage(DynamicDrawUsage);
		this.aA = attr(3);
		this.aB = attr(3);
		this.aCol = attr(3);
		this.aP = attr(4);
		this.aD = attr(2);
		for (const k of [
			"aA",
			"aB",
			"aCol",
			"aP",
			"aD"
		]) g.setAttribute(k, this[k]);
		this.material = shaderMaterial({
			vertex: LINE_VERT,
			fragment: LINE_FRAG,
			transparent: true,
			depthWrite: false,
			depthTest: false,
			...MAX_BLEND,
			uniforms: { uRes: { value: new Vector2(1920, 1080) } }
		});
		this.mesh = new Mesh(g, this.material);
		this.mesh.frustumCulled = false;
		this.n = 0;
	}
	begin() {
		this.n = 0;
		return this;
	}
	/** o: ink [k, s1, s2] densities, width (design px), dash [period, on-fraction] (world units along the stroke), u0/u1. */
	segment(a, b, o = {}) {
		if (this.n >= this.max) return this;
		const i = this.n++, c = o.ink ?? K, d = o.dash ?? [0, 1];
		this.aA.array.set([
			a[0],
			a[1],
			a[2] ?? 0
		], i * 3);
		this.aB.array.set([
			b[0],
			b[1],
			b[2] ?? 0
		], i * 3);
		const u0 = o.u0 ?? 0, u1 = o.u1 ?? u0 + Math.hypot(b[0] - a[0], b[1] - a[1], (b[2] ?? 0) - (a[2] ?? 0));
		this.aCol.array.set(c, i * 3);
		this.aP.array.set([
			o.width ?? 3,
			o.density ?? 1,
			u0,
			u1
		], i * 4);
		this.aD.array.set(d, i * 2);
		return this;
	}
	/** A dot of diameter `width`. */
	dot(p, o = {}) {
		return this.segment(p, p, {
			width: 10,
			...o
		});
	}
	/** Connected points; `draw` 0..1 inks the line progressively along its length; dashes run continuously along it. */
	polyline(pts, o = {}) {
		let total = 0;
		const acc = [0];
		for (let i = 1; i < pts.length; i++) {
			total += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1], (pts[i][2] ?? 0) - (pts[i - 1][2] ?? 0));
			acc.push(total);
		}
		const lim = (o.draw ?? 1) * total;
		for (let i = 1; i < pts.length; i++) {
			if (acc[i - 1] >= lim) break;
			let b = pts[i], u1 = acc[i];
			if (acc[i] > lim) {
				const k = (lim - acc[i - 1]) / (acc[i] - acc[i - 1]);
				b = [
					0,
					1,
					2
				].map((j) => (pts[i - 1][j] ?? 0) + ((pts[i][j] ?? 0) - (pts[i - 1][j] ?? 0)) * k);
				u1 = lim;
			}
			this.segment(pts[i - 1], b, {
				...o,
				u0: acc[i - 1] + (o.phase ?? 0),
				u1: u1 + (o.phase ?? 0)
			});
		}
		return this;
	}
	end(ctx) {
		this.mesh.geometry.instanceCount = this.n;
		for (const a of [
			this.aA,
			this.aB,
			this.aCol,
			this.aP,
			this.aD
		]) {
			a.needsUpdate = true;
			a.clearUpdateRanges?.();
			a.addUpdateRange?.(0, this.n * a.itemSize);
		}
		return this.res(ctx.W, ctx.H);
	}
	res(w, h) {
		this.material.uniforms.uRes.value.set(w, h);
		return this;
	}
};
var InkFills = class {
	constructor(maxTris = 8192) {
		this.max = maxTris;
		this.n = 0;
		const g = new BufferGeometry();
		this.pos = new BufferAttribute(new Float32Array(maxTris * 9), 3).setUsage(DynamicDrawUsage);
		this.col = new BufferAttribute(new Float32Array(maxTris * 9), 3).setUsage(DynamicDrawUsage);
		g.setAttribute("position", this.pos);
		g.setAttribute("aCol", this.col);
		this.material = shaderMaterial({
			vertex: `in vec3 aCol; out vec3 vCol; void main() { vCol = aCol; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`,
			fragment: `in vec3 vCol; out vec4 o; void main() { o = vec4(vCol, 1.); }`,
			transparent: true,
			depthWrite: false,
			depthTest: false,
			side: 2,
			...MAX_BLEND
		});
		this.mesh = new Mesh(g, this.material);
		this.mesh.frustumCulled = false;
	}
	begin() {
		this.n = 0;
		return this;
	}
	tri(a, b, c, ink) {
		if (this.n >= this.max) return this;
		const i = this.n++;
		const P = (p) => [
			p[0],
			p[1],
			p[2] ?? 0
		];
		this.pos.array.set([
			...P(a),
			...P(b),
			...P(c)
		], i * 9);
		this.col.array.set([
			...ink,
			...ink,
			...ink
		], i * 9);
		return this;
	}
	/** A convex polygon (or a sector) as a triangle fan around its first point. */
	fan(pts, ink) {
		for (let i = 1; i + 1 < pts.length; i++) this.tri(pts[0], pts[i], pts[i + 1], ink);
		return this;
	}
	quad(a, b, c, d, ink) {
		return this.tri(a, b, c, ink).tri(a, c, d, ink);
	}
	end() {
		this.mesh.geometry.setDrawRange(0, this.n * 3);
		for (const a of [this.pos, this.col]) {
			a.needsUpdate = true;
			a.clearUpdateRanges?.();
			a.addUpdateRange?.(0, this.n * 9);
		}
		return this;
	}
};
var PRESS = `
uniform sampler2D tInk; uniform vec2 uRes; uniform vec3 uPaper, uK, uA, uB, uC; uniform float uSeed, uReg, uTooth;
in vec2 vUv; out vec4 o;
vec3 plate(vec2 uv) { vec3 d = clamp(texture(tInk, uv).rgb, 0., 1.); return d - min(d.r, min(d.g, d.b)); }
void main() {
  vec2 q = vUv * vec2(1920., 1080.), e = uReg / vec2(1920., 1080.);
  vec3 d0 = clamp(texture(tInk, vUv).rgb, 0., 1.);
  float k = min(d0.r, min(d0.g, d0.b));                          // under-colour removal: the shared part prints black
  float r = plate(vUv - e * vec2(1., .55)).r;                    // the colour plates sit a hair off register
  float y = plate(vUv + e * vec2(.6, 1.)).g;
  float b = plate(vUv + e * vec2(-.4, .8)).b;
  // the sheet: long fibres, a fine tooth and a soft mottle, fixed per page (on the design grid: any render size)
  float fib = snoise(vec3(q * vec2(.009, .085), uSeed)), tooth = snoise(vec3(q * .42, uSeed + 3.1)), mot = snoise(vec3(q * .0035, uSeed + 7.7));
  vec3 paper = uPaper * (1. + .010 * fib + .008 * tooth + .022 * mot);
  float t = 1. - uTooth * (.5 + .5 * tooth);                   // ink misses the paper's tooth a little on solids
  vec3 c = paper * mix(vec3(1.), uK, k * t) * mix(vec3(1.), uA, r * t) * mix(vec3(1.), uB, y * t) * mix(vec3(1.), uC, b * t);
  o = vec4(c, 1.);
}`;
var PRESS_M = null;
function pressMaterial() {
	return PRESS_M ??= fsMaterial(PRESS, {
		tInk: { value: null },
		uRes: { value: new Vector2() },
		uPaper: { value: new Vector3() },
		uK: { value: new Vector3() },
		uA: { value: new Vector3() },
		uB: { value: new Vector3() },
		uC: { value: new Vector3() },
		uSeed: { value: 0 },
		uReg: { value: .7 },
		uTooth: { value: .08 }
	});
}
var lin = (hex) => linearRGB(hex);
/** Transmittance of an ink over the paper: printing it at full density on the page shows exactly its sRGB colour. */
var trans = (hex) => {
	const p = lin(PAPER);
	return lin(hex).map((v, i) => Math.min(1, v / p[i]));
};
/** Print the ink target onto paper into the shot. o: seed (page texture), reg (misregistration, design px), tooth (0..1), paper (hex). */
function press(ctx, tex, o = {}) {
	const m = pressMaterial(), u = m.uniforms;
	u.tInk.value = tex;
	u.uRes.value.set(ctx.W, ctx.H);
	u.uPaper.value.set(...lin(o.paper ?? "#f2ede2"));
	u.uK.value.set(...trans(INK.K));
	u.uA.value.set(...trans(INK.red));
	u.uB.value.set(...trans(INK.yellow));
	u.uC.value.set(...trans(INK.blue));
	u.uSeed.value = o.seed ?? 1;
	u.uReg.value = o.reg ?? .7;
	u.uTooth.value = o.tooth ?? .08;
	ctx.pass(m);
}
/** The grade for a printed plate: display-referred (no tone curve), no bloom or aberration, a soft light falloff. */
function paperLook(ctx, o = {}) {
	Object.assign(ctx.post, {
		tonemap: 2,
		bloom: 0,
		threshold: 1,
		ca: 0,
		vignette: .2,
		grain: .022,
		exposure: 1,
		sat: 1,
		contrast: 1,
		...o
	});
}
var SERIF = "STIX Two Text";
var st = (o, d = {}) => ({
	font: SERIF,
	size: 22,
	weight: 400,
	color: INK.K,
	align: "center",
	...d,
	...o
});
/** Set text in the book face (italic for variables). */
function type(L, s, x, y, o = {}) {
	L.text(s, x, y, st(o));
}
/** A math label: italic serif. */
function label(L, s, x, y, o = {}) {
	L.text(s, x, y, st({
		italic: true,
		size: 26,
		...o
	}));
}
/** A filled arrowhead with its tip at (x, y), pointing along angle a (radians, design space). */
function arrowhead(g, x, y, a, len = 17, half = 4.6) {
	const c = Math.cos(a), s = Math.sin(a);
	g.beginPath();
	g.moveTo(x, y);
	g.lineTo(x - c * len - s * half, y - s * len + c * half);
	g.lineTo(x - c * len + s * half, y - s * len - c * half);
	g.closePath();
	g.fill();
}
/**
* A print dimension: extension lines from the measured points a, b (design coords), offset along the normal by
* `offset` px, a dimension line with filled arrowheads, and the text centred in a gap (gap: true) or above it.
* o: offset, text (style), color, lw, draw (0..1, grows from the middle), alpha, gap, textAlpha, rot (keep text level).
*/
function dimension(L, a, b, text, o = {}) {
	const col = o.color ?? INK.K, off = o.offset ?? 40, k = o.draw ?? 1, al = o.alpha ?? 1;
	const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy) || 1, ux = dx / len, uy = dy / len, nx = -uy, ny = ux;
	const A = [a[0] + nx * off, a[1] + ny * off], B = [b[0] + nx * off, b[1] + ny * off], M = [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2];
	const half = len / 2 * k, P = [M[0] - ux * half, M[1] - uy * half], Q = [M[0] + ux * half, M[1] + uy * half];
	const tw = text && o.gap ? L.measure(text, st(o.text, {
		italic: true,
		size: 24
	})) / 2 + 12 : 0;
	L.draw((g) => {
		g.globalAlpha *= al;
		g.strokeStyle = col;
		g.fillStyle = col;
		g.lineWidth = o.lw ?? 1.3;
		g.lineCap = "butt";
		const sg = Math.sign(off) || 1, e0 = 7, e1 = 9;
		g.beginPath();
		if (o.ext !== false) for (const [p, E] of [[a, A], [b, B]]) {
			g.moveTo(p[0] + nx * e0 * sg, p[1] + ny * e0 * sg);
			g.lineTo(E[0] + nx * e1 * sg, E[1] + ny * e1 * sg);
		}
		if (tw > 0 && half > tw) {
			g.moveTo(...P);
			g.lineTo(M[0] - ux * tw, M[1] - uy * tw);
			g.moveTo(M[0] + ux * tw, M[1] + uy * tw);
			g.lineTo(...Q);
		} else if (!(tw > 0)) {
			g.moveTo(...P);
			g.lineTo(...Q);
		}
		g.stroke();
		if (k > .98) {
			arrowhead(g, P[0], P[1], Math.atan2(-uy, -ux), o.head ?? 16, (o.head ?? 16) * .27);
			arrowhead(g, Q[0], Q[1], Math.atan2(uy, ux), o.head ?? 16, (o.head ?? 16) * .27);
		}
	});
	if (text && k > .5) {
		const ang = Math.atan2(uy, ux), up = Math.abs(ang) > Math.PI / 2 + .001 ? ang + Math.PI : ang, lift = o.gap ? 0 : -(o.lift ?? 17);
		L.text(text, M[0] + Math.sin(up) * -lift, M[1] + Math.cos(up) * lift, st({
			italic: true,
			size: 24,
			color: col,
			rot: o.level ? 0 : up,
			alpha: al * (o.textAlpha ?? 1),
			...o.text
		}));
	}
}
/** A plate caption: "FIG. n" in spaced capitals, then the text in italic (x, y: left or right end per align). */
function caption(L, x, y, num, text, o = {}) {
	const al = o.alpha ?? 1, size = o.size ?? 19, right = (o.align ?? "right") === "right";
	const head = `${o.head ?? "Fig."} ${num}.`, hs = st({
		size: size * .86,
		weight: 600,
		tracking: 1.5,
		align: "left",
		color: o.color ?? INK.K,
		alpha: al
	});
	const ts = st({
		size,
		italic: true,
		align: "left",
		color: o.color ?? INK.K,
		alpha: al
	});
	const hw = L.measure(head, hs), gap = size * .6, tw = L.measure(text, ts), x0 = right ? x - hw - gap - tw : x;
	L.text(head, x0, y, hs);
	L.text(text, x0 + hw + gap, y, ts);
}
/** Leader-line note in print style: a dot at p, a straight leader, the text at its end. */
function note(L, p, text, o = {}) {
	const col = o.color ?? INK.K, dx = o.dx ?? 60, dy = o.dy ?? -40, e = [p[0] + dx, p[1] + dy], al = o.alpha ?? 1;
	L.draw((g) => {
		g.globalAlpha *= al;
		g.strokeStyle = col;
		g.fillStyle = col;
		g.lineWidth = 1.2;
		g.beginPath();
		g.moveTo(p[0] + dx * .08, p[1] + dy * .08);
		g.lineTo(...e);
		g.lineTo(e[0] + (dx >= 0 ? 14 : -14), e[1]);
		g.stroke();
	});
	L.text(text, e[0] + (dx >= 0 ? 20 : -20), e[1], st({
		italic: true,
		size: 22,
		color: col,
		align: dx >= 0 ? "left" : "right",
		alpha: al,
		...o.text
	}));
}
//#endregion
export { BLU, INK, InkFills, InkLines, K, PAPER, RED, SERIF, YEL, arrowhead, caption, dimension, inkMul, label, note, paperLook, press, type };
