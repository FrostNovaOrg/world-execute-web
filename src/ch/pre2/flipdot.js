import { inGlyph } from "../v2/glyphdef.js?v=Cp1j9ZDv";
//#region src/ch/pre2/flipdot.js
var FD = {
	n: 22,
	m: 3,
	disk: .8,
	thick: .05,
	nibble: .55,
	statusGap: .8,
	flip: {
		tp: .05,
		zeta: .6
	}
};
var CODE = {
	F: 70,
	M: 77
};
var bitsOf = (c) => Array.from({ length: 8 }, (_, i) => c >> 7 - i & 1);
/**
* Glyph g rasterised on the n × n grid over [-1, 1]² (row-major, row 0 at the top): a dot is lit where the glyph
* covers more than half of its cell (k × k samples; an even k puts no sample on a cell's midline, so an outline that
* halves a cell, as F's middle bar ending at x = .5 does, leaves it dark instead of to rounding).
*/
function raster(g, n = FD.n, k = 10) {
	const out = new Uint8Array(n * n), p = 2 / n;
	for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
		let c = 0;
		for (let a = 0; a < k; a++) for (let b = 0; b < k; b++) c += inGlyph(g, -1 + (i + (a + .5) / k) * p, 1 - (j + (b + .5) / k) * p);
		out[j * n + i] = c * 2 > k * k ? 1 : 0;
	}
	return out;
}
/**
* The disks, in pitches from the glyph area's centre (x right, y up): the main matrix (the glyph area and its margin,
* row by row from the top) and then the status row, a column of eight beside the matrix's right edge (bit 7 at the
* top, the MSB first, a gap between the nibbles; it stays in frame when the M fills the frame). Each:
* { k, x, y, i, j, bit }: i, j the cell in the glyph area (−m … n + m − 1; inside it 0 … n − 1), bit −1 off the
* status row. Also the outlines (for the housing): main [x0, y0, x1, y1], status, and all.
*/
function layout({ n = FD.n, m = FD.m } = {}) {
	const disks = [], h = (n - 1) / 2, e = n / 2 + m;
	for (let j = -m; j < n + m; j++) for (let i = -m; i < n + m; i++) disks.push({
		k: disks.length,
		x: i - h,
		y: h - j,
		i,
		j,
		bit: -1
	});
	const xs = e + FD.statusGap + .5, y0 = (7 + FD.nibble) / 2;
	for (let b = 0; b < 8; b++) disks.push({
		k: disks.length,
		x: xs,
		y: y0 - b - (b >= 4 ? FD.nibble : 0),
		i: -99,
		j: -99,
		bit: b
	});
	const status = [
		xs - .5,
		-y0 - .5,
		xs + .5,
		y0 + .5
	];
	return {
		disks,
		n,
		m,
		main: [
			-e,
			-e,
			e,
			e
		],
		status,
		all: [
			-e,
			-e,
			xs + .5,
			e
		]
	};
}
var inArea = (d, n = FD.n) => d.i >= 0 && d.i < n && d.j >= 0 && d.j < n;
/**
* Progress 0 → 1 of a flip τ seconds after its pulse. The magnet's torque swings the disk over (a second-order step
* response, so it starts from rest); it reaches the stop at ~35 ms, rebounds by ~9 % and is still within 1 % of the
* stop from ~1/12 s on.
*/
function flipProgress(tau, { tp = FD.flip.tp, zeta = FD.flip.zeta } = {}) {
	if (tau <= 0) return 0;
	if (tau > 12 * tp) return 1;
	const wd = Math.PI / tp, a = zeta * wd / Math.sqrt(1 - zeta * zeta);
	const s = 1 - Math.exp(-a * tau) * (Math.cos(wd * tau) + a / wd * Math.sin(wd * tau));
	return s > 1 ? 2 - s : s;
}
/**
* When each disk turns over, as plain times (song seconds):
*   gF[5]   the sixteenths of the black-out (one band of rows each, top to bottom)
*   sF[3]   the status row's three lit bits of 0x46 (bits 1, 5, 6), black → lit
*   gM[5]   the sixteenths of the switch (one band of columns each, right to left)
*   sM[3]   the status row's three differing bits (4, 6, 7) on the drum hits
* rowDt / colDt: the stagger inside a band (the controller drives one line after the other); skew: a tiny stagger along
* the other axis, so a line does not flip as one stiff bar. Returns per disk { lit0, ev: [[t, to], …], cF, cM }:
* its state before any event, its flips in order, and when its lit face takes F's colour and then M's (the wave that
* rewrites a line carries the letter's colour with it).
*/
function schedule(L, T, { rowDt = 1 / 80, colDt = 1 / 80, skew = 8e-4 } = {}) {
	const n = L.n, F = raster("F", n), M = raster("M2", n), f = bitsOf(CODE.F), m = bitsOf(CODE.M);
	const band = (u, k) => Math.floor(u * k / n), first = (b, k) => Math.ceil(b * n / k);
	const out = [];
	for (const d of L.disks) {
		const s = {
			lit0: 0,
			ev: [],
			cF: Infinity,
			cM: Infinity
		};
		if (d.bit >= 0) {
			const ones = f.map((v, i) => v ? i : -1).filter((i) => i >= 0), flips = f.map((v, i) => v !== m[i] ? i : -1).filter((i) => i >= 0);
			if (f[d.bit]) {
				const t = T.sF[ones.indexOf(d.bit)];
				s.ev.push([t, 1]);
				s.cF = t - .05;
			}
			if (f[d.bit] !== m[d.bit]) s.ev.push([T.sM[flips.indexOf(d.bit)], m[d.bit]]);
			s.cM = T.sM[0];
		} else if (inArea(d, n)) {
			const k = d.j * n + d.i, c = n - 1 - d.i, bF = band(d.j, T.gF.length), bM = band(c, T.gM.length);
			const tF = T.gF[bF] + (d.j - first(bF, T.gF.length)) * rowDt + d.i * skew;
			const tM = T.gM[bM] + (c - first(bM, T.gM.length)) * colDt + d.j * skew;
			s.lit0 = 1;
			s.cF = tF;
			s.cM = tM;
			if (!F[k]) s.ev.push([tF, 0]);
			if (F[k] !== M[k]) s.ev.push([tM, M[k]]);
		}
		out.push(s);
	}
	return out;
}
/** The angle of a disk at t: 0 with its lit face out, π with its black face out (mid-flip π/2, edge-on). */
function diskAngle(s, t) {
	let state = s.lit0, phi = state ? 0 : Math.PI;
	for (const [te, to] of s.ev) {
		if (te > t) break;
		if (to === state) continue;
		const p = flipProgress(t - te);
		phi = to ? Math.PI * (1 - p) : Math.PI * p;
		state = to;
	}
	return phi;
}
/** Whether a disk shows its lit face at t (a flip counts from half-way). */
var litAt = (s, t) => diskAngle(s, t) < Math.PI / 2;
//#endregion
export { CODE, FD, bitsOf, diskAngle, flipProgress, inArea, layout, litAt, raster, schedule };
