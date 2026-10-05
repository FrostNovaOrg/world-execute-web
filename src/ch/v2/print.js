import { Vector2, Vector3 } from "../../../vendor/three/build/three.core.js?v=q9f7JKE-";
import { fsMaterial } from "../../engine/gpu.js?v=o4BYX3o1";
import { capture } from "../../lib/modes.js?v=Cu3GYO-2";
//#region src/ch/v2/print.js
var FRAG = `
uniform sampler2D tSrc; uniform vec2 uRes; uniform vec3 uPaper; uniform float uGain, uFibre;
in vec2 vUv; out vec4 o;
void main() {
  vec3 s = texture(tSrc, vUv).rgb;
  float m = max(s.r, max(s.g, s.b)), cover = 1. - exp(-m * uGain);
  float sat = m > 1e-5 ? 1. - min(s.r, min(s.g, s.b)) / m : 0.;
  vec3 hue = m > 1e-5 ? s / m : vec3(1.);
  vec3 ink = mix(vec3(.06, .065, .08), pow(hue, vec3(1.6)) * .74, smoothstep(.15, .85, sat));
  // the page: a faint fibre texture (two octaves of value noise, fixed to the page)
  vec2 q = vUv * uRes / 3.;
  float n = hash12(floor(q)) * .6 + hash12(floor(q * .37) + 17.) * .4;
  vec3 col = mix(uPaper * (1. - uFibre * n), ink, cover);
  o = vec4(pow(max(col, 0.), vec3(2.2)), 1.);
}`;
var MAT = null;
var material = () => MAT ??= fsMaterial(FRAG, {
	tSrc: { value: null },
	uRes: { value: new Vector2() },
	uPaper: { value: new Vector3(.945, .935, .905) },
	uGain: { value: 2.2 },
	uFibre: { value: .035 }
});
/** Draw fn(sub) (as with modes.capture) and print it onto the shot's target. o: gain, paper [r,g,b] (display), fibre. */
function printed(ctx, fn, o = {}) {
	const tex = capture(ctx, fn), m = material(), u = m.uniforms;
	u.tSrc.value = tex;
	u.uRes.value.set(ctx.W, ctx.H);
	u.uGain.value = o.gain ?? 2.2;
	u.uFibre.value = o.fibre ?? .035;
	u.uPaper.value.set(...o.paper ?? [
		.945,
		.935,
		.905
	]);
	ctx.pass(m);
}
/** Grade for printed shots: display-referred, no bloom or aberration, a light vignette. */
var PRINT_LOOK = {
	tonemap: 2,
	bloom: 0,
	ca: 0,
	grain: .025,
	vignette: .14,
	exposure: 1
};
/** Ink colours for text on the page (sRGB hex). */
var INK = {
	black: "#1b1d23",
	grey: "#6d717c",
	amber: "#b1531a",
	teal: "#1f6f80",
	red: "#a8322a",
	faint: "#b9b6ad"
};
//#endregion
export { INK, PRINT_LOOK, printed };
