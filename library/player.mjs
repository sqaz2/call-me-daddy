import {GROUPS,buildCatalog,filterCatalog,makeQueue,shareURL,trackKey} from './model.mjs';
import {STARMUFF_TRACKS} from '../data/starmuff-playlist.mjs';

const $=id=>document.getElementById(id),songs=window.CMD_SONGS||[];
const catalog=buildCatalog(songs,STARMUFF_TRACKS);
for(const song of catalog)song.searchLyrics=window.CMD_SONG_LYRICS?.[song.id]?.search||'';
const allTracks=catalog.flatMap(s=>s.tracks),parameters=new URLSearchParams(location.search);
let group=GROUPS.some(g=>g.id===parameters.get('group'))?parameters.get('group'):'all';
let saved=[],preferences={};
try{saved=JSON.parse(localStorage.getItem('ms-library-saved')||'[]');preferences=JSON.parse(localStorage.getItem('ms-library-preferences')||'{}');}catch{}
if(!Array.isArray(saved))saved=[];
let savedOnly=false,limit=20,visible=[],current=null,controller=null,playbackSongs=[],shuffle=false,repeat='all',noticeUntil=0;
const chosenVersions=new Map(),audio=document.createElement('audio');
audio.id='libraryAudio';audio.preload='metadata';audio.hidden=true;document.body.append(audio);
const clamp=v=>Math.max(0,Math.min(100,Number(v)||0));
$('volume').value=clamp(preferences.volume??65);audio.volume=Number($('volume').value)/100;
document.body.classList.toggle('classic',!!preferences.classic);$('skin').setAttribute('aria-pressed',String(!!preferences.classic));
$('search').value=parameters.get('q')||'';
const format=v=>{const s=Math.max(0,Number(v)||0);return `${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,'0')}`;};
const isPlaying=()=>!!controller&&!audio.paused&&!audio.ended;
const notify=text=>{$('status').textContent=text;noticeUntil=Date.now()+6000;};
function savePreferences(){preferences={volume:Number($('volume').value),classic:document.body.classList.contains('classic')};try{localStorage.setItem('ms-library-preferences',JSON.stringify(preferences));}catch{}}
function saveSong(id){if(!id)return;saved=saved.includes(id)?saved.filter(x=>x!==id):[...saved,id];try{localStorage.setItem('ms-library-saved',JSON.stringify(saved));}catch{notify('Saved for this visit. Browser storage is unavailable.');}render();paintSelection();}
function makeButton(text,action,label){const b=document.createElement('button');b.type='button';b.textContent=text;if(label)b.setAttribute('aria-label',label);b.addEventListener('click',action);return b;}
function groupButton(g){const count=filterCatalog(catalog,{group:g.id}).length;const b=makeButton(g.label,()=>selectGroup(g.id));b.className='group'+(!count?' empty':'');b.dataset.group=g.id;b.setAttribute('aria-pressed','false');const n=document.createElement('span');n.textContent=count;b.append(n);return b;}
for(const [kind,id] of [['mood','moodGroups'],['genre','genreGroups'],['brief','briefGroups']])$(''+id).append(...GROUPS.filter(g=>g.kind===kind).map(groupButton));
document.querySelectorAll('[data-group]').forEach(b=>{if(!b.classList.contains('group')||b.dataset.group==='all')b.addEventListener('click',()=>selectGroup(b.dataset.group));});
const totalSongs=catalog.length,totalVersions=allTracks.length;
$('totalCount').textContent=`${totalSongs} songs & tracks · ${totalVersions} recordings`;
$('allCount').textContent=catalog.length;
function locationURL(track=null){return shareURL({group,q:$('search').value.trim(),track,origin:location.origin});}
function selectGroup(id,{scroll=false}={}){group=id;savedOnly=false;limit=20;$('savedToggle').setAttribute('aria-pressed','false');$('search').value='';history.pushState({},'',locationURL());render();if(scroll)$('catalogue').scrollIntoView({behavior:'smooth',block:'start'});}
function defaultTrack(song){const available=song.visibleTracks||song.tracks;return available.find(t=>t.variantId===chosenVersions.get(song.id))||available.find(t=>t.variantId===song.openerPolicy?.defaultVersion)||available.find(t=>!t.manualOnly)||available[0];}
function render(){
  const info=GROUPS.find(g=>g.id===group)||GROUPS[0];
  visible=filterCatalog(catalog,{group,q:$('search').value,savedOnly,saved});
  $('groupTitle').textContent=savedOnly?'Your saved sounds':info.label;
  $('groupEyebrow').textContent=info.kind==='genre'?'BY SOUND':info.kind==='mood'?'BY FEELING':info.kind==='brief'?'BRIEF COLLECTION':'THE COLLECTION';
  $('groupDescription').textContent=savedOnly?'Keep the songs and worlds you want to come back to. Saved on this device.':info.description;
  const versions=visible.reduce((n,s)=>n+s.visibleTracks.length,0);
  $('resultCount').textContent=`${visible.length} ${visible.length===1?'entry':'entries'} · ${versions} ${versions===1?'version':'versions'}`;
  $('clearSearch').hidden=!$('search').value;
  $('playCollection').disabled=!visible.some(s=>s.visibleTracks.some(t=>!t.manualOnly));
  document.querySelectorAll('.group[data-group]').forEach(b=>{const on=b.dataset.group===group&&!savedOnly;b.classList.toggle('active',on);b.setAttribute('aria-pressed',String(on));});
  const fragment=document.createDocumentFragment();
  for(const song of visible.slice(0,limit)){
    const row=document.createElement('article');row.className='track-row';row.dataset.song=song.id;
    let choice=defaultTrack(song);
    const art=makeButton('',()=>pickRow(song,defaultTrack(song)),`Play ${song.title}`);art.className='track-art';
    const img=document.createElement('img');img.src=choice.cover;img.alt='';img.loading='lazy';img.addEventListener('error',()=>{if(!img.src.endsWith('/library/mark.svg'))img.src='/library/mark.svg';});
    const icon=document.createElement('span');icon.textContent='▶';art.append(img,icon);
    const copy=document.createElement('div'),title=makeButton(song.title,()=>showDetails(song));title.className='song-title';
    const meta=document.createElement('span');meta.className='track-meta';meta.textContent=[song.artist||'MusicSubject',song.playlist==='starmuff'?'StarMuff soundtrack':choice.groups.filter(x=>GROUPS.find(g=>g.id===x)?.kind==='genre').map(x=>GROUPS.find(g=>g.id===x).label).slice(0,2).join(' / ')].filter(Boolean).join(' · ');
    copy.append(title,meta);
    if(song.tracks.length>1){const select=document.createElement('select');select.setAttribute('aria-label',`Version of ${song.title}`);for(const t of song.visibleTracks){const o=document.createElement('option');o.value=t.variantId;o.textContent=`${song.tracks.indexOf(t)+1}/${song.tracks.length} · ${t.variantLabel}${t.manualOnly?' · on request':''}`;select.append(o);}select.value=choice.variantId;select.addEventListener('change',()=>{choice=song.tracks.find(t=>t.variantId===select.value);chosenVersions.set(song.id,choice.variantId);img.src=choice.cover;start(choice);});copy.append(select);}else if(choice.manualOnly){const tag=document.createElement('span');tag.className='tag';tag.textContent='On request · excluded from autoplay';copy.append(tag);}
    const actions=document.createElement('div');actions.className='track-actions';const fav=makeButton(saved.includes(song.id)?'♥':'♡',()=>saveSong(song.id),`${saved.includes(song.id)?'Unsave':'Save'} ${song.title}`);fav.setAttribute('aria-pressed',String(saved.includes(song.id)));actions.append(fav,makeButton('↗',()=>shareTrack(defaultTrack(song)),`Share ${song.title}`));
    row.append(art,copy,actions);fragment.append(row);
  }
  if(!visible.length){const empty=document.createElement('div');empty.className='empty-state';empty.textContent=savedOnly?'Tap a heart beside a recording to save it here.':$('search').value?'No matches in this collection. Try another phrase or choose All music.':info.kind==='brief'?info.description:'No recordings have this tag yet.';fragment.append(empty);}
  $('tracks').replaceChildren(fragment);$('loadMore').hidden=limit>=visible.length;
  paintSelection();
}
function pickRow(song,choice){if(current?.songId===song.id&&isPlaying()){if(song.tracks.length>1)cycleVersion();else toggle();}else start(choice);}
function paintSelection(){
  if(!current)return;
  const family=catalog.find(s=>s.id===current.songId),index=family?.tracks.findIndex(t=>trackKey(t)===trackKey(current))??0;
  $('dockTitle').textContent=current.title;$('dockSubtitle').textContent=`${current.variantLabel} · ${current.artist}`;
  $('dockCover').src=current.cover||'/library/mark.svg';$('dockArt').setAttribute('aria-label',`Play or pause ${current.title}`);
  $('cycle').textContent=`${index+1} / ${family?.tracks.length||1}`;$('cycle').disabled=!family||family.tracks.length<2;$('cycle').setAttribute('aria-label',`Version ${index+1} of ${family?.tracks.length||1}; play next version`);
  $('dockSave').textContent=saved.includes(current.songId)?'♥':'♡';$('dockSave').setAttribute('aria-pressed',String(saved.includes(current.songId)));
  document.querySelectorAll('.track-row').forEach(row=>{
    const active=row.dataset.song===current.songId;row.classList.toggle('playing',active);
    if(active){const select=row.querySelector('select');if(select&&Array.from(select.options).some(o=>o.value===current.variantId)){select.value=current.variantId;row.querySelector('img').src=current.cover;}}
  });
  document.title=`${current.title} — MusicSubject Library`;
}
function regularTrack(track){return {...track,experience:'',shareUrl:shareURL({track,origin:location.origin}),album:'MusicSubject Library'};}
function start(track){
  if(!track)return;
  controller?.pause();controller?.destroy();
  current=regularTrack(track);playbackSongs=visible;audio.volume=Number($('volume').value)/100;
  const queue=makeQueue(playbackSongs,current,shuffle).map(regularTrack);
  controller=window.CMDContinuousPlayback.create({id:'musicsubject-library',route:locationURL(current),audio,tracks:queue,localCount:queue.length,radio:{next:()=>null},loopLocal:repeat==='all',repeatOne:repeat==='one',followPages:false,restoreSession:false,onTrack:t=>{current=t;chosenVersions.set(t.songId,t.variantId);history.replaceState({},'',locationURL(t));paintSelection();},onStatus:kind=>{if(kind==='error')notify('Recording unavailable. Trying the next one…');if(kind==='failed'||kind==='blocked')notify('Tap Play to retry this recording.');}});
  controller.load(0,{autoplay:true,reason:'library-pick'});
  history.replaceState({},'',locationURL(current));notify(`${track.title} · ${track.variantLabel}`);paintSelection();
}
function cycleVersion(){if(!current)return;const family=catalog.find(s=>s.id===current.songId);if(!family||family.tracks.length<2)return;const at=family.tracks.findIndex(t=>trackKey(t)===trackKey(current));start(family.tracks[(at+1)%family.tracks.length]);}
function toggle(){if(controller)controller.toggle();else start(current||visible.flatMap(s=>s.visibleTracks).find(t=>!t.manualOnly));}
function configureQueue(){if(!controller)return;controller.configureQueue({tracks:makeQueue(playbackSongs,current,shuffle).slice(1).map(regularTrack),loopLocal:repeat==='all',repeatOne:repeat==='one'});}
async function share(url,title,text=''){
  const data={url,title,text};if(navigator.share){try{await navigator.share(data);return;}catch(error){if(error.name==='AbortError')return;}}
  try{await navigator.clipboard.writeText(url);notify('Link copied.');}catch{$('shareAddress').value=url;$('shareFallback').showModal();$('shareAddress').select();}
}
let shareCopies=null;
// Copy is editorially reviewed in the existing release workflow; never navigate
// to its source URLs from this independent catalogue.
void fetch('/data/song-social.json').then(r=>r.ok?r.json():null).then(data=>{shareCopies=data?.songs||data;}).catch(()=>{});
function shareTrack(track){if(!track)return;const root=shareCopies?.[track.songId],copy=root?.versions?.[track.variantId];const text=`${copy?.title||track.title+' · '+track.variantLabel}\n\nOpen this recording in MusicSubject Library.`;return share(shareURL({track,origin:location.origin}),`${track.title} — MusicSubject Library`,text);}
function showDetails(song){$('detailTitle').textContent=song.title;$('detailArtist').textContent=song.artist||'MusicSubject';$('detailDescription').textContent=song.description||'No additional notes for this recording yet.';$('detailLyrics').textContent=window.CMDSongLyrics?.lyrics(song.id)||'Lyrics are not available for this recording.';$('details').showModal();}
$('closeDetails').onclick=()=>$('details').close();$('closeShare').onclick=()=>$('shareFallback').close();
$('copyFallback').onclick=async()=>{try{await navigator.clipboard.writeText($('shareAddress').value);$('shareFallback').close();notify('Link copied.');}catch{$('shareAddress').select();notify('Select and copy the link in the box.');}};
$('searchForm').onsubmit=e=>{e.preventDefault();render();};$('search').oninput=()=>{limit=20;history.replaceState({},'',locationURL());render();};$('clearSearch').onclick=()=>{$('search').value='';history.replaceState({},'',locationURL());render();$('search').focus();};
$('savedToggle').onclick=()=>{savedOnly=!savedOnly;$('savedToggle').setAttribute('aria-pressed',String(savedOnly));limit=20;render();$('catalogue').scrollIntoView({behavior:'smooth'});};
$('loadMore').onclick=()=>{limit+=20;render();};$('playCollection').onclick=()=>{const first=visible.flatMap(s=>s.visibleTracks).find(t=>!t.manualOnly);start(first);};
$('play').onclick=toggle;$('dockArt').onclick=toggle;$('next').onclick=()=>controller?.next('library-next');$('previous').onclick=()=>controller?.previous();$('cycle').onclick=cycleVersion;
$('shuffle').onclick=()=>{shuffle=!shuffle;$('shuffle').setAttribute('aria-pressed',String(shuffle));configureQueue();};
$('repeat').onclick=()=>{repeat=repeat==='all'?'one':repeat==='one'?'off':'all';$('repeat').textContent=repeat==='one'?'↻1':'↻';$('repeat').setAttribute('aria-pressed',String(repeat!=='off'));$('repeat').setAttribute('aria-label',`Repeat ${repeat}; change repeat mode`);configureQueue();notify(`Repeat ${repeat}`);};
$('volume').oninput=()=>{audio.volume=Number($('volume').value)/100;savePreferences();};
$('seek').oninput=()=>{if(Number.isFinite(audio.duration))audio.currentTime=audio.duration*Number($('seek').value)/1000;};
$('dockSave').onclick=()=>saveSong(current?.songId);$('shareTrack').onclick=()=>shareTrack(current);
$('shareGroup').onclick=()=>share(shareURL({group,q:$('search').value,origin:location.origin}),`${GROUPS.find(g=>g.id===group)?.label} — MusicSubject Library`,GROUPS.find(g=>g.id===group)?.description);
$('shareLibrary').onclick=()=>share(shareURL({origin:location.origin}),'MusicSubject Library','Find the feeling. Explore the versions. Pass along something worth hearing.');
$('skin').onclick=()=>{const on=document.body.classList.toggle('classic');$('skin').setAttribute('aria-pressed',String(on));$('skin').textContent=on?'Library view':'WinHamp view';savePreferences();};
$('dockCover').onerror=()=>{if(!$('dockCover').src.endsWith('/library/mark.svg'))$('dockCover').src='/library/mark.svg';};
addEventListener('popstate',()=>{const p=new URLSearchParams(location.search);group=GROUPS.some(g=>g.id===p.get('group'))?p.get('group'):'all';$('search').value=p.get('q')||'';savedOnly=false;limit=20;render();});
document.addEventListener('keydown',e=>{if(e.code==='Space'&&!/INPUT|SELECT|TEXTAREA|BUTTON|A/.test(e.target.tagName)&&!e.target.isContentEditable&&!document.querySelector('dialog[open]')){e.preventDefault();toggle();}});
render();
if(parameters.has('song')){const requested=allTracks.find(t=>t.songId===parameters.get('song')&&(!parameters.has('version')||t.variantId===parameters.get('version')));if(requested){current=requested;chosenVersions.set(requested.songId,requested.variantId);paintSelection();notify(`Ready: ${requested.title} · ${requested.variantLabel}. Tap Play.`);}else notify('That recording link is unavailable. Browse the collection below.');}
let lastPaint=0;
function paint(now){requestAnimationFrame(paint);if(now-lastPaint<250||document.visibilityState==='hidden')return;lastPaint=now;const playing=isPlaying();$('play').textContent=playing?'Ⅱ':'▶';$('play').setAttribute('aria-label',playing?'Pause':'Play');
  const d=Number.isFinite(audio.duration)?audio.duration:0;$('elapsed').textContent=format(audio.currentTime);$('duration').textContent=format(d);$('seek').disabled=!d;$('seek').value=d?audio.currentTime/d*1000:0;
  if(Date.now()>noticeUntil){const next=controller?.peekNext();const left=audio.duration-audio.currentTime;$('status').textContent=playing&&next&&left>0&&left<=5?`Up next · ${next.title} · ${next.variantLabel}`:playing?'Your collection keeps playing while you browse.':current?'Ready when you are.':'Choose a song to start listening.';}
}
requestAnimationFrame(paint);
