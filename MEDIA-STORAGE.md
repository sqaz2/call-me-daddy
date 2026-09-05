# Media storage plan

The public media paths are an API. Existing `/media/...` URLs must keep working through any storage migration.

Current audit: 166 files, roughly 570 MB. No individual file is above the 95 MB Git safety limit; the largest is the Funhouse Meltdown HD video at roughly 24 MB. The immediate problem is repository weight, not a single rejected file.

## Safe migration order

1. Create a private Cloudflare R2 bucket and bind it to the existing Worker.
2. Upload media using the exact key after `/media/`.
3. Change the Worker to read R2 first and fall back to the checked-in asset when an object is absent.
4. Verify range requests, `HEAD`, cache headers and every catalog URL in production.
5. Only after verification, replace migrated Git binaries with a small manifest. Keep the Worker route so public URLs never change.

Do not point catalog records directly at temporary R2 or signed URLs. Do not delete repository media in the same change that first introduces storage.

Run `node scripts/audit-media.mjs` for the summary, `--json` for the inventory, and `--check` in CI to reject future files too large for GitHub’s hard limit with a safety margin.

