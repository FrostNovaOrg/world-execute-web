import { B, HIT, SYL, VOX, cut, defineEdits, glide, hardCuts, points, whip, xfade } from "../engine/edit.js?v=D0PLjXz4";
//#region src/edit/table.js
/**
* The chant's rows (EDIT.md): every EXECUTION is two beats from its downbeat b. Times 1–4: the close-up on the drum, the
* wide on the sung onset at +.5. Times 5–8: +.5 on the voice, +1 on the drum (+1.25 has no sound). Times 9–12: +.5, +1,
* +1.5, +1.75: voice, drum, voice, drum.
*/
function chantRows() {
	const rows = {}, at = (id, a) => {
		rows[`chant/${id}`] = { at: a };
	};
	[
		["ignite", "pair"],
		["hit2", "H"],
		["hit3", "cube"],
		["hit4", "top4"]
	].forEach(([hit, wide], k) => {
		const b = 2 * k;
		at(hit, HIT("chant", b));
		at(wide, SYL("chant", b + .5));
	});
	[
		[
			"hit5",
			"cad5",
			"low5"
		],
		[
			"hit6",
			"wide6",
			"monge6"
		],
		[
			"hit7",
			"front7",
			"code7"
		],
		[
			"hit8",
			"tri8",
			"dither8"
		]
	].forEach(([hit, a, c], k) => {
		const b = 8 + 2 * k;
		at(hit, HIT("chant", b));
		at(a, SYL("chant", b + .5));
		at(c, HIT("chant", b + 1));
	});
	[
		[
			"hit9",
			"orbit9",
			"macro9",
			"ascii9",
			"eyes9"
		],
		[
			"hit10",
			"wide10",
			"macro10",
			"thermal10",
			"bsp10"
		],
		[
			"hit11",
			"split11",
			"fly11",
			"halftone11",
			"wide11"
		],
		[
			"hit12",
			"full",
			"edges12",
			"macro12",
			"slices12"
		]
	].forEach(([hit, a, c, d, e], k) => {
		const b = 16 + 2 * k;
		at(hit, HIT("chant", b));
		at(a, SYL("chant", b + .5));
		at(c, HIT("chant", b + 1));
		at(d, SYL("chant", b + 1.5));
		at(e, HIT("chant", b + 1.75));
	});
	return rows;
}
/** (docs/REMAKE.md §12.7 item 8) The replays: on the 4th, 8th and 12th EXECUTION (the fourth of each four, sung higher)
* four memories in the two beats, on the sung and drummed onsets; they take the place of that hold's views. */
function memoryRows() {
	const rows = {};
	[
		[4, 6],
		[8, 14],
		[12, 22]
	].forEach(([k, b]) => [
		"a",
		"b",
		"c",
		"d"
	].forEach((x, j) => {
		rows[`chant/mem${k}${x}`] = { at: [
			SYL,
			HIT,
			SYL,
			HIT
		][j]("chant", b + [
			.5,
			1,
			1.5,
			1.75
		][j]) };
	}));
	for (const id of [
		"top4",
		"tri8",
		"dither8",
		"full",
		"edges12",
		"macro12",
		"slices12"
	]) rows[`chant/${id}`] = { off: true };
	return rows;
}
var REMAKE = {
	"intro/trace": { join: cut() },
	"intro/current": { join: cut() },
	"intro/ringTop": { join: glide(1) },
	"intro/protection": { join: cut({ punch: .03 }) },
	"intro/creation": {
		at: VOX(5, 0),
		join: cut({ punch: .03 })
	},
	"intro/birth": { join: glide(1) },
	"intro/null": { join: glide(.4) },
	"intro/init": {
		at: VOX(7, 0),
		join: cut({ punch: .03 })
	},
	"intro/wake": { join: glide(1, { mb: [1, 0] }) },
	"intro/terrain": { join: glide(1) },
	"intro/simulation": { join: glide(1.4) },
	"title/prompt": { off: true },
	"title/type": { off: true },
	"title/line": { off: true },
	"title/execute": { at: HIT("inst1", 0) },
	"placeholder/inst1": { off: true },
	"title/galaxyTop": {
		at: HIT("inst1", 4),
		join: cut()
	},
	"title/galaxyMacro": {
		at: HIT("inst1", 12),
		join: glide(1),
		mb: 15
	},
	"title/galaxyCover": { off: true },
	"title/flight": {
		at: HIT("inst1", 16),
		join: cut()
	},
	"v1/macro": {
		at: B("v1", 1.6),
		join: glide(1.4)
	},
	"v1/dims": {
		at: VOX(13, 0),
		join: glide(1, {
			bias: 1,
			mix: [.5, .85]
		})
	},
	"v1/top": { off: true },
	"v1/dim1": { off: true },
	"v1/dim2": { off: true },
	"v1/dim3": { off: true },
	"v1/split": {
		at: VOX(14),
		join: cut({ punch: .03 })
	},
	"v1/circleDraw": { at: HIT("v1", 8) },
	"v1/roll": { at: VOX(16, 0) },
	"v1/circleMacro": { off: true },
	"v1/rollWide": { off: true },
	"v1/rollTrack": { off: true },
	"v1/circumference": {
		at: VOX(17),
		join: cut({ punch: .03 })
	},
	"v1/sineProj": { at: HIT("v1", 16) },
	"v1/sineSheet": { off: true },
	"v1/youRide": { at: VOX(19, 0) },
	"v1/youClose": {
		at: HIT("v1", 22),
		join: glide(1)
	},
	"v1/tangents": {
		at: HIT("v1", 23),
		join: cut({ punch: .03 })
	},
	"v1/fly": {
		at: HIT("v1", 24),
		join: points((T) => T.beatLen)
	},
	"v1/asymptote": { at: HIT("v1", 28) },
	"v1/limit": {
		at: HIT("v1", 30),
		join: glide(.5, {
			bias: 1,
			mix: [1, 1],
			punch: .03,
			mb: [1, 0]
		})
	},
	"v1/gap": { at: HIT("v1", 31) },
	"c1/inject": {
		at: HIT("c1", 1),
		join: glide(1)
	},
	"c1/propagate": { at: HIT("c1", 2) },
	"c1/nodeMacro": {
		at: HIT("c1", 3),
		join: glide(1.3, { bias: .62 })
	},
	"c1/tokens": { at: HIT("c1", 4) },
	"c1/thermal": { at: HIT("c1", 5) },
	"c1/stimulations": {
		at: HIT("c1", 6),
		join: cut({ punch: .03 })
	},
	"c1/heads": { at: HIT("c1", 7) },
	"c1/reward": { at: HIT("c1", 8) },
	"c1/rewardMacro": {
		at: HIT("c1", 9),
		shift: [
			0,
			-240,
			.4
		]
	},
	"c1/gauge": { at: HIT("c1", 10) },
	"c1/gaugeTilt": {
		at: HIT("c1", 11),
		join: whip(6)
	},
	"c1/gaugeMacro": {
		at: HIT("c1", 12),
		shift: [
			-230,
			160,
			.4
		]
	},
	"c1/gaugeOnly": { at: HIT("c1", 13) },
	"c1/satisfaction": {
		at: HIT("c1", 14),
		join: cut({ punch: .03 })
	},
	"c1/wall": { at: HIT("c1", 16) },
	"c1/wallOblique": {
		at: HIT("c1", 17),
		join: whip(6)
	},
	"c1/barMacro": { at: HIT("c1", 18) },
	"c1/wallLow": { at: HIT("c1", 19) },
	"c1/waiting": { at: HIT("c1", 20) },
	"c1/waiting2": {
		at: HIT("c1", 21),
		join: glide(1.4)
	},
	"c1/execution": {
		at: HIT("c1", 22),
		join: cut({ punch: .03 })
	},
	"c1/aerial": {
		at: HIT("c1", 23),
		join: glide(.8)
	},
	"c1/sandbox": {
		at: HIT("c1", 24),
		join: glide(.8)
	},
	"c1/glass": { at: HIT("c1", 26) },
	"c1/pullback": { at: HIT("c1", 27) },
	"c1/cell": {
		at: HIT("c1", 28),
		join: whip(6)
	},
	"c1/simulation": {
		at: HIT("c1", 30),
		join: cut({ punch: .03 })
	},
	"c1/pushIn": {
		at: HIT("c1", 31),
		join: glide(.5)
	},
	"pre1/circuit": { at: HIT("pre1", 2) },
	"pre1/rectify": { join: glide(.4) },
	"pre1/filter": { join: glide(.4) },
	"pre1/iris": { at: HIT("pre1", 7) },
	"pre1/dizzy1": { join: cut({
		rampOut: 12,
		rampCol: [
			.852,
			.833,
			.755
		]
	}) },
	"pre1/dizzy2": { join: glide(.5) },
	"pre1/dizzy3": { join: glide(.6) },
	"pre1/tunnel": { join: points((T) => T.beatLen) },
	"pre1/travel": { join: glide(.8) },
	"pre1/trailsTop": { join: glide(1) },
	"pre1/youClose": { join: glide(.8) },
	"pre1/tighten": { join: glide(.6) },
	"pre1/helix": { join: glide(.8) },
	"pre1/helixMacro": { join: glide(.6) },
	"pre1/helixTop": { join: glide(1) },
	"pre1/spin": { off: true },
	"pre1/spin2": { off: true },
	"v2/calligram": { join: glide(1) },
	"v2/sankey": { join: glide(1) },
	"v2/nutrients": { join: cut({ punch: .03 }) },
	"v2/prism": {
		at: VOX(47, 0),
		join: points((T) => T.beatLen)
	},
	"v2/absorb": {
		at: SYL("v2", 10),
		join: cut()
	},
	"v2/standUp": { join: glide(.6) },
	"v2/antiox": {
		at: VOX(49, 0),
		join: glide(.6, { punch: .03 })
	},
	"v2/box": { off: true },
	"v2/fringes": { off: true },
	"v2/bloch": { off: true },
	"v2/geiger": { off: true },
	"v2/measure": { off: true },
	"v2/tabby": {
		at: HIT("v2", 16),
		join: points((T) => T.beatLen)
	},
	"v2/stripes": {
		at: VOX(50, 3),
		join: glide(1)
	},
	"v2/purr": { at: VOX(51, 0) },
	"v2/youPurr": {
		at: B("v2", 21),
		join: glide(.8)
	},
	"v2/enjoyment": {
		at: VOX(52),
		join: cut({ punch: .03 })
	},
	"v2/catTurn": { off: true },
	"v2/halo": {
		at: SYL("v2", 26),
		join: cut()
	},
	"v2/you": {
		at: VOX(54, 0),
		join: cut()
	},
	"v2/exists": {
		at: VOX(55, 0),
		join: cut({ punch: .03 })
	},
	"v2/qed": { join: glide(.5) },
	"pre2/switch": { join: cut() },
	"pre2/glyphM": {
		at: HIT("pre2", 6),
		join: cut()
	},
	"pre2/cover": { join: glide(1) },
	"pre2/dialTop": { at: HIT("pre2", 13) },
	"pre2/formation": { join: points((T) => T.beatLen) },
	"pre2/formSide": { join: glide(1) },
	"pre2/swap": { join: glide(.8) },
	"pre2/braid": { join: glide(.8) },
	"pre2/lead": { join: glide(.6) },
	"pre2/gate": { join: glide(.8) },
	"pre2/moireMacro": {
		at: B("pre2", 26),
		join: xfade(8)
	},
	"pre2/tunnel": { at: VOX(63, 0) },
	"pre2/tunnel2": { off: true },
	"pre2/squareEnd": { off: true },
	"pre2/plate": { off: true },
	"c2/blueprint": { join: whip(6) },
	"c2/vibrations": { join: cut({ punch: .03 }) },
	"c2/plate2": {
		at: B("c2", 4),
		join: glide(1.2)
	},
	"c2/strings": { at: HIT("c2", 8) },
	"c2/spectrum": { at: HIT("c2", 9) },
	"c2/scope": { at: HIT("c2", 10) },
	"c2/thermal": { at: HIT("c2", 11) },
	"c2/panel": { at: HIT("c2", 12) },
	"c2/converge": { off: true },
	"c2/completion": { join: cut({ punch: .03 }) },
	"c2/chat": { off: true },
	"c2/presence": { off: true },
	"c2/pointer": { off: true },
	"c2/ping": { at: VOX(71, 0) },
	"c2/search2": { at: VOX(72, 0) },
	"c2/search4": { at: VOX(74, 0) },
	"c2/search3": { at: HIT("c2", 23) },
	"c2/prompt": { at: VOX(75, 0) },
	"c2/isolation": {
		at: HIT("c2", 30),
		join: cut()
	},
	"c2x/defrag": { join: glide(1) },
	"c2x/defragIso": { join: glide(.6) },
	"c2x/dissolve": { join: cut() },
	"c2x/fragments": { join: cut({ punch: .03 }) },
	"c2x/drift": { join: glide(.8) },
	"c2x/heart": { join: glide(.8) },
	"c2x/crack": { join: glide(.8) },
	"c2x/dishearten": { join: cut({ punch: .03 }) },
	"c2x/land": { join: glide(.5) },
	"bridge/decompile": { join: glide(1) },
	"bridge/traceMacro": { join: cut() },
	"bridge/bits": { at: VOX(84, 0) },
	"bridge/nan": {
		at: B("bridge", 8),
		join: glide(1)
	},
	"bridge/nanWide": {
		at: B("bridge", 9),
		join: glide(1)
	},
	"bridge/dialogs2": { join: glide(1) },
	"bridge/illegal": {
		at: VOX(85, 0),
		join: cut({ punch: .03 })
	},
	"inst2/collapseSide": {
		at: HIT("inst2", 4),
		join: cut()
	},
	"inst2/crackGraze": { join: cut() },
	"inst2/crackWide": { join: cut() },
	"inst2/floorUnder": { join: cut() },
	...Object.fromEntries([
		24,
		24.75,
		25,
		25.75,
		26,
		26.75,
		27,
		27.75,
		28,
		28.75,
		29,
		29.75,
		30,
		30.75
	].map((b, i) => [`inst2/f${String(i).padStart(2, "0")}`, { at: HIT("inst2", b) }])),
	...chantRows(),
	...memoryRows(),
	"placeholder/chant": { off: true },
	"chant/ein": { at: VOX(98, 0, { tol: .1 }) },
	"chant/dos": { at: VOX(99, 0) },
	"chant/trois": { at: VOX(100, 0) },
	"chant/net": { at: VOX(101, 0) },
	"chant/fem": { at: VOX(102, 0) },
	"chant/liu": { at: VOX(103, 0) },
	"chant/arm1": { off: true },
	"chant/arm2": { off: true },
	"chant/boom": { at: VOX(104, 0) },
	"c3/neuron": { join: glide(1.6) },
	"c3/collapse": {
		at: HIT("c3", 6),
		join: cut({ punch: .03 })
	},
	"c3/ruins": { join: glide(.8) },
	"c3/crashMacro": { join: cut() },
	"c3/errors": {
		at: HIT("c3", 14),
		join: cut({ punch: .03 })
	},
	"c3/errOblique": { join: glide(.8) },
	"c3/gather": { at: HIT("c3", 16) },
	"c3/fit": { join: glide(.6) },
	"c3/missing": { join: glide(.6) },
	"c3/jitter": { at: VOX(111, 4) },
	"c3/execute": {
		at: HIT("c3", 22),
		join: cut({ punch: .03 })
	},
	"c3/ashes": { join: glide(.8) },
	"c3/tighten": { join: glide(.8) },
	"c3/fade": { join: glide(1) },
	"love/dots": { off: true },
	"love/notebook": {
		at: HIT("love", 0),
		join: xfade(10)
	},
	"placeholder/love": { off: true },
	"love/nbZoom": { off: true },
	"love/warm": { join: cut({ punch: .03 }) },
	"love/ask2": { off: true },
	"love/answerAll": { at: HIT("love", 13) },
	"love/cardioid": { join: cut({ punch: .03 }) },
	"love/penWide": { off: true },
	"love/penMacro": { off: true },
	"love/blueprint": { off: true },
	"love/inflate": { off: true },
	"love/youFree": { off: true },
	"love/youGone": { off: true },
	"love/youFar": { off: true },
	"love/trapped": { off: true },
	"love/venus": { join: cut() },
	"love/rose": { join: cut({ punch: .03 }) },
	"love/frame": { join: cut() },
	"love/trapV": { join: cut() },
	"love/finale": { join: cut({ punch: .03 }) },
	"outro/dissolve": {
		at: HIT("outro", 0),
		join: cut()
	},
	"placeholder/outro": { off: true },
	"outro/lift": { join: glide(1) },
	"outro/rollTop": { join: glide(1) },
	"outro/unboxTop": { join: glide(1) },
	"outro/shrink": { join: glide(1) }
};
var CUTS = hardCuts(REMAKE, {
	"v1/macro": { at: HIT("v1", 2) },
	"v1/dims": { cam: "steps" },
	"c1/nodeMacro": { shift: [
		420,
		0,
		.42
	] }
});
var CATDEV = {
	...REMAKE,
	"v2/tabby": { off: true },
	"v2/stripes": { off: true },
	"v2/purr": { off: true },
	"v2/youPurr": { off: true },
	"v2/enjoyment": { off: true },
	"v2/catTurn": { at: HIT("v2", 16) }
};
var COVER = {
	...REMAKE,
	"title/galaxyTop": { off: true },
	"title/galaxyCover": { at: HIT("inst1", 4) }
};
defineEdits({
	main: REMAKE,
	cuts: CUTS,
	remake: REMAKE,
	tabby: REMAKE,
	catdev: CATDEV,
	cover: COVER
});
//#endregion
