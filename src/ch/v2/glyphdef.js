//#region src/ch/v2/glyphdef.js
var W = .36;
var rect = (x0, y0, x1, y1) => (x, y) => x >= x0 && x <= x1 && y >= y0 && y <= y1;
var stroke = (ax, ay, bx, by, w) => (x, y) => {
	const dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy, t = ((x - ax) * dx + (y - ay) * dy) / L2;
	if (t < -.02 || t > 1.02) return false;
	return Math.abs((x - ax) * dy - (y - ay) * dx) / Math.sqrt(L2) <= w / 2;
};
var vee = (ax, ay, vy, w, yCut) => {
	const dx = ax, dy = vy - ay, L = Math.hypot(dx, dy), L2 = L * L, h = w / 2;
	const nx = dy / L, ny = -dx / L;
	return (x, y) => {
		if (y < yCut) return false;
		const s1 = (x + ax) * nx + (y - ay) * ny, t1 = ((x + ax) * dx + (y - ay) * dy) / L2;
		const s2 = (x - ax) * -nx + (y - ay) * ny, t2 = ((x - ax) * -dx + (y - ay) * dy) / L2;
		if (s1 > h || s2 > h) return false;
		return Math.abs(s1) <= h && t1 >= -.02 || Math.abs(s2) <= h && t2 >= -.02;
	};
};
var GLYPH_DEF = {
	exists: {
		box: [
			-.8,
			-1,
			.8,
			1
		],
		parts: [
			rect(-.8, .64, .8, 1),
			rect(-.46, -.36 / 2, .8, W / 2),
			rect(-.8, -1, .8, -.64),
			rect(.44000000000000006, -1, .8, 1)
		]
	},
	qed: {
		box: [
			-1,
			-1,
			1,
			1
		],
		parts: [rect(-1, -1, 1, 1)]
	},
	F: {
		box: [
			-.8,
			-1,
			.8,
			1
		],
		parts: [
			rect(-.8, -1, -.44000000000000006, 1),
			rect(-.8, .64, .8, 1),
			rect(-.8, -.36 / 2, .5, W / 2)
		]
	},
	M: {
		box: [
			-.92,
			-1,
			.92,
			1
		],
		parts: [
			rect(-.92, -1, -.56, 1),
			rect(.56, -1, .92, 1),
			stroke(-.72, .97, 0, -.2, W * 1.05),
			stroke(.72, .97, 0, -.2, W * 1.05),
			rect(-.92, .82, -.56, 1),
			rect(.56, .82, .92, 1)
		]
	},
	M2: {
		box: [
			-.92,
			-1,
			.92,
			1
		],
		parts: [
			rect(-.92, -1, -.56, 1),
			rect(.56, -1, .92, 1),
			vee(.72, .97, -.2, W * 1.05, -.38),
			rect(-.92, .82, -.56, 1),
			rect(.56, .82, .92, 1)
		]
	}
};
var inGlyph = (g, x, y) => GLYPH_DEF[g].parts.some((f) => f(x, y));
//#endregion
export { GLYPH_DEF, inGlyph };
