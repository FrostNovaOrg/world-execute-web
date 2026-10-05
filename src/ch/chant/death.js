import { smoothstep } from "../../engine/math.js?v=BJIlRm7-";
//#region src/ch/chant/death.js
/** How alive each of the 12 levels is at t (1 red, 0 dead white); null before the 9th EXECUTION. X[1..13]: the hits. */
function aliveLevels(t, X, beat) {
	if (t < X[9] - .5 / 60) return null;
	const half = beat / 2, out = new Array(12);
	for (let j = 1; j <= 12; j++) if (j <= 8) {
		const d = X[9 + Math.floor((j - 1) / 2)];
		out[j - 1] = 1 - smoothstep(d, d + half, t);
	} else out[j - 1] = t < X[j] ? 1 : 1 - smoothstep(X[j] + .05, X[j] + half, t);
	return out;
}
/** The share of the processes that is dead (the swarm has one colour): a quarter more on each hit from the 9th. */
function deadShare(t, X, beat) {
	let k = 0;
	for (let h = 9; h <= 12; h++) k += .25 * smoothstep(X[h], X[h] + beat / 2, t);
	return k;
}
//#endregion
export { aliveLevels, deadShare };
