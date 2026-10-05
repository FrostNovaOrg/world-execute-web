import { hash, rng } from "../../engine/math.js?v=BJIlRm7-";
import { BoxGeometry, DynamicDrawUsage, InstancedBufferAttribute, InstancedBufferGeometry, Mesh, Vector2 } from "../../../vendor/three/build/three.core.js?v=q9f7JKE-";
import { shaderMaterial } from "../../engine/gpu.js?v=o4BYX3o1";
var NB = 1440;
/** World (x, z) of address a on the heap plane: pitch 1, centred on the origin, address 0 top-left. */
var cellXZ = (a) => [a % 60 - 59 / 2, Math.floor(a / 60) - 23 / 2];
var hexAddr = (a) => "0x" + (a * 4 * 1024).toString(16).padStart(6, "0");
/** A malloc/free history: objects of 2–23 blocks (fragments of you: 1–3), then 42 % of the others freed. */
function makeHeap(seed = 324) {
	const r = rng(seed), all = [];
	let a = 0, id = 0;
	while (a < NB) {
		const you = r() < .22, size = you ? 1 + Math.floor(r() * 3) : 2 + Math.floor(r() ** 1.6 * 22);
		if (a + size > 1296) break;
		all.push({
			id,
			type: you ? "you" : r() < .2 ? "sys" : "me",
			a0: a,
			size,
			shade: hash(id * 7.31 + 2)
		});
		id++;
		a += size;
	}
	const objs = all.filter((o) => o.type === "you" || r() > .42);
	const you = objs.filter((o) => o.type === "you"), youStart = NB - you.reduce((s, o) => s + o.size, 0);
	let top = youStart;
	for (const o of you) {
		o.a1 = top;
		top += o.size;
	}
	top = 0;
	for (const o of objs.filter((o) => o.type !== "you")) {
		o.a1 = top;
		top += o.size;
	}
	return {
		objs,
		youStart,
		youEnd: NB,
		meEnd: top
	};
}
/** External fragmentation of an occupancy array (1 = used): 1 − largest free run / total free. */
function fragmentation(occ) {
	let tot = 0, best = 0, run = 0;
	for (let i = 0; i < occ.length; i++) if (!occ[i]) {
		tot++;
		run++;
		if (run > best) best = run;
	} else run = 0;
	return tot ? 1 - best / tot : 0;
}
var THUMBS = [
	`
in vec4 iT; out vec4 vT;                        // iT: picture tile (−1: none), u0, du across the object, its aspect`,
	` vT = iT;`,
	`
in vec4 vT; uniform sampler2D tThumb; uniform vec2 uThumbGrid; uniform float uThumbGain;
float thumb() {                                  // the picture's luminance on a top face (0 elsewhere)
  float u = vT.y + (vL.x + .5) * vT.z, v = .5 - vL.z;
  vec2 c = vT.w < 16. / 9. ? vec2(vT.w * 9. / 16., 1.) : vec2(1., 16. / 9. / vT.w);
  vec2 uv = clamp(.5 + (vec2(u, v) - .5) * c, .002, .998), cell = vec2(mod(vT.x, uThumbGrid.x), floor(vT.x / uThumbGrid.x));
  return luma(texture(tThumb, (cell + uv) / uThumbGrid).rgb) * step(0., vT.x) * step(.49, vL.y);
}`,
	` + vCol * vP.x * uThumbGain * thumb()`
];
var VERT = (thumbs) => `
in vec3 iPos, iScale, iCol; in vec4 iP;         // iP: face fill, edge, dissolve 0..1, seed
out vec3 vL, vS, vCol; out vec4 vP;${thumbs ? THUMBS[0] : ""}
void main() {
  vL = position; vS = iScale; vCol = iCol; vP = iP;${thumbs ? THUMBS[1] : ""}
  gl_Position = projectionMatrix * modelViewMatrix * vec4(iPos + position * iScale, 1.);
}`;
var FRAG = (thumbs) => `
in vec3 vL, vS, vCol; in vec4 vP; out vec4 o;
uniform float uTopOnly;${thumbs ? THUMBS[2] : ""}
void main() {
  if (uTopOnly > .5 && vL.y < .49) discard;       // flat tiles seen from above: only the top face (no doubled fill)
  // distance to the nearest edge of the face this fragment lies on (the middle of the three face distances)
  vec3 d = (.5 - abs(vL)) * vS;
  float a = min(d.x, min(d.y, d.z)), c = max(d.x, max(d.y, d.z)), b = d.x + d.y + d.z - a - c, w = max(fwidth(b), 1e-5);
  float edge = 1. - smoothstep(w * .6, w * 1.8, b), halo = exp(-b / (w * 4.)) * .12;
  if (vP.z > 0.) {                                // erased bit by bit: a 12 × 12 grid of bits on every face
    vec3 q = floor((vL + .5) * 12.);
    if (hash12(q.xz + q.y * 17. + vP.w * 91.7) < vP.z) discard;
  }
  o = vec4(vCol * (vP.x + vP.y * (edge + halo))${thumbs ? THUMBS[3] : ""}, 1.);
}`;
/**
* Instanced boxes (one per block): begin(), block(pos, scale, col, {fill, edge, dissolve, seed, thumb}), end().
* thumbs: (the remake) blocks may carry a picture, thumb = [tile, u0, du, aspect]; set the atlas with pictures().
*/
var Blocks = class {
	constructor(max = 4096, { thumbs = false } = {}) {
		this.max = max;
		this.thumbs = thumbs;
		const box = new BoxGeometry(1, 1, 1), g = new InstancedBufferGeometry();
		g.index = box.index;
		g.setAttribute("position", box.getAttribute("position"));
		const attr = (n) => new InstancedBufferAttribute(new Float32Array(max * n), n).setUsage(DynamicDrawUsage);
		this.a = {
			iPos: attr(3),
			iScale: attr(3),
			iCol: attr(3),
			iP: attr(4),
			...thumbs ? { iT: attr(4) } : {}
		};
		for (const [k, v] of Object.entries(this.a)) g.setAttribute(k, v);
		this.mesh = new Mesh(g, shaderMaterial({
			vertex: VERT(thumbs),
			fragment: FRAG(thumbs),
			transparent: true,
			depthWrite: false,
			blending: 2,
			side: 2,
			uniforms: {
				uTopOnly: { value: 0 },
				...thumbs ? {
					tThumb: { value: null },
					uThumbGrid: { value: new Vector2(1, 1) },
					uThumbGain: { value: 0 }
				} : {}
			}
		}));
		this.mesh.frustumCulled = false;
		this.n = 0;
	}
	begin(topOnly = false) {
		this.n = 0;
		this.mesh.material.uniforms.uTopOnly.value = topOnly ? 1 : 0;
		return this;
	}
	block(pos, scale, col, o = {}) {
		if (this.n >= this.max) return this;
		const i = this.n++;
		this.a.iPos.array.set(pos, i * 3);
		this.a.iScale.array.set(scale, i * 3);
		this.a.iCol.array.set(col, i * 3);
		this.a.iP.array.set([
			o.fill ?? .3,
			o.edge ?? 1,
			o.dissolve ?? 0,
			o.seed ?? i
		], i * 4);
		if (this.thumbs) this.a.iT.array.set(o.thumb ?? [
			-1,
			0,
			1,
			1
		], i * 4);
		return this;
	}
	/** (thumbs) The atlas the pictures come from (src/lib/memories.js) and how bright they are, relative to the face fill. */
	pictures(atlas, gain) {
		const u = this.mesh.material.uniforms;
		u.tThumb.value = atlas.texture;
		u.uThumbGrid.value.set(atlas.cols, atlas.rows);
		u.uThumbGain.value = gain;
		return this;
	}
	end() {
		this.mesh.geometry.instanceCount = this.n;
		for (const a of Object.values(this.a)) {
			a.needsUpdate = true;
			a.clearUpdateRanges?.();
			a.addUpdateRange?.(0, this.n * a.itemSize);
		}
		this.mesh.visible = this.n > 0;
		return this;
	}
};
//#endregion
export { Blocks, NB, cellXZ, fragmentation, hexAddr, makeHeap };
