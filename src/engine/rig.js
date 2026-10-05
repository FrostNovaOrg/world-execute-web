import { OrthographicCamera, PerspectiveCamera, Quaternion, Vector3 } from "../../vendor/three/build/three.core.js?v=q9f7JKE-";
//#region src/engine/rig.js
var PROBE = Symbol("rig probe");
var ORTHO_DIST = 600;
var IDLE = {
	mode: "off",
	pose: null,
	found: null,
	used: false,
	shift: null,
	bump: 0
};
var state = { ...IDLE };
var P = new PerspectiveCamera(40, 16 / 9, .01, 500);
var O = new OrthographicCamera(-1, 1, 1, -1, .01, 200);
var v = new Vector3();
var qa = new Quaternion();
var qb = new Quaternion();
var rad = (d) => d * Math.PI / 180;
var lerp = (a, b, k) => a + (b - a) * k;
var lerp3 = (a, b, k) => a.map((x, i) => lerp(x, b[i], k));
/**
* A camera's pose as plain numbers. look: the point the helper aimed at (its depth along the axis is what matters);
* without one, the point of the axis nearest the origin is taken.
*/
function poseOf(cam, { look = null } = {}) {
	cam.updateMatrixWorld();
	const fwd = new Vector3(0, 0, -1).applyQuaternion(cam.quaternion), pos = cam.position.clone();
	let height = 0, aspect = cam.aspect;
	if (cam.isOrthographicCamera) {
		const right = new Vector3(1, 0, 0).applyQuaternion(cam.quaternion), up = new Vector3(0, 1, 0).applyQuaternion(cam.quaternion);
		pos.addScaledVector(right, (cam.right + cam.left) / 2 / cam.zoom).addScaledVector(up, (cam.top + cam.bottom) / 2 / cam.zoom);
		height = (cam.top - cam.bottom) / cam.zoom;
		aspect = (cam.right - cam.left) / (cam.top - cam.bottom);
	}
	const dist = look ? Math.max(1e-4, v.set(...look).sub(pos).dot(fwd)) : Math.max(.5, -pos.dot(fwd));
	const at = pos.clone().addScaledVector(fwd, dist).toArray();
	const base = {
		pos: pos.toArray(),
		quat: cam.quaternion.toArray(),
		look: at,
		dist,
		aspect,
		near: cam.near,
		far: cam.far
	};
	return cam.isOrthographicCamera ? {
		ortho: true,
		height,
		...base
	} : {
		ortho: false,
		fov: cam.fov,
		...base
	};
}
/** Half the height of the view at the look point, and the tangent of half the field of view. */
var lens = (p) => p.ortho ? {
	s: p.height / 2,
	th: p.height / 2 / ORTHO_DIST
} : {
	s: p.dist * Math.tan(rad(p.fov) / 2),
	th: Math.tan(rad(p.fov) / 2)
};
/**
* The pose a fraction e of the way from A to B. The look point travels in a straight line, the orientation turns at a
* constant rate, the size of the framing at the look point changes in proportion (so a push-in feels even), and the
* strength of the perspective changes linearly. The camera's position follows from those: it swings around the
* subject instead of cutting the corner, and an orthographic end opens up into perspective without a jump.
*/
function blendPoses(A, B, e) {
	const look = lerp3(A.look, B.look, e), a = lens(A), b = lens(B), s = Math.exp(lerp(Math.log(a.s), Math.log(b.s), e));
	const quat = qa.fromArray(A.quat).slerp(qb.fromArray(B.quat), e).toArray(), back = new Vector3(0, 0, 1).applyQuaternion(qa);
	const aspect = lerp(A.aspect, B.aspect, e), behind = (d) => look.map((x, i) => x + back.getComponent(i) * d);
	if (A.ortho && B.ortho) {
		const dist = lerp(A.dist, B.dist, e);
		return {
			ortho: true,
			height: 2 * s,
			look,
			quat,
			dist,
			aspect,
			pos: behind(dist),
			near: lerp(A.near, B.near, e),
			far: lerp(A.far, B.far, e)
		};
	}
	const th = lerp(a.th, b.th, e), dist = s / th, pos = behind(dist);
	const persp = [A, B].filter((p) => !p.ortho), mixed = persp.length < 2;
	const near = mixed ? Math.max(persp[0].near, dist - 60) : lerp(A.near, B.near, e);
	const far = mixed ? dist + Math.max(persp[0].far, 200) : lerp(A.far, B.far, e);
	return {
		ortho: false,
		fov: 2 * Math.atan(th) * 180 / Math.PI,
		look,
		quat,
		dist,
		aspect,
		pos,
		near,
		far
	};
}
function setPose(p) {
	const c = p.ortho ? O : P;
	if (p.ortho) {
		const w = p.height * p.aspect;
		Object.assign(c, {
			left: -w / 2,
			right: w / 2,
			top: p.height / 2,
			bottom: -p.height / 2,
			zoom: 1
		});
	} else {
		c.fov = p.fov;
		c.aspect = p.aspect;
	}
	c.near = p.near;
	c.far = p.far;
	c.position.fromArray(p.pos);
	c.quaternion.fromArray(p.quat);
	c.updateProjectionMatrix();
	c.updateMatrixWorld(true);
	return c;
}
/** Lens shift (in normalised device units: 1 = half the frame) and push-in, applied to the projection only. */
function dressUp(c) {
	const e = c.projectionMatrix.elements, k = 1 + state.bump, [sx, sy] = state.shift ?? [0, 0];
	e[0] *= k;
	e[5] *= k;
	if (c.isOrthographicCamera) {
		e[12] = e[12] * k + sx;
		e[13] = e[13] * k + sy;
	} else {
		e[8] = e[8] * k - sx;
		e[9] = e[9] * k - sy;
	}
	c.projectionMatrixInverse.copy(c.projectionMatrix).invert();
}
var rig = {
	/** Called by every camera helper once its camera is set. meta: { look: [x, y, z], inset, main }. Returns the camera to draw with. */
	cam(camera, meta = {}) {
		if (state.mode === "off" || meta.inset || state.used && !meta.main) return camera;
		if (state.mode === "probe") {
			state.found = poseOf(camera, meta);
			throw PROBE;
		}
		state.used = true;
		const c = state.mode === "drive" ? setPose(state.pose) : camera;
		if (state.shift || state.bump) dressUp(c);
		return c;
	},
	/** Run a shot's draw only as far as its main camera: returns that camera's pose, or null if the shot sets none. */
	probe(fn) {
		const prev = state;
		state = {
			...IDLE,
			mode: "probe"
		};
		try {
			fn();
		} catch (e) {
			if (e !== PROBE) {
				state = prev;
				throw e;
			}
		}
		const found = state.found;
		state = prev;
		return found;
	},
	/** Run a shot's draw with its main camera replaced by `pose` (and dressed: { shift: [x, y], bump }). */
	drive(pose, fn, dress = {}) {
		const prev = state;
		state = {
			...IDLE,
			mode: "drive",
			pose,
			shift: dress.shift ?? null,
			bump: dress.bump ?? 0
		};
		try {
			fn();
		} finally {
			state = prev;
		}
	},
	/** Run a shot's draw with its own main camera dressed: { shift: [x, y] in device units, bump: fraction }. */
	dress(o, fn) {
		const prev = state;
		state = {
			...IDLE,
			mode: "dress",
			shift: o.shift ?? null,
			bump: o.bump ?? 0
		};
		try {
			fn();
		} finally {
			state = prev;
		}
	},
	/**
	* Run fn with the rig off: another shot drawn inside this one (a memory, engine.renderShotAt) keeps its
	* own camera even while this one is being probed, driven by a relay or dressed.
	*/
	isolate(fn) {
		const prev = state;
		state = { ...IDLE };
		try {
			return fn();
		} finally {
			state = prev;
		}
	}
};
//#endregion
export { blendPoses, poseOf, rig };
