import { LinearFilter, LinearMipmapLinearFilter, RGBAFormat, UnsignedByteType, Vector2, WebGLRenderTarget } from "../../vendor/three/build/three.core.js?v=q9f7JKE-";
import { fsMaterial, makeRT } from "../engine/gpu.js?v=o4BYX3o1";
import { nested } from "./modes.js?v=Cu3GYO-2";
//#region src/lib/memories.js
var DOWN = `
uniform sampler2D tSrc; uniform vec2 uStep; uniform float uGain;
in vec2 vUv; out vec4 o;
void main() {
  vec3 s = vec3(0.), m = vec3(0.);                 // the mean, plus some of the brightest tap: thin glowing lines survive
  for (int i = 0; i < 4; i++) for (int j = 0; j < 4; j++) { vec3 c = texture(tSrc, vUv + (vec2(i, j) - 1.5) / 4. * uStep).rgb; s += c; m = max(m, c); }
  o = vec4(1. - exp(-(s / 16. + .35 * m) * uGain), 1.);
}`;
var ATLASES = /* @__PURE__ */ new WeakMap();
var BUILDING = /* @__PURE__ */ new WeakSet();
/** What identifies an atlas: the frames, the tile layout and the gain. The same key (and render size) is the same atlas. */
function atlasKey(frames, { cols, tw, th, gain }) {
	return `${cols}x${tw}x${th}@${gain}:${frames.map((f) => f.join("@")).join("|")}`;
}
function build(ctx, frames, { cols, tw, th, gain }) {
	const r = ctx.renderer, rows = Math.ceil(frames.length / cols);
	const rt = new WebGLRenderTarget(cols * tw, rows * th, {
		type: UnsignedByteType,
		format: RGBAFormat,
		depthBuffer: false,
		generateMipmaps: true,
		minFilter: LinearMipmapLinearFilter,
		magFilter: LinearFilter,
		colorSpace: ""
	});
	const full = makeRT(ctx.W, ctx.H), mat = fsMaterial(DOWN, {
		tSrc: { value: full.texture },
		uStep: { value: new Vector2(1 / tw, 1 / th) },
		uGain: { value: gain }
	});
	try {
		r.setRenderTarget(rt);
		r.setClearColor(0, 1);
		r.clear(true, true, true);
		nested(() => frames.forEach(([id, t], k) => {
			if (!ctx.engine.renderShotAt(id, t, full)) throw new Error(`memoryAtlas: no shot '${id}' in the edit being played (${ctx.edit ?? "?"}); if its chapter is not loaded, list it in --only`);
			const x = k % cols * tw, y = Math.floor(k / cols) * th;
			rt.viewport.set(x, y, tw, th);
			rt.scissor.set(x, y, tw, th);
			rt.scissorTest = true;
			ctx.fsq.render(r, mat, rt);
		}));
	} catch (e) {
		rt.dispose();
		throw e;
	} finally {
		rt.viewport.set(0, 0, cols * tw, rows * th);
		rt.scissorTest = false;
		full.dispose();
		mat.dispose();
		r.setRenderTarget(ctx.target);
	}
	return {
		rt,
		texture: rt.texture,
		cols,
		rows
	};
}
/**
* The atlas of frames [[shotId, songTime], …]: { texture, cols, rows }, tile k at column k % cols, row ⌊k / cols⌋ counted
* from the bottom. Built on first use, then kept for this engine: asking again with the same frames, tile layout and
* render size returns it at no cost; a different list, layout or size builds a new one (and frees the old). One atlas
* is kept per engine, so a film that wants tiles from two lists asks with one list.
* Build it before this frame's captures, or inside one: the shots it draws may capture and use views themselves.
* A shot cannot be a memory that asks for the atlas it is part of (that call throws).
* o: cols (4), tw and th (the tile in pixels, 320 x 180), gain (2.5).
*/
function memoryAtlas(ctx, frames, { cols = 4, tw = 320, th = 180, gain = 2.5 } = {}) {
	const engine = ctx.engine;
	if (!engine?.renderShotAt) throw new Error("memoryAtlas: ctx.engine is missing (call it with a shot's ctx)");
	if (!Array.isArray(frames) || !frames.length) throw new Error("memoryAtlas: frames must be a list of [shotId, songTime], at least one");
	for (const f of frames) if (!Array.isArray(f) || typeof f[0] !== "string" || !Number.isFinite(f[1])) throw new Error(`memoryAtlas: a frame is [shotId, songTime], not ${JSON.stringify(f)}`);
	if (BUILDING.has(engine)) throw new Error("memoryAtlas: called while an atlas is being drawn, by a shot that is itself one of its memories; a memory cannot show an atlas (leave that shot out of the frames)");
	const o = {
		cols,
		tw,
		th,
		gain
	}, key = atlasKey(frames, o), have = ATLASES.get(engine);
	if (have?.key === key && have.v === ctx.sizeVersion) return have;
	BUILDING.add(engine);
	let made;
	try {
		made = build(ctx, frames, o);
	} finally {
		BUILDING.delete(engine);
	}
	have?.rt.dispose();
	const atlas = {
		key,
		v: ctx.sizeVersion,
		...made
	};
	ATLASES.set(engine, atlas);
	return atlas;
}
//#endregion
export { DOWN, atlasKey, memoryAtlas };
