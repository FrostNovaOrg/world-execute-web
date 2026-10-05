//#region src/player/pace.js
/** Is a frame due at vsync time `now`? (next: when it is due; refresh: the display's frame interval, ms) */
var due = (now, next, refresh) => now >= next - refresh / 2;
/** When the frame after one drawn at `now` is due; after a stall the pacing restarts rather than bursting to catch up. */
var advance = (now, next, frameMs) => (now - next > frameMs ? now : next) + frameMs;
//#endregion
export { advance, due };
