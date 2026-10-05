import { smoothstep } from "../../engine/math.js?v=BJIlRm7-";
import { BufferAttribute, BufferGeometry, Float32BufferAttribute, GLSL3, MathUtils, Mesh, Points, ShaderMaterial, Vector2, Vector3, Vector4 } from "../../../vendor/three/build/three.core.js?v=q9f7JKE-";
import { dataTexture, shaderMaterial } from "../../engine/gpu.js?v=o4BYX3o1";
import { glyphAtlas } from "../../lib/glyphs.js?v=DWbHICXG";
//#region src/ch/v2/flow.js
var NUTRIENTS = [
	{
		name: "fibre",
		amt: "3.0",
		unit: "g",
		dv: 3 / 28
	},
	{
		name: "manganese",
		amt: "0.232",
		unit: "mg",
		dv: .232 / 2.3
	},
	{
		name: "copper",
		amt: "0.081",
		unit: "mg",
		dv: .081 / .9
	},
	{
		name: "folate",
		amt: "22",
		unit: "µg",
		dv: 22 / 400
	},
	{
		name: "vitamin B6",
		amt: "0.084",
		unit: "mg",
		dv: .084 / 1.7
	},
	{
		name: "potassium",
		amt: "229",
		unit: "mg",
		dv: 229 / 4700
	},
	{
		name: "thiamin B1",
		amt: "0.039",
		unit: "mg",
		dv: .039 / 1.2
	},
	{
		name: "vitamin K",
		amt: "3.5",
		unit: "µg",
		dv: 3.5 / 120
	}
];
var BAND_COL = [
	[
		.5,
		.22,
		1
	],
	[
		.62,
		.3,
		1
	],
	[
		.76,
		.36,
		1
	],
	[
		.9,
		.4,
		.95
	],
	[
		1,
		.42,
		.85
	],
	[
		.72,
		.52,
		1
	],
	[
		.58,
		.6,
		1
	],
	[
		1,
		.55,
		.75
	]
];
var HEADER = `class Eggplant extends Solanum {
  // USDA FoodData Central · SR Legacy 11209 · Eggplant, raw · per 100 g
  per100g = {
    fibre:     { amount: 3.0,   unit: 'g',  dv: 28   },
    manganese: { amount: 0.232, unit: 'mg', dv: 2.3  },
    copper:    { amount: 0.081, unit: 'mg', dv: 0.9  },
    folate:    { amount: 22,    unit: 'μg', dv: 400  },
    vitaminB6: { amount: 0.084, unit: 'mg', dv: 1.7  },
    potassium: { amount: 229,   unit: 'mg', dv: 4700 },
    thiamin:   { amount: 0.039, unit: 'mg', dv: 1.2  },
    vitaminK:  { amount: 3.5,   unit: 'μg', dv: 120  },
  };
  give(you) {
    for (const [name, n] of Object.entries(this.per100g))
      you.absorb(name, n.amount, n.unit);        // NUTRIENTS
    return you;
  }
}
const me = new Eggplant();
me.give(you);
// the object itself was drawn by this (first cut, src/ch/v2/food.js):
`;
/** The calligram's text: the class, then the generator that drew the first cut's eggplant (its own source). */
var calligramText = (foodSrc) => {
	const a = foodSrc.indexOf("export function eggR"), b = foodSrc.indexOf("/** 0..1 coverage of the calyx");
	return HEADER + foodSrc.slice(a, b > a ? b : void 0);
};
var CAL = {
	x0: -2.75,
	len: 5.5
};
var calR = (u) => {
	return .93 * (u < .2 ? Math.sqrt(Math.max(0, 1 - (1 - u / .2) ** 2)) : 1) * (1 - .56 * smoothstep(.28, .93, u)) * (u > .9 ? Math.sqrt(Math.max(0, 1 - ((u - .9) / .05) ** 2)) : 1);
};
var calY = (u) => .5 * (u - .36) ** 2 - .16;
function calligramInside(x, y) {
	const u = (x - CAL.x0) / CAL.len;
	if (u < 0 || u > 1.04) return false;
	if (u > .9) return Math.abs(y - calY(u) - .25 * (u - .9)) < .07 || Math.abs(y - calY(u)) < calR(u);
	return Math.abs(y - calY(u)) < calR(u);
}
var CALLIGRAM = {
	cell: .05,
	width: 5.9,
	height: 2.1,
	center: [
		0,
		0,
		0
	]
};
var SANKEY = (() => {
	const xL = -1.05, xM = .8, xR = 2.9, kH = 2.6, pitch = .3, gap = .15, Y0 = .18;
	const w = NUTRIENTS.map((n) => n.dv * kH), total = w.reduce((a, b) => a + b, 0), mid = total + gap * (w.length - 1), src = pitch * w.length;
	const bands = [];
	let ym = mid / 2 + Y0, yk = total / 2 + Y0;
	w.forEach((wk, k) => {
		const yc = Y0 + (w.length / 2 - k - .5) * pitch;
		ym -= wk;
		yk -= wk;
		bands.push({
			k,
			w: wk,
			ySrc: yc - wk / 2,
			yRow: yc,
			yMid: ym,
			ySnk: yk,
			col: BAND_COL[k],
			...NUTRIENTS[k]
		});
		ym -= gap;
	});
	return {
		xL,
		xM,
		xR,
		bands,
		total,
		mid,
		src,
		Y0,
		pitch
	};
})();
var sm = (u) => u * u * (3 - 2 * u);
/** Point on band k at s ∈ [0, 1] (xL → xM → xR), lateral v ∈ [0, 1] across the band (bottom → top). */
function bandPoint(k, s, v = .5) {
	const B = SANKEY.bands[k], S = SANKEY;
	const [x, y] = s < .5 ? [S.xL + (S.xM - S.xL) * s * 2, B.ySrc + (B.yMid - B.ySrc) * sm(s * 2)] : [S.xM + (S.xR - S.xM) * (s - .5) * 2, B.yMid + (B.ySnk - B.yMid) * sm((s - .5) * 2)];
	return [
		x,
		y + v * B.w,
		0
	];
}
/**
* Per-particle flow data from the calligram layout (Float32Array N·4, parked particles have z < −1e4): the band by
* height rank (top rows → top bands, particle counts ∝ band width, so the density is even), the lateral position by
* rank inside the band, the phase along the band from the particle's x (so decompiling is mostly a vertical sort).
*/
function flowData(cal, N) {
	const S = SANKEY, out = new Float32Array(N * 4), idx = [];
	for (let i = 0; i < N; i++) if (cal[i * 4 + 2] > -1e4) idx.push(i);
	idx.sort((a, b) => cal[b * 4 + 1] - cal[a * 4 + 1]);
	const cum = [];
	let acc = 0;
	for (const B of S.bands) {
		acc += B.w / S.total;
		cum.push(acc);
	}
	let k = 0, start = 0;
	idx.forEach((i, r) => {
		const f = (r + .5) / idx.length;
		while (k < cum.length - 1 && f > cum[k]) {
			k++;
			start = r;
		}
		const end = Math.round(cum[k] * idx.length), n = Math.max(1, end - start);
		const v = 1 - (r - start + .5) / n, phase = Math.min(.999, Math.max(0, (cal[i * 4] - CAL.x0) / (CAL.len + .3)));
		out.set([
			k,
			v * .9 + .05,
			phase,
			0
		], i * 4);
	});
	return out;
}
var VERT = `
uniform sampler2D uA, uW, uG, uF;
uniform float uS, uMorph, uSpread, uArc, uT, uFlowT, uDrainT, uSpeed, uWord, uReveal, uSoft;
uniform float uSize, uMinPx, uFocal, uBright, uFocus, uAperture, uMaxBlur, uOrtho;
uniform vec4 uBand[8]; uniform vec3 uBandCol[8]; uniform vec3 uX; uniform vec3 uPal[6]; uniform vec3 uWordCol;
out vec3 vCol; out float vBlur; flat out float vChar;
float sm(float u) { return u * u * (3. - 2. * u); }
vec3 flowPos(vec4 B, float v, float s) {
  vec2 q = s < .5 ? vec2(mix(uX.x, uX.y, s * 2.), mix(B.x, B.y, sm(s * 2.)))
                  : vec2(mix(uX.y, uX.z, s * 2. - 1.), mix(B.y, B.z, sm(s * 2. - 1.)));
  return vec3(q.x, q.y + v * B.w, 0.);
}
void cull() { gl_Position = vec4(2., 2., 2., 1.); gl_PointSize = 0.; vCol = vec3(0.); vBlur = 0.; vChar = 0.; }
void main() {
  float i = float(gl_VertexID);
  vec2 uv = (vec2(mod(i, uS), floor(i / uS)) + .5) / uS;
  vec4 a = texture(uA, uv), g = texture(uG, uv), f = texture(uF, uv), w = texture(uW, uv);
  if (g.x < 0. || a.z < -1e4) { cull(); return; }
  float vis = 1. - smoothstep(uReveal - uSoft, uReveal, a.w);
  if (vis <= 0.) { cull(); return; }
  float h = hash11(i * .754877 + 3.1);
  // decompile, in reading order: each character leaves its line and drops into its band
  float k = smoothstep(a.w * uSpread, a.w * uSpread + 1. - uSpread, uMorph);
  int bk = int(f.x + .5); vec4 B = uBand[bk];
  float sp = uSpeed * (.85 + .3 * h), sRaw = f.z + uFlowT * sp;
  // the drain: after flow time uDrainT no new characters enter; one that has wrapped since has gone into you
  bool gone = uDrainT >= 0. && floor(sRaw) > floor(f.z + uDrainT * sp);
  vec3 pf = flowPos(B, f.y, fract(sRaw));
  vec3 p = mix(a.xyz, pf, k) + (hash31(i * 1.618) - .5) * sin(k * PI) * uArc;
  // compile: the characters that spell the word leave the stream for their cell in it
  float kw = w.z > -1e4 ? smoothstep(h * .45, h * .45 + .55, uWord) : 0.;
  if (gone && kw <= 0.) { cull(); return; }
  p = mix(p, w.xyz, kw) + (hash31(i * 2.71) - .5) * sin(kw * PI) * uArc * .7;
  vec4 mv = modelViewMatrix * vec4(p, 1.);
  gl_Position = projectionMatrix * mv;
  float dist = max(-mv.z, 1e-3), persp = uOrtho > .5 ? 1. : 1. / dist;
  float px = uSize * uFocal * persp;
  float blur = uAperture > 0. ? min(uAperture * abs(dist - uFocus) * persp * uFocal, uMaxBlur) : 0.;
  float core = max(px, uMinPx), sz = min(core + blur, 511.);
  gl_PointSize = sz;
  vBlur = blur / sz;
  float energy = vis * min(1., px / uMinPx) * (core * core) / (sz * sz);
  vec3 col = mix(uPal[int(g.y + .5)] * g.z, uBandCol[bk] * (.75 + .5 * h), k);
  col = mix(col, uWordCol * (.85 + .3 * h), kw);
  vCol = col * uBright * energy;
  vChar = g.x;
}`;
var FRAG = `
uniform sampler2D uAtlas; uniform vec2 uGrid;
in vec3 vCol; in float vBlur; flat in float vChar; out vec4 o;
void main() {
  vec2 pc = gl_PointCoord, cell = vec2(mod(vChar, uGrid.x), floor(vChar / uGrid.x));
  float glyph = texture(uAtlas, (cell + clamp(pc, .02, .98)) / uGrid).r;
  float disc = (1. - smoothstep(.75, 1., length(pc - .5) * 2.)) * .3;
  o = vec4(vCol * mix(glyph, disc, smoothstep(0., .6, vBlur)), 1.);
}`;
var FlowGlyphs = class {
	/** field: a lib/glyphs GlyphField whose text() is set (it supplies the characters); cal/word: its layout textures. */
	constructor(field, cal, word) {
		const N = field.N, atlas = glyphAtlas(), f = (v) => ({ value: v });
		const geo = new BufferGeometry();
		geo.setAttribute("position", new BufferAttribute(new Float32Array(N * 3), 3));
		this.flowTex = dataTexture(flowData(cal.image.data, N), field.S, field.S);
		const S = SANKEY;
		this.material = shaderMaterial({
			vertex: VERT,
			fragment: FRAG,
			transparent: true,
			depthWrite: false,
			depthTest: true,
			blending: 2,
			uniforms: {
				uA: f(cal),
				uW: f(word),
				uG: f(field.glyphTex),
				uF: f(this.flowTex),
				uS: f(field.S),
				uAtlas: f(atlas.tex),
				uGrid: f(new Vector2(atlas.cols, atlas.rows)),
				uMorph: f(0),
				uSpread: f(.55),
				uArc: f(0),
				uT: f(0),
				uFlowT: f(0),
				uDrainT: f(-1),
				uSpeed: f(.5),
				uWord: f(0),
				uReveal: f(1.01),
				uSoft: f(.002),
				uSize: f(.05),
				uMinPx: f(3),
				uFocal: f(1e3),
				uBright: f(1),
				uFocus: f(5),
				uAperture: f(0),
				uMaxBlur: f(60),
				uOrtho: f(0),
				uBand: f(S.bands.map((B) => new Vector4(B.ySrc, B.yMid, B.ySnk, B.w))),
				uBandCol: f(S.bands.map((B) => new Vector3(...B.col))),
				uX: f(new Vector3(S.xL, S.xM, S.xR)),
				uPal: f(Array.from({ length: 6 }, () => new Vector3())),
				uWordCol: f(new Vector3(1, .9, .75))
			}
		});
		this.points = new Points(geo, this.material);
		this.points.frustumCulled = false;
	}
	/**
	* p: morph (calligram → flow), spread, arc, flowT (seconds of flow), drainT (flow time the drain began, or −1),
	* speed (band lengths per second), word (0..1 compile into the word), reveal (typing, reading order), size, minPx,
	* bright, palette (6 syntax colours), wordCol, focus/aperture/maxBlur, t.
	*/
	set(p, camera, H) {
		const u = this.material.uniforms;
		u.uMorph.value = p.morph ?? 0;
		u.uSpread.value = p.spread ?? .55;
		u.uArc.value = p.arc ?? 0;
		u.uT.value = p.t ?? 0;
		u.uFlowT.value = p.flowT ?? 0;
		u.uDrainT.value = p.drainT ?? -1;
		u.uSpeed.value = p.speed ?? .5;
		u.uWord.value = p.word ?? 0;
		u.uReveal.value = p.reveal ?? 1.01;
		u.uSoft.value = p.soft ?? .002;
		u.uSize.value = p.size ?? .05;
		u.uMinPx.value = (p.minPx ?? 3) * H / 1080;
		u.uBright.value = p.bright ?? 1;
		u.uFocus.value = p.focus ?? 5;
		u.uAperture.value = p.aperture ?? 0;
		u.uMaxBlur.value = (p.maxBlur ?? 60) * H / 1080;
		if (p.palette) u.uPal.value.forEach((v, i) => v.set(...p.palette[i]));
		if (p.wordCol) u.uWordCol.value.set(...p.wordCol);
		u.uOrtho.value = camera.isOrthographicCamera ? 1 : 0;
		u.uFocal.value = camera.isPerspectiveCamera ? H / 2 / Math.tan(MathUtils.degToRad(camera.fov) / 2) : H * camera.zoom / (camera.top - camera.bottom);
		return this;
	}
};
var Ribbons = class {
	constructor(n = 96) {
		const S = SANKEY, pos = [], col = [], sv = [], idx = [];
		S.bands.forEach((B) => {
			const base = pos.length / 3;
			for (let j = 0; j <= n; j++) {
				const s = j / n;
				for (const v of [0, 1]) {
					pos.push(...bandPoint(B.k, s, v));
					col.push(...B.col);
					sv.push(s);
				}
				if (j < n) {
					const a = base + j * 2;
					idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
				}
			}
		});
		const g = new BufferGeometry();
		g.setAttribute("position", new Float32BufferAttribute(pos, 3));
		g.setAttribute("aCol", new Float32BufferAttribute(col, 3));
		g.setAttribute("aS", new Float32BufferAttribute(sv, 1));
		g.setIndex(idx);
		this.material = new ShaderMaterial({
			glslVersion: GLSL3,
			transparent: true,
			depthWrite: false,
			depthTest: false,
			blending: 2,
			side: 2,
			uniforms: {
				uK: { value: 0 },
				uReveal: { value: 1 },
				uFrom: { value: 0 }
			},
			vertexShader: `in vec3 aCol; in float aS; out vec3 vCol; out float vS;
        void main() { vCol = aCol; vS = aS; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`,
			fragmentShader: `uniform float uK, uReveal, uFrom; in vec3 vCol; in float vS; out vec4 o;
        void main() { float k = smoothstep(uReveal, uReveal - .03, vS) * smoothstep(uFrom, uFrom + .03, vS); o = vec4(vCol * uK * k, 1.); }`
		});
		this.mesh = new Mesh(g, this.material);
		this.mesh.frustumCulled = false;
	}
	/** k: intensity; reveal: drawn up to s; from: hidden below s (the drain empties the bands from the left). */
	set(k, reveal = 1, from = 0) {
		const u = this.material.uniforms;
		u.uK.value = k;
		u.uReveal.value = reveal;
		u.uFrom.value = from;
		this.mesh.visible = k > 0;
		return this;
	}
};
//#endregion
export { BAND_COL, CALLIGRAM, FlowGlyphs, NUTRIENTS, Ribbons, SANKEY, bandPoint, calligramInside, calligramText, flowData };
