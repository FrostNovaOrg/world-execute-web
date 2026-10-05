import { clamp, ease, hash, seg } from "../../engine/math.js?v=BJIlRm7-";
import { assistant, thinking } from "../../lib/claude.js?v=DXDs_lIL";
//#region src/ch/love/ui.js
var MONO = "JetBrains Mono";
/**
* The loss of a long training run, drawn left to right as the line is sung: log-scale loss against steps, a noisy
* power-law descent to its floor. rect: [x, y, w, h] (design px); k: 0..1 how much of the run is drawn.
*/
var LOSS = {
	steps: 262144,
	l0: 10.8,
	floor: 1.93
};
function lossAt(s) {
	const u = s / LOSS.steps, base = LOSS.floor + (LOSS.l0 - LOSS.floor) * (1 + u / .0018) ** -.62;
	return base * (1 + ((hash(Math.floor(s / 512) * 1.37) - .5) * .5 + (hash(Math.floor(s / 64) * 7.1) - .5) * .25) * .08 * Math.min(1, base / 3));
}
function drawLoss(L, rect, k, o = {}) {
	const [x, y, w, h] = rect, a = o.alpha ?? 1, col = o.color ?? "#ffd27a", dim = o.dim ?? "#65708a";
	const lo = Math.log(1.5), hi = Math.log(12), Y = (v) => y + h - (Math.log(v) - lo) / (hi - lo) * h;
	const n = 360, m = Math.max(1, Math.floor(n * clamp(k)));
	L.draw((g) => {
		g.globalAlpha *= a;
		g.strokeStyle = dim;
		g.lineWidth = 1;
		g.globalAlpha *= .7;
		g.beginPath();
		g.moveTo(x, y);
		g.lineTo(x, y + h);
		g.lineTo(x + w, y + h);
		g.stroke();
		for (const v of [
			2,
			4,
			8
		]) {
			g.beginPath();
			g.moveTo(x - 6, Y(v));
			g.lineTo(x, Y(v));
			g.stroke();
		}
		g.globalAlpha /= .7;
		g.strokeStyle = col;
		g.lineWidth = 1.6;
		g.shadowColor = col;
		g.shadowBlur = 6;
		g.beginPath();
		for (let i = 0; i <= m; i++) {
			const s = i / n * LOSS.steps, px = x + i / n * w, py = Y(lossAt(Math.max(1, s)));
			i ? g.lineTo(px, py) : g.moveTo(px, py);
		}
		g.stroke();
	});
	const st = {
		size: o.size ?? 15,
		font: MONO,
		weight: 500,
		align: "left",
		alpha: a
	};
	for (const v of [
		2,
		4,
		8
	]) L.text(String(v), x - 12, Y(v), {
		...st,
		align: "right",
		color: dim
	});
	L.text("loss", x, y - 16, {
		...st,
		color: dim
	});
	L.text("step", x + w, y + h + 20, {
		...st,
		align: "right",
		color: dim
	});
	if (k > 0) {
		const s = Math.round(clamp(k) * LOSS.steps), v = lossAt(Math.max(1, s)), px = x + clamp(k) * w, py = Y(v);
		L.text(`${String(s).replace(/\B(?=(\d{3})+(?!\d))/g, " ")}   ${v.toFixed(3)}`, Math.min(px + 12, x + w - 150), py - 18, {
			...st,
			color: col
		});
	}
}
/**
* A word split into tokens, each a rounded box with its bytes underneath (UTF-8, hex): a tokenizer's view of the
* sung word. times: when each token appears. cx, cy: centre of the row (design px).
*/
function drawTokens(L, tokens, times, t, cx, cy, o = {}) {
	const size = o.size ?? 100, st = {
		size,
		font: MONO,
		weight: 800,
		align: "left"
	}, pad = size * .22, gap = size * .16, a0 = o.alpha ?? 1;
	const cols = o.colors ?? ["#ff6fa8", "#ffd27a"];
	const ws = tokens.map((s) => L.measure(s, st) + pad * 2), W = ws.reduce((s, v) => s + v, 0) + gap * (tokens.length - 1);
	let x = cx - W / 2;
	tokens.forEach((tok, i) => {
		const k = ease.outBack(seg(t, times[i], times[i] + .14), 1.4), a = seg(t, times[i], times[i] + .06) * a0, bw = ws[i], bh = size * 1.28;
		if (a > 0) {
			const c = cols[i % cols.length], s = .86 + .14 * k, bx = x + bw / 2, by = cy;
			L.draw((g) => {
				g.globalAlpha *= a;
				g.translate(bx, by);
				g.scale(s, s);
				g.fillStyle = c;
				g.globalAlpha *= .2;
				g.beginPath();
				g.roundRect(-bw / 2, -bh / 2, bw, bh, size * .16);
				g.fill();
				g.globalAlpha /= .2;
				g.strokeStyle = c;
				g.lineWidth = 2.2;
				g.stroke();
			});
			L.text(tok, bx, by + size * .04, {
				...st,
				align: "center",
				color: o.ink ?? "#fff4ec",
				alpha: a,
				scale: s,
				glow: 10,
				glowColor: c
			});
			const bytes = [...new TextEncoder().encode(tok)].map((b) => b.toString(16).toUpperCase().padStart(2, "0")).join(" ");
			L.text(bytes, bx, by + bh / 2 + size * .3, {
				size: size * .19,
				font: MONO,
				weight: 500,
				align: "center",
				color: o.dim ?? "#9aa3b8",
				alpha: a * .9
			});
		}
		x += bw + gap;
	});
	return W;
}
var MASKS = /* @__PURE__ */ new Map();
/**
* inside(x, y) for a word set in `font` and centred at the origin, in world units where `height` is the cap height;
* `bold` thickens the strokes (px at the font's size). Rasterised once, cached.
*/
function wordMask(word, { font = "800 200px \"JetBrains Mono\"", height = 2, tracking = 0, bold = 0 } = {}) {
	const key = `${word}|${font}|${height}|${tracking}|${bold}`;
	if (MASKS.has(key)) return MASKS.get(key);
	const c = document.createElement("canvas"), g = c.getContext("2d", { willReadFrequently: true });
	g.font = font;
	if ("letterSpacing" in g) g.letterSpacing = `${tracking}px`;
	const px = parseFloat(font.match(/(\d+)px/)[1]), W = Math.ceil(g.measureText(word).width + px), H = Math.ceil(px * 1.4);
	c.width = W;
	c.height = H;
	g.font = font;
	if ("letterSpacing" in g) g.letterSpacing = `${tracking}px`;
	g.fillStyle = "#fff";
	g.textBaseline = "middle";
	g.textAlign = "center";
	g.fillText(word, W / 2, H / 2);
	if (bold > 0) {
		g.strokeStyle = "#fff";
		g.lineWidth = bold;
		g.lineJoin = "round";
		g.strokeText(word, W / 2, H / 2);
	}
	const d = g.getImageData(0, 0, W, H).data, k = px * .72 / height;
	const inside = (x, y) => {
		const i = Math.round(W / 2 + x * k), j = Math.round(H / 2 - y * k);
		return i >= 0 && j >= 0 && i < W && j < H && d[(j * W + i) * 4 + 3] > 127;
	};
	const out = {
		inside,
		width: W / k,
		height: H / k
	};
	MASKS.set(key, out);
	return out;
}
/**
* One exchange in the Claude Code terminal: the question typed in the prompt box, sent (it moves into the
* transcript), the thinking line, then the streamed answer. s: { typed (0..1), sent (time since Enter, s), think
* (seconds the thinking line shows), answer (array of [text, colour]) }. Returns the y below the last line.
*/
function exchange(L, x, y, q, s, t, o = {}) {
	const size = o.size ?? 34, lh = size * 1.55, grey = "#8a8f98";
	const st = {
		size,
		font: MONO,
		weight: 500,
		align: "left"
	};
	let yy = y;
	if (s.sent >= 0) {
		L.text(">", x, yy, {
			...st,
			color: grey,
			alpha: o.alpha ?? 1
		});
		L.text(q, x + L.measure("> ", st), yy, {
			...st,
			color: grey,
			alpha: o.alpha ?? 1
		});
		yy += lh * 1.35;
		if (s.sent < s.think) thinking(L, x, yy, t, {
			size,
			verb: o.verb ?? "Pondering",
			T: o.T,
			count: { from: 0 },
			alpha: o.alpha ?? 1
		});
		else {
			const t0 = s.think;
			s.answer.forEach(([text, col, rate], i) => {
				const shownT = s.sent - t0 - i * .12;
				if (shownT < 0) return;
				if (i === 0) assistant(L, x, yy, text, {
					size,
					t: shownT,
					t0: 0,
					rate: rate ?? 80,
					color: col,
					alpha: o.alpha ?? 1
				});
				else L.text(text.slice(0, Math.ceil(text.length * clamp(shownT * (rate ?? 80) / text.length))), x + L.measure("M", st) * 2, yy, {
					...st,
					size: size * .72,
					color: col ?? grey,
					alpha: o.alpha ?? 1
				});
				yy += i === 0 ? lh : lh * .8;
			});
		}
	}
	return yy;
}
//#endregion
export { LOSS, drawLoss, drawTokens, exchange, lossAt, wordMask };
