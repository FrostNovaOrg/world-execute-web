import { rng } from "../../engine/math.js?v=BJIlRm7-";
import { Vector3 } from "../../../vendor/three/build/three.core.js?v=q9f7JKE-";
//#region src/ch/title/card.js
/** The card's characters in the typed line's syntax-colour groups (title/code.js TOKENS); spaces in none. */
var CARD_TOKENS = [
	["world", "white"],
	[".", "dim"],
	["execute", "blue"],
	[" ", null],
	["(", "dim"],
	["me", "cyan"],
	[")", "dim"],
	[" ", null],
	[";", "dim"]
];
var CARD_GROUPS = [
	"white",
	"dim",
	"blue",
	"cyan"
];
/**
* The card's ink in design pixels (1920 × 1080): per group, the centres of the filled pixels of the line set in
* JetBrains Mono of the given weight, `em` px per em, centred on x = cx with its baseline at y = base.
*/
function cardInk({ em = 104, cx = 960, base = 380, weight = 600 } = {}) {
	const c = document.createElement("canvas"), g = c.getContext("2d");
	const adv = .6 * em, W = Math.ceil(adv * 20 + em), H = Math.ceil(em * 1.6), b0 = Math.round(em * 1.15), x0 = em * .5;
	c.width = W;
	c.height = H;
	g.font = `${weight} ${em}px "JetBrains Mono"`;
	g.fillStyle = "#fff";
	g.textBaseline = "alphabetic";
	const out = Object.fromEntries(CARD_GROUPS.map((k) => [k, []])), left = cx - adv * 20 / 2;
	let i = 0;
	for (const [s, grp] of CARD_TOKENS) {
		if (grp) {
			g.clearRect(0, 0, W, H);
			g.fillText(s, x0 + i * adv, b0);
			const d = g.getImageData(0, 0, W, H).data;
			for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (d[(y * W + x) * 4 + 3] > 127) out[grp].push([left + x + .5 - x0, base + y + .5 - b0]);
		}
		i += s.length;
	}
	return out;
}
/**
* One group's stars as a swarm shape (N × xyzw): `perPx` stars per inked pixel, each on the camera's ray through its
* point of the ink, at a depth between `near` and 1 times the ray's distance to the disc plane (y = 0), more of them
* near the disc; w: a random per star. The rest of the N slots are parked far beyond any far plane.
* plane: the same stars (same seed, same rays) all in the plane square to the camera at that distance instead, a sign
* that faces it (cardPlanePoint gives any point of that plane). drop (with plane): each of them moved down the camera's
* own vertical within that plane by up to that far (a quarter of it at least), straight below its place on screen.
* ground: the same stars on the level plane y = ground instead, lying like the galaxy's disc (cardGroundPoint).
*/
function cardStars(N, ink, cam, { perPx = .45, near = .3, seed = 11, plane = null, drop = 0, ground = null } = {}) {
	const r = rng(seed), rd = rng(seed + 1e3), out = new Float32Array(N * 4), pos = cam.position, v = new Vector3(), fwd = cam.getWorldDirection(new Vector3());
	const up = new Vector3().setFromMatrixColumn(cam.matrixWorld, 1);
	const n = Math.min(N, Math.round(ink.length * perPx));
	for (let k = 0; k < n; k++) {
		const p = ink[Math.floor(r() * ink.length)], sx = p[0] + r() - .5, sy = p[1] + r() - .5;
		v.set(sx / 960 - 1, 1 - sy / 540, .5).unproject(cam).sub(pos).normalize();
		const depth = near + (1 - near) * Math.sqrt(r()), d = ground != null ? (ground - pos.y) / v.y : plane != null ? plane / v.dot(fwd) : -pos.y / v.y * depth;
		const dy = plane != null && drop ? -drop * (.25 + .75 * rd()) : 0;
		out.set([
			pos.x + v.x * d + up.x * dy,
			pos.y + v.y * d + up.y * dy,
			pos.z + v.z * d + up.z * dy,
			r()
		], k * 4);
	}
	for (let k = n; k < N; k++) out.set([
		0,
		0,
		-1e6,
		9
	], k * 4);
	return out;
}
/**
* (the eighth round, docs/REMAKE.md §12.15) The push from above, bars 2–4 in one move: how far the camera has come
* towards the card's sign, as a fraction of the way to it (u = 0..1 over the three bars). It sets off from rest on the
* cut and never slows: about a tenth of the sign's size by the end of bar 3, while the credits come in, and then ever
* faster, so the sign, whose size on screen is 1 / (1 − f), grows without bound and the camera passes through it on
* the flight's downbeat. (It replaces a slow push over bars 2–3 that came to rest at the end of bar 3, and a
* fly-through that set off again on bar 4: the director saw the turn slow down halfway and then the zoom begin.)
*/
var titlePush = (u) => .1 * u * u + .9 * u ** 6.5;
/** The point of the level plane y = h that `cam` sees at design pixel (x, y). */
function cardGroundPoint(cam, x, y, h) {
	const v = new Vector3(x / 960 - 1, 1 - y / 540, .5).unproject(cam).sub(cam.position).normalize();
	const d = (h - cam.position.y) / v.y;
	return [
		cam.position.x + v.x * d,
		h,
		cam.position.z + v.z * d
	];
}
//#endregion
export { CARD_GROUPS, cardGroundPoint, cardInk, cardStars, titlePush };
