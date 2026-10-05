import { __exportAll } from "../../_virtual/_rolldown/runtime.js?v=BLEs9rMG";
//#region src/subs/rules.js
var rules_exports = /* @__PURE__ */ __exportAll({
	accent: () => accent,
	rows: () => rows
});
var ACCENT = {
	intro: "#7ef0ff",
	v1: "#7ef0ff",
	pre1: "#7ef0ff",
	c1: "#7ef0ff",
	v2: "#7ef0ff",
	c2: "#7ef0ff",
	pre2: "#ff79c6",
	c2x: "#b9c6dc",
	bridge: "#ff4a3d",
	chant: "#ff4a3d",
	c3: "#ff4a3d",
	love: "#ffd27a",
	outro: "#aab4c8"
};
var BOOT_GREY = "#aab4c8";
var DYE_BEAT = 19.75;
/** The colour of the `//` of a subtitle starting at song time t. */
function accent(T, t) {
	const id = T.sectionAt(t)?.id;
	if (id === "intro" && t < T.beatTime(DYE_BEAT)) return BOOT_GREY;
	return ACCENT[id] ?? BOOT_GREY;
}
var rows = [(T) => [T.findLine("INITIALIZATION").start, T.beatTime(24)], (T) => [T.lines[111].start, T.lines[112].start]];
//#endregion
export { accent, rows, rules_exports };
