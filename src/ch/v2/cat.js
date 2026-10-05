import { TAU, hash, lerp, rng, smoothstep } from "../../engine/math.js?v=BJIlRm7-";
import { KNEE_RINGS, STRIPES } from "./stripes.js?v=BOKTOVyi";
//#region src/ch/v2/cat.js
var { sqrt, abs, min, max, sin, cos, atan2, floor, hypot, PI } = Math, DEG = PI / 180;
var add = (a, b, k = 1) => [
	a[0] + b[0] * k,
	a[1] + b[1] * k,
	a[2] + b[2] * k
];
var dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
var cross = (a, b) => [
	a[1] * b[2] - a[2] * b[1],
	a[2] * b[0] - a[0] * b[2],
	a[0] * b[1] - a[1] * b[0]
];
var unit = (a) => {
	const l = sqrt(dot(a, a));
	return [
		a[0] / l,
		a[1] / l,
		a[2] / l
	];
};
var turn = (v, k, a) => add(add([
	v[0] * cos(a),
	v[1] * cos(a),
	v[2] * cos(a)
], cross(k, v), sin(a)), k, dot(k, v) * (1 - cos(a)));
var sat = (x) => x < 0 ? 0 : x > 1 ? 1 : x;
var smin = (a, b, k) => {
	const h = max(k - abs(a - b), 0) / k;
	return min(a, b) - h * h * k * .25;
};
var YOU = [
	0,
	.22,
	0
];
var CLEAR = .275;
var TCX = -.78;
var TCZ = -.46;
var TH0 = 104 * DEG;
var TH1 = 310 * DEG;
var TCUT = (TH0 + TH1) / 2 - PI;
var TY = .13;
var TCAP = [.18, .24];
var TPROF = Float64Array.from({ length: 260 }, (_, i) => {
	const u = floor(i / 4) / 64, a = smoothstep(0, .27, u), b = smoothstep(.3, .62, u), c = smoothstep(.65, 1, u);
	return [
		.21 + .12 * a - .09 * b + .04 * c,
		.21 + .12 * a - .06 * b + .01 * c,
		.44 + .14 * a - .11 * b + .07 * c - TY,
		.46 - .1 * smoothstep(.2, .9, u)
	][i % 4];
});
var two = 0;
var twi = 0;
var thh = 0;
var trr = 0;
function section(u) {
	const k = u * 64, i = k >= 64 ? 63 : k | 0, t = k - i, o = i * 4;
	two = TPROF[o] + (TPROF[o + 4] - TPROF[o]) * t;
	twi = TPROF[o + 1] + (TPROF[o + 5] - TPROF[o + 1]) * t;
	thh = TPROF[o + 2] + (TPROF[o + 6] - TPROF[o + 2]) * t;
	trr = TPROF[o + 3] + (TPROF[o + 7] - TPROF[o + 3]) * t;
}
var MID = [
	.22,
	.27,
	.4,
	.42
];
var RIDGE = [
	.04,
	.045,
	.07
];
var MOUND = [
	-.76,
	-.02,
	-.48000000000000004,
	.3,
	.46,
	.3
];
var HQ = [
	-.42,
	.25,
	-.7
];
var HQR = [
	.42,
	.33,
	.35
];
var HQYAW = 150 * DEG;
var HQC = cos(HQYAW);
var HQS = sin(HQYAW);
var KNEE = [
	-.8,
	0,
	-.47
];
var NECK = [[
	-.87,
	.25,
	-.03
], [
	-.64,
	.29,
	-.07
]];
var SHOULDER = [
	-.79,
	.14,
	.12,
	.14,
	.16,
	.11
];
var BREAST = [
	-.64,
	.14,
	.05,
	.16,
	.14,
	.16
];
var ARM = [[[
	-.71,
	.07,
	0
], [
	-.45,
	.06,
	.06
]], [[
	-.77,
	.07,
	.21
], [
	-.43,
	.06,
	.2
]]];
var PAWR = [
	.085,
	.058,
	.068
];
var HC = [
	-.53,
	.31,
	-.06
];
var HS = 1.2;
var [HL, HU, HF] = (() => {
	const yaw = 40 * DEG, pitch = 8 * DEG, roll = 6 * DEG;
	const f = [
		cos(pitch) * cos(yaw),
		-sin(pitch),
		cos(pitch) * sin(yaw)
	], u = [
		sin(pitch) * cos(yaw),
		cos(pitch),
		sin(pitch) * sin(yaw)
	];
	return [
		turn(cross(u, f), f, roll),
		turn(u, f, roll),
		f
	];
})();
var world = (s, u, f) => add(add(add(HC, HL, s * HS), HU, u * HS), HF, f * HS);
var axis = (v) => unit(add(add(add([
	0,
	0,
	0
], HL, v[0]), HU, v[1]), HF, v[2]));
var SKULL = [
	.25,
	.185,
	.2
];
var CHEEK = [
	.14,
	-.075,
	.07,
	.105
];
var MUZZLE = [
	-.07,
	.17,
	.09,
	.062,
	.09
];
var BRIDGE = [
	.03,
	.16,
	-.035,
	.235
];
var CHIN = [
	-.12,
	.16,
	.045
];
var EAR = {
	round: .008,
	thick: [.024, .011],
	cup: 4,
	foot: .09
};
var EARS = [{
	in: [
		.03,
		.12,
		-.03
	],
	out: [
		.2,
		0,
		.02
	],
	tip: [
		.195,
		.27,
		-.12
	]
}, {
	in: [
		-.03,
		.12,
		0
	],
	out: [
		-.2,
		0,
		-.06
	],
	tip: [
		-.195,
		.27,
		-.12
	]
}].map((e) => {
	const m = add(e.in, e.out).map((v) => v / 2), a = unit(add(e.out, e.in, -1)), t = add(e.tip, m, -1), b = unit(add(t, a, -dot(a, t)));
	let c = cross(a, b);
	if (c[2] < 0) c = c.map((v) => -v);
	return Float64Array.from([
		...m,
		...a,
		...b,
		...c,
		hypot(...add(e.out, e.in, -1)) / 2,
		dot(t, b),
		dot(t, a)
	]);
});
var TAILK = [
	[
		-.45,
		.2,
		-.82
	],
	[
		-.2,
		.12,
		-.8
	],
	[
		.25,
		.09,
		-.62
	],
	[
		.48,
		.085,
		-.25
	],
	[
		.5,
		.08,
		.12
	],
	[
		.36,
		.07,
		.38
	],
	[
		.15,
		.065,
		.5
	]
];
var TAILR = [
	.1,
	.085,
	.07
];
var TN = 30;
var TP = /* @__PURE__ */ new Float64Array(93);
var TE = /* @__PURE__ */ new Float64Array(120);
var TS = /* @__PURE__ */ new Float64Array(31);
var TBOX = /* @__PURE__ */ new Float64Array(6);
{
	const K = (i) => i < 0 ? add(add([
		0,
		0,
		0
	], TAILK[0], 2), TAILK[1], -1) : i >= TAILK.length ? add(add([
		0,
		0,
		0
	], TAILK.at(-1), 2), TAILK.at(-2), -1) : TAILK[i];
	for (let i = 0; i <= TN; i++) {
		const p = i / TN * (TAILK.length - 1), k = min(floor(p), TAILK.length - 2), t = p - k, a = K(k - 1), b = K(k), c = K(k + 1), d = K(k + 2);
		for (let j = 0; j < 3; j++) TP[i * 3 + j] = .5 * (2 * b[j] + (c[j] - a[j]) * t + (2 * a[j] - 5 * b[j] + 4 * c[j] - d[j]) * t * t + (3 * b[j] - a[j] - 3 * c[j] + d[j]) * t ** 3);
	}
	for (let i = 0; i < TN; i++) {
		const e = [
			0,
			1,
			2
		].map((j) => TP[i * 3 + 3 + j] - TP[i * 3 + j]), l2 = dot(e, e);
		TE.set([...e, 1 / l2], i * 4);
		TS[i + 1] = TS[i] + sqrt(l2);
	}
	for (let i = 0; i <= TN; i++) TS[i] /= TS[TN];
	for (let j = 0; j < 3; j++) {
		TBOX[j] = 1e9;
		TBOX[3 + j] = -1e9;
		for (let i = 0; i <= TN; i++) {
			TBOX[j] = min(TBOX[j], TP[i * 3 + j]);
			TBOX[3 + j] = max(TBOX[3 + j], TP[i * 3 + j]);
		}
	}
}
var dT = 0;
var dHa = 0;
var dCh = 0;
var dHe = 0;
var dEL = 0;
var dER = 0;
var dTa = 0;
var dPw = 0;
var capH = 0;
var tailT = 0;
var tailI = 0;
var earB = 0;
var earE = 0;
var armD = 0;
var armH = 0;
var armI = 0;
var pawI = 0;
var thigh = 0;
var neck = 0;
function ell(x, y, z, rx, ry, rz) {
	const ax = x / rx, ay = y / ry, az = z / rz, k0 = sqrt(ax * ax + ay * ay + az * az);
	if (k0 < 1e-9) return -min(rx, ry, rz);
	const bx = ax / rx, by = ay / ry, bz = az / rz;
	return k0 * (k0 - 1) / sqrt(bx * bx + by * by + bz * bz);
}
var ellAt = (x, y, z, E) => ell(x - E[0], y - E[1], z - E[2], E[3], E[4], E[5]);
function cap(x, y, z, a, b, ra, rb) {
	const ex = b[0] - a[0], ey = b[1] - a[1], ez = b[2] - a[2], px = x - a[0], py = y - a[1], pz = z - a[2];
	const h = sat((px * ex + py * ey + pz * ez) / (ex * ex + ey * ey + ez * ez)), qx = px - ex * h, qy = py - ey * h, qz = pz - ez * h;
	capH = h;
	return sqrt(qx * qx + qy * qy + qz * qz) - (ra + (rb - ra) * h);
}
var paw = (x, y, z, P) => ell((x - P[0]) * P[3] + (z - P[2]) * P[4], y - P[1], (z - P[2]) * P[3] - (x - P[0]) * P[4], PAWR[0], PAWR[1], PAWR[2]);
function torso(x, y, z) {
	const dx = x - TCX, dz = z - TCZ, py = y - TY;
	let th = atan2(dz, dx);
	if (th < TCUT) th += TAU;
	const tc = th < TH0 ? TH0 : th > TH1 ? TH1 : th;
	section((tc - TH0) / (TH1 - TH0));
	const rho = sqrt(dx * dx + dz * dz);
	if (rho < MID[0]) {
		const k = smoothstep(.05, MID[0], rho);
		twi = lerp(MID[1], twi, k);
		thh = lerp(MID[2], thh, k);
		trr = lerp(MID[3], trr, k);
	}
	let qa, qc = 0, rc = 1;
	if (tc === th) qa = rho - trr;
	else {
		const c = cos(tc), s = sin(tc);
		qa = dx * c + dz * s - trr;
		qc = dz * c - dx * s;
		rc = TCAP[th < TH0 ? 0 : 1];
	}
	const ry = py - thh + RIDGE[0];
	return smin(ell(qa, py, qc, qa > 0 ? two : twi, thh, rc), sqrt(qa * qa + ry * ry + qc * qc) - RIDGE[1], RIDGE[2]);
}
function ear(E, s, u, f) {
	const px = s - E[0], py = u - E[1], pz = f - E[2], pa = px * E[3] + py * E[4] + pz * E[5], pb = px * E[6] + py * E[7] + pz * E[8];
	const w = E[12], h = E[13], e = E[14], off = pa - e * pb / h, cup = EAR.cup * sat((pb - .03) / .09);
	const pc = (px * E[9] + py * E[10] + pz * E[11] - cup * off * off) / sqrt(1 + 4 * cup * cup * off * off);
	const q0 = pa - max(-w, min(w, pa));
	const e1x = e - w, v1x = pa - w, k1 = sat((v1x * e1x + pb * h) / (e1x * e1x + h * h)), q1x = v1x - e1x * k1, q1y = pb - h * k1;
	const e2x = -w - e, v2x = pa - e, v2y = pb - h, k2 = sat((v2x * e2x - v2y * h) / (e2x * e2x + h * h)), q2x = v2x - e2x * k2, q2y = v2y + h * k2;
	const d2 = sqrt(min(q0 * q0 + pb * pb, q1x * q1x + q1y * q1y, q2x * q2x + q2y * q2y)) * (min(pb, pb * e1x - v1x * h, v2x * h + v2y * e2x) > 0 ? -1 : 1) - EAR.round;
	const o = d2 > 0 ? d2 : 0;
	earB = pb;
	earE = d2;
	return sqrt(o * o + pc * pc) - lerp(EAR.thick[0], EAR.thick[1], sat(pb / h));
}
function tail(x, y, z) {
	const ox = max(TBOX[0] - x, x - TBOX[3], 0), oy = max(TBOX[1] - y, y - TBOX[4], 0), oz = max(TBOX[2] - z, z - TBOX[5], 0), far = sqrt(ox * ox + oy * oy + oz * oz) - TAILR[0];
	if (far > .25) return far;
	let best = 1e9;
	for (let i = 0; i < TN; i++) {
		const px = x - TP[i * 3], py = y - TP[i * 3 + 1], pz = z - TP[i * 3 + 2], ex = TE[i * 4], ey = TE[i * 4 + 1], ez = TE[i * 4 + 2];
		const h = sat((px * ex + py * ey + pz * ez) * TE[i * 4 + 3]), qx = px - ex * h, qy = py - ey * h, qz = pz - ez * h, d2 = qx * qx + qy * qy + qz * qz;
		if (d2 < best) {
			best = d2;
			tailI = i;
			tailT = TS[i] + (TS[i + 1] - TS[i]) * h;
		}
	}
	return sqrt(best) - (tailT < .5 ? lerp(TAILR[0], TAILR[1], tailT * 2) : lerp(TAILR[1], TAILR[2], tailT * 2 - 1));
}
var FAR = .16;
var ball = (c, r) => [
	...c,
	r,
	(r + FAR) ** 2
];
var NECKB = ball([
	-.75,
	.2,
	.02
], .36);
var ARMB = ball([
	-.555,
	.06,
	.105
], .34);
var HEADB = ball(HC, .45 * HS);
var bound = (x, y, z, B) => {
	const px = x - B[0], py = y - B[1], pz = z - B[2], d2 = px * px + py * py + pz * pz;
	return d2 > B[4] ? sqrt(d2) - B[3] : -1;
};
function core(x, y, z) {
	dT = smin(torso(x, y, z), ellAt(x, y, z, MOUND), .16);
	const hx = x - HQ[0], hz = z - HQ[2];
	thigh = ell(hx * HQC + hz * HQS, y - HQ[1], hz * HQC - hx * HQS, HQR[0], HQR[1], HQR[2]);
	neck = bound(x, y, z, NECKB);
	if (neck < 0) neck = smin(smin(cap(x, y, z, NECK[0], NECK[1], .17, .15), ellAt(x, y, z, SHOULDER), .08), ellAt(x, y, z, BREAST), .08);
	return smin(smin(dT, thigh, .04), neck, .08);
}
var lie = (x, z) => {
	let a = 0, b = .9;
	if (core(x, .001, z) > 0) return 0;
	for (let i = 0; i < 40; i++) {
		const m = (a + b) / 2;
		core(x, m, z) < 0 ? a = m : b = m;
	}
	return a;
};
var HIND = (() => {
	const hock = [-.6, -.45], toe = [-.75, -.27], y = lie(toe[0], toe[1]) + .02, l = hypot(toe[0] - hock[0], toe[1] - hock[1]);
	return {
		hock: [
			hock[0],
			y,
			hock[1]
		],
		toe: [
			toe[0],
			y,
			toe[1]
		],
		c: (toe[0] - hock[0]) / l,
		s: (toe[1] - hock[1]) / l
	};
})();
var PAWS = [
	[
		-.39,
		.052,
		.06,
		1,
		0
	],
	[
		-.365,
		.052,
		.2,
		1,
		0
	],
	[
		...HIND.toe,
		HIND.c,
		HIND.s
	]
];
var HINDB = ball([
	(HIND.hock[0] + HIND.toe[0]) / 2,
	HIND.toe[1],
	(HIND.hock[2] + HIND.toe[2]) / 2
], .23);
function sd(x, y, z) {
	let d = core(x, y, z);
	let shank = bound(x, y, z, HINDB), hind = shank;
	if (shank < 0) {
		shank = cap(x, y, z, HIND.hock, HIND.toe, .06, .055);
		hind = paw(x, y, z, PAWS[2]);
	}
	dHa = smin(thigh, shank, .04);
	armD = dPw = bound(x, y, z, ARMB);
	if (armD < 0) {
		const a0 = cap(x, y, z, ARM[0][0], ARM[0][1], .06, .052), h0 = capH, a1 = cap(x, y, z, ARM[1][0], ARM[1][1], .06, .052);
		if (a1 < a0) {
			armD = a1;
			armH = capH;
			armI = 1;
		} else {
			armD = a0;
			armH = h0;
			armI = 0;
		}
		const p0 = paw(x, y, z, PAWS[0]), p1 = paw(x, y, z, PAWS[1]);
		if (p1 < p0) {
			dPw = p1;
			pawI = 1;
		} else {
			dPw = p0;
			pawI = 0;
		}
	}
	if (hind < dPw) {
		dPw = hind;
		pawI = 2;
	}
	dCh = min(neck, armD);
	dTa = tail(x, y, z);
	dHe = dEL = dER = bound(x, y, z, HEADB);
	if (dHe < 0) {
		const px = x - HC[0], py = y - HC[1], pz = z - HC[2];
		const s = (px * HL[0] + py * HL[1] + pz * HL[2]) / HS, u = (px * HU[0] + py * HU[1] + pz * HU[2]) / HS, f = (px * HF[0] + py * HF[1] + pz * HF[2]) / HS, as = abs(s);
		let h = ell(s, u, f, SKULL[0], SKULL[1], SKULL[2]);
		const cx = as - CHEEK[0], cy = u - CHEEK[1], cz = f - CHEEK[2];
		h = smin(h, sqrt(cx * cx + cy * cy + cz * cz) - CHEEK[3], .06);
		h = smin(h, ell(s, u - MUZZLE[0], f - MUZZLE[1], MUZZLE[2], MUZZLE[3], MUZZLE[4]), .04);
		const ey = BRIDGE[2] - BRIDGE[0], ez = BRIDGE[3] - BRIDGE[1], t = sat(((u - BRIDGE[0]) * ey + (f - BRIDGE[1]) * ez) / (ey * ey + ez * ez)), qy = u - BRIDGE[0] - ey * t, qz = f - BRIDGE[1] - ez * t;
		h = smin(h, sqrt(s * s + qy * qy + qz * qz) - lerp(.045, .032, t), .04);
		const ny = u - CHIN[0], nz = f - CHIN[1];
		dHe = HS * smin(h, sqrt(s * s + ny * ny + nz * nz) - CHIN[2], .03);
		dEL = HS * ear(EARS[0], s, u, f);
		dER = HS * ear(EARS[1], s, u, f);
	}
	d = smin(d, smin(smin(dHe, dEL, .02), dER, .02), .035);
	d = smin(d, smin(min(armD, shank), dPw, .03), .03);
	d = smin(d, dTa, .05);
	if (-y > d) d = -y;
	const bx = x - YOU[0], by = y - YOU[1], bz = z - YOU[2], b2 = bx * bx + by * by + bz * bz;
	if (b2 < .25) {
		const c = CLEAR - sqrt(b2), h = max(.03 - abs(d - c), 0) / .03;
		d = max(d, c) + h * h * .0075;
	}
	return d;
}
/** Approximate signed distance to the cat's skin (negative inside). Exact to first order at the surface. */
function catSDF(x, y, z) {
	return sd(x, y, z);
}
var gx = 0;
var gy = 0;
var gz = 0;
function grad(x, y, z) {
	const H = .001, a = sd(x + H, y - H, z - H), b = sd(x - H, y - H, z + H), c = sd(x - H, y + H, z - H), e = sd(x + H, y + H, z + H);
	gx = (a - b - c + e) / (4 * H);
	gy = (-a - b + c + e) / (4 * H);
	gz = (-a + b - c + e) / (4 * H);
	return sqrt(gx * gx + gy * gy + gz * gz);
}
/** The point where the ray from o (inside) along dir leaves the body. */
function exit(o, dir, far = .6) {
	let a = 0, b = far;
	for (let i = 0; i < 40; i++) {
		const m = (a + b) / 2;
		sd(o[0] + dir[0] * m, o[1] + dir[1] * m, o[2] + dir[2] * m) < 0 ? a = m : b = m;
	}
	return add(o, dir, a);
}
var NOSE = exit(world(0, -.045, .15), HF);
var CAT = {
	you: {
		c: [...YOU],
		r: .22
	},
	head: [...HC],
	nose: NOSE,
	throat: world(0, -.17, .02),
	ears: EARS.map((E) => {
		const up = [
			0,
			1,
			2
		].map((j) => E[3 + j] * E[14] + E[6 + j] * E[13]), at = (k) => world(E[0] + up[0] * k, E[1] + up[1] * k, E[2] + up[2] * k);
		return {
			base: at(EAR.foot / E[13]),
			tip: exit(at(.75), axis(up)),
			axis: axis([
				E[3],
				E[4],
				E[5]
			])
		};
	}),
	tail: Array.from({ length: 16 }, (_, i) => [
		TP[i * 6],
		TP[i * 6 + 1],
		TP[i * 6 + 2]
	]),
	bounds: {
		min: [
			-1.56,
			0,
			-1.09
		],
		max: [
			.6,
			.7,
			.58
		]
	}
};
/** Whiskers, as [root, tip] pairs in the world: five a side (the cat's left, which is the ball's side, first), roots on the muzzle, fanned. */
var WHISKERS = [1, -1].flatMap((side) => [
	-2,
	-1,
	0,
	1,
	2
].map((k) => {
	const root = exit(world(side * .03, -.07 + k * .011, .17), axis([
		side * .7,
		0,
		.7
	]), .3);
	let d = axis([
		side,
		.08 + k * .16,
		.05 - abs(k) * .05
	]), want = .22 - abs(k) * .015;
	const out = unit(add(root, YOU, -1));
	if (dot(d, out) < 0 && hypot(...add(root, YOU, -1)) < CLEAR + want) {
		const e1 = unit(cross(out, HF)), e2 = cross(out, e1), fan = atan2(dot(add(HU, HF, -k * .45), e2), dot(add(HU, HF, -k * .45), e1));
		let best = -1e9;
		for (let i = 0; i < 24; i++) {
			const a = i / 24 * TAU, v = add(add([
				0,
				0,
				0
			], e1, cos(a)), e2, sin(a)), score = min(sd(...add(root, v, .015)), sd(...add(root, v, .03)), .004) - 6e-4 * abs((a - fan + 3 * PI) % TAU - PI);
			if (score > best) {
				best = score;
				d = v;
			}
		}
		want = .07;
	}
	let len = .03;
	while (len < want - 1e-9 && sd(root[0] + d[0] * (len + .01), root[1] + d[1] * (len + .01), root[2] + d[2] * (len + .01)) > .002) len += .01;
	return [root, add(root, d, len)];
}));
/** Chest expansion 0..1 at phase u of one breath (period 1): in for 40 %, out more slowly, then a short rest. */
function breath(u) {
	u -= floor(u);
	return u < .4 ? .5 - .5 * cos(PI * u / .4) : u < .92 ? .5 + .5 * cos(PI * (u - .4) / .52) : 0;
}
var COAT = [
	.357,
	.765,
	.85
];
var PALE = [
	.8,
	.95,
	1
];
var BANDS = 13.5;
var RINGS = 8;
var PD = /* @__PURE__ */ new Float64Array(8);
var PW = /* @__PURE__ */ new Float64Array(8);
var seg2 = (px, py, ax, ay, bx, by) => {
	const ex = bx - ax, ey = by - ay, h = sat(((px - ax) * ex + (py - ay) * ey) / (ex * ex + ey * ey));
	return hypot(px - ax - ex * h, py - ay - ey * h);
};
var line = (d, w) => 1 - smoothstep(w * .5, w, d);
var stroke = (v, hw) => 1 - smoothstep(hw * .6, hw * 1.3, abs(v));
var ring = (v) => smoothstep(.45, .7, .5 + .5 * cos(TAU * v));
var CHEEKLINES = [[[
	.145,
	.05,
	.14
], [
	.24,
	-.005,
	.03
]], [[
	.11,
	-.03,
	.17
], [
	.215,
	-.085,
	.06
]]].map((l) => l.map(unit));
function arc(cs, cu, cf, L) {
	const a = L[0], b = L[1], ex = b[0] - a[0], ey = b[1] - a[1], ez = b[2] - a[2], h = sat(((cs - a[0]) * ex + (cu - a[1]) * ey + (cf - a[2]) * ez) / (ex * ex + ey * ey + ez * ez));
	return hypot(cs - a[0] - ex * h, cu - a[1] - ey * h, cf - a[2] - ez * h);
}
var EARW = EARS.map((E) => [[
	0,
	1,
	2
].map((j) => E[3 + j] * E[14] + E[6 + j] * E[13]), [
	E[9],
	E[10],
	E[11]
]].map(axis));
/** Everything about the surface point (x, y, z) with outward normal n, written into slot i of S. */
function coat(S, i, x, y, z, nx, ny, nz, rnd) {
	sd(x, y, z);
	PD[0] = dT;
	PD[1] = dHa;
	PD[2] = dCh;
	PD[3] = dHe;
	PD[4] = dEL;
	PD[5] = dER;
	PD[6] = dTa;
	PD[7] = dPw;
	let part = 0;
	for (let k = 1; k < 8; k++) if (PD[k] < PD[part]) part = k;
	let ws = 0;
	for (let k = 0; k < 8; k++) {
		const w = max(0, 1 - (PD[k] - PD[part]) / .06);
		ws += PW[k] = w * w;
	}
	const tT = tailT, tI = tailI, aD = armD, aH = armH, A = ARM[armI], P = PAWS[pawI];
	let stripe = 0, order = 0, pale = 0, paint = 0, len = 0, lift = 0, fx = 0, fy = 0, fz = 0, along = 0;
	const mix = (k, st, or, pl, ln, lf, ax, ay, az) => {
		const w = PW[k] / ws, l = sqrt(ax * ax + ay * ay + az * az) || 1;
		stripe += w * st;
		order += w * or;
		pale += w * pl;
		len += w * ln;
		lift += w * lf;
		fx += w * ax / l;
		fy += w * ay / l;
		fz += w * az / l;
	};
	const dx = x - TCX, dz = z - TCZ, rho = sqrt(dx * dx + dz * dz);
	let th = atan2(dz, dx);
	if (th < TCUT) th += TAU;
	const u = (th - TH0) / (TH1 - TH0), uc = sat(u);
	section(uc);
	const phi = atan2((rho - trr) / (rho > trr ? two : twi), (y - TY) / thh), side = (1 - cos(phi)) / 2;
	const flank = phi > 0 ? phi / 1.75 : -phi / 1.3;
	const q = BANDS * u - 1.3 * side + .13 * sin(2.3 * phi + 9 * u) + .06 * sin(4.3 * phi - 17 * u + 1.7), k = floor(q + .5);
	const [h1, h2, h3, h4] = STRIPES.rows[k - STRIPES.k0] ?? [
		hash(k + 7.3),
		hash(k + 31.7),
		hash(k + 5.1),
		hash(k + 61.3)
	];
	const fork = h4 < .3 ? .24 * max(0, flank - .25 - .3 * h3) : 0, gap = h2 < .35 ? 1 - smoothstep(.02, .1, abs(flank - .3 - .5 * h1)) : 0;
	const hw = (.16 + .04 * (h2 - .5)) * (1 - .35 * smoothstep(.5, 1, flank));
	const band = (.72 + .28 * h3) * (1 - gap) * (phi < 0 ? 1 - smoothstep(.15, .5, flank) : 1 - smoothstep(.75, 1.05, flank)) * stroke(abs(q - k - .16 * (h1 - .5)) - fork, max(hw - fork, .6 * hw));
	const spine = .8 * (1 - smoothstep(.01, .035, abs(rho - trr))) * smoothstep(.8, .97, (y - TY) / thh);
	const mid = smoothstep(.06, MID[0], rho), tx = lerp(.83, -sin(th), mid), tz = lerp(-.55, cos(th), mid), down = smoothstep(.3, 1.5, abs(phi));
	if (PW[0] > 0) mix(0, max(band * smoothstep(-.12, .02, u) * (1 - smoothstep(1.02, 1.12, u)), spine * (1 - smoothstep(.98, 1.08, u))), .12 + .5 * uc, .3 * smoothstep(.35, .9, phi < 0 ? flank : 0), .07, 25, tx, -.7 * down, tz);
	if (PW[1] > 0) {
		const q = hypot(x - KNEE[0], y - KNEE[1], z - KNEE[2]) / .115 + .1 * sin(9 * x + 7 * y) + .06 * sin(17 * z - 11 * y) + .3, k = floor(q + .5), [r1, r2] = KNEE_RINGS.rows[k - KNEE_RINGS.k0] ?? [hash(k + 3.3), hash(k + 9.1)];
		mix(1, (.72 + .28 * r1) * stroke(q - k - .14 * (r2 - .5), .16) * smoothstep(.06, .16, y), .6 + .08 * sat(q / 5), 1 - smoothstep(.03, .1, y), .07, 25, tx * .6, -.8, tz * .6);
	}
	if (PW[2] > 0) {
		const arm = smoothstep(.12, .04, aD), low = (1 - smoothstep(.1, .2, y)) * smoothstep(-.8, -.68, x), bar = aH * 4.2 + .3;
		mix(2, lerp(max(band, spine) * (1 - low), stroke(bar - floor(bar + .5), .17) * (1 - smoothstep(.7, .95, aH)), arm), .1 + .08 * arm * aH, max(low * (1 - arm), arm * smoothstep(.55, .95, aH)), lerp(.07, .04, arm), lerp(25, 14, arm), lerp(-1, A[1][0] - A[0][0], arm), lerp(-.3, 0, arm), lerp(0, A[1][2] - A[0][2], arm));
	}
	const px = x - HC[0], py = y - HC[1], pz = z - HC[2];
	const s = (px * HL[0] + py * HL[1] + pz * HL[2]) / HS, hu = (px * HU[0] + py * HU[1] + pz * HU[2]) / HS, f = (px * HF[0] + py * HF[1] + pz * HF[2]) / HS, as = abs(s);
	if (PW[3] > 0) {
		const fan = .75 + .6 * smoothstep(.16, -.18, f), top = smoothstep(.06, .1, hu) * smoothstep(.2, .14, f);
		const m = max(line(abs(as - .022 * fan), .02), line(abs(as - .07 * fan), .02), .8 * line(abs(as - .12 * fan), .02) * smoothstep(.1, .02, f)) * top;
		const r = sqrt(s * s + hu * hu + f * f), cs = as / r, cu = hu / r, cf = f / r;
		const cheeks = max(line(r * arc(cs, cu, cf, CHEEKLINES[0]), .016), line(r * arc(cs, cu, cf, CHEEKLINES[1]), .016));
		const eye = line(min(seg2(as, hu, .045, .03, .09, .037), seg2(as, hu, .09, .037, .135, .062)), .01) * smoothstep(.05, .12, f);
		const leather = (1 - smoothstep(-.004, .004, max(hu + .026, -.06 - hu, as - .03 * (hu + .06) / .034))) * smoothstep(.19, .22, f);
		const mouth = line(min(seg2(as, hu, 0, -.06, 0, -.086), seg2(as, hu, 0, -.086, .022, -.096), seg2(as, hu, .022, -.096, .044, -.088)), .009) * smoothstep(.15, .19, f);
		paint = max(paint, sat(2 * PW[3] / ws) * max(eye, .9 * leather, .8 * mouth));
		const muzzle = 1 - smoothstep(.07, .13, hypot(as, hu + .075, (f - .17) * .8)), chin = smoothstep(-.06, -.12, hu) * smoothstep(-.02, .08, f);
		const face = smoothstep(0, .12, f) * smoothstep(.2, .1, as), jowl = smoothstep(.12, .2, as) * smoothstep(.04, -.06, hu);
		mix(3, max(m, cheeks) * (1 - max(muzzle, chin)), .1 * smoothstep(.18, -.2, f), max(muzzle, chin), lerp(lerp(.04, .022, face), .07, jowl), lerp(lerp(20, 12, face), 35, jowl), x - NOSE[0], y - NOSE[1], z - NOSE[2]);
	}
	for (let e = 0; e < 2; e++) if (PW[4 + e] > 0) {
		const E = EARS[e], [b, c] = EARW[e];
		ear(E, s, hu, f);
		const t = sat((earB - EAR.foot) / (E[13] + EAR.round + EAR.thick[1] - EAR.foot)), inside = smoothstep(.1, .4, nx * c[0] + ny * c[1] + nz * c[2]);
		if (part === 4 + e) along = t;
		paint = max(paint, .85 * sat(2 * PW[4 + e] / ws) * inside * smoothstep(.002, -.012, earE) * smoothstep(.97, .75, t));
		mix(4 + e, 0, .04, .7 * inside, .02, 8, b[0], b[1], b[2]);
	}
	if (PW[6] > 0) {
		if (part === 6) along = tT;
		mix(6, max(ring(RINGS * (1 - tT) + .05 * sin(5 * atan2(ny, nx))), smoothstep(.9, .95, tT)), .66 + .34 * tT, 0, .09, 35, TE[tI * 4], TE[tI * 4 + 1], TE[tI * 4 + 2]);
	}
	if (PW[7] > 0) {
		const lx = (x - P[0]) * P[3] + (z - P[2]) * P[4], lz = (z - P[2]) * P[3] - (x - P[0]) * P[4];
		paint = max(paint, .5 * sat(2 * PW[7] / ws) * line(min(abs(lz), abs(abs(lz) - .036)), .012) * smoothstep(0, .035, lx) * smoothstep(-.3, .1, ny + nx * P[3] + nz * P[4]));
		mix(7, 0, P === PAWS[2] ? .68 : .2, 1, .03, 12, P[3], 0, P[4]);
	}
	const fn = fx * nx + fy * ny + fz * nz;
	fx -= fn * nx;
	fy -= fn * ny;
	fz -= fn * nz;
	let fl = sqrt(fx * fx + fy * fy + fz * fz);
	if (fl < 1e-4) {
		fx = nx * ny;
		fy = ny * ny - 1;
		fz = nz * ny;
		fl = sqrt(fx * fx + fy * fy + fz * fz);
	}
	if (fl < 1e-4) {
		fx = 1 - nx * nx;
		fy = -nx * ny;
		fz = -nx * nz;
		fl = sqrt(fx * fx + fy * fy + fz * fz);
	}
	const cl = cos(lift * DEG) / fl, sl = sin(lift * DEG);
	let hx = fx * cl + nx * sl, hy = fy * cl + ny * sl, hz = fz * cl + nz * sl;
	if (y + hy * len < .001) {
		const dip = max(-1, (.001 - y) / len), nh = sqrt(nx * nx + nz * nz) || 1, inward = min(0, (hx * nx + hz * nz) / nh);
		let ax = hx - inward * nx / nh, az = hz - inward * nz / nh, al = sqrt(ax * ax + az * az);
		if (al < .001) {
			ax = nx;
			az = nz;
			al = nh;
		}
		const k = sqrt(1 - dip * dip) / al;
		hx = ax * k;
		hz = az * k;
		hy = dip;
	}
	const out = hx * nx + hy * ny + hz * nz;
	if (out < .05) {
		hx += (.05 - out) * nx;
		hy += (.05 - out) * ny;
		hz += (.05 - out) * nz;
		const l = sqrt(hx * hx + hy * hy + hz * hz);
		hx /= l;
		hy /= l;
		hz /= l;
	}
	const ribs = smoothstep(90 * DEG, 135 * DEG, th) * (1 - smoothstep(215 * DEG, 300 * DEG, th));
	const br = lerp(.5, ribs, smoothstep(.05, .25, rho)) * (PW[0] + PW[1] + PW[2]) / ws;
	const o = i * 4;
	S.pos[o] = x;
	S.pos[o + 1] = y;
	S.pos[o + 2] = z;
	S.pos[o + 3] = sat(order);
	S.nrm[o] = nx;
	S.nrm[o + 1] = ny;
	S.nrm[o + 2] = nz;
	S.nrm[o + 3] = sat(br);
	S.fur[o] = hx;
	S.fur[o + 1] = hy;
	S.fur[o + 2] = hz;
	S.fur[o + 3] = len;
	pale = sat(pale);
	S.col[o] = lerp(COAT[0], PALE[0], pale);
	S.col[o + 1] = lerp(COAT[1], PALE[1], pale);
	S.col[o + 2] = lerp(COAT[2], PALE[2], pale);
	S.col[o + 3] = sat(stripe) * (1 - pale);
	S.aux[o] = part;
	S.aux[o + 1] = along;
	S.aux[o + 2] = rnd;
	S.aux[o + 3] = sat(paint);
}
var EPS = .005;
var CELL = .025;
var BOX = [
	-1.6,
	0,
	-1.3,
	.7,
	.8,
	.7
];
var CELLS = null;
var GN = null;
function cells() {
	if (CELLS) return CELLS;
	GN = [
		0,
		1,
		2
	].map((j) => Math.ceil((BOX[3 + j] - BOX[j]) / CELL));
	const out = [], reach = .042800000000000005;
	for (let k = 0; k < GN[2]; k++) for (let j = 0; j < GN[1]; j++) for (let i = 0; i < GN[0]; i++) if (abs(sd(BOX[0] + (i + .5) * CELL, BOX[1] + (j + .5) * CELL, BOX[2] + (k + .5) * CELL)) < reach) out.push(i + GN[0] * (j + GN[1] * k));
	return CELLS = Int32Array.from(out);
}
/**
* N points on the cat, even per area, in a shuffled order (any prefix is the whole cat, thinner): five arrays of N * 4.
*   pos  xyz point            w  stripe order 0..1 (forehead … tail tip)
*   nrm  xyz outward normal   w  breathing weight 0..1
*   fur  xyz hair direction   w  hair length
*   col  rgb ground colour    a  stripe darkness 0..1
*   aux  x part (PART), y along the part (tail and ears: 0 base … 1 tip), z a random number, w paint darkness 0..1
*/
function catShape(N) {
	const S = {
		pos: new Float32Array(N * 4),
		nrm: new Float32Array(N * 4),
		fur: new Float32Array(N * 4),
		col: new Float32Array(N * 4),
		aux: new Float32Array(N * 4)
	};
	const C = cells(), r = rng(20260930);
	for (let i = 0; i < N;) {
		const c = C[r() * C.length | 0], ci = c % GN[0], cj = (c / GN[0] | 0) % GN[1], ck = c / (GN[0] * GN[1]) | 0;
		let x = BOX[0] + (ci + r()) * CELL, y = BOX[1] + (cj + r()) * CELL, z = BOX[2] + (ck + r()) * CELL;
		let d = sd(x, y, z);
		if (abs(d) > EPS * 1.6) continue;
		let g = grad(x, y, z);
		if (abs(d) > EPS * g) continue;
		for (let k = 0; k < 6 && abs(d) > 1e-6; k++) {
			const q = d / (g * g);
			x -= gx * q;
			y -= gy * q;
			z -= gz * q;
			if (y < 0) y = 0;
			d = sd(x, y, z);
			g = grad(x, y, z);
		}
		if (abs(d) > 2e-5) continue;
		if (y < .0015 && gy < -.5 * g) continue;
		coat(S, i++, x, y, z, gx / g, gy / g, gz / g, r());
	}
	return S;
}
//#endregion
export { CAT, WHISKERS, breath, catSDF, catShape };
