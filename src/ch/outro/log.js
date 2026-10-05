import { HEX } from "../../theme.js?v=Bj33PIbo";
import { drawLogo, logoSize, logoWidth } from "./logo.js?v=C-Y9DxnD";
//#region src/ch/outro/log.js
/** Split a line into typing tokens: `free(icosa)` → free ( icosa ); `// Music — Mili` → // ␣Music ␣— ␣Mili. */
function tokens(str) {
	return str.match(/\s*[^\s()[\];,]+|\s*[()[\];,]/g) ?? [];
}
/**
* An entry: { t0, spans: [[text, color?, kind?], …], step (s per token), prompt ('> '), credit (credits keep their
* colours and stay readable as they scroll up), full (already printed: a lyric line from before) }. A span of kind
* 'logo' is the FrostNovaOrg wordmark (outro/logo.js) and its text must be the mark's letters.
*/
function entry(t0, spans, o = {}) {
	const sp = typeof spans === "string" ? [[spans]] : spans, text = sp.map((s) => s[0]).join("");
	const tk = tokens(text), cum = [];
	let c = 0;
	for (const k of tk) cum.push(c += k.length);
	return {
		t0,
		spans: sp,
		text,
		cum,
		step: o.step ?? .1154,
		prompt: o.prompt ?? "> ",
		credit: !!o.credit,
		full: !!o.full,
		tEnd: t0 + (tk.length - 1) * (o.step ?? .1154)
	};
}
/** Characters of an entry printed at t. */
function printed(e, t) {
	if (t < e.t0) return 0;
	if (e.full) return e.text.length;
	return e.cum[Math.min(e.cum.length - 1, Math.floor((t - e.t0) / e.step + 1e-6))] ?? 0;
}
/**
* Draw the log: the last `keep` entries that have started. o: x, y (baseline of the newest line), size, keep, accent
* (glow of the newest line and the caret), alpha, glow, ages ([alpha of age 0, 1, 2] for plain lines).
*/
function drawLog(L, t, entries, o = {}) {
	const size = o.size ?? 30, lh = size * 1.45, keep = o.keep ?? 3, x = o.x ?? 110, y = o.y ?? 930, A = o.alpha ?? 1;
	if (A <= .002) return;
	const style = {
		size,
		weight: 500,
		font: "JetBrains Mono",
		align: "left"
	};
	const live = entries.filter((e) => e.t0 <= t).slice(-keep), WHITE = o.ink ?? HEX.white;
	live.forEach((e, k) => {
		const age = live.length - 1 - k, yy = y - age * lh, n = printed(e, t);
		const a = (e.credit ? [
			1,
			.8,
			.66
		] : o.ages ?? [
			1,
			.45,
			.22
		])[Math.min(age, 2)] * A * (e.fade ? e.fade(t) : 1);
		if (a <= .002) return;
		let xx = x, left = n;
		if (e.prompt) {
			L.text(e.prompt, xx, yy, {
				...style,
				color: age === 0 || e.credit ? WHITE : HEX.dim,
				alpha: a * (e.credit ? .5 : 1),
				glow: age === 0 ? o.glow ?? 10 : 0,
				glowColor: o.accent ?? HEX.me
			});
			xx += L.measure(e.prompt, style);
		}
		for (const [s, col, kind] of e.spans) {
			if (left <= 0) break;
			const part = s.slice(0, left);
			left -= part.length;
			const glow = age === 0 ? o.glow ?? 10 : e.credit ? 4 : 0;
			if (kind === "logo") {
				drawLogo(L, xx, yy, logoSize(size), {
					chars: part.length,
					alpha: a,
					glow,
					glowColor: o.accent ?? HEX.me
				});
				xx += logoWidth(L, logoSize(size), part.length);
				continue;
			}
			const c = e.credit ? col ?? WHITE : age === 0 ? col ?? WHITE : HEX.dim;
			L.text(part, xx, yy, {
				...style,
				color: c,
				alpha: a,
				glow,
				glowColor: o.accent ?? HEX.me
			});
			xx += L.measure(part, style);
		}
		if (age === 0 && !e.full && t < e.tEnd + .14) L.text("█", xx + size * .1, yy, {
			...style,
			color: o.accent ?? HEX.me,
			alpha: .85 * A
		});
	});
}
/** love's lyric lines (non-caps) since `from`, as already-printed entries (the consoleLog state at the cut). */
function lyricEntries(T, from, to) {
	return T.lines.filter((l) => !l.caps && l.start >= from && l.start < to).map((l) => ({
		...entry(l.start, l.text, { full: true }),
		end: l.end
	}));
}
//#endregion
export { drawLog, entry, lyricEntries, printed, tokens };
