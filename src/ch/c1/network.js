import { rng } from "../../engine/math.js?v=BJIlRm7-";
import { Mesh, PlaneGeometry } from "../../../vendor/three/build/three.core.js?v=q9f7JKE-";
import { dataTexture, shaderMaterial } from "../../engine/gpu.js?v=o4BYX3o1";
import { PAL } from "./palette.js?v=saiYSP4J";
import { v3u } from "./points.js?v=DdDvWrYF";
//#region src/ch/c1/network.js
var NET = {
	L: 5,
	n: 12,
	dy: .7,
	sp: .19,
	y0: 0
};
var N2 = NET.n * NET.n;
var NN = NET.L * N2;
var nodeId = (l, r, c) => l * N2 + r * NET.n + c;
function nodePos(id) {
	const l = Math.floor(id / N2), k = id % N2, r = Math.floor(k / NET.n);
	return [
		(k % NET.n - (NET.n - 1) / 2) * NET.sp,
		NET.y0 + l * NET.dy,
		(r - (NET.n - 1) / 2) * NET.sp
	];
}
var layerY = (l) => NET.y0 + l * NET.dy;
var BASE_K = [
	[
		1,
		1,
		1,
		1,
		-8,
		1,
		1,
		1,
		1
	].map((v) => v / 8),
	[
		-1,
		0,
		1,
		-2,
		0,
		2,
		-1,
		0,
		1
	].map((v) => v / 4),
	[
		2,
		1,
		0,
		1,
		0,
		-1,
		0,
		-1,
		-2
	].map((v) => v / 4),
	[
		1,
		2,
		1,
		2,
		4,
		2,
		1,
		2,
		1
	].map((v) => v / 16)
];
var KERNELS = (() => {
	const g = rng(7331);
	return BASE_K.map((k) => k.map((v) => v + (g() - .5) * .16));
})();
/** Edge list for the conv connectivity (zero padding): src node, dst node, weight, src layer. */
var EDGES = (() => {
	const src = [], dst = [], w = [], lay = [];
	for (let l = 0; l < NET.L - 1; l++) for (let r = 0; r < NET.n; r++) for (let c = 0; c < NET.n; c++) for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
		const rr = r + dr, cc = c + dc;
		if (rr < 0 || cc < 0 || rr >= NET.n || cc >= NET.n) continue;
		src.push(nodeId(l, rr, cc));
		dst.push(nodeId(l + 1, r, c));
		w.push(KERNELS[l][(dr + 1) * 3 + dc + 1]);
		lay.push(l);
	}
	return {
		src,
		dst,
		w,
		lay,
		count: src.length
	};
})();
var NetGPU = class {
	/** o.edges: an edge list shaped like EDGES ({ src, dst, w, lay, count }); default the conv synapses. */
	constructor(o = {}) {
		const E = o.edges ?? EDGES;
		this.nodeData = /* @__PURE__ */ new Float32Array(4096);
		for (let i = 0; i < NN; i++) this.nodeData.set([...nodePos(i), 0], i * 4);
		this.nodes = dataTexture(this.nodeData, 32, 32);
		const H = Math.ceil(E.count / 128), ed = new Float32Array(128 * H * 4);
		for (let e = 0; e < E.count; e++) ed.set([
			E.src[e],
			E.dst[e],
			E.w[e],
			E.lay[e]
		], e * 4);
		this.edgeData = ed;
		this.ne = E.count;
		this.edges = dataTexture(ed, 128, H);
	}
	update(st) {
		for (let i = 0; i < NN; i++) this.nodeData[i * 4 + 3] = st.act[i];
		this.nodes.needsUpdate = true;
		if (st.edgeW) {
			for (let e = 0; e < this.ne; e++) this.edgeData[e * 4 + 2] = st.edgeW[e];
			this.edges.needsUpdate = true;
		}
	}
};
/** Uniforms NET_GLSL needs (merge into a ProcPoints' uniforms). */
function netUniforms(gpu) {
	return {
		uNodes: { value: gpu.nodes },
		uEdges: { value: gpu.edges },
		uNE: { value: gpu.ne ?? EDGES.count },
		uSparkPh: { value: 0 },
		uSparkOn: { value: 0 },
		uOnly: { value: -1 },
		uNodeR: { value: .022 },
		uNCold: v3u(PAL.c1.cold),
		uNWarm: v3u(PAL.c1.warm),
		uNHot: v3u(PAL.c1.hot),
		uNIdle: { value: .1 }
	};
}
/** Per-frame values for netUniforms from a netState and a palette. */
function netUniformValues(st, pal, o = {}) {
	return {
		uSparkPh: st.sparkPh,
		uSparkOn: st.sparkOn * (o.sparks ?? 1),
		uOnly: o.only ?? -1,
		uNodeR: o.nodeR ?? .022,
		uNCold: pal.cold,
		uNWarm: pal.warm,
		uNHot: pal.hot,
		uNIdle: o.idle ?? .1
	};
}
var NET_GLSL = `
uniform sampler2D uNodes, uEdges;
uniform float uNE, uSparkPh, uSparkOn, uOnly, uNodeR, uNIdle;
uniform vec3 uNCold, uNWarm, uNHot;
vec4 nNode(float id) { return texelFetch(uNodes, ivec2(int(mod(id, 32.)), int(floor(id / 32.))), 0); }
vec4 nEdge(float id) { return texelFetch(uEdges, ivec2(int(mod(id, 128.)), int(floor(id / 128.))), 0); }
// Network pose of particle i. who: 0 = me (hidden layers 1..4 and synapse sparks), 1 = you (the input layer).
// u (0..1) picks the layer for me (u near 0 = top), so particles from the top of the pre1 helix land on the top layer.
void netParticle(float i, float who, float u, out vec3 pos, out vec3 col, out float lay) {
  vec3 dir = normalize(hash31(i * 1.618 + 4.1) * 2. - 1. + 1e-4);
  float rr = pow(hash11(i * 2.13 + .7), .3333);
  if (who < .5 && hash11(i * .371 + 9.1) > .74) {
    float e = floor(hash11(i * .913 + 2.7) * uNE);
    vec4 E = nEdge(e); vec4 A = nNode(E.x), B = nNode(E.y);
    float s = fract(uSparkPh - hash11(i * 3.7) * .22);                 // a short comet: head at the phase, tail behind
    pos = mix(A.xyz, B.xyz, s) + dir * .003;
    float flow = abs(E.z) * A.w * uSparkOn * (1. - .5 * s);
    col = (E.z > 0. ? uNWarm : uNCold) * (.004 + 2.6 * flow);
    lay = E.w + s;
    if (uOnly > -.5) col = vec3(0.);
    return;
  }
  float l = who > .5 ? 0. : 1. + min(3., floor((1. - u) * 4.));
  float id = l * 144. + floor(hash11(i * .577 + 5.3) * 144.);
  vec4 N = nNode(id); float a = N.w;
  pos = N.xyz + dir * rr * uNodeR * (.65 + .9 * a);
  vec3 base = who > .5 ? mix(uNWarm, vec3(1., .28, .55), hash11(i * 3.31) * .6) : uNCold;
  col = mix(base, mix(uNWarm, uNHot, a), smoothstep(.15, .85, a) * (who > .5 ? .5 : .95)) * (uNIdle + 1.1 * a);
  lay = l;
  if (uOnly > -.5 && abs(l - uOnly) > .5) col = vec3(0.);
}`;
var HEAT_VERT = `
out vec2 vUv;
void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`;
var HEAT_FRAG = `
uniform sampler2D uNodes; uniform float uLayer, uGain, uGap;
uniform vec3 uC0, uC1, uC2, uC3;
in vec2 vUv; out vec4 o;
vec3 cmap(float a) {
  vec3 c = mix(uC0 * .04, uC0 * .5, smoothstep(0., .3, a));
  c = mix(c, uC1, smoothstep(.25, .6, a));
  c = mix(c, uC2, smoothstep(.55, .85, a));
  return mix(c, uC3, smoothstep(.85, 1., a));
}
void main() {
  vec2 g = vUv * 12.; vec2 id = floor(g), f = fract(g);
  float n = uLayer * 144. + (11. - id.y) * 12. + id.x;
  float a = texelFetch(uNodes, ivec2(int(mod(n, 32.)), int(floor(n / 32.))), 0).w;
  vec2 e = min(f, 1. - f); float cell = smoothstep(uGap, uGap + .06, min(e.x, e.y));
  vec2 gg = abs(fract(g) - .5); float frame = 1. - smoothstep(.0, .03, .5 - max(gg.x, gg.y));
  o = vec4(cmap(a) * cell * uGain + uC0 * frame * .05 * uGain, 1.);
}`;
/** A heatmap of one layer (a plane in xz, 12×12 cells, row 0 at -z). Scale/position it with the layer. */
function makeHeatPlane(gpu) {
	const g = new PlaneGeometry(1, 1);
	g.rotateX(-Math.PI / 2);
	const m = new Mesh(g, shaderMaterial({
		vertex: HEAT_VERT,
		fragment: HEAT_FRAG,
		transparent: true,
		depthWrite: false,
		blending: 2,
		side: 2,
		uniforms: {
			uNodes: { value: gpu.nodes },
			uLayer: { value: 1 },
			uGain: { value: 1 },
			uGap: { value: .08 },
			uC0: v3u(),
			uC1: v3u(),
			uC2: v3u(),
			uC3: v3u()
		}
	}));
	m.frustumCulled = false;
	m.userData.set = (layer, pal, gain = 1) => {
		const u = m.material.uniforms, s = NET.n * NET.sp;
		u.uLayer.value = layer;
		u.uGain.value = gain;
		u.uC0.value.set(...pal.deep);
		u.uC1.value.set(...pal.cold);
		u.uC2.value.set(...pal.hot);
		u.uC3.value.set(...pal.warm);
		m.scale.set(s, 1, s);
		m.position.set(0, layerY(layer) - .004, 0);
		m.visible = true;
	};
	return m;
}
//#endregion
export { EDGES, KERNELS, NET, NET_GLSL, NN, NetGPU, layerY, makeHeatPlane, netUniformValues, netUniforms, nodeId, nodePos };
