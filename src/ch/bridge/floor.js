import { rng } from "../../engine/math.js?v=BJIlRm7-";
import { Color, InstancedBufferAttribute, InstancedBufferGeometry, Mesh, PlaneGeometry, Vector2, Vector3 } from "../../../vendor/three/build/three.core.js?v=q9f7JKE-";
import { dataTexture, shaderMaterial } from "../../engine/gpu.js?v=o4BYX3o1";
import { classify, glyphAtlas, source } from "../../lib/glyphs.js?v=DWbHICXG";
//#region src/ch/bridge/floor.js
var VERT = `
in vec4 aRest;  // centre x, centre z, size x, size z
in vec4 aFall;  // break time (song s), spin axis angle, spin (rad/s), outward drift (units/s)
uniform float uT, uG, uShiver;
out vec2 vP; out vec2 vL; out vec2 vSize; out float vAge; out vec3 vW;
mat3 axisAngle(vec3 a, float t) {
  float c = cos(t), s = sin(t), C = 1. - c;
  return mat3(c + a.x * a.x * C, a.y * a.x * C + a.z * s, a.z * a.x * C - a.y * s,
              a.x * a.y * C - a.z * s, c + a.y * a.y * C, a.z * a.y * C + a.x * s,
              a.x * a.z * C + a.y * s, a.y * a.z * C - a.x * s, c + a.z * a.z * C);
}
void main() {
  vec2 L = position.xy;                                  // PlaneGeometry(1, 1): [-.5, .5]²
  vec3 q = vec3(L.x * aRest.z, 0., -L.y * aRest.w);
  float age = uT - aFall.x, a = max(age, 0.);
  vec3 ax = vec3(cos(aFall.y), 0., sin(aFall.y));
  q = axisAngle(ax, aFall.z * a * (1. + .6 * a)) * q;
  vec3 c = vec3(aRest.x, -.5 * uG * a * a, aRest.y);
  vec2 out2 = aRest.xy / max(length(aRest.xy), 1e-3);
  c.xz += out2 * aFall.w * a;
  // the moment before it goes: a small drop and a shiver
  float pre = smoothstep(-.35, 0., age) * step(age, 0.);
  c.y -= .015 * pre + uShiver * pre * .02 * sin(uT * 90. + aRest.x * 3.1 + aRest.y * 1.7);
  vec3 w = c + q;
  vP = vec2(aRest.x + L.x * aRest.z, aRest.y - L.y * aRest.w);
  vL = L; vSize = aRest.zw; vAge = age;
  vec4 wp = modelMatrix * vec4(w, 1.); vW = wp.xyz;
  gl_Position = projectionMatrix * viewMatrix * wp;
}`;
var FRAG = `
uniform vec3 uColA, uColB, uHot; uniform float uMinor, uMajor, uFade, uIntensity, uWaveR, uWaveW, uFrontK, uEdgeK, uAxisK, uMinorK, uAgeFade;
uniform vec3 uOrig[40]; uniform int uNOrig; uniform float uRedGain;
uniform sampler2D uCode, uAtlas; uniform vec2 uCodeSize, uAGrid, uCell, uCodeOff;
uniform float uCodeK, uCodeR, uCodeW, uCodeHi, uGridK; uniform vec3 uCodeCol;
in vec2 vP; in vec2 vL; in vec2 vSize; in float vAge; in vec3 vW; out vec4 o;
float lines(vec2 p) { vec2 g = abs(fract(p - .5) - .5) / max(fwidth(p), 1e-5); return 1. - min(min(g.x, g.y), 1.); }
// one glyph of the character grid at rest-pose point p: columns along +x, lines along +z (upright seen from +z)
float codeGlyph(vec2 p, out float cls) {
  vec2 q = (p - uCodeOff) / uCell, cell = floor(q), f = fract(q);
  vec2 cd = texelFetch(uCode, ivec2(mod(cell, uCodeSize)), 0).rg;     // atlas index (−1: blank), syntax class
  cls = cd.y;
  if (cd.x < 0.) return 0.;
  vec2 ac = vec2(mod(cd.x, uAGrid.x), floor(cd.x / uAGrid.x)), box = vec2(.43, .8);
  vec2 g = vec2(.5, .54) + (f - .5) * box;
  // gradients of the continuous coordinate, so the mip level does not jump at cell borders
  return textureGrad(uAtlas, (ac + g) / uAGrid, dFdx(q) * box / uAGrid, dFdy(q) * box / uAGrid).r;
}
void main() {
  vec2 p = vP;
  float minor = lines(p / uMinor), major = lines(p / uMajor);
  // lines closer than a few pixels fade out (no moiré far away or in wide orthographic views)
  vec2 fm = fwidth(p / uMinor), fM = fwidth(p / uMajor);
  minor *= (1. - smoothstep(.1, .3, max(fm.x, fm.y))) * uMinorK;
  major *= 1. - smoothstep(.22, .55, max(fM.x, fM.y));
  vec2 ax = abs(p) / max(fwidth(p), 1e-5); float axis = 1. - min(min(ax.x, ax.y), 1.);
  float f = exp(-length(vW - cameraPosition) * uFade);
  // the error spreads from its origins (the impacts), each with a head start z: the distance to the union of the discs
  float dw = 1e9;
  for (int k = 0; k < 40; k++) { if (k >= uNOrig) break; dw = min(dw, length(p - uOrig[k].xy) - uOrig[k].z); }
  float red = 1. - smoothstep(uWaveR - uWaveW, uWaveR, dw);
  float front = exp(-pow((dw - uWaveR + uWaveW * .5) / (uWaveW * .45), 2.));   // the bright leading edge (× uFrontK)
  vec3 col = mix(uColA, uColB, red);
  vec3 c = col * (minor * .22 + major * .6) + col * axis * uAxisK + uColB * front * uFrontK * (minor * .6 + major * 1.4);
  c *= mix(1., uRedGain, red);                          // the red grid glows brighter than the grey one
  if (uCodeK > 0.) {
    // the code replaces the grid inside its own front (or everywhere when uCodeR < 0); its edge runs hot
    float cin = uCodeR < 0. ? 1. : 1. - smoothstep(uCodeR - uCodeW, uCodeR, dw);
    float edge = uCodeR < 0. ? 0. : exp(-pow((dw - uCodeR + uCodeW * .6) / (uCodeW * .5), 2.));
    float cls, gl = cin > 0. ? codeGlyph(p, cls) : 0.;
    // syntax weight: plain, comment, string, number, keyword, punctuation
    float w = cls < .5 ? 1. : cls < 1.5 ? .32 : cls < 2.5 ? 1.15 : cls < 3.5 ? 1.15 : cls < 4.5 ? 1.35 : .6;
    vec3 cc = mix(uCodeCol, uHot * 1.4, clamp(cls > 1.5 && cls < 3.5 ? .45 : 0., 0., 1.));
    c = mix(c * uGridK, c * uGridK * .12, cin * uCodeK) + (cc * w + uHot * edge * uCodeHi) * gl * cin * uCodeK;
  } else c *= uGridK;
  // torn border: an anti-aliased line along the piece outline, hot for a moment after the break
  vec2 dd = (.5 - abs(vL)) * vSize; float de = min(dd.x, dd.y);
  float ew = fwidth(de) * 1.3, e = 1. - smoothstep(0., ew, de);
  float heat = vAge > -.25 ? exp(-max(vAge, 0.) * 1.6) * smoothstep(-.25, .05, vAge) : 0.;
  c += uHot * e * heat * uEdgeK;
  c *= exp(-max(vAge, 0.) * uAgeFade);                 // a fallen piece dims as it drops into the dark
  o = vec4(c * f * uIntensity, 1.);
}`;
/**
* The floor's page of source (bridge decompiles it, inst2 tears it): glyph cell (advance, line height), the rest-pose
* point of the page's top-left corner, how far the decompile front runs behind the error front (s), and the files, the
* floor's own shader first (it lies under the sandbox).
*/
var FLOOR_CODE = {
	cell: [.108, .18],
	off: [-6.4, -5.2],
	lag: .3,
	files: [
		"ch/bridge/floor.js",
		"ch/bridge/landed.js",
		"engine/engine.js",
		"engine/timeline.js",
		"engine/timing.js",
		"engine/swarm.js",
		"engine/lines.js",
		"ch/bridge/corrupt.js",
		"engine/post.js",
		"engine/shapes.js",
		"engine/gpu.js",
		"engine/math.js",
		"engine/text.js",
		"engine/features.js"
	]
};
var TearFloor = class {
	/** extent: half-size in world units; strip: strip width; seed: layout. */
	constructor({ extent = 44, strip = 1, seed = 72 } = {}) {
		const r = rng(seed), rest = [], fall = [];
		for (let x = -extent; x < extent; x += strip) {
			let z = -extent;
			while (z < extent) {
				const len = Math.min(extent - z, 1 + Math.floor(r() * 6));
				rest.push(x + strip / 2, z + len / 2, strip, len);
				fall.push(1e9, r() * Math.PI * 2, (r() - .5) * 2.4, .15 + r() * .5);
				z += len;
			}
		}
		this.count = rest.length / 4;
		this.rest = new Float32Array(rest);
		this.fall = new Float32Array(fall);
		this.rand = Float32Array.from({ length: this.count }, () => r());
		const base = new PlaneGeometry(1, 1);
		const g = new InstancedBufferGeometry();
		g.index = base.index;
		g.setAttribute("position", base.getAttribute("position"));
		this.aRest = new InstancedBufferAttribute(this.rest, 4);
		this.aFall = new InstancedBufferAttribute(this.fall, 4);
		g.setAttribute("aRest", this.aRest);
		g.setAttribute("aFall", this.aFall);
		g.instanceCount = this.count;
		const f = (v) => ({ value: v });
		this.material = shaderMaterial({
			vertex: VERT,
			fragment: FRAG,
			transparent: true,
			depthWrite: false,
			blending: 2,
			side: 2,
			uniforms: {
				uT: f(0),
				uG: f(5),
				uShiver: f(0),
				uColA: f(new Color(.5, .52, .56)),
				uColB: f(new Color(1, .1, .06)),
				uHot: f(new Color(1, .42, .26)),
				uMinor: f(.25),
				uMajor: f(1),
				uFade: f(.07),
				uIntensity: f(1),
				uWaveR: f(0),
				uWaveW: f(1.5),
				uOrig: f(Array.from({ length: 40 }, () => new Vector3())),
				uNOrig: f(1),
				uRedGain: f(1),
				uFrontK: f(1.2),
				uEdgeK: f(2.5),
				uAxisK: f(.9),
				uMinorK: f(1),
				uAgeFade: f(0),
				uCode: f(null),
				uAtlas: f(null),
				uCodeSize: f(new Vector2(1, 1)),
				uAGrid: f(new Vector2(1, 1)),
				uCell: f(new Vector2(.12, .2)),
				uCodeOff: f(new Vector2()),
				uCodeK: f(0),
				uCodeR: f(-1),
				uCodeW: f(1.2),
				uCodeHi: f(1.5),
				uGridK: f(1),
				uCodeCol: f(new Color(1, .1, .06))
			}
		});
		this.mesh = new Mesh(g, this.material);
		this.mesh.frustumCulled = false;
	}
	/** Break times: fn(x, z, rand01) → song time (or 1e9 to stay). Call once (at init). */
	setBreak(fn) {
		for (let i = 0; i < this.count; i++) this.fall[i * 4] = fn(this.rest[i * 4], this.rest[i * 4 + 1], this.rand[i]);
		this.aFall.needsUpdate = true;
	}
	/** Number of pieces broken free at time t (for the HUD). */
	broken(t) {
		let n = 0;
		for (let i = 0; i < this.count; i++) if (this.fall[i * 4] <= t) n++;
		return n;
	}
	/**
	* The character grid for code mode (once): { tex, cols, rows } from codeGrid(); cell = [advance, line height] in world
	* units; off = rest-pose point of the grid's top-left corner.
	*/
	setCode(grid, { cell = [.12, .2], off = [0, 0] } = {}) {
		const u = this.material.uniforms, atlas = glyphAtlas();
		u.uCode.value = grid.tex;
		u.uCodeSize.value.set(grid.cols, grid.rows);
		u.uAtlas.value = atlas.tex;
		u.uAGrid.value.set(atlas.cols, atlas.rows);
		u.uCell.value.set(...cell);
		u.uCodeOff.value.set(...off);
		return this;
	}
	/** Per frame. o: t, y (floor height), g, intensity, fade, wave [ox, oz, radius, width], wave2 [ox, oz] (a second origin) or origins [[x, z, head start]…] (up to 40, the front is the union of discs of radius R + head start), colA, colB, redGain, front, edge, axis, minor, shiver, ageFade; code (0..1), codeR (front radius, −1 = everywhere), codeW, codeHi, codeCol, grid (0..1). */
	set(o) {
		const u = this.material.uniforms;
		u.uT.value = o.t;
		u.uG.value = o.g ?? 5;
		u.uShiver.value = o.shiver ?? 0;
		u.uIntensity.value = o.intensity ?? 1;
		u.uFade.value = o.fade ?? .07;
		const w = o.wave ?? [
			0,
			0,
			1e4,
			1
		], org = (o.origins ?? [[w[0], w[1]], o.wave2 ?? [w[0], w[1]]]).slice(0, 40);
		org.forEach((q, k) => u.uOrig.value[k].set(q[0], q[1], q[2] ?? 0));
		u.uNOrig.value = org.length;
		u.uWaveR.value = w[2];
		u.uWaveW.value = w[3];
		u.uRedGain.value = o.redGain ?? 1;
		if (o.colA) u.uColA.value.setRGB(...o.colA);
		if (o.colB) u.uColB.value.setRGB(...o.colB);
		u.uFrontK.value = o.front ?? 1.2;
		u.uEdgeK.value = o.edge ?? 2.5;
		u.uAxisK.value = o.axis ?? .9;
		u.uMinorK.value = o.minor ?? 1;
		u.uAgeFade.value = o.ageFade ?? 0;
		u.uCodeK.value = u.uCode.value ? o.code ?? 0 : 0;
		u.uCodeR.value = o.codeR ?? -1;
		u.uCodeW.value = o.codeW ?? 1.2;
		u.uCodeHi.value = o.codeHi ?? 1.5;
		u.uGridK.value = o.grid ?? 1;
		u.uCodeCol.value.setRGB(...o.codeCol ?? [
			1,
			.1,
			.06
		]);
		this.mesh.position.y = o.y ?? 0;
		this.mesh.visible = true;
		return this;
	}
};
/**
* A character grid of source files for the floor's code mode: files side by side in panes `pane` columns wide (lines
* cut there), stacked down each pane until `rows` lines are used. Each texel: atlas index of the glyph (−1 for blank)
* and its syntax class (lib/glyphs classify). Returns { tex, cols, rows, where: { file: [col, row] } }.
*/
var GRIDS = /* @__PURE__ */ new Map();
function codeGrid(files, { panes = 8, pane = 96, gap = 3, rows = 256 } = {}) {
	const key = JSON.stringify([
		files,
		panes,
		pane,
		gap,
		rows
	]);
	if (GRIDS.has(key)) return GRIDS.get(key);
	const atlas = glyphAtlas(), cols = panes * pane, data = new Float32Array(cols * rows * 2).fill(-1), where = {};
	let pc = 0, row = 0;
	for (const f of files) {
		const text = source(f).replace(/\t/g, "  "), cls = classify(text), lines = text.split("\n");
		if (row + 8 > rows) {
			pc++;
			row = 0;
		}
		if (pc >= panes) break;
		where[f] = [pc * pane, row];
		let off = 0;
		for (const ln of lines) {
			if (row >= rows) break;
			for (let c = 0; c < Math.min(ln.length, pane - gap); c++) {
				const ch = ln[c];
				if (ch !== " ") {
					const k = (row * cols + pc * pane + c) * 2;
					data[k] = atlas.index(ch);
					data[k + 1] = cls[off + c];
				}
			}
			off += ln.length + 1;
			row++;
		}
		row += 2;
	}
	for (let i = 1; i < data.length; i += 2) if (data[i] < 0) data[i] = 0;
	const grid = {
		tex: dataTexture(data, cols, rows, { channels: 2 }),
		cols,
		rows,
		where
	};
	GRIDS.set(key, grid);
	return grid;
}
//#endregion
export { FLOOR_CODE, TearFloor, codeGrid };
