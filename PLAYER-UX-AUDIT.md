# Player follow-up — September 11, 2026

The homepage remains the search and discovery destination. This pass repairs the listening controls without changing songs, lyrics, artwork, numbering or the site's approved layout.

## Findings and changes

- **Page following:** The focused listening page derived a recording's destination from the live address bar. Browsing elsewhere changed that address, so returning to the recording could send the listener to the page they had browsed. Capture the selected recording's original route, resolve its exact version, and let the persistent browser retain its audio owner. A route check that completes while paused must remain retryable after playback resumes.
- **Swipes:** Existing swipe bindings targeted legacy controls hidden by the universal dock. Bind the visible artwork/title surface. Left selects next; right selects the previous recording even after five seconds. Buttons retain their existing transport behavior. Use one event family, suppress the click generated after a swipe, and exclude seeking, controls, links and vertical scrolling.
- **Likes:** The existing taste store had no heart in the visible dock. Add an accessible toggle for the actual audio version, including named variants that also serve as the song's primary audio. Home displays exact liked recordings, most recently liked first, and updates when likes change in the owner document. Show six initially and disclose the rest. Likes remain local to the browser; there is no cross-browser account sync or invented public popularity count.
- **Playback clarity:** Show the next title outside the options panel and elapsed/total time on mobile. Keep the existing five-second transition preview, loading/recovery states, short-link sharing and 30-day song break with Undo. The seek control announces elapsed time and duration.
- **Content access:** Measure the dock's actual height and reserve matching space in the visible page, including persistent browsing frames and the expanded options panel.

## Verification

Unit regressions cover route races and retry, source/variant identity, exact title destinations, pointer/touch duplicate prevention, swipe click suppression, vertical and scrubber exclusions, storage failure, and version-specific likes.

The touch-browser regression exercises real media playback, live Home likes, returning to the selected version, left/right touch gestures, swiping back after five seconds, independent seeking, one audible owner, storage persistence, and footer access at 320 CSS pixels. Existing playback, short-link, navigation and release checks remain release gates.

Automated browser checks do not establish speaker output or operating-system behavior on a physical iPhone or Android device.

## Useful later additions

A sleep timer and an explicit repeat-this-recording option are useful small follow-ups. Cross-browser liked-song sync would need an account or an explicit export/import feature. A public most-liked chart would need actual server-side votes and should remain separate from a listener's own saved songs.
