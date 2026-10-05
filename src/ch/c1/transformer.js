import { clamp, ease, rng } from "../../engine/math.js?v=BJIlRm7-";
import { Mesh, NearestFilter, PlaneGeometry } from "../../../vendor/three/build/three.core.js?v=q9f7JKE-";
import { dataTexture, shaderMaterial } from "../../engine/gpu.js?v=o4BYX3o1";
import { mixc } from "./palette.js?v=saiYSP4J";
import { v3u } from "./points.js?v=DdDvWrYF";
import { NET, nodeId, nodePos } from "./network.js?v=D20u632s";
//#region src/ch/c1/transformer.js
var N = 12;
var NL = NET.L;
/** The prompt: [string, GPT-2 token id]; show = with the leading space made visible. */
var TOKENS = [
	["<|endoftext|>", 50256],
	["If", 1532],
	[" I", 314],
	[" can", 460],
	[" give", 1577],
	[" you", 345],
	[" all", 477],
	[" the", 262],
	[" ST", 3563],
	["IM", 3955],
	["UL", 6239],
	["ATIONS", 18421]
].map(([s, id]) => ({
	s,
	id,
	show: s.replace(/^ /, "␣")
}));
/** The head drawn for each block (the 2×2 split shows all four). */
var HEADS = [
	{
		block: 1,
		head: 3,
		name: "previous token"
	},
	{
		block: 2,
		head: 0,
		name: "attention sink"
	},
	{
		block: 3,
		head: 5,
		name: "→ ␣you"
	},
	{
		block: 4,
		head: 2,
		name: "subword merge"
	}
];
function logit(h, i, j) {
	if (h === 0) return (j === i - 1 ? 5 : 0) + (j === i ? 1.2 : 0);
	if (h === 1) return (j === 0 ? 4 : 0) + (j === i ? .7 : 0) + (j === i - 1 ? .3 : 0);
	if (h === 2) return (j === 5 && i >= 5 ? 4.6 : 0) + (j === i ? 1 : 0) + (j === 0 ? .8 : 0);
	return (i > 8 && j >= 8 && j < i ? 3.4 + .4 * (j - 8) : 0) + (j === i ? 2 : 0) + (j === 0 ? .7 : 0);
}
/**
* Causal softmax attention of head h (0..3) given each token's presence (0..1, a token being written fades in as a
* key). Returns a 12 × 12 row-major matrix (row = query i, column = key j ≤ i); rows of absent tokens are zero.
*/
function attention(h, present) {
	const A = /* @__PURE__ */ new Float32Array(144);
	for (let i = 0; i < N; i++) {
		if (present[i] <= 0) continue;
		let mx = -1e9, sum = 0;
		for (let j = 0; j <= i; j++) if (present[j] > 0) mx = Math.max(mx, logit(h, i, j));
		for (let j = 0; j <= i; j++) {
			const v = present[j] > 0 ? Math.exp(logit(h, i, j) - mx) * present[j] : 0;
			A[i * N + j] = v;
			sum += v;
		}
		for (let j = 0; j <= i; j++) A[i * N + j] /= sum || 1;
	}
	return A;
}
var EMB = TOKENS.map((tk) => {
	const g = rng(tk.id * 7 + 13);
	return Array.from({ length: N }, () => (g() - .5) * 2);
});
var POS = Array.from({ length: N }, (_, i) => Array.from({ length: N }, (_, c) => .35 * Math.sin(i * (c + 1) * .37 + c)));
var mat = (seed) => {
	const g = rng(seed);
	return Array.from({ length: 144 }, () => (g() - .5) * 2 / Math.sqrt(N));
};
var W = [
	0,
	1,
	2,
	3
].map((l) => mat(101 + l));
var U = [
	0,
	1,
	2,
	3
].map((l) => mat(201 + l));
/** Forward pass for one presence vector: [x0 … x4], each 12 × 12 (row = token). */
function forward(present) {
	const X = [/* @__PURE__ */ new Float32Array(144)];
	for (let i = 0; i < N; i++) for (let c = 0; c < N; c++) X[0][i * N + c] = present[i] * (EMB[i][c] + POS[i][c]);
	for (let l = 0; l < NL - 1; l++) {
		const A = attention(l, present), x = X[l], y = /* @__PURE__ */ new Float32Array(144), out = /* @__PURE__ */ new Float32Array(144);
		for (let i = 0; i < N; i++) for (let j = 0; j <= i; j++) {
			const a = A[i * N + j];
			if (a) for (let c = 0; c < N; c++) y[i * N + c] += a * x[j * N + c];
		}
		for (let i = 0; i < N; i++) {
			if (present[i] <= 0) continue;
			const h = new Float32Array(N);
			for (let c = 0; c < N; c++) {
				let s = 0;
				for (let k = 0; k < N; k++) s += y[i * N + k] * W[l][k * N + c];
				h[c] = x[i * N + c] + s;
			}
			for (let c = 0; c < N; c++) {
				let s = 0;
				for (let k = 0; k < N; k++) s += h[k] * U[l][k * N + c];
				out[i * N + c] = (h[c] + .5 * Math.max(0, s)) * present[i];
			}
		}
		X.push(out);
	}
	return X;
}
/** Presence of each token at time τ, given arrival times (ease-in over 0.12 s). */
function presence(tau, arrive) {
	return arrive.map((a) => ease.outCubic(clamp((tau - a) / .12)));
}
/**
* Transformer state at time t (the transformer's stand-in for network.netState, same fields plus attention):
* P: { arrive (12 arrival times), repeat ([[row, time]]: a re-sung token flashes), tInj, beat, D, tStim }.
* Returns { act (720 node activations), raw, attn (4 matrices, each block at its pipelined time), attnNow (all four
* heads over the tokens present now), present, pulse, sparkPh, sparkOn, stim, edgeW (per ATT_EDGES) }.
*/
function attnState(t, P) {
	const act = new Float32Array(NL * N * N), raw = [], attn = [], down = !!P.down;
	const q = (t - P.tInj) / P.D;
	const pulse = t >= P.tInj ? Math.exp(-(q - Math.floor(q)) * 4) : 0;
	const stim = P.tStim != null && t >= P.tStim ? Math.max(0, 1 - ease.outCubic((t - P.tStim) / 1.6) * .55) * ease.outCubic((t - P.tStim) / .07) : 0;
	for (let l = 0; l < NL; l++) {
		const tau = down ? t + l * P.D : t - l * P.D, pr = presence(tau, P.arrive), X = forward(pr)[down ? NL - 1 - l : l];
		if (l < NL - 1) attn.push(down ? attention(NL - 2 - l, presence(t + (l + 1) * P.D, P.arrive)) : attention(l, pr));
		let mx = .08;
		for (const v of X) mx = Math.max(mx, Math.abs(v));
		const a = X.map((v) => Math.abs(v) / mx);
		raw.push(a);
		for (let i = 0; i < N; i++) {
			let flash = 0;
			for (const [row, tr] of P.repeat ?? []) if (row === i && tau >= tr) flash = Math.max(flash, Math.exp(-(tau - tr) * 5));
			for (let c = 0; c < N; c++) {
				let v = a[i * N + c] * (.82 + .18 * pulse) * (1 + .6 * flash);
				v = Math.max(v, stim * pr[i] * (.42 + .4 * a[i * N + c]));
				act[l * N * N + i * N + c] = Math.min(1.2, v);
			}
		}
	}
	const prNow = presence(t, P.arrive), attnNow = [
		0,
		1,
		2,
		3
	].map((h) => attention(h, prNow));
	const E = down ? ATT_EDGES_DOWN : ATT_EDGES, edgeW = new Float32Array(E.count);
	for (let e = 0; e < E.count; e++) edgeW[e] = attn[E.lay[e]][E.qi[e] * N + E.kj[e]] * (down ? -1 : 1);
	return {
		act,
		raw,
		attn,
		attnNow,
		present: prNow,
		pulse,
		sparkPh: down || t >= P.tInj ? q - Math.floor(q) : 0,
		sparkOn: down ? 1 : clamp((t - P.tInj - P.D * .5) / P.D),
		stim,
		edgeW,
		down
	};
}
var COLS = [
	2,
	6,
	9
];
/** Every causal link (key j at layer ℓ → query i at layer ℓ+1) at three columns; weights are set per frame. */
var ATT_EDGES = (() => {
	const src = [], dst = [], w = [], lay = [], qi = [], kj = [];
	for (let l = 0; l < NL - 1; l++) for (let i = 0; i < N; i++) for (let j = 0; j <= i; j++) for (const c of COLS) {
		src.push(nodeId(l, j, c));
		dst.push(nodeId(l + 1, i, c));
		w.push(0);
		lay.push(l);
		qi.push(i);
		kj.push(j);
	}
	return {
		src,
		dst,
		w,
		lay,
		qi,
		kj,
		count: src.length
	};
})();
/** The same links drawn downwards (the remake): key j at layer ℓ + 1 → query i at layer ℓ. */
var ATT_EDGES_DOWN = (() => {
	const src = [], dst = [], w = [], lay = [], qi = [], kj = [];
	for (let l = 0; l < NL - 1; l++) for (let i = 0; i < N; i++) for (let j = 0; j <= i; j++) for (const c of COLS) {
		src.push(nodeId(l + 1, j, c));
		dst.push(nodeId(l, i, c));
		w.push(0);
		lay.push(l);
		qi.push(i);
		kj.push(j);
	}
	return {
		src,
		dst,
		w,
		lay,
		qi,
		kj,
		count: src.length
	};
})();
/** Head colour per block: previous-token and sink cold, the "you" head warm, the subword head white-gold. */
var headCol = (pal, l) => [
	pal.cold,
	mixc(pal.cold, pal.dim, .35),
	pal.warm,
	pal.hot
][l];
/**
* Draw the attention links as glow lines: brightness ∝ attention weight × the key row's activation.
* o: gain, width, layers ([lo, hi] gaps), onlyQuery (row), minW, cols (subset of the three linked columns).
*/
function drawAttn(L, st, pal, o = {}) {
	const gain = o.gain ?? 1, width = o.width ?? 1.4, lo = o.layers?.[0] ?? 0, hi = o.layers?.[1] ?? NL - 2;
	const kl = st.down ? 1 : 0, ql = 1 - kl;
	for (let l = lo; l <= hi; l++) {
		const A = st.attn[l], col = headCol(pal, st.down ? NL - 2 - l : l);
		for (let i = 0; i < N; i++) {
			if (o.onlyQuery != null && i !== o.onlyQuery) continue;
			for (let j = 0; j <= i; j++) {
				const a = A[i * N + j];
				if (a < (o.minW ?? .06)) continue;
				let rowAct = 0;
				for (let c = 0; c < N; c++) rowAct += st.act[(l + kl) * N * N + j * N + c] / N;
				const k = gain * a * (.25 + 1.4 * rowAct);
				if (k < .015) continue;
				for (const c of o.cols ?? COLS) L.segment(nodePos(nodeId(l + kl, j, c)), nodePos(nodeId(l + ql, i, c)), {
					color: col.map((v) => v * k),
					width
				});
			}
		}
	}
}
/** World position of a token row's end at a layer (for labels): side -1 = low x end, +1 = high x end. */
var rowEnd = (l, i, side = -1, pad = .16) => {
	const p = nodePos(nodeId(l, i, side < 0 ? 0 : 11));
	return [
		p[0] + side * pad,
		p[1],
		p[2]
	];
};
var HEAT_VERT = `
out vec2 vUv;
void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`;
var HEAT_FRAG = `
uniform sampler2D uA; uniform float uHead, uGain, uHi;
uniform vec3 uC0, uC1, uC2, uC3;
in vec2 vUv; out vec4 o;
vec3 cmap(float a) {
  vec3 c = mix(uC0 * .05, uC0 * .7, smoothstep(0., .12, a));
  c = mix(c, uC1, smoothstep(.1, .4, a));
  c = mix(c, uC2, smoothstep(.35, .75, a));
  return mix(c, uC3, smoothstep(.75, 1., a));
}
void main() {
  vec2 g = vUv * 12.; vec2 id = floor(g), f = fract(g);
  float i = 11. - id.y, j = id.x;                                   // row = query (top = first token), column = key
  float a = texelFetch(uA, ivec2(int(j), int(uHead * 12. + i)), 0).r;
  vec2 e = min(f, 1. - f); float cell = smoothstep(.04, .1, min(e.x, e.y));
  float masked = step(i + .5, j);                                   // causal mask: keys after the query
  float hatch = step(.5, fract((g.x + g.y) * 1.5)) * .5 + .5;
  vec3 col = masked > .5 ? uC0 * .03 * hatch : cmap(a) * cell * uGain;
  col += uC3 * uHi * step(abs(j - 8.) , 3.5) * step(8. - .5, j) * (1. - masked) * .06;   // the STIMULATIONS columns, when lit
  float frame = 1. - smoothstep(0., .015, min(min(vUv.x, 1. - vUv.x), min(vUv.y, 1. - vUv.y)));
  o = vec4(col + uC1 * frame * .35, 1.);
}`;
/** A heatmap plane (1 × 1 in XY, facing +z) showing one head's attention; set(head, attnMatrices, pal, gain, hi). */
function makeAttnPlane() {
	const data = /* @__PURE__ */ new Float32Array(2304), tex = dataTexture(data, N, 48);
	tex.minFilter = tex.magFilter = NearestFilter;
	const m = new Mesh(new PlaneGeometry(1, 1), shaderMaterial({
		vertex: HEAT_VERT,
		fragment: HEAT_FRAG,
		transparent: true,
		depthWrite: false,
		blending: 2,
		side: 2,
		uniforms: {
			uA: { value: tex },
			uHead: { value: 0 },
			uGain: { value: 1 },
			uHi: { value: 0 },
			uC0: v3u(),
			uC1: v3u(),
			uC2: v3u(),
			uC3: v3u()
		}
	}));
	m.frustumCulled = false;
	m.userData.set = (head, mats, pal, gain = 1, hi = 0) => {
		for (let h = 0; h < 4; h++) for (let k = 0; k < 144; k++) data[(h * N * N + k) * 4] = mats[h][k];
		tex.needsUpdate = true;
		const u = m.material.uniforms;
		u.uHead.value = head;
		u.uGain.value = gain;
		u.uHi.value = hi;
		u.uC0.value.set(...pal.deep);
		u.uC1.value.set(...pal.cold);
		u.uC2.value.set(...pal.warm);
		u.uC3.value.set(...pal.hot);
		m.visible = true;
	};
	return m;
}
//#endregion
export { ATT_EDGES, ATT_EDGES_DOWN, HEADS, TOKENS, attention, attnState, drawAttn, forward, headCol, makeAttnPlane, presence, rowEnd };
