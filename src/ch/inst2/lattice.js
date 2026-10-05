import { Color, Matrix4, Vector3 } from "../../../vendor/three/build/three.core.js?v=q9f7JKE-";
import { fsMaterial } from "../../engine/gpu.js?v=o4BYX3o1";
import { CELLS_GLSL, cellTexture } from "../title/cells.js?v=BHJfvVk0";
import { hash33 } from "../../lib/glslhash.js?v=CCHaydFR";
//#region src/ch/inst2/lattice.js
var LAT = {
	C: 4,
	NB: [
		5,
		3,
		14
	],
	lag: .18
};
var FRAG = `
uniform mat4 uCamWorld, uProjInv; uniform vec3 uCamPos;
uniform float uClock, uG, uFog, uGain, uFar, uCorridor, uLag, uNear;
uniform vec3 uColA, uColB, uHot;
in vec2 vUv; out vec4 o;
const float C = 4.;
const vec3 NB = vec3(5., 3., 14.);
${CELLS_GLSL}
float sdBoxFrame(vec3 p, vec3 b, float e) {
  p = abs(p) - b; vec3 q = abs(p + e) - e;
  return min(min(length(max(vec3(p.x, q.y, q.z), 0.)) + min(max(p.x, max(q.y, q.z)), 0.),
                 length(max(vec3(q.x, p.y, q.z), 0.)) + min(max(q.x, max(p.y, q.z)), 0.)),
                 length(max(vec3(q.x, q.y, p.z), 0.)) + min(max(q.x, max(q.y, p.z)), 0.));
}
mat3 rotA(vec3 a, float t) {
  float c = cos(t), s = sin(t), k = 1. - c;
  return mat3(c + a.x * a.x * k, a.y * a.x * k + a.z * s, a.z * a.x * k - a.y * s,
              a.x * a.y * k - a.z * s, c + a.y * a.y * k, a.z * a.y * k + a.x * s,
              a.x * a.z * k + a.y * s, a.y * a.z * k - a.x * s, c + a.z * a.z * k);
}
float colStart(vec2 c) { return (NB.z - c.y) * uLag + abs(c.x) * uLag * .45 + hash33(vec3(c, 5.)).x * .55; }
// true: distance to the nearest surface in this column; returns the safe step (never past the column boundary)
float map(vec3 p, out float dTrue, out float g, out float heat) {
  g = 0.; heat = 0.;
  vec2 lim = (NB.xz + .5) * C;
  vec2 ex = abs(p.xz) - lim;
  float dOut = max(max(ex.x, ex.y), p.y - (NB.y + .5) * C);
  if (dOut > .5) { dTrue = dOut; return dOut; }
  vec2 cxz = clamp(floor(p.xz / C + .5), -NB.xz, NB.xz);
  float age = uClock - colStart(cxz), a = max(age, 0.);
  vec3 q = vec3(p.x - C * cxz.x, p.y + .5 * uG * a * a, p.z - C * cxz.y);
  float cy = clamp(floor(q.y / C + .5), -NB.y, NB.y);
  q.y -= C * cy;
  vec3 id = vec3(cxz.x, cy, cxz.y);
  vec4 cv = cell(id); float h = cv.x, s = h > .42 ? .55 + .5 * cv.y : .1;   // ≤ 1.05: a tumbling box stays in its cell
  float d = 1e3;
  if (!(uCorridor > .5 && cxz.x == 0. && cy == 0.)) {
    vec3 ax = normalize(hash33(id) - .5 + 1e-3);
    vec3 lq = a > 0. ? rotA(ax, a * (.5 + 1.3 * cv.w)) * q : q;
    d = sdBoxFrame(lq, vec3(s), .014 + .012 * cv.z);
  }
  float bw = .02 * (1. - smoothstep(0., .3, age));                         // the corner beams snap as it breaks
  if (bw > .001) d = min(d, length(abs(q.xy) - C * .5) - bw);
  dTrue = d; g = h; heat = age > 0. ? exp(-age * 2.2) : 0.;
  vec2 bnd = C * .5 - abs(p.xz - C * cxz);
  return min(d, max(min(bnd.x, bnd.y), 0.) + .03);
}
void main() {
  vec4 v = uProjInv * vec4(vUv * 2. - 1., 1., 1.); v /= v.w;
  vec3 rd = normalize((uCamWorld * vec4(v.xyz, 0.)).xyz), ro = uCamPos;
  float t = uNear; vec3 col = vec3(0.);
  for (int i = 0; i < 96; i++) {
    vec3 p = ro + rd * t; float dT, g, heat; float d = map(p, dT, g, heat);
    vec3 c = (g > .93 ? uHot * 1.3 : mix(uColA, uColB, g)) + uHot * heat * 1.6;
    float near = smoothstep(.8, 3.5, t), fog = exp(-t * uFog);
    float dt = max(d * .8, .02), w = dt / (.8 * max(dT, .02));              // step-length weight (1 on a free step)
    col += c * near * .0014 / (.004 + dT * dT * 30.) * fog * min(w, 1.);
    if (dT < .002) { col += c * near * .55 * fog; break; }
    t += dt;
    if (t > uFar) break;
  }
  o = vec4(col * uGain, 1.);
}`;
function latticeMaterial() {
	const f = (v) => ({ value: v });
	return fsMaterial(FRAG, {
		uCamWorld: f(new Matrix4()),
		uProjInv: f(new Matrix4()),
		uCamPos: f(new Vector3()),
		uClock: f(0),
		uG: f(3.5),
		uFog: f(.05),
		uGain: f(1),
		uFar: f(70),
		uCorridor: f(1),
		uLag: f(LAT.lag),
		uNear: f(.05),
		uColA: f(new Color(.3, .015, .01)),
		uColB: f(new Color(1, .1, .06)),
		uHot: f(new Color(1, .55, .42)),
		uCells: f(cellTexture())
	});
}
/** Point the material at a camera (after its matrices are updated). o: clock, fog, gain, far, corridor, g. */
function setLattice(m, cam, o = {}) {
	const u = m.uniforms;
	u.uCamWorld.value.copy(cam.matrixWorld);
	u.uProjInv.value.copy(cam.projectionMatrixInverse);
	u.uCamPos.value.copy(cam.position);
	u.uClock.value = o.clock ?? 0;
	u.uFog.value = o.fog ?? .05;
	u.uGain.value = o.gain ?? 1;
	u.uFar.value = o.far ?? 70;
	u.uCorridor.value = o.corridor ?? 1;
	u.uG.value = o.g ?? 3.5;
	u.uNear.value = o.near ?? .05;
	return m;
}
/** CPU twin of colStart and the drop: HUD counts, cameras. The hash is the shader's to the bit (lib/glslhash.js, the
* same whole-number key); the rest is float64, so it can differ from the GPU in the last bits. */
function columnState(cx, cz, clock, g = 3.5) {
	const start = (LAT.NB[2] - cz) * LAT.lag + Math.abs(cx) * LAT.lag * .45 + hash33(cx, cz, 5)[0] * .55, age = clock - start;
	return {
		start,
		age,
		drop: age > 0 ? .5 * g * age * age : 0
	};
}
/** Columns already broken at this clock (of 11 × 29). */
function brokenColumns(clock) {
	let n = 0;
	for (let x = -LAT.NB[0]; x <= LAT.NB[0]; x++) for (let z = -LAT.NB[2]; z <= LAT.NB[2]; z++) if (columnState(x, z, clock).age > 0) n++;
	return n;
}
//#endregion
export { LAT, brokenColumns, columnState, latticeMaterial, setLattice };
