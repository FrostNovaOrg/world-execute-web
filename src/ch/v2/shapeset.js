//#region src/ch/v2/shapeset.js
/** Fill slot i of a { pos, col, nrm } set. */
function put(S, i, p, c, n = [
	0,
	0,
	0
], w = 0, cls = 0) {
	S.pos[i * 4] = p[0];
	S.pos[i * 4 + 1] = p[1];
	S.pos[i * 4 + 2] = p[2];
	S.pos[i * 4 + 3] = w;
	S.col[i * 4] = c[0];
	S.col[i * 4 + 1] = c[1];
	S.col[i * 4 + 2] = c[2];
	S.col[i * 4 + 3] = cls;
	S.nrm[i * 4] = n[0];
	S.nrm[i * 4 + 1] = n[1];
	S.nrm[i * 4 + 2] = n[2];
}
var alloc = (N) => ({
	pos: new Float32Array(N * 4),
	col: new Float32Array(N * 4),
	nrm: new Float32Array(N * 4)
});
//#endregion
export { alloc, put };
