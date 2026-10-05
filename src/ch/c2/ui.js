import { clamp, hash } from "../../engine/math.js?v=BJIlRm7-";
import { HEX } from "../../theme.js?v=Bj33PIbo";
import "../../lib/hud.js?v=BgmSZjmG";
//#region src/ch/c2/ui.js
var GLYPHS = "01<>/\\[]{}()=+*#%&$@!?;:ABCDEFGHIJKLMNOPQRSTUVWXYZ";
/** Characters of line `l` typed by time t, exactly as consoleLog types them (word timing from the alignment). */
function typed(l, t) {
	let s = "";
	for (const w of l.words) {
		if (t < w.start) break;
		const n = w.text.length, k = t >= w.end ? n : Math.max(1, Math.ceil(n * clamp((t - w.start) / Math.max(.05, (w.end - w.start) * .8))));
		s += (s ? " " : "") + w.text.slice(0, k);
	}
	return s;
}
/**
* The console during "You have left" ×6: every repetition stays on screen, stacked, oldest on top and dimmest, so the
* log itself piles up. Identical consecutive lines carry a repeat count on the right, the way a devtools console
* collapses a message logged again and again. o: x, y (newest baseline), size, accent, alpha, color (newest line),
* dim (older lines), glow (0 for ink on paper).
*/
function stackLog(layer, t, lines, o = {}) {
	const size = o.size ?? 27, lh = size * 1.42, x = o.x ?? 110, y = o.y ?? 930;
	const shown = lines.filter((l) => l.start <= t), style = {
		size,
		weight: 500,
		font: "JetBrains Mono",
		align: "left"
	};
	let count = 0;
	shown.forEach((l, k) => {
		const age = shown.length - 1 - k, yy = y - age * lh, s = typed(l, t);
		count = k > 0 && l.text.toLowerCase() === shown[k - 1].text.toLowerCase() ? count + 1 : 1;
		const a = (age === 0 ? 1 : .46 * .8 ** (age - 1)) * (o.alpha ?? 1);
		layer.text("> " + s, x, yy, {
			...style,
			color: age === 0 ? o.color ?? HEX.white : o.dim ?? HEX.dim,
			alpha: a,
			glow: age === 0 ? o.glow ?? 10 : 0,
			glowColor: o.accent ?? HEX.me
		});
		const w = layer.measure("> " + s, style);
		if (count > 1) layer.text(`×${count}`, x + w + size * .7, yy, {
			...style,
			size: size * .62,
			weight: 600,
			color: o.accent ?? HEX.me,
			alpha: a * .9
		});
		if (age === 0 && t < l.end + .15 && Math.floor(t * 4) % 2 === 0) layer.text("█", x + w + size * .1, yy, {
			...style,
			color: o.accent ?? HEX.me,
			alpha: .85 * (o.alpha ?? 1)
		});
	});
}
/**
* A word written around a ring (projected world circle), letters appearing as a sweep passes them, each letter
* decoding for a moment before it locks. ring(u) → design [x, y] for u in 0..1 (clockwise from the top).
* o: size, color, glow, glowColor, sweep (0..1), from (u where the text starts), span (fraction of the ring), t.
*/
function ringLegend(layer, word, ring, o = {}) {
	const n = word.length, span = o.span ?? 1, from = o.from ?? 0, sweep = o.sweep ?? 1, f = Math.floor((o.t ?? 0) * 30);
	for (let i = 0; i < n; i++) {
		if (word[i] === " ") continue;
		const u = from + span * (i + .5) / n;
		const lock = u - from + .04, show = sweep - (u - from);
		if (show < -.06) continue;
		const p = ring(u % 1), q = ring((u + .002) % 1), ang = Math.atan2(q[1] - p[1], q[0] - p[0]);
		const ch = sweep >= lock ? word[i] : GLYPHS[Math.floor(hash(i * 13.1 + f * 3.7) * 50)];
		const a = clamp((show + .06) / .06);
		layer.text(ch, p[0], p[1], {
			size: o.size ?? 52,
			weight: 800,
			font: "JetBrains Mono",
			color: o.color ?? HEX.white,
			alpha: a * (o.alpha ?? 1),
			rot: ang,
			glow: o.glow ?? 18,
			glowColor: o.glowColor ?? HEX.me
		});
	}
}
/** Small tick-marked progress dial drawn in design space around a projected ring (percent label at the head). */
function dialTicks(layer, ring, k, o = {}) {
	const n = o.ticks ?? 60, c = o.color ?? HEX.me, al = o.alpha ?? .6;
	layer.draw((g) => {
		g.globalAlpha *= al;
		g.strokeStyle = c;
		g.lineWidth = 1.1;
		for (let i = 0; i < n; i++) {
			const u = i / n;
			if (u > k + 1e-6) break;
			const p = ring(u), q = ring((u + .5) % 1), cx = (p[0] + q[0]) / 2, cy = (p[1] + q[1]) / 2;
			const dx = p[0] - cx, dy = p[1] - cy, L = Math.hypot(dx, dy) || 1, len = i % 5 ? 6 : 12;
			g.beginPath();
			g.moveTo(p[0], p[1]);
			g.lineTo(p[0] + dx / L * len, p[1] + dy / L * len);
			g.stroke();
		}
	});
}
//#endregion
export { dialTicks, ringLegend, stackLog, typed };
