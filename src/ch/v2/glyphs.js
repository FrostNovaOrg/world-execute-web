import { rng } from "../../engine/math.js?v=BJIlRm7-";
import { alloc, put } from "./shapeset.js?v=Bbzza00z";
import { GLYPH_DEF, inGlyph } from "./glyphdef.js?v=Cp1j9ZDv";
//#region src/ch/v2/glyphs.js
/**
* Distance from (x, y) to the glyph's outline, glyph units (0 outside), from an exact Euclidean distance transform of a
* raster of the glyph (cells of .005 units; the box border counts as outside). Returns { at(x, y), max }.
*/
function glyphDistance(g) {
	const [x0, y0, x1, y1] = GLYPH_DEF[g].box, h = .005, nx = Math.round((x1 - x0) / h) + 2, ny = Math.round((y1 - y0) / h) + 2, INF = 0x56bc75e2d63100000;
	const f = new Float64Array(nx * ny);
	for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
		const x = x0 + (i - .5) * h, y = y0 + (j - .5) * h, inside = i > 0 && j > 0 && i < nx - 1 && j < ny - 1 && inGlyph(g, x, y);
		f[j * nx + i] = inside ? INF : 0;
	}
	const dt1 = (get, set, n) => {
		const v = new Int32Array(n), z = new Float64Array(n + 1), fv = new Float64Array(n);
		for (let q = 0; q < n; q++) fv[q] = get(q);
		let k = 0;
		v[0] = 0;
		z[0] = -0x56bc75e2d63100000;
		z[1] = INF;
		for (let q = 1; q < n; q++) {
			let s = (fv[q] + q * q - (fv[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
			while (s <= z[k]) {
				k--;
				s = (fv[q] + q * q - (fv[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
			}
			k++;
			v[k] = q;
			z[k] = s;
			z[k + 1] = INF;
		}
		k = 0;
		for (let q = 0; q < n; q++) {
			while (z[k + 1] < q) k++;
			set(q, (q - v[k]) ** 2 + fv[v[k]]);
		}
	};
	for (let i = 0; i < nx; i++) dt1((j) => f[j * nx + i], (j, d) => {
		f[j * nx + i] = d;
	}, ny);
	for (let j = 0; j < ny; j++) dt1((i) => f[j * nx + i], (i, d) => {
		f[j * nx + i] = d;
	}, nx);
	let max = 0;
	for (let k = 0; k < f.length; k++) max = Math.max(max, Math.sqrt(f[k]) * h);
	const at = (x, y) => {
		const i = Math.min(nx - 1, Math.max(0, Math.round((x - x0) / h + .5))), j = Math.min(ny - 1, Math.max(0, Math.round((y - y0) / h + .5)));
		return Math.sqrt(f[j * nx + i]) * h;
	};
	return {
		at,
		max
	};
}
var LUM = {
	core: [
		1,
		.94,
		.84
	],
	gold: [
		1,
		.5,
		.12
	],
	rim: [
		1,
		.58,
		.16
	]
};
function lumColour(d, dmax) {
	const u = Math.min(1, d / (.9 * dmax)), c = u * u * (3 - 2 * u);
	const k = .7 + .6 * c, rim = .9 * Math.exp(-d / .012);
	return [
		0,
		1,
		2
	].map((i) => (LUM.gold[i] + (LUM.core[i] - LUM.gold[i]) * c) * k + LUM.rim[i] * rim);
}
/**
* N points in glyph g (glyph units × scale, placed by `toWorld(x, y, r)` → [x, y, z], r a per-point random), coloured col
* (× .75–1.2 per point), row-band sorted. w = row-band position 0..1 (top → bottom). lum: colour by depth inside the
* outline instead (see lumColour; col is ignored), with a ±20% per-point grain baked into the colour, so the grain is
* the same whatever order the points are later drawn in.
*/
function glyphPoints(N, g, { scale = 1, col = [
	1,
	1,
	1
], toWorld = (x, y) => [
	x,
	y,
	0
], seed = 151, bands = 160, lum = false } = {}) {
	const r = rng(seed), [x0, y0, x1, y1] = GLYPH_DEF[g].box;
	let hit = 0;
	const P = 400;
	for (let i = 0; i < P; i++) for (let j = 0; j < P; j++) hit += inGlyph(g, x0 + (i + .5) / P * (x1 - x0), y0 + (j + .5) / P * (y1 - y0));
	const h = Math.sqrt((x1 - x0) * (y1 - y0) * hit / (P * P) / N), nx = Math.round((x1 - x0) / h), ny = Math.round((y1 - y0) / h);
	let pts = [];
	for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
		const x = x0 + (i + r()) / nx * (x1 - x0), y = y0 + (j + r()) / ny * (y1 - y0);
		if (inGlyph(g, x, y)) pts.push([
			x,
			y,
			r()
		]);
	}
	for (let i = pts.length - 1; i > 0; i--) {
		const k = Math.floor(r() * (i + 1));
		[pts[i], pts[k]] = [pts[k], pts[i]];
	}
	pts = pts.slice(0, N);
	while (pts.length < N) {
		const x = x0 + r() * (x1 - x0), y = y0 + r() * (y1 - y0);
		if (inGlyph(g, x, y)) pts.push([
			x,
			y,
			r()
		]);
	}
	const key = (p) => Math.floor((1 - (p[1] + 1) / 2) * bands) * 4 + (p[0] + 1);
	pts.sort((a, b) => key(a) - key(b));
	const S = alloc(N), D = lum ? glyphDistance(g) : null;
	pts.forEach((p, i) => {
		const c = lum ? lumColour(D.at(p[0], p[1]), D.max).map((v) => v * (.8 + .4 * p[2])) : col.map((v) => v * (.75 + .45 * p[2]));
		put(S, i, toWorld(p[0] * scale, p[1] * scale, p[2]), c, [
			0,
			0,
			0
		], i / N, 0);
	});
	return S;
}
var QED = (() => {
	const fov = 36, tan = 2 * Math.tan(fov / 2 * Math.PI / 180), H = 2494 * tan / 1080;
	return {
		fov,
		tan,
		H,
		dist: H / tan,
		col: [
			1,
			.6,
			.2
		],
		size: .006,
		bright: 1.55,
		sparkle: .1
	};
})();
//#endregion
export { GLYPH_DEF, QED, glyphPoints, inGlyph };
