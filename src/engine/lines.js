import { PROJECT } from "./config.js?v=BkWxxfxi";
import { DynamicDrawUsage, Float32BufferAttribute, InstancedBufferAttribute, InstancedBufferGeometry, Mesh, Vector2 } from "../../vendor/three/build/three.core.js?v=q9f7JKE-";
import { shaderMaterial } from "./gpu.js?v=o4BYX3o1";
//#region src/engine/lines.js
var VERT = `
in vec3 aA, aB, aCol; in vec4 aP; // aP: width (design px), intensity, u0, u1 (arc position of the ends, for draw-on)
uniform vec2 uRes; uniform float uDraw;
out vec3 vCol; out vec2 vQ; out float vU, vW;
/** Keep the part of a segment where the linear function f (fa at s = 0, fb at s = 1) is >= 0: narrow [s0, s1]. */
void clipPlane(float fa, float fb, inout float s0, inout float s1) {
  if (fa < 0. && fb < 0.) { s0 = 1.; s1 = 0.; return; }
  if (fa < 0.) s0 = max(s0, fa / (fa - fb));
  else if (fb < 0.) s1 = min(s1, fa / (fa - fb));
}
void main() {
  vec4 ca = projectionMatrix * modelViewMatrix * vec4(aA, 1.), cb = projectionMatrix * modelViewMatrix * vec4(aB, 1.);
  // Clip the segment in clip space (Liang–Barsky) to w >= W0 and to a guard band 3x the viewport. Without it a segment
  // passing behind a perspective camera flips, and one passing right by the camera projects to huge screen coordinates
  // that lose precision (faint, dotted lines). The cut ends lie far off screen, so their round caps are never seen.
  float u0 = aP.z, u1 = aP.w, s0 = 0., s1 = 1.; const float W0 = 1e-3, G = 3.;
  clipPlane(ca.w - W0, cb.w - W0, s0, s1);
  clipPlane(G * ca.w - ca.x, G * cb.w - cb.x, s0, s1); clipPlane(G * ca.w + ca.x, G * cb.w + cb.x, s0, s1);
  clipPlane(G * ca.w - ca.y, G * cb.w - cb.y, s0, s1); clipPlane(G * ca.w + ca.y, G * cb.w + cb.y, s0, s1);
  if (s0 >= s1) { gl_Position = vec4(2., 2., 2., 1.); vCol = vec3(0.); vQ = vec2(0.); vU = 0.; vW = 0.; return; }
  vec4 c0 = ca; ca = mix(c0, cb, s0); cb = mix(c0, cb, s1);
  float v0 = mix(u0, u1, s0), v1 = mix(u0, u1, s1); u0 = v0; u1 = v1;
  vec2 sa = ca.xy / ca.w * uRes * .5, sb = cb.xy / cb.w * uRes * .5;       // pixels from centre
  vec2 dir = sb - sa; float len = length(dir); dir = len > 1e-4 ? dir / len : vec2(1., 0.);
  vec2 nrm = vec2(-dir.y, dir.x);
  float w = aP.x * uRes.y / ${PROJECT.design.height.toFixed(1)};                                    // half-width incl. halo, pixels
  float along = position.x;                                                 // 0 at A, 1 at B
  vec2 sp = mix(sa, sb, along) + dir * (along * 2. - 1.) * w + nrm * position.y * w;
  vec4 c = mix(ca, cb, along);
  gl_Position = vec4(sp / (uRes * .5) * c.w, c.z, c.w);
  vCol = aCol * aP.y; vQ = vec2((along * 2. - 1.) * (len * .5 + w) / max(w, 1e-3), position.y); vW = len * .5 / max(w, 1e-3);
  vU = mix(u0, u1, along);
}`;
var FRAG = `
uniform float uDraw, uCore;
in vec3 vCol; in vec2 vQ; in float vU, vW; out vec4 o;
void main() {
  if (vU > uDraw) discard;
  // distance to the segment in half-width units (round caps)
  float dx = max(abs(vQ.x) - vW, 0.), d = length(vec2(dx, vQ.y));
  float core = 1. - smoothstep(uCore * .6, uCore, d), halo = exp(-d * d * 5.) * .35;
  float edge = 1. - smoothstep(.85, 1., d);
  o = vec4(vCol * (core * 1.6 + halo) * edge, 1.); // additive: alpha 1, colour already weighted
}`;
var GlowLines = class {
	constructor(maxSegments = 8192) {
		this.max = maxSegments;
		const g = new InstancedBufferGeometry();
		g.setAttribute("position", new Float32BufferAttribute([
			0,
			-1,
			0,
			1,
			-1,
			0,
			1,
			1,
			0,
			0,
			1,
			0
		], 3));
		g.setIndex([
			0,
			1,
			2,
			0,
			2,
			3
		]);
		const attr = (n) => new InstancedBufferAttribute(new Float32Array(maxSegments * n), n).setUsage(DynamicDrawUsage);
		this.aA = attr(3);
		this.aB = attr(3);
		this.aCol = attr(3);
		this.aP = attr(4);
		g.setAttribute("aA", this.aA);
		g.setAttribute("aB", this.aB);
		g.setAttribute("aCol", this.aCol);
		g.setAttribute("aP", this.aP);
		this.material = shaderMaterial({
			vertex: VERT,
			fragment: FRAG,
			transparent: true,
			depthWrite: false,
			depthTest: true,
			blending: 2,
			uniforms: {
				uRes: { value: new Vector2(PROJECT.design.width, PROJECT.design.height) },
				uDraw: { value: 1 },
				uCore: { value: .3 }
			}
		});
		this.mesh = new Mesh(g, this.material);
		this.mesh.frustumCulled = false;
		this.n = 0;
	}
	begin() {
		this.n = 0;
		return this;
	}
	/** One segment. o: color [r,g,b] (HDR), width (design px, halo included), glow (intensity), u0/u1 (draw-on positions). */
	segment(a, b, o = {}) {
		if (this.n >= this.max) return this;
		const i = this.n++, c = o.color ?? [
			1,
			1,
			1
		];
		this.aA.array.set([
			a[0],
			a[1],
			a[2] ?? 0
		], i * 3);
		this.aB.array.set([
			b[0],
			b[1],
			b[2] ?? 0
		], i * 3);
		this.aCol.array.set(c, i * 3);
		this.aP.array.set([
			o.width ?? 6,
			o.glow ?? 1,
			o.u0 ?? 0,
			o.u1 ?? 0
		], i * 4);
		return this;
	}
	/** Connected points; `draw` 0..1 reveals the line progressively along its length (per polyline). */
	polyline(pts, o = {}) {
		let total = 0;
		const acc = [0];
		for (let i = 1; i < pts.length; i++) {
			total += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1], (pts[i][2] ?? 0) - (pts[i - 1][2] ?? 0));
			acc.push(total);
		}
		const lim = (o.draw ?? 1) * total;
		for (let i = 1; i < pts.length; i++) {
			if (acc[i - 1] >= lim) break;
			let b = pts[i];
			if (acc[i] > lim) {
				const k = (lim - acc[i - 1]) / (acc[i] - acc[i - 1]);
				b = [
					0,
					1,
					2
				].map((j) => (pts[i - 1][j] ?? 0) + ((pts[i][j] ?? 0) - (pts[i - 1][j] ?? 0)) * k);
			}
			this.segment(pts[i - 1], b, o);
		}
		return this;
	}
	/** Finish the frame: upload and size for the current render. Add this.mesh to a scene once. */
	end(ctx) {
		this.mesh.geometry.instanceCount = this.n;
		for (const a of [
			this.aA,
			this.aB,
			this.aCol,
			this.aP
		]) {
			a.needsUpdate = true;
			a.clearUpdateRanges?.();
			a.addUpdateRange?.(0, this.n * a.itemSize);
		}
		return this.res(ctx.W, ctx.H);
	}
	/** Pixel size of what is being drawn into (call again with the viewport size before drawing into a viewport). */
	res(w, h) {
		this.material.uniforms.uRes.value.set(w, h);
		return this;
	}
};
//#endregion
export { GlowLines };
