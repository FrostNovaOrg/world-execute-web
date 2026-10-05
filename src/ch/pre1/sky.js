import { Matrix4, Vector3 } from "../../../vendor/three/build/three.core.js?v=q9f7JKE-";
import { fsMaterial } from "../../engine/gpu.js?v=o4BYX3o1";
//#region src/ch/pre1/sky.js
var FRAG = `
uniform mat4 uCamWorld, uProjInv; uniform vec3 uPole, uRef;
uniform float uTh0, uTh1, uGround, uGain, uHead, uDensity;
in vec2 vUv; out vec4 o;
vec3 bb(float h) {                                   // ~3000 K (orange) … ~12000 K (blue-white)
  return mix(mix(vec3(1., .62, .36), vec3(1., .93, .86), smoothstep(0., .5, h)), vec3(.66, .78, 1.), smoothstep(.5, 1., h));
}
void main() {
  vec4 v = uProjInv * vec4(vUv * 2. - 1., 1., 1.); v /= v.w;
  vec3 rd = normalize((uCamWorld * vec4(v.xyz, 0.)).xyz);
  vec3 ez = uPole, ex = normalize(uRef - ez * dot(uRef, ez)), ey = cross(ez, ex);
  float rho = acos(clamp(dot(rd, ez), -1., 1.)), ra = atan(dot(rd, ey), dot(rd, ex));
  float pw = max(fwidth(rho), 1e-6);
  const float dR = .0042;
  float ri = floor(rho / dR), lo = min(uTh0, uTh1), span = abs(uTh1 - uTh0), back = step(uTh1, uTh0);
  vec3 col = vec3(0.);
  for (int kk = -1; kk <= 1; kk++) {
    float id = ri + float(kk);
    if (id < 0.) continue;
    for (int s = 0; s < 3; s++) {
      vec2 h1 = hash22(vec2(id * 1.13 + float(s) * 7.31, float(s) * 3.7 + 1.9)), h2 = hash22(vec2(id * .71 + 13.7, float(s) * 5.3 + 4.1));
      float rs = (id + h1.x) * dR;
      if (h2.y > uDensity * sin(max(rs, .015)) + .03) continue;
      float d = abs(rho - rs) / pw, w = exp(-d * d * 1.1);
      if (w < .004) continue;
      float x = mod(ra - (h1.y * TAU + lo), TAU);    // angle along the trail from its start
      float aa = pw / max(sin(rs), .01) * 1.5;       // one pixel in α at this ring
      float inArc = span >= TAU ? 1. : 1. - smoothstep(span, span + aa, x);
      float mag = pow(h2.x, 9.), b = .025 + 1.9 * mag;
      float hx = back > .5 ? x : span - x;           // distance from the moving head
      float head = exp(-hx * hx / (aa * aa * 4.)) * step(span, TAU - aa);
      col += bb(fract(h2.x * 17.3 + h1.y * 3.1)) * w * (inArc * b * (.45 + .55 * exp(-hx * 1.4)) + head * b * uHead * 2.5);
    }
  }
  float hor = 0.;
  if (uGround > .5) { col *= smoothstep(-.002, .02, rd.y); hor = exp(-abs(rd.y) * 90.) * .018; }
  o = vec4(col * uGain + vec3(.2, .35, .8) * hor, 1.);
}`;
function makeSky() {
	return fsMaterial(FRAG, {
		uCamWorld: { value: new Matrix4() },
		uProjInv: { value: new Matrix4() },
		uPole: { value: new Vector3(0, 1, 0) },
		uRef: { value: new Vector3(1, 0, 0) },
		uTh0: { value: 0 },
		uTh1: { value: 0 },
		uGround: { value: 0 },
		uGain: { value: 1 },
		uHead: { value: 1 },
		uDensity: { value: .8 }
	});
}
/** Point the sky material at a camera, a pole direction and an exposure arc [th0 → th1] (radians of sky rotation). */
function setSky(m, cam, { pole, ref = [
	1,
	0,
	0
], th0, th1, ground = 0, gain = 1, head = 1, density = .8 }) {
	const u = m.uniforms;
	cam.updateMatrixWorld();
	u.uCamWorld.value.copy(cam.matrixWorld);
	u.uProjInv.value.copy(cam.projectionMatrixInverse);
	u.uPole.value.set(...pole).normalize();
	u.uRef.value.set(...ref);
	u.uTh0.value = th0;
	u.uTh1.value = th1;
	u.uGround.value = ground;
	u.uGain.value = gain;
	u.uHead.value = head;
	u.uDensity.value = density;
}
/**
* The year shown while the sky runs backwards: 2026 at L29, crossing 0 (1 B.C.) exactly on "B.C", −3000 by L30.
* The rewind runs on a logarithmic clock of years-before-present Δ (like the tunnel's log time), in three legs:
* the last few years, then the decades (slow enough to read the milestones passing), then the millennia; after B.C
* it lands softly. Astronomical numbering: year 0 = 1 B.C., −n = (n + 1) B.C.
*/
var L4 = Math.log10(4);
var L83 = Math.log10(83);
var L2026 = Math.log10(2026);
var L5026 = Math.log10(5026);
function yearAt(t, tStart, tBC, tEnd) {
	if (t <= tStart) return 2026;
	if (t <= tBC) {
		const u = (t - tStart) / (tBC - tStart);
		return 2026 - (u < .12 ? 4 * (u / .12) ** 1.5 : u < .78 ? 10 ** (L4 + (L83 - L4) * (u - .12) / .66) : 10 ** (L83 + (L2026 - L83) * (u - .78) / .22));
	}
	const k = 1 - (1 - Math.min(1, (t - tBC) / (tEnd - tBC))) ** 2;
	return 2026 - 10 ** (L2026 + (L5026 - L2026) * k);
}
/**
* AI milestones the rewinding counter passes (newest first), and the oldest computer: [year, label].
* Year numbers are astronomical (−99 = 100 B.C.).
*/
var MILESTONES = [
	[2022, "ChatGPT"],
	[2020, "GPT-3"],
	[2017, "“Attention Is All You Need”"],
	[2012, "AlexNet"],
	[1986, "backpropagation"],
	[1958, "perceptron"],
	[1950, "Turing test"],
	[1943, "McCulloch–Pitts neuron"],
	[-99, "Antikythera mechanism"]
];
/** Time at which the counter passes year y (bisection on the monotone yearAt). */
function timeOfYear(y, tStart, tBC, tEnd) {
	let a = tStart, b = tEnd;
	for (let i = 0; i < 40; i++) {
		const m = (a + b) / 2;
		if (yearAt(m, tStart, tBC, tEnd) > y) a = m;
		else b = m;
	}
	return (a + b) / 2;
}
function yearLabel(y) {
	const n = Math.round(y);
	return n >= 1 ? [`+${n}`, "A.D"] : [n === 0 ? "0" : `−${-n}`, `${1 - n} B.C`];
}
//#endregion
export { MILESTONES, makeSky, setSky, timeOfYear, yearAt, yearLabel };
