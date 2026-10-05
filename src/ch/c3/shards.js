import { TAU, rng } from "../../engine/math.js?v=BJIlRm7-";
import { BufferAttribute, BufferGeometry, Color, MathUtils, Points } from "../../../vendor/three/build/three.core.js?v=q9f7JKE-";
import { dataTexture, shaderMaterial } from "../../engine/gpu.js?v=o4BYX3o1";
function clipHalf(P, m, n) {
	const out = [], f = (p) => (p[0] - m[0]) * n[0] + (p[1] - m[1]) * n[1];
	for (let i = 0; i < P.length; i++) {
		const a = P[i], b = P[(i + 1) % P.length], fa = f(a), fb = f(b);
		if (fa <= 0) out.push(a);
		if (fa <= 0 !== fb <= 0) {
			const k = fa / (fa - fb);
			out.push([a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k]);
		}
	}
	return out;
}
function clipConvex(S, C) {
	let P = S;
	for (let i = 0; i < C.length && P.length; i++) {
		const a = C[i], b = C[(i + 1) % C.length];
		P = clipHalf(P, a, [b[1] - a[1], -(b[0] - a[0])]);
	}
	return P;
}
var area = (P) => {
	let s = 0;
	for (let i = 0; i < P.length; i++) {
		const a = P[i], b = P[(i + 1) % P.length];
		s += a[0] * b[1] - b[0] * a[1];
	}
	return s / 2;
};
var centroid = (P) => {
	let cx = 0, cy = 0, A = 0;
	for (let i = 0; i < P.length; i++) {
		const a = P[i], b = P[(i + 1) % P.length], w = a[0] * b[1] - b[0] * a[1];
		A += w;
		cx += (a[0] + b[0]) * w;
		cy += (a[1] + b[1]) * w;
	}
	return A ? [cx / (3 * A), cy / (3 * A)] : P[0];
};
function voronoi(seeds) {
	return seeds.map((s, i) => {
		let P = [
			[-4, -4],
			[4, -4],
			[4, 4],
			[-4, 4]
		];
		seeds.forEach((q, j) => {
			if (j !== i) P = clipHalf(P, [(s[0] + q[0]) / 2, (s[1] + q[1]) / 2], [q[0] - s[0], q[1] - s[1]]);
		});
		return P;
	});
}
function spacedSeeds(n, r, box, accept, k = 24) {
	const out = [];
	while (out.length < n) {
		let best = null, bd = -1;
		for (let c = 0; c < k; c++) {
			const x = box[0] + r() * (box[2] - box[0]), y = box[1] + r() * (box[3] - box[1]);
			if (!accept(x, y)) {
				c--;
				continue;
			}
			let d = 1e9;
			for (const s of out) d = Math.min(d, (s[0] - x) ** 2 + (s[1] - y) ** 2);
			if (d > bd) {
				bd = d;
				best = [x, y];
			}
		}
		out.push(best);
	}
	return out;
}
var nearest = (seeds, x, y) => {
	let bi = 0, bd = 1e9;
	seeds.forEach((s, i) => {
		const d = (s[0] - x) ** 2 + (s[1] - y) ** 2;
		if (d < bd) {
			bd = d;
			bi = i;
		}
	});
	return bi;
};
/** The disc tessellation (the first draws of c2x's generator, so the seeds are c2x's). */
var GEO = (() => {
	const r = rng(907);
	const disc = Array.from({ length: 256 }, (_, i) => [Math.cos(i / 256 * TAU), Math.sin(i / 256 * TAU)]);
	const seeds = spacedSeeds(36, r, [
		-1,
		-1,
		1,
		1
	], (x, y) => x * x + y * y < .93 * .93);
	const cells = voronoi(seeds).map((P) => clipConvex(P, disc));
	const cent = cells.map(centroid), areas = cells.map(area);
	return {
		seeds,
		cells,
		cent,
		areas,
		total: areas.reduce((s, a) => s + a, 0)
	};
})();
function particleData() {
	const r = rng(4242), N = 147456, A = new Float32Array(N * 4);
	for (let i = 0; i < N; i++) {
		let rho;
		if (i % 9 === 0) rho = .93 + r() * .06;
		else do
			rho = Math.hypot(Math.sqrt(-2 * Math.log(Math.max(r(), 1e-6))) * .38 * Math.cos(TAU * r()), 0);
		while (rho > .985);
		const a = r() * TAU, x = rho * Math.cos(a), y = rho * Math.sin(a);
		A.set([
			x,
			y,
			0,
			nearest(GEO.seeds, x, y)
		], i * 4);
	}
	return A;
}
var VERT = `
uniform sampler2D uA, uCells;
uniform float uS, uNC, uSize, uFocal, uMinPx, uBright, uOrtho, uFocus, uAperture, uMaxBlur, uT, uHoles, uFloor;
uniform vec3 uColA, uColB, uEmber, uAsh;
out vec3 vCol; out float vBlur;
vec3 qrot(vec4 q, vec3 v) { return v + 2. * cross(q.xyz, cross(q.xyz, v) + q.w * v); }
vec4 cellTex(float c, float k) { return texture(uCells, vec2((k + .5) / 4., (c + .5) / uNC)); }
void main() {
  float i = float(gl_VertexID);
  vec2 uv = (vec2(mod(i, uS), floor(i / uS)) + .5) / uS;
  vec4 a = texture(uA, uv);
  float c = a.w, h = hash11(i * .7071 + 1.3);
  vec4 C0 = cellTex(c, 0.), C1 = cellTex(c, 1.), Q = cellTex(c, 2.), C3 = cellTex(c, 3.);
  // C0: seed.xy, centroid.xy; C1: translation.xyz, present; Q: rotation about the seed; C3: bright, burst, heat, scale
  vec3 rel = vec3((a.xy - C0.xy) * C3.w, 0.);
  vec3 p = qrot(Q, rel) + vec3(C0.xy, 0.) + C1.xyz;
  float burst = C3.y, fade = 1.;
  if (burst > 0.) {                                   // EXECUTION: the particles leave the centroid, with drag
    vec3 d = normalize(vec3(a.xy - C0.zw, 0.) * 2.5 + (hash31(i * 1.37) - .5) * vec3(1., 1., 2.2));
    float sp = .25 + .9 * hash11(i * 2.9);
    p += d * sp * (1. - exp(-burst * 3.2)) * .8 + vec3(0., -.5, 0.) * burst * burst;   // thrown out, then falling as ash
    fade = exp(-burst * (1.8 + 2.2 * hash11(i * 5.3))) * step(.35, hash11(i * 8.1));   // two thirds become embers, the rest go at once
  }
  p.y = max(p.y, uFloor + .003 * h);
  vec4 mv = modelViewMatrix * vec4(p, 1.);
  gl_Position = projectionMatrix * mv;
  float dist = max(-mv.z, 1e-3), persp = uOrtho > .5 ? 1. : 1. / dist;
  float px = uSize * uFocal * persp, core = max(px, uMinPx);
  float blur = uAperture > 0. ? min(uAperture * abs(dist - uFocus) * persp * uFocal, uMaxBlur) : 0.;
  float sz = core + blur;
  gl_PointSize = sz;
  vBlur = blur / sz;
  float vis = C1.w * step(uHoles, hash11(i * .913 + .37));
  float energy = vis * min(1., px * px / (uMinPx * uMinPx)) * core * core / (sz * sz);
  float rim = smoothstep(.9, .95, length(a.xy));
  vec3 base = mix(mix(uColA, uColB, hash11(i * 3.7) * .7), uColA * 1.15, rim);
  float heat = C3.z;                                  // 0 = you, 1 = ember, 2 = ash
  vec3 col = heat < 1. ? mix(base, uEmber, heat) : mix(uEmber, uAsh, heat - 1.);
  if (burst > 0.) col += vec3(1., .82, .7) * exp(-burst * 16.) * 1.6;   // each piece flashes as it is executed
  vCol = col * uBright * C3.x * fade * energy * (.55 + .9 * hash11(i * 1.31));
  if (vis <= 0. || C3.x * fade <= 1e-4) { gl_PointSize = 0.; gl_Position = vec4(2., 2., 2., 1.); }
}`;
var FRAG = `
in vec3 vCol; in float vBlur; out vec4 o;
void main() {
  float r = length(gl_PointCoord - .5) * 2.;
  float gauss = exp(-r * r * 4.) * (1. - smoothstep(.8, 1., r));
  float disc = (1. - smoothstep(.86, 1., r)) * (.7 + .3 * smoothstep(.55, .95, r)) * .42;
  o = vec4(vCol * mix(gauss, disc, smoothstep(0., .6, vBlur)), 1.);
}`;
/** The shard particles. Per frame: cells(fn) with each cell's transform, then set(o, cam, hPx). */
var Shards = class {
	constructor() {
		const A = particleData(), N = 147456;
		this.cellData = /* @__PURE__ */ new Float32Array(576);
		this.cellTex = dataTexture(this.cellData, 4, 36);
		const g = new BufferGeometry();
		g.setAttribute("position", new BufferAttribute(new Float32Array(N * 3), 3));
		const U = (names) => Object.fromEntries(names.map((k) => [k, { value: 0 }]));
		this.points = new Points(g, shaderMaterial({
			vertex: VERT,
			fragment: FRAG,
			transparent: true,
			depthWrite: false,
			blending: 2,
			uniforms: {
				uA: { value: dataTexture(A, 384, 384) },
				uCells: { value: this.cellTex },
				...U([
					"uS",
					"uNC",
					"uSize",
					"uFocal",
					"uMinPx",
					"uBright",
					"uOrtho",
					"uFocus",
					"uAperture",
					"uMaxBlur",
					"uT",
					"uHoles",
					"uFloor"
				]),
				uColA: { value: new Color() },
				uColB: { value: new Color() },
				uEmber: { value: new Color() },
				uAsh: { value: new Color() }
			}
		}));
		this.points.frustumCulled = false;
	}
	/** fn(i) → { t: [x,y,z], q: [x,y,z,w], present, bright, burst, heat, scale } for cell i. */
	cells(fn) {
		const d = this.cellData;
		for (let i = 0; i < 36; i++) {
			const c = fn(i), o = i * 16, s = GEO.seeds[i], ce = GEO.cent[i];
			d.set([
				s[0],
				s[1],
				ce[0],
				ce[1]
			], o);
			d.set([...c.t, c.present ?? 1], o + 4);
			d.set(c.q, o + 8);
			d.set([
				c.bright ?? 1,
				c.burst ?? 0,
				c.heat ?? 0,
				c.scale ?? 1
			], o + 12);
		}
		this.cellTex.needsUpdate = true;
		return this;
	}
	set(o, cam, hPx) {
		const u = this.points.material.uniforms;
		u.uS.value = 384;
		u.uNC.value = 36;
		u.uT.value = o.t ?? 0;
		u.uHoles.value = o.holes ?? 0;
		u.uFloor.value = o.floor ?? -1e3;
		u.uSize.value = o.size ?? .006;
		u.uMinPx.value = (o.minPx ?? 1.2) * hPx / 1080;
		u.uBright.value = o.bright ?? .3;
		u.uFocus.value = o.focus ?? 5;
		u.uAperture.value = o.aperture ?? 0;
		u.uMaxBlur.value = (o.maxBlur ?? 40) * hPx / 1080;
		u.uOrtho.value = cam.isOrthographicCamera ? 1 : 0;
		u.uFocal.value = cam.isPerspectiveCamera ? hPx / 2 / Math.tan(MathUtils.degToRad(cam.fov) / 2) : hPx * cam.zoom / (cam.top - cam.bottom);
		u.uColA.value.setRGB(...o.colA);
		u.uColB.value.setRGB(...o.colB);
		u.uEmber.value.setRGB(...o.ember);
		u.uAsh.value.setRGB(...o.ash);
		this.points.visible = true;
		return this;
	}
};
var qAxis = (ax, ang) => {
	const l = Math.hypot(...ax) || 1, s = Math.sin(ang / 2);
	return [
		ax[0] / l * s,
		ax[1] / l * s,
		ax[2] / l * s,
		Math.cos(ang / 2)
	];
};
var qMul = (a, b) => [
	a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1],
	a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0],
	a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3],
	a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2]
];
var qRot = (q, v) => {
	const [x, y, z, w] = q, c1 = [
		y * v[2] - z * v[1] + w * v[0],
		z * v[0] - x * v[2] + w * v[1],
		x * v[1] - y * v[0] + w * v[2]
	];
	return [
		v[0] + 2 * (y * c1[2] - z * c1[1]),
		v[1] + 2 * (z * c1[0] - x * c1[2]),
		v[2] + 2 * (x * c1[1] - y * c1[0])
	];
};
/** Spherical interpolation (shortest arc). */
function qSlerp(a, b, k) {
	let d = a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3], bb = b;
	if (d < 0) {
		d = -d;
		bb = b.map((v) => -v);
	}
	if (d > .9995) {
		const q = a.map((v, i) => v + (bb[i] - v) * k), l = Math.hypot(...q);
		return q.map((v) => v / l);
	}
	const th = Math.acos(d), s = Math.sin(th), wa = Math.sin((1 - k) * th) / s, wb = Math.sin(k * th) / s;
	return a.map((v, i) => v * wa + bb[i] * wb);
}
var Q0 = [
	0,
	0,
	0,
	1
];
//#endregion
export { GEO, Q0, Shards, area, centroid, qAxis, qMul, qRot, qSlerp };
