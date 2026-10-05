import { clamp } from "../../engine/math.js?v=BJIlRm7-";
import { HEX } from "../../theme.js?v=Bj33PIbo";
import { OrthographicCamera, PerspectiveCamera } from "../../../vendor/three/build/three.core.js?v=q9f7JKE-";
import { rig } from "../../engine/rig.js?v=39-joEtk";
import { consoleLog } from "../../lib/look.js?v=BfOqFF7i";
import { frame, readout as readout$1 } from "../../lib/hud.js?v=BgmSZjmG";
//#region src/ch/bridge/kit.js
/** Linear HDR colours (multiply for brightness). */
var RC = {
	red: [
		1,
		.1,
		.06
	],
	deep: [
		.5,
		.03,
		.02
	],
	hot: [
		1,
		.42,
		.26
	],
	ash: [
		.5,
		.52,
		.56
	],
	pale: [
		.72,
		.88,
		1
	],
	white: [
		1,
		.94,
		.92
	]
};
/** sRGB text colours. */
var RH = {
	red: "#ff4a3d",
	deep: "#7a1a14",
	hot: "#ff8a66",
	white: "#fff1ec",
	dim: "#6d5f63",
	pale: "#d6f3ff",
	ink: "#1a0706"
};
function makeCams() {
	const persp = new PerspectiveCamera(38, 16 / 9, .01, 600);
	const orth = new OrthographicCamera(-1, 1, 1, -1, .01, 400);
	return {
		persp,
		orth,
		/** Perspective camera at pos looking at look. roll in radians. */
		p(ctx, pos, look, { fov = 38, aspect = ctx.aspect, roll = 0, near = .01, far = 600, inset = false } = {}) {
			const c = persp;
			c.fov = fov;
			c.aspect = aspect;
			c.near = near;
			c.far = far;
			c.position.set(...pos);
			c.up.set(Math.sin(roll), Math.cos(roll), 0);
			c.lookAt(...look);
			c.updateProjectionMatrix();
			c.updateMatrixWorld();
			return rig.cam(c, {
				look,
				inset
			});
		},
		/** Orthographic blueprint view: 'front' (−z), 'top' (−y), 'side' (−x), height in world units. */
		o(center, dir, height, aspect, { inset = false } = {}) {
			const c = orth, w = height * aspect, d = 60, [x, y, z] = center;
			Object.assign(c, {
				left: -w / 2,
				right: w / 2,
				top: height / 2,
				bottom: -height / 2,
				near: .01,
				far: 400,
				zoom: 1
			});
			if (dir === "front") {
				c.position.set(x, y, z + d);
				c.up.set(0, 1, 0);
			} else if (dir === "top") {
				c.position.set(x, y + d, z);
				c.up.set(0, 0, -1);
			} else {
				c.position.set(x + d, y, z);
				c.up.set(0, 1, 0);
			}
			c.lookAt(x, y, z);
			c.updateProjectionMatrix();
			c.updateMatrixWorld();
			return rig.cam(c, {
				look: center,
				inset
			});
		}
	};
}
/** Kick envelope for gentle modulation only (use as 1 + .2 * kick at most). */
var kick = (ctx) => ctx.F.env("onset_drums", ctx.t, .005, .12);
/** Corner frame with the chapter label, plus the console lyrics (typed as sung) in error red. */
function overlays(ctx, label, from, o = {}) {
	frame(ctx.text.overlay, ctx.t, ctx.T, {
		label,
		bottomRight: o.br
	});
	consoleLog(ctx.text.overlay, ctx.T, ctx.t, {
		from,
		accent: RH.red,
		...o.console
	});
}
function readout(ctx, x, y, rows, o = {}) {
	readout$1(ctx.text.overlay, x, y, rows, {
		accent: RH.red,
		...o
	});
}
/**
* System log lines in the console's place and style (for the instrumental, which has no lyrics): each entry
* [time, text] is typed over `dur` seconds from its time; the newest line is bright, older ones dim.
*/
function sysLog(layer, t, entries, o = {}) {
	const size = o.size ?? 24, lh = size * 1.45, x = o.x ?? 110, y = o.y ?? 930, keep = o.keep ?? 3, dur = o.dur ?? .35;
	const shown = entries.filter((e) => e[0] <= t).slice(-keep);
	shown.forEach(([t0, text], k) => {
		const age = shown.length - 1 - k, n = Math.ceil(text.length * clamp((t - t0) / dur));
		layer.text(text.slice(0, n), x, y - age * lh, {
			size,
			weight: 500,
			align: "left",
			color: age ? HEX.dim : RH.white,
			alpha: age === 0 ? .92 : age === 1 ? .42 : .2,
			glow: age ? 0 : 8,
			glowColor: RH.red
		});
	});
}
/** Current real call stack as a compact HUD block ("fn  file:line"). lines: from errors.stackLines. */
function callStack(layer, x, y, lines, o = {}) {
	const size = o.size ?? 14, lh = size * 1.55, a = o.alpha ?? .8;
	layer.text(o.title ?? "call stack", x, y, {
		size,
		weight: 600,
		align: "left",
		color: HEX.dim,
		alpha: a
	});
	const rows = lines.map((s) => /^\s*at (?:(.+?) \()?(.+?):(\d+):(\d+)\)?$/.exec(s));
	const w = Math.min(30, Math.max(18, ...rows.map((m) => m ? (m[1] ?? "(anonymous)").length + 2 : 0)));
	rows.forEach((m, i) => {
		if (!m) return;
		const file = m[2].split("/").slice(-2).join("/"), name = m[1] ?? "(anonymous)";
		const label = name.length > w - 1 ? name.slice(0, w - 2) + "…" : name;
		layer.text(`${label.padEnd(w)}${file}:${m[3]}`, x, y + (i + 1.3) * lh, {
			size,
			weight: 500,
			align: "left",
			color: i === o.hi ? RH.red : RH.white,
			alpha: a * (i === o.hi ? 1 : .62)
		});
	});
}
/** A line of monospace text drawn glyph by glyph on a layer (no ligatures: "!=" stays literal). */
function monoLine(layer, s, x, y, o = {}) {
	const size = o.size ?? 16;
	layer.draw((g, px) => {
		g.font = `${o.weight ?? 600} ${size}px "JetBrains Mono"`;
		g.textBaseline = "middle";
		g.textAlign = "left";
		g.globalAlpha *= o.alpha ?? 1;
		g.fillStyle = o.color ?? RH.white;
		if (o.glow) {
			g.shadowColor = o.glowColor ?? o.color ?? RH.red;
			g.shadowBlur = o.glow * px;
		}
		const cw = g.measureText("0").width, w = String(s).length * cw;
		let xx = o.align === "right" ? x - w : o.align === "center" ? x - w / 2 : x;
		for (const ch of String(s)) {
			if (ch !== " ") g.fillText(ch, xx, y);
			xx += cw;
		}
	});
}
//#endregion
export { RC, RH, callStack, kick, makeCams, monoLine, overlays, readout, sysLog };
