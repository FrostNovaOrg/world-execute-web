# world.execute (me) ; — 网页版

[English](README.md) · **简体中文**

Mili《world.execute (me) ;》全代码生成 MV 的网页播放器。每一帧都由观众的浏览器用 WebGL2 实时渲染，画质按设备自动调整（也可以手动选到原画 4K），可以开关中文字幕。

在线观看：https://execute.frostnova.org

## 歌曲不在这里

仓库里没有歌曲，网页代码里也没有。线上站点的歌曲是加密的分段，密钥只发给本站的域名，页面在内存里解密。所以在别处打开这些文件，画面能加载，音频会显示加载失败。

## 内容

| 路径 | 内容 |
|---|---|
| `index.html`、`index.html.js` | 入口 |
| `src/` | 播放器和渲染代码。没有压缩，保留原来的模块结构：片中显示的源码和调用栈就是这些文件 |
| `_virtual/` | 构建工具的运行时（模块预加载） |
| `vendor/three/` | Three.js |
| `web.config.json.js` | 播放器设置：界面文字、字幕、封面 |
| `data/` | 节拍、歌词时间、音频特征（分析结果，不含音频） |
| `assets/` | 字体、字幕、封面、图标、播放器样式 |
| `og.jpg`、`favicon.ico` | 分享预览图、标签页图标 |

## 署名与许可

- Visuals — Claude Opus 5.5 Max；Music — Mili「world.execute (me) ;」。
- 代码和画面：Copyright (C) 2026 FrostNova，按 [AGPL-3.0-or-later](LICENSE) 发布。
- 这是非官方的粉丝 MV。歌曲、歌词（含写成代码的官方歌词和官方中文翻译）的版权归 Mili 及其相关权利人所有，不在 AGPL 授权范围内；歌曲录音不包含在本仓库中。
- Claude 标志是 Anthropic 的商标。Three.js：MIT。JetBrains Mono、Space Grotesk、Noto Sans SC：SIL OFL 1.1。

各项内容的范围和出处见 [`NOTICE.zh-CN.md`](NOTICE.zh-CN.md)。
