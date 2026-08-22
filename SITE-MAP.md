# Site Map — MusicSubject × Call Me Daddy

This is the working information architecture for `callmedaddy.musicsubject.com`.

The site has three jobs:

1. **Play the music** without forcing visitors out to a streaming service.
2. **Give important releases their own story / experience** when a normal song card is not enough.
3. **Preserve the history** so old recordings, aliases and source material have context instead of being mixed randomly into the current catalog.

## Public route map

### Front door

- `/` — **Call Me Daddy × MusicSubject home**
  - newest releases
  - featured interactive projects
  - routes into the current catalog
  - routes into the historical / explicit archives
  - external platform links

### Listen

- `/music/` — **main current music catalog**
  - artwork-first playback
  - continuous local-audio playlist
  - previous / next controls
  - platform links for releases that live elsewhere
  - this is the default place to listen when a track does not need a special story page

### Current release / project experiences

- `/power-pulse-uprising/` — evolving reaction-video experiment; recorded reaction → isolated laugh → song → iterative mix edits
- `/id-pick-you-first/` — I’d Pick You First; absurd relationship test → gross punchline → sincere love song, with the uploaded moving background
- `/level-up/` — Level Up / New Tools Trilogy finale
- `/back-to-sticks/` — Back to Sticks
- `/the-musician-police/` — The Musician Police
- `/cut-from-the-same-fabric/` — interactive three-track release; listener chooses which side starts
- `/funhouse-meltdown/` — voice-to-song experiment
- `/namaste-hamster/` — Namaste, Hamster release page
- `/youtube/W47ebCMfrBI/` — YouTube-backed release page

These pages are for songs where the **idea around the song** is part of the release.

`/power-pulse-uprising/` is intentionally a **living project page**. Preserve the origin story while adding later mixes, source media, visuals, and process notes as the work develops.

## History / archive branch

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

`I’d Pick You First` currently uses:

```text
/media/songs/2026/08/id-pick-you-first/
  audio.mp3
  background.mp4
```

`Power Pulse Uprising` currently references the user-uploaded working mix at the repository root:

```text
/Power_Pulse_Uprising_Intro_Full_Yeah_Fix.mp3
```

When its media set is finalized, it can be normalized into the dated media layout without changing the public `/power-pulse-uprising/` route.

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
- **Living project pages:** preserve the original source/process story, then append later iterations rather than rewriting history.
- **Old Files / New Tools:** preserve source → rework relationships and admit when an old file is rough.
- **Sqaz:** explicit archive with deliberate context; keep the Sqaz identity distinct.
- **Do not invent archive dates.** Approximate dates stay labeled approximate until verified.
- **Artwork-first playback** remains the visual rule wherever possible.
- **Mobile-first navigation:** important archive routes cannot exist only in the desktop nav because the desktop nav is hidden on small screens.
- **Search UI can wait while the catalog is small, but catalog metadata should stay structured now so title / artist / project / era / remix search can be added cleanly once the library becomes large.**

## Next structural improvement

Eventually the site can add `/archive/` as a small visual doorway containing **Sqaz** and **Old Files / New Tools**. It should be a directory, not another duplicate content page. The existing URLs remain canonical.
