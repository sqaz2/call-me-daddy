const RANGEABLE_MEDIA = /\.(?:aac|flac|m4a|mp3|mp4|ogg|wav|webm)$/i;

const withStreamingHeaders = response => {
  const headers = new Headers(response.headers);
  headers.set('accept-ranges', 'bytes');
  headers.set('x-content-type-options', 'nosniff');
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
};

const rangeNotSatisfiable = size => new Response(null, {
  status: 416,
  headers: {
    'accept-ranges': 'bytes',
    'content-range': `bytes */${size}`,
    'x-content-type-options': 'nosniff'
  }
});

export function parseByteRange(value, size) {
  if (!Number.isSafeInteger(size) || size < 0) return { ok: false };
  const match = /^bytes=(\d*)-(\d*)$/i.exec(String(value || '').trim());
  if (!match || (!match[1] && !match[2]) || size === 0) return { ok: false };

  let start;
  let end;

  if (!match[1]) {
    const suffix = Number(match[2]);
    if (!Number.isSafeInteger(suffix) || suffix <= 0) return { ok: false };
    start = Math.max(0, size - suffix);
    end = size - 1;
  } else {
    start = Number(match[1]);
    end = match[2] ? Number(match[2]) : size - 1;
    if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end)) return { ok: false };
    if (start >= size || end < start) return { ok: false };
    end = Math.min(end, size - 1);
  }

  return { ok: true, start, end, length: end - start + 1 };
}

function ifRangeMatches(request, headers) {
  const validator = request.headers.get('if-range');
  if (!validator) return true;
  const etag = headers.get('etag');
  const modified = headers.get('last-modified');
  return validator === etag || validator === modified;
}

function r2Headers(object) {
  const headers = new Headers();
  object.writeHttpMetadata?.(headers);
  if (object.httpEtag) headers.set('etag', object.httpEtag);
  if (object.uploaded instanceof Date) headers.set('last-modified', object.uploaded.toUTCString());
  if (!headers.has('cache-control')) headers.set('cache-control', 'public, max-age=0, must-revalidate');
  headers.set('accept-ranges', 'bytes');
  headers.set('x-content-type-options', 'nosniff');
  return headers;
}

async function fromR2(request, bucket, key) {
  if (!bucket) return null;
  const rangeHeader = request.headers.get('range');

  try {
    if (request.method === 'HEAD') {
      const object = await bucket.head(key);
      if (!object) return null;
      const headers = r2Headers(object);
      headers.set('content-length', String(object.size));
      return new Response(null, { status: 200, headers });
    }

    if (!rangeHeader) {
      const object = await bucket.get(key);
      if (!object) return null;
      const headers = r2Headers(object);
      headers.set('content-length', String(object.size));
      return new Response(object.body || null, {
        status: object.body ? 200 : 412,
        headers
      });
    }

    const metadata = await bucket.head(key);
    if (!metadata) return null;
    const metadataHeaders = r2Headers(metadata);
    if (!ifRangeMatches(request, metadataHeaders)) {
      const object = await bucket.get(key);
      if (!object) return null;
      const headers = r2Headers(object);
      headers.set('content-length', String(object.size));
      return new Response(object.body || null, {
        status: object.body ? 200 : 412,
        headers
      });
    }

    const range = parseByteRange(rangeHeader, metadata.size);
    if (!range.ok) return rangeNotSatisfiable(metadata.size);
    const object = await bucket.get(key, {
      range: { offset: range.start, length: range.length }
    });
    if (!object) return null;
    const headers = r2Headers(object);
    headers.set('content-length', String(range.length));
    headers.set('content-range', `bytes ${range.start}-${range.end}/${metadata.size}`);
    return new Response(object.body || null, {
      status: object.body ? 206 : 412,
      headers
    });
  } catch (error) {
    console.error('R2 media lookup failed; using the bundled asset fallback.', error);
    return null;
  }
}

async function fromAssets(request, assets) {
  const rangeHeader = request.headers.get('range');
  const upstream = await assets.fetch(request);
  if (!upstream.ok || request.method === 'HEAD' || !rangeHeader) {
    return withStreamingHeaders(upstream);
  }

  // Preserve native partial responses when the asset platform supports them.
  // The manual slice below is only a compatibility fallback for platforms that
  // ignore Range and return the complete file with a 200 response.
  if (upstream.status === 206) return withStreamingHeaders(upstream);

  const declaredHeader = upstream.headers.get('content-length');
  const declaredSize = declaredHeader === null ? Number.NaN : Number(declaredHeader);
  let range = Number.isSafeInteger(declaredSize)
    ? parseByteRange(rangeHeader, declaredSize)
    : null;

  if (Number.isSafeInteger(declaredSize) && !range.ok) {
    return rangeNotSatisfiable(declaredSize);
  }
  if (!ifRangeMatches(request, upstream.headers)) return withStreamingHeaders(upstream);

  const bytes = await upstream.arrayBuffer();
  const size = bytes.byteLength;
  if (!range || size !== declaredSize) range = parseByteRange(rangeHeader, size);
  if (!range.ok) return rangeNotSatisfiable(size);

  const headers = new Headers(upstream.headers);
  headers.set('accept-ranges', 'bytes');
  headers.set('content-length', String(range.length));
  headers.set('content-range', `bytes ${range.start}-${range.end}/${size}`);
  headers.set('x-content-type-options', 'nosniff');
  headers.delete('content-encoding');

  return new Response(bytes.slice(range.start, range.end + 1), {
    status: 206,
    headers
  });
}

export async function handleRequest(request, env) {
  const url = new URL(request.url);
  const rangeable = RANGEABLE_MEDIA.test(url.pathname);
  const method = request.method.toUpperCase();

  if (!rangeable || (method !== 'GET' && method !== 'HEAD')) {
    return env.ASSETS.fetch(request);
  }

  const key = url.pathname.replace(/^\/+/, '');
  const stored = await fromR2(request, env.MEDIA_BUCKET, key);
  if (stored) return stored;
  return fromAssets(request, env.ASSETS);
}

export default { fetch: handleRequest };
