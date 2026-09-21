import { getSettings } from './lib/settings.js';

const REDIRECT_RULE_ID = 1;
const BYPASS_RULE_ID = 2;

// Track, album and artist pages (optionally behind an /intl-xx/ prefix).
// Playlists, podcasts etc. have no Apple Music equivalent and are left alone.
const SPOTIFY_LINK = '^https?://open\\.spotify\\.com/(?:intl-[a-z-]+/)?(?:track|album|artist)/[a-z0-9]+(?:[/?].*)?$';

// Spotify links are rerouted before the request is ever made, to
// redirect.html#<original url>, which looks up the Apple Music equivalent.
async function syncRedirectRule() {
  const { enabled } = await getSettings();
  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: [REDIRECT_RULE_ID],
    addRules: enabled
      ? [
          {
            id: REDIRECT_RULE_ID,
            priority: 1,
            action: {
              type: 'redirect',
              redirect: { regexSubstitution: `${chrome.runtime.getURL('redirect.html')}#\\0` },
            },
            condition: { regexFilter: SPOTIFY_LINK, isUrlFilterCaseSensitive: false, resourceTypes: ['main_frame'] },
          },
        ]
      : [],
  });
  await chrome.action.setBadgeBackgroundColor({ color: '#6b7280' });
  await chrome.action.setBadgeText({ text: enabled ? '' : 'off' });
}

// "Open on Spotify anyway": a session rule that outranks the redirect for the
// tabs the user chose to keep on Spotify.
async function updateBypassTabs(change) {
  const [rule] = await chrome.declarativeNetRequest.getSessionRules({ ruleIds: [BYPASS_RULE_ID] });
  const before = rule?.condition.tabIds ?? [];
  const tabIds = new Set(before);
  change(tabIds);
  if (tabIds.size === before.length && before.every((id) => tabIds.has(id))) return;

  await chrome.declarativeNetRequest.updateSessionRules({
    removeRuleIds: [BYPASS_RULE_ID],
    addRules: tabIds.size
      ? [
          {
            id: BYPASS_RULE_ID,
            priority: 2,
            action: { type: 'allow' },
            condition: { urlFilter: '||open.spotify.com/', resourceTypes: ['main_frame'], tabIds: [...tabIds] },
          },
        ]
      : [],
  });
}

chrome.runtime.onInstalled.addListener(syncRedirectRule);
chrome.runtime.onStartup.addListener(syncRedirectRule);

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.enabled) syncRedirectRule();
});

chrome.tabs.onRemoved.addListener((tabId) => {
  updateBypassTabs((tabs) => tabs.delete(tabId));
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type !== 'open-on-spotify' || !sender.tab) return;
  let url;
  try {
    url = new URL(message.url);
  } catch {
    return;
  }
  if (url.hostname !== 'open.spotify.com') return;

  updateBypassTabs((tabs) => tabs.add(sender.tab.id))
    .then(() => chrome.tabs.update(sender.tab.id, { url: url.href }))
    .then(() => sendResponse({ ok: true }))
    .catch((error) => sendResponse({ ok: false, error: String(error) }));
  return true;
});
