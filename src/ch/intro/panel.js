import { clamp } from "../../engine/math.js?v=BJIlRm7-";
import { HEX } from "../../theme.js?v=Bj33PIbo";
import { cursorQuad, drawCursor } from "./cursor.js?v=B0VCQBJX";
//#region src/ch/intro/panel.js
var PARAMS = [
	{
		key: "name",
		value: "me"
	},
	{
		key: "N",
		value: "262144",
		count: 262144,
		note: "// params"
	},
	{
		key: "dim",
		value: "3"
	},
	{
		key: "color",
		value: "#7EF0FF",
		swatch: HEX.me
	},
	{
		key: "love",
		value: "null",
		dim: true
	}
];
/**
* Per-row progress from a schedule of [t0, t1] per row (row i types from t0 to t1, one character per step,
* quantised: characters appear on the grid, never in between). Returns [{ k: 0..1, n: chars shown, done }].
*/
function panelState(t, sched) {
	return PARAMS.map((p, i) => {
		const [t0, t1] = sched[i] ?? [Infinity, Infinity], len = p.count ? 4 : p.value.length;
		return {
			k: t < t0 ? 0 : t >= t1 ? 1 : Math.min(1, (Math.floor((t - t0) / ((t1 - t0) / len)) + 1) / len),
			done: t >= t1,
			typing: t >= t0 && t < t1 + .12
		};
	});
}
var fmt = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
/**
* Draw the panel on a text layer. st: panelState(); o: x, y (top-left of the header baseline), size, lh (line
* height), alpha, open (0..1 how much of the frame is drawn), accent (colour once set), t (for the cursor blink),
* T (Timing, for the blink phase), cyan (0..1 how far the colour row has "taken"); syntax (the remake: highlighting
* colours { keyword, name, key, number, punct, comment, glow: { keyword, key, number } }, intro/palette.js SYNTAX;
* the colour row and love's null keep theirs).
*/
function drawPanel(L, st, o = {}) {
	const x = o.x ?? 560, y = o.y ?? 330, size = o.size ?? 50, lh = o.lh ?? 72, a = o.alpha ?? 1, open = o.open ?? 1;
	const cell = size * .6, keyX = x + cell * 2, valX = x + cell * 9, style = {
		size,
		weight: 500,
		font: "JetBrains Mono",
		align: "left"
	};
	const rows = PARAMS.length, rowsShown = Math.ceil(clamp(open) * (rows + 2)), sx = o.syntax;
	L.draw((g) => {
		g.globalAlpha *= a * .5;
		g.strokeStyle = HEX.dim;
		g.lineWidth = 1;
		g.beginPath();
		g.moveTo(x - cell * .8, y - lh * .55);
		g.lineTo(x - cell * .8, y - lh * .55 + lh * (rows + 2) * clamp(open));
		g.stroke();
	});
	for (let i = 0; i < Math.min(rowsShown, rows + 2); i++) L.text(String(i + 1), x - cell * 1.6, y + i * lh, {
		...style,
		size: size * .5,
		color: HEX.dim,
		alpha: a * .6,
		align: "right"
	});
	if (rowsShown >= 1) {
		L.text("object", x, y, {
			...style,
			color: sx?.keyword ?? HEX.dim,
			alpha: a,
			...sx ? {
				glow: 6,
				glowColor: sx.glow.keyword
			} : {}
		});
		L.text("me", x + cell * 7, y, {
			...style,
			weight: 600,
			color: sx?.name ?? HEX.white,
			alpha: a
		});
		L.text("{", x + cell * 10, y, {
			...style,
			color: sx?.punct ?? HEX.dim,
			alpha: a
		});
	}
	let cur = null;
	PARAMS.forEach((p, i) => {
		if (rowsShown < i + 2) return;
		const yy = y + (i + 1) * lh, r = st[i];
		L.text(p.key, keyX, yy, {
			...style,
			color: sx?.key ?? "#8d97ad",
			alpha: a,
			...sx ? {
				glow: 4,
				glowColor: sx.glow.key
			} : {}
		});
		let shown = "";
		if (p.count) shown = r.k <= 0 ? "" : fmt(2 ** [
			6,
			10,
			14,
			18
		][Math.max(0, Math.round(r.k * 4) - 1)]);
		else shown = p.value.slice(0, Math.round(r.k * p.value.length));
		const num = sx && (p.count || /^\d+$/.test(p.value)), nameV = sx && p.key === "name";
		const col = p.swatch && r.done ? p.swatch : p.dim ? HEX.dim : num ? sx.number : nameV ? sx.name : HEX.white;
		if (shown) L.text(shown, valX, yy, {
			...style,
			weight: 600,
			color: col,
			alpha: a,
			glow: p.swatch && r.done ? 16 : 6,
			glowColor: p.swatch && r.done ? HEX.me : num ? sx.glow.number : "#9fb0d0"
		});
		if (p.note && r.done && o.notes !== false) {
			const nk = Math.round(clamp(o.noteK ?? 1) * p.note.length);
			if (nk) L.text(p.note.slice(0, nk), valX + L.measure(shown, {
				...style,
				weight: 600
			}) + cell * 2, yy, {
				...style,
				color: sx?.comment ?? HEX.dim,
				alpha: a * .9
			});
		}
		if (p.swatch && r.done) {
			const sx = valX + cell * (p.value.length + 1), k = clamp(o.cyan ?? 1);
			L.draw((g) => {
				g.globalAlpha *= a;
				g.strokeStyle = HEX.dim;
				g.lineWidth = 1.2;
				g.strokeRect(sx, yy - size * .36, size * .72, size * .72);
				g.fillStyle = p.swatch;
				g.shadowColor = p.swatch;
				g.shadowBlur = 18;
				g.fillRect(sx + 4, yy - size * .36 + 4 + (1 - k) * (size * .72 - 8), size * .72 - 8, (size * .72 - 8) * k);
			});
		}
		if (r.typing) cur = [valX + L.measure(shown, {
			...style,
			weight: 600
		}) + cell * .5, yy + size * .42];
	});
	if (rowsShown >= rows + 2) L.text("}", x, y + (rows + 1) * lh, {
		...style,
		color: sx?.punct ?? HEX.dim,
		alpha: a
	});
	if (cur) drawCursor(L, cursorQuad(cur[0], cur[1], size / 84), {
		alpha: a * .9,
		scale: size / 84,
		glow: 10
	});
	return {
		valX,
		keyX,
		cell,
		rowY: (i) => y + (i + 1) * lh
	};
}
//#endregion
export { PARAMS, drawPanel, panelState };
