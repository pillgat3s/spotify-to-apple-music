import { getPlatform } from './lib/platform.js';
import { getSettings } from './lib/settings.js';
import { parseSpotifyUrl, resolveCached, searchUrl, toAppUrl } from './lib/resolver.js';

// If the window never loses focus after a launch, Chrome most likely swallowed
// it: it refuses to start a second app launch until the user has clicked or
// typed somewhere in the browser.
const STALL_MS = 2500;
// How long the page must have been out of focus before it counts as "the user
// went to Music and came back" rather than focus briefly bouncing.
const MIN_AWAY_MS = 1500;

const $ = (id) => document.getElementById(id);
const spotify = parseSpotifyUrl(location.hash.slice(1));

let settings;
let platform;
let handoff = null; // the app launch in flight: { at, blurredAt, confirmed }
let tidied = false;

function render({ state, title, subtitle = '', status = '', artwork = null, target = null, retry = false }) {
  $('card').dataset.state = state;
  $('title').textContent = title;
  $('subtitle').textContent = subtitle;
  $('subtitle').hidden = !subtitle;
  $('status').textContent = status;
  $('artwork').hidden = !artwork;
  if (artwork) $('artwork').src = artwork;

  // The Music app shows an empty page for search links, so a search only ever
  // gets the browser button — as does a system without the app.
  const appUrls = target?.appUrls ?? [];
  $('open-app').hidden = !appUrls.length;
  $('open-web').hidden = !target;
  if (target) {
    // A manual retry walks through the OS's schemes (see platform.js), starting
    // with the one the automatic attempt used: that attempt most often stalls
    // because Chrome wanted a click, not because the scheme was wrong.
    let clicks = 0;
    $('open-app').textContent = `Open in ${platform.appName}`;
    $('open-app').onclick = () => launchApp(appUrls[clicks++ % appUrls.length]);
    $('open-web').textContent = appUrls.length ? 'Open in browser' : 'Search Apple Music';
    $('open-web').href = target.webUrl;
  }
  $('retry').hidden = !retry;
  $('open-spotify').hidden = !spotify;
  document.title = title;
}

function launchApp(appUrl) {
  const attempt = (handoff = { at: performance.now(), blurredAt: null, confirmed: false });
  $('status').textContent = `Opening in ${platform.appName}…`;
  location.href = appUrl;
  setTimeout(() => {
    if (handoff !== attempt || attempt.confirmed) return;
    const hint = `Didn’t open? Click “Open in ${platform.appName}” — Chrome sometimes needs a click before it will launch an app.`;
    // Unlike on a Mac, the app is an optional install on Windows.
    const noApp = ' If the Apple Music app isn’t installed, use “Open in browser” and pick Browser in the extension’s popup.';
    $('status').textContent = platform.os === 'win' ? hint + noApp : hint;
  }, STALL_MS);
}

// Once the app has taken over, the tab has done its job: go back to the page
// the link was clicked on, or close the tab if it was opened just for the link.
async function tidyUp() {
  if (tidied || !settings.closeTab) return;
  tidied = true;
  if (history.length > 1) {
    history.back();
  } else {
    const tab = await chrome.tabs.getCurrent();
    if (tab) chrome.tabs.remove(tab.id);
  }
}

window.addEventListener('blur', () => {
  if (!handoff) return;
  const now = performance.now();
  if (now - handoff.at <= STALL_MS) handoff.confirmed = true;
  if (handoff.confirmed) handoff.blurredAt ??= now;
});

window.addEventListener('focus', () => {
  if (!handoff?.confirmed || handoff.blurredAt === null) return;
  if (performance.now() - handoff.blurredAt >= MIN_AWAY_MS) tidyUp();
  else handoff.blurredAt = null;
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden && handoff?.confirmed && performance.now() - handoff.at >= MIN_AWAY_MS) tidyUp();
});

window.addEventListener('pageshow', (event) => {
  if (!event.persisted) return;
  handoff = null;
  tidied = false;
});

function whenVisible(run) {
  if (!document.hidden) return run();
  document.addEventListener('visibilitychange', function onChange() {
    if (document.hidden) return;
    document.removeEventListener('visibilitychange', onChange);
    run();
  });
}

function describeError(error) {
  if (/ 4(03|29)$/.test(error.message)) return 'Apple’s lookup service is rate-limiting requests. Give it a minute and try again.';
  if (error instanceof TypeError) return 'Couldn’t reach the network.';
  return error.message;
}

async function main() {
  // Chrome checks web_accessible_resources against the site a link was clicked
  // on, so this page has to be reachable from every origin. It only ever acts as
  // a top-level page though: embedded in someone's frame it does nothing.
  if (window.top !== window) return;

  if (!spotify) {
    render({ state: 'error', title: 'Nothing to open', status: 'This page only works when it is reached through a Spotify link.' });
    return;
  }

  [settings, platform] = await Promise.all([getSettings(), getPlatform()]);
  render({ state: 'loading', title: 'Finding this on Apple Music…' });

  let resolved;
  try {
    resolved = await resolveCached(spotify, settings.country);
  } catch (error) {
    render({ state: 'error', title: 'Couldn’t look this up', status: describeError(error), retry: true });
    return;
  }

  const { match, query } = resolved;
  const target = match
    ? { webUrl: match.url, appUrls: platform.schemes.map((scheme) => toAppUrl(match.url, scheme)) }
    : { webUrl: searchUrl(query, settings.country), appUrls: [] };

  render(
    match
      ? { state: 'found', title: match.name, subtitle: match.artist ?? 'Artist', artwork: match.artwork, target }
      : { state: 'notfound', title: 'No exact match on Apple Music', subtitle: `Searching for “${query}” instead`, target },
  );

  // Coming back to this page through the history shouldn't fire the app again.
  const [navigation] = performance.getEntriesByType('navigation');
  if (navigation?.type === 'back_forward') return;

  if (settings.openIn === 'browser' || !target.appUrls.length) location.replace(target.webUrl);
  else whenVisible(() => launchApp(target.appUrls[0]));
}

$('retry').onclick = () => location.reload();
$('open-spotify').onclick = () => chrome.runtime.sendMessage({ type: 'open-on-spotify', url: spotify.url });

main();
