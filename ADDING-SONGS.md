# Adding music to Call Me Daddy

The release manifest is the single source of truth for a new song. Do not make a new dated JavaScript upload patch and do not separately hand-edit Home, Music, Updates, radio, and the sitemap.

## New-release workflow

### The default bundle going forward

A normal new release lands as one bundle: final audio, finished artwork, one real song page, one release manifest, and the six intention scores. The manifest then fans that bundle out to Home, Music, Updates, radio, sharing and the sitemap.

Do not create a placeholder song route just to satisfy the workflow. If an older catalog song has playable audio but no real page yet, leave `experience` empty. Music and the homepage finder will label it **Story coming soon**, keep playback on the catalog, and offer **Ask me about this song** instead of sending people to an invented page.

The manifest also supports that honest state for a new upload whose story is not ready. Use an empty `song.experience`, and point `song.shareUrl` and `update.href` at its exact `/music/?song=...&version=...&intent=...&share=1` route. Set `update.cta` to `Play this song`. The sync check rejects made-up local routes; adding the real experience later automatically changes discovery to **Story ready**.

Old songs can be upgraded one at a time. When a real page is ready, add that route to the existing song identity; do not make a second song record and do not wait until every old song has a page.

### 1. Identify the release correctly

Decide whether the upload is:

- a genuinely new song identity;
- another version or remix of an existing song;
- an older recording or archive source; or
- media for an existing special project.

Aliases and remixes stay under one song ID. Different filenames do not automatically mean different songs. `Make Me an Animal`, `Make Me Animal`, and `Animal Day`, for example, remain one identity with multiple versions.

Do not invent a creation date, backstory, base-master relationship, or credit when it has not been confirmed.

### 2. Store the media

Use dated, stable paths for current songs:

```text
/media/songs/YYYY/MM/song-slug/audio.mp3
/media/songs/YYYY/MM/song-slug/cover.jpg
/media/songs/YYYY/MM/song-slug/background.mp4
```

Use `/media/archive/` for historical sources and reworks. Use `/media/projects/YYYY/MM/` for project-only media. Keep the public paths stable after release.

Before publishing, inspect the final media:

- confirm the chosen audio is the intended final edit;
- remove unrelated embedded source/tool metadata;
- use the approved title and artist credit when writing tags;
- use `callmedaddy.musicsubject.com` as the site URL where the format supports it;
- confirm artwork orientation and file type; and
- confirm every referenced local file actually exists.

### 3. Create the listener page

Create the local route named by `song.experience` before running the sync tool. A dedicated song/release page needs:

- accurate `<title>`, canonical URL, Open Graph and X metadata;
- `share.css`, a `data-share` control, and `share.js`;
- artwork-first play/pause behavior;
- visible Previous, Play/Pause, and Next controls;
- the shared continuous-playback handoff so the site does not stop after one song;
- the shared five-second “Up next” prompt that follows a different song into its listener page without unloading the playing audio; and
- mobile-first controls without a visible generic browser audio bar.

The page-follow prompt is part of `continuous-playback.js` and `persistent-site-browser.js`. Keep both scripts in that order, let “Stay here” cancel the move, and never replace the handoff with `location.href` in the window that owns the playing audio.

Project pages may be more elaborate, but ordinary releases do not join the protected Cut From the Same Fabric three-track sequence.

The persistent transport belongs to `universal-player.js`; ordinary pages should not invent another bottom player. Page-specific artwork and buttons may launch or mirror playback, while the shared player owns title/artwork state, Previous, Play/Pause, Next, seeking, sharing, recovery and the five-second page-follow handoff. A special project may keep its own sequencing adapter when the music itself requires it, but it must still report the active track to the universal player.

### 4. Add one manifest

Copy `content/releases/_template.json` to:

```text
content/releases/YYYY-MM-DD-song-slug.json
```

Fill all three sections:

- `song` — catalog identity, assets, variants, description and listener route;
- `radio` — a 0–100 score for all six intention lanes; and
- `update` — the homepage/Updates wording, date, share URL and card content.

Use an `America/Edmonton` offset for exact public timestamps. A new release normally has `update.featured: true`; that is the contract that puts it on the homepage.

The update permalink must be exactly:

```text
/updates/UPDATE_ID/
```

Do not add `featuredOrder`. The sync tool assigns a collision-free tie-break order, while the homepage places newer publication dates first.

### 5. Synchronize everything

Run:

```text
node scripts/sync-releases.mjs
```

That command updates the generated release blocks in:

- `data/songs.js` for Music and every shared player;
- `data/briefing.js` for the homepage and Updates;
- `data/radio-intents.js` for intention radio;
- `sitemap.xml`; and
- `updates/UPDATE_ID/index.html`, including canonical, Open Graph, X, play and share links.

The files inside `RELEASE-MANIFEST:*` markers are generated. Change the manifest and rerun the command instead of editing those blocks.

### 6. Validate before publishing

Run:

```text
node scripts/sync-releases.mjs --check
node --test tests/*.test.js tests/*.test.mjs
```

Also run the JavaScript syntax checks in `.github/workflows/site-checks.yml`. The sync check rejects missing assets/pages, bad IDs, wrong update permalinks, incomplete radio profiles, stale generated output, and a release that is not featured on Home.

Do not call a release complete until all of these are true:

- Home shows it in the newest briefing and release cards;
- Music contains the song and versions;
- Updates contains it and its stable update page;
- direct sharing has correct artwork and wording;
- the dedicated page continues into radio;
- the sitemap contains both routes;
- local checks and GitHub Site checks pass; and
- the live Cloudflare site has the published change.

## Existing-song versions

If the song already has a release manifest, edit that manifest and keep the version in its `variants` array. If it is still defined in a legacy dated data file, update or migrate the existing identity rather than creating a second manifest with the same ID. Add a listener-facing public update when the new version matters, and keep the exact-song URL contract:

```text
/music/?song=SONG_ID&version=VERSION_ID&intent=INTENT&share=1
```

For a legacy song with no information page, that exact-song URL is the listening/share route, not a pretend `experience`. Its catalog card remains marked **Story coming soon** until you intentionally build the page.

## YouTube-only songs

A local MP3 is not required when the release already lives on YouTube. Use `youtubeId` and `youtubeUrl`, point `cover` at the YouTube thumbnail, leave `audio` empty, and provide a dedicated `/youtube/VIDEO_ID/` experience page. The manifest and sync workflow are otherwise the same.
