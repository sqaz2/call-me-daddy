# Call Me Daddy × MusicSubject

The source for `callmedaddy.musicsubject.com`: a mobile-first music site where songs can become full release pages, interactive projects, visuals, experiments, and small pieces of software instead of being reduced to embedded streaming bars.

See `SITE-MAP.md` for the full information architecture and archive/media map.

## Main areas

- `/` — homepage, daily briefing and current releases
- `/updates/` — running public history of new music, experiments, archive finds and meaningful site changes
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

## Player and discovery rule

The preferred interaction is artwork-first: tap the image to start the music, then use `universal-player.js` for the persistent Previous, Play/Pause, Next, seek, share and story controls. Release artwork can still act as a page-specific launcher, but it should not create a second bottom-player state machine. Avoid visible native browser players when the universal transport can control playback instead.

The main catalog follows the same rule used by the special release pages: artwork starts or pauses local audio, while external-only releases open from the artwork and retain their platform links.

The music page also supports intention-driven radio routes. The listener can ask to be surprised, laugh, think, level up, go heavy, or explore old files; the route weights the catalog accordingly while preserving controlled randomness and protected story sequences where order matters.

Home and Music use `music/discovery.js` for the same title/idea search, listener-facing intention categories and story status. A playable song without a declared `experience` stays in the catalog as **Story coming soon** with an **Ask me about this song** action; the site must never invent a route for it.

Audio and video requests pass through the range-aware delivery layer documented in `STREAMING.md`. Public `/media/...` URLs remain stable while individual files can migrate to R2 later.

## Adding music and public updates

See `AGENTS.md` for the agent's full release responsibility and `ADDING-SONGS.md` for the release-manifest workflow. New releases get one source record in `content/releases/`; `node scripts/sync-releases.mjs` carries it into the catalog, homepage, Updates, radio, static sharing page and sitemap. Current song/project media use dated folders in `media/`.

See `BRIEFING.md` for the public feed. `data/briefing.js` drives the homepage daily briefing, featured release cards and `/updates/`. Its generated release block comes from the same manifest as the generated catalog and radio records, so a new release cannot silently reach Music while missing Home.

Historical source/rework projects use `media/archive/`. The Old Files / New Tools material is organized under:

```text
media/archive/old-files-new-tools/
  crocodile-shoes/
  nuride-away/
```

Archive artwork under these folders is stored as normal WebP binaries. If artwork is replaced through tooling, verify the resulting Git blob is the expected image size rather than a tiny/corrupted placeholder.

## Deployment

`wrangler.jsonc` defines the Cloudflare custom domain and serves this repository as static assets.
