import { clamp, ease, hash, seg } from "../engine/math.js?v=BJIlRm7-";
import { HEX, THEME } from "../theme.js?v=Bj33PIbo";
import { PerspectiveCamera } from "../../vendor/three/build/three.core.js?v=q9f7JKE-";
import { rig } from "../engine/rig.js?v=39-joEtk";
//#region src/lib/look.js
var GLYPHS = "01<>/\\[]{}()=+*#%&$@!?;:ABCDEFGHIJKLMNOPQRSTUVWXYZ";
/**
* A hero keyword (the ALL-CAPS lyric words). Letters "decode": each cycles through random glyphs, then locks,
* left to right, starting at t0 and settling within `decode` seconds. Deterministic per frame.
* o: size, color, glow, tracking, font, weight, decode (s), out (fade-out start, absolute s), outDur, layer alpha.
* Draw it on ctx.text.scene to make it glow with the picture (set ctx.post.textGlow), or on ctx.text.overlay for exact colours.
*/
function heroWord(layer, word, x, y, t0, t, o = {}) {
	if (t < t0) return;
	const size = o.size ?? 120, decode = o.decode ?? .45, n = word.length;
	const outK = o.out != null ? 1 - ease.inCubic(seg(t, o.out, o.out + (o.outDur ?? .25))) : 1;
	if (outK <= 0) return;
	const style = {
		size,
		weight: o.weight ?? 800,
		font: o.font ?? THEME.lyrics.font,
		tracking: o.tracking ?? size * .12
	};
	const f = Math.floor(t * 30);
	let s = "";
	for (let i = 0; i < n; i++) {
		const lock = t0 + decode * (i + 1) / n;
		if (word[i] === " " || word[i] === "-") {
			s += word[i];
			continue;
		}
		if (t >= lock) s += word[i];
		else if (t >= t0 + decode * i / n * .5) s += GLYPHS[Math.floor(hash(i * 31.7 + f * 7.3) * 50)];
		else s += " ";
	}
	const pop = ease.outBack(seg(t, t0, t0 + .18), 1.2);
	layer.text(s, x, y, {
		...style,
		color: o.color ?? HEX.text,
		glow: o.glow ?? size * .35,
		glowColor: o.glowColor ?? o.color ?? HEX.subject,
		alpha: outK * (o.alpha ?? 1),
		scale: .92 + .08 * pop,
		align: o.align ?? "center"
	});
}
/**
* Console-style lyric log: the last `keep` sung (non-caps) lines as terminal output, typed character by character
* exactly as they are sung, with a block cursor on the line being typed. Older lines dim and scroll up.
* o: x, y (baseline of the newest line), size, keep, color, accent, glow, prompt, alpha, fadeAfter (s after a line ends
* until it fades out), from/to (only lines starting in range).
* A shot that draws this sets `ownsLyrics: true`, or the engine's own lyric layer prints every line a second time.
*/
function consoleLog(layer, T, t, o = {}) {
	const size = o.size ?? 30, lh = size * 1.45, keep = o.keep ?? 3, x = o.x ?? 110, y = o.y ?? 930;
	const lines = T.lines.filter((l) => !l.caps && l.start <= t && l.start >= (o.from ?? -1) && l.start < (o.to ?? 1e9)).slice(-keep);
	const style = {
		size,
		weight: 500,
		font: THEME.lyrics.font,
		align: "left"
	};
	const prompt = o.prompt ?? "> ";
	lines.forEach((l, k) => {
		const age = lines.length - 1 - k, yy = y - age * lh;
		let shown = "";
		for (const w of l.words) {
			if (t < w.start) break;
			const cs = w.text.length, typed = t >= w.end ? cs : Math.max(1, Math.ceil(cs * clamp((t - w.start) / Math.max(.05, (w.end - w.start) * .8))));
			shown += (shown ? " " : "") + w.text.slice(0, typed);
		}
		const typing = age === 0 && t < l.end + .15;
		const alpha = age === 0 ? 1 : age === 1 ? .45 : .22;
		const fade = o.fadeAfter != null ? 1 - seg(t, l.end + o.fadeAfter, l.end + o.fadeAfter + .4) : 1;
		layer.text(prompt + shown, x, yy, {
			...style,
			color: age === 0 ? o.color ?? HEX.text : HEX.dim,
			alpha: alpha * fade * (o.alpha ?? 1),
			glow: age === 0 ? o.glow ?? 10 : 0,
			glowColor: o.accent ?? HEX.subject
		});
		if (typing && Math.floor(t * 4) % 2 === 0) {
			const w = layer.measure(prompt + shown, style);
			layer.text("█", x + w + size * .1, yy, {
				...style,
				color: o.accent ?? HEX.subject,
				alpha: .85 * (o.alpha ?? 1)
			});
		}
	});
}
/**
* Point a perspective camera from spherical coordinates around a target and hand it to the rig (engine/rig.js), as
* every camera helper of a chapter does: a probe reads its pose, a camera relay drives it, an edit row dresses it with
* a lens shift. Returns the camera to draw and project (hud.toDesign) with, which is not always the one passed in.
* o: r, az (around y, from +z), el (radians), target [x, y, z], fov, aspect, roll; inset: true (the rig leaves the camera
* alone) for a split-screen viewport, and in a helper that adjusts the camera (roll, near/far) and then calls rig.cam
* itself, so only that outer call counts; main: true for a main camera set again after the first one.
* (The core's lib/cameras.js has an orbit() too: that one only computes a position; import one of them under another name.)
*/
function orbit(cam, { r = 5, az = 0, el = .2, target = [
	0,
	0,
	0
], fov, aspect, roll = 0, inset = false, main = false } = {}) {
	if (fov) cam.fov = fov;
	if (aspect) cam.aspect = aspect;
	cam.position.set(target[0] + r * Math.cos(el) * Math.sin(az), target[1] + r * Math.sin(el), target[2] + r * Math.cos(el) * Math.cos(az));
	cam.up.set(Math.sin(roll), Math.cos(roll), 0);
	cam.lookAt(target[0], target[1], target[2]);
	cam.updateProjectionMatrix();
	cam.updateMatrixWorld();
	return rig.cam(cam, {
		look: target,
		inset,
		main
	});
}
/** Deterministic camera shake offset for time t (changes at 30 Hz, smooth between). */
function shake(t, amp) {
	const f = Math.floor(t * 30), k = t * 30 - f, h = (i, s) => hash(i * 1.37 + s) * 2 - 1;
	return [
		0,
		1,
		2
	].map((s) => (h(f, s * 11) * (1 - k) + h(f + 1, s * 11) * k) * amp);
}
var newCamera = (fov = 40) => new PerspectiveCamera(fov, 16 / 9, .01, 500);
//#endregion
export { consoleLog, heroWord, newCamera, orbit, shake };
