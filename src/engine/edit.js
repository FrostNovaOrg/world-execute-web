import { PROJECT } from "./config.js?v=BkWxxfxi";
import { THEME } from "../theme.js?v=Bj33PIbo";
//#region src/engine/edit.js
/** One frame at the master's rate: how early HIT, VOX and SYL put a cut. */
var LEAD = 1 / PROJECT.fps;
var beat0 = (T, sec) => Math.round(T.beatAt(T.section(sec).start));
var B = (sec, beat) => (T) => T.beatTime(beat0(T, sec) + beat);
var W = (i, j = 0) => (T) => T.line(i).words.at(j).start;
var HIT = (sec, beat, { tol = .06 } = {}) => (T) => {
	const g = B(sec, beat)(T), h = T.onsetNear("drums", g, tol);
	if (h == null) throw new Error(`no drum hit within ${Math.round(tol * 1e3)} ms of ${sec} beat ${beat} (${g.toFixed(3)} s)`);
	return h - LEAD;
};
var VOX = (i, j = 0, { tol = .08 } = {}) => (T) => {
	const w = W(i, j)(T);
	return Math.min(w, T.onsetNear("vocals", w, tol) ?? w) - LEAD;
};
var SYL = (sec, beat, { tol = .09 } = {}) => (T) => {
	const g = B(sec, beat)(T), h = T.onsetNear("vocals", g, tol);
	if (h == null) throw new Error(`no sung onset within ${Math.round(tol * 1e3)} ms of ${sec} beat ${beat} (${g.toFixed(3)} s)`);
	return h - LEAD;
};
var cut = (o = {}) => ({
	type: "cut",
	...o
});
var whip = (frames = 6, o = {}) => ({
	type: "relay",
	dur: frames / PROJECT.fps,
	bias: 1,
	move: "whip",
	...o
});
var glide = (beats = 1, o = {}) => ({
	type: "relay",
	dur: (T) => beats * T.beatLen,
	bias: .5,
	move: "glide",
	...o
});
var points = (dur = .5, o = {}) => ({
	type: "points",
	dur,
	bias: .5,
	...o
});
/** A cross-fade from the cut on, `frames` long: where a sound held over the cut carries the outgoing picture out. */
var xfade = (frames = 10, o = {}) => ({
	type: "fade",
	dur: frames / PROJECT.fps,
	bias: 0,
	...o
});
/** The colour exposure ramps go to and come from when a join names none. */
var rampColour = (join) => join.rampCol ?? THEME.rampCol;
/**
* Whose text layers (labels, read-outs, the key word) are drawn during a relay, the outgoing shot's ('a') or the
* incoming one's ('b'); m is how far the picture has changed hands (0..1). They are never cross-faded. In a glide they
* change hands half-way. In a whip the incoming shot's are drawn from the first frame: its labels are pinned to its own
* subject, so they ride the camera into place and are already where they belong when it stops on the beat (changing
* hands in the middle of six frames makes a label jump across the frame).
*/
var textLead = (join, m) => join.move === "whip" || m >= .5 ? "b" : "a";
/**
* The same edit with every camera relay replaced by a hard cut (same shots, same content, same time for each, only the
* joins differ: the version to show next to a relay version). over: rows that differ, e.g. a relay that sat off the beat
* gets a beat.
*/
function hardCuts(rows, over = {}) {
	const out = {};
	for (const [id, r] of Object.entries(rows)) {
		const j = r.join;
		out[id] = j?.type === "relay" ? {
			...r,
			join: cut({
				punch: j.punch,
				rampIn: j.rampIn,
				rampOut: j.rampOut
			})
		} : r;
	}
	for (const [id, r] of Object.entries(over)) out[id] = {
		...out[id],
		...r
	};
	return out;
}
var EDITS = {};
/**
* Register named edits ({ name: rows }). May be called more than once (a module's sample chapter adds its own edit);
* a name registered twice is an error. 'orig' is reserved: it means no table.
*/
function defineEdits(map) {
	for (const [name, rows] of Object.entries(map)) {
		if (name === "orig") throw new Error("edit name 'orig' is reserved (the chapters' own times, no table)");
		if (EDITS[name]) throw new Error(`edit '${name}' is defined twice`);
		EDITS[name] = rows;
	}
}
/** The table for an edit name: null for 'orig' (the chapters' own times and transitions). */
function editTable(name) {
	if (name === "orig") return null;
	if (!EDITS[name]) throw new Error(`unknown edit '${name}' (have: orig, ${Object.keys(EDITS).join(", ")})`);
	return {
		name,
		rows: EDITS[name]
	};
}
//#endregion
export { B, HIT, LEAD, SYL, VOX, W, cut, defineEdits, editTable, glide, hardCuts, points, rampColour, textLead, whip, xfade };
