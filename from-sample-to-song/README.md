# From sample to song — living production diary

MusicSubject × Call Me Daddy, `/from-sample-to-song/`.

Publication was requested on September 9, 2026. This page is an unfinished project, not a finished-song release. It preserves the user's account: Satan’s.loan → their Generative.download drum machine → a recognizable beat added with Grok after earlier Suno rejection → the two supplied Suno results. No final title, release date, output BPM, lyrics, or preferred version is invented.

## Original seed upload is still pending

The public story and both external Suno links work independently. The seed waveform comes from the real attached MP3, but playback stays disabled until the original file is reachable as audio. No substitute recording or corrupt text placeholder has been uploaded.

Add `suno_62bpm_4bar.mp3` to `media/projects/2026/09/from-sample-to-song/`, then change `source.uploadStatus` in `project.json` to `uploaded`.

- Size: 374326 bytes
- SHA-256: `c1c8fae9853fa79d8d03cfaf515fd746833d4661f6e688592ce600df4cb0985d`
- Measured duration: 15.56898 seconds; stereo MP3, 44.1 kHz
- 62 BPM and four bars are labels from the supplied filename, not measurements of either Suno output.

The original is preserved in the ChatGPT attachment and ZIP. The exact-file test is explicitly skipped only while the source is declared pending and is absent; it checks the complete original hash whenever the file exists. Once marked uploaded, any later missing file fails the test.

## Player and publishing contract

Use CMDContinuousPlayback and the universal dock, not a separate ended/next queue. The first waveform tap creates and starts its controller in the same gesture. Page load does not seize playback; revisiting a seed already playing delegates to the existing owner. The two full versions are external Suno links, not invented local catalog entries. Do not make this short seed the newest finished-song radio release.

The production diary is announced through an ordinary public-feed experiment entry, outside release-manifest generated regions. The project route and its static update preview belong in the sitemap.

## Checks

Run `node --test from-sample-to-song/page.test.cjs`, `node --test tests/playback-sync.test.js`, and Site checks. The focused tests use a shared-player contract stub, not the full production engine. Browser/phone playback and actual deployed status must be stated separately from code/CI status.

The offline preview in the ChatGPT ZIP contains native-audio demo code: do not deploy that standalone adapter. Only this production page uses the shared site player.

## Future entries

Add a dated entry above the September 9 entry in `index.html#updates`. Keep the seed and both original links. Update `project.json` with verified new recordings or version facts. Use the existing release-manifest workflow when a genuine playable release is ready.

No Generative.download repository or unpublished DAW package is changed by this diary.
