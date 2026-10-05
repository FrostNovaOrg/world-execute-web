import { BufferAttribute, BufferGeometry, Color, MathUtils, Points, Vector4 } from "../../../vendor/three/build/three.core.js?v=q9f7JKE-";
import { shaderMaterial } from "../../engine/gpu.js?v=o4BYX3o1";
//#region src/ch/pre2/sprinkle.js
var SPRINKLE_S = 1024;
var VERT = `
uniform float uS, uSize, uFocal, uMinPx, uBright, uOrtho;
uniform vec4 uWin;
uniform vec3 uColA, uColB;
out vec3 vCol;
void main() {
  float i = float(gl_VertexID);
  vec2 cell = vec2(mod(i, uS), floor(i / uS));
  vec2 p = mix(uWin.xy, uWin.zw, (cell + hash22(cell)) / uS);     // stratified sprinkle (as c2)
  float h3 = hash12(cell * 3.1 + 1.3);
  vec4 mv = modelViewMatrix * vec4(p.x, 0., p.y, 1.);
  gl_Position = projectionMatrix * mv;
  float dist = max(-mv.z, 1e-3), persp = uOrtho > .5 ? 1. : 1. / dist;
  float px = uSize * uFocal * persp, core = max(px, uMinPx);
  gl_PointSize = core;
  vCol = mix(uColA, uColB, smoothstep(.2, 1.2, length(p))) * uBright * min(1., px * px / (uMinPx * uMinPx)) * (.7 + .6 * h3);
}`;
var FRAG = `
in vec3 vCol; out vec4 o;
void main() {
  float r = length(gl_PointCoord - .5) * 2.;
  o = vec4(vCol * exp(-r * r * 4.) * (1. - smoothstep(.8, 1., r)), 1.);
}`;
var Sprinkle = class {
	constructor() {
		const g = new BufferGeometry(), n = SPRINKLE_S * SPRINKLE_S, f = (v) => ({ value: v });
		g.setAttribute("position", new BufferAttribute(new Float32Array(n * 3), 3));
		this.points = new Points(g, shaderMaterial({
			vertex: VERT,
			fragment: FRAG,
			transparent: true,
			depthWrite: false,
			blending: 2,
			uniforms: {
				uS: f(SPRINKLE_S),
				uSize: f(.0042),
				uFocal: f(1e3),
				uMinPx: f(1.25),
				uBright: f(.16),
				uOrtho: f(0),
				uWin: f(new Vector4(-1, -1, 1, 1)),
				uColA: f(new Color()),
				uColB: f(new Color())
			}
		}));
		this.points.frustumCulled = false;
	}
	/** o: { size (world units; c2 uses .0042 on a plate of half-size 1), bright, minPx, colA, colB } */
	set(o, cam, hPx) {
		const u = this.points.material.uniforms;
		u.uSize.value = o.size ?? .0042;
		u.uBright.value = o.bright ?? .16;
		u.uMinPx.value = (o.minPx ?? 1.25) * hPx / 1080;
		u.uColA.value.setRGB(...o.colA);
		u.uColB.value.setRGB(...o.colB ?? o.colA);
		u.uOrtho.value = cam.isOrthographicCamera ? 1 : 0;
		u.uFocal.value = cam.isPerspectiveCamera ? hPx / 2 / Math.tan(MathUtils.degToRad(cam.fov) / 2) : hPx * cam.zoom / (cam.top - cam.bottom);
		this.points.visible = true;
		return this;
	}
};
//#endregion
export { SPRINKLE_S, Sprinkle };
