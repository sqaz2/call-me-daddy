# Adding songs to Call Me Daddy

## Current workflow

For every release dated September 2, 2026 or later, use [RELEASE-WORKFLOW.md](RELEASE-WORKFLOW.md). Create one record in `content/releases/` and run `node scripts/sync-releases.mjs`; do not hand-edit the generated blocks in `data/songs.js`, `data/briefing.js`, `data/radio-intents.js` or `sitemap.xml`.

The instructions below document the older catalog entries and special collections that predate the manifest workflow.

## Keep special projects separate

`/cut-from-the-same-fabric/` has custom three-track sequencing and its one-way crossfade. Do not insert ordinary catalog songs into that three-track sequence. After the sequence finishes, the shared playlist tail takes over and continues through intention radio.

## Media layout by year and month

Songs are organized by release year, release month, then song slug:

```
/media/songs/YYYY/MM/song-slug/audio.mp3
/media/songs/YYYY/MM/song-slug/cover.jpg
```

Example:

```
/media/songs/2026/08/find-your-people/audio.mp3
/media/songs/2026/08/find-your-people/cover.png
```

Special project-only media can use the same date pattern under `/media/projects/`:

```
/media/projects/YYYY/MM/project-slug/cover.png
/media/projects/YYYY/MM/project-slug/video.mp4
```

## Add one catalog entry

Add one object to `/data/songs.js`:

```js
{
  id: 'song-slug',
  title: 'Song Title',
  artist: 'Call Me Daddy',
  year: 2026,
  month: 8,
  project: '',
  description: 'Short description.',
  audio: '/media/songs/2026/08/song-slug/audio.mp3',
  cover: '/media/songs/2026/08/song-slug/cover.jpg',
  experience: '',
  kind: 'song'
}
```

`experience` is optional. Use it when a song has a custom page or interactive release.

## Keep aliases and remixes under one song identity

Different filenames do not automatically mean different songs. Put alternate titles in an `aliases` array and put playable remixes in `variants`. For example, `Make Me an Animal`, `Make Me Animal`, and `Animal Day` belong to one catalog entry; each actual uploaded mix belongs under that entry instead of inflating the song count.

## YouTube-only songs

A song does not need to be re-uploaded as an MP3 if it already lives on YouTube. Add `youtubeId` and `youtubeUrl`, leave `audio` empty, use the YouTube thumbnail as `cover`, and point `experience` to a dedicated `/youtube/VIDEO_ID/` page. In the catalog, local-audio artwork starts the custom bottom player; artwork for a YouTube-only release opens its song page instead. YouTube pages use the privacy-enhanced embed and attempt to pull the public title/channel through YouTube oEmbed at runtime.

## Every song page gets sharing

Any dedicated song or release page must include the reusable share controls so visitors can send it directly to Facebook, X, WhatsApp, Bluesky, Reddit, Telegram, copy the link, or use their device share sheet.

In the page `<head>` include:

```html
<link rel="stylesheet" href="/share.css">
```

Place this where the share controls should appear:

```html
<div data-share
     data-share-label="Share this song"
     data-share-title="Song Title — Call Me Daddy"
     data-share-text="Short share message."></div>
```

Then load this near the end of the page:

```html
<script src="/share.js"></script>
```

The component uses the page canonical URL and Open Graph metadata by default, so every song page should also have accurate canonical, `og:title`, `og:description`, and `og:image` tags.

When songs are supplied through ChatGPT, the intended workflow is to place them in the correct dated folder (or create the YouTube-backed entry), update `/data/songs.js`, create/update the dedicated release page when appropriate, include sharing, and update the sitemap; you should not need to manually reorganize files afterward.

The catalog player includes missing-image and missing-audio fallbacks so one bad asset does not break the whole page. Keep the interaction artwork-first: the image starts playback and the bottom dock handles play/pause and seeking rather than exposing a native audio control bar inside each card.

The main catalog renderer automatically adds a direct **Share song** control to every card. Version collections should also expose a share control beside each version. Use the exact-song URL contract so the recipient gets that song/version first and the radio continues afterward:

```text
/music/?song=SONG_ID&version=VERSION_ID&intent=INTENT&share=1
```
