import {GENRE_FAMILIES,genreLabels} from './genres.mjs';
import {LIBRARY_LYRICS} from './lyric-sheets.mjs';
import {connectFilmPreview} from './film-preview.mjs';
import {canonicalLibrarySongId} from './identities.mjs';
import {GROUPS,normalizeFilters,filterCatalog,makeQueue,shareURL,trackKey} from './model.mjs';
import {SCENES,detailCoverage,resolveShortlist,shortlistCSV,inquiryText as buildInquiry,LICENSING_EMAIL} from './discovery.mjs';
import {buildLibraryCatalog} from './catalog.mjs';
import {STARMUFF_TRACKS} from '../data/starmuff-playlist.mjs';
import {LIBRARY_RELEASES} from './releases.mjs';
import {analysisSummary,analysisFacts} from './analysis.mjs';

const $=id=>document.getElementById(id),songs=window.CMD_SONGS||[];
const catalog=buildLibraryCatalog(songs,STARMUFF_TRACKS,{lyrics:window.CMD_SONG_LYRICS||{}});
const allTracks=catalog.flatMap(s=>s.tracks),parameters=new URLSearchParams(location.search);
let group=GROUPS.some(g=>g.id===parameters.get('group'))?parameters.get('group'):'all';
let saved=[],preferences={},shortlist=[];
try{saved=JSON.parse(localStorage.getItem('ms-library-saved')||'[]');preferences=JSON.parse(localStorage.getItem('ms-library-preferences')||'{}');shortlist=JSON.parse(localStorage.getItem('ms-library-shortlist')||'[]');}catch{}
if(!Array.isArray(saved))saved=[];
saved=[...new Set(saved.map(canonicalLibrarySongId))];
if(!Array.isArray(shortlist))shortlist=[];
if(parameters.has('pick'))shortlist=parameters.getAll('pick');
shortlist=resolveShortlist(shortlist,catalog).map(trackKey);
const filterIDs={mood:'filterMood',genre:'filterGenre',scene:'filterScene',vocals:'filterVocals',length:'filterLength',sort:'filterSort'};
const filters=()=>Object.fromEntries(Object.entries(filterIDs).map(([key,id])=>[key,$(id).value]));
for(const [id,options] of [['filterMood',GROUPS.filter(g=>g.kind==='mood')],['filterScene',SCENES]])for(const info of options){const option=document.createElement('option');option.value=info.id;option.textContent=info.label;$(id).append(option);}
for(const family of GENRE_FAMILIES){const section=document.createElement('optgroup');section.label=family.label;for(const id of family.genres){const info=GROUPS.find(g=>g.id===id);const option=document.createElement('option');option.value=id;option.textContent=info.label;section.append(option);} $('filterGenre').append(section);}
const genreReviewOption=document.createElement('option');genreReviewOption.value='unclassified';genreReviewOption.textContent='Genre to review';$('filterGenre').append(genreReviewOption);
function restoreFilters(params){for(const [key,id] of Object.entries(filterIDs)){const value=params.get(key)|| (key==='sort'?'relevance':'');$(id).value=Array.from($(id).options).some(o=>o.value===value)?value:(key==='sort'?'relevance':'');}}
restoreFilters(parameters);
syncBrowseFilters();
let savedOnly=false,limit=20,visible=[],current=null,controller=null,playbackSongs=[],shuffle=false,repeat='all',noticeUntil=0;
const chosenVersions=new Map(),audio=document.createElement('audio');
audio.id='libraryAudio';audio.preload='metadata';audio.hidden=true;document.body.append(audio);
let filmPhase='paused',filmVisible=true;
const film=connectFilmPreview({audio,video:$('sceneFilm'),onState:state=>{filmPhase=state;paintFilm();}});
function paintFilm(){
  const playing=!audio.paused&&!audio.ended;
  const retry=filmPhase==='blocked'||filmPhase==='unavailable';
  $('filmStage').classList.toggle('is-playing',playing&&filmPhase==='playing');
  $('filmPlay').setAttribute('aria-label',retry?'Retry film without interrupting the song':playing?'Pause recording and film':'Play selected recording with film');
  $('filmPrompt').textContent=retry?'Tap to retry the film':filmPhase==='loading'?'Loading film…':playing?'Resume film':current?'Play recording with film':'Choose a song, or tap to play';
  $('filmStatus').textContent=filmPhase==='unavailable'?'Film unavailable. Your song can keep playing.':filmPhase==='blocked'?'Tap the film to start the picture. Your song can keep playing.':'The film follows your song. It loops for longer recordings.';
}
function showFilm(value){filmVisible=!!value;$('filmBody').hidden=!filmVisible;$('filmToggle').textContent=filmVisible?'Hide film':'Show film';$('filmToggle').setAttribute('aria-expanded',String(filmVisible));film.setEnabled(filmVisible);}
$('filmToggle').onclick=()=>showFilm(!filmVisible);
$('filmPlay').onclick=()=>{if(filmPhase==='blocked'||filmPhase==='unavailable'){film.retry();if(!isPlaying())toggle();}else toggle();};
$('dockFilm').onclick=()=>{showFilm(true);$('filmPreview').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'instant':'smooth',block:'start'});};
$('filmFullscreen').onclick=()=>{const stage=$('filmStage');if(stage.requestFullscreen)stage.requestFullscreen().catch(()=>notify('Fullscreen is unavailable in this browser.'));else if($('sceneFilm').webkitEnterFullscreen)$('sceneFilm').webkitEnterFullscreen();};
for(const event of ['play','pause','ended'])audio.addEventListener(event,paintFilm);

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
for(const [kind,id] of [['mood','moodGroups'],['brief','briefGroups']])$(''+id).append(...GROUPS.filter(g=>g.kind===kind).map(groupButton));
for(const family of GENRE_FAMILIES){const section=document.createElement('section');section.className='genre-family';section.setAttribute('aria-label',family.label);const heading=document.createElement('h4');heading.textContent=family.label;section.append(heading,...family.genres.map(id=>groupButton(GROUPS.find(g=>g.id===id))));$('genreGroups').append(section);}
$('collectionGroups').append(...GROUPS.filter(g=>g.kind==='collection'&&g.id!=='all').map(groupButton));
document.querySelectorAll('[data-group]').forEach(b=>{if(!b.classList.contains('group')||b.dataset.group==='all')b.addEventListener('click',()=>selectGroup(b.dataset.group));});
$('browseTags').open=matchMedia('(min-width:681px)').matches;
const totalSongs=catalog.length,totalVersions=allTracks.filter(t=>t.audio).length,externalCount=allTracks.filter(t=>!t.audio).length;
$('totalCount').textContent=`${totalSongs} songs & tracks · ${totalVersions} recordings · ${externalCount} external versions`;
$('allCount').textContent=catalog.length;
$('shortlistCount').textContent=shortlist.length;
$('coverageSummary').textContent=`${new Set(songs.map(s=>canonicalLibrarySongId(s.id))).size} unique main catalogue entries, ${LIBRARY_RELEASES.length} library releases, 2 archive song families and ${STARMUFF_TRACKS.length} original StarMuff tracks are indexed. ${allTracks.filter(t=>t.facts).length} recordings have measured lengths; ${allTracks.filter(t=>!t.genreKnown).length} versions still need genre review.`;
function locationURL(track=null){return shareURL({group,q:$('search').value.trim(),...filters(),track,origin:location.origin});}
function syncBrowseFilters(){const state=normalizeFilters({group,...filters()});group=state.group;restoreFilters(new URLSearchParams(state));}
function selectGroup(id,{scroll=false}={}){group=id;savedOnly=false;limit=20;$('savedToggle').setAttribute('aria-pressed','false');$('search').value='';restoreFilters(new URLSearchParams());syncBrowseFilters();history.pushState({},'',locationURL());render();if(scroll)$('catalogue').scrollIntoView({behavior:'smooth',block:'start'});}
function defaultTrack(song){const available=song.visibleTracks||song.tracks;return available.find(t=>t.variantId===chosenVersions.get(song.id))||($('search').value.trim()?available[0]:null)||available.find(t=>t.variantId===song.openerPolicy?.defaultVersion)||available.find(t=>t.audio&&!t.manualOnly)||available[0];}
function renderActiveFilters(){
 const chips=[];
 const remove=(label,action)=>{const b=makeButton(label+' ×',()=>{action();updateFilters();},'Remove '+label);chips.push(b);};
 if(group!=='all')remove(GROUPS.find(g=>g.id===group)?.label||group,()=>{group='all';});
 if($('search').value.trim())remove('Search: '+$('search').value,()=>{$('search').value='';});
 for(const [key,id] of Object.entries(filterIDs))if(key!=='sort'&&$(id).value)remove($(id).selectedOptions[0].textContent,()=>{$(id).value='';});
 if(savedOnly)remove('Saved only',()=>{savedOnly=false;$('savedToggle').setAttribute('aria-pressed','false');});
 $('activeFilters').replaceChildren(...chips);$('activeFilters').hidden=!chips.length;
 const constrained=group!=='all'||savedOnly||Object.entries(filters()).some(([k,v])=>k!=='sort'&&v);
 const global=filterCatalog(catalog,{q:$('search').value});
 $('searchAll').hidden=!constrained;
 $('searchAll').textContent=`Search whole library (${global.length} entries)`;
}
$('searchAll').onclick=()=>{group='all';restoreFilters(new URLSearchParams());updateFilters();};
function render(){
  syncBrowseFilters();
  const info=GROUPS.find(g=>g.id===group)||GROUPS[0];
  visible=filterCatalog(catalog,{group,q:$('search').value,savedOnly,saved,...filters()});
  $('groupTitle').textContent=savedOnly?'Your saved sounds':Object.entries(filters()).some(([k,v])=>k!=='sort'&&v)||$('search').value.trim()?'Search results':info.label;
  $('groupEyebrow').textContent=info.kind==='genre'?'BY SOUND':info.kind==='mood'?'BY FEELING':info.kind==='brief'?'BRIEF COLLECTION':'THE COLLECTION';
  const activeLabels=Object.entries(filterIDs).filter(([key,id])=>key!=='sort'&&$(id).value).map(([,id])=>$(id).selectedOptions[0].textContent);
  if(!$('search').value.trim()&&activeLabels.length===1&&group==='all')$('groupTitle').textContent=activeLabels[0];
  $('groupDescription').textContent=activeLabels.length?'Showing: '+[...(group!=='all'?[info.label]:[]),...activeLabels].join(' · ')+'. Tap a cover to audition, or ask about a recording.':savedOnly?'Keep the songs and worlds you want to come back to. Saved on this device.':info.description;
  if($('search').value.trim()&&visible.length&&visible.every(s=>s.match.score<100)){$('groupTitle').textContent='Closest matches';$('groupDescription').textContent='No recording matches every search term. These alternatives show which terms matched and which are missing.';}
  const versions=visible.reduce((n,s)=>n+s.visibleTracks.length,0);
  $('resultCount').textContent=`${visible.length} ${visible.length===1?'entry':'entries'} · ${versions} ${versions===1?'version':'versions'}`;
  $('jumpResults').textContent=`Hear the results · ${visible.length} entries ↓`;
  $('clearSearch').hidden=!$('search').value;
  $('playCollection').disabled=!visible.some(s=>s.visibleTracks.some(t=>t.audio&&!t.manualOnly));
  document.querySelectorAll('.group[data-group]').forEach(b=>{const on=(b.dataset.group===group&&group!=='all'||b.dataset.group===$('filterMood').value||b.dataset.group===$('filterGenre').value||b.dataset.group==='all'&&group==='all'&&!$('filterMood').value&&!$('filterGenre').value)&&!savedOnly;b.classList.toggle('active',on);b.setAttribute('aria-pressed',String(on));});
  renderActiveFilters();
  const fragment=document.createDocumentFragment();
  for(const song of visible.slice(0,limit)){
    const row=document.createElement('article');row.className='track-row';row.dataset.song=song.id;
    let choice=defaultTrack(song);
    const art=choice.external?document.createElement('a'):makeButton('',()=>pickRow(song,defaultTrack(song)),`Play ${song.title}`);art.className='track-art'+(choice.external?' external':'');if(choice.external){art.href=choice.externalUrl;art.target='_blank';art.rel='noopener';art.setAttribute('aria-label',`Open ${song.title} on ${choice.platform||'external platform'}`);}
    const img=document.createElement('img');img.src=choice.cover;img.alt='';img.loading='lazy';img.addEventListener('error',()=>{if(!img.src.endsWith('/library/mark.svg'))img.src='/library/mark.svg';});
    const icon=document.createElement('span');icon.textContent=choice.external?'↗':'▶';art.append(img,icon);
    const copy=document.createElement('div'),title=makeButton(song.title,()=>showDetails(song,defaultTrack(song)));title.className='song-title';
    const meta=document.createElement('span');meta.className='track-meta';meta.textContent=song.artist||'MusicSubject';
    const genres=document.createElement('span');genres.className='recording-genres';genres.textContent=genreLabels(choice,GROUPS);copy.append(title,meta,genres);
    const facts=document.createElement('span');facts.className='recording-facts';facts.textContent=[choice.facts?format(Math.round(choice.facts.seconds)):choice.external?'Plays on '+(choice.platform||'external platform'):'Length not measured',choice.vocals==='unknown'?'Vocal details unverified':choice.vocals==='instrumental'?'Instrumental':choice.vocals==='spoken'?'Spoken':'Vocals indicated',...choice.flags].join(' · ');copy.append(facts);const enquire=makeButton('Ask about this recording',()=>openEnquiry(defaultTrack(song)));enquire.className='recording-enquiry';copy.append(enquire);
    if(choice.match?.score!==null&&choice.match?.score!==undefined){const match=document.createElement('span');match.className='match-note';match.textContent=`${choice.match.score}% search match · ${choice.match.matched.join(', ')}${choice.match.missing.length?' · Not documented: '+choice.match.missing.join(', '):''}`;copy.append(match);}
    if(choice.external){const link=document.createElement('a');link.className='external-link';link.href=choice.externalUrl;link.target='_blank';link.rel='noopener';link.textContent='Open on '+(choice.platform||'external platform')+' ↗';copy.append(link);}
    if(song.tracks.length>1){const select=document.createElement('select');select.setAttribute('aria-label',`Version of ${song.title}`);for(const t of song.visibleTracks){const o=document.createElement('option');o.value=t.variantId;o.textContent=`${song.tracks.findIndex(v=>v.variantId===t.variantId)+1}/${song.tracks.length} · ${t.variantLabel}${t.manualOnly?' · on request':''}`;select.append(o);}select.value=choice.variantId;select.addEventListener('change',()=>{choice=song.tracks.find(t=>t.variantId===select.value);chosenVersions.set(song.id,choice.variantId);img.src=choice.cover;if(choice.external){render();notify("Use the external link for this version.");}else start(choice);});copy.append(select);}else if(choice.manualOnly){const tag=document.createElement('span');tag.className='tag';tag.textContent='On request · excluded from autoplay';copy.append(tag);}
    const actions=document.createElement('div');actions.className='track-actions';const fav=makeButton(saved.includes(song.id)?'♥':'♡',()=>saveSong(song.id),`${saved.includes(song.id)?'Unsave':'Save'} ${song.title}`);fav.setAttribute('aria-pressed',String(saved.includes(song.id)));actions.append(fav,makeButton('↗',()=>shareTrack(defaultTrack(song)),`Share ${song.title}`));
    const pick=makeButton(shortlist.includes(trackKey(choice))?'✓':'＋',()=>toggleShortlist(defaultTrack(song)),`Shortlist ${song.title} — ${choice.variantLabel}`);pick.className='shortlist-add';pick.setAttribute('aria-pressed',String(shortlist.includes(trackKey(choice))));actions.append(pick);
    row.append(art,copy,actions);fragment.append(row);
  }
  if(!visible.length){const empty=document.createElement('div');empty.className='empty-state';empty.textContent=savedOnly?'No saved recordings match these filters.':info.kind==='brief'?info.description:'No recordings match all of these filters. Remove a filter or search the whole library.';fragment.append(empty);}
  $('tracks').replaceChildren(fragment);$('loadMore').hidden=limit>=visible.length;
  paintSelection();
}
function pickRow(song,choice){if(current?.songId===song.id&&isPlaying()){if(song.tracks.length>1)cycleVersion();else toggle();}else start(choice);}
function paintSelection(){
  if(!current)return;
  const family=catalog.find(s=>s.id===current.songId),index=family?.tracks.findIndex(t=>trackKey(t)===trackKey(current))??0;
  if(cueTrack&&family)updateCue(family,current);
  $('filmRecording').textContent=current.title+' · '+current.variantLabel;paintFilm();
  $('dockTitle').textContent=current.title;$('dockSubtitle').textContent=`${current.variantLabel} · ${current.artist}`;
  $('dockEnquiry').disabled=false;
  $('dockCover').src=current.cover||'/library/mark.svg';$('dockArt').setAttribute('aria-label',`Play or pause ${current.title}`);
  $('cycle').textContent=`${index+1} / ${family?.tracks.length||1}`;$('cycle').disabled=!family||family.tracks.filter(t=>t.audio).length<2;$('cycle').setAttribute('aria-label',`Version ${index+1} of ${family?.tracks.length||1}; play next version`);
  $('dockSave').textContent=saved.includes(current.songId)?'♥':'♡';$('dockSave').setAttribute('aria-pressed',String(saved.includes(current.songId)));
  document.querySelectorAll('.track-row').forEach(row=>{
    const active=row.dataset.song===current.songId;row.classList.toggle('playing',active);
    if(active){const select=row.querySelector('select');if(select&&Array.from(select.options).some(o=>o.value===current.variantId)){select.value=current.variantId;row.querySelector('img').src=current.cover;}}
  });
  document.title=`${current.title} — MusicSubject Library`;
}
function regularTrack(track){return {...track,experience:'',shareUrl:shareURL({track,origin:location.origin}),album:'MusicSubject Library'};}
function start(track){
  if(!track?.audio){if(track?.external)notify('This version plays on '+(track.platform||'an external platform')+'. Use its external listening link.');return;}
  controller?.pause();controller?.destroy();
  current=regularTrack(track);playbackSongs=visible;audio.volume=Number($('volume').value)/100;
  const queue=makeQueue(playbackSongs,current,shuffle).map(regularTrack);
  controller=window.CMDContinuousPlayback.create({id:'musicsubject-library',route:locationURL(current),audio,tracks:queue,localCount:queue.length,radio:{next:()=>null},loopLocal:repeat==='all',repeatOne:repeat==='one',followPages:false,restoreSession:false,onTrack:t=>{current=t;film.select();chosenVersions.set(t.songId,t.variantId);history.replaceState({},'',locationURL(t));render();},onStatus:kind=>{if(kind==='error')notify('Recording unavailable. Trying the next one…');if(kind==='failed'||kind==='blocked')notify('Tap Play to retry this recording.');}});
  controller.load(0,{autoplay:true,reason:'library-pick'});
  history.replaceState({},'',locationURL(current));notify(`${track.title} · ${track.variantLabel}`);paintSelection();
}
function cycleVersion(){if(!current)return;const tracks=catalog.find(s=>s.id===current.songId)?.tracks.filter(t=>t.audio)||[];if(tracks.length<2)return;const at=tracks.findIndex(t=>trackKey(t)===trackKey(current));start(tracks[(at+1)%tracks.length]);}
function toggle(){if(controller)controller.toggle();else start(current||visible.flatMap(s=>s.visibleTracks).find(t=>t.audio&&!t.manualOnly));}
function configureQueue(){if(!controller)return;controller.configureQueue({tracks:makeQueue(playbackSongs,current,shuffle).slice(1).map(regularTrack),loopLocal:repeat==='all',repeatOne:repeat==='one'});}
async function share(url,title,text=''){
  const data={url,title,text};if(navigator.share){try{await navigator.share(data);return;}catch(error){if(error.name==='AbortError')return;}}
  try{await navigator.clipboard.writeText(url);notify('Link copied.');}catch{$('shareAddress').value=url;$('shareFallback').showModal();$('shareAddress').select();}
}
let shareCopies=null;
// Copy is editorially reviewed in the existing release workflow; never navigate
// to its source URLs from this independent catalogue.
void fetch('/data/song-social.json').then(r=>r.ok?r.json():null).then(data=>{shareCopies=data?.songs||data;}).catch(()=>{});
function shareTrack(track){if(!track)return;const root=shareCopies?.[track.songId],copy=track.source?null:root?.versions?.[track.variantId];const text=`${copy?.title||track.shareCopy?.headline||track.title+' · '+track.variantLabel}\n\nOpen this recording in MusicSubject Library.`;return share(shareURL({track,origin:location.origin}),`${track.title} — MusicSubject Library`,text);}
let detailTrack=null;
function showDetails(song,track=defaultTrack(song)){detailTrack=track;
  const label=id=>GROUPS.find(g=>g.id===id)?.label||id;const facts=[['Recording',track.variantLabel],['Length',track.facts?format(Math.round(track.facts.seconds)):'Not measured'],['Style',track.genres.map(label).join(', ')||'Not verified'],['Mood',track.groups.filter(id=>GROUPS.some(g=>g.id===id&&g.kind==='mood')).map(label).join(', ')||'To review'],['Scene suggestions',track.scenes.map(id=>SCENES.find(s=>s.id===id)?.label||id).join(', ')||'To review'],['Vocal information',track.vocals],['Text review',track.flags.join('; ')||'Not fully reviewed; not certified clean'],['Production',track.provenance],['Audio preview',track.facts?`${track.facts.format} · ${track.facts.sampleRate/1000} kHz · ${track.facts.channels} channels`:track.external?'External release':'Streamed soundtrack']];
  if(track.moodNote)facts.push(['Why these moods',track.moodNote]);if(track.genreKnown)facts.push(['Genre source',track.genreSource]);if(track.genreStyles)facts.push(['Source styles',track.genreStyles]);
  facts.push(...analysisFacts(track));if(track.titleNote)facts.push(['Title note',track.titleNote]);
  $('detailFacts').replaceChildren(...facts.flatMap(([name,value])=>{const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=name;dd.textContent=value;return [dt,dd];}));const coverage=detailCoverage(track);$('detailCoverage').textContent=`Information supplied: ${coverage.available}/${coverage.total}. Still to confirm: ${coverage.checks.filter(x=>!x[1]).map(x=>x[0]).join(', ')}. This measures available information, not musical quality.`;
  $('detailShortlist').textContent=shortlist.includes(trackKey(track))?'Remove this version from shortlist':'Add this version to shortlist';$('detailTitle').textContent=song.title;$('detailArtist').textContent=song.artist||'MusicSubject';$('detailDescription').textContent=song.description||'No additional notes for this recording yet.';$('detailLyrics').textContent=track.lyricsReview?'Lyrics are being checked against this recording.':LIBRARY_LYRICS[song.id]?.lyrics||window.CMDSongLyrics?.lyrics(song.id)||'Lyrics are not available for this recording.';$('details').showModal();}
$('closeDetails').onclick=()=>$('details').close();$('closeShare').onclick=()=>$('shareFallback').close();
$('copyFallback').onclick=async()=>{try{await navigator.clipboard.writeText($('shareAddress').value);$('shareFallback').close();notify('Link copied.');}catch{$('shareAddress').select();notify('Select and copy the link in the box.');}};
$('searchForm').onsubmit=e=>{e.preventDefault();render();$('catalogue').scrollIntoView({behavior:'smooth',block:'start'});};$('search').oninput=()=>{limit=20;history.replaceState({},'',locationURL());render();};$('clearSearch').onclick=()=>{$('search').value='';history.replaceState({},'',locationURL());render();$('search').focus();};
$('savedToggle').onclick=()=>{savedOnly=!savedOnly;$('savedToggle').setAttribute('aria-pressed',String(savedOnly));limit=20;render();$('catalogue').scrollIntoView({behavior:'smooth'});};
$('loadMore').onclick=()=>{limit+=20;render();};$('playCollection').onclick=()=>{const first=visible.flatMap(s=>s.visibleTracks).find(t=>t.audio&&!t.manualOnly);start(first);};
$('play').onclick=toggle;$('dockArt').onclick=toggle;$('next').onclick=()=>controller?.next('library-next');$('previous').onclick=()=>controller?.previous();$('cycle').onclick=cycleVersion;
$('shuffle').onclick=()=>{shuffle=!shuffle;$('shuffle').setAttribute('aria-pressed',String(shuffle));configureQueue();};
$('repeat').onclick=()=>{repeat=repeat==='all'?'one':repeat==='one'?'off':'all';$('repeat').textContent=repeat==='one'?'↻1':'↻';$('repeat').setAttribute('aria-pressed',String(repeat!=='off'));$('repeat').setAttribute('aria-label',`Repeat ${repeat}; change repeat mode`);configureQueue();notify(`Repeat ${repeat}`);};
$('volume').oninput=()=>{audio.volume=Number($('volume').value)/100;savePreferences();};
$('seek').oninput=()=>{if(Number.isFinite(audio.duration))audio.currentTime=audio.duration*Number($('seek').value)/1000;};
$('dockSave').onclick=()=>saveSong(current?.songId);$('shareTrack').onclick=()=>shareTrack(current);
$('shareGroup').onclick=()=>share(shareURL({group,q:$('search').value,...filters(),origin:location.origin}),`${GROUPS.find(g=>g.id===group)?.label} — MusicSubject Library`,GROUPS.find(g=>g.id===group)?.description);
$('shareLibrary').onclick=()=>share(shareURL({origin:location.origin}),'MusicSubject Library','Press play. Picture your scene. Find songs, alternate versions and cues for your next story.');
$('skin').onclick=()=>{const on=document.body.classList.toggle('classic');$('skin').setAttribute('aria-pressed',String(on));$('skin').textContent=on?'Library view':'WinHamp view';savePreferences();};
$('dockCover').onerror=()=>{if(!$('dockCover').src.endsWith('/library/mark.svg'))$('dockCover').src='/library/mark.svg';};
addEventListener('popstate',()=>{const p=new URLSearchParams(location.search);group=GROUPS.some(g=>g.id===p.get('group'))?p.get('group'):'all';$('search').value=p.get('q')||'';restoreFilters(p);syncBrowseFilters();savedOnly=false;limit=20;render();});
document.addEventListener('keydown',e=>{if(e.code==='Space'&&!/INPUT|SELECT|TEXTAREA|BUTTON|A/.test(e.target.tagName)&&!e.target.isContentEditable&&!document.querySelector('dialog[open]')){e.preventDefault();toggle();}});
function updateFilters(){syncBrowseFilters();limit=20;savedOnly=false;$('savedToggle').setAttribute('aria-pressed','false');history.replaceState({},'',locationURL());render();}
for(const id of Object.values(filterIDs))$(id).onchange=updateFilters;
$('resetFilters').onclick=()=>{group='all';$('search').value='';restoreFilters(new URLSearchParams());updateFilters();};
document.querySelectorAll('[data-brief]').forEach(b=>b.onclick=()=>{group='all';$('search').value=b.dataset.brief;restoreFilters(new URLSearchParams());updateFilters();$('catalogue').scrollIntoView({behavior:'smooth',block:'start'});});
function toggleShortlist(track){if(!track)return;const key=trackKey(track);if(!shortlist.includes(key)&&shortlist.length>=30){notify('Your shortlist holds up to 30 recordings. Remove one to add another.');return;}shortlist=shortlist.includes(key)?shortlist.filter(k=>k!==key):[...shortlist,key];try{localStorage.setItem('ms-library-shortlist',JSON.stringify(shortlist));}catch{}$('shortlistCount').textContent=shortlist.length;render();renderShortlist();}
function inquiryText(){return buildInquiry(resolveShortlist(shortlist,catalog),$('projectBrief').value,t=>shareURL({track:t}));}
function renderShortlist(){$('inquiryCopy').hidden=true;$('inquiryStatus').textContent='';const tracks=resolveShortlist(shortlist,catalog);$('shortlistTracks').replaceChildren(...tracks.map(t=>{const row=document.createElement('div');row.className='shortlist-item';const title=document.createElement('strong'),version=document.createElement('p');title.textContent=t.title;version.textContent=t.variantLabel+' · '+(t.facts?format(Math.round(t.facts.seconds)):t.external?'External release':'Length unknown');row.append(title,version);if(t.audio)row.append(makeButton('Play',()=>{visible=tracks.map(x=>({tracks:[x],visibleTracks:[x]}));start(t);$('shortlistDialog').close();}));else{const a=document.createElement('a');a.href=t.externalUrl;a.target='_blank';a.rel='noopener';a.textContent='Open on '+(t.platform||'external platform')+' ↗';row.append(a);}row.append(makeButton('Remove',()=>toggleShortlist(t),`Remove ${t.title} — ${t.variantLabel}`));return row;}));if(!tracks.length)$('shortlistTracks').textContent='Have a scene in mind? Send your brief below, or add recordings with the ＋ button as you listen.';for(const id of ['shareShortlist','exportShortlist'])$(id).disabled=!tracks.length;$('playShortlist').disabled=!tracks.some(t=>t.audio&&!t.manualOnly);$('licensingInquiry').href=`mailto:${LICENSING_EMAIL}?subject=${encodeURIComponent('MusicSubject music enquiry')}&body=${encodeURIComponent(inquiryText())}`;}
function openEnquiry(track=null){
 if(track&&!shortlist.includes(trackKey(track))){
  if(shortlist.length>=30){notify('Your shortlist is full. Remove a recording before adding this one.');renderShortlist();$('shortlistDialog').showModal();return;}
  toggleShortlist(track);
 }
 if($('details').open)$('details').close();
 renderShortlist();$('shortlistDialog').showModal();$('projectBrief').focus();
}
$('contactLibrary').onclick=()=>openEnquiry();$('sendBrief').onclick=()=>openEnquiry();
$('detailEnquiry').onclick=()=>openEnquiry(detailTrack);$('dockEnquiry').onclick=()=>openEnquiry(current);
$('copyInquiry').onclick=async()=>{try{await navigator.clipboard.writeText(inquiryText());$('inquiryStatus').textContent='Enquiry copied. Paste it into an email to '+LICENSING_EMAIL+'.';}catch{$('inquiryStatus').textContent='Copy the enquiry text below and email '+LICENSING_EMAIL+'.';$('inquiryCopy').value=inquiryText();$('inquiryCopy').hidden=false;$('inquiryCopy').select();}};
$('contactAddress').textContent=LICENSING_EMAIL;$('contactAddress').href='mailto:'+LICENSING_EMAIL;
$('openShortlist').onclick=()=>{renderShortlist();$('shortlistDialog').showModal();};$('closeShortlist').onclick=()=>$('shortlistDialog').close();
$('detailShortlist').onclick=()=>{toggleShortlist(detailTrack);$('detailShortlist').textContent=shortlist.includes(trackKey(detailTrack))?'Remove this version from shortlist':'Add this version to shortlist';};
$('projectBrief').oninput=()=>{try{sessionStorage.setItem('ms-library-brief',$('projectBrief').value);}catch{}renderShortlist();};
try{$('projectBrief').value=sessionStorage.getItem('ms-library-brief')||'';}catch{}
$('playShortlist').onclick=()=>{const tracks=resolveShortlist(shortlist,catalog);visible=tracks.map(t=>({tracks:[t],visibleTracks:[t]}));start(tracks.find(t=>t.audio&&!t.manualOnly));$('shortlistDialog').close();};
$('shareShortlist').onclick=()=>share(shareURL({picks:shortlist,origin:location.origin}),'MusicSubject Library — shortlist','Exact recordings selected for a project.');
$('exportShortlist').onclick=()=>{const content=shortlistCSV(resolveShortlist(shortlist,catalog),t=>shareURL({track:t})),url=URL.createObjectURL(new Blob([content],{type:'text/csv;charset=utf-8'})),a=document.createElement('a');a.href=url;a.download='MusicSubject-shortlist.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};

let cueSong=catalog.find(s=>s.id===document.querySelector('[data-library-release]')?.dataset.libraryRelease);
let cueTrack=cueSong?.tracks.find(t=>t.variantId===(parameters.get('version')||cueSong.tracks[0].variantId));
function updateCue(song,track){
 cueSong=song;cueTrack=track;
 const intro=document.querySelector('[data-library-release]');intro.dataset.libraryRelease=song.id;
 $('intro-title').textContent=track.title;intro.querySelector('.eyebrow').textContent=track.libraryOnly?'MUSICSUBJECT / FILM CUES':'MUSICSUBJECT / LIBRARY';
 intro.querySelector('.lede').textContent=song.description||'';
 intro.querySelector('.cue-credit').textContent=`${track.artist} · ${track.facts?format(Math.round(track.facts.seconds)):'Full recording'}${track.vocals==='instrumental'?' · Instrumental':''}`;
 intro.querySelector('.cue-version').textContent=`${song.tracks.length} ${song.tracks.length===1?'recording':'recordings'} available · ${track.variantLabel}`;
 const img=$('cueArtwork').querySelector('img');img.src=track.cover;img.alt=track.title+' title artwork';$('cueArtwork').setAttribute('aria-label',(isPlaying()?'Pause ':'Play ')+track.title);
 $('cueVersionLabel').hidden=song.tracks.length<2;
 $('cueVersionSelect').replaceChildren(...song.tracks.filter(t=>t.audio).map(t=>{const o=document.createElement('option');o.value=t.variantId;o.textContent=t.variantLabel;return o;}));$('cueVersionSelect').value=track.variantId;
 $('cueAnalysis').textContent=analysisSummary(track);$('cueAnalysis').hidden=!track.analysis;
 $('cueShortlist').textContent=shortlist.includes(trackKey(track))?'✓ Shortlisted':'＋ Shortlist';
}
if(cueTrack){
 document.querySelector('.cue-copy').append($('filmPreview'));
 const playCue=()=>{if(current&&trackKey(current)===trackKey(cueTrack)&&controller)controller.toggle();else start(cueTrack);};
 $('cuePlay').onclick=playCue;$('cueArtwork').onclick=playCue;
 $('cueShare').onclick=()=>shareTrack(cueTrack);
 $('cueShortlist').onclick=()=>{toggleShortlist(cueTrack);$('cueShortlist').textContent=shortlist.includes(trackKey(cueTrack))?'✓ Shortlisted':'＋ Shortlist';};
 $('cueDetails').onclick=()=>showDetails(cueSong,cueTrack);
 $('cueVersionSelect').onchange=()=>{const next=cueSong.tracks.find(t=>t.variantId===$('cueVersionSelect').value);if(next)start(next);};
 $('cueShortlist').textContent=shortlist.includes(trackKey(cueTrack))?'✓ Shortlisted':'＋ Shortlist';
}
render();
if(parameters.has('song')){const requested=allTracks.find(t=>t.songId===parameters.get('song')&&(!parameters.has('version')||t.variantId===parameters.get('version')));if(requested&&!requested.external){current=requested;chosenVersions.set(requested.songId,requested.variantId);render();notify(`Ready: ${requested.title} · ${requested.variantLabel}. Tap Play.`);}else if(requested?.external){chosenVersions.set(requested.songId,requested.variantId);group='all';restoreFilters(new URLSearchParams());$('search').value=requested.title;render();notify('This version opens on '+(requested.platform||'an external platform')+'.');}else notify('That recording link is unavailable. Browse the collection below.');}
if(parameters.has('pick')){renderShortlist();$('shortlistDialog').showModal();}
let lastPaint=0;
function paint(now){requestAnimationFrame(paint);if(now-lastPaint<250||document.visibilityState==='hidden')return;lastPaint=now;const playing=isPlaying();if(cueTrack){const on=playing&&trackKey(current)===trackKey(cueTrack);$('cuePlay').textContent=on?'Ⅱ Pause recording':'▶ Play recording';$('cueArtwork').setAttribute('aria-label',(on?'Pause ':'Play ')+cueTrack.title);$('cueArtwork').querySelector('span').textContent=on?'Ⅱ':'▶';}$('play').textContent=playing?'Ⅱ':'▶';$('play').setAttribute('aria-label',playing?'Pause':'Play');
  const d=Number.isFinite(audio.duration)?audio.duration:0;$('elapsed').textContent=format(audio.currentTime);$('duration').textContent=format(d);$('seek').disabled=!d;$('seek').value=d?audio.currentTime/d*1000:0;
  if(Date.now()>noticeUntil){const next=controller?.peekNext();const left=audio.duration-audio.currentTime;$('status').textContent=playing&&next&&left>0&&left<=5?`Up next · ${next.title} · ${next.variantLabel}`:playing?'Your collection keeps playing while you browse.':current?'Ready when you are.':'Choose a song to start listening.';}
}
requestAnimationFrame(paint);
