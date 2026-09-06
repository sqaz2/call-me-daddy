# Call Me Daddy / MusicSubject working rules

Read README.md, RELEASE-WORKFLOW.md and ADDING-SONGS.md before publishing music. These rules supplement those documents; do not replace the manifest workflow or special-project sequencing.

## Playback contract

- The playing audio source is the authority for track identity. The title, artist, artwork, version, share link, phone Media Session and navigation must describe that same recording, not the page the listener originally opened.
- Use CMDContinuousPlayback for ordinary release pages and CMDUniversalPlayer for the visible dock. Do not add a second independent ended/error/next queue to a page that already uses the shared controller.
- The first artwork tap must call play/toggle from that same user gesture. Never require a second tap just to initialize a player.
- When the recording changes (automatic end, next, previous or version selection), update the dock and follow its song page. Keep the five-second Up next preview before the current track ends; do not wait five more seconds after the next song starts to follow it.
- If a story page is missing or unavailable, use /now-playing/?song=SONG_ID&version=VERSION_ID. It shows the actual recording and says its full page is not available yet. Do not invent lyrics, stories, links or placeholder release pages.
- Page navigation must preserve the audio element, queue and position. The persistent browser keeps the playback owner alive; iframe navigation must go through the top-level site browser. Only one dock should be visible, controlling the real owner.
- Ignore idle player initialization when another player is active. Remove obsolete media listeners and do not register a native fallback over an existing shared controller.
- Decorative muted video must not claim playback or override song metadata. Preserve special-project sequencing and deliberate followPages:false opt-outs.

## Concurrent work and release checks

- Fetch the latest main before editing. Work on a focused branch; do not merge an older page rewrite over newer lyrics or artwork edits.
- Preserve the user's exact lyrics, slang, grammar and phrasing unless the user asks for lyric changes. A player repair is not permission to rewrite lyrics or replace media.
- Run node --test tests/playback-sync.test.js plus the existing Site checks. Add regressions for source/metadata mismatch, next/previous, missing pages, rapid skips and iframe ownership.
- Automated DOM tests do not prove audible playback on a physical phone. State separately whether code is committed, merged, deployed, and actually browser/device-tested. Do not claim a production fix from an unmerged PR.
