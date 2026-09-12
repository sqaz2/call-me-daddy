# Song artwork, favicons and social previews

The original failure was server-side: numbered version links redirect to `/music/?song=...&version=...`, but the raw player HTML advertised Cut From the Same Fabric and canonicalized every version to `/music/`. A JavaScript-only metadata update cannot repair what a non-JavaScript sharing crawler reads.

`worker/site.mjs` wraps the existing routing/streaming Worker. For successful HTML responses only, it writes the selected recording's Open Graph, Twitter, canonical and artwork icon tags into the HTTP response. It does not modify the player body, audio, video, queue, short-link numbers or media delivery. All callers receive the same HTML; there is no crawler-only content.

`node scripts/build-song-social.mjs` reads the existing authoritative catalog through `loadCatalog()`, plus the dedicated HTML pages. Wrangler runs it before every build/deployment and generates `data/song-social.json`. Do not hand-maintain another song list. Version artwork wins over family artwork; multi-song project pages retain their project cover. Local artwork gets its real dimensions and a content-hash URL revision so replacements do not reuse an old image URL.

`song-favicon.mjs` updates the top-level tab icon on History API navigation. Hidden playback frames cannot overwrite it. The server-rendered favicon still works with JavaScript disabled.

Checks: `node --test tests/song-social-unit.test.mjs tests/song-social-catalog.test.mjs`; the Song artwork workflow also checks existing playback/streaming/short-link regressions, runs a real touch-browser against Wrangler, and checks public raw HTML and image responses after publication.

Facebook can retain a previously scraped preview even after deployment. Its Sharing Debugger can refresh a URL's cached metadata. Production HTTP checks do not prove that Facebook has refreshed an existing composer draft or every old shared post.
