import { clamp } from "../../engine/math.js?v=BJIlRm7-";
import { BoxGeometry, Color, Mesh, Vector3 } from "../../../vendor/three/build/three.core.js?v=q9f7JKE-";
import { shaderMaterial } from "../../engine/gpu.js?v=o4BYX3o1";
import { dofPolyline, dofSegment, mul } from "./kit.js?v=rUxrOt9G";
//#region src/ch/intro/sandbox.js
var SB = Object.freeze({
	S: 1.5,
	H: 3
});
/**
* Wire edges of an axis-aligned box [−S, S] × [y0, y0 + H] × [−S, S]. extrude 0..1 raises a copy of the base square
* (the top) and grows the vertical edges behind it. o: color, width, dof, base (draw the base square), corner (dots).
*/
function drawBoxEdges(L, { S = SB.S, H = SB.H, y0 = 0, extrude = 1, color = [
	1,
	1,
	1
], width = 2.6, dof, base = true, corner = 0, center = [
	0,
	0,
	0
] } = {}) {
	if (extrude <= 0 && !base) return;
	const [cx, , cz] = center, y1 = y0 + H * extrude;
	const c = [
		[-S, -S],
		[S, -S],
		[S, S],
		[-S, S]
	].map(([x, z]) => [cx + x, z + cz]);
	const sq = (y) => c.map(([x, z]) => [
		x,
		y,
		z
	]).concat([[
		c[0][0],
		y,
		c[0][1]
	]]);
	if (base) dofPolyline(L, sq(y0), {
		color,
		width
	}, dof);
	if (extrude > 0) {
		for (const [x, z] of c) dofSegment(L, [
			x,
			y0,
			z
		], [
			x,
			y1,
			z
		], {
			color,
			width
		}, dof);
		dofPolyline(L, sq(y1), {
			color: mul(color, 1.15),
			width: width * 1.1
		}, dof);
		if (corner > 0) for (const [x, z] of c) for (const y of [y0, y1]) dofSegment(L, [
			x,
			y,
			z
		], [
			x,
			y,
			z
		], {
			color: mul([
				1,
				1,
				1
			], corner),
			width: width * 3.2
		}, dof);
	}
}
var VERT = `
out vec3 vW; out vec3 vN;
void main() { vec4 w = modelMatrix * vec4(position, 1.); vW = w.xyz; vN = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * viewMatrix * w; }`;
var FRAG = (frontCol) => `
uniform vec3 uCol, uC; uniform float uIntensity, uReveal, uPulse, uCell, uPattern, uS, uH, uFres, uT, uFill;${frontCol ? `
uniform vec3 uFrontCol;` : ""}
in vec3 vW; in vec3 vN; out vec4 o;
float hexD(vec2 p) { p = abs(p); return max(dot(p, vec2(.5, .8660254)), p.x); }
void main() {
  vec3 n = abs(vN), P = vW - uC;
  bool top = n.y > .5;
  vec2 uv = n.x > .5 ? P.zy : (top ? P.xz : P.xy);
  float h = P.y / uH;
  // reveal: walls wipe up from the floor behind a thin bright front; the top closes in from its rim afterwards
  float rim = uS - max(abs(P.x), abs(P.z));
  float rev = top ? 1. - smoothstep(-.02, .02, rim / uS - clamp((uReveal - .92) / .3, 0., 1.))
                  : 1. - smoothstep(-.008, .008, h - uReveal * 1.02);
  float front = top ? 0. : exp(-pow((h - uReveal * 1.02) * uH / .018, 2.)) * step(uReveal, .999);
  vec2 q = uv / uCell; float line;
  if (uPattern < .5) {
    // hexagonal lattice (flat-to-flat = uCell): thin pixel-width lines only, no fill
    const vec2 r = vec2(1., 1.7320508);
    vec2 a = mod(q, r) - r * .5, b = mod(q - r * .5, r) - r * .5, g = dot(a, a) < dot(b, b) ? a : b;
    float e = .5 - hexD(g), fw = fwidth(e);
    line = 1. - smoothstep(0., fw * 1.25, e);
  } else {
    // glass: a sparse square lattice with a stronger major grid every 4 cells
    vec2 g1 = abs(fract(q - .5) - .5) / max(fwidth(q), 1e-5), g2 = abs(fract(q / 4. - .5) - .5) / max(fwidth(q / 4.), 1e-5);
    line = (1. - min(min(g1.x, g1.y), 1.)) * .25 + (1. - min(min(g2.x, g2.y), 1.)) * .8;
  }
  // where the lattice gets denser than the pixels, fade it out instead of letting it average into a grey film
  float dens = max(fwidth(q.x), fwidth(q.y));
  line *= 1. - smoothstep(.1, .3, dens);
  vec3 V = normalize(cameraPosition - vW);
  float fres = pow(1. - abs(dot(V, normalize(vN))), 2.);
  float band = exp(-pow((h - uPulse) * uH / .09, 2.)) * step(-.5, uPulse);   // the lock scan: lines light up as it passes
  float k = line * (.35 + uFres * fres) * (1. + 6. * band) * rev + front * (top ? 0. : 1.);
  o = vec4(uCol * uIntensity * k, 1.);${frontCol ? `
  o.rgb += (uFrontCol - uCol) * uIntensity * front * (top ? 0. : 1.);       // the front in its own colour` : ""}
}`;
/**
* The shield / glass faces: an open-bottom box (4 walls + top), additive. userData.set({...}) per frame.
* frontCol: the remake's variant, whose wipe front takes its own colour (userData.set({ frontColor })).
*/
function shieldMesh({ S = SB.S, H = SB.H, pattern = "hex", cell = .16, frontCol = false } = {}) {
	const g = new BoxGeometry(2 * S, H, 2 * S);
	g.translate(0, H / 2, 0);
	const idx = g.index.array, keep = [];
	for (const grp of g.groups) if (grp.materialIndex !== 3) for (let i = grp.start; i < grp.start + grp.count; i++) keep.push(idx[i]);
	g.setIndex(keep);
	g.clearGroups();
	const mesh = new Mesh(g, shaderMaterial({
		vertex: VERT,
		fragment: FRAG(frontCol),
		transparent: true,
		depthWrite: false,
		depthTest: true,
		blending: 2,
		side: 2,
		uniforms: {
			uCol: { value: new Color(.8, .85, .95) },
			uC: { value: new Vector3() },
			uIntensity: { value: 1 },
			uReveal: { value: 1 },
			uPulse: { value: -1 },
			uCell: { value: cell },
			uPattern: { value: pattern === "hex" ? 0 : 1 },
			uS: { value: S },
			uH: { value: H },
			uFres: { value: 1.2 },
			uT: { value: 0 },
			uFill: { value: 1 },
			...frontCol ? { uFrontCol: { value: new Color(.8, .85, .95) } } : {}
		}
	}));
	mesh.frustumCulled = false;
	mesh.userData.set = ({ intensity, reveal, pulse, color, fres, t, fill, center, frontColor } = {}) => {
		const u = mesh.material.uniforms;
		if (intensity != null) u.uIntensity.value = intensity;
		if (reveal != null) u.uReveal.value = reveal;
		if (pulse != null) u.uPulse.value = pulse;
		if (color) u.uCol.value.setRGB(...color);
		if (u.uFrontCol) u.uFrontCol.value.setRGB(...frontColor ?? color ?? u.uCol.value.toArray());
		if (fres != null) u.uFres.value = fres;
		if (t != null) u.uT.value = t;
		if (fill != null) u.uFill.value = fill;
		if (center) {
			mesh.position.set(...center);
			u.uC.value.set(...center);
		}
		mesh.visible = (intensity ?? u.uIntensity.value) > 0 && (reveal ?? u.uReveal.value) > 0;
	};
	return mesh;
}
/** Sandbox state from key times: extrude (edges), shield (faces), pulse (lock band 0..1, −1 = off). */
function sandboxState(t, { t0, tTop, tShield0, tShield1, tLock0, tLock1 }, e) {
	const extrude = e.outExpo(clamp((t - t0) / (tTop - t0)));
	const shield = e.outCubic(clamp((t - tShield0) / (tShield1 - tShield0)));
	const lk = (t - tLock0) / (tLock1 - tLock0);
	return {
		extrude,
		shield: shield * 1.3,
		pulse: lk >= 0 && lk <= 1 ? e.inOutSine(lk) * 1.08 : -1,
		locked: lk > 1 ? 1 : 0
	};
}
//#endregion
export { SB, drawBoxEdges, sandboxState, shieldMesh };
