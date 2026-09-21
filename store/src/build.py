#!/usr/bin/env python3
"""Writes the HTML pages that store/render.sh screenshots.

The hand-off card and the popup are the extension's real redirect.html and
popup.html (with their real CSS), patched into a fixed state and shown in
iframes, so the store images cannot drift from the product. Only the track is
invented: the cover art is drawn here, and no third-party logos are used.
"""
import pathlib
import urllib.parse

ROOT = pathlib.Path(__file__).resolve().parents[2]
SRC = pathlib.Path(__file__).resolve().parent
ICON = "../../icons/icon128.png"  # relative to store/src/, where the pages are written

TRACK, ARTIST = "Midnight Drive", "Neon Harbor"

COVER_SVG = """<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 300 300'>
<defs>
<linearGradient id='sky' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stop-color='#1b1140'/><stop offset='.55' stop-color='#6d2a7a'/><stop offset='1' stop-color='#ff7a59'/></linearGradient>
<linearGradient id='sun' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stop-color='#ffd36b'/><stop offset='1' stop-color='#ff4f7b'/></linearGradient>
</defs>
<rect width='300' height='300' fill='url(#sky)'/>
<circle cx='150' cy='168' r='62' fill='url(#sun)'/>
<g fill='#1b1140'><rect x='80' y='176' width='140' height='5'/><rect x='80' y='190' width='140' height='7'/><rect x='80' y='206' width='140' height='9'/></g>
<rect y='222' width='300' height='78' fill='#140c2e'/>
<g stroke='#ff5fa2' stroke-width='1.5' opacity='.75'><path d='M0 240H300M0 262H300M0 290H300'/><path d='M150 222L150 300M110 222L60 300M190 222L240 300M70 222L-40 300M230 222L340 300'/></g>
</svg>"""
COVER = "data:image/svg+xml," + urllib.parse.quote(COVER_SVG)


def patch(html, pairs):
    for old, new in pairs:
        assert old in html, f"markup changed, update build.py: {old!r}"
        html = html.replace(old, new)
    return html


def force_dark(css):
    assert "@media (prefers-color-scheme: dark)" in css
    return css.replace("@media (prefers-color-scheme: dark)", "@media all")


def handoff():
    css = force_dark((ROOT / "redirect.css").read_text())
    return patch((ROOT / "redirect.html").read_text(), [
        ('<meta name="color-scheme" content="light dark" />', '<meta name="color-scheme" content="dark" />'),
        ('<link rel="stylesheet" href="redirect.css" />', f"<style>{css}</style>"),
        ('<script type="module" src="redirect.js"></script>', ""),
        ('data-state="loading"', 'data-state="found"'),
        ('<img id="artwork" alt="" hidden />', f'<img id="artwork" alt="" src="{COVER}" />'),
        ("Finding this on Apple Music…</h1>", f"{TRACK}</h1>"),
        ('<p id="subtitle" class="subtitle" hidden></p>', f'<p id="subtitle" class="subtitle">{ARTIST}</p>'),
        ('role="status"></p>', 'role="status">Opening in Music…</p>'),
        ('type="button" hidden>Open in Music', 'type="button">Open in Music'),
        ('<a id="open-web" class="button" hidden>', '<a id="open-web" class="button">'),
        ('type="button" hidden>Open on Spotify', 'type="button">Open on Spotify'),
    ])


def popup(open_in="app"):
    css = force_dark((ROOT / "popup.css").read_text())
    return patch((ROOT / "popup.html").read_text(), [
        ('<meta name="color-scheme" content="light dark" />', '<meta name="color-scheme" content="dark" />'),
        ('<link rel="stylesheet" href="popup.css" />', f"<style>{css} html,body{{overflow:hidden}}</style>"),
        ('<script type="module" src="popup.js"></script>', ""),
        ('src="icons/icon48.png"', f'src="{ICON}"'),
        ('id="enabled" />', 'id="enabled" checked />'),
        (f'value="{open_in}" />', f'value="{open_in}" checked />'),
        ('id="closeTab" />', 'id="closeTab" checked />'),
        ('<select id="country"></select>', '<select id="country"><option>United States</option></select>'),
    ])


BASE_CSS = """
html, body { margin: 0; overflow: hidden; background: #0a0a0b; color: #f2f2f2;
  font-family: -apple-system, "SF Pro Display", "Helvetica Neue", Inter, sans-serif; -webkit-font-smoothing: antialiased; }
.canvas { position: relative; overflow: hidden; }
.glow { position: absolute; border-radius: 50%; pointer-events: none; }
.glow.green { background: radial-gradient(circle, rgba(29,185,84,.17) 0%, rgba(29,185,84,0) 62%); }
.glow.red { background: radial-gradient(circle, rgba(250,45,72,.20) 0%, rgba(250,45,72,0) 62%); }
.brand { display: flex; align-items: center; gap: 12px; font-size: 20px; font-weight: 600; color: #9a9a9e; }
.brand img { width: 40px; height: 40px; }
h1 { font-weight: 800; letter-spacing: -0.03em; line-height: 1.04; margin: 0; }
h1 em { font-style: normal; background: linear-gradient(90deg, #1db954, #fa2d48); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
p.lead { color: #9a9a9e; line-height: 1.42; margin: 0; }
iframe { display: block; border: 0; }
.shadow { box-shadow: 0 40px 100px rgba(0,0,0,.7), 0 0 0 1px rgba(255,255,255,.08); }

/* A plain browser window around the hand-off page */
.window { border-radius: 14px; overflow: hidden; background: #161617; }
.chrome { background: #2a2a2d; padding: 10px 14px 0; }
.tabs { display: flex; align-items: flex-end; gap: 14px; }
.dots { display: flex; gap: 7px; padding-bottom: 11px; }
.dots i { width: 11px; height: 11px; border-radius: 50%; background: #4a4a4e; }
.tab { display: flex; align-items: center; gap: 8px; background: #3a3a3e; color: #e6e6e8; font-size: 12px;
  padding: 8px 14px; border-radius: 9px 9px 0 0; min-width: 150px; }
.tab img { width: 14px; height: 14px; }
.omni { background: #3a3a3e; padding: 7px 12px 8px; }
.omni span { display: block; background: #26262a; color: #a9a9ae; font-size: 12px; padding: 6px 12px; border-radius: 999px; }

/* The Spotify link someone sent you */
.bubble { background: #1d1d20; border: 1px solid rgba(255,255,255,.08); border-radius: 16px 16px 16px 4px; padding: 12px 16px; font-size: 15px; color: #d8d8dc; }
.bubble small { display: block; color: #77777c; font-size: 12px; margin-bottom: 4px; }
.bubble b { color: #1db954; font-weight: 500; text-decoration: underline; text-decoration-color: rgba(29,185,84,.4); }

ul.points { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 16px; }
ul.points li { display: flex; gap: 14px; font-size: 20px; color: #c9c9ce; line-height: 1.35; }
ul.points li::before { content: ""; flex: none; width: 8px; height: 8px; margin-top: 10px; border-radius: 50%; background: linear-gradient(135deg, #1db954, #fa2d48); }

.callout { position: absolute; background: #fa2d48; color: #fff; font-size: 15px; font-weight: 700;
  padding: 8px 14px; border-radius: 999px; box-shadow: 0 10px 30px rgba(0,0,0,.5); white-space: nowrap; }

/* Candidate list for the matching screenshot */
.cands { width: 560px; background: #161617; border-radius: 16px; padding: 10px; }
.cand { display: grid; grid-template-columns: 1fr auto; gap: 4px 16px; padding: 14px 16px; border-radius: 11px; color: #6f6f75; }
.cand .t { font-size: 17px; font-weight: 600; }
.cand .m { font-size: 13px; }
.cand .s { grid-row: 1 / 3; grid-column: 2; align-self: center; font-size: 13px; font-weight: 700; color: #55555a; }
.cand.win { background: rgba(250,45,72,.10); box-shadow: inset 0 0 0 1px rgba(250,45,72,.38); color: #b9b9be; }
.cand.win .t { color: #fff; }
.cand.win .s { color: #fff; background: #fa2d48; padding: 6px 12px; border-radius: 999px; }
.cand .no { color: #8a5a60; }
.source { display: flex; align-items: center; gap: 14px; background: #161617; border-radius: 14px; padding: 14px 18px; width: 560px; box-sizing: border-box; }
.source img { width: 52px; height: 52px; border-radius: 8px; }
.source .t { font-size: 17px; font-weight: 600; }
.source .m { font-size: 13px; color: #8d8d92; }
.source .tag { margin-left: auto; font-size: 12px; font-weight: 700; color: #1db954; border: 1px solid rgba(29,185,84,.4); padding: 4px 10px; border-radius: 999px; }

.cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 18px; }
.fcard { background: #141416; border: 1px solid rgba(255,255,255,.07); border-radius: 18px; padding: 28px; }
.fcard .n { font-size: 40px; font-weight: 800; letter-spacing: -0.03em; background: linear-gradient(90deg, #1db954, #fa2d48); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
.fcard .h { font-size: 20px; font-weight: 700; margin: 10px 0 8px; }
.fcard .d { font-size: 15px; color: #9a9a9e; line-height: 1.45; }
"""

BRAND = f'<div class="brand"><img src="{ICON}" alt="">Spotify → Apple Music</div>'


def window(width, height, tab=TRACK):
    return f'''<div class="window shadow" style="width:{width}px">
  <div class="chrome"><div class="tabs"><span class="dots"><i></i><i></i><i></i></span><div class="tab"><img src="{ICON}" alt="">{tab}</div></div></div>
  <div class="omni"><span>Spotify → Apple Music</span></div>
  <iframe src="mock-handoff.html" width="{width}" height="{height}"></iframe>
</div>'''


def page(w, h, body):
    return f'''<!doctype html><html><head><meta charset="utf-8"><style>{BASE_CSS}
.canvas {{ width: {w}px; height: {h}px; }}</style></head><body><div class="canvas">{body}</div></body></html>'''


PAGES = {
    # 1 — what it does
    "screenshot-1": page(1280, 800, f'''
<div class="glow green" style="width:760px;height:760px;left:-260px;top:-240px"></div>
<div class="glow red" style="width:900px;height:900px;right:-260px;top:-60px"></div>
<div style="position:absolute;left:84px;top:84px;width:520px">
  {BRAND}
  <h1 style="font-size:64px;margin-top:56px">Spotify links,<br>opened in <em>Apple&nbsp;Music</em>.</h1>
  <p class="lead" style="font-size:22px;margin-top:26px">Someone sends you a Spotify link. You use Apple Music. Click it anyway: the same song opens in the Music app.</p>
  <div class="bubble" style="margin-top:44px;width:400px"><small>Sam, 21:04</small>you need to hear this <b>open.spotify.com/track/4cOdK2w…</b></div>
</div>
<div style="position:absolute;right:84px;top:92px">{window(500, 540)}</div>'''),

    # 2 — the popup
    "screenshot-2": page(1280, 800, f'''
<div class="glow red" style="width:900px;height:900px;left:-300px;top:-200px"></div>
<div style="position:absolute;left:84px;top:84px;width:560px">
  {BRAND}
  <h1 style="font-size:60px;margin-top:56px">The app or the browser. <em>One switch.</em></h1>
  <ul class="points" style="margin-top:40px">
    <li>Open links straight in the Music app, or on music.apple.com.</li>
    <li>No leftover tabs: once Music has opened, the tab closes itself, or takes you back to the page you were on.</li>
    <li>Pick the storefront your Apple Music account lives in.</li>
  </ul>
</div>
<div style="position:absolute;right:170px;top:204px">
  <iframe class="shadow" src="mock-popup.html" width="300" height="314" style="border-radius:12px;transform:scale(1.25);transform-origin:top right"></iframe>
</div>
<div class="callout" style="right:96px;top:152px">Pause it any time</div>'''),

    # 3 — matching
    "screenshot-3": page(1280, 800, f'''
<div class="glow green" style="width:820px;height:820px;right:-240px;top:-260px"></div>
<div style="position:absolute;left:84px;top:84px;width:500px">
  {BRAND}
  <h1 style="font-size:60px;margin-top:88px">The exact song. <em>Not a lucky guess.</em></h1>
  <p class="lead" style="font-size:21px;margin-top:26px">Every candidate is checked on title, artist and track length, so you land on the studio version you were sent, not the live cut, the remix or the karaoke cover.</p>
  <p class="lead" style="font-size:21px;margin-top:20px">Nothing close enough? It searches Apple Music instead of guessing.</p>
</div>
<div style="position:absolute;right:84px;top:172px">
  <div class="source shadow"><img src="{COVER}" alt=""><div><div class="t">{TRACK}</div><div class="m">{ARTIST} · 3:34</div></div><span class="tag">Spotify link</span></div>
  <div style="text-align:center;color:#55555a;font-size:22px;margin:14px 0">↓</div>
  <div class="cands shadow">
    <div class="cand"><div class="t">{TRACK} (Live at the Pier)</div><div class="m">{ARTIST} · 5:12 · <span class="no">live version, wrong length</span></div><div class="s">41%</div></div>
    <div class="cand win"><div class="t">{TRACK}</div><div class="m">{ARTIST} · 3:34 · title, artist and length match</div><div class="s">Match</div></div>
    <div class="cand"><div class="t">{TRACK} (Karaoke Version)</div><div class="m">Sing-Along Stars · 3:34 · <span class="no">different artist</span></div><div class="s">22%</div></div>
    <div class="cand"><div class="t">{TRACK} (Club Remix)</div><div class="m">{ARTIST} · 6:03 · <span class="no">remix, wrong length</span></div><div class="s">38%</div></div>
  </div>
</div>'''),

    # 4 — private and simple
    "screenshot-4": page(1280, 800, f'''
<div class="glow green" style="width:760px;height:760px;left:-220px;bottom:-320px"></div>
<div class="glow red" style="width:820px;height:820px;right:-240px;top:-300px"></div>
<div style="position:absolute;left:84px;top:84px;right:84px">
  {BRAND}
  <h1 style="font-size:64px;margin-top:64px">Nothing to set up.<br><em>Nothing to give up.</em></h1>
  <p class="lead" style="font-size:22px;margin-top:24px;max-width:820px">Works the moment you install it, for track, album and artist links. Playlists, podcasts and the Spotify web player are left alone.</p>
  <div class="cards" style="margin-top:64px">
    <div class="fcard"><div class="n">0</div><div class="h">accounts or API keys</div><div class="d">No sign-in to Spotify, Apple or anything else. It only uses public catalogue data.</div></div>
    <div class="fcard"><div class="n">0</div><div class="h">tracking</div><div class="d">No analytics, no telemetry, no server of ours. Settings stay in your browser.</div></div>
    <div class="fcard"><div class="n">100%</div><div class="h">open source</div><div class="d">Read every line on GitHub: github.com/pillgat3s/spotify-to-apple-music</div></div>
  </div>
</div>'''),

    "promo-small": page(440, 280, f'''
<div class="glow green" style="width:420px;height:420px;left:-170px;top:-170px"></div>
<div class="glow red" style="width:480px;height:480px;right:-190px;bottom:-230px"></div>
<div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:0 30px">
  <img src="{ICON}" alt="" style="width:72px;height:72px">
  <h1 style="font-size:29px;margin-top:18px">Spotify → <em>Apple&nbsp;Music</em></h1>
  <p class="lead" style="font-size:15px;margin-top:10px">Open Spotify links in Apple Music</p>
</div>'''),

    "promo-marquee": page(1400, 560, f'''
<div class="glow green" style="width:820px;height:820px;left:-280px;top:-300px"></div>
<div class="glow red" style="width:900px;height:900px;right:-200px;top:-160px"></div>
<div style="position:absolute;left:96px;top:96px;width:640px">
  {BRAND}
  <h1 style="font-size:66px;margin-top:44px">Spotify links,<br>opened in <em>Apple&nbsp;Music</em>.</h1>
  <p class="lead" style="font-size:23px;margin-top:24px">In the Music app or the browser. No accounts, no tracking.</p>
</div>
<div style="position:absolute;right:120px;top:64px">{window(440, 520)}</div>'''),
}

(SRC / "mock-handoff.html").write_text(handoff())
(SRC / "mock-popup.html").write_text(popup())
for name, html in PAGES.items():
    (SRC / f"{name}.html").write_text(html)
print("wrote", ", ".join(sorted(PAGES)), "+ mocks")
