// Where the Apple Music desktop app exists, what it is called there, and the URL
// schemes that reach it.
//
// The first scheme per OS is the one music.apple.com's own "Open in Music" button
// uses there (the scheme table behind its launchClient code): music:// on macOS,
// itms:// on Windows, where either the Apple Music app or iTunes answers it. On
// Windows music:// is kept as a second attempt for a manual retry, in case a PC
// has a handler for that one only.
const APPS = {
  mac: { appName: 'Music', schemes: ['music'] },
  win: { appName: 'Apple Music', schemes: ['itms', 'music'] },
};

export async function getPlatform() {
  const { os } = await chrome.runtime.getPlatformInfo();
  const app = APPS[os];
  return { os, hasApp: Boolean(app), appName: app?.appName ?? 'Apple Music', schemes: app?.schemes ?? [] };
}
