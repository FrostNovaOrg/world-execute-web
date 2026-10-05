import { clamp, ease } from "../../engine/math.js?v=BJIlRm7-";
import { MathUtils, Matrix3, Vector2, Vector3 } from "../../../vendor/three/build/three.core.js?v=q9f7JKE-";
import { fsMaterial } from "../../engine/gpu.js?v=o4BYX3o1";
import { CELLS_GLSL, cellTexture } from "./cells.js?v=BHJfvVk0";
//#region src/ch/title/lattice.js
var FRAG = `
uniform vec2 uRes; uniform float uT, uZ, uPulse, uFade, uRoll, uTan, uSS, uSway, uBeam;
uniform mat3 uBasis; uniform vec3 uRo;
in vec2 vUv; out vec4 o;
${CELLS_GLSL}
float sdBoxFrame(vec3 p, vec3 b, float e) {
  p = abs(p) - b; vec3 q = abs(p + e) - e;
  return min(min(length(max(vec3(p.x, q.y, q.z), 0.)) + min(max(p.x, max(q.y, q.z)), 0.),
                 length(max(vec3(q.x, p.y, q.z), 0.)) + min(max(q.x, max(p.y, q.z)), 0.)),
                 length(max(vec3(q.x, q.y, p.z), 0.)) + min(max(q.x, max(q.y, p.z)), 0.));
}
// d: distance; g: cell hash (colour); th: thickness of the nearest structure (for coverage); bm: 1 on a z-beam
float map(vec3 p, out float g, out float th, out float bm) {
  const float C = 4.;
  vec3 id = floor(p / C + .5), q = p - C * id;
  vec4 cv = cell(id); float h = cv.x, s = h > .42 ? .7 + .95 * cv.y : .1;   // many cells hold only a small node
  float e = .014 + .012 * cv.z;
  float d = sdBoxFrame(q, vec3(s), e);
  float beam = length(abs(q.xy) - C * .5) - .02;                        // beams along z at the cell corners
  th = d < beam ? e : .02;
  bm = d < beam ? 0. : 1.;
  d = min(d, beam);
  d = max(d, -(length(p.xy) - 1.3));                                     // keep a tunnel open along the flight path
  g = h;
  return d;
}
vec3 march(vec3 ro, vec3 rd, float pix) {
  float t = .05, trans = 1.; vec3 col = vec3(0.);
  vec3 sg = sign(rd), rdi = 1. / max(abs(rd), vec3(1e-5));
  for (int i = 0; i < 84; i++) {
    vec3 p = ro + rd * t; float g, th, bm; float d = map(p, g, th, bm);
    float fp = t * pix;                                                  // pixel footprint radius at this depth
    float band = exp(-abs(fract((p.z - uZ) * .06 - uPulse) - .5) * 18.);  // a pulse of light runs down the tunnel on each beat
    vec3 c = (g > .93 ? vec3(.85, .95, 1.) * 1.6 : mix(vec3(.08, .3, 1.), vec3(.2, .85, 1.), g)) * (.34 + 1.7 * band);
    c *= mix(1., uBeam, bm);                                              // uBeam < 1: the beams give way to their code
    float near = smoothstep(.8, 3.5, t), fog = exp(-t * .075);
    // glow: a Lorentzian around the structures, never narrower than the footprint; widening keeps its energy
    float w0 = .0115, w = max(w0, fp * .8);
    col += trans * c * near * fog * (.0014 / 30.) * (w / w0) / (w * w + d * d);
    // cone hit: a structure thinner than the footprint only covers part of the pixel; the ray continues through
    if (d < max(.002, fp * .5)) {
      float cov = clamp(th / max(fp, 1e-4), 0., 1.);
      col += trans * c * near * .55 * fog * cov;
      trans *= 1. - cov;
      if (trans < .04) break;
      t += max(fp, .02);
      continue;
    }
    // the SDF only sees this cell's frame: never step further than the cell exit plus the .35 clearance every frame
    // keeps from its cell border, or the ray can skip a neighbour's frame (dotted far lines)
    vec3 q = p - 4. * floor(p / 4. + .5), ex = (2. - q * sg) * rdi;   // ≥ 0: distance to leave the cell on each axis
    t += max(min(d * .8, min(min(ex.x, ex.y), ex.z) + .3), .02);
    if (t > 55.) break;
  }
  return col;
}
void main() {
  vec2 px = 1. / uRes;
  float pix = 2. * uTan / uRes.y;                                          // radians per pixel
  vec3 col = vec3(0.);
  // two rays per pixel on a rotated grid (uSS = 1 → one ray)
  for (int k = 0; k < 2; k++) {
    if (float(k) >= uSS) break;
    vec2 off = uSS > 1.5 ? (k == 0 ? vec2(.25, -.25) : vec2(-.25, .25)) : vec2(0.);
    vec2 uv = ((vUv + off * px) * 2. - 1.) * vec2(uRes.x / uRes.y, 1.) * uTan;
    uv = rot2(uRoll) * uv;
    vec3 ro = uRo + vec3(uSway * .25 * sin(uT * .7), uSway * .2 * cos(uT * .5), uZ);
    vec3 rd = normalize(uBasis * vec3(uv, 1.));
    col += march(ro, rd, pix);
  }
  o = vec4(col / max(uSS, 1.) * uFade, 1.);
}`;
function latticeMaterial() {
	return fsMaterial(FRAG, {
		uRes: { value: new Vector2(1, 1) },
		uT: { value: 0 },
		uZ: { value: 0 },
		uPulse: { value: 0 },
		uFade: { value: 1 },
		uRoll: { value: 0 },
		uTan: { value: Math.tan(MathUtils.degToRad(64) / 2) },
		uSS: { value: 2 },
		uSway: { value: 1 },
		uBeam: { value: 1 },
		uBasis: { value: new Matrix3() },
		uRo: { value: new Vector3() },
		uCells: { value: cellTexture() }
	});
}
/**
* The flight as a function of song time: z along the tunnel (a cruise that accelerates, plus a shove forward on
* every beat), and the beat phase for the light pulses. t0 = flight start, beatAt = T.beatAt.
*/
function flightState(t, t0, beatAt, tEnd) {
	const lt = Math.max(0, t - t0), dur = tEnd - t0;
	const u = Math.min(lt, dur) / dur, z = 5.2 * lt + .75 * dur * u ** 4 + (lt > dur ? 3 * (lt - dur) : 0);
	const bs = beatAt(t) - beatAt(t0), surge = Math.floor(bs) + ease.outCubic(clamp(bs % 1 / .35));
	return {
		z: z + 1.4 * Math.max(0, surge),
		pulse: (beatAt(t) % 1 + 1) % 1,
		lt
	};
}
/**
* Camera basis for a setup: yaw (about y), pitch (about x) of the view direction, relative to +z. Returns a Matrix3
* whose columns are right, up, forward.
*/
function basis(yaw = 0, pitch = 0) {
	const f = new Vector3(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch));
	const upW = Math.abs(f.y) > .99 ? new Vector3(0, 0, 1) : new Vector3(0, 1, 0);
	const r = new Vector3().crossVectors(upW, f).normalize(), u = new Vector3().crossVectors(f, r);
	return new Matrix3().set(r.x, u.x, f.x, r.y, u.y, f.y, r.z, u.z, f.z);
}
//#endregion
export { basis, flightState, latticeMaterial };
