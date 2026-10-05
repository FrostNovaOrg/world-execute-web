import { TAU, clamp, lerp, smoothstep } from "../../engine/math.js?v=BJIlRm7-";
import { dofPolyline, mul } from "../intro/kit.js?v=rUxrOt9G";
import { WORLD, terrainHeight } from "../intro/world.js?v=Cb_W9Bs7";
//#region src/ch/outro/world.js
var R_MAX = WORLD.R * 1.45;
var R_BOX = 2.6;
/**
* The intro's wireframe terrain (intro/world.js drawTerrain), clipped to r < rMax: the part of the world that is
* still loaded. Same parameters as drawTerrain plus rMax.
*/
function drawTerrainClip(L, o = {}) {
	const R = WORLD.R - .5, sp = o.spacing ?? 2.5, step = o.step ?? 1, rMin = o.rMin ?? 9, col = o.color ?? [
		.25,
		.6,
		1
	], eye = o.eye ?? [
		0,
		0,
		0
	], fade = o.fade ?? 90;
	const rise = o.rise ?? 1, ph = o.ph ?? 0, w = o.width ?? 1.5, rMax = o.rMax ?? 1e9;
	if (rise <= 0 || rMax <= rMin) return;
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
			if (r < rMin || r > rMax) {
				flush();
				continue;
			}
			const y = terrainHeight(x, z, rise, ph), d = Math.hypot(x - eye[0], y - eye[1], z - eye[2]);
			const k = (1 - smoothstep(fade * .35, fade, d)) * smoothstep(rMin, rMin + 4, r) * (.35 + .65 * clamp(y / 2.5)) * (1 - smoothstep(rMax - 3, rMax, r) * .7);
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
/**
* The retracting front on the floor: a superellipse |x|^p + |z|^p = a^p (p = 2: the circle; large p: the square),
* clipped to the world's square. Returns polylines (arrays of points), split where the clip cuts it.
*/
function frontCurve(a, p = 2, n = 256, y = .01) {
	const out = [], cur = [], lim = WORLD.R;
	for (let i = 0; i <= n; i++) {
		const th = i / n * TAU, c = Math.cos(th), s = Math.sin(th);
		const x = a * Math.sign(c) * Math.abs(c) ** (2 / p), z = a * Math.sign(s) * Math.abs(s) ** (2 / p);
		if (Math.abs(x) > lim || Math.abs(z) > lim) {
			if (cur.length > 1) out.push(cur.splice(0));
			else cur.length = 0;
			continue;
		}
		cur.push([
			x,
			y,
			z
		]);
	}
	if (cur.length > 1) out.push(cur);
	return out;
}
/**
* World state while unloading, from progress u (0 = fully loaded, 1 = only the sandbox is left) and the sink s of the
* hills (0 = risen, 1 = flat). front: the radius of the loaded floor; sq: how square the front is (0..1).
*/
function unloadState(u, s) {
	const front = R_BOX + (R_MAX - R_BOX) * (1 - smoothstep(0, .84, u) ** .8) ** 2.4, sq = smoothstep(.8, 1, u);
	return {
		front,
		sq,
		a: lerp(front, 1.5, sq),
		p: lerp(2, 18, sq * sq),
		rise: 1 - s,
		unroll: front / R_MAX
	};
}
//#endregion
export { R_BOX, R_MAX, drawTerrainClip, frontCurve, lerp, unloadState };
