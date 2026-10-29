# Pending database changes

These migrations have not been applied to the live database.

1. Apply `20261030_unique_fpp_number.sql` to prevent concurrent duplicate FPP numbers. If duplicates exist, review and resolve them first; no records are automatically renamed or deleted.
2. `20261030_restrict_fpp_access.sql` is a staged security migration. The app currently has no Supabase Auth login. Configure login and populate `fpp_members` with authorized user IDs before applying, otherwise existing anonymous cloud access will stop. Review other policies on the table as permissive policies combine with OR.

Print output now allows additional pages for long forms rather than clipping content.
