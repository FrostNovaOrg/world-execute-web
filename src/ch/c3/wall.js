import { MathUtils, Mesh, PlaneGeometry, Vector2, Vector3, Vector4 } from "../../../vendor/three/build/three.core.js?v=q9f7JKE-";
import { shaderMaterial } from "../../engine/gpu.js?v=o4BYX3o1";
import { hash12 } from "../../lib/glslhash.js?v=CCHaydFR";
//#region src/ch/c3/wall.js
var WALL = {
	cols: 48,
	rows: 96,
	w: 16,
	h: 9,
	px: 48
};
var VERT = `
out vec2 vUv; out float vDist;
void main() { vUv = uv; vec4 mv = modelViewMatrix * vec4(position, 1.); vDist = -mv.z; gl_Position = projectionMatrix * mv; }`;
var FRAG = `
uniform float uT, uErrT, uErrW, uGain, uFocus, uAperture, uFocal, uMaxBlur, uHole, uAsp, uKick, uWordOn;
uniform sampler2D uWord; uniform vec4 uWordR; uniform vec3 uWordCol, uWordHot;
uniform vec3 uFill, uEdge, uFrame, uErr, uLost, uFront, uWait;
uniform vec4 uHoleR;
in vec2 vUv; in float vDist; out vec4 o;
uniform vec2 GRID;
// progress of a bar and how far its failure has gone (0 = running at 99 %, 1 = failed); hash keys as c1's wall:
// (column, row + K), whole numbers, so failedCount counts the same bars on the CPU
float progressOf(vec2 id, out float fail, out float pe, out float kick) {
  float wave = length(((id + .5) / GRID - .5) * vec2(uAsp, 1.)) * uErrW;   // distance on the wall (units of its height)
  float te = uErrT + wave + hash12(id + vec2(0., 6000.)) * .04;
  fail = uErrT > 0. ? clamp((uT - te) / .1, 0., 1.) : 0.;
  kick = uErrT > 0. && uT > te ? exp(-(uT - te) * 38.) : 0.;
  pe = .15 + .7 * hash12(id + vec2(0., 4000.));
  float run = clamp((uT - te - .02) / .22, 0., 1.); run = run * run * (3. - 2. * run);
  return mix(.99, pe, run);
}
vec3 wallAt(vec2 uv, vec2 fw) {
  vec2 g = uv * GRID, id = floor(g), f = fract(g), fc = max(fw * GRID, 1e-5);
  vec2 lo = vec2(.06, .3), hi = vec2(.94, .7), sz = hi - lo;
  vec2 d = min(f - lo, hi - f);
  float inside = clamp(d.x / fc.x + .5, 0., 1.) * clamp(d.y / fc.y + .5, 0., 1.);
  if (inside <= 0.) return vec3(0.);
  float border = min(d.x / fc.x, d.y / fc.y);
  float frame = inside * (1. - clamp(border - .6, 0., 1.));
  vec2 b = (f - lo) / sz;
  float fail, pe, kick, p = progressOf(id, fail, pe, kick);
  float footX = fc.x / sz.x, pxFoot = footX * 48.;
  float smoothFill = clamp((p - b.x) / footX + .5, 0., 1.);
  float q = floor(b.x * 48.), quant = clamp(p * 48. - q, 0., 1.);
  float fill = mix(quant, smoothFill, clamp(pxFoot * 2. - .5, 0., 1.));
  vec2 pf = fract(b * vec2(48., 4.)), pd = min(pf, 1. - pf);
  float gaps = mix(smoothstep(.04, .14, min(pd.x, pd.y)), 1., clamp(pxFoot * 4. - .6, 0., 1.));
  // lost progress: between where the thread died and 99 %, a dim diagonal hatch
  float lostK = fail * clamp((b.x - p) / footX + .5, 0., 1.) * clamp((.99 - b.x) / footX + .5, 0., 1.);
  float hatch = mix(step(.5, fract((b.x * 48. + b.y * 4.) * .5)), .5, clamp(pxFoot * 3. - .8, 0., 1.));
  vec3 fillCol = mix(uFill, uErr, fail);
  vec3 col = fillCol * fill * gaps * (.8 + .2 * b.y) + uLost * lostK * hatch;
  // still running: the last pixel waits (a slow cursor, local and dim), as in c1
  float last = step(47., q) * (1. - fill) * (1. - fail);
  col += uWait * last * gaps * (.35 + .35 * step(.5, fract(uT * 2. + hash12(id + vec2(0., 5000.)))));
  col += mix(uFrame, uErr, fail) * frame;
  col += uFront * kick * uKick * (fill * .35 + frame * .8 + .04);          // each thread flashes as it dies
  // EXECUTION written with the wall's own pixels: 48 × 4 px per bar, so the word has 2304 × 384 "LEDs"
  if (uWordOn > 0.) {
    vec2 wq = (uv - uWordR.xy) / uWordR.zw;
    if (all(greaterThanEqual(wq, vec2(0.))) && all(lessThanEqual(wq, vec2(1.)))) {
      float m = texture(uWord, wq).r * gaps;
      float age = max(uT - uErrT, 0.), hot = exp(-age * 6.);
      col = mix(col, (mix(uWordCol, uWordHot, hot)) * (.8 + .2 * b.y), m * uWordOn);
    }
  }
  return col * inside;
}
void main() {
  vec2 fw = fwidth(vUv);
  float coc = uAperture > 0. ? min(uAperture * abs(vDist - uFocus) / max(vDist, 1e-3) * uFocal, uMaxBlur) : 0.;
  vec3 col;
  if (coc < .75) col = wallAt(vUv, fw);
  else {
    col = vec3(0.);
    for (int k = 0; k < 12; k++) {
      float r = sqrt((float(k) + .5) / 12.) * coc, a = float(k) * 2.39996;
      col += wallAt(vUv + vec2(cos(a), sin(a)) * r * fw, fw * (1. + r * .5));
    }
    col /= 12.;
  }
  // the wave front: a thin ring at the radius the failure has reached (in bar-grid units, as the wave is)
  if (uErrT > 0.) {
    float R = (uT - uErrT) / uErrW, rr = length((vUv - .5) * vec2(uAsp, 1.));
    float w = max(fwidth(rr) * 1.5, .003);
    col += uFront * .6 * exp(-pow((rr - R) / w, 2.)) * clamp(1. - R * .9, 0., 1.) * step(0., R);
  }
  // a darker rectangle behind a hero word (design-space rect in uv)
  if (uHole > 0.) {
    vec2 hq = abs(vUv - uHoleR.xy) / uHoleR.zw;
    col *= 1. - uHole * (1. - smoothstep(.75, 1., max(hq.x, hq.y)));
  }
  o = vec4(col * uGain, 1.);
}`;
var KEEP_FRAG = (() => {
	let f = FRAG;
	const ins = (a, b) => {
		if (!f.includes(a)) throw new Error(`wall.js KEEP_FRAG: '${a}' not found`);
		f = f.replace(a, b);
	};
	ins("uniform vec4 uHoleR;", "uniform vec4 uHoleR;\nuniform vec2 uKeep; uniform vec3 uKeepCol;");
	ins("float progressOf(vec2 id, out float fail, out float pe, out float kick) {", "float progressOf(vec2 id, out float fail, out float pe, out float kick) {\n  if (all(equal(id, uKeep))) { fail = 0.; pe = .99; kick = 0.; return .99; }");
	ins("  vec3 fillCol = mix(uFill, uErr, fail);", "  float kept = all(equal(id, uKeep)) ? 1. : 0.;\n  vec3 fillCol = mix(mix(uFill, uErr, fail), uKeepCol, kept);");
	ins("  col += uWait * last * gaps * (.35 + .35 * step(.5, fract(uT * 2. + hash12(id + vec2(0., 5000.)))));", "  col += mix(uWait, uKeepCol * 2.2, kept) * last * gaps * (.35 + .35 * step(.5, fract(uT * 2. + hash12(id + vec2(0., 5000.)))));");
	ins("  col += mix(uFrame, uErr, fail) * frame;", "  col += mix(mix(uFrame, uErr, fail), uKeepCol * 1.4, kept) * frame;");
	return f;
})();
/** The bar kept by the remake's variant: column 18, 67th row from the top (below the word, left of centre). */
var KEEP = {
	col: 18,
	row: 66
};
/** The wall plane (16 × 9, centred at the origin, facing +z). o.keep: the remake's variant (one thread to you kept). */
function makeWall(o = {}) {
	const v3 = () => ({ value: new Vector3() });
	const m = new Mesh(new PlaneGeometry(WALL.w, WALL.h), shaderMaterial({
		vertex: VERT,
		fragment: o.keep ? KEEP_FRAG : FRAG,
		transparent: true,
		depthWrite: false,
		blending: 2,
		side: 2,
		uniforms: {
			uT: { value: 0 },
			uErrT: { value: -1 },
			uErrW: { value: .35 },
			uGain: { value: 1 },
			uHole: { value: 0 },
			uAsp: { value: WALL.w / WALL.h },
			uKick: { value: 1 },
			uWordOn: { value: 0 },
			uWord: { value: null },
			uWordR: { value: new Vector4(.08, .38, .84, .24) },
			uWordCol: { value: new Vector3(1, .12, .07) },
			uWordHot: { value: new Vector3(1.6, 1.3, 1.15) },
			uHoleR: { value: new Vector4(.5, .5, .2, .1) },
			uFocus: { value: 5 },
			uAperture: { value: 0 },
			uFocal: { value: 500 },
			uMaxBlur: { value: 20 },
			uFill: v3(),
			uEdge: v3(),
			uFrame: v3(),
			uErr: v3(),
			uLost: v3(),
			uFront: v3(),
			uWait: v3(),
			GRID: { value: new Vector2(WALL.cols, WALL.rows) },
			...o.keep ? {
				uKeep: { value: new Vector2(KEEP.col, WALL.rows - 1 - KEEP.row) },
				uKeepCol: { value: new Vector3(1, .62, .32) }
			} : {}
		}
	}));
	m.frustumCulled = false;
	/** o: t, errT (EXECUTION), errW, gain, focus, aperture, maxBlur (design px), col {…}, hole [u, v, hu, hv, k], word { tex, on, rect [u, v, w, h], col }. */
	m.userData.set = (o, cam, H) => {
		const u = m.material.uniforms, c = o.col;
		u.uT.value = o.t;
		u.uErrT.value = o.errT ?? -1;
		u.uErrW.value = o.errW ?? .35;
		u.uGain.value = o.gain ?? 1;
		u.uKick.value = o.kick ?? 1;
		u.uFocus.value = o.focus ?? 5;
		u.uAperture.value = o.aperture ?? 0;
		u.uMaxBlur.value = (o.maxBlur ?? 20) * H / 1080;
		u.uFocal.value = cam.isPerspectiveCamera ? H / 2 / Math.tan(MathUtils.degToRad(cam.fov) / 2) : 0;
		for (const [k, n] of [
			["fill", "uFill"],
			["edge", "uEdge"],
			["frame", "uFrame"],
			["err", "uErr"],
			["lost", "uLost"],
			["front", "uFront"],
			["wait", "uWait"]
		]) u[n].value.set(...c[k]);
		if (o.hole) {
			u.uHole.value = o.hole[4];
			u.uHoleR.value.set(o.hole[0], o.hole[1], o.hole[2], o.hole[3]);
		} else u.uHole.value = 0;
		if (o.word) {
			u.uWord.value = o.word.tex;
			u.uWordOn.value = o.word.on ?? 1;
			u.uWordR.value.set(...o.word.rect ?? [
				.08,
				.38,
				.84,
				.24
			]);
			if (o.word.col) u.uWordCol.value.set(...o.word.col);
		} else u.uWordOn.value = 0;
		m.visible = true;
	};
	return m;
}
/** Threads failed by time t (the same wave as the shader). */
function failedCount(t, errT, errW) {
	if (t < errT) return 0;
	let n = 0;
	for (let cx = 0; cx < WALL.cols; cx++) for (let cy = 0; cy < WALL.rows; cy++) if (t >= errT + Math.hypot(((cx + .5) / WALL.cols - .5) * WALL.w / WALL.h, (cy + .5) / WALL.rows - .5) * errW + hash12(cx, cy + 6e3) * .04) n++;
	return n;
}
/** World position of bar (col, row) centre (col 0 = left, row 0 = top), on the wall plane z = 0. */
function barPos(col, row) {
	const cw = WALL.w / WALL.cols, rh = WALL.h / WALL.rows;
	return [
		-WALL.w / 2 + (col + .5) * cw,
		WALL.h / 2 - (row + .5) * rh,
		0
	];
}
//#endregion
export { KEEP, WALL, barPos, failedCount, hash12, makeWall };
