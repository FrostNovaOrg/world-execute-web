//#region src/player/quality.js
var LADDER = [
	360,
	432,
	540,
	648,
	720,
	900,
	1080,
	1260,
	1440,
	1800,
	2160
];
var PRESETS = [
	"auto",
	"360p",
	"540p",
	"720p",
	"1080p",
	"1440p",
	"4k"
];
var sizeFor = (h) => [Math.round(h * 16 / 9 / 2) * 2, h];
var megapixels = (h) => {
	const [w] = sizeFor(h);
	return w * h / 1e6;
};
var budgetMs = (fps) => 1e3 / fps * .8;
var presetHeight = (p) => p === "4k" ? 2160 : parseInt(p, 10);
var UP = .85;
var CLIMB = 2;
var ALPHA = .08;
var DRIFT = .998;
var FLOOR = .7;
var EMERGENCY = {
	k: 2,
	frames: 3
};
var WATCHDOG = {
	ms: 150,
	frames: 4
};
var clamp = (x, a, b) => Math.min(b, Math.max(a, x));
var Quality = class {
	constructor({ cost, preset = "auto", fps = "auto", maxH = 2160, scale = 1 }) {
		this.cost = cost;
		this.preset = PRESETS.includes(preset) ? preset : "auto";
		this.fpsSetting = fps;
		this.maxH = 2160;
		this.setMaxHeight(maxH);
		this.setSpeed([scale, scale]);
		this.manualH = this.preset === "auto" ? null : presetHeight(this.preset);
		this.h = 540;
		this.ids = [];
		this.slow = 0;
		this.dog = 0;
		this.fresh = true;
		this.shotFps = 60;
	}
	/**
	* Auto: 60 fps when a typical shot (the table's default) fits the 60 fps budget at 1080p on this device, decided
	* once (at construction, again at calibration): the learning scale swings with each shot's error in the table, and
	* the rate must not follow it. The only later change is down to 30, when 60 fps runs into an emergency (onFrame).
	*/
	get fps() {
		if (this.fpsSetting !== "auto") return +this.fpsSetting;
		return this.device60() ? this.shotFps : 30;
	}
	device60() {
		return (this.autoFps ??= this.predict([], 1080) <= budgetMs(60) ? 60 : 30) === 60;
	}
	/** [fixed, pixel] ms of the dearest of `ids` at height h on this device (k = [1, 1]: on the reference machine). */
	terms(ids, h, k = [this.kf, this.kp]) {
		const mp = megapixels(h);
		let best = [0, 0];
		for (const id of ids.length ? ids : [""]) {
			const [a, b] = this.cost.shots[id] ?? this.cost.default, t = [k[0] * a, k[1] * b * mp];
			if (t[0] + t[1] > best[0] + best[1]) best = t;
		}
		return best;
	}
	predict(ids, h) {
		const [f, p] = this.terms(ids, h);
		return f + p;
	}
	/** The device's factors [kf, kp]; setSpeed also resets how far interval-fed learning may drift down. */
	speed() {
		return [this.kf, this.kp];
	}
	setSpeed([kf, kp]) {
		this.kf = clamp(kf, .05, 200);
		this.kp = clamp(kp, .05, 200);
		this.floor = [this.kf * FLOOR, this.kp * FLOOR];
	}
	/** One number for logs and the auto-fps rule's tests: how much slower than the table a typical shot at 1080p runs. */
	get scale() {
		const [a, b] = this.cost.default, mp = megapixels(1080);
		return (this.kf * a + this.kp * b * mp) / (a + b * mp);
	}
	set scale(v) {
		const f = v / this.scale;
		this.setSpeed([this.kf * f, this.kp * f]);
	}
	/** The next pick is free (playback start, seek): otherwise an upscale climbs at most CLIMB rungs per cut. */
	restart() {
		this.fresh = true;
	}
	/** The highest rung whose prediction fits budget B (upscales: with headroom, and at most CLIMB rungs per cut). */
	pick(ids, B) {
		const top = this.fresh ? Infinity : LADDER.findIndex((h) => h >= this.h) + CLIMB;
		let pick = LADDER[0];
		LADDER.forEach((h, i) => {
			if (h <= this.maxH && i <= top && this.predict(ids, h) <= B * (h > this.h ? UP : 1)) pick = h;
		});
		return pick;
	}
	/**
	* A cut (or a seek): the height to draw the new selection at. With auto fps on a 60 fps device, a shot that 60 fps
	* would push below 720p plays at 30 fps instead when that buys two or more rungs (the raymarched flights, say).
	*/
	onSelection(ids) {
		this.ids = ids;
		this.slow = 0;
		this.shotFps = 60;
		if (this.manualH) return this.h = this.manualH;
		let h = this.pick(ids, budgetMs(this.fps));
		if (this.fpsSetting === "auto" && this.device60() && h < 720) {
			const h30 = this.pick(ids, budgetMs(30));
			if (LADDER.indexOf(h30) >= LADDER.indexOf(h) + 2) {
				h = h30;
				this.shotFps = 30;
			}
		}
		this.fresh = false;
		return this.h = h;
	}
	/** A measured frame: learn the device's scale (exact: GPU time; else a frame interval) and guard (below). */
	onFrame(ms, { ids = this.ids, h = this.h, exact = true } = {}) {
		this.learn(ms, {
			ids,
			h,
			exact
		});
		return this.guard(ms);
	}
	/** Learn how much slower than the table this device is, from a frame of `ids` drawn at height h. Never steps. */
	learn(ms, { ids = this.ids, h = this.h, exact = true } = {}) {
		const [f, px] = this.terms(ids, h), p = f + px, share = px / p, interval = 1e3 / this.fps;
		const r = exact ? clamp(ms / p, .25, 4) : ms > interval * 1.5 ? clamp(ms / Math.max(p, interval), 1, 4) : 0;
		if (r) {
			this.kf = clamp(this.kf * r ** (ALPHA * (1 - share)), .05, 200);
			this.kp = clamp(this.kp * r ** (ALPHA * share), .05, 200);
		} else {
			this.kf = Math.max(this.floor[0], this.kf * DRIFT);
			this.kp = Math.max(this.floor[1], this.kp * DRIFT);
		}
	}
	/**
	* Count a frame's wall time (what the viewer sees): the watchdog steps any mode down after 4 frames over 150 ms,
	* an emergency steps auto down (first from 60 to 30 fps) after 3 frames over twice the budget.
	*/
	guard(ms) {
		this.dog = ms > WATCHDOG.ms ? this.dog + 1 : 0;
		if (this.dog >= WATCHDOG.frames) {
			this.dog = 0;
			return this.stepDown("watchdog");
		}
		if (this.manualH) return null;
		this.slow = ms > budgetMs(this.fps) * EMERGENCY.k ? this.slow + 1 : 0;
		if (this.slow >= EMERGENCY.frames) {
			this.slow = 0;
			if (this.fpsSetting === "auto" && this.fps === 60) {
				this.autoFps = 30;
				return {
					height: this.h,
					reason: "fps"
				};
			}
			return this.stepDown("emergency");
		}
		return null;
	}
	stepDown(reason) {
		let i = LADDER.length - 1;
		while (i >= 0 && LADDER[i] >= this.h) i--;
		if (i < 0) return null;
		this.h = LADDER[i];
		if (this.manualH) this.manualH = this.h;
		return {
			height: this.h,
			reason
		};
	}
	setPreset(p) {
		this.preset = PRESETS.includes(p) ? p : "auto";
		this.manualH = this.preset === "auto" ? null : presetHeight(this.preset);
	}
	setFps(f) {
		this.fpsSetting = f === "auto" ? "auto" : +f;
	}
	setMaxHeight(px) {
		this.maxH = LADDER.find((h) => h >= px) ?? 2160;
	}
	calibrate(samples) {
		const rows = samples.map((s) => [...this.terms(s.ids, s.h, [1, 1]), s.ms]);
		let fit = null;
		if (rows.length >= 2) {
			let aa = 0, ab = 0, bb = 0, am = 0, bm = 0;
			for (const [A, B, m] of rows) {
				const w = 1 / (m * m);
				aa += w * A * A;
				ab += w * A * B;
				bb += w * B * B;
				am += w * A * m;
				bm += w * B * m;
			}
			const det = aa * bb - ab * ab;
			if (Math.abs(det) > 1e-12 * aa * bb) {
				const kf = (am * bb - bm * ab) / det, kp = (bm * aa - am * ab) / det;
				if (kf > 0 && kp > 0) fit = [kf, kp];
			}
		}
		if (!fit && rows.length) {
			const r = rows.map(([A, B, m]) => m / (A + B)).sort((x, y) => x - y)[rows.length >> 1];
			fit = [r, r];
		}
		if (fit) this.setSpeed(fit);
		this.autoFps = null;
	}
};
//#endregion
export { LADDER, PRESETS, Quality, budgetMs, megapixels, sizeFor };
