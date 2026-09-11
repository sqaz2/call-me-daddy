# Homepage discovery and sharing audit — September 11, 2026

The owner could not reliably find songs and asked for song search among the first
visible elements. They also requested short links inside share messages, plus
The Musician Police at /50 and Thirty Six at /36, confirming no legacy numbers
had been shared.

## Findings and changes

- The homepage led with a large project image, introductory prose and nine
  competing actions. Replaced that entrance with a labelled search field,
  category filters, four compact recent-song suggestions and a full catalog view.
- Search lived on the Music page, with no homepage entry. The homepage now uses
  the complete merged catalog and the existing lyric index. It matches title,
  lyrics, aliases and version names; title matches rank ahead of prose matches.
  Apostrophes, accents and punctuation no longer prevent simple matching.
- Alternate recordings were hard to distinguish. Search results expose a version
  drawer with exact song/version destinations. Song titles open their existing
  experiences; versions retain their own catalog-player routes.
- Release cards occupied nearly a screen each on mobile and duplicated the
  update briefing. Cards are compact, the briefing follows releases, recent
  listening appears below discovery, and the duplicated radio sidebar is removed.
  Homepage artwork is static; videos stay on their song pages.
- The homepage had no direct newest-first play action. It now reuses the existing
  latest-release player, including first-gesture playback and persistent audio.
- Native share buttons often sent the URL only as a separate field. They now put
  the short URL in the message text. Native payloads omit the separate URL field
  to avoid duplicate links when receiving apps concatenate fields. Copy and
  text-based social buttons use the same message; existing creative text remains.
- All 59 song numbers and 83 recording destinations were checked for uniqueness
  and correct targets. The requested reassignment is explicit below; every other
  number is retained. Version slots are unchanged.

| Song | Previous number | Requested/current number |
| --- | --- | --- |
| Thirty Six | 50 | 36 |
| The Musician Police | 48 | 50 |
| One Million Dollars | 36 | 48 |

This is an owner-authorized one-time reassignment before public sharing.
Subsequent releases retain the normal append-only numbering policy.

## Verification

Node tests check number uniqueness, song destinations, exact recording mapping,
and message preparation with one correct link. Mobile Chromium checks search
visibility, complete catalog browsing, title and lyric searches, version links,
category filters, empty results, horizontal overflow and newest-first playback.
Sharing checks cover page buttons, the active dock, clipboard text and social
messages, including when short domains are unavailable. Screenshots are saved
with the existing browser-check artifacts. Browser tests do not prove playback
on a physical phone.
