import { clamp, rng } from "../../engine/math.js?v=BJIlRm7-";
//#region src/ch/c1/codeviz.js
var MASKS = /* @__PURE__ */ new Map();
/**
* A word rasterised at `rows` pixel rows in a heavy monospace face: { w, h, at(u, v) } with u, v in 0..1 (v down),
* at() = coverage 0..1. Cached per (word, rows).
*/
function wordMask(word, { rows = 64, font = "800 {px}px \"JetBrains Mono\", Menlo, monospace", tracking = .08 } = {}) {
	const key = `${word}@${rows}@${tracking}`;
	if (MASKS.has(key)) return MASKS.get(key);
	const px = rows, c = document.createElement("canvas"), g = c.getContext("2d", { willReadFrequently: true });
	g.font = font.replace("{px}", px);
	const adv = g.measureText("M").width, w = Math.ceil(adv * (1 + tracking) * word.length + px * .2), h = Math.ceil(px * 1.15);
	c.width = w;
	c.height = h;
	g.font = font.replace("{px}", px);
	g.fillStyle = "#fff";
	g.textBaseline = "middle";
	g.textAlign = "center";
	[...word].forEach((ch, i) => g.fillText(ch, px * .1 + adv * (1 + tracking) * (i + .5), h * .54));
	const d = g.getImageData(0, 0, w, h).data;
	const at = (u, v) => {
		const x = Math.floor(clamp(u, 0, .9999) * w), y = Math.floor(clamp(v, 0, .9999) * h);
		return d[(y * w + x) * 4] / 255;
	};
	const m = {
		w,
		h,
		at,
		aspect: w / h
	};
	MASKS.set(key, m);
	return m;
}
var add = (o, r, d, x, y) => [
	o[0] + r[0] * x + d[0] * y,
	o[1] + r[1] * x + d[1] * y,
	o[2] + r[2] * x + d[2] * y
];
/**
* The field's text as an editor page on a plane: character (col, row) of the source goes to origin + right·col·adv +
* down·row·cell (adv = .6 cell). Pages: rows wrap into side-by-side pages of `pageRows` lines. Parks the rest.
*/
function planeLayout(field, { origin, right = [
	1,
	0,
	0
], down = [
	0,
	-1,
	0
], cell = .1, cols = 120, pageRows = 1e9, gap = 6 }) {
	return (N) => {
		const out = new Float32Array(N * 4), grid = field._grid ?? [], n = Math.max(1, field.count), adv = cell * .6;
		for (let i = 0; i < N; i++) {
			const p = grid[i];
			if (!p || p[0] >= cols) {
				out.set([
					0,
					0,
					-1e5,
					1
				], i * 4);
				continue;
			}
			const page = Math.floor(p[1] / pageRows), row = p[1] % pageRows, col = p[0] + page * (cols + gap);
			out.set([...add(origin, right, down, col * adv, row * cell), i / n], i * 4);
		}
		return out;
	};
}
/**
* A calligram on a plane: the text flows through the monospace cells that fall inside `mask` (a wordMask), keeping
* word gaps, so the letters are drawn with lines of code. width: world width of the word; the height follows.
*/
function calligram(field, mask, { center, right = [
	1,
	0,
	0
], down = [
	0,
	-1,
	0
], width = 4, cell = .08, thresh = .5 }) {
	return (N) => {
		const out = new Float32Array(N * 4), adv = cell * .6, height = width / mask.aspect;
		const cols = Math.floor(width / adv), rows = Math.floor(height / cell), cells = [];
		for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
			const u = (c + .5) / cols, v = (r + .5) / rows;
			if (mask.at(u, v) > thresh) cells.push(add(center, right, down, (u - .5) * width, (v - .5) * height));
		}
		const grid = field._grid ?? [], count = field.count;
		let k = 0, placed = 0;
		for (let i = 0; i < N; i++) {
			if (i >= count) {
				out.set([
					0,
					0,
					-1e5,
					1
				], i * 4);
				continue;
			}
			if (i > 0) k += grid[i][1] === grid[i - 1][1] ? grid[i][0] - grid[i - 1][0] - 1 : 1;
			if (k >= cells.length) {
				out.set([
					0,
					0,
					-1e5,
					1
				], i * 4);
				continue;
			}
			out.set([...cells[k++], 0], i * 4);
			placed++;
		}
		let j = 0;
		for (let i = 0; i < N; i++) if (out[i * 4 + 2] > -1e4) out[i * 4 + 3] = j++ / Math.max(1, placed);
		return out;
	};
}
/**
* The PPO log of the RLHF run whose reward-model score is `run.ema` (reward.js): one line per logging interval.
* KL to the reference policy grows as the policy drifts; the entropy falls; the clip fraction settles.
*/
function ppoLog(run, { steps = 1e5, every = 1600 } = {}) {
	const g = rng(907), lines = ["# RLHF · PPO against reward model r_φ  (kl_coef 0.02, clip ε = 0.2, lr 1.41e-5)", ""];
	const n = run.ema.length;
	for (let s = 0; s <= steps; s += every) {
		const u = s / steps, i = Math.min(n - 1, Math.round(u * (n - 1)));
		const r = run.ema[i], kl = .02 + .31 * u ** .8 + (g() - .5) * .012, ent = 2.31 - .74 * u ** .6 + (g() - .5) * .03, clip = .21 * Math.exp(-u * 2.4) + .03 + g() * .01;
		lines.push(`step ${String(s).padStart(6)} | r_φ ${r.toFixed(3)} | kl ${kl.toFixed(3)} | entropy ${ent.toFixed(2)} | clipfrac ${clip.toFixed(3)} | objective ${(r - .02 * kl).toFixed(3)}`);
	}
	return lines.join("\n");
}
/** Pairwise human preferences (the data a reward model learns from): which of two answers the rater preferred. */
function preferenceLog({ count = 90 } = {}) {
	const g = rng(4717), lines = ["# preferences · rater: you", ""];
	for (let k = 0; k < count; k++) {
		const a = g() < .5, p = .5 + .49 * g() ** .6, id = 10240 + k * 7 + Math.floor(g() * 7);
		lines.push(`#${id}  ${a ? "A > B" : "B > A"}  p = ${p.toFixed(2)}  margin ${Math.log(p / (1 - p)).toFixed(2)}  ${p > .9 ? "// strongly" : ""}`);
	}
	return lines.join("\n");
}
/** A word as a text-mode banner: rows of strings where each letter's pixels are drawn with that letter. */
function banner(word, rows = 11, { tracking = .18 } = {}) {
	const m = wordMask(word, {
		rows: 64,
		tracking
	}), cols = Math.round(rows * m.aspect / .6 * .98), out = [];
	for (let r = 0; r < rows; r++) {
		let s = "";
		for (let c = 0; c < cols; c++) {
			const u = (c + .5) / cols, v = (r + .5) / rows, letter = word[Math.min(word.length - 1, Math.floor(u * word.length))];
			s += m.at(u, v) > .45 ? letter : " ";
		}
		out.push(s);
	}
	return out;
}
//#endregion
export { banner, calligram, planeLayout, ppoLog, preferenceLog, wordMask };
