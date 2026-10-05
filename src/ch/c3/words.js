import { CanvasTexture, LinearFilter, LinearMipmapLinearFilter } from "../../../vendor/three/build/three.core.js?v=q9f7JKE-";
//#region src/ch/c3/words.js
var CACHE = /* @__PURE__ */ new Map();
/** Rasterise `str` (bold JetBrains Mono) into a W×H canvas with a margin; returns { tex, inside(u, v), aspect }. */
function wordMask(str, { W = 1024, H = 192, weight = 800, tracking = .08 } = {}) {
	const key = `${str}|${W}|${H}|${weight}|${tracking}`;
	if (CACHE.has(key)) return CACHE.get(key);
	const c = document.createElement("canvas");
	c.width = W;
	c.height = H;
	const g = c.getContext("2d", { willReadFrequently: true });
	g.fillStyle = "#000";
	g.fillRect(0, 0, W, H);
	let size = H * .86;
	const setFont = () => {
		g.font = `${weight} ${size}px "JetBrains Mono", monospace`;
		if ("letterSpacing" in g) g.letterSpacing = `${size * tracking}px`;
	};
	setFont();
	const fit = W * .96 / g.measureText(str).width;
	if (fit < 1) {
		size *= fit;
		setFont();
	}
	g.fillStyle = "#fff";
	g.textAlign = "center";
	g.textBaseline = "middle";
	g.fillText(str, W / 2 + size * tracking / 2, H * .53);
	const px = g.getImageData(0, 0, W, H).data;
	const inside = (u, v) => {
		const x = Math.floor(u * W), y = Math.floor((1 - v) * H);
		if (x < 0 || y < 0 || x >= W || y >= H) return false;
		return px[(y * W + x) * 4] > 127;
	};
	const tex = new CanvasTexture(c);
	Object.assign(tex, {
		flipY: true,
		colorSpace: "",
		generateMipmaps: true,
		minFilter: LinearMipmapLinearFilter,
		magFilter: LinearFilter
	});
	const out = {
		tex,
		inside,
		aspect: W / H
	};
	CACHE.set(key, out);
	return out;
}
/** What fills the gaps: the model's confident guesses about you (repeated to fill every hole). */
var HALLUCINATION = `// reconstructed from 29 of 36 fragments · confidence 0.31
you.smile = interpolate(frag[12], frag[19]);   // not in context
you.voice = "warm";                              // inferred
you.name  = you.name ?? guess();
you.eyes  = mean(frag.map(f => f.hue));
you.stays = true;                                // unverified
return you;                                      // hallucinated
`.repeat(6);
/** EXECUTION through Whisper's multilingual BPE (51 865 tokens): [piece, id]. */
var TOKENS_EXECUTION = [
	["EX", 39814],
	["EC", 8140],
	["U", 52],
	["TION", 7413]
];
//#endregion
export { HALLUCINATION, TOKENS_EXECUTION, wordMask };
