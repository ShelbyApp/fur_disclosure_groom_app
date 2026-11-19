const validRole = value => ['owner','groomer'].includes(value) ? value : null;

// This is product onboarding context, never a permission or authorization role.
export const accountRole = user => validRole(user?.user_metadata?.fd_account_role) || 'owner';
export function signupIntent(url, storage) {
  const requested=validRole(new URL(url).searchParams.get('role'));
  try {
    if(requested)storage.setItem('fd:signup-role',requested);
    return requested || validRole(storage.getItem('fd:signup-role')) || 'owner';
  } catch {return requested || 'owner';}
}
export function signupOptions(role, url) {
  const target=new URL(url);target.search='';target.hash='';
  return {emailRedirectTo:target.href,data:{fd_account_role:validRole(role)||'owner'}};
}
