import { PROJECT } from "../engine/config.js?v=BkWxxfxi";
import { chapter } from "../engine/timeline.js?v=vYBbdLfo";
import { ease, seg } from "../engine/math.js?v=BJIlRm7-";
import { HEX } from "../theme.js?v=Bj33PIbo";
import { remade } from "../lib/published.js?v=aV_CU5HV";
import { WARNING } from "../warning.config.js?v=CI9EiWlR";
import { cardAt, cardShots, cardStart, cardTimes, checkConfig, drawCard, needsCJK } from "../lib/warning-card.js?v=BvDLNzYE";
import { blinkOn, cursorQuad, drawCursor } from "./intro/cursor.js?v=B0VCQBJX";
//#region src/ch/00_warning.js
var MONO = "JetBrains Mono";
var CJK = "PingFang SC";
var X = 440;
var Y0 = 336;
var LH = 50;
var SIZE = 30;
var LINES = [
	[
		"",
		"warning[W0001]: photosensitive content",
		"head"
	],
	[
		" -->",
		"world.execute(me);",
		"path"
	],
	[
		"  |",
		"",
		"bar"
	],
	[
		"  |",
		"本视频包含强烈闪烁与快速切换的画面，可能诱发光敏性癫痫。",
		"zh"
	],
	[
		"  |",
		"This video contains flashing lights and rapid cuts that may",
		"en"
	],
	[
		"  |",
		"trigger seizures in people with photosensitive epilepsy.",
		"en"
	],
	[
		"  |",
		"",
		"bar"
	],
	[
		"  =",
		"note: 请在光线充足的环境中观看，并与屏幕保持距离。",
		"note"
	]
];
var QUIET_HOME = {
	...WARNING,
	cursor: {
		...WARNING.cursor,
		color: "rgba(0,0,0,0)",
		glow: 0
	}
};
function cardR(ctx) {
	checkFont(ctx.text.overlay);
	const pre = ctx.T.preroll, home = cardAt(ctx.t + pre, cardTimes(pre, WARNING.lines.length, WARNING.timing), WARNING.cursor).home;
	drawCard(ctx, home ? QUIET_HOME : WARNING, PROJECT.design);
	if (home) drawCursor(ctx.text.scene, cursorQuad(), { alpha: blinkOn(ctx.T, ctx.t) });
}
function cardOrig(ctx) {
	const L = ctx.text.overlay, PRE = ctx.T.preroll, t = ctx.t + PRE;
	const fadeOut = 1 - ease.inOutSine(seg(t, PRE - .75, PRE - .3));
	LINES.forEach(([gut, text, kind], i) => {
		const t0 = .25 + i * .07, a = ease.outCubic(seg(t, t0, t0 + .18)) * fadeOut, y = Y0 + i * LH;
		if (a <= 0) return;
		if (gut) L.text(gut, X, y, {
			size: SIZE,
			font: MONO,
			weight: 600,
			color: "#5a6c9a",
			align: "right",
			alpha: a
		});
		if (!text) return;
		const x = 462;
		if (kind === "head") {
			const hx = X - L.measure("-->", {
				size: SIZE,
				font: MONO,
				weight: 600
			}), w = L.measure("warning[W0001]", {
				size: SIZE,
				font: MONO,
				weight: 800
			});
			L.text("warning[W0001]", hx, y, {
				size: SIZE,
				font: MONO,
				weight: 800,
				color: HEX.gold,
				align: "left",
				alpha: a,
				glow: 10,
				glowColor: HEX.gold
			});
			L.text(": photosensitive content", hx + w, y, {
				size: SIZE,
				font: MONO,
				weight: 700,
				color: HEX.white,
				align: "left",
				alpha: a
			});
		} else if (kind === "path") L.text(text, x, y, {
			size: SIZE,
			font: MONO,
			weight: 500,
			color: HEX.me,
			align: "left",
			alpha: a
		});
		else if (kind === "zh") L.text(text, x, y, {
			size: SIZE,
			font: CJK,
			weight: 500,
			color: HEX.white,
			align: "left",
			alpha: a
		});
		else if (kind === "en") L.text(text, x, y, {
			size: SIZE,
			font: MONO,
			weight: 500,
			color: "#c9d3ea",
			align: "left",
			alpha: a
		});
		else if (kind === "note") {
			L.text("note:", x, y, {
				size: SIZE,
				font: MONO,
				weight: 700,
				color: HEX.me,
				align: "left",
				alpha: a
			});
			L.text(text.slice(6), x + L.measure("note: ", {
				size: SIZE,
				font: MONO,
				weight: 700
			}), y, {
				size: 28,
				font: CJK,
				weight: 400,
				color: "#aab4cc",
				align: "left",
				alpha: a
			});
		}
	});
	const last = Y0 + LINES.length * LH + 6, on = Math.floor(t * 2) % 2 === 0 ? 1 : .15;
	L.text("_", 462, last, {
		size: SIZE,
		font: MONO,
		weight: 700,
		color: HEX.white,
		align: "left",
		alpha: seg(t, .9, 1.1) * fadeOut * on
	});
	Object.assign(ctx.post, {
		bloom: .6,
		vignette: .3,
		ca: 0,
		grain: .03
	});
}
var told = /* @__PURE__ */ new Set();
var tell = (msg) => {
	if (!told.has(msg)) {
		told.add(msg);
		console.warn(`warning-card: ${msg}`);
	}
};
var checkFont = (L) => {
	if (needsCJK(WARNING) && !String(L?.fallback ?? "").trim()) tell("the card has Chinese text but the text layer's font fallback (PROJECT.fontFallback, or the edit's own) is empty, so the browser picks a system font for it and the card looks different on another machine. Add an open Chinese font to PROJECT.fonts and set fontFallback (modules/warning-card/README.md).");
};
var card = {
	id: "card",
	at: cardStart,
	ownsLyrics: true,
	draw: (ctx) => remade(ctx) ? cardR(ctx) : cardOrig(ctx)
};
chapter({
	id: "warning",
	from: cardStart,
	to: 0,
	shotsFor(T) {
		const shots = cardShots(T, card);
		if (!shots.length) {
			tell("the pre-roll is 0, so there is no warning card. Set preroll: 5 in src/engine/config.js (render.mjs --preroll=5 tries it for one render).");
			return shots;
		}
		for (const problem of checkConfig(WARNING, PROJECT.design)) tell(`src/warning.config.js: ${problem}`);
		return shots;
	}
});
//#endregion
