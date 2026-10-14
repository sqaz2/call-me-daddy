# MusicSubject for Android

Installable Android music app with a local listening interface and an Android Media3 playback service. The app reads the production MusicSubject catalogue on launch, on Refresh, and when returning after two minutes. Publishing through the existing song workflow updates the app without rebuilding it.

## Included in 0.1.0

- Artwork-first playback, song search, genre filters, local saved songs and exact version selection.
- Newest-first queue and Surprise Me using the website's existing catalogue radio engine, preserving its protected story sequences.
- Android-owned queue, foreground playback, media notification, lock-screen/headset controls, audio focus handling and headphone-disconnect pause.
- Seek, previous/next, Up next, sharing and links to existing song stories.
- Last queue and position restored after process death, paused until the listener presses Play.
- Cached catalogue for browsing during connection problems. Songs still stream; no offline downloads.

This is a dedicated listening interface, not a pixel-for-pixel wrapper of every website page. Song stories and interactive site experiences open in the default browser; those pages do not receive the native bridge. Saved songs belong to this app and do not sync with the website's My Music storage. The app uses the existing catalogue scripts; if future releases move the catalogue to a new URL/module, update `catalog-loader.js`.

## Build

Requirements: JDK 17, Android SDK platform 36, build tools 35.0.0. Android 8.0 or later, with an up-to-date Android System WebView.

```sh
cd android
./gradlew assembleDebug lintDebug
```

`app/build/outputs/apk/debug/app-debug.apk` installs as `com.musicsubject.player.preview`; CI publishes it as a GitHub Actions artifact. Debug signing is for previews and is not the production app identity.

For the signed app (`com.musicsubject.player`), restore the private MusicSubject Android signing backup and provide:

- `MUSICSUBJECT_KEYSTORE`: absolute keystore path
- `MUSICSUBJECT_STORE_PASSWORD`: private store password
- `MUSICSUBJECT_KEY_PASSWORD`: private key password

Alias: `musicsubject`. Then run `./gradlew assembleRelease lintRelease`. Preserve this signing key for every update and increment `versionCode`. Never commit the keystore or passwords. The first signed installer and the private signing backup are retained separately from the source repository.

## Validation

```sh
node --test android/tests/catalog.test.cjs
node --test tests/playback-sync.test.js
node --test tests/*.test.js tests/*.test.mjs
node scripts/sync-releases.mjs --check
```

`android/tests/browser-check.cjs` uses Playwright. It checks the 393 × 852 interface, loading the repository catalogue, passing playback commands, rendering native next-track state, favourites, search, a newly published song appearing on Refresh, and cached-catalogue retention after a network failure. Set `NODE_PATH` to the Playwright install and optionally `CHROME_PATH` to an existing Chromium executable. The bridge is mocked in this test; it does not establish real Android audio playback.

Before calling the app device-verified, install the signed APK on a phone and check:

1. Tap artwork once; verify the actual audio, title, version and artwork agree.
2. Lock the screen, wait across the end of a short song, and verify the next recording plays with updated metadata.
3. Use lock-screen and Bluetooth play/pause/next/previous, including rapid skips.
4. Switch apps and rotate the phone; return and verify queue and position are preserved.
5. Unplug headphones, receive an audio interruption, and verify pause/focus handling.
6. Interrupt the network and retry, then refresh the catalogue while music is playing.
7. Close/reopen the activity while playing, and stop/restart the process to check paused restoration.

A compiled APK, lint, and mocked browser tests do not substitute for this phone test. No physical-device or Android-emulator playback test was available during the initial build.
