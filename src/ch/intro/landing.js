import { TAU, clamp, lerp, rng } from "../../engine/math.js?v=BJIlRm7-";
//#region src/ch/intro/landing.js
var G = 3.8;
var DROP = 1.45;
/** Seconds a piece takes to fall from h. */
var fallTime = (h = DROP, g = G) => Math.sqrt(2 * h / g);
/**
* Plato's Timaeus (55c–56b): the four elements are built from four of the solids; the fifth, the god used "for the
* whole". Shown in the read-out next to the solid's numbers.
*/
var TIMAEUS = {
	tetra: "fire",
	cube: "earth",
	octa: "air",
	dodeca: "cosmos",
	icosa: "water"
};
/**
* What each landing throws up, after its element (the same system, other proportions): fire is sparks (few, fast,
* bright, long streaks), earth the heaviest (the strongest ring and jolt, a low wide skirt of dust), air a light dust
* that rises high and hangs, the cosmos fine motes that linger like stars, water rings that follow the front.
*   ring: amplitude of the floor's crest (world units) · dust: grains, speed out, speed up, drag, fall, life
*   jolt: the camera's kick (fraction of the frame height) · ripples: crests behind the front (0 = one)
*   turn: how far it turns about the vertical on the way down (radians) · rim: its footprint's radius (where the dust
*   starts) · seed: of its dust (the shutdown replays exactly these grains, backwards)
*/
var IMPACT = {
	tetra: {
		ring: .028,
		ripples: 0,
		dust: 70,
		out: [.5, 2.2],
		up: [.4, 1.7],
		drag: 3.2,
		fall: 3.4,
		life: .75,
		streak: 2.6,
		bright: 1.5,
		jolt: .03,
		turn: .5,
		rim: .19,
		seed: 101
	},
	cube: {
		ring: .036,
		ripples: 0,
		dust: 170,
		out: [.35, 1.6],
		up: [.12, .8],
		drag: 4.2,
		fall: 4.2,
		life: 1.05,
		streak: 1.2,
		bright: 1.05,
		jolt: .04,
		turn: -.4,
		rim: .17,
		seed: 102
	},
	octa: {
		ring: .024,
		ripples: 0,
		dust: 120,
		out: [.2, 1.1],
		up: [.35, 1.35],
		drag: 5.2,
		fall: 1.2,
		life: 1.3,
		streak: 1,
		bright: .95,
		jolt: .028,
		turn: .45,
		rim: .17,
		seed: 103
	},
	dodeca: {
		ring: .028,
		ripples: 0,
		dust: 130,
		out: [.25, 1.4],
		up: [.2, 1.1],
		drag: 4.6,
		fall: 1.8,
		life: 1.4,
		streak: .5,
		bright: 1.25,
		jolt: .032,
		turn: -.35,
		rim: .2,
		seed: 104
	},
	icosa: {
		ring: .03,
		ripples: 2,
		dust: 90,
		out: [.3, 1.3],
		up: [.15, .9],
		drag: 4.6,
		fall: 3.4,
		life: .9,
		streak: 1,
		bright: 1.05,
		jolt: .034,
		turn: .4,
		rim: .2,
		seed: 105
	}
};
/**
* A piece's height above its rest pose and its spin about the vertical, t seconds of song time, landing at tLand.
* Before the release it does not exist; in the air it falls freely (and turns a little, settling square on the floor);
* on contact it stops dead, the floor gives (a few millimetres, back within a tenth of a second) and it trembles.
* Returns { shown, falling, dy, spin, v (downward speed), s (seconds since the impact; < 0 before) }.
*/
function fall(t, tLand, { h = DROP, g = G, turn = .35 } = {}) {
	const d = fallTime(h, g), s = t - tLand;
	if (s < -d) return {
		shown: false,
		falling: false,
		dy: h,
		spin: turn,
		v: 0,
		s
	};
	if (s < 0) {
		const u = -s, a = d - u;
		return {
			shown: true,
			falling: true,
			dy: h - .5 * g * a * a,
			spin: turn * (u / d) ** 2,
			v: g * a,
			s
		};
	}
	return {
		shown: true,
		falling: false,
		dy: -settle(s),
		spin: 0,
		v: 0,
		s,
		tremble: tremble(s)
	};
}
/** The floor giving under the piece: down by up to 3 mm on contact and back (a critically damped spring). */
var settle = (s, { depth = .003, tau = .022 } = {}) => s <= 0 ? 0 : depth * (s / tau) * Math.exp(1 - s / tau);
/** A tremble about a horizontal axis (radians), dying out in a few hundredths of a second. */
var tremble = (s, { amp = .006, f = 34, tau = .045 } = {}) => s <= 0 ? 0 : amp * Math.sin(TAU * f * s) * Math.exp(-s / tau);
/**
* The shock front on the floor, s seconds after an impact: { r (radius), amp (lift of the crest), w (its half width) },
* or null when it is spent. It leaves the piece's footprint fast and slows (the walls, 1–2 units away, are reached in
* a quarter to half a second); the crest drops as it spreads (∝ 1/√r) and widens.
*/
function front(s, { r0 = .16, reach = 2.8, tau = .3, amp = .03, life = 1.1 } = {}) {
	if (s < 0 || s > life) return null;
	const r = r0 + reach * (1 - Math.exp(-s / tau));
	const fade = 1 - clamp((s - life * .6) / (life * .4));
	return {
		r,
		amp: amp * Math.exp(-s / (life * .55)) / Math.sqrt(1 + (r - r0) / .3) * fade,
		w: .03 + .09 * s
	};
}
/**
* The shield's answer to an impact: a wave through the field from the point of impact, faster than the floor's front
* (the walls, two units off, take it within a quarter of a second, while the landing is still on screen).
* { r, k (strength 0..1), w (half width) } or null.
*/
function shieldWave(s, { r0 = .2, reach = 3.4, tau = .17, life = .7 } = {}) {
	if (s < 0 || s > life) return null;
	return {
		r: r0 + reach * (1 - Math.exp(-s / tau)),
		k: Math.exp(-s / (life * .45)) * (1 - clamp((s - life * .7) / (life * .3))),
		w: .08 + .12 * s
	};
}
/**
* The camera's jolt s seconds after an impact, as a fraction of the frame height: a kick that is over in two or three
* frames at 60 fps (a damped sine of a three-frame period). Its largest change from one frame to the next is about
* three quarters of `amp`.
*/
function jolt(s, amp = .03, { period = 3 / 60, tau = .028 } = {}) {
	return s <= 0 ? 0 : amp * Math.exp(-s / tau) * Math.sin(TAU * s / period);
}
/**
* The dust an impact throws up: `n` grains with deterministic starts on the rim of the footprint (radius `rim`) and
* velocities out and up. grainAt() moves them: linear drag (k) and gravity (g), closed form, so any s can be drawn.
*/
function grains(seed, p, rim = .2) {
	const r = rng(seed), out = [];
	for (let i = 0; i < p.dust; i++) {
		const a = r() * TAU, u = r(), w = r();
		out.push({
			a,
			r0: rim * (.85 + .25 * r()),
			y0: .004 + .02 * r(),
			vr: lerp(p.out[0], p.out[1], u * u),
			vy: lerp(p.up[0], p.up[1], w ** 1.5),
			size: .6 + .9 * r() ** 2,
			b: .45 + .55 * r(),
			life: p.life * (.55 + .45 * r())
		});
	}
	return out;
}
/** A grain's offset from the impact centre s seconds after it ([x, y, z]); y never goes below the floor. */
function grainAt(gr, s, p) {
	const k = p.drag, e = 1 - Math.exp(-k * s), h = gr.r0 + gr.vr / k * e;
	const y = gr.y0 + (gr.vy + p.fall / k) / k * e - p.fall * s / k;
	return [
		Math.cos(gr.a) * h,
		Math.max(.002, y),
		Math.sin(gr.a) * h
	];
}
/** A grain's brightness s seconds after the impact (bright at once, gone by the end of its life). */
var grainAlpha = (gr, s) => s <= 0 || s >= gr.life ? 0 : gr.b * (1 - s / gr.life) ** 1.6 * clamp(s / .02);
/** The impacts that are under way at t: [{ i, s }] for the landing times `lands` (seconds since each, within `life`). */
var live = (t, lands, life = 1.4) => lands.map((L, i) => ({
	i,
	s: t - L
})).filter((o) => o.s >= 0 && o.s <= life);
//#endregion
export { DROP, G, IMPACT, TIMAEUS, fall, fallTime, front, grainAlpha, grainAt, grains, jolt, live, settle, shieldWave, tremble };
