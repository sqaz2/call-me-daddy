import {LIBRARY_RELEASES} from './releases.mjs';
import {AUDIO_FACTS} from './audio-facts.mjs';
import {analysisSummary} from './analysis.mjs';
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function resolveLibraryRelease(url){
 const song=LIBRARY_RELEASES.find(s=>s.id===url.searchParams.get('song'));
 const variant=song?.variants.find(v=>v.id===(url.searchParams.get('version')||song.variants[0].id));
 return song&&variant?{song,variant}:null;
}
export function renderLibraryRelease({song,variant}){
 const facts=AUDIO_FACTS[variant.audio],seconds=Math.round(facts?.seconds||0);
 const duration=seconds?`${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}`:'Full recording';
 return `<section class="intro cue-intro" aria-labelledby="intro-title" data-library-release="${escape(song.id)}">
 <button id="cueArtwork" class="cue-art" aria-label="Play ${escape(song.title)}"><img src="${escape(variant.cover||song.cover)}" alt="${escape(song.title)} title artwork" width="1200" height="1200"><span aria-hidden="true">▶</span></button>
 <div class="cue-copy"><p class="eyebrow">MUSICSUBJECT / FILM CUES</p><h1 id="intro-title">${escape(song.title)}</h1><p class="cue-credit">${escape(song.artist)} · ${escape(duration)} · Instrumental</p><p class="lede">${escape(song.description)}</p>
 <div class="cue-actions"><button id="cuePlay" class="primary">▶ Play recording</button><button id="cueShare">Share ↗</button><button id="cueShortlist">＋ Shortlist</button></div>
 <label id="cueVersionLabel" class="cue-select"${song.variants.length===1?' hidden':''}>Choose recording<select id="cueVersionSelect">${song.variants.map(v=>`<option value="${escape(v.id)}"${v.id===variant.id?' selected':''}>${escape(v.label)}</option>`).join('')}</select></label>
 <p class="cue-version">${song.variants.length} ${song.variants.length===1?'recording':'recordings'} available · ${escape(variant.label)}</p><p id="cueAnalysis" class="cue-version"${variant.analysis?'':' hidden'}>${escape(analysisSummary(variant))}</p><button id="cueDetails" class="cue-details">Recording details & project enquiries →</button><p id="totalCount" hidden></p></div></section>`;
}
