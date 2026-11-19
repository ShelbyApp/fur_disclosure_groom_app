# Groomer profile entry

**Route** `#/groomer-home`

For authenticated users whose signup metadata has `fd_account_role=groomer`. Collect display name and optional phone, city and state before this screen. Store these contact fields in the existing account contact table (`fd_owner_profiles`); do not create or claim a directory business from a role flag.

Greet the user, confirm their profile is saved and show the planned intake/shared-plan tools with a clear Coming soon status. Provide Edit my profile and Sign out. A separate My dogs & groom plans link opens the existing owner features for groomers with pets. Owners arriving directly here return to their normal profile. No client queue, appointments or business verification is implied.

[Screen index](README.md) · [Create account](34-create-account.md)
