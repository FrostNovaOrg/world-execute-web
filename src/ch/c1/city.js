import { clamp, hash2 } from "../../engine/math.js?v=BJIlRm7-";
import { BoxGeometry, DataTexture, FloatType, InstancedBufferAttribute, InstancedBufferGeometry, Mesh, NearestFilter, RedFormat, Vector3 } from "../../../vendor/three/build/three.core.js?v=q9f7JKE-";
import { shaderMaterial } from "../../engine/gpu.js?v=o4BYX3o1";
//#region src/ch/c1/city.js
var CITY = {
	n: 40,
	sp: .26,
	foot: .17,
	hist: 64,
	dt: 1 / 30,
	speed: 3.2
};
var CITY_R = CITY.n / 2 * CITY.sp;
var VERT = `
in vec4 aP;                       // x, z, base height, band
in float aH;                      // hash
uniform sampler2D uSpec; uniform float uT, uRise, uRiseT, uSpeed, uGain, uFoot, uCollapse, uDt;
out vec3 vL; out vec3 vSize; out float vE, vH, vHash, vDist;
float spec(float band, float lag) {                                   // band energy lag seconds ago (linear in time)
  float m = clamp(lag / uDt, 0., 62.), i = floor(m);
  float a = texelFetch(uSpec, ivec2(int(band), int(i)), 0).r, b = texelFetch(uSpec, ivec2(int(band), int(i) + 1), 0).r;
  return mix(a, b, m - i);
}
void main() {
  float r = length(aP.xy), lag = r / uSpeed;
  float e = spec(aP.w, lag);
  float rise = uRise > 0. ? clamp((uT - uRiseT - lag * .55) / .32, 0., 1.) : 1.;
  rise = 1. - pow(1. - rise, 3.);
  float h = max(.02, aP.z * (.3 + 1.25 * e)) * rise * (1. - uCollapse * (.4 + .6 * aH));
  vec3 p = position;                                                  // unit box, y in [0, 1]
  vec3 w = vec3(aP.x + p.x * uFoot, p.y * h, aP.y + p.z * uFoot);
  vL = p; vSize = vec3(uFoot, h, uFoot); vE = e * rise; vH = h; vHash = aH;
  vec4 mv = modelViewMatrix * vec4(w, 1.); vDist = -mv.z;
  gl_Position = projectionMatrix * mv;
}`;
var FRAG = `
uniform vec3 uCold, uWarm, uHot; uniform float uGain, uEdge, uFace;
in vec3 vL; in vec3 vSize; in float vE, vH, vHash, vDist; out vec4 o;
void main() {
  if (vH < .021) discard;
  // distance to the nearest box edge on this face, in world units, then in pixels
  vec3 q = vec3((.5 - abs(vL.x)) * vSize.x, min(vL.y, 1. - vL.y) * vSize.y, (.5 - abs(vL.z)) * vSize.z);
  float onSide = step(abs(abs(vL.x) - .5), 1e-3) + step(abs(abs(vL.z) - .5), 1e-3);
  float d = onSide > .5 ? min(abs(vL.x) > .499 ? q.z : q.x, q.y) : min(q.x, q.z);
  float px = fwidth(d);
  float edge = 1. - smoothstep(.0, px * 1.4, d);
  float top = step(.999, vL.y);
  float heat = clamp(vE * 1.2, 0., 1.);
  vec3 c = mix(uCold, uWarm, smoothstep(.45, 1., heat) * (.55 + .45 * vL.y));
  vec3 col = c * uFace * (.25 + .75 * vL.y) * (1. + heat)                   // faint translucent faces, brighter up high
           + mix(c, uHot, top * heat) * edge * uEdge * (.35 + .65 * vL.y + top * .6)
           + mix(uWarm, uHot, heat) * top * (.08 + .5 * heat) * uFace * 4.;
  o = vec4(col * uGain * exp(-vDist * .018), 1.);
}`;
var City = class {
	constructor() {
		const box = new BoxGeometry(1, 1, 1).translate(0, .5, 0);
		const g = new InstancedBufferGeometry();
		g.index = box.index;
		g.setAttribute("position", box.getAttribute("position"));
		const N = CITY.n * CITY.n, P = new Float32Array(N * 4), H = new Float32Array(N);
		let k = 0;
		for (let i = 0; i < CITY.n; i++) for (let j = 0; j < CITY.n; j++) {
			const x = (i - (CITY.n - 1) / 2) * CITY.sp, z = (j - (CITY.n - 1) / 2) * CITY.sp, r = Math.hypot(x, z) / CITY_R;
			const h1 = hash2(i, j + 1e3), h2 = hash2(i, j + 2e3), h3 = hash2(i, j + 3e3);
			const base = (.25 + 2.3 * h1 ** 2.2) * Math.exp(-r * r * 1.6) + .06;
			const band = Math.min(15, Math.floor(clamp(r * .9 + (h2 - .5) * .5) * 16));
			P.set([
				x,
				z,
				r > 1.02 ? 0 : base,
				band
			], k * 4);
			H[k] = h3;
			k++;
		}
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
				uRise: { value: 0 },
				uRiseT: { value: 0 },
				uSpeed: { value: CITY.speed },
				uGain: { value: 1 },
				uFoot: { value: CITY.foot },
				uCollapse: { value: 0 },
				uDt: { value: CITY.dt },
				uEdge: { value: 1 },
				uFace: { value: .06 },
				uCold: { value: new Vector3() },
				uWarm: { value: new Vector3() },
				uHot: { value: new Vector3() }
			}
		});
		this.mesh = new Mesh(g, this.material);
		this.mesh.frustumCulled = false;
	}
	/** Per frame: t, F (features), riseT (EXECUTION time; pillars grow from 0 as the wave passes), collapse (c3), gain, pal. */
	update(o) {
		const u = this.material.uniforms, b = /* @__PURE__ */ new Float32Array(16);
		for (let m = 0; m < CITY.hist; m++) {
			o.F.bands(o.t - m * CITY.dt, b);
			this.spec.set(b, m * 16);
		}
		this.tex.needsUpdate = true;
		u.uT.value = o.t;
		u.uRise.value = o.riseT != null ? 1 : 0;
		u.uRiseT.value = o.riseT ?? 0;
		u.uGain.value = o.gain ?? 1;
		u.uCollapse.value = o.collapse ?? 0;
		u.uEdge.value = o.edge ?? 1;
		u.uFace.value = o.face ?? .06;
		u.uCold.value.set(...o.pal.cold);
		u.uWarm.value.set(...o.pal.warm);
		u.uHot.value.set(...o.pal.hot);
		this.mesh.visible = true;
	}
};
//#endregion
export { CITY, CITY_R, City };
