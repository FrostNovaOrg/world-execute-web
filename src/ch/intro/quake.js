import { BoxGeometry, BufferAttribute, BufferGeometry, Color, MathUtils, Mesh, Points, Vector3, Vector4 } from "../../../vendor/three/build/three.core.js?v=q9f7JKE-";
import { shaderMaterial } from "../../engine/gpu.js?v=o4BYX3o1";
import { dofPolyline, dofSegment, mul } from "./kit.js?v=rUxrOt9G";
import { front, grainAlpha, grainAt, grains } from "./landing.js?v=B09chHQT";
//#region src/ch/intro/quake.js
var N_RING = 6;
var v4s = () => Array.from({ length: N_RING }, () => new Vector4());
var DOT_VERT = `
uniform float uSide, uPitch, uY, uSize, uMinPx, uFocal, uBright, uSparkle, uT, uFocus, uAperture, uMaxBlur, uOrtho, uClip, uSwell, uGain;
uniform vec3 uCol;
uniform vec4 uRing[${N_RING}], uRingW[${N_RING}];   // per front: x, z, radius, crest height; width, ripples
uniform vec3 uRingC[${N_RING}];                     // per front: the colour it lights the dots in (its piece's element)
out vec3 vCol; out float vBlur;
void main() {
  float i = float(gl_VertexID), h0 = (uSide - 1.) * .5 * uPitch;
  vec3 p = vec3(mod(i, uSide) * uPitch - h0, uY, floor(i / uSide) * uPitch - h0);
  float lift = 0., glow = 0.; vec3 gcol = vec3(0.);
  for (int j = 0; j < ${N_RING}; j++) {
    float d = distance(p.xz, uRing[j].xy) - uRing[j].z, u = d / max(uRingW[j].x, 1e-3);
    float crest = exp(-u * u), trough = -.35 * exp(-(u + 1.7) * (u + 1.7));
    float rip = d < 0. ? uRingW[j].y * .5 * cos(u * 2.2) * exp(u / 3.5) : 0.;    // rings that follow the front (water)
    lift += uRing[j].w * (crest + trough + rip);
    float gj = uRing[j].w * (crest + abs(rip) * .7);
    glow += gj; gcol += uRingC[j] * gj;
  }
  vec3 fc = glow > 1e-7 ? gcol / glow : uCol;                                  // the light of the fronts here
  float inside = step(max(abs(p.x), abs(p.z)), uClip);                         // the shield keeps the shock in
  p.y += lift * inside;
  float g = min(glow * inside / .03, 2.5);
  vec4 mv = modelViewMatrix * vec4(p, 1.);
  gl_Position = projectionMatrix * mv;
  float dist = max(-mv.z, 1e-3), persp = uOrtho > .5 ? 1. : 1. / dist;
  float px = uSize * uFocal * persp * (1. + uSwell * g);
  float core = max(px, uMinPx);
  float blur = uAperture > 0. ? min(uAperture * abs(dist - uFocus) * persp * uFocal, uMaxBlur) : 0.;
  float sz = core + blur;
  float energy = min(1., (px * px) / (uMinPx * uMinPx)) * (core * core) / (sz * sz);
  gl_PointSize = sz;
  vBlur = blur / sz;
  float tw = 1. + uSparkle * (hash11(i + floor(uT * 12.) * 7.13) - .5) * 2.;
  vCol = uBright * energy * (.55 + .9 * hash11(i * 1.31)) * max(tw, 0.) * (uCol + uGain * g * fc);
}`;
var DOT_FRAG = `
in vec3 vCol; in float vBlur; out vec4 o;
void main() {
  float r = length(gl_PointCoord - .5) * 2.;
  float gauss = exp(-r * r * 4.) * (1. - smoothstep(.8, 1., r));
  float disc = (1. - smoothstep(.86, 1., r)) * (.7 + .3 * smoothstep(.55, .95, r)) * .42;
  o = vec4(vCol * mix(gauss, disc, smoothstep(0., .6, vBlur)), 1.);
}`;
/**
* The via grid (pitch .1, side × side dots centred on the origin, the intro's own lattice: same order, so each dot
* keeps its brightness), drawn with the shock. set(p, cam, H): p = { bright, size, minPx, color, sparkle, t, focus,
* aperture, maxBlur, clip (half size of the square the shock moves), swell, gain, fronts: [{ x, z, r, amp, w, ripples,
* col (the colour the front lights the dots in; default: the dots' own) }] }.
*/
function floorDots({ side = 128, pitch = .1, y = .001 } = {}) {
	const geo = new BufferGeometry();
	geo.setAttribute("position", new BufferAttribute(new Float32Array(side * side * 3), 3));
	const mat = shaderMaterial({
		vertex: DOT_VERT,
		fragment: DOT_FRAG,
		transparent: true,
		depthWrite: false,
		depthTest: true,
		blending: 2,
		uniforms: {
			uSide: { value: side },
			uPitch: { value: pitch },
			uY: { value: y },
			uSize: { value: .01 },
			uMinPx: { value: 1.2 },
			uFocal: { value: 1e3 },
			uBright: { value: .5 },
			uSparkle: { value: .12 },
			uT: { value: 0 },
			uFocus: { value: 5 },
			uAperture: { value: 0 },
			uMaxBlur: { value: 30 },
			uOrtho: { value: 0 },
			uClip: { value: 1.5 },
			uSwell: { value: .6 },
			uGain: { value: 2.2 },
			uCol: { value: new Vector3(.62, .67, .76) },
			uRing: { value: v4s() },
			uRingW: { value: v4s() },
			uRingC: { value: Array.from({ length: N_RING }, () => new Vector3()) }
		}
	});
	const points = new Points(geo, mat);
	points.frustumCulled = false;
	points.visible = false;
	points.userData.set = (p, cam, H) => {
		const u = mat.uniforms;
		u.uBright.value = p.bright ?? .5;
		u.uSize.value = p.size ?? .01;
		u.uMinPx.value = (p.minPx ?? 1.2) * H / 1080;
		u.uCol.value.fromArray(p.color ?? [
			.62,
			.67,
			.76
		]);
		u.uSparkle.value = p.sparkle ?? .12;
		u.uT.value = p.t ?? 0;
		u.uFocus.value = p.focus ?? 5;
		u.uAperture.value = p.aperture ?? 0;
		u.uMaxBlur.value = (p.maxBlur ?? 30) * H / 1080;
		u.uClip.value = p.clip ?? 1.5;
		u.uSwell.value = p.swell ?? .6;
		u.uGain.value = p.gain ?? 2.2;
		setFronts(u.uRing.value, u.uRingW.value, p.fronts);
		u.uRingC.value.forEach((c, j) => c.fromArray(p.fronts?.[j]?.col ?? p.color ?? [
			.62,
			.67,
			.76
		]));
		u.uOrtho.value = cam.isOrthographicCamera ? 1 : 0;
		u.uFocal.value = cam.isPerspectiveCamera ? H / 2 / Math.tan(MathUtils.degToRad(cam.fov) / 2) : H * cam.zoom / (cam.top - cam.bottom);
		points.visible = true;
	};
	return points;
}
/** Write up to six fronts ({ x, z, r, amp, w, ripples }) into a pair of vec4 uniform arrays (the rest cleared). */
function setFronts(A, W, fronts = []) {
	for (let j = 0; j < N_RING; j++) {
		const f = fronts[j];
		if (f) {
			A[j].set(f.x, f.z, f.r, f.amp);
			W[j].set(f.w, f.ripples ?? 0, 0, 0);
		} else {
			A[j].set(0, 0, 0, 0);
			W[j].set(1, 0, 0, 0);
		}
	}
}
var SH_VERT = `
out vec3 vW; out vec3 vN;
void main() { vec4 w = modelMatrix * vec4(position, 1.); vW = w.xyz; vN = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * viewMatrix * w; }`;
var SH_FRAG = `
uniform vec3 uCol, uC; uniform float uIntensity, uCell, uH, uFres, uPush, uFlare;
uniform vec4 uImp[${N_RING}], uImpW[${N_RING}];      // per impact: centre (world), front radius; strength, width
uniform vec3 uImpC[${N_RING}];                       // per impact: the colour its flare takes (its piece's element)
in vec3 vW; in vec3 vN; out vec4 o;
float hexD(vec2 p) { p = abs(p); return max(dot(p, vec2(.5, .8660254)), p.x); }
void main() {
  vec3 n = abs(vN), P = vW - uC;
  bool top = n.y > .5;
  vec2 uv = n.x > .5 ? P.zy : (top ? P.xz : P.xy);
  float band = 0.; vec2 push = vec2(0.); vec3 bcol = vec3(0.);
  for (int j = 0; j < ${N_RING}; j++) {
    vec3 D = vW - uImp[j].xyz;
    float u = (length(D) - uImp[j].w) / max(uImpW[j].y, 1e-3), b = uImpW[j].x * exp(-u * u);
    vec2 dir = n.x > .5 ? D.zy : (top ? D.xz : D.xy);
    band += b; bcol += uImpC[j] * b; push += dir / max(length(dir), 1e-4) * b * u;
  }
  vec3 fc = band > 1e-7 ? bcol / band : uCol;
  vec2 q = (uv - push * uPush) / uCell;
  const vec2 r = vec2(1., 1.7320508);
  vec2 a = mod(q, r) - r * .5, b2 = mod(q - r * .5, r) - r * .5, g = dot(a, a) < dot(b2, b2) ? a : b2;
  float e = .5 - hexD(g), fw = fwidth(e);
  float line = 1. - smoothstep(0., fw * 1.25, e);
  float dens = max(fwidth(q.x), fwidth(q.y));
  line *= 1. - smoothstep(.1, .3, dens);
  vec3 V = normalize(cameraPosition - vW);
  float fres = pow(1. - abs(dot(V, normalize(vN))), 2.);
  float base = line * (.35 + uFres * fres), flare = base * uFlare * band + band * .012 * uFlare;
  o = vec4((uCol * base + fc * flare) * uIntensity, 1.);
}`;
/** The sandbox's open-bottom box of shield (4 walls + lid, as intro/sandbox.js shieldMesh) with the shock. */
function shieldRipple({ S = 1.5, H = 3, cell = .24 } = {}) {
	const g = new BoxGeometry(2 * S, H, 2 * S);
	g.translate(0, H / 2, 0);
	const idx = g.index.array, keep = [];
	for (const grp of g.groups) if (grp.materialIndex !== 3) for (let i = grp.start; i < grp.start + grp.count; i++) keep.push(idx[i]);
	g.setIndex(keep);
	g.clearGroups();
	const mesh = new Mesh(g, shaderMaterial({
		vertex: SH_VERT,
		fragment: SH_FRAG,
		transparent: true,
		depthWrite: false,
		depthTest: true,
		blending: 2,
		side: 2,
		uniforms: {
			uCol: { value: new Color(.72, .8, .95) },
			uC: { value: new Vector3() },
			uIntensity: { value: .35 },
			uCell: { value: cell },
			uH: { value: H },
			uFres: { value: 1 },
			uPush: { value: .05 },
			uFlare: { value: 5 },
			uImp: { value: v4s() },
			uImpW: { value: v4s() },
			uImpC: { value: Array.from({ length: N_RING }, () => new Vector3()) }
		}
	}));
	mesh.frustumCulled = false;
	mesh.visible = false;
	/** p: { intensity, color, fres, push, flare, impacts: [{ x, y, z, r, k (strength), w, col (its flare's colour) }] } */
	mesh.userData.set = (p = {}) => {
		const u = mesh.material.uniforms;
		u.uIntensity.value = p.intensity ?? .35;
		if (p.color) u.uCol.value.setRGB(...p.color);
		u.uFres.value = p.fres ?? 1;
		u.uPush.value = p.push ?? .05;
		u.uFlare.value = p.flare ?? 5;
		for (let j = 0; j < N_RING; j++) {
			const m = p.impacts?.[j];
			if (m) {
				u.uImp.value[j].set(m.x, m.y ?? 0, m.z, m.r);
				u.uImpW.value[j].set(m.k, m.w, 0, 0);
			} else {
				u.uImp.value[j].set(0, -99, 0, 0);
				u.uImpW.value[j].set(0, 1, 0, 0);
			}
			u.uImpC.value[j].fromArray(m?.col ?? u.uCol.value.toArray());
		}
		mesh.visible = (p.intensity ?? .35) > 0;
	};
	return mesh;
}
/** A ring on the floor around (x, z) of radius r, kept inside the square |x|, |z| < clip (the walls stop it). */
function ringPoints(x, z, r, clip = 1.5, n = 180) {
	const pts = [], inside = (p) => Math.abs(p[0]) < clip && Math.abs(p[2]) < clip;
	for (let i = 0; i < n; i++) {
		const a = i / n * Math.PI * 2;
		pts.push([
			x + Math.cos(a) * r,
			.004,
			z + Math.sin(a) * r
		]);
	}
	const out0 = pts.findIndex((p) => !inside(p));
	if (out0 < 0) return [[...pts, pts[0]]];
	const runs = [];
	let run = [];
	for (let k = 1; k <= n; k++) {
		const p = pts[(out0 + k) % n];
		if (inside(p)) run.push(p);
		else if (run.length) {
			runs.push(run);
			run = [];
		}
	}
	if (run.length) runs.push(run);
	return runs.filter((r) => r.length > 1);
}
/**
* The front of an impact at (x, z), s seconds after it, as rings of light: the crest, and a fainter one behind it.
* o: { color, bright, width, clip, dof, ring (front() options), ripples }
*/
function drawFront(L, x, z, s, o = {}) {
	const f = front(s, o.ring);
	if (!f) return null;
	const k = f.amp / (o.ring?.amp ?? .03), col = o.color ?? [
		.92,
		.95,
		1
	];
	for (const run of ringPoints(x, z, f.r, o.clip ?? 1.5)) dofPolyline(L, run, {
		color: mul(col, (o.bright ?? 1.6) * k),
		width: (o.width ?? 2.2) * (1 + .6 * k)
	}, o.dof);
	for (let q = 1; q <= (o.ripples ?? 0); q++) {
		const rr = f.r - q * f.w * 2.9;
		if (rr > .17) for (const run of ringPoints(x, z, rr, o.clip ?? 1.5)) dofPolyline(L, run, {
			color: mul(col, (o.bright ?? 1.6) * k * .55 / q),
			width: 1.6
		}, o.dof);
	}
	return f;
}
/**
* The dust of impact `seed` at (x, z), s seconds after it: each grain a short streak from where it was a moment ago.
* p: the IMPACT entry (intro/landing.js); o: { color, bright, dof, rim, back (true: the film runs backwards, the
* grains converge on the piece, so the streak trails the other way) }.
*/
var GRAINS = /* @__PURE__ */ new Map();
function drawDust(L, x, z, s, seed, p, o = {}) {
	if (s <= 0) return;
	const key = `${seed}:${p.dust}:${o.rim ?? .2}`;
	if (!GRAINS.has(key)) GRAINS.set(key, grains(seed, p, o.rim ?? .2));
	const gs = GRAINS.get(key);
	const col = o.color ?? [
		.9,
		.93,
		1
	], dt = .011 * p.streak * (o.back ? -1 : 1);
	for (const g of gs) {
		const a = grainAlpha(g, s);
		if (a <= .01) continue;
		const q = grainAt(g, s, p), q0 = grainAt(g, Math.max(0, s - dt), p);
		dofSegment(L, [
			x + q0[0],
			q0[1],
			z + q0[2]
		], [
			x + q[0],
			q[1],
			z + q[2]
		], {
			color: mul(col, a * p.bright * (o.bright ?? 1)),
			width: (o.width ?? 2.4) * g.size
		}, o.dof);
	}
}
//#endregion
export { drawDust, drawFront, floorDots, ringPoints, setFronts, shieldRipple };
