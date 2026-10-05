const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["../chapters.js?v=DQhtKuiF","../../_virtual/_vite/preload-helper.js?v=Ch4kfhuE"])))=>i.map(i=>d[i]);
import { __vitePreload } from "../../_virtual/_vite/preload-helper.js?v=Ch4kfhuE";
import { PROJECT, settingsFor } from "./config.js?v=BkWxxfxi";
import { Timeline } from "./timeline.js?v=vYBbdLfo";
import { clamp, ease, rng, seg, smoothstep } from "./math.js?v=BJIlRm7-";
import { THEME } from "../theme.js?v=Bj33PIbo";
import { LinearSRGBColorSpace } from "../../vendor/three/build/three.core.js?v=q9f7JKE-";
import { WebGLRenderer } from "../../vendor/three/build/three.module.js?v=BkIP_83j";
import { FullscreenQuad, makeRT } from "./gpu.js?v=o4BYX3o1";
import { blendPoses, rig } from "./rig.js?v=39-joEtk";
import { loadTiming } from "./timing.js?v=BkOIwBI0";
import { loadFeatures } from "./features.js?v=i06jw_tL";
import { Bloom, accumMaterial, lerpPost, postDefaults, sdrOutput, textCompMaterial, transitionMaterial } from "./post.js?v=dVu8WU1-";
import { TextCanvas, drawLyrics, loadFonts } from "./text.js?v=BTU-dakh";
import { PointCut } from "./pointcut.js?v=CvAQHiLa";
import { editTable, rampColour, textLead } from "./edit.js?v=D0PLjXz4";
import "../edit/table.js?v=st5P6fX7";
//#region src/engine/engine.js
function hashString(s) {
	let h = 2166136261;
	for (let i = 0; i < s.length; i++) {
		h ^= s.charCodeAt(i);
		h = Math.imul(h, 16777619);
	}
	return h >>> 0;
}
var MOVES = {
	glide: ease.inOutSine,
	whip: (p) => clamp(p) ** 2.4
};
var HANDOVER = {
	glide: [.35, .65],
	whip: [.45, .85]
};
var RELAY_MB = {
	glide: [5, .5],
	whip: [9, .9]
};
/**
* Sub-frames for one frame and the shutter (a fraction of the frame interval): [n, shutter]. join: the incoming shot's
* join while a join is running; row/def: the edit row and the shot definition of the shot on screen (their `mb`).
* mb: 'off' | 'auto' (only where the edit asks: relays, and shots with `mb`) | a number of sub-frames for every frame.
* Realtime modes ('preview', 'player') keep up with at most three unless cap says otherwise; 'render' has no cap.
* The count is always odd: the middle sub-frame is the frame's own instant.
*/
function subframes({ join = null, row = null, def = null, mb = "auto", mode = "render", cap = null } = {}) {
	if (mb === "off") return [1, 0];
	let n = 1, sh = .5;
	if (join?.type === "relay") [n, sh] = join.mb ?? RELAY_MB[join.move] ?? RELAY_MB.glide;
	else {
		const m = row?.mb ?? def?.mb;
		if (m) n = m;
	}
	if (mb !== "auto") n = Math.max(1, +mb || 1);
	else n = Math.min(n, cap ?? (mode === "render" ? Infinity : 3));
	return [n | 1, sh];
}
var Engine = class {
	/**
	* mode: 'preview' (the studio), 'render' (render.mjs) or 'player' (a web player: realtime, its own motion-blur cap).
	* edit: which edit to play: a name registered by src/edit/table.js ('main' unless told), or 'orig' (no table: the
	*       chapters' own times and transitions).
	* mb: motion blur, 'off' | 'auto' (only where the edit asks: relays, and shots with `mb`) | a number of sub-frames.
	* outFps: the frame rate being produced (the shutter is a fraction of its frame interval).
	* text: false leaves out every word written on the two text layers (HUD, labels, read-outs, lyrics, key words) and
	*       keeps what those layers draw that is not a word (rings, leader lines, scope traces): the check that a
	*       picture can be read without its captions. Words that are objects in the scene (textures) stay.
	* preserve: keep the drawing buffer (toDataURL for renders and stills); the web player turns it off.
	* fonts: the system fonts in place of the open ones (fonts.js): undefined, the edit's (config.js settingsFor: its
	*        PROJECT.byEdit entry, else PROJECT.systemFonts); null, none; or a table of faces to try.
	* preroll: seconds of silent pre-roll before song time 0 (the film starts at −preroll; modules/warning-card). Chapters
	*        read it as T.preroll, which is set before the timeline resolves their times.
	*/
	constructor(canvas, { width = 1280, height = 720, samples = 0, mode = "preview", edit = "main", mb = "auto", outFps = 60, text = true, preserve = true, fonts, preroll = PROJECT.preroll ?? 0 } = {}) {
		this.canvas = canvas;
		this.mode = mode;
		this.samples = samples;
		this.editName = edit;
		this.mb = mb;
		this.outFps = outFps;
		this.preroll = preroll;
		this.mbCap = null;
		this.fonts = fonts === void 0 ? settingsFor(edit).systemFonts : fonts;
		this.renderer = new WebGLRenderer({
			canvas,
			antialias: false,
			alpha: false,
			preserveDrawingBuffer: preserve,
			powerPreference: "high-performance"
		});
		this.renderer.setPixelRatio(1);
		this.renderer.outputColorSpace = LinearSRGBColorSpace;
		this.renderer.toneMapping = 0;
		this.renderer.autoClear = false;
		this.fsq = new FullscreenQuad();
		this.bloom = new Bloom();
		this.output = sdrOutput();
		this.textComp = textCompMaterial();
		this.accum = accumMaterial();
		this.pointcut = new PointCut();
		this.transitions = {};
		this.text = {
			scene: new TextCanvas(),
			overlay: new TextCanvas()
		};
		this.text.scene.setWords(text);
		this.text.overlay.setWords(text);
		this.text.scene.fallback = this.text.overlay.fallback = settingsFor(edit).fontFallback;
		this.stats = {
			ms: 0,
			ids: [],
			shot: "",
			frame: 0
		};
		this.errors = [];
		this.notes = [];
		this.loadFailures = [];
		this.sizeVersion = 0;
		this.setSize(width, height);
	}
	/** Load timing, features, fonts and the chapters (only: optional list of chapter ids to load, for isolated checks). */
	async load({ only } = {}) {
		[this.T, this.F] = await Promise.all([loadTiming(), loadFeatures()]);
		this.T.preroll = this.preroll;
		this.T.clockZero = settingsFor(this.editName).clockZero;
		await loadFonts(this.fonts);
		const { loadChapters } = await __vitePreload(async () => {
			const { loadChapters } = await import("../chapters.js?v=DQhtKuiF");
			return { loadChapters };
		}, __vite__mapDeps([0,1]), import.meta.url);
		this.loadFailures = await loadChapters({ only });
		const problems = this.loadFailures.map((f) => `${f.file} failed to load: ${f.message}`);
		this.timeline = new Timeline(this.T, problems, { edit: editTable(this.editName) });
		this.duration = this.T.duration;
	}
	setSize(w, h) {
		this.W = w;
		this.H = h;
		this.renderer.setSize(w, h, false);
		for (const k of [
			"rtA",
			"rtB",
			"rtMix",
			"rtText",
			"rtAcc"
		]) this[k]?.dispose();
		this.rtA = makeRT(w, h, { samples: this.samples });
		this.rtB = makeRT(w, h, { samples: this.samples });
		this.rtMix = makeRT(w, h, { depth: false });
		this.rtText = makeRT(w, h, { depth: false });
		this.rtAcc = makeRT(w, h, { depth: false });
		this.bloom.setSize(w, h);
		this.text.scene.setSize(w, h);
		this.text.overlay.setSize(w, h);
		this.output.setSize(w, h);
		this.sizeVersion++;
	}
	/** Replace the output stage ({ name, setSize, render, dispose }: docs/handbook/tech/extending.md). */
	setOutput(stage) {
		if (stage === this.output) return;
		this.output?.dispose();
		this.output = stage;
		stage.setSize(this.W, this.H);
	}
	/**
	* Run every shot's init and compile every shader before playback, so nothing stalls mid-film: tiny frames just after
	* each shot starts, in its middle and just before it ends (some shots build things the first time a moment passes),
	* and one in the middle of each transition. Yields to the page every few frames and restores the size it found.
	*/
	async prewarm(onProgress = () => {}, { w = 256, h = 144 } = {}) {
		const W = this.W, H = this.H, times = [], f = 1 / PROJECT.fps;
		for (const s of this.timeline.shots) {
			const end = Math.min(s.end, this.duration) - f;
			times.push(Math.min(s.start + f, end));
			if (end - s.start > 4 * f) times.push((s.start + end) / 2, end);
			if (s.transitionIn) times.push(s.start + s.transitionIn.dur * (.5 - s.transitionIn.bias));
		}
		this.setSize(w, h);
		for (let i = 0; i < times.length; i++) {
			this.renderFrame(times[i]);
			onProgress(i + 1, times.length);
			if (i % 4 === 3) await new Promise((r) => setTimeout(r, 0));
		}
		this.setSize(W, H);
	}
	transition(type) {
		return this.transitions[type] ??= transitionMaterial(type);
	}
	_baseCtx() {
		return {
			T: this.T,
			F: this.F,
			W: this.W,
			H: this.H,
			s: this.W / PROJECT.design.width,
			aspect: this.W / this.H,
			fps: PROJECT.fps,
			renderer: this.renderer,
			fsq: this.fsq,
			text: this.text,
			engine: this,
			sizeVersion: this.sizeVersion,
			/** The edit being played ('orig': no table, the chapters' own times). */
			edit: this.editName,
			/** Where the edit starts a shot ('chapter/shot'; null if it is not in the edit): a key word's event happens on its cut. */
			startOf: (id) => this.timeline.startOf(id)
		};
	}
	_init(shot) {
		const ch = shot.chapter;
		if (!ch._inited) {
			ch._inited = true;
			ch.init?.(this._baseCtx());
		}
		if (!shot._inited) {
			shot._inited = true;
			shot.def.init?.(this._baseCtx());
		}
	}
	/** drive: a pose for the shot's main camera (a relay); the shot's own lens shift, if its row asks for one, still applies. */
	_renderShot(shot, t, target, post, drive = null) {
		const r = this.renderer, lt = t - shot.start, dur = shot.end - shot.start, frame = Math.round(t * PROJECT.fps);
		const seed = hashString(shot.id);
		r.setRenderTarget(target);
		r.setClearColor(0, 1);
		r.clear(true, true, true);
		try {
			this._init(shot);
			const run = () => this._draw(shot, t, target, post, lt, dur, frame, seed), dress = this._dress(shot, t);
			if (drive) rig.drive(drive, run, dress ?? {});
			else if (dress) rig.dress(dress, run);
			else run();
		} catch (e) {
			const msg = `${shot.id} threw: ${e?.message ?? e}`;
			if (!this.errors.includes(msg)) {
				this.errors.push(msg);
				console.error(`${msg}\n${e?.stack ?? ""}`);
			}
			target.scissorTest = false;
			target.viewport.set(0, 0, this.W, this.H);
			r.setRenderTarget(target);
			r.setClearColor(1572864, 1);
			r.clear(true, true, true);
			r.setClearColor(0, 1);
			this.text.overlay.text(msg, PROJECT.design.width / 2, PROJECT.design.height / 2, {
				size: 22,
				color: "#ff4a3d",
				weight: 500
			});
		}
	}
	/**
	* A shot's lens shift from its edit row: `shift: [dx, dy, settle]` in design pixels frames the shot that far off its
	* own composition at the cut (so the eye finds the subject where the last shot left it) and eases back within
	* `settle` seconds (0 or absent: the shift stays).
	*/
	_dress(shot, t) {
		const sh = shot.row?.shift;
		if (!sh) return null;
		const k = sh[2] ? 1 - ease.inOutSine(seg(t, shot.start, shot.start + sh[2])) : 1;
		return k > 0 ? { shift: [sh[0] / (PROJECT.design.width / 2) * k, -sh[1] / (PROJECT.design.height / 2) * k] } : null;
	}
	_draw(shot, t, target, post, lt, dur, frame, seed) {
		const r = this.renderer;
		shot.def.draw({
			...this._baseCtx(),
			t,
			lt,
			dur,
			p: clamp(lt / dur),
			frame,
			shot,
			target,
			post,
			seed,
			/** The shot's row of the edit table ({} if none): fields the chapter reads (its own flags, mb, shift, …). */
			row: shot.row ?? {},
			/** Seeded generator: same k, same sequence, every frame and worker. */
			rng: (k = 0) => rng(seed ^ Math.imul(k + 1, 2654435761)),
			/** Render a three.js scene into this shot's target. */
			draw: (scene, camera) => {
				r.setRenderTarget(target);
				r.render(scene, camera);
			},
			/** Run a full-screen material into this shot's target. */
			pass: (material) => this.fsq.render(r, material, target),
			/**
			* Render into a rectangle of the frame, [x, y, w, h] in design units (config.js PROJECT.design, top-left origin),
			* for split screens and viewports. fn(wPx, hPx) runs with the viewport active (set camera aspects, swarm sizes,
			* line res).
			*/
			viewport: (rect, fn) => {
				const k = this.W / PROJECT.design.width, x = rect[0] * k, w = rect[2] * k, h = rect[3] * k, y = this.H - (rect[1] + rect[3]) * k;
				target.viewport.set(x, y, w, h);
				target.scissor.set(x, y, w, h);
				target.scissorTest = true;
				r.setRenderTarget(target);
				try {
					fn(w, h);
				} finally {
					target.viewport.set(0, 0, this.W, this.H);
					target.scissor.set(0, 0, this.W, this.H);
					target.scissorTest = false;
					r.setRenderTarget(target);
				}
			},
			/** Bring a stateful simulation ({ reset(), step(dt, t) }) to this frame, deterministically from the shot start. */
			advance: (sim) => this._advance(sim, shot, frame)
		});
	}
	/**
	* Shot `id` as it is at song time t, drawn into target, picture only (its text layers stay empty): an insert or a
	* flashback drawn inside another shot. The rig is off while it draws, so the inserted shot keeps its own camera even
	* while the host shot is being probed, driven by a relay or dressed. Returns false if there is no such shot.
	*/
	renderShotAt(id, t, target) {
		const shot = this.timeline.shots.find((s) => s.id === id);
		if (!shot) return false;
		const tx = this.text, sa = tx.scene.alpha, oa = tx.overlay.alpha;
		tx.scene.alpha = tx.overlay.alpha = 0;
		try {
			rig.isolate(() => this._renderShot(shot, t, target, postDefaults()));
		} finally {
			tx.scene.alpha = sa;
			tx.overlay.alpha = oa;
		}
		return true;
	}
	_advance(sim, shot, frame) {
		const f0 = Math.round(shot.start * PROJECT.fps);
		if (sim._shot !== shot.id || sim._frame == null || frame < sim._frame) {
			sim.reset();
			sim._frame = f0;
			sim._shot = shot.id;
		}
		while (sim._frame < frame) {
			sim._frame++;
			sim.step(1 / PROJECT.fps, sim._frame / PROJECT.fps);
		}
	}
	/** The pose of a shot's main camera at t, found by running its draw only as far as that camera (nothing is drawn). */
	_probe(shot, t) {
		const lt = t - shot.start, dur = shot.end - shot.start, tx = this.text, sa = tx.scene.alpha, oa = tx.overlay.alpha;
		tx.scene.alpha = tx.overlay.alpha = 0;
		let pose = null;
		try {
			this._init(shot);
			pose = rig.probe(() => this._draw(shot, t, this.rtMix, postDefaults(), lt, dur, Math.round(t * PROJECT.fps), hashString(shot.id)));
		} catch (e) {
			this._note(`${shot.id}: its camera could not be probed (${e?.message ?? e})`);
		}
		this.rtMix.scissorTest = false;
		this.rtMix.viewport.set(0, 0, this.W, this.H);
		tx.scene.alpha = sa;
		tx.overlay.alpha = oa;
		return pose;
	}
	_note(msg) {
		if (!this.notes.includes(msg)) {
			this.notes.push(msg);
			console.warn("edit:", msg);
		}
	}
	/**
	* What the edit adds to a shot's grade at t: the exposure ramps across a cut (towards a bright page and back), and
	* the punch on a key word. Both are declared on the incoming shot's join:
	*   rampIn: n    the n frames before this shot, the outgoing picture brightens to the ramp colour
	*   rampOut: n   this shot's first n frames come down from the ramp colour
	*   punch: k     the picture is pushed in by k on the cut and settles within eight frames
	* The ramp colour is the join's rampCol, else theme.js THEME.rampCol.
	*/
	_grade(shot, t, post) {
		const j = shot.join, next = this.timeline.shots[shot.index + 1], nj = next?.join, f = 1 / PROJECT.fps;
		if (j.rampOut) {
			const k = 1 - seg(t, shot.start - f, shot.start + j.rampOut * f);
			if (k > 0) {
				const a = k * k;
				if (a > post.fade) {
					post.fade = a;
					post.fadeCol = rampColour(j);
				}
			}
		}
		if (nj?.rampIn) {
			const k = seg(t, next.start - (nj.rampIn + 1) * f, next.start + f);
			if (k > 0) {
				const a = k * k;
				if (a > post.fade) {
					post.fade = a;
					post.fadeCol = rampColour(nj);
				}
			}
		}
		if (j.punch && t >= shot.start) post.zoom *= 1 + j.punch * (1 - ease.outCubic(seg(t, shot.start, shot.start + 8 * f)));
	}
	/**
	* The pose of the main camera at t: inside a relay the travelling camera, otherwise the camera of the shot on screen
	* (null if it sets none the rig can see). For measuring how fast the picture moves (render.mjs moves).
	*/
	poseAt(t) {
		const sel = this.timeline.at(t), j = sel.b?.join;
		if (j?.type === "relay") {
			const A = this._probe(sel.a, t), B = this._probe(sel.b, t);
			if (A && B) return blendPoses(A, B, (MOVES[j.move] ?? MOVES.glide)(clamp(sel.p)));
		}
		return this._probe(sel.b && t >= sel.b.start ? sel.b : sel.a, t);
	}
	/** Sub-frames for the frame at t and the shutter (fraction of the frame interval): [n, shutter]. */
	_subframes(t) {
		if (this.mb === "off") return [1, 0];
		const sel = this.timeline.at(t), s = sel.b ?? sel.a;
		return subframes({
			join: sel.b?.join,
			row: s.row,
			def: s.def,
			mb: this.mb,
			mode: this.mode,
			cap: this.mbCap
		});
	}
	/** The scene at t into an HDR target: { scene, post, lead }. text: whether this instant draws the text layers. */
	_renderScene(t, text = true) {
		const sel = this.timeline.at(t), tx = this.text, say = (k) => {
			tx.scene.alpha = tx.overlay.alpha = text ? k : 0;
		};
		if (!sel.b) {
			const post = postDefaults();
			say(1);
			this._renderShot(sel.a, t, this.rtA, post);
			this._grade(sel.a, t, post);
			return {
				scene: this.rtA,
				post,
				lead: sel.a
			};
		}
		const { a, b } = sel, j = b.join, p = clamp(sel.p), pa = postDefaults(), pb = postDefaults();
		if (j.type === "relay") {
			const A = this._probe(a, t), B = this._probe(b, t);
			if (!A || !B) {
				this._note(`${a.id} ~ ${b.id}: ${!A ? a.id : b.id} sets no camera the rig can see; the relay is a cut`);
				const s = t < b.start ? a : b, post = postDefaults();
				say(1);
				this._renderShot(s, t, this.rtA, post);
				this._grade(s, t, post);
				return {
					scene: this.rtA,
					post,
					lead: s
				};
			}
			const pose = blendPoses(A, B, (MOVES[j.move] ?? MOVES.glide)(p)), [m0, m1] = j.mix ?? HANDOVER[j.move] ?? HANDOVER.glide;
			const m = m1 > m0 ? smoothstep(m0, m1, p) : +(p >= m0);
			const lead = textLead(j, m) === "a" ? a : b;
			if (m < 1 || lead === a) {
				say(lead === a ? 1 : 0);
				this._renderShot(a, t, this.rtA, pa, pose);
				this._grade(a, t, pa);
			}
			if (m > 0 || lead === b) {
				say(lead === b ? 1 : 0);
				this._renderShot(b, t, this.rtB, pb, pose);
				this._grade(b, t, pb);
			}
			say(1);
			if (m <= 0) return {
				scene: this.rtA,
				post: pa,
				lead
			};
			if (m >= 1) return {
				scene: this.rtB,
				post: pb,
				lead
			};
			const mat = this.transition("mix"), u = mat.uniforms;
			u.tA.value = this.rtA.texture;
			u.tB.value = this.rtB.texture;
			u.uP.value = m;
			this.fsq.render(this.renderer, mat, this.rtMix);
			return {
				scene: this.rtMix,
				post: lerpPost(pa, pb, m),
				lead
			};
		}
		const pts = j.type === "points";
		say(pts ? 1 - smoothstep(0, .16, p) : 1 - p);
		this._renderShot(a, t, this.rtA, pa);
		say(pts ? smoothstep(.84, 1, p) : p);
		this._renderShot(b, t, this.rtB, pb);
		say(1);
		if (pts) this.pointcut.render(this.renderer, this.fsq, this.rtA.texture, this.rtB.texture, p, this.rtMix, this.W, this.H, j);
		else {
			const m = this.transition(j.type), u = m.uniforms;
			u.tA.value = this.rtA.texture;
			u.tB.value = this.rtB.texture;
			u.uP.value = p;
			u.uSeed.value = t;
			u.uAspect.value = this.W / this.H;
			u.uParam.value.fromArray(j.param);
			u.uEdge.value.fromArray(j.color ?? THEME.dissolveEdge);
			this.fsq.render(this.renderer, m, this.rtMix);
		}
		const post = lerpPost(pa, pb, ease.inOutCubic(p)), lead = p < .5 ? a : b;
		this._grade(lead, t, post);
		return {
			scene: this.rtMix,
			post,
			lead
		};
	}
	renderFrame(t) {
		const t0 = performance.now(), r = this.renderer;
		this.text.scene.begin();
		this.text.overlay.begin();
		const [n, shutter] = this._subframes(t);
		let scene, post, lead;
		if (n <= 1) ({scene, post, lead} = this._renderScene(t));
		else {
			const span = shutter / this.outFps, mid = n >> 1, u = this.accum.uniforms;
			r.setRenderTarget(this.rtAcc);
			r.setClearColor(0, 1);
			r.clear(true, false, false);
			for (let k = 0; k < n; k++) {
				const c = this._renderScene(t + ((k + .5) / n - .5) * span, k === mid);
				if (k === mid) {
					post = c.post;
					lead = c.lead;
				}
				u.tSrc.value = c.scene.texture;
				u.uK.value = 1 / n;
				this.fsq.render(r, this.accum, this.rtAcc);
			}
			scene = this.rtAcc;
		}
		this.text.scene.alpha = this.text.overlay.alpha = 1;
		if (!lead.ownsLyrics) drawLyrics(this.text.overlay, this.T, t);
		if (this.text.scene.end()) {
			const u = this.textComp.uniforms;
			u.tScene.value = scene.texture;
			u.tText.value = this.text.scene.tex;
			u.uGlow.value = post.textGlow;
			this.fsq.render(r, this.textComp, this.rtText);
			scene = this.rtText;
		}
		const bloomTex = this.bloom.render(r, this.fsq, scene.texture, this.W, this.H, post), overlay = this.text.overlay.end();
		const frame = Math.round(t * PROJECT.fps);
		this.output.render(this, {
			scene: scene.texture,
			bloom: bloomTex,
			levels: this.bloom.levels,
			post,
			overlay: overlay ? this.text.overlay.tex : null,
			frame
		});
		const sel = this.timeline.at(t);
		this.stats = {
			ms: performance.now() - t0,
			ids: sel.b ? [sel.a.id, sel.b.id] : [sel.a.id],
			shot: sel.b ? `${sel.a.id} → ${sel.b.id}` : sel.a.id,
			frame
		};
	}
};
//#endregion
export { Engine, hashString, subframes };
