# Pending database changes

These migrations have not been applied to the live database.

1. Apply `20261030_unique_fpp_number.sql` to prevent concurrent duplicate FPP numbers. If duplicates exist, review and resolve them first; no records are automatically renamed or deleted.
2. `20261030_restrict_fpp_access.sql` is a staged security migration. The app currently has no Supabase Auth login. Configure login and populate `fpp_members` with authorized user IDs before applying, otherwise existing anonymous cloud access will stop. Review other policies on the table as permissive policies combine with OR.

Print output now allows additional pages for long forms rather than clipping content.


## Corporate Gagaclo connection

`20261030_corporate_fpp_setup.sql` was applied to project `xtkjzqeqotewaggjfnzr` (Corporate / Gagaclo). It creates the FPP table with photos, a unique normalized number index, and RLS restricted to authenticated users whose verified email is in `fpp_allowed_emails`. The owner email was inserted separately through the dashboard; it is intentionally omitted from the repository. Do not apply the older `restrict_fpp_access` migration on top of this setup: it describes an alternative user-ID membership model.

Auth Site URL: `https://gagaclo-fpp.vercel.app`. The app signs in by email link. Only the public publishable key is bundled; no privileged secret is shipped to the browser.

Existing local FPP documents are copied to Corporate after an authorized login. Existing cloud records are skipped unless the local document is marked pending and newer. Migration failures retain browser data and display an error. A first real login is required to complete migration from each browser that contains local documents.
