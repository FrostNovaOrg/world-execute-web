import { MathUtils, Matrix4, Vector3 } from "../../../vendor/three/build/three.core.js?v=q9f7JKE-";
import { fsMaterial } from "../../engine/gpu.js?v=o4BYX3o1";
//#region src/ch/c3/sandbox.js
var CELL = {
	S0: 6,
	C: 17
};
var FRAG = `
uniform mat4 uCamWorld, uProjInv; uniform vec3 uCamPos;
uniform float uS, uC, uPixAng, uFog, uFog0, uGridAll, uGain, uGlass, uEdgeGain, uFocus, uAperture, uStrain, uOnlyCentre, uNear, uEdgeW;
uniform vec3 uGlassCol, uEdgeCol;
in vec2 vUv; out vec4 o;
float lineW(float d, float hw, float foot, float b) { float w = max(max(hw, foot * .6), b); return exp(-d * d / (w * w)) * min(1., hw / w); }
float grid(float x, float s, float hw, float foot, float b) { float d = abs(fract(x / s + .5) - .5) * s; return lineW(d, hw, foot, b); }
void main() {
  vec4 v = uProjInv * vec4(vUv * 2. - 1., 1., 1.); v /= v.w;
  vec3 rd = normalize((uCamWorld * vec4(v.xyz, 0.)).xyz), ro = uCamPos;
  vec3 col = vec3(0.);
  float S = uS;
  for (int ax = 0; ax < 3; ax++) {
    float d = rd[ax];
    if (abs(d) < 1e-4) continue;
    int a1 = ax == 0 ? 1 : 0, a2 = ax == 2 ? 1 : 2;
    for (int sd = 0; sd < 2; sd++) {
      float side = sd == 0 ? -1. : 1.;
      float u0 = (ro[ax] - side * S) / uC;
      float k = d > 0. ? ceil(u0) : floor(u0), stp = d > 0. ? 1. : -1.;
      for (int n = 0; n < 12; n++) {
        float t = uC * (k - u0) / d;
        k += stp;
        if (t < .02) continue;
        float fog = exp(-max(0., t - uFog0) * uFog);
        if (fog < .006) break;
        if (uNear > 0.) fog *= smoothstep(uNear * .35, uNear, t);          // no cell edges right in front of the lens
        vec3 p = ro + rd * t;
        vec3 id; id[ax] = k - stp; id[a1] = floor(p[a1] / uC + .5); id[a2] = floor(p[a2] / uC + .5);
        float centre = step(dot(id, id), .5);
        if (uOnlyCentre > .5 && centre < .5) continue;
        vec3 l = p - id * uC;
        vec2 f = vec2(l[a1], l[a2]);
        if (abs(f.x) > S + .1 || abs(f.y) > S + .1) continue;
        float graze = max(abs(d), .08), foot = t * uPixAng / graze;
        float b = uAperture > 0. ? uAperture * abs(t - uFocus) : 0.;
        float fres = .3 + .7 * pow(1. - abs(d), 4.);
        float near = max(centre, smoothstep(.012, .004, foot) * uGridAll);
        float g = ((grid(f.x, .5, .004, foot, b) + grid(f.y, .5, .004, foot, b)) * .45 * smoothstep(.02, .006, foot)
                + (grid(f.x, 2., .007, foot, b) + grid(f.y, 2., .007, foot, b)) * smoothstep(.06, .015, foot)) * near + .012 + min(uStrain, 5.) * .004 * centre;
        float e = S - max(abs(f.x), abs(f.y)), edge = lineW(e, uEdgeW, foot, b);
        col += fog * (uGlassCol * uGlass * fres * g + uEdgeCol * uEdgeGain * edge);
      }
    }
  }
  o = vec4(col * uGain, 1.);
}`;
function makeArray() {
	const v3 = () => ({ value: new Vector3() });
	return fsMaterial(FRAG, {
		uCamWorld: { value: new Matrix4() },
		uProjInv: { value: new Matrix4() },
		uCamPos: v3(),
		uS: { value: CELL.S0 },
		uC: { value: CELL.C },
		uPixAng: { value: .001 },
		uFog: { value: .01 },
		uFog0: { value: 0 },
		uGridAll: { value: 1 },
		uGain: { value: 1 },
		uGlass: { value: 1 },
		uEdgeGain: { value: 1 },
		uFocus: { value: 10 },
		uAperture: { value: 0 },
		uStrain: { value: 0 },
		uOnlyCentre: { value: 0 },
		uNear: { value: 0 },
		uEdgeW: { value: .03 },
		uGlassCol: v3(),
		uEdgeCol: v3()
	});
}
/** o: S, glass (colour), edge (colour), fog, fog0, gain, glassK, edgeK, gridAll, focus, aperture, strain, onlyCentre, near (fade-in distance). */
function setArray(m, cam, H, o) {
	const u = m.uniforms;
	cam.updateMatrixWorld();
	u.uCamWorld.value.copy(cam.matrixWorld);
	u.uProjInv.value.copy(cam.projectionMatrixInverse);
	u.uCamPos.value.copy(cam.position);
	u.uPixAng.value = 2 * Math.tan(MathUtils.degToRad(cam.fov) / 2) / H;
	u.uS.value = o.S;
	u.uFog.value = o.fog ?? .035;
	u.uFog0.value = o.fog0 ?? 0;
	u.uGridAll.value = o.gridAll ?? 0;
	u.uGain.value = o.gain ?? 1;
	u.uGlass.value = o.glassK ?? .6;
	u.uEdgeGain.value = o.edgeK ?? .42;
	u.uFocus.value = o.focus ?? 10;
	u.uAperture.value = o.aperture ?? 0;
	u.uStrain.value = o.strain ?? 0;
	u.uOnlyCentre.value = o.onlyCentre ? 1 : 0;
	u.uNear.value = o.near ?? 0;
	u.uEdgeW.value = o.edgeW ?? .03;
	u.uGlassCol.value.set(...o.glass);
	u.uEdgeCol.value.set(...o.edge);
}
/** The twelve edges of the centre cube as glow lines. */
function boxEdges(L, S, color, width = 2.4) {
	const c = [
		[
			-1,
			-1,
			-1
		],
		[
			1,
			-1,
			-1
		],
		[
			1,
			1,
			-1
		],
		[
			-1,
			1,
			-1
		],
		[
			-1,
			-1,
			1
		],
		[
			1,
			-1,
			1
		],
		[
			1,
			1,
			1
		],
		[
			-1,
			1,
			1
		]
	].map(([x, y, z]) => [
		x * S,
		y * S,
		z * S
	]);
	for (const [a, b] of [
		[0, 1],
		[1, 2],
		[2, 3],
		[3, 0],
		[4, 5],
		[5, 6],
		[6, 7],
		[7, 4],
		[0, 4],
		[1, 5],
		[2, 6],
		[3, 7]
	]) L.segment(c[a], c[b], {
		color,
		width
	});
}
//#endregion
export { CELL, boxEdges, makeArray, setArray };
