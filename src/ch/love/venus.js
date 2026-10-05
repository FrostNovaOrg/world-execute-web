//#region src/ch/love/venus.js
var TAU = 2 * Math.PI;
var VEN = {
	a: .723,
	w: 13 / 8,
	S: 1.6,
	years: 8,
	loops: 5,
	synodicDays: 583.92
};
var E0 = Math.atan2(.28, 1) + Math.PI - TAU * VEN.S / 2;
/** The Earth (me) and Venus (you) round the Sun at year t. */
var earth = (t) => [Math.cos(E0 + TAU * t), Math.sin(E0 + TAU * t)];
var venus = (t) => {
	const a = E0 + TAU * VEN.w * t;
	return [VEN.a * Math.cos(a), VEN.a * Math.sin(a)];
};
/** Venus as seen from the Earth: you in the frame of me. */
var geo = (t) => {
	const e = earth(t), v = venus(t);
	return [v[0] - e[0], v[1] - e[1]];
};
/** A point p of the Sun's frame at year t, in the frame k (0: centred on the Earth, 1: on the Sun). */
var inFrame = (p, t, k) => {
	const e = earth(t);
	return [p[0] - (1 - k) * e[0], p[1] - (1 - k) * e[1]];
};
/** Retrograde loops (inferior conjunctions) passed in (0, t]. */
var loopsBy = (t) => Math.max(0, Math.floor(t / VEN.S + 1e-9));
/** Where a ray from c (inside the curve F < 0) at angle th first leaves it (F ≥ 0): marched, then bisected. */
function rayExit(F, c, th, { step = .01, max = 4 } = {}) {
	const dx = Math.cos(th), dy = Math.sin(th), at = (s) => F(c[0] + dx * s, c[1] + dy * s);
	let a = 0, b = step;
	while (at(b) < 0 && b < max) {
		a = b;
		b += step;
	}
	for (let i = 0; i < 40; i++) {
		const m = (a + b) / 2;
		if (at(m) < 0) a = m;
		else b = m;
	}
	return [c[0] + dx * b, c[1] + dy * b];
}
/** The rose as a polyline (n points from year t0 to t1, in the frame k), z = 0. */
function rosePts(t0, t1, n, k = 0) {
	const out = [];
	for (let i = 0; i <= n; i++) {
		const t = t0 + (t1 - t0) * i / n;
		out.push([...inFrame(venus(t), t, k), 0]);
	}
	return out;
}
/** The notebook's cell (love/curves.js notebook): the 8 years drawn by their pen around me (a small ring). */
function venusCell() {
	const pts = rosePts(0, VEN.years, 1600), ring = [];
	for (let i = 0; i <= 48; i++) {
		const a = i / 48 * TAU;
		ring.push([
			.07 * Math.cos(a),
			.07 * Math.sin(a),
			0
		]);
	}
	const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]), cum = [0];
	for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
	return {
		name: "venus · seen from me",
		f: ["p(t) = 0.723 e^(i·13t/8) − e^(it)", "8 yr · 5 loops · frame: me"],
		par: "t",
		range: [0, VEN.years],
		pts,
		extra: [ring],
		c: [0, 0],
		step: .25,
		box: [
			Math.min(...xs),
			Math.min(...ys),
			Math.max(...xs),
			Math.max(...ys)
		],
		cum
	};
}
//#endregion
export { VEN, earth, geo, inFrame, loopsBy, rayExit, rosePts, venus, venusCell };
