import { CanvasTexture, DynamicDrawUsage, InstancedBufferAttribute, InstancedBufferGeometry, LinearFilter, LinearMipmapLinearFilter, MathUtils, Mesh, PlaneGeometry, SRGBColorSpace } from "../../../vendor/three/build/three.core.js?v=q9f7JKE-";
import { shaderMaterial } from "../../engine/gpu.js?v=o4BYX3o1";
import { RH } from "./kit.js?v=CeXrm8uc";
import { noLig } from "./errors.js?v=B8tisi85";
import { traceScale, traceSize } from "./fit.js?v=CEF0zaKx";
//#region src/ch/bridge/text3d.js
var QVERT = `
in vec3 iPos; in vec4 iQuat; in vec2 iSize; in vec4 iUV; in vec4 iTint;
out vec2 vUv; out vec4 vTint; out float vDepth;
vec3 qrot(vec4 q, vec3 v) { return v + 2. * cross(q.xyz, cross(q.xyz, v) + q.w * v); }
void main() {
  vec3 w = iPos + qrot(iQuat, vec3(position.x * iSize.x, position.y * iSize.y, 0.));
  vUv = mix(iUV.xy, iUV.zw, position.xy + .5);
  vTint = iTint;
  vec4 mv = modelViewMatrix * vec4(w, 1.);
  vDepth = -mv.z;
  gl_Position = projectionMatrix * mv;
}`;
var QFRAG = `
uniform sampler2D uMap; uniform float uFocus, uAperture, uFocal, uMaxLod, uOrtho, uPremul, uMaxCoc;
in vec2 vUv; in vec4 vTint; in float vDepth; out vec4 o;
void main() {
  float coc = uAperture > 0. ? min(uAperture * abs(vDepth - uFocus) * (uOrtho > .5 ? uFocal : uFocal / max(vDepth, 1e-3)), uMaxCoc) : 0.;
  float bias = clamp(log2(max(coc * .45, 1.)), 0., uMaxLod);
  vec4 s = texture(uMap, vUv, bias);
  if (coc > 1.5) {
    vec2 px = fwidth(vUv) * .7071 * coc * .5;
    for (int k = 0; k < 6; k++) { float a = float(k) * 1.0472 + .4; s += texture(uMap, vUv + vec2(cos(a), sin(a)) * px, bias); }
    s /= 7.;
  }
  vec3 rgb = s.rgb * vTint.rgb * vTint.a;
  o = uPremul > .5 ? vec4(rgb, s.a * vTint.a) : vec4(rgb, 1.);
}`;
/** Instanced textured quads: per quad a position, rotation (quaternion), size, uv rect and HDR tint. */
var QuadBatch = class {
	constructor(max, map, { premul = false } = {}) {
		this.max = max;
		this.n = 0;
		const base = new PlaneGeometry(1, 1), g = new InstancedBufferGeometry();
		g.index = base.index;
		g.setAttribute("position", base.getAttribute("position"));
		const attr = (k) => new InstancedBufferAttribute(new Float32Array(max * k), k).setUsage(DynamicDrawUsage);
		this.a = {
			iPos: attr(3),
			iQuat: attr(4),
			iSize: attr(2),
			iUV: attr(4),
			iTint: attr(4)
		};
		for (const [k, v] of Object.entries(this.a)) g.setAttribute(k, v);
		const f = (v) => ({ value: v });
		this.material = shaderMaterial({
			vertex: QVERT,
			fragment: QFRAG,
			transparent: true,
			depthWrite: false,
			depthTest: true,
			side: 2,
			...premul ? {
				blending: 5,
				blendSrc: 201,
				blendDst: 205,
				blendSrcAlpha: 201,
				blendDstAlpha: 205
			} : { blending: 2 },
			uniforms: {
				uMap: f(map),
				uFocus: f(5),
				uAperture: f(0),
				uFocal: f(1e3),
				uMaxLod: f(5),
				uOrtho: f(0),
				uPremul: f(premul ? 1 : 0),
				uMaxCoc: f(60)
			}
		});
		this.mesh = new Mesh(g, this.material);
		this.mesh.frustumCulled = false;
	}
	begin() {
		this.n = 0;
		return this;
	}
	/** pos [x,y,z], quat THREE.Quaternion|[x,y,z,w], size [w,h] (world), uv [u0,v0,u1,v1], tint [r,g,b,a] (HDR). */
	add(pos, quat, size, uv, tint = [
		1,
		1,
		1,
		1
	]) {
		if (this.n >= this.max) return this;
		const i = this.n++, q = Array.isArray(quat) ? quat : [
			quat.x,
			quat.y,
			quat.z,
			quat.w
		];
		this.a.iPos.array.set(pos, i * 3);
		this.a.iQuat.array.set(q, i * 4);
		this.a.iSize.array.set(size, i * 2);
		this.a.iUV.array.set(uv, i * 4);
		this.a.iTint.array.set(tint, i * 4);
		return this;
	}
	/** Upload and set the lens for this camera. o: focus (view distance), aperture, maxLod, maxCoc (px at this H). */
	end(cam, H, o = {}) {
		this.mesh.geometry.instanceCount = this.n;
		for (const a of Object.values(this.a)) {
			a.needsUpdate = true;
			a.clearUpdateRanges?.();
			a.addUpdateRange?.(0, this.n * a.itemSize);
		}
		const u = this.material.uniforms;
		u.uFocus.value = o.focus ?? 5;
		u.uAperture.value = o.aperture ?? 0;
		u.uMaxLod.value = o.maxLod ?? 5;
		u.uMaxCoc.value = (o.maxCoc ?? 60) * H / 1080;
		u.uOrtho.value = cam.isOrthographicCamera ? 1 : 0;
		u.uFocal.value = cam.isPerspectiveCamera ? H / 2 / Math.tan(MathUtils.degToRad(cam.fov) / 2) : H * cam.zoom / (cam.top - cam.bottom);
		this.mesh.visible = true;
		return this;
	}
};
function canvasTexture(canvas, renderer, { premul = false } = {}) {
	const tex = new CanvasTexture(canvas);
	Object.assign(tex, {
		colorSpace: SRGBColorSpace,
		generateMipmaps: true,
		minFilter: LinearMipmapLinearFilter,
		magFilter: LinearFilter,
		premultiplyAlpha: premul
	});
	tex.anisotropy = Math.min(8, renderer?.capabilities?.getMaxAnisotropy?.() ?? 1);
	tex.needsUpdate = true;
	return tex;
}
/** Draw a monospace string one glyph per cell (no ligatures can form: != stays two characters). Returns the end x. */
function monoText(g, s, x, y, cw) {
	for (const ch of String(s)) {
		if (ch !== " ") g.fillText(ch, x, y);
		x += cw;
	}
	return x;
}
/**
* One text line per row. items: [{ text, kind: 'head'|'frame'|'blank' }]. Heads print the error name in red and the
* message in white; frames print "at fn" dim and the file:line:col pale. k scales the resolution (1 = 540p design).
* Returns { tex, rows: [{ row, text, kind, w (fraction of width), uv }], aspect (row width / row height) }.
*/
function traceAtlas(items, renderer, k = 1) {
	k = traceScale(k, items.length, renderer.capabilities.maxTextureSize);
	let c, g, F, RH_, W, H;
	for (;; k *= .85) {
		({F, RH: RH_, W, H} = traceSize(k, items.length));
		c = document.createElement("canvas");
		c.width = W;
		c.height = H;
		g = c.getContext("2d");
		if (g) {
			g.fillStyle = "#fff";
			g.fillRect(W - 1, H - 1, 1, 1);
			if (g.getImageData(W - 1, H - 1, 1, 1).data[0] === 255 || k < .3) break;
		} else if (k < .3) throw new Error(`no 2D canvas for the trace atlas (${W}×${H})`);
	}
	g.fillStyle = "#000";
	g.fillRect(0, 0, W, H);
	g.font = `500 ${F}px "JetBrains Mono"`;
	g.textBaseline = "middle";
	g.textAlign = "left";
	const pad = Math.round(F * .5), rows = [], cw = g.measureText("0").width;
	items.forEach((it, r) => {
		const y = r * RH_ + RH_ / 2;
		let x = pad;
		const put = (s, col, weight = 500) => {
			g.font = `${weight} ${F}px "JetBrains Mono"`;
			g.fillStyle = col;
			x = monoText(g, s, x, y, cw);
		};
		if (it.kind === "head") {
			const m = /^(\w+):(.*)$/.exec(it.text);
			if (m) {
				put(m[1] + ":", RH.red, 700);
				put(m[2], "#f6e8e4", 600);
			} else put(it.text, "#f6e8e4", 600);
		} else if (it.kind === "frame") {
			const m = /^(\s*at )(?:(.+?) \()?(.+?)(\)?)$/.exec(it.text);
			if (m) {
				put(m[1], "#8a5a55");
				if (m[2]) put(m[2] + " (", "#c9a7a2");
				put(m[3], "#ff9f8a");
				put(m[4] || "", "#c9a7a2");
			} else put(it.text, "#c9a7a2");
		} else if (it.text) put(it.text, "#8a5a55");
		rows.push({
			row: r,
			text: it.text,
			kind: it.kind,
			w: Math.min(1, (x + pad) / W),
			uv: [
				0,
				1 - (r + 1) * RH_ / H,
				Math.min(1, (x + pad) / W),
				1 - r * RH_ / H
			]
		});
	});
	return {
		tex: canvasTexture(c, renderer),
		rows,
		aspect: W / RH_,
		rowPx: RH_,
		W,
		H
	};
}
/**
* A code listing of `src` around 1-based line `line`, in the house editor style: gutter numbers, light syntax colour,
* the failing line on a dark red bar with a squiggle under columns [c0, c1). Returns { tex, rows, lineAt(n) → uv rows }.
*/
function codeSheet(src, line, renderer, { before = 12, after = 13, c0 = 1, c1 = 1, k = 1, chars = 72 } = {}) {
	const all = src.split("\n"), first = Math.max(1, line - before), last = Math.min(all.length, line + after);
	const F = Math.round(26 * k), LH = Math.round(F * 1.55), gut = 6, W = Math.ceil(F * .6 * (chars + gut + 2)), H = LH * (last - first + 1) + LH;
	const c = document.createElement("canvas");
	c.width = W;
	c.height = H;
	const g = c.getContext("2d");
	g.fillStyle = "#000";
	g.fillRect(0, 0, W, H);
	g.textBaseline = "middle";
	const cw = (() => {
		g.font = `500 ${F}px "JetBrains Mono"`;
		return g.measureText("0").width;
	})();
	const x0 = cw * 7.5;
	for (let i = first; i <= last; i++) {
		const y = LH * (i - first + .5) + LH * .5, s = all[i - 1] ?? "";
		if (i === line) {
			g.fillStyle = "rgba(255,40,24,.20)";
			g.fillRect(0, y - LH / 2, W, LH);
			g.fillStyle = RH.red;
			g.fillRect(0, y - LH / 2, Math.max(2, F * .12), LH);
		}
		g.font = `500 ${F}px "JetBrains Mono"`;
		g.fillStyle = i === line ? RH.red : "#6b585a";
		g.textAlign = "right";
		g.fillText(String(i), cw * gut, y);
		g.textAlign = "left";
		const text = s.length > chars ? s.slice(0, chars - 1) + "…" : s;
		const ci = text.indexOf("//"), code = ci >= 0 ? text.slice(0, ci) : text, com = ci >= 0 ? text.slice(ci) : "";
		let x = x0;
		const parts = [];
		let last_ = 0;
		code.replace(/'[^']*'|`[^`]*`|\b(?:const|let|return|try|catch|if|else|for|new|function|of|null|true|false|throw)\b/g, (m, off) => {
			parts.push([code.slice(last_, off), "plain"], [m, m[0] === "'" || m[0] === "`" ? "str" : "kw"]);
			last_ = off + m.length;
			return m;
		});
		parts.push([code.slice(last_), "plain"]);
		const col = {
			plain: i === line ? "#fff3ef" : "#d9c9c6",
			kw: i === line ? "#ff8f7a" : "#e0645a",
			str: "#f1c9a0"
		};
		for (const [p, kind] of parts) {
			if (!p) continue;
			g.fillStyle = col[kind];
			x = monoText(g, p, x, y, cw);
		}
		if (com) {
			g.fillStyle = "#6f5c5e";
			monoText(g, com, x, y, cw);
		}
		if (i === line && c1 > c0) {
			const xa = x0 + (c0 - 1) * cw, xb = x0 + (c1 - 1) * cw, yy = y + F * .62, a = F * .09, p = F * .32;
			g.strokeStyle = RH.red;
			g.lineWidth = Math.max(1, F * .07);
			g.beginPath();
			for (let xx = xa; xx <= xb; xx += 1) g[xx === xa ? "moveTo" : "lineTo"](xx, yy + Math.sin((xx - xa) / p * Math.PI) * a);
			g.stroke();
		}
	}
	const rowUV = (i) => {
		const r = i - first;
		return [1 - LH * (r + 1.5) / H, 1 - LH * (r + .5) / H];
	};
	return {
		tex: canvasTexture(c, renderer),
		first,
		last,
		W,
		H,
		LH,
		cw,
		x0,
		rowUV,
		aspect: W / H
	};
}
/**
* An atlas of modal error dialogs (cols × rows), one per message: dark body, thin red rule, a warning glyph, the
* error in two weights, its top frame, and buttons. Transparent margins (premultiplied) so blurred edges stay soft.
* Returns { tex, cells: [uv rect], aspect }.
*/
function dialogAtlas(errors, renderer, { k = 1, cols = 4, rows = 4 } = {}) {
	const cw = Math.round(512 * k), ch = Math.round(240 * k), m = Math.round(10 * k), W = cw * cols, H = ch * rows;
	const c = document.createElement("canvas");
	c.width = W;
	c.height = H;
	const g = c.getContext("2d"), cells = [];
	const F = 17 * k;
	const wrap = (s, max) => {
		const out = [];
		let cur = "";
		for (const w of s.split(" ")) if ((cur + " " + w).trim().length > max) {
			out.push(cur.trim());
			cur = w;
		} else cur += " " + w;
		out.push(cur.trim());
		return out.filter(Boolean);
	};
	errors.slice(0, cols * rows).forEach((e, i) => {
		const x = i % cols * cw, y = Math.floor(i / cols) * ch, w = cw - m * 2, h = ch - m * 2, X = x + m, Y = y + m;
		g.fillStyle = "#0b0405";
		g.fillRect(X, Y, w, h);
		g.strokeStyle = "rgba(255,74,61,.75)";
		g.lineWidth = Math.max(1, 1.5 * k);
		g.strokeRect(X + .5, Y + .5, w - 1, h - 1);
		g.fillStyle = "#2a0705";
		g.fillRect(X + 1, Y + 1, w - 2, 30 * k);
		g.font = `600 ${F * .9}px "JetBrains Mono"`;
		g.textBaseline = "middle";
		g.textAlign = "left";
		g.fillStyle = "#ff8b7c";
		g.fillText(noLig(`exception · ${e.label}`), X + 14 * k, Y + 16 * k);
		g.textAlign = "right";
		g.fillText("×", X + w - 12 * k, Y + 16 * k);
		g.textAlign = "left";
		const tx = X + 40 * k, ty = Y + 88 * k, tr = 22 * k;
		g.strokeStyle = RH.red;
		g.lineWidth = 2.4 * k;
		g.beginPath();
		g.moveTo(tx, ty - tr);
		g.lineTo(tx + tr * .95, ty + tr * .7);
		g.lineTo(tx - tr * .95, ty + tr * .7);
		g.closePath();
		g.stroke();
		g.fillStyle = RH.red;
		g.font = `800 ${F * 1.35}px "JetBrains Mono"`;
		g.textAlign = "center";
		g.fillText("!", tx, ty + 3 * k);
		g.textAlign = "left";
		const name = e.error?.name ?? "Error", msg = e.error?.message ?? String(e.error);
		g.font = `700 ${F * 1.05}px "JetBrains Mono"`;
		g.fillStyle = "#ff5a4a";
		g.fillText(name, X + 78 * k, Y + 62 * k);
		g.font = `500 ${F}px "JetBrains Mono"`;
		g.fillStyle = "#f4e6e2";
		const adv = g.measureText("0").width;
		(e.error?.body ?? wrap(msg, 36)).slice(0, 3).forEach((s, j) => monoText(g, s, X + 78 * k, Y + (90 + j * 22) * k, adv));
		const top = (e.lines ?? []).find((s) => /^\s*at /.test(s));
		if (top) {
			g.font = `500 ${F * .78}px "JetBrains Mono"`;
			g.fillStyle = "#9a6a64";
			g.fillText(noLig(top.trim().slice(0, 52)), X + 78 * k, Y + 166 * k);
		}
		const bw = 74 * k, bh = 26 * k, by = Y + h - bh - 12 * k;
		["OK", "Retry"].forEach((b, j) => {
			const bx = X + w - (bw + 12 * k) * (j + 1);
			g.strokeStyle = j === 0 ? "#f4e6e2" : "#86605c";
			g.lineWidth = 1.2 * k;
			g.strokeRect(bx + .5, by + .5, bw, bh);
			g.fillStyle = j === 0 ? "#f4e6e2" : "#86605c";
			g.font = `600 ${F * .85}px "JetBrains Mono"`;
			g.textAlign = "center";
			g.fillText(b, bx + bw / 2, by + bh / 2 + 1);
			g.textAlign = "left";
		});
		cells.push([
			x / W,
			1 - (y + ch) / H,
			(x + cw) / W,
			1 - y / H
		]);
	});
	return {
		tex: canvasTexture(c, renderer, { premul: true }),
		cells,
		aspect: cw / ch
	};
}
//#endregion
export { QuadBatch, codeSheet, dialogAtlas, monoText, traceAtlas };
