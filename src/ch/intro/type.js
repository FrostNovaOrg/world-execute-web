import { clamp, hash2 } from "../../engine/math.js?v=BJIlRm7-";
import { HEX } from "../../theme.js?v=Bj33PIbo";
import { toDesign } from "../../lib/hud.js?v=BgmSZjmG";
//#region src/ch/intro/type.js
var GLYPHS = "01<>/\\[]{}()=+*#%&$@!?;:ABCDEFGHIJKLMNOPQRSTUVWXYZ";
/** Decode a word the way heroWord does (random glyphs locking left to right), for words written onto objects. */
function decodeStr(word, t0, t, decode = .45) {
	if (t < t0) return "";
	const f = Math.floor(t * 30), n = word.length;
	let s = "";
	for (let i = 0; i < n; i++) {
		if (word[i] === " ") {
			s += " ";
			continue;
		}
		if (t >= t0 + decode * (i + 1) / n) s += word[i];
		else if (t >= t0 + decode * i / n * .5) s += GLYPHS[Math.floor(hash2(i, f) * 50)];
		else s += " ";
	}
	return s;
}
/**
* Text mapped onto a projected rectangle (top-left, top-right, bottom-left in design px) with an affine transform:
* a label printed on a face of an object. o: size (the text's own px), color, glow, glowColor, alpha, tracking,
* weight, font, full (the string whose width spans the face; defaults to str).
*/
function faceText(L, str, [p0, p1, p3], o = {}) {
	if (!str) return;
	const size = o.size ?? 100, style = {
		size,
		weight: o.weight ?? 800,
		font: o.font ?? "JetBrains Mono",
		tracking: o.tracking ?? size * .2
	};
	const W = L.measure(o.full ?? str, style), Hh = size;
	L.draw((g, s) => {
		g.globalAlpha *= clamp(o.alpha ?? 1);
		g.transform((p1[0] - p0[0]) / W, (p1[1] - p0[1]) / W, (p3[0] - p0[0]) / Hh, (p3[1] - p0[1]) / Hh, p0[0], p0[1]);
		g.font = L.font(style);
		if ("letterSpacing" in g) g.letterSpacing = `${style.tracking}px`;
		g.textAlign = "left";
		g.textBaseline = "middle";
		if (o.glow) {
			g.shadowColor = o.glowColor ?? o.color;
			g.shadowBlur = o.glow * s * Math.hypot(p1[0] - p0[0], p1[1] - p0[1]) / W;
		}
		g.fillStyle = o.color ?? HEX.white;
		g.fillText(str, 0, Hh / 2);
	});
}
/** A decoded word set along a circular arc (letters upright to the arc), centred on angle a0 (radians, screen). */
function arcText(L, str, cx, cy, R, a0, o = {}) {
	const size = o.size ?? 60, da = (size * .6 + (o.tracking ?? size * .25)) / R, n = str.length;
	for (let i = 0; i < n; i++) {
		if (str[i] === " ") continue;
		const a = a0 + (i - (n - 1) / 2) * da;
		L.text(str[i], cx + Math.cos(a) * R, cy + Math.sin(a) * R, {
			size,
			weight: 800,
			font: "JetBrains Mono",
			color: o.color ?? HEX.white,
			glow: o.glow ?? 18,
			glowColor: o.glowColor ?? HEX.me,
			rot: a + Math.PI / 2,
			alpha: o.alpha ?? 1
		});
	}
}
/**
* Monospace text printed on a world-space plane: the string starts at `origin` (left edge, vertical middle of the
* em), runs along the unit vector `u` and has "up" along `v` (both in world units per em, i.e. already scaled by the
* em size). The three corners are projected through `cam` and the text is mapped affinely (exact for planes seen
* frontally, a close approximation for small labels at an angle). o: as faceText (size = raster px, default 64).
* Returns false when the label is behind the camera.
*/
function planeText(L, str, origin, u, v, cam, o = {}) {
	if (!str) return false;
	const n = str.length, adv = .6 + (o.trackingEm ?? 0);
	const at = (x, y) => [
		0,
		1,
		2
	].map((j) => origin[j] + u[j] * x + v[j] * y);
	const q = [
		at(0, .5),
		at(n * adv, .5),
		at(0, -.5)
	].map((p) => toDesign(p, cam));
	if (q.some((p) => p[2] >= 1 || p[2] <= -1)) return false;
	const size = o.size ?? 64;
	faceText(L, str, q, {
		weight: 500,
		...o,
		size,
		tracking: (o.trackingEm ?? 0) * size
	});
	return true;
}
//#endregion
export { arcText, decodeStr, faceText, planeText };
