# Privacy policy — Spotify → Apple Music

Spotify → Apple Music opens Spotify track, album and artist links in Apple
Music instead. That is all it does, and all its permissions are used for.

**Data collection: none.** The extension has no accounts, no analytics and no
telemetry. Nothing is ever sent to the developer or to any server the developer
runs — there is no such server.

**What it looks at.** Only the address of a Spotify track, album or artist link
at the moment you open one. It does not read your browsing history, the content
of any page, your Spotify or Apple accounts, cookies, or anything you type. The
rest of the Spotify site (playlists, podcasts, the web player) is left alone.

**The requests it makes.** To find the same music on Apple Music, the extension
makes these requests from your browser, without cookies or any identifier:

- to **Spotify** (`open.spotify.com`), for the public title, artist and length
  of the item in the link you opened;
- to **Apple** (`itunes.apple.com` and `music.apple.com`), to search its public
  catalogue for that title and artist.

Spotify and Apple see these requests the way they see any visit to their sites
(for example your IP address), under their own privacy policies. They receive
the name of a song, album or artist — nothing about you.

**What it stores, and where.** Your settings (on/off, app or browser, storefront
country, tab clean-up) and a cache of the matches it has found, so a repeat link
opens instantly. Both live only in your browser's local extension storage and
are deleted when you remove the extension.

**Permissions.**

- *declarativeNetRequestWithHostAccess* and access to `open.spotify.com` — to
  reroute Spotify track, album and artist links to the extension's hand-off
  page, and to read the item's public metadata.
- access to `itunes.apple.com` and `music.apple.com` — to look the item up in
  Apple's catalogue.
- *storage* — for the settings and cache described above.

**Not affiliated.** This is an independent project. It is not affiliated with,
endorsed by or sponsored by Spotify AB or Apple Inc.

**Contact.** Questions go to the project's GitHub issues:
<https://github.com/pillgat3s/spotify-to-apple-music/issues>, or to
<pillgates.dev@gmail.com>.
