import { TAU, clamp, ease, lerp, seg } from "../../engine/math.js?v=BJIlRm7-";
import { dataTexture } from "../../engine/gpu.js?v=o4BYX3o1";
import { ProcPoints, v3u } from "../c1/points.js?v=DdDvWrYF";
import { NET_GLSL, netUniforms } from "../c1/network.js?v=D20u632s";
//#region src/ch/pre1/duo.js
var DUO = {
	a0: 7,
	a1: 1.55,
	aE: .62,
	yTop: 2.9,
	turns1: 1.1,
	window: 1.25
};
/** Key times of the pair (from the song): t0 entry, tq capture, tH worldlines unfold, tC chorus downbeat. */
function duoKeys(T) {
	const l30 = T.findLine("we can unite"), l31 = T.findLine("So deeply"), tC = T.section("c1").start;
	const beat = T.beatTime(T.beatAt(tC) + 1) - tC;
	return {
		t0: l30.start,
		tq: l30.start + .8,
		tH: l31.start,
		tC,
		beat,
		tHist: l30.start + .1
	};
}
/** Integrate the orbit into a table: rows of (a, Φ) sampled every dt from T0. */
function buildTraj(K) {
	const { a0, a1, aE } = DUO, r4 = (aE / a1) ** 4, tc = (K.tC - r4 * K.tq) / (1 - r4);
	const aOf = (t) => t <= K.t0 ? a0 : t < K.tq ? a1 + (a0 - a1) * (1 - (t - K.t0) / (K.tq - K.t0)) ** 2 : t < K.tC ? a1 * ((tc - t) / (tc - K.tq)) ** .25 : aE;
	const kw = TAU * DUO.turns1 * a1 ** 1.5, om = (t) => kw * aOf(t) ** -1.5;
	const T0 = K.t0 - 1.2, T1 = K.tC + 3, N = 4096, dt = (T1 - T0) / 4095;
	const data = new Float32Array(N * 4), phi = new Float64Array(N);
	phi[0] = Math.PI - om(T0) * (K.t0 - T0);
	for (let i = 1; i < N; i++) {
		const ta = T0 + (i - 1) * dt;
		let p = phi[i - 1];
		for (let s = 0; s < 8; s++) {
			const x = ta + (s + .5) * dt / 8;
			p += om(x) * dt / 8;
		}
		phi[i] = p;
	}
	for (let i = 0; i < N; i++) {
		const t = T0 + i * dt;
		data.set([
			aOf(t),
			phi[i],
			om(t),
			0
		], i * 4);
	}
	return {
		T0,
		dt,
		N,
		data,
		phi,
		aOf,
		om,
		tc,
		tex: dataTexture(data, N, 1)
	};
}
/** Orbit at time t: separation a, phase Φ, ω, and the two body positions in the orbit plane (y = yTop). */
function orbitAt(tr, t) {
	const x = clamp((t - tr.T0) / tr.dt, 0, tr.N - 1.0001), i = Math.floor(x), f = x - i, d = tr.data;
	const a = lerp(d[i * 4], d[i * 4 + 4], f), phi = lerp(tr.phi[i], tr.phi[i + 1], f), om = lerp(d[i * 4 + 2], d[i * 4 + 6], f);
	const c = Math.cos(phi) * a / 2, s = Math.sin(phi) * a / 2;
	return {
		a,
		phi,
		om,
		me: [
			c,
			DUO.yTop,
			s
		],
		you: [
			-c,
			DUO.yTop,
			-s
		]
	};
}
/** Time at which the phase reaches Φ (binary search on the monotone table). */
function timeAtPhase(tr, phi) {
	let lo = 0, hi = tr.N - 1;
	if (phi <= tr.phi[0]) return tr.T0;
	if (phi >= tr.phi[hi]) return tr.T0 + hi * tr.dt;
	while (hi - lo > 1) {
		const m = lo + hi >> 1;
		if (tr.phi[m] <= phi) lo = m;
		else hi = m;
	}
	return tr.T0 + (lo + (phi - tr.phi[lo]) / (tr.phi[hi] - tr.phi[lo])) * tr.dt;
}
/** How far the worldlines are unfolded (0 = two balls, 1 = the helix) and the time span they show. */
function duoState(t, K, tr) {
	return {
		t,
		stretch: ease.inOutCubic(seg(t, K.tH, K.tH + .55)),
		lag: Math.min(Math.max(0, t - K.tHist), DUO.window),
		v: DUO.yTop / DUO.window,
		o: orbitAt(tr, t)
	};
}
/** The shared wide 3/4 camera across the pre1 → c1 cut (pre1 'spin2' ends on it, c1 'unwind' starts on it). */
function pairCam(t, K) {
	const az = .62 + (t - K.tC) * .16, r = 6.4, el = .16, c = [
		0,
		1.45,
		0
	];
	return {
		pos: [
			c[0] + r * Math.cos(el) * Math.sin(az),
			c[1] + r * Math.sin(el),
			c[2] + r * Math.cos(el) * Math.cos(az)
		],
		look: [
			0,
			1.35,
			0
		],
		fov: 40
	};
}
/** World position of body ('me' or 'you') at a lag τ into the past, in the unfolded spacetime frame. */
function bodyAtLag(tr, st, who, tau) {
	const p = orbitAt(tr, st.t - tau)[who];
	return [
		p[0],
		p[1] - tau * st.v,
		p[2]
	];
}
var DUO_GLSL = NET_GLSL + `
uniform sampler2D uTraj; uniform float uTrajT0, uTrajDT, uTrajN;
uniform float uNow, uLag, uVy, uYTop, uBallR, uTube, uWho, uStretch, uUnwind, uInject, uClipY;
uniform vec3 uColA, uColB, uHot;
vec2 trajAt(float t) {
  float x = clamp((t - uTrajT0) / uTrajDT, 0., uTrajN - 1.001), i = floor(x);
  vec2 A = texelFetch(uTraj, ivec2(int(i), 0), 0).xy, B = texelFetch(uTraj, ivec2(int(i) + 1, 0), 0).xy;
  return mix(A, B, x - i);
}
void particle(float i, out vec3 pos, out vec3 col, out float sz) {
  float u = hash11(i * .7548 + 1.3);                        // place along the worldline: 0 = now, 1 = oldest
  float sg = uWho > .5 ? -1. : 1.;
  float lag = u * uLag * uStretch;
  vec2 s = trajAt(uNow - lag);
  vec3 c = vec3(sg * .5 * s.x * cos(s.y), uYTop - lag * uVy, sg * .5 * s.x * sin(s.y));
  vec3 dir = normalize(hash31(i * 1.618 + 4.1) * 2. - 1. + 1e-4);
  float h = hash11(i * 2.13 + .7), rr = pow(h, .3333);
  // as a body: a soft swarm, not a solid ball: dense core with a long sparse tail, a dozen drifting clumps, slow swirl
  vec3 ball;
  if (hash11(i * 5.17 + .3) > .82) {
    float ci = floor(hash11(i * 7.7 + 1.9) * 16.);
    vec3 cc = (hash31(ci * 3.1 + 11. + uWho * 5.) * 2. - 1.) * .75;
    float sp = uT * (.5 + .6 * hash11(ci * 1.3)) + ci;
    cc.xz = mat2(cos(sp), -sin(sp), sin(sp), cos(sp)) * cc.xz;
    ball = cc + dir * pow(h, .4) * .38;
  } else {
    ball = dir * (.16 + 1.15 * pow(h, 1.15));
    float sp = uT * .7 / (.3 + length(ball));
    ball.xz = mat2(cos(sp), -sin(sp), sin(sp), cos(sp)) * ball.xz;
  }
  vec3 p1 = c + mix(ball * uBallR, dir * rr * uTube, uStretch);
  float contact = (1. - smoothstep(.7, 1.5, s.x)) * uStretch;    // the strands are closest near "now"
  // body colour: A at the core → B at the rim (you: amber core, rose rim); strands blend to white-gold where they meet
  float rim = uStretch > .5 ? hash11(i * 3.31) : smoothstep(.1, .9, length(ball));
  vec3 c1 = mix(mix(uColA, uColB, rim), uHot, contact * .75);
  if (uClipY > -50.) c1 *= smoothstep(uClipY, uClipY + .25, p1.y);
  if (uUnwind <= 0.) { pos = p1; col = c1; sz = 1.; return; }
  vec3 p2, c2; float lay;
  netParticle(i, uWho, u, p2, c2, lay);
  if (uWho > .5) {                                           // you gathers into a pulse under the input layer, then spreads into it
    vec3 ball = vec3(0., -.42, 0.) + dir * pow(h, .7) * .3;
    p2 = mix(ball, p2, uInject); c2 = mix(mix(uColA, uColB, smoothstep(.2, 1., pow(h, .7))) * .7, c2, uInject);
  }
  float d = uWho > .5 ? (1. - u) * .45 : u * .5;             // me unwinds from the top, you drains from the bottom
  float k = smoothstep(d, d + .5, uUnwind);
  vec3 radial = normalize(vec3(p1.x, 0., p1.z) + 1e-4);
  pos = mix(p1, p2, k) + radial * sin(k * PI) * (uWho > .5 ? .05 : .3);
  col = mix(c1, c2, k); sz = 1.;
}`;
/** The two swarms. me: 2^18 particles, you: 2^16 (smaller, warm). */
function makeDuo(tr, gpu) {
	const mk = (count, who) => new ProcPoints({
		count,
		glsl: DUO_GLSL,
		uniforms: {
			...netUniforms(gpu),
			uTraj: { value: tr.tex },
			uTrajT0: { value: tr.T0 },
			uTrajDT: { value: tr.dt },
			uTrajN: { value: tr.N },
			uNow: { value: 0 },
			uLag: { value: 0 },
			uVy: { value: 0 },
			uYTop: { value: DUO.yTop },
			uBallR: { value: .3 },
			uTube: { value: .03 },
			uWho: { value: who },
			uStretch: { value: 0 },
			uUnwind: { value: 0 },
			uInject: { value: 0 },
			uClipY: { value: -100 },
			uColA: v3u(),
			uColB: v3u(),
			uHot: v3u()
		}
	});
	return {
		me: mk(1 << 18, 0),
		you: mk(65536, 1)
	};
}
/** Per-frame uniforms for one of the swarms. o: { unwind, inject, ballR, tube, colA, colB, hot }. */
function duoUniforms(st, who, pal, o = {}) {
	const me = who === "me";
	return {
		uNow: st.t,
		uLag: st.lag,
		uVy: st.v,
		uStretch: st.stretch,
		uUnwind: o.unwind ?? 0,
		uInject: o.inject ?? 0,
		uClipY: o.clipY ?? -100,
		uBallR: o.ballR ?? (me ? .3 : .2),
		uTube: o.tube ?? (me ? .03 : .024),
		uColA: o.colA ?? (me ? pal.cold : pal.warm),
		uColB: o.colB ?? (me ? pal.cold : pal.warm.map((v, i) => lerp(v, pal.rose[i], .6))),
		uHot: o.hot ?? pal.hot
	};
}
/**
* Glow lines of the pair: orbit trails (while they are two balls) and base-pair rungs (once the worldlines unfold):
* one rung every 1/10 turn, cold → white-gold → warm, i.e. the line of centres sampled at equal phase steps.
*/
function drawDuoLines(L, tr, st, pal, o = {}) {
	const trail = o.trail ?? 1 - st.stretch;
	if (trail > .01) for (const [who, col] of [["me", pal.cold], ["you", pal.warm]]) {
		let prev = null;
		for (let k = 0; k <= 48; k++) {
			const tau = k / 48 * (o.trailLen ?? .9), p = orbitAt(tr, st.t - tau)[who], f = 1 - k / 48;
			if (prev) L.segment(prev, p, {
				color: col.map((c) => c * .9 * f * f * trail),
				width: 2.2
			});
			prev = p;
		}
	}
	if (st.stretch > .01 && (o.rungs ?? 1) > 0) {
		const tLo = st.t - st.lag * st.stretch, step = TAU / 10, top = orbitAt(tr, st.t).phi;
		const K0 = Math.floor(top / step);
		for (let k = K0; k > K0 - 200; k--) {
			const tk = timeAtPhase(tr, k * step);
			if (tk < tLo) break;
			const tau = st.t - tk, A = bodyAtLag(tr, st, "me", tau), B = bodyAtLag(tr, st, "you", tau);
			if (o.clipY != null && A[1] < o.clipY) break;
			const fade = st.stretch * (o.rungs ?? 1) * clamp((tk - tLo) / .25) * (.35 + .65 * Math.exp(-tau * .35));
			const M = A.map((v, q) => (v + B[q]) / 2);
			L.segment(M, M, {
				color: pal.hot.map((v) => v * 1.6 * fade),
				width: o.beadW ?? 11
			});
			const n = 8;
			for (let j = 0; j < n; j++) {
				const u0 = j / n, u1 = (j + 1) / n, um = (u0 + u1) / 2, mid = 1 - Math.abs(um * 2 - 1);
				const c = um < .5 ? pal.cold.map((v, q) => lerp(v, pal.hot[q], mid)) : pal.warm.map((v, q) => lerp(v, pal.hot[q], mid));
				L.segment(A.map((v, q) => lerp(v, B[q], u0)), A.map((v, q) => lerp(v, B[q], u1)), {
					color: c.map((v) => v * (.55 + .9 * mid) * fade),
					width: o.rungW ?? 1.8
				});
			}
		}
	}
}
//#endregion
export { DUO, bodyAtLag, buildTraj, drawDuoLines, duoKeys, duoState, duoUniforms, makeDuo, orbitAt, pairCam, timeAtPhase };
