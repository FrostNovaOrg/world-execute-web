import { PRESETS } from "./quality.js?v=CPQ5syAY";
import { CONFIG, t } from "./config.js?v=Cv08Ht0h";
import { session, store } from "./player.js?v=CUUjk1Pl";
//#region src/player/ui.js
var SECTION_COLORS = [
	"#3b82f6",
	"#a855f7",
	"#ec4899",
	"#f59e0b",
	"#10b981",
	"#06b6d4",
	"#ef4444",
	"#8b5cf6",
	"#14b8a6",
	"#f97316"
];
/** Seconds as m:ss. */
var fmt = (s) => {
	s = Math.max(0, s);
	return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
};
var ICON = {
	play: "<svg viewBox=\"0 0 24 24\"><path d=\"M7 4.5v15l13-7.5z\"/></svg>",
	pause: "<svg viewBox=\"0 0 24 24\"><path d=\"M6 4h4.5v16H6zM13.5 4H18v16h-4.5z\"/></svg>",
	vol: "<svg viewBox=\"0 0 24 24\"><path d=\"M3 9h4l5-4v14l-5-4H3z\"/><path class=\"w\" d=\"M15.5 8.5a5 5 0 0 1 0 7M18 6a8.5 8.5 0 0 1 0 12\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\"/></svg>",
	mute: "<svg viewBox=\"0 0 24 24\"><path d=\"M3 9h4l5-4v14l-5-4H3z\"/><path d=\"M16 9l5 6M21 9l-5 6\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\"/></svg>",
	fs: "<svg viewBox=\"0 0 24 24\"><path d=\"M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\"/></svg>"
};
var IOS = /iP(hone|ad|od)/.test(navigator.userAgent) || navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
var el = (tag, cls, html) => {
	const e = document.createElement(tag);
	if (cls) e.className = cls;
	if (html != null) e.innerHTML = html;
	return e;
};
var esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({
	"&": "&amp;",
	"<": "&lt;",
	">": "&gt;",
	"\"": "&quot;",
	"'": "&#39;"
})[c]);
var presetName = (p) => p === "auto" ? t("qualityAuto") : p === "4k" ? t("quality4k") : p;
/** Why a load failed, in words: the song service's errors carry a code (vault.js SongError), the player's own too. */
var reason = (e) => e?.code === "status" ? t("audioStatus", { status: e.status }) : e?.code === "unreachable" ? t("audioUnreachable") : e?.code === "chapters" ? t("chaptersMissing", { count: e.count }) : e?.message ?? String(e);
var UI = class {
	constructor(root) {
		this.root = root;
		this.stage = root.querySelector("#stage");
		this.root.querySelector(".boot")?.remove();
		this.shown = {};
		this.recent = /* @__PURE__ */ new Map();
		this.slowSince = 0;
		this.slowWarned = "";
		this.buildStart();
		this.toast = root.appendChild(el("div", "toast"));
	}
	/** subs: a Subtitles (subs.js) or null; the languages offered are web.config.json subs.langs that it has a translation for. */
	attach({ player, engine, subs = null }) {
		this.p = player;
		this.e = engine;
		this.subs = subs;
		this.langs = subs ? CONFIG.subs.langs.filter((l) => subs.langs.includes(l.id)) : [];
		const kept = store.get("subs", this.langs[0]?.id ?? "");
		this.subsLang = this.langs.some((l) => l.id === kept) ? kept : "";
		if (this.langs.length) this.subCanvas = this.stage.appendChild(el("canvas", "subs"));
		addEventListener("resize", () => {
			this.p.dirty = true;
		});
		this.buildBar();
		this.bindKeys();
	}
	/** Film time (what the bar shows): song time plus the pre-roll, so the film starts at 0:00. */
	film(t) {
		return t - this.p.start;
	}
	buildStart() {
		const s = this.start = this.root.appendChild(el("div", "start"));
		const link = CONFIG.links.video;
		s.innerHTML = `
      <h1 class="sr">${esc(CONFIG.title)}</h1>
      <div class="card">
        <div class="progress"><i></i></div>
        <p class="status" data-state="loading">${esc(t("loading"))}</p>
        <button class="go" data-act="play" disabled>${ICON.play}<span>${esc(t("play"))}</span></button>
        <p class="credits">${CONFIG.credits.map((c) => `<span>${esc(c)}</span>`).join("")}</p>
        ${link ? `<a class="watch" href="${esc(link)}" target="_blank" rel="noopener">${esc(t("watchLink"))}</a>` : ""}
      </div>
      <div class="modal" role="dialog" aria-modal="true" aria-labelledby="warn-title" hidden>
        <div class="box">
          <b id="warn-title">${esc(t("warningTitle"))}</b>
          ${t.paras("warning").map((p) => `<p${p.lang ? ` lang="${esc(p.lang)}"` : ""}>${esc(p.text)}</p>`).join("")}
          <p class="hint">${esc(t("warningHint"))}${IOS ? `<br>${esc(t("warningHintIos"))}` : ""}</p>
          <label class="again"><input type="checkbox"> ${esc(t("warningAgain"))}</label>
          <div class="acts"><button class="no">${esc(t("warningCancel"))}</button><button class="yes">${esc(t("warningConfirm"))}</button></div>
        </div>
      </div>`;
		this.$s = (q) => s.querySelector(q);
		this.$s(".go").onclick = () => this.warnThen(() => this.begin());
	}
	/** Set the status line: its words and its data-state. */
	say(state, text, bad = false) {
		const st = this.$s(".status");
		st.dataset.state = state;
		st.textContent = text;
		st.classList.toggle("bad", bad);
	}
	/** Set the start button: its words and its data-act. */
	button(act, text) {
		const go = this.$s(".go");
		go.dataset.act = act;
		go.querySelector("span").textContent = text;
		return go;
	}
	/**
	* The photosensitivity warning, before the first play of a visit (a reload in the same tab counts as the same visit),
	* unless the viewer ticked "do not remind me" once. go runs inside the confirming click: iOS starts audio only there.
	*/
	warnThen(go) {
		if (store.get("warned", "") === "1" || session.get("warned", "") === "1") return go();
		const m = this.$s(".modal"), close = () => {
			m.hidden = true;
			removeEventListener("keydown", onKey);
		};
		const onKey = (ev) => {
			if (ev.key === "Escape") close();
		};
		m.hidden = false;
		addEventListener("keydown", onKey);
		m.querySelector(".yes").focus();
		m.querySelector(".no").onclick = close;
		m.querySelector(".yes").onclick = () => {
			if (m.querySelector(".again input").checked) store.set("warned", "1");
			session.set("warned", "1");
			close();
			go();
		};
	}
	progress(stage, p) {
		if (stage === "warm") {
			this.$s(".progress i").style.width = `${(p * 90).toFixed(1)}%`;
			this.say("loading", p < 1 ? t("compiling", { percent: Math.round(p * 100) }) : t("loadingAudio"));
		} else if (stage === "audio") {
			this.$s(".progress i").style.width = "100%";
			this.say("loading", t("calibrating"));
		}
	}
	ready({ resume = false } = {}) {
		this.resume = resume;
		this.$s(".go").disabled = false;
		this.button(resume ? "resume" : "play", resume ? t("resume", { time: fmt(this.film(this.p.t)) }) : t("play"));
		this.say("ready", t("ready"));
		this.$s(".progress").classList.add("done");
		this.applyVolume();
	}
	/** This device cannot play the film (no WebGL2, no float targets, the GPU keeps losing its context): reasonKey is a text key. */
	unsupported(reasonKey) {
		this.$s(".progress")?.remove();
		this.$s(".go")?.remove();
		this.start.classList.remove("gone");
		this.bar?.classList.add("off");
		this.cover(true);
		this.say("unsupported", t("unsupported", {
			reason: t(reasonKey),
			advice: t(CONFIG.links.video ? "unsupportedWatch" : "unsupportedTip")
		}), true);
	}
	/** Loading failed (network, audio decoding): say so and offer a retry. */
	failed(err) {
		this.$s(".progress")?.remove();
		this.say("failed", t("failed", { reason: reason(err) }), true);
		const go = this.button("retry", t("retry"));
		go.disabled = false;
		go.onclick = () => location.reload();
	}
	begin() {
		if (!this.started && !this.resume) this.p.seek(this.p.start);
		this.started = true;
		this.start.classList.add("gone");
		this.bar.classList.remove("off");
		this.cover(false);
		this.p.play();
		this.poke();
	}
	/** The cover (index.html) shows with the start screen, over the picture. */
	cover(on) {
		document.querySelector(".cover")?.classList.toggle("gone", !on);
	}
	ended() {
		const go = this.button("replay", t("replay"));
		this.say("ended", t("ended"));
		go.onclick = () => {
			go.onclick = () => this.begin();
			this.p.seek(this.p.start);
			this.begin();
		};
		this.start.classList.remove("gone");
		this.bar.classList.add("off");
		this.cover(true);
	}
	buildBar() {
		const b = this.bar = this.root.appendChild(el("div", "bar off"));
		b.innerHTML = `
      <button class="pp" aria-label="${esc(t("playPause"))}">${ICON.play}</button>
      <span class="time">0:00 / 0:00</span>
      <div class="seek" role="slider" aria-label="${esc(t("seek"))}"><div class="secs"></div><div class="fill"></div><div class="head"></div><div class="tip"></div></div>
      <div class="vol"><button class="mute" aria-label="${esc(t("mute"))}">${ICON.vol}</button><input type="range" min="0" max="1" step="0.01" aria-label="${esc(t("volume"))}"></div>
      <div class="qwrap"><button class="qbtn" aria-haspopup="true"><span></span><i class="dot"></i></button><div class="menu" hidden></div></div>
      ${document.fullscreenEnabled ? `<button class="fs" aria-label="${esc(t("fullscreen"))}">${ICON.fs}</button>` : ""}`;
		const $ = this.$b = (q) => b.querySelector(q);
		$(".pp").onclick = () => this.p.toggle();
		const span = this.p.end - this.p.start, X = (t) => (t - this.p.start) / span * 100;
		this.e.T.sections.forEach((s, i) => {
			const d = $(".secs").appendChild(el("i"));
			Object.assign(d.style, {
				left: `${X(s.start)}%`,
				width: `${X(Math.min(s.end, this.p.end)) - X(s.start)}%`,
				background: SECTION_COLORS[i % SECTION_COLORS.length] + "38"
			});
		});
		const seek = $(".seek"), at = (ev) => {
			const r = seek.getBoundingClientRect();
			return this.p.start + Math.min(1, Math.max(0, (ev.clientX - r.left) / r.width)) * span;
		};
		seek.addEventListener("pointerdown", (ev) => {
			seek.setPointerCapture(ev.pointerId);
			this.dragging = true;
			this.p.scrub(true);
			this.p.seek(at(ev));
			this.lastAt = at(ev);
		});
		seek.addEventListener("pointermove", (ev) => {
			const time = at(ev), tip = $(".tip"), sec = time < 0 ? t("prerollName") : this.e.T.sectionAt(time)?.id ?? "";
			tip.textContent = `${fmt(this.film(time))} · ${sec}`;
			tip.style.left = `${X(time)}%`;
			if (this.dragging) {
				this.p.seek(time);
				this.lastAt = time;
			}
		});
		const release = () => {
			if (!this.dragging) return;
			this.dragging = false;
			this.p.scrub(false);
			this.p.seek(this.lastAt);
		};
		seek.addEventListener("pointerup", release);
		seek.addEventListener("pointercancel", release);
		seek.addEventListener("lostpointercapture", release);
		this.vol = +store.get("vol", 1);
		this.muted = store.get("muted", "0") === "1";
		const range = $(".vol input");
		range.value = this.vol;
		range.oninput = () => {
			this.vol = +range.value;
			this.muted = false;
			store.set("vol", this.vol);
			store.set("muted", "0");
			this.applyVolume();
		};
		$(".mute").onclick = () => this.toggleMute();
		$(".qbtn").onclick = (ev) => {
			ev.stopPropagation();
			this.menu(!this.menuOpen);
		};
		document.addEventListener("pointerdown", (ev) => {
			if (this.menuOpen && !$(".qwrap").contains(ev.target)) {
				this.menu(false);
				this.menuClosedAt = performance.now();
			}
		});
		$(".fs")?.addEventListener("click", () => this.fullscreen());
		this.stage.addEventListener("click", () => {
			if (this.start.classList.contains("gone") && performance.now() - (this.menuClosedAt ?? -1e9) > 400) this.p.toggle();
		});
		for (const ev of [
			"pointermove",
			"pointerdown",
			"keydown"
		]) addEventListener(ev, () => this.poke(), { passive: true });
	}
	menu(open) {
		this.menuOpen = open;
		const m = this.$b(".menu");
		m.hidden = !open;
		if (!open) return;
		const s = this.p.state();
		m.innerHTML = `
      <p class="mh">${esc(t("quality"))}</p>
      ${PRESETS.map((p) => `<button data-q="${p}" class="${p === s.preset ? "on" : ""}">${esc(presetName(p))}</button>`).join("")}
      ${this.langs.length ? `<p class="mh">${esc(t("subtitles"))}</p>
      <div class="row">${subsChoices(this.langs, t("subtitlesOff"), CONFIG.subs?.off).map((l) => `<button data-s="${esc(l.id)}" class="${this.subsLang === l.id ? "on" : ""}">${esc(l.label)}</button>`).join("")}</div>` : ""}
      <p class="mh">${esc(t("frameRate"))}</p>
      <div class="row">${[
			"auto",
			30,
			60
		].map((f) => `<button data-f="${f}" class="${String(f) === String(s.fpsSetting) ? "on" : ""}">${f === "auto" ? esc(t("frameRateAuto")) : f}</button>`).join("")}</div>
      <p class="stat"></p>`;
		m.querySelectorAll("[data-q]").forEach((btn) => {
			btn.onclick = () => {
				this.p.setPreset(btn.dataset.q);
				this.slowWarned = "";
				this.menu(true);
			};
		});
		m.querySelectorAll("[data-s]").forEach((btn) => {
			btn.onclick = () => {
				this.setSubs(btn.dataset.s);
				this.menu(true);
			};
		});
		m.querySelectorAll("[data-f]").forEach((btn) => {
			btn.onclick = () => {
				this.p.setFps(btn.dataset.f === "auto" ? "auto" : +btn.dataset.f);
				this.menu(true);
			};
		});
		this.shown.stat = null;
		this.update(s);
	}
	/** Show the subtitles of language `lang` ('' turns them off). */
	setSubs(lang) {
		this.subsLang = lang;
		store.set("subs", lang);
		this.p.dirty = true;
	}
	/** The subtitle layer: the canvas follows the picture's device size; it is redrawn only when its picture changes. */
	drawSubs(time) {
		if (!this.subCanvas) return;
		const c = this.subCanvas, dpr = devicePixelRatio || 1, w = Math.round(this.stage.clientWidth * dpr), h = Math.round(this.stage.clientHeight * dpr);
		const s = this.subsLang ? this.subs.at(this.subsLang, time) : null;
		this.set("sub", this.subs.key(s, w, h), () => {
			if (c.width !== w || c.height !== h) {
				c.width = w;
				c.height = h;
			}
			this.subs.draw(c, s);
		});
	}
	applyVolume() {
		this.p?.setVolume(this.muted ? 0 : this.vol);
		if (this.bar) this.$b(".mute").innerHTML = this.muted || !this.vol ? ICON.mute : ICON.vol;
	}
	toggleMute() {
		this.muted = !this.muted;
		store.set("muted", this.muted ? "1" : "0");
		this.applyVolume();
	}
	fullscreen() {
		document.fullscreenElement ? document.exitFullscreen() : this.root.requestFullscreen?.().catch(() => {});
	}
	/** Show the bar (and cursor); hide them again after 2.5 s of stillness while playing. */
	poke() {
		this.root.classList.remove("idle");
		clearTimeout(this.idleTimer);
		this.idleTimer = setTimeout(() => {
			if (this.p?.playing && !this.menuOpen && !this.dragging) this.root.classList.add("idle");
		}, 2500);
	}
	bindKeys() {
		addEventListener("keydown", (ev) => {
			if (ev.target.closest?.("input, select, textarea") || !this.start.classList.contains("gone")) return;
			const p = this.p;
			switch (ev.key) {
				case " ":
					ev.preventDefault();
					p.toggle();
					break;
				case "ArrowLeft":
					ev.preventDefault();
					p.seek(p.t - 5);
					break;
				case "ArrowRight":
					ev.preventDefault();
					p.seek(p.t + 5);
					break;
				case "f":
					this.fullscreen();
					break;
				case "m":
					this.toggleMute();
					break;
				case "c": {
					if (!this.langs.length) break;
					const ids = ["", ...this.langs.map((l) => l.id)], next = ids[(ids.indexOf(this.subsLang) + 1) % ids.length];
					this.setSubs(next);
					this.notice("noticeSubtitles", { state: this.langs.find((l) => l.id === next)?.label ?? t("subtitlesOff") });
					if (this.menuOpen) this.menu(true);
					break;
				}
				case "q": {
					const i = PRESETS.indexOf(p.q.preset);
					p.setPreset(PRESETS[(i + 1) % PRESETS.length]);
					this.notice("noticeQuality", { name: presetName(p.q.preset) });
					if (this.menuOpen) this.menu(true);
					break;
				}
			}
		});
	}
	set(key, value, write) {
		if (this.shown[key] !== value) {
			this.shown[key] = value;
			write(value);
		}
	}
	update(s) {
		if (!this.bar) return;
		this.drawSubs(s.t);
		const $ = this.$b, span = s.end - s.start, f = (s.t - s.start) / span;
		this.set("pp", s.playing, (v) => {
			$(".pp").innerHTML = v ? ICON.pause : ICON.play;
		});
		this.set("time", `${fmt(this.film(s.t))} / ${fmt(this.film(s.end))}`, (v) => {
			$(".time").textContent = v;
		});
		this.set("head", (f * 100).toFixed(2), (v) => {
			$(".fill").style.width = `${v}%`;
			$(".head").style.left = `${v}%`;
		});
		this.set("q", `${presetName(s.preset)} · ${s.h}p${s.fps}`, (v) => {
			$(".qbtn span").textContent = v;
		});
		if (this.menuOpen) this.set("stat", t("stat", {
			w: s.w,
			h: s.h,
			fps: s.fps
		}) + (s.playing && s.measuredFps ? t("statMeasured", { fps: Math.round(s.measuredFps) }) : ""), (v) => {
			$(".menu .stat").textContent = v;
		});
		const slow = s.preset !== "auto" && s.playing && s.measuredFps > 0 && s.measuredFps < s.fps * .7, now = performance.now();
		this.slowSince = slow ? this.slowSince || now : 0;
		const warn = slow && now - this.slowSince > 3e3;
		this.set("dot", warn, (v) => $(".dot").classList.toggle("on", v));
		if (warn && this.slowWarned !== s.preset) {
			this.slowWarned = s.preset;
			this.notice("noticeSlow");
		}
	}
	/** A toast: the text `key` of web.config.json (vars filled in); the same words are not shown again within 10 s. */
	notice(key, vars) {
		const text = t(key, vars), now = performance.now();
		if (now - (this.recent.get(text) ?? -1e9) < 1e4) return;
		this.recent.set(text, now);
		this.toast.textContent = text;
		this.toast.dataset.kind = key;
		this.toast.classList.add("on");
		clearTimeout(this.toastTimer);
		this.toastTimer = setTimeout(() => this.toast.classList.remove("on"), 4e3);
	}
};
/**
* The subtitle menu's choices in order, [{ id, label }] with off as the id '': off and then each language, or (web.config.json
* subs.off "last", passed as off) each language and then off, which reads better where one language is labelled "On".
* The c key cycles through the same ring either way.
*/
var subsChoices = (langs, offLabel, off) => {
	const o = {
		id: "",
		label: offLabel
	};
	return off === "last" ? [...langs, o] : [o, ...langs];
};
//#endregion
export { UI, subsChoices };
