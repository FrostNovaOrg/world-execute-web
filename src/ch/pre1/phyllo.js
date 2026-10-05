import { ProcPoints, v3u } from "../c1/points.js?v=DdDvWrYF";
//#region src/ch/pre1/phyllo.js
var GOLDEN = Math.PI * (3 - Math.sqrt(5));
var PHY = {
	seeds: 4096,
	per: 64,
	c: .025
};
var GLSL = `
uniform float uAlpha, uRot, uGrow, uSeedR, uDome, uFam;
uniform vec3 uColA, uColB, uGold;
void particle(float i, out vec3 pos, out vec3 col, out float sz) {
  float n = floor(i / 64.), g = uGrow * 4096.;
  if (n > g) { col = vec3(0.); return; }
  float r = .025 * sqrt(n + .5), th = n * uAlpha + uRot;
  vec3 c = vec3(r * cos(th), uDome * (1.6 * 1.6 - r * r), r * sin(th));
  vec3 dir = normalize(hash31(i * 1.37 + 2.) * 2. - 1. + 1e-4);
  float rr = pow(hash11(i * 2.71 + .3), .3333), birth = clamp((g - n) / 90., 0., 1.);
  pos = c + dir * rr * uSeedR * (.5 + .7 * sqrt(n / 4096.)) * birth;
  // two Fibonacci families picked out: 3 of the 55 spirals in gold, 2 of the 89 in white
  float f21 = step(mod(mod(n, 55.), 18.), .5) * step(mod(n, 55.), 36.5), f34 = step(mod(mod(n, 89.), 44.), .5) * step(mod(n, 89.), 44.5);
  col = mix(uColA, uColB, sqrt(n / 4096.));
  col = mix(col, uGold * 1.9, f21 * uFam);
  col = mix(col, vec3(.9, .95, 1.) * 1.3, f34 * uFam * .7 * (1. - f21));
  sz = 1. + .45 * f21 * uFam;
}`;
function makePhyllo() {
	return new ProcPoints({
		count: PHY.seeds * PHY.per,
		glsl: GLSL,
		uniforms: {
			uAlpha: { value: GOLDEN },
			uRot: { value: 0 },
			uGrow: { value: 1 },
			uSeedR: { value: .012 },
			uDome: { value: .05 },
			uFam: { value: 1 },
			uColA: v3u(),
			uColB: v3u(),
			uGold: v3u()
		}
	});
}
/** The visible parastichy pair at seed n for divergence angle alpha: the two nearest-neighbour index gaps. */
var FIB = [
	1,
	2,
	3,
	5,
	8,
	13,
	21,
	34,
	55,
	89,
	144,
	233,
	377
];
function parastichies(alpha, n = 2e3) {
	const p = (k) => {
		const r = Math.sqrt(k + .5), a = k * alpha;
		return [r * Math.cos(a), r * Math.sin(a)];
	};
	const P = p(n), d = [];
	for (let q = 1; q <= 160; q++) {
		const Q = p(n + q);
		d.push([Math.hypot(Q[0] - P[0], Q[1] - P[1]), q]);
	}
	d.sort((a, b) => a[0] - b[0]);
	const a = d[0][1];
	let b = d.find((x) => x[1] !== a && x[1] % a !== 0 && a % x[1] !== 0)?.[1] ?? d[1][1];
	return a < b ? [a, b] : [b, a];
}
//#endregion
export { FIB, GOLDEN, PHY, makePhyllo, parastichies };
