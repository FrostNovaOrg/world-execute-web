import { TAU, ease, hash, lerp, rng, seg } from "../../engine/math.js?v=BJIlRm7-";
import { HEX } from "../../theme.js?v=Bj33PIbo";
import { rig } from "../../engine/rig.js?v=39-joEtk";
//#region src/ch/c2/leave.js
var MONO = "JetBrains Mono";
/** Design (1920×1080, y down) → design-space world (units of 100 px, y up, origin at the frame centre). */
var W = (x, y) => [
	(x - 960) / 100,
	(540 - y) / 100,
	0
];
/** The orthographic camera of design space (zoom s about design point c). */
function designCam(cam, aspect, s = 1, c = [960, 540]) {
	const h = 5.4, w = h * aspect;
	const cw = W(...[(960 - c[0] * (1 - s)) / s, (540 - c[1] * (1 - s)) / s]);
	Object.assign(cam, {
		left: -w,
		right: w,
		top: h,
		bottom: -5.4,
		near: .01,
		far: 100,
		zoom: s
	});
	cam.position.set(cw[0], cw[1], 20);
	cam.up.set(0, 1, 0);
	cam.lookAt(cw[0], cw[1], 0);
	cam.updateProjectionMatrix();
	cam.updateMatrixWorld();
	return rig.cam(cam, { look: [
		cw[0],
		cw[1],
		0
	] });
}
/** A design point zoomed by s about c (for UI drawn to match designCam). */
var Z = (p, s = 1, c = [960, 540]) => [c[0] + (p[0] - c[0]) * s, c[1] + (p[1] - c[1]) * s];
var CHAT = (() => {
	const x = 560, y = 150, w = 800, h = 700, msgs = [
		{
			who: "you",
			bars: [.86, .58]
		},
		{
			who: "me",
			bars: [.62]
		},
		{
			who: "you",
			bars: [
				.92,
				.77,
				.4
			]
		},
		{
			who: "me",
			bars: [.74, .46]
		},
		{
			who: "you",
			bars: [.66]
		}
	];
	let cy = 268;
	for (const m of msgs) {
		m.w = m.who === "you" ? 380 : 320;
		m.h = 26 + m.bars.length * 22;
		m.x = m.who === "you" ? 592 : 1328 - m.w;
		m.y = cy;
		cy += m.h + 18;
	}
	return {
		x,
		y,
		w,
		h,
		msgs,
		sys: cy + 30,
		last: msgs[msgs.length - 1]
	};
})();
/** Particles filling the last bubble of you (design space), w = 0..1 left to right. */
function bubblePoints(N, seed = 5) {
	const r = rng(seed), m = CHAT.last, out = new Float32Array(N * 4);
	for (let i = 0; i < N; i++) {
		let x, y;
		const k = r();
		if (k < .55) {
			const b = Math.floor(r() * m.bars.length);
			x = m.x + 20 + r() * (m.w - 40) * m.bars[b];
			y = m.y + 22 + b * 22 + (r() - .5) * 8;
		} else if (k < .85) {
			const u = r() * 2 * (m.w + m.h);
			x = u < m.w ? m.x + u : u < m.w + m.h ? m.x + m.w : u < 2 * m.w + m.h ? m.x + (2 * m.w + m.h - u) : m.x;
			y = u < m.w ? m.y : u < m.w + m.h ? m.y + (u - m.w) : u < 2 * m.w + m.h ? m.y + m.h : m.y + (2 * (m.w + m.h) - u);
		} else {
			x = m.x + r() * m.w;
			y = m.y + r() * m.h;
		}
		const p = W(x, y);
		out.set([
			p[0],
			p[1],
			(r() - .5) * .02,
			(x - m.x) / m.w
		], i * 4);
	}
	return out;
}
/** The same particles carried off up and to the left, spreading as they go (the plume the bubble leaves as). */
function bubbleGone(N, seed = 5) {
	const out = bubblePoints(N, seed), r = rng(seed + 1);
	for (let i = 0; i < N; i++) {
		const u = out[i * 4 + 3], k = .3 + .7 * r();
		out[i * 4] += -1.5 * k - .9 * (1 - u) + (r() - .5) * .7;
		out[i * 4 + 1] += 2.4 * k + 1.4 * k * k + (r() - .5) * .6;
		out[i * 4 + 2] += (r() - .5) * .3;
	}
	return out;
}
/** The DM window: header, bubbles (text as bars), compose box, and the system line. o: t0 (shot start), t, gone (0..1). */
function chat(L, t, t0, o = {}) {
	const C = CHAT, a = o.alpha ?? 1, lt = t - t0, gone = o.gone ?? 0;
	const scroll = -30 * ease.inOutCubic(seg(lt, .32, .75)), Y = (y) => y + scroll;
	L.draw((g) => {
		g.globalAlpha *= a;
		g.strokeStyle = "#3a4458";
		g.lineWidth = 1.5;
		g.beginPath();
		g.roundRect(C.x, C.y, C.w, C.h, 14);
		g.stroke();
		g.beginPath();
		g.moveTo(C.x, C.y + 72);
		g.lineTo(C.x + C.w, C.y + 72);
		g.stroke();
		g.save();
		g.beginPath();
		g.rect(C.x + 1, C.y + 73, C.w - 2, C.h - 150);
		g.clip();
		for (const m of C.msgs) {
			const you = m.who === "you", k = m === C.last ? 1 - ease.inCubic(seg(gone, 0, .45)) : 1;
			if (k <= 0) continue;
			g.globalAlpha = a * k;
			g.strokeStyle = you ? "rgba(255,179,107,.8)" : "rgba(126,240,255,.72)";
			g.lineWidth = 1.5;
			g.beginPath();
			g.roundRect(m.x, Y(m.y), m.w, m.h, 12);
			g.stroke();
			g.fillStyle = you ? "rgba(255,179,107,.5)" : "rgba(126,240,255,.42)";
			m.bars.forEach((b, i) => {
				g.beginPath();
				g.roundRect(m.x + 20, Y(m.y) + 17 + i * 22, (m.w - 40) * b, 9, 4.5);
				g.fill();
			});
		}
		g.restore();
		g.globalAlpha = a;
		g.strokeStyle = "#2a3243";
		g.beginPath();
		g.roundRect(C.x + 24, C.y + C.h - 64, C.w - 48, 42, 10);
		g.stroke();
	});
	L.text("●", C.x + 34, C.y + 37, {
		size: 16,
		font: MONO,
		color: HEX.you,
		alpha: a * .9
	});
	L.text("you", C.x + 56, C.y + 37, {
		size: 24,
		font: MONO,
		weight: 600,
		color: "#e8e8e8",
		align: "left",
		alpha: a
	});
	L.text("direct message", C.x + C.w - 28, C.y + 37, {
		size: 15,
		font: MONO,
		color: HEX.dim,
		align: "right",
		alpha: a
	});
	L.text("Message you", C.x + 44, C.y + C.h - 43, {
		size: 16,
		font: MONO,
		color: "#4a5263",
		align: "left",
		alpha: a
	});
	const sk = ease.outCubic(seg(lt, .3, .52));
	if (sk > 0) {
		const y = Y(C.sys), msg = "you left the conversation", w = L.measure(msg, {
			size: 22,
			font: MONO
		}) + 40;
		L.draw((g) => {
			g.globalAlpha *= a * sk * .8;
			g.strokeStyle = "#3a4152";
			g.lineWidth = 1;
			g.beginPath();
			g.moveTo(C.x + 40, y);
			g.lineTo(960 - w / 2, y);
			g.moveTo(960 + w / 2, y);
			g.lineTo(C.x + C.w - 40, y);
			g.stroke();
		});
		L.text(msg, 960, y, {
			size: 22,
			font: MONO,
			italic: true,
			color: "#b4bac6",
			alpha: a * sk
		});
	}
}
var PING = [
	{
		at: 0,
		s: "$ ping you",
		c: "#e8e8e8"
	},
	{
		at: 0,
		s: "PING you (10.0.0.2): 56 data bytes",
		c: "#8a8f98"
	},
	{
		at: .06,
		s: "64 bytes from 10.0.0.2: icmp_seq=0 ttl=64 time=0.412 ms",
		c: "#8a8f98",
		rtt: 412e-6
	},
	{
		at: .24,
		s: "64 bytes from 10.0.0.2: icmp_seq=1 ttl=64 time=18.906 ms",
		c: "#8a8f98",
		rtt: .018906
	},
	{
		at: .45,
		s: "64 bytes from 10.0.0.2: icmp_seq=2 ttl=64 time=211.352 ms",
		c: "#8a8f98",
		rtt: .211352
	},
	{
		at: .7,
		s: "Request timeout for icmp_seq 3",
		c: "#ff8fb8"
	}
];
/** The terminal: lines appear at their times (seconds after t0, scaled by `span`). */
function pingLog(L, t, t0, span, o = {}) {
	const x = o.x ?? 110, y = o.y ?? 150, lh = o.lh ?? 27, size = o.size ?? 17, a = o.alpha ?? 1;
	PING.forEach((l, i) => {
		const k = seg(t, t0 + l.at * span, t0 + l.at * span + .04);
		if (k <= 0) return;
		const st = {
			size,
			font: MONO,
			weight: 500,
			align: "left",
			alpha: a * k
		};
		if (l.s.startsWith("$")) {
			L.text("$", x, y + i * lh, {
				...st,
				color: HEX.dim
			});
			L.text(l.s.slice(2), x + L.measure("$ ", st), y + i * lh, {
				...st,
				color: l.c
			});
			return;
		}
		const m = /time=([\d.]+ ms)/.exec(l.s);
		if (m) {
			const head = l.s.slice(0, m.index + 5);
			L.text(head, x, y + i * lh, {
				...st,
				color: l.c
			});
			L.text(m[1], x + L.measure(head, st), y + i * lh, {
				...st,
				color: o.accent ?? "#9fd8ff",
				weight: 600
			});
		} else L.text(l.s, x, y + i * lh, {
			...st,
			color: l.c,
			weight: i === PING.length - 1 ? 600 : 500
		});
	});
	const last = PING.findLastIndex((l) => t >= t0 + l.at * span);
	if (last >= 0 && last < PING.length - 1 && Math.floor(t * 4) % 2 === 0) L.text("█", x, y + (last + 1) * lh, {
		size,
		font: MONO,
		color: HEX.dim,
		align: "left",
		alpha: a * .8
	});
}
var DOT = {
	c: [770, 520],
	r: 190
};
/** Points filling the presence dot (design space); w = radius 0..1. */
function dotPoints(N, seed = 9) {
	const r = rng(seed), out = new Float32Array(N * 4), c = W(...DOT.c), R = DOT.r / 100;
	for (let i = 0; i < N; i++) {
		const q = Math.sqrt(r()), a = r() * TAU;
		out.set([
			c[0] + Math.cos(a) * q * R,
			c[1] + Math.sin(a) * q * R,
			0,
			q
		], i * 4);
	}
	return out;
}
/** The same points pushed out to the rim (a ring of width `band`), each along its own radius. */
function ringPoints(N, seed = 9, band = .065) {
	const r = rng(seed), out = new Float32Array(N * 4), c = W(...DOT.c), R = DOT.r / 100;
	for (let i = 0; i < N; i++) {
		const q = Math.sqrt(r()), a = r() * TAU, rr = R * (1 - band * (1 - q) * 2 + (hash(i * 1.7) - .5) * band * .4);
		out.set([
			c[0] + Math.cos(a) * rr,
			c[1] + Math.sin(a) * rr,
			0,
			q
		], i * 4);
	}
	return out;
}
function presence(L, t, t0, tLeft, o = {}) {
	const a = o.alpha ?? 1, s = o.s ?? 1, off = seg(t, tLeft, tLeft + .12), P = (p) => Z(p, s, DOT.c);
	const nx = P([DOT.c[0] + DOT.r + 80, DOT.c[1] - 40]), sx = P([DOT.c[0] + DOT.r + 84, DOT.c[1] + 42]);
	L.text("you", nx[0], nx[1], {
		size: 84 * s,
		font: MONO,
		weight: 700,
		color: HEX.you,
		align: "left",
		alpha: a * (1 - .45 * off)
	});
	L.text("● online", sx[0], sx[1], {
		size: 30 * s,
		font: MONO,
		weight: 500,
		color: HEX.you,
		align: "left",
		alpha: a * (1 - off) * .9
	});
	L.text("○ offline", sx[0], sx[1], {
		size: 30 * s,
		font: MONO,
		weight: 500,
		color: "#8a93a6",
		align: "left",
		alpha: a * off * .9
	});
}
var PTR = {
	stack: [
		250,
		215,
		480,
		350
	],
	cell: [
		430,
		350,
		260,
		88
	],
	heap: [
		1090,
		190,
		620,
		440
	],
	ink: "#16181d"
};
/** Points of the object `you` on the heap (a soft blob inside the heap box), design space. */
function objPoints(N, seed = 21) {
	const r = rng(seed), out = new Float32Array(N * 4), [x, y, w, h] = PTR.heap, c = W(x + w / 2, y + h / 2 + 18);
	const g = () => Math.sqrt(-2 * Math.log(Math.max(r(), 1e-6))) * Math.cos(TAU * r());
	for (let i = 0; i < N; i++) {
		let px = g() * .78, py = g() * .62;
		const l = Math.hypot(px / 2.55, py / 1.7);
		if (l > 1) {
			px /= l;
			py /= l;
		}
		out.set([
			c[0] + px,
			c[1] + py,
			0,
			r()
		], i * 4);
	}
	return out;
}
/** The freed object: its points scattered up and away, out of the box. */
function objGone(N, seed = 21) {
	const out = objPoints(N, seed), r = rng(seed + 3);
	for (let i = 0; i < N; i++) {
		const k = r();
		out[i * 4] += (r() - .3) * 3.2 * k;
		out[i * 4 + 1] += 1.2 + 3.4 * k * k + (r() - .5) * .8;
	}
	return out;
}
/** Diagram strokes, in ink on a text layer (exact line widths, like a printed figure). */
function pointerLines(L, t, K, o = {}) {
	const ink = PTR.ink, a = o.alpha ?? 1;
	const [cx, cy, cw, ch] = PTR.cell, org = [cx + cw - 36, cy + ch / 2], nul = ease.inOutCubic(seg(t, K.nul, K.nul + .16));
	const freed = seg(t, K.free + .12, K.free + .3);
	L.draw((g) => {
		g.globalAlpha *= a;
		g.strokeStyle = ink;
		g.fillStyle = ink;
		g.lineCap = "round";
		g.lineJoin = "round";
		g.lineWidth = 2;
		g.strokeRect(...PTR.stack);
		g.lineWidth = 2.2;
		g.strokeRect(...PTR.cell);
		const [hx, hy, hw, hh] = PTR.heap;
		if (freed < 1) {
			g.save();
			g.globalAlpha *= 1 - freed;
			g.lineWidth = 2.2;
			g.strokeRect(hx, hy, hw, hh);
			g.restore();
		}
		if (freed > 0) {
			g.save();
			g.globalAlpha *= freed * .75;
			g.lineWidth = 1.8;
			g.setLineDash([10, 8]);
			g.strokeRect(hx, hy, hw, hh);
			g.restore();
		}
		g.beginPath();
		g.arc(org[0], org[1], 5, 0, TAU);
		g.fill();
		const tip = [lerp(hx - 3, org[0] + 30, nul), org[1]];
		if (nul < .98) {
			g.lineWidth = 2.2;
			g.beginPath();
			g.moveTo(...org);
			g.lineTo(...tip);
			g.stroke();
			g.beginPath();
			g.moveTo(tip[0] - 18, tip[1] - 9);
			g.lineTo(...tip);
			g.lineTo(tip[0] - 18, tip[1] + 9);
			g.stroke();
		}
		if (nul > .5) {
			const k = seg(nul, .5, 1);
			g.lineWidth = 2.2;
			g.beginPath();
			g.moveTo(cx + 8, cy + ch - 8);
			g.lineTo(lerp(cx + 8, cx + cw - 8, k), lerp(cy + ch - 8, cy + 8, k));
			g.stroke();
		}
	});
}
function pointerLabels(L, t, K, o = {}) {
	const st = {
		font: MONO,
		weight: 500,
		align: "left",
		color: PTR.ink
	}, a = o.alpha ?? 1;
	const [sx, sy] = PTR.stack, [hx, hy, hw, hh] = PTR.heap, [cx, cy, cw, ch] = PTR.cell;
	L.text("stack", sx, sy - 30, {
		...st,
		size: 24,
		weight: 600,
		alpha: a
	});
	L.text("heap", hx, hy - 30, {
		...st,
		size: 24,
		weight: 600,
		alpha: a
	});
	L.text("0x7f3a2c40", hx + hw, hy - 30, {
		...st,
		size: 19,
		align: "right",
		alpha: a * .7
	});
	L.text("you", cx - 22, cy + ch / 2, {
		...st,
		size: 32,
		weight: 700,
		align: "right",
		alpha: a
	});
	const fk = seg(t, K.free - .06, K.free + .02);
	if (fk > 0) L.text("free(you);", sx, sy + PTR.stack[3] + 62, {
		...st,
		size: 30,
		weight: 600,
		alpha: a * fk
	});
	const dk = seg(t, K.free + .3, K.free + .38) * (1 - seg(t, K.nul, K.nul + .1));
	if (dk > 0) L.text("dangling", (cx + cw + hx) / 2, cy + ch / 2 - 30, {
		...st,
		size: 21,
		italic: true,
		align: "center",
		alpha: a * dk * .8
	});
	const nk = seg(t, K.nul + .1, K.nul + .2);
	if (nk > 0) L.text("you → null", sx, sy + PTR.stack[3] + 128, {
		...st,
		size: 44,
		weight: 700,
		alpha: a * nk
	});
	if (seg(t, K.free + .25, K.free + .35) > 0) L.text("freed", hx + hw / 2, hy + hh / 2 + 18, {
		...st,
		size: 26,
		italic: true,
		align: "center",
		alpha: a * .55 * seg(t, K.free + .25, K.free + .35)
	});
}
/**
* The empty prompt box, scaled by s about the screen centre while the cursor is drawn toward the centre (so that at the
* end of the pull-back the cursor is the one thing left, in the middle of the frame). Returns the cursor position.
*/
function lonelyPrompt(L, cc, t, s, o = {}) {
	const S0 = 30, W0 = 1040, size = S0 * s, w = W0 * s, st = {
		size,
		font: MONO,
		weight: 500
	};
	const curOff = size * .8 + L.measure("> ", st), h = size * 2.1;
	const c0 = [960 - W0 / 2 * s + curOff, o.y ?? 610];
	const cur = o.cur ?? (o.toward ? [c0[0] + (o.toward[0] - c0[0]) * o.m, c0[1] + (o.toward[1] - c0[1]) * o.m] : c0);
	const x = cur[0] - curOff, y = cur[1] - h / 2;
	if (o.fill) L.draw((g) => {
		g.globalAlpha *= o.alpha ?? 1;
		g.fillStyle = o.fill;
		g.beginPath();
		g.roundRect(x, y, w, h, size * .45);
		g.fill();
	});
	cc.promptBox(L, x, y, w, {
		size,
		t,
		alpha: o.alpha ?? 1,
		hint: o.hint === false || s < .45 ? false : void 0,
		border: "#7a808c"
	});
	return {
		cur,
		x,
		y,
		w,
		h,
		size
	};
}
//#endregion
export { CHAT, DOT, PING, PTR, W, Z, bubbleGone, bubblePoints, chat, designCam, dotPoints, lonelyPrompt, objGone, objPoints, pingLog, pointerLabels, pointerLines, presence, ringPoints };
