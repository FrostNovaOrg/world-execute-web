import { TAU, rng } from "../../engine/math.js?v=BJIlRm7-";
import { BufferAttribute, BufferGeometry, Color, MathUtils, Points } from "../../../vendor/three/build/three.core.js?v=q9f7JKE-";
import { dataTexture, shaderMaterial } from "../../engine/gpu.js?v=o4BYX3o1";
import { heart2 } from "../../engine/shapes.js?v=BFh0PgdI";
var HS = .9;
var HY = -.1;
var TIP = [0, -1];
var NOTCH = [0, .8];
/** Keep the part of polygon P where dot(p − m, n) ≤ 0. */
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
/** Sutherland–Hodgman: clip polygon S by the convex polygon C (counter-clockwise). */
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
function voronoi(seeds, bound) {
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
/** Best-candidate (Mitchell) sampling: well spaced seeds where accept(x, y). */
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
/** The heart curve as a counter-clockwise polygon (polar root finding: the curve is star-shaped about the origin). */
function heartPolygon(n = 240) {
	const pts = [];
	for (let i = 0; i < n; i++) {
		const th = -Math.PI / 2 + i / n * TAU, c = Math.cos(th), s = Math.sin(th);
		let lo = .02, hi = 1.8;
		for (let k = 1; k <= 300; k++) {
			const x = .02 + k * 1.78 / 300;
			if (heart2(x * c, x * s) > 0) {
				hi = x;
				lo = x - 1.78 / 300;
				break;
			}
		}
		for (let k = 0; k < 44; k++) {
			const m = (lo + hi) / 2;
			if (heart2(m * c, m * s) > 0) hi = m;
			else lo = m;
		}
		const r = (lo + hi) / 2;
		pts.push([r * c * HS, r * s * HS + HY]);
	}
	return pts;
}
var GEO = (() => {
	const r = rng(907);
	const disc = Array.from({ length: 256 }, (_, i) => [Math.cos(i / 256 * TAU), Math.sin(i / 256 * TAU)]);
	const dSeeds = spacedSeeds(36, r, [
		-1,
		-1,
		1,
		1
	], (x, y) => x * x + y * y < .93 * .93);
	const dCells = voronoi(dSeeds).map((P) => clipConvex(P, disc));
	const heart = heartPolygon();
	const hSeeds = spacedSeeds(36, r, [
		-1.1,
		-1.05,
		1.1,
		1.1
	], (x, y) => heart2(x / HS, (y - HY) / HS) < -.02);
	const hCells = voronoi(hSeeds).map((P) => clipConvex(heart, P));
	const order = dCells.map((P, i) => [area(P), i]).sort((a, b) => b[0] - a[0]).map((x) => x[1]);
	const free = new Set(hSeeds.map((_, i) => i)), match = new Array(36);
	for (const i of order) {
		let bj = -1, bd = 1e9;
		for (const j of free) {
			const d = (dSeeds[i][0] - hSeeds[j][0]) ** 2 + (dSeeds[i][1] - hSeeds[j][1]) ** 2;
			if (d < bd) {
				bd = d;
				bj = j;
			}
		}
		match[i] = bj;
		free.delete(bj);
	}
	const hCent = hCells.map(centroid);
	return {
		disc,
		dSeeds,
		dCells,
		dCent: dCells.map(centroid),
		heart,
		hSeeds,
		hCells,
		hCent,
		match,
		crack: crackPath(hCells, NOTCH, TIP),
		discArea: dCells.reduce((s, P) => s + area(P), 0),
		heartArea: hCells.reduce((s, P) => s + area(P), 0)
	};
})();
function crackPath(cells, from, to) {
	const key = (p) => `${Math.round(p[0] * 1e5)},${Math.round(p[1] * 1e5)}`, V = /* @__PURE__ */ new Map();
	const vid = (p) => {
		const k = key(p);
		if (!V.has(k)) V.set(k, {
			p,
			id: V.size
		});
		return V.get(k).id;
	};
	const count = /* @__PURE__ */ new Map();
	for (const P of cells) for (let i = 0; i < P.length; i++) {
		const a = vid(P[i]), b = vid(P[(i + 1) % P.length]);
		if (a === b) continue;
		const k = a < b ? `${a}-${b}` : `${b}-${a}`;
		count.set(k, (count.get(k) ?? 0) + 1);
	}
	const pts = [...V.values()].sort((a, b) => a.id - b.id).map((v) => v.p), adj = pts.map(() => []);
	for (const [k, c] of count) {
		const [a, b] = k.split("-").map(Number);
		const L = Math.hypot(pts[a][0] - pts[b][0], pts[a][1] - pts[b][1]);
		const w = c > 1 ? L : L * 6;
		adj[a].push([b, w]);
		adj[b].push([a, w]);
	}
	const near = (q) => {
		let bi = 0, bd = 1e9;
		pts.forEach((p, i) => {
			const d = (p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2;
			if (d < bd) {
				bd = d;
				bi = i;
			}
		});
		return bi;
	};
	const s = near(from), g = near(to), dist = pts.map(() => 1e9), prev = pts.map(() => -1), done = pts.map(() => false);
	dist[s] = 0;
	for (;;) {
		let u = -1;
		for (let i = 0; i < pts.length; i++) if (!done[i] && (u < 0 || dist[i] < dist[u])) u = i;
		if (u < 0 || dist[u] >= 1e9 || u === g) break;
		done[u] = true;
		for (const [v, w] of adj[u]) if (dist[u] + w < dist[v]) {
			dist[v] = dist[u] + w;
			prev[v] = u;
		}
	}
	const path = [];
	for (let v = g; v >= 0; v = prev[v]) path.push(pts[v]);
	path.reverse();
	let len = 0;
	for (let i = 1; i < path.length; i++) len += Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]);
	return {
		path,
		len
	};
}
/** Which side of the crack a point lies on: −1 left, +1 right (by the crack's x at that height). */
function crackSide(x, y) {
	const P = GEO.crack.path;
	for (let i = 1; i < P.length; i++) {
		const a = P[i - 1], b = P[i];
		if ((a[1] - y) * (b[1] - y) <= 0 && a[1] !== b[1]) return x < a[0] + (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) ? -1 : 1;
	}
	return x < 0 ? -1 : 1;
}
/** Image particles (xy, cell in w) and their heart targets (xy, random in w). */
function particleData() {
	const r = rng(4242), N = 147456, A = new Float32Array(N * 4), B = new Float32Array(N * 4), per = Array.from({ length: 36 }, () => []);
	for (let i = 0; i < N; i++) {
		let rho;
		if (i % 9 === 0) rho = .93 + r() * .06;
		else do
			rho = Math.hypot(Math.sqrt(-2 * Math.log(Math.max(r(), 1e-6))) * .38 * Math.cos(TAU * r()), 0);
		while (rho > .985);
		const a = r() * TAU, x = rho * Math.cos(a), y = rho * Math.sin(a), c = nearest(GEO.dSeeds, x, y);
		A.set([
			x,
			y,
			0,
			c
		], i * 4);
		per[c].push(i);
	}
	const bucket = Array.from({ length: 36 }, () => []);
	const need = GEO.match.map((j, i) => [j, per[i].length]);
	let guard = 0;
	while (need.some(([j, n]) => bucket[j].length < Math.min(n, 400)) && guard++ < N * 30) {
		const x = -1.1 + r() * 2.2, y = -1.05 + r() * 2.15;
		if (heart2(x / .9, (y - -.1) / .9) > 0) continue;
		const j = nearest(GEO.hSeeds, x, y);
		if (bucket[j].length < 6e3) bucket[j].push([x, y]);
	}
	GEO.match.forEach((j, i) => per[i].forEach((p, k) => {
		const q = bucket[j][k % bucket[j].length] ?? GEO.hSeeds[j];
		B.set([
			q[0] + (r() - .5) * .004,
			q[1] + (r() - .5) * .004,
			0,
			r()
		], p * 4);
	}));
	return {
		A,
		B
	};
}
var VERT = `
uniform sampler2D uA, uB, uCells;
uniform float uS, uNC, uSize, uFocal, uMinPx, uBright, uOrtho, uFocus, uAperture, uMaxBlur, uT, uFloor, uReveal;
uniform vec3 uColA, uColB;
out vec3 vCol; out float vBlur;
vec3 qrot(vec4 q, vec3 v) { return v + 2. * cross(q.xyz, cross(q.xyz, v) + q.w * v); }
vec4 cellTex(float c, float k) { return texture(uCells, vec2((k + .5) / 6., (c + .5) / uNC)); }
void main() {
  float i = float(gl_VertexID);
  vec2 uv = (vec2(mod(i, uS), floor(i / uS)) + .5) / uS;
  vec4 a = texture(uA, uv), b = texture(uB, uv);
  float c = a.w, h = hash12(vec2(i, 9000.));   // bridge/landed.js repeats h on the CPU: keep the key whole
  vec4 C0 = cellTex(c, 0.), C1 = cellTex(c, 1.), Q1 = cellTex(c, 2.), C3 = cellTex(c, 3.), C4 = cellTex(c, 4.), Q2 = cellTex(c, 5.);
  // image piece: rigid rotation about its seed, then translation
  vec3 pImg = qrot(Q1, vec3(a.xy - C0.xy, 0.)) + vec3(C0.xy, 0.) + C1.xyz;
  // heart piece: deflate (scale about the cell centroid), tumble, then translation
  vec3 rel = qrot(Q2, vec3(b.xy - C0.zw, 0.) * C4.y);
  vec3 pH = vec3(C0.zw, 0.) + rel + C3.xyz;
  float k = smoothstep(0., 1., C1.w);
  vec3 p = mix(pImg, pH, k) + (hash31(i * 1.37) - .5) * sin(k * PI) * .22;     // the particles flow, not a rigid slide
  p.y = max(p.y, uFloor + .004 * h);                                             // pieces come to rest on the floor
  vec4 mv = modelViewMatrix * vec4(p, 1.);
  gl_Position = projectionMatrix * mv;
  float dist = max(-mv.z, 1e-3), persp = uOrtho > .5 ? 1. : 1. / dist;
  float px = uSize * uFocal * persp, core = max(px, uMinPx);
  float blur = uAperture > 0. ? min(uAperture * abs(dist - uFocus) * persp * uFocal, uMaxBlur) : 0.;
  float sz = core + blur;
  gl_PointSize = sz;
  vBlur = blur / sz;
  float vis = step(h, uReveal);
  float energy = vis * min(1., px * px / (uMinPx * uMinPx)) * core * core / (sz * sz);
  vCol = mix(uColA, uColB, k) * uBright * C4.x * energy * (.55 + .9 * hash11(i * 1.31));
}`;
var FRAG = `
in vec3 vCol; in float vBlur; out vec4 o;
void main() {
  float r = length(gl_PointCoord - .5) * 2.;
  float gauss = exp(-r * r * 4.) * (1. - smoothstep(.8, 1., r));
  float disc = (1. - smoothstep(.86, 1., r)) * (.7 + .3 * smoothstep(.55, .95, r)) * .42;
  o = vec4(vCol * mix(gauss, disc, smoothstep(0., .6, vBlur)), 1.);
}`;
/** The shard particles. Per frame: set cell transforms with cells(fn), then set(uniforms, cam, hPx). */
var Shards = class {
	constructor() {
		const { A, B } = particleData(), N = 147456;
		this.cellData = /* @__PURE__ */ new Float32Array(864);
		this.cellTex = dataTexture(this.cellData, 6, 36);
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
				uB: { value: dataTexture(B, 384, 384) },
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
					"uFloor",
					"uReveal"
				]),
				uColA: { value: new Color() },
				uColB: { value: new Color() }
			}
		}));
		this.points.frustumCulled = false;
	}
	/** fn(i) → { t0: [x,y,z], k, q1: [x,y,z,w], t1: [x,y,z], q2, bright, scale } for cell i. */
	cells(fn) {
		const d = this.cellData;
		for (let i = 0; i < 36; i++) {
			const c = fn(i), o = i * 24, s = GEO.dSeeds[i], hc = GEO.hCent[GEO.match[i]];
			d.set([
				s[0],
				s[1],
				hc[0],
				hc[1]
			], o);
			d.set([...c.t0, c.k], o + 4);
			d.set(c.q1, o + 8);
			d.set([...c.t1, 0], o + 12);
			d.set([
				c.bright ?? 1,
				c.scale ?? 1,
				0,
				0
			], o + 16);
			d.set(c.q2, o + 20);
		}
		this.cellTex.needsUpdate = true;
		return this;
	}
	set(o, cam, hPx) {
		const u = this.points.material.uniforms;
		u.uS.value = 384;
		u.uNC.value = 36;
		u.uT.value = o.t ?? 0;
		u.uFloor.value = o.floor ?? -1e3;
		u.uReveal.value = o.reveal ?? 1;
		u.uSize.value = o.size ?? .006;
		u.uMinPx.value = (o.minPx ?? 1.2) * hPx / 1080;
		u.uBright.value = o.bright ?? .3;
		u.uFocus.value = o.focus ?? 5;
		u.uAperture.value = o.aperture ?? 0;
		u.uMaxBlur.value = (o.maxBlur ?? 40) * hPx / 1080;
		u.uOrtho.value = cam.isOrthographicCamera ? 1 : 0;
		u.uFocal.value = cam.isPerspectiveCamera ? hPx / 2 / Math.tan(MathUtils.degToRad(cam.fov) / 2) : hPx * cam.zoom / (cam.top - cam.bottom);
		u.uColA.value.setRGB(...o.colA ?? [
			.9,
			.8,
			.7
		]);
		u.uColB.value.setRGB(...o.colB ?? o.colA ?? [
			.9,
			.9,
			.95
		]);
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
var Q0 = [
	0,
	0,
	0,
	1
];
//#endregion
export { GEO, HS, HY, NOTCH, Q0, Shards, TIP, area, centroid, crackSide, qAxis, qRot };
