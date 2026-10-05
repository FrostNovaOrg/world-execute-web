//#region src/ch/v2/molecules.js
var D2R = Math.PI / 180;
var sub = (a, b) => [
	a[0] - b[0],
	a[1] - b[1],
	a[2] - b[2]
];
var add = (a, b) => [
	a[0] + b[0],
	a[1] + b[1],
	a[2] + b[2]
];
var mul = (a, k) => [
	a[0] * k,
	a[1] * k,
	a[2] * k
];
var dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
var len = (a) => Math.hypot(a[0], a[1], a[2]);
var unit = (a) => mul(a, 1 / (len(a) || 1));
var cross = (a, b) => [
	a[1] * b[2] - a[2] * b[1],
	a[2] * b[0] - a[0] * b[2],
	a[0] * b[1] - a[1] * b[0]
];
/** NeRF: the atom bonded to C with |CD| = r, ∠BCD = θ, dihedral A-B-C-D = φ (degrees). */
function nerf(A, B, C, r, th, ph) {
	const bc = unit(sub(C, B)), n = unit(cross(sub(B, A), bc)), m = cross(n, bc);
	th *= D2R;
	ph *= D2R;
	return add(C, add(mul(bc, -r * Math.cos(th)), add(mul(m, r * Math.sin(th) * Math.cos(ph)), mul(n, r * Math.sin(th) * Math.sin(ph)))));
}
/** Two tetrahedral H positions on an sp3 centre C with heavy neighbours X and Y. */
function sp3H2(C, X, Y, r = 1.09) {
	const u = unit(sub(X, C)), v = unit(sub(Y, C)), b = unit(add(u, v)), n = unit(cross(u, v)), a = 54.75 * D2R;
	return [add(C, mul(add(mul(b, -Math.cos(a)), mul(n, Math.sin(a))), r)), add(C, mul(add(mul(b, -Math.cos(a)), mul(n, -Math.sin(a))), r))];
}
/** In-plane H on an sp2 centre C with neighbours X and Y (exterior bisector). */
function sp2H(C, X, Y, r = 1.08) {
	return add(C, mul(unit(add(unit(sub(C, X)), unit(sub(C, Y)))), r));
}
var Mol = class {
	constructor() {
		this.atoms = [];
		this.bonds = [];
	}
	atom(el, p, q = null) {
		this.atoms.push({
			el,
			p,
			q,
			h: el === "H"
		});
		return this.atoms.length - 1;
	}
	bond(a, b, order = 1) {
		this.bonds.push({
			a,
			b,
			order
		});
		return this;
	}
	P(i) {
		return this.atoms[i].p;
	}
};
function lycopene() {
	const M = new Mol();
	const dbl = /* @__PURE__ */ new Set([
		2,
		6,
		8,
		10,
		12,
		14,
		16,
		18,
		20,
		22,
		24,
		26,
		30
	]), methyl = /* @__PURE__ */ new Set([
		2,
		6,
		10,
		14,
		19,
		23,
		27,
		31
	]);
	const sp3 = /* @__PURE__ */ new Set([
		1,
		4,
		5,
		28,
		29,
		32
	]);
	const bondLen = (k) => dbl.has(k) ? 1.35 : sp3.has(k) && sp3.has(k + 1) ? 1.53 : sp3.has(k) || sp3.has(k + 1) ? 1.5 : 1.45;
	const beside = new Set([...methyl].flatMap((k) => [k - 1, k + 1]));
	const angleAt = (k) => sp3.has(k) ? 112 : methyl.has(k) ? 122 : beside.has(k) ? 124 : 123;
	const C = [], Q = [];
	let p = [
		0,
		0,
		0
	], q = [0, 0], a3 = 30 * D2R, a2 = 30 * D2R;
	for (let k = 1; k <= 32; k++) {
		C[k] = M.atom("C", p, q);
		Q[k] = q;
		if (k === 32) break;
		if (k > 1) {
			const side = k % 2 ? 1 : -1;
			a3 += side * (180 - angleAt(k)) * D2R;
			a2 += side * 60 * D2R;
		}
		const L = bondLen(k);
		p = add(p, [
			Math.cos(a3) * L,
			Math.sin(a3) * L,
			0
		]);
		q = [q[0] + Math.cos(a2), q[1] + Math.sin(a2)];
	}
	for (let k = 1; k < 32; k++) M.bond(C[k], C[k + 1], dbl.has(k) ? 2 : 1);
	const Me = {};
	for (const k of methyl) {
		const P = M.P(C[k]), d3 = unit(add(unit(sub(P, M.P(C[k - 1]))), unit(sub(P, M.P(C[k + 1]))))), q0 = Q[k];
		const d2 = (() => {
			const a = [q0[0] - Q[k - 1][0], q0[1] - Q[k - 1][1]], b = [q0[0] - Q[k + 1][0], q0[1] - Q[k + 1][1]], s = [a[0] + b[0], a[1] + b[1]], l = Math.hypot(...s);
			return [s[0] / l, s[1] / l];
		})();
		Me[k] = M.atom("C", add(P, mul(d3, 1.51)), [q0[0] + d2[0], q0[1] + d2[1]]);
		M.bond(C[k], Me[k]);
	}
	const H = (c, pos) => M.bond(c, M.atom("H", pos));
	const nb = (k) => [M.P(C[k - 1]), M.P(C[k + 1])];
	for (let k = 2; k <= 31; k++) {
		if (methyl.has(k)) continue;
		const [x, y] = nb(k);
		if (sp3.has(k)) for (const h of sp3H2(M.P(C[k]), x, y)) H(C[k], h);
		else H(C[k], sp2H(M.P(C[k]), x, y));
	}
	const methylH = (c, parent, ref) => {
		for (const ph of [
			30,
			150,
			270
		]) H(c, nerf(ref, parent, M.P(c), 1.09, 109.5, ph));
	};
	methylH(C[1], M.P(C[2]), M.P(C[3]));
	methylH(C[32], M.P(C[31]), M.P(C[30]));
	for (const k of methyl) methylH(Me[k], M.P(C[k]), M.P(C[k - 1]));
	center(M);
	return {
		...M,
		P: void 0,
		name: "lycopene",
		formula: "C₄₀H₅₆",
		mass: mass(M),
		labels: [],
		order: skeletalOrder(M, C[1]),
		conj: 11
	};
}
var MASS = {
	C: 12.011,
	H: 1.008,
	N: 14.007,
	O: 15.999,
	S: 32.06
};
function mass(M) {
	return M.atoms.reduce((s, a) => s + MASS[a.el], 0);
}
function center(M) {
	const heavy = M.atoms.filter((a) => !a.h), c = heavy.reduce((s, a) => add(s, a.p), [
		0,
		0,
		0
	]).map((v) => v / heavy.length);
	const qs = M.atoms.filter((a) => a.q), qc = qs.reduce((s, a) => [s[0] + a.q[0], s[1] + a.q[1]], [0, 0]).map((v) => v / qs.length);
	for (const a of M.atoms) {
		a.p = sub(a.p, c);
		if (a.q) a.q = [a.q[0] - qc[0], a.q[1] - qc[1]];
	}
}
/** Heavy-atom bonds in breadth-first order from a start atom: the order a pen draws the skeletal formula. */
function skeletalOrder(M, start) {
	const heavy = M.bonds.map((b, i) => ({
		...b,
		i
	})).filter((b) => !M.atoms[b.a].h && !M.atoms[b.b].h);
	const seen = /* @__PURE__ */ new Set([start]), out = [], queue = [start], used = /* @__PURE__ */ new Set();
	while (queue.length) {
		const v = queue.shift();
		for (const b of heavy) {
			if (used.has(b.i) || b.a !== v && b.b !== v) continue;
			used.add(b.i);
			out.push(b.a === v ? b : {
				...b,
				a: b.b,
				b: b.a
			});
			const w = b.a === v ? b.b : b.a;
			if (!seen.has(w)) {
				seen.add(w);
				queue.push(w);
			}
		}
	}
	return out;
}
var CPK = {
	C: [
		.72,
		.76,
		.86
	],
	H: [
		.9,
		.9,
		.95
	],
	N: [
		.3,
		.5,
		1
	],
	O: [
		1,
		.3,
		.24
	],
	S: [
		1,
		.84,
		.3
	]
};
var RAD = {
	C: .3,
	H: .17,
	N: .29,
	O: .29,
	S: .38
};
/**
* Sample a ball-and-stick model into N particles (positions in Å × scale). Balls are sphere shells, bonds are
* cylinders coloured half by each atom; a double bond is two thinner parallel sticks in the local molecular plane.
* tint: colour multiplier for carbon (tones CPK to the section's palette). w = 0..1 order along the skeletal pen.
*/
function ballStick(N, mol, { scale = 1, tint = [
	1,
	1,
	1
], seed = 71, r } = {}) {
	const rand = r ?? mulberry(seed);
	const parts = [], A = mol.atoms;
	const colOf = (el) => el === "C" ? CPK.C.map((v, i) => v * tint[i]) : CPK[el];
	for (let i = 0; i < A.length; i++) {
		const R = RAD[A[i].el];
		parts.push({
			kind: "ball",
			i,
			R,
			area: 4 * Math.PI * R * R
		});
	}
	const neighbours = (i) => mol.bonds.filter((b) => b.a === i || b.b === i).map((b) => b.a === i ? b.b : b.a);
	for (const b of mol.bonds) {
		const pa = A[b.a].p, pb = A[b.b].p, L = len(sub(pb, pa)), rr = .075;
		if (b.order === 2) {
			const u = unit(sub(pb, pa)), other = [...neighbours(b.a), ...neighbours(b.b)].find((k) => k !== b.a && k !== b.b && !A[k].h) ?? neighbours(b.a).find((k) => k !== b.b);
			let off = other != null ? sub(A[other].p, pa) : [
				0,
				0,
				1
			];
			off = unit(sub(off, mul(u, dot(off, u))));
			for (const s of [-1, 1]) parts.push({
				kind: "stick",
				a: b.a,
				b: b.b,
				off: mul(off, s * .13),
				R: rr * .7,
				L,
				area: 2 * Math.PI * rr * .7 * L
			});
		} else parts.push({
			kind: "stick",
			a: b.a,
			b: b.b,
			off: [
				0,
				0,
				0
			],
			R: rr,
			L,
			area: 2 * Math.PI * rr * L
		});
	}
	const total = parts.reduce((s, p) => s + p.area, 0), cdf = [];
	let acc = 0;
	for (const p of parts) {
		acc += p.area / total;
		cdf.push(acc);
	}
	const pos = new Float32Array(N * 4), col = new Float32Array(N * 4), nrmA = new Float32Array(N * 4);
	const orderOf = /* @__PURE__ */ new Map();
	mol.order.forEach((b, k) => {
		orderOf.set(b.a, Math.min(orderOf.get(b.a) ?? 1, k / mol.order.length));
		orderOf.set(b.b, Math.min(orderOf.get(b.b) ?? 1, (k + 1) / mol.order.length));
	});
	const wOf = (i) => A[i].h ? orderOf.get(neighbours(i)[0]) ?? 1 : orderOf.get(i) ?? 0;
	for (let n = 0; n < N; n++) {
		const x = rand();
		let lo = 0, hi = cdf.length - 1;
		while (lo < hi) {
			const m = lo + hi >> 1;
			if (cdf[m] < x) lo = m + 1;
			else hi = m;
		}
		const pt = parts[lo];
		let p, nn, c, w;
		if (pt.kind === "ball") {
			const u = rand() * 2 - 1, a = rand() * Math.PI * 2, q = Math.sqrt(1 - u * u);
			nn = [
				q * Math.cos(a),
				q * Math.sin(a),
				u
			];
			p = add(A[pt.i].p, mul(nn, pt.R));
			c = colOf(A[pt.i].el);
			w = wOf(pt.i);
		} else {
			const pa = add(A[pt.a].p, pt.off), pb = add(A[pt.b].p, pt.off), u = unit(sub(pb, pa));
			const e1 = unit(cross(u, Math.abs(u[1]) < .9 ? [
				0,
				1,
				0
			] : [
				1,
				0,
				0
			])), e2 = cross(u, e1), t = rand(), a = rand() * Math.PI * 2;
			nn = add(mul(e1, Math.cos(a)), mul(e2, Math.sin(a)));
			p = add(add(pa, mul(sub(pb, pa), t)), mul(nn, pt.R));
			c = colOf(A[t < .5 ? pt.a : pt.b].el).map((v) => v * .8);
			w = lerp1(wOf(pt.a), wOf(pt.b), t);
		}
		pos.set([
			p[0] * scale,
			p[1] * scale,
			p[2] * scale,
			w
		], n * 4);
		col.set([...c, A[pt.i ?? pt.a].h ? 1 : 0], n * 4);
		nrmA.set([...nn, 0], n * 4);
	}
	return {
		pos,
		col,
		nrm: nrmA
	};
}
var lerp1 = (a, b, t) => a + (b - a) * t;
function mulberry(seed) {
	let s = seed >>> 0 || 1;
	return () => {
		s = s + 1831565813 >>> 0;
		let t = s;
		t = Math.imul(t ^ t >>> 15, t | 1);
		t ^= t + Math.imul(t ^ t >>> 7, t | 61);
		return ((t ^ t >>> 14) >>> 0) / 4294967296;
	};
}
//#endregion
export { CPK, ballStick, lycopene };
