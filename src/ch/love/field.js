import { Color, Mesh, PlaneGeometry } from "../../../vendor/three/build/three.core.js?v=q9f7JKE-";
import { shaderMaterial } from "../../engine/gpu.js?v=o4BYX3o1";
//#region src/ch/love/field.js
var VERT = `
uniform float uAmp;
out vec3 vW; out float vF;
float F(vec2 p) { float g = dot(p, p) - 1.; return g * g * g - p.x * p.x * p.y * p.y * p.y; }
void main() {
  vec3 p = position;
  float f = F(vec2(p.x, -p.z)), cf = sign(f) * pow(abs(f), 1. / 3.);
  vF = cf;
  p.y = uAmp * clamp(cf, -1., 1.4);
  vec4 w = modelMatrix * vec4(p, 1.); vW = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}`;
var FRAG = `
uniform vec3 uLine, uZero, uFill, uGridCol; uniform float uFade, uIntensity, uReveal, uLit;
in vec3 vW; in float vF; out vec4 o;
float lineAA(float v, float w) { float d = .5 - abs(fract(v) - .5); return 1. - smoothstep(0., max(w, 1e-4), d); }
void main() {
  float v = vF * 10.;
  float iso = lineAA(v, fwidth(v) * 1.2) * (vF < 0. ? .9 : .5 * exp(-vF * 1.8) * (1. - smoothstep(1.1, 1.35, vF)));
  float zero = 1. - smoothstep(0., fwidth(vF) * 1.6, abs(vF));
  vec2 g = vW.xz * 4.; float grid = max(lineAA(g.x, fwidth(g.x)), lineAA(g.y, fwidth(g.y)));
  float fill = vF < 0. ? .18 * (1. + vF) + .06 : 0.;
  float fade = exp(-length(vW - cameraPosition) * uFade);
  float rev = 1. - smoothstep(uReveal * 4. - .4, uReveal * 4., length(vW.xz));
  vec3 col = uLine * iso + uZero * zero * (2. + 2. * uLit) + uFill * fill * (1. + uLit) + uGridCol * grid * .12;
  o = vec4(col * fade * rev * uIntensity, 1.);
}`;
function fieldMesh() {
	const geo = new PlaneGeometry(7, 7, 360, 360);
	geo.rotateX(-Math.PI / 2);
	const mesh = new Mesh(geo, shaderMaterial({
		vertex: VERT,
		fragment: FRAG,
		transparent: true,
		depthWrite: true,
		depthTest: true,
		blending: 2,
		side: 2,
		uniforms: {
			uAmp: { value: .32 },
			uLine: { value: new Color(.9, .62, .3) },
			uZero: { value: new Color(1, .3, .55) },
			uFill: { value: new Color(1, .35, .45) },
			uGridCol: { value: new Color(.5, .55, .9) },
			uFade: { value: .12 },
			uIntensity: { value: 1 },
			uReveal: { value: 1 },
			uLit: { value: 0 }
		}
	}));
	mesh.frustumCulled = false;
	mesh.userData.set = ({ intensity = 1, reveal = 1, lit = 0, fade = .12, amp = .32 } = {}) => {
		const u = mesh.material.uniforms;
		u.uIntensity.value = intensity;
		u.uReveal.value = reveal;
		u.uLit.value = lit;
		u.uFade.value = fade;
		u.uAmp.value = amp;
	};
	return mesh;
}
/** Height of the field at heart coordinates (x, y), matching the vertex shader. */
function fieldHeight(x, y, amp = .32) {
	const g = x * x + y * y - 1, f = g * g * g - x * x * y * y * y, cf = Math.sign(f) * Math.abs(f) ** (1 / 3);
	return amp * Math.min(1.4, Math.max(-1, cf));
}
//#endregion
export { fieldHeight, fieldMesh };
