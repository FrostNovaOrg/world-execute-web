//#region src/ch/intro/title-keys.js
/**
* The key times (song seconds), one per character of LINE_R:
*   `world`         five keys from the sung "world" to the first beat of bar 8, where the dot is struck
*   `start`         sixteenths from the onset of "begin"
*   `Simulation();` from the first syllable of SIMULATION, evenly, the last a thirty-second before Enter
* at: { world, bar8, begin, sim, enterKey, beat } (seconds; beat is one beat's length).
*/
function titleKeys({ world, bar8, begin, sim, enterKey, beat }) {
	const keys = [];
	for (let i = 0; i < 5; i++) keys.push(world + (bar8 - world) * i / 5);
	keys.push(bar8);
	for (let i = 0; i < 5; i++) keys.push(begin + i * beat / 4);
	const last = enterKey - beat / 8;
	for (let i = 0; i < 13; i++) keys.push(sim + (last - sim) * i / 12);
	return keys;
}
//#endregion
export { titleKeys };
