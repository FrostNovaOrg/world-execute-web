import { PROJECT } from "./config.js?v=BkWxxfxi";
//#region src/engine/timeline.js
var CHAPTERS = [];
function chapter(def) {
	if (CHAPTERS.some((c) => c.id === def.id)) throw new Error(`duplicate chapter id '${def.id}'`);
	CHAPTERS.push(def);
	return def;
}
var resolve = (v, T) => typeof v === "function" ? v(T) : v;
var Timeline = class {
	/** edit: { name, rows } from editTable(), or null for 'orig'. chapters: defaults to the registered ones. */
	constructor(T, problems = [], { edit = null, chapters = CHAPTERS } = {}) {
		this.T = T;
		this.edit = edit;
		this.problems = [...problems];
		this.shots = [];
		const rows = edit?.rows ?? {}, seen = /* @__PURE__ */ new Set();
		const frame = 1 / PROJECT.fps;
		for (const ch of chapters) {
			let list = [];
			try {
				list = ch.shots ?? ch.shotsFor?.(T) ?? [];
			} catch (e) {
				this.problems.push(`${ch.id}: ${e.message}`);
			}
			list.forEach((s, i) => {
				const id = `${ch.id}/${s.id ?? i}`, row = rows[id] ?? null;
				seen.add(id);
				if (row?.off || s.editOnly && !edit || Array.isArray(s.editOnly) && !s.editOnly.includes(edit.name)) return;
				let start = NaN, join = { type: "cut" };
				try {
					start = resolve(row?.at ?? s.at, T);
				} catch (e) {
					this.problems.push(`${id}: ${e.message}`);
				}
				if (!Number.isFinite(start) && row?.at != null) try {
					start = resolve(s.at, T);
				} catch {}
				if (!Number.isFinite(start)) {
					this.problems.push(`${id}: start is ${start}; shot skipped`);
					return;
				}
				if (row?.join) join = {
					bias: .5,
					param: [
						0,
						0,
						0,
						0
					],
					...row.join,
					dur: resolve(row.join.dur, T) ?? 0
				};
				else if (s.transitionIn) join = {
					type: "fade",
					dur: .4,
					bias: .5,
					param: [
						0,
						0,
						0,
						0
					],
					...s.transitionIn
				};
				this.shots.push({
					id,
					chapter: ch,
					def: s,
					start,
					row,
					join,
					stateful: !!s.stateful,
					ownsLyrics: !!(s.ownsLyrics ?? ch.ownsLyrics),
					transitionIn: join.type === "cut" ? null : join
				});
			});
		}
		const loaded = new Set(chapters.map((c) => c.id));
		for (const id of Object.keys(rows)) if (!seen.has(id) && loaded.has(id.split("/")[0])) this.problems.push(`edit '${edit.name}': the row '${id}' names no shot`);
		const real = this.shots.filter((s) => !s.chapter.fallback);
		this.shots = this.shots.filter((s) => !s.chapter.fallback || !real.some((r) => r.start >= s.start - .1 && r.start < s.start + 1.5 * frame));
		this.shots.sort((a, b) => a.start - b.start);
		this.shots.forEach((s, i) => {
			s.index = i;
			s.end = i + 1 < this.shots.length ? this.shots[i + 1].start : T.duration + 1;
		});
		this.starts = this.shots.map((s) => s.start);
		if (!this.shots.length) this.problems.push("no shots registered");
		else if (this.shots[0].start > 1e-6) this.problems.push(`first shot starts at ${this.shots[0].start.toFixed(3)} s, not 0`);
		else {
			const song = this.shots.find((s) => s.start > -1e-6);
			if (song && song.start > 1e-6 && song.index > 0) this.problems.push(`${this.shots[song.index - 1].id} runs into the song: its first shot (${song.id}) starts at ${song.start.toFixed(3)} s, not 0`);
		}
		for (let i = 1; i < this.shots.length; i++) if (this.shots[i].start - this.shots[i - 1].start < frame) this.problems.push(`${this.shots[i - 1].id} and ${this.shots[i].id} start less than a frame apart`);
		for (let i = 1; i < this.shots.length; i++) {
			const s = this.shots[i], q = this.shots[i - 1], w = s.transitionIn, v = q.transitionIn;
			if (w && v && s.start - w.dur * w.bias < q.start + v.dur * (1 - v.bias) - 1e-6) this.problems.push(`the join windows of ${q.id} and ${s.id} overlap`);
		}
		const slack = edit ? .1 : 1e-6;
		for (const ch of chapters) {
			if (ch.fallback || ch.from == null && ch.to == null) continue;
			let from = -Infinity, to = Infinity;
			try {
				from = resolve(ch.from ?? -Infinity, T);
				to = resolve(ch.to ?? Infinity, T);
			} catch (e) {
				this.problems.push(`${ch.id}: ${e.message}`);
			}
			for (const s of this.shots.filter((s) => s.chapter === ch)) if (s.start < from - slack || s.start >= to) this.problems.push(`${s.id} starts at ${s.start.toFixed(3)} s, outside chapter ${ch.id} [${from.toFixed(3)}, ${to.toFixed(3)})`);
		}
		this.problems.forEach((p) => console.warn("timeline:", p));
	}
	/** The start the edit gives a shot ('chapter/shot'), or null if the shot is not in this edit. */
	startOf(id) {
		return this.shots.find((s) => s.id === id)?.start ?? null;
	}
	shotAt(t) {
		let lo = 0, hi = this.starts.length - 1, ans = 0;
		while (lo <= hi) {
			const m = lo + hi >> 1;
			if (this.starts[m] <= t) {
				ans = m;
				lo = m + 1;
			} else hi = m - 1;
		}
		return this.shots[ans];
	}
	/** What to draw at t: { a } or, while a transition runs, { a: outgoing, b: incoming, p: 0..1 }. */
	at(t) {
		const cur = this.shotAt(t), next = this.shots[cur.index + 1];
		if (next?.transitionIn) {
			const { dur, bias } = next.transitionIn, a = next.start - dur * bias;
			if (t >= a) return {
				a: cur,
				b: next,
				p: (t - a) / dur
			};
		}
		if (cur.transitionIn && cur.index > 0) {
			const { dur, bias } = cur.transitionIn, a = cur.start - dur * bias;
			if (t < a + dur) return {
				a: this.shots[cur.index - 1],
				b: cur,
				p: (t - a) / dur
			};
		}
		return { a: cur };
	}
};
//#endregion
export { Timeline, chapter };
