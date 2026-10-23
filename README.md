# Call Me Daddy × MusicSubject

The source for `callmedaddy.musicsubject.com`: a mobile-first music site where songs can become full release pages, interactive projects, visuals, experiments, and small pieces of software instead of being reduced to embedded streaming bars.

See `SITE-MAP.md` for the full information architecture and archive/media map.

## Main areas

- `/` — homepage, daily briefing and current releases
- `/updates/` — running public history of new music, experiments, archive finds and meaningful site changes
- `/winhamp/` — one-screen Winamp-inspired player with the live catalogue, spectrum, shuffle, repeat, version search and exact-recording share links. Choose Call Me Daddy, the original 50-track StarMuff playlist, or All music. Share `/winhamp/?playlist=starmuff` to open the game soundtrack directly.
- `/music/` — growing music catalog and intention-driven continuous player
- `/anti-generative-ai-diss/` — four-track anti-gatekeeping collection, origin story and invitation-ready guest lane
- `/level-up/` — Level Up / New Tools Trilogy finale
- `/back-to-sticks/` — Back to Sticks release story
- `/the-musician-police/` — The Musician Police release story
- `/cut-from-the-same-fabric/` — interactive three-track experience
- `/funhouse-meltdown/` — voice-to-song experiment
- `/namaste-hamster/` — Namaste, Hamster
- `/old-files-new-tools/` — old recordings and their 2026 reworks, organized by song family
- `/sqaz/` — explicit Sqaz archive, currently centered on Kill You (2007 → 2026)

## Player rule

The preferred interaction is artwork-first: tap the image to start the music, then use the custom player dock at the bottom. Avoid dropping visible native browser players or generic embedded streaming bars into release pages when the custom experience can control playback instead.

The main catalog follows the same rule used by the special release pages: artwork starts or pauses local audio, while external-only releases open from the artwork and retain their platform links.

The music page also supports intention-driven radio routes. The listener can ask to be surprised, laugh, think, level up, go heavy, or explore old files; the route weights the catalog accordingly while preserving controlled randomness and protected story sequences where order matters.

Audio and video requests pass through the range-aware delivery layer documented in `STREAMING.md`. Public `/media/...` URLs remain stable while individual files can migrate to R2 later.

## Adding music and public updates

See `ADDING-SONGS.md` for catalog/media work. The catalog data lives in `data/songs.js`; current song/project media use dated folders in `media/`.

See `BRIEFING.md` for the public feed. `data/briefing.js` drives the homepage daily briefing, featured release cards and `/updates/`. Release entries should reference `data/songs.js` by `songId` so music metadata has one authoritative home.

Historical source/rework projects use `media/archive/`. The Old Files / New Tools material is organized under:

```text
media/archive/old-files-new-tools/
  crocodile-shoes/
  nuride-away/
```

Archive artwork under these folders is stored as normal WebP binaries. If artwork is replaced through tooling, verify the resulting Git blob is the expected image size rather than a tiny/corrupted placeholder.

## Deployment

`wrangler.jsonc` defines the Cloudflare custom domain and serves this repository as static assets.


## Independent music discovery

`https://library.musicsubject.com/` is the separate MusicSubject Library. It shares published recordings with this repository without linking listeners back to the Call Me Daddy homepage. `worker/library.mjs` owns its host routing and exact-recording social previews; `library/` owns the interface.

The supervisor finder combines mood, genre, suggested scene, vocal information and recording-length filters. Queries rank by the fraction of documented search criteria that match, with matched and missing terms displayed. This is search relevance, not a quality rating, clearance score or prediction of placement. Unknown information cannot pass a selected filter. Moods and scene suggestions come from existing editorial notes and cue titles, not an audio analysis or a company brief.

Exact versions can be collected in a 30-recording shortlist, shared by URL, exported as CSV, and included in a licensing enquiry using the site's existing public contact address. The email action opens the visitor's email application; it does not send anything automatically. Clearance, source/AI permissions, clean edits, delivery masters and stems remain unconfirmed per recording. BPM and key are not guessed.

The October 22, 2026 coverage audit includes all 76 canonical catalogue entries, the two published Old Files / New Tools archive song families, and the 50 original StarMuff cues: 128 entries, 171 playable recordings and four external listening versions. The library-only additions in `library/archive.mjs` preserve the existing archive pages' exact paths and version labels. Source takes and rough copies remain manual selections, excluded from automatic queues. Two canonical YouTube-only releases and the existing external I Need Love versions are now discoverable. The unnamed YouTube entry retains its source catalogue title until verified.

This is a published-site inventory, not a claim about unpublished music or every external archive. Duplicate uploads, working samples, the page-only Her Story audiobook and the removed synthesized ambience are not new music entries. Genre and vocal information still needing review is labelled accordingly. New release manifests continue to feed the library automatically; update `library/editorial.mjs` with supported mood notes when needed.

Local durations and file facts are measured for the 121 exact local recordings; the 50 streamed StarMuff cues have unknown duration until measured. After replacing or adding local audio, regenerate the facts and run the coverage regressions:

```bash
node scripts/measure-library-audio.mjs
node --test tests/music-library.test.mjs tests/music-library-discovery.test.mjs tests/playback-sync.test.js
```

The coverage tests verify every canonical song and exact audio variant is indexed, the archive additions and external-only versions stay identifiable, genre labels do not leak between alternate versions, filters and scoring are honest, shortlisted versions survive sharing, and measured file sizes still match their audio.
