"""Import only the artist-selected public Suno recording; never substitute a draft."""
import hashlib
import json
import pathlib
import re
import subprocess
import urllib.request

CLIP_ID = "f36cd380-558e-4ed4-a539-e16ffe77d1ef"
SHARE_URL = "https://suno.com/s/LwgadsoEOqZGTwPK"
DEST = pathlib.Path("media/songs/2026/09/since-before-youtube")
HEADERS = {"User-Agent": "Mozilla/5.0", "Accept": "application/json,text/html,*/*"}


def get(url):
    request = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(request, timeout=60) as response:
        return response.read()


def find_clip(value):
    if isinstance(value, dict):
        if value.get("id") == CLIP_ID and value.get("audio_url"):
            return value
        for child in value.values():
            found = find_clip(child)
            if found:
                return found
    elif isinstance(value, list):
        for child in value:
            found = find_clip(child)
            if found:
                return found
    return None


clip = None
for url in [
    f"https://studio-api.prod.suno.com/api/external/clips/?ids={CLIP_ID}",
    f"https://studio-api.prod.suno.com/api/clip/{CLIP_ID}",
    f"https://studio-api.prod.suno.com/api/clip/{CLIP_ID}/",
]:
    try:
        clip = find_clip(json.loads(get(url)))
        if clip:
            break
    except Exception as error:
        print(f"Public metadata endpoint unavailable: {type(error).__name__}")

if not clip:
    page = get(SHARE_URL).decode("utf-8")
    pieces = [page]
    for match in re.finditer(r'self\.__next_f\.push\((\[.*?\])\)', page):
        try:
            entry = json.loads(match.group(1))
            if len(entry) > 1 and isinstance(entry[1], str):
                pieces.append(entry[1])
        except (ValueError, TypeError):
            pass
    decoder = json.JSONDecoder()
    for piece in pieces:
        for match in re.finditer(r'\{', piece):
            try:
                value, _ = decoder.raw_decode(piece[match.start():])
                clip = find_clip(value)
                if clip:
                    break
            except (ValueError, RecursionError):
                pass
        if clip:
            break

if not clip or clip.get("id") != CLIP_ID:
    raise RuntimeError("Cannot verify the selected Suno recording; refusing a substitute")
if clip.get("status") not in (None, "complete"):
    raise RuntimeError("The selected recording is not complete")
metadata = clip.get("metadata") or {}
lyrics = metadata.get("prompt") or ""
if not clip.get("title") or not lyrics.strip():
    raise RuntimeError("Final title or exact released lyrics missing")


def safe_media_url(url):
    from urllib.parse import urlparse
    parsed = urlparse(url)
    hostname = parsed.hostname or ""
    if parsed.scheme != "https" or not any(hostname == host or hostname.endswith("." + host) for host in ("suno.ai", "suno.com")):
        raise RuntimeError("Unexpected media host; review before downloading")
    return url


DEST.mkdir(parents=True, exist_ok=True)
audio_bytes = get(safe_media_url(clip["audio_url"]))
if len(audio_bytes) < 100000 or audio_bytes[:1] in (b"<", b"{"):
    raise RuntimeError("Audio download was not a full recording")
(DEST / "audio.mp3").write_bytes(audio_bytes)
cover_url = safe_media_url(clip.get("image_large_url") or clip.get("image_url") or "")
cover_input = pathlib.Path("/tmp/since-before-youtube-source-image")
cover_input.write_bytes(get(cover_url))
subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(cover_input), "-frames:v", "1", "-q:v", "2", str(DEST / "cover.jpg")], check=True)
probe = json.loads(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration:stream=codec_type,codec_name", "-of", "json", str(DEST / "audio.mp3")]))
if not any(stream.get("codec_type") == "audio" for stream in probe.get("streams", [])):
    raise RuntimeError("Downloaded source contains no decodable audio")
duration = float(probe["format"]["duration"])
if duration < 10:
    raise RuntimeError("Recording is unexpectedly short")
source = {
    "clipId": CLIP_ID,
    "sunoUrl": SHARE_URL,
    "title": clip["title"],
    "displayName": clip.get("display_name"),
    "sourceAudioUrl": clip["audio_url"],
    "sourceCoverUrl": cover_url,
    "audioSha256": hashlib.sha256(audio_bytes).hexdigest(),
    "duration": round(duration, 3),
    "tags": metadata.get("tags", ""),
    "lyrics": lyrics,
}
(DEST / "source.json").write_text(json.dumps(source, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(json.dumps(source, ensure_ascii=False, indent=2))
