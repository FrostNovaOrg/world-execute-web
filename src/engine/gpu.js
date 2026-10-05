import { ClampToEdgeWrapping, DataTexture, FloatType, GLSL3, HalfFloatType, LinearFilter, Mesh, NearestFilter, OrthographicCamera, PlaneGeometry, RGBAFormat, RGFormat, RedFormat, Scene, ShaderMaterial, UnsignedByteType, WebGLRenderTarget } from "../../vendor/three/build/three.core.js?v=q9f7JKE-";
//#region src/engine/gpu.js
var COMMON = "// common.glsl: shared GLSL helpers. Prepend with `import COMMON from '../engine/glsl/common.glsl?raw'`.\n#ifndef COMMON_GLSL\n#define COMMON_GLSL\n#define PI 3.14159265359\n#define TAU 6.28318530718\n\n// ---- hashing: integer mixing of the key's bits, so the same input bits give the same value on every GPU ----\n// bitMix is three rounds of xor-shift and multiply (the mixer of math.js hash): flipping any input bit flips each output\n// bit with a chance of one half, and keys that count up come out as scattered as random ones. A float key goes in as its\n// bit pattern (keyBits; -0 counts as 0), several keys one after the other, and each function starts from a seed of its\n// own, so for instance hash12(p) and hash22(p) are unrelated. A value in [0, 1) is the hash's top 24 bits (unitOf),\n// which a float holds exactly; a second and third value come from stirring the hash again with a constant.\nuint bitMix(uint x) {\n  x ^= x >> 18u; x *= 0xb4ad2951u; x ^= x >> 14u; x *= 0x2a6ea9b7u; x ^= x >> 15u; x *= 0xa18a5cbbu;\n  return x ^ (x >> 16u);\n}\nuint keyBits(float x) { return x == 0. ? 0u : floatBitsToUint(x); }\nfloat unitOf(uint h) { return float(h >> 8u) * (1. / 16777216.); }\nfloat hash11(float p) { return unitOf(bitMix(keyBits(p) ^ 0x77cc7938u)); }\nfloat hash12(vec2 p) { return unitOf(bitMix(bitMix(keyBits(p.x) ^ 0xfc115fb9u) ^ keyBits(p.y))); }\nvec2 hash22(vec2 p) {\n  uint h = bitMix(bitMix(keyBits(p.x) ^ 0xc87098cau) ^ keyBits(p.y));\n  return vec2(unitOf(h), unitOf(bitMix(h ^ 0xcbd2d04au)));\n}\nvec3 hash31(float p) {\n  uint h = bitMix(keyBits(p) ^ 0xe2d06a36u);\n  return vec3(unitOf(h), unitOf(bitMix(h ^ 0xcbd2d04au)), unitOf(bitMix(h ^ 0x135f4e35u)));\n}\nvec3 hash33(vec3 p) {\n  uint h = bitMix(bitMix(bitMix(keyBits(p.x) ^ 0x91617c87u) ^ keyBits(p.y)) ^ keyBits(p.z));\n  return vec3(unitOf(h), unitOf(bitMix(h ^ 0xcbd2d04au)), unitOf(bitMix(h ^ 0x135f4e35u)));\n}\n\n// ---- 3D gradient noise ----\n// Lattice gradient noise. Every corner of the integer lattice gets a random unit gradient (gradAt: the corner's hash as\n// two 16-bit numbers, a point of an octahedron unfolded into a square, folded back and pushed out to the sphere); a corner\n// contributes the ramp dot(gradient, offset from the corner), and a cell's eight ramps are blended with the quintic fade\n// 6t^5 - 15t^4 + 10t^3, so the noise and its first two derivatives are continuous. The gradient is carried through the\n// blend (fadeAcross), so it comes out exact.\nvec3 gradAt(uint h) {\n  vec2 e = vec2(float(h & 0xffffu), float(h >> 16u)) * (2. / 65535.) - 1.;\n  vec3 g = vec3(e, 1. - abs(e.x) - abs(e.y));\n  if (g.z < 0.) g.xy = (1. - abs(g.yx)) * sign(g.xy);\n  return normalize(g);\n}\n// a corner's ramp at offset d from it: (value, gradient)\nvec4 cornerRamp(uint h, vec3 d) { vec3 g = gradAt(h); return vec4(dot(g, d), g); }\n// two (value, gradient) pairs blended across one axis by the fade t; the fade's slope dt adds to the gradient on that axis\nvec4 fadeAcross(vec4 a, vec4 b, float t, float dt, vec3 axis) { vec4 r = mix(a, b, t); r.yzw += (b.x - a.x) * dt * axis; return r; }\n// the bare lattice's noise at q: (value, gradient in lattice units)\nvec4 latticeNoise(vec3 q) {\n  vec3 cell = floor(q), f = q - cell, g = f - 1.;\n  vec3 t = f * f * f * (f * (f * 6. - 15.) + 10.), dt = 30. * f * f * g * g;\n  uvec3 lo = uvec3(ivec3(cell)), hi = lo + 1u;\n  // (the eight corners' hashes share their first steps: x, then y, then z)\n  uint x0 = bitMix(lo.x ^ 0x3368b358u), x1 = bitMix(hi.x ^ 0x3368b358u);\n  uint a = bitMix(x0 ^ lo.y), b = bitMix(x1 ^ lo.y), c = bitMix(x0 ^ hi.y), d = bitMix(x1 ^ hi.y);\n  const vec3 X = vec3(1., 0., 0.), Y = vec3(0., 1., 0.), Z = vec3(0., 0., 1.);\n  vec4 zLo = fadeAcross(\n    fadeAcross(cornerRamp(bitMix(a ^ lo.z), f), cornerRamp(bitMix(b ^ lo.z), vec3(g.x, f.yz)), t.x, dt.x, X),\n    fadeAcross(cornerRamp(bitMix(c ^ lo.z), vec3(f.x, g.y, f.z)), cornerRamp(bitMix(d ^ lo.z), vec3(g.xy, f.z)), t.x, dt.x, X), t.y, dt.y, Y);\n  vec4 zHi = fadeAcross(\n    fadeAcross(cornerRamp(bitMix(a ^ hi.z), vec3(f.xy, g.z)), cornerRamp(bitMix(b ^ hi.z), vec3(g.x, f.y, g.z)), t.x, dt.x, X),\n    fadeAcross(cornerRamp(bitMix(c ^ hi.z), vec3(f.x, g.yz)), cornerRamp(bitMix(d ^ hi.z), g), t.x, dt.x, X), t.y, dt.y, Y);\n  return fadeAcross(zLo, zHi, t.z, dt.z, Z);\n}\n// snoise works on a lattice turned against the axes and scaled: LATTICE is 1.73 times a turn of .95 rad about\n// (.48, .81, -.34) (columns), so the lattice lines up with no axis (a flat slice shows no grid) and a feature is as large\n// as the callers' frequencies were tuned for (two points a quarter of a unit apart are half correlated). NOISE_GAIN\n// spreads the output over about -1..1 (sd .36, 98% of it within +-.78; a rare peak goes a little past 1).\nconst mat3 LATTICE = mat3(1.1727, -.1972, -1.2565, .7587, 1.4801, .4759, 1.0208, -.8736, 1.0898);\nconst float NOISE_GAIN = 1.88;\n// signed noise and its gradient at p: (value, d/dp)\nvec4 snoiseGrad(vec3 p) { vec4 n = latticeNoise(LATTICE * p) * NOISE_GAIN; return vec4(n.x, n.yzw * LATTICE); }\nfloat snoise(vec3 p) { return snoiseGrad(p).x; }\n// Fractal sum of five octaves, each twice as fine and half as strong as the one before. Between octaves the point is\n// turned and moved (OCTAVE: twice a turn of 1.21 rad about (-.67, .25, .7), columns), so no two octaves' lattices line up.\nconst mat3 OCTAVE = mat3(1.2861, 1.0925, -1.0735, -1.5254, .7868, -1.0267, -.1385, 1.479, 1.3392);\nfloat fbm(vec3 p) {\n  float sum = 0.;\n  for (float w = .5; w > .02; w *= .5) { sum += w * snoise(p); p = OCTAVE * p + vec3(7.31, -2.17, 4.83); }\n  return sum;\n}\n// Divergence-free flow: the curl of a vector potential whose three components are unrelated noises (snoise at three\n// far-apart places), taken from their exact gradients; .91 keeps the strength the callers' amounts were tuned for.\nvec3 curlNoise(vec3 p) {\n  vec3 a = snoiseGrad(p).yzw, b = snoiseGrad(p + vec3(19.7, -8.3, 3.1)).yzw, c = snoiseGrad(p + vec3(-4.6, 13.9, 27.4)).yzw;\n  return vec3(c.y - b.z, a.z - c.x, b.x - a.y) * .91;\n}\n\n// ---- transforms, colour, SDF basics ----\nmat2 rot2(float a) { float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }\n// iq's cosine palette\nvec3 palette(float t, vec3 a, vec3 b, vec3 c, vec3 d) { return a + b * cos(TAU * (c * t + d)); }\nfloat luma(vec3 c) { return dot(c, vec3(.2126, .7152, .0722)); }\nfloat sdSphere(vec3 p, float r) { return length(p) - r; }\nfloat sdBox(vec3 p, vec3 b) { vec3 q = abs(p) - b; return length(max(q, 0.)) + min(max(q.x, max(q.y, q.z)), 0.); }\nfloat sdTorus(vec3 p, vec2 t) { vec2 q = vec2(length(p.xz) - t.x, p.y); return length(q) - t.y; }\nfloat smin(float a, float b, float k) { float h = max(k - abs(a - b), 0.) / k; return min(a, b) - h * h * k * .25; }\n#endif\n";
var FS_VERT = `
out vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;
/** Full-screen GLSL3 material. The fragment shader declares its own `out vec4`; COMMON is prepended unless raw. */
function fsMaterial(frag, uniforms = {}, { raw = false, ...opts } = {}) {
	return new ShaderMaterial({
		glslVersion: GLSL3,
		vertexShader: FS_VERT,
		fragmentShader: (raw ? "" : COMMON + "\n") + frag,
		uniforms,
		depthTest: false,
		depthWrite: false,
		...opts
	});
}
/** GLSL3 shader material for meshes/points, with COMMON prepended to both stages. */
function shaderMaterial({ vertex, fragment, uniforms = {}, ...opts }) {
	return new ShaderMaterial({
		glslVersion: GLSL3,
		vertexShader: COMMON + "\n" + vertex,
		fragmentShader: COMMON + "\n" + fragment,
		uniforms,
		...opts
	});
}
var FullscreenQuad = class {
	constructor() {
		this.mesh = new Mesh(new PlaneGeometry(2, 2));
		this.mesh.frustumCulled = false;
		this.scene = new Scene();
		this.scene.add(this.mesh);
		this.camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
	}
	/** Draw `material` over the whole of `target` (null = the canvas). */
	render(renderer, material, target = null) {
		this.mesh.material = material;
		renderer.setRenderTarget(target);
		renderer.render(this.scene, this.camera);
	}
};
/** HDR (half-float) colour target, optional depth and MSAA. Sampled linearly; no colour-space conversion. */
function makeRT(w, h, { hdr = true, depth = true, samples = 0 } = {}) {
	return new WebGLRenderTarget(Math.max(1, Math.round(w)), Math.max(1, Math.round(h)), {
		type: hdr ? HalfFloatType : UnsignedByteType,
		format: RGBAFormat,
		depthBuffer: depth,
		samples,
		minFilter: LinearFilter,
		magFilter: LinearFilter,
		generateMipmaps: false,
		colorSpace: "",
		wrapS: ClampToEdgeWrapping,
		wrapT: ClampToEdgeWrapping
	});
}
/** Float data texture (e.g. particle target positions), nearest-sampled. */
function dataTexture(data, w, h, { channels = 4 } = {}) {
	const fmt = {
		1: RedFormat,
		2: RGFormat,
		4: RGBAFormat
	}[channels];
	const tex = new DataTexture(data, w, h, fmt, FloatType);
	tex.minFilter = tex.magFilter = NearestFilter;
	tex.generateMipmaps = false;
	tex.needsUpdate = true;
	return tex;
}
//#endregion
export { COMMON, FS_VERT, FullscreenQuad, dataTexture, fsMaterial, makeRT, shaderMaterial };
