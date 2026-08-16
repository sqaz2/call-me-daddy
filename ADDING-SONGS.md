# Adding songs to Call Me Daddy

The main catalog lives at `/music/` and is generated from `/data/songs.js`.

## Keep special projects separate

`/cut-from-the-same-fabric/` has custom three-track sequencing and its one-way crossfade. Do not add ordinary catalog songs to that player.

## New media layout

For new releases, use a folder per song:

```
/media/songs/song-slug/audio.mp3
/media/songs/song-slug/cover.jpg
```

Existing Cut From the Same Fabric files remain at the repository root so current URLs do not break.

## Add one catalog entry

Add one object to `/data/songs.js`:

```js
{
  id: 'song-slug',
  title: 'Song Title',
  artist: 'Call Me Daddy',
  year: 2026,
  project: '',
  description: 'Short description.',
  audio: '/media/songs/song-slug/audio.mp3',
  cover: '/media/songs/song-slug/cover.jpg',
  experience: '',
  kind: 'song'
}
```

`experience` is optional. Use it when a song has a custom page or interactive release.

The catalog player includes missing-image and missing-audio fallbacks so one bad asset does not break the whole page.
