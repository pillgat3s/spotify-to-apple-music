import { getPlatform } from './lib/platform.js';
import { STOREFRONTS, getSettings, saveSettings } from './lib/settings.js';

const $ = (id) => document.getElementById(id);
const openInRadios = [...document.querySelectorAll('input[name="openIn"]')];

function reflect(settings) {
  $('options').classList.toggle('disabled', !settings.enabled);
  // There is no leftover tab in browser mode: the tab becomes the Apple Music page.
  $('close-tab-row').classList.toggle('disabled', settings.openIn !== 'app');
}

const regionNames = new Intl.DisplayNames([navigator.language], { type: 'region' });
const storefronts = STOREFRONTS.map((code) => ({ code, name: regionNames.of(code.toUpperCase()) ?? code }));
storefronts.sort((a, b) => a.name.localeCompare(b.name));
$('country').append(...storefronts.map(({ code, name }) => new Option(name, code)));

const [settings, platform] = await Promise.all([getSettings(), getPlatform()]);

// "Music" on a Mac, "Apple Music" on Windows; nothing to hand off to elsewhere.
$('app-label').textContent = `${platform.appName} app`;
$('app-name').textContent = platform.appName;
$('no-app').hidden = platform.hasApp;
for (const radio of openInRadios) radio.disabled = !platform.hasApp;

$('enabled').checked = settings.enabled;
$('closeTab').checked = settings.closeTab;
$('country').value = settings.country;
for (const radio of openInRadios) radio.checked = radio.value === settings.openIn;
reflect(settings);

async function update(patch) {
  Object.assign(settings, patch);
  reflect(settings);
  await saveSettings(patch);
}

$('enabled').onchange = (e) => update({ enabled: e.target.checked });
$('closeTab').onchange = (e) => update({ closeTab: e.target.checked });
$('country').onchange = (e) => update({ country: e.target.value });
for (const radio of openInRadios) radio.onchange = () => update({ openIn: radio.value });
