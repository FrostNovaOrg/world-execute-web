import { FILES, PROJECT, fileUrl } from "./config.js?v=BkWxxfxi";
import { lerp } from "./math.js?v=BJIlRm7-";
//#region src/engine/features.js
var Features = class Features {
	constructor(meta, data) {
		this.ready = !!meta;
		this.fps = meta?.fps ?? PROJECT.fps;
		this.frames = meta?.frames ?? 0;
		this.channels = meta?.channels ?? [];
		this.nch = this.channels.length;
		this.index = Object.fromEntries(this.channels.map((c, i) => [c, i]));
		this.data = data;
		this.cache = /* @__PURE__ */ new Map();
		this.missing = /* @__PURE__ */ new Set();
	}
	static empty() {
		return new Features(null, null);
	}
	has(name) {
		return name in this.index;
	}
	_ch(name) {
		const ch = this.index[name];
		if (ch == null && this.ready && !this.missing.has(name)) {
			this.missing.add(name);
			console.warn(`features: unknown channel '${name}' (${channelHint(name, this.channels)})`);
		}
		return ch;
	}
	_raw(ch, f) {
		return this.data[Math.min(this.frames - 1, Math.max(0, f)) * this.nch + ch];
	}
	/** Channel value at time t, linearly interpolated between frames. 0 if the analysis is missing. */
	get(name, t) {
		const ch = this._ch(name);
		if (ch == null) return 0;
		const x = t * this.fps, f = Math.floor(x);
		return lerp(this._raw(ch, f), this._raw(ch, f + 1), x - f);
	}
	/** Envelope follower (fast attack, slow release, in seconds): smooth, punchy values for driving motion. */
	env(name, t, attack = .015, release = .25) {
		const ch = this._ch(name);
		if (ch == null) return 0;
		const key = `${name}|${attack}|${release}`;
		let a = this.cache.get(key);
		if (!a) {
			a = new Float32Array(this.frames);
			const dt = 1 / this.fps, ka = 1 - Math.exp(-dt / Math.max(attack, 1e-4)), kr = 1 - Math.exp(-dt / Math.max(release, 1e-4));
			let y = 0;
			for (let f = 0; f < this.frames; f++) {
				const v = this._raw(ch, f);
				y += (v - y) * (v > y ? ka : kr);
				a[f] = y;
			}
			this.cache.set(key, a);
		}
		const x = t * this.fps, f = Math.floor(x), g = (i) => a[Math.min(this.frames - 1, Math.max(0, i))];
		return lerp(g(f), g(f + 1), x - f);
	}
	/** The 16 mel bands at t (low to high), written into `out`. */
	bands(t, out = /* @__PURE__ */ new Float32Array(16)) {
		for (let i = 0; i < 16; i++) out[i] = this.get(`mel_${String(i).padStart(2, "0")}`, t);
		return out;
	}
};
async function loadFeatures() {
	try {
		const [m, d] = await Promise.all([fetch(fileUrl(FILES.featuresMeta), { cache: "no-store" }), fetch(fileUrl(FILES.featuresData), { cache: "no-store" })]);
		if (!m.ok || !d.ok) throw new Error("missing");
		const meta = await m.json(), data = new Float32Array(await d.arrayBuffer());
		if (data.length !== meta.frames * meta.channels.length) throw new Error(`features.f32 has ${data.length} floats, expected ${meta.frames * meta.channels.length}`);
		return new Features(meta, data);
	} catch (e) {
		console.warn("features not loaded (" + e.message + "): audio-reactive values read as 0");
		return Features.empty();
	}
}
/** What the warning about an unknown channel adds: why a stem channel may be missing, and the channels there are. */
function channelHint(name, channels) {
	const stem = /_(drums|bass|vocals|other)$/, mel = channels.filter((c) => c.startsWith("mel_"));
	return `${stem.test(name) && !channels.some((c) => stem.test(c)) ? "stem channels exist only when the song is analysed with stems; " : ""}this analysis has ${[...channels.filter((c) => !c.startsWith("mel_")), ...mel.length ? [`${mel[0]}…${mel.at(-1)}`] : []].join(", ")}: docs/handbook/tech/timing.md, "Audio features"`;
}
//#endregion
export { Features, loadFeatures };
