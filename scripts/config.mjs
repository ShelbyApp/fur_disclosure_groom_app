export const projectUrl = 'https://zdpheikochvtjirgskuv.supabase.co';

export function browserConfig(env) {
  const key = (env.SUPABASE_PUBLISHABLE_KEY || '').trim();
  // The browser bundle is public. Reject secret and elevated keys before writing anything.
  if (key && !/^sb_publishable_[A-Za-z0-9_-]+$/.test(key)) {
    throw new Error('SUPABASE_PUBLISHABLE_KEY must contain an sb_publishable_ key from the project API Keys page.');
  }
  return {url: projectUrl, publishableKey: key};
}
