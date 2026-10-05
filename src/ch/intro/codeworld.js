import { smoothstep } from "../../engine/math.js?v=BJIlRm7-";
import { codeFill } from "../../lib/glyphs.js?v=DWbHICXG";
import { WORLD } from "./world.js?v=Cb_W9Bs7";
//#region src/ch/intro/codeworld.js
/** A cool, blueprint-blue syntax palette (plain, comment, string, number, keyword, punctuation). */
var WORLD_SYNTAX = [
	[
		.3,
		.62,
		1
	],
	[
		.08,
		.16,
		.36
	],
	[
		.55,
		.85,
		1
	],
	[
		.62,
		.9,
		1
	],
	[
		.55,
		1,
		1
	],
	[
		.2,
		.36,
		.78
	]
];
/**
* Lay a GlyphField's text over the world's floor (rows along +x, the first row at the far edge z = −R) and return
* { tex, placed, update(rise, ph) }. cell: line height (world units); keep: the sandbox's footprint stays clear.
*/
function codeWorld(field, key, { cell = .6, keep = 1.8, margin = .6 } = {}) {
	const R = WORLD.R - margin;
	const inside = (x, y) => Math.abs(x) < R && Math.abs(y) < R && !(Math.abs(x) < keep && Math.abs(y) < keep);
	const flat = codeFill(field, inside, {
		center: [
			0,
			0,
			0
		],
		cell,
		width: 2 * R,
		height: 2 * R
	})(field.N);
	const idx = [], P = [];
	for (let i = 0; i < field.N; i++) {
		if (flat[i * 4 + 2] < -1e4) continue;
		const x = flat[i * 4], z = -flat[i * 4 + 1], r = Math.hypot(x, z);
		flat[i * 4 + 1] = 0;
		flat[i * 4 + 2] = z;
		const A = 3.4 * (smoothstep(9, 24, r) * (1 - smoothstep(WORLD.R - 3, WORLD.R, Math.max(Math.abs(x), Math.abs(z))) * .6)) * .5 * (1.25 + .25 * Math.sin(.05 * x + .11 * z)), f = (1 - r / (WORLD.R * 1.42)) * .6;
		const a = .21 * x + .13 * z, b = .17 * z - .07 * x, c = .47 * x - .36 * z + 1.3;
		idx.push(i);
		P.push(A, f, Math.sin(a), Math.cos(a), Math.sin(b), Math.cos(b), Math.sin(c), Math.cos(c));
	}
	const pre = Float64Array.from(P), at = Int32Array.from(idx, (i) => i * 4 + 1);
	const tex = field.layout(key, () => flat), data = tex.image.data;
	let last = null;
	return {
		tex,
		placed: idx.length,
		/** Heights for this frame (rise 0..1, ph: the terrain's travelling phase), exactly as terrainHeight. */
		update(rise, ph) {
			if (last && last[0] === rise && last[1] === ph) return;
			const cp = Math.cos(ph), sp = Math.sin(ph), cq = Math.cos(ph * .6), sq = Math.sin(ph * .6), cr = Math.cos(ph * .8), sr = Math.sin(ph * .8);
			for (let j = 0, q = 0; j < at.length; j++, q += 8) {
				const A = pre[q];
				if (A === 0) {
					data[at[j]] = .03;
					continue;
				}
				const w = Math.min(1, Math.max(0, rise * 1.6 - pre[q + 1])), s = w * w * (3 - 2 * w);
				const h = (pre[q + 2] * cp + pre[q + 3] * sp) * (pre[q + 5] * cq + pre[q + 4] * sq) + .45 * (pre[q + 6] * cr + pre[q + 7] * sr);
				data[at[j]] = A * s * (1 + h) + .03;
			}
			tex.needsUpdate = true;
			last = [rise, ph];
		}
	};
}
//#endregion
export { WORLD_SYNTAX, codeWorld };
