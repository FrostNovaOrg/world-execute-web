import { __exportAll } from "../../_virtual/_rolldown/runtime.js?v=BLEs9rMG";
//#region src/subs/style.js
var style_exports = /* @__PURE__ */ __exportAll({
	STYLE: () => STYLE,
	drawSubtitle: () => drawSubtitle
});
var STYLE = Object.freeze({
	font: {
		family: "Subtitles",
		file: "assets/fonts/NotoSansSC-Medium-zh.ttf",
		weight: 500
	},
	align: "left",
	x: 146,
	base: 984,
	drop: 52,
	size: 38,
	ink: [
		170,
		180,
		200
	],
	alpha: .86,
	shadow: [.8, .5],
	mark: {
		text: "//",
		font: "JetBrains Mono",
		weight: 500,
		size: 30,
		gap: 12,
		color: "#aab4c8",
		alpha: .8
	},
	region: {
		x: 0,
		y: 900,
		w: 1200,
		h: 160
	}
});
/**
* Draw subtitle s ({ text, row, alpha, accent? } from subtitleAt; null clears) on a 2D context. The canvas shows the
* design-pixel area whose top left is `origin` at `scale` canvas pixels per design pixel. The fonts must be loaded
* under the family names in style. Self-contained (no imports, no outer names): render.mjs passes its source into a page.
*/
function drawSubtitle(g, s, style, scale = 1, origin = {
	x: 0,
	y: 0
}) {
	g.clearRect(0, 0, g.canvas.width, g.canvas.height);
	if (!s) return;
	const St = style, S = scale, m = St.mark;
	const x = (St.x - origin.x) * S, y = (St.base + s.row * St.drop - origin.y) * S;
	const font = `${St.font.weight} ${St.size * S}px "${St.font.family}"`, mfont = m && `${m.weight ?? 500} ${m.size * S}px "${m.font}"`;
	g.save();
	g.textBaseline = "alphabetic";
	g.font = font;
	const w = g.measureText(s.text).width, left = St.align === "center" ? x - w / 2 : St.align === "right" ? x - w : x;
	const OFF = 2e4;
	g.globalAlpha = s.alpha;
	for (const [blur, a] of [[6 * S, St.shadow[0]], [16 * S, St.shadow[1]]]) {
		g.shadowColor = `rgba(0,0,0,${a})`;
		g.shadowBlur = blur;
		g.shadowOffsetX = OFF;
		g.font = font;
		g.textAlign = "left";
		g.fillText(s.text, left - OFF, y);
		if (m) {
			g.font = mfont;
			g.textAlign = "right";
			g.fillText(m.text, left - m.gap * S - OFF, y);
		}
	}
	g.shadowColor = "transparent";
	g.shadowBlur = 0;
	g.shadowOffsetX = 0;
	if (m) {
		g.font = mfont;
		g.textAlign = "right";
		g.fillStyle = s.accent ?? m.color;
		g.globalAlpha = s.alpha * m.alpha;
		g.fillText(m.text, left - m.gap * S, y);
	}
	g.font = font;
	g.textAlign = "left";
	g.fillStyle = `rgb(${St.ink.join(",")})`;
	g.globalAlpha = s.alpha * St.alpha;
	g.fillText(s.text, left, y);
	g.restore();
}
//#endregion
export { STYLE, drawSubtitle, style_exports };
