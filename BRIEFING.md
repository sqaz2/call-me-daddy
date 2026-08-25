# Public feed: releases + updates

`data/briefing.js` is the public activity feed for the site.

It now has two jobs:

1. drive the homepage **What Changed Today** briefing;
2. drive the featured release cards and the full `/updates/` history.

The catalog itself remains authoritative for music metadata in `data/songs.js`. Feed entries should point at a catalog song with `songId` instead of copying its title, artist, artwork, audio or description unless the public update deliberately needs different wording.

## Add an ordinary update

Add an object near the top of `entries`:

```js
{
  id: "short-stable-slug",
  published: "2026-08-25T12:00:00-06:00",
  type: "Site update",
  title: "Human-facing headline.",
  summary: "What changed and why somebody should care.",
  href: "/where-it-goes/",
  cta: "Open it",
  badge: "Optional badge"
}
```

## Add a song/release update

Prefer a catalog reference:

```js
{
  id: "release-example",
  published: "2026-08-25",
  type: "New release",
  songId: "catalog-song-id"
}
```

The update page will inherit the song title, artist, description and release/experience link from `data/songs.js`.

To feature it in the large homepage release grid, add:

```js
featured: true,
featuredOrder: 1,
cardClass: "optional-existing-style-class",
cardLines: ["LINE ONE", "LINE TWO"],
cardTag: "Short label",
cardSummary: "Optional shorter card copy"
```

Use `cover`, `video` or `href` only when the update intentionally differs from the linked song metadata. Project-level releases may reference the closest catalog song while overriding the public project title/link.

## Dates

Use `America/Edmonton` for timestamps.

Accepted forms:

- exact timestamp: `2026-08-25T12:00:00-06:00`
- exact known day: `2026-08-25`
- known month only: `2026-08`

Do not invent an exact day for historical material. Month-only items render as `Exact day not recorded` in `/updates/`.

## What appears where

- Homepage daily briefing: every feed entry on the newest exact day.
- Homepage release grid: entries with `featured: true`, ordered by `featuredOrder`.
- `/updates/`: every feed entry, grouped by date.
- Stable share URL: `/updates/#ENTRY_ID`.

The homepage also computes collection counts from `data/songs.js`; do not type song/version counts into feed data.

## Editorial rule

This is not a Git commit log. Include changes a listener could care about:

- a new song or alternate version;
- a new old-file discovery or archive context;
- a new interactive release;
- a new listening route;
- a meaningful player/site change.

Tiny implementation fixes stay in GitHub history, not the public feed.
