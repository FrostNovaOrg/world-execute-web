//#region web.config.json
var title = "world.execute (me) ;";
var lang = "zh-CN";
var description = "Mili「world.execute (me) ;」全代码生成 MV，每一帧都在你的浏览器里实时算出来。";
var credits = ["Visuals — Claude Opus 5.5 Max", "Music — Mili「world.execute (me) ;」"];
var accent = "#7ef0ff";
var site = "https://execute.frostnova.org";
var origins = [];
var links = { "video": "" };
var cover = {
	"wide": "assets/web/cover-wide.jpg",
	"tall": "assets/web/cover-tall.jpg",
	"og": "assets/web/og.jpg",
	"ogSize": [1200, 750],
	"shapes": {
		"assets/web/cover-tall.jpg": [1080, 1920],
		"assets/web/cover-4x3.jpg": [1920, 1440],
		"assets/web/cover-3x2.jpg": [1920, 1280],
		"assets/web/cover-wide.jpg": [1920, 1201],
		"assets/web/cover-16x9.jpg": [1920, 1080],
		"assets/web/cover-2x1.jpg": [1920, 960],
		"assets/web/cover-21x9.jpg": [1920, 823]
	},
	"safe": .022
};
var icon = {
	"png": {
		"16": "assets/web/icon-16.png",
		"32": "assets/web/icon-32.png",
		"48": "assets/web/icon-48.png"
	},
	"apple": "assets/web/apple-touch-icon.png",
	"ico": "assets/web/favicon.ico"
};
var audio = {
	"namespace": "wem-audio",
	"path": "api/song",
	"parts": "s"
};
var subs = {
	"langs": [{
		"id": "zh",
		"label": "开"
	}],
	"off": "last"
};
var text = {
	"en": {
		"loading": "Loading…",
		"play": "Play",
		"replay": "Play again",
		"retry": "Retry",
		"resume": "Continue from {time}",
		"compiling": "Compiling shaders {percent}%",
		"loadingAudio": "Loading the song…",
		"calibrating": "Testing this device…",
		"ready": "Ready",
		"ended": "The end",
		"failed": "Could not load: {reason}.",
		"unsupported": "{reason} This device cannot render the film in real time. {advice}",
		"unsupportedWatch": "You can watch the finished video instead.",
		"unsupportedTip": "Try a current Chrome, Edge, Safari or Firefox, or another device.",
		"noWebgl2": "This browser has no WebGL2.",
		"noFloatTargets": "This graphics card cannot render to float textures (EXT_color_buffer_float).",
		"contextLostFinal": "The graphics context was lost again and again (out of graphics memory).",
		"chaptersMissing": "{count} chapter file(s) did not download",
		"audioStatus": "the song request returned {status}",
		"audioUnreachable": "the song service cannot be reached",
		"watchLink": "Watch the finished video ↗",
		"warningTitle": "Photosensitivity warning",
		"warning": ["This film has flashing lights and fast cuts that can trigger seizures in people with photosensitive epilepsy.", "Watch in a well-lit room and keep some distance from the screen."],
		"warningHint": "The picture quality follows your device; you can also pick it yourself from the menu at the bottom right.",
		"warningHintIos": "iPhone / iPad: if you hear nothing, switch off the silent switch on the side.",
		"warningAgain": "Do not remind me again",
		"warningCancel": "Cancel",
		"warningConfirm": "I understand, play",
		"playPause": "Play / pause",
		"mute": "Mute",
		"seek": "Seek",
		"volume": "Volume",
		"fullscreen": "Full screen",
		"prerollName": "warning card",
		"quality": "Quality",
		"qualityAuto": "Auto",
		"quality4k": "Native 4K",
		"subtitles": "Subtitles",
		"subtitlesOff": "Off",
		"frameRate": "Frame rate",
		"frameRateAuto": "Auto",
		"stat": "Drawing {w}×{h} · target {fps} fps",
		"statMeasured": " · measured {fps} fps",
		"noticeWatchdog": "Playback was too slow; dropped to {height}p",
		"noticeSlow": "This quality is too slow for this device; pick a lower one",
		"noticeContextLost": "The graphics context was lost; reloading at a lower quality…",
		"noticeSubtitles": "Subtitles: {state}",
		"noticeQuality": "Quality: {name}",
		"bootFail": "The page did not load completely (a file failed to download)."
	},
	"zh-CN": {
		"loading": "正在加载…",
		"play": "播放",
		"replay": "重新播放",
		"retry": "重试",
		"resume": "从 {time} 继续",
		"compiling": "正在编译着色器 {percent}%",
		"loadingAudio": "正在加载音频…",
		"calibrating": "正在测试设备性能…",
		"ready": "准备就绪",
		"ended": "播放结束",
		"failed": "加载失败：{reason}。",
		"unsupported": "{reason}无法实时渲染这部片子{advice}",
		"unsupportedWatch": "，可以去 B 站看成片。",
		"unsupportedTip": "。请换用新版 Chrome、Edge、Safari 或 Firefox，或换一台设备。",
		"noWebgl2": "这个浏览器不支持 WebGL2，",
		"noFloatTargets": "这块显卡不支持浮点渲染（EXT_color_buffer_float），",
		"contextLostFinal": "显卡内存不足（图形上下文反复丢失），",
		"chaptersMissing": "有 {count} 个章节没有下载成功",
		"audioStatus": "音频 {status}",
		"audioUnreachable": "连不上音频服务",
		"watchLink": "在 B 站看成片 ↗",
		"warningTitle": "光敏警告",
		"warning": ["本视频包含强烈闪烁与快速切换的画面，可能诱发光敏性癫痫。请在光线充足的环境中观看，并与屏幕保持距离。", {
			"text": "This video contains flashing lights and rapid cuts that may trigger seizures in people with photosensitive epilepsy.",
			"lang": "en"
		}],
		"warningHint": "画质会按你的设备自动调整，也可以在播放时从右下角手动选择。",
		"warningHintIos": "iPhone / iPad：如果没有声音，请关闭侧边的静音开关。",
		"warningAgain": "下次不再提醒",
		"warningCancel": "取消",
		"warningConfirm": "我已了解，播放",
		"playPause": "播放/暂停",
		"mute": "静音",
		"seek": "进度",
		"volume": "音量",
		"fullscreen": "全屏",
		"prerollName": "warning",
		"quality": "画质",
		"qualityAuto": "自动",
		"quality4k": "原画 4K",
		"subtitles": "中文字幕",
		"subtitlesOff": "关",
		"frameRate": "帧率",
		"frameRateAuto": "自动",
		"stat": "渲染 {w}×{h} · 目标 {fps} fps",
		"statMeasured": " · 实测 {fps} fps",
		"noticeWatchdog": "画面太卡，已自动降到 {height}p",
		"noticeSlow": "当前画质下帧率不足，建议降低画质",
		"noticeContextLost": "图形上下文丢失，正在以更低画质重新加载…",
		"noticeSubtitles": "中文字幕：{state}",
		"noticeQuality": "画质：{name}",
		"bootFail": "页面没有加载完整（有文件下载失败）。"
	}
};
var web_config_default = {
	title,
	lang,
	description,
	credits,
	accent,
	systemFonts: true,
	site,
	origins,
	links,
	storagePrefix: "wem",
	poster: 86,
	cover,
	icon,
	audio,
	subs,
	text
};
//#endregion
export { accent, audio, cover, credits, web_config_default as default, description, icon, lang, links, origins, site, subs, text, title };
