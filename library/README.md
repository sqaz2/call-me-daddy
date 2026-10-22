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
service binding. Unwritten Skies uses only the game's ambient drone and chord
pad synthesis, adapted from `client/public/unwritten-skies.html` at StarMuff
main. There are no game loops or combat effects. Layer gains, volume and sleep
timer are local controls; music and ambience never intentionally play together.

Validation: `node --test tests/music-library.test.mjs tests/playback-sync.test.js`
plus the existing Site checks. Browser testing covers first-tap playback,
version/next/previous identity, collection browsing, sharing and ambience
handoff. A desktop browser does not prove physical-phone background playback.
