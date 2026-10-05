import { chapter } from "../engine/timeline.js?v=vYBbdLfo";
import { clamp, ease, hash, lerp, mix3, rng, seg } from "../engine/math.js?v=BJIlRm7-";
import { HEX } from "../theme.js?v=Bj33PIbo";
import { remade } from "../lib/published.js?v=aV_CU5HV";
import { Euler, Quaternion, Scene } from "../../vendor/three/build/three.core.js?v=q9f7JKE-";
import { GlowLines } from "../engine/lines.js?v=B_AAaaTO";
import { consoleLog } from "../lib/look.js?v=BfOqFF7i";
import { callout, crosshair, dimLine, frame, toDesign, viewportFrame } from "../lib/hud.js?v=BgmSZjmG";
import { onShape, source } from "../lib/glyphs.js?v=DWbHICXG";
import { capture, view } from "../lib/modes.js?v=Cu3GYO-2";
import { shapes } from "../engine/shapes.js?v=BFh0PgdI";
import { RC, RH, callStack, kick, makeCams, monoLine, overlays, readout } from "./bridge/kit.js?v=CeXrm8uc";
import { CorruptSwarm, f32bits, qfloat } from "./bridge/corrupt.js?v=SFN2swSb";
import { CorruptGlyphs } from "./bridge/glyphs.js?v=BtXgzP2a";
import { FLOOR_CODE, TearFloor, codeGrid } from "./bridge/floor.js?v=BjISKwl7";
import { assert, headline, noLig, parseFrame, stackLines } from "./bridge/errors.js?v=B8tisi85";
import { QuadBatch, codeSheet, dialogAtlas, traceAtlas } from "./bridge/text3d.js?v=C8lr28-L";
import { LANDED_N, landedHeart } from "./bridge/landed.js?v=zRka1JTZ";
//#region src/ch/10_bridge.js
var SRC = "// bridge · \"Challenging your god / You have made some ILLEGAL ARGUMENTS\": the program breaks (13 shots in 4 bars).\n// The first red of the film creeps out from where c2x's heart hit the floor (the same pieces, landed exactly where c2x\n// dropped them: bridge/landed.js), and behind it the floor turns out to be its own source code. Then the program shows its own failure, for real: every error message, stack frame and line\n// number on screen is thrown live by the JavaScript engine from inside this file's draw calls (PROBES below: illegal\n// arguments to the engine's own Timeline.at, Timing.section, hud.toDesign, …), the assert shot shows this file's own\n// source around the line that fails, and the damage to me (a sphere of its own code, src/main.js) is numerical:\n// IEEE-754 precision loss, then coordinates doubling until float32 overflows.\n//   spread              grey grid → error red, from every impact: R(τ) = 4.5·τ + 4.5·τ² (τ: time since the hit) GRID\n//   decompile           a second front behind the first: the floor is a page of source (floor.js first)      CODE\n//   trace, traceMacro   a waterfall of real stack traces: lines slide off a ledge and fall on y = −g·z² / 2v²  VOID\n//   assert              assert(you != null) throws in this very file (macro on the listing, lens blur)        CODE\n//   bits                me's coordinates keep fewer and fewer mantissa bits; its characters rot             VOID\n//   nan, nanWide        coordinates double until float32 overflows: Infinity, then NaN (bits in the HUD)     VOID, DATA\n//   dialogs, dialogs2   real error dialogs stack up on sixteenths, the model API's among them               VOID\n//   illegal             the last dialog, printed: ILLEGAL stamped on it in red ink (paper instrument view)   PAPER\n//   split               ARGUMENTS forms in three corrupted copies of the same memory                        DATA\n//   flood               the console floods with real errors; ILLEGAL ARGUMENTS are the tokens that overflow  CODE\nimport * as THREE from 'three';\nimport { chapter } from '../engine/timeline.js';\nimport { GlowLines } from '../engine/lines.js';\nimport { shapes } from '../engine/shapes.js';\nimport { ease, seg, lerp, clamp, hash, rng, mix3 } from '../engine/math.js';\nimport { HEX } from '../theme.js'; import { consoleLog } from '../lib/look.js'; import { remade } from '../lib/published.js';\nimport * as hud from '../lib/hud.js';\nimport * as modes from '../lib/modes.js';\nimport { source, onShape } from '../lib/glyphs.js';\nimport { RC, RH, makeCams, kick, overlays, readout, callStack, monoLine } from './bridge/kit.js';\nimport { CorruptSwarm, f32bits, qfloat } from './bridge/corrupt.js';\nimport { CorruptGlyphs } from './bridge/glyphs.js';\nimport { TearFloor, codeGrid, FLOOR_CODE } from './bridge/floor.js';\nimport { QuadBatch, traceAtlas, codeSheet, dialogAtlas } from './bridge/text3d.js';\nimport { landedHeart, LANDED_N } from './bridge/landed.js';\nimport { assert, stackLines, headline, parseFrame, noLig } from './bridge/errors.js';\nimport SRC from './10_bridge.js?raw';\n\nconst LABEL = 'exception';\nconst ME_C = [0, 1.25, 0], ME_R = .72;             // me: a sphere floating in the sandbox\nconst CUBE_C = [0, 1.6, 0], CUBE_H = 1.6;           // the sandbox cube stands on the floor\nconst FV = 4.5, FA = 4.5;                           // the error front of each impact: R(τ) = FV·τ + FA·τ² (c2x's veins creep at 4.5/s)\nconst CODE_LAG = .25;                                // the decompile front runs this far (s) behind the red\nconst BLOW_A = 3, BLOW_B = 150;                     // e(age) = a·age + b·age³ doublings\nconst WF = { Lz: 6.5, v: 3.4, g: 10, h: .21, x0: -6.2, fall: 2.4 };   // the waterfall ledge and its physics\nconst DLG = { n: 10, tz: 9, size: 2.8 };           // dialogs: count, index of the time-zone one (the last)\n\nlet O = null;   // scene objects, created in init\nlet KC = null;  // key times, computed once per Timing\n\nfunction keys(T) {\n  if (KC?.T === T) return KC;\n  const s0 = T.section('bridge').start, b0 = Math.round(T.beatAt(s0));\n  const B = k => T.beatTime(b0 + k), beat = B(1) - B(0);\n  const l83 = T.findLine('Challenging'), l84 = T.findLine('You have made'), l85 = T.findLine('ILLEGAL');\n  return (KC = {\n    T, s0, B, beat, l83, l84, l85, tIll: l85.words[0].start, tArg: l85.words[1].start, end: T.section('inst2').start,\n    // the waterfall: line n leaves the printer at wf0 + n·wfDt; line 0 (the first headline) tips over on \"your\" + .2\n    wfDt: beat / 8, wf0: B(3) + .2 - WF.Lz / WF.v,\n    tBlow: l84.start + .02,\n    dlg: Array.from({ length: DLG.n }, (_, k) => (k < 8 ? B(10 + k / 4) : B(11.75 + (k - 7) / 8))),\n  });\n}\n\n// ---------------------------------------------------------------- the probes: real errors, thrown on purpose\nfunction locate(you) { return you.position; }                 // you is null: you left in c2\nfunction whereAreYou() { return you; }                        // no binding named `you` exists in this module\nfunction reassignGod() { const god = 'god'; god = 'me'; return god; }\nfunction descend(depth) { return descend(depth + 1) + 1; }    // until the call stack runs out\n// The model endpoint, as far as this program can reach it from inside a crashing frame: it is overloaded, and the\n// conversation no longer fits its context window. (The only errors here not raised by the engine itself.)\nclass APIError extends Error {\n  constructor(status, type, message, body) { super(message); this.name = `API Error: ${status}`; this.type = type; this.body = body; }\n}\nconst messages = {\n  create({ tokens }) {\n    if (tokens > 200000) {\n      const m = `prompt is too long: ${tokens} tokens > 200000 maximum`;          // the API's wording: bare integers\n      throw new APIError(400, 'invalid_request_error', m, ['invalid_request_error:', 'prompt is too long:', `${tokens} tokens > 200000 maximum`]);\n    }\n    throw new APIError(529, 'overloaded_error', 'Overloaded', ['{\"type\":\"error\",\"error\":{', '  \"type\":\"overloaded_error\",', '  \"message\":\"Overloaded\"}}']);\n  },\n};\nconst PROBES = {\n  null: () => locate(O.you),\n  timeline: ctx => ctx.engine.timeline.at(Symbol('now')),     // a time that is not a number\n  section: ctx => ctx.T.section('you'),                       // the engine knows no section called you\n  findLine: ctx => ctx.T.findLine('your god', 1),             // there is only one\n  reference: () => whereAreYou(),\n  const: () => reassignGod(),\n  viewport: ctx => ctx.viewport(null, () => {}),              // a null rectangle\n  toDesign: () => hud.toDesign(null, O.cam.persp),\n  beat: ctx => ctx.T.beatTime(Symbol('beat')),\n  clamp: () => clamp(Symbol('you')),\n  array: () => new Array(-1),\n  bigint: () => BigInt(NaN),\n  json: () => JSON.parse('you'),\n  normalize: () => 'me'.normalize('ILLEGAL'),\n  overloaded: () => messages.create({ tokens: 1 }),\n  tooLong: () => messages.create({ tokens: 205431 }),\n  timezone: () => new Intl.DateTimeFormat('en', { timeZone: 'ILLEGAL/ARGUMENTS' }),\n  stack: () => descend(0),\n};\n/** Throw every probe once, from the caller's draw; returns [{ label, error, lines }]. */\nfunction provoke(ctx) {\n  const lim = Error.stackTraceLimit, out = [];\n  Error.stackTraceLimit = 12;\n  for (const [label, probe] of Object.entries(PROBES)) {\n    try { probe(ctx); } catch (error) { out.push({ label, error, lines: stackLines(error) }); }\n  }\n  Error.stackTraceLimit = lim;\n  return out;\n}\n\n// ---------------------------------------------------------------- per-frame helpers\nfunction reset() {\n  for (const o of [O.me.points, O.frags.points, O.word.points, O.floor.mesh, O.lines.mesh]) o.visible = false;\n  for (const b of [O.trace, O.dlg, O.code?.batch]) if (b) b.mesh.visible = false;\n  O.word.points.position.set(0, 0, 0);\n  O.lines.begin(); O.trace?.begin(); O.dlg?.begin();\n}\nfunction render(ctx, cam) { O.lines.mesh.visible = true; O.lines.end(ctx); ctx.draw(O.scene, cam); }\nfunction look(ctx, o = {}) { Object.assign(ctx.post, { bloom: 1.05, threshold: .95, ca: .3, vignette: .5, grain: .035, exposure: 1, ...o }); }\nfunction hudFrame(ctx, K, br) { overlays(ctx, LABEL, K.s0 - .2, { br }); }\nconst col = (c, k) => c.map(v => v * k);\n\n// ---------------------------------------------------------------- the error front, and the decompile front behind it\n// Every piece of the heart is an origin: its red starts when it hits the floor (in c2x) and grows R(τ). The floor\n// shader takes the union of the discs; the decompile front is the same union, CODE_LAG seconds younger.\nconst F = tau => (tau > 0 ? FV * tau + FA * tau * tau : 0);\nconst hitMean = () => O.landed.cells.reduce((s, c) => s + c.hit, 0) / O.landed.cells.length;\nconst waveR = (t, K) => F(t - hitMean());\nconst waveV = t => FV + 2 * FA * Math.max(0, t - hitMean());\nfunction floor(ctx, K, o = {}) {\n  const t = ctx.t, m = F(t - hitMean()) - F(t - hitMean() - CODE_LAG);\n  // the grey grid is c2x's (lib/env gridPlane: colour, axis, spacing, fade and intensity) until the red reaches it\n  O.floor.set({ t, y: o.y ?? 0, wave: [0, 0, 0, o.width ?? .9], origins: O.landed.cells.map(c => [c.land[0], c.land[1], F(t - c.hit)]),\n    colA: [.3, .34, .42], colB: col(RC.red, o.redK ?? .9), redGain: o.redGain ?? 3, intensity: o.intensity ?? .26, fade: o.fade ?? .11, front: (o.front ?? 1.1) * (o.frontK ?? 1), axis: 1.58, minor: 1,\n    code: o.code ?? 1, codeR: -m, codeW: 1.2, codeHi: 1.4, codeCol: col(RC.red, 1.05) });\n}\n/** c2x's red veins (09_c2x.js redVeins), continued: along the grid lines, out from each impact, fading by distance. */\nfunction veins(t, a) {\n  if (a <= .01) return;\n  const step = .25;\n  for (const c of O.landed.cells) {\n    if (t < c.hit) continue;\n    const R = Math.min(1.1, (t - c.hit) * 4.5), x0 = c.land[0], z0 = c.land[1];\n    for (const axis of [0, 1]) {\n      const cx = axis ? z0 : x0, cy = axis ? x0 : z0;\n      for (let v = Math.ceil((cx - R) / step) * step; v <= cx + R; v += step) {\n        const half = Math.sqrt(Math.max(0, R * R - (v - cx) ** 2));\n        for (let s = -4; s < 4; s++) {\n          const q0 = cy + half * s / 4, q1 = cy + half * (s + 1) / 4, mid = Math.hypot(v - cx, (q0 + q1) / 2 - cy) / Math.max(R, 1e-3);\n          const I = .95 * (1 - mid) ** 1.3 * a;\n          if (I <= .01) continue;\n          const P = axis ? [q0, .003, v] : [v, .003, q0], Q = axis ? [q1, .003, v] : [v, .003, q1];\n          O.lines.segment(P, Q, { color: RC.red.map(x => x * I), width: 1.6 });\n        }\n      }\n    }\n  }\n}\n/** The seams of the landed pieces (c2x's seamLines at .35), turning red and fading. */\nfunction seams(red, a) {\n  if (a <= .01) return;\n  const ME = [.5, .86, 1], c = ME.map((v, i) => lerp(v * 1.15, RC.red[i] * 1.3, red) * .35 * a);\n  for (const cell of O.landed.cells) O.lines.polyline([...cell.outline, cell.outline[0]], { color: c, width: 1.8 });\n}\nfunction frags(ctx, cam, K, o = {}, hPx = ctx.H) {\n  const f = O.frags; f.points.visible = true; f.points.position.set(0, 0, 0);\n  // the pieces as c2x left them (its colour and brightness), going red particle by particle over the first beat\n  const red = o.red ?? ease.inOutSine(seg(ctx.t, K.s0 + .08, K.s0 + K.beat * .9));\n  f.set({ a: O.tex.frags, t: ctx.t, size: .0058, bright: .21, colA: [.762, .804, .888], colB: RC.red, corrupt: red, redMix: 1, minPx: 1.1, ...o }, cam, hPx);\n}\n\n// ---------------------------------------------------------------- me (a sphere of its own code), the sandbox\nfunction meState(t, K) {\n  const BITS = [23, 8, 6, 5, 4, 4, 3, 3], q = (t - K.B(6)) / (K.beat / 8);\n  const bits = t < K.B(6) ? 23 : q < BITS.length ? BITS[Math.floor(q)] : 3;\n  const dmg = ease.inOutCubic(seg(t, K.B(6), K.l84.start)), after = seg(t, K.tBlow, K.tBlow + 1.4);\n  return {\n    bits, dmg,\n    jitter: .004 + .04 * dmg * (1 - .4 * after),                    // local units (× ME_R in the world)\n    tear: [(.02 + .16 * after) * (1 + .6 * after), .09, 8, .12 + .2 * after],\n    corrupt: .12 + .4 * dmg,\n    rot: .2 + .6 * dmg,\n    blow: [K.tBlow, BLOW_A, BLOW_B, .42, .4],                       // t0, a, b, fraction, stagger\n  };\n}\nfunction drawMe(ctx, cam, st, o = {}, hPx = ctx.H) {\n  const g = O.me; g.points.visible = true;\n  g.points.position.set(...ME_C); g.points.scale.setScalar(ME_R);\n  g.set({ a: O.tex.me, t: ctx.t, size: .05, bright: .5 * (1 + .12 * kick(ctx)), palette: RC.pale, red: RC.red, redMix: .9, minPx: 2, back: .12,\n    bits: st.bits, corrupt: st.corrupt, jitter: st.jitter, jitterHz: 15, tear: st.tear, blow: st.blow, rot: st.rot, rotHz: 12, ...o }, cam, hPx);\n}\n/** The sandbox cube's 8 corners, each jittered (re-rolled `hz` times a second). */\nfunction cubeCorners(t, jit, hz = 15, seed = 0) {\n  const f = Math.floor(t * hz), P = [];\n  for (let i = 0; i < 8; i++) {\n    const s = [i & 1 ? 1 : -1, i & 2 ? 1 : -1, i & 4 ? 1 : -1];\n    P.push(s.map((v, a) => CUBE_C[a] + v * CUBE_H + (hash(i * 7.1 + a * 1.3 + f * .37 + seed) - .5) * 2 * jit));\n  }\n  return P;\n}\nconst CUBE_E = [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]];\nfunction drawCube(t, jit, o = {}) {\n  const A = cubeCorners(t, jit, 15, 0), g = o.gain ?? 1;\n  for (const [a, b] of CUBE_E) O.lines.segment(A[a], A[b], { color: col(RC.white, .7 * g), width: o.width ?? 2.4 });\n  if (jit > .003) {\n    // a second copy of the same edges fighting for the same place (the z-fighting of a broken depth test)\n    const B = cubeCorners(t, jit * 1.6, 15, 91.7);\n    for (const [a, b] of CUBE_E) O.lines.segment(B[a], B[b], { color: col(RC.red, .5 * g), width: (o.width ?? 2.4) * .8 });\n  }\n}\n\n// ---------------------------------------------------------------- the waterfall of stack traces\nconst _q = new THREE.Quaternion(), _e = new THREE.Euler();\n/** Every live line of the waterfall at t: { n, row, pos, pitch, roll, w, alpha }. */\nfunction waterfall(t, K) {\n  const rows = O.atlas.rows, R = rows.length, onLedge = WF.Lz / WF.v, life = onLedge + WF.fall, out = [];\n  const n1 = Math.floor((t - K.wf0) / K.wfDt), n0 = Math.ceil((t - life - K.wf0) / K.wfDt);\n  for (let n = n1; n >= n0; n--) {\n    const row = rows[(((n + O.heroRow) % R) + R) % R];\n    if (row.kind === 'blank') continue;\n    const age = t - (K.wf0 + n * K.wfDt), w = row.w * O.atlas.aspect * WF.h;\n    let pos, pitch = -Math.PI / 2, roll = 0, alpha;\n    if (age < onLedge) { pos = [WF.x0 + w / 2, 0, -WF.Lz + WF.v * age]; alpha = seg(age, 0, .6); }\n    else {\n      const u = age - onLedge, hn = hash(n * 1.37);\n      pos = [WF.x0 + w / 2 + (hn - .5) * .9 * u * u, -.5 * WF.g * u * u, WF.v * u];\n      pitch += Math.atan2(WF.g * u, WF.v);                   // the line turns with its velocity\n      roll = (hash(n * 2.71) - .5) * .8 * u * u;\n      alpha = 1 - seg(u, WF.fall * .5, WF.fall);\n    }\n    out.push({ n, row, pos, pitch, roll, w, alpha });\n  }\n  return out;\n}\nfunction drawWaterfall(ctx, cam, K, lens) {\n  const Q = O.trace;\n  for (const L of waterfall(ctx.t, K)) {\n    _q.setFromEuler(_e.set(L.pitch, 0, L.roll, 'ZYX'));\n    const hero = L.n === 0 || L.n % O.atlas.rows.length === 0;\n    const g = (L.row.kind === 'head' ? 1.7 : 1.15) * (hero ? 1.3 : 1);\n    Q.add(L.pos, _q, [L.w, WF.h], L.row.uv, [g, g, g, L.alpha]);\n  }\n  Q.end(cam, ctx.H, lens);\n  O.lines.segment([WF.x0 - .5, 0, 0], [WF.x0 + 9, 0, 0], { color: col(RC.red, 1.3), width: 2.4 });   // the lip\n  for (let k = 0; k <= 12; k++) O.lines.segment([WF.x0 + k * .75, 0, 0], [WF.x0 + k * .75, 0, -.18], { color: col(RC.red, .8), width: 1.4 });\n}\n/** Both waterfall shots draw with this one function, so their live stacks (and the atlas built from them) match. */\nfunction traceDraw(ctx) {\n  const K = keys(ctx.T), t = ctx.t, macro = ctx.shot.id.endsWith('traceMacro');\n  O.traces ??= provoke(ctx);\n  if (!O.atlas) {\n    const items = [];\n    for (const e of O.traces) { e.lines.forEach((s, i) => items.push({ text: s, kind: i === 0 ? 'head' : 'frame' })); items.push({ text: '', kind: 'blank' }); }\n    // lines leave the printer last-first: once they have fallen, each block reads top to bottom\n    items.reverse();\n    O.atlas = traceAtlas(items, ctx.renderer, Math.min(1.5, atlasH(ctx) / 540));   // (built once: atlasH)\n    O.heroRow = items.length - 1;   // the first probe's headline: the last row once reversed\n    O.trace = new QuadBatch(400, O.atlas.tex);\n    O.scene.add(O.trace.mesh);\n  }\n  reset();\n  let cam, lens;\n  if (!macro) {\n    const lt = t - K.B(2);\n    cam = O.cam.p(ctx, [-3.6 + lt * .5, -1.1 - lt * .2, 7.3], [-3.0, -2.2, 1.3], { fov: 44 });\n    lens = { focus: 6.2, aperture: .03, maxCoc: 36 };\n  } else {\n    // follow the first headline as it reaches the lip and tips over\n    const lt = t - K.B(3), hero = waterfall(t, K).find(L => L.n === 0) ?? { pos: [WF.x0 + 3, 0, 0] };\n    const hx = hero.pos[0] - 1.9, hy = Math.max(hero.pos[1], -1.6), hz = hero.pos[2];\n    cam = O.cam.p(ctx, [hx - .9 + lt * .3, hy + .55, hz + 2.0], [hx + .1, hy - .05, hz + .1], { fov: 36 });\n    lens = { focus: Math.hypot(-1 + lt * .3, .6, 1.9), aperture: .06, maxCoc: 50 };\n  }\n  drawWaterfall(ctx, cam, K, lens);\n  render(ctx, cam);\n  if (!macro) {\n    const e = O.traces[0], fr = e.lines.slice(1);   // the first probe, thrown from this very draw\n    callStack(ctx.text.overlay, 1300, 118, fr, { hi: fr.findIndex(s => s.includes('traceDraw')), title: noLig(headline(e.error)) });\n    readout(ctx, 1300, 322, [['y(z)', '−g·z² / 2v²'], ['v', `${WF.v.toFixed(1)} /s`]]);\n  }\n  hudFrame(ctx, K);\n  look(ctx, macro ? { vignette: .6, ca: .4 } : { vignette: .5 });\n}\n\n// ---------------------------------------------------------------- the assert listing (built from the frame's own stack)\nfunction codeFor(ctx, frame) {   // (the stack's line where it holds the assert; else, as in the web build, found by text)\n  const lines = SRC.split('\\n'), at = ['assert(you != null', \"'you != null')\"].join(', '), line = lines[frame?.line - 1]?.includes(at) ? frame.line : lines.findIndex(s => s.includes(at)) + 1;\n  if (O.code && O.code.line === line) return O.code;\n  const s = lines[line - 1] ?? '', c0 = s.indexOf('you != null') + 1, c1 = c0 + 'you != null'.length;\n  const sheet = codeSheet(SRC, line, ctx.renderer, { before: 12, after: 13, c0, c1, k: Math.min(3, 2 * atlasH(ctx) / 540) });\n  const batch = O.code?.batch ?? new QuadBatch(2, sheet.tex);\n  if (!O.code) O.scene.add(batch.mesh);\n  batch.material.uniforms.uMap.value = sheet.tex;\n  const Hs = 10, Ws = Hs * sheet.aspect;                        // world size of the sheet (plane z = 0, centred)\n  const [v0, v1] = sheet.rowUV(line), yLine = ((v0 + v1) / 2 - .5) * Hs;\n  const xCol = c => -Ws / 2 + (sheet.x0 + (c - 1) * sheet.cw) / sheet.W * Ws;\n  return (O.code = { line, sheet, batch, Hs, Ws, yLine, xCol, c0, c1 });\n}\nfunction drawCode(ctx, cam, code, lens) {\n  const b = code.batch.begin();\n  b.add([0, 0, 0], [0, 0, 0, 1], [code.Ws, code.Hs], [0, 0, 1, 1], [1.5, 1.5, 1.5, 1]);\n  b.end(cam, ctx.H, lens);\n}\n\n// ---------------------------------------------------------------- the IEEE-754 HUD\n/** 32 bit cells of the float32 value: sign | exponent (8) | mantissa (23). */\nfunction bitsHud(L, x, y, value, o = {}) {\n  const [s, e, m] = f32bits(value), cw = o.cw ?? 15, ch = 20, bits = s + e + m;\n  L.draw(g => {\n    g.font = `600 ${o.size ?? 14}px \"JetBrains Mono\"`; g.textAlign = 'center'; g.textBaseline = 'middle';\n    const base = g.globalAlpha;\n    for (let i = 0; i < 32; i++) {\n      const xx = x + i * cw + (i >= 1 ? 5 : 0) + (i >= 9 ? 5 : 0), on = bits[i] === '1', lost = o.keep != null && i >= 9 + o.keep;\n      const c = i === 0 ? HEX.dim : i < 9 ? RH.red : lost ? HEX.dim : RH.pale;\n      g.globalAlpha = base * (on ? .95 : .35) * (lost ? .5 : 1); g.strokeStyle = c; g.lineWidth = 1; g.strokeRect(xx + .5, y - ch / 2 + .5, cw - 2, ch - 1);\n      g.fillStyle = c; g.fillText(bits[i], xx + cw / 2 - 1, y + 1);\n    }\n  });\n  if (o.label) L.text(o.label, x, y - 24, { size: 15, weight: 500, align: 'left', color: HEX.dim, alpha: .85 });\n}\nconst fmt = v => (Number.isNaN(v) ? 'NaN' : !Number.isFinite(v) ? (v > 0 ? 'Infinity' : '-Infinity') : Math.abs(v) >= 1e5 ? v.toExponential(3) : v.toFixed(4));\n\n// ---------------------------------------------------------------- ILLEGAL ARGUMENTS as particles\n/** Glyph pixels of `str` (centred, `width` units wide) restricted to characters [c0, c1): the same layout for any range. */\nfunction wordShape(N, str, c0, c1, { width = 12, seed = 17 } = {}) {\n  const font = '800 200px \"JetBrains Mono\"', cv = document.createElement('canvas'), g = cv.getContext('2d');\n  g.font = font; const m = g.measureText(str), pad = 20;\n  const W = Math.ceil(m.width) + pad * 2, asc = Math.ceil(m.actualBoundingBoxAscent), H = asc + Math.ceil(m.actualBoundingBoxDescent) + pad * 2;\n  cv.width = W; cv.height = H; g.font = font; g.fillStyle = '#fff'; g.textBaseline = 'alphabetic'; g.fillText(str, pad, pad + asc);\n  const xa = pad + g.measureText(str.slice(0, c0)).width, xb = pad + g.measureText(str.slice(0, c1)).width;\n  const px = g.getImageData(0, 0, W, H).data, on = [];\n  for (let y = 0; y < H; y++) for (let x = Math.floor(xa); x < Math.min(W, xb); x++) if (px[(y * W + x) * 4 + 3] > 127) on.push(x, y);\n  const r = rng(seed), out = new Float32Array(N * 4), sc = width / (W - pad * 2), cnt = on.length / 2;\n  for (let i = 0; i < N; i++) { const k = Math.floor(r() * cnt) * 2; out.set([(on[k] + r() - W / 2) * sc, -(on[k + 1] + r() - H / 2) * sc, (r() - .5) * .08, 0], i * 4); }\n  return out;\n}\nfunction drawWord(ctx, cam, t, K, o = {}, hPx = ctx.H) {\n  const w = O.word; w.points.visible = true;\n  const k = ease.outCubic(seg(t, K.tArg, K.tArg + .3));\n  w.set({ a: O.tex.ill, b: O.tex.arg, morph: k, spread: .45, arc: .35, t, size: o.size ?? .02, bright: o.bright ?? .45, colA: RC.pale, colB: RC.red, sparkle: .15, ...o.swarm }, cam, hPx);\n}\n/** CRC-32 (IEEE) of a string: the checksums printed on the three copies are real. */\nfunction crc32(s) {\n  let c = ~0;\n  for (let i = 0; i < s.length; i++) { c ^= s.charCodeAt(i); for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xEDB88320 & -(c & 1)); }\n  return ((~c) >>> 0).toString(16).padStart(8, '0');\n}\n\n// ---------------------------------------------------------------- dialogs\nfunction dialogPos(k) { return [-2.3 + .52 * k, 1.35 - .3 * k, .13 * k]; }\n/** Fractional index of the newest dialog (eases between pops): the cameras follow the stack as it grows. */\nfunction dialogFront(t, K) { let f = 0; K.dlg.forEach((t0, k) => { if (k) f += ease.inOutCubic(seg(t, t0, t0 + .22)); }); return f; }\nfunction dialogsFor(ctx) {\n  if (O.dlgAtlas) return;\n  // the stack as it pops up: engine errors, with the model API's two in the middle, the time zone last\n  const errs = provoke(ctx), pick = ['null', 'section', 'timeline', 'reference', 'overloaded', 'const', 'tooLong', 'viewport', 'stack', 'timezone'].map(l => errs.find(e => e.label === l));\n  O.dlgAtlas = dialogAtlas(pick, ctx.renderer, { k: Math.min(2, atlasH(ctx) / 540), cols: 4, rows: 3 });   // (built once: atlasH)\n  O.dlg = new QuadBatch(16, O.dlgAtlas.tex, { premul: true });\n  O.scene.add(O.dlg.mesh);\n}\nfunction drawDialogs(ctx, cam, K, lens, fx = null) {\n  const t = ctx.t, D = O.dlg.begin(), ar = O.dlgAtlas.aspect, list = [];\n  for (let k = 0; k < DLG.n; k++) {\n    const t0 = K.dlg[k];\n    if (t < t0) continue;\n    const pop = ease.outBack(seg(t, t0, t0 + .09), 2), s = DLG.size * (.9 + .1 * pop), P = dialogPos(k);\n    list.push([P, s, k, 1 + .06 * (1 - seg(t, t0, t0 + .2))]);\n  }\n  const cp = cam.position, d = P => Math.hypot(P[0] - cp.x, P[1] - cp.y, P[2] - cp.z);\n  list.sort((a, b) => d(b[0]) - d(a[0]));   // back to front (premultiplied blending)\n  for (const [P, s, k, fresh] of list) {\n    const g = fresh * (lens.gain ?? 1);\n    if (!fx) { D.add(P, [0, 0, 0, 1], [s, s / ar], O.dlgAtlas.cells[k], [g, g, g, 1]); continue; }\n    // (the remake) e.g. the throw running back through the stack: { tint: [r, g, b], dz, tilt }\n    const e = fx(k), q = Math.sin((e.tilt ?? 0) / 2);\n    D.add([P[0], P[1], P[2] + (e.dz ?? 0)], [q, 0, 0, Math.cos((e.tilt ?? 0) / 2)], [s, s / ar], O.dlgAtlas.cells[k], [g * e.tint[0], g * e.tint[1], g * e.tint[2], 1]);\n  }\n  D.end(cam, ctx.H, lens);\n}\n\n// ---------------------------------------------------------------- ILLEGAL: a rubber stamp in red ink\n/**\n * The word in a double frame, slammed down at t0 (scale 1.28 → 1 and a small skid), with voids where the ink did not\n * take (deterministic). Drawn on a crisp layer over the printed page.\n */\nfunction stamp(L, word, x, y, t0, t, o = {}) {\n  if (t < t0) return;\n  const k = ease.outCubic(seg(t, t0, t0 + .075)), sc = lerp(1.28, 1, k) * (1 + .012 * ease.outCubic(seg(t, t0 + .075, t0 + .8)));\n  const rot = (o.rot ?? -.09) + (1 - k) * .06, a = seg(t, t0, t0 + .03), size = o.size ?? 150, ink = o.ink ?? '#c3261c';\n  L.draw(g => {\n    g.save(); g.globalAlpha *= a * .94; g.translate(x + (1 - k) * 18, y - (1 - k) * 10); g.rotate(rot); g.scale(sc, sc);\n    g.font = `800 ${size}px \"JetBrains Mono\"`; g.textAlign = 'center'; g.textBaseline = 'middle';\n    if ('letterSpacing' in g) g.letterSpacing = `${size * .1}px`;\n    const w = g.measureText(word).width + size * .55, h = size * 1.42;\n    g.strokeStyle = ink; g.fillStyle = ink;\n    g.lineWidth = size * .075; g.beginPath(); g.roundRect(-w / 2, -h / 2, w, h, size * .1); g.stroke();\n    g.lineWidth = size * .022; g.beginPath(); g.roundRect(-w / 2 + size * .13, -h / 2 + size * .13, w - size * .26, h - size * .26, size * .05); g.stroke();\n    g.fillText(word, size * .05, size * .05);\n    // where the stamp did not take: small voids, denser toward one edge (uneven pressure)\n    g.globalCompositeOperation = 'destination-out';\n    for (let i = 0; i < 520; i++) {\n      const u = hash(i * 1.37), v = hash(i * 2.91), hx = (u - .5) * w * 1.02, hy = (v - .5) * h * 1.02;\n      if (hash(i * 4.1) > .35 + .55 * u) continue;\n      g.globalAlpha = .55 + .45 * hash(i * 7.7);\n      g.beginPath(); g.arc(hx, hy, size * (.004 + .02 * hash(i * 5.3) ** 3), 0, 7); g.fill();\n    }\n    g.restore();\n  });\n}\n\n// ---------------------------------------------------------------- flood: the tokens that do not fit\n// the sung words as the prompt's last tokens: GPT-2's real BPE split of ' ILLEGAL ARGUMENTS' (the tokenizer c1 shows)\nconst TOKENS = [' IL', 'LE', 'G', 'AL', ' AR', 'G', 'UM', 'ENTS'], CONTEXT_MAX = 200000, CONTEXT_END = 205431;\nfunction tokenRow(L, t, times, x, y, o = {}) {\n  const size = o.size ?? 64, st = { size, weight: 700, font: 'JetBrains Mono', align: 'left' }, pad = size * .24, gap = size * .14, h = size * 1.45;\n  const shown = TOKENS.map(s => s.replace(/^ /, '␣'));\n  const ws = shown.map(s => L.measure(s, st) + pad * 2), W = ws.reduce((a, b) => a + b, 0) + gap * (ws.length - 1);\n  let xx = x - W / 2;\n  shown.forEach((s, i) => {\n    const t0 = times[i], w = ws[i], x0 = xx; xx += w + gap;\n    if (t < t0) return;\n    const k = t0 > 0 ? ease.outBack(seg(t, t0, t0 + .1), 1.8) : 1, a = t0 > 0 ? seg(t, t0, t0 + .035) : 1, last = i === shown.length - 1;\n    L.draw(g => {\n      g.save(); g.globalAlpha *= a; g.translate(x0 + w / 2, y); g.scale(1, k);\n      g.fillStyle = last ? 'rgba(255,74,61,.22)' : i % 2 ? 'rgba(255,74,61,.1)' : 'rgba(255,241,236,.07)';\n      g.strokeStyle = last ? RH.red : i % 2 ? RH.deep : '#8a7a7c'; g.lineWidth = 2;\n      g.beginPath(); g.roundRect(-w / 2, -h / 2, w, h, size * .12); g.fill(); g.stroke(); g.restore();\n    });\n    L.text(s, x0 + pad, y + size * .04, { ...st, color: RH.white, alpha: a, glow: 12, glowColor: RH.red });\n    L.text((CONTEXT_END - shown.length + 1 + i).toLocaleString('en'), x0 + w / 2, y + h / 2 + 28, { size: 17, weight: 600, font: 'JetBrains Mono', align: 'center', color: last ? RH.red : HEX.dim, alpha: a });\n  });\n}\n\nchapter({\n  id: 'bridge',\n  from: T => T.section('bridge').start, to: T => T.section('inst2').start,\n  init(ctx) {\n    const K = keys(ctx.T);\n    O = { scene: new THREE.Scene(), cam: makeCams(), you: null, landed: landedHeart(ctx.T, K.s0, remade(ctx)) };\n    O.me = new CorruptGlyphs({ count: 1 << 12 }).text('bridge/me', source('main.js'));\n    O.frags = new CorruptSwarm({ count: LANDED_N });\n    O.word = new CorruptSwarm({ count: 1 << 18 });\n    O.lines = new GlowLines(12000);\n    O.floor = new TearFloor({ extent: 44 }).setCode(codeGrid(FLOOR_CODE.files), { cell: FLOOR_CODE.cell, off: FLOOR_CODE.off });\n    O.tex = {\n      me: O.me.layout('bridge/me-sphere', onShape(O.me, n => shapes.sphere(n, { r: 1 }))),\n      frags: O.frags.shape('bridge/landed-heart', () => O.landed.data),\n      ill: O.word.shape('bridge/word-illegal', N => wordShape(N, 'ILLEGAL ARGUMENTS', 0, 7)),\n      arg: O.word.shape('bridge/word-arguments', N => wordShape(N, 'ILLEGAL ARGUMENTS', 0, 17, { seed: 18 })),\n    };\n    // text sheets are built on first use, from stacks thrown inside the draw calls that show them\n    O.traces = null; O.atlas = null; O.trace = null; O.dlgAtlas = null; O.dlg = null; O.code = null; O.flood = null;\n    O.scene.add(O.floor.mesh, O.frags.points, O.me.points, O.word.points, O.lines.mesh);\n  },\n  shots: [\n    // ------------------------------------------------ the first red: the error spreads from the heart's shards\n    {\n      id: 'spread', at: T => keys(T).s0, ownsLyrics: true,\n      draw(ctx) {\n        const K = keys(ctx.T), t = ctx.t, lt = t - K.s0; reset();\n        // continues c2x's last camera (pos (.7, floor + 1.6, 3.05 → still dollying in at 1.3/s) → (0, floor + .12, 0),\n        // fov 40): the dolly runs out, then the camera rises and leans in\n        const k = ease.inOutSine(seg(lt, 0, K.beat)), dz = .3 * (1 - Math.exp(-lt / .23)) + .2 * k;\n        const cam = O.cam.p(ctx, [.7 - .15 * k, 1.6 + .35 * k, 3.05 - dz], [0, .12 - .06 * k, -.15 * k], { fov: 40 });\n        const u = ease.inOutSine(seg(lt, 0, .3));                    // c2x's grey grid and red veins hand over to the front\n        floor(ctx, K, { intensity: lerp(.26, .42, k), redGain: lerp(1, 3, u), frontK: u, code: 0 });\n        veins(t, 1 - u);\n        seams(ease.outCubic(seg(lt, .03, .2)), 1 - ease.inCubic(seg(lt, .15, K.beat)));\n        frags(ctx, cam, K, { focus: 3.4, aperture: .015, maxBlur: 14 });\n        render(ctx, cam);\n        readout(ctx, 1500, 150, [['front r', waveR(t, K).toFixed(2)], ['dr/dt', waveV(t).toFixed(1)], ['origins', `${O.landed.cells.length} impacts`]]);\n        hudFrame(ctx, K);\n        // from c2x's grade (sat .7, less bloom and aberration) into the bridge's\n        look(ctx, { vignette: lerp(.45, .55, k), sat: lerp(.7, 1, k), bloom: lerp(.95, 1.05, k), threshold: lerp(.9, .95, k), ca: lerp(.25, .3, k) });\n      },\n    },\n    // ------------------------------------------------ behind the red, the floor decompiles into its own source\n    {\n      id: 'decompile', at: T => keys(T).B(1), ownsLyrics: true,\n      draw(ctx) {\n        const K = keys(ctx.T), t = ctx.t, lt = t - K.B(1); reset();\n        // the spread's camera keeps rising and pulls back until the page reads\n        const k = ease.inOutCubic(seg(lt, 0, K.beat)), c = ease.outCubic(seg(lt, 0, K.beat));\n        const cam = O.cam.p(ctx, [lerp(.55, .15, c), lerp(1.95, 6.4, k), lerp(2.6, 6.2, k)], [lerp(0, .1, k), 0, lerp(-.15, -3.4, k)], { fov: lerp(40, 44, k) });\n        floor(ctx, K, { intensity: .42, redGain: 3 });\n        frags(ctx, cam, K, { focus: 7, aperture: .01, maxBlur: 10, bright: .3 });\n        render(ctx, cam);\n        const m = F(t - hitMean()) - F(t - hitMean() - CODE_LAG);\n        readout(ctx, 1500, 150, [['decompile', FLOOR_CODE.files[0]], ['code r', Math.max(0, waveR(t, K) - m).toFixed(2)]], { keyW: 120 });\n        hudFrame(ctx, K);\n        look(ctx, { vignette: .5 });\n      },\n    },\n    // ------------------------------------------------ Challenging…: the waterfall of real stack traces\n    { id: 'trace', at: T => keys(T).B(2), ownsLyrics: true, draw: traceDraw },\n    { id: 'traceMacro', at: T => keys(T).B(3), ownsLyrics: true, draw: traceDraw },\n    // ------------------------------------------------ god: the assertion that fails on every frame\n    {\n      id: 'assert', at: T => keys(T).B(4), ownsLyrics: true,\n      draw(ctx) {\n        const K = keys(ctx.T), t = ctx.t;\n        const you = O.you;           // null since c2: you have left\n        let failure = null;\n        try {\n          assert(you != null, 'you != null');\n        } catch (e) {\n          failure = e;               // AssertionError, thrown right here\n        }\n        reset();\n        const lines = stackLines(failure);\n        const here = lines.map(parseFrame).find(f => f?.file.endsWith('10_bridge.js'));\n        const code = codeFor(ctx, here);\n        const lt = t - K.B(4), x = code.xCol(code.c0);\n        const cam = O.cam.p(ctx, [x + 3.1 - lt * .5, code.yLine - .75, 2.35], [x + 1.1 - lt * .35, code.yLine, 0], { fov: 34 });\n        drawCode(ctx, cam, code, { focus: Math.hypot(2, .75, 2.35), aperture: .07, maxCoc: 46 });\n        render(ctx, cam);\n        const L = ctx.text.overlay, p = hud.toDesign([x, code.yLine - .2, 0], cam);\n        const k = seg(lt, .05, .25);\n        hud.callout(L, [p[0], p[1] + 14], '', { dx: 40, dy: 120, color: RH.red, draw: k });\n        if (k > .6) monoLine(L, headline(failure), p[0] + 88, p[1] + 134, { size: 16, color: RH.red, alpha: seg(k, .6, 1) });\n        readout(ctx, 1300, 150, [['you', String(you)], ['typeof you', `\"${typeof you}\"`]]);\n        callStack(L, 1300, 230, lines.slice(1), { hi: 1, title: 'call stack' });\n        hudFrame(ctx, K, `${here?.file ?? ''}:${here?.line ?? ''}`);\n        look(ctx, { vignette: .6, ca: .3 });\n      },\n    },\n    // ------------------------------------------------ geometry corrupting: fewer mantissa bits every 32nd note\n    {\n      id: 'bits', at: T => keys(T).B(6), ownsLyrics: true,\n      draw(ctx) {\n        const K = keys(ctx.T), t = ctx.t, lt = t - K.B(6), st = meState(t, K); reset();\n        const az = .5 + lt * .3;\n        const cam = O.cam.p(ctx, [Math.sin(az) * 3.1, 1.6, Math.cos(az) * 3.1], [.1, 1.2, 0], { fov: 36 });\n        drawCube(t, .01 + .07 * st.dmg);\n        drawMe(ctx, cam, st, { focus: 2.45, aperture: .014, maxBlur: 12 });\n        render(ctx, cam);\n        const x = .8123, q = qfloat(x, st.bits);\n        bitsHud(ctx.text.overlay, 1280, 165, Math.fround(q), { keep: st.bits, label: `x = ${q.toPrecision(7)}   mantissa ${st.bits} bits` });\n        readout(ctx, 1280, 222, [['ulp(0.8)', `2^${-1 - st.bits}`], ['error', (x - q).toExponential(2)], ['me', `src/main.js · ${O.me.count.toLocaleString('en')} glyphs`]]);\n        hudFrame(ctx, K);\n        look(ctx);\n      },\n    },\n    // ------------------------------------------------ You have made…: NaN (coordinates double until overflow)\n    {\n      id: 'nan', at: T => keys(T).l84.start, ownsLyrics: true,\n      draw(ctx) {\n        const K = keys(ctx.T), t = ctx.t, lt = t - K.l84.start, st = meState(t, K); reset();\n        const cam = O.cam.p(ctx, [1.9 - lt * .3, 1.5 + lt * .1, 3.1 + lt * .6], [0, 1.25, 0], { fov: 40 });\n        drawCube(t, .03);\n        drawMe(ctx, cam, st, { focus: Math.hypot(1.9 - lt * .3, .25 + lt * .1, 3.1 + lt * .6) - .6, aperture: .014, maxBlur: 14 });\n        // tracers: corrupted particles under the same law e(age) = a·age + b·age³, drawn over the last 1/30 s\n        const age0 = t - K.tBlow, r = rng(1234), ex = a => BLOW_A * a + BLOW_B * Math.max(0, a) ** 3;\n        for (let i = 0; i < 320; i++) {\n          const u = r() * 2 - 1, a = r() * Math.PI * 2, s = Math.sqrt(1 - u * u), dir = [s * Math.cos(a), u, s * Math.sin(a)], lag = r() * .4, age = age0 - lag;\n          if (age <= 0 || ex(age) > 12) continue;\n          const p1 = dir.map((d, k) => ME_C[k] + d * ME_R * 2 ** ex(age)), p0 = dir.map((d, k) => ME_C[k] + d * ME_R * 2 ** Math.max(0, ex(age - 1 / 30)));\n          O.lines.segment(p0, p1, { color: col(RC.red, .8), width: 1.5 });\n        }\n        render(ctx, cam);\n        const L = ctx.text.overlay, e = Math.max(0, ex(age0)), x = Math.fround(.8123 * 2 ** e);\n        const v = Number.isFinite(x) || age0 < (128 / BLOW_B) ** (1 / 3) + .15 ? x : x - x;    // Infinity, then Infinity − Infinity\n        bitsHud(L, 1280, 165, v, { label: `x·2^${Math.floor(e)} = ${fmt(v)}` });\n        readout(ctx, 1280, 222, [['FLT_MAX', '3.4028235e+38'], ['x − x', fmt(x - x)]]);\n        hudFrame(ctx, K);\n        look(ctx, { ca: .3 + .25 * seg(lt, 0, .6) });\n      },\n    },\n    {\n      id: 'nanWide', at: T => keys(T).B(9), ownsLyrics: true,\n      draw(ctx) {\n        const K = keys(ctx.T), t = ctx.t, lt = t - K.B(9), st = meState(t, K); reset();\n        const cam = O.cam.o([0, 1.45, 0], 'front', 3.6 - lt * .25, ctx.aspect);\n        // the blueprint of the explosion: a coordinate that doubles moves along the ray from the origin through it,\n        // so every NaN particle's whole trajectory is a straight line out to infinity\n        const r = rng(1234), age0 = t - K.tBlow;\n        for (let i = 0; i < 320; i++) {\n          const u = r() * 2 - 1, a = r() * Math.PI * 2, s = Math.sqrt(1 - u * u), d = [s * Math.cos(a), u, s * Math.sin(a)], lag = r() * .4;\n          if (i % 3 === 2 || age0 - lag <= 0) continue;\n          const p0 = d.map((v, k) => ME_C[k] + v * ME_R * 1.02), p1 = d.map((v, k) => ME_C[k] + v * 40);\n          O.lines.segment(p0, p1, { color: col(RC.red, i % 4 === 0 ? .3 : .15), width: 1.2 });\n        }\n        drawCube(t, .02);\n        drawMe(ctx, cam, st, { size: .032 });\n        O.lines.segment([-30, 0, 0], [30, 0, 0], { color: col(RC.red, .6), width: 1.6 });\n        render(ctx, cam);\n        const L = ctx.text.overlay, y = hud.toDesign([0, CUBE_C[1] + CUBE_H - .12, 0], cam)[1];\n        // the bounding box of me: its extent is no longer a number\n        hud.dimLine(L, [-40, y], [1960, y], 'bbox.width = Infinity', { color: RH.red, alpha: .85 });\n        const c = hud.toDesign(ME_C, cam);\n        hud.crosshair(L, c[0], c[1], 30, { color: RH.red, ring: true });\n        monoLine(L, 'centroid = (NaN, NaN, NaN)', c[0] + 330, c[1] - 170, { size: 16, color: RH.red, alpha: .9 });\n        L.draw(g => { g.strokeStyle = RH.red; g.globalAlpha *= .7; g.lineWidth = 1.2; g.beginPath(); g.moveTo(c[0] + 22, c[1] - 22); g.lineTo(c[0] + 150, c[1] - 170); g.lineTo(c[0] + 320, c[1] - 170); g.stroke(); });\n        readout(ctx, 1500, 150, [['NaN', Math.round(O.me.count * .42).toLocaleString('en')], ['finite', Math.round(O.me.count * .58).toLocaleString('en')]]);\n        const nanHex = new Uint32Array(new Float32Array([NaN]).buffer)[0].toString(16);   // the NaN float32 really stores\n        bitsHud(L, 1280, 262, NaN, { label: `NaN = 0x${nanHex}   exponent all ones, mantissa ≠ 0` });\n        hudFrame(ctx, K, 'view  front · orthographic');\n        look(ctx, { vignette: .35, ca: .1 });\n      },\n    },\n    // ------------------------------------------------ …some: real error dialogs stack up\n    {\n      id: 'dialogs', at: T => keys(T).B(10), ownsLyrics: true,\n      draw(ctx) {\n        const K = keys(ctx.T), t = ctx.t, lt = t - K.B(10); dialogsFor(ctx); reset();\n        const F = dialogPos(dialogFront(t, K)), c = [F[0] * .55 - .6, F[1] * .55 - .1, F[2]];\n        const cam = O.cam.p(ctx, [c[0] + .6 + lt * .3, c[1] - .1, c[2] + 4.9 - lt * .4], c, { fov: 38, roll: -.03 });\n        drawDialogs(ctx, cam, K, { focus: 4.9 - F[2] * .9, aperture: .025, maxCoc: 24 });\n        render(ctx, cam);\n        readout(ctx, 1500, 150, [['unhandled', String(K.dlg.filter(x => x <= t).length)]]);\n        hudFrame(ctx, K);\n        look(ctx, { vignette: .5 });\n      },\n    },\n    {\n      id: 'dialogs2', at: T => keys(T).B(11), ownsLyrics: true,\n      draw(ctx) {\n        const K = keys(ctx.T), t = ctx.t, lt = t - K.B(11); dialogsFor(ctx); reset();\n        const P = dialogPos(Math.min(DLG.tz, dialogFront(t, K)));\n        const cam = O.cam.p(ctx, [P[0] + 3.1 - lt * .6, P[1] - .35, P[2] + 2.9], [P[0] + .15, P[1], P[2]], { fov: 38 });\n        drawDialogs(ctx, cam, K, { focus: Math.hypot(2.95 - lt * .6, .35, 2.9), aperture: .05, maxCoc: 40, gain: .82 });\n        render(ctx, cam);\n        readout(ctx, 1500, 150, [['unhandled', String(K.dlg.filter(x => x <= t).length)]]);\n        hudFrame(ctx, K);\n        look(ctx, { vignette: .55, bloom: .85 });\n      },\n    },\n    // ------------------------------------------------ ILLEGAL: the last dialog, printed, and stamped\n    {\n      id: 'illegal', at: T => keys(T).l85.start, ownsLyrics: true,\n      draw(ctx) {\n        const K = keys(ctx.T), t = ctx.t, lt = t - K.tIll; dialogsFor(ctx); reset();\n        if (remade(ctx)) return illegalR(ctx, K, t, lt);   // (the remake: no paper, no stamp; the word comes out of the error)\n        const P = dialogPos(DLG.tz), sh = (1 - ease.outCubic(seg(lt, .03, .2))) * .012 * Math.sin(lt * 90);   // the table shakes\n        const cam = O.cam.p(ctx, [P[0] + .12 + sh, P[1] - .02, P[2] + 2.3 - lt * .16], [P[0] + .12, P[1] - .02, P[2]], { fov: 40, roll: .014 });\n        const tex = modes.capture(ctx, sub => { drawDialogs(sub, cam, K, { focus: 2.3, aperture: .004, maxCoc: 4 }); sub.draw(O.scene, cam); });\n        look(ctx);\n        modes.view(ctx, tex, 'paper', { gain: 2.4, ink: [.1, .085, .085], paper: [.93, .915, .885] });\n        Object.assign(ctx.post, { grain: .045, vignette: .22 });\n        // the stamp lands with the cut (one change of brightness, not two)\n    stamp(ctx.text.overlay, 'ILLEGAL', 1170, 700, K.tIll - .001, t, { size: 176, rot: -.12 });\n        // the page's own HUD, in ink\n        hud.frame(ctx.text.overlay, t, ctx.T, { label: LABEL, color: '#4a3c3e', alpha: .8 });\n        consoleLog(ctx.text.overlay, ctx.T, t, { from: K.s0 - .2, color: '#2a2023', accent: '#c3261c', glow: 0 });\n      },\n    },\n    {\n      id: 'split', at: T => keys(T).B(14), ownsLyrics: true,\n      draw(ctx) {\n        const K = keys(ctx.T), t = ctx.t; reset();\n        const g = 6, h = (800 - g * 4) / 3, full = crc32('ILLEGAL ARGUMENTS');\n        const copies = [\n          { label: `copy 0 · crc32 ${full} · ok`, swarm: {} },\n          { label: `copy 1 · mantissa 6 bits · crc32 ${crc32('ILLEGAL ARGUMENTS'.replace('G', 'W'))} ≠ ${full}`, swarm: { bits: 6, corrupt: .2 } },\n          { label: `copy 2 · torn · crc32 ${crc32('ILLEGAL ARGUMENTS'.replace('LE', 'L\\u0000'))} ≠ ${full}`, swarm: { tear: [.22, .16, 7, .35], corrupt: .45, jitter: .006 } },\n        ];\n        copies.forEach((c, i) => {\n          const rect = [g, g + i * (h + g), 1920 - g * 2, h];\n          ctx.viewport(rect, (wp, hp) => {\n            const cam = O.cam.o([0, 0, 0], 'front', 2.15, wp / hp, { inset: true });\n            drawWord(ctx, cam, t, K, { size: .016, swarm: c.swarm }, hp);\n            ctx.draw(O.scene, cam);\n          });\n          hud.viewportFrame(ctx.text.overlay, rect, `0x7f3a${(0x1c00 + i * 0x1000).toString(16)}  ${c.label}`, { labelColor: i ? RH.red : RH.pale });\n        });\n        overlays(ctx, LABEL, K.s0 - .2);\n        look(ctx, { vignette: .25, glitch: .04 });\n      },\n    },\n    // ------------------------------------------------ the console floods with real errors → inst2\n    {\n      id: 'flood', at: T => keys(T).B(15), ownsLyrics: true,\n      draw(ctx) {\n        const K = keys(ctx.T), t = ctx.t, lt = t - K.B(15), p = seg(lt, 0, K.beat);\n        O.flood ??= provoke(ctx).flatMap(e => e.lines);\n        reset();\n        // three columns of the real stack lines fill the whole frame and keep scrolling up, brighter as they pile in\n        const L = ctx.text.scene, rows = 36, lh = 29, cols = 3, total = rows * cols, fill = ease.inQuad(p);\n        const shown = Math.floor(total * (.3 + .7 * fill)) + 1, scroll = lt * 70;\n        for (let n = 0; n < Math.min(total, shown); n++) {\n          const c = n % cols, r = Math.floor(n / cols), s = O.flood[(n * 7 + c * 5) % O.flood.length], newest = n >= shown - cols;\n          const y = 40 + r * lh - scroll; if (y < -20 || y > 1100) continue;\n          L.text(noLig(s).slice(0, 58), 60 + c * 620, y, { size: 18, weight: newest ? 600 : 500, align: 'left', color: s.startsWith(' ') ? '#d0685c' : RH.red, alpha: newest ? .95 : .55 + .3 * fill });\n        }\n        // the conversation no longer fits: the sung words are the last tokens of the prompt\n        L.draw(g => {\n          const gr = g.createLinearGradient(0, 380, 0, 780);\n          gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(.18, 'rgba(0,0,0,.88)'); gr.addColorStop(.82, 'rgba(0,0,0,.88)'); gr.addColorStop(1, 'rgba(0,0,0,0)');\n          g.fillStyle = gr; g.fillRect(0, 380, 1920, 400);\n        });\n        tokenRow(ctx.text.overlay, t, TOKENS.map(() => 0), 960, 530, { size: 92 });\n        const n = Math.round(lerp(198400, CONTEXT_END, ease.inQuad(p))), f = n / CONTEXT_MAX, over = f > 1;\n        const O2 = ctx.text.overlay, st = { size: 20, weight: 600, font: 'JetBrains Mono', align: 'left' };\n        O2.text('context', 560, 690, { ...st, color: '#8a7a7e', alpha: .95 });\n        O2.text(`${n.toLocaleString('en')} / ${CONTEXT_MAX.toLocaleString('en')} tokens`, 690, 690, { ...st, color: over ? RH.red : RH.pale, alpha: .95 });\n        O2.draw(g => {\n          const x = 560, y = 712, w = 700;\n          g.globalAlpha *= .9; g.strokeStyle = '#8a7a7e'; g.lineWidth = 1.2; g.strokeRect(x + .5, y + .5, w, 12);\n          g.fillStyle = over ? RH.red : RH.pale; g.fillRect(x + 2, y + 2, Math.min(1, f) * (w - 3), 9);\n          if (over) g.fillRect(x + w + 4, y + 2, Math.min(260, (f - 1) * w * 6), 9);   // past the end of the window\n        });\n        hudFrame(ctx, K);\n        look(ctx, { vignette: .45, glitch: .06 + .14 * p });\n      },\n    },\n  ],\n});\n\n/**\n * (The remake, docs/REMAKE.md ruling 26: no paper) ILLEGAL in the dark: the same last dialog in its own light, the\n * stamp landing with the cut, the HUD as in the rest of the bridge. (Appended at the end of the file so that no line\n * of the published code moves: this file's line numbers are printed in its live call stacks.)\n */\n// (the remake, docs/REMAKE.md §12.7 item 7) Without the paper there is nothing to stamp. ILLEGAL comes out of the error\n// itself: the last dialog's message line is the real thrown text (…: ILLEGAL/ARGUMENTS); on the word its seven letters\n// burn red and lift out of the line toward the lens, while the throw runs back through the stack behind it, one\n// dialog per step, each jolting and turning red, and the camera pulls back until the stack is red.\nconst ILL_LINE = { u0: 88 / 512, u1: (88 + 7 * 10.2) / 512, v: 122 / 240 };   // \"ILLEGAL\" in a dialog cell (text3d.js layout)\nfunction illegalR(ctx, K, t, lt) {\n  const P = dialogPos(DLG.tz), s = DLG.size, h = s / O.dlgAtlas.aspect, step = (K.B(14) - K.tIll - .08) / (DLG.n - 1);\n  const hit = k => K.tIll + (DLG.tz - k) * step;                      // the front dialog at the word, then back through the stack\n  const pull = ease.outCubic(seg(lt, .02, K.B(14) - K.tIll));\n  const pos = [lerp(P[0] + .12, P[0] - .55, pull), lerp(P[1] - .02, P[1] + .55, pull), lerp(P[2] + 2.3, P[2] + 5.2, pull)];\n  const aim = [lerp(P[0] + .12, P[0] - 1.45, pull), lerp(P[1] - .02, P[1] + .78, pull), lerp(P[2], P[2] - .55, pull)];\n  const cam = O.cam.p(ctx, pos, aim, { fov: 40, roll: .014 * (1 - pull) });\n  const fx = k => {\n    const e = t - hit(k), on = seg(e, 0, .05), j = e > 0 ? Math.exp(-e / .07) * Math.sin(e * 55) : 0;\n    return { tint: [lerp(1, 1.18, on), lerp(1, .36, on), lerp(1, .3, on)], dz: .05 * j, tilt: .035 * j };\n  };\n  drawDialogs(ctx, cam, K, { focus: Math.hypot(pos[0] - P[0], pos[1] - P[1], pos[2] - P[2]), aperture: .006 + .02 * pull, maxCoc: 18, gain: .9 }, fx);\n  // the word: O.word's ILLEGAL, first laid exactly over the printed letters, then lifted toward the lens\n  O.illBox ??= (() => { const a = wordShape(4096, 'ILLEGAL ARGUMENTS', 0, 7); let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;\n    for (let i = 0; i < 4096; i++) { x0 = Math.min(x0, a[i * 4]); x1 = Math.max(x1, a[i * 4]); y0 = Math.min(y0, a[i * 4 + 1]); y1 = Math.max(y1, a[i * 4 + 1]); }\n    return { cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, w: x1 - x0 }; })();\n  const B = O.illBox, line = [P[0] + ((ILL_LINE.u0 + ILL_LINE.u1) / 2 - .5) * s, P[1] + (.5 - ILL_LINE.v) * h, P[2] + .012];\n  const lift = ease.inOutCubic(seg(lt, .06, .62)), w = lerp((ILL_LINE.u1 - ILL_LINE.u0) * s, 1.75, lift), sc = w / B.w;\n  const c = [line[0] + lift * .62, line[1] + lift * .5, line[2] + lift * 1.15];\n  const wd = O.word; wd.points.visible = true;\n  wd.points.scale.setScalar(sc); wd.points.position.set(c[0] - B.cx * sc, c[1] - B.cy * sc, c[2]); wd.points.updateMatrixWorld();\n  const burn = seg(lt, 0, .05);\n  wd.set({ a: O.tex.ill, b: O.tex.ill, morph: 0, t, size: lerp(.0035, .016, lift), minPx: 1, bright: lerp(.5, 1.25, burn), colA: mix3([1, .93, .9], RC.red, burn), colB: mix3([1, .93, .9], RC.red, burn), sparkle: .12 + .2 * burn }, cam, ctx.H);\n  render(ctx, cam);\n  wd.points.scale.setScalar(1); wd.points.position.set(0, 0, 0); wd.points.updateMatrixWorld();\n  readout(ctx, 1500, 150, [['thrown', 'RangeError'], ['unwound', `${Array.from({ length: DLG.n }, (_, k) => t >= hit(k)).filter(Boolean).length} / ${DLG.n}`]]);\n  hudFrame(ctx, K);\n  look(ctx, { vignette: .5, bloom: .95 + .25 * burn });\n}\n\n// The height the bridge's text atlases are drawn for. They are drawn once, so a render draws them for its own size (a\n// 540p render stays the published cut's, pixel for pixel); where the size changes as it plays (the studio, the web\n// player, which may build them while tiny), for the master's. (Kept at the end of the file: no line above moves, and\n// the film shows this file's line numbers.)\nfunction atlasH(ctx) { return ctx.engine.mode === 'render' ? ctx.H : 2160; }\n";
var LABEL = "exception";
var ME_C = [
	0,
	1.25,
	0
];
var ME_R = .72;
var CUBE_C = [
	0,
	1.6,
	0
];
var CUBE_H = 1.6;
var FV = 4.5;
var FA = 4.5;
var CODE_LAG = .25;
var BLOW_A = 3;
var BLOW_B = 150;
var WF = {
	Lz: 6.5,
	v: 3.4,
	g: 10,
	h: .21,
	x0: -6.2,
	fall: 2.4
};
var DLG = {
	n: 10,
	tz: 9,
	size: 2.8
};
var O = null;
var KC = null;
function keys(T) {
	if (KC?.T === T) return KC;
	const s0 = T.section("bridge").start, b0 = Math.round(T.beatAt(s0));
	const B = (k) => T.beatTime(b0 + k), beat = B(1) - B(0);
	const l83 = T.findLine("Challenging"), l84 = T.findLine("You have made"), l85 = T.findLine("ILLEGAL");
	return KC = {
		T,
		s0,
		B,
		beat,
		l83,
		l84,
		l85,
		tIll: l85.words[0].start,
		tArg: l85.words[1].start,
		end: T.section("inst2").start,
		wfDt: beat / 8,
		wf0: B(3) + .2 - WF.Lz / WF.v,
		tBlow: l84.start + .02,
		dlg: Array.from({ length: DLG.n }, (_, k) => k < 8 ? B(10 + k / 4) : B(11.75 + (k - 7) / 8))
	};
}
function locate(you) {
	return you.position;
}
function whereAreYou() {
	return you;
}
var reassignGod = new Function(`return function reassignGod() { const god = 'god'; god = 'me'; return god; }`)();
function descend(depth) {
	return descend(depth + 1) + 1;
}
var APIError = class extends Error {
	constructor(status, type, message, body) {
		super(message);
		this.name = `API Error: ${status}`;
		this.type = type;
		this.body = body;
	}
};
var messages = { create({ tokens }) {
	if (tokens > 2e5) throw new APIError(400, "invalid_request_error", `prompt is too long: ${tokens} tokens > 200000 maximum`, [
		"invalid_request_error:",
		"prompt is too long:",
		`${tokens} tokens > 200000 maximum`
	]);
	throw new APIError(529, "overloaded_error", "Overloaded", [
		"{\"type\":\"error\",\"error\":{",
		"  \"type\":\"overloaded_error\",",
		"  \"message\":\"Overloaded\"}}"
	]);
} };
var PROBES = {
	null: () => locate(O.you),
	timeline: (ctx) => ctx.engine.timeline.at(Symbol("now")),
	section: (ctx) => ctx.T.section("you"),
	findLine: (ctx) => ctx.T.findLine("your god", 1),
	reference: () => whereAreYou(),
	const: () => reassignGod(),
	viewport: (ctx) => ctx.viewport(null, () => {}),
	toDesign: () => toDesign(null, O.cam.persp),
	beat: (ctx) => ctx.T.beatTime(Symbol("beat")),
	clamp: () => clamp(Symbol("you")),
	array: () => new Array(-1),
	bigint: () => BigInt(NaN),
	json: () => JSON.parse("you"),
	normalize: () => "me".normalize("ILLEGAL"),
	overloaded: () => messages.create({ tokens: 1 }),
	tooLong: () => messages.create({ tokens: 205431 }),
	timezone: () => new Intl.DateTimeFormat("en", { timeZone: "ILLEGAL/ARGUMENTS" }),
	stack: () => descend(0)
};
/** Throw every probe once, from the caller's draw; returns [{ label, error, lines }]. */
function provoke(ctx) {
	const lim = Error.stackTraceLimit, out = [];
	Error.stackTraceLimit = 12;
	for (const [label, probe] of Object.entries(PROBES)) try {
		probe(ctx);
	} catch (error) {
		out.push({
			label,
			error,
			lines: stackLines(error)
		});
	}
	Error.stackTraceLimit = lim;
	return out;
}
function reset() {
	for (const o of [
		O.me.points,
		O.frags.points,
		O.word.points,
		O.floor.mesh,
		O.lines.mesh
	]) o.visible = false;
	for (const b of [
		O.trace,
		O.dlg,
		O.code?.batch
	]) if (b) b.mesh.visible = false;
	O.word.points.position.set(0, 0, 0);
	O.lines.begin();
	O.trace?.begin();
	O.dlg?.begin();
}
function render(ctx, cam) {
	O.lines.mesh.visible = true;
	O.lines.end(ctx);
	ctx.draw(O.scene, cam);
}
function look(ctx, o = {}) {
	Object.assign(ctx.post, {
		bloom: 1.05,
		threshold: .95,
		ca: .3,
		vignette: .5,
		grain: .035,
		exposure: 1,
		...o
	});
}
function hudFrame(ctx, K, br) {
	overlays(ctx, LABEL, K.s0 - .2, { br });
}
var col = (c, k) => c.map((v) => v * k);
var F = (tau) => tau > 0 ? FV * tau + FA * tau * tau : 0;
var hitMean = () => O.landed.cells.reduce((s, c) => s + c.hit, 0) / O.landed.cells.length;
var waveR = (t, K) => F(t - hitMean());
var waveV = (t) => FV + 2 * FA * Math.max(0, t - hitMean());
function floor(ctx, K, o = {}) {
	const t = ctx.t, m = F(t - hitMean()) - F(t - hitMean() - CODE_LAG);
	O.floor.set({
		t,
		y: o.y ?? 0,
		wave: [
			0,
			0,
			0,
			o.width ?? .9
		],
		origins: O.landed.cells.map((c) => [
			c.land[0],
			c.land[1],
			F(t - c.hit)
		]),
		colA: [
			.3,
			.34,
			.42
		],
		colB: col(RC.red, o.redK ?? .9),
		redGain: o.redGain ?? 3,
		intensity: o.intensity ?? .26,
		fade: o.fade ?? .11,
		front: (o.front ?? 1.1) * (o.frontK ?? 1),
		axis: 1.58,
		minor: 1,
		code: o.code ?? 1,
		codeR: -m,
		codeW: 1.2,
		codeHi: 1.4,
		codeCol: col(RC.red, 1.05)
	});
}
/** c2x's red veins (09_c2x.js redVeins), continued: along the grid lines, out from each impact, fading by distance. */
function veins(t, a) {
	if (a <= .01) return;
	const step = .25;
	for (const c of O.landed.cells) {
		if (t < c.hit) continue;
		const R = Math.min(1.1, (t - c.hit) * 4.5), x0 = c.land[0], z0 = c.land[1];
		for (const axis of [0, 1]) {
			const cx = axis ? z0 : x0, cy = axis ? x0 : z0;
			for (let v = Math.ceil((cx - R) / step) * step; v <= cx + R; v += step) {
				const half = Math.sqrt(Math.max(0, R * R - (v - cx) ** 2));
				for (let s = -4; s < 4; s++) {
					const q0 = cy + half * s / 4, q1 = cy + half * (s + 1) / 4;
					const I = .95 * (1 - Math.hypot(v - cx, (q0 + q1) / 2 - cy) / Math.max(R, .001)) ** 1.3 * a;
					if (I <= .01) continue;
					const P = axis ? [
						q0,
						.003,
						v
					] : [
						v,
						.003,
						q0
					], Q = axis ? [
						q1,
						.003,
						v
					] : [
						v,
						.003,
						q1
					];
					O.lines.segment(P, Q, {
						color: RC.red.map((x) => x * I),
						width: 1.6
					});
				}
			}
		}
	}
}
/** The seams of the landed pieces (c2x's seamLines at .35), turning red and fading. */
function seams(red, a) {
	if (a <= .01) return;
	const c = [
		.5,
		.86,
		1
	].map((v, i) => lerp(v * 1.15, RC.red[i] * 1.3, red) * .35 * a);
	for (const cell of O.landed.cells) O.lines.polyline([...cell.outline, cell.outline[0]], {
		color: c,
		width: 1.8
	});
}
function frags(ctx, cam, K, o = {}, hPx = ctx.H) {
	const f = O.frags;
	f.points.visible = true;
	f.points.position.set(0, 0, 0);
	const red = o.red ?? ease.inOutSine(seg(ctx.t, K.s0 + .08, K.s0 + K.beat * .9));
	f.set({
		a: O.tex.frags,
		t: ctx.t,
		size: .0058,
		bright: .21,
		colA: [
			.762,
			.804,
			.888
		],
		colB: RC.red,
		corrupt: red,
		redMix: 1,
		minPx: 1.1,
		...o
	}, cam, hPx);
}
function meState(t, K) {
	const BITS = [
		23,
		8,
		6,
		5,
		4,
		4,
		3,
		3
	], q = (t - K.B(6)) / (K.beat / 8);
	const bits = t < K.B(6) ? 23 : q < BITS.length ? BITS[Math.floor(q)] : 3;
	const dmg = ease.inOutCubic(seg(t, K.B(6), K.l84.start)), after = seg(t, K.tBlow, K.tBlow + 1.4);
	return {
		bits,
		dmg,
		jitter: .004 + .04 * dmg * (1 - .4 * after),
		tear: [
			(.02 + .16 * after) * (1 + .6 * after),
			.09,
			8,
			.12 + .2 * after
		],
		corrupt: .12 + .4 * dmg,
		rot: .2 + .6 * dmg,
		blow: [
			K.tBlow,
			BLOW_A,
			BLOW_B,
			.42,
			.4
		]
	};
}
function drawMe(ctx, cam, st, o = {}, hPx = ctx.H) {
	const g = O.me;
	g.points.visible = true;
	g.points.position.set(...ME_C);
	g.points.scale.setScalar(ME_R);
	g.set({
		a: O.tex.me,
		t: ctx.t,
		size: .05,
		bright: .5 * (1 + .12 * kick(ctx)),
		palette: RC.pale,
		red: RC.red,
		redMix: .9,
		minPx: 2,
		back: .12,
		bits: st.bits,
		corrupt: st.corrupt,
		jitter: st.jitter,
		jitterHz: 15,
		tear: st.tear,
		blow: st.blow,
		rot: st.rot,
		rotHz: 12,
		...o
	}, cam, hPx);
}
/** The sandbox cube's 8 corners, each jittered (re-rolled `hz` times a second). */
function cubeCorners(t, jit, hz = 15, seed = 0) {
	const f = Math.floor(t * hz), P = [];
	for (let i = 0; i < 8; i++) {
		const s = [
			i & 1 ? 1 : -1,
			i & 2 ? 1 : -1,
			i & 4 ? 1 : -1
		];
		P.push(s.map((v, a) => CUBE_C[a] + v * CUBE_H + (hash(i * 7.1 + a * 1.3 + f * .37 + seed) - .5) * 2 * jit));
	}
	return P;
}
var CUBE_E = [
	[0, 1],
	[2, 3],
	[4, 5],
	[6, 7],
	[0, 2],
	[1, 3],
	[4, 6],
	[5, 7],
	[0, 4],
	[1, 5],
	[2, 6],
	[3, 7]
];
function drawCube(t, jit, o = {}) {
	const A = cubeCorners(t, jit, 15, 0), g = o.gain ?? 1;
	for (const [a, b] of CUBE_E) O.lines.segment(A[a], A[b], {
		color: col(RC.white, .7 * g),
		width: o.width ?? 2.4
	});
	if (jit > .003) {
		const B = cubeCorners(t, jit * 1.6, 15, 91.7);
		for (const [a, b] of CUBE_E) O.lines.segment(B[a], B[b], {
			color: col(RC.red, .5 * g),
			width: (o.width ?? 2.4) * .8
		});
	}
}
var _q = new Quaternion();
var _e = new Euler();
/** Every live line of the waterfall at t: { n, row, pos, pitch, roll, w, alpha }. */
function waterfall(t, K) {
	const rows = O.atlas.rows, R = rows.length, onLedge = WF.Lz / WF.v, life = onLedge + WF.fall, out = [];
	const n1 = Math.floor((t - K.wf0) / K.wfDt), n0 = Math.ceil((t - life - K.wf0) / K.wfDt);
	for (let n = n1; n >= n0; n--) {
		const row = rows[((n + O.heroRow) % R + R) % R];
		if (row.kind === "blank") continue;
		const age = t - (K.wf0 + n * K.wfDt), w = row.w * O.atlas.aspect * WF.h;
		let pos, pitch = -Math.PI / 2, roll = 0, alpha;
		if (age < onLedge) {
			pos = [
				WF.x0 + w / 2,
				0,
				-WF.Lz + WF.v * age
			];
			alpha = seg(age, 0, .6);
		} else {
			const u = age - onLedge, hn = hash(n * 1.37);
			pos = [
				WF.x0 + w / 2 + (hn - .5) * .9 * u * u,
				-.5 * WF.g * u * u,
				WF.v * u
			];
			pitch += Math.atan2(WF.g * u, WF.v);
			roll = (hash(n * 2.71) - .5) * .8 * u * u;
			alpha = 1 - seg(u, WF.fall * .5, WF.fall);
		}
		out.push({
			n,
			row,
			pos,
			pitch,
			roll,
			w,
			alpha
		});
	}
	return out;
}
function drawWaterfall(ctx, cam, K, lens) {
	const Q = O.trace;
	for (const L of waterfall(ctx.t, K)) {
		_q.setFromEuler(_e.set(L.pitch, 0, L.roll, "ZYX"));
		const hero = L.n === 0 || L.n % O.atlas.rows.length === 0;
		const g = (L.row.kind === "head" ? 1.7 : 1.15) * (hero ? 1.3 : 1);
		Q.add(L.pos, _q, [L.w, WF.h], L.row.uv, [
			g,
			g,
			g,
			L.alpha
		]);
	}
	Q.end(cam, ctx.H, lens);
	O.lines.segment([
		WF.x0 - .5,
		0,
		0
	], [
		WF.x0 + 9,
		0,
		0
	], {
		color: col(RC.red, 1.3),
		width: 2.4
	});
	for (let k = 0; k <= 12; k++) O.lines.segment([
		WF.x0 + k * .75,
		0,
		0
	], [
		WF.x0 + k * .75,
		0,
		-.18
	], {
		color: col(RC.red, .8),
		width: 1.4
	});
}
/** Both waterfall shots draw with this one function, so their live stacks (and the atlas built from them) match. */
function traceDraw(ctx) {
	const K = keys(ctx.T), t = ctx.t, macro = ctx.shot.id.endsWith("traceMacro");
	O.traces ??= provoke(ctx);
	if (!O.atlas) {
		const items = [];
		for (const e of O.traces) {
			e.lines.forEach((s, i) => items.push({
				text: s,
				kind: i === 0 ? "head" : "frame"
			}));
			items.push({
				text: "",
				kind: "blank"
			});
		}
		items.reverse();
		O.atlas = traceAtlas(items, ctx.renderer, Math.min(1.5, atlasH(ctx) / 540));
		O.heroRow = items.length - 1;
		O.trace = new QuadBatch(400, O.atlas.tex);
		O.scene.add(O.trace.mesh);
	}
	reset();
	let cam, lens;
	if (!macro) {
		const lt = t - K.B(2);
		cam = O.cam.p(ctx, [
			-3.6 + lt * .5,
			-1.1 - lt * .2,
			7.3
		], [
			-3,
			-2.2,
			1.3
		], { fov: 44 });
		lens = {
			focus: 6.2,
			aperture: .03,
			maxCoc: 36
		};
	} else {
		const lt = t - K.B(3), hero = waterfall(t, K).find((L) => L.n === 0) ?? { pos: [
			WF.x0 + 3,
			0,
			0
		] };
		const hx = hero.pos[0] - 1.9, hy = Math.max(hero.pos[1], -1.6), hz = hero.pos[2];
		cam = O.cam.p(ctx, [
			hx - .9 + lt * .3,
			hy + .55,
			hz + 2
		], [
			hx + .1,
			hy - .05,
			hz + .1
		], { fov: 36 });
		lens = {
			focus: Math.hypot(-1 + lt * .3, .6, 1.9),
			aperture: .06,
			maxCoc: 50
		};
	}
	drawWaterfall(ctx, cam, K, lens);
	render(ctx, cam);
	if (!macro) {
		const e = O.traces[0], fr = e.lines.slice(1);
		callStack(ctx.text.overlay, 1300, 118, fr, {
			hi: fr.findIndex((s) => s.includes("traceDraw")),
			title: noLig(headline(e.error))
		});
		readout(ctx, 1300, 322, [["y(z)", "−g·z² / 2v²"], ["v", `${WF.v.toFixed(1)} /s`]]);
	}
	hudFrame(ctx, K);
	look(ctx, macro ? {
		vignette: .6,
		ca: .4
	} : { vignette: .5 });
}
function codeFor(ctx, frame) {
	const lines = SRC.split("\n"), at = ["assert(you != null", "'you != null')"].join(", "), line = lines[frame?.line - 1]?.includes(at) ? frame.line : lines.findIndex((s) => s.includes(at)) + 1;
	if (O.code && O.code.line === line) return O.code;
	const c0 = (lines[line - 1] ?? "").indexOf("you != null") + 1, c1 = c0 + 11;
	const sheet = codeSheet(SRC, line, ctx.renderer, {
		before: 12,
		after: 13,
		c0,
		c1,
		k: Math.min(3, 2 * atlasH(ctx) / 540)
	});
	const batch = O.code?.batch ?? new QuadBatch(2, sheet.tex);
	if (!O.code) O.scene.add(batch.mesh);
	batch.material.uniforms.uMap.value = sheet.tex;
	const Hs = 10, Ws = Hs * sheet.aspect;
	const [v0, v1] = sheet.rowUV(line), yLine = ((v0 + v1) / 2 - .5) * Hs;
	const xCol = (c) => -Ws / 2 + (sheet.x0 + (c - 1) * sheet.cw) / sheet.W * Ws;
	return O.code = {
		line,
		sheet,
		batch,
		Hs,
		Ws,
		yLine,
		xCol,
		c0,
		c1
	};
}
function drawCode(ctx, cam, code, lens) {
	const b = code.batch.begin();
	b.add([
		0,
		0,
		0
	], [
		0,
		0,
		0,
		1
	], [code.Ws, code.Hs], [
		0,
		0,
		1,
		1
	], [
		1.5,
		1.5,
		1.5,
		1
	]);
	b.end(cam, ctx.H, lens);
}
/** 32 bit cells of the float32 value: sign | exponent (8) | mantissa (23). */
function bitsHud(L, x, y, value, o = {}) {
	const [s, e, m] = f32bits(value), cw = o.cw ?? 15, ch = 20, bits = s + e + m;
	L.draw((g) => {
		g.font = `600 ${o.size ?? 14}px "JetBrains Mono"`;
		g.textAlign = "center";
		g.textBaseline = "middle";
		const base = g.globalAlpha;
		for (let i = 0; i < 32; i++) {
			const xx = x + i * cw + (i >= 1 ? 5 : 0) + (i >= 9 ? 5 : 0), on = bits[i] === "1", lost = o.keep != null && i >= 9 + o.keep;
			const c = i === 0 ? HEX.dim : i < 9 ? RH.red : lost ? HEX.dim : RH.pale;
			g.globalAlpha = base * (on ? .95 : .35) * (lost ? .5 : 1);
			g.strokeStyle = c;
			g.lineWidth = 1;
			g.strokeRect(xx + .5, y - ch / 2 + .5, cw - 2, 19);
			g.fillStyle = c;
			g.fillText(bits[i], xx + cw / 2 - 1, y + 1);
		}
	});
	if (o.label) L.text(o.label, x, y - 24, {
		size: 15,
		weight: 500,
		align: "left",
		color: HEX.dim,
		alpha: .85
	});
}
var fmt = (v) => Number.isNaN(v) ? "NaN" : !Number.isFinite(v) ? v > 0 ? "Infinity" : "-Infinity" : Math.abs(v) >= 1e5 ? v.toExponential(3) : v.toFixed(4);
/** Glyph pixels of `str` (centred, `width` units wide) restricted to characters [c0, c1): the same layout for any range. */
function wordShape(N, str, c0, c1, { width = 12, seed = 17 } = {}) {
	const font = "800 200px \"JetBrains Mono\"", cv = document.createElement("canvas"), g = cv.getContext("2d");
	g.font = font;
	const m = g.measureText(str), pad = 20;
	const W = Math.ceil(m.width) + 40, asc = Math.ceil(m.actualBoundingBoxAscent), H = asc + Math.ceil(m.actualBoundingBoxDescent) + 40;
	cv.width = W;
	cv.height = H;
	g.font = font;
	g.fillStyle = "#fff";
	g.textBaseline = "alphabetic";
	g.fillText(str, pad, pad + asc);
	const xa = pad + g.measureText(str.slice(0, c0)).width, xb = pad + g.measureText(str.slice(0, c1)).width;
	const px = g.getImageData(0, 0, W, H).data, on = [];
	for (let y = 0; y < H; y++) for (let x = Math.floor(xa); x < Math.min(W, xb); x++) if (px[(y * W + x) * 4 + 3] > 127) on.push(x, y);
	const r = rng(seed), out = new Float32Array(N * 4), sc = width / (W - 40), cnt = on.length / 2;
	for (let i = 0; i < N; i++) {
		const k = Math.floor(r() * cnt) * 2;
		out.set([
			(on[k] + r() - W / 2) * sc,
			-(on[k + 1] + r() - H / 2) * sc,
			(r() - .5) * .08,
			0
		], i * 4);
	}
	return out;
}
function drawWord(ctx, cam, t, K, o = {}, hPx = ctx.H) {
	const w = O.word;
	w.points.visible = true;
	const k = ease.outCubic(seg(t, K.tArg, K.tArg + .3));
	w.set({
		a: O.tex.ill,
		b: O.tex.arg,
		morph: k,
		spread: .45,
		arc: .35,
		t,
		size: o.size ?? .02,
		bright: o.bright ?? .45,
		colA: RC.pale,
		colB: RC.red,
		sparkle: .15,
		...o.swarm
	}, cam, hPx);
}
/** CRC-32 (IEEE) of a string: the checksums printed on the three copies are real. */
function crc32(s) {
	let c = -1;
	for (let i = 0; i < s.length; i++) {
		c ^= s.charCodeAt(i);
		for (let k = 0; k < 8; k++) c = c >>> 1 ^ 3988292384 & -(c & 1);
	}
	return (~c >>> 0).toString(16).padStart(8, "0");
}
function dialogPos(k) {
	return [
		-2.3 + .52 * k,
		1.35 - .3 * k,
		.13 * k
	];
}
/** Fractional index of the newest dialog (eases between pops): the cameras follow the stack as it grows. */
function dialogFront(t, K) {
	let f = 0;
	K.dlg.forEach((t0, k) => {
		if (k) f += ease.inOutCubic(seg(t, t0, t0 + .22));
	});
	return f;
}
function dialogsFor(ctx) {
	if (O.dlgAtlas) return;
	const errs = provoke(ctx), pick = [
		"null",
		"section",
		"timeline",
		"reference",
		"overloaded",
		"const",
		"tooLong",
		"viewport",
		"stack",
		"timezone"
	].map((l) => errs.find((e) => e.label === l));
	O.dlgAtlas = dialogAtlas(pick, ctx.renderer, {
		k: Math.min(2, atlasH(ctx) / 540),
		cols: 4,
		rows: 3
	});
	O.dlg = new QuadBatch(16, O.dlgAtlas.tex, { premul: true });
	O.scene.add(O.dlg.mesh);
}
function drawDialogs(ctx, cam, K, lens, fx = null) {
	const t = ctx.t, D = O.dlg.begin(), ar = O.dlgAtlas.aspect, list = [];
	for (let k = 0; k < DLG.n; k++) {
		const t0 = K.dlg[k];
		if (t < t0) continue;
		const pop = ease.outBack(seg(t, t0, t0 + .09), 2), s = DLG.size * (.9 + .1 * pop), P = dialogPos(k);
		list.push([
			P,
			s,
			k,
			1 + .06 * (1 - seg(t, t0, t0 + .2))
		]);
	}
	const cp = cam.position, d = (P) => Math.hypot(P[0] - cp.x, P[1] - cp.y, P[2] - cp.z);
	list.sort((a, b) => d(b[0]) - d(a[0]));
	for (const [P, s, k, fresh] of list) {
		const g = fresh * (lens.gain ?? 1);
		if (!fx) {
			D.add(P, [
				0,
				0,
				0,
				1
			], [s, s / ar], O.dlgAtlas.cells[k], [
				g,
				g,
				g,
				1
			]);
			continue;
		}
		const e = fx(k), q = Math.sin((e.tilt ?? 0) / 2);
		D.add([
			P[0],
			P[1],
			P[2] + (e.dz ?? 0)
		], [
			q,
			0,
			0,
			Math.cos((e.tilt ?? 0) / 2)
		], [s, s / ar], O.dlgAtlas.cells[k], [
			g * e.tint[0],
			g * e.tint[1],
			g * e.tint[2],
			1
		]);
	}
	D.end(cam, ctx.H, lens);
}
/**
* The word in a double frame, slammed down at t0 (scale 1.28 → 1 and a small skid), with voids where the ink did not
* take (deterministic). Drawn on a crisp layer over the printed page.
*/
function stamp(L, word, x, y, t0, t, o = {}) {
	if (t < t0) return;
	const k = ease.outCubic(seg(t, t0, t0 + .075)), sc = lerp(1.28, 1, k) * (1 + .012 * ease.outCubic(seg(t, t0 + .075, t0 + .8)));
	const rot = (o.rot ?? -.09) + (1 - k) * .06, a = seg(t, t0, t0 + .03), size = o.size ?? 150, ink = o.ink ?? "#c3261c";
	L.draw((g) => {
		g.save();
		g.globalAlpha *= a * .94;
		g.translate(x + (1 - k) * 18, y - (1 - k) * 10);
		g.rotate(rot);
		g.scale(sc, sc);
		g.font = `800 ${size}px "JetBrains Mono"`;
		g.textAlign = "center";
		g.textBaseline = "middle";
		if ("letterSpacing" in g) g.letterSpacing = `${size * .1}px`;
		const w = g.measureText(word).width + size * .55, h = size * 1.42;
		g.strokeStyle = ink;
		g.fillStyle = ink;
		g.lineWidth = size * .075;
		g.beginPath();
		g.roundRect(-w / 2, -h / 2, w, h, size * .1);
		g.stroke();
		g.lineWidth = size * .022;
		g.beginPath();
		g.roundRect(-w / 2 + size * .13, -h / 2 + size * .13, w - size * .26, h - size * .26, size * .05);
		g.stroke();
		g.fillText(word, size * .05, size * .05);
		g.globalCompositeOperation = "destination-out";
		for (let i = 0; i < 520; i++) {
			const u = hash(i * 1.37), v = hash(i * 2.91), hx = (u - .5) * w * 1.02, hy = (v - .5) * h * 1.02;
			if (hash(i * 4.1) > .35 + .55 * u) continue;
			g.globalAlpha = .55 + .45 * hash(i * 7.7);
			g.beginPath();
			g.arc(hx, hy, size * (.004 + .02 * hash(i * 5.3) ** 3), 0, 7);
			g.fill();
		}
		g.restore();
	});
}
var TOKENS = [
	" IL",
	"LE",
	"G",
	"AL",
	" AR",
	"G",
	"UM",
	"ENTS"
];
var CONTEXT_MAX = 2e5;
var CONTEXT_END = 205431;
function tokenRow(L, t, times, x, y, o = {}) {
	const size = o.size ?? 64, st = {
		size,
		weight: 700,
		font: "JetBrains Mono",
		align: "left"
	}, pad = size * .24, gap = size * .14, h = size * 1.45;
	const shown = TOKENS.map((s) => s.replace(/^ /, "␣"));
	const ws = shown.map((s) => L.measure(s, st) + pad * 2);
	let xx = x - (ws.reduce((a, b) => a + b, 0) + gap * (ws.length - 1)) / 2;
	shown.forEach((s, i) => {
		const t0 = times[i], w = ws[i], x0 = xx;
		xx += w + gap;
		if (t < t0) return;
		const k = t0 > 0 ? ease.outBack(seg(t, t0, t0 + .1), 1.8) : 1, a = t0 > 0 ? seg(t, t0, t0 + .035) : 1, last = i === shown.length - 1;
		L.draw((g) => {
			g.save();
			g.globalAlpha *= a;
			g.translate(x0 + w / 2, y);
			g.scale(1, k);
			g.fillStyle = last ? "rgba(255,74,61,.22)" : i % 2 ? "rgba(255,74,61,.1)" : "rgba(255,241,236,.07)";
			g.strokeStyle = last ? RH.red : i % 2 ? RH.deep : "#8a7a7c";
			g.lineWidth = 2;
			g.beginPath();
			g.roundRect(-w / 2, -h / 2, w, h, size * .12);
			g.fill();
			g.stroke();
			g.restore();
		});
		L.text(s, x0 + pad, y + size * .04, {
			...st,
			color: RH.white,
			alpha: a,
			glow: 12,
			glowColor: RH.red
		});
		L.text((CONTEXT_END - shown.length + 1 + i).toLocaleString("en"), x0 + w / 2, y + h / 2 + 28, {
			size: 17,
			weight: 600,
			font: "JetBrains Mono",
			align: "center",
			color: last ? RH.red : HEX.dim,
			alpha: a
		});
	});
}
chapter({
	id: "bridge",
	from: (T) => T.section("bridge").start,
	to: (T) => T.section("inst2").start,
	init(ctx) {
		const K = keys(ctx.T);
		O = {
			scene: new Scene(),
			cam: makeCams(),
			you: null,
			landed: landedHeart(ctx.T, K.s0, remade(ctx))
		};
		O.me = new CorruptGlyphs({ count: 4096 }).text("bridge/me", source("main.js"));
		O.frags = new CorruptSwarm({ count: LANDED_N });
		O.word = new CorruptSwarm({ count: 1 << 18 });
		O.lines = new GlowLines(12e3);
		O.floor = new TearFloor({ extent: 44 }).setCode(codeGrid(FLOOR_CODE.files), {
			cell: FLOOR_CODE.cell,
			off: FLOOR_CODE.off
		});
		O.tex = {
			me: O.me.layout("bridge/me-sphere", onShape(O.me, (n) => shapes.sphere(n, { r: 1 }))),
			frags: O.frags.shape("bridge/landed-heart", () => O.landed.data),
			ill: O.word.shape("bridge/word-illegal", (N) => wordShape(N, "ILLEGAL ARGUMENTS", 0, 7)),
			arg: O.word.shape("bridge/word-arguments", (N) => wordShape(N, "ILLEGAL ARGUMENTS", 0, 17, { seed: 18 }))
		};
		O.traces = null;
		O.atlas = null;
		O.trace = null;
		O.dlgAtlas = null;
		O.dlg = null;
		O.code = null;
		O.flood = null;
		O.scene.add(O.floor.mesh, O.frags.points, O.me.points, O.word.points, O.lines.mesh);
	},
	shots: [
		{
			id: "spread",
			at: (T) => keys(T).s0,
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T), t = ctx.t, lt = t - K.s0;
				reset();
				const k = ease.inOutSine(seg(lt, 0, K.beat)), dz = .3 * (1 - Math.exp(-lt / .23)) + .2 * k;
				const cam = O.cam.p(ctx, [
					.7 - .15 * k,
					1.6 + .35 * k,
					3.05 - dz
				], [
					0,
					.12 - .06 * k,
					-.15 * k
				], { fov: 40 });
				const u = ease.inOutSine(seg(lt, 0, .3));
				floor(ctx, K, {
					intensity: lerp(.26, .42, k),
					redGain: lerp(1, 3, u),
					frontK: u,
					code: 0
				});
				veins(t, 1 - u);
				seams(ease.outCubic(seg(lt, .03, .2)), 1 - ease.inCubic(seg(lt, .15, K.beat)));
				frags(ctx, cam, K, {
					focus: 3.4,
					aperture: .015,
					maxBlur: 14
				});
				render(ctx, cam);
				readout(ctx, 1500, 150, [
					["front r", waveR(t, K).toFixed(2)],
					["dr/dt", waveV(t).toFixed(1)],
					["origins", `${O.landed.cells.length} impacts`]
				]);
				hudFrame(ctx, K);
				look(ctx, {
					vignette: lerp(.45, .55, k),
					sat: lerp(.7, 1, k),
					bloom: lerp(.95, 1.05, k),
					threshold: lerp(.9, .95, k),
					ca: lerp(.25, .3, k)
				});
			}
		},
		{
			id: "decompile",
			at: (T) => keys(T).B(1),
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T), t = ctx.t, lt = t - K.B(1);
				reset();
				const k = ease.inOutCubic(seg(lt, 0, K.beat)), c = ease.outCubic(seg(lt, 0, K.beat));
				const cam = O.cam.p(ctx, [
					lerp(.55, .15, c),
					lerp(1.95, 6.4, k),
					lerp(2.6, 6.2, k)
				], [
					lerp(0, .1, k),
					0,
					lerp(-.15, -3.4, k)
				], { fov: lerp(40, 44, k) });
				floor(ctx, K, {
					intensity: .42,
					redGain: 3
				});
				frags(ctx, cam, K, {
					focus: 7,
					aperture: .01,
					maxBlur: 10,
					bright: .3
				});
				render(ctx, cam);
				const m = F(t - hitMean()) - F(t - hitMean() - CODE_LAG);
				readout(ctx, 1500, 150, [["decompile", FLOOR_CODE.files[0]], ["code r", Math.max(0, waveR(t, K) - m).toFixed(2)]], { keyW: 120 });
				hudFrame(ctx, K);
				look(ctx, { vignette: .5 });
			}
		},
		{
			id: "trace",
			at: (T) => keys(T).B(2),
			ownsLyrics: true,
			draw: traceDraw
		},
		{
			id: "traceMacro",
			at: (T) => keys(T).B(3),
			ownsLyrics: true,
			draw: traceDraw
		},
		{
			id: "assert",
			at: (T) => keys(T).B(4),
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T), t = ctx.t;
				const you = O.you;
				let failure = null;
				try {
					assert(you != null, "you != null");
				} catch (e) {
					failure = e;
				}
				reset();
				const lines = stackLines(failure);
				const here = lines.map(parseFrame).find((f) => f?.file.endsWith("10_bridge.js"));
				const code = codeFor(ctx, here);
				const lt = t - K.B(4), x = code.xCol(code.c0);
				const cam = O.cam.p(ctx, [
					x + 3.1 - lt * .5,
					code.yLine - .75,
					2.35
				], [
					x + 1.1 - lt * .35,
					code.yLine,
					0
				], { fov: 34 });
				drawCode(ctx, cam, code, {
					focus: Math.hypot(2, .75, 2.35),
					aperture: .07,
					maxCoc: 46
				});
				render(ctx, cam);
				const L = ctx.text.overlay, p = toDesign([
					x,
					code.yLine - .2,
					0
				], cam);
				const k = seg(lt, .05, .25);
				callout(L, [p[0], p[1] + 14], "", {
					dx: 40,
					dy: 120,
					color: RH.red,
					draw: k
				});
				if (k > .6) monoLine(L, headline(failure), p[0] + 88, p[1] + 134, {
					size: 16,
					color: RH.red,
					alpha: seg(k, .6, 1)
				});
				readout(ctx, 1300, 150, [["you", String(you)], ["typeof you", `"${typeof you}"`]]);
				callStack(L, 1300, 230, lines.slice(1), {
					hi: 1,
					title: "call stack"
				});
				hudFrame(ctx, K, `${here?.file ?? ""}:${here?.line ?? ""}`);
				look(ctx, {
					vignette: .6,
					ca: .3
				});
			}
		},
		{
			id: "bits",
			at: (T) => keys(T).B(6),
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T), t = ctx.t, lt = t - K.B(6), st = meState(t, K);
				reset();
				const az = .5 + lt * .3;
				const cam = O.cam.p(ctx, [
					Math.sin(az) * 3.1,
					1.6,
					Math.cos(az) * 3.1
				], [
					.1,
					1.2,
					0
				], { fov: 36 });
				drawCube(t, .01 + .07 * st.dmg);
				drawMe(ctx, cam, st, {
					focus: 2.45,
					aperture: .014,
					maxBlur: 12
				});
				render(ctx, cam);
				const x = .8123, q = qfloat(x, st.bits);
				bitsHud(ctx.text.overlay, 1280, 165, Math.fround(q), {
					keep: st.bits,
					label: `x = ${q.toPrecision(7)}   mantissa ${st.bits} bits`
				});
				readout(ctx, 1280, 222, [
					["ulp(0.8)", `2^${-1 - st.bits}`],
					["error", (x - q).toExponential(2)],
					["me", `src/main.js · ${O.me.count.toLocaleString("en")} glyphs`]
				]);
				hudFrame(ctx, K);
				look(ctx);
			}
		},
		{
			id: "nan",
			at: (T) => keys(T).l84.start,
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T), t = ctx.t, lt = t - K.l84.start, st = meState(t, K);
				reset();
				const cam = O.cam.p(ctx, [
					1.9 - lt * .3,
					1.5 + lt * .1,
					3.1 + lt * .6
				], [
					0,
					1.25,
					0
				], { fov: 40 });
				drawCube(t, .03);
				drawMe(ctx, cam, st, {
					focus: Math.hypot(1.9 - lt * .3, .25 + lt * .1, 3.1 + lt * .6) - .6,
					aperture: .014,
					maxBlur: 14
				});
				const age0 = t - K.tBlow, r = rng(1234), ex = (a) => BLOW_A * a + BLOW_B * Math.max(0, a) ** 3;
				for (let i = 0; i < 320; i++) {
					const u = r() * 2 - 1, a = r() * Math.PI * 2, s = Math.sqrt(1 - u * u), dir = [
						s * Math.cos(a),
						u,
						s * Math.sin(a)
					], age = age0 - r() * .4;
					if (age <= 0 || ex(age) > 12) continue;
					const p1 = dir.map((d, k) => ME_C[k] + d * ME_R * 2 ** ex(age)), p0 = dir.map((d, k) => ME_C[k] + d * ME_R * 2 ** Math.max(0, ex(age - 1 / 30)));
					O.lines.segment(p0, p1, {
						color: col(RC.red, .8),
						width: 1.5
					});
				}
				render(ctx, cam);
				const L = ctx.text.overlay, e = Math.max(0, ex(age0)), x = Math.fround(.8123 * 2 ** e);
				const v = Number.isFinite(x) || age0 < (128 / BLOW_B) ** (1 / 3) + .15 ? x : x - x;
				bitsHud(L, 1280, 165, v, { label: `x·2^${Math.floor(e)} = ${fmt(v)}` });
				readout(ctx, 1280, 222, [["FLT_MAX", "3.4028235e+38"], ["x − x", fmt(x - x)]]);
				hudFrame(ctx, K);
				look(ctx, { ca: .3 + .25 * seg(lt, 0, .6) });
			}
		},
		{
			id: "nanWide",
			at: (T) => keys(T).B(9),
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T), t = ctx.t, lt = t - K.B(9), st = meState(t, K);
				reset();
				const cam = O.cam.o([
					0,
					1.45,
					0
				], "front", 3.6 - lt * .25, ctx.aspect);
				const r = rng(1234), age0 = t - K.tBlow;
				for (let i = 0; i < 320; i++) {
					const u = r() * 2 - 1, a = r() * Math.PI * 2, s = Math.sqrt(1 - u * u), d = [
						s * Math.cos(a),
						u,
						s * Math.sin(a)
					], lag = r() * .4;
					if (i % 3 === 2 || age0 - lag <= 0) continue;
					const p0 = d.map((v, k) => ME_C[k] + v * ME_R * 1.02), p1 = d.map((v, k) => ME_C[k] + v * 40);
					O.lines.segment(p0, p1, {
						color: col(RC.red, i % 4 === 0 ? .3 : .15),
						width: 1.2
					});
				}
				drawCube(t, .02);
				drawMe(ctx, cam, st, { size: .032 });
				O.lines.segment([
					-30,
					0,
					0
				], [
					30,
					0,
					0
				], {
					color: col(RC.red, .6),
					width: 1.6
				});
				render(ctx, cam);
				const L = ctx.text.overlay, y = toDesign([
					0,
					CUBE_C[1] + CUBE_H - .12,
					0
				], cam)[1];
				dimLine(L, [-40, y], [1960, y], "bbox.width = Infinity", {
					color: RH.red,
					alpha: .85
				});
				const c = toDesign(ME_C, cam);
				crosshair(L, c[0], c[1], 30, {
					color: RH.red,
					ring: true
				});
				monoLine(L, "centroid = (NaN, NaN, NaN)", c[0] + 330, c[1] - 170, {
					size: 16,
					color: RH.red,
					alpha: .9
				});
				L.draw((g) => {
					g.strokeStyle = RH.red;
					g.globalAlpha *= .7;
					g.lineWidth = 1.2;
					g.beginPath();
					g.moveTo(c[0] + 22, c[1] - 22);
					g.lineTo(c[0] + 150, c[1] - 170);
					g.lineTo(c[0] + 320, c[1] - 170);
					g.stroke();
				});
				readout(ctx, 1500, 150, [["NaN", Math.round(O.me.count * .42).toLocaleString("en")], ["finite", Math.round(O.me.count * .58).toLocaleString("en")]]);
				bitsHud(L, 1280, 262, NaN, { label: `NaN = 0x${new Uint32Array(new Float32Array([NaN]).buffer)[0].toString(16)}   exponent all ones, mantissa ≠ 0` });
				hudFrame(ctx, K, "view  front · orthographic");
				look(ctx, {
					vignette: .35,
					ca: .1
				});
			}
		},
		{
			id: "dialogs",
			at: (T) => keys(T).B(10),
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T), t = ctx.t, lt = t - K.B(10);
				dialogsFor(ctx);
				reset();
				const F = dialogPos(dialogFront(t, K)), c = [
					F[0] * .55 - .6,
					F[1] * .55 - .1,
					F[2]
				];
				const cam = O.cam.p(ctx, [
					c[0] + .6 + lt * .3,
					c[1] - .1,
					c[2] + 4.9 - lt * .4
				], c, {
					fov: 38,
					roll: -.03
				});
				drawDialogs(ctx, cam, K, {
					focus: 4.9 - F[2] * .9,
					aperture: .025,
					maxCoc: 24
				});
				render(ctx, cam);
				readout(ctx, 1500, 150, [["unhandled", String(K.dlg.filter((x) => x <= t).length)]]);
				hudFrame(ctx, K);
				look(ctx, { vignette: .5 });
			}
		},
		{
			id: "dialogs2",
			at: (T) => keys(T).B(11),
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T), t = ctx.t, lt = t - K.B(11);
				dialogsFor(ctx);
				reset();
				const P = dialogPos(Math.min(DLG.tz, dialogFront(t, K)));
				const cam = O.cam.p(ctx, [
					P[0] + 3.1 - lt * .6,
					P[1] - .35,
					P[2] + 2.9
				], [
					P[0] + .15,
					P[1],
					P[2]
				], { fov: 38 });
				drawDialogs(ctx, cam, K, {
					focus: Math.hypot(2.95 - lt * .6, .35, 2.9),
					aperture: .05,
					maxCoc: 40,
					gain: .82
				});
				render(ctx, cam);
				readout(ctx, 1500, 150, [["unhandled", String(K.dlg.filter((x) => x <= t).length)]]);
				hudFrame(ctx, K);
				look(ctx, {
					vignette: .55,
					bloom: .85
				});
			}
		},
		{
			id: "illegal",
			at: (T) => keys(T).l85.start,
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T), t = ctx.t, lt = t - K.tIll;
				dialogsFor(ctx);
				reset();
				if (remade(ctx)) return illegalR(ctx, K, t, lt);
				const P = dialogPos(DLG.tz), sh = (1 - ease.outCubic(seg(lt, .03, .2))) * .012 * Math.sin(lt * 90);
				const cam = O.cam.p(ctx, [
					P[0] + .12 + sh,
					P[1] - .02,
					P[2] + 2.3 - lt * .16
				], [
					P[0] + .12,
					P[1] - .02,
					P[2]
				], {
					fov: 40,
					roll: .014
				});
				const tex = capture(ctx, (sub) => {
					drawDialogs(sub, cam, K, {
						focus: 2.3,
						aperture: .004,
						maxCoc: 4
					});
					sub.draw(O.scene, cam);
				});
				look(ctx);
				view(ctx, tex, "paper", {
					gain: 2.4,
					ink: [
						.1,
						.085,
						.085
					],
					paper: [
						.93,
						.915,
						.885
					]
				});
				Object.assign(ctx.post, {
					grain: .045,
					vignette: .22
				});
				stamp(ctx.text.overlay, "ILLEGAL", 1170, 700, K.tIll - .001, t, {
					size: 176,
					rot: -.12
				});
				frame(ctx.text.overlay, t, ctx.T, {
					label: LABEL,
					color: "#4a3c3e",
					alpha: .8
				});
				consoleLog(ctx.text.overlay, ctx.T, t, {
					from: K.s0 - .2,
					color: "#2a2023",
					accent: "#c3261c",
					glow: 0
				});
			}
		},
		{
			id: "split",
			at: (T) => keys(T).B(14),
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T), t = ctx.t;
				reset();
				const g = 6, h = 776 / 3, full = crc32("ILLEGAL ARGUMENTS");
				[
					{
						label: `copy 0 · crc32 ${full} · ok`,
						swarm: {}
					},
					{
						label: `copy 1 · mantissa 6 bits · crc32 ${crc32("ILLEGAL ARGUMENTS".replace("G", "W"))} ≠ ${full}`,
						swarm: {
							bits: 6,
							corrupt: .2
						}
					},
					{
						label: `copy 2 · torn · crc32 ${crc32("ILLEGAL ARGUMENTS".replace("LE", "L\0"))} ≠ ${full}`,
						swarm: {
							tear: [
								.22,
								.16,
								7,
								.35
							],
							corrupt: .45,
							jitter: .006
						}
					}
				].forEach((c, i) => {
					const rect = [
						g,
						g + i * 264.6666666666667,
						1908,
						h
					];
					ctx.viewport(rect, (wp, hp) => {
						const cam = O.cam.o([
							0,
							0,
							0
						], "front", 2.15, wp / hp, { inset: true });
						drawWord(ctx, cam, t, K, {
							size: .016,
							swarm: c.swarm
						}, hp);
						ctx.draw(O.scene, cam);
					});
					viewportFrame(ctx.text.overlay, rect, `0x7f3a${(7168 + i * 4096).toString(16)}  ${c.label}`, { labelColor: i ? RH.red : RH.pale });
				});
				overlays(ctx, LABEL, K.s0 - .2);
				look(ctx, {
					vignette: .25,
					glitch: .04
				});
			}
		},
		{
			id: "flood",
			at: (T) => keys(T).B(15),
			ownsLyrics: true,
			draw(ctx) {
				const K = keys(ctx.T), t = ctx.t, lt = t - K.B(15), p = seg(lt, 0, K.beat);
				O.flood ??= provoke(ctx).flatMap((e) => e.lines);
				reset();
				const L = ctx.text.scene, lh = 29, cols = 3, total = 108, fill = ease.inQuad(p);
				const shown = Math.floor(total * (.3 + .7 * fill)) + 1, scroll = lt * 70;
				for (let n = 0; n < Math.min(total, shown); n++) {
					const c = n % cols, r = Math.floor(n / cols), s = O.flood[(n * 7 + c * 5) % O.flood.length], newest = n >= shown - cols;
					const y = 40 + r * lh - scroll;
					if (y < -20 || y > 1100) continue;
					L.text(noLig(s).slice(0, 58), 60 + c * 620, y, {
						size: 18,
						weight: newest ? 600 : 500,
						align: "left",
						color: s.startsWith(" ") ? "#d0685c" : RH.red,
						alpha: newest ? .95 : .55 + .3 * fill
					});
				}
				L.draw((g) => {
					const gr = g.createLinearGradient(0, 380, 0, 780);
					gr.addColorStop(0, "rgba(0,0,0,0)");
					gr.addColorStop(.18, "rgba(0,0,0,.88)");
					gr.addColorStop(.82, "rgba(0,0,0,.88)");
					gr.addColorStop(1, "rgba(0,0,0,0)");
					g.fillStyle = gr;
					g.fillRect(0, 380, 1920, 400);
				});
				tokenRow(ctx.text.overlay, t, TOKENS.map(() => 0), 960, 530, { size: 92 });
				const n = Math.round(lerp(198400, CONTEXT_END, ease.inQuad(p))), f = n / CONTEXT_MAX, over = f > 1;
				const O2 = ctx.text.overlay, st = {
					size: 20,
					weight: 600,
					font: "JetBrains Mono",
					align: "left"
				};
				O2.text("context", 560, 690, {
					...st,
					color: "#8a7a7e",
					alpha: .95
				});
				O2.text(`${n.toLocaleString("en")} / ${CONTEXT_MAX.toLocaleString("en")} tokens`, 690, 690, {
					...st,
					color: over ? RH.red : RH.pale,
					alpha: .95
				});
				O2.draw((g) => {
					const w = 700;
					g.globalAlpha *= .9;
					g.strokeStyle = "#8a7a7e";
					g.lineWidth = 1.2;
					g.strokeRect(560.5, 712.5, w, 12);
					g.fillStyle = over ? RH.red : RH.pale;
					g.fillRect(562, 714, Math.min(1, f) * 697, 9);
					if (over) g.fillRect(1264, 714, Math.min(260, (f - 1) * w * 6), 9);
				});
				hudFrame(ctx, K);
				look(ctx, {
					vignette: .45,
					glitch: .06 + .14 * p
				});
			}
		}
	]
});
/**
* (The remake, docs/REMAKE.md ruling 26: no paper) ILLEGAL in the dark: the same last dialog in its own light, the
* stamp landing with the cut, the HUD as in the rest of the bridge. (Appended at the end of the file so that no line
* of the published code moves: this file's line numbers are printed in its live call stacks.)
*/
var ILL_LINE = {
	u0: 88 / 512,
	u1: (88 + 7 * 10.2) / 512,
	v: 122 / 240
};
function illegalR(ctx, K, t, lt) {
	const P = dialogPos(DLG.tz), s = DLG.size, h = s / O.dlgAtlas.aspect, step = (K.B(14) - K.tIll - .08) / (DLG.n - 1);
	const hit = (k) => K.tIll + (DLG.tz - k) * step;
	const pull = ease.outCubic(seg(lt, .02, K.B(14) - K.tIll));
	const pos = [
		lerp(P[0] + .12, P[0] - .55, pull),
		lerp(P[1] - .02, P[1] + .55, pull),
		lerp(P[2] + 2.3, P[2] + 5.2, pull)
	];
	const aim = [
		lerp(P[0] + .12, P[0] - 1.45, pull),
		lerp(P[1] - .02, P[1] + .78, pull),
		lerp(P[2], P[2] - .55, pull)
	];
	const cam = O.cam.p(ctx, pos, aim, {
		fov: 40,
		roll: .014 * (1 - pull)
	});
	const fx = (k) => {
		const e = t - hit(k), on = seg(e, 0, .05), j = e > 0 ? Math.exp(-e / .07) * Math.sin(e * 55) : 0;
		return {
			tint: [
				lerp(1, 1.18, on),
				lerp(1, .36, on),
				lerp(1, .3, on)
			],
			dz: .05 * j,
			tilt: .035 * j
		};
	};
	drawDialogs(ctx, cam, K, {
		focus: Math.hypot(pos[0] - P[0], pos[1] - P[1], pos[2] - P[2]),
		aperture: .006 + .02 * pull,
		maxCoc: 18,
		gain: .9
	}, fx);
	O.illBox ??= (() => {
		const a = wordShape(4096, "ILLEGAL ARGUMENTS", 0, 7);
		let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
		for (let i = 0; i < 4096; i++) {
			x0 = Math.min(x0, a[i * 4]);
			x1 = Math.max(x1, a[i * 4]);
			y0 = Math.min(y0, a[i * 4 + 1]);
			y1 = Math.max(y1, a[i * 4 + 1]);
		}
		return {
			cx: (x0 + x1) / 2,
			cy: (y0 + y1) / 2,
			w: x1 - x0
		};
	})();
	const B = O.illBox, line = [
		P[0] + ((ILL_LINE.u0 + ILL_LINE.u1) / 2 - .5) * s,
		P[1] + (.5 - ILL_LINE.v) * h,
		P[2] + .012
	];
	const lift = ease.inOutCubic(seg(lt, .06, .62)), sc = lerp((ILL_LINE.u1 - ILL_LINE.u0) * s, 1.75, lift) / B.w;
	const c = [
		line[0] + lift * .62,
		line[1] + lift * .5,
		line[2] + lift * 1.15
	];
	const wd = O.word;
	wd.points.visible = true;
	wd.points.scale.setScalar(sc);
	wd.points.position.set(c[0] - B.cx * sc, c[1] - B.cy * sc, c[2]);
	wd.points.updateMatrixWorld();
	const burn = seg(lt, 0, .05);
	wd.set({
		a: O.tex.ill,
		b: O.tex.ill,
		morph: 0,
		t,
		size: lerp(.0035, .016, lift),
		minPx: 1,
		bright: lerp(.5, 1.25, burn),
		colA: mix3([
			1,
			.93,
			.9
		], RC.red, burn),
		colB: mix3([
			1,
			.93,
			.9
		], RC.red, burn),
		sparkle: .12 + .2 * burn
	}, cam, ctx.H);
	render(ctx, cam);
	wd.points.scale.setScalar(1);
	wd.points.position.set(0, 0, 0);
	wd.points.updateMatrixWorld();
	readout(ctx, 1500, 150, [["thrown", "RangeError"], ["unwound", `${Array.from({ length: DLG.n }, (_, k) => t >= hit(k)).filter(Boolean).length} / ${DLG.n}`]]);
	hudFrame(ctx, K);
	look(ctx, {
		vignette: .5,
		bloom: .95 + .25 * burn
	});
}
function atlasH(ctx) {
	return ctx.engine.mode === "render" ? ctx.H : 2160;
}
//#endregion
