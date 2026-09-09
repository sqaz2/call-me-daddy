# Original seed audio — upload pending

Place the original `suno_62bpm_4bar.mp3` from the user's ChatGPT attachment in this directory. Do not substitute a different recording or encode a text file with an MP3 extension.

Expected size: 374326 bytes.
SHA-256: `c1c8fae9853fa79d8d03cfaf515fd746833d4661f6e688592ce600df4cb0985d`.

After the actual binary is committed, set `source.uploadStatus` to `uploaded` in `/from-sample-to-song/project.json` and run the production diary checks. The page checks this path itself and enables source playback only after it receives a successful audio response.

The public production diary and its two external Suno results can be used before this original seed is uploaded.
