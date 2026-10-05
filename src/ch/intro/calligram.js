import { codeFill } from "../../lib/glyphs.js?v=DWbHICXG";
//#region src/ch/intro/calligram.js
/** The syntax palette in the boot's monochrome: classes differ by brightness only (plain, comment, string, number, keyword, punctuation). */
var MONO_SYNTAX = [
	[
		.8,
		.84,
		.92
	],
	[
		.2,
		.22,
		.27
	],
	[
		.6,
		.64,
		.72
	],
	[
		.68,
		.72,
		.8
	],
	[
		1,
		1,
		1
	],
	[
		.42,
		.46,
		.54
	]
];
/**
* Rasterise lines of text (centred, stacked) and return a point-in-letter test in world units:
* { inside(x, y), width, height } for x, y relative to the block's centre. capH: cap height of a line in world units;
* leading: gap between lines as a fraction of capH; weight/font/tracking (em) as in CSS.
*/
function textMask(lines, { capH = .4, leading = .45, weight = 800, font = "JetBrains Mono", tracking = 0, px = 320 } = {}) {
	const c = document.createElement("canvas"), g = c.getContext("2d", { willReadFrequently: true });
	const setFont = () => {
		g.font = `${weight} ${px}px "${font}"`;
		if ("letterSpacing" in g) g.letterSpacing = `${tracking * px}px`;
	};
	setFont();
	const cap = g.measureText("H").actualBoundingBoxAscent, pitch = cap * (1 + leading);
	const wide = Math.max(...lines.map((s) => g.measureText(s).width));
	const W = Math.ceil(wide + px * .4), H = Math.ceil(cap + pitch * (lines.length - 1) + px * .4);
	c.width = W;
	c.height = H;
	setFont();
	g.fillStyle = "#fff";
	g.textAlign = "center";
	g.textBaseline = "alphabetic";
	const top = (H - (cap + pitch * (lines.length - 1))) / 2;
	lines.forEach((s, i) => g.fillText(s, W / 2 + tracking * px / 2, top + cap + i * pitch));
	const d = g.getImageData(0, 0, W, H).data, k = capH / cap;
	const inside = (x, y) => {
		const X = Math.floor(W / 2 + x / k), Y = Math.floor(H / 2 - y / k);
		return X >= 0 && Y >= 0 && X < W && Y < H && d[(Y * W + X) * 4] > 127;
	};
	return {
		inside,
		width: W * k,
		height: H * k
	};
}
/**
* A calligram layout: the field's text flows through the cells of the mask (see glyphs.codeFill). Returns the layout
* array (N × 4: xyz + reading order) and `placed`, the number of characters that found a cell (always a prefix of the
* text: particles 0 … placed − 1).
*/
function calligram(field, mask, { center = [
	0,
	0,
	0
], cell = .035 } = {}) {
	const arr = codeFill(field, mask.inside, {
		center,
		cell,
		width: mask.width,
		height: mask.height
	})(field.N);
	let placed = 0;
	while (placed < field.N && arr[placed * 4 + 2] > -1e4) placed++;
	return {
		arr,
		placed
	};
}
/**
* The same characters on another shape: gen(n) gives n points (xyz, w ignored) for the `placed` particles of a
* calligram (the rest stay parked, so they are never drawn in either layout); the reading order is copied from the
* calligram so `reveal` behaves the same on both.
*/
function onPlaced(cal, gen, N) {
	const out = new Float32Array(N * 4), pts = gen(cal.placed);
	for (let i = 0; i < N; i++) if (i < cal.placed) out.set([
		pts[i * 4],
		pts[i * 4 + 1],
		pts[i * 4 + 2],
		cal.arr[i * 4 + 3]
	], i * 4);
	else out.set([
		0,
		0,
		-1e5,
		1
	], i * 4);
	return out;
}
/** n points evenly on a sphere (Fibonacci), radius r around c, in a stable order (top to bottom). */
function sphereShell(n, r, c = [
	0,
	0,
	0
]) {
	const out = new Float32Array(n * 4);
	for (let i = 0; i < n; i++) {
		const y = 1 - 2 * (i + .5) / n, q = Math.sqrt(1 - y * y), a = i * 2.399963229728653;
		out.set([
			c[0] + q * Math.cos(a) * r,
			c[1] + y * r,
			c[2] + q * Math.sin(a) * r,
			0
		], i * 4);
	}
	return out;
}
//#endregion
export { MONO_SYNTAX, calligram, onPlaced, sphereShell, textMask };
