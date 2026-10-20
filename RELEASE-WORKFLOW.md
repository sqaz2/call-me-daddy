# One-record music publishing

Every new song starts as one JSON file in `content/releases/`. Copy `_template.json`, rename it with the release date and slug, and fill in the facts you actually know.

Run:

```bash
node scripts/sync-releases.mjs
node scripts/sync-releases.mjs --check
```

The sync command validates local audio, artwork, story routes and share routes, then updates the canonical song catalog, homepage/update feed, radio profile, sitemap and a static social-preview page under `updates/`.

Before syncing, add the song to `content/song-share-copy.json`: `headline`, `text`, `description`, and real repo-relative `sources`, with optional `variants[VERSION_ID]` overrides. Read the writing and story first. Lead with a specific detail, joke or question, then invite people to open what is actually on the page. Do not default to “Listen to…” or promise an article when the link opens only a recording. Keep stored copy URL-free; the runtime appends the exact numbered recording link once. Different writing or perspectives need reviewed overrides; unchanged remixes can inherit.

The sync fails if a new catalog song lacks reviewed copy. Run `node scripts/build-song-social.mjs` after synchronization to verify the generated preview index (it is ignored by Git and rebuilt during deployment). The registry powers native sharing, social composers, Copy post and server-rendered link previews. Copy link remains URL-only. Ordinary share copy must follow the actual audio source; moment links retain their timestamp and WinHamp links retain their player route. Keep the page-only Her Story audiobook out of the music catalog and rotation.

It also assigns permanent numbered share links. Commit `content/song-links.json`,
`data/song-links.json`, `worker/song-links-data.mjs` and the generated prefix of
`share.js` with each release. Never renumber, reorder or delete existing song
numbers or version slots in `content/song-links.json`; removed entries stay
reserved. New songs and versions are appended automatically.

Optional `song.shareGenre` or `song.variants[].shareGenre` accepts `hiphop`,
`dubstep`, `dnb` or `other`. A version override takes priority. Explicit genre labels
provide a conservative default; unidentified music uses `suno.fyi`.
DnB, D&B and drum-and-bass labels select `dnb.fyi`. In multi-version songs,
classification uses the individual recording's label, so older versions retain
their own genres and share domains.
For a dedicated release page that accepts exact `?version=` links through the
shared release player, `song.shareToExperience: true` sends each numbered link
directly to that page and recording. Use this for ordered listening experiences;
existing permanent recording slots remain unchanged. The variants' order is the
page's listening order; an editorial `openerPolicy` can keep a bonus opening out
of automatic music rotation. A page may pin its song lyric panel with
`data-lyrics-version="main"` when an opening has a separate screenplay.
For satire and joke songs, set `song.shareCategory` to `jokes` (or a variant's
`shareCategory` for one recording). This selects `jokes.win` before the genre
domain. `music` opts out; variant metadata takes priority. Existing reviewed
comedy assignments live in `content/song-share-categories.json`. Explicit
satire/comedy/parody `kind` labels also classify new releases automatically.
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

Optional archive recordings can set `song.rotation` to `opt-in`. They stay out of
automatic radio and newest-first queues until the listener explicitly adds them
through `CMDCatalogCycle.setRotationEnabled(songId, true)`. A direct play, like,
shared link or heavy intention does not grant that preference. The Sqaz page
provides the add/remove control, saved in the current browser. Intentional personal
playlists can still include a recording independently of its radio preference.

For another version of an existing song, keep its manifest and add the recording
to `song.variants`. Move its earlier `update` into `previousUpdates` (an optional
array), then write the new `update` with an exact `variantId`. Earlier announcements
keep their dates, share paths and version links; set their `featured` to false so
the homepage features the latest announcement for that song.


## Exact lyrics (optional)

A release may include a top-level `lyrics` object with `text`, `snippet`, `sunoUrl`, and `clipIds`. Copy the released source verbatim, not an earlier draft. The sync command adds those words to the generated region in `data/song-lyrics.js`, so Music's lyric panel and lyric search see the same release. Legacy lyric entries outside that region remain untouched. Variant artwork is validated alongside its audio.

When the artist supplies the released words directly and no Suno source is available, set `lyrics.source` to `"artist-supplied"` and omit `sunoUrl`. The words still appear in lyric search and the on-site lyric panel; no external source link is invented. Any supplied `sunoUrl` must remain a valid Suno song link.
