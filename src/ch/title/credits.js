import { clamp, ease, lerp, seg } from "../../engine/math.js?v=BJIlRm7-";
import { HEX } from "../../theme.js?v=Bj33PIbo";
import { Vector3 } from "../../../vendor/three/build/three.core.js?v=q9f7JKE-";
import { toDesign } from "../../lib/hud.js?v=BgmSZjmG";
import { scrim } from "../intro/kit.js?v=rUxrOt9G";
import { basis } from "./lattice.js?v=DpybgBeN";
//#region src/ch/title/credits.js
var CREDITS_R = [
	{
		role: "Executive Producer",
		name: "FrostNova"
	},
	{
		role: "Technical Advisor",
		name: "Cielo"
	},
	{
		role: "Safeguard Fallback",
		name: "Claude Fable 5.1 & GPT-6 Astra"
	},
	{
		role: "Lead Sponsor",
		name: "KUSK"
	}
];
var SIGN_H = .34;
var FOCAL = 540 / Math.tan(64 * Math.PI / 360);
/**
* A sign that travels with the camera: d ahead of it along the shot's own direction (setup's yaw and pitch, without the
* shot's wobble), on the camera's path (without its sway, so the sway shows it in the world), and off the axis by as
* much as puts it at (dx, dy) design px from the middle (dy up) when it is dHold ahead. So as d changes it moves along
* a straight line out of the vanishing point, and holds still while d does.
*/
function rideAt(st, { yaw = 0, pitch = 0, ro = [
	0,
	0,
	0
] }, [dx, dy], dHold, d) {
	const e = basis(yaw, pitch).elements, x = dx * dHold / FOCAL, y = dy * dHold / FOCAL;
	return [
		0,
		1,
		2
	].map((i) => ro[i] + (i === 2 ? st.z : 0) + e[i] * x + e[3 + i] * y + e[6 + i] * d);
}
/**
* How far ahead a sign that rides is at t: out of the depth (far) to `near` in `settle` s from t0, drifting in to
* `close` by tPass, then passed: in to .2 by tEnd (it fades from 2.6 to 1 ahead, in drawSign's caller).
*/
function rideD(t, t0, tPass, tEnd, { far = 22, near = 4.3, close = 3.8, settle = .5 } = {}) {
	const d = lerp(far, near, ease.outCubic(seg(t, t0, t0 + settle))) + (close - near) * seg(t, t0 + settle, tPass);
	return lerp(d, .2, ease.inQuad(seg(t, tPass, tEnd)));
}
var v = new Vector3();
var f = new Vector3();
/**
* Where a sign at world point p is on screen through cam: { x, y } in design px, its name's size (px) for a name SIGN_H
* tall, the turn of the world's up on screen (rot) and its depth along the view; null behind the camera.
*/
function signAt(p, cam, h = SIGN_H) {
	cam.getWorldDirection(f);
	const d = v.set(p[0], p[1], p[2]).sub(cam.position).dot(f);
	if (d <= .05) return null;
	const a = toDesign(p, cam), b = toDesign([
		p[0],
		p[1] + .1,
		p[2]
	], cam);
	const focal = 540 / Math.tan(cam.fov * Math.PI / 360);
	return {
		x: a[0],
		y: a[1],
		size: h * focal / d,
		rot: Math.atan2(b[0] - a[0], a[1] - b[1]),
		d
	};
}
/**
* A sign centred on (x, y) in design px: `// role` over the name, the name `size` px tall, turned by rot, the
* characters typed one every q seconds from t0 (the role first), on a soft dark scrim over the busy lattice. (The
* seventh round: the comment line half the name's size, its slashes in me's colour and the line in me's glow, as the
* title's credits look; the scrim darker.)
*/
function drawSign(L, c, { x, y, size, rot = 0, alpha = 1, t, t0, q }) {
	if (alpha <= .002 || size < 3 || t < t0) return;
	const role = `// ${c.role}`, rs = size * .5, n = Math.floor((t - t0) / q);
	const nameSt = {
		size,
		weight: 700,
		font: "JetBrains Mono",
		align: "left"
	}, roleSt = {
		size: rs,
		weight: 500,
		font: "JetBrains Mono",
		align: "left"
	};
	const wn = L.measure(c.name, nameSt), wr = L.measure(role, roleSt), gap = size * .6;
	const at = (dx, dy) => [x + dx * Math.cos(rot) - dy * Math.sin(rot), y + dx * Math.sin(rot) + dy * Math.cos(rot)];
	const pad = size * .45, w = Math.max(wn, wr) + 2 * pad, h = size + rs + gap * .6 + 2 * pad;
	scrim(L, [[
		x - w / 2,
		y - h / 2 - gap * .25,
		w,
		h
	]], {
		alpha: .72 * clamp(alpha),
		blur: Math.min(60, size * .6)
	});
	const shownRole = role.slice(0, Math.max(0, n)), shownName = c.name.slice(0, Math.max(0, n - role.length));
	if (shownRole) {
		const p = at(-wr / 2, -gap);
		const glow = {
			glow: Math.max(3, rs * .1),
			glowColor: HEX.me
		};
		L.text(shownRole.slice(0, 2), p[0], p[1], {
			...roleSt,
			rot,
			color: HEX.me,
			alpha,
			...glow
		});
		if (shownRole.length > 2) {
			const q2 = at(-wr / 2 + L.measure("//", roleSt), -gap);
			L.text(shownRole.slice(2), q2[0], q2[1], {
				...roleSt,
				rot,
				color: "#e2e8f5",
				alpha,
				...glow
			});
		}
	}
	if (shownName) {
		const p = at(-wn / 2, size * .18);
		L.text(shownName, p[0], p[1], {
			...nameSt,
			rot,
			color: HEX.white,
			alpha,
			glow: Math.max(4, size * .08),
			glowColor: HEX.me
		});
	}
}
//#endregion
export { CREDITS_R, SIGN_H, drawSign, rideAt, rideD, signAt };
