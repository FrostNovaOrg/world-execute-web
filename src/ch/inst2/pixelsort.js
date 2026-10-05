import { FloatType, NearestFilter, RGBAFormat, Vector2, WebGLRenderTarget } from "../../../vendor/three/build/three.core.js?v=q9f7JKE-";
import { fsMaterial } from "../../engine/gpu.js?v=o4BYX3o1";
//#region src/ch/inst2/pixelsort.js
var MASK = `
uniform sampler2D tSrc; uniform vec2 uSize; uniform float uLo, uHi, uCover, uBandW, uSeed;
float lumOf(vec3 c) { return dot(c, vec3(.2126, .7152, .0722)); }
vec3 srcAt(ivec2 c) { return texture(tSrc, (vec2(c) + .5) / uSize).rgb; }
bool masked(ivec2 c, vec3 s) {
  float b = floor(float(c.x) / uBandW + hash11(floor(float(c.x) / (uBandW * 7.)) + uSeed) * 3.);
  if (hash11(b * 1.71 + uSeed) >= uCover) return false;
  float l = lumOf(s);
  return l > uLo && l < uHi;
}`;
var INIT = MASK + `
out vec4 o;
void main() {
  ivec2 c = ivec2(gl_FragCoord.xy); vec3 s = srcAt(c);
  bool m = masked(c, s), mp = c.y > 0 && masked(c - ivec2(0, 1), srcAt(c - ivec2(0, 1)));
  o = vec4(s, (m && mp) ? 0. : 1.);
}`;
var SCAN = `
uniform sampler2D tIn; uniform int uD; out vec4 o;
void main() {
  ivec2 c = ivec2(gl_FragCoord.xy); vec4 a = texelFetch(tIn, c, 0);
  float s = a.w; if (c.y >= uD) s += texelFetch(tIn, c - ivec2(0, uD), 0).w;
  o = vec4(a.rgb, s);
}`;
var KEY = `
uniform sampler2D tIn; uniform float uDir; out vec4 o;
void main() {
  vec4 a = texelFetch(tIn, ivec2(gl_FragCoord.xy), 0);
  float l = dot(a.rgb, vec3(.2126, .7152, .0722)), f = clamp(l / (l + .3), 0., .998);
  o = vec4(a.rgb, a.w + (uDir > 0. ? f : .998 - f));
}`;
var SORT = `
uniform sampler2D tIn; uniform int uJ, uK; out vec4 o;
void main() {
  ivec2 c = ivec2(gl_FragCoord.xy); int i = c.y, p = i ^ uJ;
  vec4 a = texelFetch(tIn, c, 0), b = texelFetch(tIn, ivec2(c.x, p), 0);
  bool up = (i & uK) == 0, low = (i & uJ) == 0;
  bool swap = (low == up) ? (b.w < a.w) : (b.w > a.w);     // strict: equal keys keep their own value
  o = swap ? b : a;
}`;
var OUT = MASK + `
uniform sampler2D tSorted; uniform vec2 uSortSize; uniform float uGain;
in vec2 vUv; out vec4 o;
void main() {
  ivec2 c = ivec2(min(vUv * uSortSize, uSortSize - 1.));
  vec3 s = srcAt(c);
  vec3 col = masked(c, s) ? texelFetch(tSorted, c, 0).rgb * uGain : texture(tSrc, vUv).rgb;
  o = vec4(col, 1.);
}`;
var PixelSort = class {
	constructor() {
		const f = (v) => ({ value: v }), mask = () => ({
			tSrc: f(null),
			uSize: f(new Vector2()),
			uLo: f(.02),
			uHi: f(1),
			uCover: f(.5),
			uBandW: f(6),
			uSeed: f(0)
		});
		this.init = fsMaterial(INIT, mask());
		this.scan = fsMaterial(SCAN, {
			tIn: f(null),
			uD: f(1)
		});
		this.key = fsMaterial(KEY, {
			tIn: f(null),
			uDir: f(1)
		});
		this.sort = fsMaterial(SORT, {
			tIn: f(null),
			uJ: f(1),
			uK: f(2)
		});
		this.out = fsMaterial(OUT, {
			...mask(),
			tSorted: f(null),
			uSortSize: f(new Vector2()),
			uGain: f(1)
		});
		this.rt = [null, null];
		this.v = null;
		this.passes = 0;
	}
	ensure(W, H, v) {
		if (this.v === v) return;
		this.rt.forEach((r) => r?.dispose());
		this.SH = 2 ** Math.floor(Math.log2(H));
		this.SW = Math.round(W * this.SH / H);
		const mk = () => new WebGLRenderTarget(this.SW, this.SH, {
			type: FloatType,
			format: RGBAFormat,
			minFilter: NearestFilter,
			magFilter: NearestFilter,
			depthBuffer: false,
			generateMipmaps: false,
			colorSpace: ""
		});
		this.rt = [mk(), mk()];
		this.v = v;
	}
	/** Sort src (a texture of the frame) and composite the result into the shot's target. o: lo, hi, cover, bandW, seed, dir, gain. */
	run(ctx, src, o = {}) {
		this.ensure(ctx.W, ctx.H, ctx.sizeVersion);
		const r = ctx.renderer, fsq = ctx.fsq, size = new Vector2(this.SW, this.SH);
		const setMask = (m) => {
			const u = m.uniforms;
			u.tSrc.value = src;
			u.uSize.value.copy(size);
			u.uLo.value = o.lo ?? .02;
			u.uHi.value = o.hi ?? 1;
			u.uCover.value = o.cover ?? .5;
			u.uBandW.value = (o.bandW ?? 6) * this.SH / 512;
			u.uSeed.value = o.seed ?? 0;
		};
		let i = 0, n = 0;
		const pass = (m, set) => {
			set?.(m.uniforms);
			m.uniforms.tIn && (m.uniforms.tIn.value = this.rt[i].texture);
			fsq.render(r, m, this.rt[1 - i]);
			i = 1 - i;
			n++;
		};
		setMask(this.init);
		fsq.render(r, this.init, this.rt[0]);
		i = 0;
		n = 1;
		for (let d = 1; d < this.SH; d *= 2) pass(this.scan, (u) => {
			u.uD.value = d;
		});
		pass(this.key, (u) => {
			u.uDir.value = o.dir ?? 1;
		});
		for (let k = 2; k <= this.SH; k *= 2) for (let j = k >> 1; j > 0; j >>= 1) pass(this.sort, (u) => {
			u.uJ.value = j;
			u.uK.value = k;
		});
		setMask(this.out);
		this.out.uniforms.tSorted.value = this.rt[i].texture;
		this.out.uniforms.uSortSize.value.copy(size);
		this.out.uniforms.uGain.value = o.gain ?? 1;
		ctx.pass(this.out);
		this.passes = n + 1;
		return this.passes;
	}
};
//#endregion
export { PixelSort };
