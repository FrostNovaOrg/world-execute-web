//#region src/player/gputimer.js
var GpuTimer = class {
	constructor(gl) {
		this.gl = gl;
		this.ext = gl.getExtension("EXT_disjoint_timer_query_webgl2");
		this.pending = [];
		this.cur = null;
	}
	get ok() {
		return !!this.ext;
	}
	begin(tag) {
		if (!this.ext || this.cur) return;
		const q = this.gl.createQuery();
		this.gl.beginQuery(this.ext.TIME_ELAPSED_EXT, q);
		this.cur = {
			q,
			tag
		};
	}
	end() {
		if (!this.cur) return;
		this.gl.endQuery(this.ext.TIME_ELAPSED_EXT);
		this.pending.push(this.cur);
		this.cur = null;
	}
	poll() {
		const gl = this.gl, out = [];
		if (!this.ext) return out;
		const disjoint = gl.getParameter(this.ext.GPU_DISJOINT_EXT);
		while (this.pending.length && gl.getQueryParameter(this.pending[0].q, gl.QUERY_RESULT_AVAILABLE)) {
			const { q, tag } = this.pending.shift();
			if (!disjoint) out.push({
				ms: gl.getQueryParameter(q, gl.QUERY_RESULT) / 1e6,
				tag
			});
			gl.deleteQuery(q);
		}
		while (this.pending.length > 8) this.gl.deleteQuery(this.pending.shift().q);
		return out;
	}
	reset() {
		this.pending = [];
		this.cur = null;
	}
};
//#endregion
export { GpuTimer };
