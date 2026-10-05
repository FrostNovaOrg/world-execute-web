import { Matrix4, Vector3 } from "../../../vendor/three/build/three.core.js?v=q9f7JKE-";
import { GlyphField, source } from "../../lib/glyphs.js?v=DWbHICXG";
import { basis } from "./lattice.js?v=DpybgBeN";
//#region src/ch/title/beams.js
/** The z-beams around the tunnel (x, y of each; the lattice puts one at every cell corner, (±2 + 4i, ±2 + 4j)). */
var BEAMS = [];
for (const x of [
	2,
	-2,
	6,
	-6,
	10,
	-10
]) for (const y of [
	2,
	-2,
	6,
	-6
]) BEAMS.push([x, y]);
var GLYPH = .26;
var PITCH = GLYPH * .72 * .6;
/** A cool syntax palette for the blue lattice (plain, comment, string, number, keyword, punctuation). */
var BEAM_SYNTAX = [
	[
		.5,
		.72,
		1
	],
	[
		.12,
		.2,
		.4
	],
	[
		.72,
		.92,
		1
	],
	[
		.82,
		.96,
		1
	],
	[
		.45,
		.95,
		1
	],
	[
		.28,
		.42,
		.8
	]
];
/**
* Layout: each beam carries a contiguous run of the text, read along −z (left to right in the side view), spaces
* kept (one advance) and line breaks as a three-advance gap. w = (z − Z0) / (Z1 − Z0) (for a depth cut with reveal).
*/
function beamLayout(field) {
	return (N) => {
		const out = new Float32Array(N * 4), grid = field._grid ?? [], n = field.count, per = Math.ceil(n / BEAMS.length);
		for (let i = 0; i < N; i++) out.set([
			0,
			0,
			-1e5,
			1
		], i * 4);
		for (let b = 0; b < BEAMS.length; b++) {
			let k = 0;
			for (let i = b * per; i < Math.min(n, (b + 1) * per); i++) {
				if (i > b * per) k += grid[i][1] === grid[i - 1][1] ? grid[i][0] - grid[i - 1][0] : 3;
				const z = 118 - k * PITCH;
				if (z < -12) break;
				out.set([
					BEAMS[b][0],
					BEAMS[b][1],
					z,
					(z - -12) / 130
				], i * 4);
			}
		}
		return out;
	};
}
/** The glyph field: the flight's own source (lattice + title chapter) along the beams. */
function beamField() {
	const gf = new GlyphField({ count: 65536 });
	gf.text("title/beams-src", source("ch/title/lattice.js") + "\n" + source("ch/02_title.js") + "\n" + source("ch/title/code.js"));
	return {
		gf,
		tex: gf.layout("title/beams", beamLayout(gf))
	};
}
/**
* Point a three.js camera exactly like the ray-marched flight camera of a setup: eye = ro + sway + (0, 0, z), basis
* from yaw / pitch, and the screen rotated by `roll` the way the shader rotates its uv (rot2(roll) · uv).
* The shader's basis is left-handed (right = up × forward), so its image is the mirror of a three.js camera's: the
* camera is built right-handed (right = −r) and its projection mirrors x back.
*/
function latticeCamera(cam, st, { yaw = 0, pitch = 0, roll = 0, ro = [
	0,
	0,
	0
], sway = 1 } = {}, aspect = 16 / 9) {
	const e = basis(yaw, pitch).elements;
	const r = new Vector3(e[0], e[1], e[2]), u = new Vector3(e[3], e[4], e[5]), f = new Vector3(e[6], e[7], e[8]);
	const c = Math.cos(roll), s = Math.sin(roll);
	const X = r.clone().multiplyScalar(-c).addScaledVector(u, s), Y = r.clone().multiplyScalar(s).addScaledVector(u, c);
	cam.position.set(ro[0] + sway * .25 * Math.sin(st.lt * .7), ro[1] + sway * .2 * Math.cos(st.lt * .5), ro[2] + st.z);
	cam.quaternion.setFromRotationMatrix(new Matrix4().makeBasis(X, Y, f.clone().negate()));
	Object.assign(cam, {
		fov: 64,
		aspect,
		near: .05,
		far: 300
	});
	cam.updateProjectionMatrix();
	cam.updateMatrixWorld();
	cam.projectionMatrix.elements[0] *= -1;
	cam.projectionMatrixInverse.copy(cam.projectionMatrix).invert();
	return cam;
}
//#endregion
export { BEAMS, BEAM_SYNTAX, GLYPH, beamField, beamLayout, latticeCamera };
