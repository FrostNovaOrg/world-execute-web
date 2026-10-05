import { clamp } from "../../engine/math.js?v=BJIlRm7-";
//#region src/ch/v2/bake.js
/**
* How open the space over a surface point is: 1 on open surface, towards 0 deep in a crease. The field is read at a
* few heights along the normal; over open surface it grows exactly as fast as the height (the near heights count most).
*/
function openness(sdf, p, n, { h = .24, steps = 4 } = {}) {
	let s = 0, w = 0;
	for (let i = 1; i <= steps; i++) {
		const d = h * i / steps, k = 1 / i;
		s += k * clamp(sdf(p[0] + n[0] * d, p[1] + n[1] * d, p[2] + n[2] * d) / d);
		w += k;
	}
	return s / w;
}
/**
* How much of a light from the direction L (unit, towards the light) reaches p: 1 lit, 0 in shadow, in between in a
* penumbra whose width goes with 1 / k. Sphere tracing from just off the surface; the narrowest miss along the ray
* decides (the usual soft shadow of distance fields).
*/
function shadow(sdf, p, n, L, { lift = .015, t0 = .04, tmax = 3, k = 8 } = {}) {
	const ox = p[0] + n[0] * lift, oy = p[1] + n[1] * lift, oz = p[2] + n[2] * lift;
	let res = 1, t = t0;
	for (let i = 0; i < 40 && t < tmax; i++) {
		const d = sdf(ox + L[0] * t, oy + L[1] * t, oz + L[2] * t);
		if (d < .001) return 0;
		res = Math.min(res, k * d / t);
		t += clamp(d, .015, .25);
	}
	return clamp(res);
}
/** For the N samples of a shape ({ pos, nrm }: xyzw each): [openness, light] per sample, as one Float32Array(N * 2). */
function bakeLight(S, N, sdf, L, o = {}) {
	const out = new Float32Array(N * 2), p = [
		0,
		0,
		0
	], n = [
		0,
		0,
		0
	];
	for (let i = 0; i < N; i++) {
		for (let j = 0; j < 3; j++) {
			p[j] = S.pos[i * 4 + j];
			n[j] = S.nrm[i * 4 + j];
		}
		out[i * 2] = openness(sdf, p, n, o.open);
		out[i * 2 + 1] = shadow(sdf, p, n, L, o.shadow);
	}
	return out;
}
//#endregion
export { bakeLight, openness, shadow };
