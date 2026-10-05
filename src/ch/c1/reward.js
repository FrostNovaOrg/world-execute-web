import { clamp, lerp, rng } from "../../engine/math.js?v=BJIlRm7-";
//#region src/ch/c1/reward.js
var REW = {
	n: 1600,
	steps: 1e5,
	w: 6.4,
	h: 3.2,
	x0: -3.2,
	y0: -1.6,
	rMin: 0,
	rMax: 1
};
/** Seeded run: { raw, ema } Float32Arrays of n rewards. o.crashAt (0..1 of the run, c3) makes it diverge. */
function rewardRun({ seed = 4242, crashAt = null } = {}) {
	const g = rng(seed), n = REW.n, raw = new Float32Array(n), ema = new Float32Array(n);
	const dips = [
		[
			.23,
			.05,
			.18
		],
		[
			.47,
			.035,
			.12
		],
		[
			.71,
			.025,
			.08
		]
	];
	let e = .05;
	for (let i = 0; i < n; i++) {
		const u = i / (n - 1);
		let mu = .97 - .92 * Math.exp(-u / .22);
		for (const [c, w, d] of dips) mu -= d * Math.exp(-(((u - c) / w) ** 2));
		const sd = .085 * Math.exp(-u / .45) + .018, z = (g() + g() + g() - 1.5) * 2;
		let r = mu + sd * z;
		if (crashAt != null && u > crashAt) {
			const k = (u - crashAt) / (1 - crashAt);
			r = lerp(mu, -.45, 1 - Math.exp(-k * 4)) + sd * z * (1 + 4 * k);
		}
		raw[i] = crashAt != null && u > crashAt + (1 - crashAt) * .85 ? NaN : clamp(r, -.6, 1.05);
		e += .03 * ((Number.isNaN(raw[i]) ? e : raw[i]) - e);
		ema[i] = Number.isNaN(raw[i]) ? NaN : e;
	}
	return {
		raw,
		ema
	};
}
var plotX = (u) => REW.x0 + u * REW.w;
var plotY = (r) => REW.y0 + (r - REW.rMin) / (REW.rMax - REW.rMin) * REW.h;
/** Value of a series at fractional run position u (0..1). */
function sampleAt(series, u) {
	const x = clamp(u, 0, 1) * (REW.n - 1), i = Math.floor(x), j = Math.min(REW.n - 1, i + 1);
	return lerp(series[i], series[j], x - i);
}
/** Polyline of a series from u = 0 to u = prog (z = 0), stopping at the first NaN. */
function seriesPts(series, prog, stride = 1) {
	const pts = [], last = Math.floor(clamp(prog) * (REW.n - 1));
	for (let i = 0; i <= last; i += stride) {
		if (Number.isNaN(series[i])) break;
		pts.push([
			plotX(i / (REW.n - 1)),
			plotY(series[i]),
			0
		]);
	}
	const x = clamp(prog) * (REW.n - 1);
	if (pts.length && x > last && !Number.isNaN(series[Math.min(REW.n - 1, last + 1)])) pts.push([
		plotX(prog),
		plotY(sampleAt(series, prog)),
		0
	]);
	return pts;
}
/** Axes, ticks and dotted grid. Returns label anchors [[text, [x, y, z], align]] for the HUD. o: gain, xLabel, yLabel. */
function drawAxes(L, pal, o = {}) {
	const g = o.gain ?? 1, ax = pal.white.map((c) => c * .75 * g), dim = pal.dim.map((c) => c * .9 * g), X0 = REW.x0, Y0 = REW.y0, X1 = X0 + REW.w, Y1 = Y0 + REW.h;
	const labels = [];
	L.segment([
		X0,
		Y0,
		0
	], [
		X1 + .25,
		Y0,
		0
	], {
		color: ax,
		width: 2
	});
	L.segment([
		X0,
		Y0,
		0
	], [
		X0,
		Y1 + .25,
		0
	], {
		color: ax,
		width: 2
	});
	for (const [a, b] of [
		[[X1 + .25, Y0], [X1 + .13, Y0 + .05]],
		[[X1 + .25, Y0], [X1 + .13, Y0 - .05]],
		[[X0, Y1 + .25], [X0 - .05, Y1 + .13]],
		[[X0, Y1 + .25], [X0 + .05, Y1 + .13]]
	]) L.segment([...a, 0], [...b, 0], {
		color: ax,
		width: 2
	});
	for (let k = 0; k <= 10; k++) {
		const x = plotX(k / 10);
		L.segment([
			x,
			Y0,
			0
		], [
			x,
			Y0 - (k % 5 ? .05 : .1),
			0
		], {
			color: ax,
			width: 1.6
		});
		if (k) for (let j = 0; j < 16; j++) {
			const y = Y0 + (j + .25) / 16 * REW.h;
			L.segment([
				x,
				y,
				0
			], [
				x,
				y + REW.h / 48,
				0
			], {
				color: dim,
				width: 1.1
			});
		}
		if (k % 2 === 0) labels.push([
			k ? `${k * 10}k` : "0",
			[
				x,
				Y0 - .24,
				0
			],
			"center"
		]);
	}
	for (let k = 0; k <= 5; k++) {
		const r = k / 5, y = plotY(r);
		L.segment([
			X0,
			y,
			0
		], [
			X0 - .1,
			y,
			0
		], {
			color: ax,
			width: 1.6
		});
		if (k) for (let j = 0; j < 30; j++) {
			const x = X0 + (j + .25) / 30 * REW.w;
			L.segment([
				x,
				y,
				0
			], [
				x + REW.w / 90,
				y,
				0
			], {
				color: dim,
				width: 1.1
			});
		}
		labels.push([
			r.toFixed(1),
			[
				X0 - .18,
				y,
				0
			],
			"right"
		]);
	}
	labels.push([
		o.xLabel ?? "training steps",
		[
			X1 - .6,
			Y0 - .5,
			0
		],
		"center"
	], [
		o.yLabel ?? "mean episode reward",
		[
			X0 + 1.1,
			Y1 + .3,
			0
		],
		"center"
	]);
	return labels;
}
/**
* The curve up to run position prog: raw episodes (faint) and the moving average (bold), a tip marker with reading
* lines. o: gain, col (bold colour), rawCol, tip (0..1).
*/
function drawReward(L, run, prog, pal, o = {}) {
	const g = o.gain ?? 1, col = (o.col ?? pal.cold).map((c) => c * 1.5 * g), raw = (o.rawCol ?? pal.cold).map((c) => c * .32 * g);
	const pr = seriesPts(run.raw, prog, 2), pe = seriesPts(run.ema, prog, 2);
	if (pr.length > 1) L.polyline(pr, {
		color: raw,
		width: 1.3
	});
	if (pe.length > 1) L.polyline(pe, {
		color: col,
		width: o.width ?? 3.2
	});
	const tip = pe.at(-1);
	if (tip && (o.tip ?? 1) > 0) {
		const k = o.tip ?? 1, hot = (o.tipCol ?? pal.hot).map((c) => c * 3 * k * g), lc = pal.hot.map((c) => c * .45 * k * g);
		L.segment(tip, tip, {
			color: hot,
			width: 14
		});
		for (let j = 0; j < 14; j++) {
			const y = lerp(REW.y0, tip[1], j / 14), y2 = lerp(REW.y0, tip[1], (j + .5) / 14);
			L.segment([
				tip[0],
				y,
				0
			], [
				tip[0],
				y2,
				0
			], {
				color: lc,
				width: 1.2
			});
		}
		for (let j = 0; j < 20; j++) {
			const x = lerp(REW.x0, tip[0], j / 20), x2 = lerp(REW.x0, tip[0], (j + .5) / 20);
			L.segment([
				x,
				tip[1],
				0
			], [
				x2,
				tip[1],
				0
			], {
				color: lc,
				width: 1.2
			});
		}
	}
	return tip;
}
/** Points along the moving average with w = run position (0..1), for a Swarm drawn on with revealBy 'w'. */
function emaPolyline(run) {
	const pts = [];
	for (let i = 0; i < REW.n; i++) {
		if (Number.isNaN(run.ema[i])) break;
		pts.push([
			plotX(i / (REW.n - 1)),
			plotY(run.ema[i]),
			0,
			i / (REW.n - 1)
		]);
	}
	return pts;
}
//#endregion
export { REW, drawAxes, drawReward, emaPolyline, plotX, plotY, rewardRun, sampleAt, seriesPts };
