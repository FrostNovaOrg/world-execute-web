import { clamp, rng } from "../../engine/math.js?v=BJIlRm7-";
//#region src/ch/intro/histogram.js
/** He-normal weights: `total` samples of N(0, 2/fanIn), their bins, and checkpoint counts for partial histograms. */
function heInit({ total = 262144, fanIn = 512, bins = 41, span = 3.6, checkpoints = 256, seed = 23 } = {}) {
	const sigma = Math.sqrt(2 / fanIn), g = rng(seed), w = new Float32Array(total);
	for (let i = 0; i < total; i += 2) {
		const u = Math.max(g(), 1e-12), v = g(), r = Math.sqrt(-2 * Math.log(u));
		w[i] = r * Math.cos(2 * Math.PI * v) * sigma;
		if (i + 1 < total) w[i + 1] = r * Math.sin(2 * Math.PI * v) * sigma;
	}
	const lo = -span * sigma, width = 2 * span * sigma / bins, cp = new Float32Array((checkpoints + 1) * bins), cur = new Float32Array(bins);
	for (let c = 1; c <= checkpoints; c++) {
		const a = Math.floor(total * (c - 1) / checkpoints), b = Math.floor(total * c / checkpoints);
		for (let i = a; i < b; i++) {
			const k = Math.floor((w[i] - lo) / width);
			if (k >= 0 && k < bins) cur[k]++;
		}
		cp.set(cur, c * bins);
	}
	return {
		total,
		fanIn,
		sigma,
		bins,
		span,
		lo,
		width,
		cp,
		checkpoints
	};
}
/** Bin counts after the first `k` samples (linear between checkpoints). */
function heCounts(H, k) {
	const x = clamp(k / H.total) * H.checkpoints, c = Math.min(H.checkpoints - 1, Math.floor(x)), f = x - c, out = new Float32Array(H.bins);
	for (let i = 0; i < H.bins; i++) out[i] = H.cp[c * H.bins + i] * (1 - f) + H.cp[(c + 1) * H.bins + i] * f;
	return out;
}
/**
* Draw the histogram panel on a text layer (design px): axes, the ideal density N(0, σ²) as a thin curve (the target),
* bars of the samples drawn so far, ±σ ticks and the labels. o: x, y (top-left), w, h, k (samples drawn), alpha,
* color (bars), dim (axes, labels), accent (curve), size (label px, ≥ 14).
*/
function drawHeHistogram(L, H, o = {}) {
	const x = o.x ?? 1360, y = o.y ?? 560, w = o.w ?? 400, h = o.h ?? 180, a = o.alpha ?? 1, k = o.k ?? H.total;
	const col = o.color ?? "#7ef0ff", dim = o.dim ?? "#5b6475", acc = o.accent ?? "#dfe7f5", size = o.size ?? 15;
	if (a <= .01) return;
	const counts = heCounts(H, k), peak = H.total * H.width / (H.sigma * Math.sqrt(2 * Math.PI)), base = y + h;
	const bw = w / H.bins, X = (v) => x + (v - H.lo) / (H.width * H.bins) * w, Y = (c) => base - c / peak * h * .92;
	L.draw((g) => {
		g.globalAlpha *= a;
		g.strokeStyle = dim;
		g.lineWidth = 1.2;
		g.beginPath();
		g.moveTo(x, base + .5);
		g.lineTo(x + w, base + .5);
		g.stroke();
		for (let s = -3; s <= 3; s++) {
			const px = X(s * H.sigma);
			g.beginPath();
			g.moveTo(px, base);
			g.lineTo(px, base + (s === 0 ? 9 : 6));
			g.stroke();
		}
		g.fillStyle = col;
		for (let i = 0; i < H.bins; i++) {
			const top = Y(counts[i]);
			if (base - top < .5) continue;
			g.globalAlpha = a * .8;
			g.fillRect(x + i * bw + 1, top, bw - 2, base - top);
		}
		g.globalAlpha = a * .9;
		g.strokeStyle = acc;
		g.lineWidth = 1.5;
		g.beginPath();
		for (let i = 0; i <= 160; i++) {
			const v = H.lo + i / 160 * H.width * H.bins, c = H.total * H.width * Math.exp(-.5 * (v / H.sigma) ** 2) / (H.sigma * Math.sqrt(2 * Math.PI));
			if (i) g.lineTo(X(v), Y(c));
			else g.moveTo(X(v), Y(c));
		}
		g.stroke();
	});
	const st = {
		size,
		font: "JetBrains Mono",
		weight: 500,
		alpha: a
	};
	L.text("He init   W ~ N(0, 2/n)", x, y - 22, {
		...st,
		align: "left",
		color: acc,
		weight: 600
	});
	L.text(`n = ${H.fanIn}   σ = ${H.sigma.toFixed(4)}`, x + w, y - 22, {
		...st,
		align: "right",
		color: dim
	});
	L.text("−3σ", X(-3 * H.sigma), base + 24, {
		...st,
		color: dim
	});
	L.text("0", X(0), base + 24, {
		...st,
		color: dim
	});
	L.text("+3σ", X(3 * H.sigma), base + 24, {
		...st,
		color: dim
	});
	const drawn = Math.round(clamp(k / H.total) * H.total), fmt = (v) => String(v).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
	L.text(`weights  ${fmt(drawn)} / ${fmt(H.total)}`, x + w, base + 50, {
		...st,
		align: "right",
		color: dim
	});
}
//#endregion
export { drawHeHistogram, heCounts, heInit };
