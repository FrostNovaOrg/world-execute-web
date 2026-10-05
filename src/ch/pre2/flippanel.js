import { BoxGeometry, BufferGeometry, CylinderGeometry, DynamicDrawUsage, ExtrudeGeometry, Float32BufferAttribute, InstancedBufferAttribute, InstancedBufferGeometry, Mesh, Path, PlaneGeometry, Scene, Shape, Vector2, Vector3 } from "../../../vendor/three/build/three.core.js?v=q9f7JKE-";
import { shaderMaterial } from "../../engine/gpu.js?v=o4BYX3o1";
import { FD, layout } from "./flipdot.js?v=CEOW_dEb";
//#region src/ch/pre2/flippanel.js
var LIGHT = {
	dir: [
		.26,
		.94,
		.2
	],
	col: [
		.86,
		.9,
		1
	]
};
var HOUSE = {
	front: .24,
	back: -.62,
	bevel: .12,
	rim: 1.25
};
var LIGHTING = `
uniform vec3 uL, uLCol, uAmb; uniform float uLight, uSheen, uFront, uSplitX;
uniform vec2 uShadow, uShadow2;   // the top and right edges of the matrix's opening and of the status row's
// the housing's top bar shades the top rows from a light this low (and the bar right of each opening a little of its
// right columns): lit below the line where a ray to the light just clears the bar's front edge
float sun(vec3 p) {
  vec2 e = p.x > uSplitX ? uShadow2 : uShadow;
  float yEdge = e.x - (uFront - p.z) * uL.y / uL.z, xEdge = e.y - (uFront - p.z) * uL.x / uL.z;
  return (1. - smoothstep(yEdge - .3, yEdge + .3, p.y)) * (1. - smoothstep(xEdge - .3, xEdge + .3, p.x));
}
// diffuse albedo, specular strength and exponent (normalised Blinn-Phong) and a grazing sheen; vis: the sun term
vec3 lit(vec3 n, vec3 v, vec3 alb, float ks, float sh, float sheen, float vis) {
  float d = max(dot(n, uL), 0.), nv = max(dot(n, v), 0.);
  vec3 h = normalize(uL + v);
  float s = pow(max(dot(n, h), 0.), sh) * (sh + 8.) / 25.;
  float f = sheen * pow(1. - nv, 3.) * smoothstep(0., .25, d);
  return uLight * (alb * uAmb + uLCol * vis * (d * (alb + ks * s) + f));
}`;
var DISK_VERT = `
in vec2 aCell; in float aPart; in float aPhi0; in vec4 aPhi; in vec4 aLit;
uniform float uPitch; uniform vec3 uOrigin;
out vec3 vNo, vW, vP; out float vPart; flat out vec4 vPhi, vLit;
vec3 turn(vec3 p, float a) { float c = cos(a), s = sin(a); return vec3(p.x, p.y * c + p.z * s, -p.y * s + p.z * c); }
void main() {
  vec3 q = turn(position, aPhi0);
  vP = vec3(aCell + q.xy, q.z);
  vW = uOrigin + vP * uPitch;
  vNo = normal; vPart = aPart; vPhi = aPhi; vLit = aLit;
  gl_Position = projectionMatrix * viewMatrix * vec4(vW, 1.);
}`;
var DISK_FRAG = `
${LIGHTING}
uniform float uGlow;
in vec3 vNo, vW, vP; in float vPart; flat in vec4 vPhi, vLit; out vec4 o;
vec3 turn(vec3 p, float a) { float c = cos(a), s = sin(a); return vec3(p.x, p.y * c + p.z * s, -p.y * s + p.z * c); }
void main() {
  vec3 no = normalize(vNo), v = normalize(cameraPosition - vW);
  bool axle = vPart > .5, faceA = !axle && no.z > .5, faceB = !axle && no.z < -.5;
  // (AgX lifts the shadows a long way: a black that is to read as black stays under a few thousandths)
  vec3 alb = axle ? vec3(.02) : faceA ? vLit.rgb * .5 + .1 : vec3(.012);
  float ks = axle ? .08 : faceA ? .55 : faceB ? .08 : .12, sh = axle ? 40. : faceA ? 60. : faceB ? 8. : 24.;
  float sheen = faceB ? uSheen : axle ? 0. : .01, vis = sun(vP);
  // the shading at four instants across the shutter: a disk passes its glint angle within a few milliseconds
  vec3 c = lit(turn(no, vPhi.x), v, alb, ks, sh, sheen, vis) + lit(turn(no, vPhi.y), v, alb, ks, sh, sheen, vis)
         + lit(turn(no, vPhi.z), v, alb, ks, sh, sheen, vis) + lit(turn(no, vPhi.w), v, alb, ks, sh, sheen, vis);
  c *= .25;
  if (faceA) c += vLit.rgb * vLit.a * uGlow;
  o = vec4(c, 1.);
}`;
var STATIC_VERT = `
in float aPart;
uniform float uPitch; uniform vec3 uOrigin;
out vec3 vN, vW, vP; out float vPart;
void main() {
  vP = position; vW = uOrigin + position * uPitch; vN = normal; vPart = aPart;
  gl_Position = projectionMatrix * viewMatrix * vec4(vW, 1.);
}`;
var STATIC_FRAG = `
${LIGHTING}
in vec3 vN, vW, vP; in float vPart; out vec4 o;
void main() {
  vec3 n = normalize(vN), v = normalize(cameraPosition - vW);
  int part = int(vPart + .5);                       // 0 back plate, 1 dot frame, 2 coil, 3 housing
  vec3 alb = part == 0 ? vec3(.001) : part == 1 ? vec3(.003) : part == 2 ? vec3(.03, .022, .018) : vec3(.004);
  float ks = part == 0 ? 0. : part == 1 ? .05 : part == 2 ? .5 : .3, sh = part == 2 ? 30. : part == 3 ? 36. : 12.;
  // (the back plate and the coils sit deep in their cells, in the shadow of the dot frame's walls)
  float vis = part == 3 ? 1. : part == 0 ? 0. : part == 2 ? .12 : sun(vP);
  o = vec4(lit(n, v, alb, ks, sh, part == 3 ? uSheen * .6 : 0., vis), 1.);
}`;
/** Concatenate indexed geometries (position, normal) and tag each with a part number. */
function merge(list) {
	const pos = [], nrm = [], part = [], idx = [];
	let base = 0;
	for (const [g, p] of list) {
		const P = g.getAttribute("position"), N = g.getAttribute("normal");
		for (let i = 0; i < P.count; i++) {
			pos.push(P.getX(i), P.getY(i), P.getZ(i));
			nrm.push(N.getX(i), N.getY(i), N.getZ(i));
			part.push(p);
		}
		if (g.index) for (let i = 0; i < g.index.count; i++) idx.push(base + g.index.getX(i));
		else for (let i = 0; i < P.count; i++) idx.push(base + i);
		base += P.count;
	}
	const g = new BufferGeometry();
	g.setAttribute("position", new Float32BufferAttribute(pos, 3));
	g.setAttribute("normal", new Float32BufferAttribute(nrm, 3));
	g.setAttribute("aPart", new Float32BufferAttribute(part, 1));
	g.setIndex(idx);
	return g;
}
var box = (w, h, d, x, y, z) => new BoxGeometry(w, h, d).translate(x, y, z);
var rectPath = (P, [x0, y0, x1, y1]) => {
	P.moveTo(x0, y0);
	P.lineTo(x1, y0);
	P.lineTo(x1, y1);
	P.lineTo(x0, y1);
	P.lineTo(x0, y0);
	return P;
};
var FlipPanel = class {
	constructor() {
		const L = this.L = layout(), N = L.disks.length;
		this.scene = new Scene();
		const pad = .12;
		const uniforms = () => ({
			uPitch: { value: 1 },
			uOrigin: { value: new Vector3() },
			uL: { value: new Vector3(...LIGHT.dir).normalize() },
			uLCol: { value: new Vector3(...LIGHT.col) },
			uAmb: { value: new Vector3(.01, .01, .012) },
			uLight: { value: 1 },
			uSheen: { value: .02 },
			uFront: { value: HOUSE.front },
			uSplitX: { value: (L.main[2] + L.status[0]) / 2 },
			uShadow: { value: new Vector2(L.main[3] + pad, L.main[2] + pad) },
			uShadow2: { value: new Vector2(L.status[3] + pad, L.status[2] + pad) }
		});
		const disk = new CylinderGeometry(FD.disk / 2, FD.disk / 2, FD.thick, 48, 1).rotateX(Math.PI / 2);
		const axle = new CylinderGeometry(.016, .016, FD.disk + .07, 8, 1).rotateZ(Math.PI / 2);
		const one = merge([[disk, 0], [axle, 1]]), g = new InstancedBufferGeometry();
		g.index = one.index;
		for (const k of [
			"position",
			"normal",
			"aPart"
		]) g.setAttribute(k, one.getAttribute(k));
		this.cell = new Float32Array(N * 2);
		L.disks.forEach((d, k) => this.cell.set([d.x, d.y], k * 2));
		this.phi0 = new Float32Array(N);
		this.phi = new Float32Array(N * 4);
		this.lit = new Float32Array(N * 4);
		g.setAttribute("aCell", new InstancedBufferAttribute(this.cell, 2));
		this.aPhi0 = new InstancedBufferAttribute(this.phi0, 1);
		this.aPhi = new InstancedBufferAttribute(this.phi, 4);
		this.aLit = new InstancedBufferAttribute(this.lit, 4);
		for (const a of [
			this.aPhi0,
			this.aPhi,
			this.aLit
		]) a.setUsage(DynamicDrawUsage);
		g.setAttribute("aPhi0", this.aPhi0);
		g.setAttribute("aPhi", this.aPhi);
		g.setAttribute("aLit", this.aLit);
		g.instanceCount = N;
		this.diskMat = shaderMaterial({
			vertex: DISK_VERT,
			fragment: DISK_FRAG,
			uniforms: {
				...uniforms(),
				uGlow: { value: 1 }
			}
		});
		this.disks = new Mesh(g, this.diskMat);
		this.disks.frustumCulled = false;
		const parts = [], [mx0, my0, mx1, my1] = L.main, [sx0, sy0, sx1, sy1] = L.status, W = .05, Z0 = HOUSE.back, Z1 = -.07;
		const [ax0, ay0, ax1, ay1] = L.all;
		parts.push([new PlaneGeometry(ax1 - ax0 + 1, ay1 - ay0 + 1).translate((ax0 + ax1) / 2, (ay0 + ay1) / 2, Z0), 0]);
		const walls = ([x0, y0, x1, y1]) => {
			for (let x = x0; x <= x1 + 1e-6; x += 1) parts.push([box(W, y1 - y0, Z1 - Z0, x, (y0 + y1) / 2, (Z0 + Z1) / 2), 1]);
			for (let y = y0; y <= y1 + 1e-6; y += 1) parts.push([box(x1 - x0, W, Z1 - Z0, (x0 + x1) / 2, y, (Z0 + Z1) / 2), 1]);
		};
		walls(L.main);
		for (const d of L.disks.filter((d) => d.bit >= 0)) walls([
			d.x - .5,
			d.y - .5,
			d.x + .5,
			d.y + .5
		]);
		for (const d of L.disks) parts.push([box(.34, .16, .14, d.x, d.y - .2, Z0 + .1), 2]);
		const shape = rectPath(new Shape(), [
			ax0 - HOUSE.rim,
			ay0 - HOUSE.rim,
			ax1 + HOUSE.rim,
			ay1 + HOUSE.rim
		]);
		shape.holes.push(rectPath(new Path(), [
			mx0 - pad,
			my0 - pad,
			mx1 + pad,
			my1 + pad
		]));
		shape.holes.push(rectPath(new Path(), [
			sx0 - pad,
			sy0 - pad,
			sx1 + pad,
			sy1 + pad
		]));
		const depth = HOUSE.front - Z0 - 2 * HOUSE.bevel;
		const house = new ExtrudeGeometry(shape, {
			depth,
			bevelEnabled: true,
			bevelThickness: HOUSE.bevel,
			bevelSize: HOUSE.bevel * .8,
			bevelSegments: 2,
			curveSegments: 1
		}).translate(0, 0, Z0 + HOUSE.bevel);
		parts.push([house, 3]);
		this.staticMat = shaderMaterial({
			vertex: STATIC_VERT,
			fragment: STATIC_FRAG,
			uniforms: uniforms()
		});
		this.rest = new Mesh(merge(parts), this.staticMat);
		this.rest.frustumCulled = false;
		this.scene.add(this.rest, this.disks);
	}
	/**
	* Per frame. pitch: world units per dot; origin: the world point of the glyph area's centre; angle(k, dt): disk k's
	* angle dt seconds from now (flipdot.js diskAngle); lit(k): [r, g, b, emission] of its lit face; glow: all emission
	* × this; light: the raking light × this (0: the panel is dark, only lit faces show); sheen: the black faces' grazing
	* sheen; shutter: seconds the disks' shading is averaged over.
	*/
	update({ pitch, origin = [
		0,
		0,
		0
	], angle, lit, glow = 1, light = 1, sheen = .02, shutter = 1 / 120 }) {
		const N = this.L.disks.length;
		for (let k = 0; k < N; k++) {
			this.phi0[k] = angle(k, 0);
			for (let s = 0; s < 4; s++) this.phi[k * 4 + s] = angle(k, ((s + .5) / 4 - .5) * shutter);
			this.lit.set(lit(k), k * 4);
		}
		this.aPhi0.needsUpdate = this.aPhi.needsUpdate = this.aLit.needsUpdate = true;
		for (const m of [this.diskMat, this.staticMat]) {
			const u = m.uniforms;
			u.uPitch.value = pitch;
			u.uOrigin.value.set(...origin);
			u.uLight.value = light;
			u.uSheen.value = sheen;
		}
		this.diskMat.uniforms.uGlow.value = glow;
		return this;
	}
};
//#endregion
export { FlipPanel };
