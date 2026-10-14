# MusicSubject — Play Store preparation

Prepared October 14, 2026. This is a submission kit, not a published Play listing.

## Listing copy

**App name:** MusicSubject

**Short description:** Discover new music, alternate versions and your next favourite song.

**Full description:**

Find your next song with MusicSubject, the music home of Call Me Daddy.

Explore new releases, rediscover older recordings, and choose between alternate versions of the same song. Start with the newest music or let Surprise Me take you through the catalogue.

• Browse artwork, search songs and filter by style.
• Choose the recording you want, including alternate mixes and versions.
• Save favourite songs on your device.
• Control playback with a dedicated player, a listening queue and Android media controls.
• Open the stories behind the music in your browser.
• Get catalogue updates when new songs are published, without reinstalling the app.

Music streams over the internet. Offline song downloads are not included. Saved songs stay on this device and do not sync with the website. Some recordings contain explicit language and mature themes.

**Category:** Music & Audio

**Website:** https://callmedaddy.musicsubject.com/app/

**Privacy notice:** https://callmedaddy.musicsubject.com/app/privacy/

**Release notes for 0.1.1:**

Introducing the MusicSubject Android beta: a live song catalogue, alternate versions, saved songs and a dedicated listening queue. This update adds a custom MusicSubject launcher icon and app privacy information.

## Files

- `MusicSubject-0.1.1.aab` in the accompanying release kit: signed bundle for Play Console, package `com.musicsubject.player`, version code 2.
- `icon-512.png`: 512 × 512 store icon, opaque PNG.
- `feature-graphic-1024x500.png`: store feature graphic, opaque PNG.
- `ui-preview-home.png`, `ui-preview-player.png`: genuine HTML interface renders using the production catalogue and a mocked native playback bridge. These previews demonstrate layout; replace them with screenshots captured from the installed Android app before submitting the listing. They are not evidence of device playback tests.

## Account owner steps

1. Sign in to https://play.google.com/console/ and complete the developer account and identity/device verification requested by Google. Supply a public support email you want associated with MusicSubject; no personal account email has been inserted into this draft.
2. Create the MusicSubject app and set its language, free pricing and Music & Audio category. Confirm the audience and content rating based on the actual catalogue, including explicit lyrics and mature themes. Do not mark it as designed for children without a separate review.
3. Configure Play App Signing using the **existing MusicSubject app signing key** if website and Play installations are to update one another. Follow Console's encrypted key-import flow using the private signing backup. Do not publish that backup or commit it to GitHub. The certificate SHA-256 is `70:8D:14:B4:CD:8F:8B:2E:5A:8D:E2:A0:A1:F5:9B:89:1C:AF:BE:71:F9:5F:D1:3B:0E:85:8F:30:CE:FE:79:7F`. Choosing a different Google-generated app signing key creates a cross-channel update mismatch. A separate upload key can be configured after onboarding.
4. Upload the AAB to an internal test first, complete listing assets and provide phone screenshots. Run the physical-device checklist in `android/README.md`, especially screen-off track transitions, media controls, audio interruptions and updates over 0.1.0. Review the Play pre-launch report.
5. Complete App access (no sign-in required), Ads (no advertising SDK in this build), Data safety, privacy and foreground-service declarations. The service is `mediaPlayback`: the listener starts playback and Android media controls expose the running player. Provide the demonstration requested by Console. Data safety must account for hosting logs as well as app code; do not automatically answer “no data collected” merely because there is no analytics SDK. Confirm hosting retention and the public privacy contact before submission.
6. If this is a personal developer account created after November 13, 2023, run a Play closed test with at least 12 testers continuously opted in for 14 days, then apply for production access. Direct APK downloads from the website do not substitute for this Play opt-in requirement. Record actual tester feedback; do not invent it for the application.
7. Submit for Google review when the required account, app-content and testing steps are complete. Add the Play badge to the website only after the listing is live.

## Current verification

The owner reported successful installation and basic use of version 0.1.0. Automated catalogue and browser tests cover refreshed releases, queue commands, recording identity and saved songs. Full physical-phone, lock-screen and Bluetooth verification remains pending. Beta status is shown on the website.

## References checked October 14, 2026

- Testing requirements: https://support.google.com/googleplay/android-developer/answer/14151465
- App signing and cross-store key choice: https://developer.android.com/studio/publish/app-signing
- Listing assets: https://support.google.com/googleplay/android-developer/answer/9866151
- Android developer verification and regional rollout: https://developer.android.com/developer-verification

Verification currently starts with participating stores in Brazil, Indonesia, Singapore and Thailand, with broader rollout planned for 2027. Check the live guidance when registering this package for distribution. This release kit does not complete identity verification or Google review.
