//#region src/player/subs.js
var Subtitles = class {
	/**
	* subs          { schedule, style, rules }: the exports of src/subs/schedule.js, src/subs/style.js and (optional)
	*               src/subs/rules.js, the project's rows and accent for the schedule, as the master's overlay passes them
	*               (each only when set: without them the schedule gets the translation's skip and silent alone)
	* T             the film's Timing
	* translations  { [lang]: { lines, skip?, silent? } }: assets/subs/<lang>.json. A language whose events cannot be made
	*               (its `skip` names a section the film no longer has, say) is left out with a warning: subtitles are an
	*               extra, and one bad file must not stop the film.
	* designWidth   PROJECT.design.width: the units of the style's positions and sizes
	* fontUrl       file → URL of the style's font, as the page fetches it; with FontFace and fonts (defaults: the
	*               browser's) it makes `ready`, which resolves when the font is in. Without them nothing is loaded.
	*/
	constructor({ schedule, style, rules = null }, T, translations, { designWidth = 1920, fontUrl = null, FontFace = globalThis.FontFace, fonts = globalThis.document?.fonts } = {}) {
		this.schedule = schedule;
		this.style = style;
		this.designWidth = designWidth;
		this.events = {};
		const own = {
			...rules?.rows?.length && { rows: rules.rows },
			...rules?.accent && { accent: rules.accent }
		};
		for (const [lang, tr] of Object.entries(translations)) try {
			this.events[lang] = schedule.subtitleEvents(T, tr.lines ?? {}, {
				skip: tr.skip ?? [],
				silent: tr.silent ?? [],
				...own
			});
		} catch (e) {
			console.warn(`subtitles '${lang}' left out: ${e?.message ?? e}`);
		}
		const f = style.STYLE.font;
		this.ready = fontUrl && FontFace && fonts ? new FontFace(f.family, `url("${fontUrl(f.file)}")`, { weight: String(f.weight) }).load().then((face) => {
			fonts.add(face);
		}).catch(() => {}) : Promise.resolve();
	}
	/** The languages there are subtitles for. */
	get langs() {
		return Object.keys(this.events);
	}
	/** The subtitle of `lang` on screen at song time t: { i, text, row, accent, alpha }, or null. */
	at(lang, t) {
		return this.events[lang] ? this.schedule.subtitleAt(this.events[lang], t) : null;
	}
	/** What a picture depends on, with the canvas size: the canvas is redrawn only when this changes. */
	key(s, w, h) {
		return `${this.schedule.subtitleKey(s)}@${w}x${h}`;
	}
	/** Draw s on canvas c (sized like the picture, in device px) as the master's overlay draws it; null clears it. */
	draw(c, s) {
		this.style.drawSubtitle(c.getContext("2d"), s, this.style.STYLE, c.width / this.designWidth, {
			x: 0,
			y: 0
		});
	}
};
//#endregion
export { Subtitles };
