//#region src/ch/outro/logo.js
var LOGO = "FrostNovaOrg";
var FONT = "Avenir Next";
var WEIGHT = 600;
var SPLIT = 9;
var WHITE = "#eaf2f8";
var CYAN = "#5ad9ff";
var BLUE = "#3f86ff";
/** The mark's size for a line of JetBrains Mono at `size` (matching cap heights). */
var logoSize = (size) => size * 1.04;
var style = (size, o = {}) => ({
	size,
	font: FONT,
	weight: WEIGHT,
	align: "left",
	tracking: -size * .01,
	...o
});
/** Width of the first n characters of the mark, in design units. */
function logoWidth(L, size, n = 12) {
	return n <= 0 ? 0 : L.measure(LOGO.slice(0, n), style(size));
}
/**
* Draw the first `o.chars` characters of the mark at (x, y): left-aligned, middle baseline, like L.text. o: chars,
* alpha, glow, glowColor.
*/
function drawLogo(L, x, y, size, o = {}) {
	const n = Math.min(12, o.chars ?? 12), a = o.alpha ?? 1;
	if (a <= .002 || n <= 0) return;
	const s1 = LOGO.slice(0, Math.min(n, SPLIT)), s2 = LOGO.slice(SPLIT, n), hair = size * .022;
	const st = style(size, {
		alpha: a,
		glow: o.glow,
		glowColor: o.glowColor,
		strokeWidth: hair
	});
	L.text(s1, x, y, {
		...st,
		color: WHITE,
		stroke: WHITE
	});
	if (!s2) return;
	const x2 = x + L.measure(s1, st), w2 = L.measure(s2, st);
	let gr = null;
	L.draw((g) => {
		gr = g.createLinearGradient(0, -size * .7, w2, size * .3);
		gr.addColorStop(0, CYAN);
		gr.addColorStop(1, BLUE);
	});
	L.text(s2, x2, y, {
		...st,
		color: gr,
		stroke: gr
	});
}
//#endregion
export { LOGO, drawLogo, logoSize, logoWidth };
