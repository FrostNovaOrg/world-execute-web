import { PROJECT } from "./config.js?v=BkWxxfxi";
import { THEME } from "../theme.js?v=Bj33PIbo";
import { Vector2, Vector3, Vector4 } from "../../vendor/three/build/three.core.js?v=q9f7JKE-";
import { fsMaterial, makeRT } from "./gpu.js?v=o4BYX3o1";
//#region src/engine/post.js
/** The design size (config.js PROJECT.design) as a uniform value: grids measured in design pixels. */
var designSize = () => new Vector2(PROJECT.design.width, PROJECT.design.height);
/** Defaults every frame starts from; shots override fields on ctx.post (numbers lerp across transitions). */
var POST_DEFAULTS = Object.freeze({
	exposure: 1,
	bloom: .9,
	threshold: 1,
	knee: .6,
	radius: .85,
	ca: .2,
	glitch: 0,
	scan: 0,
	vignette: .35,
	grain: .03,
	sat: 1,
	contrast: 1,
	lift: [
		0,
		0,
		0
	],
	gamma: [
		1,
		1,
		1
	],
	gain: [
		1,
		1,
		1
	],
	tint: [
		1,
		1,
		1
	],
	fade: 0,
	fadeCol: [
		0,
		0,
		0
	],
	tonemap: 0,
	textGlow: 1.6,
	zoom: 1
});
var postDefaults = () => structuredClone(POST_DEFAULTS);
var MODES = /* @__PURE__ */ new Set(["tonemap"]);
function lerpPost(a, b, k) {
	const o = {};
	for (const key in POST_DEFAULTS) {
		const x = a[key], y = b[key];
		o[key] = Array.isArray(x) ? x.map((v, i) => v + (y[i] - v) * k) : typeof x === "number" && !MODES.has(key) ? x + (y - x) * k : k < .5 ? x : y;
	}
	return o;
}
var DOWN = `
uniform sampler2D tSrc; uniform vec2 uTexel; uniform float uPre, uThreshold, uKnee;
in vec2 vUv; out vec4 o;
vec3 pre(vec3 c) {
  float br = max(c.r, max(c.g, c.b));
  float soft = clamp(br - uThreshold + uKnee, 0., 2. * uKnee); soft = soft * soft / (4. * uKnee + 1e-4);
  return c * max(soft, br - uThreshold) / max(br, 1e-4);
}
vec3 tap(vec2 uv) { vec3 c = texture(tSrc, uv).rgb; return uPre > .5 ? c / (1. + luma(c)) : c; } // Karis weight kills fireflies
void main() {
  vec2 h = uTexel;
  vec3 s = tap(vUv) * 4. + tap(vUv + vec2(-h.x, -h.y)) + tap(vUv + vec2(h.x, -h.y)) + tap(vUv + vec2(-h.x, h.y)) + tap(vUv + h);
  s *= .125;
  if (uPre > .5) { s = s / max(1. - luma(s), 1e-3); s = pre(s); }
  o = vec4(s, 1.);
}`;
var UP = `
uniform sampler2D tSrc, tBase; uniform vec2 uTexel; uniform float uRadius;
in vec2 vUv; out vec4 o;
void main() {
  vec2 h = uTexel;
  vec3 s = texture(tSrc, vUv + vec2(-2. * h.x, 0.)).rgb + texture(tSrc, vUv + vec2(-h.x, h.y)).rgb * 2.
         + texture(tSrc, vUv + vec2(0., 2. * h.y)).rgb + texture(tSrc, vUv + vec2(h.x, h.y)).rgb * 2.
         + texture(tSrc, vUv + vec2(2. * h.x, 0.)).rgb + texture(tSrc, vUv + vec2(h.x, -h.y)).rgb * 2.
         + texture(tSrc, vUv + vec2(0., -2. * h.y)).rgb + texture(tSrc, vUv + vec2(-h.x, -h.y)).rgb * 2.;
  o = vec4(texture(tBase, vUv).rgb + s / 12. * uRadius, 1.);
}`;
var Bloom = class {
	constructor() {
		this.down = fsMaterial(DOWN, {
			tSrc: { value: null },
			uTexel: { value: new Vector2() },
			uPre: { value: 0 },
			uThreshold: { value: 1 },
			uKnee: { value: .5 }
		});
		this.up = fsMaterial(UP, {
			tSrc: { value: null },
			tBase: { value: null },
			uTexel: { value: new Vector2() },
			uRadius: { value: .85 }
		});
		this.downs = [];
		this.ups = [];
	}
	setSize(w, h) {
		[...this.downs, ...this.ups].forEach((r) => r.dispose());
		this.downs = [];
		this.ups = [];
		let lw = Math.floor(w / 2), lh = Math.floor(h / 2);
		for (let i = 0; i < 7 && lw >= 8 && lh >= 8; i++, lw = Math.floor(lw / 2), lh = Math.floor(lh / 2)) {
			this.downs.push(makeRT(lw, lh, { depth: false }));
			this.ups.push(makeRT(lw, lh, { depth: false }));
		}
	}
	get levels() {
		return this.downs.length;
	}
	/** Returns the half-resolution bloom texture for `src` (an HDR texture of size w×h). */
	render(renderer, fsq, src, w, h, p) {
		const d = this.down.uniforms, u = this.up.uniforms;
		let prev = src, pw = w, ph = h;
		this.downs.forEach((rt, i) => {
			d.tSrc.value = prev;
			d.uTexel.value.set(1 / pw, 1 / ph);
			d.uPre.value = i === 0 ? 1 : 0;
			d.uThreshold.value = p.threshold;
			d.uKnee.value = Math.max(.001, p.knee);
			fsq.render(renderer, this.down, rt);
			prev = rt.texture;
			pw = rt.width;
			ph = rt.height;
		});
		let acc = this.downs[this.downs.length - 1];
		for (let i = this.downs.length - 2; i >= 0; i--) {
			u.tSrc.value = acc.texture;
			u.uTexel.value.set(1 / acc.width, 1 / acc.height);
			u.tBase.value = this.downs[i].texture;
			u.uRadius.value = p.radius;
			fsq.render(renderer, this.up, this.ups[i]);
			acc = this.ups[i];
		}
		return acc.texture;
	}
};
var TR_HEAD = `
uniform sampler2D tA, tB; uniform float uP, uSeed, uAspect; uniform vec4 uParam; uniform vec3 uEdge; uniform vec2 uDesign;
in vec2 vUv; out vec4 o;
vec3 A(vec2 uv) { return texture(tA, uv).rgb; }
vec3 B(vec2 uv) { return texture(tB, uv).rgb; }
`;
var TRANSITIONS = {
	fade: `vec3 tr(vec2 uv) { return mix(A(uv), B(uv), smoothstep(0., 1., uP)); }`,
	mix: `vec3 tr(vec2 uv) { return mix(A(uv), B(uv), uP); }`,
	dissolve: `vec3 tr(vec2 uv) {
    float sc = uParam.x > 0. ? uParam.x : 6.; float n = fbm(vec3(uv * vec2(uAspect, 1.) * sc, uSeed)) * .5 + .5;
    float e = smoothstep(uP - .06, uP + .06, n * .9 + .05); float edge = (1. - abs(e * 2. - 1.)) * uParam.y;
    return mix(B(uv), A(uv), e) + edge * uEdge; }`,
	wipe: `vec3 tr(vec2 uv) {
    vec2 d = vec2(cos(uParam.x), sin(uParam.x)); float x = dot((uv - .5) * vec2(uAspect, 1.), d) / (abs(d.x) * uAspect * .5 + abs(d.y) * .5) * .5 + .5;
    float s = max(uParam.y, .002), e = uP * (1. + s); return mix(A(uv), B(uv), 1. - smoothstep(e - s, e, x)); }`,
	iris: `vec3 tr(vec2 uv) {
    vec2 c = uParam.xy == vec2(0.) ? vec2(.5) : uParam.xy; float r = length((uv - c) * vec2(uAspect, 1.));
    float R = uP * (length(vec2(uAspect, 1.)) + .1); float s = max(uParam.z, .005);
    return mix(B(uv), A(uv), smoothstep(R - s, R, r)); }`,
	glitch: `vec3 tr(vec2 uv) {
    float k = 1. - abs(uP * 2. - 1.); float row = floor(uv.y * 36.), f = floor(uSeed * 60.);
    float sh = step(1. - k * .6, hash12(vec2(row, f))) * (hash12(vec2(row * 1.7, f)) - .5) * .25 * k;
    vec2 q = uv + vec2(sh, 0.); vec2 ca = vec2(.012 * k, 0.);
    vec3 a = vec3(A(q - ca).r, A(q).g, A(q + ca).b), b = vec3(B(q - ca).r, B(q).g, B(q + ca).b);
    return uP < .5 ? a : b; }`,
	zoom: `vec3 tr(vec2 uv) {
    vec2 c = uParam.xy == vec2(0.) ? vec2(.5) : uParam.xy; float p = smoothstep(0., 1., uP);
    vec3 a = A(c + (uv - c) / (1. + p * 3.)), b = B(c + (uv - c) * (1. + (1. - p) * .6));
    return mix(a, b, smoothstep(.35, .75, uP)); }`,
	pixel: `vec3 tr(vec2 uv) {
    float k = 1. - abs(uP * 2. - 1.); float bs = max(1., k * (uParam.x > 0. ? uParam.x : 64.));
    vec2 g = uDesign / bs; vec2 q = (floor(uv * g) + .5) / g;
    return uP < .5 ? A(q) : B(q); }`
};
function transitionMaterial(type) {
	const body = TRANSITIONS[type];
	if (!body) throw new Error(`unknown transition '${type}' (have: ${Object.keys(TRANSITIONS).join(", ")})`);
	return fsMaterial(TR_HEAD + body + "\nvoid main() { o = vec4(tr(vUv), 1.); }", {
		tA: { value: null },
		tB: { value: null },
		uP: { value: 0 },
		uSeed: { value: 0 },
		uAspect: { value: 16 / 9 },
		uParam: { value: new Vector4() },
		uEdge: { value: new Vector3(...THEME.dissolveEdge) },
		uDesign: { value: designSize() }
	});
}
/** Adds a scene to the accumulation target with a weight (the scene at several instants of the shutter, averaged). */
var accumMaterial = () => fsMaterial(`
uniform sampler2D tSrc; uniform float uK; in vec2 vUv; out vec4 o;
void main() { o = vec4(texture(tSrc, vUv).rgb * uK, 1.); }`, {
	tSrc: { value: null },
	uK: { value: 1 }
}, {
	blending: 2,
	transparent: true
});
var TEXT_COMP = `
uniform sampler2D tScene, tText; uniform float uGlow;
in vec2 vUv; out vec4 o;
vec3 lin(vec3 c) { return mix(c / 12.92, pow((c + .055) / 1.055, vec3(2.4)), step(.04045, c)); }
void main() {
  vec4 t = texture(tText, vUv); vec3 s = texture(tScene, vUv).rgb;
  o = vec4(mix(s, lin(t.rgb) * uGlow, t.a), 1.);
}`;
var textCompMaterial = () => fsMaterial(TEXT_COMP, {
	tScene: { value: null },
	tText: { value: null },
	uGlow: { value: 1.6 }
});
var UBER_LIB = `
uniform sampler2D tScene, tBloom, tOverlay; uniform float uOverlayOn, uBloomLevels;
uniform vec2 uRes, uDesign; uniform float uFrame;
uniform float uExposure, uBloom, uCA, uGlitch, uScan, uVignette, uGrain, uSat, uContrast, uFade, uToneMap, uZoom;
uniform vec3 uLift, uGamma, uGain, uTint, uFadeCol;
in vec2 vUv; out vec4 o;

// Minimal AgX (after Benjamin Wrensch): graceful highlight roll-off, no hue skews on bright neons.
vec3 agxContrast(vec3 x) { vec3 x2 = x * x, x4 = x2 * x2;
  return 15.5 * x4 * x2 - 40.14 * x4 * x + 31.96 * x4 - 6.868 * x2 * x + .4298 * x2 + .1191 * x - .00232; }
vec3 agx(vec3 v) {
  const mat3 m = mat3(.842479062253094, .0423282422610123, .0423756549057051, .0784335999999992, .878468636469772, .0784336, .0792237451477643, .0791661274605434, .879142973793104);
  const mat3 mi = mat3(1.19687900512017, -.0528968517574562, -.0529716355144438, -.0980208811401368, 1.15190312990417, -.0980434501171241, -.0990297440797205, -.0989611768448433, 1.15107367264116);
  const float lo = -12.47393, hi = 4.026069;
  v = clamp(log2(max(m * v, vec3(1e-10))), lo, hi);
  v = agxContrast((v - lo) / (hi - lo));
  return pow(max(mi * v, 0.), vec3(2.2));
}
vec3 aces(vec3 x) { return clamp((x * (2.51 * x + .03)) / (x * (2.43 * x + .59) + .14), 0., 1.); }
vec3 srgb(vec3 c) { return mix(c * 12.92, 1.055 * pow(c, vec3(1. / 2.4)) - .055, step(.0031308, c)); }
vec3 unSrgb(vec3 c) { return mix(c / 12.92, pow((c + .055) / 1.055, vec3(2.4)), step(.04045, c)); }

// The scene as the lens delivers it (linear HDR): the punch zoom, glitch tearing, chromatic aberration on the scene and
// its bloom, the bloom added, exposure. uv: where the scene was read; d: uv from the centre (the grade's vignette).
vec3 sceneAt(vec2 vuv, out vec2 uv, out vec2 d) {
  uv = vuv;
  if (uZoom != 1.) uv = (vuv - .5) / uZoom + .5;
  if (uGlitch > 0.) {
    float row = floor(uv.y * 48.), f = floor(uFrame / 2.);
    uv.x += step(1. - uGlitch * .35, hash12(vec2(row, f))) * (hash12(vec2(row * 3.1, f + .5)) - .5) * .12 * uGlitch;
    vec2 cell = floor(uv * vec2(12., 24.));
    uv += step(1. - uGlitch * .08, hash12(cell + f)) * (hash22(cell + f) - .5) * .05;
  }
  d = uv - .5;
  vec2 off = d * (uCA * .01 + uGlitch * .008) * (1. + dot(d, d) * 2.);
  vec3 col = vec3(texture(tScene, uv - off).r, texture(tScene, uv).g, texture(tScene, uv + off).b);
  vec3 bl = vec3(texture(tBloom, uv - off).r, texture(tBloom, uv).g, texture(tBloom, uv + off).b);
  return (col + bl * uBloom / max(uBloomLevels, 1.)) * uExposure;
}
// Scene light to display light: AgX, ACES fitted, or none (2 = display: the look is already display-referred).
vec3 toneMap(vec3 col) { return uToneMap < .5 ? agx(col) : uToneMap < 1.5 ? aces(col) : clamp(col, 0., 1.); }
// The grade, on display light: lift and gain, gamma, saturation, contrast and tint, scanlines (one per two design
// pixels), vignette.
vec3 gradeCol(vec3 col, vec2 uv, vec2 d) {
  col = uGain * (col + uLift * (1. - col));
  col = pow(max(col, 0.), 1. / max(uGamma, vec3(1e-3)));
  col = mix(vec3(luma(col)), col, uSat);
  col = max((col - .5) * uContrast + .5, 0.) * uTint;
  col *= 1. - uScan * (.5 + .5 * cos(uv.y * (uDesign.y * .5) * TAU));
  float v = smoothstep(1.1, .25, length(d * vec2(uRes.x / uRes.y, 1.)));
  return col * mix(1., v, uVignette);
}
// Display light to the 8-bit picture: the fade, sRGB, the overlay text (never zoomed), grain on the design grid (2x2 px
// at 4K), TPDF dither.
vec3 encodeOut(vec3 col) {
  col = mix(col, uFadeCol, uFade);
  vec3 c = srgb(clamp(col, 0., 1.));
  if (uOverlayOn > .5) { vec4 t = texture(tOverlay, vUv); c = mix(c, t.rgb, t.a); }
  vec2 gp = floor(vUv * uDesign);
  c += (hash12(gp + fract(uFrame * .61803) * 997.) - .5) * uGrain * (1. - .5 * luma(c));
  c += (hash12(gl_FragCoord.xy + uFrame * 1.37) + hash12(gl_FragCoord.xy * 1.13 + uFrame * .71) - 1.) / 255.; // TPDF dither
  return c;
}`;
var UBER = UBER_LIB + `
void main() { vec2 uv, d; vec3 c = sceneAt(vUv, uv, d); o = vec4(encodeOut(gradeCol(toneMap(c), uv, d)), 1.); }`;
/** The uniforms UBER_LIB declares, at neutral values (a variant adds its own to these). */
function uberUniforms() {
	const v3 = () => ({ value: new Vector3(1, 1, 1) });
	return {
		tScene: { value: null },
		tBloom: { value: null },
		tOverlay: { value: null },
		uOverlayOn: { value: 0 },
		uBloomLevels: { value: 1 },
		uRes: { value: new Vector2(1, 1) },
		uDesign: { value: designSize() },
		uFrame: { value: 0 },
		uExposure: { value: 1 },
		uBloom: { value: 1 },
		uCA: { value: 0 },
		uGlitch: { value: 0 },
		uScan: { value: 0 },
		uVignette: { value: 0 },
		uGrain: { value: 0 },
		uSat: { value: 1 },
		uContrast: { value: 1 },
		uFade: { value: 0 },
		uToneMap: { value: 0 },
		uZoom: { value: 1 },
		uLift: v3(),
		uGamma: v3(),
		uGain: v3(),
		uTint: v3(),
		uFadeCol: v3()
	};
}
/** Set a final-pass material's grade from a frame's post settings (ctx.post, blended across transitions). */
function applyUber(mat, p) {
	const u = mat.uniforms;
	u.uExposure.value = p.exposure;
	u.uBloom.value = p.bloom;
	u.uCA.value = p.ca;
	u.uGlitch.value = p.glitch;
	u.uScan.value = p.scan;
	u.uVignette.value = p.vignette;
	u.uGrain.value = p.grain;
	u.uSat.value = p.sat;
	u.uContrast.value = p.contrast;
	u.uFade.value = p.fade;
	u.uToneMap.value = p.tonemap;
	u.uZoom.value = p.zoom;
	u.uLift.value.fromArray(p.lift);
	u.uGamma.value.fromArray(p.gamma);
	u.uGain.value.fromArray(p.gain);
	u.uTint.value.fromArray(p.tint);
	u.uFadeCol.value.fromArray(p.fadeCol);
}
/** Point a final-pass material at this frame's inputs: { scene, bloom, levels, post, overlay, frame }. */
function bindUber(mat, f) {
	const u = mat.uniforms;
	u.tScene.value = f.scene;
	u.tBloom.value = f.bloom;
	u.uBloomLevels.value = f.levels;
	u.tOverlay.value = f.overlay;
	u.uOverlayOn.value = f.overlay ? 1 : 0;
	u.uFrame.value = f.frame;
	applyUber(mat, f.post);
}
/** The default output stage: the uber pass straight to the canvas. Stage contract: docs/handbook/tech/extending.md. */
function sdrOutput() {
	const mat = fsMaterial(UBER, uberUniforms());
	return {
		name: "sdr",
		material: mat,
		setSize(w, h) {
			mat.uniforms.uRes.value.set(w, h);
		},
		render(engine, f) {
			bindUber(mat, f);
			engine.fsq.render(engine.renderer, mat, null);
		},
		dispose() {
			mat.dispose();
		}
	};
}
//#endregion
export { Bloom, POST_DEFAULTS, TRANSITIONS, UBER_LIB, accumMaterial, applyUber, bindUber, lerpPost, postDefaults, sdrOutput, textCompMaterial, transitionMaterial, uberUniforms };
