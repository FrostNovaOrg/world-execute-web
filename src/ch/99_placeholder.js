import { chapter } from "../engine/timeline.js?v=vYBbdLfo";
import { HEX } from "../theme.js?v=Bj33PIbo";
//#region src/ch/99_placeholder.js
chapter({
	id: "placeholder",
	fallback: true,
	shotsFor: (T) => T.sections.map((s) => ({
		id: s.id,
		at: s.start,
		draw(ctx) {
			ctx.text.overlay.text(`${s.id} · ${s.label}`, 960, 500, {
				size: 34,
				color: HEX.dim,
				weight: 400
			});
			ctx.text.overlay.text(`${s.start.toFixed(2)}–${s.end.toFixed(2)} s · not built yet`, 960, 550, {
				size: 20,
				color: "#3d4455",
				weight: 400
			});
		}
	}))
});
//#endregion
