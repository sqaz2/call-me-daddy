# Call Me Daddy intention radio

The music page builds a complete, no-duplicate route through every playable song identity. It does not use a fixed playlist.

## Inputs

- `intent`: one of `surprise`, `laugh`, `think`, `level-up`, `heavy`, or `old-files`
- `seed`: a safe 48-character maximum route seed
- `cycleNumber`: rotates alternate versions and produces a fresh deterministic order
- recent local listening history: reduces immediate repeats on ordinary visits
- `share=1`: ignores the recipient's local history so a shared seed reproduces the same route

The exact-song URL contract remains supported:

```text
/music/?song=SONG_ID&version=VERSION_ID&intent=INTENT&seed=SEED&share=1
```

The requested version is first. Radio continues afterward.

## Collection-player contract

Every page that presents a local playlist or version collection must keep playing after its own sequence ends. The local sequence stays first; then `playlist-radio.js` hands the same page player into the weighted intention engine. The first radio cycle excludes the local songs just heard, later cycles restore the full catalog, and an unavailable file is skipped instead of ending the session.

Already-endless players (the main catalog and When Things Got Heavy) keep their native cycles. The four-song anti-AI run uses the same contract inside `new-tools-trilogy.js`.

## Selection math

`catalog-cycle.js` combines:

1. the song's intention score;
2. catalog-relative recency;
3. project variety;
4. recent-listen and immediate-repeat penalties;
5. controlled seeded randomness;
6. protected story sequences.

The current protected openings are:

- `level-up`: Back to Sticks → The Musician Police when local audio exists → Level Up
- `think`: HELL HAS PEOPLE TOO → Cut From the Same Fabric instrumental → Find Your People
- `heavy`: Never Come Back Down → Numbness as a Trap → Will to Live
- `old-files`: 2010 WOWS → I Need Love → I Won't Let the Wi-Fi Go

Unavailable audio is skipped without breaking the rest of a sequence.

## Adding a song

After adding the catalog entry, add the same song ID to `data/radio-intents.js` and score all six intentions from 0–100. A missing score safely falls back to 50, but the test suite requires an explicit profile so editorial judgment is never silently skipped.

Only add a protected sequence when order changes the meaning. Ordinary related songs should stay in the weighted pool.

## Verification

```bash
node --test tests/radio-cycle.test.js
node --check catalog-cycle.js
node --check data/radio-intents.js
node --check music/music.js
node --check music/now-playing-share.js
node --check playlist-radio.js
node --test tests/playlist-continuity.test.js
```

The tests cover seeded reproducibility, unique identities, protected story order, unavailable-track skipping, version rotation, legacy exact shares, invalid intentions, and complete profile coverage.
