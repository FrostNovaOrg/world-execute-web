import { HEX } from "../../theme.js?v=Bj33PIbo";
import { BoxGeometry, Color, Mesh, MeshBasicMaterial, Vector3 } from "../../../vendor/three/build/three.core.js?v=q9f7JKE-";
var CUR = Object.freeze({
	cx: 960,
	cy: 540,
	w: 50.4,
	h: 8.4
});
var CURSOR_STYLE = Object.freeze({
	color: HEX.white,
	glow: 18,
	glowColor: "#cfe0ff"
});
/** The grade of the black-with-a-cursor frames on both sides of the intro → title cut (so the cursor matches exactly). */
var CURSOR_LOOK = Object.freeze({
	bloom: 1.05,
	threshold: .9,
	knee: .6,
	radius: .85,
	ca: .1,
	vignette: .45,
	grain: .035,
	exposure: 1,
	sat: 1,
	textGlow: 1.6
});
/** Blink on the beat: lit for the first half of every beat, dark for the second. */
var blinkOn = (T, t) => T.beatPhase(t) < .5 ? 1 : 0;
/** The cursor's corners (tl, tr, br, bl) in design px for a centre and a uniform scale. */
function cursorQuad(cx = CUR.cx, cy = CUR.cy, scale = 1) {
	const w = CUR.w * scale / 2, h = CUR.h * scale / 2;
	return [
		[cx - w, cy - h],
		[cx + w, cy - h],
		[cx + w, cy + h],
		[cx - w, cy + h]
	];
}
/**
* Paint the cursor on a text layer (use ctx.text.scene so it glows like the code it types). quad: four design-px
* points (a projected 3D bar may be any quadrilateral). o: alpha, scale (only scales the glow), color, glow.
*/
function drawCursor(layer, quad = cursorQuad(), o = {}) {
	const a = o.alpha ?? 1;
	if (a <= .002) return;
	layer.draw((g, s) => {
		g.globalAlpha *= Math.min(1, a);
		g.fillStyle = o.color ?? CURSOR_STYLE.color;
		g.shadowColor = o.glowColor ?? CURSOR_STYLE.glowColor;
		g.shadowBlur = (o.glow ?? CURSOR_STYLE.glow) * (o.scale ?? 1) * s;
		g.beginPath();
		g.moveTo(quad[0][0], quad[0][1]);
		for (let i = 1; i < 4; i++) g.lineTo(quad[i][0], quad[i][1]);
		g.closePath();
		g.fill();
		g.shadowBlur = 0;
		g.fill();
	});
}
/** Project a world-space quad (4 points) to design px with a camera. */
function projectQuad(pts, cam) {
	const v = new Vector3();
	return pts.map((p) => {
		v.set(p[0], p[1], p[2]).project(cam);
		return [(v.x * .5 + .5) * 1920, (1 - (v.y * .5 + .5)) * 1080];
	});
}
/**
* The 3D cursor of the boot shots: a small emissive block standing on the floor at the world origin (the "first
* pixel" the power trace leaves from). Returns a mesh whose brightness is set per frame with setCursorMesh().
*/
function cursorMesh({ w = .16, h = .028, d = .028 } = {}) {
	const m = new Mesh(new BoxGeometry(w, h, d), new MeshBasicMaterial({
		color: new Color(1, 1, 1),
		toneMapped: false
	}));
	m.position.set(0, h / 2, 0);
	m.userData.size = {
		w,
		h,
		d
	};
	return m;
}
function setCursorMesh(m, level, tint = [
	1,
	1,
	1
]) {
	m.visible = level > .001;
	m.material.color.setRGB(tint[0] * level, tint[1] * level, tint[2] * level);
}
//#endregion
export { CUR, CURSOR_LOOK, CURSOR_STYLE, blinkOn, cursorMesh, cursorQuad, drawCursor, projectQuad, setCursorMesh };
