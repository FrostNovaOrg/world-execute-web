import { __exportAll } from "../../_virtual/_rolldown/runtime.js?v=BLEs9rMG";
//#region src/subs/schedule.js
var schedule_exports = /* @__PURE__ */ __exportAll({
	SUBS: () => SUBS,
	subtitleAt: () => subtitleAt,
	subtitleEvents: () => subtitleEvents,
	subtitleKey: () => subtitleKey
});
var SUBS = Object.freeze({
	fadeIn: .1,
	fadeOut: .2,
	hold: 1
});
/**
* The subtitles in order: [{ i, text, start, end, fadeIn, fadeOut, row, accent }].
*   T      the film's Timing (src/engine/timing.js): lines with i, start, end; sections
*   lines  { [L index]: text }: the translation (a missing or null entry: that line has no subtitle)
*   o      { skip: [section ids], silent: [L indices], rows: [T => [from, to]], accent: (T, t) => colour, hold,
*          fadeIn, fadeOut }
*          skip: sections a subtitle may not run into (instrumentals); silent: lines the film does not subtitle even
*          though the translation has them; rows: time ranges where something else sits on the subtitles' row (a
*          subtitle shown mostly inside one drops a row: row 1); accent: the colour of the style's mark for a line
*          starting at t (null: the style's own).
*/
function subtitleEvents(T, lines, o = {}) {
	const S = {
		...SUBS,
		...o
	}, silent = new Set(o.silent ?? []);
	const shown = T.lines.filter((l) => lines[l.i] != null && lines[l.i] !== "" && !silent.has(l.i));
	const stops = (o.skip ?? []).map((id) => T.section(id).start), busy = (o.rows ?? []).map((f) => f(T));
	const ev = shown.map((l, k) => {
		const next = shown[k + 1]?.start ?? Infinity;
		let end = Math.min(next, l.end + S.hold);
		for (const s of stops) if (s > l.start && s < end) end = s;
		const over = busy.reduce((m, [a, b]) => Math.max(m, Math.min(b, end) - Math.max(a, l.start)), 0);
		return {
			i: l.i,
			text: lines[l.i],
			start: l.start,
			end,
			fadeOut: end < next,
			row: over > (end - l.start) / 2 ? 1 : 0,
			accent: o.accent?.(T, l.start) ?? null
		};
	});
	ev.forEach((e, k) => {
		e.fadeIn = k === 0 || ev[k - 1].end < e.start;
	});
	return ev;
}
/** The subtitle on screen at song time t: { i, text, row, accent, alpha }, or null. ev: subtitleEvents(…). */
function subtitleAt(ev, t, o = {}) {
	const S = {
		...SUBS,
		...o
	};
	let lo = 0, hi = ev.length - 1, k = -1;
	while (lo <= hi) {
		const m = lo + hi >> 1;
		if (ev[m].start <= t) {
			k = m;
			lo = m + 1;
		} else hi = m - 1;
	}
	const e = ev[k];
	if (!e || t >= e.end) return null;
	const ramp = (d, len) => d >= len - 1e-9 ? 1 : d / len;
	const a = (e.fadeIn ? ramp(t - e.start, S.fadeIn) : 1) * (e.fadeOut ? ramp(e.end - t, S.fadeOut) : 1);
	return a > 0 ? {
		i: e.i,
		text: e.text,
		row: e.row,
		accent: e.accent,
		alpha: a
	} : null;
}
/** What a subtitle picture depends on: frames with the same key look the same (drawn once, then reused). */
var subtitleKey = (s) => s ? `L${s.i}_${s.row}_${Math.round(s.alpha * 255)}` : "empty";
//#endregion
export { SUBS, schedule_exports, subtitleAt, subtitleEvents, subtitleKey };
