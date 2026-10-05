import { PROJECT } from "./config.js?v=BkWxxfxi";
import { clamp, ease, seg } from "./math.js?v=BJIlRm7-";
import { THEME } from "../theme.js?v=Bj33PIbo";
import { CanvasTexture, LinearFilter } from "../../vendor/three/build/three.core.js?v=q9f7JKE-";
import { fontFaces } from "./fonts.js?v=B_Y51BQr";
//#region src/engine/text.js
/**
* The film's fonts: the open ones, with `system`'s faces in their place (fonts.js; null: the open fonts alone). A font
* that does not load (its file is missing) fails with its family and file named: the browser's own error names neither.
*/
async function loadFonts(system = null) {
	await Promise.all(PROJECT.fonts.flatMap((font) => fontFaces([font], system).map(async (f) => {
		const face = new FontFace(f.family, f.src, f.descriptors);
		try {
			await face.load();
		} catch (e) {
			throw new Error(`the font '${f.family}' did not load from ${font.file} (config.js PROJECT.fonts): ${e?.message ?? e}`);
		}
		document.fonts.add(face);
	})));
}
/**
* A 2D canvas the size of the render, drawn in design units. Two of these exist per frame:
*   ctx.text.scene   composited into the HDR scene before bloom: text glows and is affected by the look.
*   ctx.text.overlay composited after grading: exact colours, crisp, never bloomed.
*/
var TextCanvas = class {
	constructor() {
		this.canvas = document.createElement("canvas");
		this.g = this.canvas.getContext("2d");
		this.tex = new CanvasTexture(this.canvas);
		Object.assign(this.tex, {
			colorSpace: "",
			minFilter: LinearFilter,
			magFilter: LinearFilter,
			generateMipmaps: false
		});
		this.alpha = 1;
		this.s = 1;
		this.dirty = false;
		this.words = true;
	}
	/**
	* Words on or off. Off: nothing written on this layer is drawn, neither by text() nor by a draw() callback that
	* writes characters itself; the lines, rings and traces a callback draws stay (the picture without its captions).
	*/
	setWords(on) {
		this.words = on;
		if (on) {
			delete this.g.fillText;
			delete this.g.strokeText;
		} else this.g.fillText = this.g.strokeText = () => {};
	}
	setSize(w, h) {
		this.canvas.width = w;
		this.canvas.height = h;
		this.s = w / PROJECT.design.width;
		this.tex.dispose();
		this.tex.needsUpdate = true;
	}
	begin() {
		const g = this.g;
		g.setTransform(1, 0, 0, 1, 0, 0);
		g.clearRect(0, 0, this.canvas.width, this.canvas.height);
		g.setTransform(this.s, 0, 0, this.s, 0, 0);
		this.dirty = false;
		this.alpha = 1;
	}
	end() {
		if (this.dirty) this.tex.needsUpdate = true;
		return this.dirty;
	}
	/** Families every font falls back on before the system's, as a list to append (', "Noto Sans SC"'). */
	fallback = PROJECT.fontFallback ?? "";
	font(o = {}) {
		return `${o.italic ? "italic " : ""}${o.weight ?? 500} ${o.size ?? 48}px "${o.font ?? "JetBrains Mono"}"${this.fallback}`;
	}
	/** Text width in design units. */
	measure(str, o = {}) {
		const g = this.g;
		g.save();
		g.font = this.font(o);
		if ("letterSpacing" in g) g.letterSpacing = `${o.tracking ?? 0}px`;
		const w = g.measureText(str).width;
		g.restore();
		return w;
	}
	/**
	* Draw a string at (x, y) in design units. Options: size, weight, font, color, alpha, align, baseline,
	* tracking (px), rot, scale, glow (blur radius in design px), glowColor, stroke, strokeWidth, italic.
	*/
	text(str, x, y, o = {}) {
		const a = (o.alpha ?? 1) * this.alpha;
		if (a <= .002 || !str || !this.words) return;
		const g = this.g;
		g.save();
		this.dirty = true;
		g.font = this.font(o);
		g.textAlign = o.align ?? "center";
		g.textBaseline = o.baseline ?? "middle";
		if ("letterSpacing" in g) g.letterSpacing = `${o.tracking ?? 0}px`;
		g.globalAlpha = clamp(a);
		g.translate(x, y);
		if (o.rot) g.rotate(o.rot);
		if (o.scale != null) g.scale(o.scale, o.scale);
		if (o.glow) {
			g.shadowColor = o.glowColor ?? o.color ?? "#fff";
			g.shadowBlur = o.glow * this.s * (o.scale ?? 1);
		}
		if (o.stroke) {
			g.lineWidth = o.strokeWidth ?? (o.size ?? 48) * .06;
			g.strokeStyle = o.stroke;
			g.lineJoin = "round";
			g.strokeText(str, 0, 0);
		}
		g.fillStyle = o.color ?? "#ffffff";
		g.fillText(str, 0, 0);
		g.restore();
	}
	/** Free-form 2D drawing in design units: layer.draw(g => { g.fillRect(...) }). */
	draw(fn) {
		if (this.alpha <= .002) return;
		const g = this.g;
		g.save();
		this.dirty = true;
		g.globalAlpha = clamp(this.alpha);
		fn(g, this.s);
		g.restore();
	}
};
/**
* Default lyric layer: the line being sung, word by word as the words are sung, with the current word
* highlighted. The style comes from theme.js (THEME.lyrics) and `o` overrides it. Key-word lines (all caps) are
* skipped unless the theme or `o.caps` says otherwise: they are staged by their shots. Shots that stage the lyrics
* themselves set `ownsLyrics: true` or call this with their own style.
*/
function drawLyrics(layer, T, t, opts = {}) {
	const o = {
		...THEME.lyrics,
		...opts
	};
	const line = T.lineAt(t, { hold: true });
	if (!line || line.caps && o.skipCaps !== false && !o.caps) return;
	const next = T.lines[line.i + 1], hold = o.hold ?? .35;
	const fadeEnd = Math.min(line.end + hold + .3, next ? next.start : Infinity), fadeStart = Math.min(line.end + hold, fadeEnd - .12);
	const out = t < fadeStart ? 0 : seg(t, fadeStart, fadeEnd);
	if (out >= 1) return;
	const size = o.size ?? 38, x0 = o.x ?? 960, y = o.y ?? 968, style = {
		size,
		weight: o.weight ?? 500,
		font: o.font ?? "JetBrains Mono",
		tracking: o.tracking ?? 0
	};
	const words = line.words.length ? line.words : [{
		text: line.text,
		start: line.start,
		end: line.end
	}];
	const space = layer.measure(" ", style), widths = words.map((w) => layer.measure(w.text, style));
	const total = widths.reduce((a, b) => a + b, 0) + space * (words.length - 1);
	let x = (o.align ?? "center") === "center" ? x0 - total / 2 : x0;
	words.forEach((w, i) => {
		const k = ease.outCubic(seg(t, w.start - .03, w.start + .09));
		const on = t >= w.start && t < w.end;
		layer.text(w.text, x, y + (1 - k) * 10, {
			...style,
			align: "left",
			alpha: k * (1 - out),
			color: on ? o.accent ?? "#9ff3ff" : o.color ?? "#e9f1ff",
			glow: on ? o.glow ?? 14 : 0
		});
		x += widths[i] + space;
	});
}
//#endregion
export { TextCanvas, drawLyrics, loadFonts };
