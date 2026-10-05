import { BufferAttribute, BufferGeometry, Mesh, MeshBasicMaterial } from "../../../vendor/three/build/three.core.js?v=q9f7JKE-";
//#region src/ch/v2/spectrum.js
var g = (x, mu, s1, s2) => {
	const t = (x - mu) / (x < mu ? s1 : s2);
	return Math.exp(-.5 * t * t);
};
function cmf(l) {
	return [
		1.056 * g(l, 599.8, 37.9, 31) + .362 * g(l, 442, 16, 26.7) - .065 * g(l, 501.1, 20.4, 26.2),
		.821 * g(l, 568.8, 46.9, 40.5) + .286 * g(l, 530.9, 16.3, 31.1),
		1.217 * g(l, 437, 11.8, 36) + .681 * g(l, 459, 26, 13.8)
	];
}
var xyz2rgb = ([X, Y, Z]) => [
	3.2406 * X - 1.5372 * Y - .4986 * Z,
	-.9689 * X + 1.8758 * Y + .0415 * Z,
	.0557 * X - .204 * Y + 1.057 * Z
];
/** Display colour of monochromatic light λ (linear sRGB, max channel 1; outside the gamut → desaturated with white). */
function rayColour(l) {
	const c = xyz2rgb(cmf(l)), lo = Math.min(0, ...c), d = c.map((v) => v - lo), m = Math.max(...d, 1e-6);
	return d.map((v) => v / m);
}
/** Relative luminous weight of λ (ȳ), for ray brightness. */
var lum = (l) => cmf(l)[1];
var nGlass = (l) => 1.739 + .0159 / (l / 1e3) ** 2;
var PRISM = {
	c: [0, 0],
	side: 1.5,
	apex: 60
};
/** Corners of the equilateral prism (apex up), centred on its centroid. */
function prismCorners({ c, side } = PRISM) {
	const h = side * Math.sqrt(3) / 2;
	return [
		[c[0], c[1] + h * 2 / 3],
		[c[0] - side / 2, c[1] - h / 3],
		[c[0] + side / 2, c[1] - h / 3]
	];
}
var sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
var add = (a, b) => [a[0] + b[0], a[1] + b[1]];
var mul = (a, k) => [a[0] * k, a[1] * k];
var dot = (a, b) => a[0] * b[0] + a[1] * b[1];
var nrm = (a) => {
	const l = Math.hypot(a[0], a[1]);
	return [a[0] / l, a[1] / l];
};
/** Refract unit d through a surface with unit normal n (pointing against d), index ratio eta = n1/n2. */
function refract(d, n, eta) {
	const ci = -dot(n, d), k = 1 - eta * eta * (1 - ci * ci);
	return k < 0 ? null : nrm(add(mul(d, eta), mul(n, eta * ci - Math.sqrt(k))));
}
/** Intersection of the ray o + t·d with segment a–b (t > eps), or null. */
function hit(o, d, a, b) {
	const e = sub(b, a), den = d[0] * e[1] - d[1] * e[0];
	if (Math.abs(den) < 1e-9) return null;
	const w = sub(a, o), t = (w[0] * e[1] - w[1] * e[0]) / den, u = (w[0] * d[1] - w[1] * d[0]) / den;
	return t > 1e-6 && u >= 0 && u <= 1 ? {
		t,
		p: add(o, mul(d, t))
	} : null;
}
/**
* The beam enters the left face at its midpoint, aimed so that λ0 passes at minimum deviation; every wavelength is
* traced through both faces. Returns { entry, dir0, rays: [{ l, inside: [p1, p2], out: p2, dir }] }.
*/
function prismRays(ls, { lambda0 = 560, prism = PRISM } = {}) {
	const [A, B, C] = prismCorners(prism), entry = mul(add(A, B), .5);
	const nL = nrm([-(A[1] - B[1]), A[0] - B[0]]);
	const n0 = nGlass(lambda0), th1 = Math.asin(n0 * Math.sin(prism.apex / 2 * Math.PI / 180));
	const inN = mul(nL, -1), rot = (v, a) => [v[0] * Math.cos(a) - v[1] * Math.sin(a), v[0] * Math.sin(a) + v[1] * Math.cos(a)];
	const dir0 = rot(inN, th1);
	return {
		entry,
		dir0,
		rays: ls.map((l) => {
			const d1 = refract(dir0, nL, 1 / nGlass(l));
			const h = hit(entry, d1, A, C);
			if (!d1 || !h) return null;
			const d2 = refract(d1, mul(nrm([A[1] - C[1], -(A[0] - C[0])]), -1), nGlass(l));
			return d2 && {
				l,
				inside: [entry, h.p],
				out: h.p,
				dir: d2
			};
		}).filter(Boolean),
		corners: [
			A,
			B,
			C
		]
	};
}
var PEAKS = [
	444,
	472,
	503
];
/** Absorbance of lycopene (hexane), normalised to 1 at 472 nm: three vibronic bands on a broad envelope. */
var BANDS = [
	[
		444,
		.68,
		11
	],
	[
		472,
		1,
		12
	],
	[
		503,
		.89,
		12.5
	]
];
var rawA = (l) => {
	let a = .16 * Math.exp(-(((l - 470) / 36) ** 2)) + .1 * Math.exp(-(((l - 360) / 28) ** 2));
	for (const [m, h, s] of BANDS) a += h * (.7 * Math.exp(-(((l - m) / s) ** 2)) + .3 / (1 + ((l - m) / 15) ** 2));
	return a;
};
var A472 = rawA(472);
var absorbance = (l) => rawA(l) / A472;
/** Transmittance of a layer whose absorbance at 472 nm is c (c = 2: 1 % gets through at the peak). */
var transmit = (l, c = 2) => 10 ** (-absorbance(l) * c);
/** The colour (linear sRGB, max 1) and luminance of white light (equal energy) after the cell, integrated 380–720 nm. */
function transmitted(c = 2) {
	let X = 0, Y = 0, Z = 0, Y0 = 0;
	for (let l = 380; l <= 720; l += 1) {
		const t = transmit(l, c), m = cmf(l);
		X += m[0] * t;
		Y += m[1] * t;
		Z += m[2] * t;
		Y0 += m[1];
	}
	const rgb = xyz2rgb([
		X,
		Y,
		Z
	]).map((v) => Math.max(0, v)), mx = Math.max(...rgb);
	return {
		rgb: rgb.map((v) => v / mx),
		Y: Y / Y0,
		hex: "#" + rgb.map((v) => Math.round(255 * Math.min(1, (v / mx) ** (1 / 2.2))).toString(16).padStart(2, "0")).join("")
	};
}
/**
* The fan of dispersed light as one continuous sheet (a triangle strip over λ, 1 nm apart) from the exit face to the
* screen, and the spectrum on the screen as a band (the beam's height, z ∈ ±bandH, on the screen plane x = screenX):
* every vertex carries its wavelength's colour × its luminous weight × the cell's transmittance, so absorption bands
* are dark wedges in the fan and dark gaps on the screen. The fan lies in the xy plane (z = 0).
*/
var SpectrumFan = class {
	constructor(prism, screenX, offset = [0, 0], { l0 = 400, l1 = 700, bandH = .2 } = {}) {
		this.bandH = bandH;
		const ls = [];
		for (let l = l0; l <= l1; l += 1) ls.push(l);
		const R = prismRays(ls, { prism }).rays;
		this.rays = R.map((r) => {
			const tt = (screenX - r.out[0]) / r.dir[0];
			return {
				l: r.l,
				a: [r.out[0] + offset[0], r.out[1] + offset[1]],
				b: [r.out[0] + r.dir[0] * tt + offset[0], r.out[1] + r.dir[1] * tt + offset[1]]
			};
		});
		this.ymax = Math.max(...ls.map(lum));
		const n = this.rays.length, mk = (verts) => {
			const g = new BufferGeometry();
			g.setAttribute("position", new BufferAttribute(new Float32Array(verts * 3), 3));
			g.setAttribute("color", new BufferAttribute(new Float32Array(verts * 3), 3));
			const idx = [];
			for (let i = 0; i < n - 1; i++) {
				const a = i * 2;
				idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
			}
			g.setIndex(idx);
			const m = new Mesh(g, new MeshBasicMaterial({
				vertexColors: true,
				transparent: true,
				blending: 2,
				depthWrite: false,
				depthTest: false,
				side: 2
			}));
			m.frustumCulled = false;
			return m;
		};
		this.fan = mk(n * 2);
		this.band = mk(n * 2);
	}
	/**
	* c: lycopene layer (absorbance at 472 nm), k: brightness, draw: 0..1 how far the light has travelled to the screen.
	* The screen band is shown as a detector would record it: every wavelength at the same weight (no luminous
	* efficiency), with a contrast gamma of 1.6 on T, so the three bands read as dark lines.
	*/
	set(c, k = 1, draw = 1, bandK = 1) {
		const F = this.fan.geometry, B = this.band.geometry, fp = F.attributes.position.array, fc = F.attributes.color.array, bp = B.attributes.position.array, bc = B.attributes.color.array;
		this.rays.forEach((r, i) => {
			const T = c > .01 ? transmit(r.l, c) : 1, w = (.25 + .75 * lum(r.l) / this.ymax) * T ** 1.3, col = rayColour(r.l), wb = (.55 + .45 * lum(r.l) / this.ymax) * T ** 1.6;
			const e = [r.a[0] + (r.b[0] - r.a[0]) * draw, r.a[1] + (r.b[1] - r.a[1]) * draw];
			fp.set([
				r.a[0],
				r.a[1],
				0,
				e[0],
				e[1],
				0
			], i * 6);
			fc.set([...col.map((v) => v * w * k * 1.2), ...col.map((v) => v * w * k * .45)], i * 6);
			bp.set([
				r.b[0] - .004,
				r.b[1],
				-this.bandH,
				r.b[0] - .004,
				r.b[1],
				this.bandH
			], i * 6);
			const on = draw >= 1 ? bandK : 0;
			bc.set([...col.map((v) => v * wb * 1.4 * on), ...col.map((v) => v * wb * 1.4 * on)], i * 6);
		});
		F.attributes.position.needsUpdate = F.attributes.color.needsUpdate = B.attributes.position.needsUpdate = B.attributes.color.needsUpdate = true;
		this.fan.visible = this.band.visible = true;
		return this;
	}
};
//#endregion
export { PEAKS, PRISM, SpectrumFan, absorbance, cmf, lum, nGlass, prismCorners, prismRays, rayColour, transmit, transmitted, xyz2rgb };
