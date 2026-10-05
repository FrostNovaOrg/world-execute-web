import { clamp, ease, rng } from "../../engine/math.js?v=BJIlRm7-";
import { MathUtils } from "../../../vendor/three/build/three.core.js?v=q9f7JKE-";
import { CUR } from "../intro/cursor.js?v=B0VCQBJX";
//#region src/ch/title/code.js
var TOKENS = [
	["world", "white"],
	[".", "dim"],
	["execute", "blue"],
	["(", "dim"],
	["me", "cyan"],
	[")", "dim"],
	[";", "dim"]
];
var GROUPS = [
	"white",
	"dim",
	"blue",
	"cyan"
];
var EM = .34;
var CELL = EM * .6;
var BAR = {
	y0: -.2 * EM,
	y1: -.1 * EM
};
/** Camera distance at which one cell is exactly the reference cursor width (CUR.w design px). */
var DIST = CELL * 1080 / (2 * CUR.w * Math.tan(MathUtils.degToRad(20)));
/**
* A typed line: its text and syntax tokens ([text, group] in order), and from them
*   GROUP_OF     the group of each character
*   NCELL, X0    its cells (the characters and the cursor) and the left edge of the first, the cells centred on x = 0
*   cellX(i)     cell i's left edge (x) in world units
*   cursorAt(i)  the cursor bar at cell i as 4 world points (tl, tr, br, bl) on the text plane
*   lineTextures(N, group, density, seed), inkArea(group)   its particles (below)
*/
function makeLine(text, tokens) {
	const GROUP_OF = [];
	for (const [s, k] of tokens) for (let i = 0; i < s.length; i++) GROUP_OF.push(k);
	const NCELL = text.length + 1, X0 = -NCELL / 2 * CELL;
	const cellX = (i) => X0 + i * CELL;
	const cursorAt = (i, z = 0) => [
		[
			cellX(i),
			BAR.y1,
			z
		],
		[
			cellX(i) + CELL,
			BAR.y1,
			z
		],
		[
			cellX(i) + CELL,
			BAR.y0,
			z
		],
		[
			cellX(i),
			BAR.y0,
			z
		]
	];
	/**
	* Rasterise each character in its own cell (600-weight JetBrains Mono, `px` pixels per em) and return the filled
	* pixels in em units relative to the cell's left edge and the baseline.
	*/
	function raster(px = 220) {
		const c = document.createElement("canvas"), g = c.getContext("2d");
		const W = Math.ceil(px * .6 * text.length + px), H = Math.ceil(px * 1.6), base = Math.round(px * 1.15);
		c.width = W;
		c.height = H;
		g.font = `600 ${px}px "JetBrains Mono"`;
		g.fillStyle = "#fff";
		g.textBaseline = "alphabetic";
		const cells = [];
		for (let i = 0; i < text.length; i++) {
			g.clearRect(0, 0, W, H);
			const x0 = px * .5;
			g.fillText(text[i], x0, base);
			const d = g.getImageData(0, 0, W, H).data, pts = [];
			for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (d[(y * W + x) * 4 + 3] > 127) pts.push([(x + .5 - x0) / px, (base - y - .5) / px]);
			cells.push(pts);
		}
		return cells;
	}
	let RASTER = null;
	/**
	* Particle textures for one swarm of `N` particles holding the characters of `group`:
	*   glyph: points on the glyphs; cloud: the same particles packed into the cursor bar under their cell (where each
	*   character condenses from); w = (char index + .5) / the line's length, or 9 for unused slots (never revealed).
	* `density` = particles per em² of ink (the same for every group, so all glyphs look alike).
	*/
	function lineTextures(N, group, density, seed = 3) {
		RASTER ??= raster();
		const r = rng(seed), glyph = new Float32Array(N * 4), cloud = new Float32Array(N * 4), px2 = (1 / 220) ** 2;
		const idx = [...text].map((_, i) => i).filter((i) => GROUP_OF[i] === group);
		const want = idx.map((i) => Math.round(RASTER[i].length * px2 * density));
		const total = want.reduce((a, b) => a + b, 0), k = total > N ? N / total : 1;
		let n = 0;
		idx.forEach((ci, j) => {
			const pts = RASTER[ci], m = Math.floor(want[j] * k), w = (ci + .5) / text.length;
			for (let q = 0; q < m && n < N; q++, n++) {
				const p = pts[Math.floor(r() * pts.length)], jx = (r() - .5) / 220, jy = (r() - .5) / 220;
				glyph.set([
					cellX(ci) + (p[0] + jx) * EM,
					(p[1] + jy) * EM,
					(r() - .5) * .004,
					w
				], n * 4);
				cloud.set([
					cellX(ci) + r() * CELL,
					BAR.y0 + r() * (BAR.y1 - BAR.y0),
					(r() - .5) * .01,
					w
				], n * 4);
			}
		});
		for (; n < N; n++) {
			glyph.set([
				0,
				0,
				-1e6,
				9
			], n * 4);
			cloud.set([
				0,
				0,
				-1e6,
				9
			], n * 4);
		}
		return {
			glyph,
			cloud
		};
	}
	/** Ink area of a group (em²), to size the densities. */
	function inkArea(group) {
		RASTER ??= raster();
		let s = 0;
		[...text].forEach((_, i) => {
			if (GROUP_OF[i] === group) s += RASTER[i].length;
		});
		return s / 220 / 220;
	}
	return {
		TEXT: text,
		TOKENS: tokens,
		GROUP_OF,
		NCELL,
		X0,
		cellX,
		cursorAt,
		lineTextures,
		inkArea
	};
}
/** The published film's line, and its parts under their old names. */
var LINE = makeLine("world.execute(me);", TOKENS);
var { TEXT, GROUP_OF, NCELL, X0, cellX, cursorAt, lineTextures, inkArea } = LINE;
/** The remake's line: `world` an identifier, `startSimulation` the call (as `execute` was), the punctuation dim. */
var LINE_R = makeLine("world.startSimulation();", [
	["world", "white"],
	[".", "dim"],
	["startSimulation", "blue"],
	["(", "dim"],
	[")", "dim"],
	[";", "dim"]
]);
/**
* (the remake, docs/REMAKE.md §12.9) The intro's prompt box: its em (design px) and the line's baseline (design y). The
* line is typed there, under the world, and stays there at that size until it explodes (the director did not want it
* to grow in its last second); the title's first camera sees the line exactly there (promptPose).
*/
var PROMPT_R = Object.freeze({
	em: 34,
	base: 924
});
/** The level camera, looking along −z, that sees the line (at the origin) at PROMPT_R: its distance and height. */
var promptPose = ({ em, base } = PROMPT_R) => ({
	r: DIST * CUR.w / (.6 * em),
	y: (base - 540) / em * EM
});
/**
* Keystroke schedule in beats relative to the section's first beat: `world` on sixteenths from the downbeat, the dot
* on the "and", `execute` on sixteenths from beat 3, `(me)` and `;` on eighths and sixteenths.
*/
var KEYS = [
	0,
	.25,
	.5,
	.75,
	1,
	1.5,
	2,
	2.25,
	2.5,
	2.75,
	3,
	3.25,
	3.5,
	4,
	4.5,
	4.75,
	5,
	5.5
];
/**
* Typing state at song time t from absolute key times: n = characters typed, front = continuous condensation
* front in cells (each character condenses over `cond` seconds after its key), last = time of the latest key.
*/
function typingState(t, keyTimes, cond = .1) {
	let n = 0;
	while (n < keyTimes.length && t >= keyTimes[n]) n++;
	const last = n ? keyTimes[n - 1] : -1e9;
	const front = n === 0 ? 0 : n - 1 + ease.outCubic(clamp((t - last) / cond));
	return {
		n,
		front,
		last,
		typing: n > 0 && n < keyTimes.length ? true : t - last < .12,
		done: n === keyTimes.length
	};
}
//#endregion
export { BAR, CELL, DIST, EM, GROUPS, KEYS, LINE, LINE_R, NCELL, PROMPT_R, TEXT, TOKENS, X0, cellX, cursorAt, inkArea, lineTextures, makeLine, promptPose, typingState };
