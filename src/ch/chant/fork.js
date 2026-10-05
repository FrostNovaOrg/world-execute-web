import { hash2 } from "../../engine/math.js?v=BJIlRm7-";
import { BufferAttribute, BufferGeometry, Color, Float32BufferAttribute, InstancedBufferAttribute, InstancedBufferGeometry, MathUtils, Mesh, PlaneGeometry, Points, Vector2 } from "../../../vendor/three/build/three.core.js?v=q9f7JKE-";
import { shaderMaterial } from "../../engine/gpu.js?v=o4BYX3o1";
/** Split axis of level j (1-based): 0 = x, 1 = y, 2 = z. */
var axisOf = (j) => (j - 1) % 3;
/** Half-length of the level-j segment (distance from a node to each child). */
var lenOf = (j) => 1 * 2 ** -Math.floor((j - 1) / 3);
/** PATH[d] = path length from the root to any node of depth d (the same for every node: zero skew). */
var PATH = [0];
for (let j = 1; j <= 12; j++) PATH.push(PATH[j - 1] + lenOf(j));
var depthOf = (n) => 31 - Math.clz32(n);
/** Position of heap node n (1 = root = the cursor). */
function nodePos(n) {
	const d = depthOf(n), p = [
		0,
		0,
		0
	];
	for (let j = 1; j <= d; j++) p[axisOf(j)] += (n >> d - j & 1 ? 1 : -1) * lenOf(j);
	return p;
}
/**
* Centre of the process whose path is `bits` (bit j−1 = branch at level j) at continuous generation G, as the
* particles see it (ignoring each particle's stagger).
*/
function procPos(bits, G) {
	const kf = Math.min(Math.floor(G), 12), s = G - kf, p = [
		0,
		0,
		0
	];
	for (let j = 1; j <= 12; j++) {
		const w = j <= kf ? 1 : j === kf + 1 ? s : 0;
		if (w) p[axisOf(j)] += (bits >> j - 1 & 1 ? 1 : -1) * lenOf(j) * w;
	}
	return p;
}
/** Heap index (PID) of the process with path `bits` at integer generation k. */
function pidOf(bits, k) {
	let n = 1;
	for (let j = 1; j <= k; j++) n = 2 * n + (bits >> j - 1 & 1);
	return n;
}
var GLSL_TREE = `
vec3 axisVec(int j) { int a = (j - 1) % 3; return a == 0 ? vec3(1., 0., 0.) : (a == 1 ? vec3(0., 1., 0.) : vec3(0., 0., 1.)); }
float lenL(int j) { return ${1 .toFixed(1)} * exp2(-float((j - 1) / 3)); }
vec3 rotAxis(vec3 v, vec3 k, float a) { float c = cos(a), s = sin(a); return v * c + cross(k, v) * s + k * dot(k, v) * (1. - c); }
`;
var LINE_VERT = `
${GLSL_TREE}
in vec3 aA, aB; in vec4 aI;                 // parent, child, (level j, child node id, random, path length at parent)
uniform vec2 uRes;
uniform float uG, uGrowK, uW0, uW1, uWS, uBoom, uLevelMax, uBright, uHiNode, uHiGain, uLoGain, uHiPath, uFade, uLvlDim;
uniform float uFocus, uAperture, uFocalPx, uMaxBlur, uOrtho;
uniform vec2 uNear, uFog;                   // fade near the lens (start, end); depth fog (start, rate)
uniform float uGain[12], uHeat[12];
uniform vec3 uCol, uColHot;
out vec3 vCol; out vec2 vQ; out float vW, vS, vBlur, vLen, vPk, vAlong;
void main() {
  int j = int(aI.x + .5);
  float g = uG - float(j - 1), f = clamp(g / uGrowK, 0., 1.);
  vS = aI.w; vCol = vec3(0.); vQ = vec2(0.); vW = 0.; vBlur = 0.; vLen = 1.; vPk = 0.; vAlong = 0.;
  if (g <= 0. || float(j) > uLevelMax + .5) { gl_Position = vec4(0., 0., 2., 1.); return; }
  vec3 pa = aA, pb = mix(aA, aB, f);
  float segLen = length(aB - aA) * f;
  float boomK = 1.;
  if (uBoom > 0.) {
    // detonation: every branch turns into a radial ray (a streak between where it was a moment ago and where it is),
    // flying out from the centre and decelerating; thin rays with dark gaps, not a fill
    vec3 mid = (pa + pb) * .5, h = hash31(aI.y * 1.37 + 2.1);
    vec3 dir = normalize(mid + (h - .5) * .3 + vec3(1e-3, 2e-3, 3e-3));
    float speed = 7. * (.5 + .9 * h.x), K = 2.4, lag = .05 + .09 * h.y; // radius-independent: the cube becomes a sphere
    float d1 = speed * (1. - exp(-uBoom * K)) / K, d0 = speed * (1. - exp(-max(uBoom - lag, 0.) * K)) / K;
    float k = smoothstep(0., .07, uBoom), r0 = length(mid) * .3;
    pa = mix(pa, dir * (r0 + d0), k); pb = mix(pb, dir * (r0 + d1), k);
    boomK = mix(1., .22 + .78 * step(.75, h.z), k); // one ray in four stays bright
  }
  vec4 va = modelViewMatrix * vec4(pa, 1.), vb = modelViewMatrix * vec4(pb, 1.);
  const float NZ = -.02; // clip against a near plane so fly-through shots never flip a segment
  if (va.z > NZ && vb.z > NZ) { gl_Position = vec4(0., 0., 2., 1.); return; }
  float sa = aI.w, sb = aI.w + segLen;
  if (va.z > NZ) { float k = (va.z - NZ) / (va.z - vb.z); va = mix(va, vb, k); sa = mix(sa, sb, k); }
  if (vb.z > NZ) { float k = (vb.z - NZ) / (vb.z - va.z); vb = mix(vb, va, k); sb = mix(sb, sa, k); }
  vec4 ca = projectionMatrix * va, cb = projectionMatrix * vb;
  vec2 s0 = ca.xy / ca.w * uRes * .5, s1 = cb.xy / cb.w * uRes * .5;
  vec2 dir = s1 - s0; float len = length(dir); dir = len > 1e-4 ? dir / len : vec2(1., 0.);
  vec2 nrm = vec2(-dir.y, dir.x);
  // depth of field for lines: each end widens by its circle of confusion; the light spreads (energy is conserved)
  float lv = float(j - 1) / 11., wb = mix(uW0, uW1, lv) * uWS * uRes.y / 1080., ba = 0., bb = 0.;
  if (uAperture > 0.) {
    float da = max(-va.z, 1e-3), db = max(-vb.z, 1e-3);
    ba = min(uAperture * abs(da - uFocus) * (uOrtho > .5 ? 1. : 1. / da) * uFocalPx, uMaxBlur);
    bb = min(uAperture * abs(db - uFocus) * (uOrtho > .5 ? 1. : 1. / db) * uFocalPx, uMaxBlur);
  }
  float along = position.x, blur = mix(ba, bb, along), w = wb + blur;
  vBlur = blur / w;
  float dv = max(-mix(va.z, vb.z, along), 1e-3);
  float depthK = (uNear.y > uNear.x ? smoothstep(uNear.x, uNear.y, dv) : 1.) * exp(-max(dv - uFog.x, 0.) * uFog.y);
  vLen = lenL(j); vPk = exp2(-float(j) * .3); vAlong = along;
  vec2 sp = mix(s0, s1, along) + dir * (along * 2. - 1.) * w + nrm * position.y * w;
  vec4 c = mix(ca, cb, along);
  gl_Position = vec4(sp / (uRes * .5) * c.w, c.z, c.w);
  vQ = vec2((along * 2. - 1.) * (len * .5 + w) / max(w, 1e-3), position.y); vW = len * .5 / max(w, 1e-3);
  vS = mix(sa, sb, along);
  float heat = uHeat[j - 1];
  vec3 col = mix(uCol, uColHot, heat) * (1. + .35 * heat); // newborn branches are white-hot, then cool
  float hi = 1.;
  if (uHiNode > .5) { // a subtree (and the path from the root to it)
    float dH = floor(log2(uHiNode) + 1e-4), dm = float(j);
    bool below = dm >= dH && floor(aI.y / exp2(dm - dH) + 1e-4) == uHiNode;
    bool above = uHiPath > .5 && dm < dH && floor(uHiNode / exp2(dH - dm) + 1e-4) == aI.y;
    hi = below || above ? uHiGain : uLoGain;
  }
  float e = wb / w;
  vCol = col * uBright * uGain[j - 1] * hi * uFade * mix(1., uLvlDim, lv) * e * e * boomK * depthK; // defocus fades a line
}`;
var LINE_FRAG = `
uniform float uCore, uPulse, uPulseW, uCharge, uChargeW, uBoomOn;
uniform vec3 uPulseCol, uChargeCol;
in vec3 vCol; in vec2 vQ; in float vW, vS, vBlur, vLen, vPk, vAlong; out vec4 o;
void main() {
  float dx = max(abs(vQ.x) - vW, 0.), d = length(vec2(dx, vQ.y));
  float cw = mix(uCore, .92, smoothstep(0., .7, vBlur)); // a defocused line is a soft flat band
  float core = 1. - smoothstep(cw * .6, cw, d), halo = exp(-d * d * 5.) * .35 * (1. - vBlur);
  float edge = 1. - smoothstep(.85, 1., d);
  vec3 col = vCol;
  if (uPulseW > 0.) col += uPulseCol * vPk * exp(-pow((vS - uPulse) / (uPulseW * vLen), 2.)); // the clock edge (finer, dimmer deeper down)
  if (uChargeW > 0.) { // armed part of the tree: recoloured white at (about) the same luminance, so arming never flashes
    float ch = 1. - smoothstep(uCharge - uChargeW, uCharge, vS), Y = dot(col, vec3(.2126, .7152, .0722));
    col = mix(col, uChargeCol * Y, ch);
  }
  if (uBoomOn > .5) col *= mix(vec3(1., .16, .1), vec3(1.1), vAlong * vAlong); // rays: white head, red tail
  o = vec4(col * (core * 1.6 + halo) * edge, 1.);
}`;
var ForkLines = class {
	constructor() {
		const n = 8190;
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
		const aA = new Float32Array(n * 3), aB = new Float32Array(n * 3), aI = new Float32Array(n * 4);
		for (let i = 0; i < n; i++) {
			const m = i + 2, j = depthOf(m);
			aA.set(nodePos(m >> 1), i * 3);
			aB.set(nodePos(m), i * 3);
			aI.set([
				j,
				m,
				hash2(m, 146),
				PATH[j - 1]
			], i * 4);
		}
		g.setAttribute("aA", new InstancedBufferAttribute(aA, 3));
		g.setAttribute("aB", new InstancedBufferAttribute(aB, 3));
		g.setAttribute("aI", new InstancedBufferAttribute(aI, 4));
		g.instanceCount = n;
		const u = {
			uRes: { value: new Vector2(1920, 1080) },
			uG: { value: 0 },
			uGrowK: { value: .65 },
			uW0: { value: 3.4 },
			uW1: { value: 1.5 },
			uWS: { value: 1 },
			uBoom: { value: 0 },
			uLevelMax: { value: 12 },
			uBright: { value: 1 },
			uHiNode: { value: 0 },
			uHiGain: { value: 1 },
			uLoGain: { value: 1 },
			uHiPath: { value: 0 },
			uFade: { value: 1 },
			uLvlDim: { value: 1 },
			uFocus: { value: 5 },
			uAperture: { value: 0 },
			uFocalPx: { value: 1e3 },
			uMaxBlur: { value: 40 },
			uOrtho: { value: 0 },
			uNear: { value: new Vector2(0, 0) },
			uFog: { value: new Vector2(1e3, 0) },
			uGain: { value: new Array(12).fill(1) },
			uHeat: { value: new Array(12).fill(0) },
			uCol: { value: new Color() },
			uColHot: { value: new Color() },
			uCore: { value: .3 },
			uPulse: { value: 0 },
			uPulseW: { value: 0 },
			uCharge: { value: 0 },
			uChargeW: { value: 0 },
			uBoomOn: { value: 0 },
			uPulseCol: { value: new Color() },
			uChargeCol: { value: new Color() }
		};
		this.material = shaderMaterial({
			vertex: LINE_VERT,
			fragment: LINE_FRAG,
			uniforms: u,
			transparent: true,
			depthWrite: false,
			depthTest: true,
			blending: 2
		});
		this.mesh = new Mesh(g, this.material);
		this.mesh.frustumCulled = false;
	}
	/** Per frame / per viewport (H = viewport height in pixels). o: G, grow, w0, w1, ws (widths, design px), boom,
	*  levelMax, bright, hiNode, hiGain, loGain, hiPath, fade, lvlDim, gain[12], heat[12], col, colHot, pulse, pulseW,
	*  pulseCol, charge, chargeW, chargeCol, focus, aperture, maxBlur (design px), near, fog. */
	set(o, camera, H) {
		const u = this.material.uniforms;
		u.uOrtho.value = camera.isOrthographicCamera ? 1 : 0;
		u.uFocalPx.value = camera.isPerspectiveCamera ? H / 2 / Math.tan(MathUtils.degToRad(camera.fov) / 2) : H * camera.zoom / (camera.top - camera.bottom);
		u.uFocus.value = o.focus ?? 5;
		u.uAperture.value = o.aperture ?? 0;
		u.uMaxBlur.value = (o.maxBlur ?? 40) * H / 1080;
		u.uLvlDim.value = o.lvlDim ?? 1;
		u.uNear.value.set(...o.near ?? [0, 0]);
		u.uFog.value.set(...o.fog ?? [1e3, 0]);
		u.uG.value = o.G;
		u.uGrowK.value = o.grow ?? .65;
		u.uW0.value = o.w0 ?? 3.4;
		u.uW1.value = o.w1 ?? 1.5;
		u.uWS.value = o.ws ?? 1;
		u.uBoom.value = o.boom ?? 0;
		u.uBoomOn.value = (o.boom ?? 0) > 0 ? 1 : 0;
		u.uLevelMax.value = o.levelMax ?? 12;
		u.uBright.value = o.bright ?? 1;
		u.uHiNode.value = o.hiNode ?? 0;
		u.uHiGain.value = o.hiGain ?? 1;
		u.uLoGain.value = o.loGain ?? 1;
		u.uHiPath.value = o.hiPath ? 1 : 0;
		u.uFade.value = o.fade ?? 1;
		u.uGain.value = o.gain ?? new Array(12).fill(1);
		u.uHeat.value = o.heat ?? new Array(12).fill(0);
		u.uCol.value.setRGB(...o.col);
		u.uColHot.value.setRGB(...o.colHot);
		u.uPulse.value = o.pulse ?? 0;
		u.uPulseW.value = o.pulseW ?? 0;
		u.uPulseCol.value.setRGB(...o.pulseCol ?? [
			1,
			1,
			1
		]);
		u.uCharge.value = o.charge ?? 0;
		u.uChargeW.value = o.chargeW ?? 0;
		u.uChargeCol.value.setRGB(...o.chargeCol ?? [
			1,
			1,
			1
		]);
		return this;
	}
	res(w, h) {
		this.material.uniforms.uRes.value.set(w, h);
		return this;
	}
};
var SWARM_VERT = `
${GLSL_TREE}
uniform float uG, uRho, uStagger, uArc, uCursor, uCursorW, uBoom, uT, uWobble;
uniform float uSize, uFocal, uMinPx, uOrtho, uFocus, uAperture, uMaxBlur, uBright, uSparkle, uGain, uFlash, uLit, uFade, uNuc;
uniform float uHiNode, uHiGain, uLoGain;
uniform vec2 uNear, uFog;
uniform vec3 uMemb, uNucl, uColHot;
uniform int uPre, uPreLen; // level of detail: a swarm pinned to one path prefix (a single process in close-up)
out vec3 vCol; out float vBlur;
int bitL(int id, int j) { return j <= uPreLen ? (uPre >> (j - 1)) & 1 : (id >> (j - 1 - uPreLen)) & 1; }
float sgnL(int id, int j) { return float(bitL(id, j) * 2 - 1); }
vec3 fold(vec3 q, int id, int j) { if (j > 12) return q; vec3 e = axisVec(j); float c = dot(q, e); return q + e * (sgnL(id, j) * abs(c) - c); }
vec3 cell(float fi) { // one process: a membrane shell around a denser nucleus
  vec3 h = hash31(fi * 1.618 + .5); float h2 = hash11(fi * .731 + 1.7);
  float u = h.x * 2. - 1., a = h.y * TAU, q = sqrt(max(0., 1. - u * u));
  float r = h2 < .62 ? mix(.86, 1., h.z) : pow(h.z, .7) * .5;
  return vec3(q * cos(a), u, q * sin(a)) * r;
}
bool nucleus(float fi) { return hash11(fi * .731 + 1.7) >= .62; }
void main() {
  int id = gl_VertexID; float fi = float(id);
  float G = clamp(uG, 0., 12.);
  int kf = min(int(floor(G)), 12); float s = G - float(kf);
  float dly = hash11(fi * .37 + 5.1) * uStagger;
  float si = clamp((s - dly) / max(1. - uStagger, 1e-3), 0., 1.); // this particle's own progress through the split
  vec3 c = vec3(0.);
  for (int j = 1; j <= 12; j++) {
    float w = j <= kf ? 1. : (j == kf + 1 ? si : 0.);
    c += axisVec(j) * sgnL(id, j) * lenL(j) * w;
  }
  // local shape: the parent cell's half that belongs to each child (folded by the next bit) flows into the child cell
  vec3 q = cell(fi);
  q += sin(uT * (1.1 + 1.7 * hash31(fi * .19)) + hash31(fi * .77) * TAU) * uWobble;
  float r0 = uRho * exp2(-float(kf) / 3.), r1 = uRho * exp2(-float(kf + 1) / 3.);
  vec3 la = fold(q, id, kf + 1) * r0;
  if (kf == 0) { // generation 0 is the terminal cursor: a thin bar
    vec3 h = hash31(fi * 2.17 + 3.3) * 2. - 1.;
    la = mix(la, fold(vec3(h.x * uCursorW, h.y * uCursorW * .1, h.z * uCursorW * .1), id, 1), uCursor);
  }
  vec3 lb = fold(q, id, kf + 2) * r1;
  vec3 p = c + (kf < 12 ? mix(la, lb, si) : q * r0);
  if (kf < 12) p += normalize(hash31(fi * 5.3 + 1.1) - .5 + 1e-4) * sin(PI * si) * uArc * lenL(kf + 1);
  float boomK = 1.;
  if (uBoom > 0.) {
    // sparks: every process bursts radially; one particle in eight stays bright, the rest fade fast
    vec3 hb = hash31(fi * 4.7 + .3);
    vec3 dir = normalize(normalize(p + 1e-4) + (hb - .5) * .5);
    float speed = 6.5 * (.4 + 1.2 * hb.y);
    p = mix(p, dir * length(p) * .3, smoothstep(0., .08, uBoom)) + dir * speed * (1. - exp(-uBoom * 2.2)) / 2.2;
    boomK = hb.z > .9 ? 1.6 : exp(-uBoom * 9.); // one particle in ten survives as a spark
  }
  vec4 mv = modelViewMatrix * vec4(p, 1.);
  gl_Position = projectionMatrix * mv;
  float dist = max(-mv.z, 1e-3);
  float persp = uOrtho > .5 ? 1. : 1. / dist;
  float px = uSize * uFocal * persp;
  float core = max(px, uMinPx);
  float blur = uAperture > 0. ? min(uAperture * abs(dist - uFocus) * persp * uFocal, uMaxBlur) : 0.;
  float sz = core + blur;
  float energy = min(1., (px * px) / (uMinPx * uMinPx)) * (core * core) / (sz * sz);
  gl_PointSize = sz;
  vBlur = blur / sz;
  float hh = hash11(fi * 1.31);
  // membrane: me's cyan turning red; nucleus: pale cyan turning white-hot
  bool nuc = nucleus(fi);
  vec3 col = mix(nuc ? uNucl : uMemb, uColHot, clamp(uFlash, 0., 1.));
  // armed (lit): recoloured white at the same luminance, so arming never brightens the frame
  vec3 lw = vec3(.2126, .7152, .0722);
  col = mix(col, uColHot * dot(col, lw) / dot(uColHot, lw) * 1.15, clamp(uLit, 0., 1.));
  float hi = 1.;
  if (uHiNode > .5) { // highlight one subtree (by the PID prefix of this particle's path)
    float dH = floor(log2(uHiNode) + 1e-4), n = 1.;
    for (int j = 1; j <= 12; j++) if (float(j) <= dH) n = n * 2. + float(bitL(id, j));
    hi = n == uHiNode ? uHiGain : uLoGain;
  }
  float tw = 1. + uSparkle * (hash11(fi + floor(uT * 12.) * 7.13) - .5) * 2.;
  float depthK = (uNear.y > uNear.x ? smoothstep(uNear.x, uNear.y, dist) : 1.) * exp(-max(dist - uFog.x, 0.) * uFog.y);
  vCol = col * uBright * uGain * energy * (.55 + .9 * hh) * max(tw, 0.) * hi * uFade * boomK * (nuc ? uNuc : 1.) * depthK;
}`;
var SWARM_FRAG = `
in vec3 vCol; in float vBlur; out vec4 o;
void main() {
  float r = length(gl_PointCoord - .5) * 2.;
  float gauss = exp(-r * r * 4.) * (1. - smoothstep(.8, 1., r));
  float disc = (1. - smoothstep(.86, 1., r)) * (.7 + .3 * smoothstep(.55, .95, r)) * .42;
  o = vec4(vCol * mix(gauss, disc, smoothstep(0., .6, vBlur)), 1.);
}`;
(() => {
	const lines = (GLSL_TREE + SWARM_VERT).split("\n");
	const pick = (re) => lines.find((l) => re.test(l))?.trim();
	const i = lines.findIndex((l) => /for \(int j = 1; j <= 12; j\+\+\) \{/.test(l));
	return [
		pick(/^float lenL/),
		pick(/^float sgnL/),
		...lines.slice(i, i + 4).map((l) => l.replace(/^  /, ""))
	].filter(Boolean);
})();
var ForkSwarm = class {
	constructor(count = 1 << 18) {
		this.N = count;
		const geo = new BufferGeometry();
		geo.setAttribute("position", new BufferAttribute(new Float32Array(count * 3), 3));
		const f = (v) => ({ value: v });
		this.material = shaderMaterial({
			vertex: SWARM_VERT,
			fragment: SWARM_FRAG,
			transparent: true,
			depthWrite: false,
			depthTest: true,
			blending: 2,
			uniforms: {
				uG: f(0),
				uRho: f(.6),
				uStagger: f(.35),
				uArc: f(0),
				uCursor: f(0),
				uCursorW: f(.17),
				uBoom: f(0),
				uT: f(0),
				uWobble: f(0),
				uSize: f(.01),
				uFocal: f(1e3),
				uMinPx: f(1.4),
				uOrtho: f(0),
				uFocus: f(5),
				uAperture: f(0),
				uMaxBlur: f(60),
				uBright: f(1),
				uSparkle: f(0),
				uGain: f(1),
				uFlash: f(0),
				uLit: f(0),
				uFade: f(1),
				uNuc: f(1),
				uHiNode: f(0),
				uHiGain: f(1),
				uLoGain: f(1),
				uMemb: f(new Color()),
				uNucl: f(new Color()),
				uColHot: f(new Color()),
				uNear: f(new Vector2(0, 0)),
				uFog: f(new Vector2(1e3, 0)),
				uPre: f(0),
				uPreLen: f(0)
			}
		});
		this.points = new Points(geo, this.material);
		this.points.frustumCulled = false;
	}
	/** Per frame / per viewport (H = viewport height in pixels). o: G, rho, stagger, arc, cursor, cursorW, boom, t, wobble,
	*  size (world), minPx, bright, sparkle, gain, flash, lit, fade, nuc, hiNode, hiGain, loGain, memb, nucl, colHot,
	*  focus, aperture, maxBlur (design px), near, fog, pre, preLen (level-of-detail path prefix). */
	set(o, camera, H) {
		const u = this.material.uniforms;
		u.uG.value = o.G;
		u.uRho.value = o.rho ?? .6;
		u.uStagger.value = o.stagger ?? .35;
		u.uArc.value = o.arc ?? 0;
		u.uCursor.value = o.cursor ?? 0;
		u.uCursorW.value = o.cursorW ?? .17;
		u.uBoom.value = o.boom ?? 0;
		u.uT.value = o.t ?? 0;
		u.uWobble.value = o.wobble ?? 0;
		u.uSize.value = o.size ?? .01;
		u.uMinPx.value = (o.minPx ?? 1.4) * H / 1080;
		u.uBright.value = o.bright ?? 1;
		u.uSparkle.value = o.sparkle ?? 0;
		u.uGain.value = o.gain ?? 1;
		u.uFlash.value = o.flash ?? 0;
		u.uLit.value = o.lit ?? 0;
		u.uFade.value = o.fade ?? 1;
		u.uNuc.value = o.nuc ?? 1;
		u.uHiNode.value = o.hiNode ?? 0;
		u.uHiGain.value = o.hiGain ?? 1;
		u.uLoGain.value = o.loGain ?? 1;
		u.uMemb.value.setRGB(...o.memb);
		u.uNucl.value.setRGB(...o.nucl);
		u.uColHot.value.setRGB(...o.colHot);
		u.uFocus.value = o.focus ?? 5;
		u.uAperture.value = o.aperture ?? 0;
		u.uMaxBlur.value = (o.maxBlur ?? 50) * H / 1080;
		u.uNear.value.set(...o.near ?? [0, 0]);
		u.uFog.value.set(...o.fog ?? [1e3, 0]);
		u.uPre.value = o.pre ?? 0;
		u.uPreLen.value = o.preLen ?? 0;
		u.uOrtho.value = camera.isOrthographicCamera ? 1 : 0;
		u.uFocal.value = camera.isPerspectiveCamera ? H / 2 / Math.tan(MathUtils.degToRad(camera.fov) / 2) : H * camera.zoom / (camera.top - camera.bottom);
		return this;
	}
};
var GRID_VERT = `
out vec3 vW;
void main() { vec4 w = modelMatrix * vec4(position, 1.); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`;
var GRID_FRAG = `
uniform vec3 uCol, uAxisCol; uniform vec2 uOffset; uniform float uMinor, uMajor, uFade, uIntensity, uPlane, uReveal, uRevealR;
in vec3 vW; out vec4 o;
float lines(vec2 p) { vec2 g = abs(fract(p - .5) - .5) / max(fwidth(p), 1e-5); return 1. - min(min(g.x, g.y), 1.); }
void main() {
  vec2 p = (uPlane < .5 ? vW.xz : (uPlane < 1.5 ? vW.xy : vW.zy)) - uOffset;
  float minor = lines(p / uMinor), major = lines(p / uMajor);
  vec2 ax = abs(p) / max(fwidth(p), 1e-5); float axis = 1. - min(min(ax.x, ax.y), 1.);
  float f = exp(-length(vW - cameraPosition) * uFade);
  float rev = 1. - smoothstep(uRevealR * uReveal - .5, uRevealR * uReveal, length(p));
  o = vec4((uCol * (minor * .22 + major * .6) + uAxisCol * axis * 1.2) * f * uIntensity * rev, 1.);
}`;
/** Grid plane 'xz' (floor), 'xy' (wall facing +z) or 'yz' (wall facing +x), its lines shifted by `offset` (so the
*  tree's branches run between grid lines and the final leaves sit on the intersections). userData.set({…}). */
function grid({ plane = "xz", size = 400, color = [
	.42,
	.05,
	.035
], axis = [
	.42,
	.05,
	.035
], minor = .25, major = 1, fade = .07, offset = [0, 0] } = {}) {
	const geo = new PlaneGeometry(size, size);
	if (plane === "xz") geo.rotateX(-Math.PI / 2);
	else if (plane === "yz") geo.rotateY(Math.PI / 2);
	const mesh = new Mesh(geo, shaderMaterial({
		vertex: GRID_VERT,
		fragment: GRID_FRAG,
		transparent: true,
		depthWrite: false,
		blending: 2,
		side: 2,
		uniforms: {
			uCol: { value: new Color(...color) },
			uAxisCol: { value: new Color(...axis) },
			uOffset: { value: new Vector2(...offset) },
			uMinor: { value: minor },
			uMajor: { value: major },
			uFade: { value: fade },
			uIntensity: { value: 1 },
			uPlane: { value: {
				xz: 0,
				xy: 1,
				yz: 2
			}[plane] },
			uReveal: { value: 1 },
			uRevealR: { value: 60 }
		}
	}));
	mesh.frustumCulled = false;
	mesh.userData.set = ({ intensity, reveal, revealR, fade } = {}) => {
		const u = mesh.material.uniforms;
		if (intensity != null) u.uIntensity.value = intensity;
		if (reveal != null) u.uReveal.value = reveal;
		if (revealR != null) u.uRevealR.value = revealR;
		if (fade != null) u.uFade.value = fade;
	};
	return mesh;
}
//#endregion
export { ForkLines, ForkSwarm, PATH, axisOf, depthOf, grid, lenOf, nodePos, pidOf, procPos };
