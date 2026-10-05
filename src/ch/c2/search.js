import { clamp, ease, lerp, mix3, seg } from "../../engine/math.js?v=BJIlRm7-";
import { COL } from "../../theme.js?v=Bj33PIbo";
//#region src/ch/c2/search.js
var ME = [
	-.9,
	.15,
	0
];
var COLD = [
	.34,
	.52,
	1
];
var COLD_GREY = [
	.46,
	.54,
	.72
];
/** The floor: a disc of this file's code centred on me (the text fills it once: 08_c2.js sizes the cells to it). */
var FLOOR = {
	c: [ME[0], ME[2]],
	r: 9.4
};
/** Where me looks for you on search n (0–3), on the floor: farther each time, ahead of me. */
var spot = (n) => {
	const d = 2.2 + 1.8 * n;
	return [
		-.3 + .02 * d,
		0,
		-d
	];
};
/** The fourth place is empty: no code within r of it. */
var HOLE = {
	n: 3,
	r: .7
};
/** Each wave's light: me's cyan, then a step colder each time. */
var ringCol = (n) => [
	COL.me,
	mix3(COL.me, COLD, .45),
	COLD,
	mix3(COLD, COLD_GREY, .5)
][n];
/** The warmth at place n (0–3) at t, the wave passing it at t1: less each time, and a little less once it has passed. */
var residue = (n, t, t1) => ([
	.95,
	.75,
	.6,
	0
][n] ?? 0) * (1 - .55 * ease.inOutSine(seg(t, t1 - .04, t1 + .4)));
/** How far the warmth reaches round the place, per view. */
var WARM_R = [
	.75,
	.8,
	.8
];
/** The views, k 0..1 over the view: { pos, look, fov, up? }. Each only drifts (a push, a rise, a pull). */
var VIEWS = [
	(k) => ({
		pos: [
			-.62,
			.78,
			lerp(2.6, 2.3, k)
		],
		look: [
			-.7,
			0,
			-5
		],
		fov: 40
	}),
	(k) => ({
		pos: [
			lerp(4.3, 4.5, k),
			lerp(2.5, 2.8, k),
			-1.2
		],
		look: [
			-.6,
			0,
			-2.6
		],
		fov: 40
	}),
	(k) => {
		const s = spot(2), u = [(s[0] - ME[0]) / 5.84, (s[2] - ME[2]) / 5.84], b = lerp(2.3, 2.05, k);
		return {
			pos: [
				s[0] + u[0] * b,
				.5,
				s[2] + u[1] * b
			],
			look: [
				s[0] + u[0] * -1.4,
				0,
				s[2] + u[1] * -1.4
			],
			fov: 40
		};
	},
	(k) => ({
		pos: [
			ME[0],
			lerp(29, 31.5, k),
			ME[2]
		],
		look: [
			ME[0],
			0,
			ME[2]
		],
		up: [
			0,
			0,
			-1
		],
		fov: 40
	})
];
var viewCam = (n, k) => VIEWS[n](clamp(k, 0, 1));
/** The dark around each view's part of the floor (a veil over the code, by distance from c on the floor). */
var FOG = [
	{
		c: [ME[0], ME[2] - 1.5],
		near: 3,
		far: 9
	},
	{
		c: [-.6, -2.4],
		near: 3.5,
		far: 8.5
	},
	{
		c: [-.4, -4.4],
		near: 4.5,
		far: 9.5
	},
	{
		c: FLOOR.c,
		near: 8.4,
		far: 9.4
	}
];
//#endregion
export { COLD, COLD_GREY, FLOOR, FOG, HOLE, ME, VIEWS, WARM_R, residue, ringCol, spot, viewCam };
