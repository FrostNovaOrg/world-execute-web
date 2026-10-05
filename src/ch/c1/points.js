import { BufferAttribute, BufferGeometry, MathUtils, Points, Vector3 } from "../../../vendor/three/build/three.core.js?v=q9f7JKE-";
import { shaderMaterial } from "../../engine/gpu.js?v=o4BYX3o1";
//#region src/ch/c1/points.js
var HEAD = `
uniform float uT, uSize, uMinPx, uFocal, uBright, uFocus, uAperture, uMaxBlur, uOrtho, uSparkle;
out vec3 vCol; out float vBlur;
`;
var MAIN = `
void main() {
  float i = float(gl_VertexID);
  vec3 pos = vec3(0.), col = vec3(0.); float sz = 1.;
  particle(i, pos, col, sz);
  if (max(col.r, max(col.g, col.b)) <= 1e-5 || sz <= 0.) { gl_Position = vec4(2., 2., 2., 1.); gl_PointSize = 0.; vCol = vec3(0.); vBlur = 0.; return; }
  vec4 mv = modelViewMatrix * vec4(pos, 1.);
  gl_Position = projectionMatrix * mv;
  float dist = max(-mv.z, 1e-3), persp = uOrtho > .5 ? 1. : 1. / dist;
  float px = uSize * sz * uFocal * persp;
  float core = max(px, uMinPx);
  float blur = uAperture > 0. ? min(uAperture * abs(dist - uFocus) * persp * uFocal, uMaxBlur) : 0.;
  float s = core + blur;
  float energy = min(1., px * px / (uMinPx * uMinPx)) * core * core / (s * s);
  gl_PointSize = s; vBlur = blur / s;
  float tw = 1. + uSparkle * (hash11(i + floor(uT * 12.) * 7.13) - .5) * 2.;
  vCol = col * uBright * energy * (.55 + .9 * hash11(i * 1.31)) * max(tw, 0.);
}`;
var FRAG = `
in vec3 vCol; in float vBlur; out vec4 o;
void main() {
  float r = length(gl_PointCoord - .5) * 2.;
  float gauss = exp(-r * r * 4.) * (1. - smoothstep(.8, 1., r));
  float disc = (1. - smoothstep(.86, 1., r)) * (.7 + .3 * smoothstep(.55, .95, r)) * .42;
  o = vec4(vCol * mix(gauss, disc, smoothstep(0., .6, vBlur)), 1.);
}`;
var ProcPoints = class {
	/** count: number of particles; glsl: uniform declarations + helpers + particle(); uniforms: their three.js uniforms. */
	constructor({ count, glsl, uniforms = {} }) {
		this.N = count;
		const geo = new BufferGeometry();
		geo.setAttribute("position", new BufferAttribute(new Float32Array(count * 3), 3));
		this.u = {
			uT: { value: 0 },
			uSize: { value: .01 },
			uMinPx: { value: 1.4 },
			uFocal: { value: 1e3 },
			uBright: { value: 1 },
			uFocus: { value: 5 },
			uAperture: { value: 0 },
			uMaxBlur: { value: 60 },
			uOrtho: { value: 0 },
			uSparkle: { value: 0 },
			...uniforms
		};
		this.material = shaderMaterial({
			vertex: HEAD + glsl + MAIN,
			fragment: FRAG,
			transparent: true,
			depthWrite: false,
			depthTest: true,
			blending: 2,
			uniforms: this.u
		});
		this.points = new Points(geo, this.material);
		this.points.frustumCulled = false;
	}
	/** Common per-frame parameters (same meaning as Swarm.set) plus any extra uniform values in `p.u`. */
	set(p, camera, H) {
		const u = this.u;
		u.uT.value = p.t ?? 0;
		u.uSize.value = p.size ?? .01;
		u.uMinPx.value = (p.minPx ?? 1.4) * H / 1080;
		u.uBright.value = p.bright ?? 1;
		u.uSparkle.value = p.sparkle ?? 0;
		u.uFocus.value = p.focus ?? 5;
		u.uAperture.value = p.aperture ?? 0;
		u.uMaxBlur.value = (p.maxBlur ?? 70) * H / 1080;
		u.uOrtho.value = camera.isOrthographicCamera ? 1 : 0;
		u.uFocal.value = camera.isPerspectiveCamera ? H / 2 / Math.tan(MathUtils.degToRad(camera.fov) / 2) : H * camera.zoom / (camera.top - camera.bottom);
		if (p.u) for (const k in p.u) {
			const v = p.u[k], dst = u[k];
			if (!dst) continue;
			if (Array.isArray(v)) dst.value.fromArray ? dst.value.fromArray(v) : dst.value.setRGB(...v);
			else dst.value = v;
		}
		this.points.visible = true;
		return this;
	}
};
/** A three.js uniform holding a colour/vector for ProcPoints glsl (vec3). */
var v3u = (v = [
	1,
	1,
	1
]) => ({ value: new Vector3(...v) });
//#endregion
export { ProcPoints, v3u };
