//#region src/lib/glslhash.js
var F32 = /* @__PURE__ */ new DataView(/* @__PURE__ */ new ArrayBuffer(4));
var bits = (x) => {
	if (x === 0) return 0;
	F32.setFloat32(0, x, true);
	return F32.getUint32(0, true);
};
var mix = (x) => {
	x ^= x >>> 18;
	x = Math.imul(x, 3031247185);
	x ^= x >>> 14;
	x = Math.imul(x, 711895479);
	x ^= x >>> 15;
	x = Math.imul(x, 2710199483);
	return (x ^ x >>> 16) >>> 0;
};
var unit = (h) => (h >>> 8) / 16777216;
var hash12 = (x, y) => unit(mix(mix(bits(x) ^ 4228997049) ^ bits(y)));
function hash33(x, y, z) {
	const h = mix(mix(mix(bits(x) ^ 2439085191) ^ bits(y)) ^ bits(z));
	return [
		unit(h),
		unit(mix(h ^ 3419590730)),
		unit(mix(h ^ 325013045))
	];
}
//#endregion
export { hash12, hash33 };
