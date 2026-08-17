# Adding songs to Call Me Daddy

The main catalog lives at `/music/` and is generated from `/data/songs.js`.

## Keep special projects separate

`/cut-from-the-same-fabric/` has custom three-track sequencing and its one-way crossfade. Do not add ordinary catalog songs to that player.

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

When songs are supplied through ChatGPT, the intended workflow is to place them in the correct dated folder and update `/data/songs.js`; you should not need to manually reorganize files afterward.

The catalog player includes missing-image and missing-audio fallbacks so one bad asset does not break the whole page.
