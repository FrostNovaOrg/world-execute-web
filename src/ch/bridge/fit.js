//#region src/ch/bridge/fit.js
var pow2 = (x) => 2 ** Math.ceil(Math.log2(Math.max(1, x)));
/** Atlas geometry at scale k for `rows` text rows: font px, row height, canvas width and height. */
function traceSize(k, rows) {
	const F = Math.round(22 * k), RH = Math.round(F * 1.5);
	return {
		F,
		RH,
		W: Math.min(4096, pow2(F * .62 * 86)),
		H: RH * rows
	};
}
/** The largest scale k·0.9ⁿ whose atlas height fits the GPU's max texture size (phones: often 4096 or 8192). */
function traceScale(k, rows, maxTex) {
	while (k > .3 && traceSize(k, rows).H > maxTex) k *= .9;
	return k;
}
//#endregion
export { traceScale, traceSize };
