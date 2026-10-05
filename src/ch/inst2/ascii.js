import { Vector2, Vector3 } from "../../../vendor/three/build/three.core.js?v=q9f7JKE-";
import { dataTexture, fsMaterial } from "../../engine/gpu.js?v=o4BYX3o1";
import { glyphAtlas } from "../../lib/glyphs.js?v=DWbHICXG";
//#region src/ch/inst2/ascii.js
var FRAG = `
uniform sampler2D tSrc, tAtlas, tRamp; uniform vec2 uRes, uGrid; uniform float uCell, uRampN, uSource, uGain; uniform vec3 uTint;
in vec2 vUv; out vec4 o;
float lum(vec3 c) { return 1. - exp(-luma(c) * uGain); }
void main() {
  vec2 cellPx = vec2(uCell * .6, uCell), px = vUv * uRes, id = floor(px / cellPx), f = fract(px / cellPx);
  vec2 c = (id + .5) * cellPx / uRes;
  vec3 s = (texture(tSrc, c).rgb + texture(tSrc, c + vec2(.3, .3) * cellPx / uRes).rgb + texture(tSrc, c - vec2(.3, .3) * cellPx / uRes).rgb) / 3.;
  float l = lum(s), k = floor(clamp(l, 0., .999) * uRampN);
  if (k < .5) { o = vec4(0., 0., 0., 1.); return; }                       // the blank glyph: nothing to ink
  float ch = texture(tRamp, vec2((k + .5) / uRampN, .5)).r;
  vec2 cell = vec2(mod(ch, uGrid.x), floor(ch / uGrid.x));
  // the em box inside the atlas cell, y mirrored (upright), kept off the cell's edge, at an explicit mip level
  vec2 g = clamp(vec2(.5 + (f.x - .5) * .43, .54 - (f.y - .5) * .72), vec2(.06), vec2(.94));
  float lod = log2(max(1., max(64. * .43 / cellPx.x, 64. * .72 / cellPx.y)));
  float ink = textureLod(tAtlas, (cell + g) / uGrid, lod).r;
  vec3 col = mix(uTint, normalize(s + 1e-4) * 1.7, uSource) * (.35 + 1.3 * l);
  o = vec4(col * ink, 1.);
}`;
var MAT = null;
function material() {
	if (MAT) return MAT;
	const a = glyphAtlas();
	const idx = [...Array(95).keys()].sort((i, j) => a.coverage[i] - a.coverage[j]);
	const pick = [];
	for (let k = 0; k < 24; k++) pick.push(idx[Math.round(k / 23 * 94)]);
	const data = new Float32Array(pick.length * 4);
	pick.forEach((v, i) => data.set([
		v,
		0,
		0,
		0
	], i * 4));
	const f = (v) => ({ value: v });
	MAT = fsMaterial(FRAG, {
		tSrc: f(null),
		tAtlas: f(a.tex),
		tRamp: f(dataTexture(data, pick.length, 1)),
		uRes: f(new Vector2()),
		uGrid: f(new Vector2(a.cols, a.rows)),
		uCell: f(18),
		uRampN: f(pick.length),
		uSource: f(0),
		uGain: f(1.4),
		uTint: f(new Vector3(.42, .92, 1))
	});
	return MAT;
}
/** Composite a captured texture through the ascii view. o: cell (design px), source (0..1), gain, tint. */
function asciiView(ctx, tex, o = {}) {
	const m = material(), u = m.uniforms;
	u.tSrc.value = tex;
	u.uRes.value.set(ctx.W, ctx.H);
	u.uCell.value = (o.cell ?? 16) * ctx.H / 1080;
	u.uSource.value = o.source ?? 0;
	u.uGain.value = o.gain ?? 1.4;
	u.uTint.value.set(...o.tint ?? [
		.42,
		.92,
		1
	]);
	ctx.pass(m);
	Object.assign(ctx.post, {
		bloom: .6,
		threshold: 1.1
	});
}
//#endregion
export { asciiView };
