import { COL, HEX } from "../../theme.js?v=Bj33PIbo";
import { ORDER } from "./solids.js?v=Cdnqob5F";
//#region src/ch/intro/palette.js
var mix = (a, b, k) => a.map((x, i) => x + (b[i] - x) * k);
var POWER = Object.freeze({
	amber: COL.you,
	gold: COL.gold,
	copper: mix(COL.you, [
		1,
		.7,
		.45
	], .15),
	cursor: [
		1,
		.8,
		.52
	],
	hex: HEX.you,
	goldHex: HEX.gold,
	glow: "#ffcf9a"
});
/**
* The elements. lin: linear HDR for lines and glows (lightness tuned for the dark: a line of any of them reads about
* as bright as the others); hex: for type.
*/
var ELEMENT = Object.freeze({
	tetra: {
		name: "fire",
		hex: "#ff6448",
		lin: [
			1,
			.15,
			.06
		]
	},
	cube: {
		name: "earth",
		hex: "#8ccf62",
		lin: [
			.32,
			.82,
			.16
		]
	},
	octa: {
		name: "air",
		hex: "#fff0a8",
		lin: [
			1,
			.87,
			.4
		]
	},
	dodeca: {
		name: "cosmos",
		hex: HEX.violet,
		lin: [
			.55,
			.36,
			1.15
		]
	},
	icosa: {
		name: "water",
		hex: "#5c92ff",
		lin: [
			.14,
			.38,
			1.2
		]
	}
});
/** The element of the i-th solid (ORDER: tetra, cube, octa, dodeca, icosa). */
var elementOf = (i) => ELEMENT[ORDER[i]];
/** The declaration's syntax colours (L5): keyword violet, names white, property names blue, numbers gold, the rest dim. */
var SYNTAX = Object.freeze({
	keyword: HEX.violet,
	name: HEX.white,
	key: "#98bdff",
	number: HEX.gold,
	punct: HEX.dim,
	comment: HEX.dim,
	glow: {
		keyword: "#8a6fe0",
		key: "#7f9fe0",
		number: "#e0a85a"
	}
});
//#endregion
export { ELEMENT, POWER, SYNTAX, elementOf };
