import test from 'node:test';
import assert from 'node:assert/strict';
import worker, { parseByteRange } from '../worker/index.mjs';

const media = Uint8Array.from([10, 20, 30, 40, 50, 60, 70, 80, 90, 100]);
const request = (headers = {}, method = 'GET') => new Request(
  'https://callmedaddy.musicsubject.com/media/test/song.mp3',
  { method, headers }
);

function assetEnvironment() {
  return {
    ASSETS: {
      async fetch(assetRequest) {
        return new Response(assetRequest.method === 'HEAD' ? null : media, {
          status: 200,
          headers: {
            'cache-control': 'public, max-age=0, must-revalidate',
            'content-length': String(media.byteLength),
            'content-type': 'audio/mpeg',
            'etag': '"asset-v1"'
          }
        });
      }
    }
  };
}

const bytes = async response => Array.from(new Uint8Array(await response.arrayBuffer()));

test('byte-range parser supports bounded, open-ended and suffix requests', () => {
  assert.deepEqual(parseByteRange('bytes=0-0', 10), { ok: true, start: 0, end: 0, length: 1 });
  assert.deepEqual(parseByteRange('bytes=4-', 10), { ok: true, start: 4, end: 9, length: 6 });
  assert.deepEqual(parseByteRange('bytes=-3', 10), { ok: true, start: 7, end: 9, length: 3 });
});

test('byte-range parser rejects multiple and unsatisfiable ranges', () => {
  assert.deepEqual(parseByteRange('bytes=0-1,4-5', 10), { ok: false });
  assert.deepEqual(parseByteRange('bytes=10-12', 10), { ok: false });
  assert.deepEqual(parseByteRange('bytes=8-2', 10), { ok: false });
});

test('bundled media fallback returns an actual 206 response', async () => {
  const response = await worker.fetch(request({ range: 'bytes=2-5' }), assetEnvironment());
  assert.equal(response.status, 206);
  assert.equal(response.headers.get('accept-ranges'), 'bytes');
  assert.equal(response.headers.get('content-range'), 'bytes 2-5/10');
  assert.equal(response.headers.get('content-length'), '4');
  assert.deepEqual(await bytes(response), [30, 40, 50, 60]);
});

test('native asset range responses pass through without being buffered again', async () => {
  let calls = 0;
  const env = {
    ASSETS: {
      async fetch(assetRequest) {
        calls += 1;
        assert.equal(assetRequest.headers.get('range'), 'bytes=2-5');
        return new Response(media.slice(2, 6), {
          status: 206,
          headers: {
            'content-length': '4',
            'content-range': 'bytes 2-5/10',
            'content-type': 'audio/mpeg'
          }
        });
      }
    }
  };

  const response = await worker.fetch(request({ range: 'bytes=2-5' }), env);
  assert.equal(response.status, 206);
  assert.equal(response.headers.get('content-range'), 'bytes 2-5/10');
  assert.equal(response.headers.get('accept-ranges'), 'bytes');
  assert.deepEqual(await bytes(response), [30, 40, 50, 60]);
  assert.equal(calls, 1);
});

test('bundled media fallback supports suffix ranges', async () => {
  const response = await worker.fetch(request({ range: 'bytes=-2' }), assetEnvironment());
  assert.equal(response.status, 206);
  assert.equal(response.headers.get('content-range'), 'bytes 8-9/10');
  assert.deepEqual(await bytes(response), [90, 100]);
});

test('invalid ranges return 416 with the full size', async () => {
  const response = await worker.fetch(request({ range: 'bytes=99-100' }), assetEnvironment());
  assert.equal(response.status, 416);
  assert.equal(response.headers.get('content-range'), 'bytes */10');
});

test('If-Range mismatch safely falls back to the complete file', async () => {
  const response = await worker.fetch(request({ range: 'bytes=0-0', 'if-range': '"older"' }), assetEnvironment());
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('accept-ranges'), 'bytes');
  assert.deepEqual(await bytes(response), Array.from(media));
});

test('an R2 binding can take over the same URL without changing the player', async () => {
  const metadata = {
    size: media.byteLength,
    httpEtag: '"r2-v1"',
    uploaded: new Date('2026-08-26T00:00:00Z'),
    writeHttpMetadata(headers) { headers.set('content-type', 'audio/mpeg'); }
  };
  let assetCalls = 0;
  const env = {
    ASSETS: { async fetch() { assetCalls += 1; return new Response('fallback'); } },
    MEDIA_BUCKET: {
      async head(key) {
        assert.equal(key, 'media/test/song.mp3');
        return metadata;
      },
      async get(key, options) {
        assert.equal(key, 'media/test/song.mp3');
        const offset = options?.range?.offset || 0;
        const length = options?.range?.length || media.byteLength;
        return { ...metadata, body: new Response(media.slice(offset, offset + length)).body };
      }
    }
  };
  const response = await worker.fetch(request({ range: 'bytes=1-3' }), env);
  assert.equal(response.status, 206);
  assert.equal(response.headers.get('content-range'), 'bytes 1-3/10');
  assert.deepEqual(await bytes(response), [20, 30, 40]);
  assert.equal(assetCalls, 0);
});
