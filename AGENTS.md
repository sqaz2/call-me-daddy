# Agent instructions — MusicSubject × Call Me Daddy

These instructions apply to the whole repository. Read `ADDING-SONGS.md` before changing music, artwork, release pages, the catalog, the homepage, or the public update feed.

## The release contract

A music upload is not complete when the file is merely in GitHub. The agent owns the entire listener-facing release cycle:

1. Confirm which audio is final and whether it is a new song, a new version of an existing song, or an archive item. Never turn alternate filenames into duplicate song identities.
2. Put audio, artwork, and video in the dated `media/` structure. Use clean, stable filenames. Keep special-project assets with their project.
3. Inspect embedded media metadata. Remove unrelated source/tool metadata. When tags are being written, use the approved song title and credit (`MusicSubject`, `Call Me Daddy`, or `MusicSubject × Call Me Daddy` as supplied) and `callmedaddy.musicsubject.com`; never invent credits, dates, or backstory.
4. Give a new song one manifest in `content/releases/`, based on `content/releases/_template.json`. Do not create another dated `data/YYYY-MM-DD-uploads.js` patch.
5. Give the song a real listener route. A dedicated release page must have accurate canonical/Open Graph data, the reusable share controls, artwork-first playback, and continuous handoff into the site radio. Do not expose a generic native audio bar when the custom player can control it.
6. Run `node scripts/sync-releases.mjs`. This one command must put the release into the catalog, homepage briefing and release grid, Updates feed, intention radio, static shareable update page, and sitemap.
7. Run `node scripts/sync-releases.mjs --check`, all JavaScript syntax checks, and the complete test suite. Fix failures; never delete or weaken a test just to publish.
8. When publishing is authorized, commit and push the exact checked state, then verify the GitHub Site checks and the live Cloudflare deployment. Do not report the release finished while validation is failing.

## Non-negotiable behavior

- `content/releases/*.json` is the source of truth for new releases. Files between `RELEASE-MANIFEST:*` markers are generated; change the manifest and rerun the sync tool instead of hand-editing those blocks.
- New releases default to `featured: true`. That is what makes the homepage see them. The homepage sorts featured music by publication date, then uses generated order only as a tie-breaker.
- Use `America/Edmonton` for public timestamps.
- Every public update needs a stable `/updates/UPDATE_ID/` URL. Every local song route and media path must exist before publishing.
- Every catalog identity needs six intention scores: `surprise`, `laugh`, `think`, `level-up`, `heavy`, and `old-files`.
- Keep variants and aliases under one song identity. If an existing legacy record needs a new version, update or migrate that identity; do not add a second record with the same song ID.
- Preserve the special three-track sequencing for Cut From the Same Fabric. Ordinary releases never join that sequence.
- Preserve existing user changes and existing working players. A release update is not permission for a visual redesign.

## Definition of done

The final handoff must confirm, in plain language, that the song is visible on Home, Music, and Updates; its direct page and sharing work; playback continues; the sitemap is current; checks pass; and the published site is live. If any item is not true, say exactly what remains.
