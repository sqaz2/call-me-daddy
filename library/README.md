# MusicSubject Library

Independent public catalogue at `https://library.musicsubject.com/`. The hostname
is handled before the Call Me Daddy navigation and app shell. It reuses the
canonical catalogue, original media and shared continuous-playback controller.
Neither homepage adds a navigation link to the other.

Collection links use `?group=country`; exact recordings use
`?song=SONG_ID&version=VERSION_ID`. Library shares and server-rendered previews
keep the library hostname. Existing numbered artist links remain unchanged.
Genres follow individual version labels. Mood groups are editorial selections
in `editorial.mjs`, with the shared vocabulary in `model.mjs`. Brief collections stay empty until reviewed.

StarMuff First Edition uses the existing 50-track playlist and range-aware
service binding. The library contains existing audio recordings only. It does
not generate additional songs or soundscapes.

Validation: `node --test tests/music-library.test.mjs tests/playback-sync.test.js`
plus the existing Site checks. Browser testing covers first-tap playback,
version/next/previous identity, collection browsing and sharing. A desktop
browser does not prove physical-phone background playback.

## Room Enough film preview

The published film at https://roomenough.grok.me/ accompanies every locally playable
recording. Its public MP4 is streamed directly, muted, through film-preview.mjs;
the shared song audio remains the only playback and Media Session owner. New
tracks, versions and repeats restart the picture. Pause, buffering, seeking and
playback speed follow the song, and the film loops for longer recordings. Hiding
the film pauses only the picture. Video errors leave music playing.

The preview is beside the catalogue and on individual cue pages. The dock's
Watch film action returns to it. No film audio is added to the catalogue.

Run node --test tests/film-preview.test.mjs with the existing library checks.

## Classification review

`editorial.mjs` records the artist's genre confirmations and reviewed lyrical
moods, explanations and evidence status. `replaceMoods` replaces older generic
moods; per-version genre evidence stays on that recording. The same vocabulary
powers dropdowns, browse buttons and natural-language search. The song-by-song
review and remaining unknown genres are in [catalogue-review.md](catalogue-review.md).

`lyric-sheets.mjs` preserves exact text from the published Concrete Under
Evergreens and Live It Right pages. Four conflicting legacy lyric mappings
remain flagged for review and are excluded from Library lyric search/details.

Armando's chosen and earlier recordings share one catalogue identity. The old
`armando:main` key migrates to the canonical song's `earlier` variant. Permanent
numbers 4 and 14 retain their original recordings. Do not allocate a second
numbered slot for a recording already reached through an identity alias.

## Genre families

`genres.mjs` defines the browse families and parent tags. Techno, house, bass
house, dubstep, drum & bass, trance and glitch hop include Electronic & EDM;
trap and boom bap include Hip-hop & rap. All documented genres are visible on
the selected recording's row, with native dropdown groups for mobile browsing.

`recording-genres.mjs` adds classifications keyed by the exact audio path. The
45 entries were matched through each MP3's embedded Suno clip ID to its public
style description, recorded in `content/sources/library-genres-2026-10-24.json`.
Do not copy source styles between sibling recordings or classify genres from
lyrical moods. Artist follow-up and a matching Loudest One upload subsequently resolve five
more broad classifications in `editorial.mjs`. The older 2024 I Need Love stays
unclassified; nuRide Away’s original and Shooting Star retain explicit working
classification notes. See `catalogue-review.md` for the current evidence.
