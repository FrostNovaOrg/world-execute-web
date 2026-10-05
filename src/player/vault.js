import { CONFIG } from "./config.js?v=Cv08Ht0h";
//#region src/player/vault.js
var S = crypto.subtle;
var te = new TextEncoder();
var CURVE = {
	name: "ECDH",
	namedCurve: "P-256"
};
/** The configured label of the protocol. Every function below takes `ns` to override it (tests). */
var NS = CONFIG.audio.namespace;
/** Why the song could not be fetched: code 'status' (the server answered `status`) or 'unreachable' (no answer). */
var SongError = class extends Error {
	constructor(code, status = 0) {
		super(code === "status" ? `audio ${status}` : "cannot reach the audio service");
		this.name = "SongError";
		this.code = code;
		this.status = status;
	}
};
var b64u = {
	enc: (b) => btoa(String.fromCharCode(...new Uint8Array(b))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""),
	dec: (s) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0))
};
/** The HKDF info of the key wrap. */
var wrapInfo = (ns = NS) => `${ns}/wrap`;
/** Each part is bound to its place: a part moved to another slot fails to open. */
var aad = (i, n, ns = NS) => te.encode(`${ns}/part/${i}/${n}`);
async function hkdf(ikm, salt, info, alg, usages) {
	const base = await S.importKey("raw", ikm, "HKDF", false, ["deriveKey"]);
	return S.deriveKey({
		name: "HKDF",
		hash: "SHA-256",
		salt,
		info: te.encode(info)
	}, base, alg, false, usages);
}
/** The song's bytes (the AAC file), from the key service at `api` (an absolute URL) and the parts it names. */
async function fetchSong(api, { fetch = globalThis.fetch, ns = NS } = {}) {
	const fail = (r) => {
		throw new SongError("status", r.status);
	};
	const get = (url, init) => fetch(url, init).catch(() => {
		throw new SongError("unreachable");
	});
	const mine = await S.generateKey(CURVE, false, ["deriveBits"]);
	const r = await get(api, {
		method: "POST",
		body: b64u.enc(await S.exportKey("raw", mine.publicKey)),
		headers: { "content-type": "text/plain" }
	});
	if (!r.ok) fail(r);
	const s = await r.json();
	const kf = s.kf ?? "raw", theirs = await S.importKey(kf, kf === "jwk" ? s.k : b64u.dec(s.k), CURVE, false, []);
	const wrapping = await hkdf(await S.deriveBits({
		name: "ECDH",
		public: theirs
	}, mine.privateKey, 256), b64u.dec(s.s), wrapInfo(ns), {
		name: "AES-GCM",
		length: 256
	}, ["unwrapKey"]);
	const key = await S.unwrapKey("raw", b64u.dec(s.w), wrapping, {
		name: "AES-GCM",
		iv: b64u.dec(s.iv)
	}, { name: "AES-GCM" }, false, ["decrypt"]);
	const n = s.parts.length;
	const parts = await Promise.all(s.parts.map(async (id, i) => {
		const p = await get(new URL(id, api).href);
		if (!p.ok) fail(p);
		const b = new Uint8Array(await p.arrayBuffer());
		return new Uint8Array(await S.decrypt({
			name: "AES-GCM",
			iv: b.subarray(0, 12),
			additionalData: aad(i, n, ns)
		}, key, b.subarray(12)));
	}));
	const out = new Uint8Array(parts.reduce((a, p) => a + p.length, 0));
	parts.reduce((at, p) => (out.set(p, at), at + p.length), 0);
	return out.buffer;
}
//#endregion
export { NS, SongError, aad, b64u, fetchSong, hkdf, wrapInfo };
