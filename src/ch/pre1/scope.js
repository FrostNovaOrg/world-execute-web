import { Mesh, PlaneGeometry, Vector3 } from "../../../vendor/three/build/three.core.js?v=q9f7JKE-";
import { shaderMaterial } from "../../engine/gpu.js?v=o4BYX3o1";
//#region src/ch/pre1/scope.js
var SCOPE = {
	div: .3,
	hx: 5,
	hy: 4,
	vPerDiv: .5,
	vrms: 1
};
var VP = SCOPE.vrms * Math.SQRT2;
var AMP_DIV = VP / SCOPE.vPerDiv;
/** Trace height (in divisions) at x (divisions from centre). fold: 0..1 rectification; wt: RC filter ωτ (0 = none). */
function scopeWave(x, fold, wt, amp = AMP_DIV) {
	const th = 2 * Math.PI * x / 4, s = Math.sin(th);
	if (wt <= 1e-4) return (s < 0 ? s * Math.cos(Math.PI * fold) : s) * amp;
	let y = 2 / Math.PI;
	for (let n = 1; n <= 14; n++) {
		const a = 2 * n * wt, k = 2 * n;
		y -= 4 / (Math.PI * (4 * n * n - 1)) * (Math.cos(k * th) + a * Math.sin(k * th)) / (1 + a * a);
	}
	return y * amp;
}
/** Ripple (peak-to-peak over mean) and mean of the filtered trace, sampled over one period. */
function ripple(wt) {
	let lo = 1e9, hi = -1e9, sum = 0;
	const n = 200;
	for (let i = 0; i < n; i++) {
		const y = scopeWave(i / n * 2, 1, wt, 1);
		lo = Math.min(lo, y);
		hi = Math.max(hi, y);
		sum += y;
	}
	return {
		pp: (hi - lo) / (sum / n),
		mean: sum / n
	};
}
var VERT = `
out vec2 vUv;
void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`;
var FRAG = `
uniform float uFold, uTau, uAmp, uHead, uPersist, uGain, uSignal, uGrid, uWidth;
uniform vec3 uTrace, uGridCol;
in vec2 vUv; out vec4 o;
float wave(float x) {
  float th = TAU * x / 4., s = sin(th), y;
  if (uTau < 1e-4) y = s < 0. ? s * cos(PI * uFold) : s;
  else {
    y = 2. / PI;
    for (int n = 1; n <= 14; n++) { float fn = float(n), k = 2. * fn, a = k * uTau; y -= 4. / (PI * (4. * fn * fn - 1.)) * (cos(k * th) + a * sin(k * th)) / (1. + a * a); }
  }
  return y * uAmp * uSignal;
}
float segDist(vec2 p, vec2 a, vec2 b) { vec2 pa = p - a, ba = b - a; float h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-8), 0., 1.); return length(pa - ba * h); }
void main() {
  vec2 p = (vUv - .5) * vec2(10., 8.);                  // divisions
  float px = fwidth(p.x);                               // divisions per pixel
  // graticule: division lines (dotted), centre axes with fifth-division ticks
  vec2 g = abs(fract(p + .5) - .5) / max(fwidth(p), 1e-5);
  float lines = (1. - min(min(g.x, g.y), 1.)) * (.5 + .5 * step(.5, fract((p.x + p.y) * 5.)));
  vec2 ax = abs(p) / max(fwidth(p), 1e-5);
  float axes = 1. - min(min(ax.x, ax.y), 1.);
  vec2 tk = abs(fract(p * 5. + .5) - .5) / max(fwidth(p * 5.), 1e-5);
  float ticks = (1. - min(tk.x, 1.)) * step(abs(p.y), .12) + (1. - min(tk.y, 1.)) * step(abs(p.x), .12);
  vec3 col = uGridCol * (lines * .5 + axes * .8 + ticks * .7) * uGrid;
  // trace: distance to the polyline through five samples around x (exact near the rectifier cusps)
  float d = 1e9, h = .045; vec2 prev = vec2(p.x - 2. * h, wave(p.x - 2. * h));
  for (int k = -1; k <= 2; k++) { vec2 q = vec2(p.x + float(k) * h, wave(p.x + float(k) * h)); d = min(d, segDist(p, prev, q)); prev = q; }
  float w = max(uWidth, px * 1.2);
  float core = exp(-d * d / (w * w)), halo = exp(-d / (w * 5.)) * .18;
  float age = fract((uHead - p.x) / 10.);                // fraction of a sweep since the beam passed here
  float persist = .22 + .78 * exp(-age * uPersist);
  float head = exp(-dot(p - vec2(uHead, wave(uHead)), p - vec2(uHead, wave(uHead))) / (w * w * 9.));
  col += uTrace * ((core * 1.6 + halo) * persist + head * 2.5);
  vec2 e = abs(p) - vec2(5., 4.); float edge = exp(-max(max(e.x, e.y), 0.) * 60.);
  o = vec4(col * uGain * step(max(e.x, e.y), .0) + uGridCol * .9 * uGrid * (1. - smoothstep(0., px * 1.5, abs(max(e.x, e.y)))) * uGain, 1.);
}`;
/** The screen plane (width 3, height 2.4, centred at the origin, facing +z). */
function makeScreen() {
	const m = new Mesh(new PlaneGeometry(10 * SCOPE.div, 8 * SCOPE.div), shaderMaterial({
		vertex: VERT,
		fragment: FRAG,
		transparent: true,
		depthWrite: false,
		blending: 2,
		side: 2,
		uniforms: {
			uFold: { value: 0 },
			uTau: { value: 0 },
			uAmp: { value: AMP_DIV },
			uHead: { value: 0 },
			uPersist: { value: 3 },
			uGain: { value: 1 },
			uSignal: { value: 1 },
			uGrid: { value: 1 },
			uWidth: { value: .035 },
			uTrace: { value: new Vector3(.42, .92, 1) },
			uGridCol: { value: new Vector3(.1, .3, .7) }
		}
	}));
	m.frustumCulled = false;
	/** o: fold, tau, head (beam x in div), persist, gain, signal (0..1 amplitude), grid, width (div), trace [rgb], gridCol [rgb]. */
	m.userData.set = (o) => {
		const u = m.material.uniforms;
		for (const [k, n] of [
			["fold", "uFold"],
			["tau", "uTau"],
			["head", "uHead"],
			["persist", "uPersist"],
			["gain", "uGain"],
			["signal", "uSignal"],
			["grid", "uGrid"],
			["width", "uWidth"]
		]) if (o[k] != null) u[n].value = o[k];
		if (o.trace) u.uTrace.value.set(...o.trace);
		if (o.gridCol) u.uGridCol.value.set(...o.gridCol);
		m.visible = true;
	};
	return m;
}
//#endregion
export { AMP_DIV, SCOPE, VP, makeScreen, ripple, scopeWave };
