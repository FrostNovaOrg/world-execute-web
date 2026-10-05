import { clamp } from "../../engine/math.js?v=BJIlRm7-";
import { MathUtils, Mesh, PlaneGeometry, Vector2, Vector3 } from "../../../vendor/three/build/three.core.js?v=q9f7JKE-";
import { shaderMaterial } from "../../engine/gpu.js?v=o4BYX3o1";
import { hash12 } from "../../lib/glslhash.js?v=CCHaydFR";
//#region src/ch/c1/threadwall.js
var WALL = {
	cols: 48,
	rows: 96,
	w: 16,
	h: 9,
	px: 48
};
var VERT = `
out vec2 vUv; out float vDist;
void main() { vUv = uv; vec4 mv = modelViewMatrix * vec4(position, 1.); vDist = -mv.z; gl_Position = projectionMatrix * mv; }`;
var FRAG = `
uniform float uT, uT0, uRowDt, uDoneT, uDoneW, uErr, uGain, uFocus, uAperture, uFocal, uOrtho, uMaxBlur;
uniform vec3 uFill, uEdge, uFrame, uDone, uWait, uErrCol;
in vec2 vUv; in float vDist; out vec4 o;
uniform vec2 GRID;
// hash keys: (column, row + 1000 per use), whole numbers, so barProgress finds the same bars on the CPU
float progressOf(vec2 id, out float err) {
  float h = hash12(id + vec2(0., 1000.)), row = GRID.y - 1. - id.y;
  float start = uT0 + row * uRowDt + h * .22, dur = .5 + .9 * hash12(id + vec2(0., 2000.));
  float p = clamp((uT - start) / dur, 0., 1.); p = p * p * (3. - 2. * p);
  err = step(hash12(id + vec2(0., 3000.)), uErr);
  if (err > .5) p = min(p, .15 + .7 * hash12(id + vec2(0., 4000.)));
  p = min(p, .99);
  float wave = length((id + .5) / GRID - .5) * uDoneW;                   // EXECUTION: completes from the centre out
  if (uDoneT > 0. && err < .5) p = mix(p, 1., clamp((uT - uDoneT - wave) / .06, 0., 1.));
  return p;
}
vec3 wallAt(vec2 uv, vec2 fw) {
  vec2 g = uv * GRID, id = floor(g), f = fract(g), fc = max(fw * GRID, 1e-5);          // footprint in cell units
  vec2 lo = vec2(.06, .3), hi = vec2(.94, .7), sz = hi - lo;
  vec2 d = min(f - lo, hi - f);
  float inside = clamp(d.x / fc.x + .5, 0., 1.) * clamp(d.y / fc.y + .5, 0., 1.);
  if (inside <= 0.) return vec3(0.);
  float border = min(d.x / fc.x, d.y / fc.y);
  float frame = inside * (1. - clamp(border - .6, 0., 1.));
  vec2 b = (f - lo) / sz;                                                              // 0..1 inside the bar
  float err, p = progressOf(id, err);
  float footX = fc.x / sz.x, pxFoot = footX * 48.;
  float smoothFill = clamp((p - b.x) / footX + .5, 0., 1.);
  float q = floor(b.x * 48.), quant = clamp(p * 48. - q, 0., 1.);
  float fill = mix(quant, smoothFill, clamp(pxFoot * 2. - .5, 0., 1.));
  vec2 pf = fract(b * vec2(48., 4.)), pd = min(pf, 1. - pf);
  float gaps = mix(smoothstep(.04, .14, min(pd.x, pd.y)), 1., clamp(pxFoot * 4. - .6, 0., 1.)); // pixel gaps only up close
  float lead = step(q, p * 48.) * step(p * 48. - 1., q) * step(p, .995);                 // the pixel being written
  float idle = smoothstep(.975, .99, p) * (1. - step(.995, p));                           // done but waiting: dimmed
  vec3 fillCol = mix(uFill * (1. - .5 * idle), uDone, clamp((p - .99) * 100., 0., 1.));
  fillCol = mix(fillCol, uErrCol, err);
  vec3 col = fillCol * fill * gaps * (.8 + .2 * b.y) + uEdge * lead * quant * gaps * (1. - err);
  // at 99 %: the last pixel waits, a slow cursor (2 Hz, local and dim)
  float waiting = step(.985, p) * step(p, .9951) * (1. - err);
  float last = step(47., q) * (1. - fill);
  col += uWait * last * waiting * gaps * (.35 + .35 * step(.5, fract(uT * 2. + hash12(id + vec2(0., 5000.)))));
  col += uFrame * frame * (1. + err);
  return col * inside;
}
void main() {
  vec2 fw = fwidth(vUv);
  float coc = uAperture > 0. ? min(uAperture * abs(vDist - uFocus) / max(vDist, 1e-3) * uFocal, uMaxBlur) : 0.;
  vec3 col;
  if (coc < .75) col = wallAt(vUv, fw);
  else {
    col = vec3(0.);
    for (int k = 0; k < 12; k++) {
      float r = sqrt((float(k) + .5) / 12.) * coc, a = float(k) * 2.39996;
      col += wallAt(vUv + vec2(cos(a), sin(a)) * r * fw, fw * (1. + r * .5));
    }
    col /= 12.;
  }
  o = vec4(col * uGain, 1.);
}`;
/** The wall plane (16 × 9, centred at the origin, facing +z). */
function makeWall() {
	const m = new Mesh(new PlaneGeometry(WALL.w, WALL.h), shaderMaterial({
		vertex: VERT,
		fragment: FRAG,
		transparent: true,
		depthWrite: false,
		blending: 2,
		side: 2,
		uniforms: {
			uT: { value: 0 },
			uT0: { value: 0 },
			uRowDt: { value: .01 },
			uDoneT: { value: -1 },
			uDoneW: { value: .3 },
			uErr: { value: 0 },
			uGain: { value: 1 },
			uFocus: { value: 5 },
			uAperture: { value: 0 },
			uFocal: { value: 500 },
			uOrtho: { value: 0 },
			uMaxBlur: { value: 20 },
			uFill: { value: new Vector3() },
			uEdge: { value: new Vector3() },
			uFrame: { value: new Vector3() },
			uDone: { value: new Vector3() },
			uWait: { value: new Vector3() },
			uErrCol: { value: new Vector3(1, .12, .08) },
			GRID: { value: new Vector2(WALL.cols, WALL.rows) }
		}
	}));
	m.frustumCulled = false;
	/** o: t, t0 (loading starts), rowDt, doneT (EXECUTION, or -1), err (c3 fraction), gain, focus, aperture, maxBlur (design px), pal. */
	m.userData.set = (o, cam, H) => {
		const u = m.material.uniforms, pal = o.pal;
		u.uT.value = o.t;
		u.uT0.value = o.t0;
		u.uRowDt.value = o.rowDt;
		u.uDoneT.value = o.doneT ?? -1;
		u.uDoneW.value = o.doneW ?? .3;
		u.uErr.value = o.err ?? 0;
		u.uGain.value = o.gain ?? 1;
		u.uFocus.value = o.focus ?? 5;
		u.uAperture.value = o.aperture ?? 0;
		u.uMaxBlur.value = (o.maxBlur ?? 20) * H / 1080;
		u.uFocal.value = cam.isPerspectiveCamera ? H / 2 / Math.tan(MathUtils.degToRad(cam.fov) / 2) : 0;
		u.uFill.value.set(...pal.cold.map((c) => c * .32));
		u.uEdge.value.set(...pal.white.map((c) => c * 1.2));
		u.uFrame.value.set(...pal.dim.map((c) => c * .16));
		u.uDone.value.set(...pal.hot.map((c) => c * .9));
		u.uWait.value.set(...pal.warm.map((c) => c * .9));
		m.visible = true;
	};
	return m;
}
/** CPU mirror of one bar's progress (col 0 = left, row 0 = top) before EXECUTION: the shader's hashes on the same keys
* (lib/glslhash.js), so the CPU finds the same bars the shader draws. */
function barProgress(col, row, t, o) {
	const idx = col, idy = WALL.rows - 1 - row, h = hash12(idx, idy + 1e3);
	const start = o.t0 + row * o.rowDt + h * .22, dur = .5 + .9 * hash12(idx, idy + 2e3);
	let p = clamp((t - start) / dur);
	p = p * p * (3 - 2 * p);
	return Math.min(p, .99);
}
/** World position of bar (col, row) centre on the wall plane (z = 0), and of its right end. */
function barPos(col, row) {
	const cw = WALL.w / WALL.cols, rh = WALL.h / WALL.rows;
	return [
		-WALL.w / 2 + (col + .5) * cw,
		WALL.h / 2 - (row + .5) * rh,
		0
	];
}
//#endregion
export { WALL, barPos, barProgress, makeWall };
