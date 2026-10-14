"""Resize the approved full-name logo into website and Android resources."""
from pathlib import Path
import base64
from io import BytesIO
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
master = Image.open(ROOT / "media/brand/musicsubject-callmedaddy-logo.png").convert("RGB")
assert master.width == master.height

def save(image, path):
    destination = ROOT / path
    destination.parent.mkdir(parents=True, exist_ok=True)
    image.save(destination, optimize=True)

def square(size, inset=0):
    canvas = Image.new("RGB", (size, size), "#080808")
    side = size - inset * 2
    canvas.paste(master.resize((side, side), Image.Resampling.LANCZOS), (inset, inset))
    return canvas

for size in (192, 512):
    for prefix in ("icon", "brand-icon"):
        save(square(size), f"app/{prefix}-{size}.png")
save(square(192), "app/android-icon-192.png")
save(square(512), "android/app/src/main/assets/icon.png")
for density, size in (("mdpi",48),("hdpi",72),("xhdpi",96),("xxhdpi",144),("xxxhdpi",192)):
    save(square(size), f"android/app/src/main/res/mipmap-{density}/ic_launcher.png")
# Android masks a 108dp foreground. Inset the complete artwork to 72dp.
save(square(432, 72), "android/app/src/main/res/drawable-nodpi/ic_launcher_foreground.png")
save(square(512), "android/play-store/icon-512.png")
feature = Image.new("RGB", (1024, 500), "#080808")
feature.paste(square(500), (262, 0))
save(feature, "android/play-store/feature-graphic-1024x500.png")
# Existing generic-page social images now show the same full-name brand.
save(square(1200), "media/brand/call-me-daddy-musicsubject.jpg")
buffer = BytesIO()
square(192).save(buffer, format="PNG", optimize=True)
encoded = base64.b64encode(buffer.getvalue()).decode("ascii")
(ROOT / "favicon.svg").write_text(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192" role="img" aria-label="MusicSubject × Call Me Daddy">'
    '<title>MusicSubject × Call Me Daddy</title>'
    '<image width="192" height="192" href="data:image/png;base64,' + encoded + '"/></svg>\n'
)
for size in (192,512):
    assert Image.open(ROOT / f"app/brand-icon-{size}.png").size == (size,size)
print("Full-name website, PWA and Android logo assets generated.")
