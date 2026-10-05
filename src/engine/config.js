//#region src/engine/config.js
var ENV = {
	"BASE_URL": "./",
	"DEV": false,
	"MODE": "production",
	"PROD": true,
	"SSR": false
};
var BASE = ENV.BASE_URL || "/";
var PROD = !!ENV.PROD;
var FILES = {
	audio: "assets/song_48k.wav",
	master: "assets/song.flac",
	lrc: "assets/lyrics.lrc",
	timing: "analysis/out/timing.json",
	onsets: "analysis/out/onsets.json",
	featuresMeta: "analysis/out/features.json",
	featuresData: "analysis/out/features.f32"
};
var PROJECT = {
	title: "world.execute (me) ;",
	fps: 60,
	master: {
		width: 3840,
		height: 2160
	},
	design: {
		width: 1920,
		height: 1080
	},
	duration: 211.907,
	preroll: 5,
	fonts: [
		{
			family: "JetBrains Mono",
			file: "assets/fonts/JetBrainsMono-VF.ttf",
			descriptors: { weight: "100 800" }
		},
		{
			family: "Space Grotesk",
			file: "assets/fonts/SpaceGrotesk-VF.ttf",
			descriptors: { weight: "300 700" }
		},
		{
			family: "Noto Sans SC",
			file: "assets/fonts/NotoSansSC-Medium-zh.ttf",
			descriptors: { weight: "1 1000" }
		}
	],
	systemFonts: {
		"JetBrains Mono": [[
			"Menlo-Regular",
			1,
			549
		], [
			"Menlo-Bold",
			550,
			1e3
		]],
		"Space Grotesk": [
			[
				"AvenirNext-Regular",
				1,
				449
			],
			[
				"AvenirNext-Medium",
				450,
				549
			],
			[
				"AvenirNext-DemiBold",
				550,
				649
			],
			[
				"AvenirNext-Bold",
				650,
				799
			],
			[
				"AvenirNext-Heavy",
				800,
				1e3
			]
		]
	},
	fontFallback: ", \"Noto Sans SC\"",
	clockZero: -5,
	encode: {
		master: {
			crf: 14,
			preset: "slow",
			audio: "alac"
		},
		x: {
			width: 1920,
			height: 1080,
			crf: 16,
			preset: "slow",
			audio: "aac",
			maxrate: "24M"
		}
	},
	regression: { exempt: [
		"bridge/trace",
		"bridge/traceMacro",
		"bridge/assert",
		"bridge/dialogs",
		"bridge/dialogs2",
		"bridge/split",
		"bridge/flood"
	] },
	byEdit: { orig: {
		systemFonts: null,
		fontFallback: "",
		clockZero: 0
	} }
};
/** URL of a project file as the page should fetch it. */
function fileUrl(rel) {
	return BASE + (PROD && rel.startsWith("analysis/out/") ? "data/" + rel.slice(13) : rel);
}
[
	FILES.timing,
	FILES.onsets,
	FILES.featuresMeta,
	FILES.featuresData,
	...PROJECT.fonts.map((f) => f.file)
];
/** The settings an edit may keep of its own (PROJECT.byEdit); the others are the same in every edit. */
var EDIT_SETTINGS = [
	"systemFonts",
	"fontFallback",
	"clockZero"
];
/**
* The settings `edit` is drawn with: { systemFonts, fontFallback, clockZero }, the project's (PROJECT), each replaced
* by the edit's own where project.byEdit[edit] gives one. Throws when any entry of byEdit has a key that is not one of
* these, or is not an object, naming the ones it may have. A value left out (or undefined) is the project's; null is a
* value (systemFonts). Edit names are not checked here (the edits register later): test/config.test.js does that.
*/
function settingsFor(edit, project = PROJECT) {
	const byEdit = project.byEdit ?? {};
	for (const [name, own] of Object.entries(byEdit)) {
		if (own === null || typeof own !== "object" || Array.isArray(own)) throw new Error(`config.js PROJECT.byEdit.${name} must be an object of the settings the edit keeps of its own (${EDIT_SETTINGS.join(", ")}), not ${JSON.stringify(own) ?? String(own)}`);
		const bad = Object.keys(own).filter((k) => !EDIT_SETTINGS.includes(k));
		if (bad.length) throw new Error(`config.js PROJECT.byEdit.${name}: ${bad.join(", ")} cannot differ by edit; an edit may keep only ${EDIT_SETTINGS.join(", ")} of its own`);
	}
	const own = Object.hasOwn(byEdit, edit) && byEdit[edit] || {};
	return Object.fromEntries(EDIT_SETTINGS.map((k) => [k, own[k] !== void 0 ? own[k] : project[k]]));
}
//#endregion
export { EDIT_SETTINGS, FILES, PROJECT, fileUrl, settingsFor };
