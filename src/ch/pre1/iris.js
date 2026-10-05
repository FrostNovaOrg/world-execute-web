import { Mesh, PlaneGeometry, Vector3 } from "../../../vendor/three/build/three.core.js?v=q9f7JKE-";
import { shaderMaterial } from "../../engine/gpu.js?v=o4BYX3o1";
//#region src/ch/pre1/iris.js
var apertureR = (N) => 1.8 / N;
var VERT = `
out vec2 vUv;
void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`;
var FRAG = `
uniform float uAp, uRot, uLight, uSpike, uHousing, uGain, uRimGain;
uniform vec3 uLightCol, uRimCol, uMetal, uLineCol;
in vec2 vUv; out vec4 o;
void main() {
  vec2 p = (vUv - .5) * 2.4;
  float r = length(p), ang = atan(p.y, p.x), px = max(fwidth(r), 1e-4);
  float hex = 0.;
  for (int k = 0; k < 6; k++) { float a = uRot + float(k) * TAU / 6.; hex = max(hex, dot(p, vec2(cos(a), sin(a)))); }
  float dOpen = mix(hex, r, .38) - uAp;                                     // < 0 inside the opening (curved hexagon)
  float open = 1. - smoothstep(-px, px, dOpen);
  // blades: sectors separated by curved seams starting at the opening's corners
  float psi = (ang - uRot - PI / 6. - 1.35 * (r - uAp)) / (TAU / 6.);
  float k = floor(psi), u = psi - k;
  float bladeId = mod(k, 6.);
  vec3 metal = uMetal * (.55 + .45 * u) * (.85 + .15 * hash11(bladeId + 1.));
  float brushed = .5 + .5 * sin((r * 180. + bladeId * 7.) + sin(ang * 3.) * 2.);
  metal *= .85 + .15 * brushed;
  float sheen = pow(max(0., cos(ang - uRot * 2. - 2.2)), 8.) * .022;         // a soft specular band
  float dA = u * (TAU / 6.) * r, dB = (1. - u) * (TAU / 6.) * r;          // distances to this blade's edge / the next blade's edge
  float lit = exp(-dA / (px * 1.3)), shadow = 1. - .8 * exp(-dB / .035);
  vec3 blades = (metal + sheen) * shadow + uRimCol * lit * .16 * uRimGain;
  float housing = smoothstep(.985, .985 + px, r);
  vec3 col = blades * (1. - open);
  float rim = exp(-abs(dOpen) / (px * 1.6)) * (1. - housing);
  col += uRimCol * rim * (.3 + .25 * uLight) * uRimGain;                      // blade edges catch the light from behind
  // behind the opening: the flat DC trace from the scope, slightly defocused, on a faint field
  col += uLight * open * (uLightCol * .035 * (1. - .5 * smoothstep(0., uAp + 1e-3, r)) + uLineCol * (exp(-abs(p.y) / (.012 + px)) * 1.3 + exp(-abs(p.y) / .1) * .06));
  // housing ring with engraved ticks every 6°, long every 30°
  float ring = smoothstep(1. - px, 1. + px, r) * (1. - smoothstep(1.075 - px, 1.075 + px, r));
  col = mix(col, uMetal * 2.2 + uRimCol * .04 * (.6 + .4 * sin(ang * 90.)), ring * uHousing);
  col *= 1. - smoothstep(1.075, 1.075 + px, r);
  float ta = fract(ang / (TAU / 60.) + .5) - .5, isMajor = step(abs(fract(ang / (TAU / 12.) + .5) - .5), .02);
  float tick = (1. - smoothstep(.06, .09, abs(ta))) * step(1.09, r) * (1. - step(mix(1.115, 1.15, isMajor), r));
  col += uRimCol * tick * .35 * uHousing;
  // six-point diffraction star of the hexagonal opening (pairs of spikes perpendicular to its straight edges)
  float star = 0.;
  for (int j = 0; j < 3; j++) { float a = uRot + float(j) * PI / 3.; vec2 n = vec2(-sin(a), cos(a)); star += exp(-abs(dot(p, n)) / (px * 1.4 + .004)) * exp(-r * 2.2); }
  col += uLightCol * star * uSpike;
  col += uLightCol * uSpike * .6 * exp(-r * r / .004);
  o = vec4(col * uGain, 1.);
}`;
/** The iris plane (2.4 × 2.4, housing radius 1), facing +z. */
function makeIris() {
	const m = new Mesh(new PlaneGeometry(2.4, 2.4), shaderMaterial({
		vertex: VERT,
		fragment: FRAG,
		transparent: false,
		depthWrite: true,
		side: 2,
		uniforms: {
			uAp: { value: .9 },
			uRot: { value: 0 },
			uLight: { value: 1 },
			uSpike: { value: 0 },
			uHousing: { value: 1 },
			uGain: { value: 1 },
			uRimGain: { value: 1 },
			uLightCol: { value: new Vector3(.55, .78, 1) },
			uRimCol: { value: new Vector3(.5, .75, 1) },
			uMetal: { value: new Vector3(.012, .014, .02) },
			uLineCol: { value: new Vector3(.42, .92, 1) }
		}
	}));
	m.frustumCulled = false;
	m.userData.set = (o) => {
		const u = m.material.uniforms;
		for (const [k, n] of [
			["ap", "uAp"],
			["rot", "uRot"],
			["light", "uLight"],
			["spike", "uSpike"],
			["housing", "uHousing"],
			["gain", "uGain"],
			["rim", "uRimGain"]
		]) if (o[k] != null) u[n].value = o[k];
		if (o.lightCol) u.uLightCol.value.set(...o.lightCol);
		if (o.rimCol) u.uRimCol.value.set(...o.rimCol);
		if (o.metal) u.uMetal.value.set(...o.metal);
		if (o.lineCol) u.uLineCol.value.set(...o.lineCol);
		m.visible = true;
	};
	return m;
}
//#endregion
export { apertureR, makeIris };
