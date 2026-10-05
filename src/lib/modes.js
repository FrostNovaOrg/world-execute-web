import { PROJECT } from "../engine/config.js?v=BkWxxfxi";
import { COL, THEME } from "../theme.js?v=Bj33PIbo";
import { Vector2, Vector3 } from "../../vendor/three/build/three.core.js?v=q9f7JKE-";
import { dataTexture, fsMaterial, makeRT } from "../engine/gpu.js?v=o4BYX3o1";
import { glyphAtlas } from "./glyphs.js?v=DWbHICXG";
//#region src/lib/modes.js
/**
* One private buffer per nesting level, made on first use by make(level). A new `version` (the render size changed)
* frees every buffer first. A level can be made before the ones above it (memories.js draws its shots one level down,
* and the shot that asks may not have captured yet): the list then has a gap, which is skipped and not counted.
* Pure bookkeeping, no GPU: capture() keeps one of these per engine.
*/
function levelBuffers(free = (b) => b.dispose()) {
	let list = [], version;
	return {
		get(v, level, make) {
			if (v !== version) {
				const old = list;
				list = [];
				version = v;
				for (const b of old) if (b) free(b);
			}
			return list[level] ??= make(level);
		},
		/** How many buffers exist now. */
		get size() {
			return list.filter(Boolean).length;
		}
	};
}
var POOLS = /* @__PURE__ */ new WeakMap();
var DEPTH = 0;
function buffer(ctx, level) {
	const owner = ctx.engine ?? ctx.renderer;
	let pool = POOLS.get(owner);
	if (!pool) POOLS.set(owner, pool = levelBuffers());
	return pool.get(ctx.sizeVersion, level, () => makeRT(ctx.W, ctx.H));
}
/**
* Run fn one nesting level deeper: captures made inside get buffers of their own. capture() does this for its callback;
* memories.js does it while it draws earlier shots, so that those shots' captures leave the caller's alone.
*/
function nested(fn) {
	DEPTH++;
	try {
		return fn();
	} finally {
		DEPTH--;
	}
}
/**
* Run fn(sub) with a ctx whose draw/pass/viewport/target render into a private HDR target (cleared to black), and
* return that target's texture. Everything else in sub is the shot's own ctx. Captures nest (a shot drawn inside the
* callback may capture itself, as a replay of a shot that uses a view does): each level has its own target, because
* one target read and written at once is a feedback loop (WebGL reports it) and the inner view is not drawn. Inside fn,
* draw with sub.draw, never ctx.draw.
*/
function capture(ctx, fn) {
	const r = ctx.renderer, rt = buffer(ctx, DEPTH);
	r.setRenderTarget(rt);
	r.setClearColor(0, 1);
	r.clear(true, true, true);
	const sub = {
		...ctx,
		target: rt,
		draw: (scene, cam) => {
			r.setRenderTarget(rt);
			r.render(scene, cam);
		},
		pass: (m) => ctx.fsq.render(r, m, rt),
		viewport: (rect, f) => {
			const k = ctx.W / PROJECT.design.width, x = rect[0] * k, w = rect[2] * k, h = rect[3] * k, y = ctx.H - (rect[1] + rect[3]) * k;
			rt.viewport.set(x, y, w, h);
			rt.scissor.set(x, y, w, h);
			rt.scissorTest = true;
			r.setRenderTarget(rt);
			try {
				f(w, h);
			} finally {
				rt.viewport.set(0, 0, ctx.W, ctx.H);
				rt.scissor.set(0, 0, ctx.W, ctx.H);
				rt.scissorTest = false;
				r.setRenderTarget(rt);
			}
		}
	};
	nested(() => fn(sub));
	r.setRenderTarget(ctx.target);
	return rt.texture;
}
var HEAD = `
uniform sampler2D tSrc; uniform vec2 uRes; uniform float uT, uGain, uMix; uniform vec3 uInk, uPaper, uTint;
in vec2 vUv; out vec4 o;
vec3 lin(vec3 c) { return pow(max(c, 0.), vec3(2.2)); }
float lum(vec3 c) { return 1. - exp(-luma(c) * uGain); }    // HDR luminance, softly compressed to 0..1
`;
var BODY = {
	ascii: `
uniform sampler2D tAtlas, tRamp; uniform vec2 uGrid; uniform float uCell, uRampN, uSource;
void main() {
  vec2 cellPx = vec2(uCell * .6, uCell), px = vUv * uRes, id = floor(px / cellPx), f = fract(px / cellPx);
  vec2 c = (id + .5) * cellPx / uRes;
  vec3 s = (texture(tSrc, c).rgb + texture(tSrc, c + vec2(.3, .3) * cellPx / uRes).rgb + texture(tSrc, c - vec2(.3, .3) * cellPx / uRes).rgb) / 3.;
  float l = lum(s), k = floor(clamp(l, 0., .999) * uRampN);
  if (k < .5) { o = vec4(mix(texture(tSrc, vUv).rgb, vec3(0.), uMix), 1.); return; }   // the blank glyph: nothing to ink
  float ch = texture(tRamp, vec2((k + .5) / uRampN, .5)).r;
  vec2 cell = vec2(mod(ch, uGrid.x), floor(ch / uGrid.x));
  // the em box inside an atlas cell, kept off the cell's edge; the mip level is explicit (atlas texels per pixel), so the
  // jump of the coordinate where one text cell meets the next cannot pull in a blurred neighbour (faint 1-px rows).
  // The atlas is uploaded with flipY off (v = 0 is the canvas top) while f.y counts up, hence the minus.
  vec2 g = clamp(vec2(.5 + (f.x - .5) * .43, .54 - (f.y - .5) * .72), vec2(.06), vec2(.94));
  float lod = log2(max(1., max(64. * .43 / cellPx.x, 64. * .72 / cellPx.y)));
  float ink = textureLod(tAtlas, (cell + g) / uGrid, lod).r;
  vec3 col = mix(uTint, normalize(s + 1e-4) * 1.7, uSource) * (.35 + 1.3 * l);
  o = vec4(mix(texture(tSrc, vUv).rgb, col * ink, uMix), 1.);
}`,
	dither: `
uniform float uPix;
float bayer2(vec2 a) { a = floor(a); return fract(a.x / 2. + a.y * a.y * .75); }
float bayer8(vec2 a) { return (bayer2(.25 * a) * .25 + bayer2(.5 * a)) * .25 + bayer2(a); }
void main() {
  vec2 px = floor(vUv * uRes / uPix), c = (px + .5) * uPix / uRes;
  float l = lum(texture(tSrc, c).rgb);
  vec3 col = l > bayer8(px) + .5 / 64. ? uInk : uPaper;
  o = vec4(mix(texture(tSrc, vUv).rgb, lin(col), uMix), 1.);
}`,
	thermal: `
vec3 inferno(float t) {
  const vec3 c0 = vec3(.0002189, .001651, -.01948), c1 = vec3(.1065, .5640, 3.9327), c2 = vec3(11.6025, -3.9729, -15.9424);
  const vec3 c3 = vec3(-41.7040, 17.4364, 44.3541), c4 = vec3(77.1629, -33.4024, -81.8073), c5 = vec3(-71.3194, 32.6261, 73.2095), c6 = vec3(25.1311, -12.2427, -23.0703);
  return c0 + t * (c1 + t * (c2 + t * (c3 + t * (c4 + t * (c5 + t * c6)))));
}
void main() { float l = lum(texture(tSrc, vUv).rgb); o = vec4(mix(texture(tSrc, vUv).rgb, lin(clamp(inferno(l), 0., 1.)), uMix), 1.); }`,
	edges: `
void main() {
  vec2 e = 1.2 / uRes;
  float tl = lum(texture(tSrc, vUv + vec2(-e.x, e.y)).rgb), t = lum(texture(tSrc, vUv + vec2(0., e.y)).rgb), tr = lum(texture(tSrc, vUv + e).rgb);
  float l = lum(texture(tSrc, vUv - vec2(e.x, 0.)).rgb), r = lum(texture(tSrc, vUv + vec2(e.x, 0.)).rgb);
  float bl = lum(texture(tSrc, vUv - e).rgb), b = lum(texture(tSrc, vUv - vec2(0., e.y)).rgb), br = lum(texture(tSrc, vUv + vec2(e.x, -e.y)).rgb);
  float gx = tr + 2. * r + br - tl - 2. * l - bl, gy = tl + 2. * t + tr - bl - 2. * b - br;
  float k = smoothstep(.08, .6, length(vec2(gx, gy)));
  o = vec4(mix(texture(tSrc, vUv).rgb, lin(mix(uPaper, uInk, k)), uMix), 1.);
}`,
	paper: `
void main() { float l = lum(texture(tSrc, vUv).rgb); o = vec4(mix(texture(tSrc, vUv).rgb, lin(mix(uPaper, uInk, smoothstep(.02, .7, l))), uMix), 1.); }`,
	halftone: `
uniform float uPix, uAngle;
void main() {
  vec2 px = vUv * uRes; float c = cos(uAngle), s = sin(uAngle);
  vec2 q = mat2(c, -s, s, c) * px / uPix, id = floor(q) + .5, f = fract(q) - .5;
  vec2 src = (mat2(c, s, -s, c) * (id * uPix)) / uRes;
  float l = lum(texture(tSrc, src).rgb), rad = sqrt(l) * .62, d = length(f);
  float k = (1. - smoothstep(rad - .06, rad + .06, d)) * smoothstep(0., .06, rad);   // no dot at all where the source is black
  o = vec4(mix(texture(tSrc, vUv).rgb, lin(mix(uPaper, uInk, k)), uMix), 1.);
}`,
	duotone: `
void main() {
  vec3 s = texture(tSrc, vUv).rgb; float l = lum(s);
  vec3 col = mix(mix(uPaper, uInk, smoothstep(0., .8, l)), vec3(1.), smoothstep(.72, 1., l) * .55);
  o = vec4(mix(s, lin(col), uMix), 1.);
}`
};
Object.freeze(Object.fromEntries(Object.entries(BODY).map(([k, v]) => [k, HEAD + v])));
/** The view names. */
var MODES = Object.freeze(Object.keys(BODY));
/**
* Suggested grades per view, for ctx.post: display-referred output (tonemap 2: the values are already display light) and
* little bloom, so that ink and paper stay exact; the text view keeps its bloom, so that the bright glyphs glow, and so
* does duotone (its white-hot highlights are meant to glow: the remake's grade, kept as it was).
* view() applies the entry unless it is called with look: false.
*/
var freeze = (o) => Object.freeze(Object.fromEntries(Object.entries(o).map(([k, v]) => [k, Object.freeze(v)])));
var LOOK = freeze({
	ascii: {
		bloom: .6,
		threshold: 1.1
	},
	thermal: {
		tonemap: 2,
		bloom: .15,
		ca: 0
	},
	dither: {
		tonemap: 2,
		bloom: 0,
		ca: 0,
		grain: 0,
		vignette: .15
	},
	edges: {
		tonemap: 2,
		bloom: .1,
		ca: 0
	},
	paper: {
		tonemap: 2,
		bloom: 0,
		ca: 0,
		vignette: .12
	},
	halftone: {
		tonemap: 2,
		bloom: 0,
		ca: 0,
		vignette: .15
	},
	duotone: {
		tonemap: 2,
		bloom: .25,
		threshold: .9,
		ca: .08
	}
});
/**
* The glyphs of the text view in order of ink, from the blank to the heaviest: n atlas indices, picked evenly from the 95
* printable ASCII characters (atlas cells 0-94, modules/code-glyphs keeps them first) sorted by coverage[i], the share of
* ink of glyph i. Glyphs of equal ink keep atlas order (a sort is stable), so the ramp is the same on every machine.
*/
function inkRamp(coverage, n = 24) {
	const order = [...Array(95).keys()].sort((i, j) => coverage[i] - coverage[j]);
	return Array.from({ length: n }, (_, k) => order[Math.round(k / (n - 1) * 94)]);
}
var RAMP = null;
function rampTexture() {
	if (RAMP) return RAMP;
	const pick = inkRamp(glyphAtlas().coverage);
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
var toDisplay = (c) => c.map((v) => Math.min(1, Math.max(0, v) ** (1 / 2.2)));
var towardsWhite = (c, k) => c.map((v) => v + (1 - v) * k);
/**
* What a view uses when a call names no colour, from theme.js, read each time a view is drawn (so editing theme.js
* edits every view):
*   tint      the subject colour, COL.subject (linear)
*   paper     the page, THEME.rampCol (the bright page the exposure ramps go to), as display light
*   lightInk  the subject colour three quarters of the way to white: ink for the views that print light on black
*   darkInk   near-black: ink for the view that prints on the page
*/
function defaultColours() {
	return {
		tint: [...COL.subject],
		paper: toDisplay(THEME.rampCol),
		lightInk: towardsWhite(toDisplay(COL.subject), .75),
		darkInk: [
			.07,
			.08,
			.1
		]
	};
}
var LIGHT_ON_BLACK = /* @__PURE__ */ new Set([
	"dither",
	"edges",
	"halftone",
	"duotone"
]);
var PARTS = [
	"ink",
	"paper",
	"tint"
];
/**
* The colours view(ctx, tex, mode, o) draws with, { ink, paper, tint }, each from the first that names it:
*   o, the call's options
*   THEME.views[mode], a project's own defaults, optional (any of ink, paper, tint; display colours for ink and paper,
*     linear for tint, as in the call): a published film pins its views' colours here, so that a change of the theme or
*     of the derivation below leaves them alone
*   defaultColours(): the views that print light on black (LIGHT_ON_BLACK) get the light ink on black paper, the
*     others the dark ink on the page
* Read each time a view is drawn. A THEME.views entry that names no view, or a part that is none of these, throws (a
* misspelt name would otherwise be ignored without a word).
*/
function viewColours(mode, o = {}) {
	const table = THEME.views ?? {};
	for (const [k, v] of Object.entries(table)) {
		if (!Object.hasOwn(BODY, k)) throw new Error(`modes: THEME.views.${k} is no view (have: ${MODES.join(", ")})`);
		for (const p of Object.keys(v ?? {})) if (!PARTS.includes(p)) throw new Error(`modes: THEME.views.${k}.${p} is not a colour of a view (have: ${PARTS.join(", ")})`);
	}
	const t = Object.hasOwn(table, mode) && table[mode] || {}, d = defaultColours(), light = LIGHT_ON_BLACK.has(mode);
	return {
		ink: [...o.ink ?? t.ink ?? (light ? d.lightInk : d.darkInk)],
		paper: [...o.paper ?? t.paper ?? (light ? [
			0,
			0,
			0
		] : d.paper)],
		tint: [...o.tint ?? t.tint ?? d.tint]
	};
}
var MATS = /* @__PURE__ */ new Map();
function material(mode) {
	if (MATS.has(mode)) return MATS.get(mode);
	if (!Object.hasOwn(BODY, mode)) throw new Error(`modes: unknown mode '${mode}' (have: ${MODES.join(", ")})`);
	const u = {
		tSrc: { value: null },
		uRes: { value: new Vector2() },
		uT: { value: 0 },
		uGain: { value: 1.4 },
		uMix: { value: 1 },
		uInk: { value: new Vector3() },
		uPaper: { value: new Vector3() },
		uTint: { value: new Vector3() },
		uPix: { value: 4 },
		uAngle: { value: .4 },
		uCell: { value: 18 },
		uSource: { value: 0 },
		tAtlas: { value: null },
		tRamp: { value: null },
		uGrid: { value: new Vector2() },
		uRampN: { value: 1 }
	};
	const m = fsMaterial(HEAD + BODY[mode], u);
	MATS.set(mode, m);
	return m;
}
/**
* Composite a captured texture into the shot through a mode. Options:
*   gain  luminance gain before the 0..1 compression (default 1.4)   mix  0..1 blend with the plain image (default 1)
*   ascii: cell (line height, design px, default 16), tint (linear colour), source (0..1: take hue from the image)
*   dither/halftone: pix (design px, default 3 / 9), angle (halftone)
*   ink / paper: display colours [r, g, b] 0..1 (dither, edges, paper, halftone, duotone)
*   look: false keeps ctx.post as the shot set it (by default the mode's suggested grade, LOOK, is applied)
* Sizes are design pixels of the whole frame (scaled with the render size). Inside ctx.viewport the whole effect is
* drawn into the rectangle, so it shrinks with it: ask for cell and pix larger by the same factor to keep the glyphs.
* Throws for a tex that is not a texture, and for the texture of the target being drawn into (a feedback loop: WebGL
* only logs it and the view is not drawn). Usually that is a texture kept from one capture() and used inside the next
* capture() at the same nesting level, which draws into the same buffer.
*/
function view(ctx, tex, mode, o = {}) {
	if (!tex?.isTexture) throw new Error("modes.view: tex must be the texture that capture() returned");
	if (ctx.target?.texture === tex) throw new Error("modes.view: tex is the texture of the target being drawn into (is it from an earlier capture() at this nesting level?)");
	const m = material(mode), u = m.uniforms, s = ctx.H / PROJECT.design.height, c = viewColours(mode, o);
	u.tSrc.value = tex;
	u.uRes.value.set(ctx.W, ctx.H);
	u.uT.value = ctx.t;
	u.uGain.value = o.gain ?? 1.4;
	u.uMix.value = o.mix ?? 1;
	u.uInk.value.set(...c.ink);
	u.uPaper.value.set(...c.paper);
	u.uTint.value.set(...c.tint);
	u.uSource.value = o.source ?? 0;
	u.uPix.value = (o.pix ?? (mode === "halftone" ? 9 : 3)) * s;
	u.uAngle.value = o.angle ?? .4;
	if (mode === "ascii") {
		const a = glyphAtlas(), r = rampTexture();
		u.tAtlas.value = a.tex;
		u.uGrid.value.set(a.cols, a.rows);
		u.tRamp.value = r.tex;
		u.uRampN.value = r.n;
		u.uCell.value = (o.cell ?? 16) * s;
	}
	ctx.pass(m);
	if (o.look !== false) Object.assign(ctx.post, LOOK[mode]);
}
//#endregion
export { LOOK, MODES, capture, defaultColours, inkRamp, levelBuffers, nested, view, viewColours };
