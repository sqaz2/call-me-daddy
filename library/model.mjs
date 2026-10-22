export const LIBRARY_ORIGIN = 'https://library.musicsubject.com';
export const GROUPS = [
  {id:'all', label:'All music', kind:'collection', description:'Songs, alternate mixes and game soundtracks. Find a sound, then make it yours.'},
  {id:'motivational', label:'Motivational', kind:'mood', description:'Keep going, build something, and find your next step.'},
  {id:'high-energy', label:'High energy', kind:'mood', description:'Big drops, forward motion and music with some muscle.'},
  {id:'feel-good', label:'Feel good', kind:'mood', description:'Connection, possibility and a little room to breathe.'},
  {id:'emotional', label:'Emotional', kind:'mood', description:'Personal stories, reflection, loss and the work of getting through.'},
  {id:'cinematic', label:'Cinematic', kind:'mood', description:'Scene-setting soundtracks, dramatic songs and imagined worlds.'},
  {id:'comedy', label:'Comedy & satire', kind:'mood', description:'Absurd situations, sharp observations and jokes with a beat.'},
  {id:'sports', label:'Sports & competition', kind:'mood', description:'Competitive energy and challenge themes. A listening selection, not a placement credit.'},
  {id:'hiphop', label:'Hip-hop & rap', kind:'genre', description:'Rap, trap, chants and freestyle recordings.'},
  {id:'rnb', label:'R&B & soul', kind:'genre', description:'R&B and soul versions, grouped by their recorded style labels.'},
  {id:'country', label:'Country', kind:'genre', description:'Country and country-pop recordings, including novelty songs.'},
  {id:'rock', label:'Rock & alternative', kind:'genre', description:'Rock, alternative and punk versions from the catalogue.'},
  {id:'pop', label:'Pop', kind:'genre', description:'Pop-labelled songs and alternate recordings.'},
  {id:'edm', label:'Electronic & EDM', kind:'genre', description:'Electronic, dance, dubstep, drum & bass and warehouse mixes.'},
  {id:'dubstep', label:'Dubstep', kind:'genre', description:'Wobble, halftime, melodic drops and heavy bass.'},
  {id:'dnb', label:'Drum & bass', kind:'genre', description:'Drum & bass versions from the catalogue.'},
  {id:'instrumental', label:'Instrumentals', kind:'genre', description:'Recordings explicitly identified as instrumental.'},
  {id:'starmuff', label:'StarMuff · First Edition', kind:'collection', description:'The original 50-track StarMuff playlist: exploration, casino, Iron Frontier and more.'},
  {id:'commercial', label:'Commercial briefs', kind:'brief', description:'No recordings have been reviewed for a specific commercial brief yet.'},
  {id:'family', label:'Family-friendly briefs', kind:'brief', description:'No recordings have been reviewed and approved for this collection yet.'},
  {id:'holiday', label:'Holiday', kind:'brief', description:'No holiday recordings are tagged yet. New selections will appear here when added.'}
];

// Editorial mood selections are based on the existing catalogue descriptions.
// Genres below use individual recording labels before song-level style labels.
const MOODS = {
  motivational:['keep-moving','mind-at-war','hard-earned-light','survival-mode','one-brick','live-it-right','keep-building-your-future','times-are-coming','level-up','find-your-people','will-to-live','stomp-clamp'],
  'high-energy':['nomadic-hustla','everybody-thinks-theyre-hot','level-up','mind-at-war','hard-earned-light','make-me-an-animal','one-million-dollars'],
  'feel-good':['times-are-coming','keep-building-your-future','find-your-people','come-sit-here-with-me'],
  emotional:['thirty-six','shooting-star','september-26th-heartbreak','heartbreak-you-water-me','the-loudest-one-in-my-head','survival-mode','one-brick','live-it-right','this-is-my-story','come-sit-here-with-me','turning-invisible','the-games-she-hates','cheap-to-inform','everybody-else-less','locked-in-these-walls','under-watch','seven-days-locked','couple-friends-couple-calls','i-need-love','numbness-as-a-trap','never-come-back-down','will-to-live'],
  cinematic:['cheap-to-inform','satans-loan','her-story','twas-the-tism-mlord','cut-from-the-same-fabric-instrumental'],
  comedy:['concrete-under-evergreens','anti-generative-ai-diss','one-million-dollars','ashes-in-eastwood','side-chick-finder','everybody-thinks-theyre-hot','big-dick-willy','running-a-monopoly','canadian-crop-dusting','set-a-table-for-two','superstore-effect','twas-the-tism-mlord','armando','id-pick-you-first','did-armando-die-after-you-held-his-beer','back-to-sticks','the-musician-police','funhouse-meltdown','namaste-hamster'],
  sports:['what-is-my-opponent-threatening-right-now','level-up']
};
const GENRES = {hiphop:/\b(?:hip[ -]?hop|rap|trap|horrorcore|freestyle)\b/i, rnb:/\b(?:r&b|rnb|r-and-b|rhythm.and.blues|soul)\b/i, country:/\bcountry\b/i, rock:/\b(?:rock|punk|grunge)\b/i, pop:/\bpop\b/i, edm:/\b(?:edm|electronic|techno|warehouse|dubstep|dnb|drum.and.bass)\b/i, dubstep:/\bdubstep\b/i, dnb:/\b(?:dnb|d&b|drum.and.bass)\b/i, instrumental:/\binstrumental\b/i};
export const trackKey = t => `${t.songId}:${t.variantId}`;
export function buildCatalog(songs, starMuff=[]) {
  const result=[];
  for(const song of [...songs,...starMuff]) {
    const variants=song.variants?.some(v=>v.audio)?song.variants.filter(v=>v.audio):song.audio?[{id:'main',audio:song.audio,label:song.kind||'Main version'}]:[];
    const tracks=variants.map((v,i)=>{
      const groups=Object.entries(MOODS).filter(([,ids])=>ids.includes(song.id)).map(([id])=>id);
      const specific=[v.label,v.kind,v.shareGenre].filter(Boolean).join(' ');
      const general=[song.kind,song.shareGenre,song.title].filter(Boolean).join(' ');
      const evidence=Object.values(GENRES).some(re=>re.test(specific))?specific:general;
      for(const [id,re] of Object.entries(GENRES))if(re.test(evidence))groups.push(id);
      if(song.playlist==='starmuff')groups.push('starmuff','cinematic');
      const id=v.id||String(i);
      return {...song,...v,songId:song.id,variantId:id,variantLabel:v.label||'Main version',title:song.title,artist:song.artist||'MusicSubject',cover:song.playlist==='starmuff'?'/library/starmuff-cover':v.cover||song.cover||'/library/mark.svg',groups:[...new Set(groups)],manualOnly:song.rotation==='opt-in'||(song.openerPolicy?.eligibleVersions&&!song.openerPolicy.eligibleVersions.includes(id)),date:v.date||song.date||`${song.year||2000}-${String(song.month||1).padStart(2,'0')}-01`};
    });
    if(tracks.length)result.push({...song,tracks,groups:[...new Set(tracks.flatMap(t=>t.groups))]});
  }
  result.sort((a,b)=>String(b.tracks[0].date).localeCompare(String(a.tracks[0].date)));
  return result;
}
export function filterCatalog(catalog,{group='all',q='',savedOnly=false,saved=[]}={}) {
  const query=q.trim().toLowerCase();
  return catalog.flatMap(song=>{
    if(savedOnly&&!saved.includes(song.id))return [];
    const tracks=song.tracks.filter(t=>(group==='all'||t.groups.includes(group))&&(!query||[t.title,t.variantLabel,t.artist,song.description,...(song.aliases||[]),song.searchLyrics||''].join(' ').toLowerCase().includes(query)));
    return tracks.length?[{...song,visibleTracks:tracks}]:[];
  });
}
export function makeQueue(songs,first,shuffle=false,random=Math.random) {
  const all=songs.flatMap(s=>s.visibleTracks||s.tracks),at=all.findIndex(t=>trackKey(t)===trackKey(first));
  const ordered=at>=0?[...all.slice(at+1),...all.slice(0,at)]:all;
  const tracks=ordered.filter(t=>!t.manualOnly&&trackKey(t)!==trackKey(first));
  if(shuffle)for(let i=tracks.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[tracks[i],tracks[j]]=[tracks[j],tracks[i]];}
  return [first,...tracks];
}
export function shareURL({group='all',q='',track=null,origin=LIBRARY_ORIGIN}={}) {
  const url=new URL('/',origin);
  if(group!=='all')url.searchParams.set('group',group);
  if(q)url.searchParams.set('q',q);
  if(track){url.searchParams.set('song',track.songId);url.searchParams.set('version',track.variantId);}
  return url.href;
}
