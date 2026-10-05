import { rng } from "../../engine/math.js?v=BJIlRm7-";
import { alloc, put } from "./shapeset.js?v=Bbzza00z";
//#region src/ch/v2/words.js
/**
* Mask of `word` set in `font`, scaled so that its ink is `height` world units tall and centred on the origin.
* Returns { inside(x, y), width, height }.
*/
function wordMask(word, { font = "800 220px \"JetBrains Mono\"", tracking = 0, height = 1 } = {}) {
	const c = document.createElement("canvas"), g = c.getContext("2d", { willReadFrequently: true });
	const setup = () => {
		g.font = font;
		if ("letterSpacing" in g) g.letterSpacing = `${tracking}px`;
		g.textBaseline = "middle";
		g.fillStyle = "#fff";
	};
	setup();
	const px = +(font.match(/(\d+(?:\.\d+)?)px/)?.[1] ?? 200), W = Math.ceil(g.measureText(word).width + px), H = Math.ceil(px * 1.6);
	c.width = W;
	c.height = H;
	setup();
	g.fillText(word, px / 2, H / 2);
	const a = g.getImageData(0, 0, W, H).data;
	let x0 = W, x1 = 0, y0 = H, y1 = 0;
	for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (a[(y * W + x) * 4 + 3] > 127) {
		x0 = Math.min(x0, x);
		x1 = Math.max(x1, x);
		y0 = Math.min(y0, y);
		y1 = Math.max(y1, y);
	}
	const k = height / Math.max(1, y1 - y0), cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
	const inside = (x, y) => {
		const X = Math.round(cx + x / k), Y = Math.round(cy - y / k);
		return X >= 0 && Y >= 0 && X < W && Y < H && a[(Y * W + X) * 4 + 3] > 127;
	};
	return {
		inside,
		width: (x1 - x0) * k,
		height
	};
}
/**
* N points spread evenly (stratified) over a word's ink, as a Cloud shape: colour col (× .8–1.2 per point),
* placed by toWorld(x, y, r) (r a per-point random). w = x position 0..1 (left → right), for reveals.
*/
function wordPoints(N, word, { col = [
	1,
	1,
	1
], height = 1, font, tracking, toWorld = (x, y) => [
	x,
	y,
	0
], seed = 171 } = {}) {
	const m = wordMask(word, {
		font,
		tracking,
		height
	}), r = rng(seed), S = alloc(N), pts = [];
	let hit = 0;
	const P = 300, w = m.width * 1.02, h = m.height * 1.02;
	for (let i = 0; i < P; i++) for (let j = 0; j < P; j++) hit += m.inside(-w / 2 + (i + .5) / P * w, -h / 2 + (j + .5) / P * h);
	const cell = Math.sqrt(w * h * hit / (P * P) / N), nx = Math.ceil(w / cell), ny = Math.ceil(h / cell);
	for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
		const x = -w / 2 + (i + r()) * cell, y = -h / 2 + (j + r()) * cell;
		if (m.inside(x, y)) pts.push([
			x,
			y,
			r()
		]);
	}
	for (let i = pts.length - 1; i > 0; i--) {
		const k = Math.floor(r() * (i + 1));
		[pts[i], pts[k]] = [pts[k], pts[i]];
	}
	while (pts.length < N) {
		const x = (r() - .5) * w, y = (r() - .5) * h;
		if (m.inside(x, y)) pts.push([
			x,
			y,
			r()
		]);
	}
	pts.length = N;
	pts.forEach((p, i) => put(S, i, toWorld(p[0], p[1], p[2]), col.map((v) => v * (.8 + .4 * p[2])), [
		0,
		0,
		0
	], (p[0] + w / 2) / w, 0));
	return S;
}
//#endregion
export { wordMask, wordPoints };
