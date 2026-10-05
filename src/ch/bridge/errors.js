//#region src/ch/bridge/errors.js
var AssertionError = class extends Error {
	constructor(message) {
		super(message);
		this.name = "AssertionError";
	}
};
function assert(condition, message) {
	if (!condition) throw new AssertionError(message);
}
var ORIGIN = /\b[a-z][a-z0-9+.-]*:\/\/[^/\s)]+\//gi;
var QUERY = /\?[^:\s)]*(?=:\d)/g;
/**
* The stack of an error as lines, paths relative to the project root. Lines after Engine.renderFrame are dropped:
* the frames above the engine's frame loop differ between the studio and the renderer.
*/
function stackLines(e, { until = /Engine\.renderFrame/ } = {}) {
	const out = [];
	for (const raw of String(e?.stack ?? e).split("\n")) {
		const s = raw.replace(ORIGIN, "").replace(QUERY, "").replace(/\s+$/, "");
		out.push(s);
		if (until && out.length > 1 && until.test(s)) break;
	}
	return out;
}
var headline = (e) => `${e?.name ?? "Error"}: ${e?.message ?? e}`;
/** Parse "    at fn (file:line:col)" → { fn, file, line, col } (null for other lines). */
function parseFrame(s) {
	const m = /^\s*at (?:(.+?) \()?(.+?):(\d+):(\d+)\)?$/.exec(s ?? "");
	return m ? {
		fn: m[1] ?? "<anonymous>",
		file: m[2],
		line: +m[3],
		col: +m[4]
	} : null;
}
/** JetBrains Mono joins != == => // … into ligatures; a zero-width non-joiner keeps code literal. */
var noLig = (s) => String(s).replace(/([!=<>&|:.+\-*/])(?=[!=<>&|:.+\-*/])/g, "$1‌");
//#endregion
export { AssertionError, assert, headline, noLig, parseFrame, stackLines };
