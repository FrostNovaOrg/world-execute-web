import { TAU, rng } from "./math.js?v=BJIlRm7-";
//#region src/engine/shapes.js
var alloc = (N) => new Float32Array(N * 4);
var put = (out, i, x, y, z, w = 0) => {
	out[i * 4] = x;
	out[i * 4 + 1] = y;
	out[i * 4 + 2] = z;
	out[i * 4 + 3] = w;
};
/** Sample N points uniformly by arc length along piecewise-linear polylines [[ [x,y,z(,w)], ... ], ...]. */
function alongPolylines(N, lines, { jitter = 0, seed = 1 } = {}) {
	const r = rng(seed), segs = [];
	let total = 0;
	for (const pts of lines) for (let i = 1; i < pts.length; i++) {
		const a = pts[i - 1], b = pts[i], len = Math.hypot(b[0] - a[0], b[1] - a[1], (b[2] ?? 0) - (a[2] ?? 0), (b[3] ?? 0) - (a[3] ?? 0));
		segs.push({
			a,
			b,
			len,
			acc: total
		});
		total += len;
	}
	const out = alloc(N);
	let s = 0;
	for (let i = 0; i < N; i++) {
		const d = (i + r()) / N * total;
		while (s < segs.length - 1 && segs[s].acc + segs[s].len < d) s++;
		const { a, b, len, acc } = segs[s], k = len > 0 ? (d - acc) / len : 0, j = () => (r() - .5) * 2 * jitter;
		put(out, i, a[0] + (b[0] - a[0]) * k + j(), a[1] + (b[1] - a[1]) * k + j(), (a[2] ?? 0) + ((b[2] ?? 0) - (a[2] ?? 0)) * k + j(), (a[3] ?? 0) + ((b[3] ?? 0) - (a[3] ?? 0)) * k);
	}
	return out;
}
/** Points on the zero set of f(x, y) inside box [x0, y0, x1, y1], by rejection plus Newton projection. */
function implicit2(N, f, { box = [
	-1.5,
	-1.5,
	1.5,
	1.5
], eps = .002, jitter = 0, z = 0, seed = 1 } = {}) {
	const r = rng(seed), out = alloc(N), h = 1e-4;
	let n = 0, tries = 0;
	while (n < N && tries++ < N * 40) {
		let x = box[0] + r() * (box[2] - box[0]), y = box[1] + r() * (box[3] - box[1]);
		for (let it = 0; it < 12; it++) {
			const v = f(x, y), gx = (f(x + h, y) - f(x - h, y)) / (2 * h), gy = (f(x, y + h) - f(x, y - h)) / (2 * h), g2 = gx * gx + gy * gy;
			if (g2 < 1e-12) break;
			x -= v * gx / g2;
			y -= v * gy / g2;
		}
		const v = f(x, y), gx = (f(x + h, y) - f(x - h, y)) / (2 * h), gy = (f(x, y + h) - f(x, y - h)) / (2 * h);
		if (x < box[0] || x > box[2] || y < box[1] || y > box[3] || Math.abs(v) / (Math.hypot(gx, gy) + 1e-9) > eps) continue;
		put(out, n++, x + (r() - .5) * jitter, y + (r() - .5) * jitter, z + (r() - .5) * jitter);
	}
	for (let k = n; k < N; k++) {
		const src = n ? Math.floor(r() * n) : 0;
		out.copyWithin(k * 4, src * 4, src * 4 + 4);
	}
	return out;
}
/** Points on the zero set of f(x, y, z) inside an axis-aligned box, by rejection plus Newton projection. */
function implicit3(N, f, { box = [
	-1.5,
	-1.5,
	-1.5,
	1.5,
	1.5,
	1.5
], eps = .002, uniform = false, shell = .012, seed = 1 } = {}) {
	const r = rng(seed), out = alloc(N), h = 1e-4;
	const grad = (x, y, z) => [
		(f(x + h, y, z) - f(x - h, y, z)) / (2 * h),
		(f(x, y + h, z) - f(x, y - h, z)) / (2 * h),
		(f(x, y, z + h) - f(x, y, z - h)) / (2 * h)
	];
	let n = 0, tries = 0;
	if (uniform) {
		while (n < N && tries++ < N * 4e3) {
			const x = box[0] + r() * (box[3] - box[0]), y = box[1] + r() * (box[4] - box[1]), z = box[2] + r() * (box[5] - box[2]);
			const v = f(x, y, z), g = grad(x, y, z), g2 = g[0] * g[0] + g[1] * g[1] + g[2] * g[2];
			if (g2 < 1e-12 || Math.abs(v) / Math.sqrt(g2) > shell) continue;
			put(out, n++, x - v * g[0] / g2, y - v * g[1] / g2, z - v * g[2] / g2);
		}
		for (let k = n; k < N; k++) {
			const src = n ? Math.floor(r() * n) : 0;
			out.copyWithin(k * 4, src * 4, src * 4 + 4);
		}
		return out;
	}
	while (n < N && tries++ < N * 40) {
		let x = box[0] + r() * (box[3] - box[0]), y = box[1] + r() * (box[4] - box[1]), z = box[2] + r() * (box[5] - box[2]);
		for (let it = 0; it < 14; it++) {
			const v = f(x, y, z), [gx, gy, gz] = grad(x, y, z), g2 = gx * gx + gy * gy + gz * gz;
			if (g2 < 1e-12) break;
			x -= v * gx / g2;
			y -= v * gy / g2;
			z -= v * gz / g2;
		}
		const v = f(x, y, z), g = grad(x, y, z);
		if (x < box[0] || x > box[3] || y < box[1] || y > box[4] || z < box[2] || z > box[5] || Math.abs(v) / (Math.hypot(...g) + 1e-9) > eps) continue;
		put(out, n++, x, y, z);
	}
	for (let k = n; k < N; k++) {
		const src = n ? Math.floor(r() * n) : 0;
		out.copyWithin(k * 4, src * 4, src * 4 + 4);
	}
	return out;
}
var shapes = {
	/** Everything collapsed into a tiny ball (a "single point"). */
	point(N, { r = .004, seed = 11 } = {}) {
		const g = rng(seed), out = alloc(N);
		for (let i = 0; i < N; i++) {
			const u = g() * 2 - 1, a = g() * TAU, s = Math.cbrt(g()) * r, q = Math.sqrt(1 - u * u);
			put(out, i, q * Math.cos(a) * s, u * s, q * Math.sin(a) * s);
		}
		return out;
	},
	/** Fibonacci sphere surface. */
	sphere(N, { r = 1 } = {}) {
		const out = alloc(N);
		for (let i = 0; i < N; i++) {
			const y = 1 - 2 * (i + .5) / N, q = Math.sqrt(1 - y * y), a = i * 2.399963229728653;
			put(out, i, q * Math.cos(a) * r, y * r, q * Math.sin(a) * r);
		}
		return out;
	},
	/** Uniform solid ball. */
	ball(N, { r = 1, seed = 12 } = {}) {
		const g = rng(seed), out = alloc(N);
		for (let i = 0; i < N; i++) {
			const u = g() * 2 - 1, a = g() * TAU, s = Math.cbrt(g()) * r, q = Math.sqrt(1 - u * u);
			put(out, i, q * Math.cos(a) * s, u * s, q * Math.sin(a) * s);
		}
		return out;
	},
	/** Surface of the cube [-s, s]^3. */
	cube(N, { s = 1, seed = 13 } = {}) {
		const g = rng(seed), out = alloc(N);
		for (let i = 0; i < N; i++) {
			const f = Math.floor(g() * 6), a = (g() * 2 - 1) * s, b = (g() * 2 - 1) * s, c = f % 2 ? s : -s;
			if (f < 2) put(out, i, c, a, b);
			else if (f < 4) put(out, i, a, c, b);
			else put(out, i, a, b, c);
		}
		return out;
	},
	/** Regular lattice on the XZ plane (y = 0), w cells across and d deep. */
	grid(N, { w = 8, d = 8, y = 0 } = {}) {
		const out = alloc(N), side = Math.ceil(Math.sqrt(N));
		for (let i = 0; i < N; i++) put(out, i, (i % side / (side - 1) - .5) * w, y, (Math.floor(i / side) / (side - 1) - .5) * d);
		return out;
	},
	/** Ring of radius r in the XY plane. */
	circle(N, { r = 1, thick = .006, seed = 14 } = {}) {
		const g = rng(seed), out = alloc(N);
		for (let i = 0; i < N; i++) {
			const a = (i + g()) / N * TAU, q = r + (g() - .5) * thick;
			put(out, i, Math.cos(a) * q, Math.sin(a) * q, (g() - .5) * thick);
		}
		return out;
	},
	/** Parametric curve fn(u) -> [x, y, z] for u in [u0, u1], sampled uniformly by arc length. */
	curve(N, fn, { u0 = 0, u1 = 1, samples = 4096, jitter = 0, seed = 15 } = {}) {
		const pts = [];
		for (let i = 0; i <= samples; i++) pts.push(fn(u0 + (u1 - u0) * i / samples));
		return alongPolylines(N, [pts], {
			jitter,
			seed
		});
	},
	/** Points along the 32 edges of the tesseract [-s, s]^4 (w holds the 4th coordinate). */
	tesseract(N, { s = 1, jitter = .004, seed = 16 } = {}) {
		const edges = [];
		for (let v = 0; v < 16; v++) for (let d = 0; d < 4; d++) {
			if (v & 1 << d) continue;
			const u = v | 1 << d, P = (k) => [
				0,
				1,
				2,
				3
			].map((j) => k & 1 << j ? s : -s);
			edges.push([P(v), P(u)]);
		}
		return alongPolylines(N, edges, {
			jitter,
			seed
		});
	},
	/** Filled glyphs of `str`, centred, `width` world units wide, on the XY plane. */
	text(N, str, { font = "700 200px \"JetBrains Mono\"", width = 3, depth = 0, seed = 17 } = {}) {
		const c = document.createElement("canvas"), g = c.getContext("2d");
		g.font = font;
		const m = g.measureText(str);
		const pad = 20, W = Math.ceil(m.width) + 40, asc = Math.ceil(m.actualBoundingBoxAscent), H = asc + Math.ceil(m.actualBoundingBoxDescent) + 40;
		c.width = W;
		c.height = H;
		g.font = font;
		g.fillStyle = "#fff";
		g.textBaseline = "alphabetic";
		g.fillText(str, pad, pad + asc);
		const px = g.getImageData(0, 0, W, H).data, on = [];
		for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (px[(y * W + x) * 4 + 3] > 127) on.push(x, y);
		const r = rng(seed), out = alloc(N), sc = width / (W - 40), cnt = on.length / 2;
		for (let i = 0; i < N; i++) {
			const k = Math.floor(r() * cnt) * 2;
			put(out, i, (on[k] + r() - W / 2) * sc, -(on[k + 1] + r() - H / 2) * sc, (r() - .5) * depth);
		}
		return out;
	},
	/** Zero set of a 2D implicit function f(x, y) (e.g. the heart curve, Chladni nodal lines). */
	implicit2,
	/** Zero set of a 3D implicit function f(x, y, z) (e.g. the 3D heart surface). */
	implicit3,
	/** Stars on a thick spherical shell. */
	stars(N, { r0 = 20, r1 = 60, seed = 18 } = {}) {
		const g = rng(seed), out = alloc(N);
		for (let i = 0; i < N; i++) {
			const u = g() * 2 - 1, a = g() * TAU, q = Math.sqrt(1 - u * u), s = r0 + (r1 - r0) * g();
			put(out, i, q * Math.cos(a) * s, u * s, q * Math.sin(a) * s, g());
		}
		return out;
	}
};
/** The classic algebraic heart (x^2 + y^2 - 1)^3 - x^2 y^3 = 0. */
var heart2 = (x, y) => (x * x + y * y - 1) ** 3 - x * x * y ** 3;
//#endregion
export { alongPolylines, heart2, shapes };
