import { hash2 } from "../../engine/math.js?v=BJIlRm7-";
import { BoxGeometry, DataTexture, FloatType, InstancedBufferAttribute, InstancedBufferGeometry, Mesh, NearestFilter, RGBAFormat, RedFormat } from "../../../vendor/three/build/three.core.js?v=q9f7JKE-";
import { shaderMaterial } from "../../engine/gpu.js?v=o4BYX3o1";
import { ProcPoints, v3u } from "../c1/points.js?v=DdDvWrYF";
//#region src/ch/c3/city.js
var CITY = {
	n: 40,
	sp: .26,
	foot: .17,
	hist: 64,
	dt: 1 / 30,
	speed: 3.2,
	g: 9.81,
	wave: 12,
	w0: 4.5
};
var CITY_R = CITY.n / 2 * CITY.sp;
/** The pillars' layout (identical to c1's): x, z, base height, band, hash. */
var PILLARS = (() => {
	const out = [];
	for (let i = 0; i < CITY.n; i++) for (let j = 0; j < CITY.n; j++) {
		const x = (i - (CITY.n - 1) / 2) * CITY.sp, z = (j - (CITY.n - 1) / 2) * CITY.sp, r = Math.hypot(x, z) / CITY_R;
		const h1 = hash2(i, j + 1e3), h2 = hash2(i, j + 2e3), h3 = hash2(i, j + 3e3);
		const base = (.25 + 2.3 * h1 ** 2.2) * Math.exp(-r * r * 1.6) + .06;
		const band = Math.min(15, Math.floor(Math.min(1, Math.max(0, r * .9 + (h2 - .5) * .5)) * 16));
		out.push({
			x,
			z,
			base: r > 1.02 ? 0 : base,
			band,
			h: h3
		});
	}
	return out;
})();
/** When the wave reaches a pillar (s after EXECUTION), and how long a pillar of height h takes to lie flat. */
var collapseAt = (p) => Math.hypot(p.x, p.z) / CITY.wave + p.h * .05;
var spin0 = (p) => CITY.w0 * (1 - .6 * Math.min(1, Math.hypot(p.x, p.z) / CITY_R));
var fallTime = (h, w0) => {
	const k = Math.sqrt(1.5 * CITY.g / Math.max(h, .02));
	return Math.asinh(Math.PI / 2 * k / w0) / k;
};
var VERT = `
in vec4 aP;                       // x, z, base height, band
in float aH;                      // hash
uniform sampler2D uSpec; uniform float uT, uExeT, uWave, uG, uSpeed, uFoot, uDt, uW0;
out vec3 vL; out vec3 vSize; out float vE, vH, vDist, vFall, vRub, vBase, vKick;
float spec(float band, float lag) {
  float m = clamp(lag / uDt, 0., 62.), i = floor(m);
  float a = texelFetch(uSpec, ivec2(int(band), int(i)), 0).r, b = texelFetch(uSpec, ivec2(int(band), int(i) + 1), 0).r;
  return mix(a, b, m - i);
}
void main() {
  float r = length(aP.xy), lag = r / uSpeed;
  float tc = uExeT > 0. ? uExeT + r / uWave + aH * .05 : 1e9, tau = uT - tc;
  // standing: the live spectrum (as in c1); once hit, the height it had when the wave arrived
  float e = spec(aP.w, lag + max(tau, 0.));
  float h = max(.02, aP.z * (.3 + 1.25 * e));
  float k = sqrt(1.5 * uG / h), w0 = uW0 * (1. - .6 * clamp(r / 5.2, 0., 1.));
  float th = tau > 0. ? min(1.5708, w0 / k * sinh(min(k * tau, 12.))) : 0.;
  float tLand = log(1.5708 * k / w0 + sqrt(pow(1.5708 * k / w0, 2.) + 1.)) / k;   // asinh
  vec3 p = position;                                                  // unit box, y in [0, 1]
  vec3 w = vec3(p.x * uFoot, p.y * h, p.z * uFoot);
  // tip outward about the outer edge of the footing, in the vertical plane through the centre
  vec2 dir = r > .05 ? aP.xy / r : vec2(cos(aH * 37.7), sin(aH * 37.7));
  vec2 pv = dir * uFoot * .5, q = w.xz - pv;
  float u = dot(q, dir), c = cos(th), s = sin(th);
  vec2 perp = q - dir * u;
  float u2 = u * c + w.y * s, y2 = -u * s + w.y * c;
  w.xz = pv + dir * u2 + perp + aP.xy; w.y = y2;
  float fell = th / 1.5708;
  vL = p; vSize = vec3(uFoot, h, uFoot); vE = tau > 0. ? e * exp(-tau * 7.) * (1. - fell) : e; vH = h;   // once hit, its light goes out
  vFall = fell; vRub = tau > tLand ? tau - tLand : -1.; vBase = aP.z;
  vKick = tau > 0. ? exp(-tau * 30.) : 0.;
  vec4 mv = modelViewMatrix * vec4(w, 1.); vDist = -mv.z;
  gl_Position = projectionMatrix * mv;
}`;
var FRAG = `
uniform vec3 uCold, uWarm, uHot, uEmber; uniform float uGain, uEdge, uFace, uFog;
in vec3 vL; in vec3 vSize; in float vE, vH, vDist, vFall, vRub, vBase, vKick; out vec4 o;
uniform float uKick;
void main() {
  if (vBase <= 0.) discard;
  vec3 q = vec3((.5 - abs(vL.x)) * vSize.x, min(vL.y, 1. - vL.y) * vSize.y, (.5 - abs(vL.z)) * vSize.z);
  float onSide = step(abs(abs(vL.x) - .5), 1e-3) + step(abs(abs(vL.z) - .5), 1e-3);
  float d = onSide > .5 ? min(abs(vL.x) > .499 ? q.z : q.x, q.y) : min(q.x, q.z);
  float px = fwidth(d);
  float edge = 1. - smoothstep(.0, px * 1.4, d);
  float top = step(.999, vL.y);
  float heat = clamp(vE * 1.2, 0., 1.);
  vec3 c = mix(uCold, uWarm, smoothstep(.45, 1., heat) * (.55 + .45 * vL.y));
  vec3 col = c * uFace * (.25 + .75 * vL.y) * (1. + heat)
           + mix(c, uHot, top * heat) * edge * uEdge * (.35 + .65 * vL.y + top * .6)
           + mix(uWarm, uHot, heat) * top * (.08 + .5 * heat) * uFace * 4.;
  // falling: the column's edges burn a little hotter; once down, the footprint cools from ember to ash
  col += uHot * edge * uEdge * .5 * vFall * (1. - vFall);
  // the charge: as the wave reaches a pillar its edges and cap flash white-hot for a few frames
  col += uHot * (edge * .9 + top * .8 + .04) * vKick * uKick;                // the blast front: a hot red ring
  if (vRub >= 0.) col = uEmber * (edge * .45 + .015) * (.25 + .75 * exp(-vRub * 2.2)) + c * edge * uEdge * .08;
  o = vec4(col * uGain * exp(-vDist * uFog), 1.);
}`;
var City = class {
	constructor() {
		const box = new BoxGeometry(1, 1, 1).translate(0, .5, 0);
		const g = new InstancedBufferGeometry();
		g.index = box.index;
		g.setAttribute("position", box.getAttribute("position"));
		const N = PILLARS.length, P = new Float32Array(N * 4), H = new Float32Array(N);
		PILLARS.forEach((p, k) => {
			P.set([
				p.x,
				p.z,
				p.base,
				p.band
			], k * 4);
			H[k] = p.h;
		});
		g.setAttribute("aP", new InstancedBufferAttribute(P, 4));
		g.setAttribute("aH", new InstancedBufferAttribute(H, 1));
		g.instanceCount = N;
		this.spec = new Float32Array(16 * CITY.hist);
		this.tex = new DataTexture(this.spec, 16, CITY.hist, RedFormat, FloatType);
		this.tex.minFilter = this.tex.magFilter = NearestFilter;
		this.tex.needsUpdate = true;
		this.material = shaderMaterial({
			vertex: VERT,
			fragment: FRAG,
			transparent: true,
			depthWrite: false,
			blending: 2,
			side: 2,
			uniforms: {
				uSpec: { value: this.tex },
				uT: { value: 0 },
				uExeT: { value: 0 },
				uWave: { value: CITY.wave },
				uG: { value: CITY.g },
				uW0: { value: CITY.w0 },
				uSpeed: { value: CITY.speed },
				uFoot: { value: CITY.foot },
				uDt: { value: CITY.dt },
				uGain: { value: 1 },
				uEdge: { value: 1 },
				uFace: { value: .06 },
				uFog: { value: .018 },
				uKick: { value: 2.5 },
				uCold: v3u(),
				uWarm: v3u(),
				uHot: v3u(),
				uEmber: v3u()
			}
		});
		this.mesh = new Mesh(g, this.material);
		this.mesh.frustumCulled = false;
		this.fkey = null;
		this.dust = new ProcPoints({
			count: 65536,
			uniforms: {
				uPil: { value: null },
				uExeT: { value: 0 },
				uWave: { value: CITY.wave },
				uG: { value: CITY.g },
				uDustCol: v3u(),
				uAshCol: v3u()
			},
			glsl: `
uniform sampler2D uPil; uniform float uExeT, uWave, uG; uniform vec3 uDustCol, uAshCol;
void particle(float i, out vec3 pos, out vec3 col, out float sz) {
  float k = mod(i, 1600.);
  vec4 P = texelFetch(uPil, ivec2(int(mod(k, 40.)), int(floor(k / 40.))), 0);   // x, z, base, hash
  sz = .6 + .8 * hash11(i * 1.9);
  if (P.z <= 0.) { col = vec3(0.); pos = vec3(0.); return; }
  float tc = uExeT + length(P.xy) / uWave + P.w * .05 + hash11(i * .37) * .25;
  float tau = uT - tc;
  if (tau <= 0.) { col = vec3(0.); pos = vec3(0.); return; }
  vec3 h = hash31(i * .713 + 3.1);
  // an implosion: the column is crushed at its footing, so the dust leaves low and rolls outward, rising a little
  float y0 = .02 + .25 * h.x * h.x;
  float a = h.y * 6.2832, sp = .35 + 1.1 * h.z;
  vec3 v = vec3(cos(a) * sp, .15 + .55 * hash11(i * 2.7), sin(a) * sp);
  float drag = 2.2, e = (1. - exp(-drag * tau)) / drag;               // velocity decays: x(τ) = v (1 − e^−kτ) / k
  pos = vec3(P.x, 0., P.y) + vec3(v.x * e, y0 + v.y * e - .12 * tau * tau, v.z * e);
  pos.y = max(pos.y, .004);
  float heat = exp(-tau * 1.8);
  col = mix(uAshCol, uDustCol, heat) * (tau < .08 ? tau / .08 : 1.);
}`
		});
		const pd = /* @__PURE__ */ new Float32Array(6400);
		PILLARS.forEach((p, k) => pd.set([
			p.x,
			p.z,
			p.base,
			p.h
		], k * 4));
		this.pilTex = new DataTexture(pd, 40, 40, RGBAFormat, FloatType);
		this.pilTex.minFilter = this.pilTex.magFilter = NearestFilter;
		this.pilTex.needsUpdate = true;
		this.dust.u.uPil.value = this.pilTex;
	}
	/** Per frame: t, F (features), exeT (the demolition starts), pal { cold, warm, hot, ember }, gain, face, edge, fog. */
	update(o) {
		const u = this.material.uniforms;
		if (this.fkey !== o.t) {
			const b = /* @__PURE__ */ new Float32Array(16);
			for (let m = 0; m < CITY.hist; m++) {
				o.F.bands(o.t - m * CITY.dt, b);
				this.spec.set(b, m * 16);
			}
			this.tex.needsUpdate = true;
			this.fkey = o.t;
		}
		u.uT.value = o.t;
		u.uExeT.value = o.exeT ?? 0;
		u.uGain.value = o.gain ?? 1;
		u.uEdge.value = o.edge ?? 1;
		u.uFace.value = o.face ?? .06;
		u.uFog.value = o.fog ?? .018;
		u.uKick.value = o.kick ?? 2.5;
		u.uCold.value.set(...o.pal.cold);
		u.uWarm.value.set(...o.pal.warm);
		u.uHot.value.set(...o.pal.hot);
		u.uEmber.value.set(...o.pal.ember);
		this.mesh.visible = true;
	}
	/** Dust particles (after update): o = { t, exeT, size, bright, dust, ash, focus, aperture, maxBlur }. */
	setDust(o, cam, H) {
		this.dust.set({
			t: o.t,
			size: o.size ?? .012,
			bright: o.bright ?? .5,
			minPx: o.minPx ?? 1.2,
			focus: o.focus,
			aperture: o.aperture ?? 0,
			maxBlur: o.maxBlur ?? 20,
			u: {
				uExeT: o.exeT,
				uDustCol: o.dust,
				uAshCol: o.ash
			}
		}, cam, H);
		return this.dust.points;
	}
};
/** Number of pillars still standing at time t (their column has not fully dropped), for the HUD. */
function standing(t, exeT) {
	if (t < exeT) return PILLARS.filter((p) => p.base > 0).length;
	let n = 0;
	for (const p of PILLARS) if (p.base > 0 && t < exeT + collapseAt(p) + fallTime(p.base * .9, spin0(p))) n++;
	return n;
}
//#endregion
export { CITY, CITY_R, City, PILLARS, collapseAt, fallTime, spin0, standing };
