# Full-site listening and navigation audit — September 11, 2026

The owner approves the homepage and gets lost on Music and What Changed. The
question is whether those screens still have distinct jobs now that Home has
complete search and discovery.

## Inventory and findings

The repository scan covered 100 public HTML pages, excluding media experiments
and build/dependency folders. It found 110 generic Music links and 103 Updates
links. All root-relative local anchor and asset paths in those pages existed.
This is a local target check, not a claim about every external service or network.
The permanent-link registry covers 59 song identities and 83 recordings.

| Area | Finding | Decision |
| --- | --- | --- |
| Home | Complete title, lyric and version search already works; the extra catalog link duplicates it | Make Home the one browsing destination |
| Music | Introduction, external links, intention grid, lineages, taste rail and a second search compete before songs; a separate player UI adds another set of controls | Generic visits return to Home; exact song/version and radio routes become focused listening screens |
| Latest / Updates | Oversized heading, explanatory prose and three statistics delay the first useful release; mixed site notes and three competing card actions obscure listening | Compact title, Play newest first, release search, Music/Site notes filter, 12 entries at a time, direct release cards and sharing |
| Homepage briefing | Repeats the newest release already shown above it and reintroduces What Changed vocabulary | Replace the duplicated briefing with All releases |
| Song pages | Individual visuals, lyrics and production stories add value and are the landing targets of numbered links | Preserve their identity and content; browsing links now return to Home search |
| Alternate versions | Existing exact URLs are required for old/new comparisons and short-link slots | Keep those URLs and show the requested title/version before play; optional Other versions and Lyrics sections |
| Radio | It remains a useful listening action, while its large control panel duplicates discovery | One Play this mix action; moods available in a disclosure; retain sequencing and repeat controls |
| Archive / collections | These organize source recordings, personal history and intentionally related songs | Retain the collections and sequencing rather than flattening them into generic browsing |
| Persistent player | Recent history, break/undo, exact source identity and owner survival are important existing behavior | Reuse the universal dock for focused Music playback; keep one media owner and verify browsing during audio |
| Sharing | Native share text contains the short URL; canonical pages and generated previews remain useful | Preserve numbers, versions and share messages; keep generators consistent with navigation |
| Mobile | First useful content is too far down on the two legacy entry screens | Bring the first release onto the initial viewport and test selected-version controls at 390 × 844 |

## Resulting visitor paths

- Find a song: Home search → song story or selected recording → persistent player.
- Discover new music: Home latest cards → All releases → open a release or Play newest first.
- Explore versions: song search result → Other versions → exact recording, one Play action.
- Let music continue: Surprise me → Play this mix → radio and the same player.
- Explore history: Archive → deliberately grouped source/rework or collection pages.

There is no separate Music browsing destination in the navigation. Its route
continues to serve old exact links, radio links and version comparisons. Old
catalog logic remains underneath the focused view to preserve its tested audio,
intention, version, taste and sequencing behavior; its competing presentation is
not displayed. A future engine consolidation should be driven by playback
regressions and migration tests, not another visual rewrite.

## Validation and limits

Required checks cover all existing playback and release tests, generic Music
redirects with search preservation, exact URL preservation, latest search and
sharing, an initial-screen release, first-tap exact-version audio, a single dock,
Home browsing while that audio continues, and first-tap radio. Screenshots of
Latest and a selected alternate version are kept with browser-check artifacts.

No lyrics, artwork, audio, numbered links or protected sequence order were
changed. Physical-phone and assistive-technology testing remain separate from
mobile Chromium automation. The audit does not certify all pages as WCAG AA.

## Further work should follow observed need

1. Collect the owner's phone feedback on playback, particularly rapid skips,
   backgrounding and return navigation; the new discovery layout cannot prove
   those platform behaviors.
2. If people still lose track of versions, improve the song page's version labels
   using actual recordings before adding recommendation controls.
3. If field measurements show slow starts, investigate the affected media delivery
   path. A framework migration or adaptive streaming is not justified by this
   navigation audit.
