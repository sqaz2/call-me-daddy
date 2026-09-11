# One-record music publishing

Every new song starts as one JSON file in `content/releases/`. Copy `_template.json`, rename it with the release date and slug, and fill in the facts you actually know.

Run:

```bash
node scripts/sync-releases.mjs
node scripts/sync-releases.mjs --check
```

The sync command validates local audio, artwork, story routes and share routes, then updates the canonical song catalog, homepage/update feed, radio profile, sitemap and a static social-preview page under `updates/`.

It also assigns permanent numbered share links. Commit `content/song-links.json`,
`data/song-links.json`, `worker/song-links-data.mjs` and the generated prefix of
`share.js` with each release. Never renumber, reorder or delete existing song
numbers or version slots in `content/song-links.json`; removed entries stay
reserved. New songs and versions are appended automatically.

Optional `song.shareGenre` or `song.variants[].shareGenre` accepts `hiphop`,
`dubstep` or `other`. A version override takes priority. Explicit genre labels
provide a conservative default; unidentified music uses `suno.fyi`.
See `SHORT-LINKS.md` for the one-time domain activation and verification.

## If the song story is not written yet

Remove `song.experience`. Set both `song.shareUrl` and `update.href` to an exact player route such as `/music/?song=song-slug&version=main&intent=surprise&share=1`. The site will say that the story is coming instead of linking to an empty page.

## Rules

- Keep one song identity even when it has multiple versions.
- Put every version in `song.variants`.
- Use dated `/media/songs/YYYY/MM/slug/` paths.
- Do not create another dated `data/*-uploads.js` patch. September 2, 2026 and later releases belong in manifests.
- Never invent a story, platform link or listener claim to fill a blank field.
- Commit the manifest and every generated file together. CI rejects drift.


## Exact lyrics (optional)

A release may include a top-level `lyrics` object with `text`, `snippet`, `sunoUrl`, and `clipIds`. Copy the released source verbatim, not an earlier draft. The sync command adds those words to the generated region in `data/song-lyrics.js`, so Music's lyric panel and lyric search see the same release. Legacy lyric entries outside that region remain untouched. Variant artwork is validated alongside its audio.
