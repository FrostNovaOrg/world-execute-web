import { MathUtils, Vector3 } from "../../../vendor/three/build/three.core.js?v=q9f7JKE-";
//#region src/ch/c1/view.js
var f = new Vector3();
var r = new Vector3();
var up = new Vector3();
/** Aim a perspective camera from pos at look; roll (radians) rotates the image about the view axis. */
function aim(cam, pos, look, { fov = 38, aspect = 16 / 9, roll = 0, near = .01, far = 500, up: wup = null } = {}) {
	cam.fov = fov;
	cam.aspect = aspect;
	cam.near = near;
	cam.far = far;
	cam.position.set(...pos);
	f.set(look[0] - pos[0], look[1] - pos[1], look[2] - pos[2]).normalize();
	const wu = wup ?? (Math.abs(f.y) > .999 ? [
		0,
		0,
		-1
	] : [
		0,
		1,
		0
	]);
	r.copy(f).cross(up.set(...wu)).normalize();
	up.copy(r).cross(f);
	cam.up.copy(up).multiplyScalar(Math.cos(roll)).addScaledVector(r, Math.sin(roll));
	cam.lookAt(...look);
	cam.updateProjectionMatrix();
	cam.updateMatrixWorld();
	return cam;
}
/** Orthographic blueprint view of `height` world units, looking at center from 'front' (+z), 'top' (+y), 'side' (+x) or 'bottom'. */
function blueprint(cam, center, dir, height, aspect, { roll = 0 } = {}) {
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
		cam.up.set(Math.sin(roll), Math.cos(roll), 0);
	} else if (dir === "top") {
		cam.position.set(x, y + d, z);
		cam.up.set(Math.sin(roll), 0, -Math.cos(roll));
	} else if (dir === "bottom") {
		cam.position.set(x, y - d, z);
		cam.up.set(Math.sin(roll), 0, Math.cos(roll));
	} else {
		cam.position.set(x + d, y, z);
		cam.up.set(0, Math.cos(roll), Math.sin(roll));
	}
	cam.lookAt(x, y, z);
	cam.updateProjectionMatrix();
	cam.updateMatrixWorld();
	return cam;
}
/** Spherical position around a target: [x, y, z] at distance r, azimuth az (from +z toward +x), elevation el. */
var around = (target, r, az, el) => [
	target[0] + r * Math.cos(el) * Math.sin(az),
	target[1] + r * Math.sin(el),
	target[2] + r * Math.cos(el) * Math.cos(az)
];
/** Dolly zoom: the distance at which a subject of half-height h fills the same share of frame at field of view fov. */
var dollyDist = (h, fov) => h / Math.tan(MathUtils.degToRad(fov) / 2);
//#endregion
export { aim, around, blueprint, dollyDist };
