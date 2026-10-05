import { Color, Mesh, PlaneGeometry } from "../../vendor/three/build/three.core.js?v=q9f7JKE-";
import { shaderMaterial } from "../engine/gpu.js?v=o4BYX3o1";
//#region src/lib/env.js
var GRID_VERT = `
out vec3 vW;
void main() { vec4 w = modelMatrix * vec4(position, 1.); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`;
var GRID_FRAG = `
uniform vec3 uCol, uAxisCol; uniform float uMinor, uMajor, uFade, uIntensity, uPlane, uReveal, uRevealR;
in vec3 vW; out vec4 o;
float lines(vec2 p) { vec2 g = abs(fract(p - .5) - .5) / max(fwidth(p), 1e-5); return 1. - min(min(g.x, g.y), 1.); }
void main() {
  vec2 p = uPlane < .5 ? vW.xz : uPlane < 1.5 ? vW.xy : vW.zy;
  float minor = lines(p / uMinor), major = lines(p / uMajor);
  vec2 ax = abs(p) / max(fwidth(p), 1e-5); float axis = 1. - min(min(ax.x, ax.y), 1.);
  float f = exp(-length(vW - cameraPosition) * uFade);
  float rev = 1. - smoothstep(uRevealR * uReveal - .5, uRevealR * uReveal, length(p)); // the grid can spread out from the origin
  vec3 col = (uCol * (minor * .22 + major * .6) + uAxisCol * axis * 1.2) * f * uIntensity * rev;
  o = vec4(col, 1.);
}`;
/**
* An infinite-looking grid plane ('xz' floor, 'xy' wall or 'yz' side wall), additive, fading with distance from the camera.
* size: side of the plane in world units; minor / major: spacing of the thin and the thick lines; fade: how fast it
* dims with distance (exp(-d * fade)). The plane is centred on the origin and its lines are laid out in world
* coordinates, so move the mesh (mesh.position) to put a wall behind the subject.
*/
function gridPlane({ plane = "xz", size = 400, color = [
	.1,
	.38,
	.9
], axis = [
	.6,
	.85,
	1
], minor = .25, major = 1, fade = .07, intensity = 1 } = {}) {
	const geo = new PlaneGeometry(size, size);
	if (plane === "xz") geo.rotateX(-Math.PI / 2);
	else if (plane === "yz") geo.rotateY(Math.PI / 2);
	const mesh = new Mesh(geo, shaderMaterial({
		vertex: GRID_VERT,
		fragment: GRID_FRAG,
		transparent: true,
		depthWrite: false,
		blending: 2,
		side: 2,
		uniforms: {
			uCol: { value: new Color(...color) },
			uAxisCol: { value: new Color(...axis) },
			uMinor: { value: minor },
			uMajor: { value: major },
			uFade: { value: fade },
			uIntensity: { value: intensity },
			uPlane: { value: {
				xz: 0,
				xy: 1,
				yz: 2
			}[plane] ?? 0 },
			uReveal: { value: 1 },
			uRevealR: { value: 60 }
		}
	}));
	mesh.frustumCulled = false;
	/** Per-frame: intensity, reveal (0..1 spread from the origin over revealR units), fade, minor/major spacing. */
	mesh.userData.set = ({ intensity, reveal, revealR, fade, minor, major } = {}) => {
		const u = mesh.material.uniforms;
		if (minor != null) u.uMinor.value = minor;
		if (major != null) u.uMajor.value = major;
		if (intensity != null) u.uIntensity.value = intensity;
		if (reveal != null) u.uReveal.value = reveal;
		if (revealR != null) u.uRevealR.value = revealR;
		if (fade != null) u.uFade.value = fade;
	};
	return mesh;
}
//#endregion
export { gridPlane };
