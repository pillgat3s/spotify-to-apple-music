// Apple Music storefronts (ISO 3166-1 alpha-2, lowercase).
export const STOREFRONTS = (
  'ae ag ai am ao ar at au az ba bb be bg bh bj bm bo br bs bt bw by bz ca cd cg ch ci cl cm cn co cr cv cy cz ' +
  'de dk dm do dz ec ee eg es fi fj fm fr ga gb gd ge gh gm gr gt gw gy hk hn hr hu id ie il in iq is it jm jo jp ' +
  'ke kg kh kn kr kw ky kz la lb lc li lk lr lt lu lv ly ma md me mg mk ml mm mn mo mr ms mt mu mv mw mx my mz ' +
  'na ne ng ni nl no np nz om pa pe pg ph pl pt py qa ro rs ru rw sa sb sc se sg si sk sl sn sr sv sz tc td th tj ' +
  'tm tn to tr tt tw tz ua ug us uy uz vc ve vg vn vu xk ye za zm zw'
).split(' ');

function guessCountry() {
  const region = (globalThis.navigator?.language ?? '').split('-')[1]?.toLowerCase();
  return STOREFRONTS.includes(region) ? region : 'us';
}

export const DEFAULTS = {
  enabled: true,
  openIn: 'app', // 'app' | 'browser'
  closeTab: true, // tidy up the leftover tab after handing off to the Music app
  country: guessCountry(),
};

export async function getSettings() {
  return { ...DEFAULTS, ...(await chrome.storage.local.get(Object.keys(DEFAULTS))) };
}

export function saveSettings(patch) {
  return chrome.storage.local.set(patch);
}
