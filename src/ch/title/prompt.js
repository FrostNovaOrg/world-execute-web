import { dofPolylineSmooth, mul } from "../intro/kit.js?v=rUxrOt9G";
import { planeText } from "../intro/type.js?v=CuOppAhI";
import { CELL, EM, NCELL, X0 } from "./code.js?v=BHDi1kEh";
//#region src/ch/title/prompt.js
var MID = .32 * EM;
/** The box around a line (code.js makeLine: its X0 and NCELL). */
function boxFor({ X0: x0, NCELL: n }) {
	return {
		x0: x0 - 2 * EM,
		x1: x0 + n * CELL + 1.2 * EM,
		y0: MID - 1.05 * EM,
		y1: MID + 1.05 * EM,
		r: .45 * EM,
		mid: MID,
		promptX: x0 - 1.2 * EM,
		hintY: MID - 1.05 * EM - .9 * EM
	};
}
/** The published line's box. */
var BOX = boxFor({
	X0,
	NCELL
});
/** The box border as a closed polyline (rounded corners, n points per quarter), shifted down by dy (world units). */
function boxOutline(dy = 0, n = 8, box = BOX) {
	const { x0, x1, y0, y1, r } = box, pts = [];
	const arc = (cx, cy, a0) => {
		for (let i = 0; i <= n; i++) {
			const a = a0 + i / n * Math.PI / 2;
			pts.push([
				cx + Math.cos(a) * r,
				cy + Math.sin(a) * r - dy,
				0
			]);
		}
	};
	arc(x1 - r, y1 - r, 0);
	arc(x0 + r, y1 - r, Math.PI / 2);
	arc(x0 + r, y0 + r, Math.PI);
	arc(x1 - r, y0 + r, Math.PI * 1.5);
	pts.push(pts[0]);
	return pts;
}
/**
* Draw the box: border (glow lines, optional lens), `>` and the hint (scene text layer, projected onto the plane).
* o: alpha (0..1), dy (slide down, world units), dof (kit dof descriptor), border (HDR grey), prompt (alpha of `>`),
* hint (alpha of the hint line), box (boxFor's; the published line's by default).
*/
function drawPromptBox(ctx, lines, cam, o = {}) {
	const a = o.alpha ?? 1, dy = o.dy ?? 0, B = o.box ?? BOX;
	if (a <= .005) return;
	dofPolylineSmooth(lines, boxOutline(dy, 8, B), {
		color: mul(o.border ?? [
			.2,
			.22,
			.27
		], a),
		width: o.width ?? 1.6
	}, o.dof);
	const L = ctx.text.scene, u = [
		EM,
		0,
		0
	], v = [
		0,
		EM,
		0
	];
	if ((o.prompt ?? 1) > 0) planeText(L, ">", [
		B.promptX,
		B.mid - dy,
		0
	], u, v, cam, {
		color: "#e8e8e8",
		alpha: a * (o.prompt ?? 1) * .8,
		weight: 500
	});
	if ((o.hint ?? 1) > 0) planeText(L, "? for shortcuts", [
		B.x0 + .8 * EM,
		B.hintY - dy,
		0
	], mul(u, .72), mul(v, .72), cam, {
		color: "#5b606b",
		alpha: a * (o.hint ?? 1),
		weight: 500
	});
}
//#endregion
export { BOX, boxFor, boxOutline, drawPromptBox };
