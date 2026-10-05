//#region src/engine/math.js
var TAU = Math.PI * 2;
var clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
var lerp = (a, b, k) => a + (b - a) * k;
var invLerp = (a, b, x) => (x - a) / (b - a);
var fract = (x) => x - Math.floor(x);
/** How far t has got from a to b: 0 until a, 1 from b on, in proportion between. */
var seg = (t, a, b) => clamp(invLerp(a, b, t));
var smoothstep = (a, b, x) => {
	const k = clamp((x - a) / (b - a));
	return k * k * (3 - 2 * k);
};
var mix3 = (a, b, k) => [
	lerp(a[0], b[0], k),
	lerp(a[1], b[1], k),
	lerp(a[2], b[2], k)
];
var c = clamp;
var ease = {
	linear: (x) => c(x),
	inQuad: (x) => c(x) ** 2,
	outQuad: (x) => 1 - (1 - c(x)) ** 2,
	inOutQuad: (x) => {
		x = c(x);
		return x < .5 ? 2 * x * x : 1 - (-2 * x + 2) ** 2 / 2;
	},
	inCubic: (x) => c(x) ** 3,
	outCubic: (x) => 1 - (1 - c(x)) ** 3,
	inOutCubic: (x) => {
		x = c(x);
		return x < .5 ? 4 * x ** 3 : 1 - (-2 * x + 2) ** 3 / 2;
	},
	inExpo: (x) => {
		x = c(x);
		return x === 0 ? 0 : 2 ** (10 * x - 10);
	},
	outExpo: (x) => {
		x = c(x);
		return x === 1 ? 1 : 1 - 2 ** (-10 * x);
	},
	inOutExpo: (x) => {
		x = c(x);
		if (x === 0 || x === 1) return x;
		return x < .5 ? 2 ** (20 * x - 10) / 2 : (2 - 2 ** (10 - 20 * x)) / 2;
	},
	inOutSine: (x) => -(Math.cos(Math.PI * c(x)) - 1) / 2,
	outBack: (x, s = 1.70158) => {
		x = c(x) - 1;
		return 1 + (s + 1) * x ** 3 + s * x ** 2;
	},
	outElastic: (x) => {
		x = c(x);
		if (x === 0 || x === 1) return x;
		return 1 + Math.sin((10 * x - .75) * TAU / 3) * 2 ** (-10 * x);
	}
};
/**
* The value at time t of a list of keys [[time, value], ...] in time order (a value is a number or an array of numbers):
* the first value up to the first time, the last one from the last time on, and in between the two keys around t mixed
* by the eased share e(...) of the gap that t has crossed (default ease.inOutCubic; arrays are mixed element by element).
*/
function kf(t, keys, e = ease.inOutCubic) {
	const first = keys[0];
	if (t <= first[0]) return first[1];
	let hi = 1;
	while (hi < keys.length && !(t < keys[hi][0])) hi += 1;
	if (hi === keys.length) return keys[hi - 1][1];
	const lo = keys[hi - 1], up = keys[hi];
	const k = e((t - lo[0]) / (up[0] - lo[0]));
	if (!Array.isArray(lo[1])) return lerp(lo[1], up[1], k);
	const out = new Array(lo[1].length);
	for (let j = 0; j < out.length; j++) out[j] = lerp(lo[1][j], up[1][j], k);
	return out;
}
var mixBits = (x) => {
	x ^= x >>> 18;
	x = Math.imul(x, 3031247185);
	x ^= x >>> 14;
	x = Math.imul(x, 711895479);
	x ^= x >>> 15;
	x = Math.imul(x, 2710199483);
	return (x ^ x >>> 16) >>> 0;
};
var KEY = /* @__PURE__ */ new DataView(/* @__PURE__ */ new ArrayBuffer(8));
/** A number's 64 bits, read little-endian (the same words on every machine), stirred into the state h; -0 counts as 0. */
function absorb(h, n) {
	KEY.setFloat64(0, n === 0 ? 0 : n, true);
	return mixBits(mixBits(h ^ KEY.getUint32(0, true)) ^ KEY.getUint32(4, true));
}
/** A stable pseudo-random value in [0, 1) for any finite number key: the same key gives the same value. */
var hash = (n) => absorb(3361586708, n) / 4294967296;
/** The same for a pair of keys; hash2(a, b) and hash2(b, a) are unrelated. */
var hash2 = (a, b) => absorb(absorb(2513637923, a), b) / 4294967296;
/** Seeded generator (mulberry32). Create it inside draw() from a fixed seed; never keep one alive across frames. */
function rng(seed) {
	let s = seed >>> 0 || 1;
	return () => {
		s = s + 1831565813 >>> 0;
		let t = s;
		t = Math.imul(t ^ t >>> 15, t | 1);
		t ^= t + Math.imul(t ^ t >>> 7, t | 61);
		return ((t ^ t >>> 14) >>> 0) / 4294967296;
	};
}
/** sRGB hex ('#rrggbb') to linear [r, g, b] for shader uniforms. */
function linearRGB(hex) {
	const n = parseInt(hex.slice(1), 16), f = (v) => {
		v /= 255;
		return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4;
	};
	return [
		f(n >> 16 & 255),
		f(n >> 8 & 255),
		f(n & 255)
	];
}
//#endregion
export { TAU, clamp, ease, fract, hash, hash2, invLerp, kf, lerp, linearRGB, mix3, rng, seg, smoothstep };
