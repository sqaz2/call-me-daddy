# Cheap to Inform — September 11, 2026

- Page: `/cheap-to-inform/`
- Manifest: `content/releases/2026-09-11-cheap-to-inform.json`
- Suno source supplied by the artist: https://suno.com/s/Gn6OwZiICiZD9qjd
- Editorial category: **Scene study · Fictional perspectives**, not autobiography.
- Contrast: Survival Mode / Still Building is **Personal · Lived experience**.

## Editorial contract

The real-world starting point is the public estrangement of Elon Musk and his daughter, Vivian Jenna Wilson. The artist is imagining a movie scene, not their private conversation. Neither character is asserted to represent that real person's motivations. The page separates source context from the artist's interpretation, makes no claim of a staged estrangement or equal responsibility, and does not suggest that wealth creates an obligation to maintain a relationship.

The artist's uncertainty about not being a parent remains in the first-person note. Do not reframe that as privileged objectivity.

The two refrain lines supplied by the artist remain exact:

> huge audiences are cheap to mobilize and expensive to inform.
>
> pick a team, punish the other one, feel informed.

The full released Suno lyrics were not independently retrieved. Do not silently publish the earlier writing draft as verified released lyrics. The page currently quotes only the artist-supplied lines used in its story.

## Supplied media

The three files were uploaded together in commit `ffbe30255a31f68dfa4bb005c2d9edb098f198b3`. Dated release paths reuse their exact Git blobs. Original uploads remain untouched.

| Original | Release path | Git blob SHA |
| --- | --- | --- |
| Cheap to Inform.mp3 | media/songs/2026/09/cheap-to-inform/audio.mp3 | 7251ce4298721a5e9586ee6f9ae1262faa03b1e0 |
| 29069.jpeg | media/songs/2026/09/cheap-to-inform/cover.jpg | b2acb75543208c3836faa626122586ab01d610eb |
| gemini_generated_video_980e7067.mp4 | media/songs/2026/09/cheap-to-inform/background.mp4 | da9fb3fd64859a029134c7eebd872adbb1f840db |

## Playback and checks

Use the existing CMDContinuousPlayback + CMDUniversalPlayer ownership and queue. An initial artwork tap calls load synchronously. Revisits adopt the actual playing source without restarting. Decorative video is muted, lazy-loaded on playback, disabled initially for reduced-motion/data-saving preferences, and can be switched off. Backgrounding pauses video but leaves the shared audio owner alone.

Run `node --test cheap-to-inform/page.test.cjs`, the shared playback tests and `node scripts/sync-releases.mjs --check`. Unit tests are not physical-phone audible verification.
