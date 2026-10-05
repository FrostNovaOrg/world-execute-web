import { Vector2, Vector3 } from "../../../vendor/three/build/three.core.js?v=q9f7JKE-";
import { fsMaterial } from "../../engine/gpu.js?v=o4BYX3o1";
//#region src/ch/love/backdrop.js
var FS = `
uniform vec3 uTop, uBot; uniform vec2 uSize, uOff, uView; uniform float uRad;
in vec2 vUv; out vec4 o;
void main() {
  vec2 p = uOff + vec2(vUv.x, 1. - vUv.y) * uView;               // design px from the panel's top-left
  vec2 h = uSize * .5, q = abs(p - h) - (h - uRad);
  float d = length(max(q, 0.)) + min(max(q.x, q.y), 0.) - uRad;  // rounded-box distance
  float m = 1. - smoothstep(-.75, .75, d);
  o = vec4(mix(uTop, uBot, smoothstep(0., 1., p.y / uSize.y)) * m, 1.);
}`;
var MAT = null;
/**
* rect: [x, y, w, h] in design px (may reach outside the frame: only the visible part is drawn). top, bottom: linear
* colours at the top and bottom edge; alpha scales both (the surface fades by dimming, since it is added).
*/
function backdrop(ctx, rect, { top, bottom = top, radius = 12, alpha = 1 } = {}) {
	if (alpha <= 0) return;
	const x0 = Math.max(0, rect[0]), y0 = Math.max(0, rect[1]), x1 = Math.min(1920, rect[0] + rect[2]), y1 = Math.min(1080, rect[1] + rect[3]);
	if (x1 - x0 < 1 || y1 - y0 < 1) return;
	MAT ??= fsMaterial(FS, {
		uTop: { value: new Vector3() },
		uBot: { value: new Vector3() },
		uSize: { value: new Vector2() },
		uOff: { value: new Vector2() },
		uView: { value: new Vector2() },
		uRad: { value: 0 }
	}, {
		transparent: true,
		blending: 2
	});
	const u = MAT.uniforms;
	u.uTop.value.set(...top).multiplyScalar(alpha);
	u.uBot.value.set(...bottom).multiplyScalar(alpha);
	u.uSize.value.set(rect[2], rect[3]);
	u.uOff.value.set(x0 - rect[0], y0 - rect[1]);
	u.uView.value.set(x1 - x0, y1 - y0);
	u.uRad.value = radius;
	ctx.viewport([
		x0,
		y0,
		x1 - x0,
		y1 - y0
	], () => ctx.pass(MAT));
}
/**
* A terminal window (the one the film is made in): the backdrop, a hairline border and a title strip with the
* session's name, the lines on the crisp overlay layer. Love's "Question me" and the end screen use the same one.
*/
function terminal(ctx, rect, { title = "", alpha = 1, top = [
	.0125,
	.0115,
	.0145
], bottom = [
	.0075,
	.007,
	.0095
], border = "#3d3843", dim = "#8a8f98", radius = 16, strip = !!title } = {}) {
	if (alpha <= 0) return;
	backdrop(ctx, rect, {
		top,
		bottom,
		radius,
		alpha
	});
	const L = ctx.text.overlay, [x, y, w, h] = rect;
	L.draw((g) => {
		g.globalAlpha *= .8 * alpha;
		g.strokeStyle = border;
		g.lineWidth = 1.2;
		g.beginPath();
		g.roundRect(x + .5, y + .5, w - 1, h - 1, radius);
		g.stroke();
		if (strip) {
			g.globalAlpha *= .6;
			g.beginPath();
			g.moveTo(x + 1, y + 46.5);
			g.lineTo(x + w - 1, y + 46.5);
			g.stroke();
		}
	});
	if (title) L.text(title, x + 26, y + 24, {
		size: 16,
		font: "JetBrains Mono",
		weight: 500,
		align: "left",
		color: dim,
		alpha: .9 * alpha
	});
}
//#endregion
export { backdrop, terminal };
