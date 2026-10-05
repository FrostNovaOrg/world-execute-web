import { PROJECT } from "../engine/config.js?v=BkWxxfxi";
import { clamp, seg } from "../engine/math.js?v=BJIlRm7-";
import { HEX, THEME } from "../theme.js?v=Bj33PIbo";
import { Vector3 } from "../../vendor/three/build/three.core.js?v=q9f7JKE-";
//#region src/lib/hud.js
var { width: DW, height: DH } = PROJECT.design;
var face = () => THEME.lyrics.font;
var v3 = new Vector3();
/**
* Project a world point to design coordinates, optionally into a viewport rect [x, y, w, h]: [x, y, depth] with depth
* the clip-space z (outside -1..1 the camera does not see the point: behind it, nearer than its near plane or beyond its
* far plane). `cam` is the camera the shot draws with (what look.js orbit returned), already set for this frame.
*/
function toDesign(p, cam, rect = [
	0,
	0,
	DW,
	DH
]) {
	v3.set(p[0], p[1], p[2]).project(cam);
	return [
		rect[0] + (v3.x * .5 + .5) * rect[2],
		rect[1] + (1 - (v3.y * .5 + .5)) * rect[3],
		v3.z
	];
}
/**
* The bar and the beat in it at song time t, both counted from 1, read from the song's beat and bar grids: the beats
* of the bar are the beats between its bar line and the next, so any metre works (3/4, 6/8 counted in sixes, a bar of
* five). null before the first bar line (a pick-up) and when the song has no grid. perBar: beats in this bar.
*/
function barBeat(T, t) {
	const bar = T.barAt(t);
	if (!Number.isFinite(bar) || bar < 0) return null;
	const n = Math.floor(bar), first = Math.round(T.beatAt(T.barTime(n))), next = Math.round(T.beatAt(T.barTime(n + 1)));
	const k = Math.floor(T.beatAt(t) + 1e-6) - first, perBar = next - first;
	if (!Number.isFinite(k) || !Number.isFinite(perBar) || perBar < 1) return null;
	return {
		bar: n + 1,
		beat: clamp(k, 0, perBar - 1) + 1,
		perBar
	};
}
/** mm:ss.mmm; a time before the song's start (a pre-roll) gets a minus sign. */
var fmtTime = (t) => {
	const ms = Math.round(Math.abs(t) * 1e3), m = Math.floor(ms / 6e4);
	return `${t < 0 && ms ? "-" : ""}${String(m).padStart(2, "0")}:${(ms % 6e4 / 1e3).toFixed(3).padStart(6, "0")}`;
};
/**
* Corner brackets plus the section id, bar.beat and timecode. o: inset (44), alpha (.55), color (HEX.dim),
* label (top-left, after the bar.beat), bottomRight (a line in the bottom-right corner).
*/
function frame(L, t, T, o = {}) {
	const a = o.alpha ?? .55, c = o.color ?? HEX.dim, m = o.inset ?? 44, len = 26;
	L.draw((g) => {
		g.globalAlpha *= a;
		g.strokeStyle = c;
		g.lineWidth = 1.2;
		for (const [x, y, sx, sy] of [
			[
				m,
				m,
				1,
				1
			],
			[
				DW - m,
				m,
				-1,
				1
			],
			[
				m,
				DH - m,
				1,
				-1
			],
			[
				DW - m,
				DH - m,
				-1,
				-1
			]
		]) {
			g.beginPath();
			g.moveTo(x, y + sy * len);
			g.lineTo(x, y);
			g.lineTo(x + sx * len, y);
			g.stroke();
		}
	});
	const st = {
		size: 14,
		weight: 500,
		font: face(),
		color: c,
		alpha: a
	};
	const bb = barBeat(T, t), sec = T.sectionAt(t);
	const pos = bb ? `${String(bb.bar).padStart(3, "0")}.${bb.beat}` : "---.-";
	L.text(`${sec?.id ?? ""}  ${pos}${o.label ? "  " + o.label : ""}`, m + 36, m + 8, {
		...st,
		align: "left"
	});
	L.text(fmtTime(t), DW - m - 36, m + 8, {
		...st,
		align: "right"
	});
	if (o.bottomRight) L.text(o.bottomRight, DW - m - 36, DH - m - 8, {
		...st,
		align: "right"
	});
}
/** A block of key/value rows (values in the accent colour). o: size (15), alpha (.8), keyW (110, the key column), accent. */
function readout(L, x, y, rows, o = {}) {
	const size = o.size ?? 15, lh = size * 1.55, a = o.alpha ?? .8;
	rows.forEach(([k, v], i) => {
		L.text(k, x, y + i * lh, {
			size,
			font: face(),
			weight: 500,
			color: HEX.dim,
			align: "left",
			alpha: a
		});
		L.text(String(v), x + (o.keyW ?? 110), y + i * lh, {
			size,
			font: face(),
			weight: 600,
			color: o.accent ?? HEX.subject,
			align: "left",
			alpha: a
		});
	});
}
/** Engineering dimension line between a and b (design coords) with end ticks and a centred label. o: offset, color, alpha, size. */
function dimLine(L, a, b, label, o = {}) {
	const c = o.color ?? HEX.subject, al = o.alpha ?? .85, off = o.offset ?? 0;
	const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy) || 1, nx = -dy / len * off, ny = dx / len * off;
	const A = [a[0] + nx, a[1] + ny], B = [b[0] + nx, b[1] + ny], tx = -dy / len * 7, ty = dx / len * 7;
	L.draw((g) => {
		g.globalAlpha *= al;
		g.strokeStyle = c;
		g.lineWidth = 1.3;
		g.beginPath();
		g.moveTo(...A);
		g.lineTo(...B);
		for (const P of [A, B]) {
			g.moveTo(P[0] - tx, P[1] - ty);
			g.lineTo(P[0] + tx, P[1] + ty);
		}
		if (off) {
			g.moveTo(...a);
			g.lineTo(A[0] + nx * .15, A[1] + ny * .15);
			g.moveTo(...b);
			g.lineTo(B[0] + nx * .15, B[1] + ny * .15);
		}
		g.stroke();
	});
	if (label) {
		const mx = (A[0] + B[0]) / 2, my = (A[1] + B[1]) / 2, ang = Math.atan2(dy, dx), up = Math.abs(ang) > Math.PI / 2 ? ang + Math.PI : ang;
		L.text(label, mx + -dy / len * 16 * Math.sign(off || 1), my + dx / len * 16 * Math.sign(off || 1), {
			size: o.size ?? 17,
			font: face(),
			weight: 600,
			color: c,
			alpha: al,
			rot: up
		});
	}
}
/** Reticle with a gap and a small label. o: color, alpha, ring (a circle inside the ticks), label. */
function crosshair(L, x, y, r = 22, o = {}) {
	const c = o.color ?? HEX.subject, al = o.alpha ?? .85;
	L.draw((g) => {
		g.globalAlpha *= al;
		g.strokeStyle = c;
		g.lineWidth = 1.2;
		g.beginPath();
		for (const [dx, dy] of [
			[1, 0],
			[-1, 0],
			[0, 1],
			[0, -1]
		]) {
			g.moveTo(x + dx * r * .45, y + dy * r * .45);
			g.lineTo(x + dx * r, y + dy * r);
		}
		g.stroke();
		if (o.ring) {
			g.beginPath();
			g.arc(x, y, r * .75, 0, Math.PI * 2);
			g.stroke();
		}
	});
	if (o.label) L.text(o.label, x + r + 8, y - r * .6, {
		size: 14,
		font: face(),
		weight: 500,
		color: c,
		align: "left",
		alpha: al
	});
}
/** Small spectrum of the real audio (16 mel bands) as thin bars. Draws nothing when the features are missing (F.ready). */
function scope(L, F, t, x, y, w, h, o = {}) {
	if (!F.ready) return;
	const b = F.bands(t), n = b.length, bw = w / n, al = o.alpha ?? .7;
	L.draw((g) => {
		g.globalAlpha *= al;
		g.fillStyle = o.color ?? HEX.subject;
		for (let i = 0; i < n; i++) {
			const v = clamp(b[i]);
			g.fillRect(x + i * bw + 1, y + h - v * h, Math.max(1, bw - 3), Math.max(1, v * h));
		}
		g.strokeStyle = HEX.dim;
		g.lineWidth = 1;
		g.beginPath();
		g.moveTo(x, y + h + .5);
		g.lineTo(x + w, y + h + .5);
		g.stroke();
	});
}
/** A leader-line callout: a dot at p, an elbow line, and a label. o: dx, dy (the elbow), draw (0..1, the label shows past .6), color, alpha, size. */
function callout(L, p, text, o = {}) {
	const c = o.color ?? HEX.subject, al = o.alpha ?? .85, dx = o.dx ?? 70, dy = o.dy ?? -50, k = o.draw ?? 1;
	const e = [p[0] + dx * k, p[1] + dy * k], f = [e[0] + (dx >= 0 ? 40 : -40) * k, e[1]];
	L.draw((g) => {
		g.globalAlpha *= al;
		g.strokeStyle = c;
		g.fillStyle = c;
		g.lineWidth = 1.2;
		g.beginPath();
		g.arc(p[0], p[1], 3, 0, Math.PI * 2);
		g.fill();
		g.beginPath();
		g.moveTo(...p);
		g.lineTo(...e);
		g.lineTo(...f);
		g.stroke();
	});
	if (k > .6) L.text(text, f[0] + (dx >= 0 ? 8 : -8), f[1], {
		size: o.size ?? 16,
		font: face(),
		weight: 600,
		color: c,
		align: dx >= 0 ? "left" : "right",
		alpha: al * seg(k, .6, 1)
	});
}
/** Thin border and label for a viewport rect (split screens). o.labelPos: 'top' (default) or 'bottom'. */
function viewportFrame(L, rect, label, o = {}) {
	const al = o.alpha ?? .6;
	L.draw((g) => {
		g.globalAlpha *= al;
		g.strokeStyle = o.color ?? HEX.dim;
		g.lineWidth = 1;
		g.strokeRect(rect[0] + .5, rect[1] + .5, rect[2] - 1, rect[3] - 1);
	});
	if (label) L.text(label, rect[0] + 14, o.labelPos === "bottom" ? rect[1] + rect[3] - 16 : rect[1] + 18, {
		size: 14,
		font: face(),
		weight: 600,
		color: o.labelColor ?? HEX.subject,
		align: "left",
		alpha: al + .2
	});
}
//#endregion
export { barBeat, callout, crosshair, dimLine, frame, readout, scope, toDesign, viewportFrame };
