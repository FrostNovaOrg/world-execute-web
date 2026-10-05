import { clamp, smoothstep } from "../../engine/math.js?v=BJIlRm7-";
import { dofPolyline, mul } from "./kit.js?v=rUxrOt9G";
//#region src/ch/intro/world.js
var WORLD = Object.freeze({
	R: 40,
	H: 56
});
/**
* Terrain height: flat around the sandbox, rolling sine hills beyond r ≈ 12, rising with `rise` (0..1) as a wave
* that starts at the far edge and runs inwards. `ph` slides the hills (a slow travelling wave).
*/
function terrainHeight(x, z, rise, ph = 0) {
	const r = Math.hypot(x, z), env = smoothstep(9, 24, r) * (1 - smoothstep(WORLD.R - 3, WORLD.R, Math.max(Math.abs(x), Math.abs(z))) * .6);
	const w = clamp(rise * 1.6 - (1 - r / (WORLD.R * 1.42)) * .6);
	const h = Math.sin(.21 * x + .13 * z + ph) * Math.cos(.17 * z - .07 * x - ph * .6) + .45 * Math.sin(.47 * x - .36 * z + 1.3 + ph * .8);
	return 3.4 * env * smoothstep(0, 1, w) * (1 + h) * .5 * (1.25 + .25 * Math.sin(.05 * x + .11 * z));
}
/**
* Wireframe terrain: iso-lines along x and z every `spacing` units in the ring r ∈ [rMin, R], sampled every `step`.
* o: rise, ph, color, width, fade (distance from `eye` at which lines fade to 0), eye ([x, y, z]), dof,
* zMin (only the part with z ≥ zMin is drawn: a wipe across the world).
*/
function drawTerrain(L, o = {}) {
	const R = WORLD.R - .5, sp = o.spacing ?? 2.5, step = o.step ?? 1, rMin = o.rMin ?? 9, col = o.color ?? [
		.25,
		.6,
		1
	], eye = o.eye ?? [
		0,
		0,
		0
	], fade = o.fade ?? 90;
	const rise = o.rise ?? 1, ph = o.ph ?? 0, w = o.width ?? 1.5;
	if (rise <= 0) return;
	const run = (fixed, axis) => {
		let pts = [];
		const flush = () => {
			if (pts.length > 1) dofPolyline(L, pts, {
				color: mul(col, pts.k / pts.length),
				width: w
			}, o.dof);
			pts = [];
		};
		for (let s = -R; s <= R + 1e-6; s += step) {
			const x = axis === "x" ? s : fixed, z = axis === "x" ? fixed : s, r = Math.hypot(x, z);
			if (r < rMin || z < (o.zMin ?? -Infinity)) {
				flush();
				continue;
			}
			const y = terrainHeight(x, z, rise, ph), d = Math.hypot(x - eye[0], y - eye[1], z - eye[2]);
			const k = (1 - smoothstep(fade * .35, fade, d)) * smoothstep(rMin, rMin + 4, r) * (.35 + .65 * clamp(y / 2.5));
			pts.push([
				x,
				y,
				z
			]);
			pts.k = (pts.k ?? 0) + k;
			if (pts.length >= 6) {
				const last = pts.at(-1);
				flush();
				pts.push(last);
				pts.k = k;
			}
		}
		flush();
	};
	for (let f = -R; f <= R + 1e-6; f += sp) {
		run(f, "x");
		run(f, "z");
	}
}
//#endregion
export { WORLD, drawTerrain, terrainHeight };
