import { megapixels } from "./quality.js?v=CPQ5syAY";
//#region src/player/pick.js
/** [fixed, pixel] ms of a shot on the reference machine (the table's default for a shot it does not list). */
var terms = (cost, id) => cost.shots[id] ?? cost.default;
/** The predicted frame time of a shot at height h on the reference machine. */
var shotMs = (cost, id, h = 1080) => {
	const [a, b] = terms(cost, id);
	return a + b * megapixels(h);
};
/**
* A time inside shot i where only that shot is on screen: the middle of the stretch after its own join window and
* before the next shot's (timeline.at() blends two shots inside a join window), kept inside [from, to]. A shot with
* no such stretch gives the middle of its stretch of the film; null when none of it is inside [from, to].
*/
function midTime(shots, i, from = -Infinity, to = Infinity) {
	const s = shots[i], n = shots[i + 1], j = i > 0 ? s.transitionIn : null, k = n?.transitionIn;
	const lo = Math.max(from, s.start), hi = Math.min(to, s.end);
	if (!(hi > lo)) return null;
	const pa = Math.max(lo, j ? s.start + j.dur * (1 - j.bias) : -Infinity), pb = Math.min(hi, k ? n.start - k.dur * k.bias : Infinity);
	return pb - pa > .05 ? (pa + pb) / 2 : (lo + hi) / 2;
}
/**
* The shots to time when the player starts, so that the two factors of the device model (fixed and per-pixel cost) can
* be told apart: the shot dearest in pixels, a middling one, and the one dearest in fixed cost. [{ id, t }, …] in that
* order. Shots the table does not list are used only when it lists too few. count: how many (at most).
*/
function pickCalibration(cost, shots, { from = 0, to = Infinity, h = 540, count = 3 } = {}) {
	const here = shots.map((s, i) => ({
		s,
		t: midTime(shots, i, from, to)
	})).filter((r) => r.t != null);
	const known = here.filter((r) => cost.shots[r.s.id]);
	const pool = (known.length >= Math.min(2, count) ? known : here).map((r) => ({
		...r,
		a: terms(cost, r.s.id)[0],
		b: terms(cost, r.s.id)[1],
		ms: shotMs(cost, r.s.id, h)
	}));
	const out = [], taken = /* @__PURE__ */ new Set();
	const take = (r) => {
		if (r && !taken.has(r)) {
			taken.add(r);
			out.push({
				id: r.s.id,
				t: r.t
			});
		}
	};
	const dearest = (key) => pool.filter((r) => !taken.has(r)).sort((x, y) => y[key] - x[key] || x.s.start - y.s.start)[0];
	const byMs = [...pool].sort((x, y) => x.ms - y.ms || x.s.start - y.s.start);
	const middling = () => {
		const m = byMs.length - 1 >> 1;
		for (let d = 0; d < byMs.length; d++) for (const i of [m - d, m + d]) if (byMs[i] && !taken.has(byMs[i])) return byMs[i];
		return null;
	};
	take(dearest("b"));
	take(middling());
	take(dearest("a"));
	return out.slice(0, count);
}
//#endregion
export { midTime, pickCalibration, shotMs };
