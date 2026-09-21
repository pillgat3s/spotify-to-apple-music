# Chrome Web Store listing

Everything the dashboard asks for, so a submission is copy-paste.

## Store listing

**Name:** Spotify → Apple Music

> The name comes from the manifest. It describes what the extension does and
> claims no affiliation, which is what the store's trademark rules ask for. If a
> reviewer objects anyway, the fallback is **Open Spotify Links in Apple Music**
> (change `name` in `manifest.json`, bump the version, re-package).

**Summary (132 max):**
Opens Spotify track, album and artist links in Apple Music instead — in the Music app or in the browser.

**Category:** Lifestyle → Entertainment

**Language:** English

**Description:**

Someone sends you a Spotify link. You use Apple Music. Click it anyway.

Spotify → Apple Music catches Spotify track, album and artist links before they load and opens the same music in Apple Music — straight in the Music app, or on music.apple.com if you prefer the browser.

• App or browser — one switch in the popup. In app mode the link goes to the Music app on your Mac, or the Apple Music app on your Windows PC.
• The exact song, not a lucky guess — every candidate is checked on title, artist and track length, so you get the studio version you were sent rather than the live cut, the remix or a karaoke cover. Albums are checked on title, artist and track count; same-named artists are told apart by their top tracks.
• No leftover tabs — once Music has opened, the tab closes itself. If the link opened in the tab you were already on, you are taken back to that page instead.
• Honest when it can't find it — if nothing on Apple Music is close enough, it opens an Apple Music search for the artist and title instead of guessing.
• Always a way out — every hand-off page has an "Open on Spotify instead" link, and the popup has an on/off switch.
• Leaves the rest alone — playlists, podcasts and the Spotify web player are not touched.
• Your storefront — pick the country your Apple Music account lives in, so links and availability match.
• Nothing to set up — no accounts, no API keys, no sign-in to Spotify or Apple.
• Private — no analytics, no tracking, no server of ours. Settings and the match cache stay in your browser.

The first time a link goes to the app, Chrome asks "Open Music?" ("Open Apple Music?" on Windows). Tick "Always allow" and it won't ask again. On Windows the app mode needs Apple Music from the Microsoft Store (or iTunes); on Linux and ChromeOS, where there is no app, links open in the browser.

Good to know: Chrome only lets an extension launch an app once until you next click or type somewhere in the browser. If you open several Spotify links in a row from another app, the second hand-off page asks for one click on "Open in Music".

Open source: https://github.com/pillgat3s/spotify-to-apple-music
More: https://pillgates.dev/spotify-to-apple-music

Not affiliated with, endorsed by or sponsored by Spotify AB or Apple Inc. Spotify is a trademark of Spotify AB. Apple Music is a trademark of Apple Inc.

## Privacy tab

**Single purpose:** Opening Spotify track, album and artist links in Apple Music instead of Spotify.

**Permission justifications:**

- *declarativeNetRequestWithHostAccess* — one redirect rule sends navigations to `open.spotify.com/{track,album,artist}/…` to the extension's own hand-off page, which looks up the Apple Music equivalent. A second, per-tab session rule lets a tab through when the user picks "Open on Spotify instead". No other requests are observed, blocked or modified.
- *storage* — saves the user's settings (on/off, app or browser, storefront, tab clean-up) and caches found matches locally so repeat links open instantly.
- *host permission: open.spotify.com* — required for the redirect rule above, and to read the public title, artist and length of the linked item from Spotify's embed page.
- *host permission: itunes.apple.com* — Apple's public iTunes Search/Lookup API, used to find the item in Apple's catalogue.
- *host permission: music.apple.com* — Apple Music's public search page, used as a second source of candidates when the iTunes Search API has no result.

If asked about `web_accessible_resources` with `<all_urls>`: Chrome checks a redirect to an extension page against the site the link was clicked on, and Spotify links are clicked on every site, so the hand-off page must be reachable from any origin. It refuses to run inside a frame and only acts on valid Spotify URLs.

**Remote code:** No, the extension does not use remote code. All logic ships in the package; the network responses it reads are data (HTML/JSON), never executed.

**Data usage:** Does not collect or transmit user data. Tick nothing in the data-type list, and certify all three disclosures.

**Privacy policy URL:** https://pillgates.dev/spotify-to-apple-music/privacy

## Distribution and links

- **Homepage URL:** https://pillgates.dev/spotify-to-apple-music
- **Support URL:** https://github.com/pillgat3s/spotify-to-apple-music/issues
- **Visibility:** Public, all regions, free. No in-app purchases (the donate link is a plain link to the website).

## Test instructions (for the reviewer)

No account or sign-in is needed.

1. Open the popup and choose **Browser** under "Open links in".
2. Visit `https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT`.
3. The extension's hand-off page appears briefly, then the tab lands on the same song on `music.apple.com`.
4. With the app selected instead, the hand-off page asks Chrome to open the same item in the desktop app: `music://…` on macOS, `itms://…` on Windows (needs the Apple Music app installed; Chrome shows its "Open …?" prompt). On Linux/ChromeOS the app option is disabled and links go to the browser.
5. A playlist link such as `https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M` is left alone by design.

## Assets (in this folder)

| File | Size | Use |
|---|---|---|
| `screenshot-1.png` … `screenshot-4.png` | 1280 × 800 | Screenshots |
| `promo-small.png` | 440 × 280 | Small promo tile |
| `promo-marquee.png` | 1400 × 560 | Marquee promo tile |
| `../icons/icon128.png` | 128 × 128 | Store icon |

Regenerate them with `store/render.sh` (headless Chrome; sources in `store/src/`). The hand-off card and the popup in the images are built from the extension's real HTML and CSS; the track and its cover art are invented, and no third-party logos appear.

## Package

`scripts/package.sh` → `dist/spotify-to-apple-music-<version>.zip`. Upload that zip.

## After the first publish

Swap the install instructions for the store link in `README.md` and on
<https://pillgates.dev/spotify-to-apple-music> (the "Get it on GitHub" button and
the "Load it unpacked" section).
