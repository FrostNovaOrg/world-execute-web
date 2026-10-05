import { TAU, ease, rng, seg } from "../../engine/math.js?v=BJIlRm7-";
import { heart2 } from "../../engine/shapes.js?v=BFh0PgdI";
import { hash12 } from "../../lib/glslhash.js?v=CCHaydFR";
import { GEO, TIP, crackSide, qAxis, qRot } from "../c2x/shards.js?v=e-kkELEt";
import { MISSING } from "../c2x/lost.js?v=Bv69Sd8-";
//#region src/ch/bridge/landed.js
var FY = -2.05;
var DISH = .4;
var G_DISH = 2 * (1.9 + Math.max(...GEO.match.map((j, i) => MISSING.has(i) ? -Infinity : GEO.hCent[j][1]))) / (DISH * DISH);
var LANDED_N = 147456;
var nearest = (seeds, x, y) => {
	let bi = 0, bd = 1e9;
	seeds.forEach((s, i) => {
		const d = (s[0] - x) ** 2 + (s[1] - y) ** 2;
		if (d < bd) {
			bd = d;
			bi = i;
		}
	});
	return bi;
};
/** c2x/shards.js particleData(), verbatim: image particles A (xy, cell in w) and heart targets B (xy, random in w). */
function particleData() {
	const r = rng(4242), N = 147456, A = new Float32Array(N * 4), B = new Float32Array(N * 4), per = Array.from({ length: 36 }, () => []);
	for (let i = 0; i < N; i++) {
		let rho;
		if (i % 9 === 0) rho = .93 + r() * .06;
		else do
			rho = Math.hypot(Math.sqrt(-2 * Math.log(Math.max(r(), 1e-6))) * .38 * Math.cos(TAU * r()), 0);
		while (rho > .985);
		const a = r() * TAU, x = rho * Math.cos(a), y = rho * Math.sin(a), c = nearest(GEO.dSeeds, x, y);
		A.set([
			x,
			y,
			0,
			c
		], i * 4);
		per[c].push(i);
	}
	const bucket = Array.from({ length: 36 }, () => []);
	const need = GEO.match.map((j, i) => [j, per[i].length]);
	let guard = 0;
	while (need.some(([j, n]) => bucket[j].length < Math.min(n, 400)) && guard++ < N * 30) {
		const x = -1.1 + r() * 2.2, y = -1.05 + r() * 2.15;
		if (heart2(x / .9, (y - -.1) / .9) > 0) continue;
		const j = nearest(GEO.hSeeds, x, y);
		if (bucket[j].length < 6e3) bucket[j].push([x, y]);
	}
	GEO.match.forEach((j, i) => per[i].forEach((p, k) => {
		const q = bucket[j][k % bucket[j].length] ?? GEO.hSeeds[j];
		B.set([
			q[0] + (r() - .5) * .004,
			q[1] + (r() - .5) * .004,
			0,
			r()
		], p * 4);
	}));
	return {
		A,
		B
	};
}
/** 09_c2x.js shardState(t), the heart pieces only: per cell its landed pose, impact time and point. */
function cellPoses(T, t, remake) {
	const tDis = T.findLine("DISHEARTENED").start, r = rng(51), cells = [];
	for (let i = 0; i < 36; i++) {
		r();
		r();
		r();
		r();
		r();
		r();
		r();
		r();
		const hc = GEO.hCent[GEO.match[i]], side = crackSide(hc[0], hc[1]), fall = r(), spin = [
			r() - .5,
			r() - .5,
			r() - .5
		];
		const crack = 1, open = ease.outCubic(seg(t, tDis, tDis + .55)), deflate = ease.inOutSine(seg(t, tDis + .05, tDis + .8));
		const rel = [hc[0] - TIP[0], hc[1] - TIP[1]], phi = side * -(.04 * crack + .42 * open);
		const rx = rel[0] * Math.cos(phi) - rel[1] * Math.sin(phi), ry = rel[0] * Math.sin(phi) + rel[1] * Math.cos(phi);
		const tx = TIP[0] + rx - hc[0] + side * (.012 * crack + .1 * open), ty = TIP[1] + ry - hc[1] - .12 * deflate * (hc[1] + 1);
		const tf = tDis + .16 + fall * .1, ft = Math.max(0, t - tf), g = remake ? G_DISH : 2 * (1.9 + hc[1]) / (DISH * DISH);
		let fy = -.5 * g * ft * ft;
		const floorY = -1.9999999999999998 - (hc[1] + ty), tHit = Math.sqrt(2 * Math.max(0, -floorY) / g);
		const drift = Math.min(ft, tHit) * side * .15;
		if (fy < floorY) {
			const after = ft - tHit, vb = g * tHit * .22;
			fy = floorY + Math.max(0, vb * after - .5 * g * after * after);
		}
		const t1 = [
			tx,
			ty + fy,
			drift
		];
		if (ft > tHit) {
			const lx = hc[0] + tx, lz = drift + (hc[1] + ty) * .05, l = Math.hypot(lx, lz) || 1, slide = (.25 + .2 * fall) * (1 - Math.exp(-(ft - tHit) / .1));
			t1[0] += lx / l * slide;
			t1[2] += lz / l * slide;
		}
		cells.push({
			i,
			hc,
			t1,
			q2: qAxis(spin, ft * 1.6 * Math.min(1, ft * 3)),
			scale: 1 - .22 * deflate,
			bright: 1 - .35 * deflate,
			hit: tf + tHit,
			land: [hc[0] + tx, tHit * side * .15]
		});
	}
	return cells;
}
/** A point of the heart plane in a cell's pose, in the bridge's coordinates (floor at y = 0). */
function place(c, x, y, lift) {
	const q = qRot(c.q2, [
		(x - c.hc[0]) * c.scale,
		(y - c.hc[1]) * c.scale,
		0
	]);
	return [
		c.hc[0] + q[0] + c.t1[0],
		Math.max(FY + lift, c.hc[1] + q[1] + c.t1[1]) - FY,
		q[2] + c.t1[2]
	];
}
var CACHE = null;
/**
* c2x's heart as it lies at the start of the bridge (song time `t`, normally the section start; the pieces are
* frozen from there): { data (N·4: xyz + cell/NC), cells: [{ land: [x, z], hit, bright, outline: [[x, y, z]…] }] }.
* remake: as the remake's c2x drops it (one gravity), without the seven pieces c2x erased (c2x/lost.js): they never
* came down, so they have no particles here (theirs are put far out of every view: the swarm draws a fixed count),
* no outline and no impact (cells lists the 29 that fell).
*/
function landedHeart(T, t, remake = false) {
	if (CACHE?.T === T && CACHE.t === t && CACHE.remake === remake) return CACHE;
	const { A, B } = particleData(), all = cellPoses(T, t, remake), N = 147456, data = new Float32Array(N * 4), gone = remake ? MISSING : null;
	for (let p = 0; p < N; p++) {
		if (gone?.has(A[p * 4 + 3])) {
			data.set([
				1e5,
				-1e5,
				1e5,
				(A[p * 4 + 3] + .5) / 36
			], p * 4);
			continue;
		}
		const c = all[A[p * 4 + 3]], h = hash12(p, 9e3), q = place(c, B[p * 4], B[p * 4 + 1], .004 * h);
		data.set([
			q[0],
			q[1],
			q[2],
			(c.i + .5) / 36
		], p * 4);
	}
	const cells = gone ? all.filter((c) => !gone.has(c.i)) : all;
	for (const c of cells) c.outline = GEO.hCells[GEO.match[c.i]].map((p) => place(c, p[0], p[1], .004));
	return CACHE = {
		T,
		t,
		remake,
		data,
		cells
	};
}
//#endregion
export { LANDED_N, landedHeart };
