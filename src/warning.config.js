import { HEX } from "./theme.js?v=Bj33PIbo";
//#region src/warning.config.js
var WARNING = {
	lines: [
		{
			kind: "head",
			gutter: "",
			tag: "warning[W0001]",
			text: "photosensitive content"
		},
		{
			kind: "path",
			gutter: " -->",
			text: "world.execute(me);"
		},
		{
			kind: "zh",
			gutter: "  |",
			text: "本视频包含强烈闪烁与快速切换的画面，可能诱发光敏性癫痫。"
		},
		{
			kind: "en",
			gutter: "  |",
			text: "Flashing lights and rapid cuts may trigger photosensitive seizures."
		}
	],
	font: "JetBrains Mono",
	size: 30,
	lineHeight: 50,
	gap: 22,
	x: 372,
	y: 440,
	gutter: {
		weight: 600,
		color: "#5a6c9a"
	},
	styles: {
		head: {
			weight: 700,
			color: HEX.white,
			tag: {
				weight: 800,
				color: HEX.gold,
				glow: 10,
				glowColor: HEX.gold
			}
		},
		path: {
			weight: 500,
			color: HEX.me
		},
		zh: {
			weight: 500,
			color: HEX.white,
			font: "Noto Sans SC"
		},
		en: {
			weight: 500,
			color: "#c9d3ea"
		}
	},
	cursor: {
		em: [.6, .1],
		color: HEX.white,
		dim: .15,
		layer: "scene",
		glow: 18,
		glowColor: "#cfe0ff",
		home: {
			x: 934.8,
			y: 535.8,
			w: 50.4,
			h: 8.4
		},
		offset: [0, 3.5],
		waitGlow: 8,
		homeBeat: true
	},
	timing: {
		first: .25,
		step: .07,
		fade: .18,
		cursorAt: .9,
		cursorFade: .2,
		blink: .5,
		tail: .7,
		clearStep: .05
	},
	look: {
		bloom: .6,
		vignette: .3,
		ca: 0,
		grain: .03
	},
	homeLook: {
		bloom: 1.05,
		threshold: .9,
		knee: .6,
		radius: .85,
		ca: 0,
		vignette: .55,
		grain: .02,
		exposure: 1,
		sat: 1,
		textGlow: 1.6
	}
};
//#endregion
export { WARNING };
