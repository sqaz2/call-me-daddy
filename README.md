# Call Me Daddy × MusicSubject

The source for `callmedaddy.musicsubject.com`: a mobile-first music site where songs can become full release pages, interactive projects, visuals, experiments, and small pieces of software instead of being reduced to embedded streaming bars.

See `SITE-MAP.md` for the full information architecture and archive/media map.

## Main areas

- `/` — homepage and current releases
- `/music/` — growing music catalog and continuous player
- `/level-up/` — Level Up / New Tools Trilogy finale
- `/back-to-sticks/` — Back to Sticks release story
- `/the-musician-police/` — The Musician Police release story
- `/cut-from-the-same-fabric/` — interactive three-track experience
- `/funhouse-meltdown/` — voice-to-song experiment
- `/namaste-hamster/` — Namaste, Hamster
- `/old-files-new-tools/` — old recordings and their 2026 reworks, organized by song family
- `/sqaz/` — explicit Sqaz archive, currently centered on Kill You (2007 → 2026)

## Player rule

The preferred interaction is artwork-first: tap the image to start the music, then use the custom player dock. Avoid dropping visible native browser players or generic embedded streaming bars into release pages when the custom experience can control playback instead.

For touch devices, seeking is deliberately tactile rather than precision-pointer dependent. `tactile-scrubber.css` and `tactile-scrubber.js` provide a large circular jog wheel: one full rotation scans the full current audio duration, keyboard seeking remains available, and supported Android browsers get small haptic ticks while dragging.

Player controls must not hug the physical screen edges. Fixed docks use the device safe-area insets plus an additional gesture gutter so Android/iPhone back gestures, browser edge swipes and the bottom home gesture are less likely to be triggered accidentally. We cannot override OS-level navigation gestures, so the design solves this by keeping interactive controls away from those zones.

The main catalog follows the same rule used by the special release pages: artwork starts or pauses local audio, while external-only releases open from the artwork and retain their platform links.

## Adding music

See `ADDING-SONGS.md`. The current catalog data lives in `data/songs.js`; current song/project media use dated folders in `media/`.

Historical source/rework projects use `media/archive/`. The Old Files / New Tools material is organized under:

```text
media/archive/old-files-new-tools/
  crocodile-shoes/
  nuride-away/
```

## Deployment

`wrangler.jsonc` defines the Cloudflare custom domain and serves this repository as static assets.
