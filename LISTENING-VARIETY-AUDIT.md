# Listening variety audit — September 11, 2026

The owner likes the current homepage and reported tiring of Armando and possibly
finicky playback. The supplied research report explicitly said its site audit
was provisional. This change is based on the actual code, not its proposed
framework or homepage rewrite.

## Observed causes

- Ordinary releases use CMDContinuousPlayback. It never called the catalog's
  listening-history recorder. The Music player did, so repeat avoidance depended
  on where listening began.
- The radio already creates random seeds. There is no hard-coded Armando opener.
  History only reduced selection weights, leaving recent songs eligible at the
  front. A 100-seed cold-start regression checks broad opening-song variety.
- Exact Music share routes could carry a playlist seed and disable history.
  Sharing one recording could consequently reproduce its follow-up route.
- Newest-first intentionally follows publication order. It is an explicit lane,
  not the same contract as random radio, and remains chronological.
- Controller destruction left media and page lifecycle listeners registered.
  Late events could call an obsolete controller after replacement.
- Song feedback was available on Music, but ordinary release docks offered no
  simple way to stop a tiring song from appearing automatically.

## Changes

Actual playback on ordinary releases records one history entry per loaded
recording, without recording idle preparation or repeatedly counting resumes.
Ordinary radio moves the recent eight song identities behind other eligible
songs. Each cycle still contains each identity once; protected story sequences
retain their order. Explicit station shares can retain a seed, but exact song
links play their requested recording with fresh follow-up radio.

The dock's expandable listening options show the prepared next recording and
provide a 30-day break for a whole song, including alternate versions. Taking a
break skips immediately; Undo restores eligibility. Already built radio queues
and newest-first queues honor breaks. Direct song selection remains available.
Preferences remain local to the browser: a different browser cannot know the
same person's listening history or breaks without a separate sync system.

Destroyed controllers remove listeners and ignore late playback commands.
Next-audio preloading waits until a listening gesture instead of competing with
initial page content. Transport buttons have at least 44px height. Continuous
screen-reader announcements no longer repeat a changing countdown every second.

## Validation and limits

Node regressions cover recent-song deferral, cold-start variety, one identity per
cycle, break/undo/expiry, actual-play history, already prepared songs, destroyed
controllers and chronological release order. Existing playback, exact-version,
sharing and persistent-owner suites remain release gates.

Mobile Chromium checks use real audio: start a release, inspect Up next, take a
break, verify immediate continuation, undo it, and navigate with history intact.
The expanded dock is checked for mobile viewport fit. Automated browser playback
does not establish behavior on a physical Android or iOS phone.

No track was removed or globally suppressed for other listeners. The homepage,
lyrics, media files, short numbers, and special-project sequencing are unchanged.
