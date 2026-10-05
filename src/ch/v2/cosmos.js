import { TAU, lerp, rng } from "../../engine/math.js?v=BJIlRm7-";
import { alloc, put } from "./shapeset.js?v=Bbzza00z";
//#region src/ch/v2/cosmos.js
var HALO = {
	moon: .62,
	gaps: [.62 * 2 ** (2 / 3), .62 * 1.5 ** (2 / 3)],
	tilt: Math.atan(2),
	axes: [
		[
			0,
			1,
			0
		],
		[
			0,
			Math.cos(Math.atan(2)),
			Math.sin(Math.atan(2))
		],
		[
			0,
			Math.cos(Math.atan(2)),
			-Math.sin(Math.atan(2))
		],
		[
			1,
			0,
			0
		]
	],
	col: [
		[
			1,
			.74,
			.4
		],
		[
			.95,
			.92,
			1
		],
		[
			.95,
			.92,
			1
		],
		[
			1,
			.86,
			.6
		]
	]
};
var rotX = (p, a) => {
	const c = Math.cos(a), s = Math.sin(a);
	return [
		p[0],
		c * p[1] - s * p[2],
		s * p[1] + c * p[2]
	];
};
var rotZ = (p, a) => {
	const c = Math.cos(a), s = Math.sin(a);
	return [
		c * p[0] - s * p[1],
		s * p[0] + c * p[1],
		p[2]
	];
};
function halo(N, { seed = 91 } = {}) {
	const r = rng(seed), S = alloc(N), n0 = Math.floor(N * .6), n1 = Math.floor(N * .15), n2 = n1, n3 = Math.floor(N * .07);
	let i = 0;
	while (i < n0) {
		const R = lerp(.7, 1.02, r());
		let dens = .55 + .45 * Math.cos(TAU * R / .011) ** 2;
		for (const g of HALO.gaps) dens *= 1 - .96 * Math.exp(-(((R - g) / .007) ** 2));
		dens *= .6 + .4 * Math.sin(Math.PI * (R - .7) / .32);
		if (r() > dens * R) continue;
		const a = r() * TAU, p = [
			R * Math.cos(a),
			(r() - .5) * .006,
			R * Math.sin(a)
		];
		put(S, i++, p, HALO.col[0].map((v) => v * (.7 + .5 * r())), [
			0,
			0,
			0
		], R, 0);
	}
	const ring = (n, R, tilt, cls, thick) => {
		for (let k = 0; k < n; k++) {
			const a = r() * TAU, q = R + (r() - .5) * thick;
			let p = [
				q * Math.cos(a),
				(r() - .5) * thick * .3,
				q * Math.sin(a)
			];
			p = cls === 3 ? rotZ(p, Math.PI / 2) : rotX(p, tilt);
			put(S, i++, p, HALO.col[cls].map((v) => v * (.7 + .5 * r())), [
				0,
				0,
				0
			], a / TAU, cls);
		}
	};
	ring(n1, 1.16, HALO.tilt, 1, .012);
	ring(n2, 1.16, -HALO.tilt, 2, .012);
	ring(n3, 1.3, 0, 3, .01);
	while (i < N) {
		const u = r() * 2 - 1, a = r() * TAU, q = Math.sqrt(1 - u * u), R = lerp(1.5, 3, r() ** 2);
		put(S, i++, [
			q * Math.cos(a) * R,
			u * R,
			q * Math.sin(a) * R
		], [
			.7,
			.75,
			1
		].map((v) => v * (.15 + .2 * r())), [
			0,
			0,
			0
		], 1, 3);
	}
	return S;
}
//#endregion
export { HALO, halo };
