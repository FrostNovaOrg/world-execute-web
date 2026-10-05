import { FILES, PROJECT, fileUrl } from "./config.js?v=BkWxxfxi";
import { fract } from "./math.js?v=BJIlRm7-";
//#region src/engine/timing.js
/** Index of the last element <= t, or -1. */
function lastLE(arr, t) {
	let lo = 0, hi = arr.length - 1, ans = -1;
	while (lo <= hi) {
		const m = lo + hi >> 1;
		if (arr[m] <= t) {
			ans = m;
			lo = m + 1;
		} else hi = m - 1;
	}
	return ans;
}
/** Fractional index of t in a rising time grid, extrapolated linearly past both ends. */
function gridPos(g, t) {
	const n = g.length;
	if (n < 2) return NaN;
	const i = lastLE(g, t);
	if (i < 0) return (t - g[0]) / (g[1] - g[0]);
	if (i >= n - 1) return n - 1 + (t - g[n - 1]) / (g[n - 1] - g[n - 2]);
	return i + (t - g[i]) / (g[i + 1] - g[i]);
}
/** Inverse of gridPos: time of fractional index x. */
function gridTime(g, x) {
	const n = g.length;
	if (n < 2) return NaN;
	if (x <= 0) return g[0] + x * (g[1] - g[0]);
	if (x >= n - 1) return g[n - 1] + (x - (n - 1)) * (g[n - 1] - g[n - 2]);
	const i = Math.floor(x);
	return g[i] + (x - i) * (g[i + 1] - g[i]);
}
var Timing = class Timing {
	/** onsets: the measured drum hits and sung onsets ({ drums: [[t, strength], …], vocals: […] }; analysis/onsets.py). */
	constructor(data, { provisional = false, onsets = null } = {}) {
		this.provisional = provisional;
		this.duration = data.audio?.duration ?? PROJECT.duration;
		this.bpm = data.tempo?.bpm ?? 0;
		this.beats = data.beats ?? [];
		this.beatLen = this.beats.length > 1 ? (this.beats.at(-1) - this.beats[0]) / (this.beats.length - 1) : 60 / (this.bpm || 120);
		this.onsets = {
			drums: (onsets?.drums ?? []).map((r) => r[0]),
			vocals: (onsets?.vocals ?? []).map((r) => r[0])
		};
		this.downbeats = data.downbeats ?? [];
		this.sections = data.sections ?? [{
			id: "all",
			label: "all",
			start: 0,
			end: this.duration
		}];
		this.lines = (data.lines ?? []).map((l, i) => ({
			...l,
			i,
			words: l.words ?? []
		}));
		this.words = [];
		for (const l of this.lines) l.words.forEach((w, j) => this.words.push({
			...w,
			line: l.i,
			j
		}));
		this.lineStarts = this.lines.map((l) => l.start);
		this.wordStarts = this.words.map((w) => w.start);
		this.sectionStarts = this.sections.map((s) => s.start);
		this.notes = data.notes ?? [];
		this.title = data.title ?? PROJECT.title;
		this.preroll = PROJECT.preroll ?? 0;
		this.clockZero = PROJECT.clockZero ?? 0;
	}
	/** A Timing straight from parsed JSON (tests, tools): timing.json's object and, optionally, onsets.json's. */
	static from(data, onsets = null) {
		return new Timing(data, { onsets });
	}
	beatAt(t) {
		return gridPos(this.beats, t);
	}
	beatTime(x) {
		return gridTime(this.beats, x);
	}
	barAt(t) {
		return gridPos(this.downbeats, t);
	}
	barTime(x) {
		return gridTime(this.downbeats, x);
	}
	/** 0..1 position inside the current beat (0 exactly on the beat). */
	beatPhase(t) {
		const b = this.beatAt(t);
		return Number.isFinite(b) ? fract(b) : 0;
	}
	barPhase(t) {
		const b = this.barAt(t);
		return Number.isFinite(b) ? fract(b) : 0;
	}
	/** 1 on each beat, decaying exponentially until the next one; `div` subdivides (2 = eighths). 0 before the first beat. */
	pulse(t, k = 6, div = 1) {
		if (this.beats.length < 2 || t < this.beats[0] - .001) return 0;
		return Math.exp(-fract(this.beatAt(t) * div) * k);
	}
	/** Same as pulse() but on downbeats. */
	barPulse(t, k = 4) {
		if (this.downbeats.length < 2 || t < this.downbeats[0] - .001) return 0;
		return Math.exp(-fract(this.barAt(t)) * k);
	}
	/** Nearest beat time to t (for snapping hits). */
	snapBeat(t, div = 1) {
		return this.beatTime(Math.round(this.beatAt(t) * div) / div);
	}
	/** The measured onset ('drums' or 'vocals') nearest to t, or null when none lies within tol seconds of it. */
	onsetNear(kind, t, tol = .06) {
		const a = this.onsets[kind], i = lastLE(a, t);
		let best = null;
		for (const k of [i, i + 1]) if (k >= 0 && k < a.length && Math.abs(a[k] - t) <= tol && (best == null || Math.abs(a[k] - t) < Math.abs(best - t))) best = a[k];
		return best;
	}
	section(id) {
		const s = this.sections.find((s) => s.id === id);
		if (!s) throw new Error(`timing: unknown section '${id}' (have: ${this.sections.map((s) => s.id).join(", ")})`);
		return s;
	}
	sectionAt(t) {
		return this.sections[Math.max(0, lastLE(this.sectionStarts, t))];
	}
	line(i) {
		return this.lines[i];
	}
	/** Line being sung at t; with hold, keep showing it until the next line starts. */
	lineAt(t, { hold = false } = {}) {
		const i = lastLE(this.lineStarts, t);
		if (i < 0) return null;
		const l = this.lines[i];
		if (t < l.end) return l;
		if (hold && (i + 1 >= this.lines.length || t < this.lines[i + 1].start)) return l;
		return null;
	}
	wordAt(t) {
		const i = lastLE(this.wordStarts, t);
		if (i < 0) return null;
		const w = this.words[i];
		return t < w.end ? w : null;
	}
	/**
	* Lines containing `text`, in order, in "smart case": a query in lower case matches any case; a query with a capital
	* matches exactly as typed, so a key word ('RESONANCE') finds its all-caps line, not an earlier line that has the word.
	*/
	findLines(text) {
		const exact = text !== text.toLowerCase(), q = exact ? text : text.toLowerCase();
		return this.lines.filter((l) => (exact ? l.text : l.text.toLowerCase()).includes(q));
	}
	/** The nth (0-based) line containing `text`. Throws if missing, so a typo fails loudly. */
	findLine(text, nth = 0) {
		const hits = this.findLines(text);
		if (!hits[nth]) throw new Error(`timing: no line #${nth} containing '${text}' (found ${hits.length})`);
		return hits[nth];
	}
	/** Lines overlapping [a, b). */
	linesIn(a, b) {
		return this.lines.filter((l) => l.end > a && l.start < b);
	}
};
/** True for a shouted key word: every letter upper case, at least three letters (non-Latin text never counts). */
function isCaps(text) {
	return (text.match(/[A-Za-z]/g) ?? []).length >= 3 && text === text.toUpperCase();
}
/** Parse a line-level LRC ([mm:ss.xxx]text; NetEase's JSON credit lines are skipped) into provisional lines. */
function parseLRC(txt, duration) {
	const lines = [];
	for (const raw of txt.split(/\r?\n/)) {
		const m = raw.match(/^\[(\d+):(\d+(?:\.\d+)?)\](.*)$/);
		if (m) lines.push({
			text: m[3].trim(),
			lrcStart: +m[1] * 60 + +m[2]
		});
	}
	lines.forEach((l, i) => {
		const next = i + 1 < lines.length ? lines[i + 1].lrcStart : duration;
		l.start = l.lrcStart;
		l.end = Math.min(next, l.start + Math.max(.4, l.text.length * .09));
		const ws = l.text.split(/\s+/).filter(Boolean), d = (l.end - l.start) / ws.length;
		l.words = ws.map((w, j) => ({
			text: w,
			start: l.start + j * d,
			end: l.start + (j + 1) * d,
			score: null
		}));
		l.caps = isCaps(l.text);
	});
	return lines;
}
async function loadTiming() {
	try {
		const r = await fetch(fileUrl(FILES.timing), { cache: "no-store" });
		if (r.ok) {
			const data = await r.json();
			let onsets = null;
			try {
				const o = await fetch(fileUrl(FILES.onsets), { cache: "no-store" });
				if (o.ok) onsets = await o.json();
			} catch {}
			return new Timing(data, { onsets });
		}
	} catch {}
	const txt = await (await fetch(fileUrl(FILES.lrc))).text();
	console.warn("timing.json not found: using provisional LRC timing (no beats, words spread evenly)");
	return new Timing({
		audio: { duration: PROJECT.duration },
		lines: parseLRC(txt, PROJECT.duration)
	}, { provisional: true });
}
//#endregion
export { Timing, isCaps, loadTiming, parseLRC };
