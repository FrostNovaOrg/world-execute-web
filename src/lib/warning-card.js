import { ease, seg } from "../engine/math.js?v=BJIlRm7-";
/** The share of the frame kept clear on every side: the title-safe area. */
var SAFE_MARGIN = .05;
/** The shortest pause the timing keeps between the last line coming in and the clear. A shorter pre-roll scales the timing down. */
var MIN_HOLD = 1.5;
var OPEN = "{{";
/** t through [a, b] as 0..1; a range of no length is a step. */
var ramp = (t, a, b) => b > a ? seg(t, a, b) : +(t >= a);
var CJK = /[\u3000-\u9FFF\uAC00-\uD7AF\uF900-\uFAFF\uFE30-\uFE4F\uFF00-\uFFEF]|[\u{20000}-\u{3FFFF}]/u;
/** Whether str has CJK characters, which need a CJK font (PROJECT.fontFallback). */
var hasCJK = (str) => CJK.test(String(str ?? ""));
/** Whether any line of the card has CJK text. */
var needsCJK = (cfg) => (cfg?.lines ?? []).some((l) => hasCJK(`${l.gutter ?? ""}${l.tag ?? ""}${l.text ?? ""}`));
/**
* A string's width as a monospace face with a CJK fallback sets it: 0.6 em a Latin character (JetBrains Mono), one em a
* CJK character. For the checks only; the page measures for real.
*/
function estimateWidth(str, size) {
	let em = 0;
	for (const ch of String(str ?? "")) em += CJK.test(ch) ? 1 : .6;
	return em * size;
}
/** The title-safe rectangle of a frame. */
var safeArea = (design, margin = SAFE_MARGIN) => ({
	left: design.width * margin,
	right: design.width * (1 - margin),
	top: design.height * margin,
	bottom: design.height * (1 - margin)
});
/** The type of a kind of line (the `tag` part of the style is the tag's, see tagStyleOf). */
function styleOf(cfg, kind) {
	const { tag, ...s } = cfg.styles?.[kind] ?? {};
	return {
		font: cfg.font,
		size: cfg.size,
		weight: 500,
		...s
	};
}
/** The type of a line's tag (a header's `warning[W0001]`): the kind's own, with the tag's changes. */
var tagStyleOf = (cfg, kind) => ({
	...styleOf(cfg, kind),
	...cfg.styles?.[kind]?.tag ?? {}
});
/** The type of the gutter column. */
var gutterStyleOf = (cfg) => ({
	font: cfg.font,
	size: cfg.size,
	weight: 600,
	...cfg.gutter
});
/** The waiting cursor's size in design px. */
var cursorSize = (cfg) => ({
	w: cfg.size * (cfg.cursor?.em?.[0] ?? .5),
	h: cfg.size * (cfg.cursor?.em?.[1] ?? 1.1)
});
/**
* When things happen on a card of n lines that lasts `pre` seconds, in card time (0 is the first frame of the film). The
* lines come in from the start and the clear is counted back from the end, so a longer pre-roll lengthens the pause in
* the middle. A pre-roll too short for the timing (less than its lines-in, MIN_HOLD and tail) scales the whole timing
* down, so the clear and the cursor's return still finish before the card ends.
*   lineIn[i]   line i starts to appear (for `fade` seconds)
*   cursorIn    the waiting cursor fades in over this range
*   clearAt[i]  line i is gone: the bottom line first, then each one above, `clearStep` later
*   home        the cursor goes home (as the last line is gone)
*/
function cardTimes(pre, n, timing) {
	const tm = timing, need = tm.first + Math.max(0, n - 1) * tm.step + tm.fade + MIN_HOLD + tm.tail;
	const k = pre >= need ? 1 : Math.max(0, pre) / need;
	const clear = pre - tm.tail * k, back = tm.clearStep * k;
	return {
		pre,
		n,
		k,
		fade: tm.fade * k,
		blink: tm.blink,
		lineIn: Array.from({ length: n }, (_, i) => (tm.first + i * tm.step) * k),
		cursorIn: [tm.cursorAt * k, (tm.cursorAt + tm.cursorFade) * k],
		clearAt: Array.from({ length: n }, (_, i) => clear + (n - 1 - i) * back),
		home: clear + n * back
	};
}
/**
* What the card shows at card time t: `lines[i]` the opacity of line i (0: not there yet, or cleared), `cursor` the
* opacity of the cursor waiting under them (0 once it has gone home; it blinks on its own clock: lit for `blink`
* seconds, then at `dim` for `blink` seconds), `home` whether the cursor is home.
*/
function cardAt(t, times, { dim = .2 } = {}) {
	const lines = times.lineIn.map((t0, i) => t >= times.clearAt[i] ? 0 : ease.outCubic(ramp(t, t0, t0 + times.fade)));
	const home = t >= times.home, lit = times.blink > 0 ? Math.floor(t / times.blink) % 2 === 0 : true;
	return {
		lines,
		home,
		cursor: home ? 0 : ramp(t, times.cursorIn[0], times.cursorIn[1]) * (lit ? 1 : dim)
	};
}
/** The card starts with the pre-roll. */
var cardStart = (T) => -T.preroll;
/** The chapter's shots: the card, if the film has a pre-roll to put it in, otherwise none (the first shot starts at 0). */
var cardShots = (T, shot) => (T?.preroll ?? 0) > 0 ? [shot] : [];
/**
* Where everything goes, in a frame of `design` size. measure(str, style) is the text layer's (or any monospace
* stand-in; the same order of arguments as checkConfig). The block is the gutter
* column (right-aligned at gx), the lines' text a `gap` to its right, a line without a gutter (the header) from the
* leftmost gutter glyph, and the cursor's row under the last line. cfg.x / cfg.y 'center' centre the block on the
* frame by its widest line and by its rows; a number places the gutter column's right edge / the first line's centre.
* Returns { gx, y0, rows: [{ y, x, tagW }], left, right, top, bottom, cursor: { x, y, w, h } } (x of a row: where its tag,
* or its text, starts).
*/
function layoutCard(cfg, design, measure) {
	const lines = cfg.lines, n = lines.length, lh = cfg.lineHeight, gap = cfg.gap, gut = gutterStyleOf(cfg);
	const has = (l) => !!(l.gutter ?? "").trim();
	const gutterW = Math.max(0, ...lines.map((l) => measure((l.gutter ?? "").trim(), gut)));
	const rel = lines.map((l) => {
		const tagW = l.tag ? measure(l.tag, tagStyleOf(cfg, l.kind)) : 0;
		return {
			x: has(l) ? gap : -gutterW,
			tagW,
			w: tagW + measure((l.tag ? ": " : "") + l.text, styleOf(cfg, l.kind))
		};
	});
	const left = -gutterW, right = Math.max(left, ...rel.map((r) => r.x + r.w));
	const gx = cfg.x === "center" ? (design.width - (right - left)) / 2 - left : cfg.x;
	const y0 = cfg.y === "center" ? design.height / 2 - n * lh / 2 : cfg.y;
	const cur = cursorSize(cfg), bodyX = lines.some(has) ? gap : -gutterW;
	return {
		gx,
		y0,
		left: gx + left,
		right: gx + right,
		top: y0 - cfg.size / 2,
		bottom: y0 + n * lh + cur.h / 2,
		rows: rel.map((r, i) => ({
			y: y0 + i * lh,
			x: gx + r.x,
			tagW: r.tagW
		})),
		cursor: {
			x: Math.round(gx + bodyX),
			y: Math.round(y0 + n * lh - cur.h / 2),
			...cur
		}
	};
}
/** A solid rectangle on a text layer, the way the demo's boot cursor is drawn (a glow, if asked for, is a shadow under it). */
function paintCursor(layer, r, alpha, c) {
	if (!(alpha > .002)) return;
	layer.draw((g, s) => {
		g.globalAlpha *= alpha;
		g.fillStyle = c.color;
		if (c.glow) {
			g.shadowColor = c.glowColor ?? c.color;
			g.shadowBlur = c.glow * s;
			g.fillRect(r.x, r.y, r.w, r.h);
			g.shadowBlur = 0;
		}
		g.fillRect(r.x, r.y, r.w, r.h);
	});
}
/**
* The shot's draw: the card at ctx.t on the overlay layer (the cursor on cfg.cursor.layer), and the grade of the moment.
* The cursor's own keys (all optional; left out, the cursor is drawn as it always was): `offset` [dx, dy] moves the
* waiting cursor after the layout has put it on whole pixels; `waitGlow` is its glow while it waits (default: `glow`,
* which is then the glow at home); `homeBeat` true makes the cursor at home lit in the first half of every beat
* (ctx.T.beatPhase) and at `homeDim` (default 0: not drawn) in the second, as a first shot's cursor that blinks on the beat.
*/
function drawCard(ctx, cfg, design) {
	const L = ctx.text.overlay, pre = ctx.T.preroll;
	const st = cardAt(ctx.t + pre, cardTimes(pre, cfg.lines.length, cfg.timing), cfg.cursor);
	const lay = layoutCard(cfg, design, (s, o) => L.measure(s, o)), gut = gutterStyleOf(cfg);
	cfg.lines.forEach((line, i) => {
		const a = st.lines[i], row = lay.rows[i];
		if (!(a > 0)) return;
		if ((line.gutter ?? "").trim()) L.text(line.gutter, lay.gx, row.y, {
			...gut,
			align: "right",
			alpha: a * (gut.alpha ?? 1)
		});
		const s = styleOf(cfg, line.kind), body = {
			...s,
			align: "left",
			alpha: a * (s.alpha ?? 1)
		};
		if (line.tag) {
			const tg = tagStyleOf(cfg, line.kind);
			L.text(line.tag, row.x, row.y, {
				...tg,
				align: "left",
				alpha: a * (tg.alpha ?? 1)
			});
			L.text(": " + line.text, row.x + row.tagW, row.y, body);
		} else L.text(line.text, row.x, row.y, body);
	});
	const c = cfg.cursor, [dx, dy] = c.offset ?? [0, 0];
	const homeA = !c.homeBeat ? 1 : ctx.T.beatPhase(ctx.t) < .5 ? 1 : c.homeDim ?? 0;
	const wait = {
		...lay.cursor,
		x: lay.cursor.x + dx,
		y: lay.cursor.y + dy
	};
	paintCursor(ctx.text[c.layer], st.home ? c.home : wait, st.home ? homeA : st.cursor, {
		...c,
		glow: st.home ? c.glow : c.waitGlow ?? c.glow
	});
	Object.assign(ctx.post, st.home ? cfg.homeLook : cfg.look);
}
/**
* What is wrong with a card config, as a list of messages (empty: it is sound; a broken config is reported, never
* thrown on): the lines (at most MAX_LINES, every kind one of `styles`, text present, gutter and tag strings, no
* placeholder left over), the numbers, the timing (the cursor must be home before the card ends), the cursor (layer,
* colour, size, home, and offset, waitGlow, homeBeat, homeDim when they are given), and that the card, set at this size
* and line height (the waiting cursor where its offset moves it), stays inside the title-safe area.
* measure: how wide a string is (default: a monospace estimate; the page could pass the text layer's).
*/
function checkConfig(cfg, design = {
	width: 1920,
	height: 1080
}, measure = (s, o) => estimateWidth(s, o.size)) {
	const bad = [], ok = (v, min = -Infinity) => Number.isFinite(v) && v >= min;
	if (!cfg || !Array.isArray(cfg.lines) || !cfg.lines.length) return ["lines: at least one line is needed"];
	const kinds = Object.keys(cfg.styles ?? {});
	if (cfg.lines.length > 4) bad.push(`lines: ${cfg.lines.length} lines; the card holds at most 4, what can be read in a few seconds`);
	cfg.lines.forEach((l, i) => {
		if (!kinds.includes(l?.kind)) bad.push(`lines[${i}]: kind '${l?.kind}' is not one of ${kinds.join(", ") || "styles (which is empty)"}`);
		if (typeof l?.text !== "string" || !l.text) bad.push(`lines[${i}]: text must be a non-empty string`);
		for (const k of ["gutter", "tag"]) if (l?.[k] != null && typeof l[k] !== "string") bad.push(`lines[${i}]: ${k} must be a string`);
		for (const k of [
			"gutter",
			"tag",
			"text"
		]) if (typeof l?.[k] === "string" && l[k].includes(OPEN)) bad.push(`lines[${i}]: ${k} still has a placeholder (${l[k]})`);
	});
	if (!(typeof cfg.font === "string" && cfg.font)) bad.push("font: a font family name is needed");
	if (!ok(cfg.size, 1)) bad.push("size: a positive number of design pixels is needed");
	if (!ok(cfg.lineHeight, cfg.size)) bad.push("lineHeight: at least the size");
	if (!ok(cfg.gap, 0)) bad.push("gap: a number of design pixels, 0 or more");
	for (const k of ["x", "y"]) if (cfg[k] !== "center" && !ok(cfg[k])) bad.push(`${k}: 'center' or a number of design pixels`);
	const tm = cfg.timing ?? {};
	for (const k of [
		"first",
		"step",
		"fade",
		"cursorAt",
		"cursorFade",
		"tail",
		"clearStep"
	]) if (!ok(tm[k], 0)) bad.push(`timing.${k}: seconds, 0 or more`);
	if (!ok(tm.blink, .05)) bad.push("timing.blink: seconds, at least 0.05");
	if (ok(tm.tail, 0) && ok(tm.clearStep, 0) && cfg.lines.length * tm.clearStep > tm.tail) bad.push(`timing: ${cfg.lines.length} lines cleared ${tm.clearStep} s apart take longer than the tail (${tm.tail} s), so the cursor would not be home before the card ends`);
	const c = cfg.cursor ?? {}, h = c.home ?? {};
	if (!["overlay", "scene"].includes(c.layer)) bad.push(`cursor.layer: 'overlay' or 'scene' (got ${JSON.stringify(c.layer)})`);
	if (typeof c.color !== "string" || !c.color) bad.push("cursor.color: a CSS colour (HEX.subject); without one the cursor is drawn black on black");
	if (!ok(c.dim, 0) || c.dim > 1) bad.push("cursor.dim: 0 to 1");
	if (!(Array.isArray(c.em) && c.em.length === 2 && c.em.every((v) => ok(v, .05)))) bad.push("cursor.em: [width, height] in ems of the type");
	if (!(ok(h.x, 0) && ok(h.y, 0) && ok(h.w, 1) && ok(h.h, 1) && h.x + h.w <= design.width && h.y + h.h <= design.height)) bad.push("cursor.home: { x, y, w, h } inside the frame");
	if (c.offset !== void 0 && !(Array.isArray(c.offset) && c.offset.length === 2 && c.offset.every((v) => ok(v)))) bad.push("cursor.offset: [dx, dy] in design pixels");
	if (c.waitGlow !== void 0 && !ok(c.waitGlow, 0)) bad.push("cursor.waitGlow: design px of glow, 0 or more (left out: glow)");
	if (c.homeBeat !== void 0 && typeof c.homeBeat !== "boolean") bad.push("cursor.homeBeat: true or false");
	if (c.homeDim !== void 0 && !(ok(c.homeDim, 0) && c.homeDim <= 1)) bad.push("cursor.homeDim: 0 to 1");
	for (const k of ["look", "homeLook"]) if (!cfg[k] || typeof cfg[k] !== "object") bad.push(`${k}: an object of post parameters`);
	if (!bad.length) {
		const lay = layoutCard(cfg, design, measure), safe = safeArea(design), r = (v) => Math.round(v);
		const [dx, dy] = cfg.cursor.offset ?? [0, 0], cx = lay.cursor.x + dx;
		lay.bottom += Math.max(0, dy);
		lay.left = Math.min(lay.left, cx);
		lay.right = Math.max(lay.right, cx + lay.cursor.w);
		if (lay.top < safe.top || lay.bottom > safe.bottom) bad.push(`the card runs from y ${r(lay.top)} to ${r(lay.bottom)}; the title-safe area is ${r(safe.top)} to ${r(safe.bottom)} (size ${cfg.size}, lineHeight ${cfg.lineHeight}, ${cfg.lines.length} lines and the cursor)`);
		if (lay.left < safe.left || lay.right > safe.right) bad.push(`the card runs from x ${r(lay.left)} to ${r(lay.right)}; the title-safe area is ${r(safe.left)} to ${r(safe.right)} (shorten the longest line or lower size)`);
	}
	return bad;
}
//#endregion
export { MIN_HOLD, SAFE_MARGIN, cardAt, cardShots, cardStart, cardTimes, checkConfig, cursorSize, drawCard, estimateWidth, gutterStyleOf, hasCJK, layoutCard, needsCJK, safeArea, styleOf, tagStyleOf };
