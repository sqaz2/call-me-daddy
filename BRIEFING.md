# Homepage briefing

The homepage daily briefing is intentionally data-driven.

## Add an update

Edit `data/briefing.js` and add a new object at the top of `entries`.

Required fields:

- `id` — unique stable slug
- `published` — ISO timestamp with offset
- `type` — short label such as `New song`, `Experiment`, `Archive`, `Site update`
- `title`
- `summary`

Optional fields:

- `href`
- `cta`
- `badge`

The homepage automatically groups the newest publication date into the visible daily briefing. Older entries can stay in the data file without crowding the front page.

Use the `America/Edmonton` timezone for publication grouping so “today” stays consistent even when visitors are elsewhere.

## What belongs here

Use the briefing for meaningful public changes:

- a new song or alternate version
- a new old-file discovery or archive context
- a new interactive release
- a new listening route
- a meaningful site/player change

Do not turn it into a Git commit log. The briefing is the human-facing story of what changed.
