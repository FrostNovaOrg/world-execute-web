import { hash } from "../../engine/math.js?v=BJIlRm7-";
import { pidOf, procPos } from "./fork.js?v=Cxw_Ux4G";
//#region src/ch/chant/code.js
var BOMB = ":(){ :|:& };:";
var NPROC = 4096;
/** The bomb, one copy per line, enough non-blank characters for every process. */
var bombText = (() => {
	const n = Math.ceil(NPROC / BOMB.replace(/ /g, "").length) + 1;
	return Array.from({ length: n }, () => BOMB).join("\n");
})();
/** Layout generator: glyph i on the process (i mod 2^k) of generation k; order key w = i / 4096. */
function nodeLayout(k) {
	const m = (1 << k) - 1;
	return (N) => {
		const out = new Float32Array(N * 4);
		for (let i = 0; i < N; i++) {
			if (i >= NPROC) {
				out.set([
					0,
					0,
					-1e5,
					1
				], i * 4);
				continue;
			}
			const p = procPos(i & m, k);
			out.set([
				p[0],
				p[1],
				p[2],
				i / NPROC
			], i * 4);
		}
		return out;
	};
}
/** The detonation: every character leaves along the ray through its process, 7–13 units out (as the branches). */
function debrisLayout() {
	return (N) => {
		const out = new Float32Array(N * 4);
		for (let i = 0; i < N; i++) {
			if (i >= NPROC) {
				out.set([
					0,
					0,
					-1e5,
					1
				], i * 4);
				continue;
			}
			const p = procPos(i, 12), h = [
				hash(i * 1.37 + 2.1),
				hash(i * 2.71 + .3),
				hash(i * .57 + 5.9)
			];
			const d = [
				p[0] + (h[0] - .5) * .6,
				p[1] + (h[1] - .5) * .6,
				p[2] + (h[2] - .5) * .6
			], l = Math.hypot(...d) || 1;
			const r = 7 + 6 * hash(i * 3.3 + 1.1);
			out.set([
				d[0] / l * r,
				d[1] / l * r,
				d[2] / l * r,
				i / NPROC
			], i * 4);
		}
		return out;
	};
}
/** `ps` of generation k: every live process (PIDs 2^k … 2^(k+1) − 1) with its parent. */
function psText(k) {
	const rows = ["  PID  PPID STAT COMMAND"];
	for (let pid = 1 << k; pid < 2 << k; pid++) rows.push(`${String(pid).padStart(5)} ${String(pid >> 1).padStart(5)} R+   bash`);
	return rows.join("\n");
}
/**
* The job's 4096 ranks, 16 per row: rank r is the process whose path from the root is r, and its PID is the bit-reversed
* heap index (pidOf), so the dump shows the bit-reversal permutation of a binary tree.
*/
var rankText = (() => {
	const rows = ["# torch.distributed  world_size = 4096   rank → pid"];
	for (let r = 0; r < NPROC; r += 16) {
		const cells = [];
		for (let j = 0; j < 16; j++) cells.push(String(pidOf(r + j, 12)));
		rows.push(`${r.toString(16).padStart(3, "0")}: ${cells.join(" ")}`);
	}
	return rows.join("\n");
})();
/**
* The count, tokenized (Whisper multilingual BPE, 51 865 tokens). Each piece: [shown text, token id]. Byte tokens of a
* split UTF-8 character are shown as their bytes.
*/
var TOKENS = [
	[["E", 36], ["in", 259]],
	[["D", 35], ["os", 329]],
	[
		["T", 51],
		["ro", 340],
		["is", 271]
	],
	[["0xEB84", 33386], ["0xB7", 115]],
	[["F", 37], ["em", 443]],
	[["六", 30566]]
];
var TOKENIZER = "whisper · multilingual BPE · 51 865";
//#endregion
export { BOMB, NPROC, TOKENIZER, TOKENS, bombText, debrisLayout, nodeLayout, psText, rankText };
