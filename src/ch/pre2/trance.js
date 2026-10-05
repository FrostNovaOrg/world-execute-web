import { Color, Matrix4, Vector2, Vector3 } from "../../../vendor/three/build/three.core.js?v=q9f7JKE-";
import { fsMaterial } from "../../engine/gpu.js?v=o4BYX3o1";
//#region src/ch/pre2/trance.js
var GRATING = `
// one grating's transmission at phase x (in periods): opaque lines of duty uDuty, fading to the mean when the
// period is under ~2 px (w = pixels per period is passed in as fw = fwidth(x))
float cover(float x, float fw, float duty) {                    // line coverage 0..1
  float f = fract(x), d = min(f, 1. - f);                       // distance to the nearest line centre, periods
  float line = 1. - smoothstep(duty * .5 - fw, duty * .5 + fw, d);
  float aa = smoothstep(.25, .6, fw);                           // sub-2px period: average it away
  return mix(line, duty, aa);
}
float trans(float x, float fw, float duty) { return 1. - .92 * cover(x, fw, duty); }
// Two sheets (phases x1, x2 in periods, f1, f2 = periods per pixel), line opacity a, duty D <= .5. Resolved lines: the
// product of the two transmissions. Unresolved lines: the low-pass of that product rather than the product of the
// low-passes (which would be a flat grey). It keeps the beat term, the overlap of the two line sets, max(0, D − |x1 − x2|)
// (the phase difference taken to the nearest period), so the moiré survives even where the lines themselves do not.
float pair(float x1, float f1, float x2, float f2, float duty, float a, out float c1, out float c2) {
  c1 = cover(x1, f1, duty); c2 = cover(x2, f2, duty);
  float exact = (1. - a * c1) * (1. - a * c2);
  float ph = x1 - x2, ov = max(0., duty - abs(ph - floor(ph + .5)));
  float lp = 1. - 2. * a * duty + a * a * ov;
  float k = smoothstep(.18, .5, max(f1, f2));
  return mix(exact, lp, k);
}`;
var MOIRE = `
uniform vec2 uRes; uniform float uMode, uD, uA, uRot, uDTheta, uBright, uDuty, uZoom, uDichro;
uniform vec3 uColA, uColB;
in vec2 vUv; out vec4 o;
${GRATING}
void main() {
  vec2 p = (vUv - .5) * vec2(uRes.x / uRes.y, 1.) / uZoom;      // screen units: frame height = 1
  p = rot2(uRot) * p;
  float T;
  if (uMode < .5) {
    // two ring gratings about centres ±a: fringes along r₁ − r₂ = k·d (hyperbolae) and r₁ + r₂ = k·d (ellipses)
    float r1 = length(p - vec2(-uA, 0.)) / uD, r2 = length(p - vec2(uA, 0.)) / uD, q1, q2;
    T = pair(r1, fwidth(r1), r2, fwidth(r2), uDuty, .92, q1, q2);
  } else {
    // two line gratings at ±Δθ/2: straight fringes of spacing d / (2 sin(Δθ/2)), perpendicular to the bisector
    vec2 n1 = vec2(cos(uDTheta * .5), sin(uDTheta * .5)), n2 = vec2(cos(-uDTheta * .5), sin(-uDTheta * .5));
    float x1 = dot(p, n1) / uD, x2 = dot(p, n2) / uD, c1, c2;
    T = pair(x1, fwidth(x1), x2, fwidth(x2), uDuty, .96, c1, c2);
    // dichroic sheets (uDichro): sheet 1's lines pass violet, sheet 2's pass pink, so the fringes come in colours
    vec3 T3 = (1. - c1 * vec3(.96, .96, .55)) * (1. - c2 * vec3(.5, .96, .8));
    float r0 = length(p * uZoom);
    vec3 back0 = mix(uColA, uColB, smoothstep(.05, .9, r0)) * (1. - smoothstep(.55, 1.05, r0 * .9));
    o = vec4(back0 * mix(vec3(T), T3, uDichro) * uBright, 1.);
    return;
  }
  float r = length(p * uZoom);
  vec3 back = mix(uColA, uColB, smoothstep(.05, .9, r)) * (1. - smoothstep(.55, 1.05, r * .9));
  o = vec4(back * T * uBright, 1.);
}`;
var TUNNEL = `
uniform mat4 uCamWorld, uProjInv; uniform vec3 uCamPos;
uniform float uT, uRot, uN, uFade, uD, uDTheta, uWall, uRing, uExit, uExitZ, uStop, uBright, uPulse;
uniform vec3 uColA, uColB;
in vec2 vUv; out vec4 o;
${GRATING}
const float DZ = 1.3;
float snorm(vec2 p, float n) { p = abs(p) + 1e-5; return pow(pow(p.x, n) + pow(p.y, n), 1. / n); }
// rings: superellipse loops of radius uRing, tube .028; ring k turned by ±uRot (alternating) plus a fixed twist
float rings(vec3 p, out float ang, out float k) {
  k = floor(p.z / DZ + .5);
  vec3 q = vec3(p.xy, p.z - k * DZ);
  float s = mod(k, 2.) < .5 ? 1. : -1.;
  vec2 xy = rot2(s * uRot + k * .4) * q.xy;
  ang = atan(xy.y, xy.x);
  return length(vec2(snorm(xy, uN) - uRing, q.z)) - .028;
}
void main() {
  vec4 v = uProjInv * vec4(vUv * 2. - 1., 1., 1.); v /= v.w;
  vec3 rd = normalize((uCamWorld * vec4(v.xyz, 0.)).xyz), ro = uCamPos;
  float t = .05, glow = 0., hitT = -1.; vec3 gcol = vec3(0.);
  float tStop = uStop > .5 && rd.z < 0. ? (uExitZ - ro.z) / rd.z : 1e9;
  for (int i = 0; i < 90; i++) {
    if (t > tStop) break;
    vec3 p = ro + rd * t;
    float ang, k, d = rings(p, ang, k);
    float dw = uWall - snorm(p.xy, uN);                          // inside the tunnel: distance to the wall (approx.)
    // ring light: dashed teeth (24 per ring), a brighter tooth that marks each ring's turn
    float teeth = .35 + .65 * step(.42, fract(ang / TAU * 24.));
    float mark = exp(-pow((fract(ang / TAU + .5) - .5) * 30., 2.));
    float fog = exp(-t * .09);
    vec3 c = mix(uColA, uColB, .5 + .5 * sin(k * 1.7)) * (teeth + 2. * mark) * (1. + .5 * uPulse);
    gcol += c * .0011 / (.0025 + d * d * 40.) * fog * smoothstep(.4, 2.4, t);   // near rings faded: no big bright sweeps at the frame edge
    if (dw < .002) { hitT = t; break; }
    t += max(min(d, dw) * .8, .012);
    if (t > 40.) break;
  }
  vec3 col = gcol;
  // wall coordinates computed for every pixel (derivatives need uniform control flow); the angle's screen-space
  // derivative is unwrapped so the ±π seam does not read as a discontinuity
  vec3 p = ro + rd * (hitT > 0. ? hitT : 40.);
  float th = atan(p.y, p.x), c1 = cos(uDTheta * .5), s1 = sin(uDTheta * .5);
  vec2 gth = vec2(dFdx(th), dFdy(th)); gth -= TAU * floor(gth / TAU + .5);
  vec2 gz = vec2(dFdx(p.z), dFdy(p.z));
  float x1 = (th * uWall * c1 + p.z * s1) / uD, x2 = (th * uWall * c1 - p.z * s1) / uD;
  vec2 g1 = (gth * uWall * c1 + gz * s1) / uD, g2 = (gth * uWall * c1 - gz * s1) / uD;
  float T = trans(x1, abs(g1.x) + abs(g1.y), .45) * trans(x2, abs(g2.x) + abs(g2.y), .45);
  if (hitT > 0.) col += mix(uColB, uColA, .5 + .5 * sin(th * 2. + uT * .3)) * T * uBright * exp(-hitT * .11);
  // the exit: a bright square (or circle) far down the tunnel
  if (uExit > 0.) {
    float tz = (uExitZ - ro.z) / rd.z;
    if (tz > 0.) { vec3 q = ro + rd * tz; float e = snorm(q.xy, uN) / uWall; col += mix(uColA, vec3(1.), .6) * uExit * (1. - smoothstep(.97, 1., e)) * .9; }
  }
  o = vec4(col * uFade, 1.);
}`;
function moireMaterial() {
	return fsMaterial(MOIRE, {
		uRes: { value: new Vector2(1920, 1080) },
		uMode: { value: 0 },
		uD: { value: .02 },
		uA: { value: .1 },
		uRot: { value: 0 },
		uDTheta: { value: .1 },
		uBright: { value: .1 },
		uDuty: { value: .5 },
		uZoom: { value: 1 },
		uDichro: { value: 0 },
		uColA: { value: new Color(.55, .35, 1) },
		uColB: { value: new Color(1, .3, .7) }
	});
}
function tunnelMaterial() {
	return fsMaterial(TUNNEL, {
		uCamWorld: { value: new Matrix4() },
		uProjInv: { value: new Matrix4() },
		uCamPos: { value: new Vector3() },
		uT: { value: 0 },
		uRot: { value: 0 },
		uN: { value: 2 },
		uFade: { value: 1 },
		uD: { value: .05 },
		uDTheta: { value: .2 },
		uWall: { value: 2 },
		uRing: { value: 1.75 },
		uExit: { value: 0 },
		uExitZ: { value: -30 },
		uStop: { value: 0 },
		uBright: { value: .1 },
		uPulse: { value: 0 },
		uColA: { value: new Color(.55, .35, 1) },
		uColB: { value: new Color(1, .3, .7) }
	});
}
/** Copy a three.js camera into a ray-march material (so 3D overlays drawn with the same camera line up). */
function camUniforms(m, cam) {
	cam.updateMatrixWorld();
	m.uniforms.uCamWorld.value.copy(cam.matrixWorld);
	m.uniforms.uProjInv.value.copy(cam.projectionMatrixInverse);
	m.uniforms.uCamPos.value.copy(cam.position);
}
//#endregion
export { camUniforms, moireMaterial, tunnelMaterial };
