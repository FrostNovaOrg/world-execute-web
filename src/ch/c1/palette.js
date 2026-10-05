import { COL, HEX } from "../../theme.js?v=Bj33PIbo";
//#region src/ch/c1/palette.js
var PAL = {
	c1: {
		mood: "bright",
		cold: COL.me,
		deep: COL.meDeep,
		warm: COL.you,
		rose: COL.rose,
		gold: COL.gold,
		white: COL.white,
		hot: [
			1,
			.86,
			.62
		],
		dim: [
			.09,
			.2,
			.42
		],
		grid: [
			.1,
			.38,
			.9
		],
		hex: {
			cold: HEX.me,
			warm: HEX.you,
			rose: HEX.rose,
			gold: HEX.gold,
			white: HEX.white,
			dim: HEX.dim,
			hot: "#ffe7b8"
		}
	},
	c3: {
		mood: "dark",
		cold: [
			.75,
			.12,
			.08
		],
		deep: [
			.35,
			.03,
			.02
		],
		warm: COL.you,
		rose: COL.rose,
		gold: [
			1,
			.42,
			.18
		],
		white: [
			1,
			.8,
			.74
		],
		hot: [
			1,
			.35,
			.2
		],
		dim: [
			.22,
			.03,
			.03
		],
		grid: [
			.5,
			.06,
			.05
		],
		hex: {
			cold: "#ff5a48",
			warm: HEX.you,
			rose: HEX.rose,
			gold: "#ff9a5a",
			white: "#ffe2dc",
			dim: "#7a4a4a",
			hot: "#ff8a6a"
		}
	}
};
var mixc = (a, b, k) => [
	a[0] + (b[0] - a[0]) * k,
	a[1] + (b[1] - a[1]) * k,
	a[2] + (b[2] - a[2]) * k
];
//#endregion
export { PAL, mixc };
