# Create an account

**Route** `#/create-account`

Match the login page: same header, spacing, yellow hero dog image, email field and password field. Add confirm password directly below password, then an “I’m here as a” owner/groomer selector and Create account. Put Already have an account? Log in below the form. No guest action.

Landing links use `?role=owner|groomer&source=landing-onboarding#/create-account`. Validate the role and remember the pending choice in this tab. Save the chosen value in Supabase user metadata as `fd_account_role` during signup; it survives email confirmation, another device and later sign-ins. Confirmation returns to the existing allowed app root. This metadata is product context, not an authorization claim. Existing users without this field remain owners; an incoming link must never overwrite an authenticated user’s role. Sign-out clears pending intent.

Owner signup collects contact details, then adds a first dog. Groomer signup collects the same contact fields, then opens groomer-home, without prompting for a dog. New groomer tools are explicitly forthcoming. No changes to the shared Supabase email provider or other applications’ roles.

[Screen index](README.md) · [Account setup](../SUPABASE.md)
