//#region src/lib/published.js
var PUBLISHED = ["orig"];
var remade = (ctx) => !!ctx && !PUBLISHED.includes(ctx.edit);
//#endregion
export { PUBLISHED, remade };
