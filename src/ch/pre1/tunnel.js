import { TAU, clamp } from "../../engine/math.js?v=BJIlRm7-";
//#region src/ch/pre1/tunnel.js
var TUN = {
	R: 1.3,
	gap: 1.8,
	rings: 40
};
var ringZ = (k) => -k * TUN.gap;
/** Human label for the decade ring 10^m s. */
function decadeLabel(m) {
	const s = 10 ** m;
	const f = (n) => n < 10 ? n.toFixed(1) : String(Math.round(n));
	const unit = s < 60 ? `${s} s` : s < 3600 ? `${f(s / 60)} min` : s < 86400 ? `${f(s / 3600)} h` : s < 3156e4 ? `${f(s / 86400)} d` : `${f(s / 3156e4)} y`;
	return [`10${String(m).split("").map((c) => "⁰¹²³⁴⁵⁶⁷⁸⁹"[+c]).join("")} s`, unit];
}
/**
* Draw the rings in front of a camera at z = camZ looking toward −z. o: gold, blue (HDR colours), far (draw range),
* fog, streak (length of motion streaks toward the camera, world units), beat (s), gain, weight (line width factor).
*/
function drawTunnel(Lines, camZ, t, t0, o = {}) {
	const { R, gap, rings } = TUN, far = o.far ?? 40, fog = o.fog ?? .05, gold = o.gold, blue = o.blue, streak = o.streak ?? 0, g = o.gain ?? 1, wk = o.weight ?? 1;
	for (let k = 0; k < rings; k++) {
		const z = ringZ(k), dz = camZ - z;
		if (dz < -.2 || dz > far) continue;
		const f = Math.exp(-Math.max(0, dz) * fog) * clamp((dz + .2) / 1.4) * g;
		if (f < .01) continue;
		const spin = (k % 2 ? 1 : -1) * .05 * (t - t0), decade = k % 4 === 0;
		const circ = [];
		for (let i = 0; i <= 90; i++) {
			const a = i / 90 * TAU;
			circ.push([
				Math.cos(a) * R,
				Math.sin(a) * R,
				z
			]);
		}
		Lines.polyline(circ, {
			color: gold.map((c) => c * (decade ? .85 : .45) * f),
			width: (decade ? 2.4 : 1.6) * wk
		});
		for (let j = 0; j < 60; j++) {
			const a = spin + j / 60 * TAU, big = j % 5 === 0, l = big ? .17 : .07, c = Math.cos(a), s = Math.sin(a);
			const A = [
				c * R,
				s * R,
				z
			], B = [
				c * (R - l),
				s * (R - l),
				z
			];
			const col = gold.map((v) => v * (big ? 1.5 : .65) * f);
			Lines.segment(A, B, {
				color: col,
				width: (big ? 2.8 : 1.5) * wk
			});
			if (streak > 0 && big) Lines.segment(A, [
				A[0],
				A[1],
				z + streak
			], {
				color: col.map((v) => v * .45),
				width: 1.6 * wk
			});
		}
		const period = (o.beat ?? .4615) * 2 ** (k / 4), ha = spin + TAU * (t - t0) / period;
		const hand = [];
		for (let i = 0; i <= 10; i++) {
			const a = ha - i * .018;
			hand.push([
				Math.cos(a) * (R + .06),
				Math.sin(a) * (R + .06),
				z
			]);
		}
		Lines.polyline(hand, {
			color: blue.map((v) => v * 2.2 * f),
			width: 3.2 * wk
		});
		Lines.segment([
			Math.cos(ha) * (R - .3),
			Math.sin(ha) * (R - .3),
			z
		], [
			Math.cos(ha) * (R + .06),
			Math.sin(ha) * (R + .06),
			z
		], {
			color: blue.map((v) => v * 1.2 * f),
			width: 2 * wk
		});
		if (streak > 0) Lines.segment(hand[0], [
			hand[0][0],
			hand[0][1],
			z + streak * 1.4
		], {
			color: blue.map((v) => v * .9 * f),
			width: 2.2 * wk
		});
	}
}
//#endregion
export { TUN, decadeLabel, drawTunnel, ringZ };
