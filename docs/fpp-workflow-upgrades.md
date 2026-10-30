# FPP workflow upgrades

The screen editor hides print filler rows and uses a compact attachment panel. Printing retains the established A4 layout and minimum three item rows. PDFs are listed as supplementary documents; users open or print the PDF separately.

Qty and unit inputs share the existing Banyaknya column. They persist as `qty`, `satuan`, and the backwards-compatible combined `banyaknya` value; the printed document displays the combined value. Existing combined quantities are parsed on edit.

Drafts save locally after 500 ms, on page hide, and before moving to another document. Up to 30 drafts are retained per signed-in user. The sidebar lists drafts. A successful explicit save clears that document's draft; local saves remain marked pending until confirmed by Supabase. Autosave does not submit a form to the shared database. Admins retain access to previous legacy browser drafts and cached records without deleting the originals.

Duplication creates new document and item identifiers, resets approvals and received fields, assigns the next number and today's Jakarta date, and retains item/attachment content. It requires explicit save. Save validation identifies missing required fields and invalid quantities inline. A database unique index additionally protects document numbers against concurrent duplicate saves.

The attachment panel supports JPEG-compressed photos and PDF files up to 3.9 MB, six attachments per FPP, upload progress, preview, captions, and ordering. Removing a reference does not delete the underlying R2 object because duplicated/older documents may share it.

Apply `supabase/migrations/20261030_fpp_roles_and_history.sql` after deploying the app. The migration preserves previously allowed emails as editors and configures ryanpurwabara@gmail.com as admin. No passwords or users are created by the migration. Existing documents are preserved. After activation users sign in with a Supabase email magic link. Login redirects already point to https://gagaclo-fpp.vercel.app.

Roles are enforced by database RLS and the server attachment endpoints. Viewers read and print; editors also create and update; admins additionally manage membership and delete FPPs. Direct history writes are denied to users. Database triggers record actor, timestamp and before/after snapshots beginning at activation. The last admin cannot be downgraded or removed. Existing signed attachment links also require membership after activation. The old shared edit password cannot bypass the new role checks.

Validation: production build; 12 Node regression tests; local UI tests for validation, decimal quantities/calculation, and draft restoration. The rollback-only SQL verification in the task workspace checks editor writes, audit immutability, viewer read-only access, denial to anonymous requests, and last-admin protection without leaving test records.
