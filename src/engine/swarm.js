import { PROJECT } from "./config.js?v=BkWxxfxi";
import { THEME } from "../theme.js?v=Bj33PIbo";
import { BufferAttribute, BufferGeometry, Color, MathUtils, Matrix4, Points, Vector3, Vector4 } from "../../vendor/three/build/three.core.js?v=q9f7JKE-";
import { dataTexture, shaderMaterial } from "./gpu.js?v=o4BYX3o1";
//#region src/engine/swarm.js
var DESIGN_H = PROJECT.design.height;
var textures = /* @__PURE__ */ new Map();
/** A shape texture for `count` particles, generated once by gen(count) and cached under `key`. */
function shapeTexture(key, count, gen) {
	const k = `${key}@${count}`;
	if (!textures.has(k)) {
		const S = Math.sqrt(count), data = gen(count);
		if (data.length !== count * 4) throw new Error(`shape '${key}' returned ${data.length / 4} points, expected ${count}`);
		textures.set(k, dataTexture(data, S, S));
	}
	return textures.get(k);
}
var VERT = (bands, cap) => `
uniform sampler2D uA, uB;
uniform float uS, uMorph, uSpread, uArc, uReveal, uNoise, uNoiseFreq, uNoiseSpeed, uT;
uniform float uSize, uMinPx, uFocal, uBright, uSparkle, uProj4, uW4, uWave, uRevealW, uFocus, uAperture, uMaxBlur, uOrtho;
uniform vec3 uSine; // travelling wave on y: amplitude, wavenumber along x, angular speed
uniform vec3 uColA, uColB, uWaveOrigin;
uniform mat4 uRot4;${bands ? BANDS[0] : ""}${cap ? CAP[0] : ""}
out vec3 vCol; out float vBlur;
void main() {
  float i = float(gl_VertexID);
  vec2 uv = (vec2(mod(i, uS), floor(i / uS)) + .5) / uS;
  vec4 a = texture(uA, uv), b = texture(uB, uv);
  float h = hash11(i * .754877 + 3.1);
  // stagger: random, or as a wave spreading from uWaveOrigin when uWave > 0
  float d = uWave > 0. ? clamp(length(a.xyz - uWaveOrigin) / uWave, 0., 1.) * uSpread : h * uSpread;
  float k = smoothstep(d, d + max(1. - uSpread, 1e-3), uMorph);
  vec4 p4 = mix(a, b, k);
  p4.xyz += (hash31(i * 1.618) - .5) * sin(k * PI) * uArc;
  if (uProj4 > .5) { vec4 r = uRot4 * p4; p4 = vec4(r.xyz / max(uW4 - r.w, .05), 0.); }
  vec3 p = p4.xyz;
  if (uNoise > 0.) p += curlNoise(p * uNoiseFreq + vec3(0., 0., uT * uNoiseSpeed)) * uNoise;
  p.y += uSine.x * sin(uSine.y * p.x - uSine.z * uT);
  vec4 mv = modelViewMatrix * vec4(p, 1.);
  gl_Position = projectionMatrix * mv;
  float dist = max(-mv.z, 1e-3);
  float persp = uOrtho > .5 ? 1. : 1. / dist;                   // orthographic views do not shrink with depth
  float px = uSize * uFocal * persp;                            // world-size diameter in pixels
  float key = uRevealW > .5 ? a.w : h;                          // reveal order: random, or along w (0..1) of shape A
  float vis = 1. - smoothstep(uReveal * 1.02 - .02, uReveal * 1.02, key);
  float core = max(px, uMinPx);
  // depth of field: circle of confusion grows with distance from the focal plane; energy spreads over the bokeh disc
  float blur = uAperture > 0. ? min(uAperture * abs(dist - uFocus) * persp * uFocal, uMaxBlur) : 0.;
  float sz = core + blur;
  float energy = vis * min(1., (px * px) / (uMinPx * uMinPx)) * (core * core) / (sz * sz);
  gl_PointSize = sz;
  vBlur = blur / sz;
  float tw = 1. + uSparkle * (hash11(i + floor(uT * 12.) * 7.13) - .5) * 2.;
  vCol = mix(uColA, uColB, k) * uBright * energy * (.55 + .9 * hash11(i * 1.31)) * max(tw, 0.);${bands ? BANDS[1] : ""}${cap ? CAP[1] : ""}
  if (vis <= 0.) { gl_PointSize = 0.; gl_Position = vec4(2., 2., 2., 1.); } // not revealed: cull (no fill cost)
}`;
var FRAG = `
in vec3 vCol; in float vBlur; out vec4 o;
void main() {
  float r = length(gl_PointCoord - .5) * 2.;
  float gauss = exp(-r * r * 4.) * (1. - smoothstep(.8, 1., r));
  float disc = (1. - smoothstep(.86, 1., r)) * (.7 + .3 * smoothstep(.55, .95, r)) * .42; // lens bokeh: flat disc, bright rim
  float a = mix(gauss, disc, smoothstep(0., .6, vBlur));
  o = vec4(vCol * a, 1.); // additive: alpha 1, colour already weighted
}`;
var Swarm = class {
	/** count: a perfect square. bands, cap: compile the shader's variants (BANDS, CAP below); set() then takes them. */
	constructor({ count = 1 << 18, bands = false, cap = false } = {}) {
		this.N = count;
		this.S = Math.sqrt(count);
		if (!Number.isInteger(this.S)) throw new Error(notSquare("Swarm", count));
		const geo = new BufferGeometry();
		geo.setAttribute("position", new BufferAttribute(new Float32Array(count * 3), 3));
		this.material = shaderMaterial({
			vertex: VERT(bands, cap),
			fragment: FRAG,
			transparent: true,
			depthWrite: false,
			depthTest: true,
			blending: 2,
			uniforms: {
				uA: { value: null },
				uB: { value: null },
				uS: { value: this.S },
				uMorph: { value: 0 },
				uSpread: { value: .4 },
				uArc: { value: 0 },
				uReveal: { value: 1 },
				uNoise: { value: 0 },
				uNoiseFreq: { value: 1 },
				uNoiseSpeed: { value: .2 },
				uT: { value: 0 },
				uSize: { value: .01 },
				uMinPx: { value: 1.5 },
				uFocal: { value: 1e3 },
				uBright: { value: 1 },
				uSparkle: { value: 0 },
				uProj4: { value: 0 },
				uW4: { value: 3 },
				uRot4: { value: new Matrix4() },
				uWave: { value: 0 },
				uWaveOrigin: { value: new Vector3() },
				uRevealW: { value: 0 },
				uFocus: { value: 5 },
				uAperture: { value: 0 },
				uMaxBlur: { value: 60 },
				uOrtho: { value: 0 },
				uSine: { value: new Vector3() },
				uColA: { value: new Color(...THEME.swarm.color) },
				uColB: { value: new Color(...THEME.swarm.color) },
				...variantUniforms(bands, cap)
			}
		});
		this.points = new Points(geo, this.material);
		this.points.frustumCulled = false;
	}
	/** Cached shape texture sized for this swarm. */
	shape(key, gen) {
		return shapeTexture(key, this.N, gen);
	}
	/**
	* Set this frame's parameters. a/b: shape textures (b defaults to a). morph 0..1 from a to b; spread: how staggered
	* the morph is; arc: outward bulge mid-morph; reveal: fraction of particles born (0..1); noise/noiseFreq/noiseSpeed:
	* curl drift; t: time for drift and sparkle; size: particle diameter in world units; minPx: smallest drawn size;
	* bright/colA/colB: HDR colour (A→B follows the morph; theme.js THEME.swarm.color unless given); sparkle:
	* per-particle twinkle; rot4/w4: 4D rotation and projection distance (enables 4D); wave/waveOrigin: morph as a wave
	* from a point instead of random stagger.
	* sine: [amp, k, w] adds y += amp·sin(k·x − w·t) (travelling wave sheets).
	* focus/aperture/maxBlur: depth of field (focus = view distance in focus; aperture ~.01–.06; maxBlur design px).
	* revealBy: 'w' reveals particles in the order of shape A's w channel (0..1) instead of randomly (draw-on).
	* cap (a swarm made with { cap: true }): the largest diameter drawn, design px (default: no cap).
	* bands (a swarm made with { bands: true }): { o: [x, y, z] (world), k (wavenumber), phase, depth, front (how far
	* from o the first wave has come) }: brightness and size waves running out from o.
	* camera + H are needed to size points in pixels (H = the viewport height when drawing into a viewport).
	*/
	set(p, camera, H) {
		const u = this.material.uniforms;
		u.uA.value = p.a;
		u.uB.value = p.b ?? p.a;
		u.uMorph.value = p.morph ?? 0;
		u.uSpread.value = p.spread ?? .4;
		u.uArc.value = p.arc ?? 0;
		u.uReveal.value = p.reveal ?? 1;
		u.uNoise.value = p.noise ?? 0;
		u.uNoiseFreq.value = p.noiseFreq ?? 1;
		u.uNoiseSpeed.value = p.noiseSpeed ?? .2;
		u.uT.value = p.t ?? 0;
		u.uSize.value = p.size ?? .01;
		u.uMinPx.value = (p.minPx ?? 1.4) * H / DESIGN_H;
		u.uBright.value = p.bright ?? 1;
		u.uSparkle.value = p.sparkle ?? 0;
		const col = THEME.swarm.color;
		u.uColA.value.setRGB(...p.colA ?? col);
		u.uColB.value.setRGB(...p.colB ?? p.colA ?? col);
		u.uProj4.value = p.rot4 ? 1 : 0;
		u.uW4.value = p.w4 ?? 3;
		if (p.rot4) u.uRot4.value.copy(p.rot4);
		u.uWave.value = p.wave ?? 0;
		if (p.waveOrigin) u.uWaveOrigin.value.set(...p.waveOrigin);
		u.uRevealW.value = p.revealBy === "w" ? 1 : 0;
		u.uFocus.value = p.focus ?? 5;
		u.uAperture.value = p.aperture ?? 0;
		u.uMaxBlur.value = (p.maxBlur ?? 70) * H / DESIGN_H;
		u.uSine.value.set(...p.sine ?? [
			0,
			0,
			0
		]);
		if (u.uCap) u.uCap.value = (p.cap ?? 1e4) * H / DESIGN_H;
		if (u.uBand) {
			const b = p.bands;
			u.uBand.value.set(b?.k ?? 0, b?.phase ?? 0, b?.depth ?? 0);
			u.uBandO.value.set(...b?.o ?? [
				0,
				0,
				0
			], b?.front ?? 1e3);
		}
		u.uOrtho.value = camera.isOrthographicCamera ? 1 : 0;
		u.uFocal.value = camera.isPerspectiveCamera ? H / 2 / Math.tan(MathUtils.degToRad(camera.fov) / 2) : H * camera.zoom / (camera.top - camera.bottom);
		return this;
	}
};
/** 4D rotation: product of rotations in the xw, yw and zw planes (plus xy), angles in radians. */
function rot4({ xw = 0, yw = 0, zw = 0, xy = 0 } = {}) {
	const m = new Matrix4(), t = new Matrix4();
	const plane = (i, j, a) => {
		t.identity();
		const c = Math.cos(a), s = Math.sin(a), e = t.elements;
		e[i * 4 + i] = c;
		e[j * 4 + j] = c;
		e[j * 4 + i] = -s;
		e[i * 4 + j] = s;
		m.multiply(t);
	};
	plane(0, 3, xw);
	plane(1, 3, yw);
	plane(2, 3, zw);
	plane(0, 1, xy);
	return m;
}
/**
* The error for a point count that is not a perfect square (each shape is a √N × √N texture). It names the squares on
* either side, so the message is also the fix. `what`: the class that was given the count (Swarm, GlyphField).
*/
function notSquare(what, count) {
	const a = Math.floor(Math.sqrt(count)), b = a + 1;
	return `${what} count must be a perfect square (each shape is a √N × √N texture): ${count} is not; the nearest are ${a * a} (${a}²) and ${b * b} (${b}²). Even powers of two are squares: 1 << 12, 1 << 14, 1 << 16, 1 << 18.`;
}
var CAP = [`
uniform float uCap; // cap: the largest diameter drawn (px)`, `
  gl_PointSize = min(gl_PointSize, uCap);`];
var BANDS = [`
uniform vec4 uBandO; uniform vec3 uBand; // bands: origin (world) and how far the first has come; wavenumber, phase, depth`, `
  float bd = distance((modelMatrix * vec4(p, 1.)).xyz, uBandO.xyz);
  float bw = uBand.z * sin(uBand.x * bd - uBand.y) * (1. - smoothstep(uBandO.w - .15, uBandO.w, bd));
  vCol *= 1. + bw; gl_PointSize *= 1. + .5 * bw;`];
/** The variants' uniforms, at their defaults (no cap; no bands), only for the variants asked for. */
function variantUniforms(bands, cap) {
	return {
		...bands ? {
			uBandO: { value: new Vector4(0, 0, 0, 1e3) },
			uBand: { value: new Vector3() }
		} : {},
		...cap ? { uCap: { value: 1e4 } } : {}
	};
}
//#endregion
export { Swarm, notSquare, rot4, shapeTexture };
