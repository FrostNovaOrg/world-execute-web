# world.execute (me) ; — web player

**English** · [简体中文](README.zh-CN.md)

The web player for a fully code-generated music video of Mili's "world.execute (me) ;". Every frame is rendered live in the viewer's browser with WebGL2. The picture quality adapts to the device (it can also be set by hand, up to native 4K), and the Chinese subtitles can be turned on and off.

Watch it at https://execute.frostnova.org

## The song is not here

There is no song in this repository, and none in the page's code. On the live site the song is stored as encrypted parts; the key is issued only to the site's own domain, and the page decrypts the song in memory. Open these files anywhere else and the picture loads, but the audio reports a loading failure.

## Contents

| Path | Contents |
|---|---|
| `index.html`, `index.html.js` | Entry point |
| `src/` | Player and rendering code. Not minified, with the original module structure kept: the source and call stacks the film shows are these files |
| `_virtual/` | Build tool runtime (module preloading) |
| `vendor/three/` | Three.js |
| `web.config.json.js` | Player settings: interface text, subtitles, covers |
| `data/` | Beats, lyric timing and audio features (analysis results; no audio) |
| `assets/` | Fonts, subtitles, covers, icons and the player's styles |
| `og.jpg`, `favicon.ico` | Link preview image, tab icon |

## Credits and license

- Visuals — Claude Opus 5.5 Max; Music — Mili「world.execute (me) ;」.
- Code and pictures: Copyright (C) 2026 FrostNova, released under [AGPL-3.0-or-later](LICENSE).
- This is an unofficial fan-made music video. The song and its lyrics (including the official lyrics written as code and the official Chinese translation) belong to Mili and its rights holders and are not covered by the AGPL. The song's recording is not in this repository.
- The Claude logo is a trademark of Anthropic. Three.js: MIT. JetBrains Mono, Space Grotesk, Noto Sans SC: SIL OFL 1.1.

See [`NOTICE.md`](NOTICE.md) for what each item covers and where it comes from.
