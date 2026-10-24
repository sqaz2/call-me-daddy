# MusicSubject Library

Independent public catalogue at `https://library.musicsubject.com/`. The hostname
is handled before the Call Me Daddy navigation and app shell. It reuses the
canonical catalogue, original media and shared continuous-playback controller.
Neither homepage adds a navigation link to the other.

Collection links use `?group=country`; exact recordings use
`?song=SONG_ID&version=VERSION_ID`. Library shares and server-rendered previews
keep the library hostname. Existing numbered artist links remain unchanged.
Genres follow individual version labels. Mood groups are editorial selections
in `model.mjs`. Brief collections stay empty until reviewed.

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
