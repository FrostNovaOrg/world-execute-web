import { fileUrl } from "./config.js?v=BkWxxfxi";
//#region src/engine/fonts.js
/**
* The FontFace specs ({ family, src, descriptors }) for the open fonts `fonts` ({ family, file, descriptors }), with the
* system faces of `system` (family → [[PostScript name, lightest weight, heaviest weight], …]) in the place of a
* family's open font. url: a font file's URL (the page's fileUrl; a tool in node passes file: URLs).
*/
function fontFaces(fonts, system, url = fileUrl) {
	return fonts.flatMap((f) => {
		const href = url(f.file), sys = system?.[f.family];
		if (!sys) return [{
			family: f.family,
			src: `url("${href}")`,
			descriptors: f.descriptors
		}];
		return sys.map(([ps, a, b]) => ({
			family: f.family,
			src: `local("${ps}"), url("${href}")`,
			descriptors: {
				...f.descriptors,
				weight: `${a} ${b}`
			}
		}));
	});
}
//#endregion
export { fontFaces };
