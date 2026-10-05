import { rng } from "../../engine/math.js?v=BJIlRm7-";
import { BufferAttribute, BufferGeometry, ClampToEdgeWrapping, Data3DTexture, Group, HalfFloatType, LinearFilter, LinearMipmapLinearFilter, MathUtils, Matrix4, Points, RGBAFormat, RedFormat, RepeatWrapping, Scene, UnsignedByteType, Vector3, WebGLRenderTarget } from "../../../vendor/three/build/three.core.js?v=q9f7JKE-";
import { dataTexture, fsMaterial, shaderMaterial } from "../../engine/gpu.js?v=o4BYX3o1";
import { BULGE_PS, COT, GAL, OMEGA_P, starTables } from "./galaxy-model.js?v=CZR9RU_6";
//#region src/ch/title/galaxy.js
var f = (x) => {
	const s = (+x).toPrecision(9);
	return /[.e]/.test(s) ? s : s + ".";
};
var MODEL = `
const float COT = ${f(COT)}, RIN = ${f(GAL.rIn)}, ROUT = ${f(GAL.rOut)}, RMAX = ${f(GAL.rMax)}, E0 = ${f(GAL.e0)}, TH0 = ${f(GAL.th0)};
const float HR = ${f(GAL.hR)}, V0 = ${f(GAL.v0)}, RC = ${f(GAL.rc)}, OMP = ${f(OMEGA_P)};
float g_ecc(float a) { return E0 * smoothstep(RIN * .6, RIN * 1.5, a) * (1. - smoothstep(ROUT, RMAX, a)); }
float g_theta(float a) { return TH0 - COT * log(max(a, 1e-3) / RIN); }
float g_omega(float r) { return V0 / sqrt(r * r + RC * RC); }
float g_armPhase(float r, float phi) { return 2. * (phi - g_theta(r)) + 2. * COT * g_ecc(r) - atan(2. * COT, r / HR); }
float g_armLight(float r, float side) { float l = log(max(r, .05)); return .5 + .3 * sin(2.6 * l + 1.7 * side + .4) + .2 * sin(5.3 * l + 2.9 * side + 1.1); }
`;
var MAPN = 2048;
var MAPL = 7.4;
var MAP = `${MODEL}
const float HRY = ${f(GAL.hRy)}, HRD = ${f(GAL.hRd)}, DY = ${f(GAL.dYoung)}, KY = ${f(GAL.kYoung)}, DD = ${f(GAL.dDust)}, KD = ${f(GAL.kDust)};
uniform float uL;
in vec2 vUv; out vec4 o;
void main() {
  vec2 p = (vUv * 2. - 1.) * uL;
  float r = max(length(p), 1e-3), phi = atan(p.y, p.x), psi = g_armPhase(r, phi), lr = log(r);
  float edge = 1. - smoothstep(RMAX - 1.6, RMAX + .3, r);
  // old disc: exponential, with the arms that the turning orbits crowd (1 + A cos Ψ)
  float old = exp(-r / HR) * (1. + g_ecc(r) * length(vec2(r / HR, 2. * COT)) * cos(psi)) * edge;
  // young light: just downstream of the ridge, gathered into star-forming complexes
  float n1 = fbm(vec3(p * 2.1, 4.2)), n2 = fbm(vec3(p * 6.3, 9.1));
  float arm = exp(KY * (cos(psi - DY) - 1.)), side = smoothstep(-.3, .3, cos(.5 * psi));
  float lit = mix(g_armLight(r, 1.), g_armLight(r, 0.), side);
  float young = exp(-r / HRY) * smoothstep(RIN * .75, RIN * 1.3, r) * edge * (arm * lit * (.2 + 1.1 * smoothstep(-.3, .65, n1 + .55 * n2)) + .03 * (.7 + .3 * n1));
  // dust: thin lanes on the concave side of each arm, broken into clumps along their length; feathers leave them
  // downstream at a steep pitch; small mottling between the arms
  // (the lane's width and darkness change along it; here and there it forks into a fainter second lane)
  float wv = fbm(vec3(p * 1.1, 6.6)), lane = exp(KD * (.7 + .6 * smoothstep(-.4, .4, wv)) * (cos(psi + DD) - 1.));
  lane += .45 * smoothstep(.1, .5, fbm(vec3(p * 1.4, 3.9))) * exp(KD * 1.6 * (cos(psi + DD + .5) - 1.));
  float brk = .12 + .88 * smoothstep(-.45, .35, fbm(vec3(p * 1.7, 1.3)) + .35 * snoise(vec3(p * 6.5, 3.3)));
  float down = mod(psi + DD, TAU);                                   // how far downstream of the lane
  float wf = phi + 1.7 * lr;                                         // feathers: a pitch of about 30°
  float fe = pow(max(1. - abs(snoise(vec3(cos(wf) * 5., sin(wf) * 5., lr * 2.2 + 7.))), 0.), 10.) * exp(-down / .55) * smoothstep(.0, .2, down) * smoothstep(1.8, 2.8, r);
  float mott = pow(max(1. - abs(snoise(vec3(p * 9., 5.1))), 0.), 10.) * smoothstep(-.2, .6, fbm(vec3(p * 1.3, 8.8)));
  // (and diffuse dust everywhere, which makes the midplane opaque edge-on; more of it towards the bulge). The feathers and the mottling weigh .635
  // and .336: they were .45 and .3 on the noise before Framesong's, whose ridges are rarer (1.41 and 1.12 bring them back)
  float diffuse = .22 * (.75 + .25 * smoothstep(-.4, .4, fbm(vec3(p * .9, 2.2))));
  float dust = exp(-r / HRD) * smoothstep(.12, .45, r) * edge * (1. + .5 * exp(-r / .6)) * (lane * 1.3 * brk + .635 * fe * brk + .336 * mott + diffuse);
  // the dust layer's local thickness: clouds stand higher or lie flatter (an edge-on lane gets ragged edges)
  float hf = .5 + 1.1 * smoothstep(-.5, .5, fbm(vec3(p * 2.9, 12.4)));
  o = vec4(dust, young, old, hf);
}`;
var GLOW = `${MODEL}
const float HZ = ${f(GAL.hz)}, HZY = ${f(GAL.hzy)}, HZD = ${f(GAL.hzd)};
const float BRE = ${f(GAL.bulge.re)}, BQ = ${f(GAL.bulge.q)}, BP = ${f(BULGE_PS.p)}, BB = ${f(BULGE_PS.b)}, BN = ${f(GAL.bulge.n)};
uniform mat4 uCamWorld, uProjInv, uModelInv;
uniform sampler2D uMap; uniform float uMapL, uTexel, uMaxLod, uPixAng, uPat;
uniform highp sampler3D uRag;
uniform float uKappa, uDust, uGain, uIOld, uIYoung, uIBulge;
uniform vec3 uKr, uCOld, uCYoung, uCBulge;
uniform float uRevR, uRevW, uRevF;
in vec2 vUv; out vec4 o;
// the ignition (Galaxy.draw o.reveal): lit inside radius uRevR, a soft front uRevW wide that flares by uRevF as it passes
float reveal(float R) { float d = (R - uRevR) / uRevW; return (1. - smoothstep(-.5, .5, d)) + uRevF * exp(-d * d * 4.); }
void main() {
  vec4 n = uProjInv * vec4(vUv * 2. - 1., -1., 1.); n /= n.w;
  vec3 ro = (uModelInv * vec4(uCamWorld[3].xyz, 1.)).xyz;
  vec3 rd = normalize(mat3(uModelInv) * (mat3(uCamWorld) * n.xyz));
  // the volume: the slab |y| < YB inside the cylinder r < RB
  const float YB = 2.6, RB = RMAX + .3;
  float t0 = 0., t1 = 1e4;
  if (abs(rd.y) > 1e-7) { float a = (-YB - ro.y) / rd.y, b = (YB - ro.y) / rd.y; t0 = max(t0, min(a, b)); t1 = min(t1, max(a, b)); }
  else if (abs(ro.y) > YB) { o = vec4(0.); return; }
  float A = dot(rd.xz, rd.xz), B = dot(ro.xz, rd.xz), C = dot(ro.xz, ro.xz) - RB * RB;
  if (A > 1e-9) { float D = B * B - A * C; if (D <= 0.) { o = vec4(0.); return; } float s = sqrt(D); t0 = max(t0, (-B - s) / A); t1 = min(t1, (-B + s) / A); }
  else if (C > 0.) { o = vec4(0.); return; }
  if (t1 <= t0) { o = vec4(0.); return; }
  float cp = cos(uPat), sp = sin(uPat), ary = abs(rd.y);
  float jit = hash12(gl_FragCoord.xy);
  vec3 L = vec3(0.), Tr = vec3(1.);
  float t = t0;
  for (int i = 0; i < 240; i++) {
    if (t >= t1) break;
    vec3 p = ro + rd * t;
    float dy = ary > 1e-6 ? .3 * (abs(p.y) + .02) / ary : 1e3;
    float dt = clamp(min(min(dy, .2 * (length(p) + .012)), .06 + .011 * t), .0012, .5);
    dt = min(dt, t1 - t);
    vec3 q = ro + rd * (t + dt * jit);
    vec2 pp = vec2(cp * q.x + sp * q.z, -sp * q.x + cp * q.z);
    vec4 m = textureLod(uMap, pp / uMapL * .5 + .5, clamp(log2(max(uPixAng * t, 1e-6) / uTexel), 0., uMaxLod));
    float ay = abs(q.y);
    float mb = length(vec3(q.x, q.y / BQ, q.z)) / BRE;
    float bulge = pow(mb + .008, -BP) * exp(-BB * pow(mb, 1. / BN));
    vec3 em = uCOld * (uIOld * m.b * exp(-ay / HZ) / (2. * HZ)) + uCYoung * (uIYoung * m.g * exp(-ay / HZY) / (2. * HZY)) + uCBulge * (uIBulge * bulge);
    em *= reveal(length(q.xz));
    float hd = HZD * m.a, rho = m.r * exp(-ay / hd) / (2. * hd);
    // (above and below the midplane the dust is ragged in 3D, so an edge-on lane does not stand in vertical stripes)
    if (rho > .02 && ay > .25 * hd) rho *= mix(1., .3 + 1.4 * smoothstep(.3, .7, textureLod(uRag, vec3(pp * .45, q.y * .8), 0.).r), smoothstep(.25 * hd, 1.5 * hd, ay));
    vec3 sig = uKr * (uKappa * uDust * rho);
    vec3 tau = sig * dt, ex = exp(-tau);
    L += Tr * em * mix(vec3(dt), (1. - ex) / max(sig, vec3(1e-8)), step(vec3(1e-4), tau));
    Tr *= ex;
    t += dt;
    if (max(Tr.r, max(Tr.g, Tr.b)) < .003) break;
  }
  o = vec4(L * uGain, 1.);
}`;
var STAR_VERT = `${MODEL}
const float HZD = ${f(GAL.hzd)};
uniform sampler2D uA, uOrb, uLook, uMap;
uniform float uS, uHasA, uMorph, uSpread, uArc, uSwirl, uNoise, uNoiseFreq, uNoiseSpeed, uT, uTG;
uniform float uFocal, uMinPx, uCorePx, uGain, uFade, uHaloAt, uDMin, uLocal, uKnot, uRes2;
uniform float uGSize, uGBright, uGMinPx, uGSparkle;
uniform vec3 uGCol;
uniform vec3 uCamL; uniform float uMapL, uPat, uKappa, uDust;
uniform vec3 uKr;
uniform vec3 uCB0, uCB1, uCO0, uCO1, uCY0, uCY1, uCK;
uniform float uFocus, uAperture, uMaxBlur;
uniform float uRevR, uRevW, uRevF;
uniform float uOrdX0, uOrdX1, uOrdW;
out vec3 vCol; out float vBlur, vRc, vHalo;
float reveal(float R) { float d = (R - uRevR) / uRevW; return (1. - smoothstep(-.5, .5, d)) + uRevF * exp(-d * d * 4.); }
vec3 galaxyPos(vec4 o) {
  float a = o.x;
  if (o.w > .5) { float ang = o.y + (o.w > 1.5 ? g_omega(a) : OMP) * uTG; return vec3(a * cos(ang), o.z, a * sin(ang)); }
  float e = g_ecc(a), psi = o.y + (g_omega(a) - OMP) * uTG;
  vec2 q = vec2(a * cos(psi), a * (1. - 2. * e) * sin(psi));
  float th = g_theta(a) + OMP * uTG, c = cos(th), s = sin(th);
  return vec3(c * q.x - s * q.y, o.z, s * q.x + c * q.y);
}
vec2 dustAt(vec2 xz) {   // the dust's surface density and its layer's local thickness factor
  float c = cos(uPat), s = sin(uPat);
  return textureLod(uMap, vec2(c * xz.x + s * xz.y, -s * xz.x + c * xz.y) / uMapL * .5 + .5, 2.5).ra;
}
float lapG(float y, float h) { return .5 * sign(y) * (1. - exp(-abs(y) / h)); }
// optical depth of the dust from the camera to P (galaxy units): the segment's part inside the dust layer, in six
// pieces, each with the exact integral of the layer's vertical profile and the lane density at its middle
float tauTo(vec3 P) {
  vec3 A = uCamL, D = P - A;
  float Y = 11. * HZD, sa = 0., sb = 1.;
  if (abs(D.y) > 1e-6) { float s0 = (-Y - A.y) / D.y, s1 = (Y - A.y) / D.y; sa = max(0., min(s0, s1)); sb = min(1., max(s0, s1)); }
  else if (abs(A.y) > Y) return 0.;
  if (sb <= sa) return 0.;
  float len = length(D), tau = 0.;
  for (int k = 0; k < 6; k++) {
    float u0 = mix(sa, sb, float(k) / 6.), u1 = mix(sa, sb, float(k + 1) / 6.);
    float y0 = A.y + D.y * u0, y1 = A.y + D.y * u1, dy = y1 - y0;
    vec2 d = dustAt(A.xz + D.xz * (.5 * (u0 + u1)));
    float h = HZD * d.y, z = abs(dy) > 1e-4 * h ? (lapG(y1, h) - lapG(y0, h)) / dy : exp(-abs(.5 * (y0 + y1)) / h) / (2. * h);
    tau += d.x * z * (u1 - u0) * len;
  }
  return tau * uKappa;
}
void main() {
  float i = float(gl_VertexID);
  vec2 uv = (vec2(mod(i, uS), floor(i / uS)) + .5) / uS;
  vec4 orb = texture(uOrb, uv), lk = texture(uLook, uv);
  vec3 G = galaxyPos(orb), p = G;
  float k = 1.;
  if (uHasA > .5) {
    vec4 a = texture(uA, uv);
    if (a.w > 2.) { gl_PointSize = 0.; gl_Position = vec4(2., 2., 2., 1.); vCol = vec3(0.); vBlur = vRc = vHalo = 0.; return; }
    // (the stagger: random, or in order along the line from x = uOrdX1 back to uOrdX0, a fuse from the cursor)
    float h = mix(hash11(i * .754877 + 3.1), clamp((uOrdX1 - a.x) / (uOrdX1 - uOrdX0), 0., 1.), uOrdW), d = h * uSpread;
    k = smoothstep(d, d + max(1. - uSpread, 1e-3), uMorph);
    // the star comes in along a spiral that unwinds as it settles
    float sw = uSwirl * (1. - k), cs = cos(sw), sn = sin(sw);
    p = mix(a.xyz, vec3(cs * G.x - sn * G.z, G.y, sn * G.x + cs * G.z), k);
    p += (hash31(i * 1.618) - .5) * sin(k * PI) * uArc;
  }
  if (uNoise > 0.) p += curlNoise(p * uNoiseFreq + vec3(0., 0., uT * uNoiseSpeed)) * uNoise;
  vec4 mv = modelViewMatrix * vec4(p, 1.);
  gl_Position = projectionMatrix * mv;
  float dist = max(-mv.z, 1e-3), dl = length(mv.xyz) / uLocal;
  float blur = uAperture > 0. ? min(uAperture * abs(dist - uFocus) / dist * uFocal, uMaxBlur) : 0.;
  // ---- the star: colour by population, flux from luminosity and distance, extinction by the dust in front of it
  float kind = lk.y;
  vec3 col = kind < .5 ? mix(uCB0, uCB1, lk.z) : kind < 1.5 ? mix(uCO0, uCO1, lk.z) : kind < 2.5 ? mix(uCY0, uCY1, lk.z) : uCK;
  vec3 ext = uDust > 0. ? exp(-uKr * (tauTo(G) * uDust)) : vec3(1.);
  vec3 sCol; float sSize, rc = 1., halo = 0.;
  if (kind > 2.5) {
    // an HII knot: a small cloud, its surface brightness the same at any distance
    float px = lk.w * uFocal / dist, sz = max(px, uMinPx);
    sCol = col * uKnot * lk.x * min(1., px * px / (uMinPx * uMinPx)) * ext;
    sSize = sz + blur; sCol *= sz * sz / (sSize * sSize);
  } else {
    float flux = uGain * lk.x / max(dl * dl, uDMin * uDMin);
    halo = clamp(log2(flux / uHaloAt) / 5., 0., 1.);                 // the brightest: a soft glint
    float core = max(uCorePx, uMinPx), sz = core * (1. + 2. * halo);
    rc = core / sz;
    // (flux is light in design pixels²: a frame of more pixels gives the star as much of its light)
    sCol = col * flux * uRes2 / (.19635 * core * core + .00916 * halo * sz * sz) * ext;
    sSize = sz + blur; sCol *= sz * sz / (sSize * sSize);
  }
  sCol *= uFade * smoothstep(.12, .45, dl) * reveal(length(G.xz));
  // ---- the typed line's point, as the published swarm drew it (engine/swarm.js), until it settles
  vec3 gCol = vec3(0.); float gSize = 0.;
  if (uHasA > .5 && k < 1.) {
    float px = uGSize * uFocal / dist, core = max(px, uGMinPx);
    gSize = core + blur;
    float energy = min(1., px * px / (uGMinPx * uGMinPx)) * core * core / (gSize * gSize);
    float tw = 1. + uGSparkle * (hash11(i + floor(uT * 12.) * 7.13) - .5) * 2.;
    gCol = uGCol * uGBright * energy * (.55 + .9 * hash11(i * 1.31)) * max(tw, 0.);
  }
  gl_PointSize = mix(gSize, sSize, k);
  vCol = mix(gCol, sCol, k);
  vBlur = blur / max(gl_PointSize, 1e-3);
  vRc = mix(1., rc, k); vHalo = halo * k;
  if (max(vCol.r, max(vCol.g, vCol.b)) < 1e-5) { gl_PointSize = 0.; gl_Position = vec4(2., 2., 2., 1.); }
}`;
var STAR_FRAG = `
in vec3 vCol; in float vBlur, vRc, vHalo; out vec4 o;
void main() {
  float r = length(gl_PointCoord - .5) * 2., q = r / vRc;
  float g = (exp(-q * q * 4.) + vHalo * .035 * exp(-r * r * 3.)) * (1. - smoothstep(.8, 1., r));
  float disc = (1. - smoothstep(.86, 1., r)) * (.7 + .3 * smoothstep(.55, .95, r)) * .42;   // lens bokeh, as the swarm's
  o = vec4(vCol * mix(g, disc, smoothstep(0., .6, vBlur)), 1.);
}`;
/**
* Linear colours, as a spiral is in a true-colour photograph (the fourth round: the third was grey and white): a
* golden bulge and a warm old disc inside, the arms blue with young stars, their star-forming knots pink with
* hydrogen-alpha, the dust lanes brown where they are thin.
*/
var GALAXY_COL = Object.freeze({
	bulge: [[
		1,
		.7,
		.42
	], [
		1,
		.82,
		.6
	]],
	old: [[
		1,
		.9,
		.78
	], [
		.87,
		.91,
		1
	]],
	young: [[
		.36,
		.55,
		1
	], [
		.55,
		.74,
		1
	]],
	knot: [
		1,
		.32,
		.6
	],
	glowOld: [
		1,
		.88,
		.74
	],
	glowYoung: [
		.3,
		.5,
		1
	],
	glowBulge: [
		1,
		.72,
		.46
	],
	ext: [
		.85,
		1,
		1.15
	]
});
var v3 = (c) => new Vector3(...c);
/**
* A small tileable 3D noise (64³, values 0..1): random voxels blurred twice, so one trilinear fetch gives the dust above
* and below the midplane its ragged 3D texture (a simplex noise there cost a third of the frame).
*/
function ragTexture(n = 64, seed = 77) {
	const r = rng(seed), N = n * n * n, idx = (x, y, z) => (z + n) % n * n * n + (y + n) % n * n + (x + n) % n;
	let a = Float32Array.from({ length: N }, () => r()), b = new Float32Array(N);
	for (let pass = 0; pass < 2; pass++) for (const [dx, dy, dz] of [
		[
			1,
			0,
			0
		],
		[
			0,
			1,
			0
		],
		[
			0,
			0,
			1
		]
	]) {
		for (let z = 0; z < n; z++) for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) b[idx(x, y, z)] = (a[idx(x - dx, y - dy, z - dz)] + a[idx(x, y, z)] + a[idx(x + dx, y + dy, z + dz)]) / 3;
		[a, b] = [b, a];
	}
	let lo = Infinity, hi = -Infinity;
	for (const v of a) {
		lo = Math.min(lo, v);
		hi = Math.max(hi, v);
	}
	const tex = new Data3DTexture(Uint8Array.from(a, (v) => Math.round((v - lo) / (hi - lo) * 255)), n, n, n);
	tex.format = RedFormat;
	tex.type = UnsignedByteType;
	tex.minFilter = tex.magFilter = LinearFilter;
	tex.wrapS = tex.wrapT = tex.wrapR = RepeatWrapping;
	tex.unpackAlignment = 1;
	tex.needsUpdate = true;
	return tex;
}
var Stars = class {
	/** N stars with tables { orb, look }; a: the typed line's points they explode from (a shape texture), or none. */
	constructor(N, tab, a = null) {
		this.N = N;
		const S = Math.sqrt(N);
		const geo = new BufferGeometry();
		geo.setAttribute("position", new BufferAttribute(new Float32Array(N * 3), 3));
		const orb = dataTexture(tab.orb, S, S), look = dataTexture(tab.look, S, S);
		this.material = shaderMaterial({
			vertex: STAR_VERT,
			fragment: STAR_FRAG,
			transparent: true,
			depthWrite: false,
			depthTest: false,
			blending: 2,
			uniforms: {
				uA: { value: a ?? orb },
				uOrb: { value: orb },
				uLook: { value: look },
				uMap: { value: null },
				uS: { value: S },
				uHasA: { value: a ? 1 : 0 },
				uMorph: { value: 1 },
				uSpread: { value: .55 },
				uArc: { value: 0 },
				uSwirl: { value: 0 },
				uNoise: { value: 0 },
				uNoiseFreq: { value: .6 },
				uNoiseSpeed: { value: .2 },
				uT: { value: 0 },
				uTG: { value: 0 },
				uFocal: { value: 1e3 },
				uMinPx: { value: 2 },
				uCorePx: { value: 2 },
				uGain: { value: 1 },
				uFade: { value: 1 },
				uHaloAt: { value: 1 },
				uDMin: { value: 1.5 },
				uLocal: { value: 1 },
				uKnot: { value: .3 },
				uRes2: { value: 1 },
				uGSize: { value: .0065 },
				uGBright: { value: .42 },
				uGMinPx: { value: 1.1 },
				uGSparkle: { value: .3 },
				uGCol: { value: new Vector3(1, 1, 1) },
				uCamL: { value: new Vector3() },
				uMapL: { value: MAPL },
				uPat: { value: 0 },
				uKappa: { value: 1 },
				uDust: { value: 1 },
				uKr: { value: v3(GALAXY_COL.ext) },
				uCB0: { value: v3(GALAXY_COL.bulge[0]) },
				uCB1: { value: v3(GALAXY_COL.bulge[1]) },
				uCO0: { value: v3(GALAXY_COL.old[0]) },
				uCO1: { value: v3(GALAXY_COL.old[1]) },
				uCY0: { value: v3(GALAXY_COL.young[0]) },
				uCY1: { value: v3(GALAXY_COL.young[1]) },
				uCK: { value: v3(GALAXY_COL.knot) },
				uFocus: { value: 5 },
				uAperture: { value: 0 },
				uMaxBlur: { value: 60 },
				uRevR: { value: 1e4 },
				uRevW: { value: 1 },
				uRevF: { value: 0 },
				uOrdX0: { value: 0 },
				uOrdX1: { value: 1 },
				uOrdW: { value: 0 }
			}
		});
		this.points = new Points(geo, this.material);
		this.points.frustumCulled = false;
	}
};
/**
* The galaxy. glyphs: the typed line's swarms that explode into it, [{ a: shape texture (w > 2: an empty slot), n, col,
* skip(i) }]; count: the field's stars (a square; galaxy-model.js starTables), knots: how many of them are HII knots.
*/
var Galaxy = class {
	constructor({ glyphs = [], count = 1 << 18, knots = 240 } = {}) {
		this.scene = new Scene();
		this.root = new Group();
		this.scene.add(this.root);
		this.fieldTab = starTables(count, {
			seed: 101,
			knots
		});
		this.field = new Stars(count, this.fieldTab);
		this.glyphs = glyphs.map((g, i) => Object.assign(new Stars(g.n, starTables(g.n, {
			seed: 201 + i,
			mix: {
				bulge: .12,
				old: .3,
				young: .58
			},
			lum: [.3, 1],
			skip: g.skip
		}), g.a), { col: g.col }));
		for (const s of [this.field, ...this.glyphs]) this.root.add(s.points);
		this.mapMat = fsMaterial(MAP, { uL: { value: MAPL } });
		this.glowMat = fsMaterial(GLOW, {
			uCamWorld: { value: new Matrix4() },
			uProjInv: { value: new Matrix4() },
			uModelInv: { value: new Matrix4() },
			uMap: { value: null },
			uMapL: { value: MAPL },
			uTexel: { value: 2 * MAPL / MAPN },
			uMaxLod: { value: Math.log2(MAPN) - 2 },
			uPixAng: { value: .001 },
			uPat: { value: 0 },
			uKappa: { value: 1 },
			uDust: { value: 1 },
			uGain: { value: 1 },
			uIOld: { value: 1 },
			uIYoung: { value: 1 },
			uIBulge: { value: 1 },
			uRag: { value: ragTexture() },
			uKr: { value: v3(GALAXY_COL.ext) },
			uCOld: { value: v3(GALAXY_COL.glowOld) },
			uCYoung: { value: v3(GALAXY_COL.glowYoung) },
			uCBulge: { value: v3(GALAXY_COL.glowBulge) },
			uRevR: { value: 1e4 },
			uRevW: { value: 1 },
			uRevF: { value: 0 }
		}, {
			blending: 2,
			transparent: true
		});
		this.map = null;
		this._inv = new Matrix4();
		this._cam = new Vector3();
	}
	/** The maps, drawn once (the first time the galaxy is drawn). */
	ensureMap(ctx) {
		if (this.map) return;
		const r = ctx.renderer, prev = r.getRenderTarget();
		this.map = new WebGLRenderTarget(MAPN, MAPN, {
			type: HalfFloatType,
			format: RGBAFormat,
			depthBuffer: false,
			generateMipmaps: true,
			colorSpace: "",
			minFilter: LinearMipmapLinearFilter,
			magFilter: LinearFilter,
			wrapS: ClampToEdgeWrapping,
			wrapT: ClampToEdgeWrapping
		});
		ctx.fsq.render(r, this.mapMat, this.map);
		r.setRenderTarget(prev);
	}
	/**
	* Draw the galaxy through `cam` into the shot's target. o:
	*   tg           galaxy time (s since the explosion): the stars' orbits and the pattern's turn
	*   rotY, scale  the galaxy's transform (the gather turns and scales it as the swarm it becomes)
	*   glow, dust, field   the diffuse light, the dust's absorption, the field stars (0..1 each)
	*   gain         brightness of everything (stars and glow); stars: of the stars alone
	*   line         the typed line's points: { morph, spread, arc, swirl, noise, noiseFreq, t, size, bright, sparkle, fade,
	*                order: { x0, x1, w } (w: how much the stagger follows x, from x1 back to x0, instead of chance) }
	*   dof          { focus, aperture, maxBlur (design px) }: the stars' lens
	*   levels, starLevels   overrides of GLOW_LEVEL and STAR_LEVEL
	*   reveal       { r, w, flash }: the ignition, light only inside radius r (galaxy units) with a soft front w wide
	*                that flares by `flash` as it passes; none by default
	*/
	draw(ctx, cam, o = {}) {
		this.ensureMap(ctx);
		const H = ctx.H, tg = o.tg ?? 0, pat = OMEGA_P * tg, gain = o.gain ?? 1, dust = o.dust ?? 1;
		const rev = (u) => {
			u.uRevR.value = o.reveal?.r ?? 1e4;
			u.uRevW.value = o.reveal?.w ?? 1;
			u.uRevF.value = o.reveal?.flash ?? 0;
		};
		this.root.rotation.set(0, o.rotY ?? 0, 0);
		this.root.scale.setScalar(o.scale ?? 1);
		this.root.updateMatrixWorld(true);
		const inv = this._inv.copy(this.root.matrixWorld).invert(), camL = this._cam.setFromMatrixPosition(cam.matrixWorld).applyMatrix4(inv);
		const glow = (o.glow ?? 1) * gain, lv = {
			...GLOW_LEVEL,
			...o.levels
		}, sl = {
			...STAR_LEVEL,
			...o.starLevels
		};
		if (glow > 0) {
			const u = this.glowMat.uniforms;
			u.uCamWorld.value.copy(cam.matrixWorld);
			u.uProjInv.value.copy(cam.projectionMatrixInverse);
			u.uModelInv.value.copy(inv);
			u.uMap.value = this.map.texture;
			u.uPat.value = pat;
			u.uPixAng.value = 2 * Math.tan(MathUtils.degToRad(cam.fov ?? 40) / 2) / H;
			u.uKappa.value = lv.kappa;
			u.uDust.value = dust;
			u.uGain.value = glow * lv.gain;
			u.uIOld.value = lv.old;
			u.uIYoung.value = lv.young;
			u.uIBulge.value = lv.bulge;
			rev(u);
			ctx.pass(this.glowMat);
		}
		const focal = H / 2 / Math.tan(MathUtils.degToRad(cam.fov ?? 40) / 2), dof = o.dof, sc = o.scale ?? 1, L = o.line;
		const set = (s, fade, line) => {
			const u = s.material.uniforms;
			s.points.visible = fade > 0;
			if (fade <= 0) return;
			u.uMap.value = this.map.texture;
			u.uTG.value = tg;
			u.uPat.value = pat;
			u.uCamL.value.copy(camL);
			u.uLocal.value = sc;
			u.uKappa.value = lv.kappa;
			u.uDust.value = dust;
			u.uFocal.value = focal;
			u.uMinPx.value = 2.4;
			u.uCorePx.value = 4 * H / 2160;
			u.uGain.value = sl.gain * gain * (o.stars ?? 1);
			u.uRes2.value = (H / 1080) ** 2;
			u.uHaloAt.value = sl.haloAt;
			u.uKnot.value = sl.knot * gain;
			u.uFade.value = fade;
			u.uFocus.value = dof?.focus ?? 5;
			u.uAperture.value = dof?.aperture ?? 0;
			u.uMaxBlur.value = (dof?.maxBlur ?? 60) * H / 1080;
			u.uMorph.value = line?.morph ?? 1;
			u.uSpread.value = line?.spread ?? .55;
			u.uArc.value = line?.arc ?? 0;
			u.uSwirl.value = line?.swirl ?? 0;
			u.uNoise.value = line?.noise ?? 0;
			u.uNoiseFreq.value = line?.noiseFreq ?? .6;
			u.uT.value = line?.t ?? 0;
			u.uGSize.value = line?.size ?? .0065;
			u.uGBright.value = line?.bright ?? .42;
			u.uGMinPx.value = 1.1 * H / 1080;
			u.uGSparkle.value = line?.sparkle ?? .3;
			u.uOrdX0.value = line?.order?.x0 ?? 0;
			u.uOrdX1.value = line?.order?.x1 ?? 1;
			u.uOrdW.value = line?.order?.w ?? 0;
			if (s.col) u.uGCol.value.set(...s.col);
			rev(u);
		};
		set(this.field, o.field ?? 1, null);
		for (const s of this.glyphs) set(s, L ? L.fade ?? 1 : 0, L);
		ctx.draw(this.scene, cam);
	}
};
/** Levels (tuned by eye against the film's grade: AgX, bloom threshold ≈ .9). */
var GLOW_LEVEL = Object.freeze({
	gain: 1,
	old: .26,
	young: 2.4,
	bulge: 13,
	kappa: 9.5
});
var STAR_LEVEL = Object.freeze({
	gain: 1.4,
	haloAt: 1.5,
	knot: 1.5
});
//#endregion
export { GALAXY_COL, GLOW_LEVEL, Galaxy, STAR_LEVEL };
