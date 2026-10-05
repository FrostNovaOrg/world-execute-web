import { __exportAll } from "../../_virtual/_rolldown/runtime.js?v=BLEs9rMG";
import { clamp, hash2 } from "../engine/math.js?v=BJIlRm7-";
//#region src/lib/claude.js
var claude_exports = /* @__PURE__ */ __exportAll({
	CLAUDE: () => CLAUDE,
	COLORS: () => COLORS,
	MONO: () => MONO,
	SPIN: () => SPIN,
	VERBS: () => VERBS,
	assistant: () => assistant,
	elapsedAt: () => elapsedAt,
	fmtElapsed: () => fmtElapsed,
	fmtTokens: () => fmtTokens,
	promptBox: () => promptBox,
	spinGlyph: () => spinGlyph,
	thinking: () => thinking,
	toolCall: () => toolCall,
	turnElapsed: () => turnElapsed,
	turnTokens: () => turnTokens,
	verbAt: () => verbAt,
	workedFor: () => workedFor
});
var CLAUDE = "#d97757";
var SHINE = "#f3b59a";
var GREY = "#8a8f98";
var DIM = "#5b606b";
var WHITE = "#e8e8e8";
var OK = "#6fbf73";
/** The CLI's colours, for lines of your own that sit among these helpers: the orange, its bright band, greys, white, the green of a tool call. */
var COLORS = Object.freeze({
	claude: CLAUDE,
	shine: SHINE,
	grey: GREY,
	dim: DIM,
	white: WHITE,
	ok: OK
});
/**
* The CLI is set in a monospace font and columns are placed with the advance of "M", so the font must be monospace.
* The template ships JetBrains Mono. It has none of the spinner, bullet and elbow glyphs (✢ ✳ ✶ ✻ ✽ ⏺ ⎿): those come
* from the machine's fonts (README.md, known limits). Every helper takes `font` to use another family.
*/
var MONO = "JetBrains Mono";
/** x modulo m, never negative (the spinner and the shimmer also run in the pre-roll, at negative song time). */
var wrap = (x, m) => {
	const r = x % m;
	return r < 0 ? r + m : r;
};
/** What every helper starts from: the size (the helper's own default), the opacity and the text style (monospace, left aligned). */
var base = (o, size) => {
	const s = o.size ?? size;
	return {
		size: s,
		a: o.alpha ?? 1,
		st: {
			size: s,
			font: o.font ?? "JetBrains Mono",
			weight: 500,
			align: "left"
		}
	};
};
/** The spinner cycles through these glyphs and back (as the CLI does), about 8 frames a second. */
var SPIN = Object.freeze([
	"·",
	"✢",
	"✳",
	"✶",
	"✻",
	"✽"
]);
function spinGlyph(t, fps = 8) {
	const n = SPIN.length, k = wrap(Math.floor(t * fps), 2 * n - 2);
	return SPIN[k < n ? k : 2 * n - 2 - k];
}
/** "38m 32s", "12s", "1h 04m". */
function fmtElapsed(s) {
	s = Math.max(0, Math.floor(s));
	if (s < 60) return `${s}s`;
	if (s < 3600) return `${Math.floor(s / 60)}m ${s % 60}s`;
	return `${Math.floor(s / 3600)}h ${String(Math.floor(s / 60) % 60).padStart(2, "0")}m`;
}
/** "842 tokens", "5.5k tokens". */
var fmtTokens = (n) => n < 1e3 ? `${Math.round(n)} tokens` : `${(n / 1e3).toFixed(1)}k tokens`;
/** Spinner verbs, as the CLI picks them (a sample of its whimsical gerunds). The verb changes now and then. */
var VERBS = Object.freeze([
	"Recombobulating",
	"Cogitating",
	"Percolating",
	"Ruminating",
	"Pondering",
	"Synthesizing",
	"Computing",
	"Clauding",
	"Reticulating",
	"Noodling",
	"Crunching",
	"Musing",
	"Deliberating",
	"Conjuring",
	"Transmuting",
	"Marinating",
	"Contemplating",
	"Coalescing",
	"Wrangling",
	"Divining"
]);
/**
* The spinner's verb at song time t: one of `verbs`, a new pick every `every` seconds (counted from t0), chosen from t
* and `seed` alone, so it is the same on every render and in every worker.
*/
function verbAt(t, { verbs = VERBS, every = 4.5, t0 = 0, seed = 0 } = {}) {
	const slot = Math.floor((t - t0) / every);
	return verbs[Math.floor(hash2(slot, seed) * verbs.length)];
}
var zeroOf = (T) => T?.clockZero ?? 0;
/** Seconds since the turn began, at song time t (T.clockZero; 0 when T has none). Never negative. Mind the order: (t, T). */
var turnElapsed = (t, T) => Math.max(0, t - zeroOf(T));
/** Tokens `source` has said by song time t: the items streamed over their time, or the function's count. */
function said(source, t, chars) {
	if (typeof source === "function") return Math.max(0, Math.floor(Number(source(t)) || 0));
	let n = 0;
	for (const w of source ?? []) {
		if (w.start > t) continue;
		const k = Math.max(1, Math.ceil(String(w.text ?? "").length / chars));
		n += t >= w.end ? k : Math.ceil(k * (t - w.start) / Math.max(.05, w.end - w.start));
	}
	return n;
}
/**
* Tokens emitted by the turn so far, at song time t: what the turn says, streamed as it is said, plus a steady trickle
* of "thinking" tokens so the count keeps moving between lines. Mind the order: (T, t, options).
* Both parts count from `from` (default: the clock's zero, T.clockZero, like the elapsed time): what the source said
* before it is not the turn's (the part of a word sung before it is dropped), so at `from` the count is 0, and before it
* the count stays at 0 while the clock runs.
*   source  what the turn says. A list of { text, start, end }: the default is T.words (every sung word), T.lines or a
*           list of your own works too, in any order. Each item streams in over [start, end] at about one token per
*           `chars` characters, at least one token per item. Or a function t => count, for a count that is not made of
*           words. Or null: no words, only the trickle.
*   tps     tokens a second of trickle (0: no trickle)
*   chars   characters per token
*   from    the song time the count starts from (omitted or null: T.clockZero). 0 with a preroll: the clock runs through
*           the preroll and the tokens start with the song.
*/
function turnTokens(T, t, opts) {
	const { source = T?.words, tps = 21, chars = 4 } = opts ?? {}, from = opts?.from ?? zeroOf(T);
	const spoken = t > from ? said(source, t, chars) - said(source, from, chars) : 0;
	return Math.max(0, spoken) + Math.floor(Math.max(0, t - from) * tps);
}
/**
* The thinking status line: `✻ Recombobulating… (1m 9s · ↓ 1.6k tokens)`. The glyph spins, a bright band sweeps across
* the verb, and by default everything is alive:
*   verb     a fixed verb, or omit it and the verb changes every `every` seconds (4.5), picked from `verbs` (VERBS) by
*            verbAt() (`t0`, `seed` shift the picks)
*   elapsed  'turn' (default when T is given: the film's clock), seconds, a string, or null to hide
*   tokens   'turn' (default when T is given: the running count), a number, a string, or null to hide
*   count    for tokens 'turn': { source, tps, chars, from } of turnTokens(), where the count comes from
*   T        the Timing (ctx.T): the clock's zero and the words the count is made of
*   interrupt  adds "esc to interrupt";  arrow  the token arrow (↓)
*   glyph    a fixed glyph in place of the spinner;  shimmer  false to stop the sweep;  shimmerSpeed  (.9)
*   size (26), alpha (1), font (MONO)
* x, y: left, vertical middle, in design units.
*/
function thinking(L, x, y, t, o = {}) {
	const { a, st } = base(o, 26);
	const verb = `${o.verb ?? verbAt(t, o)}…`;
	L.text(o.glyph ?? spinGlyph(t), x, y, {
		...st,
		color: CLAUDE,
		alpha: a
	});
	const adv = L.measure("M", st), x0 = x + adv * 2;
	const band = wrap(t * (o.shimmerSpeed ?? .9), 1.4) * (verb.length + 6) - 3;
	[...verb].forEach((ch, i) => {
		const k = o.shimmer === false ? 0 : Math.exp(-((i - band) ** 2) / 4);
		L.text(ch, x0 + i * adv, y, {
			...st,
			color: k > .5 ? SHINE : CLAUDE,
			alpha: a * (.82 + .18 * k)
		});
	});
	const T = o.T, parts = [];
	const el = o.elapsed === void 0 ? T ? "turn" : null : o.elapsed, tk = o.tokens === void 0 ? T ? "turn" : null : o.tokens;
	if (el != null) parts.push(el === "turn" ? fmtElapsed(turnElapsed(t, T)) : typeof el === "number" ? fmtElapsed(el) : el);
	if (tk != null) parts.push(`${o.arrow ?? "↓"} ${tk === "turn" ? fmtTokens(turnTokens(T, t, o.count)) : typeof tk === "number" ? fmtTokens(tk) : tk}`);
	if (o.interrupt) parts.push("esc to interrupt");
	if (parts.length) L.text(`(${parts.join(" · ")})`, x0 + (verb.length + 1) * adv, y, {
		...st,
		color: GREY,
		alpha: a
	});
}
/** The completion line: `✻ Worked for 3m 26s` (secs: a number of seconds or a string; turnElapsed(t, T) for the film's clock). */
function workedFor(L, x, y, secs, o = {}) {
	const { a, st } = base(o, 26);
	L.text("✻", x, y, {
		...st,
		color: CLAUDE,
		alpha: a
	});
	L.text(`${o.verb ?? "Worked"} for ${typeof secs === "number" ? fmtElapsed(secs) : secs}`, x + L.measure("M", st) * 2, y, {
		...st,
		color: GREY,
		alpha: a
	});
}
/**
* The prompt input box: a rounded border, `> ` and the typed text with a block cursor, and an optional hint line
* below ("? for shortcuts"). x, y: top-left; w: width (design px). text may be partially typed by the caller.
*   text    what is typed so far (one line)
*   t       the song time: the cursor is on for half a second, then off for half a second; omit it for a cursor that
*           is always on
*   cursor  false to hide the cursor;  hint  a string, or false for none
*   border  the border colour;  size (26), alpha (1), font (MONO)
*/
function promptBox(L, x, y, w, o = {}) {
	const { size, a, st } = base(o, 26), h = size * 2.1;
	L.draw((g) => {
		g.globalAlpha *= a * .9;
		g.strokeStyle = o.border ?? DIM;
		g.lineWidth = 1.5;
		const r = size * .45;
		g.beginPath();
		g.roundRect(x, y, w, h, r);
		g.stroke();
	});
	const ty = y + h / 2, px = x + size * .8;
	L.text(">", px, ty, {
		...st,
		color: WHITE,
		alpha: a
	});
	const tx = px + L.measure("> ", st);
	if (o.text) L.text(o.text, tx, ty, {
		...st,
		color: WHITE,
		alpha: a
	});
	if (o.cursor !== false && (o.t == null || Math.floor(o.t * 2) % 2 === 0)) L.text("█", tx + (o.text ? L.measure(o.text, st) : 0), ty, {
		...st,
		color: WHITE,
		alpha: a * .85
	});
	if (o.hint !== false) L.text(o.hint ?? "? for shortcuts", x + size * .8, y + h + size * .9, {
		...st,
		size: size * .72,
		color: DIM,
		alpha: a
	});
}
/**
* An assistant message, one line: `⏺ ` and the text streamed from t0 at `rate` characters per second (whole words appear
* as tokens do: the text is cut at spaces, so punctuation comes with its word and text without spaces comes whole).
* Returns the number of characters shown. The bullet is drawn from the first call, so call it from the moment the
* answer begins. A longer answer is one call a line, each with its own t0.
*   t       the song time; omit it to show the whole text
*   t0 (0), rate (40)
*   bullet  the bullet's colour;  color  the text's;  size (26), alpha (1), font (MONO)
*/
function assistant(L, x, y, text, o = {}) {
	const { a, st } = base(o, 26);
	let cut = o.t == null ? text.length : Math.floor(clamp((o.t - (o.t0 ?? 0)) * (o.rate ?? 40), 0, text.length));
	while (cut < text.length && cut > 0 && /\S/.test(text[cut])) cut++;
	const shown = text.slice(0, cut);
	L.text("⏺", x, y, {
		...st,
		color: o.bullet ?? WHITE,
		alpha: a
	});
	L.text(shown, x + L.measure("M", st) * 2, y, {
		...st,
		color: o.color ?? WHITE,
		alpha: a
	});
	return shown.length;
}
/**
* A tool call: `⏺ Bash(node render.mjs --frames)` then result lines under `  ⎿  `. The first line is drawn from the
* first call; the result lines come as `show` grows.
*   lines   the result lines; show (0..1, default 1) reveals them from the first one on
*   bullet  the bullet's colour (green; a failed call is red);  size (24), alpha (1), font (MONO)
*/
function toolCall(L, x, y, name, arg, lines = [], o = {}) {
	const { size, a, st } = base(o, 24), lh = size * 1.5, adv = L.measure("M", st);
	L.text("⏺", x, y, {
		...st,
		color: o.bullet ?? OK,
		alpha: a
	});
	L.text(name, x + adv * 2, y, {
		...st,
		weight: 700,
		color: WHITE,
		alpha: a
	});
	L.text(`(${arg})`, x + adv * (2 + name.length), y, {
		...st,
		color: GREY,
		alpha: a
	});
	const show = Math.floor((o.show ?? 1) * lines.length + 1e-6);
	lines.slice(0, show).forEach((ln, i) => {
		if (i === 0) L.text("⎿", x + adv * 2, y + lh, {
			...st,
			color: DIM,
			alpha: a
		});
		L.text(ln, x + adv * 5, y + lh * (i + 1), {
			...st,
			color: GREY,
			alpha: a
		});
	});
}
/** A clock of its own, for a thinking line that does not use the film's: e0 plus the seconds since t0 (e0 before t0). */
var elapsedAt = (t, t0, e0 = 0) => e0 + Math.max(0, t - t0);
//#endregion
export { CLAUDE, COLORS, MONO, SPIN, VERBS, assistant, claude_exports, elapsedAt, fmtElapsed, fmtTokens, promptBox, spinGlyph, thinking, toolCall, turnElapsed, turnTokens, verbAt, workedFor };
