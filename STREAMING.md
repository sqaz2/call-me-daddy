# Streaming media foundation

The public player URLs stay under `/media/...`. A selective Worker now runs only for audio and video files and provides proper single-range HTTP responses.

## Current delivery

- Full requests stream from the existing bundled static assets.
- `Range: bytes=...` requests return `206 Partial Content`, `Content-Range`, and only the requested bytes.
- Invalid or multiple ranges return `416 Range Not Satisfiable`.
- Existing page, player, share, and SoundCloud URLs do not change.

The bundled fallback buffers one media file inside the Worker before slicing it. That is suitable as the immediate compatibility layer for the current catalog, but R2 is the scalable source as the catalog and invited-artist collection grow.

## Gradual R2 migration

The Worker already checks an optional R2 binding named `MEDIA_BUCKET` before the bundled asset fallback. Objects use the same key as the public URL without its first slash; for example:

```text
Public URL: /media/songs/2026/08/anti-generative-ai-diss/audio.mp3
R2 key:     media/songs/2026/08/anti-generative-ai-diss/audio.mp3
```

After the Cloudflare bucket exists, add its binding to `wrangler.jsonc`:

```jsonc
"r2_buckets": [
  {
    "binding": "MEDIA_BUCKET",
    "bucket_name": "call-me-daddy-media"
  }
]
```

Files can then move one at a time. A missing R2 object automatically falls back to the bundled asset, so migration does not require changing song data or breaking old Facebook links.

## Invited anti-AI tracks

`data/anti-ai-collection.js` is the collection source of truth. The first four records belong to the Call Me Daddy run. Future guest records should keep a distinct creator name, original source link, cover permission, and either a hosted `/media/community/...` path or an external listening page.

The public page intentionally does not accept anonymous uploads. Turning submissions on later requires a moderation decision, permission/credit fields, durable metadata, and storage limits before an upload form is safe to publish.
