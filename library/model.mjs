import {expandGenreFamilies} from './genres.mjs';
import {RECORDING_GENRES} from './recording-genres.mjs';
import {canonicalLibraryURL} from './identities.mjs';
import {EDITORIAL} from './editorial.mjs';
import {enrichTrack,parseBrief,matchBrief} from './discovery.mjs';
export const LIBRARY_ORIGIN = 'https://library.musicsubject.com';
export const GROUPS = [
  {id:'all', label:'All music', kind:'collection', description:'Songs, alternate mixes and game soundtracks. Audition a recording, save the exact version and ask about your project.'},
  {id:'film-cues',label:'Film cues',kind:'collection',description:'Orchestral themes, chamber cues and neoclassical scores. Compare alternate takes, check recording details and shortlist the version that fits your scene.'},
  {id:'motivational', label:'Encouragement & resolve', kind:'mood', description:'Keep going, build something, and find your next step.'},
  {id:'high-energy', label:'High energy', kind:'mood', description:'Big drops, forward motion and music with some muscle.'},
  {id:'feel-good', label:'Feel good', kind:'mood', description:'Connection, possibility and a little room to breathe.'},
  {id:'emotional', label:'Emotional', kind:'mood', description:'Personal stories, reflection, loss and the work of getting through.'},
  {id:'cinematic', label:'Cinematic', kind:'mood', description:'Scene-setting soundtracks, dramatic songs and imagined worlds.'},
  {id:'comedy', label:'Comedy & satire', kind:'mood', description:'Absurd situations, sharp observations and jokes with a beat.'},
  {id:'sports', label:'Sports & competition', kind:'mood', description:'Competitive energy and challenge themes. A listening selection, not a placement credit.'},
  {id:'reflective',label:'Reflective',kind:'mood',description:'Personal reflection and introspection, from the existing editorial catalogue.'},
  {id:'romantic',label:'Love & longing',kind:'mood',description:'Connection, romance and heartbreak. Content and tone vary by recording.'},
  {id:'tense',label:'Tense & unsettling',kind:'mood',description:'Suspense, fictional horror and tension cues.'},
  {id:'intense',label:'Intense & defiant',kind:'mood',description:'Primal, confrontational and action-oriented selections.'},
  {id:'curious',label:'Curious & exploratory',kind:'mood',description:'Wonder, curiosity and discovery in songs and soundtrack cues.'},
  {id:'relaxed',label:'Relaxed & background',kind:'mood',description:'Existing menu, reading and lounge cues. Audition the recording for your scene.'},
  {id:'hopeful',label:'Hopeful',kind:'mood',description:'Possibility and a reason to believe, including quiet or tentative hope.'},
  {id:'vulnerable',label:'Vulnerable & open',kind:'mood',description:'Letting someone see the uncertainty, need or hurt underneath.'},
  {id:'lonely',label:'Lonely & seeking company',kind:'mood',description:'Isolation, alienation and the wish for companionship.'},
  {id:'bitter',label:'Bitter & resentful',kind:'mood',description:'Resentment, disappointment and self-critical anger.'},
  {id:'gentle',label:'Gentle & tender',kind:'mood',description:'Softness, sweetness, affection and care.'},
  {id:'triumphant',label:'Winning & triumphant',kind:'mood',description:'Victory, progress and a sense of overcoming.'},
  {id:'playful',label:'Playful',kind:'mood',description:'Mischief, wit and an intentionally light touch.'},
  {id:'anxious',label:'Anxious & uncertain',kind:'mood',description:'Self-doubt, overthinking and uncertainty.'},
  {id:'sensual',label:'Sensual & magnetic',kind:'mood',description:'Desire, attraction and charged intimacy.'},
  {id:'confident',label:'Confident',kind:'mood',description:'Swagger, certainty and self-belief.'},
  {id:'hiphop', label:'Hip-hop & rap', kind:'genre', description:'Rap, trap, chants and freestyle recordings.'},
  {id:'trap',label:'Trap',kind:'genre',description:'Recordings specifically labelled as trap.'},
  {id:'rnb', label:'R&B & soul', kind:'genre', description:'R&B and soul versions, grouped by their recorded style labels.'},
  {id:'country', label:'Country', kind:'genre', description:'Country and country-pop recordings, including novelty songs.'},
  {id:'rock', label:'Rock & alternative', kind:'genre', description:'Rock, alternative and punk versions from the catalogue.'},
  {id:'pop', label:'Pop', kind:'genre', description:'Pop-labelled songs and alternate recordings.'},
  {id:'edm', label:'Electronic & EDM', kind:'genre', description:'Electronic, dance, dubstep, drum & bass and warehouse mixes.'},
  {id:'dubstep', label:'Dubstep', kind:'genre', description:'Wobble, halftime, melodic drops and heavy bass.'},
  {id:'dnb', label:'Drum & bass', kind:'genre', description:'Drum & bass versions from the catalogue.'},
  {id:'techno',label:'Techno',kind:'genre',description:'Techno recordings, including lo-fi, underground and ambient techno.'},
  {id:'house',label:'House',kind:'genre',description:'House recordings, including tropical, G-house and bass house.'},
  {id:'bass-house',label:'Bass house',kind:'genre',description:'Bass-house and G-house recordings.'},
  {id:'trance',label:'Trance',kind:'genre',description:'Recordings explicitly described as trance.'},
  {id:'glitch-hop',label:'Glitch hop',kind:'genre',description:'Electronic and hip-hop crossover recordings labelled glitch hop.'},
  {id:'boom-bap',label:'Boom bap',kind:'genre',description:'Hip-hop recordings described as boom bap.'},
  {id:'metal',label:'Metal',kind:'genre',description:'Metal and alternative-metal recordings.'},
  {id:'blues',label:'Blues',kind:'genre',description:'Blues and blues-rock recordings.'},
  {id:'funk',label:'Funk',kind:'genre',description:'Funk and disco-funk recordings.'},
  {id:'disco',label:'Disco',kind:'genre',description:'Disco and disco-funk recordings.'},
  {id:'reggae',label:'Reggae',kind:'genre',description:'Recordings with an explicit reggae style.'},
  {id:'ska',label:'Ska',kind:'genre',description:'Ska and ska-punk recordings.'},
  {id:'gospel',label:'Gospel',kind:'genre',description:'Recordings specifically labelled as gospel.'},
  {id:'spoken',label:'Spoken word & chant',kind:'genre',description:'Recordings labelled as spoken word, chant or a spoken opening.'},
  {id:'soundtrack',label:'Game soundtrack',kind:'genre',description:'The original StarMuff game cues, with their source titles preserved.'},
  {id:'unclassified',label:'Genre to review',kind:'review',description:'These recordings are available, but their genre needs a listening review.'},
  {id:'instrumental', label:'Instrumentals', kind:'genre', description:'Recordings explicitly identified as instrumental.'},
  {id:'orchestral',label:'Orchestral',kind:'genre',description:'Orchestral recordings identified in the supplied source descriptions.'},
  {id:'chamber',label:'Chamber',kind:'genre',description:'Chamber recordings identified in the supplied source descriptions.'},
  {id:'neoclassical',label:'Neoclassical',kind:'genre',description:'Neoclassical scores identified in the supplied source descriptions.'},
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
const GENRES = {techno:/\btechno\b/i,house:/\bhouse\b/i,'bass-house':/\b(?:bass[ -]house|g[ -]house)\b/i,trance:/\btrance\b/i,'glitch-hop':/\bglitch[ -]hop\b/i,'boom-bap':/\bboom[ -]bap\b/i,metal:/\bmetal\b/i,blues:/\bblues\b/i,funk:/\bfunk\b/i,disco:/\bdisco\b/i,reggae:/\breggae\b/i,ska:/\bska\b/i,orchestral:/\borchestral\b/i,chamber:/\bchamber\b/i,neoclassical:/\bneo[ -]?classical\b/i,trap:/\btrap\b/i,hiphop:/\b(?:hip[ -]?hop|rap|trap|horrorcore|freestyle)\b/i, rnb:/\b(?:r&b|rnb|r-and-b|rhythm.and.blues|soul)\b/i, country:/\bcountry\b/i, rock:/\b(?:rock|punk|grunge)\b/i, pop:/\bpop\b/i, edm:/\b(?:edm|electronic|techno|warehouse|dubstep|dnb|drum.and.bass)\b/i, dubstep:/\bdubstep\b/i, dnb:/\b(?:dnb|d&b|drum.and.bass)\b/i, gospel:/\bgospel\b/i,spoken:/\b(?:spoken.word|chant)\b/i,instrumental:/\binstrumental\b/i};
export const trackKey = t => `${t.songId}:${t.variantId}`;
export function buildCatalog(songs, starMuff=[], context={}) {
  const result=[];
  for(const song of [...songs,...starMuff]) {
    const variants=song.variants?.some(v=>v.audio)?song.variants.filter(v=>v.audio||v.externalUrl):song.audio?[{id:'main',audio:song.audio,label:song.kind||'Main version'}]:song.youtubeUrl?[{id:'main',label:'YouTube release',externalUrl:song.youtubeUrl,external:true,platform:'YouTube'}]:[];
    const tracks=variants.map((v,i)=>{
      const groups=Object.entries(MOODS).filter(([,ids])=>ids.includes(song.id)).map(([id])=>id);
      const specific=[v.label,v.kind,v.genre,v.shareGenre].filter(Boolean).join(' ');
      const general=[variants.length>1&&/\bversions?\b/i.test(song.kind||'')?'':song.kind,song.genre,song.shareGenre].filter(Boolean).join(' ');
      // Only use a description as genre evidence for a single recording; never
      // let one alternate mix's style leak into its siblings.
      const fallback=variants.length===1?[song.description,...(song.title.match(/\([^)]*\)/g)||[])].join(' '):'';
      const evidence=Object.values(GENRES).some(re=>re.test(specific))?specific:Object.values(GENRES).some(re=>re.test(general))?general:fallback;
      for(const [id,re] of Object.entries(GENRES))if(re.test(evidence))groups.push(id);
      if(song.playlist==='starmuff')groups.push('starmuff','cinematic','soundtrack');
      if(song.libraryOnly&&song.project==='Film cues')groups.push('film-cues');
      for(const id of [...(EDITORIAL[song.id]?.genres||[]),...(EDITORIAL[song.id]?.variants?.[v.id]?.genres||[])])if(GROUPS.some(g=>g.id===id&&g.kind==='genre'))groups.push(id);
      const id=v.id||String(i);
      const recordingGenre=RECORDING_GENRES[v.audio];
      const genres=expandGenreFamilies([...groups.filter(g=>GROUPS.some(x=>x.id===g&&x.kind==='genre')),...(recordingGenre?.genres||[])]);
      groups.push(...genres);
      if(!genres.length)groups.push('unclassified');
      const profile=enrichTrack(song,v,groups,context);
      return {...song,...v,audio:v.audio||'',songId:song.id,variantId:id,variantLabel:v.label||'Main version',title:song.title,artist:song.artist||'MusicSubject',cover:song.playlist==='starmuff'?'/library/starmuff-cover':v.cover||song.cover||'/library/mark.svg',...profile,genres,genreSource:recordingGenre?.source||profile.genreSource,genreSourceUrl:recordingGenre?.sourceUrl||'',genreStyles:recordingGenre?.styleSummary||'',genreKnown:genres.length>0,manualOnly:v.external||song.rotation==='opt-in'||(song.openerPolicy?.eligibleVersions&&!song.openerPolicy.eligibleVersions.includes(id)),date:v.date||song.date||`${song.year||2000}-${String(song.month||1).padStart(2,'0')}-01`};
    });
    if(tracks.length)result.push({...song,tracks,groups:[...new Set(tracks.flatMap(t=>t.groups))]});
  }
  result.sort((a,b)=>String(b.tracks[0].date).localeCompare(String(a.tracks[0].date)));
  return result;
}
// Browse buttons and dropdowns use the same state. Legacy group links still work,
// but an explicit dropdown replaces a group of the same kind instead of hiding it.
export function normalizeFilters(state={}) {
 const result={...state},selected=GROUPS.find(g=>g.id===result.group);
 const key=selected?.kind==='mood'?'mood':selected?.kind==='genre'||selected?.id==='unclassified'?'genre':null;
 if(key){result[key]=result[key]||selected.id;result.group='all';}
 return result;
}
export function filterCatalog(catalog,options={}) {
 const {group='all',q='',savedOnly=false,saved=[],mood='',genre='',scene='',vocals='',length='',sort='relevance',shortlist=null}=normalizeFilters(options);
  const brief=parseBrief(q);
  const found=catalog.flatMap(song=>{
    if(savedOnly&&!saved.includes(song.id))return [];
    const tracks=song.tracks.flatMap(t=>{
      if(group!=='all'&&!t.groups.includes(group)||mood&&!t.groups.includes(mood)||genre&&!t.groups.includes(genre)||scene&&!t.scenes.includes(scene)||vocals&&t.vocals!==vocals||shortlist&&!shortlist.includes(trackKey(t)))return [];
      const seconds=t.facts?.seconds;
      if(length==='short'&&!(seconds>0&&seconds<=120)||length==='medium'&&!(seconds>120&&seconds<=240)||length==='long'&&!(seconds>240))return [];
      const match=matchBrief(song,t,brief);return match?[{...t,match}]:[];
    });
    if(!tracks.length)return [];
    if(q.trim())tracks.sort((a,b)=>Number(!!b.match.versionMatch)-Number(!!a.match.versionMatch)||Number(!!b.match.titleMatch)-Number(!!a.match.titleMatch)||(b.match.score||0)-(a.match.score||0));
    return [{...song,visibleTracks:tracks,match:tracks[0].match}];
  });
  if(sort==='title')found.sort((a,b)=>a.title.localeCompare(b.title));
  else if(sort==='shortest')found.sort((a,b)=>(a.visibleTracks[0].facts?.seconds??Infinity)-(b.visibleTracks[0].facts?.seconds??Infinity));
  else if(q.trim())found.sort((a,b)=>Number(!!b.match.exactTitle)-Number(!!a.match.exactTitle)||Number(!!b.match.titleMatch)-Number(!!a.match.titleMatch)||(b.match.score||0)-(a.match.score||0));
  // Prefer complete matches; show clearly labelled alternatives only when none fit.
  return q.trim()&&found.some(s=>s.match.score===100)?found.filter(s=>s.match.score===100).map(s=>({...s,visibleTracks:s.visibleTracks.filter(t=>t.match.score===100)})):found;
}
export function makeQueue(songs,first,shuffle=false,random=Math.random) {
  if(!first?.audio)return [];
  const all=songs.flatMap(s=>s.visibleTracks||s.tracks),at=all.findIndex(t=>trackKey(t)===trackKey(first));
  const ordered=at>=0?[...all.slice(at+1),...all.slice(0,at)]:all;
  const tracks=ordered.filter(t=>t.audio&&!t.manualOnly&&trackKey(t)!==trackKey(first));
  if(shuffle)for(let i=tracks.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[tracks[i],tracks[j]]=[tracks[j],tracks[i]];}
  return [first,...tracks];
}
export function shareURL({group='all',q='',track=null,origin=LIBRARY_ORIGIN,mood='',genre='',scene='',vocals='',length='',sort='',picks=[]}={}) {
  const url=new URL('/',origin);
  if(group!=='all')url.searchParams.set('group',group);
  if(q)url.searchParams.set('q',q);
  for(const [key,value] of Object.entries({mood,genre,scene,vocals,length,sort}))if(value)url.searchParams.set(key,value);
  for(const key of [...new Set(picks)].slice(0,30))url.searchParams.append('pick',key);
  if(track){url.searchParams.set('song',track.songId);url.searchParams.set('version',track.variantId);}
  return canonicalLibraryURL(url).href;
}
