import { PROJECT, fileUrl } from "../engine/config.js?v=BkWxxfxi";
import { rules_exports } from "../subs/rules.js?v=Dk5Mahot";
import { schedule_exports } from "../subs/schedule.js?v=CMr1KbTy";
import { style_exports } from "../subs/style.js?v=CQWrAvp3";
import { Engine } from "../engine/engine.js?v=BCZDiMvz";
import { PRESETS, Quality } from "./quality.js?v=CPQ5syAY";
import { CONFIG, engineFonts } from "./config.js?v=Cv08Ht0h";
import { Player, startOptions, store } from "./player.js?v=CUUjk1Pl";
import { UI } from "./ui.js?v=D496EwM_";
import { Subtitles } from "./subs.js?v=j73Msq7I";
import { fetchSong } from "./vault.js?v=DA8t-IuW";
import cost_default from "./cost.json.js?v=JEVdqT8k";
//#region src/player/main.js
var SUBS = /* #__PURE__ */ Object.assign({
	"../subs/rules.js": rules_exports,
	"../subs/schedule.js": schedule_exports,
	"../subs/style.js": style_exports
});
document.title = CONFIG.title;
document.documentElement.lang = CONFIG.lang;
if (CONFIG.accent) document.documentElement.style.setProperty("--accent", CONFIG.accent);
var q = new URLSearchParams(location.search);
var DEBUG = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
var canvas = document.getElementById("view");
var ui = new UI(document.getElementById("app"));
var gl = canvas.getContext("webgl2", {
	antialias: false,
	alpha: false,
	preserveDrawingBuffer: false,
	powerPreference: "high-performance"
});
/** The subtitle layer, or null: modules/subs is not in the project, no language is configured, or none has a file. */
async function loadSubs(engine) {
	const schedule = SUBS["../subs/schedule.js"], style = SUBS["../subs/style.js"], rules = SUBS["../subs/rules.js"] ?? null, translations = {};
	if (!schedule || !style) return null;
	for (const { id } of CONFIG.subs.langs) try {
		const r = await fetch(fileUrl(`assets/subs/${id}.json`));
		if (!r.ok) throw new Error(`status ${r.status}`);
		translations[id] = await r.json();
	} catch (e) {
		console.warn(`web.config.json subs.langs: assets/subs/${id}.json did not load (${e.message}); the page has no such language`);
	}
	if (!Object.keys(translations).length) return null;
	const subs = new Subtitles({
		schedule,
		style,
		rules
	}, engine.T, translations, {
		designWidth: PROJECT.design.width,
		fontUrl: fileUrl
	});
	if (!subs.langs.length) return null;
	await subs.ready;
	return subs;
}
if (!gl) ui.unsupported("noWebgl2");
else if (!gl.getExtension("EXT_color_buffer_float")) ui.unsupported("noFloatTargets");
else try {
	const engine = new Engine(canvas, {
		width: 960,
		height: 540,
		preserve: false,
		mode: "player",
		fonts: engineFonts(CONFIG)
	});
	await engine.load();
	if (engine.loadFailures.length) {
		console.error(engine.loadFailures.map((f) => `${f.file}: ${f.message}`).join("\n"));
		throw Object.assign(/* @__PURE__ */ new Error(`${engine.loadFailures.length} chapter file(s) failed to load`), {
			code: "chapters",
			count: engine.loadFailures.length
		});
	}
	const start = startOptions(q, {
		saved: {
			q: store.get("q", "auto"),
			fps: store.get("fps", "auto")
		},
		presets: PRESETS,
		poster: CONFIG.poster
	});
	const quality = new Quality({
		cost: cost_default,
		preset: start.preset,
		fps: start.fps
	});
	const player = new Player({
		canvas,
		engine,
		quality,
		ui
	});
	if (DEBUG) window.player = player;
	ui.attach({
		player,
		engine,
		subs: await loadSubs(engine)
	});
	const song = () => fetchSong(new URL(CONFIG.audio.path, location.href).href);
	await player.prepare({
		song,
		onProgress: (s, p) => ui.progress(s, p)
	});
	player.seek(start.t);
	ui.ready({ resume: start.resume });
} catch (e) {
	console.error(e);
	ui.failed(e);
}
//#endregion
