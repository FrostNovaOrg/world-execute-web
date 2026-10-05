import { THEME } from "../theme.js?v=Bj33PIbo";
import { BufferAttribute, BufferGeometry, OrthographicCamera, Points, Scene, Vector2, Vector3 } from "../../vendor/three/build/three.core.js?v=q9f7JKE-";
import { fsMaterial, shaderMaterial } from "./gpu.js?v=o4BYX3o1";
//#region src/engine/pointcut.js
var MAX_COLS = 640;
var MAX_ROWS = 360;
var BG = `
uniform sampler2D tA, tB; uniform float uP;
in vec2 vUv; out vec4 o;
void main() {
  // the pictures themselves: the outgoing one hands over to its points at the start, the incoming one takes over at the end
  o = vec4(texture(tA, vUv).rgb * (1. - smoothstep(0., .14, uP)) + texture(tB, vUv).rgb * smoothstep(.86, 1., uP), 1.);
}`;
var VERT = `
uniform sampler2D tA, tB;
uniform vec2 uGrid; uniform float uP, uAspect, uStep, uSeed, uRadius, uGain;
uniform vec3 uBall;
out vec3 vCol; out float vRound;
void main() {
  float i = float(gl_VertexID);
  vec2 g = vec2(mod(i, uGrid.x), floor(i / uGrid.x)), uv = (g + .5) / uGrid, home = uv * 2. - 1.;
  vec3 a = texture(tA, uv).rgb, b = texture(tB, uv).rgb;
  float h = hash11(i * .754877 + uSeed), h2 = hash11(i * 1.3247 + 7.1 + uSeed);
  float r0 = length(home * vec2(uAspect, 1.)) / length(vec2(uAspect, 1.));        // 0 at the centre, 1 in the corners
  // each point leaves its place (the centre first), joins the ball, then leaves for its new place (the centre last)
  float d1 = r0 * .14 + h * .10, d2 = (1. - r0) * .10 + h2 * .10;
  float k1 = smoothstep(d1, d1 + .36, uP), k2 = smoothstep(.42 + d2, .80 + d2, uP);
  float inBall = k1 * (1. - k2);
  // its place in the ball: a point of a sphere, turning slowly
  vec3 s = normalize(hash31(i * 1.618 + uSeed) - .5) * pow(hash11(i * 2.71 + uSeed), .4);
  s.xz = rot2(uP * 2.2) * s.xz;
  vec2 ball = vec2(s.x / uAspect, s.y) * uRadius;
  vec2 pos = mix(mix(home, ball, k1), home, k2);
  // on the way in and out the points spiral around the centre
  float sw = (k1 * (1. - k1) - k2 * (1. - k2)) * 2.6;
  pos = vec2(1. / uAspect, 1.) * (rot2(sw) * (pos * vec2(uAspect, 1.)));
  gl_Position = vec4(pos, 0., 1.);
  float swap = smoothstep(.44, .56, uP);
  float vis = mix(smoothstep(.015, .09, luma(a)), smoothstep(.015, .09, luma(b)), swap);
  // the ball is always the same ball, however little of either picture is bright: a fixed share of the points are in
  // it, and those that were dark in the picture light up on the way
  vis = mix(vis, step(hash11(i * 3.17 + uSeed), .42), inBall);
  // in the ball every point has the subject's colour, evenly bright (the pictures' own brightness would burn it out)
  vec3 col = mix(mix(a, b, swap), uBall * (.35 + .9 * h), inBall);
  float on = smoothstep(0., .14, uP) * (1. - smoothstep(.86, 1., uP));
  vCol = col * vis * on * mix(1., uGain, inBall);
  vRound = smoothstep(0., .25, max(k1 * (1. - k1), k2 * (1. - k2)) * 4. + inBall);
  gl_PointSize = uStep * mix(1., 1.9, vRound);
}`;
var FRAG = `
in vec3 vCol; in float vRound; out vec4 o;
void main() {
  // at rest a point is a square tile of the picture; in flight a soft round spark of the same energy
  float r = length(gl_PointCoord - .5) * 2.;
  float soft = exp(-r * r * 3.2) * (1. - smoothstep(.8, 1., r)) * .85;
  o = vec4(vCol * mix(1., soft, vRound), 1.);
}`;
var PointCut = class {
	constructor() {
		this.bg = fsMaterial(BG, {
			tA: { value: null },
			tB: { value: null },
			uP: { value: 0 }
		});
		const geo = new BufferGeometry();
		geo.setAttribute("position", new BufferAttribute(new Float32Array(MAX_COLS * MAX_ROWS * 3), 3));
		this.material = shaderMaterial({
			vertex: VERT,
			fragment: FRAG,
			transparent: true,
			depthWrite: false,
			depthTest: false,
			blending: 2,
			uniforms: {
				tA: { value: null },
				tB: { value: null },
				uGrid: { value: new Vector2() },
				uP: { value: 0 },
				uAspect: { value: 16 / 9 },
				uStep: { value: 2 },
				uSeed: { value: 0 },
				uRadius: { value: .2 },
				uGain: { value: .5 },
				uBall: { value: new Vector3(...THEME.pointcut.ball) }
			}
		});
		this.points = new Points(geo, this.material);
		this.points.frustumCulled = false;
		this.scene = new Scene();
		this.scene.add(this.points);
		this.camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
	}
	/**
	* Draw the join at progress p (0..1) into target. o (the join): radius (of the ball, in frame heights), gain, seed,
	* color (of the ball, linear; THEME.pointcut.ball unless given).
	*/
	render(renderer, fsq, texA, texB, p, target, W, H, o = {}) {
		const b = this.bg.uniforms, u = this.material.uniforms;
		b.tA.value = texA;
		b.tB.value = texB;
		b.uP.value = p;
		fsq.render(renderer, this.bg, target);
		const step = Math.max(2, Math.round(H / 360)), cols = Math.min(MAX_COLS, Math.ceil(W / step)), rows = Math.min(MAX_ROWS, Math.ceil(H / step));
		u.tA.value = texA;
		u.tB.value = texB;
		u.uGrid.value.set(cols, rows);
		u.uP.value = p;
		u.uAspect.value = W / H;
		u.uStep.value = Math.max(W / cols, H / rows);
		u.uSeed.value = o.seed ?? 0;
		u.uRadius.value = (o.radius ?? .2) * 2;
		u.uGain.value = o.gain ?? .5;
		u.uBall.value.fromArray(o.color ?? THEME.pointcut.ball);
		this.points.geometry.setDrawRange(0, cols * rows);
		renderer.setRenderTarget(target);
		renderer.render(this.scene, this.camera);
	}
};
//#endregion
export { PointCut };
