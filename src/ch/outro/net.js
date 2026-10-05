import { clamp } from "../../engine/math.js?v=BJIlRm7-";
import { Color, Group, Matrix4, Mesh, PlaneGeometry, Vector3 } from "../../../vendor/three/build/three.core.js?v=q9f7JKE-";
import { shaderMaterial } from "../../engine/gpu.js?v=o4BYX3o1";
import { dofSegment, mul } from "../intro/kit.js?v=rUxrOt9G";
import { SB } from "../intro/sandbox.js?v=BIdF2cjI";
//#region src/ch/outro/net.js
var VERT = `
out vec2 vL; out vec3 vW; out vec3 vN;
void main() {
  vL = position.xy; vec4 w = modelMatrix * vec4(position, 1.); vW = w.xyz; vN = normalize(mat3(modelMatrix) * vec3(0., 0., 1.));
  gl_Position = projectionMatrix * viewMatrix * w;
}`;
var FRAG = `
uniform vec3 uCol; uniform float uIntensity, uCell, uGone, uH, uFres;
in vec2 vL; in vec3 vW; in vec3 vN; out vec4 o;
float hexD(vec2 p) { p = abs(p); return max(dot(p, vec2(.5, .8660254)), p.x); }
void main() {
  // the intro's hexagonal lattice (flat-to-flat = uCell), in the face's own coordinates (u along the hinge, v up)
  vec2 q = vL / uCell; const vec2 r = vec2(1., 1.7320508);
  vec2 a = mod(q, r) - r * .5, b = mod(q - r * .5, r) - r * .5, g = dot(a, a) < dot(b, b) ? a : b;
  vec2 cell = floor((q - g) * 2. + .5);
  float e = .5 - hexD(g), fw = fwidth(e);
  float line = 1. - smoothstep(0., fw * 1.25, e);
  line *= 1. - smoothstep(.1, .3, max(fwidth(q.x), fwidth(q.y)));
  // cells go out one by one, the far ones (large v) first; a cell glints as it goes
  float key = .62 * hash12(cell) + .38 * (1. - clamp(vL.y / uH, 0., 1.)), d = key - uGone;
  float alive = smoothstep(0., .04, d), glint = exp(-d * d / .0012) * step(.001, uGone);
  vec3 V = normalize(cameraPosition - vW);
  float fres = pow(1. - abs(dot(V, vN)), 2.);
  float k = line * (.35 + uFres * fres) * (alive + 3. * glint);
  o = vec4(uCol * uIntensity * k, 1.);
}`;
function faceMesh(w, h, cell) {
	const g = new PlaneGeometry(w, h);
	g.translate(0, h / 2, 0);
	const m = new Mesh(g, shaderMaterial({
		vertex: VERT,
		fragment: FRAG,
		transparent: true,
		depthWrite: false,
		depthTest: true,
		blending: 2,
		side: 2,
		uniforms: {
			uCol: { value: new Color(.8, .85, .95) },
			uIntensity: { value: 1 },
			uCell: { value: cell },
			uGone: { value: 0 },
			uH: { value: h },
			uFres: { value: 1 }
		}
	}));
	m.matrixAutoUpdate = false;
	m.frustumCulled = false;
	return m;
}
/** The four walls (outward normal n, hinge direction h) in the order front, right, back, left. */
var WALLS = [
	{
		n: [
			0,
			0,
			1
		],
		h: [
			1,
			0,
			0
		]
	},
	{
		n: [
			1,
			0,
			0
		],
		h: [
			0,
			0,
			-1
		]
	},
	{
		n: [
			0,
			0,
			-1
		],
		h: [
			-1,
			0,
			0
		]
	},
	{
		n: [
			-1,
			0,
			0
		],
		h: [
			0,
			0,
			1
		]
	}
];
/** Build the net: 4 wall meshes + the lid, all in a Group. */
function netMeshes({ S = SB.S, H = SB.H, cell = .24 } = {}) {
	const group = new Group();
	const walls = WALLS.map(() => faceMesh(2 * S, H, cell)), lid = faceMesh(2 * S, 2 * S, cell);
	lid.material.uniforms.uH.value = 2 * S;
	group.add(...walls, lid);
	return {
		group,
		walls,
		lid,
		S,
		H
	};
}
/**
* Pose of wall i at opening angle a (0 = standing, π/2 = flat, outward): its four corners (bottom-left, bottom-right,
* top-right, top-left) and the basis (h, v, n') of its plane.
*/
function wallPose(i, a, S = SB.S, H = SB.H) {
	const { n, h } = WALLS[i], v = [
		n[0] * Math.sin(a),
		Math.cos(a),
		n[2] * Math.sin(a)
	];
	const nn = [
		n[0] * Math.cos(a),
		-Math.sin(a),
		n[2] * Math.cos(a)
	];
	const c = [
		n[0] * S,
		0,
		n[2] * S
	], P = (u, w) => [
		c[0] + h[0] * u + v[0] * w,
		c[1] + h[1] * u + v[1] * w,
		c[2] + h[2] * u + v[2] * w
	];
	return {
		corners: [
			P(-S, 0),
			P(S, 0),
			P(S, H),
			P(-S, H)
		],
		c,
		h,
		v,
		n: nn
	};
}
/** The lid: the top square lifted by dy (its corners). */
var lidCorners = (dy, S = SB.S, H = SB.H) => [
	[
		-S,
		H + dy,
		S
	],
	[
		S,
		H + dy,
		S
	],
	[
		S,
		H + dy,
		-S
	],
	[
		-S,
		H + dy,
		-S
	]
];
var m4 = new Matrix4();
var vx = new Vector3();
var vy = new Vector3();
var vz = new Vector3();
/**
* Per frame. st: { open: [a0..a3] (radians), lid: lift (world units), lidGone, gone: [g0..g3] (cells out 0..1),
* intensity, color }.
*/
function setNet(net, st) {
	net.walls.forEach((m, i) => {
		const p = wallPose(i, st.open[i], net.S, net.H);
		m4.makeBasis(vx.set(...p.h), vy.set(...p.v), vz.set(...p.n)).setPosition(...p.c);
		m.matrix.copy(m4);
		m.matrixWorldNeedsUpdate = true;
		const u = m.material.uniforms;
		u.uGone.value = st.gone[i];
		u.uIntensity.value = st.intensity;
		u.uCol.value.setRGB(...st.color);
		m.visible = st.intensity > 0 && st.gone[i] < 1.02;
	});
	m4.makeBasis(vx.set(1, 0, 0), vy.set(0, 0, -1), vz.set(0, 1, 0)).setPosition(0, net.H + st.lid, net.S);
	net.lid.matrix.copy(m4);
	net.lid.matrixWorldNeedsUpdate = true;
	const u = net.lid.material.uniforms;
	u.uGone.value = st.lidGone;
	u.uIntensity.value = st.intensity;
	u.uCol.value.setRGB(...st.color);
	net.lid.visible = st.intensity > 0 && st.lidGone < 1.02;
}
/**
* The edges of the net as glow lines: every face draws its own border at half strength, so where two faces meet
* (the closed box) the edge adds up to the full box edge of the intro. The base square is drawn once more (with the
* wall hinges it makes a full edge). o: color, width, dof, fade: [f0..f3] per wall, lidFade, base.
*/
function drawNetEdges(L, st, o = {}) {
	const col = o.color ?? [
		1,
		1,
		1
	], w = o.width ?? 2.6, dof = o.dof;
	const quad = (cs, k) => {
		if (k <= .002) return;
		for (let j = 0; j < 4; j++) dofSegment(L, cs[j], cs[(j + 1) % 4], {
			color: mul(col, .5 * k),
			width: w
		}, dof);
	};
	for (let i = 0; i < 4; i++) quad(wallPose(i, st.open[i]).corners, clamp(o.fade?.[i] ?? 1));
	quad(lidCorners(st.lid), clamp(o.lidFade ?? 1));
	const S = SB.S;
	quad([
		[
			-S,
			0,
			-S
		],
		[
			S,
			0,
			-S
		],
		[
			S,
			0,
			S
		],
		[
			-S,
			0,
			S
		]
	], o.base ?? 1);
}
//#endregion
export { WALLS, drawNetEdges, lidCorners, netMeshes, setNet, wallPose };
