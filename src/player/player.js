import { PROJECT } from "../engine/config.js?v=BkWxxfxi";
import { budgetMs, sizeFor } from "./quality.js?v=CPQ5syAY";
import { AudioClock } from "./clock.js?v=IDaWTqXW";
import { GpuTimer } from "./gputimer.js?v=CIzKqrNU";
import { advance, due } from "./pace.js?v=Bvb5aozp";
import { pickCalibration } from "./pick.js?v=fr4INoKW";
import { CONFIG } from "./config.js?v=Cv08Ht0h";
//#region src/player/player.js
var LOWER = [
	"360p",
	"540p",
	"720p",
	"1080p",
	"1440p"
];
var PREFIX = CONFIG.storagePrefix;
/** What the viewer chose (quality, frame rate, volume, subtitles, "do not remind me"): kept in this browser. */
var store = {
	get(k, d) {
		try {
			return localStorage.getItem(`${PREFIX}.player.${k}`) ?? d;
		} catch {
			return d;
		}
	},
	set(k, v) {
		try {
			localStorage.setItem(`${PREFIX}.player.${k}`, v);
		} catch {}
	}
};
/** What belongs to this visit (a reload in the same tab is the same visit): the warning shown, the context losses. */
var session = {
	get(k, d) {
		try {
			return sessionStorage.getItem(`${PREFIX}.${k}`) ?? d;
		} catch {
			return d;
		}
	},
	set(k, v) {
		try {
			sessionStorage.setItem(`${PREFIX}.${k}`, v);
		} catch {}
	},
	remove(k) {
		try {
			sessionStorage.removeItem(`${PREFIX}.${k}`);
		} catch {}
	}
};
/**
* What to start with, from the address (?q= quality, ?fps=, ?t= song time, ?resume) and the saved settings. A value that is
* not valid is ignored (the next source, then the default), so a typo in a link never reaches the player as NaN.
* saved: { q, fps } as kept in this browser; presets: the quality names; poster: the song time to rest on (web.config.json).
*/
function startOptions(q, { saved = {}, presets = [], poster = 0 } = {}) {
	const preset = [q.get("q"), saved.q].find((v) => presets.includes(v)) ?? "auto";
	const fps = [q.get("fps"), saved.fps].find((v) => v === "auto" || v === "30" || v === "60") ?? "auto";
	const t = q.get("t");
	return {
		preset,
		fps: fps === "auto" ? "auto" : +fps,
		t: t != null && t.trim() !== "" && Number.isFinite(+t) ? +t : poster,
		resume: q.has("resume")
	};
}
var Player = class {
	constructor({ canvas, engine, quality, ui }) {
		Object.assign(this, {
			canvas,
			e: engine,
			q: quality,
			ui
		});
		this.gl = engine.renderer.getContext();
		this.gpu = new GpuTimer(this.gl);
		this.start = -(engine.T.preroll ?? 0);
		this.end = engine.duration;
		this.t = this.start;
		this.ready = false;
		this.key = "";
		this.last = 0;
		this.next = 0;
		this.prev = 0;
		this.fpsAvg = 0;
		this.dirty = true;
		this.steady = false;
		this.resizes = 0;
		this.started = false;
		this.scrubbing = false;
		canvas.addEventListener("webglcontextlost", (ev) => {
			ev.preventDefault();
			this.lost = true;
			this.clock?.pause();
			const n = +session.get("lost", 0) || 0;
			session.set("lost", n + 1);
			if (n >= 2) return this.ui.unsupported("contextLostFinal");
			const q = n >= 1 ? "360p" : [...LOWER].reverse().find((p) => parseInt(p, 10) < this.e.H) ?? "360p";
			this.ui.notice("noticeContextLost");
			const at = this.started ? `t=${(this.clock?.now() ?? this.t).toFixed(2)}&` : "";
			setTimeout(() => {
				location.search = `?${at}q=${q}${this.started ? "&resume" : ""}`;
			}, 800);
		});
		document.addEventListener("visibilitychange", () => {
			if (document.hidden) this.pause();
		});
	}
	/** song: () => Promise<ArrayBuffer> of the encoded song (fetched while the shaders compile). */
	async prepare({ song, onProgress = () => {} }) {
		const bytes = song();
		bytes.catch(() => {});
		await this.e.prewarm((d, n) => onProgress("warm", d / n));
		this.ac = new AudioContext({ latencyHint: "playback" });
		this.clock = new AudioClock(this.ac, await this.ac.decodeAudioData(await bytes));
		this.end = Math.min(this.e.duration, this.clock.buffer.duration);
		onProgress("audio", 1);
		this.calibrate();
		this.ready = true;
		this.dirty = true;
		const loop = (now) => {
			requestAnimationFrame(loop);
			try {
				this.tick(now);
			} catch (e) {
				if (!this.failed) {
					this.failed = true;
					console.error(e);
				}
			}
		};
		requestAnimationFrame(loop);
	}
	/**
	* Time a few frames at 540p to learn how fast this device is against the cost table. The shots are the table's own
	* extremes (pick.js: dearest in pixels, a middling one, dearest in fixed cost), so the two factors can be told apart.
	*/
	calibrate() {
		const px = /* @__PURE__ */ new Uint8Array(4), [w, h] = sizeFor(540), samples = [];
		this.e.setSize(w, h);
		for (const { t } of pickCalibration(this.q.cost, this.e.timeline.shots, {
			from: this.start,
			to: this.e.duration,
			h
		})) {
			const sel = this.e.timeline.at(t), ids = [sel.a.id, sel.b?.id].filter(Boolean);
			this.e.renderFrame(t);
			this.gl.readPixels(0, 0, 1, 1, this.gl.RGBA, this.gl.UNSIGNED_BYTE, px);
			const t0 = performance.now();
			this.e.renderFrame(t);
			this.gl.readPixels(0, 0, 1, 1, this.gl.RGBA, this.gl.UNSIGNED_BYTE, px);
			samples.push({
				ids,
				h,
				ms: performance.now() - t0
			});
		}
		this.q.calibrate(samples);
		this.calibrated = this.q.speed();
		this.key = "";
	}
	get playing() {
		return !!this.clock?.playing;
	}
	async play() {
		if (!this.ready) return;
		if (navigator.audioSession) navigator.audioSession.type = "playback";
		if (this.ac.state !== "running") await this.ac.resume();
		this.started = true;
		if (this.t >= this.end - .05) this.t = this.start;
		this.clock.play(this.t);
		this.dirty = true;
		this.steady = false;
	}
	pause() {
		if (!this.playing) return;
		this.clock.pause();
		this.t = this.clock.now();
		this.dirty = true;
	}
	toggle() {
		this.playing ? this.pause() : this.play();
	}
	seek(t) {
		if (!Number.isFinite(t)) return;
		const wasPlaying = this.playing;
		this.t = Math.min(this.end, Math.max(this.start, t));
		this.q.restart();
		this.key = "";
		this.dirty = true;
		this.steady = false;
		if (wasPlaying && this.t >= this.end - .001) return this.finish();
		this.clock?.seek(this.t);
	}
	/** The film is over: the clock stops, the last frame stays, the end screen shows. */
	finish() {
		this.pause();
		this.t = this.end;
		this.dirty = true;
		this.ui.ended();
	}
	/** While the seek bar is dragged the size holds (no re-pick per frame); the release seeks once more and re-picks. */
	scrub(on) {
		this.scrubbing = on;
	}
	setVolume(v) {
		this.clock?.setVolume(v);
	}
	setPreset(p) {
		this.q.setPreset(p);
		this.q.restart();
		store.set("q", p);
		this.key = "";
		this.dirty = true;
	}
	setFps(f) {
		this.q.setFps(f);
		store.set("fps", f);
		this.key = "";
	}
	resize(h) {
		const [w] = sizeFor(h);
		if (this.e.H !== h) {
			this.e.setSize(w, h);
			this.resizes++;
		}
	}
	/** Pick the size for t (re-picked at cuts and seeks), draw t; returns the CPU ms and what was drawn. */
	draw(t) {
		this.e.outFps = this.q.fps;
		this.e.mbCap = this.q.preset === "4k" ? Infinity : 3;
		const sel = this.e.timeline.at(t), ids = [sel.a.id, sel.b?.id].filter(Boolean), key = ids.join("|");
		if (key !== this.key) {
			this.key = key;
			if (!this.scrubbing) this.resize(this.q.onSelection(ids));
			else this.q.ids = ids;
		}
		const t0 = performance.now();
		this.e.renderFrame(t);
		return {
			cpu: performance.now() - t0,
			tag: {
				ids,
				h: this.e.H
			}
		};
	}
	apply(r) {
		if (!r) return;
		this.resize(r.height);
		if (r.reason === "watchdog") this.ui.notice("noticeWatchdog", { height: r.height });
	}
	tick(now) {
		const refresh = now - this.prev;
		this.prev = now;
		if (!this.ready || this.lost) return;
		if (document.hidden) {
			this.pause();
			return;
		}
		if (this.playing) {
			this.t = this.clock.now();
			if (this.t >= this.end - .001) this.finish();
		}
		if (!this.dirty && (!this.playing || !due(now, this.next, refresh))) return;
		const interval = now - this.last;
		this.last = now;
		this.next = advance(now, this.next, 1e3 / this.q.fps);
		this.dirty = false;
		this.q.setMaxHeight(Math.round(this.canvas.clientHeight * (devicePixelRatio || 1)));
		this.gpu.begin(null);
		const { cpu, tag } = this.draw(Math.max(this.start, this.t));
		this.gpu.end();
		if (this.gpu.pending.length) this.gpu.pending[this.gpu.pending.length - 1].tag = {
			...tag,
			cpu
		};
		const steady = this.steady && this.playing;
		this.steady = this.playing;
		if (steady && interval < 1e3) this.fpsAvg = this.fpsAvg ? this.fpsAvg * .9 + 1e3 / interval * .1 : 1e3 / interval;
		if (this.gpu.ok) {
			for (const { ms, tag: g } of this.gpu.poll()) if (g) this.q.learn(Math.max(ms, g.cpu), {
				ids: g.ids,
				h: g.h,
				exact: true
			});
		} else if (steady) this.q.learn(Math.max(cpu, interval), { exact: false });
		if (steady) this.apply(this.q.guard(Math.max(cpu, interval)));
		this.ui.update(this.state());
	}
	state() {
		return {
			t: this.t,
			playing: this.playing,
			w: this.e.W,
			h: this.e.H,
			fps: this.q.fps,
			preset: this.q.preset,
			fpsSetting: this.q.fpsSetting,
			measuredFps: this.fpsAvg,
			shot: this.key,
			start: this.start,
			end: this.end
		};
	}
	/**
	* Play [from, to) on a virtual clock that advances by each frame's measured cost × slow (a slower device).
	* timer: false feeds Quality frame intervals instead of exact times, as on a browser without GPU timer queries.
	*/
	async simulate({ slow = 1, from = this.start, to = this.end, timer = true } = {}) {
		const px = /* @__PURE__ */ new Uint8Array(4), log = [], heights = {};
		let t = from;
		this.key = "";
		this.resizes = 0;
		this.q.restart();
		for (let i = 0; t < to; i++) {
			const t0 = performance.now();
			const { tag } = this.draw(t);
			this.gl.readPixels(0, 0, 1, 1, this.gl.RGBA, this.gl.UNSIGNED_BYTE, px);
			const ms = (performance.now() - t0) * slow, interval = Math.max(ms, 1e3 / this.q.fps);
			this.apply(this.q.onFrame(timer ? ms : interval, {
				ids: tag.ids,
				h: tag.h,
				exact: timer
			}));
			log.push([
				+t.toFixed(3),
				+ms.toFixed(1),
				tag.h,
				this.q.fps
			]);
			heights[tag.h] = (heights[tag.h] ?? 0) + 1;
			t += interval / 1e3;
			if (i % 30 === 29) await new Promise((r) => setTimeout(r, 0));
		}
		const at60 = log.filter((f) => f[3] === 60).length;
		return {
			frames: log.length,
			over2x: log.filter((f) => f[1] > 2 * budgetMs(f[3])).length,
			over150: log.filter((f) => f[1] > 150).length,
			maxMs: Math.max(...log.map((f) => f[1])),
			resizes: this.resizes,
			heights,
			at60,
			fps: this.q.fps,
			scale: this.q.scale,
			log
		};
	}
	/**
	* One frame drawn as the master draws it (all motion-blur sub-frames, the master's frame rate for the shutter), for comparing
	* with it. fps: the frame rate the master's frames were rendered at (default PROJECT.fps), which sets the shutter.
	*/
	async still(t, w, h, fps = PROJECT.fps) {
		const W = this.e.W, H = this.e.H;
		this.e.mbCap = Infinity;
		this.e.outFps = fps;
		this.e.setSize(w, h);
		this.e.renderFrame(t);
		const url = this.canvas.toDataURL("image/jpeg", .95);
		this.e.setSize(W, H);
		this.key = "";
		this.dirty = true;
		return url;
	}
};
//#endregion
export { Player, session, startOptions, store };
