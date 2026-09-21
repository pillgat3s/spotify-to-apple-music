// Finds the Apple Music equivalent of a Spotify track, album or artist.
//
// There is no official cross-service lookup, so this reads the metadata Spotify
// ships with its embed player and matches it against the iTunes Search API.

const CACHE_PREFIX = 'match:';
const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const CACHE_MAX_ENTRIES = 300;

export function parseSpotifyUrl(raw) {
  let url;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (url.hostname !== 'open.spotify.com') return null;
  const m = url.pathname.match(/^\/(?:intl-[a-z-]+\/)?(track|album|artist)\/([A-Za-z0-9]+)/i);
  return m ? { type: m[1].toLowerCase(), id: m[2], url: url.href } : null;
}

// Same recipe as the "Open in Music" button on music.apple.com (its launchClient
// code): the web URL plus app=music, under the app's URL scheme for this OS
// (see platform.js).
export function toAppUrl(webUrl, scheme = 'music') {
  const { pathname, search } = new URL(webUrl);
  return `${scheme}://music.apple.com${pathname}${search}${search ? '&' : '?'}app=music`;
}

export function searchUrl(term, country) {
  return `https://music.apple.com/${country}/search?term=${encodeURIComponent(term)}`;
}

// ---------------------------------------------------------------------------
// Spotify side

async function fetchSpotifyEntity(type, id) {
  const res = await fetch(`https://open.spotify.com/embed/${type}/${id}`, { credentials: 'omit' });
  if (!res.ok) throw new Error(`Spotify responded with ${res.status}`);
  const html = await res.text();
  const json = html.match(/<script id="__NEXT_DATA__"[^>]*>(.*?)<\/script>/s)?.[1];
  const entity = json && JSON.parse(json)?.props?.pageProps?.state?.data?.entity;
  if (!entity?.name) throw new Error('Could not read the Spotify metadata');
  return entity;
}

// ---------------------------------------------------------------------------
// Apple side

async function itunesSearch(term, entity, country) {
  const params = new URLSearchParams({ term, entity, country, media: 'music', limit: '25' });
  const res = await fetch(`https://itunes.apple.com/search?${params}`, { credentials: 'omit' });
  if (!res.ok) throw new Error(`Apple responded with ${res.status}`);
  return (await res.json()).results ?? [];
}

// Looks up ids directly, or with `entity` lists an artist's songs/albums or an
// album's songs.
async function itunesLookup(id, country, entity) {
  const params = new URLSearchParams({ id, country, limit: '200', ...(entity && { entity }) });
  const res = await fetch(`https://itunes.apple.com/lookup?${params}`, { credentials: 'omit' });
  if (!res.ok) throw new Error(`Apple responded with ${res.status}`);
  return (await res.json()).results ?? [];
}

// The iTunes text search has blind spots (new releases, smaller artists) that
// Apple Music's own search doesn't. This takes the ids of that search's results
// and runs them through the lookup API, so they come back with full metadata
// and are scored like any other candidate. Best effort: it reads the data the
// web player embeds in its search page, which may change shape without notice.
async function appleMusicSearch(term, kind, country) {
  try {
    const res = await fetch(searchUrl(term, country), { credentials: 'omit' });
    if (!res.ok) return [];
    const pattern = new RegExp(`"kind":"${kind}","identifiers":\\{"storeAdamID":"(\\d+)"`, 'g');
    const ids = [...new Set([...(await res.text()).matchAll(pattern)].map((m) => m[1]))].slice(0, 10);
    return ids.length ? await itunesLookup(ids.join(','), country) : [];
  } catch {
    return [];
  }
}

function cleanAppleUrl(raw) {
  const url = new URL(raw);
  url.searchParams.delete('uo');
  return url.href;
}

const artwork = (r) => r.artworkUrl100?.replace('100x100bb', '300x300bb') ?? null;

// ---------------------------------------------------------------------------
// Matching

const VERSION_WORDS = ['live', 'remix', 'acoustic', 'instrumental', 'karaoke', 'demo', 'cover', 'tribute', 'sped up', 'slowed'];

export function normalize(s) {
  return (s ?? '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .replace(/&/g, ' and ')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

// "Song - Remastered 2011" / "Song (feat. X) [Live]" -> "Song"
function stripExtras(s) {
  return (s ?? '').replace(/\s*[([][^)\]]*[)\]]/g, '').replace(/\s+-\s+.*$/, '').trim();
}

const core = (s) => normalize(stripExtras(s)) || normalize(s);
const hasWord = (haystack, needle) => ` ${haystack} `.includes(` ${needle} `);

export function titleScore(a, b) {
  const na = normalize(a);
  const nb = normalize(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;

  let score;
  if (core(a) === core(b)) score = 0.75;
  else if (hasWord(na, nb) || hasWord(nb, na)) score = 0.5;
  else {
    const ta = new Set(na.split(' '));
    const tb = new Set(nb.split(' '));
    const shared = [...ta].filter((t) => tb.has(t)).length;
    score = (shared / (ta.size + tb.size - shared)) * 0.5;
  }
  // A live cut is not a match for the studio version, and so on.
  if (VERSION_WORDS.some((w) => hasWord(na, w) !== hasWord(nb, w))) score -= 0.3;
  return Math.max(score, 0);
}

export function artistScore(spotifyArtists, appleArtist) {
  const apple = normalize(appleArtist);
  if (!apple) return 0;
  const names = spotifyArtists.map(normalize).filter(Boolean);
  const matches = (n) => n === apple || hasWord(apple, n) || hasWord(n, apple);
  if (names.length && matches(names[0])) return 1;
  return names.slice(1).some(matches) ? 0.7 : 0;
}

function durationScore(a, b) {
  if (!a || !b) return 0;
  const diff = Math.abs(a - b);
  if (diff <= 1500) return 1;
  if (diff <= 4000) return 0.7;
  if (diff <= 10000) return 0.3;
  return diff > 30000 ? -0.5 : 0;
}

function pickBest(candidates, score, accept) {
  let best = null;
  for (const c of candidates) {
    const s = score(c);
    if (accept(s) && (!best || s.total > best.s.total)) best = { c, s };
  }
  return best?.c ?? null;
}

// Tries the full title first, then the title without "(feat. …)" / "- Remastered" noise.
async function searchWithFallback(artist, title, entity, country, pick) {
  const terms = [...new Set([`${artist} ${title}`, `${artist} ${stripExtras(title)}`])];
  for (const term of terms) {
    const hit = pick(await itunesSearch(term.trim(), entity, country));
    if (hit) return hit;
  }
  return null;
}

// Last line of defence: go through the artist's own discography listing, which
// is complete (up to 200 entries) even where the search index isn't.
// "Tyler, The Creator" is one artist, "Drake, 21 Savage" is two: `names` lists
// the spellings to try, in order.
async function fromDiscography(names, entity, country, pick) {
  let found = [];
  for (const name of [...new Set(names)]) {
    found = await findArtists(name, country);
    if (found.length) break;
  }
  for (const artist of found.slice(0, 2)) {
    const hit = pick(await itunesLookup(artist.artistId, country, entity));
    if (hit) return hit;
  }
  return null;
}

async function matchTrack(entity, country) {
  const artists = (entity.artists ?? []).map((a) => a.name);
  const primary = artists[0] ?? '';
  const explicit = entity.isExplicit ? 'explicit' : 'notExplicit';

  const pick = (results) =>
    pickBest(
      results.filter((r) => r.trackViewUrl),
      (r) => {
        const title = titleScore(entity.name, r.trackName);
        const artist = artistScore(artists, r.artistName);
        const duration = durationScore(entity.duration, r.trackTimeMillis);
        const tiebreak = r.trackExplicitness === explicit ? 0.03 : 0;
        return { title, artist, duration, total: title * 0.45 + artist * 0.35 + duration * 0.2 + tiebreak };
      },
      // Artist names sometimes differ between services (transliterations, aliases);
      // without an artist match, only an exact title at the exact length will do.
      (s) => s.title >= 0.5 && s.total >= 0.6 && (s.artist > 0 || (s.title === 1 && s.duration === 1)),
    );

  const hit =
    (await searchWithFallback(primary, entity.name, 'song', country, pick)) ??
    pick(await appleMusicSearch(`${primary} ${entity.name}`, 'song', country)) ??
    (await fromDiscography([primary], 'song', country, pick));
  return hit && { url: cleanAppleUrl(hit.trackViewUrl), name: hit.trackName, artist: hit.artistName, artwork: artwork(hit) };
}

async function matchAlbum(entity, country) {
  const byline = entity.subtitle ?? '';
  const artists = [byline, ...byline.split(', ')];
  const trackCount = entity.trackList?.length ?? 0;

  const pick = (results) =>
    pickBest(
      results.filter((r) => r.collectionViewUrl && r.collectionName),
      (r) => {
        const title = titleScore(entity.name, r.collectionName.replace(/\s+-\s+(single|ep)$/i, ''));
        const artist = artistScore(artists, r.artistName);
        const diff = Math.abs(trackCount - r.trackCount);
        const tracks = !trackCount ? 0 : diff === 0 ? 1 : diff <= 2 ? 0.5 : 0;
        return { title, artist, total: title * 0.5 + artist * 0.35 + tracks * 0.15 };
      },
      (s) => s.title >= 0.5 && s.artist > 0 && s.total >= 0.6,
    );

  const hit =
    (await searchWithFallback(byline, entity.name, 'album', country, pick)) ??
    pick(await appleMusicSearch(`${byline} ${entity.name}`, 'album', country)) ??
    (await fromDiscography(artists, 'album', country, pick));
  return hit && { url: cleanAppleUrl(hit.collectionViewUrl), name: hit.collectionName, artist: hit.artistName, artwork: artwork(hit) };
}

// Apple Music artists whose name is exactly `name`.
async function findArtists(name, country) {
  const wanted = normalize(name);
  if (!wanted) return [];
  return (await itunesSearch(name, 'musicArtist', country)).filter(
    (r) => r.artistLinkUrl && normalize(r.artistName) === wanted,
  );
}

async function matchArtist(entity, country) {
  const name = normalize(entity.name);
  const sameName = await findArtists(entity.name, country);
  const result = (r) => ({ url: cleanAppleUrl(r.artistLinkUrl), name: r.artistName, artist: null, artwork: null });
  if (sameName.length === 1) return result(sameName[0]);

  // Several artists share the name (or the artist search missed): identify the
  // right one through one of their top tracks.
  const topTrack = entity.trackList?.[0]?.title;
  if (topTrack) {
    const isTheirs = (r) => r.artistViewUrl && normalize(r.artistName) === name && titleScore(topTrack, r.trackName) >= 0.75;
    const term = `${entity.name} ${topTrack}`;
    const song =
      (await itunesSearch(term, 'song', country)).find(isTheirs) ??
      (await appleMusicSearch(term, 'song', country)).find(isTheirs);
    if (song) return { url: cleanAppleUrl(song.artistViewUrl), name: song.artistName, artist: null, artwork: null };
  }
  if (sameName.length) return result(sameName[0]);

  const listed = (await appleMusicSearch(entity.name, 'artist', country)).find(
    (r) => r.artistLinkUrl && normalize(r.artistName) === name,
  );
  return listed ? result(listed) : null;
}

const MATCHERS = { track: matchTrack, album: matchAlbum, artist: matchArtist };

// Resolves to { match, query }: `match` is null when Apple Music has no good
// equivalent, `query` is a human-readable search term for that case.
export async function resolve({ type, id }, country) {
  const entity = await fetchSpotifyEntity(type, id);
  const byline = type === 'track' ? entity.artists?.[0]?.name : type === 'album' ? entity.subtitle : '';
  const query = [byline, entity.name].filter(Boolean).join(' ');
  return { match: await MATCHERS[type](entity, country), query };
}

// ---------------------------------------------------------------------------
// Cache (chrome.storage.local), so repeat links open instantly and we stay well
// inside the iTunes Search API's rate limit.

async function pruneCache() {
  const all = await chrome.storage.local.get(null);
  const entries = Object.entries(all).filter(([k]) => k.startsWith(CACHE_PREFIX));
  if (entries.length <= CACHE_MAX_ENTRIES) return;
  entries.sort(([, a], [, b]) => a.ts - b.ts);
  await chrome.storage.local.remove(entries.slice(0, entries.length - CACHE_MAX_ENTRIES + 50).map(([k]) => k));
}

export async function resolveCached(parsed, country) {
  const key = `${CACHE_PREFIX}${country}:${parsed.type}:${parsed.id}`;
  const cached = (await chrome.storage.local.get(key))[key];
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) return { match: cached.match, query: cached.query };

  const resolved = await resolve(parsed, country);
  if (resolved.match) {
    await chrome.storage.local.set({ [key]: { ...resolved, ts: Date.now() } });
    pruneCache().catch(() => {});
  }
  return resolved;
}
