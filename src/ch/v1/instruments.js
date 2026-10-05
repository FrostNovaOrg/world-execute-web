import { BufferAttribute, BufferGeometry, MathUtils, Points, Vector2, Vector3 } from "../../../vendor/three/build/three.core.js?v=q9f7JKE-";
import { dataTexture, fsMaterial, shaderMaterial } from "../../engine/gpu.js?v=o4BYX3o1";
import { glyphAtlas } from "../../lib/glyphs.js?v=DWbHICXG";
//#region src/ch/v1/instruments.js
var ASCII = `
uniform sampler2D tSrc, tAtlas, tRamp; uniform vec2 uRes, uGrid; uniform float uCell, uRampN, uSource, uGain; uniform vec3 uTint;
in vec2 vUv; out vec4 o;
float lum(vec3 c) { return 1. - exp(-luma(c) * uGain); }
void main() {
  vec2 cellPx = vec2(uCell * .6, uCell), px = vUv * uRes, id = floor(px / cellPx), f = fract(px / cellPx);
  vec2 c = (id + .5) * cellPx / uRes;
  vec3 s = (texture(tSrc, c).rgb + texture(tSrc, c + vec2(.3, .3) * cellPx / uRes).rgb + texture(tSrc, c - vec2(.3, .3) * cellPx / uRes).rgb) / 3.;
  float l = lum(s), k = floor(clamp(l, 0., .999) * uRampN);
  if (k < .5) { o = vec4(0., 0., 0., 1.); return; }                 // the empty glyph: nothing to ink
  float ch = texture(tRamp, vec2((k + .5) / uRampN, .5)).r;
  vec2 cell = vec2(mod(ch, uGrid.x), floor(ch / uGrid.x));
  vec2 g = clamp(vec2(.5 + (f.x - .5) * .43, .54 - (f.y - .5) * .72), vec2(.06), vec2(.94));
  float ink = texture(tAtlas, (cell + g) / uGrid).r;
  vec3 col = mix(uTint, normalize(s + 1e-4) * 1.7, uSource) * (.35 + 1.3 * l);
  o = vec4(col * ink, 1.);
}`;
var M = null;
var RAMP = null;
function ramp() {
	if (RAMP) return RAMP;
	const a = glyphAtlas(), idx = [...Array(95).keys()].sort((i, j) => a.coverage[i] - a.coverage[j]), pick = [];
	for (let k = 0; k < 24; k++) pick.push(idx[Math.round(k / 23 * 94)]);
	const data = new Float32Array(pick.length * 4);
	pick.forEach((v, i) => data.set([
		v,
		0,
		0,
		0
	], i * 4));
	return RAMP = {
		tex: dataTexture(data, pick.length, 1),
		n: pick.length
	};
}
/** The frame as the film's own characters. o: cell (design px line height), tint (linear), source (0..1 hue from image), gain. */
function asciiView(ctx, tex, o = {}) {
	const a = glyphAtlas(), r = ramp();
	M ??= fsMaterial(ASCII, {
		tSrc: { value: null },
		tAtlas: { value: null },
		tRamp: { value: null },
		uRes: { value: new Vector2() },
		uGrid: { value: new Vector2() },
		uCell: { value: 16 },
		uRampN: { value: 1 },
		uSource: { value: 0 },
		uGain: { value: 1.4 },
		uTint: { value: new Vector3() }
	});
	const u = M.uniforms;
	u.tSrc.value = tex;
	u.tAtlas.value = a.tex;
	u.tRamp.value = r.tex;
	u.uRes.value.set(ctx.W, ctx.H);
	u.uGrid.value.set(a.cols, a.rows);
	u.uCell.value = (o.cell ?? 16) * ctx.H / 1080;
	u.uRampN.value = r.n;
	u.uSource.value = o.source ?? 0;
	u.uGain.value = o.gain ?? 1.4;
	u.uTint.value.set(...o.tint ?? [
		.42,
		.92,
		1
	]);
	ctx.pass(M);
	Object.assign(ctx.post, {
		bloom: .6,
		threshold: 1.1
	});
}
var SHEET_VERT = `
uniform float uN, uW, uD, uAmp, uK, uOmega, uT, uSize, uFocal, uFocus, uAperture, uMaxBlur, uBright, uMinPx, uPow;
out float vHeat; out float vBlur;
void main() {
  float i = float(gl_VertexID);
  vec2 g = vec2(mod(i, uN), floor(i / uN)), j = hash22(g + 17.) - .5;
  float x = ((g.x + .5 + j.x * .9) / uN - .5) * uW, z = ((g.y + .5 + j.y * .9) / uN - .5) * uD;
  float y = uAmp * sin(uK * x - uOmega * uT);
  vec4 mv = modelViewMatrix * vec4(x, y, z, 1.);
  gl_Position = projectionMatrix * mv;
  float dist = max(-mv.z, 1e-3), px = uSize * uFocal / dist, blur = min(uAperture * abs(dist - uFocus) * uFocal / dist, uMaxBlur);
  float core = max(px, uMinPx);
  gl_PointSize = core + blur; vBlur = blur / (core + blur);
  vHeat = uBright * pow(y / uAmp * .5 + .5, uPow) * mix(1., .55, vBlur);
}`;
var SHEET_FRAG = `
in float vHeat; in float vBlur; out vec4 o;
void main() {
  float r = length(gl_PointCoord - .5) * 2.;
  float a = mix(1. - smoothstep(.55, 1., r), 1. - smoothstep(.8, 1., r), vBlur);
  o = vec4(vec3(vHeat * a), 1.);
}`;
var HeightSheet = class {
	constructor(n = 400) {
		this.n = n;
		const geo = new BufferGeometry();
		geo.setAttribute("position", new BufferAttribute(new Float32Array(n * n * 3), 3));
		this.material = shaderMaterial({
			vertex: SHEET_VERT,
			fragment: SHEET_FRAG,
			transparent: true,
			depthWrite: false,
			depthTest: false,
			blending: 5,
			blendEquation: 104,
			blendSrc: 201,
			blendDst: 201,
			uniforms: Object.fromEntries([
				"uN",
				"uW",
				"uD",
				"uAmp",
				"uK",
				"uOmega",
				"uT",
				"uSize",
				"uFocal",
				"uFocus",
				"uAperture",
				"uMaxBlur",
				"uBright",
				"uMinPx",
				"uPow"
			].map((k) => [k, { value: 0 }]))
		});
		this.points = new Points(geo, this.material);
		this.points.frustumCulled = false;
	}
	/** p: w, d (extent in x, z), amp, k, omega, t, size (world), bright, pow (heat = bright·h^pow), focus, aperture, maxBlur (design px), minPx. */
	set(p, cam, H) {
		const u = this.material.uniforms, s = H / 1080;
		Object.assign(u.uN, { value: this.n });
		u.uW.value = p.w;
		u.uD.value = p.d;
		u.uAmp.value = p.amp;
		u.uK.value = p.k;
		u.uOmega.value = p.omega;
		u.uT.value = p.t;
		u.uSize.value = p.size;
		u.uBright.value = p.bright ?? 1;
		u.uFocus.value = p.focus ?? 5;
		u.uAperture.value = p.aperture ?? 0;
		u.uMaxBlur.value = (p.maxBlur ?? 30) * s;
		u.uMinPx.value = (p.minPx ?? 1.5) * s;
		u.uPow.value = p.pow ?? 1.6;
		u.uFocal.value = H / 2 / Math.tan(MathUtils.degToRad(cam.fov) / 2);
		return this;
	}
};
//#endregion
export { HeightSheet, asciiView };
