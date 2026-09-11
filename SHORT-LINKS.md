# Permanent song share links

Use `hiphop.bid` for hip-hop, `dubstep.bid` for dubstep and `https.fyi` for
everything else. All three domains resolve the same permanent numbers.
Survival Mode's Suno V6 remix is `/1`; its earlier recording is `/1/2`.
The default version of a song uses `/NUMBER`; other versions use
`/NUMBER/VERSION_SLOT`. Slots and song numbers are never recycled.

The append-only assignment registry is `content/song-links.json`. Run the normal
`node scripts/sync-releases.mjs` workflow after adding music. It appends numbers,
generates `data/song-links.json`, bundles a fallback map for the redirect service,
and updates the generated resolver in `share.js`. Edit the resolver source in
`short-links/runtime.js`, not its generated prefix.

Sharing uses the actual recording's audio identity when available. Alternate
versions and ambiguous collection pages go through the exact catalog player
route, which cues the selected song/version and then continues radio. Dedicated
single-song pages remain the destination for unambiguous singles. Editorial
collection/update links without a unique song remain unchanged.

## One-time activation

The redirect service is separate from the music-site deployment so missing new
domain setup cannot take the existing site offline. Once all three zones are
active in the same Cloudflare account, deploy:

```sh
npx wrangler deploy --config wrangler.short-links.jsonc
```

The configuration attaches only the three requested custom domains. Check for
existing DNS/redirect rules on those hosts first; replace only rules that would
intercept this requested music short-link service. Do not alter mail records.

Then verify HTTPS on all three domains, the public JSON response at
`/.well-known/music-links`, `/1`, `/1/2`, a single-song link, and an unknown number
(404). Verify the destination actually cues the selected recording. The root
of each short domain redirects to the existing music catalogue.

The redirect Worker reads the latest map from the music site's public
`/data/song-links.json` (up to 60 seconds of cache), with a bundled snapshot if
the main site is temporarily unreachable. New songs therefore need only the
normal music-site publication, not new DNS records or manual redirects.

The browser checks domain readiness before the share gesture and uses a domain
only when its published registry revision matches. An inactive, redirected,
unreachable or stale domain never replaces a working existing share URL.
If a genre domain is unavailable, an active `https.fyi` is preferred.
Reload the page after activating the service to start using short URLs.

## Checks

```sh
node scripts/sync-releases.mjs --check
node --test tests/song-links.test.mjs tests/playback-sync.test.js
```
