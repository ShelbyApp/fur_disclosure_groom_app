export const projectUrl = 'https://zdpheikochvtjirgskuv.supabase.co';

export function browserConfig(env,version='1.1.0') {
  const key = (env.SUPABASE_PUBLISHABLE_KEY || '').trim();
  // The browser bundle is public. Reject secret and elevated keys before writing anything.
  if (key && !/^sb_publishable_[A-Za-z0-9_-]+$/.test(key)) {
    throw new Error('SUPABASE_PUBLISHABLE_KEY must contain an sb_publishable_ key from the project API Keys page.');
  }
  const mapsKey=(env.GOOGLE_MAPS_BROWSER_KEY||'').trim();
  if(mapsKey&&!/^AIza[A-Za-z0-9_-]{35}$/.test(mapsKey))throw new Error('GOOGLE_MAPS_BROWSER_KEY must be a Google browser API key.');
  const appVersion=version.split('.').slice(0,2).map(part=>part.padStart(2,'0')).join('.');
  return {url: projectUrl, publishableKey: key,googleMapsBrowserKey:mapsKey,appVersion};
}
