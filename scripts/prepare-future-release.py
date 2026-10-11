import json, html
from pathlib import Path
from mutagen.mp3 import MP3
from PIL import Image
slug='keep-building-your-future'
base=Path('media/songs/2026/10')/slug
track=MP3(base/'audio.mp3')
tags=track.tags or {}
lyrics=next((x.text for x in tags.getall('USLT') if x.text.strip()), '')
duration=round(track.info.length,3)
cover=Image.open(base/'cover.png')
manifest_path=Path('content/releases/2026-10-11-'+slug+'.json')
manifest=json.loads(manifest_path.read_text())
manifest['song']['variants'][0]['duration']=duration
if lyrics:
    manifest['lyrics']={'text':lyrics,'snippet':'Keep building your future','sunoUrl':'https://suno.com/s/Pv8RWUmOcGEkfSVT','clipIds':[],'source':'Exact USLT lyrics from the user-uploaded MP3.'}
manifest_path.write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
page_path=Path(slug)/'index.html'
page=page_path.read_text()
secs=round(duration)
page=page.replace('<!-- RELEASE_DURATION -->',f'{secs//60}:{secs%60:02}')
page=page.replace('<!-- RELEASE_LYRICS -->',('<section class="release-lyrics" aria-label="Song lyrics"><details><summary id="releaseLyricsLabel">Full song · lyrics</summary><pre id="releaseLyrics">'+html.escape(lyrics)+'</pre></details></section>') if lyrics else '')
page=page.replace('<!-- RELEASE_LYRICS_DATA -->','<script id="releaseLyricsData" type="application/json">'+json.dumps({'main':lyrics},ensure_ascii=False).replace('<','\\u003c')+'</script>')
origin='https://callmedaddy.musicsubject.com'
data={'@context':'https://schema.org','@type':'MusicRecording','name':manifest['song']['title'],'byArtist':{'@type':'MusicGroup','name':manifest['song']['artist']},'datePublished':'2026-10-11','duration':f'PT{secs//60}M{secs%60}S','url':origin+'/'+slug+'/','image':origin+manifest['song']['cover'],'sameAs':manifest['song']['sunoUrl'],'audio':{'@type':'AudioObject','contentUrl':origin+manifest['song']['audio'],'encodingFormat':'audio/mpeg'}}
page=page.replace('<!-- RELEASE_STRUCTURED_DATA -->','<script type="application/ld+json">'+json.dumps(data,ensure_ascii=False).replace('<','\\u003c')+'</script>')
page=page.replace('<img id="releaseCover"','<img width="'+str(cover.width)+'" height="'+str(cover.height)+'" id="releaseCover"')
page_path.write_text(page)
report={'sourceAudio':'keep building your future.mp3','sourceArtwork':'file_00000000560481fbb7e57d2625ad57dc.png','sourceVideo':'gemini_generated_video_65b13bae.mp4','duration':duration,'artwork':{'width':cover.width,'height':cover.height},'embeddedTitle':str(tags.get('TIT2','')),'embeddedArtist':str(tags.get('TPE1','')),'lyrics':lyrics}
Path('content/sources/'+slug+'.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(report,ensure_ascii=False))
