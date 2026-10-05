import { MathUtils, Matrix4, Vector3, Vector4 } from "../../../vendor/three/build/three.core.js?v=q9f7JKE-";
import { fsMaterial } from "../../engine/gpu.js?v=o4BYX3o1";
//#region src/ch/love/glass.js
var FRAG = `
uniform sampler2D tBg, tIn;
uniform mat4 uCamWorld, uProjInv, uModelInv;
uniform vec3 uCamPos, uCamR, uCamU;
uniform vec4 uBound;
uniform float uAppear, uT, uPulse, uGlow, uCage, uContour, uRefr, uDisp, uBody, uFilm, uRefl, uTanHalf, uAspect, uCageN;
uniform vec4 uTouch, uPress;
in vec2 vUv; out vec4 o;

float F(vec3 p) { float g = p.x * p.x + 2.25 * p.z * p.z + p.y * p.y - 1., y3 = p.y * p.y * p.y; return g * g * g - p.x * p.x * y3 - .1125 * p.z * p.z * y3; }
vec3 G(vec3 p) {
  float g = p.x * p.x + 2.25 * p.z * p.z + p.y * p.y - 1., g2 = 3. * g * g, y2 = p.y * p.y, y3 = y2 * p.y;
  return vec3(g2 * 2. * p.x - 2. * p.x * y3, g2 * 2. * p.y - 3. * p.x * p.x * y2 - .3375 * p.z * p.z * y2, g2 * 4.5 * p.z - .225 * p.z * y3);
}
vec3 nrm(vec3 p) { vec3 g = G(p); float l = length(g); return l > 1e-6 ? g / l : normalize(p - vec3(0., .12, 0.)); }

// first t in [ta, tb] where F takes the sign of want (-1 entering, +1 leaving); -1 if none
float crossing(vec3 ro, vec3 rd, float ta, float tb, float want) {
  float t = ta, tp = ta;
  for (int i = 0; i < 96; i++) {
    float f = F(ro + rd * t);
    if (f * want > 0.) {
      float a = tp, b = t;
      for (int k = 0; k < 12; k++) { float m = .5 * (a + b); if (F(ro + rd * m) * want > 0.) b = m; else a = m; }
      return .5 * (a + b);
    }
    if (t >= tb) break;
    // |F|/|∇F| underestimates the distance about 3× where F ≈ g³ (the cube dominates), so step by 1.5× of it;
    // the sign test and bisection still catch the crossing, and the step is capped
    float de = abs(f) / (length(G(ro + rd * t)) + 1e-3);
    tp = t; t = min(t + clamp(1.5 * de, .008, .08), tb);
  }
  return -1.;
}

// anti-aliased unit-spaced lines; where they get denser than a few pixels (or the hit point jumps between pixels)
// they fade to their average coverage instead of filling the pixel
float lineAA(float v, float w) { float d = .5 - abs(fract(v) - .5); return mix(1. - smoothstep(0., max(w, 1e-4), d), .1, smoothstep(.25, .7, w)); }
vec3 envRefl(vec3 d) {
  float key = pow(max(dot(d, normalize(vec3(-.55, .75, .45))), 0.), 22.);
  float warm = pow(max(dot(d, normalize(vec3(.85, .05, -.5))), 0.), 5.);
  float top = smoothstep(-.2, 1., d.y);
  return vec3(1., .9, .78) * key * 1.6 + vec3(1., .42, .55) * warm * .3 + vec3(.85, .8, 1.) * top * .07;
}
vec2 screenOff(vec3 bend) { return vec2(dot(bend, uCamR) / uAspect, dot(bend, uCamU)) * (.5 / uTanHalf); }
// refracted lookup with RGB dispersion; the offset is bounded and samples that leave the frame fade out (a clamped
// lookup would smear the layer's edge pixels into streaks)
float inFrame(vec2 q) { vec2 e = smoothstep(vec2(0.), vec2(.03), q) * smoothstep(vec2(1.), vec2(.97), q); return e.x * e.y; }
vec3 sampleDisp(sampler2D tx, vec2 uv, vec2 off, float disp) {
  float l = length(off); off *= min(1., .1 / max(l, 1e-5));
  vec2 a = uv + off * (1. - disp), b = uv + off, c = uv + off * (1. + disp);
  return vec3(texture(tx, a).r * inFrame(a), texture(tx, b).g * inFrame(b), texture(tx, c).b * inFrame(c));
}

// light leaving one wall toward the eye, plus the wall's transmission and screen-space refraction offset
vec3 wall(vec3 p, vec3 n, vec3 rd, float cont, float cage, float ins, out vec2 off, out float trans) {
  vec3 nf = dot(n, rd) < 0. ? n : -n;
  float ring = 0.;
  if (uTouch.w > -.5) {                                   // rings travelling out from where you passed through
    float age = max(uTouch.w, 0.), d = distance(p, uTouch.xyz), front = .06 + age * .75;
    float env = exp(-age * 1.8) * smoothstep(-.05, .02, uTouch.w) * (1. - smoothstep(.7, 1.15, age));
    float wv = sin((d - front) * 80.) * exp(-abs(d - front) * 10.) * step(d, front + .05) * env;
    vec3 q = p - uTouch.xyz; vec3 tng = q - nf * dot(q, nf); tng /= max(length(tng), 1e-4);
    nf = normalize(nf + tng * wv * .3);
    ring = exp(-pow((d - front) / .02, 2.)) * env + exp(-d * d / .004) * env * .6;
  }
  float ndv = clamp(-dot(nf, rd), 0., 1.), fres = .04 + .96 * pow(1. - ndv, 5.), rim = pow(1. - ndv, 3.);
  vec3 film = palette(rim * 1.3 + p.y * .25 + uT * .04, vec3(.58, .47, .45), vec3(.42, .3, .3), vec3(1.), vec3(.02, .16, .3));
  float spec = pow(max(dot(reflect(rd, nf), normalize(vec3(-.5, .8, .6))), 0.), 80.);
  // seen from inside there is no studio light to reflect: only a faint sheen, no glint
  vec3 c = envRefl(reflect(rd, nf)) * fres * uRefl * (1. - .85 * ins) + film * rim * uFilm * (1. - .6 * ins) + vec3(1., .88, .72) * spec * 1.15 * uRefl * (1. - ins);
  c += vec3(1., .7, .36) * cont * (.45 + 1.4 * rim) * uContour * (1. + 1.2 * uGlow);
  c += vec3(1., .84, .6) * cage * (.55 + rim) * uCage;
  c += vec3(1., .55, .22) * ring * 1.6;
  if (uPress.w > 0.) { float d = distance(p, uPress.xyz); c += vec3(.42, .92, 1.) * exp(-d * d / .01) * uPress.w * .45; }
  off = screenOff(refract(rd, nf, 1. / 1.45) - rd) * uRefr;
  trans = 1. - fres;
  return c * (1. + .5 * uGlow);
}

void main() {
  vec4 v = uProjInv * vec4(vUv * 2. - 1., 1., 1.); v /= v.w;
  vec3 rdW = normalize((uCamWorld * vec4(v.xyz, 0.)).xyz);
  vec3 ro = (uModelInv * vec4(uCamPos, 1.)).xyz, rd = normalize((uModelInv * vec4(rdW, 0.)).xyz);
  vec3 bg = texture(tBg, vUv).rgb, inn = texture(tIn, vUv).rgb;
  bool inside = F(ro) < 0.;
  float t1 = -1., t2 = -1.;
  vec3 oc = ro - uBound.xyz; float b = dot(oc, rd), c = dot(oc, oc) - uBound.w * uBound.w, h = b * b - c;
  if (h > 0. && uAppear > 0.) {
    h = sqrt(h); float ta = max(-b - h, 0.), tb = -b + h;
    if (tb > 0.) {
      if (inside) t1 = crossing(ro, rd, 0., tb, 1.);
      else { t1 = crossing(ro, rd, ta, tb, -1.); if (t1 > 0.) t2 = crossing(ro, rd, t1 + .004, tb, 1.); }
    }
  }
  vec3 p1 = ro + rd * max(t1, 0.), p2 = ro + rd * max(t2, 0.);
  vec3 n1 = t1 > 0. ? nrm(p1) : vec3(0., 0., 1.), n2 = t2 > 0. ? nrm(p2) : vec3(0., 0., 1.);
  // contour coordinates, differentiated in uniform control flow
  float h1 = p1.y * 9. - uT * .3, h2 = p2.y * 9. - uT * .3;
  float m1 = atan(p1.z, p1.x) / TAU * uCageN, m1b = atan(-p1.z, -p1.x) / TAU * uCageN;
  float m2 = atan(p2.z, p2.x) / TAU * uCageN, m2b = atan(-p2.z, -p2.x) / TAU * uCageN;
  float c1 = lineAA(h1, fwidth(h1) * 1.25), c2 = lineAA(h2, fwidth(h2) * 1.25);
  float k1 = lineAA(m1, min(fwidth(m1), fwidth(m1b)) * 1.4), k2 = lineAA(m2, min(fwidth(m2), fwidth(m2b)) * 1.4);
  vec3 col = bg + inn;
  vec3 tint = vec3(1., .86, .9);
  if (t1 > 0.) {
    vec2 off1, off2; float tr1, tr2;
    vec3 w1 = wall(p1, n1, rd, c1, k1, inside ? 1. : 0., off1, tr1);
    if (inside) {
      vec3 behind = sampleDisp(tBg, vUv, off1, uDisp);
      vec3 haze = vec3(1., .3, .5) * (.003 + .01 * t1) * uBody * (1. + 3. * uGlow);
      col = inn + w1 + tr1 * tint * behind + haze;
    } else {
      vec3 w2 = vec3(0.), behind;
      if (t2 > 0.) { w2 = wall(p2, n2, rd, c2, k2, 1., off2, tr2); behind = sampleDisp(tBg, vUv, off1 + off2, uDisp) * tr2 * tint; }
      else behind = sampleDisp(tBg, vUv, off1, uDisp);
      vec3 seen = sampleDisp(tIn, vUv, off1 * .5, uDisp * .5);
      float thick = t2 > 0. ? t2 - t1 : .2;
      vec3 body = vec3(1., .22, .45) * (.004 + .045 * thick * thick) * uBody * (1. + .2 * uPulse) * (1. + 3. * uGlow);
      col = w1 + tr1 * tint * (seen + behind + w2 * .55) + body;
    }
  }
  o = vec4(mix(bg + inn, col, uAppear), 1.);
}`;
function glassMaterial() {
	const v3 = () => ({ value: new Vector3() });
	return fsMaterial(FRAG, {
		tBg: { value: null },
		tIn: { value: null },
		uCamWorld: { value: new Matrix4() },
		uProjInv: { value: new Matrix4() },
		uModelInv: { value: new Matrix4() },
		uCamPos: v3(),
		uCamR: v3(),
		uCamU: v3(),
		uBound: { value: new Vector4(0, .12, 0, 1.36) },
		uAppear: { value: 1 },
		uT: { value: 0 },
		uPulse: { value: 0 },
		uGlow: { value: 0 },
		uCage: { value: 0 },
		uCageN: { value: 24 },
		uContour: { value: 1 },
		uRefr: { value: .06 },
		uDisp: { value: .12 },
		uBody: { value: 1 },
		uFilm: { value: 1.6 },
		uRefl: { value: 1.4 },
		uTanHalf: { value: .32 },
		uAspect: { value: 16 / 9 },
		uTouch: { value: new Vector4(0, 0, 0, -1) },
		uPress: { value: new Vector4(0, 0, 0, 0) }
	});
}
var m4 = new Matrix4();
var DEFAULTS = {
	appear: 1,
	t: 0,
	pulse: 0,
	glow: 0,
	cage: 0,
	cageN: 24,
	contour: 1,
	refr: .06,
	disp: .12,
	body: 1,
	film: 1.6,
	refl: 1.4
};
/** Per frame: camera, heart transform (Object3D), layers and look parameters (every value is set, every frame). */
function setGlass(mat, cam, model, tBg, tIn, o = {}) {
	const u = mat.uniforms;
	cam.updateMatrixWorld();
	model.updateMatrixWorld();
	u.tBg.value = tBg;
	u.tIn.value = tIn;
	u.uCamWorld.value.copy(cam.matrixWorld);
	u.uProjInv.value.copy(cam.projectionMatrixInverse);
	u.uModelInv.value.copy(m4.copy(model.matrixWorld).invert());
	u.uCamPos.value.setFromMatrixPosition(cam.matrixWorld);
	u.uCamR.value.setFromMatrixColumn(cam.matrixWorld, 0).normalize();
	u.uCamU.value.setFromMatrixColumn(cam.matrixWorld, 1).normalize();
	u.uTanHalf.value = Math.tan(MathUtils.degToRad(cam.fov) / 2);
	u.uAspect.value = cam.aspect;
	const v = {
		...DEFAULTS,
		...o
	};
	for (const k in DEFAULTS) u["u" + k[0].toUpperCase() + k.slice(1)].value = v[k];
	if (o.touch) u.uTouch.value.set(...o.touch);
	else u.uTouch.value.set(0, 0, 0, -1);
	if (o.press) u.uPress.value.set(...o.press);
	else u.uPress.value.set(0, 0, 0, 0);
}
//#endregion
export { glassMaterial, setGlass };
