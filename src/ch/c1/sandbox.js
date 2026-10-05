import { MathUtils, Matrix4, Vector2, Vector3 } from "../../../vendor/three/build/three.core.js?v=q9f7JKE-";
import { fsMaterial } from "../../engine/gpu.js?v=o4BYX3o1";
//#region src/ch/c1/sandbox.js
var BOX = {
	S: 6,
	C: 17,
	y0: 6,
	me: [-.82, 4.05],
	you: [.66, 3.85]
};
var FRAG = `
uniform mat4 uCamWorld, uProjInv; uniform vec3 uCamPos;
uniform float uS, uC, uY0, uPixAng, uFog, uFog0, uGridAll, uGain, uGlass, uEdgeGain, uCityGain, uMarks, uSkipCity, uSkipGlass, uFocus, uAperture, uSqueeze;
uniform vec3 uGlassCol, uEdgeCol, uCityCold, uCityWarm, uMeCol, uYouCol;
uniform vec2 uMe, uYou;
in vec2 vUv; out vec4 o;
// a line of physical half-width hw at distance d, seen with pixel footprint foot and blur width b: coverage-weighted
float lineW(float d, float hw, float foot, float b) { float w = max(max(hw, foot * .6), b); return exp(-d * d / (w * w)) * min(1., hw / w); } // peak ∝ hw / w: energy conserved
float grid(float x, float s, float hw, float foot, float b) { float d = abs(fract(x / s + .5) - .5) * s; return lineW(d, hw, foot, b); }
void main() {
  vec4 v = uProjInv * vec4(vUv * 2. - 1., 1., 1.); v /= v.w;
  vec3 rd = normalize((uCamWorld * vec4(v.xyz, 0.)).xyz), ro = uCamPos;
  vec3 c0 = vec3(0., uY0, 0.), col = vec3(0.);
  float S = uS * (1. - uSqueeze);
  for (int ax = 0; ax < 3; ax++) {
    float d = rd[ax];
    if (abs(d) < 1e-4) continue;
    int a1 = ax == 0 ? 1 : 0, a2 = ax == 2 ? 1 : 2;
    for (int sd = 0; sd < 2; sd++) {
      float side = sd == 0 ? -1. : 1.;
      float u0 = (ro[ax] - c0[ax] - side * S) / uC;
      float k = d > 0. ? ceil(u0) : floor(u0), stp = d > 0. ? 1. : -1.;
      for (int n = 0; n < 12; n++) {
        float t = uC * (k - u0) / d;
        k += stp;
        if (t < .02) continue;
        float fog = exp(-max(0., t - uFog0) * uFog);
        if (fog < .006) break;
        vec3 p = ro + rd * t;
        vec3 id; id[ax] = k - stp; id[a1] = floor((p[a1] - c0[a1]) / uC + .5); id[a2] = floor((p[a2] - c0[a2]) / uC + .5);
        vec3 l = p - (c0 + id * uC);
        vec2 f = vec2(l[a1], l[a2]);
        if (abs(f.x) > S + .1 || abs(f.y) > S + .1) continue;
        float graze = max(abs(d), .08), foot = t * uPixAng / graze;
        float b = uAperture > 0. ? uAperture * abs(t - uFocus) : 0.;          // blur width on this face (world)
        float centre = step(dot(id, id), .5);
        if (uSkipGlass < .5 || centre < .5) {
          float fres = .3 + .7 * pow(1. - abs(d), 4.);
          // the glass grid: the centre cell (the sandbox we know) everywhere, other cells only when very near; plus a faint sheen
          float near = max(centre, smoothstep(.012, .004, foot) * uGridAll);
          float g = ((grid(f.x, .5, .004, foot, b) + grid(f.y, .5, .004, foot, b)) * .45 * smoothstep(.02, .006, foot)
                  + (grid(f.x, 2., .007, foot, b) + grid(f.y, 2., .007, foot, b)) * smoothstep(.06, .015, foot)) * near + .012;
          float e = S - max(abs(f.x), abs(f.y)), edge = lineW(e, .03, foot, b);
          col += fog * (uGlassCol * uGlass * fres * g + uEdgeCol * uEdgeGain * edge);
        }
        // me and you pressed on the inside of every front face (z = +S)
        if (ax == 2 && sd == 1 && uMarks > 0. && !(uSkipCity > .5 && centre > .5)) {
          vec2 q = vec2(l.x, l.y + uY0);                                   // height above the cell's floor
          float w = max(foot, b), d1 = length(q - uMe), d2 = length(q - uYou);
          float m1 = (1. - smoothstep(.8 - w, .8 + w, d1)) * (.35 + .65 * exp(-d1 * d1 * 3.)) * min(1., .8 / max(w * 2., 1e-4));
          float m2 = (1. - smoothstep(.6 - w, .6 + w, d2)) * (.35 + .65 * exp(-d2 * d2 * 5.)) * min(1., .6 / max(w * 2., 1e-4));
          col += fog * uMarks * (uMeCol * m1 + uYouCol * m2) * .5;
        }
      }
    }
  }
  // the city: four horizontal slices through each cell's pillars (heights from a hash, like the real city)
  if (uCityGain > 0. && abs(rd.y) > 1e-4) {
    for (int sl = 0; sl < 4; sl++) {
      float hy = .25 + float(sl) * .75, off = hy - uS;
      float u0 = (ro.y - c0.y - off) / uC;
      float k = rd.y > 0. ? ceil(u0) : floor(u0), stp = rd.y > 0. ? 1. : -1.;
      for (int n = 0; n < 10; n++) {
        float t = uC * (k - u0) / rd.y; k += stp;
        if (t < .02) continue;
        float fog = exp(-max(0., t - uFog0) * uFog); if (fog < .006) break;
        vec3 p = ro + rd * t;
        vec3 id = vec3(floor((p.x - c0.x) / uC + .5), k - stp, floor((p.z - c0.z) / uC + .5));
        if (uSkipCity > .5 && dot(id, id) < .5) continue;
        vec3 l = p - (c0 + id * uC);
        float r = length(l.xz) / 5.2;
        if (abs(l.x) > 5.2 || abs(l.z) > 5.2 || r > 1.) continue;
        vec2 g = l.xz / .26 + 20., gi = floor(g), gf = fract(g) - .5;
        float hgt = (.25 + 2.3 * pow(hash12(gi), 2.2)) * exp(-r * r * 1.6) * 1.1;
        float inP = step(max(abs(gf.x), abs(gf.y)), .33) * step(hy, hgt);
        float foot = t * uPixAng / max(abs(rd.y), .08);
        float avg = .44 * smoothstep(1., .2, r) * exp(-hy * .9);             // what a pixel covering many pillars sees
        float cov = mix(inP, avg, clamp(foot / .2, 0., 1.));
        col += fog * uCityGain * cov * mix(uCityCold, uCityWarm, float(sl) / 3. * .6) * .35;
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
		uS: { value: BOX.S },
		uC: { value: BOX.C },
		uY0: { value: BOX.y0 },
		uPixAng: { value: .001 },
		uFog: { value: .01 },
		uFog0: { value: 0 },
		uGridAll: { value: 1 },
		uGain: { value: 1 },
		uGlass: { value: 1 },
		uEdgeGain: { value: 1 },
		uCityGain: { value: 1 },
		uMarks: { value: 1 },
		uSkipCity: { value: 1 },
		uSkipGlass: { value: 0 },
		uFocus: { value: 10 },
		uAperture: { value: 0 },
		uSqueeze: { value: 0 },
		uGlassCol: v3(),
		uEdgeCol: v3(),
		uCityCold: v3(),
		uCityWarm: v3(),
		uMeCol: v3(),
		uYouCol: v3(),
		uMe: { value: new Vector2(...BOX.me) },
		uYou: { value: new Vector2(...BOX.you) }
	});
}
/** o: pal, fog, gain, glass, edge, city, marks, skipCity (centre cell's city/marks are rasterised), focus, aperture, squeeze (c3). */
function setArray(m, cam, H, o) {
	const u = m.uniforms, pal = o.pal;
	cam.updateMatrixWorld();
	u.uCamWorld.value.copy(cam.matrixWorld);
	u.uProjInv.value.copy(cam.projectionMatrixInverse);
	u.uCamPos.value.copy(cam.position);
	u.uPixAng.value = 2 * Math.tan(MathUtils.degToRad(cam.fov) / 2) / H;
	u.uFog.value = o.fog ?? .035;
	u.uFog0.value = o.fog0 ?? 0;
	u.uGridAll.value = o.gridAll ?? 1;
	u.uGain.value = o.gain ?? 1;
	u.uGlass.value = o.glass ?? .6;
	u.uEdgeGain.value = o.edge ?? .42;
	u.uCityGain.value = o.city ?? 1;
	u.uMarks.value = o.marks ?? 1;
	u.uSkipCity.value = o.skipCity ?? 1;
	u.uSkipGlass.value = o.skipGlass ?? 0;
	u.uFocus.value = o.focus ?? 10;
	u.uAperture.value = o.aperture ?? 0;
	u.uSqueeze.value = o.squeeze ?? 0;
	u.uGlassCol.value.set(...pal.grid.map((c) => c * .5));
	u.uEdgeCol.value.set(...pal.white.map((c) => c * .9));
	u.uCityCold.value.set(...pal.cold.map((c) => c * .5));
	u.uCityWarm.value.set(...pal.warm.map((c) => c * .6));
	u.uMeCol.value.set(...pal.cold);
	u.uYouCol.value.set(...pal.warm);
}
/** The twelve edges of the centre cube as glow lines (when the analytic glass is skipped, or to brighten it). */
function boxEdges(L, color, width = 2.4, S = BOX.S) {
	const y0 = BOX.y0, c = [
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
		y0 + y * S,
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
/**
* Points of a swarm pressed against glass (the plane z = 0, the swarm on the -z side): a soft ball of radius R whose
* centre sits depth·R behind the glass. What would cross the plane is flattened onto it, so the contact patch
* (radius R·√(1 − depth²)) is a dense, flat disc with a ridge at its edge, and the rest of the ball bulges behind.
*/
function pressedShape(N, { R = 1, depth = .5, seed = 3 } = {}) {
	const out = new Float32Array(N * 4);
	let s = seed >>> 0 || 1;
	const g = () => {
		s = s + 1831565813 >>> 0;
		let t = s;
		t = Math.imul(t ^ t >>> 15, t | 1);
		t ^= t + Math.imul(t ^ t >>> 7, t | 61);
		return ((t ^ t >>> 14) >>> 0) / 4294967296;
	};
	const rc = R * Math.sqrt(1 - depth * depth);
	for (let i = 0; i < N; i++) {
		const k = g();
		let x, y, z;
		if (k < .3) {
			const r = rc * Math.pow(g(), .35), a = g() * Math.PI * 2;
			x = Math.cos(a) * r;
			y = Math.sin(a) * r;
			z = -g() * .006;
		} else {
			const u = 2 * g() - 1, a = g() * Math.PI * 2, q = Math.sqrt(1 - u * u);
			const rad = R * (k < .8 ? .96 + .04 * g() : Math.cbrt(g()));
			x = Math.cos(a) * q * rad;
			y = Math.sin(a) * q * rad;
			z = u * rad - depth * R;
			if (z > 0) z = -g() * .006;
		}
		out.set([
			x,
			y,
			z,
			0
		], i * 4);
	}
	return out;
}
//#endregion
export { BOX, boxEdges, makeArray, pressedShape, setArray };
