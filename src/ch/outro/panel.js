import { clamp } from "../../engine/math.js?v=BJIlRm7-";
import { HEX } from "../../theme.js?v=Bj33PIbo";
import { cursorQuad, drawCursor } from "../intro/cursor.js?v=B0VCQBJX";
//#region src/ch/outro/panel.js
var fmtN = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
/**
* rows: [{ key, value, color?, weight?, glow?, glowColor?, swatch?: { color, k } }]; o: x, y (header baseline), size,
* lh, alpha, open (0..1 of the frame), caret: row index whose value has the typing cursor (or -1); syntax (the remake:
* the intro's highlighting colours for the keyword, the name, the property names and the braces, intro/palette.js).
*/
function drawPanelRows(L, rows, o = {}) {
	const x = o.x ?? 560, y = o.y ?? 330, size = o.size ?? 50, lh = o.lh ?? 72, a = o.alpha ?? 1, open = clamp(o.open ?? 1);
	const cell = size * .6, keyX = x + cell * 2, valX = x + cell * 9, style = {
		size,
		weight: 500,
		font: "JetBrains Mono",
		align: "left"
	};
	const n = rows.length, shown = Math.ceil(open * (n + 2)), sx = o.syntax;
	if (shown <= 0 || a <= 0) return;
	L.draw((g) => {
		g.globalAlpha *= a * .5;
		g.strokeStyle = HEX.dim;
		g.lineWidth = 1;
		g.beginPath();
		g.moveTo(x - cell * .8, y - lh * .55);
		g.lineTo(x - cell * .8, y - lh * .55 + lh * (n + 2) * open);
		g.stroke();
	});
	for (let i = 0; i < Math.min(shown, n + 2); i++) L.text(String(i + 1), x - cell * 1.6, y + i * lh, {
		...style,
		size: size * .5,
		color: HEX.dim,
		alpha: a * .6,
		align: "right"
	});
	if (shown >= 1) {
		L.text("object", x, y, {
			...style,
			color: sx?.keyword ?? HEX.dim,
			alpha: a,
			...sx ? {
				glow: 6,
				glowColor: sx.glow.keyword
			} : {}
		});
		L.text(o.name ?? "me", x + cell * 7, y, {
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
	rows.forEach((r, i) => {
		if (shown < i + 2) return;
		const yy = y + (i + 1) * lh;
		L.text(r.key, keyX, yy, {
			...style,
			color: sx?.key ?? "#8d97ad",
			alpha: a * (r.keyAlpha ?? 1),
			...sx ? {
				glow: 4,
				glowColor: sx.glow.key
			} : {}
		});
		const vs = {
			...style,
			weight: r.weight ?? 600
		};
		if (r.value) L.text(r.value, valX, yy, {
			...vs,
			color: r.color ?? HEX.white,
			alpha: a * (r.alpha ?? 1),
			glow: r.glow ?? 6,
			glowColor: r.glowColor ?? "#9fb0d0"
		});
		if (r.swatch) {
			const sx = valX + cell * ((r.swatchAt ?? r.value.length) + 1), k = clamp(r.swatch.k);
			L.draw((g) => {
				g.globalAlpha *= a;
				g.strokeStyle = HEX.dim;
				g.lineWidth = 1.2;
				g.strokeRect(sx, yy - size * .36, size * .72, size * .72);
				if (k > 0) {
					g.fillStyle = r.swatch.color;
					g.shadowColor = r.swatch.color;
					g.shadowBlur = 18;
					g.fillRect(sx + 4, yy - size * .36 + 4 + (1 - k) * (size * .72 - 8), size * .72 - 8, (size * .72 - 8) * k);
				}
			});
		}
		if (o.caret === i) cur = [valX + (r.value ? L.measure(r.value, vs) : 0) + cell * .5, yy + size * .42];
	});
	if (shown >= n + 2) L.text("}", x, y + (n + 1) * lh, {
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
export { drawPanelRows, fmtN };
