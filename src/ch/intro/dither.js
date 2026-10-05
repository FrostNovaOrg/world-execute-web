import { Vector2 } from "../../../vendor/three/build/three.core.js?v=q9f7JKE-";
import { fsMaterial } from "../../engine/gpu.js?v=o4BYX3o1";
//#region src/ch/intro/dither.js
var FRAG = `
uniform sampler2D tSrc; uniform vec2 uRes; uniform float uGain, uPix, uWhite;
in vec2 vUv; out vec4 o;
float lum(vec3 c) { return 1. - exp(-luma(c) * uGain); }    // as lib/modes.js: HDR luminance, softly compressed to 0..1
float bayer2(vec2 a) { a = floor(a); return fract(a.x / 2. + a.y * a.y * .75); }
float bayer8(vec2 a) { return (bayer2(.25 * a) * .25 + bayer2(.5 * a)) * .25 + bayer2(a); }
void main() {
  vec2 px = floor(vUv * uRes / uPix), c = (px + .5) * uPix / uRes;
  vec3 s = texture(tSrc, c).rgb;
  vec3 ink = mix(s / max(max(s.r, max(s.g, s.b)), 1e-5), vec3(1.), uWhite);   // its colour at full value (linear)
  o = vec4(lum(s) > bayer8(px) + .5 / 64. ? ink : vec3(0.), 1.);
}`;
var MAT = null;
/**
* Composite a captured texture (lib/modes.js capture) into the shot through the colour 1-bit view. o: pix (design px,
* default 3), gain (default 1.4), white (0..1, how far the inks are paled toward white), look (false: keep ctx.post;
* by default the 1-bit grade of lib/modes.js's dither).
*/
function hueDither(ctx, tex, o = {}) {
	MAT ??= fsMaterial(FRAG, {
		tSrc: { value: null },
		uRes: { value: new Vector2() },
		uGain: { value: 1.4 },
		uPix: { value: 3 },
		uWhite: { value: .1 }
	});
	const u = MAT.uniforms;
	u.tSrc.value = tex;
	u.uRes.value.set(ctx.W, ctx.H);
	u.uGain.value = o.gain ?? 1.4;
	u.uPix.value = (o.pix ?? 3) * ctx.H / 1080;
	u.uWhite.value = o.white ?? .1;
	ctx.pass(MAT);
	if (o.look !== false) Object.assign(ctx.post, {
		tonemap: 2,
		bloom: 0,
		ca: 0,
		grain: 0,
		vignette: .15
	});
}
//#endregion
export { hueDither };
