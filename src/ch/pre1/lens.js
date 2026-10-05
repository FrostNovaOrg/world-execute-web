import { CanvasTexture, ClampToEdgeWrapping, LinearFilter, LinearMipmapLinearFilter, Matrix4, RepeatWrapping, Vector2, Vector3 } from "../../../vendor/three/build/three.core.js?v=q9f7JKE-";
import { fsMaterial } from "../../engine/gpu.js?v=o4BYX3o1";
import { LENS, RING, STOPS, aperture, lightImage, ringTurn } from "./lens-model.js?v=l5DjtLSU";
//#region src/ch/pre1/lens.js
var f = (x) => Number.isInteger(x) ? x.toFixed(1) : String(x);
var GHOSTS = [
	[
		-4.6,
		.5,
		9,
		[
			.42,
			1,
			.55
		],
		.2
	],
	[
		-2.4,
		1.05,
		16,
		[
			1,
			.45,
			.85
		],
		.09
	],
	[
		-1.15,
		.28,
		6,
		[
			1,
			.68,
			.35
		],
		.28
	],
	[
		1.7,
		.7,
		11,
		[
			.45,
			.62,
			1
		],
		.12
	],
	[
		3.4,
		1.3,
		22,
		[
			.6,
			1,
			.72
		],
		.05
	],
	[
		5.8,
		.38,
		8,
		[
			1,
			.55,
			.4
		],
		.16
	]
];
var FRAG = `
uniform mat4 uCamWorld, uProjInv;
uniform vec3 uCamPos, uFwd;
uniform float uH, uDof, uFocus;
uniform float uA, uRho, uRot, uRc, uTurn;
uniform vec2 uDir[6], uLam;
uniform float uTrace, uLine, uPoint, uWash, uRim, uStar, uStarLen, uGhost, uVeil, uVeilR, uKey, uSpot, uGain;
uniform vec3 uLightCol, uKeyCol, uKeyDir, uKeyX, uKeyY, uSpotDir;
uniform sampler2D uRing;
in vec2 vUv; out vec4 o;

const float R_IN = ${f(LENS.rIn)}, R_MID = ${f(LENS.rMid)}, R_OUT = ${f(LENS.rOut)}, RF = ${f(LENS.rf)}, Z_APEX = ${f(LENS.zApex)}, N_G = ${f(LENS.n)};
const float Z_B1 = ${f(LENS.zB1)}, R_B1 = ${f(LENS.rB1)}, Z_B2 = ${f(LENS.zB2)}, R_B2 = ${f(LENS.rB2)}, Z_D = ${f(LENS.zD)}, R_H = ${f(LENS.rH)}, Z_L = ${f(LENS.zL)}, Z_R = ${f(LENS.zR)};
const vec3 METAL = vec3(.0062, .0068, .0082);
const float G_M[6] = float[6](${GHOSTS.map((g) => f(g[0])).join(", ")});
const float G_S[6] = float[6](${GHOSTS.map((g) => f(g[1])).join(", ")});
const float G_B[6] = float[6](${GHOSTS.map((g) => f(g[2])).join(", ")});
const vec3 G_C[6] = vec3[6](${GHOSTS.map((g) => `vec3(${g[3].map(f).join(", ")})`).join(", ")});
const float G_G[6] = float[6](${GHOSTS.map((g) => f(g[4])).join(", ")});

float CZ = 1.;   // the cosine between this pixel's ray and the view axis: depth of field goes by depth, not distance
float DP = 1.;   // render pixels per design pixel (widths are given in design pixels: a frame looks the same at any size)
float blurPx(float D) { return uDof * abs(1. / uFocus - 1. / max(D * CZ, 1e-3)) * uH / 1080.; }
// coverage of the inside (d < 0) of a distance d, at u units a pixel, blurred by b pixels
float inside(float d, float u, float b) { float w = b + .7; return 1. - smoothstep(-w, w, d / u); }
// a thin line at distance d, w design pixels wide, blurred by b pixels (its light spread, not lost)
float thin(float d, float u, float w, float b) { float wr = w * DP, wa = max(wr, .6), s = sqrt(wa * wa + b * b), x = d / u / s; return exp(-.5 * x * x) * wr / s; }
float upp(vec2 q) { return max(max(length(dFdx(q)), length(dFdy(q))), 1e-6); }

// the opening (< 0 inside): six discs of radius rho, the k-th centred at −(rho − a)·uDir[k], inside the housing
float opening(vec2 q, float a, float rho) {
  float d = -1e9, e = rho - a;
  for (int k = 0; k < 6; k++) d = max(d, length(q + e * uDir[k]) - rho);
  return max(d, length(q) - R_H);
}
// the studio light: a softbox above left, behind the camera; the room is dark
float softbox(vec3 d, vec3 dir, vec2 size, float soft) {
  float z = dot(d, dir);
  if (z <= .05) return 0.;
  vec2 q = vec2(dot(d, uKeyX), dot(d, uKeyY)) / z;
  vec2 e = abs(q) - size + .04;
  float sd = length(max(e, 0.)) + min(max(e.x, e.y), 0.) - .04;
  return (1. - smoothstep(-soft, soft, sd)) * (.8 + .2 * (1. - smoothstep(0., size.x, length(q))));
}
vec3 env(vec3 d) {
  // (a strip light: tall and narrow, its middle brightest)
  float z = max(dot(d, uKeyDir), 1e-3), along = dot(d, uKeyY) / z;
  return uKeyCol * uKey * 3. * softbox(d, uKeyDir, vec2(.045, .3), .012) * (1. - .6 * smoothstep(.05, .3, abs(along)))
       + vec3(.003, .0036, .0046) * (.35 + .65 * smoothstep(-.3, .9, d.y));
}
// the small studio light (a bare bulb, above right): a round spot of angular radius .012
float spot(vec3 d, vec3 dir) { float c = dot(d, dir); return exp(-(1. - c) / 7.2e-5); }
// residual reflection of an anti-reflection film: its phase at λ (µm) is k·c/λ; normalised to its strongest channel
vec3 coat(float k, float c) { vec3 r = .5 + .5 * cos(k * c / vec3(.65, .55, .45)); return r / max(max(r.r, r.g), max(r.b, 1e-3)); }
float filmCos(float ci, float nf) { return sqrt(max(1. - (1. - ci * ci) / (nf * nf), 0.)); }

// the small light reflected by a coated surface behind the front one (vertex zv, radius R: > 0 convex towards the
// camera), seen along the refracted ray (o2, d2): a small dot in the coating's colour
vec3 glint(vec3 o2, vec3 d2, vec3 sp, float zv, float R, float k, float g) {
  vec3 c = vec3(0., 0., zv - R), oc = o2 - c;
  float b = dot(oc, d2), h = b * b - dot(oc, oc) + R * R;
  if (h < 0.) return vec3(0.);
  float t = R > 0. ? -b - sqrt(h) : -b + sqrt(h);
  vec3 p = o2 + d2 * t;
  vec3 n = normalize(p - c); n = dot(n, d2) > 0. ? -n : n;
  vec3 rf = reflect(d2, n);
  float ci = clamp(-dot(d2, n), 0., 1.);
  return uSpot * g * spot(rf, sp) * coat(k, filmCos(ci, 1.38)) * (1. - smoothstep(.62, .8, length(p.xy)));
}

// the bezel: black anodised, turned (a radial streak of light where the grooves face the half-way vector), chamfered
// edges, a step between the two rings, and the engraved paint (the ring texture: the outer ring turned by uTurn)
vec3 bezel(vec3 p, float r, float u, vec2 dpx, vec2 dpy, vec3 H, vec3 V) {
  vec2 dir = p.xy / r;
  vec3 T = vec3(-dir.y, dir.x, 0.);
  float th = dot(T, H);
  float streak = pow(max(1. - th * th, 0.), 70.) * smoothstep(0., .5, H.z);
  float fine = 1. - smoothstep(.2, .6, 3200. * u / TAU);                     // grooves finer than a pixel average out
  float gr = .78 + .22 * sin(r * 3200.) * fine + .1 * (hash11(floor(r * 900.)) - .5) * fine;
  vec3 col = METAL * (.55 + .45 * uKeyDir.z) * 1.4 + uKeyCol * uKey * (.03 * streak * gr + .0035 * streak);
  // the paint
  float outer = step(R_MID, r), turn = outer * uTurn;
  float ang = atan(p.y, p.x), r2 = r * r;
  vec2 gx = vec2(-(p.x * dpx.y - p.y * dpx.x) / r2 / TAU, dot(dir, dpx) / (R_OUT - R_IN));
  vec2 gy = vec2(-(p.x * dpy.y - p.y * dpy.x) / r2 / TAU, dot(dir, dpy) / (R_OUT - R_IN));
  vec4 tx = textureGrad(uRing, vec2((turn - ang) / TAU, (r - R_IN) / (R_OUT - R_IN)), gx, gy);
  float lam = max(dot(vec3(0., 0., 1.), uKeyDir), 0.);
  col = col * (1. - tx.a) + tx.rgb * (uKeyCol * uKey * (.045 * lam + .012) + .012);   // (premultiplied)
  // chamfers: the inner one leans towards the axis, the outer one away from it
  vec3 nIn = normalize(vec3(-dir * .75, .66)), nOut = normalize(vec3(dir * .75, .66));
  float sIn = pow(max(dot(nIn, H), 0.), 24.), sOut = pow(max(dot(nOut, H), 0.), 24.);
  col += uKeyCol * uKey * (.09 * sIn + .006) * thin(r - R_IN - .005, u, 1.6, 0.);
  col += uKeyCol * uKey * (.07 * sOut + .004) * thin(r - R_OUT + .006, u, 1.4, 0.);
  // the step between the name ring and the aperture ring: a dark gap with a lit lip
  col *= 1. - .8 * thin(r - R_MID, u, 1.2, 0.);
  col += uKeyCol * uKey * .03 * pow(max(dot(nOut, H), 0.), 16.) * thin(r - R_MID - .004, u, .9, 0.);
  return col * (1. - smoothstep(R_OUT, R_OUT + 2. * u, r));
}

// the blades: which blade covers q (pinwheel seams from the corners, turning outwards), its sheen, the shadow of the
// blade lying on it and the lit edge of its own
vec3 blades(vec2 q, float u, float b, vec3 H) {
  float r = length(q), ang = atan(q.y, q.x);
  float psi = (ang - uRot - PI / 6. - 1.35 * max(r - uRc, 0.)) / (TAU / 6.);
  float k = floor(psi), w = psi - k, id = mod(k, 6.);
  float span = TAU / 6. * r / sqrt(1. + 1.82 * r * r);                     // the sector's width across, at r
  float ta = uRot + (id + .5) * TAU / 6. + 2.1;
  vec3 n = normalize(vec3(vec2(cos(ta), sin(ta)) * (.1 + .14 * w + .06 * hash11(id + 7.)), 1.));   // each blade leans on the next
  float sheen = pow(max(dot(n, H), 0.), 60.);
  vec3 col = METAL * (.7 + .5 * w) * (.85 + .3 * hash11(id + 3.)) + uKeyCol * uKey * .006 * sheen;
  col *= 1. - .85 * exp(-w * span / u / (1.5 * DP + b));                         // in the shadow of the edge above it
  col += uKeyCol * uKey * .005 * thin((1. - w) * span, u, 1., b) * (.3 + sheen * 2.);
  // the housing beyond the blades
  return mix(col, METAL * .6, smoothstep(R_H - u, R_H + u, r));
}

void main() {
  vec4 v = uProjInv * vec4(vUv * 2. - 1., 1., 1.); v /= v.w;
  vec3 rd = normalize((uCamWorld * vec4(v.xyz, 0.)).xyz), ro = uCamPos, V = -rd;
  vec3 H = normalize(uKeyDir + V);
  CZ = dot(rd, uFwd); DP = uH / 1080.;

  // ---- the bezel plane
  float t0 = (0. - ro.z) / rd.z;
  vec3 p0 = ro + rd * t0;
  vec2 dpx = dFdx(p0.xy), dpy = dFdy(p0.xy);
  float r0 = length(p0.xy), u0 = max(max(length(dpx), length(dpy)), 1e-6);
  float glass = 1. - smoothstep(R_IN - u0, R_IN + u0, r0);

  // ---- the front element: reflect, then refract the view inside
  vec3 cs = vec3(0., 0., Z_APEX - RF), oc = ro - cs;
  float bq = dot(oc, rd), hq = max(bq * bq - dot(oc, oc) + RF * RF, 0.);
  float tg = -bq - sqrt(hq);
  vec3 pg = ro + rd * tg, ng = (pg - cs) / RF;
  float ci = clamp(dot(V, ng), 0., 1.);
  vec3 rd2 = refract(rd, ng, 1. / N_G);
  vec3 keyIn = normalize(vec3(uKeyDir.xy / N_G, sqrt(max(1. - dot(uKeyDir.xy, uKeyDir.xy) / (N_G * N_G), 0.))));
  vec3 Hin = normalize(keyIn - rd2);

  // the layers inside (the path in the glass looks 1/n as long)
  vec3 h1 = pg + rd2 * ((Z_B1 - pg.z) / rd2.z), h2 = pg + rd2 * ((Z_B2 - pg.z) / rd2.z);
  vec3 hd = pg + rd2 * ((Z_D - pg.z) / rd2.z), hl = pg + rd2 * ((Z_L - pg.z) / rd2.z), hr = pg + rd2 * ((Z_R - pg.z) / rd2.z);
  float s1 = upp(h1.xy), s2 = upp(h2.xy), sD = upp(hd.xy), sL = upp(hl.xy);
  float b1 = blurPx(tg + distance(pg, h1) / N_G), b2 = blurPx(tg + distance(pg, h2) / N_G), bD = blurPx(tg + distance(pg, hd) / N_G);
  float bL = blurPx(tg + distance(pg, hl) / N_G);

  vec3 inner = vec3(0.); float tr = 1.;
  // baffles: black rings, their inner lips lit on the side that faces the light
  vec2 kd = normalize(uKeyDir.xy);
  float rr = length(h1.xy), a1 = inside(R_B1 - rr, s1, b1);
  inner += tr * a1 * (METAL * .55 + uKeyCol * uKey * .006 * pow(max(dot(-h1.xy / rr, kd), 0.), 3.) * thin(rr - R_B1 - .006, s1, 1.4, b1));
  tr *= 1. - a1;
  rr = length(h2.xy); float a2 = inside(R_B2 - rr, s2, b2);
  inner += tr * a2 * (METAL * .45 + uKeyCol * uKey * .005 * pow(max(dot(-h2.xy / rr, kd), 0.), 3.) * thin(rr - R_B2 - .006, s2, 1.2, b2));
  tr *= 1. - a2;
  // the diaphragm
  float dOp = opening(hd.xy, uA, uRho), aD = 1. - inside(dOp, sD, bD);
  inner += tr * aD * blades(hd.xy, sD, bD, Hin);
  // the blades' inner edges catch the light from behind (a little more on the side of the studio lights)
  float ea = atan(hd.y, hd.x);
  inner += tr * uRim * uLightCol * thin(dOp - 1.2 * DP * sD, sD, 1.1, bD) * (.72 + .28 * sin(ea - .7)) * (.4 + .6 * exp(-length(hd.xy) / max(uA * 2.5, .05)));
  tr *= 1. - aD;
  // the light: the trace switched off into a point, its glow, and the light it throws behind the opening
  vec2 ql = hl.xy;
  float rl = length(ql);
  float dl = length(vec2(max(abs(ql.x) - uTrace, 0.), ql.y));
  float wp = 2.2 * DP, sp2 = wp * wp + bL * bL, xl = rl / sL;
  vec3 lit = uLightCol * (uLine * thin(dl, sL, 2.4, bL) + uPoint * exp(-.5 * xl * xl / sp2) * wp * wp / sp2
           + uPoint * .03 * exp(-rl / .07) + uWash * (.45 * exp(-rl * rl / .18) + .55 * exp(-dl * dl / .035)));
  inner += tr * lit;
  // the rear group: a faint disc of the light the glass behind gathers
  inner += tr * uLightCol * uWash * .25 * (1. - smoothstep(.55, .62, length(hr.xy))) * exp(-length(hr.xy) / .4);

  // ---- the front surface: its reflection (a magenta coating), and the copies from the surfaces behind it
  float F = mix(.006, 1., pow(1. - ci, 5.));
  vec3 rfl = reflect(rd, ng), tint = coat(1.634, filmCos(ci, 1.38));
  vec3 refl = env(rfl) * F * mix(vec3(1.), tint, .3) * 1.4 + uSpot * F * spot(rfl, uSpotDir) * mix(vec3(1.), tint, .7);
  vec3 spIn = normalize(vec3(uSpotDir.xy / N_G, sqrt(max(1. - dot(uSpotDir.xy, uSpotDir.xy) / (N_G * N_G), 0.))));
  ${[
	[
		-.2,
		-3.2,
		1.414,
		.0017
	],
	[
		-.34,
		1.5,
		6.91,
		.004
	],
	[
		-.52,
		-1.15,
		1.634,
		.0035
	],
	[
		-.7,
		.95,
		2.042,
		.003
	]
].map(([z, R, k, g]) => `refl += glint(pg, rd2, spIn, ${f(z)}, ${f(R)}, ${f(k)}, ${f(g)});`).join("\n  ")}
  vec3 col = glass * (inner + refl);

  // ---- ghosts: images of the opening on the line from the axis through the light's image (in the bezel plane)
  // (each is a little larger in red than in blue: coloured fringes; brighter towards the light, and the larger the
  // fainter, its light spread over more glass)
  vec3 gh = vec3(0.);
  vec2 lamDir = normalize(uLam + vec2(1e-5));
  for (int g = 0; g < 6; g++) {
    float bb = G_B[g] * uH / 1080., s = G_S[g];
    vec2 q = p0.xy - uLam * G_M[g];
    vec3 d = vec3(opening(q / (s * 1.035), uA, uRho) * s * 1.035, opening(q / s, uA, uRho) * s, opening(q / (s * .965), uA, uRho) * s * .965);
    vec3 fill = vec3(inside(d.r, u0, bb), inside(d.g, u0, bb), inside(d.b, u0, bb));
    vec3 ring = vec3(thin(d.r + u0 * bb * .3, u0, 1.4, bb * .5), thin(d.g + u0 * bb * .3, u0, 1.4, bb * .5), thin(d.b + u0 * bb * .3, u0, 1.4, bb * .5));
    float grad = .75 + .25 * clamp(dot(q, lamDir) * sign(G_M[g]) / max(s * uA, .02), -1., 1.);
    gh += G_C[g] * G_G[g] * (fill * .55 * grad + ring * .45) * min(1., pow(.5 / s, 1.5));
  }
  col += glass * uGhost * gh;

  // ---- the diffraction star of the hexagonal opening (spikes across its straight sides), red reaching furthest
  vec3 star = vec3(0.);
  float sw = max(1.3 * uH / 1080., .8);
  for (int j = 0; j < 3; j++) {
    vec2 dj = uDir[j];
    float al = abs(dot(ql, dj)) / sL, pe = abs(dot(ql, vec2(-dj.y, dj.x))) / sL;
    vec3 L = uStarLen * uH / 1080. * vec3(1.15, 1., .86);
    star += exp(-.5 * pe * pe / (sw * sw)) * (exp(-al / L) * .5 + exp(-al / (L * .2)) * .9) * (.85 + .15 * cos(al * vec3(.11, .13, .155) * 1080. / uH));
  }
  col += glass * uStar * uLightCol * star;

  // ---- the veil: flare spreading over the glass from the light
  float rv = length(p0.xy - uLam);
  col += uVeil * uLightCol * (glass * (.25 + exp(-rv * rv / max(uVeilR * uVeilR, 1e-4))) + (1. - glass) * .06 * exp(-max(r0 - R_IN, 0.) * 6.));

  // ---- the bezel (opaque, in front of everything inside)
  vec3 bz = bezel(p0, max(r0, 1e-4), u0, dpx, dpy, H, V);
  col = mix(bz + uVeil * uLightCol * .02, col, glass);
  o = vec4(col * uGain, 1.);
}`;
/**
* The engraved rings as a texture laid around the bezel: u is the angle clockwise from +x (one turn), v the radius from
* rIn (0) to rOut (1). The outer band (the aperture ring) carries the f-numbers a ring step apart, clockwise from 1.4,
* and dots at the half stops; the inner band (fixed) the index under the set stop and the lens's inscription.
* White paint, RGB = colour, A = coverage.
*/
var RING_TEX = null;
function ringTexture() {
	if (RING_TEX) return RING_TEX;
	const W = 8192, Hc = 512, cv = document.createElement("canvas");
	cv.width = W;
	cv.height = Hc;
	const g = cv.getContext("2d"), pxU = Hc / (LENS.rOut - LENS.rIn);
	const yOf = (r) => (1 - (r - LENS.rIn) / (LENS.rOut - LENS.rIn)) * Hc, xOf = (beta) => (beta / (2 * Math.PI) % 1 + 1) % 1 * W;
	const at = (beta, r, fn) => {
		for (const dx of [
			-8192,
			0,
			W
		]) {
			g.save();
			g.translate(xOf(beta) + dx, yOf(r));
			g.scale(W / (2 * Math.PI * r) / pxU, 1);
			g.scale(pxU, pxU);
			fn();
			g.restore();
		}
	};
	const textU = (s, beta, r, size, o = {}) => at(beta, r, () => {
		g.scale(1 / 100, 1 / 100);
		g.font = `${o.weight ?? 600} ${size * 100}px "Space Grotesk"`;
		g.textAlign = "center";
		g.textBaseline = "middle";
		if ("letterSpacing" in g) g.letterSpacing = `${(o.tracking ?? 0) * 100}px`;
		g.fillStyle = o.color ?? "#ffffff";
		g.fillText(s, 0, 0);
	});
	const rNum = (LENS.rMid + LENS.rOut) / 2 + .004;
	STOPS.forEach((N, i) => {
		textU(String(N), i * RING.step, rNum, .064, {
			weight: 600,
			color: i === 0 ? "#ffb45a" : "#f2f2ee"
		});
		if (i < STOPS.length - 1) at((i + .5) * RING.step, rNum, () => {
			g.fillStyle = "#f2f2ee";
			g.beginPath();
			g.arc(0, 0, .0085, 0, 2 * Math.PI);
			g.fill();
		});
	});
	at(-RING.index, LENS.rMid - .03, () => {
		g.fillStyle = "#f2f2ee";
		g.beginPath();
		g.moveTo(0, -.022);
		g.lineTo(.017, .014);
		g.lineTo(-.017, .014);
		g.closePath();
		g.fill();
	});
	textU("1:1.4   f = 50 mm   Ø 58", -.02, (LENS.rIn + LENS.rMid) / 2 + .002, .046, {
		weight: 500,
		tracking: .006,
		color: "#e8e8e2"
	});
	const tex = new CanvasTexture(cv);
	Object.assign(tex, {
		colorSpace: "",
		wrapS: RepeatWrapping,
		wrapT: ClampToEdgeWrapping,
		minFilter: LinearMipmapLinearFilter,
		magFilter: LinearFilter,
		generateMipmaps: true,
		anisotropy: 8,
		premultiplyAlpha: true
	});
	tex.needsUpdate = true;
	return RING_TEX = tex;
}
/** The lens as a full-screen material (ctx.pass), aimed and set each frame by setLens. */
function makeLens() {
	const v3 = (...a) => ({ value: new Vector3(...a) }), n = (x) => ({ value: x });
	return fsMaterial(FRAG, {
		uCamWorld: { value: new Matrix4() },
		uProjInv: { value: new Matrix4() },
		uCamPos: v3(),
		uFwd: v3(0, 0, -1),
		uH: n(1080),
		uDof: n(60),
		uFocus: n(3),
		uA: n(.4),
		uRho: n(.5),
		uRot: n(0),
		uRc: n(.4),
		uTurn: n(0),
		uDir: { value: Array.from({ length: 6 }, () => new Vector2()) },
		uLam: { value: new Vector2() },
		uTrace: n(0),
		uLine: n(0),
		uPoint: n(0),
		uWash: n(0),
		uRim: n(0),
		uStar: n(0),
		uStarLen: n(60),
		uGhost: n(0),
		uVeil: n(0),
		uVeilR: n(.3),
		uKey: n(3),
		uSpot: n(300),
		uGain: n(1),
		uLightCol: v3(.55, .8, 1),
		uKeyCol: v3(.9, .95, 1),
		uKeyDir: v3(0, 0, 1),
		uKeyX: v3(1, 0, 0),
		uKeyY: v3(0, 1, 0),
		uSpotDir: v3(0, 0, 1),
		uRing: { value: ringTexture() }
	});
}
var KEY = new Vector3(-.32, .38, .87).normalize();
var SPOT = new Vector3(.3, .26, .92).normalize();
var KX = new Vector3();
var KY = new Vector3();
KX.crossVectors(new Vector3(0, 1, 0), KEY).normalize();
KY.crossVectors(KEY, KX);
/**
* Point the lens at a camera and set it. o: N (f-number), focus (distance in focus; default the bezel along the view
* axis), dof (blur: design px for |1/F − 1/D| = 1), trace (half-length of the scope's line; 0: a point), line, point,
* wash, rim, star, starLen (px), ghost, veil, veilR, key, spot (the two studio lights), lightCol, gain. Returns the
* diaphragm (lens-model.js aperture()).
*/
function setLens(m, cam, H, o) {
	const u = m.uniforms;
	cam.updateMatrixWorld();
	u.uCamWorld.value.copy(cam.matrixWorld);
	u.uProjInv.value.copy(cam.projectionMatrixInverse);
	u.uCamPos.value.setFromMatrixPosition(cam.matrixWorld);
	const c = u.uCamPos.value.toArray(), fwd = new Vector3(0, 0, -1).applyQuaternion(cam.quaternion);
	u.uFwd.value.copy(fwd);
	u.uH.value = H;
	u.uFocus.value = o.focus ?? (fwd.z < -.001 ? -c[2] / fwd.z : 3);
	u.uDof.value = o.dof ?? 60;
	const ap = aperture(o.N);
	u.uA.value = ap.a;
	u.uRho.value = ap.rho;
	u.uRot.value = ap.rot;
	u.uRc.value = ap.rc;
	u.uTurn.value = ringTurn(Math.max(o.N, 1.4));
	u.uDir.value.forEach((d, k) => d.set(Math.cos(ap.rot + k * Math.PI / 3), Math.sin(ap.rot + k * Math.PI / 3)));
	u.uLam.value.set(...lightImage(c));
	for (const [k, n] of [
		["trace", "uTrace"],
		["line", "uLine"],
		["point", "uPoint"],
		["wash", "uWash"],
		["rim", "uRim"],
		["star", "uStar"],
		["starLen", "uStarLen"],
		["ghost", "uGhost"],
		["veil", "uVeil"],
		["veilR", "uVeilR"],
		["key", "uKey"],
		["spot", "uSpot"],
		["gain", "uGain"]
	]) if (o[k] != null) u[n].value = o[k];
	if (o.lightCol) u.uLightCol.value.set(...o.lightCol);
	u.uKeyDir.value.copy(KEY);
	u.uKeyX.value.copy(KX);
	u.uKeyY.value.copy(KY);
	u.uSpotDir.value.copy(SPOT);
	return ap;
}
//#endregion
export { makeLens, ringTexture, setLens };
