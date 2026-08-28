# Site Map — MusicSubject × Call Me Daddy

This is the working information architecture for `callmedaddy.musicsubject.com`.

The site has four jobs:

1. **Play the music** without forcing visitors out to a streaming service.
2. **Give important releases their own story / experience** when a normal song card is not enough.
3. **Preserve the history** so old recordings, aliases and source material have context instead of being mixed randomly into the current catalog.
4. **Show what changed** so a returning visitor can quickly see new music, experiments, archive finds and meaningful site updates.

## Public route map

### Front door

- `/` — **Call Me Daddy × MusicSubject home**
  - latest public briefing
  - newest releases
  - intention-radio entry points
  - featured interactive projects
  - routes into the current catalog
  - routes into the historical / explicit archives
  - external platform links

### Listen

- `/music/` — **main current music catalog**
  - artwork-first playback
  - intention-weighted radio routes
  - alternate versions rotate between cycles instead of repeating the same song identity in one cycle
  - previous / next controls
  - persistent listening while navigating internal pages
  - platform links for releases that live elsewhere

### Updates

- `/updates/` — **public update history**
  - new music
  - remixes / alternate versions
  - archive finds
  - experiments
  - meaningful site/player changes
- `/updates/<entry-id>/` — stable, social-previewable page for one public update

`data/briefing.js` is the public feed. Music metadata remains authoritative in `data/songs.js`; song-backed update entries should reference a catalog `songId` instead of duplicating the song metadata.

### Current release / project experiences

- `/power-pulse-uprising/` — **Did Armando Die After You Held His Beer?**; chosen Armando version plus making-of history
- `/id-pick-you-first/` — I’d Pick You First; absurd relationship test → gross punchline → sincere love song, with the uploaded moving background
- `/level-up/` — Level Up / New Tools Trilogy finale
- `/back-to-sticks/` — Back to Sticks
- `/the-musician-police/` — The Musician Police
- `/anti-generative-ai-diss/` — the fourth anti-gatekeeping track, all four connected songs, origin story and an invitation-ready guest lane
- `/cut-from-the-same-fabric/` — interactive three-track release; listener chooses which side starts
- `/funhouse-meltdown/` — voice-to-song experiment
- `/namaste-hamster/` — Namaste, Hamster release page
- `/i-wont-let-the-wifi-go/` — 2025 early AI-music experiment using ’80s musical inspiration in half-time dubstep
- `/youtube/W47ebCMfrBI/` — YouTube-backed release page

These pages are for songs where the **idea around the song** is part of the release.

## When Things Got Heavy

### `/sad-music/`

**Sad / pressure / survival collection.** The public song/version count is derived from catalog data at runtime; do not hard-code it in homepage copy or documentation.

Alternate mixes stay grouped under one song identity. The collection page can play every archived version; the main catalog radio chooses only one version of each song per cycle and rotates alternates on later cycles.

Current song pages:

- `/sad-music/locked-in-these-walls/`
- `/sad-music/under-watch/`
- `/sad-music/seven-days-locked/`
- `/sad-music/stomp-clamp/`
- `/sad-music/broke-my-mug-not-my-song/`
- `/sad-music/friction-the-what/`
- `/sad-music/couple-friends-couple-calls/`
- `/sad-music/i-need-love/`
- `/sad-music/numbness-as-a-trap/`
- `/sad-music/everybody-else-less/`
- `/sad-music/never-come-back-down/`
- `/sad-music/will-to-live/`

`I Need Love` preserves a longer writing chain:

- older original recording — approximately a decade before the 2024 rework
- 2024 — **We Fall in Love Too Quickly**, AI reimagining on SoundCloud
- 2026 — **I Need Love · Busker Mix 1**
- 2026 — **I Need Love · Busker Mix 2**

For this collection, prefer real photos tied to the songs as backgrounds when available; fall back to embedded/existing artwork before generating generic visuals.

## History / archive branch

### `/archive/wild-ways/`

**One Nova Scotia song source → three playable AI-era versions.**

- 2019 — keyboard-and-vocal practice in Nova Scotia; the raw rehearsal is historical context and is not currently a playable upload
- 2026 — AI-built version using Will's voice
- 2026 — EDM Remix
- 2026 — Crowd Drop Remix

All three playable files remain variants of the single `wild-ways` catalog identity.

### `/old-files-new-tools/`

**MusicSubject personal recording history → modern reworks.**

Current song families:

- **nuRide Away** — oldest recording in this project
  - archive source: old vocals
  - 2026: Heavyweight Dubstep Mix
  - 2026: Vocal Fix Cut
- **Crocodile Shoes**
  - archive source: `round the bend roughcopy`
  - later song identity: Crocodile Shoes
  - 2026: Late-Night Warehouse Dub Remix
  - 2026: 2015 Special / 2026 Remix

This branch should remain separate from the ordinary catalog because the **before / after relationship is the content**.

### `/sqaz/`

**Explicit archive / earlier identity.**

Current anchor:

- Sqaz — **Kill You**
  - writing roots at age 13–14
  - 2007 recording at age 17
  - 2010 music-business / home-recording education
  - 2026 remix and retrospective reading

Sqaz should not be silently mixed into the Call Me Daddy playlist. A visitor should be able to deliberately find it, read the context, then listen.

## Recommended historical path through the site

For somebody intentionally exploring the history:

`/sqaz/` → `/old-files-new-tools/` → `/music/`

That creates a rough chronological movement from the earlier writing / rap era, through the home-studio and surviving old recordings, into the current MusicSubject / Call Me Daddy catalog.

## Media organization

Current release assets continue to live under dated paths such as:

```text
/media/songs/YYYY/MM/song-slug/
/media/projects/YYYY/MM/project-slug/
```

Collection media uses:

```text
/media/collections/sad-music/YYYY/song-slug/
```

For example:

```text
/media/collections/sad-music/2026/i-need-love/
  busker-mix-1.mp3
  busker-mix-2.mp3
```

Historical material belongs under:

```text
/media/archive/old-files-new-tools/
  crocodile-shoes/
    archive/
      round-the-bend-roughcopy.mp3
    2026/
      late-night-warehouse-dub-remix.mp3
      2015-special-2026-remix.mp3

  nuride-away/
    archive/
      vocals.mp3
    2026/
      heavyweight-dubstep-mix.mp3
      vocal-fix-cut.mp3
```

## Content rules

- **Current catalog:** clean listening experience first.
- **Project pages:** explain or dramatize the idea around the song.
- **Updates:** listener-facing changes, not a raw Git commit log.
- **When Things Got Heavy:** real-photo backgrounds first when the song has a real visual tied to it; keep alternate mixes under one identity.
- **Old Files / New Tools:** preserve source → rework relationships and admit when an old file is rough.
- **Aliases stay attached to one identity:** `Make Me an Animal`, `Make Me Animal`, and `Animal Day` are one song family unless the artist explicitly separates them later.
- **Sqaz:** explicit archive with deliberate context; keep the Sqaz identity distinct.
- **Do not invent archive dates.** Approximate dates stay labeled approximate until verified.
- **Artwork-first playback** remains the visual rule wherever possible.
- **Mobile-first navigation:** the shared top navigation remains usable on small screens as a horizontally scrollable route bar instead of disappearing.
- **Search UI can wait while the catalog is small, but catalog metadata should stay structured now so title / artist / project / era / remix search can be added cleanly once the library becomes large.**

## Structural rule

`/archive/` is the visual doorway into historical material. Keep **Sqaz**, **Old Files / New Tools**, and song-lineage pages canonical at their existing URLs rather than duplicating their content inside the directory page.
