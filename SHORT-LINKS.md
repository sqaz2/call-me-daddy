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

## Domain activation through the existing publisher

The main `call-me-daddy` Worker handles short domains before serving assets.
`wrangler.jsonc` attaches `hiphop.bid`, `dubstep.bid` and `https.fyi` through the existing Git
publisher. Verify successful deployment and the live workflow before claiming
any domain is active. A ChatGPT Cloudflare connection is not required.

The initial `https.fyi` attachment failed. The owner supplied the PR #58 production log:
Cloudflare error 100117 says that hostname already has externally managed DNS
records (A, CNAME, etc.). The owner confirmed removal of the conflicting apex
`A @ 192.0.2.1` record before this attachment was re-enabled. The separate `www`
record was left alone. Check existing
redirect rules if readiness still returns a redirect after attachment.
The domains must be active zones in that Cloudflare account, and the existing
build credential must permit their attachment. Existing conflicting DNS or
redirect rules may still need attention in Cloudflare's dashboard.

The main Worker uses the bundled registry from the same publication as the site,
so future releases and their short links update together. The optional standalone
`wrangler.short-links.jsonc` remains available only for a deliberate separate
service deployment; do not deploy both configurations against the same domains.

`Song domain activation` verifies configured short HTTPS hosts, the readiness revision,
V6 and earlier-version redirects, Cheap to Inform, destination pages and unknown
links after relevant main changes or a manual run. Domains awaiting attachment are
explicitly reported as pending. Use `node scripts/check-song-links-live.mjs --all`
to check all three regardless of configuration. A failed verification is not proof of a site outage;
inspect the existing Cloudflare build and domain status for the specific cause.

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
