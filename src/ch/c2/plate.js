import { TAU, rng } from "../../engine/math.js?v=BJIlRm7-";
import { BufferAttribute, BufferGeometry, Color, MathUtils, Points, Vector4 } from "../../../vendor/three/build/three.core.js?v=q9f7JKE-";
import { dataTexture, shaderMaterial } from "../../engine/gpu.js?v=o4BYX3o1";
//#region src/ch/c2/plate.js
var SAND_S = 1024;
var SQRT_D_RHOH = Math.sqrt(69 / (12 * (1 - .33 * .33)) / 2.7);
var UNIT_M = .2;
/** Frequency (Hz) of the square-plate mode (n, m): k² = π²(n² + m²) / a². */
var modeHz = (n, m) => Math.PI ** 2 * (n * n + m * m) / (UNIT_M * UNIT_M) * SQRT_D_RHOH / TAU;
/** J_n(x) = 1/π ∫₀^π cos(nτ − x sin τ) dτ; the midpoint rule is spectrally accurate for this periodic integrand. */
function besselJ(n, x, M = 48) {
	let s = 0;
	for (let k = 0; k < M; k++) {
		const tau = (k + .5) * Math.PI / M;
		s += Math.cos(n * tau - x * Math.sin(tau));
	}
	return s / M;
}
/** The first `count` positive zeros of J_n (scan, then bisection to machine precision). */
function besselZeros(n, count) {
	const out = [], h = .01;
	let x = .5, fx = besselJ(n, x);
	while (out.length < count) {
		const y = x + h, fy = besselJ(n, y);
		if (fx !== 0 && Math.sign(fy) !== Math.sign(fx)) {
			let lo = x, hi = y;
			for (let k = 0; k < 60; k++) {
				const mid = (lo + hi) / 2;
				if (Math.sign(besselJ(n, mid)) === Math.sign(besselJ(n, lo))) lo = mid;
				else hi = mid;
			}
			out.push((lo + hi) / 2);
		}
		x = y;
		fx = fy;
	}
	return out;
}
/** The COMPLETION mode: a clamped disc (membrane) mode with n nodal diameters and s nodal circles (the rim is the last). */
var DISC = (() => {
	const n = 4, s = 5, zeros = besselZeros(n, s), k = zeros[4];
	return {
		n,
		s,
		zeros,
		k,
		rings: zeros.map((z) => z / k),
		rot: -Math.PI / 8,
		hz: k * k / (UNIT_M * UNIT_M) * SQRT_D_RHOH / TAU
	};
})();
var chladni = (n, m) => (x, y) => Math.cos(n * Math.PI * x) * Math.cos(m * Math.PI * y) - Math.cos(m * Math.PI * x) * Math.cos(n * Math.PI * y);
var segCache = /* @__PURE__ */ new Map();
/** Nodal curves f = 0 on [-1, 1]² by marching squares, as [[x, y], [x, y]] segments (cached per key). */
function nodalSegments(key, f, res = 150) {
	if (segCache.has(key)) return segCache.get(key);
	const n = res + 1, h = 2.02 / res, x0 = -1.01 + .37 * h / res, y0 = -1.01 + .61 * h / res, v = new Float32Array(n * n);
	for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) v[j * n + i] = f(x0 + i * h, y0 + j * h);
	const segs = [], cut = (xa, ya, va, xb, yb, vb) => {
		const k = va / (va - vb);
		return [xa + (xb - xa) * k, ya + (yb - ya) * k];
	};
	for (let j = 0; j < res; j++) for (let i = 0; i < res; i++) {
		const a = v[j * n + i], b = v[j * n + i + 1], c = v[(j + 1) * n + i + 1], d = v[(j + 1) * n + i];
		const xa = x0 + i * h, ya = y0 + j * h, xb = xa + h, yb = ya + h, p = [];
		if (a > 0 !== b > 0) p.push(cut(xa, ya, a, xb, ya, b));
		if (b > 0 !== c > 0) p.push(cut(xb, ya, b, xb, yb, c));
		if (c > 0 !== d > 0) p.push(cut(xb, yb, c, xa, yb, d));
		if (d > 0 !== a > 0) p.push(cut(xa, yb, d, xa, ya, a));
		if (p.length === 2) segs.push(p);
		else if (p.length === 4) segs.push([p[0], p[1]], [p[2], p[3]]);
	}
	const inside = segs.filter(([p, q]) => Math.max(Math.abs(p[0]), Math.abs(p[1]), Math.abs(q[0]), Math.abs(q[1])) <= 1);
	segCache.set(key, inside);
	return inside;
}
var extCache = /* @__PURE__ */ new Map();
/** Antinodes: local extrema of f with |f| above 70 % of the peak, as [x, y, sign]. */
function antinodes(key, f, res = 64) {
	if (extCache.has(key)) return extCache.get(key);
	const n = res + 1, v = new Float32Array(n * n), X = (i) => -1 + 2 * i / res;
	let peak = 0;
	for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
		const z = f(X(i), X(j));
		v[j * n + i] = z;
		peak = Math.max(peak, Math.abs(z));
	}
	const out = [];
	for (let j = 1; j < res; j++) for (let i = 1; i < res; i++) {
		const z = v[j * n + i], az = Math.abs(z);
		if (az < .7 * peak) continue;
		let top = true;
		for (let dj = -1; dj <= 1 && top; dj++) for (let di = -1; di <= 1; di++) if ((di || dj) && Math.abs(v[(j + dj) * n + i + di]) > az) {
			top = false;
			break;
		}
		if (top) out.push([
			X(i),
			X(j),
			Math.sign(z)
		]);
	}
	extCache.set(key, out);
	return out;
}
/** Plate outline: the superellipse |x|^p + |y|^p = 1 (p → ∞ square, p = 2 circle), on the plate plane y = 0. */
function plateOutline(p, s = 1.03, n = 256) {
	if (p > 200) return [
		[-1, -1],
		[1, -1],
		[1, 1],
		[-1, 1],
		[-1, -1]
	].map(([x, z]) => [
		x * s,
		0,
		z * s
	]);
	const pts = [];
	for (let i = 0; i <= n; i++) {
		const a = i / n * TAU, c = Math.cos(a), si = Math.sin(a);
		pts.push([
			Math.sign(c) * Math.abs(c) ** (2 / p) * s,
			0,
			Math.sign(si) * Math.abs(si) ** (2 / p) * s
		]);
	}
	return pts;
}
/** Points on the disc distributed like the disc mode's energy density φ² (you, condensing out of the plate). */
function fieldSample(N, seed = 71) {
	const r = rng(seed), out = new Float32Array(N * 4), TAB = 4096, tab = /* @__PURE__ */ new Float32Array(4097);
	for (let i = 0; i <= TAB; i++) tab[i] = besselJ(DISC.n, DISC.k * i / TAB, 40) / .4;
	let n = 0;
	while (n < N) {
		const x = r() * 2 - 1, y = r() * 2 - 1, rr = Math.hypot(x, y);
		if (rr > 1) continue;
		const f = rr * TAB, i = Math.min(4095, Math.floor(f));
		const w = (tab[i] + (tab[i + 1] - tab[i]) * (f - i)) * Math.cos(DISC.n * (Math.atan2(y, x) - DISC.rot));
		if (r() * .9 > w * w) continue;
		out.set([
			x,
			0,
			y,
			r()
		], n * 4);
		n++;
	}
	return out;
}
var wordCache = /* @__PURE__ */ new Map();
/**
* A word poured onto the plate in sand: an S×S texture whose texel (i, j) is where grain (i, j) of the sprinkle grid
* lies inside the letters (x, z in plate units; the word reads left to right from +z, its top toward −z; `tall`
* stretches the letters vertically, like a condensed face). The letters are rasterised once from the film's mono font. Grains are matched to inked pixels by quantiles (grid column ↔ x,
* then row ↔ y within that slice of the word), so the letters are evenly filled and every grain starts close above or
* below its own spot on the plate: when the drive starts, the word stretches apart into the new figure.
*/
function wordGrains(word, S, { width = 1.8, tall = 1.3, z = 0, seed = 17 } = {}) {
	const key = `${word}|${S}|${width}|${tall}|${z}`;
	if (wordCache.has(key)) return wordCache.get(key);
	const c = document.createElement("canvas"), g = c.getContext("2d", { willReadFrequently: true }), size = 240;
	g.font = `800 ${size}px "JetBrains Mono"`;
	const tw = Math.ceil(g.measureText(word).width) + 40, th = 300;
	c.width = tw;
	c.height = th;
	g.font = `800 ${size}px "JetBrains Mono"`;
	g.fillStyle = "#fff";
	g.textAlign = "center";
	g.textBaseline = "middle";
	g.fillText(word, tw / 2, 159.6);
	const px = g.getImageData(0, 0, tw, th).data, inked = [];
	for (let x = 0; x < tw; x++) for (let y = 0; y < th; y++) if (px[(y * tw + x) * 4] > 127) inked.push([x, y]);
	const n = inked.length, k = width / (tw - 40), r = rng(seed), out = new Float32Array(S * S * 4);
	for (let ci = 0; ci < S; ci++) {
		const slice = inked.slice(Math.floor(ci * n / S), Math.max(Math.floor(ci * n / S) + 1, Math.floor((ci + 1) * n / S))).sort((p, q) => p[1] - q[1]);
		for (let cj = 0; cj < S; cj++) {
			const [x, y] = slice[Math.min(slice.length - 1, Math.floor((cj + r()) / S * slice.length))];
			out.set([
				(x + r() - tw / 2) * k,
				(y + r() - th / 2) * k * tall + z,
				0,
				1
			], (cj * S + ci) * 4);
		}
	}
	const tex = dataTexture(out, S, S);
	wordCache.set(key, tex);
	return tex;
}
var CHL = `
float chl(vec2 p, float n, float m) { return cos(n * PI * p.x) * cos(m * PI * p.y) - cos(m * PI * p.x) * cos(n * PI * p.y); }
vec2 chlGrad(vec2 p, float n, float m) {
  float a = n * PI, b = m * PI;
  return vec2(-a * sin(a * p.x) * cos(b * p.y) + b * sin(b * p.x) * cos(a * p.y),
              -b * cos(a * p.x) * sin(b * p.y) + a * cos(b * p.x) * sin(a * p.y));
}`;
var SAND_VERT = `
uniform float uS, uN1, uM1, uN2, uM2, uMorph, uT, uBounce, uJitter, uBuzz, uSize, uFocal, uMinPx, uBright, uOrtho;
uniform float uDisc, uDiscN, uDiscRot, uNR, uCollapse, uFocus, uAperture, uMaxBlur, uHopGlow, uScatter;
uniform float uRings[5];
uniform vec4 uWin;
uniform vec3 uColA, uColB;
uniform sampler2D uWord; uniform float uWordOn, uShake;
out vec3 vCol; out float vBlur;
${CHL}
// damped Newton steps onto φ = 0 (step length capped so a grain walks to the nearest line, not across the plate)
vec2 toNodal(vec2 p, float n, float m, out float err) {
  err = 0.;
  if (n < .5) return p;                       // n = 0: no mode yet, the sand lies where it was sprinkled
  for (int k = 0; k < 12; k++) {
    float f = chl(p, n, m); vec2 g = chlGrad(p, n, m);
    vec2 st = f * g / max(dot(g, g), 1e-6); float L = length(st);
    p = clamp(p - (L > .06 ? st * .06 / L : st), -1., 1.);
  }
  err = abs(chl(p, n, m)) / max(length(chlGrad(p, n, m)), 1e-4);
  return p;
}
// exact closest point on the disc mode's nodal set: circles r = uRings[j], rays θ = θ₀ + (2j + 1)π / 2n
vec2 toMandala(vec2 p) {
  float r = length(p), th = atan(p.y, p.x);
  vec2 dir = r > 1e-6 ? p / r : vec2(1., 0.), q = dir;
  float best = 1e9;
  for (int j = 0; j < 5; j++) {
    if (float(j) >= uNR) break;
    float dd = abs(r - uRings[j]);
    if (dd < best) { best = dd; q = dir * uRings[j]; }
  }
  float sp = PI / uDiscN, a0 = uDiscRot + .5 * sp;
  float thr = a0 + floor((th - a0) / sp + .5) * sp, along = r * cos(th - thr), perp = abs(r * sin(th - thr));
  if (perp < best && along <= 1.) q = vec2(cos(thr), sin(thr)) * along;
  return q;
}
void main() {
  float i = float(gl_VertexID);
  vec2 cell = vec2(mod(i, uS), floor(i / uS));
  vec2 p0 = mix(uWin.xy, uWin.zw, (cell + hash22(cell)) / uS);   // stratified sprinkle
  float h1 = hash12(cell * 1.7 + 3.1), h2 = hash12(cell * 2.3 + 7.7), h3 = hash12(cell * 3.1 + 1.3);
  float eA, eB;
  vec2 pa = toNodal(p0, uN1, uM1, eA), pb = toNodal(p0, uN2, uM2, eB);
  if (uWordOn > .5) { pa = texture(uWord, (cell + .5) / uS).xy; eA = 0.; }   // poured as letters: every grain has a spot in the word
  float H = 3. + floor(h1 * 4.);                                  // 3..6 hops per migration
  // the new figure spreads out from the centre (the drive point): outer grains leave later
  float d = clamp(length(pa) / 1.414, 0., 1.) * .55, k = smoothstep(d, d + .45, uMorph);
  float q = k * H, f = fract(q);
  vec2 p = mix(pa, pb, (floor(q) + smoothstep(0., 1., f)) / H);
  float amp = clamp(abs(chl(p, uN2, uM2)) * .5, 0., 1.);        // local amplitude of the driving mode
  float hop = 4. * f * (1. - f) * step(.001, k) * step(k, .999) * (.3 + .7 * h2) * (.25 + .75 * amp);
  float err = mix(eA, eB, k);
  if (uDisc > 0.) {
    vec2 pc = toMandala(p0);                                       // from the sprinkle point: every nodal set is fed evenly
    float dd = clamp(length(pb) / 1.414, 0., 1.) * .5, kd = smoothstep(dd, dd + .5, uDisc);
    float qd = kd * H, fd = fract(qd);
    p = mix(p, pc, (floor(qd) + smoothstep(0., 1., fd)) / H);
    hop = max(hop * (1. - kd), 4. * fd * (1. - fd) * step(.001, kd) * step(kd, .999) * (.3 + .7 * h2));
    err *= 1. - kd;
  }
  if (uShake > 0.) p += (hash22(cell * .913 + floor(uT * 60.) * 1.71) - .5) * uShake * (1. - k);   // the drive shakes the letters in place
  // a sand ridge has a width: grains rest in a band around the exact nodal curve (roughly gaussian, σ ≈ uScatter)
  vec2 g2 = hash22(cell * 1.31 + 9.1);
  p += (vec2(cos(TAU * g2.x), sin(TAU * g2.x)) * sqrt(-2. * log(max(g2.y, 1e-4)))) * uScatter * (1. - uCollapse);
  float jit = uJitter * (hash12(cell + floor(uT * 60.) * 1.3) - .5) * .012;
  float buzz = uBuzz * h3 * (.5 + .5 * sin(TAU * (uT * 7.3 + h1)));
  vec3 pos = vec3(p.x, hop * uBounce + jit + buzz, p.y);
  pos = mix(pos, (hash31(i * .37 + 1.7) - .5) * vec3(.05, .03, .05), uCollapse);   // me withdraws into one point
  float vis = 1. - smoothstep(.006, .02, err);                    // grains that found no line fade out
  vec4 mv = modelViewMatrix * vec4(pos, 1.);
  gl_Position = projectionMatrix * mv;
  float dist = max(-mv.z, 1e-3), persp = uOrtho > .5 ? 1. : 1. / dist;
  float px = uSize * uFocal * persp, core = max(px, uMinPx);
  float blur = uAperture > 0. ? min(uAperture * abs(dist - uFocus) * persp * uFocal, uMaxBlur) : 0.;
  float sz = core + blur;
  gl_PointSize = sz;
  vBlur = blur / sz;
  float energy = vis * min(1., px * px / (uMinPx * uMinPx)) * core * core / (sz * sz);
  vCol = mix(uColA, uColB, smoothstep(.2, 1.2, length(p))) * uBright * energy * (1. + uHopGlow * hop) * (.7 + .6 * h3);
}`;
var POINT_FRAG = `
in vec3 vCol; in float vBlur; out vec4 o;
void main() {
  float r = length(gl_PointCoord - .5) * 2.;
  float gauss = exp(-r * r * 4.) * (1. - smoothstep(.8, 1., r));
  float disc = (1. - smoothstep(.86, 1., r)) * (.7 + .3 * smoothstep(.55, .95, r)) * .42;   // lens bokeh: flat disc, bright rim
  o = vec4(vCol * mix(gauss, disc, smoothstep(0., .6, vBlur)), 1.);
}`;
var FIELD_VERT = `
uniform float uG, uN1, uM1, uN2, uM2, uMorph, uDisc, uDiscN, uDiscK, uDiscRot, uSuper, uAmp, uPhase, uBright, uSize, uFocal, uMinPx, uOrtho, uFocus, uAperture, uMaxBlur;
uniform vec3 uCol;
out vec3 vCol; out float vBlur;
${CHL}
float besselJ(float n, float x) { float s = 0.; for (int k = 0; k < 24; k++) { float tau = (float(k) + .5) * (PI / 24.); s += cos(n * tau - x * sin(tau)); } return s / 24.; }
void main() {
  float i = float(gl_VertexID);
  vec2 id = vec2(mod(i, uG), floor(i / uG));
  vec2 p = (id + .5) / uG * 2. - 1.;
  float r = length(p), w = 0.;
  if (uN2 > .5) {
    float d = clamp(r / 1.414, 0., 1.) * .55, k = smoothstep(d, d + .45, uMorph);
    w = mix(uN1 > .5 ? chl(p, uN1, uM1) : 0., chl(p, uN2, uM2), k) * .5;
  }
  if (uDisc > 0.) {
    float wd = r < 1. ? besselJ(uDiscN, uDiscK * r) * cos(uDiscN * (atan(p.y, p.x) - uDiscRot)) / .4 : 0.;
    float dd = clamp(r / 1.414, 0., 1.) * .5;
    w = mix(w, wd, smoothstep(dd, dd + .5, uDisc));
  }
  float inside = step(pow(abs(p.x), uSuper) + pow(abs(p.y), uSuper), 1.);
  vec3 pos = vec3(p.x, uAmp * w * sin(uPhase), p.y);
  vec4 mv = modelViewMatrix * vec4(pos, 1.);
  gl_Position = projectionMatrix * mv;
  float dist = max(-mv.z, 1e-3), persp = uOrtho > .5 ? 1. : 1. / dist;
  float px = uSize * uFocal * persp, core = max(px, uMinPx);
  float blur = uAperture > 0. ? min(uAperture * abs(dist - uFocus) * persp * uFocal, uMaxBlur) : 0.;
  float sz = core + blur;
  gl_PointSize = sz;
  vBlur = blur / sz;
  float energy = min(1., px * px / (uMinPx * uMinPx)) * core * core / (sz * sz);
  vCol = uCol * uBright * w * w * inside * energy;
}`;
function pointsMesh(count, vertex, uniforms) {
	const g = new BufferGeometry();
	g.setAttribute("position", new BufferAttribute(new Float32Array(count * 3), 3));
	const pts = new Points(g, shaderMaterial({
		vertex,
		fragment: POINT_FRAG,
		transparent: true,
		depthWrite: false,
		blending: 2,
		uniforms
	}));
	pts.frustumCulled = false;
	return pts;
}
var U = (names) => Object.fromEntries(names.map((k) => [k, { value: 0 }]));
/** Pixel focal length for a camera and a viewport height (world size → pixels, as the engine's Swarm does). */
function focalPx(cam, hPx) {
	return cam.isPerspectiveCamera ? hPx / 2 / Math.tan(MathUtils.degToRad(cam.fov) / 2) : hPx * cam.zoom / (cam.top - cam.bottom);
}
var Sand = class {
	constructor() {
		this.points = pointsMesh(SAND_S * SAND_S, SAND_VERT, {
			...U([
				"uS",
				"uN1",
				"uM1",
				"uN2",
				"uM2",
				"uMorph",
				"uT",
				"uBounce",
				"uJitter",
				"uBuzz",
				"uSize",
				"uFocal",
				"uMinPx",
				"uBright",
				"uOrtho",
				"uDisc",
				"uDiscN",
				"uDiscRot",
				"uNR",
				"uCollapse",
				"uFocus",
				"uAperture",
				"uMaxBlur",
				"uHopGlow",
				"uScatter"
			]),
			uRings: { value: [
				0,
				0,
				0,
				0,
				0
			] },
			uWin: { value: new Vector4(-1, -1, 1, 1) },
			uColA: { value: new Color() },
			uColB: { value: new Color() },
			uWord: { value: null },
			uWordOn: { value: 0 },
			uShake: { value: 0 }
		});
	}
	/**
	* st: { a: [n, m] | null, b: [n, m] | null, morph, disc, collapse, bounce, jitter, buzz, t, word (a wordGrains texture:
	*       the grains start from the letters instead of mode a), shake (sideways jitter of the resting grains, plate units) }
	* o:  { size, bright, minPx, colA, colB, focus, aperture, maxBlur, grid (grains per side drawn), win [x0, z0, x1, z1], hopGlow,
	*       scatter (ridge half-width σ, plate units) }
	*/
	set(st, o, cam, hPx) {
		const u = this.points.material.uniforms, a = st.a ?? [0, 0], b = st.b ?? [0, 0], S = o.grid ?? 1024;
		this.points.geometry.setDrawRange(0, S * S);
		u.uS.value = S;
		u.uN1.value = a[0];
		u.uM1.value = a[1];
		u.uN2.value = b[0];
		u.uM2.value = b[1];
		u.uMorph.value = st.morph ?? 1;
		u.uT.value = st.t ?? 0;
		u.uBounce.value = st.bounce ?? .05;
		u.uJitter.value = st.jitter ?? 0;
		u.uBuzz.value = st.buzz ?? 0;
		u.uDisc.value = st.disc ?? 0;
		u.uDiscN.value = DISC.n;
		u.uDiscRot.value = DISC.rot;
		u.uNR.value = DISC.s;
		u.uRings.value = DISC.rings;
		u.uCollapse.value = st.collapse ?? 0;
		u.uWord.value = st.word ?? null;
		u.uWordOn.value = st.word ? 1 : 0;
		u.uShake.value = st.shake ?? 0;
		u.uWin.value.set(...o.win ?? [
			-1,
			-1,
			1,
			1
		]);
		u.uSize.value = o.size ?? .0042;
		u.uMinPx.value = (o.minPx ?? 1.25) * hPx / 1080;
		u.uBright.value = o.bright ?? .16;
		u.uHopGlow.value = o.hopGlow ?? 2.5;
		u.uScatter.value = o.scatter ?? 0;
		u.uFocus.value = o.focus ?? 5;
		u.uAperture.value = o.aperture ?? 0;
		u.uMaxBlur.value = (o.maxBlur ?? 40) * hPx / 1080;
		u.uOrtho.value = cam.isOrthographicCamera ? 1 : 0;
		u.uFocal.value = focalPx(cam, hPx);
		u.uColA.value.setRGB(...o.colA ?? [
			.42,
			.92,
			1
		]);
		u.uColB.value.setRGB(...o.colB ?? o.colA ?? [
			.42,
			.92,
			1
		]);
		this.points.visible = true;
		return this;
	}
};
var Field = class {
	constructor() {
		this.points = pointsMesh(28224, FIELD_VERT, {
			...U([
				"uG",
				"uN1",
				"uM1",
				"uN2",
				"uM2",
				"uMorph",
				"uDisc",
				"uDiscN",
				"uDiscK",
				"uDiscRot",
				"uSuper",
				"uAmp",
				"uPhase",
				"uBright",
				"uSize",
				"uFocal",
				"uMinPx",
				"uOrtho",
				"uFocus",
				"uAperture",
				"uMaxBlur"
			]),
			uCol: { value: new Color() }
		});
	}
	/** st: sand state plus { amp, phase, super }; o: { size, bright, minPx, col, focus, aperture, maxBlur }. */
	set(st, o, cam, hPx) {
		const u = this.points.material.uniforms, a = st.a ?? [0, 0], b = st.b ?? [0, 0];
		u.uG.value = 168;
		u.uN1.value = a[0];
		u.uM1.value = a[1];
		u.uN2.value = b[0];
		u.uM2.value = b[1];
		u.uMorph.value = st.morph ?? 1;
		u.uDisc.value = st.disc ?? 0;
		u.uDiscN.value = DISC.n;
		u.uDiscK.value = DISC.k;
		u.uDiscRot.value = DISC.rot;
		u.uSuper.value = st.super ?? 400;
		u.uAmp.value = st.amp ?? .03;
		u.uPhase.value = st.phase ?? 0;
		u.uSize.value = o.size ?? .004;
		u.uMinPx.value = (o.minPx ?? 1.2) * hPx / 1080;
		u.uBright.value = o.bright ?? .3;
		u.uFocus.value = o.focus ?? 5;
		u.uAperture.value = o.aperture ?? 0;
		u.uMaxBlur.value = (o.maxBlur ?? 40) * hPx / 1080;
		u.uOrtho.value = cam.isOrthographicCamera ? 1 : 0;
		u.uFocal.value = focalPx(cam, hPx);
		u.uCol.value.setRGB(...o.col ?? [
			1,
			.28,
			.55
		]);
		this.points.visible = true;
		return this;
	}
};
//#endregion
export { DISC, Field, SAND_S, Sand, antinodes, besselJ, besselZeros, chladni, fieldSample, focalPx, modeHz, nodalSegments, plateOutline, wordGrains };
