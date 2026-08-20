# Call Me Daddy × MusicSubject

The source for `callmedaddy.musicsubject.com`: a mobile-first music site where songs can become full release pages, interactive projects, visuals, experiments, and small pieces of software instead of being reduced to embedded streaming bars.

## Main areas

- `/` — homepage and current releases
- `/music/` — growing music catalog
- `/level-up/` — Level Up / New Tools Trilogy finale
- `/back-to-sticks/` — Back to Sticks release story
- `/the-musician-police/` — The Musician Police release story
- `/cut-from-the-same-fabric/` — interactive three-track experience
- `/funhouse-meltdown/` — voice-to-song experiment
- `/namaste-hamster/` — Namaste, Hamster
- `/sqaz/` — archive material

## Player rule

The preferred interaction is artwork-first: tap the image to start the music, then use the custom player dock at the bottom. Avoid dropping visible native browser players or generic embedded streaming bars into release pages when the custom experience can control playback instead.

The main catalog now follows the same rule used by the special release pages: artwork starts or pauses local audio, while external-only releases open from the artwork and retain their platform links.

## Adding music

See `ADDING-SONGS.md`. The catalog data lives in `data/songs.js`; song and project media are organized under dated folders in `media/`.

## Deployment

`wrangler.jsonc` defines the Cloudflare custom domain and serves this repository as static assets.
