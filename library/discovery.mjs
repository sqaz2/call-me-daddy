import {EDITORIAL} from './editorial.mjs';
import {AUDIO_FACTS} from './audio-facts.mjs';

export const SCENES=[
 {id:'comeback',label:'Comeback & perseverance'}, {id:'connection',label:'Love & connection'},
 {id:'reflection',label:'Loss & reflection'}, {id:'comic',label:'Comic situations'},
 {id:'tension',label:'Suspense & unease'}, {id:'action',label:'Action & competition'},
 {id:'exploration',label:'Wonder & discovery'}, {id:'nightlife',label:'Nightlife & casino'},
 {id:'background',label:'Menus & reading'}
];
export const LICENSING_EMAIL='notacop@moneylaundering.dev'; // Existing public Contact Will address.
const sceneMoods={motivational:'comeback','feel-good':'connection',romantic:'connection',emotional:'reflection',reflective:'reflection',comedy:'comic',tense:'tension',intense:'action',sports:'action',curious:'exploration',relaxed:'background'};
export function enrichTrack(song,variant,groups,{lyrics={}}={}){
 const editorial=EDITORIAL[song.id],moods=[...(editorial?.moods||[]),...(song.discoveryMoods||[])];
 const added=[...groups,...moods],scenes=[];
 if(song.playlist==='starmuff'){
  const title=song.title.toLowerCase();
  if(/exploration|anomaly|abomoly/.test(title)){added.push('curious');scenes.push('exploration');}
  if(/tension/.test(title)){added.push('tense');scenes.push('tension');}
  if(/combat|battle|street fighter/.test(title)){added.push('intense');scenes.push('action');}
  if(/casino/.test(title))scenes.push('nightlife');
  if(/menu|reading|lounge/.test(title)){added.push('relaxed');scenes.push('background');}
 }
 for(const g of added)if(sceneMoods[g])scenes.push(sceneMoods[g]);
 const text=[variant.label,variant.kind].filter(Boolean).join(' '),songText=lyrics[song.id]?.search||'';
 const instrumental=added.includes('instrumental');
 const vocals=instrumental?'instrumental':/\bspoken\b/i.test(text)||(song.id==='her-story'&&variant.id==='opening')?'spoken':songText||/\b(vocal|chant|rap|song)\b/i.test([text,song.kind,song.description].join(' '))?'vocal':'unknown';
 const flags=[];
 if(/\b(?:fuck\w*|shit\w*|bitch\w*|asshole\w*|dick|cunt\w*)\b/i.test([song.title,text,songText].join(' ')))flags.push('Explicit language in supplied text');
 if(/\bexplicit\b/i.test(song.kind||'')&&!flags.length)flags.push('Explicit release label');
 const provenance=variant.productionNote||(/\b(?:suno|AI|Gemini|voice.clone)\b/i.test([song.kind,song.description,text,song.sunoUrl].filter(Boolean).join(' '))?'AI involvement documented':'Production method not fully documented');
 return {groups:[...new Set(added)],scenes:[...new Set(scenes)],facts:AUDIO_FACTS[variant.audio]||null,vocals,flags,provenance,moodSource:editorial?.source||(song.playlist==='starmuff'?'Soundtrack cue titles and game use':'Catalogue description'),lyricsAvailable:!!songText};
}
const synonyms={hopeful:'motivational',hope:'motivational',uplifting:'motivational',inspiring:'motivational',inspirational:'motivational',resilience:'motivational',perseverance:'comeback',happy:'feel-good',upbeat:'feel-good',joyful:'feel-good',sad:'emotional',sadness:'emotional',melancholy:'emotional',melancholic:'emotional',heartbreak:'emotional',funny:'comedy',humorous:'comedy',satire:'comedy',humour:'comedy',humor:'comedy',love:'romantic',longing:'romantic',romance:'romantic',friendship:'connection',friends:'connection',suspense:'tense',suspenseful:'tense',scary:'tense',horror:'tense',aggressive:'intense',defiant:'intense',space:'exploration',adventure:'exploration',wonder:'exploration',discovery:'exploration',calm:'relaxed',calming:'relaxed',chill:'relaxed',quiet:'relaxed',electronic:'edm',hiphop:'hiphop',rap:'hiphop',soul:'rnb',rnb:'rnb',drumandbass:'dnb',drumnbass:'dnb',sports:'sports',instrumentals:'instrumental',instrumental:'instrumental',vocals:'vocal',lyrics:'vocal'};
const concepts=new Set(['trap','gospel','spoken','soundtrack',...Object.values(synonyms),'country','dubstep','rock','pop','cinematic','reflective','curious','motivational','high-energy','feel-good','emotional','comedy','sports','intense','romantic','tense','relaxed',...SCENES.map(s=>s.id)]);
const stop=new Set('i we need want looking find music song songs track tracks recording recordings for a an the and or with that is feels feeling something me to of in by on some please scene film video tv movie but'.split(' '));
const normalize=s=>String(s||'').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/drum\s*(?:&|and|n)\s*bass/g,'drumandbass').replace(/hip[ -]hop/g,'hiphop').replace(/r\s*&\s*b/g,'rnb').replace(/feel[ -]good/g,'feel-good').replace(/high[ -]energy/g,'high-energy');
const titleKey=s=>normalize(s).replace(/[’'‘]/g,'').replace(/[^a-z0-9]+/g,' ').trim();
const canonical=s=>synonyms[s]||s;
export function parseBrief(q=''){
 let text=normalize(q),vocals='';const excluded=[];
 text=text.replace(/\b(?:no|without)\s+(?:vocals?|lyrics?|singing)\b/g,()=>{vocals='instrumental';return '';});
 text=text.replace(/\b(?:no|without|not)\s+([\w-]+)/g,(_,v)=>{excluded.push(canonical(v));return '';});
 text=text.replace(/(?:^|\s)-([\w-]+)/g,(_,v)=>{excluded.push(canonical(v));return ' ';});
 const terms=[...new Set((text.match(/[a-z0-9]+(?:-[a-z0-9]+)*/g)||[]).filter(t=>!stop.has(t)).map(canonical))];
 return {terms,excluded,vocals,phrase:normalize(q).trim(),titlePhrase:titleKey(q)};
}
export function matchBrief(song,track,brief){
 const tags=new Set([...track.groups,...(track.scenes||[]),track.vocals]);
 const text=normalize([song.title,track.variantLabel,song.artist,song.project,...(track.aliases||[]),song.description,...(song.aliases||[]),song.searchLyrics||''].join(' '));
 const words=new Set(text.match(/[a-z0-9]+(?:-[a-z0-9]+)*/g)||[]);
 const has=t=>concepts.has(t)?tags.has(t):words.has(t);
 const titles=[song.title,...(song.aliases||[]),song.id?.replace(/-/g,' ')].filter(Boolean).map(titleKey);
 if(brief.titlePhrase&&titles.includes(brief.titlePhrase))return {score:100,matched:['Exact title'],missing:[],exactTitle:true,titleMatch:true,versionMatch:titleKey(track.variantLabel).includes(brief.titlePhrase)};
 if(brief.excluded.some(has)||brief.vocals&&track.vocals!==brief.vocals)return null;
 // Find a remembered title/version without forcing its words through mood synonyms.
 // Single genre/mood queries still select documented tags, not title subjects.
 const titleQuery=brief.titlePhrase;
 if(!brief.excluded.length&&!brief.vocals&&titleQuery?.length>=3&&(titleQuery.includes(' ')||!concepts.has(canonical(titleQuery)))&&[...titles,titleKey(track.variantLabel)].some(title=>title.includes(titleQuery)))return {score:100,matched:['Title / version'],missing:[],titleMatch:true};
 const matched=brief.terms.filter(has),missing=brief.terms.filter(t=>!has(t));
 if(brief.terms.length&&!matched.length)return null;
 return {score:brief.terms.length?Math.round(100*matched.length/brief.terms.length):null,matched,missing};
}
export function detailCoverage(track){
 const checks=[['Title & artist',!!track.title&&!!track.artist],['Mood / scene tags',track.groups.some(g=>['motivational','high-energy','feel-good','emotional','cinematic','comedy','sports','reflective','romantic','tense','intense','curious','relaxed'].includes(g))],['Genre',!!track.genreKnown],['Measured duration',!!track.facts?.seconds],['Vocal information',track.vocals!=='unknown'],['Lyrics / instrumental identification',track.lyricsAvailable||track.vocals==='instrumental'],['Master & publishing clearance',false],['Delivery files / stems confirmed',false]];
 return {available:checks.filter(x=>x[1]).length,total:checks.length,checks};
}
export function resolveShortlist(keys,catalog){
 const byKey=new Map(catalog.flatMap(s=>s.tracks).map(t=>[`${t.songId}:${t.variantId}`,t]));
 return [...new Set(keys)].slice(0,30).map(k=>byKey.get(k)).filter(Boolean);
}
export function shortlistCSV(tracks,makeURL){
 const cell=v=>'"'+String(v??'').replace(/^[=+@-]/,"'$&").replace(/"/g,'""')+'"';
 return [['Title','Artist','Version','Seconds','Genres','Moods / collections','Scene suggestions','Vocals','Text flags','Production notes','Clearance','Exact recording URL'],...tracks.map(t=>[t.title,t.artist,t.variantLabel,t.facts?.seconds||'',t.genres?.join('; ')||'Unverified',t.groups.join('; '),t.scenes?.join('; ')||'',t.vocals,t.flags?.join('; ')||'Not fully reviewed',t.provenance,'Confirm master and publishing rights',makeURL(t)])].map(row=>row.map(cell).join(',')).join('\r\n');
}

export function inquiryText(tracks,brief,makeURL){
 return `Hello William,\n\nI’m looking for music for a project.\n\n${brief.trim()||'Scene / story:\nProduction and intended use:\nTerritories and licence term:\nBudget range:\nDeadline:'}\n\n${tracks.length?'Recordings I’m interested in:\n'+tracks.map(t=>`${t.title} — ${t.variantLabel}\n${makeURL(t)}`).join('\n\n'):'I’d appreciate suggestions for the brief above.'}\n\nCould you confirm availability, pricing, master and publishing clearance, and which edits or delivery files are available for this use?`;
}
