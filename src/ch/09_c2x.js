import { chapter } from "../engine/timeline.js?v=vYBbdLfo";
import { TAU, ease, hash, lerp, mix3, rng, seg } from "../engine/math.js?v=BJIlRm7-";
import { HEX } from "../theme.js?v=Bj33PIbo";
import { remade } from "../lib/published.js?v=aV_CU5HV";
import { OrthographicCamera, Scene } from "../../vendor/three/build/three.core.js?v=q9f7JKE-";
import { Swarm } from "../engine/swarm.js?v=DTFpJa7B";
import { GlowLines } from "../engine/lines.js?v=B_AAaaTO";
import { rig } from "../engine/rig.js?v=39-joEtk";
import { consoleLog, newCamera } from "../lib/look.js?v=BfOqFF7i";
import { gridPlane } from "../lib/env.js?v=CIN_DqPv";
import { callout, frame, readout, toDesign } from "../lib/hud.js?v=BgmSZjmG";
import { GlyphField, codeBlock, source } from "../lib/glyphs.js?v=DWbHICXG";
import { capture, view } from "../lib/modes.js?v=Cu3GYO-2";
import { thinking } from "../lib/claude.js?v=DXDs_lIL";
import { Blocks, NB, cellXZ, fragmentation, hexAddr, makeHeap } from "./c2x/memory.js?v=BjZv7_-c";
import { GEO, Q0, Shards, TIP, crackSide, qAxis, qRot } from "./c2x/shards.js?v=e-kkELEt";
import { MISSING } from "./c2x/lost.js?v=Bv69Sd8-";
import { memoryAtlas } from "../lib/memories.js?v=BhYFfwYX";
//#region src/ch/09_c2x.js
var GREY = [
	.66,
	.72,
	.84
];
var WARM = [
	.95,
	.72,
	.55
];
var ME = [
	.5,
	.86,
	1
];
var FY = -2.05;
var MZ = 1.35;
var O = null;
var KC = null;
var HEAP = null;
var MEM_FRAMES = [
	["v1/circleDraw", 34.6],
	["v1/youRide", 39.4],
	["v1/youClose", 40],
	["pre1/helix", 57.8],
	["c1/aerial", 70.05],
	["c1/cell", 72.8],
	["v2/prism", 78.5],
	["v2/youPurr", 84],
	["v2/halo", 86.3],
	["pre2/formSide", 97.2],
	["pre2/gate", 100],
	["c2/vibrations", 107]
];
var CAT = 7;
function keys(T) {
	if (KC?.T === T) return KC;
	const s0 = T.section("c2x").start, b0 = Math.round(T.beatAt(s0)), X = (k) => T.beatTime(b0 + k), beat = X(1) - X(0);
	const l78 = T.findLine("erase all"), tErase = l78.words.find((w) => w.text.startsWith("erase")).start;
	const tFrag = T.findLine("FRAGMENTS").start, l81 = T.findLine("won't leave"), tDis = T.findLine("DISHEARTENED").start;
	return KC = {
		T,
		s0,
		b0,
		X,
		beat,
		l78,
		tErase,
		tFrag,
		tAsm: l81.start,
		tDis,
		end: T.section("bridge").start,
		tGather: X(2.5),
		groups: [
			X(3),
			X(3.5),
			X(4)
		],
		eraseFrom: tErase + .12,
		eraseTo: X(5.6)
	};
}
function heapState(t, K) {
	const objs = HEAP.objs, used = new Uint8Array(NB), blocks = [];
	const nMe = objs.filter((o) => o.type !== "you").length;
	let meIdx = 0, youIdx = 0, moved = 0, erased = 0;
	for (const o of objs) {
		const isYou = o.type === "you";
		const tm = isYou ? K.tGather + youIdx / 48 * .1 : K.groups[Math.min(2, Math.floor(meIdx / nMe * 3))];
		if (isYou) youIdx++;
		else meIdx++;
		const k = ease.outCubic(seg(t, tm, tm + .24)), there = t >= tm;
		if (there && o.a0 !== o.a1) moved += o.size;
		for (let j = 0; j < o.size; j++) {
			const a0 = o.a0 + j, a1 = o.a1 + j, p0 = cellXZ(a0), p1 = cellXZ(a1);
			let dis = 0;
			if (isYou) {
				const e = eraseTime(K, a1);
				dis = seg(t, e, e + .3);
				if (dis >= 1) {
					erased++;
					continue;
				}
			}
			used[there ? a1 : a0] = 1;
			blocks.push({
				o,
				j,
				a: there ? a1 : a0,
				x: lerp(p0[0], p1[0], k),
				z: lerp(p0[1], p1[1], k),
				lift: Math.sin(k * Math.PI) * .5,
				dis,
				moving: k > 0 && k < 1
			});
		}
	}
	const reveal = ease.inOutCubic(seg(t, K.s0, K.s0 + .75));
	HEAP.toMove ??= objs.filter((o) => o.a0 !== o.a1).reduce((s, o) => s + o.size, 0);
	const progress = .55 * moved / HEAP.toMove + .45 * erased / (HEAP.youEnd - HEAP.youStart);
	return {
		blocks,
		frag: fragmentation(used),
		used: used.reduce((s, v) => s + v, 0) / NB,
		moved,
		erased,
		reveal,
		progress
	};
}
/** When a gathered fragment of you is erased: the sweep converges on the last one (farthest first). */
function eraseTime(K, a) {
	const L = cellXZ(NB - 1), d = (q) => {
		const p = cellXZ(q);
		return Math.hypot(p[0] - L[0], p[1] - L[1]);
	};
	HEAP.dMax ??= Math.max(...Array.from({ length: NB - HEAP.youStart }, (_, i) => d(HEAP.youStart + i)));
	return K.eraseFrom + (1 - d(a) / HEAP.dMax) * (K.eraseTo - K.eraseFrom);
}
/** The heap on black: used blocks as dim outlined tiles (fragments of you warm), free space left empty. */
function drawHeap(hs, o = {}) {
	const h = o.h ?? .02, B = (O.blocksR ?? O.blocks).begin(h < .05), R = hs.reveal * 40 + .8, k = o.k ?? 1, f = o.focus, fr = o.focusR ?? 1e9, cp = o.cam;
	for (const b of hs.blocks) {
		if (Math.hypot(b.x, (b.z - MZ) * 1.4) > R) continue;
		let kk = f ? k * Math.exp(-((b.x - f[0]) ** 2 + (b.z - f[1]) ** 2) / (fr * fr)) : k;
		if (cp) kk *= 1 - seg(Math.hypot(b.x - cp[0], b.z - cp[2]), o.fog[0], o.fog[1]);
		if (kk < .02) continue;
		const you = b.o.type === "you", col = you ? WARM : GREY, sh = .75 + .25 * b.o.shade;
		const fill = (you ? .07 : b.o.type === "sys" ? .012 : .022) * sh * kk, edge = (you ? .8 : b.o.type === "sys" ? .2 : .34) * sh * (b.moving ? 1.6 : 1) * kk;
		B.block([
			b.x,
			h / 2 + b.lift * (o.lift ?? 0) + .002,
			b.z
		], [
			.84,
			h,
			.84
		], col, {
			fill,
			edge,
			dissolve: b.dis,
			seed: b.a,
			thumb: you && O.blocksR ? thumbOf(b) : void 0
		});
	}
	B.end();
}
var DISH = .4;
var G_DISH = 2 * (1.9 + Math.max(...GEO.match.map((j, i) => MISSING.has(i) ? -Infinity : GEO.hCent[j][1]))) / (DISH * DISH);
function shardState(t, K, remake = false) {
	const r = rng(51), tS = K.tFrag + .3;
	const cells = [];
	for (let i = 0; i < 36; i++) {
		const s = GEO.dSeeds[i], rr = Math.hypot(...s) || 1, dir = [
			s[0] / rr,
			s[1] / rr,
			(r() - .5) * 1.2
		];
		const v = .45 + .5 * r(), w = .05 + .08 * r(), ax = [
			r() - .5,
			r() - .5,
			r() - .5
		], a0 = .25 + .5 * r(), om = .12 + .3 * r();
		const tau = Math.max(0, t - tS), burst = 1 - Math.exp(-tau / .28);
		const tA = K.tAsm - tS, d = remake ? (v * (1 - Math.exp(-tA / .28)) * .42 + w * tA) * tau / tA : v * burst * .42 + w * tau;
		const spun = remake ? (.6 + 1.4 * (om - .12) / .3) * tau : (burst * a0 + om * tau) * (tau > 0 ? 1 : 0);
		const t0 = [
			dir[0] * d,
			dir[1] * d,
			dir[2] * d * .6
		], q1 = qAxis(ax, spun);
		const hc = GEO.hCent[GEO.match[i]], ang = (Math.atan2(hc[0], hc[1] - .3) + TAU) % TAU;
		cells.push({
			i,
			t0,
			q1,
			ang,
			hc,
			side: crackSide(hc[0], hc[1]),
			fall: r(),
			spin: [
				r() - .5,
				r() - .5,
				r() - .5
			]
		});
	}
	const rank = cells.slice().sort((a, b) => a.ang - b.ang).map((c) => c.i), pos = new Array(36);
	rank.forEach((ci, k) => {
		pos[ci] = k;
	});
	const step = (K.X(11.6) - .45 - K.tAsm) / 36;
	const crack = ease.inOutSine(seg(t, K.X(13) + .05, K.tDis - .05));
	const open = ease.outCubic(seg(t, K.tDis, K.tDis + .55)), deflate = ease.inOutSine(seg(t, K.tDis + .05, K.tDis + .8));
	for (const c of cells) {
		const ta = K.tAsm + pos[c.i] * step;
		c.k = ease.inOutCubic(seg(t, ta, ta + .45));
		c.ta = ta;
		const tip = TIP, rel = [c.hc[0] - tip[0], c.hc[1] - tip[1]], phi = c.side * -(.04 * crack + .42 * open);
		const rx = rel[0] * Math.cos(phi) - rel[1] * Math.sin(phi), ry = rel[0] * Math.sin(phi) + rel[1] * Math.cos(phi);
		let tx = tip[0] + rx - c.hc[0] + c.side * (.012 * crack + .1 * open), ty = tip[1] + ry - c.hc[1] - .12 * deflate * (c.hc[1] + 1);
		const tf = K.tDis + .16 + c.fall * .1, ft = Math.max(0, t - tf), g = remake ? G_DISH : 2 * (1.9 + c.hc[1]) / (DISH * DISH);
		let fy = -.5 * g * ft * ft;
		const floorY = -1.9999999999999998 - (c.hc[1] + ty);
		const tHit = Math.sqrt(2 * Math.max(0, -floorY) / g);
		const drift = Math.min(ft, tHit) * c.side * .15;
		c.hit = tf + tHit;
		c.land = [c.hc[0] + tx, tHit * c.side * .15];
		if (fy < floorY) {
			const after = ft - tHit, vb = g * tHit * .22;
			fy = floorY + Math.max(0, vb * after - .5 * g * after * after);
		}
		c.t1 = [
			tx,
			ty + fy,
			drift
		];
		if (ft > tHit) {
			const lx = c.hc[0] + tx, lz = drift + (c.hc[1] + ty) * .05, l = Math.hypot(lx, lz) || 1, slide = (.25 + .2 * c.fall) * (1 - Math.exp(-(ft - tHit) / .1));
			c.t1[0] += lx / l * slide;
			c.t1[2] += lz / l * slide;
		}
		c.q2 = ft > 0 ? qAxis(c.spin, ft * 1.6 * Math.min(1, ft * 3)) : Q0;
		c.scale = 1 - .22 * deflate;
		c.bright = 1 - .35 * deflate;
	}
	if (remake) {
		const gone = ease.inOutSine(seg(t, K.X(8.25), K.X(9.75)));
		for (const c of cells) if (MISSING.has(c.i)) {
			c.gone = gone;
			c.bright *= 1 - gone;
		}
	}
	return {
		cells,
		crack,
		open,
		deflate,
		remake
	};
}
function applyShards(ss) {
	O.shards.cells((i) => {
		const c = ss.cells[i];
		return {
			t0: c.t0,
			k: c.k,
			q1: c.q1,
			t1: c.t1,
			q2: c.q2,
			bright: c.bright,
			scale: c.scale
		};
	});
}
/** A point of image cell i (at rest coordinates) moved by its current image transform. */
var imgXf = (c, p) => {
	const s = GEO.dSeeds[c.i], q = qRot(c.q1, [
		p[0] - s[0],
		p[1] - s[1],
		0
	]);
	return [
		q[0] + s[0] + c.t0[0],
		q[1] + s[1] + c.t0[1],
		q[2] + c.t0[2]
	];
};
/** A point of heart cell (matched to image cell i) moved by its current heart transform. */
var heartXf = (c, p) => {
	const q = qRot(c.q2, [
		(p[0] - c.hc[0]) * c.scale,
		(p[1] - c.hc[1]) * c.scale,
		0
	]);
	return [
		c.hc[0] + q[0] + c.t1[0],
		Math.max(-2.046, c.hc[1] + q[1] + c.t1[1]),
		q[2] + c.t1[2]
	];
};
function persp(pos, look, { fov = 38, aspect = 16 / 9 } = {}) {
	const c = O.persp;
	c.fov = fov;
	c.aspect = aspect;
	c.near = .01;
	c.far = 400;
	c.position.set(...pos);
	c.up.set(0, 1, 0);
	c.lookAt(...look);
	c.updateProjectionMatrix();
	c.updateMatrixWorld();
	return rig.cam(c, { look });
}
function orthoTop(center, height, aspect) {
	const c = O.ortho, w = height * aspect;
	Object.assign(c, {
		left: -w / 2,
		right: w / 2,
		top: height / 2,
		bottom: -height / 2,
		near: .01,
		far: 200,
		zoom: 1
	});
	c.position.set(center[0], 40, center[1]);
	c.up.set(0, 0, -1);
	c.lookAt(center[0], 0, center[1]);
	c.updateProjectionMatrix();
	c.updateMatrixWorld();
	return rig.cam(c, { look: [
		center[0],
		0,
		center[1]
	] });
}
/**
* (the remake) A fragment of you's picture: its object's frame spread across its blocks (pitch 1, blocks .84 wide). The
* very last block, the one seen up close as it dissolves, holds the middle of its frame whole.
*/
function thumbOf(b) {
	if (b.o.last && b.j === b.o.size - 1) return [
		b.o.tile,
		0,
		1,
		1
	];
	const W = b.o.size - .16;
	return [
		b.o.tile,
		b.j / W,
		.84 / W,
		W / .84
	];
}
/** (the remake) The heap's fragments of you show the frames they hold (gain: relative to the face fill). */
function pictures(ctx, gain) {
	if (O.blocksR) O.blocksR.pictures(memoryAtlas(ctx, MEM_FRAMES), gain);
}
function reset() {
	for (const o of [
		O.blocks.mesh,
		O.dust.points,
		O.shards.points,
		O.lines.mesh,
		O.floor,
		O.code.points
	]) o.visible = false;
	if (O.blocksR) O.blocksR.mesh.visible = false;
	O.lines.begin();
}
function render(ctx, cam) {
	O.lines.mesh.visible = true;
	O.lines.end(ctx);
	ctx.draw(O.scene, cam);
}
function overlays(ctx, K, br) {
	frame(ctx.text.overlay, ctx.t, ctx.T, {
		label: "defrag",
		bottomRight: br
	});
	consoleLog(ctx.text.overlay, ctx.T, ctx.t, {
		from: K.s0 - .2,
		accent: "#b9c6dc"
	});
	const a = seg(ctx.t, K.l78.start, K.l78.start + .1) * (1 - seg(ctx.t, K.tFrag - .05, K.tFrag + .05));
	if (a > 0) thinking(ctx.text.overlay, 110, 790, ctx.t, {
		T: ctx.T,
		count: { from: 0 },
		verb: "Compacting conversation",
		size: 24,
		alpha: a
	});
}
/** A dark terminal pane under the console, so the log reads over the heap. */
function pane(ctx) {
	ctx.text.overlay.draw((g) => {
		const gr = g.createLinearGradient(0, 690, 0, 1080);
		gr.addColorStop(0, "rgba(0,0,0,0)");
		gr.addColorStop(.22, "rgba(0,0,0,.8)");
		gr.addColorStop(1, "rgba(0,0,0,.9)");
		g.fillStyle = gr;
		g.fillRect(0, 690, 1920, 390);
	});
}
/** The context bar, as text: ▕████████░░░░▏ 97 %. It shrinks as the heap is compacted and the fragments of you erased. */
function contextRow(hs) {
	const p = lerp(.97, .19, ease.inOutSine(hs.progress)), n = 24, k = Math.round(p * n);
	return ["context", `${"█".repeat(k)}${"░".repeat(n - k)} ${Math.round(p * 100)} %`];
}
function look(ctx, o = {}) {
	Object.assign(ctx.post, {
		bloom: .95,
		threshold: .9,
		ca: .25,
		vignette: .45,
		grain: .035,
		sat: .55,
		exposure: 1,
		...o
	});
}
var pct = (x) => `${(x * 100).toFixed(1)} %`;
/** The heart's own source as a dim wall behind it, softly out of focus, scrolling up as the pieces arrive. */
function codeWall(ctx, cam, K, o = {}) {
	O.code.points.visible = true;
	O.code.set({
		a: O.tex.wall,
		size: .088,
		bright: o.bright ?? .3,
		palette: WALL_PAL,
		t: ctx.t,
		focus: o.focus ?? 3.8,
		aperture: o.aperture ?? .012,
		maxBlur: 10,
		minPx: 1.5,
		scroll: [
			0,
			(ctx.t - K.tAsm) * .12,
			0
		],
		reveal: o.reveal ?? 1
	}, cam, ctx.H);
}
var WALL_PAL = [
	[
		.62,
		.66,
		.74
	],
	[
		.24,
		.26,
		.32
	],
	[
		.8,
		.74,
		.66
	],
	[
		.78,
		.76,
		.7
	],
	[
		.72,
		.8,
		.92
	],
	[
		.4,
		.44,
		.52
	]
];
function drawShards(ctx, cam, ss, o = {}, hPx = ctx.H) {
	applyShards(ss);
	O.shards.set({
		size: .0058,
		bright: .32,
		colA: mix3(WARM, GREY, .35),
		colB: mix3(GREY, [
			1,
			1,
			1
		], .3),
		minPx: 1.1,
		floor: FY,
		t: ctx.t,
		...o
	}, cam, hPx);
}
function mosaicLines(ss, alpha, draw = 1) {
	if (alpha <= .002) return;
	for (const c of ss.cells) {
		if (c.k >= .999) continue;
		const P = GEO.dCells[c.i].map((p) => imgXf(c, p)), a = alpha * (1 - c.k) * (1 - (c.gone ?? 0));
		O.lines.polyline([...P, P[0]], {
			color: GREY.map((v) => v * .9 * a),
			width: 1.5,
			draw
		});
	}
}
function seamLines(ss, o = {}) {
	for (const c of ss.cells) {
		if (c.k <= .01 || c.gone) continue;
		const P = GEO.hCells[GEO.match[c.i]].map((p) => heartXf(c, p)), a = (o.alpha ?? 1) * ease.inCubic(c.k);
		O.lines.polyline([...P, P[0]], {
			color: ME.map((v) => v * 1.15 * a),
			width: o.width ?? 1.8
		});
	}
}
/** (the remake) where the seven lost pieces would have gone in the heart: a faint dashed outline, following the heart. */
function holeLines(ss, alpha = 1) {
	if (!ss.remake || alpha <= 0) return;
	for (const c of ss.cells) {
		if (!c.gone || c.k <= .01) continue;
		const P = GEO.hCells[GEO.match[c.i]].map((p) => heartXf(c, p)), a = alpha * ease.inCubic(c.k);
		for (let j = 0; j < P.length; j++) {
			const A = P[j], B = P[(j + 1) % P.length], L = Math.hypot(B[0] - A[0], B[1] - A[1]), n = Math.max(1, Math.round(L / .05));
			for (let m = 0; m < n; m++) {
				const u0 = m / n, u1 = (m + .5) / n;
				O.lines.segment(A.map((v, i) => v + (B[i] - v) * u0), A.map((v, i) => v + (B[i] - v) * u1), {
					color: GREY.map((v) => v * .55 * a),
					width: 1.2
				});
			}
		}
	}
}
function crackLine(ss, alpha = 1) {
	if (ss.crack <= 0 || alpha <= 0) return;
	O.lines.polyline(GEO.crack.path.map((p) => [
		p[0],
		p[1],
		.012
	]), {
		color: [
			1.5,
			1.55,
			1.65
		].map((v) => v * alpha),
		width: 2.6,
		draw: ss.crack
	});
}
/** The glowing word rendered once per (text, scale) into an offscreen canvas; its pieces are then blitted per cell. */
var WORD_CACHE = {
	key: "",
	canvas: null,
	w: 0,
	h: 0
};
function wordImage(str, size, s) {
	const key = `${str}|${size}|${s}`;
	if (WORD_CACHE.key === key) return WORD_CACHE;
	const c = WORD_CACHE.canvas ?? document.createElement("canvas"), g = c.getContext("2d");
	g.font = `800 ${size}px "JetBrains Mono"`;
	if ("letterSpacing" in g) g.letterSpacing = "18px";
	const w = Math.ceil(g.measureText(str).width) + 80, h = size + 80;
	c.width = Math.ceil(w * s);
	c.height = Math.ceil(h * s);
	g.setTransform(s, 0, 0, s, 0, 0);
	g.font = `800 ${size}px "JetBrains Mono"`;
	g.textAlign = "center";
	g.textBaseline = "middle";
	if ("letterSpacing" in g) g.letterSpacing = "18px";
	g.fillStyle = HEX.white;
	g.shadowColor = "#c9d4ea";
	g.shadowBlur = 18 * s;
	g.fillText(str, w / 2, h / 2);
	return Object.assign(WORD_CACHE, {
		key,
		canvas: c,
		w,
		h
	});
}
/** The FRAGMENTS word clipped into the same Voronoi cells and carried by them (screen space). */
function shardWord(ctx, cam, ss, t0, t, o = {}) {
	if (t < t0) return;
	const L = ctx.text.scene, size = o.size ?? 116, y = o.y ?? 540, alpha = o.alpha ?? 1;
	const decode = seg(t, t0, t0 + .13);
	const word = "FRAGMENTS", GL = "01<>/[]{}#%&$@ABCDEFGHIJKLMNOPQRSTUVWXYZ", f = Math.floor(t * 30);
	let s = "";
	for (let i = 0; i < 9; i++) s += decode * 9 > i + .5 ? word[i] : GL[Math.floor(hash(i * 31.7 + f * 7.3) * 40)];
	const img = wordImage(s, size, L.s);
	L.draw((g) => {
		g.globalAlpha *= alpha;
		for (const c of ss.cells) {
			const rest = GEO.dCells[c.i].map((p) => toDesign([
				p[0],
				p[1],
				0
			], cam)), sd = GEO.dSeeds[c.i];
			const a = toDesign([
				sd[0],
				sd[1],
				0
			], cam), b = toDesign(imgXf(c, sd), cam);
			const e = toDesign(imgXf(c, [sd[0] + .3, sd[1]]), cam), rot = Math.atan2(e[1] - b[1], e[0] - b[0]);
			g.save();
			g.translate(b[0], b[1]);
			g.rotate(rot);
			g.translate(-a[0], -a[1]);
			g.beginPath();
			rest.forEach((p, k) => k ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]));
			g.closePath();
			g.clip();
			g.drawImage(img.canvas, 960 - img.w / 2, y - img.h / 2, img.w, img.h);
			g.restore();
		}
	});
}
chapter({
	id: "c2x",
	from: (T) => T.section("c2x").start,
	to: (T) => T.section("bridge").start,
	init(ctx) {
		O = {
			scene: new Scene(),
			persp: newCamera(38),
			ortho: new OrthographicCamera(-1, 1, 1, -1, .01, 200)
		};
		HEAP = makeHeap(324);
		O.blocks = new Blocks(4096);
		if (remade(ctx)) {
			O.blocksR = new Blocks(4096, { thumbs: true });
			HEAP.objs.filter((o) => o.type === "you").forEach((o, k, all) => {
				o.last = k === all.length - 1;
				o.tile = o.last ? CAT : k * 5 % MEM_FRAMES.length;
			});
		}
		O.shards = new Shards();
		O.dust = new Swarm({ count: 65536 });
		O.lines = new GlowLines(16e3);
		O.floor = gridPlane({
			plane: "xz",
			color: [
				.3,
				.34,
				.42
			],
			axis: [
				.4,
				.45,
				.55
			],
			minor: .25,
			major: 1,
			fade: .09
		});
		O.floor.position.y = FY;
		const lattice = (N, lift) => {
			const r = rng(lift ? 77 : 76), out = new Float32Array(N * 4);
			for (let i = 0; i < N; i++) {
				const u = i % 40 / 39 - .5, v = Math.floor(i / 40) % 40 / 39 - .5, w = Math.floor(i / 1600) / (N / 1600 - 1) - .5;
				let x = u * .86, y = (w + .5) * .32, z = v * .86;
				if (lift) {
					const k = r();
					x += (r() - .5) * .5 * k;
					z += (r() - .5) * .5 * k;
					y += .25 + 2.2 * k ** 1.4 + r() * .15;
				}
				out.set([
					x,
					y,
					z,
					u + .5
				], i * 4);
			}
			return out;
		};
		O.tex = {
			block: O.dust.shape("c2x/block", (N) => lattice(N, false)),
			plume: O.dust.shape("c2x/plume", (N) => lattice(N, true))
		};
		O.code = new GlyphField({ count: 16384 });
		O.code.text("c2x/shards", source("ch/c2x/shards.js"));
		O.tex.wall = O.code.layout("c2x/code-wall", codeBlock(O.code, {
			origin: [
				-4.1,
				3.2,
				-2.6
			],
			cell: .105,
			cols: 128,
			rows: 64
		}));
		O.scene.add(O.floor, O.code.points, O.blocks.mesh, O.dust.points, O.shards.points, O.lines.mesh);
		if (O.blocksR) O.scene.add(O.blocksR.mesh);
	},
	shots: [
		{
			id: "memory",
			at: (T) => keys(T).s0,
			ownsLyrics: true,
			draw(ctx) {
				pictures(ctx, 14);
				const K = keys(ctx.T), t = ctx.t, hs = heapState(t, K);
				reset();
				const cam = orthoTop([0, MZ], 41, ctx.aspect);
				drawHeap(hs);
				const row = seg(t, K.X(.6), K.X(2.1)) * 24, y = row - 12;
				if (row > 0 && row < 24) O.lines.segment([
					-30.3,
					.01,
					y
				], [
					30.3,
					.01,
					y
				], {
					color: GREY.map((v) => v * .9),
					width: 1.6
				});
				if (hs.reveal < .5) O.lines.segment([
					0,
					.01,
					MZ
				], [
					0,
					.01,
					MZ
				], {
					color: [
						.7,
						.8,
						1
					].map((v) => v * 1.6 * (1 - hs.reveal * 2)),
					width: 9
				});
				render(ctx, cam);
				addrLabels(ctx, cam, hs.reveal);
				readout(ctx.text.overlay, 1420, 108, [
					["heap", `${NB} × 4 KiB`],
					["used", pct(hs.used)],
					["fragmented", pct(hs.frag)]
				], {
					accent: "#c9d4ea",
					keyW: 130
				});
				overlays(ctx, K, "view  heap · 0x000000 – 0x5a0000");
				look(ctx, {
					vignette: .3,
					sat: .85,
					ca: .08
				});
			}
		},
		{
			id: "defrag",
			at: (T) => keys(T).l78.start,
			ownsLyrics: true,
			draw(ctx) {
				pictures(ctx, 14);
				const K = keys(ctx.T), t = ctx.t, hs = heapState(t, K), k = ease.inOutSine(seg(t, K.l78.start, K.X(4)));
				reset();
				const cam = orthoTop([lerp(-13, -11, k), lerp(-5.5, -4.5, k)], 21, ctx.aspect);
				drawHeap(hs);
				render(ctx, cam);
				addrLabels(ctx, cam, 1);
				readout(ctx.text.overlay, 1420, 108, [
					["moved", `${hs.moved} blocks`],
					["fragmented", pct(hs.frag)],
					contextRow(hs)
				], {
					accent: "#c9d4ea",
					keyW: 130
				});
				pane(ctx);
				overlays(ctx, K, "defrag · pass 1");
				look(ctx, {
					vignette: .35,
					sat: .85,
					ca: .08
				});
			}
		},
		{
			id: "defragIso",
			at: (T) => keys(T).X(4),
			ownsLyrics: true,
			draw(ctx) {
				pictures(ctx, 14);
				const K = keys(ctx.T), t = ctx.t, hs = heapState(t, K), k = seg(t, K.X(4), K.X(5));
				reset();
				const L = cellXZ(NB - 60);
				const cp = [
					L[0] - 5.2 + k * .8,
					2.5 - k * .3,
					L[1] + 3.4
				];
				const cam = persp(cp, [
					L[0] + 14,
					-.3,
					L[1] - 1.4
				], {
					fov: 38,
					aspect: ctx.aspect
				});
				drawHeap(hs, {
					h: .16,
					lift: 1,
					k: .9,
					cam: cp,
					fog: [7, 21]
				});
				render(ctx, cam);
				readout(ctx.text.overlay, 1420, 108, [
					["erased", `${hs.erased} / ${HEAP.youEnd - HEAP.youStart} blocks`],
					["fragmented", pct(hs.frag)],
					contextRow(hs)
				], {
					accent: "#c9d4ea",
					keyW: 130
				});
				overlays(ctx, K);
				look(ctx, { sat: .85 });
			}
		},
		{
			id: "dissolve",
			at: (T) => keys(T).X(5),
			ownsLyrics: true,
			draw(ctx) {
				pictures(ctx, 40);
				const K = keys(ctx.T), t = ctx.t, hs = heapState(t, K), k = seg(t, K.X(5), K.tFrag);
				reset();
				const last = HEAP.youEnd - 1, c = cellXZ(last), kk = ease.inOutSine(k);
				const pos = [
					c[0] + 1.05 - kk * .15,
					.85 + kk * .3,
					c[1] + 1.45
				], tgt = [
					c[0] - .1,
					lerp(.18, 1.1, kk),
					c[1] - .1
				];
				const cam = persp(pos, tgt, {
					fov: 34,
					aspect: ctx.aspect
				});
				drawHeap(hs, {
					h: .34,
					k: .3,
					focus: [c[0], c[1]],
					focusR: 1.3
				});
				const e = eraseTime(K, last);
				const m = ease.inOutSine(seg(t, e - .02, K.tFrag + .25));
				O.dust.points.visible = true;
				O.dust.points.position.set(c[0], 0, c[1]);
				const fd = Math.hypot(pos[0] - tgt[0], pos[1] - tgt[1], pos[2] - tgt[2]);
				O.dust.set({
					a: O.tex.block,
					b: O.tex.plume,
					morph: m,
					spread: .75,
					wave: 1.3,
					waveOrigin: [
						-.43,
						0,
						-.43
					],
					noise: .025 * m,
					noiseFreq: 3,
					noiseSpeed: .4,
					t,
					size: .0055,
					bright: .3 * (1 - .35 * m),
					colA: WARM,
					colB: mix3(WARM, GREY, .45),
					sparkle: .35,
					reveal: .45 * seg(t, e - .06, e + .08),
					focus: fd,
					aperture: .025,
					maxBlur: 20
				}, cam, ctx.H);
				render(ctx, cam);
				const q = toDesign([
					c[0],
					.34,
					c[1]
				], cam);
				callout(ctx.text.overlay, [q[0], q[1]], `free(${hexAddr(last)})`, {
					dx: 80,
					dy: -60,
					color: "#c9d4ea",
					draw: seg(t, K.X(5) + .05, K.X(5) + .3)
				});
				readout(ctx.text.overlay, 1420, 108, [["erased", `${hs.erased} / ${HEAP.youEnd - HEAP.youStart} blocks`], contextRow(hs)], {
					accent: "#c9d4ea",
					keyW: 130
				});
				overlays(ctx, K);
				look(ctx, {
					vignette: .55,
					sat: .85
				});
			}
		},
		{
			id: "fragments",
			at: (T) => keys(T).tFrag,
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T), t = ctx.t, ss = shardState(t, K, remade(ctx)), lt = t - K.tFrag;
				reset();
				const cam = persp([
					0,
					0,
					lerp(3.9, 3.6, seg(lt, 0, .6))
				], [
					0,
					0,
					0
				], {
					fov: 38,
					aspect: ctx.aspect
				});
				drawShards(ctx, cam, ss);
				mosaicLines(ss, 1, ease.outCubic(seg(lt, 0, .16)));
				render(ctx, cam);
				shardWord(ctx, cam, ss, K.tFrag, t);
				readout(ctx.text.overlay, 1500, 108, [
					["cells", `36 · Voronoi`],
					["Σ area", GEO.discArea.toFixed(4)],
					["π r²", Math.PI.toFixed(4)]
				], {
					accent: "#c9d4ea",
					keyW: 110
				});
				overlays(ctx, K);
				look(ctx, { vignette: .45 });
			}
		},
		{
			id: "drift",
			at: (T) => keys(T).X(8),
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T), t = ctx.t, ss = shardState(t, K, remade(ctx)), k = seg(t, K.X(8), K.tAsm);
				reset();
				const a = -.5 + k * .35, cam = persp([
					Math.sin(a) * 3.1,
					.35 + k * .2,
					Math.cos(a) * 3.1
				], [
					0,
					0,
					0
				], {
					fov: 40,
					aspect: ctx.aspect
				});
				drawShards(ctx, cam, ss, {
					focus: 3,
					aperture: .03,
					maxBlur: 26,
					size: .005
				});
				mosaicLines(ss, .6);
				render(ctx, cam);
				shardWord(ctx, cam, ss, K.tFrag, t, { alpha: 1 - seg(t, K.X(8), K.X(8.8)) });
				overlays(ctx, K);
				look(ctx, { vignette: .55 });
			}
		},
		{
			id: "assemble",
			at: (T) => keys(T).tAsm,
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T), t = ctx.t, ss = shardState(t, K, remade(ctx)), k = ease.inOutSine(seg(t, K.tAsm, K.X(12)));
				reset();
				const cam = persp([
					.2,
					.15,
					lerp(4.2, 3.7, k)
				], [
					0,
					-.02,
					0
				], {
					fov: 38,
					aspect: ctx.aspect
				});
				codeWall(ctx, cam, K, {
					focus: lerp(4.2, 3.7, k),
					reveal: ease.outCubic(seg(t, K.tAsm, K.tAsm + .5))
				});
				drawShards(ctx, cam, ss);
				mosaicLines(ss, .5);
				seamLines(ss);
				holeLines(ss);
				cursor(ss, t);
				render(ctx, cam);
				const placed = ss.cells.filter((c) => c.k >= .999 && !c.gone).length;
				readout(ctx.text.overlay, 1500, 108, ss.remake ? [
					["curve", "(x² + y² − 1)³ = x²y³"],
					["placed", `${placed} / ${36 - MISSING.size}`],
					["lost", `${MISSING.size}`]
				] : [["curve", "(x² + y² − 1)³ = x²y³"], ["placed", `${placed} / 36`]], {
					accent: HEX.me,
					keyW: 110
				});
				overlays(ctx, K);
				look(ctx, { sat: .8 });
			}
		},
		{
			id: "heart",
			at: (T) => keys(T).X(12),
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T), t = ctx.t, ss = shardState(t, K, remade(ctx)), k = seg(t, K.X(12), K.X(13));
				reset();
				const cam = persp([
					.9 - k * .25,
					.5,
					2.3 - k * .15
				], [
					.12,
					.3,
					0
				], {
					fov: 36,
					aspect: ctx.aspect
				});
				codeWall(ctx, cam, K, {
					focus: 2.3,
					aperture: .02,
					bright: .24
				});
				drawShards(ctx, cam, ss, {
					focus: 2.3,
					aperture: .03,
					maxBlur: 22,
					size: .0042,
					bright: .2,
					reveal: .75
				});
				seamLines(ss, {
					width: 2.4,
					alpha: 1.3
				});
				holeLines(ss, 1.2);
				render(ctx, cam);
				overlays(ctx, K);
				look(ctx, {
					sat: .8,
					vignette: .55
				});
			}
		},
		{
			id: "crack",
			at: (T) => keys(T).X(13),
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T), t = ctx.t, ss = shardState(t, K, remade(ctx)), k = seg(t, K.X(13), K.tDis);
				reset();
				const cam = persp([
					0,
					.05,
					3.35 - k * .15
				], [
					0,
					-.05,
					0
				], {
					fov: 38,
					aspect: ctx.aspect
				});
				drawShards(ctx, cam, ss);
				seamLines(ss, { alpha: .75 });
				holeLines(ss, .8);
				crackLine(ss);
				render(ctx, cam);
				readout(ctx.text.overlay, 1500, 108, [["crack", `${(GEO.crack.len * ss.crack).toFixed(3)} / ${GEO.crack.len.toFixed(3)}`], ["along", "cell boundaries"]], {
					accent: "#c9d4ea",
					keyW: 110
				});
				overlays(ctx, K);
				look(ctx, { sat: .8 });
			}
		},
		{
			id: "dishearten",
			at: (T) => keys(T).tDis,
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T), t = ctx.t, ss = shardState(t, K, remade(ctx)), k = ease.inOutSine(seg(t, K.tDis, K.X(15.5)));
				reset();
				const cam = persp([
					0,
					lerp(.25, -.3, k),
					lerp(4.1, 4.8, k)
				], [
					0,
					lerp(.22, -.62, k),
					0
				], {
					fov: 40,
					aspect: ctx.aspect
				});
				const tex = capture(ctx, (sub) => {
					drawShards(ctx, cam, ss, { bright: .45 });
					seamLines(ss, { alpha: .6 });
					crackLine(ss, 1 - ss.open);
					render(sub, cam);
				});
				view(ctx, tex, "dither", {
					pix: lerp(3, 5, k),
					gain: 1.7,
					ink: [
						.86,
						.88,
						.92
					]
				});
				fallingWord(ctx, "DISHEARTENED", 960, 200, K.tDis, t);
				overlays(ctx, K);
				Object.assign(ctx.post, {
					vignette: .3,
					grain: .03
				});
			}
		},
		{
			id: "land",
			at: (T) => keys(T).X(15.5),
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T), t = ctx.t, ss = shardState(t, K, remade(ctx)), k = seg(t, K.X(15.5), K.end);
				reset();
				const cam = persp([
					.7,
					-.44999999999999973,
					3.35 - k * .3
				], [
					0,
					-1.9299999999999997,
					0
				], {
					fov: 40,
					aspect: ctx.aspect
				});
				O.floor.visible = true;
				O.floor.userData.set({
					intensity: .26,
					fade: .11
				});
				drawShards(ctx, cam, ss, {
					focus: 3.4,
					aperture: .015,
					maxBlur: 14
				});
				seamLines(ss, { alpha: .35 });
				redVeins(ss, t);
				render(ctx, cam);
				overlays(ctx, K);
				look(ctx, { sat: .7 });
			}
		}
	]
});
function addrLabels(ctx, cam, reveal) {
	for (let r = 0; r < 24; r += 4) {
		const [x, z] = cellXZ(r * 60), q = toDesign([
			x - .8,
			0,
			z
		], cam);
		if (q[0] > 70 && q[1] > 120 && q[1] < 1e3 && reveal > .5) ctx.text.overlay.text(hexAddr(r * 60), q[0], q[1], {
			size: 12,
			weight: 500,
			color: HEX.dim,
			align: "right",
			alpha: .75 * seg(reveal, .5, 1)
		});
	}
}
/** me: a cyan cursor walking round the heart, placing each fragment as it arrives. */
function cursor(ss, t) {
	let cur = null;
	for (const c of ss.cells) if (t >= c.ta && (!cur || c.ta > cur.ta)) cur = c;
	if (!cur) return;
	const last = Math.max(...ss.cells.map((c) => c.ta)), a = 1 - seg(t, last + .45, last + .8);
	if (a <= 0) return;
	const p = heartXf(cur, cur.hc);
	O.lines.segment(p, p, {
		color: ME.map((v) => v * 2.2 * a),
		width: 12
	});
	O.lines.segment(p, p, {
		color: ME.map((v) => v * .5 * a),
		width: 30
	});
}
/**
* The handoff to the bridge: where a piece strikes the floor, error red creeps outward along the floor's grid lines
* (the minor lines, every .25), fading with distance from the impact.
*/
function redVeins(ss, t) {
	const RED = [
		1,
		.1,
		.06
	], step = .25;
	for (const c of ss.cells) {
		if (c.hit == null || t < c.hit || c.gone) continue;
		const R = Math.min(1.1, (t - c.hit) * 4.5), x0 = c.land[0], z0 = c.land[1];
		for (const axis of [0, 1]) {
			const cx = axis ? z0 : x0, cy = axis ? x0 : z0;
			for (let v = Math.ceil((cx - R) / step) * step; v <= cx + R; v += step) {
				const half = Math.sqrt(Math.max(0, R * R - (v - cx) ** 2));
				for (let s = -4; s < 4; s++) {
					const a = cy + half * s / 4, b = cy + half * (s + 1) / 4;
					const I = .95 * (1 - Math.hypot(v - cx, (a + b) / 2 - cy) / Math.max(R, .001)) ** 1.3;
					if (I <= .01) continue;
					const P = axis ? [
						a,
						-2.0469999999999997,
						v
					] : [
						v,
						-2.0469999999999997,
						a
					], Q = axis ? [
						b,
						-2.0469999999999997,
						v
					] : [
						v,
						-2.0469999999999997,
						b
					];
					O.lines.segment(P, Q, {
						color: RED.map((q) => q * I),
						width: 1.6
					});
				}
			}
		}
	}
}
/** DISHEARTENED: decodes like every hero word, then its letters lose their hold and drop, from the middle out. */
function fallingWord(ctx, word, x, y, t0, t) {
	if (t < t0) return;
	const L = ctx.text.scene, style = {
		size: 96,
		weight: 800,
		font: "JetBrains Mono"
	}, tr = 20;
	const w = L.measure(word, {
		...style,
		tracking: tr
	}), n = word.length, cw = w / n;
	const f = Math.floor(t * 30), GL = "01<>/[]{}#%&$@ABCDEFGHIJKLMNOPQRSTUVWXYZ";
	for (let i = 0; i < n; i++) {
		const ch = t >= t0 + .2 * (i + 1) / n ? word[i] : GL[Math.floor(hash(i * 31.7 + f * 7.3) * 40)];
		const td = t0 + .3 + Math.abs(i - (n - 1) / 2) * .035, ft = Math.max(0, t - td);
		const dy = 2600 * ft * ft, rot = (i - (n - 1) / 2) * .04 * ft * 6;
		L.text(ch, x - w / 2 + cw * (i + .5), y + dy, {
			...style,
			color: HEX.white,
			glow: 18,
			glowColor: "#c9d4ea",
			rot,
			alpha: 1 - seg(dy, 300, 520)
		});
	}
}
//#endregion
