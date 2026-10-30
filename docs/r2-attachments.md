# FPP attachment storage

Production uses the private `fpp-corporate-attachments` bucket. Configure `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, and `R2_BUCKET_NAME` as server-only Vercel Production secrets. The token requires Object Read & Write on this bucket only. No public bucket or CORS policy is required because uploads and reads go through the application server.

New photos are compressed to JPEG and uploaded through `/api/attachments`. The database stores a relative application URL; existing base64 photos remain compatible. The existing edit password now also creates an eight-hour HttpOnly upload session, and locking edit mode clears it. `FPP_EDIT_PASSWORD` optionally supplies the existing password from server configuration; otherwise the existing application password remains in use. This shared edit password does not implement per-user access control.

Reads use a signed bearer URL: anyone who has the attachment URL can view that photo, consistent with the current shared FPP viewer. Do not use this as per-user corporate authorization. The bucket itself remains private. Rotating the R2 secret invalidates attachment signatures and edit sessions; existing photo URLs then need to be re-signed before removing the old key.

The app currently supports photo attachments (six per printed A4 document), not arbitrary PDF/Office files. Each compressed upload is limited to 3.9 MB. Storage failure displays an error and does not insert a broken photo reference. Removing a photo from a document retains its R2 object to avoid breaking saved documents; orphan cleanup is a separate maintenance operation. No existing photos are migrated automatically.

When R2 is absent, the application retains the existing base64 storage path for local development. Production R2 secrets must be present before deploying. Run `npm run build` and `node --test tests/*.cjs` before deploying.
