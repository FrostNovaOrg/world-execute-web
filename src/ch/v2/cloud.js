import { BufferAttribute, BufferGeometry, MathUtils, Points, Vector2, Vector3, Vector4 } from "../../../vendor/three/build/three.core.js?v=q9f7JKE-";
import { dataTexture, shaderMaterial } from "../../engine/gpu.js?v=o4BYX3o1";
import { alloc, put } from "./shapeset.js?v=Bbzza00z";
//#region src/ch/v2/cloud.js
var SHAPES = /* @__PURE__ */ new Map();
/** Cached shape textures for `count` particles: gen(count) → { pos, col, nrm? } Float32Arrays of count * 4. */
function cloudShape(key, count, gen) {
	const k = `${key}@${count}`;
	if (!SHAPES.has(k)) {
		const S = Math.sqrt(count), d = gen(count);
		for (const f of ["pos", "col"]) if (d[f]?.length !== count * 4) throw new Error(`cloud shape '${key}': ${f} holds ${d[f]?.length / 4} points, expected ${count}`);
		const nrm = d.nrm ?? new Float32Array(count * 4);
		SHAPES.set(k, {
			key,
			pos: dataTexture(d.pos, S, S),
			col: dataTexture(d.col, S, S),
			nrm: dataTexture(nrm, S, S),
			data: {
				...d,
				nrm
			}
		});
	}
	return SHAPES.get(k);
}
var VERT = `
uniform sampler2D uA, uB, uCA, uCB, uNA, uNB;
uniform float uS, uMorph, uSpread, uArc, uReveal, uRevealW, uNoise, uNoiseFreq, uNoiseSpeed, uT, uWave;
uniform vec3 uWaveOrigin;
uniform float uSize, uMinPx, uFocal, uBright, uSparkle, uFocus, uAperture, uMaxBlur, uOrtho, uVar;
uniform vec2 uVp;
uniform vec3 uTint; uniform float uFlat;
uniform vec3 uLight; uniform float uShade, uRim;
uniform vec4 uCut; uniform float uCutMode, uCutSoft, uCutGlow, uCutDim; uniform vec3 uCutCol;
uniform vec4 uVib; uniform vec3 uVibAxis;
uniform vec3 uBend;          // curvature κ, bend centre x, z re-centring offset
uniform vec4 uSpin[4];       // per class: axis xyz, angle w
uniform float uSpinA;
uniform vec4 uPsiA, uPsiD, uPsiK; uniform float uPsiV, uPsiOn;
uniform vec4 uGlow[3], uGlowP[3];
out vec3 vCol; out float vBlur, vCore; out vec2 vStreak;

vec3 rotAxis(vec3 p, vec3 ax, float a) { float c = cos(a), s = sin(a); return p * c + cross(ax, p) * s + ax * dot(ax, p) * (1. - c); }
// Bend about the vertical axis x = xc, z = 1/κ: arc length along x is preserved (the spine keeps its length).
vec3 bend(vec3 p, float kap, float xc, out float ang) {
  float dx = p.x - xc; ang = kap * dx;
  if (abs(kap) < 1e-5) return p;
  float s = sin(ang), c = cos(ang), h = sin(ang * .5);
  return vec3(xc + s / kap - p.z * s, p.y, 2. * h * h / kap + p.z * c);
}
void main() {
  float i = float(gl_VertexID);
  vec2 uv = (vec2(mod(i, uS), floor(i / uS)) + .5) / uS;
  vec4 a = texture(uA, uv), b = texture(uB, uv), ca = texture(uCA, uv), cb = texture(uCB, uv);
  vec3 na = texture(uNA, uv).xyz, nb = texture(uNB, uv).xyz;
  // shape A can be bent (an exact warp, so the cat curls up instead of morphing); z shifts the result back to centre
  float ang = 0.;
  if (uBend.x != 0.) { a.xyz = bend(a.xyz, uBend.x, uBend.y, ang); a.z -= uBend.z; na = rotAxis(na, vec3(0., 1., 0.), -ang); }
  // per-class spin (the halo's wheels) on shape B, or on shape A while it morphs away (uSpinA)
  if (uSpinA > .5) { int ca_ = int(ca.a + .5); if (ca_ >= 0 && ca_ < 4) { vec4 sp = uSpin[ca_]; if (sp.w != 0.) a.xyz = rotAxis(a.xyz, sp.xyz, sp.w); } }
  else { int cls = int(cb.a + .5); if (cls >= 0 && cls < 4) { vec4 sp = uSpin[cls]; if (sp.w != 0.) { b.xyz = rotAxis(b.xyz, sp.xyz, sp.w); nb = rotAxis(nb, sp.xyz, sp.w); } } }
  float h = hash11(i * .754877 + 3.1);
  float d = uWave > 0. ? clamp(length(a.xyz - uWaveOrigin) / uWave, 0., 1.) * uSpread : h * uSpread;
  float k = smoothstep(d, d + max(1. - uSpread, 1e-3), uMorph);
  vec3 p = mix(a.xyz, b.xyz, k);
  p += (hash31(i * 1.618) - .5) * sin(k * PI) * uArc;
  vec3 n = mix(na, nb, k); float nl = length(n); n = nl > 1e-4 ? n / nl : vec3(0.);
  vec3 col = mix(mix(ca.rgb, cb.rgb, k), vec3(1.), uFlat) * uTint;
  // vibration along the normal (volume points get a hashed direction); a travelling phase along uVibAxis
  vec3 vdir = nl > 1e-4 ? n : normalize(hash31(i * 3.7) - .5);
  float disp = uVib.x * sin(TAU * uVib.y * uT - uVib.z * dot(p, uVibAxis) + h * .8);
  p += vdir * disp * (1. - .75 * uVib.w);
  if (uNoise > 0.) p += curlNoise(p * uNoiseFreq + vec3(0., 0., uT * uNoiseSpeed)) * uNoise;
  if (uPsiOn > .5) {
    // amplitudes ∝ exp(−r²/4σ²) (density ∝ exp(−r²/2σ²)); the points were sampled from |ψa|² + |ψd|² at full dead amplitude
    float s2 = 4. * uPsiA.w * uPsiA.w, ga = exp(-dot(p - uPsiA.xyz, p - uPsiA.xyz) / s2), gd1 = exp(-dot(p - uPsiD.xyz, p - uPsiD.xyz) / s2), gd = uPsiD.w * gd1;
    float dens = ga * ga + gd * gd + 2. * uPsiV * ga * gd * cos(dot(uPsiK.xyz, p) + uPsiK.w);
    col *= max(dens, 0.) / max(ga * ga + gd1 * gd1, 1e-6);
  }
  for (int j = 0; j < 3; j++) if (uGlowP[j].y > 0.) { float d = length(p - uGlow[j].xyz); col *= 1. + uGlowP[j].y * exp(-pow((d - uGlow[j].w) / uGlowP[j].x, 2.)); }
  float vis = 1.;
  if (uCutMode > .5) {
    float side = dot(uCut.xyz, p) - uCut.w, g = exp(-side * side / (uCutSoft * uCutSoft));
    float away = 1. - smoothstep(-uCutSoft * .35, uCutSoft * .35, side);
    if (uCutMode < 1.5) vis = away;                          // cutaway: hide the positive side
    else if (uCutMode < 2.5) vis = mix(uCutDim, 1., g);      // CT slice: only the slab stays bright
    else vis = away * mix(uCutDim, 1., g);                    // slab: cut away, and dim what lies deeper
    col += uCutCol * g * uCutGlow;
  }
  vec4 mv = modelViewMatrix * vec4(p, 1.);
  gl_Position = projectionMatrix * mv;
  if (uShade > 0. && nl > 1e-4) {
    vec3 nv = normalize(normalMatrix * n);
    float lam = max(dot(nv, normalize(uLight)), 0.), rim = pow(1. - abs(nv.z), 2.);
    col *= mix(1., .28 + 1.05 * lam + uRim * rim, uShade);
  }
  float dist = max(-mv.z, 1e-3);
  float persp = uOrtho > .5 ? 1. : 1. / dist;
  float px = uSize * uFocal * persp;
  float key = uRevealW > .5 ? a.w : h;
  vis *= 1. - smoothstep(uReveal * 1.02 - .02, uReveal * 1.02, key);
  if (vis <= 0.) { gl_Position = vec4(0., 0., 2., 1.); gl_PointSize = 0.; vCol = vec3(0.); vBlur = 0.; vCore = 1.; vStreak = vec2(0.); return; }   // culled, not rasterised
  float core = max(px, uMinPx);
  float blur = uAperture > 0. ? min(uAperture * abs(dist - uFocus) * persp * uFocal, uMaxBlur) : 0.;
  // shutter streak: the full swing of the vibration, projected to pixels
  vec2 st = vec2(0.);
  if (uVib.w > 0. && uVib.x > 0.) {
    vec4 c1 = projectionMatrix * modelViewMatrix * vec4(p + vdir * uVib.x, 1.);
    st = (c1.xy / c1.w - gl_Position.xy / gl_Position.w) * .5 * uVp * uVib.w;
  }
  float sl = length(st), dot0 = core + blur, sz = dot0 + 2. * sl;
  gl_PointSize = sz;
  vCore = dot0 / sz;
  vStreak = st / sz * 2.;
  vBlur = blur / dot0;
  float energy = vis * min(1., (px * px) / (uMinPx * uMinPx)) * (core * core) / (dot0 * dot0) / (1. + 1.2 * sl / dot0);
  float tw = 1. + uSparkle * (hash11(i + floor(uT * 12.) * 7.13) - .5) * 2.;
  vCol = col * uBright * energy * (1. + uVar * (.9 * hash11(i * 1.31) - .45)) * max(tw, 0.);
}`;
var FRAG = `
in vec3 vCol; in float vBlur, vCore; in vec2 vStreak; out vec4 o;
void main() {
  vec2 q = gl_PointCoord * 2. - 1.; q.y = -q.y;
  float L2 = dot(vStreak, vStreak);
  vec2 dq = L2 > 1e-6 ? q - vStreak * clamp(dot(q, vStreak) / L2, -1., 1.) : q;
  float r = length(dq) / max(vCore, 1e-3);
  float gauss = exp(-r * r * 4.) * (1. - smoothstep(.8, 1., r));
  float disc = (1. - smoothstep(.86, 1., r)) * (.7 + .3 * smoothstep(.55, .95, r)) * .42;
  o = vec4(vCol * mix(gauss, disc, smoothstep(0., .6, vBlur)), 1.);
}`;
var v3 = (x = 0, y = 0, z = 0) => ({ value: new Vector3(x, y, z) });
var Cloud = class {
	constructor({ count = 1 << 18 } = {}) {
		this.N = count;
		this.S = Math.sqrt(count);
		if (!Number.isInteger(this.S)) throw new Error("Cloud count must be a perfect square");
		const geo = new BufferGeometry();
		geo.setAttribute("position", new BufferAttribute(new Float32Array(count * 3), 3));
		const f = (v) => ({ value: v });
		this.material = shaderMaterial({
			vertex: VERT,
			fragment: FRAG,
			transparent: true,
			depthWrite: false,
			depthTest: true,
			blending: 2,
			uniforms: {
				uA: f(null),
				uB: f(null),
				uCA: f(null),
				uCB: f(null),
				uNA: f(null),
				uNB: f(null),
				uS: f(this.S),
				uMorph: f(0),
				uSpread: f(.4),
				uArc: f(0),
				uReveal: f(1),
				uRevealW: f(0),
				uNoise: f(0),
				uNoiseFreq: f(1),
				uNoiseSpeed: f(.2),
				uT: f(0),
				uWave: f(0),
				uWaveOrigin: v3(),
				uSize: f(.01),
				uMinPx: f(1.4),
				uFocal: f(1e3),
				uBright: f(1),
				uSparkle: f(0),
				uFocus: f(5),
				uAperture: f(0),
				uMaxBlur: f(60),
				uOrtho: f(0),
				uVar: f(1),
				uVp: f(new Vector2(1920, 1080)),
				uTint: v3(1, 1, 1),
				uFlat: f(0),
				uLight: v3(.4, .6, .7),
				uShade: f(0),
				uRim: f(.6),
				uCut: f(new Vector4(0, 1, 0, 0)),
				uCutMode: f(0),
				uCutSoft: f(.02),
				uCutGlow: f(0),
				uCutDim: f(.1),
				uCutCol: v3(1, 1, 1),
				uVib: f(new Vector4()),
				uVibAxis: v3(1, 0, 0),
				uBend: v3(),
				uSpin: f([
					0,
					1,
					2,
					3
				].map(() => new Vector4())),
				uSpinA: f(0),
				uPsiA: f(new Vector4()),
				uPsiD: f(new Vector4()),
				uPsiK: f(new Vector4()),
				uPsiV: f(0),
				uPsiOn: f(0),
				uGlow: f([
					0,
					1,
					2
				].map(() => new Vector4())),
				uGlowP: f([
					0,
					1,
					2
				].map(() => new Vector4()))
			}
		});
		this.points = new Points(geo, this.material);
		this.points.frustumCulled = false;
	}
	shape(key, gen) {
		return cloudShape(key, this.N, gen);
	}
	/**
	* Per frame. a/b: shapes from shape(); morph/spread/arc/wave/waveOrigin/reveal/revealBy/noise…: as Swarm.
	* tint [r,g,b] multiplies the per-particle colours (flat: 1 = use tint only); shade 0..1 with light (view-space dir)
	* and rim; cut: { plane: [nx,ny,nz,d], mode: 'away' | 'slice' | 'slab', soft, glow, col, dim }; vib: { amp, hz, k, axis, streak };
	* bend: [κ, xc, fold]; spin: [[ax, ay, az, angle] × 4] for the classes of shape B.
	* psi: { a: [x,y,z], d: [x,y,z], sigma, dAmp (dead amplitude 0..1), k: [kx,ky,kz], phase, V (fringe visibility) };
	* glow: [{ o: [x,y,z], r (shell radius), w (width), amp }] (≤ 3).
	*/
	set(p, camera, H) {
		const u = this.material.uniforms, A = p.a, B = p.b ?? p.a;
		u.uA.value = A.pos;
		u.uB.value = B.pos;
		u.uCA.value = A.col;
		u.uCB.value = B.col;
		u.uNA.value = A.nrm;
		u.uNB.value = B.nrm;
		u.uMorph.value = p.morph ?? 0;
		u.uSpread.value = p.spread ?? .4;
		u.uArc.value = p.arc ?? 0;
		u.uReveal.value = p.reveal ?? 1;
		u.uRevealW.value = p.revealBy === "w" ? 1 : 0;
		u.uWave.value = p.wave ?? 0;
		if (p.waveOrigin) u.uWaveOrigin.value.set(...p.waveOrigin);
		u.uNoise.value = p.noise ?? 0;
		u.uNoiseFreq.value = p.noiseFreq ?? 1;
		u.uNoiseSpeed.value = p.noiseSpeed ?? .2;
		u.uT.value = p.t ?? 0;
		u.uSize.value = p.size ?? .01;
		u.uMinPx.value = (p.minPx ?? 1.4) * H / 1080;
		u.uBright.value = p.bright ?? 1;
		u.uSparkle.value = p.sparkle ?? 0;
		u.uVar.value = p.variance ?? 1;
		u.uFocus.value = p.focus ?? 5;
		u.uAperture.value = p.aperture ?? 0;
		u.uMaxBlur.value = (p.maxBlur ?? 70) * H / 1080;
		u.uTint.value.set(...p.tint ?? [
			1,
			1,
			1
		]);
		u.uFlat.value = p.flat ?? 0;
		u.uLight.value.set(...p.light ?? [
			.45,
			.6,
			.65
		]);
		u.uShade.value = p.shade ?? 0;
		u.uRim.value = p.rim ?? .6;
		const c = p.cut;
		u.uCutMode.value = c ? {
			away: 1,
			slice: 2,
			slab: 3
		}[c.mode ?? "away"] : 0;
		if (c) {
			u.uCut.value.set(...c.plane);
			u.uCutSoft.value = c.soft ?? .02;
			u.uCutGlow.value = c.glow ?? 0;
			u.uCutDim.value = c.dim ?? .1;
			u.uCutCol.value.set(...c.col ?? [
				1,
				1,
				1
			]);
		}
		const v = p.vib;
		u.uVib.value.set(v?.amp ?? 0, v?.hz ?? 0, v?.k ?? 0, v?.streak ?? 0);
		if (v?.axis) u.uVibAxis.value.set(...v.axis);
		u.uBend.value.set(...p.bend ?? [
			0,
			0,
			0
		]);
		for (let i = 0; i < 4; i++) u.uSpin.value[i].set(...p.spin?.[i] ?? [
			0,
			1,
			0,
			0
		]);
		u.uSpinA.value = p.spinA ? 1 : 0;
		const q = p.psi;
		u.uPsiOn.value = q ? 1 : 0;
		if (q) {
			u.uPsiA.value.set(...q.a, q.sigma);
			u.uPsiD.value.set(...q.d, q.dAmp ?? 1);
			u.uPsiK.value.set(...q.k, q.phase ?? 0);
			u.uPsiV.value = q.V ?? 1;
		}
		for (let j = 0; j < 3; j++) {
			const gl = p.glow?.[j];
			u.uGlowP.value[j].set(gl?.w ?? 1, gl ? gl.amp : 0, 0, 0);
			if (gl) u.uGlow.value[j].set(...gl.o, gl.r);
		}
		u.uOrtho.value = camera.isOrthographicCamera ? 1 : 0;
		const aspect = camera.isPerspectiveCamera ? camera.aspect : (camera.right - camera.left) / (camera.top - camera.bottom);
		u.uVp.value.set(H * aspect, H);
		u.uFocal.value = camera.isPerspectiveCamera ? H / 2 / Math.tan(MathUtils.degToRad(camera.fov) / 2) : H * camera.zoom / (camera.top - camera.bottom);
		return this;
	}
};
//#endregion
export { Cloud, alloc, cloudShape, put };
