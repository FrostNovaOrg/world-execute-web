import { Mesh, PlaneGeometry } from "../../../vendor/three/build/three.core.js?v=q9f7JKE-";
import { dataTexture, shaderMaterial } from "../../engine/gpu.js?v=o4BYX3o1";
import { ProcPoints, v3u } from "../c1/points.js?v=DdDvWrYF";
import { EDGES, KERNELS, NET, layerY, nodePos } from "../c1/network.js?v=D20u632s";
//#region src/ch/c3/deadnet.js
var N2 = NET.n * NET.n;
var NN = NET.L * N2;
var HID = (NET.L - 1) * N2;
function convZ(a, K, skip) {
	const n = NET.n, out = new Float32Array(N2);
	for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
		let s = 0, b = 0;
		for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
			const rr = r + dr, cc = c + dc;
			if (rr < 0 || cc < 0 || rr >= n || cc >= n) continue;
			const v = a[rr * n + cc];
			s += K[(dr + 1) * 3 + dc + 1] * v;
			b += v;
		}
		out[r * n + c] = s + skip * b / 9;
	}
	return out;
}
var SKIP = (l) => l === 0 ? .05 : .22;
/** you's replayed trace: c1's two Gaussian pulses, drifting continuously along the same path (phase j). */
function replayInput(j, amp = 1) {
	const x = new Float32Array(N2);
	const c = [
		5.5 + 3.4 * Math.sin(j * 2.3 + .7),
		5.5 + 3.1 * Math.sin(j * 1.37 + 2.2),
		5.5 + 3.6 * Math.cos(j * 1.9 + 1.1),
		5.5 + 3.2 * Math.cos(j * 2.9 + .3)
	];
	for (let r = 0; r < NET.n; r++) for (let cc = 0; cc < NET.n; cc++) {
		const d1 = (cc - c[0]) ** 2 + (r - c[1]) ** 2, d2 = (cc - c[2]) ** 2 + (r - c[3]) ** 2;
		x[r * NET.n + cc] = amp * Math.min(1, Math.exp(-d1 / 4.2) + .65 * Math.exp(-d2 / 2.2));
	}
	return x;
}
/**
* The forward pass with bias b. Returns { act (720, displayed), z (720, pre-activation z/m + b; input layer: x),
* alive [l1..l4], aliveTotal }.
*/
function deadForward(x, b) {
	const act = new Float32Array(NN), zz = new Float32Array(NN), alive = [];
	act.set(x, 0);
	zz.set(x, 0);
	let ref = x, a = x;
	for (let l = 0; l < NET.L - 1; l++) {
		const zr = convZ(ref, KERNELS[l], SKIP(l));
		let mx = 0;
		for (const v of zr) mx = Math.max(mx, v);
		const m = Math.max(mx, .08);
		ref = zr.map((v) => Math.max(0, v) / m);
		const z = convZ(a, KERNELS[l], SKIP(l)), out = new Float32Array(N2);
		let n = 0;
		for (let i = 0; i < N2; i++) {
			const v = z[i] / m + b;
			zz[(l + 1) * N2 + i] = v;
			out[i] = Math.max(0, v);
			if (v > 0) n++;
		}
		act.set(out, (l + 1) * N2);
		alive.push(n);
		a = out;
	}
	return {
		act,
		z: zz,
		alive,
		aliveTotal: alive.reduce((s, v) => s + v, 0)
	};
}
var DeadGPU = class {
	constructor() {
		this.nodeData = /* @__PURE__ */ new Float32Array(4096);
		for (let i = 0; i < NN; i++) this.nodeData.set([...nodePos(i), 0], i * 4);
		this.nodes = dataTexture(this.nodeData, 32, 32);
		const H = Math.ceil(EDGES.count / 128), ed = new Float32Array(128 * H * 4);
		for (let e = 0; e < EDGES.count; e++) ed.set([
			EDGES.src[e],
			EDGES.dst[e],
			EDGES.w[e],
			EDGES.lay[e]
		], e * 4);
		this.edges = dataTexture(ed, 128, H);
		this.last = null;
	}
	update(act) {
		if (this.last === act) return;
		for (let i = 0; i < NN; i++) this.nodeData[i * 4 + 3] = act[i];
		this.nodes.needsUpdate = true;
		this.last = act;
	}
};
var GLSL = `
uniform sampler2D uNodes, uEdges;
uniform float uNE, uSparkPh, uSparkOn, uNodeR, uOnly, uIdle, uAsh, uWarmK;
uniform vec3 uDeep, uHot, uAshCol, uWarm, uRose;
vec4 nNode(float id) { return texelFetch(uNodes, ivec2(int(mod(id, 32.)), int(floor(id / 32.))), 0); }
vec4 nEdge(float id) { return texelFetch(uEdges, ivec2(int(mod(id, 128.)), int(floor(id / 128.))), 0); }
void particle(float i, out vec3 pos, out vec3 col, out float sz) {
  vec3 dir = normalize(hash31(i * 1.618 + 4.1) * 2. - 1. + 1e-4);
  float rr = pow(hash11(i * 2.13 + .7), .3333);
  sz = 1.;
  if (hash11(i * .371 + 9.1) > .8) {                                  // a spark on a synapse, fed by its source
    float e = floor(hash11(i * .913 + 2.7) * uNE);
    vec4 E = nEdge(e); vec4 A = nNode(E.x), B = nNode(E.y);
    float s = fract(uSparkPh - hash11(i * 3.7) * .22);
    pos = mix(A.xyz, B.xyz, s) + dir * .003;
    float flow = abs(E.z) * A.w * uSparkOn * (1. - .5 * s);
    col = (E.w < .5 ? mix(uWarm, uRose, .25) * .8 : mix(uDeep, uHot, .55)) * 2.4 * flow;   // you's replay is warm
    if (uOnly > -.5 && abs(E.w - uOnly) > .5 && abs(E.w + 1. - uOnly) > .5) col = vec3(0.);
    return;
  }
  float id = floor(hash11(i * .577 + 5.3) * 720.), l = floor(id / 144.);
  vec4 N = nNode(id); float a = N.w;
  pos = N.xyz + dir * rr * uNodeR * (.65 + .9 * clamp(a, 0., 1.));
  if (l < .5) {                                                        // you's replayed trace: warm, and nothing gets through
    col = mix(uWarm, uRose, hash11(i * 3.31) * .6) * (uIdle * .6 + 1.1 * a) * uWarmK;
  } else if (a > 0.) {                                                  // alive: an ember, hotter with a
    col = mix(uDeep, uHot, smoothstep(.05, .9, a)) * (uIdle * 1.4 + 1.5 * a);
  } else {                                                              // dead: ash
    col = uAshCol * uAsh * (.6 + .8 * hash11(id * 7.1));
  }
  if (uOnly > -.5 && abs(l - uOnly) > .5) col = vec3(0.);
}`;
/** The network's particles (nodes + sparks). Per frame: set({ ..., u: deadUniforms(st, o) }, cam, hPx). */
function makeDeadMatter(gpu, count = 1 << 18) {
	return new ProcPoints({
		count,
		glsl: GLSL,
		uniforms: {
			uNodes: { value: gpu.nodes },
			uEdges: { value: gpu.edges },
			uNE: { value: EDGES.count },
			uSparkPh: { value: 0 },
			uSparkOn: { value: 0 },
			uNodeR: { value: .024 },
			uOnly: { value: -1 },
			uIdle: { value: .1 },
			uAsh: { value: 1 },
			uWarmK: { value: 1 },
			uDeep: v3u(),
			uHot: v3u(),
			uAshCol: v3u(),
			uWarm: v3u(),
			uRose: v3u()
		}
	});
}
function deadUniforms(st, pal, o = {}) {
	return {
		uSparkPh: st.sparkPh,
		uSparkOn: st.sparkOn * (o.sparks ?? 1),
		uNodeR: o.nodeR ?? .024,
		uOnly: o.only ?? -1,
		uIdle: o.idle ?? .1,
		uAsh: o.ash ?? 1,
		uWarmK: o.warm ?? 1,
		uDeep: pal.deep,
		uHot: pal.hot,
		uAshCol: pal.ash,
		uWarm: pal.warm,
		uRose: pal.rose
	};
}
/**
* Synapses as glow lines: brightness base + gain·|w|·a(src). o: base, gain, width, only (node id: its fan-in and
* fan-out), layers [lo, hi] (source layers), near: [x, y, z, r] skip segments whose midpoint is within r of a point.
*/
function drawSynapses(L, st, pal, o = {}) {
	const base = o.base ?? .005, gain = o.gain ?? 1, gain0 = o.gain0 ?? gain * .45, width = o.width ?? 1.2, lo = o.layers?.[0] ?? 0, hi = o.layers?.[1] ?? NET.L - 2;
	for (let e = 0; e < EDGES.count; e++) {
		const s = EDGES.src[e], d = EDGES.dst[e], l = EDGES.lay[e];
		if (l < lo || l > hi) continue;
		if (o.only != null && s !== o.only && d !== o.only) continue;
		const w = EDGES.w[e], a = st.act[s], k = base + (l === 0 ? gain0 : gain) * Math.abs(w) * a * (l === 0 ? 1 : .4 + .6 * st.sparkOn);
		if (k < .003) continue;
		const c = l === 0 && a > 0 ? pal.warm : a > 0 ? pal.hot : pal.deep;
		L.segment(nodePos(s), nodePos(d), {
			color: [
				c[0] * k,
				c[1] * k,
				c[2] * k
			],
			width
		});
	}
}
var HEAT_VERT = `
out vec2 vUv;
void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`;
var HEAT_FRAG = `
uniform sampler2D uNodes; uniform float uLayer, uGain, uGap, uFrame;
uniform vec3 uC0, uC1, uC2;
in vec2 vUv; out vec4 o;
void main() {
  vec2 g = vUv * 12.; vec2 id = floor(g), f = fract(g);
  float n = uLayer * 144. + (11. - id.y) * 12. + id.x;
  float a = texelFetch(uNodes, ivec2(int(mod(n, 32.)), int(floor(n / 32.))), 0).w;
  vec2 e = min(f, 1. - f); float cell = smoothstep(uGap, uGap + .06, min(e.x, e.y));
  vec2 gg = abs(fract(g) - .5); float frame = 1. - smoothstep(.0, .03, .5 - max(gg.x, gg.y));
  vec3 c = a > .01 ? mix(uC0 * .35, uC1, smoothstep(0., .5, a)) * smoothstep(.01, .08, a) : vec3(0.);
  c = mix(c, uC2, smoothstep(.5, 1., a));
  o = vec4(c * cell * uGain + uC0 * frame * uFrame * uGain, 1.);
}`;
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
			uFrame: { value: .04 },
			uC0: v3u(),
			uC1: v3u(),
			uC2: v3u()
		}
	}));
	m.frustumCulled = false;
	/** c: [c0 (frame, low), c1 (mid), c2 (high)]; frame: cell-outline intensity. */
	m.userData.set = (layer, c, gain = 1, frame = .04) => {
		const u = m.material.uniforms, s = NET.n * NET.sp;
		u.uLayer.value = layer;
		u.uGain.value = gain;
		u.uFrame.value = frame;
		u.uC0.value.set(...c[0]);
		u.uC1.value.set(...c[1]);
		u.uC2.value.set(...c[2]);
		m.scale.set(s, 1, s);
		m.position.set(0, layerY(layer) - .004, 0);
		m.visible = true;
	};
	return m;
}
/**
* When a unit dies (its a reaches 0 for the last time), it drops an ember: a few sparks that fall slowly through the
* layers below, cooling from hot to ember red to nothing in about a second. deaths: Float32Array(720) of death times
* (≤ 0: never seen alive, or input units).
*/
function makeDeathRain(gpu, deaths, count = 4096) {
	const tex = dataTexture(Float32Array.from({ length: 1024 }, (_, i) => deaths[i] ?? 0), 32, 32, { channels: 1 });
	return new ProcPoints({
		count,
		uniforms: {
			uNodes: { value: gpu.nodes },
			uDeath: { value: tex },
			uHot: v3u(),
			uEmber: v3u(),
			uGain: { value: 1 }
		},
		glsl: `
uniform sampler2D uNodes, uDeath; uniform vec3 uHot, uEmber; uniform float uGain;
void particle(float i, out vec3 pos, out vec3 col, out float sz) {
  float u = 144. + mod(i, 576.), k = floor(i / 576.);
  ivec2 c = ivec2(int(mod(u, 32.)), int(floor(u / 32.)));
  float td = texelFetch(uDeath, c, 0).r, tau = uT - td - k * .045;
  sz = .7 + .6 * hash11(i * 1.7);
  if (td <= 0. || tau <= 0. || tau > 1.4) { col = vec3(0.); pos = vec3(0.); return; }
  vec3 N = texelFetch(uNodes, c, 0).xyz, h = hash31(i * .917 + 3.3) - .5;
  pos = N + h * .03 + vec3(h.x * .12 * tau, -.5 * 1.1 * tau * tau - .05 * tau, h.z * .12 * tau);
  col = mix(uHot, uEmber, smoothstep(0., .35, tau)) * exp(-tau * 2.6) * uGain;
}`
	});
}
//#endregion
export { DeadGPU, EDGES, HID, N2, NET, NN, deadForward, deadUniforms, drawSynapses, layerY, makeDeadMatter, makeDeathRain, makeHeatPlane, nodePos, replayInput };
