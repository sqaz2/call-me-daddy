# Permanent song share links

Use `hiphop.bid` for hip-hop, `dubstep.bid` for dubstep, `dnb.fyi` for drum and
bass, and `suno.fyi` for everything else. Satire and joke songs prefer
`jokes.win`, across genres. All five share domains resolve the same permanent numbers.
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

## DnB classification

Where Monsters Are's DNB Folk Tale recording prefers `https://dnb.fyi/54`.
Its two Monster and Maiden recordings retain `suno.fyi/54/2` and `/54/3` because
their genres are unconfirmed. The Tune of Magical Song's uploaded Deep Dark
Dubstep Drop Mix remains on `dubstep.bid/49`.

Future songs or variants can set `shareGenre: "dnb"`. Explicit DnB, D&B and
drum-and-bass labels also select the domain automatically. In a song with several
versions, each recording's label is considered separately; mentioning a DnB remix
in the song's description does not reclassify its other recordings. If `dnb.fyi`
is unavailable or its registry is stale, the existing `suno.fyi` fallback applies.

## Comedy classification

Reviewed existing comedy songs are listed by exact song ID in
`content/song-share-categories.json`. This includes 16 songs (17 recordings),
with both cuts of Fuck Everybody But You keeping their own version slots.
New releases can set `shareCategory: "jokes"` on the song or a variant; `music`
opts out. A variant override takes priority, followed by song metadata, the
reviewed assignments, then explicit satire/comedy/parody labels in `kind`.
Personal lyrics, fictional storytelling and reused variant names are not enough
to classify a song as comedy. For example, Will to Live's Namaste, Hamster Requiem
stays outside the jokes category, while the separate Namaste, Hamster song is in it.

The category is separate from musical genre. If jokes.win is unavailable, sharing
falls back to the recording's genre domain, then suno.fyi, then the original page.
Numbers and destinations never change when the category changes.

## Domain activation through the existing publisher

The main `call-me-daddy` Worker handles short domains before serving assets.
`wrangler.jsonc` attaches `hiphop.bid`, `dubstep.bid`, `dnb.fyi`, `suno.fyi` and `jokes.win` through the
existing Git publisher. Verify successful deployment and the live workflow before
claiming a domain is active. A ChatGPT Cloudflare connection is not required.

The owner replaced the general share domain `https.fyi` with `suno.fyi`.
Song numbers, version slots and destinations are unchanged. The old `https.fyi`
custom-domain binding stays attached to preserve its existing DNS and Facebook
homepage forwarding; new song sharing no longer probes or selects that host.
The standalone redirect configuration uses only the five current share domains.

Domains must be active zones in the publishing Cloudflare account. Existing apex
DNS records or forwarding rules may need adjustment before a new host is ready.
The readiness check reports any forwarding destination that intercepts it.

The main Worker uses the bundled registry from the same publication as the site,
so future releases and their short links update together. The optional standalone
`wrangler.short-links.jsonc` remains available only for a deliberate separate
service deployment; do not deploy both configurations against the same domains.

`Song domain activation` verifies configured short HTTPS hosts, the readiness revision,
V6 and earlier-version redirects, Cheap to Inform, DnB and sibling versions, destination pages and unknown
links after relevant main changes or a manual run. Domains awaiting attachment are
explicitly reported as pending. Use `node scripts/check-song-links-live.mjs --all`
to check all five regardless of configuration. A failed verification is not proof of a site outage;
inspect the existing Cloudflare build and domain status for the specific cause.

The browser checks domain readiness before the share gesture and uses a domain
only when its published registry revision matches. An inactive, redirected,
unreachable or stale domain never replaces a working existing share URL.
If a genre domain is unavailable, an active `suno.fyi` is preferred.
Reload the page after activating the service to start using short URLs.

## Checks

```sh
node scripts/sync-releases.mjs --check
node --test tests/song-links.test.mjs tests/playback-sync.test.js
```
