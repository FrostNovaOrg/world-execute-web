import web_config_default from "../../web.config.json.js?v=FV_79TNL";
//#region src/player/config.js
var CONFIG = web_config_default;
var fill = (s, vars) => vars ? s.replace(/\{(\w+)\}/g, (m, k) => k in vars ? String(vars[k]) : m) : s;
/**
* The interface text of a config. t(key, vars): the string in the configured language (`lang`; English where that
* language lacks the key) with {name} filled from vars. A key nobody wrote comes back as itself and is reported once.
* t.list(key, vars): a text that is a list of paragraphs, as an array of strings. A paragraph is a string, or
* { "text": …, "lang": "en" } for one in another language than the page's (marked so; t.paras keeps the mark).
* t.paras(key, vars): the same list as [{ text, lang }], lang null for a plain string.
*/
function makeText(cfg, warn = console.warn) {
	const set = {
		...cfg.text?.en,
		...cfg.text?.[cfg.lang]
	}, said = /* @__PURE__ */ new Set();
	const get = (key) => {
		if (set[key] == null && !said.has(key)) {
			said.add(key);
			warn(`web.config.json: no text '${key}' for '${cfg.lang}'`);
		}
		return set[key] ?? key;
	};
	const t = (key, vars) => {
		const s = get(key);
		return typeof s === "string" ? fill(s, vars) : String(s);
	};
	t.paras = (key, vars) => [get(key)].flat().map((p) => p && typeof p === "object" ? {
		text: fill(String(p.text ?? ""), vars),
		lang: p.lang ? String(p.lang) : null
	} : {
		text: fill(String(p), vars),
		lang: null
	});
	t.list = (key, vars) => t.paras(key, vars).map((p) => p.text);
	return t;
}
/** The text of this film's page. */
var t = makeText(CONFIG);
/**
* The fonts the web player's engine sets the film in (Engine's `fonts`): null, the open fonts the build ships alone and
* the same faces on every machine, unless web.config.json systemFonts is true; then undefined, which the Engine reads as
* its edit's own system fonts (PROJECT.systemFonts unless PROJECT.byEdit gives the edit its own), the same edit its
* fallback and clock zero come from: each face asked of the viewer's machine first (local()), the open font where it has
* none. The site never ships a system font.
*/
var engineFonts = (cfg) => cfg.systemFonts === true ? void 0 : null;
//#endregion
export { CONFIG, engineFonts, makeText, t };
