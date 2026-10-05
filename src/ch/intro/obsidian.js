import { rng } from "../../engine/math.js?v=BJIlRm7-";
import { BufferGeometry, CanvasTexture, Float32BufferAttribute, LinearFilter, LinearMipmapLinearFilter, Matrix3, Matrix4, Mesh, Vector3, Vector4 } from "../../../vendor/three/build/three.core.js?v=q9f7JKE-";
import { shaderMaterial } from "../../engine/gpu.js?v=o4BYX3o1";
//#region src/ch/intro/obsidian.js
/**
* A solid's faces as triangles (a fan from each face's centre, so every triangle has one polygon edge, and the
* distance to it is linear across the triangle). Attributes: position, normal (flat), aE = (distance to the polygon's
* edge, face-plane u, v) in the unit solid's units, aF = face index.
*/
function pieceGeometry(solid) {
	const pos = [], nrm = [], ae = [], af = [];
	solid.faces.forEach((f, fi) => {
		const V = f.v.map((q) => new Vector3(...solid.V[q])), c = new Vector3(...f.c), n = new Vector3(...f.n);
		const e1 = V[0].clone().sub(c).normalize(), e2 = new Vector3().crossVectors(n, e1);
		const ap = V[0].clone().add(V[1]).multiplyScalar(.5).distanceTo(c);
		const uv = (p) => {
			const d = p.clone().sub(c);
			return [d.dot(e1), d.dot(e2)];
		};
		for (let i = 0; i < V.length; i++) {
			const a = V[i], b = V[(i + 1) % V.length];
			for (const [p, e] of [
				[c, ap],
				[a, 0],
				[b, 0]
			]) {
				pos.push(p.x, p.y, p.z);
				nrm.push(n.x, n.y, n.z);
				ae.push(e, ...uv(p));
				af.push(fi);
			}
		}
	});
	const g = new BufferGeometry();
	g.setAttribute("position", new Float32BufferAttribute(pos, 3));
	g.setAttribute("normal", new Float32BufferAttribute(nrm, 3));
	g.setAttribute("aE", new Float32BufferAttribute(ae, 3));
	g.setAttribute("aF", new Float32BufferAttribute(af, 1));
	return g;
}
var VERT = `
in vec3 aE; in float aF;
uniform float uScale;
out vec3 vW; out vec3 vN; out float vEdge; out vec2 vUV; flat out float vFace;
void main() {
  vec4 w = modelMatrix * vec4(position, 1.);
  vW = w.xyz; vN = normalize(mat3(modelMatrix) * normal);
  vEdge = aE.x * uScale; vUV = aE.yz * uScale; vFace = aF;
  gl_Position = projectionMatrix * viewMatrix * w;
}`;
var FRAG = `
uniform vec3 uTint, uKey, uRim, uEnvHex, uEnvTrace, uEnvRing;
uniform float uAlbedo, uKeyI, uAmb, uEnvI, uAlpha, uBevel, uGlow, uDis, uCell, uSeed, uFlash;
uniform vec4 uBox;      // sandbox: half size, height, hex lattice (walls and lid), lit edges
uniform vec4 uPanel;    // the light above: centre x, z, half width, half depth
uniform vec3 uPanelY;   // its height, its brightness, the brightness of the floor (dots and traces)
uniform float uHexCell;
uniform sampler2D uTraces; uniform float uTraceR;    // the power traces seen from above, over [-uTraceR, uTraceR]²
uniform vec4 uRing[6], uRingW[6];                    // the impacts' fronts on the floor (x, z, radius, crest; width)
in vec3 vW; in vec3 vN; in float vEdge; in vec2 vUV; flat in float vFace; out vec4 o;

float hexLines(vec2 uv) {
  vec2 q = uv / uHexCell; const vec2 r = vec2(1., 1.7320508);
  vec2 a = mod(q, r) - r * .5, b = mod(q - r * .5, r) - r * .5, g = dot(a, a) < dot(b, b) ? a : b;
  vec2 p = abs(g); float e = .5 - max(dot(p, vec2(.5, .8660254)), p.x), fw = fwidth(e);
  float dens = max(fwidth(q.x), fwidth(q.y));
  return (1. - smoothstep(0., fw * 1.25, e)) * (1. - smoothstep(.1, .3, dens));
}
// What a ray from P (inside the sandbox) along R meets: the walls' lattice and lit edges, the lid, the light above,
// the floor's traces and dots and the rings running over it.
vec3 env(vec3 P, vec3 R) {
  // (every derivative is taken outside the branches: they are undefined where a 2×2 pixel quad diverges)
  vec3 lo = vec3(-uBox.x, 0., -uBox.x), hi = vec3(uBox.x, uBox.y, uBox.x);
  vec3 Rs = vec3(abs(R.x) < 1e-5 ? 1e-5 : R.x, abs(R.y) < 1e-5 ? 1e-5 : R.y, abs(R.z) < 1e-5 ? 1e-5 : R.z);
  vec3 tv = (mix(lo, hi, step(0., Rs)) - P) / Rs;
  float t = max(min(tv.x, min(tv.y, tv.z)), 0.);
  vec3 H = P + R * t;
  bool wx = tv.x <= min(tv.y, tv.z), wz = !wx && tv.z <= tv.y, floorHit = !wx && !wz && R.y < 0.;
  vec2 uv = wx ? H.zy : (wz ? H.xy : H.xz);
  vec3 dl = min(abs(H - lo), abs(hi - H));
  float ed = wx ? min(dl.y, dl.z) : (wz ? min(dl.x, dl.y) : min(dl.x, dl.z));
  float fe = fwidth(ed) + 1e-4, hex = hexLines(uv);
  float c = (1. - smoothstep(.008, .008 + fe * 1.5, ed)) * uBox.w;                 // the box's lit edges
  // the floor: the traces, the via dots, the rings running over it
  vec2 f = H.xz, g = (fract(f / .1 + .5) - .5) * .1;
  float fd = fwidth(f.x) * 1.2 + 1e-4;
  float tr = texture(uTraces, f / (2. * uTraceR) + .5).r, dots = (1. - smoothstep(.004, .004 + fd, length(g))) * .5;
  float rings = 0.;
  for (int j = 0; j < 6; j++) {
    float u = (distance(f, uRing[j].xy) - uRing[j].z) / max(uRingW[j].x, 1e-3);
    rings += exp(-u * u) * max(uRing[j].w, 0.) * 40.;
  }
  rings *= step(max(abs(f.x), abs(f.y)), uBox.x);
  vec3 col = vec3(c) + (floorHit ? (tr * uEnvTrace + dots) * uPanelY.z + rings * uEnvRing : hex * uBox.z * uEnvHex);
  // the light above (a panel under the lid): a hard rectangle in the glass
  vec3 Q = P + R * ((uPanelY.x - P.y) / Rs.y);
  vec2 d = abs(Q.xz - uPanel.xy) - uPanel.zw;
  float fw = fwidth(Q.x) + fwidth(Q.z) + 1e-4;
  col += R.y > 0. ? (1. - smoothstep(0., fw * 1.5, max(d.x, d.y))) * uPanelY.y : 0.;
  return col;
}
void main() {
  vec3 N = normalize(vN) * (gl_FrontFacing ? 1. : -1.), V = normalize(cameraPosition - vW);
  float ndv = clamp(dot(N, V), 0., 1.), F = .04 + .96 * pow(1. - ndv, 5.);
  float ndl = max(dot(N, uKey), 0.);
  vec3 c = uTint * (uAlbedo * (uAmb + uKeyI * ndl) + F * env(vW, reflect(-V, N)) * uEnvI);
  // the bevel: a fine line along the edges that catches the light (the glow lines carry the edge itself), in the rim's colour
  float fe = fwidth(vEdge) + 1e-5;
  float rim = (1. - smoothstep(uBevel, uBevel + fe * 1.5, vEdge)) * uGlow * (.35 + .65 * ndl);
  c *= 1. + uFlash; rim *= 1. + uFlash;
  // decompile: the face breaks into glyph cells that light up (in the rim's colour) and go out
  if (uDis > 0.) {
    vec2 cell = floor(vUV / uCell);
    float r = hash12(cell * 1.37 + vFace * 17.31 + uSeed);
    if (r < uDis) discard;
    rim += smoothstep(.12, 0., r - uDis) * 1.6;
  }
  if (!gl_FrontFacing) { c *= .3; rim *= .3; }         // the inside, seen through a decompiling face
  o = vec4(c + uRim * rim, uAlpha);
}`;
/** The traces of the power network (intro/trace.js buildNetwork) as a texture seen from above, for the reflections. */
function tracesTexture(net, R = 1.6, px = 1024) {
	const cv = document.createElement("canvas");
	cv.width = cv.height = px;
	const g = cv.getContext("2d"), k = px / (2 * R), X = (x) => (x + R) * k;
	g.fillStyle = "#000";
	g.fillRect(0, 0, px, px);
	g.strokeStyle = "#fff";
	g.fillStyle = "#fff";
	g.lineCap = "round";
	g.lineJoin = "round";
	for (const l of net.lanes) {
		g.lineWidth = (l.main ? .012 : .007) * k;
		g.globalAlpha = l.main ? 1 : .7;
		g.beginPath();
		l.pts.forEach((p, i) => i ? g.lineTo(X(p[0]), X(p[2])) : g.moveTo(X(p[0]), X(p[2])));
		g.stroke();
	}
	g.globalAlpha = 1;
	for (const v of net.vias ?? []) {
		g.beginPath();
		g.arc(X(v.p[0]), X(v.p[2]), (v.r ?? .03) * k, 0, Math.PI * 2);
		g.lineWidth = .006 * k;
		g.stroke();
	}
	const tex = new CanvasTexture(cv);
	Object.assign(tex, {
		flipY: false,
		colorSpace: "",
		generateMipmaps: true,
		minFilter: LinearMipmapLinearFilter,
		magFilter: LinearFilter,
		anisotropy: 4
	});
	return tex;
}
/** The black-glass material (one per piece: each carries its own flash and decompile state). */
function obsidianMaterial({ traces = null, traceR = 1.6 } = {}) {
	const v4 = () => new Vector4();
	return shaderMaterial({
		vertex: VERT,
		fragment: FRAG,
		transparent: true,
		depthWrite: true,
		depthTest: true,
		side: 2,
		polygonOffset: true,
		polygonOffsetFactor: 1.5,
		polygonOffsetUnits: 2,
		uniforms: {
			uScale: { value: 1 },
			uTint: { value: new Vector3(.86, .9, 1) },
			uKey: { value: new Vector3(-.7, 1, .3).normalize() },
			uRim: { value: new Vector3(.86, .9, 1) },
			uEnvHex: { value: new Vector3(1, 1, 1) },
			uEnvTrace: { value: new Vector3(1, 1, 1) },
			uEnvRing: { value: new Vector3(1, 1, 1) },
			uAlbedo: { value: .02 },
			uKeyI: { value: 2.6 },
			uAmb: { value: .08 },
			uEnvI: { value: 1 },
			uAlpha: { value: 1 },
			uBevel: { value: .0016 },
			uGlow: { value: .25 },
			uDis: { value: 0 },
			uCell: { value: .032 },
			uSeed: { value: 0 },
			uFlash: { value: 0 },
			uBox: { value: new Vector4(1.5, 3, .3, 1.2) },
			uPanel: { value: new Vector4(0, -.8, 1.4, .6) },
			uPanelY: { value: new Vector3(2.9, 6, .5) },
			uHexCell: { value: .24 },
			uTraces: { value: traces },
			uTraceR: { value: traceR },
			uRing: { value: [
				0,
				1,
				2,
				3,
				4,
				5
			].map(v4) },
			uRingW: { value: [
				0,
				1,
				2,
				3,
				4,
				5
			].map(v4) }
		}
	});
}
/**
* The pieces: one mesh per placement ({ solid, M } as built by the chapter from solids.js restMatrix), hidden until
* posed. Their matrices are set per frame (pose), so they are not auto-updated.
*/
function makePieces(place, opts) {
	return place.map((p) => {
		const m = new Mesh(pieceGeometry(p.solid), obsidianMaterial(opts));
		m.matrixAutoUpdate = false;
		m.frustumCulled = false;
		m.visible = false;
		m.renderOrder = -10;
		m.material.uniforms.uScale.value = new Vector3().setFromMatrixScale(p.M).x;
		return m;
	});
}
var _T = new Matrix4();
var _R = new Matrix4();
var _P = new Matrix4();
var _Q = new Matrix4();
var _v = new Vector3();
/**
* A piece's pose: its rest matrix M lifted by dy, turned by `spin` about the vertical through its centre and tipped by
* `tip` about the horizontal x axis (the tremble). Returns { F (Matrix4, unit solid → world), P (world vertices) }.
*/
function posePiece(place, { dy = 0, spin = 0, tip = 0 } = {}) {
	const piv = _v.setFromMatrixPosition(place.M);
	_R.makeRotationY(spin).multiply(_Q.makeRotationX(tip));
	_P.makeTranslation(piv.x, piv.y, piv.z).multiply(_R).multiply(_Q.makeTranslation(-piv.x, -piv.y, -piv.z));
	const F = new Matrix4().multiplyMatrices(_T.makeTranslation(0, dy, 0), _P).multiply(place.M);
	return {
		F,
		P: place.solid.V.map((v) => new Vector3(...v).applyMatrix4(F).toArray())
	};
}
/** Put a mesh in a pose and set its look for this frame. u: uniforms to set ({ name: value }; arrays and vectors copied). */
function showPiece(mesh, F, u = {}) {
	mesh.visible = true;
	mesh.matrix.copy(F);
	mesh.matrixWorldNeedsUpdate = true;
	const U = mesh.material.uniforms;
	for (const [k, v] of Object.entries(u)) {
		const name = "u" + k[0].toUpperCase() + k.slice(1), dst = U[name];
		if (!dst) throw new Error(`obsidian: no uniform ${name}`);
		if (dst.value?.isVector3 || dst.value?.isVector4) dst.value.fromArray(v);
		else if (Array.isArray(dst.value)) dst.value.forEach((d, i) => d.fromArray(v[i] ?? [
			0,
			0,
			0,
			0
		]));
		else dst.value = v;
	}
}
/**
* n points on the faces of the placed solids (area-weighted, at rest), lifted off the surface by `lift` along the
* face normal: where the characters of OBJECT CREATION start from. w = which solid (0..1), as edgeCloud.
*/
function faceCloud(n, placements, { lift = .006, seed = 73 } = {}) {
	const r = rng(seed), tris = [];
	let total = 0;
	placements.forEach(({ solid, M }, si) => {
		const nm = new Matrix3().getNormalMatrix(M);
		for (const f of solid.faces) {
			const c = new Vector3(...f.c).applyMatrix4(M), N = new Vector3(...f.n).applyMatrix3(nm).normalize();
			const V = f.v.map((q) => new Vector3(...solid.V[q]).applyMatrix4(M));
			for (let i = 0; i < V.length; i++) {
				const a = V[i], b = V[(i + 1) % V.length], area = new Vector3().crossVectors(a.clone().sub(c), b.clone().sub(c)).length() / 2;
				tris.push({
					c,
					a,
					b,
					N,
					acc: total,
					area,
					w: (si + .5) / placements.length
				});
				total += area;
			}
		}
	});
	const out = new Float32Array(n * 4);
	let s = 0;
	for (let i = 0; i < n; i++) {
		const d = (i + r()) / n * total;
		while (s < tris.length - 1 && tris[s].acc + tris[s].area < d) s++;
		const T = tris[s];
		let u = r(), v = r();
		if (u + v > 1) {
			u = 1 - u;
			v = 1 - v;
		}
		const p = T.c.clone().addScaledVector(T.a.clone().sub(T.c), u).addScaledVector(T.b.clone().sub(T.c), v).addScaledVector(T.N, lift);
		out.set([
			p.x,
			p.y,
			p.z,
			T.w
		], i * 4);
	}
	return out;
}
//#endregion
export { faceCloud, makePieces, obsidianMaterial, pieceGeometry, posePiece, showPiece, tracesTexture };
