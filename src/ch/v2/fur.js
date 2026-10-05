import { Float32BufferAttribute, InstancedBufferAttribute, InstancedBufferGeometry, MathUtils, Mesh, Vector2, Vector3, Vector4 } from "../../../vendor/three/build/three.core.js?v=q9f7JKE-";
import { shaderMaterial } from "../../engine/gpu.js?v=o4BYX3o1";
//#region src/ch/v2/fur.js
var ROOT = `
in vec4 aPos, aNrm, aFur, aCol, aAux; in vec2 aLit;
uniform float uBreath;
uniform vec4 uEarB[2], uEarA[2], uTailP;   // ear: hinge point (w: angle), hinge axis; tail: pivot (w: angle)
uniform float uTailU;                      // … and from where along the tail it bends
vec3 rotAxis(vec3 p, vec3 ax, float a) { float c = cos(a), s = sin(a); return p * c + cross(ax, p) * s + ax * dot(ax, p) * (1. - c); }
vec3 rootAt(out vec3 n, out vec3 f) {
  vec3 p = aPos.xyz; n = aNrm.xyz; f = aFur.xyz;
  int part = int(aAux.x + .5);
  if (part == 4 || part == 5) {
    int e = part - 4; float a = uEarB[e].w * smoothstep(0., .4, aAux.y);
    if (a != 0.) { p = uEarB[e].xyz + rotAxis(p - uEarB[e].xyz, uEarA[e].xyz, a); n = rotAxis(n, uEarA[e].xyz, a); f = rotAxis(f, uEarA[e].xyz, a); }
  } else if (part == 6) {
    float a = uTailP.w * smoothstep(uTailU, 1., aAux.y);
    if (a != 0.) { const vec3 up = vec3(0., 1., 0.); p = uTailP.xyz + rotAxis(p - uTailP.xyz, up, a); n = rotAxis(n, up, a); f = rotAxis(f, up, a); }
  }
  return p + n * (uBreath * aNrm.w);
}`;
var HULL_VERT = ROOT + `
uniform float uInset, uDisc;
out vec2 vQ;
void main() {
  vec3 n, f; vec3 p = rootAt(n, f) - n * uInset;
  vec4 mv = modelViewMatrix * vec4(p, 1.);
  vQ = vec2(position.x * 2. - 1., position.y);
  mv.xy += vQ * uDisc;
  gl_Position = projectionMatrix * mv;
}`;
var HULL_FRAG = `
in vec2 vQ; out vec4 o;
void main() { if (dot(vQ, vQ) > 1.) discard; o = vec4(0.); }`;
var HAIR_VERT = ROOT + `
uniform vec2 uVp, uYouP;        // viewport (px); you: intensity, reach
uniform float uT, uFocal, uOrtho, uLen, uHair, uMinPx, uFrizz, uBright, uKey, uWrap, uSpec, uRim, uAmb, uEdge, uStripes, uStripeDark, uPurr, uBuzz;
uniform float uFocus, uAperture, uMaxBlur;
uniform vec3 uLight, uYouC, uYouCol, uRipP;   // ripples: wavenumber, phase, depth (how much brighter the crests are)
uniform vec4 uRipO;                           // … their source, and how far they carry
uniform vec2 uRipF;                           // … how far the first of them has come, and how high they lift the hair tips
out vec3 vCol; out vec2 vQ;
void main() {
  float id = float(gl_InstanceID);
  vec3 n, f; vec3 p = rootAt(n, f);
  vec3 d = normalize(f + (hash31(id * 1.618 + 7.) - .5) * uFrizz);
  float len = aFur.w * uLen * (.7 + .6 * aAux.z);
  // the purr: ripples running out from the throat, as far as the first of them has come; and a faint buzz, each hair
  // with its own phase (nothing moves together, so nothing flashes)
  float dr = distance(p, uRipO.xyz);
  float wave = sin(uRipP.x * dr - uRipP.y) * exp(-dr / max(uRipO.w, 1e-3)) * (1. - smoothstep(uRipF.x - .15, uRipF.x, dr));
  vec3 tip = p + d * len + n * (uPurr * uBuzz * sin(TAU * 25. * uT + TAU * aAux.z) + uRipF.y * wave);
  vec4 ca = projectionMatrix * modelViewMatrix * vec4(p, 1.), cb = projectionMatrix * modelViewMatrix * vec4(tip, 1.);
  if (ca.w < 1e-3 || cb.w < 1e-3) { gl_Position = vec4(2., 2., 2., 1.); vCol = vec3(0.); vQ = vec2(0.); return; }
  vec2 sa = ca.xy / ca.w * uVp * .5, sb = cb.xy / cb.w * uVp * .5, dir = sb - sa;
  float sl = length(dir); dir = sl > 1e-4 ? dir / sl : vec2(1., 0.);
  float dist = uOrtho > .5 ? 1. : ca.w;
  // a hair thinner than the smallest drawn width is drawn that wide and dimmer; out of focus it spreads and dims
  float px = uHair * uFocal / dist, core = max(px, uMinPx);
  float blur = uAperture > 0. ? min(uAperture * abs(ca.w - uFocus) / dist * uFocal, uMaxBlur) : 0.;
  float hw = (core + blur) * 1.1, along = position.x;
  vec2 sp = mix(sa, sb, along) + dir * (along * 2. - 1.) * blur * .5 + vec2(-dir.y, dir.x) * position.y * hw;
  vec4 c = mix(ca, cb, along);
  gl_Position = vec4(sp / (uVp * .5) * c.w, c.z, c.w);
  vQ = vec2(along, position.y);
  float energy = min(1., px / uMinPx) * core / (core + blur) * sl / (sl + blur);

  // the coat: the ground colour, the stripes as far as they are drawn on (in their order along the body), the paint
  float stripe = aCol.a * (1. - smoothstep(uStripes * 1.08 - .08, uStripes * 1.08, aPos.w));
  float coat = (1. - uStripeDark * stripe) * (1. - .92 * aAux.w);
  vec3 base = aCol.rgb * coat;
  vec3 V = normalize(cameraPosition - p), L = normalize(uLight);
  float open = mix(.3, 1., aLit.x), lit = mix(.22, 1., aLit.y);
  float lam = clamp((dot(n, L) + uWrap) / (1. + uWrap), 0., 1.) * lit;
  float TL = dot(d, L), TV = dot(d, V);
  float sheen = pow(clamp(sqrt(max(0., 1. - TL * TL)) * sqrt(max(0., 1. - TV * TV)) - TL * TV, 0., 1.), 22.) * aLit.y;
  // towards the outline the surface is seen edge-on and its hairs pile up in the picture: they are dimmed by as much,
  // or the animal would wear a white line round it; the rim light is then put on as a light, as wide as wanted
  float facing = abs(dot(n, V)), pile = mix(1., facing, uEdge), rim = pow(1. - facing, 2.2);
  vec3 col = base * (open * (pile * (uAmb + uKey * lam) + uRim * rim)) + vec3(.75, .93, 1.) * (uSpec * sheen * coat * open * pile);
  // you: a small warm light right beside the coat. It falls off quickly (what it lights is the face, the paws and
  // the flank right behind it), and it lights the coat as the key light does: creases stay dark, markings stay markings
  vec3 toYou = uYouC - p; float r2 = dot(toYou, toYou), fall = 1. / (1. + r2 / (uYouP.y * uYouP.y));
  float warm = uYouP.x * fall * fall * clamp((dot(n, toYou * inversesqrt(max(r2, 1e-6))) + .3) / 1.3, 0., 1.);
  col += (.2 + .8 * coat) * uYouCol * (warm * pile * open);
  col *= 1. + uRipP.z * wave;
  vCol = col * uBright * energy;
}`;
var HAIR_FRAG = `
in vec3 vCol; in vec2 vQ; out vec4 o;
void main() {
  float across = exp(-vQ.y * vQ.y * 3.2);                                        // a soft round hair
  float along = smoothstep(0., .1, vQ.x) * (1. - smoothstep(.45, 1., vQ.x));     // out of the coat at the root, tapering to the tip
  o = vec4(vCol * across * along, 1.);                                          // additive: alpha 1, colour already weighted
}`;
var v3 = (x = 0, y = 0, z = 0) => ({ value: new Vector3(x, y, z) });
var v4 = () => ({ value: new Vector4() });
var f = (v) => ({ value: v });
var Fur = class {
	/**
	* shape: { pos, nrm, fur, col, aux } (Float32Array(N * 4) each: see v2/cat.js catShape); lit: Float32Array(N * 2)
	* from v2/bake.js (openness, light); ears: [{ base, axis }, …], tail: { pivot, from } for the two small movements.
	*/
	constructor(shape, N, lit, { ears = [], tail = null } = {}) {
		this.N = N;
		const g = new InstancedBufferGeometry();
		g.setAttribute("position", new Float32BufferAttribute([
			0,
			-1,
			0,
			1,
			-1,
			0,
			1,
			1,
			0,
			0,
			1,
			0
		], 3));
		g.setIndex([
			0,
			1,
			2,
			0,
			2,
			3
		]);
		for (const [name, arr, n] of [
			[
				"aPos",
				shape.pos,
				4
			],
			[
				"aNrm",
				shape.nrm,
				4
			],
			[
				"aFur",
				shape.fur,
				4
			],
			[
				"aCol",
				shape.col,
				4
			],
			[
				"aAux",
				shape.aux,
				4
			],
			[
				"aLit",
				lit,
				2
			]
		]) {
			if (arr.length !== N * n) throw new Error(`Fur: ${name} holds ${arr.length / n} samples, expected ${N}`);
			g.setAttribute(name, new InstancedBufferAttribute(arr, n));
		}
		g.instanceCount = N;
		const root = {
			uBreath: f(0),
			uEarB: f([0, 1].map(() => new Vector4())),
			uEarA: f([0, 1].map(() => new Vector4(0, 1, 0, 0))),
			uTailP: v4(),
			uTailU: f(tail?.from ?? .6)
		};
		ears.slice(0, 2).forEach((e, i) => {
			root.uEarB.value[i].set(...e.base, 0);
			root.uEarA.value[i].set(...e.axis, 0);
		});
		if (tail) root.uTailP.value.set(...tail.pivot, 0);
		this.root = root;
		this.hullMat = shaderMaterial({
			vertex: HULL_VERT,
			fragment: HULL_FRAG,
			transparent: false,
			depthWrite: true,
			depthTest: true,
			colorWrite: false,
			side: 2,
			uniforms: {
				...root,
				uInset: f(.02),
				uDisc: f(.014)
			}
		});
		this.hairMat = shaderMaterial({
			vertex: HAIR_VERT,
			fragment: HAIR_FRAG,
			transparent: true,
			depthWrite: false,
			depthTest: true,
			blending: 2,
			side: 2,
			uniforms: {
				...root,
				uVp: f(new Vector2(1920, 1080)),
				uYouP: f(new Vector2(0, 1)),
				uT: f(0),
				uFocal: f(1e3),
				uOrtho: f(0),
				uLen: f(1),
				uHair: f(.0045),
				uMinPx: f(1.1),
				uFrizz: f(.3),
				uBright: f(.06),
				uKey: f(1.1),
				uWrap: f(.4),
				uSpec: f(.5),
				uRim: f(.8),
				uAmb: f(.16),
				uEdge: f(.75),
				uStripes: f(1),
				uStripeDark: f(.8),
				uPurr: f(0),
				uBuzz: f(.004),
				uFocus: f(5),
				uAperture: f(0),
				uMaxBlur: f(40),
				uLight: v3(-.5, .8, .45),
				uYouC: v3(),
				uYouCol: v3(1, .55, .22),
				uRipP: v3(),
				uRipO: v4(),
				uRipF: f(new Vector2(1e3, 0))
			}
		});
		this.hull = new Mesh(g, this.hullMat);
		this.hairs = new Mesh(g, this.hairMat);
		this.hull.frustumCulled = this.hairs.frustumCulled = false;
		this.hull.renderOrder = -1;
	}
	get objects() {
		return [this.hull, this.hairs];
	}
	set visible(v) {
		this.hull.visible = this.hairs.visible = v;
	}
	/**
	* Per frame. t; count (hairs drawn: a prefix is a uniformly thinned coat); len (length factor), hair (width, world
	* units), minPx, frizz; bright, key, wrap, spec, rim, amb, edge (0..1: how much of the hairs' pile-up at the outline
	* is taken out), light [x, y, z] (towards the light, world);
	* stripes 0..1 (how far along the body the tabby markings are drawn on), stripeDark;
	* breath (how far the ribcage stands out now, world units), purr 0..1 (the buzz; buzz: its size, world units),
	* ripple { o: [x, y, z], k (wavenumber), phase, depth (of the brightness), lift (of the hair tips, world units),
	* reach (how far they carry), front (how far from o the first of them has come) }, you { c, col, i (intensity), reach },
	* ears [a, b] (twitch angles), tail (curl angle), focus / aperture / maxBlur (depth of field, as Swarm).
	*/
	set(p, camera, H) {
		const u = this.hairMat.uniforms, r = this.root, g = this.hull.geometry;
		g.instanceCount = Math.min(this.N, Math.round(p.count ?? this.N));
		r.uBreath.value = p.breath ?? 0;
		for (let i = 0; i < 2; i++) r.uEarB.value[i].w = p.ears?.[i] ?? 0;
		r.uTailP.value.w = p.tail ?? 0;
		u.uT.value = p.t ?? 0;
		u.uLen.value = p.len ?? .85;
		u.uHair.value = p.hair ?? .0045;
		u.uMinPx.value = (p.minPx ?? 1.1) * H / 1080;
		u.uFrizz.value = p.frizz ?? .3;
		u.uBright.value = p.bright ?? .05;
		u.uKey.value = p.key ?? 1.3;
		u.uWrap.value = p.wrap ?? .25;
		u.uSpec.value = p.spec ?? .45;
		u.uRim.value = p.rim ?? .09;
		u.uAmb.value = p.amb ?? .1;
		u.uEdge.value = p.edge ?? .94;
		u.uLight.value.set(...p.light ?? [
			-.5,
			.8,
			.45
		]);
		u.uStripes.value = p.stripes ?? 1;
		u.uStripeDark.value = p.stripeDark ?? .9;
		u.uPurr.value = p.purr ?? 0;
		u.uBuzz.value = p.buzz ?? .004;
		const rp = p.ripple;
		u.uRipP.value.set(rp?.k ?? 0, rp?.phase ?? 0, rp?.depth ?? 0);
		u.uRipO.value.set(...rp?.o ?? [
			0,
			0,
			0
		], rp?.reach ?? 1);
		u.uRipF.value.set(rp?.front ?? 1e3, rp?.lift ?? 0);
		const y = p.you;
		u.uYouC.value.set(...y?.c ?? [
			0,
			0,
			0
		]);
		u.uYouCol.value.set(...y?.col ?? [
			1,
			.55,
			.22
		]);
		u.uYouP.value.set(y?.i ?? 0, y?.reach ?? 1);
		u.uFocus.value = p.focus ?? 5;
		u.uAperture.value = p.aperture ?? 0;
		u.uMaxBlur.value = (p.maxBlur ?? 40) * H / 1080;
		u.uOrtho.value = camera.isOrthographicCamera ? 1 : 0;
		const aspect = camera.isPerspectiveCamera ? camera.aspect : (camera.right - camera.left) / (camera.top - camera.bottom);
		u.uVp.value.set(H * aspect, H);
		u.uFocal.value = camera.isPerspectiveCamera ? H / 2 / Math.tan(MathUtils.degToRad(camera.fov) / 2) : H * camera.zoom / (camera.top - camera.bottom);
		return this;
	}
};
//#endregion
export { Fur };
