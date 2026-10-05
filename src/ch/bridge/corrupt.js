import { BufferAttribute, BufferGeometry, Color, MathUtils, Points, Vector4 } from "../../../vendor/three/build/three.core.js?v=q9f7JKE-";
import { shaderMaterial } from "../../engine/gpu.js?v=o4BYX3o1";
import { shapeTexture } from "../../engine/swarm.js?v=DTFpJa7B";
//#region src/ch/bridge/corrupt.js
var VERT = `
uniform sampler2D uA, uB;
uniform float uS, uMorph, uSpread, uArc, uReveal, uNoise, uNoiseFreq, uNoiseSpeed, uT;
uniform float uSize, uMinPx, uFocal, uBright, uSparkle, uFocus, uAperture, uMaxBlur, uOrtho;
uniform float uBits, uCorrupt, uJit, uJitHz, uRedMix;
uniform vec4 uTear;   // amount (world), slice height, re-roll rate (Hz, 0 = fixed), stream-off length
uniform vec4 uBlow;   // start (s), a, fraction of all particles, stagger (s): e(age) = a·age + b·age³ doublings
uniform float uBlowB; // b
uniform vec4 uWave;   // origin xyz, radius
uniform vec4 uFall;   // speed, band height, band centre y, on
uniform vec3 uColA, uColB;
out vec3 vCol; out float vBlur;

vec3 qfloat(vec3 x, float bits) {
  vec3 ax = max(abs(x), vec3(1e-30));
  vec3 ulp = exp2(floor(log2(ax)) - bits);
  return sign(x) * floor(ax / ulp + .5) * ulp;
}
void main() {
  float i = float(gl_VertexID);
  vec2 uv = (vec2(mod(i, uS), floor(i / uS)) + .5) / uS;
  vec4 a = texture(uA, uv), b = texture(uB, uv);
  float h = hash11(i * .754877 + 3.1), hc = hash11(i * 1.3717 + 9.2);
  float d = h * uSpread;
  float k = smoothstep(d, d + max(1. - uSpread, 1e-3), uMorph);
  vec3 p = mix(a.xyz, b.xyz, k);
  p += (hash31(i * 1.618) - .5) * sin(k * PI) * uArc;
  if (uNoise > 0.) p += curlNoise(p * uNoiseFreq + vec3(0., 0., uT * uNoiseSpeed)) * uNoise;
  if (uFall.w > .5) p.y = uFall.z + mod(p.y - uFall.x * uT - uFall.z + .5 * uFall.y, uFall.y) - .5 * uFall.y;
  float bad = step(hc, uCorrupt), vis = 1.;
  if (uTear.x > 0.) {
    float st = uTear.z > 0. ? floor(uT * uTear.z) : 0.;
    float sy = p.y / uTear.y + hash11(st * 3.7 + 1.) * 3.;
    float sl = floor(sy), fr = fract(sy);
    float on = step(.38, hash12(vec2(sl, st)));
    vec2 dir = normalize(hash22(vec2(sl * 1.7, st + .3)) - .5 + 1e-4);
    float amt = (hash12(vec2(sl, st * 1.3 + 5.)) * 1.2 - .2) * uTear.x * on;
    p.xz += dir * amt;
    // particles near a slice edge are dragged further along the tear (the torn fringe)
    float edge = max(1. - fr / .12, 0.) + max(1. - (1. - fr) / .12, 0.);
    p.xz += dir * sign(amt) * edge * uTear.w * hash11(i * 2.9) * on;
  }
  if (uJit > 0.) p += (hash33(vec3(i * .173, floor(uT * uJitHz), 1.7)) - .5) * uJit * (1. + bad);
  if (uBits < 23.) p = qfloat(p, uBits);
  if (uBlow.z > 0. && hc < uBlow.z) {
    float age = uT - uBlow.x - hash11(i * 7.31) * uBlow.w;
    if (age > 0.) { float e = uBlow.y * age + uBlowB * age * age * age; p *= exp2(min(e, 60.)); vis *= 1. - step(40., e); }
  }
  vec4 mv = modelViewMatrix * vec4(p, 1.);
  gl_Position = projectionMatrix * mv;
  float dist = max(-mv.z, 1e-3);
  float persp = uOrtho > .5 ? 1. : 1. / dist;
  float px = uSize * uFocal * persp;
  vis *= 1. - smoothstep(uReveal * 1.02 - .02, uReveal * 1.02, h);
  float core = max(px, uMinPx);
  float blur = uAperture > 0. ? min(uAperture * abs(dist - uFocus) * persp * uFocal, uMaxBlur) : 0.;
  float sz = core + blur;
  float energy = vis * min(1., (px * px) / (uMinPx * uMinPx)) * (core * core) / (sz * sz);
  gl_PointSize = sz;
  vBlur = blur / sz;
  float tw = 1. + uSparkle * (hash11(i + floor(uT * 12.) * 7.13) - .5) * 2.;
  float w = uWave.w > 0. ? 1. - smoothstep(uWave.w * .85, uWave.w, length(p - uWave.xyz)) : 0.;
  float red = clamp(max(bad * uRedMix, w), 0., 1.);
  vCol = mix(uColA, uColB, red) * uBright * energy * (.55 + .9 * hash11(i * 1.31)) * max(tw, 0.);
  // not revealed, or blown past 2^40: cull (no fill cost), as the engine Swarm does; additive, so nothing is lost
  if (vis <= 0.) { gl_PointSize = 0.; gl_Position = vec4(2., 2., 2., 1.); }
}`;
var FRAG = `
in vec3 vCol; in float vBlur; out vec4 o;
void main() {
  float r = length(gl_PointCoord - .5) * 2.;
  float gauss = exp(-r * r * 4.) * (1. - smoothstep(.8, 1., r));
  float disc = (1. - smoothstep(.86, 1., r)) * (.7 + .3 * smoothstep(.55, .95, r)) * .42;
  o = vec4(vCol * mix(gauss, disc, smoothstep(0., .6, vBlur)), 1.);
}`;
var V4 = () => ({ value: new Vector4() });
var CorruptSwarm = class {
	constructor({ count = 1 << 18 } = {}) {
		this.N = count;
		this.S = Math.sqrt(count);
		if (!Number.isInteger(this.S)) throw new Error("CorruptSwarm count must be a perfect square");
		const geo = new BufferGeometry();
		geo.setAttribute("position", new BufferAttribute(new Float32Array(count * 3), 3));
		const f = (v) => ({ value: v });
		this.material = shaderMaterial({
			vertex: VERT,
			fragment: FRAG,
			transparent: true,
			depthWrite: false,
			depthTest: true,
			blending: 2,
			uniforms: {
				uA: f(null),
				uB: f(null),
				uS: f(this.S),
				uMorph: f(0),
				uSpread: f(.4),
				uArc: f(0),
				uReveal: f(1),
				uNoise: f(0),
				uNoiseFreq: f(1),
				uNoiseSpeed: f(.2),
				uT: f(0),
				uSize: f(.01),
				uMinPx: f(1.4),
				uFocal: f(1e3),
				uBright: f(1),
				uSparkle: f(0),
				uFocus: f(5),
				uAperture: f(0),
				uMaxBlur: f(60),
				uOrtho: f(0),
				uBits: f(24),
				uCorrupt: f(0),
				uJit: f(0),
				uJitHz: f(12),
				uRedMix: f(1),
				uTear: V4(),
				uBlow: V4(),
				uBlowB: f(0),
				uWave: V4(),
				uFall: V4(),
				uColA: f(new Color(.72, .88, 1)),
				uColB: f(new Color(1, .1, .06))
			}
		});
		this.points = new Points(geo, this.material);
		this.points.frustumCulled = false;
	}
	shape(key, gen) {
		return shapeTexture(key, this.N, gen);
	}
	/** Like Swarm.set, plus: bits, corrupt, redMix, jitter, jitterHz, tear [amt, sliceH, hz, stream], blow [t0, a, b, frac, stagger], wave [x, y, z, r], fall [speed, band, cy]. */
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
		u.uMinPx.value = (p.minPx ?? 1.4) * H / 1080;
		u.uBright.value = p.bright ?? 1;
		u.uSparkle.value = p.sparkle ?? 0;
		u.uColA.value.setRGB(...p.colA ?? [
			.72,
			.88,
			1
		]);
		u.uColB.value.setRGB(...p.colB ?? [
			1,
			.1,
			.06
		]);
		u.uFocus.value = p.focus ?? 5;
		u.uAperture.value = p.aperture ?? 0;
		u.uMaxBlur.value = (p.maxBlur ?? 70) * H / 1080;
		u.uBits.value = p.bits ?? 24;
		u.uCorrupt.value = p.corrupt ?? 0;
		u.uRedMix.value = p.redMix ?? 1;
		u.uJit.value = p.jitter ?? 0;
		u.uJitHz.value = p.jitterHz ?? 12;
		u.uTear.value.set(...p.tear ?? [
			0,
			.1,
			0,
			0
		]);
		const bl = p.blow ?? [
			0,
			0,
			0,
			0,
			0
		];
		u.uBlow.value.set(bl[0], bl[1], bl[3], bl[4]);
		u.uBlowB.value = bl[2];
		u.uWave.value.set(...p.wave ?? [
			0,
			0,
			0,
			0
		]);
		const fl = p.fall;
		u.uFall.value.set(fl?.[0] ?? 0, fl?.[1] ?? 1, fl?.[2] ?? 0, fl ? 1 : 0);
		u.uOrtho.value = camera.isOrthographicCamera ? 1 : 0;
		u.uFocal.value = camera.isPerspectiveCamera ? H / 2 / Math.tan(MathUtils.degToRad(camera.fov) / 2) : H * camera.zoom / (camera.top - camera.bottom);
		return this;
	}
};
/** Float32 bits of x as [sign, exponent(8), mantissa(23)] strings (for the IEEE-754 HUD). */
var F32 = /* @__PURE__ */ new Float32Array(1);
var U32 = new Uint32Array(F32.buffer);
function f32bits(x) {
	F32[0] = x;
	const u = U32[0];
	return [
		(u >>> 31).toString(2),
		(u >>> 23 & 255).toString(2).padStart(8, "0"),
		(u & 8388607).toString(2).padStart(23, "0")
	];
}
/** x rounded to `bits` mantissa bits (CPU twin of the shader's qfloat). */
function qfloat(x, bits) {
	if (x === 0 || !Number.isFinite(x)) return x;
	const ulp = 2 ** (Math.floor(Math.log2(Math.abs(x))) - bits);
	return Math.sign(x) * Math.round(Math.abs(x) / ulp) * ulp;
}
//#endregion
export { CorruptSwarm, f32bits, qfloat };
