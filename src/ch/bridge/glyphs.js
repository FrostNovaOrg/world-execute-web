import { Vector2, Vector3, Vector4 } from "../../../vendor/three/build/three.core.js?v=q9f7JKE-";
import { shaderMaterial } from "../../engine/gpu.js?v=o4BYX3o1";
import { GlyphField, glyphAtlas } from "../../lib/glyphs.js?v=DWbHICXG";
//#region src/ch/bridge/glyphs.js
var VERT = `
uniform sampler2D uA, uB, uG;
uniform float uS, uMorph, uSpread, uArc, uReveal, uSoft, uNoise, uNoiseFreq, uNoiseSpeed, uT, uSize, uMinPx, uFocal, uBright;
uniform float uFocus, uAperture, uMaxBlur, uOrtho, uFlicker;
uniform vec3 uPal[6];
uniform vec3 uScroll, uRed, uNan;
uniform float uBits, uCorrupt, uRedMix, uJit, uJitHz, uRot, uRotHz, uBlowB, uBack;
uniform vec4 uTear, uBlow, uFall, uFall2;
uniform vec2 uFallX;
out vec3 vCol; out float vCore; out float vBlur; flat out float vChar; out float vAng;

vec3 qfloat(vec3 x, float bits) {
  vec3 ax = max(abs(x), vec3(1e-30));
  vec3 ulp = exp2(floor(log2(ax)) - bits);
  return sign(x) * floor(ax / ulp + .5) * ulp;
}
void main() {
  float i = float(gl_VertexID);
  vec2 uv = (vec2(mod(i, uS), floor(i / uS)) + .5) / uS;
  vec4 a = texture(uA, uv), b = texture(uB, uv), g = texture(uG, uv);
  float h = hash11(i * .754877 + 3.1), hc = hash11(i * 1.3717 + 9.2);
  float k = smoothstep(h * uSpread, h * uSpread + max(1. - uSpread, 1e-3), uMorph);
  float key = mix(a.w, b.w, k);
  float vis = g.x < 0. ? 0. : 1. - smoothstep(uReveal - uSoft, uReveal, key);
  if (vis <= 0. || mix(a.z, b.z, k) < -1e4) { gl_Position = vec4(2., 2., 2., 1.); gl_PointSize = 0.; vCol = vec3(0.); vCore = 1.; vBlur = 0.; vChar = 0.; vAng = 0.; return; }
  vec3 p = mix(a.xyz + uScroll, b.xyz, k);
  p += (hash31(i * 1.618) - .5) * sin(k * PI) * uArc;
  if (uNoise > 0.) p += curlNoise(p * uNoiseFreq + vec3(0., 0., uT * uNoiseSpeed)) * uNoise;
  float bad = step(hc, uCorrupt), ch = g.x, ang = 0.;
  if (uFall.w > 0.) {
    float col = floor(p.x / uFall.w), sweep = clamp((col * uFall.w - uFallX.x) / max(uFallX.y - uFallX.x, 1e-3), 0., 1.);
    float order = mix(hash11(col * 3.17 + 1.3), sweep, uFall2.z);
    float age = uT - uFall.x - uFall.y * order - hash11(i * 5.77) * uFall2.w;
    if (age > 0.) {
      p.y -= .5 * uFall.z * age * age;
      p.xz += (hash22(vec2(i * .31, 4.1)) - .5) * uFall2.y * age;
      ang = (hash11(i * 2.13) - .5) * 2. * uFall2.x * age;
    }
  }
  if (uTear.x > 0.) {
    float st = uTear.z > 0. ? floor(uT * uTear.z) : 0.;
    float sy = p.y / uTear.y + hash11(st * 3.7 + 1.) * 3.;
    float sl = floor(sy), fr = fract(sy);
    float on = step(.38, hash12(vec2(sl, st)));
    vec2 dir = normalize(hash22(vec2(sl * 1.7, st + .3)) - .5 + 1e-4);
    float amt = (hash12(vec2(sl, st * 1.3 + 5.)) * 1.2 - .2) * uTear.x * on;
    p.xz += dir * amt;
    float edge = max(1. - fr / .12, 0.) + max(1. - (1. - fr) / .12, 0.);
    p.xz += dir * sign(amt) * edge * uTear.w * hash11(i * 2.9) * on;
  }
  if (uJit > 0.) p += (hash33(vec3(i * .173, floor(uT * uJitHz), 1.7)) - .5) * uJit * (1. + bad);
  if (uBits < 23.) p = qfloat(p, uBits);
  if (uBlow.z > 0. && hc < uBlow.z) {
    float age = uT - uBlow.x - hash11(i * 7.31) * uBlow.w;
    if (age > 0.) {
      float e = uBlow.y * age + uBlowB * age * age * age;
      p *= exp2(min(e, 60.)); vis *= 1. - step(40., e);
      if (e > .35) { float n = mod(i, 3.); ch = n < .5 ? uNan.x : n < 1.5 ? uNan.y : uNan.z; bad = 1.; }
    }
  }
  // bit rot: a bad glyph flickers through random printable characters
  if (uRot > 0. && bad > .5 && ch >= 0.) {
    float s = floor(uT * uRotHz);
    if (hash11(i * 3.91 + s * 1.37) < uRot) ch = 1. + floor(hash11(i * 2.71 + s * 5.13) * 94.);
  }
  if (vis <= 0.) { gl_Position = vec4(2., 2., 2., 1.); gl_PointSize = 0.; vCol = vec3(0.); vCore = 1.; vBlur = 0.; vChar = 0.; vAng = 0.; return; }
  vec4 mv = modelViewMatrix * vec4(p, 1.);
  gl_Position = projectionMatrix * mv;
  float dist = max(-mv.z, 1e-3), persp = uOrtho > .5 ? 1. : 1. / dist;
  // a shell layout (points around the local origin): glyphs on the far side are dimmed, so the near side reads
  if (uBack < 1.) {
    vec3 n = normalize(normalMatrix * (a.xyz + 1e-5)), v = uOrtho > .5 ? vec3(0., 0., 1.) : normalize(-mv.xyz);
    vis *= mix(uBack, 1., smoothstep(-.15, .2, dot(n, v)));
  }
  float px = uSize * uFocal * persp;
  float blur = uAperture > 0. ? min(uAperture * abs(dist - uFocus) * persp * uFocal, uMaxBlur) : 0.;
  float core = max(px, uMinPx), sz = min(core + blur, 511.);
  gl_PointSize = sz;
  vCore = core; vBlur = sz - core;                                  // glyph size and circle of confusion, in pixels
  float energy = vis * min(1., px / uMinPx);
  float fl = 1. + uFlicker * (hash11(i + floor(uT * 15.) * 3.7) - .5) * 2.;
  vCol = mix(uPal[int(g.y + .5)], uRed, bad * uRedMix) * uBright * g.z * energy * max(fl, 0.);
  vChar = ch; vAng = ang;
}`;
var FRAG = `
uniform sampler2D uAtlas; uniform vec2 uGrid;
in vec3 vCol; in float vCore; in float vBlur; flat in float vChar; in float vAng; out vec4 o;
vec2 gCell;
float tap(vec2 q, float lod) {                                       // the glyph at q (cell units), zero outside its cell
  vec2 d = abs(q - .5);
  return d.x > .5 || d.y > .5 ? 0. : textureLod(uAtlas, (gCell + clamp(q, .01, .99)) / uGrid, lod).r;
}
void main() {
  vec2 pc = gl_PointCoord - .5;
  float c = cos(vAng), s = sin(vAng);
  pc = mat2(c, s, -s, c) * pc + .5;
  gCell = vec2(mod(vChar, uGrid.x), floor(vChar / uGrid.x));
  float scale = (vCore + vBlur) / vCore;                             // sprite size / glyph size
  vec2 q = (pc - .5) * scale + .5;                                   // position in the glyph's cell
  float rb = .5 * vBlur / vCore;                                     // blur radius, in cells
  float w = smoothstep(.1, .3, rb);                                  // 0: the glyph (soft) · 1: its bokeh disc
  float glyph = 0.;
  if (w < 1.) {
    float lod0 = log2(max(1., 64. / vCore));
    if (rb < .01) glyph = tap(q, lod0);
    else {
      float lod = max(lod0, log2(max(1., 64. * rb * .6)));
      glyph = tap(q, lod) * .2;
      for (int k = 0; k < 8; k++) {
        float an = float(k) * .7853982 + .39;
        glyph += tap(q + rb * .8 * vec2(cos(an), sin(an)), lod) * .1;
      }
    }
  }
  float cov = textureLod(uAtlas, (gCell + .5) / uGrid, 6.).r;        // mean ink of the cell
  float r = length(gl_PointCoord - .5) * 2.;
  float disc = (1. - smoothstep(.8, 1., r)) * cov / (scale * scale * .644);
  o = vec4(vCol * mix(glyph, disc, w), 1.);
}`;
var CorruptGlyphs = class extends GlyphField {
	constructor(o = {}) {
		super(o);
		const atlas = glyphAtlas(), f = (v) => ({ value: v }), V4 = () => f(new Vector4());
		const nan = [..."NaN"].map((ch) => atlas.index(ch));
		this.material = shaderMaterial({
			vertex: VERT,
			fragment: FRAG,
			transparent: true,
			depthWrite: false,
			depthTest: true,
			blending: 2,
			uniforms: {
				...this.material.uniforms,
				uRed: f(new Vector3(1, .1, .06)),
				uNan: f(new Vector3(...nan)),
				uBits: f(24),
				uCorrupt: f(0),
				uRedMix: f(1),
				uJit: f(0),
				uJitHz: f(12),
				uRot: f(0),
				uRotHz: f(10),
				uBack: f(1),
				uTear: V4(),
				uBlow: V4(),
				uBlowB: f(0),
				uFall: V4(),
				uFall2: V4(),
				uFallX: f(new Vector2(0, 1))
			}
		});
		this.points.material = this.material;
	}
	/** GlyphField.set plus: bits, corrupt, redMix, red, jitter, jitterHz, rot, rotHz, tear, blow, fall, fall2, fallX, back (far-side gain of a shell). */
	set(p, camera, H) {
		super.set(p, camera, H);
		const u = this.material.uniforms;
		u.uBits.value = p.bits ?? 24;
		u.uCorrupt.value = p.corrupt ?? 0;
		u.uRedMix.value = p.redMix ?? 1;
		u.uRed.value.set(...p.red ?? [
			1,
			.1,
			.06
		]);
		u.uJit.value = p.jitter ?? 0;
		u.uJitHz.value = p.jitterHz ?? 12;
		u.uRot.value = p.rot ?? 0;
		u.uRotHz.value = p.rotHz ?? 10;
		u.uBack.value = p.back ?? 1;
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
		u.uFall.value.set(...p.fall ?? [
			0,
			0,
			0,
			0
		]);
		u.uFall2.value.set(...p.fall2 ?? [
			0,
			0,
			0,
			0
		]);
		u.uFallX.value.set(...p.fallX ?? [0, 1]);
		return this;
	}
};
//#endregion
export { CorruptGlyphs };
