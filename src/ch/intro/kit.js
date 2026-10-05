import { TAU, clamp, lerp } from "../../engine/math.js?v=BJIlRm7-";
import { MathUtils, Vector3 } from "../../../vendor/three/build/three.core.js?v=q9f7JKE-";
import { rig } from "../../engine/rig.js?v=39-joEtk";
//#region src/ch/intro/kit.js
var v3 = new Vector3();
/** Aim a perspective camera: position, look-at target, fov, aspect, optional roll (radians). */
function persp(cam, pos, look, { fov = 38, aspect = 16 / 9, roll = 0, near = .01, far = 800, inset = false } = {}) {
	cam.fov = fov;
	cam.aspect = aspect;
	cam.near = near;
	cam.far = far;
	cam.position.set(pos[0], pos[1], pos[2]);
	const f = new Vector3(look[0] - pos[0], look[1] - pos[1], look[2] - pos[2]).normalize();
	const upWorld = Math.abs(f.y) > .999 ? new Vector3(0, 0, -1) : new Vector3(0, 1, 0);
	const r = new Vector3().crossVectors(f, upWorld).normalize(), u = new Vector3().crossVectors(r, f);
	cam.up.copy(u.multiplyScalar(Math.cos(roll)).addScaledVector(r, Math.sin(roll)));
	cam.lookAt(look[0], look[1], look[2]);
	cam.updateProjectionMatrix();
	cam.updateMatrixWorld();
	return rig.cam(cam, {
		look,
		inset
	});
}
/** Orthographic "blueprint" views: dir 'front' (looks -z), 'top' (looks -y, screen-up = -z), 'side' (looks -x). */
function ortho(cam, center, dir, height, aspect, { inset = false } = {}) {
	const w = height * aspect, d = 60, [x, y, z] = center;
	Object.assign(cam, {
		left: -w / 2,
		right: w / 2,
		top: height / 2,
		bottom: -height / 2,
		near: .01,
		far: 400,
		zoom: 1
	});
	if (dir === "front") {
		cam.position.set(x, y, z + d);
		cam.up.set(0, 1, 0);
	} else if (dir === "top") {
		cam.position.set(x, y + d, z);
		cam.up.set(0, 0, -1);
	} else {
		cam.position.set(x + d, y, z);
		cam.up.set(0, 1, 0);
	}
	cam.lookAt(x, y, z);
	cam.updateProjectionMatrix();
	cam.updateMatrixWorld();
	return rig.cam(cam, {
		look: center,
		inset
	});
}
/** Spherical position around a target (az about +y from +z, el above the horizon). */
var around = (target, r, az, el) => [
	target[0] + r * Math.cos(el) * Math.sin(az),
	target[1] + r * Math.sin(el),
	target[2] + r * Math.cos(el) * Math.cos(az)
];
/** Distance of a world point in front of the camera (along its view axis). */
function viewDepth(p, cam) {
	v3.set(p[0], p[1], p[2]).applyMatrix4(cam.matrixWorldInverse);
	return cam.isOrthographicCamera ? 1 : -v3.z;
}
/**
* Glow lines with a lens: the same circle-of-confusion model as the swarm (engine/swarm.js), applied per piece.
* In-focus pieces go to the sharp line set, defocused ones to a soft set (a GlowLines whose core is almost nothing,
* so it reads as a gaussian smear), widened by the blur and dimmed so the energy is conserved.
* dof: { cam, focus, aperture, maxBlur (design px), soft: GlowLines, n: pieces per segment }
*/
function dofSegment(L, a, b, o, dof) {
	if (!dof || !dof.aperture || dof.cam.isOrthographicCamera) {
		L.segment(a, b, o);
		return;
	}
	const n = Math.max(1, dof.n ?? 1), cam = dof.cam, focal = 540 / Math.tan(MathUtils.degToRad(cam.fov) / 2);
	const w = o.width ?? 6, col = o.color ?? [
		1,
		1,
		1
	];
	for (let i = 0; i < n; i++) {
		const p = [
			0,
			1,
			2
		].map((j) => lerp(a[j], b[j], i / n)), q = [
			0,
			1,
			2
		].map((j) => lerp(a[j], b[j], (i + 1) / n));
		const z = viewDepth([
			(p[0] + q[0]) / 2,
			(p[1] + q[1]) / 2,
			(p[2] + q[2]) / 2
		], cam);
		if (z <= .005) continue;
		const coc = Math.min(dof.aperture * Math.abs(z - dof.focus) / z * focal, dof.maxBlur ?? 60);
		if (coc < 2 || !dof.soft) {
			L.segment(p, q, {
				...o,
				width: w + coc * .5
			});
			continue;
		}
		const w2 = w + coc, k = w / w2;
		dof.soft.segment(p, q, {
			...o,
			width: w2,
			color: col.map((c) => c * k * 2.4)
		});
	}
}
function dofPolyline(L, pts, o, dof) {
	if (!dof || !dof.aperture) {
		L.polyline(pts, o);
		return;
	}
	for (let i = 1; i < pts.length; i++) dofSegment(L, pts[i - 1], pts[i], o, dof);
}
function dofDot(L, p, o, dof) {
	if (!dof || !dof.aperture || dof.cam.isOrthographicCamera) {
		L.segment(p, p, o);
		return;
	}
	const focal = 540 / Math.tan(MathUtils.degToRad(dof.cam.fov) / 2), z = viewDepth(p, dof.cam);
	if (z <= .005) return;
	const coc = Math.min(dof.aperture * Math.abs(z - dof.focus) / z * focal, dof.maxBlur ?? 60), w = o.width ?? 12;
	if (coc < 2 || !dof.soft) {
		L.segment(p, p, o);
		return;
	}
	const w2 = w + coc, k = (w / w2) ** 2;
	dof.soft.segment(p, p, {
		...o,
		width: w2,
		color: (o.color ?? [
			1,
			1,
			1
		]).map((c) => c * k * 2.4)
	});
}
/**
* As dofPolyline, but the lens blends continuously: each piece is drawn on the sharp set and on the soft set with
* complementary weights across coc ∈ [1, 4] px, so a long line that runs through the focal plane has no visible
* seams where it changes set (dofSegment switches sets at 2 px). Twice the pieces; use it for long, faint lines.
*/
function dofPolylineSmooth(L, pts, o, dof) {
	if (!dof || !dof.aperture || !dof.soft || dof.cam.isOrthographicCamera) {
		L.polyline(pts, o);
		return;
	}
	const n = Math.max(1, dof.n ?? 4), cam = dof.cam, focal = 540 / Math.tan(MathUtils.degToRad(cam.fov) / 2);
	const w = o.width ?? 6, col = o.color ?? [
		1,
		1,
		1
	];
	for (let s = 1; s < pts.length; s++) {
		const a = pts[s - 1], b = pts[s];
		for (let i = 0; i < n; i++) {
			const p = [
				0,
				1,
				2
			].map((j) => lerp(a[j], b[j], i / n)), q = [
				0,
				1,
				2
			].map((j) => lerp(a[j], b[j], (i + 1) / n));
			const z = viewDepth([
				(p[0] + q[0]) / 2,
				(p[1] + q[1]) / 2,
				(p[2] + q[2]) / 2
			], cam);
			if (z <= .005) continue;
			const coc = Math.min(dof.aperture * Math.abs(z - dof.focus) / z * focal, dof.maxBlur ?? 60), k = clamp((coc - 1) / 3);
			if (k < 1) L.segment(p, q, {
				...o,
				width: w + coc * .5,
				color: col.map((c) => c * (1 - k))
			});
			if (k > 0) dof.soft.segment(p, q, {
				...o,
				width: w + coc,
				color: col.map((c) => c * k * w / (w + coc) * 2.4)
			});
		}
	}
}
/**
* Soft dark scrims on a text layer (design px rects [x, y, w, h]), so HUD text stays legible over a busy picture
* (a page of code, the lattice). alpha: strength; blur: feather (design px).
*/
function scrim(L, rects, { alpha = .7, blur = 36 } = {}) {
	if (alpha <= .01) return;
	L.draw((g, s) => {
		g.fillStyle = `rgba(0,0,0,${alpha})`;
		if ("filter" in g) g.filter = `blur(${blur * s}px)`;
		for (const r of rects) g.fillRect(...r);
		if ("filter" in g) g.filter = "none";
	});
}
/** Closed circle of radius r around c in the plane 'xz' (floor) or 'xy'. */
function circle(c, r, n = 96, plane = "xz") {
	const pts = [];
	for (let i = 0; i <= n; i++) {
		const a = i / n * TAU, u = Math.cos(a) * r, v = Math.sin(a) * r;
		pts.push(plane === "xz" ? [
			c[0] + u,
			c[1],
			c[2] + v
		] : [
			c[0] + u,
			c[1] + v,
			c[2]
		]);
	}
	return pts;
}
/** Evaluate a polyline at arc length s (clamped); returns [point, unit direction]. */
function atLength(pts, acc, s) {
	const L = acc[acc.length - 1];
	s = clamp(s, 0, L);
	let i = 1;
	while (i < acc.length - 1 && acc[i] < s) i++;
	const a = pts[i - 1], b = pts[i], seg = acc[i] - acc[i - 1] || 1, k = (s - acc[i - 1]) / seg;
	const d = [
		(b[0] - a[0]) / seg,
		(b[1] - a[1]) / seg,
		(b[2] - a[2]) / seg
	];
	return [[
		a[0] + (b[0] - a[0]) * k,
		a[1] + (b[1] - a[1]) * k,
		a[2] + (b[2] - a[2]) * k
	], d];
}
/** Cumulative arc lengths of a polyline. */
function arcLengths(pts) {
	const acc = [0];
	for (let i = 1; i < pts.length; i++) acc.push(acc[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1], pts[i][2] - pts[i - 1][2]));
	return acc;
}
/** The first `len` units of a polyline (for draw-on by length rather than by fraction). */
function headOf(pts, acc, len) {
	if (len <= 0) return [];
	const out = [pts[0]];
	for (let i = 1; i < pts.length; i++) {
		if (acc[i] <= len) {
			out.push(pts[i]);
			continue;
		}
		const k = (len - acc[i - 1]) / (acc[i] - acc[i - 1]);
		out.push([
			0,
			1,
			2
		].map((j) => pts[i - 1][j] + (pts[i][j] - pts[i - 1][j]) * k));
		break;
	}
	return out;
}
/** Scale an RGB triple. */
var mul = (c, k) => [
	c[0] * k,
	c[1] * k,
	c[2] * k
];
/** Mix two RGB triples. */
var mixc = (a, b, k) => [
	lerp(a[0], b[0], k),
	lerp(a[1], b[1], k),
	lerp(a[2], b[2], k)
];
//#endregion
export { arcLengths, around, atLength, circle, dofDot, dofPolyline, dofPolylineSmooth, dofSegment, headOf, mixc, mul, ortho, persp, scrim, viewDepth };
