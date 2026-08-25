# Call Me Daddy × MusicSubject

The source for `callmedaddy.musicsubject.com`: a mobile-first music site where songs can become full release pages, interactive projects, visuals, experiments, and small pieces of software instead of being reduced to embedded streaming bars.

See `SITE-MAP.md` for the full information architecture and archive/media map.

## Main areas

- `/` — homepage, daily briefing and current releases
- `/updates/` — running public history of new music, experiments, archive finds and meaningful site changes
- `/music/` — growing music catalog and intention-driven continuous player
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
