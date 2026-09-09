# From sample to song — draft project page

**Status: draft branch only. Do not treat this as a live release.**

This is a living MusicSubject × Call Me Daddy production diary, not a final song title or an additional finished-song catalog entry. Planned route: `/from-sample-to-song/`.

## Facts preserved

The user's September 9, 2026 account: they built the DAW at generative.download, sampled their last song Satan's.loan in its drum machine, used Grok to add a recognizable beat after Suno rejected the earlier audio, and obtained the two Suno results linked on the page. Do not state that we know Suno's technical rejection reason. Do not invent titles, lyrics, BPM or durations for the two outputs.

The attached seed is `suno_62bpm_4bar.mp3`. Its label supplies 62 BPM/four bars; ffprobe reports 15.56898 seconds, stereo MP3 at 44.1 kHz. The waveform is measured from this file. It is not an isolated untouched sample from Satan's.loan or either full Suno result. `project.json` records its expected size and SHA-256.

## Blocking before publication

1. Add the original attached MP3 at `media/projects/2026/09/from-sample-to-song/suno_62bpm_4bar.mp3`. It is present in the accompanying ChatGPT ZIP/local preview, **not yet uploaded to this branch**. The required size is 374326 bytes and SHA-256 is `c1c8fae9853fa79d8d03cfaf515fd746833d4661f6e688592ce600df4cb0985d`. Never upload the filename, a pointer, base64 text masquerading as audio, or a replacement recording.
2. Run `node --test from-sample-to-song/page.test.cjs` after adding the MP3, plus `node --test tests/playback-sync.test.js` and the existing Site Checks. The MP3 provenance test intentionally fails while that asset is missing.
3. Test the real production shared player: first waveform tap; returning while the seed already plays; next/previous, radio continuation, page following, source error, opening Suno, sharing, and phone/iframe ownership. The local preview is not proof of these integrations.
4. Add a project/experiment entry to the public briefing/homepage and sitemap using the existing project/update workflow, without hand-editing generated release blocks. Do not count a 15-second seed as a new finished song or make it the newest full-song radio release.
5. Once approved for publication, remove `noindex` and the corresponding draft-only test assertion. Merge/deploy through the usual site workflow, then verify the actual domain.

The two Suno shortlinks could not be fetched from this research environment. They are kept as explicit external listening links; no audio URL, song title or final-version preference was guessed. Replace them with integrated variants only after obtaining the user's actual full recordings or verifiable media sources.

## Playback and editing

The production page uses `CMDContinuousPlayback` and the existing universal dock. Controller creation is lazy and playback occurs within the first gesture. A returning listener delegates to the same-origin top-level owner when that seed is already playing. There is no independent ended/next queue or autoplay on page load. Missing audio produces a clear unavailable state rather than an enabled broken player.

The local preview embeds the unchanged MP3 and uses a clearly labelled native-audio adapter. Do not copy that preview adapter into the website. Its global fetch adapter exists only to make the self-contained preview independent of a server.

For the next update, add the new dated entry above the September 9 entry in `index.html#updates`; keep the seed and first links intact. Update `project.json` when additional version/source facts are known. Use the normal `content/releases/` manifest and sync process once a genuine playable release is ready. Preserve the user's wording and do not invent milestones.

## Validation actually completed

Twelve focused Node checks passed locally with the original MP3 present. The tests use a shared-player contract stub, not the complete production engine. Eleven offline Chromium checks passed for the standalone preview, including 320/390/688/1280px layouts, the two exact links, native decoding/advancing the attached MP3, play/pause, one audio element and footer clearance above its preview dock. Browser file navigation was blocked; preview content was loaded directly into Chromium for those checks. Full repository Site Checks, production universal-player integration and a physical phone were not tested.

No files in either Generative.download/Generative-download repository or the unpublished DAW package were changed by this page work.
