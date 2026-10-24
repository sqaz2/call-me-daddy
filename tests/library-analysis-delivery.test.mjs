import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {loadCatalog} from '../scripts/sync-song-links.mjs';
import {buildLibraryCatalog} from '../library/catalog.mjs';
import {STARMUFF_TRACKS} from '../data/starmuff-playlist.mjs';
import {RECORDING_ANALYSIS} from '../library/recording-analysis.mjs';
import {librarySocial} from '../worker/library.mjs';
import {buildCatalog,filterCatalog,shareURL} from '../library/model.mjs';
import {analysisSummary,analysisFacts,matchesAnalysis} from '../library/analysis.mjs';
import {deliveryFacts,deliverySummary,requestedDeliverables} from '../library/delivery.mjs';
import {shortlistCSV,inquiryText} from '../library/discovery.mjs';

const songs=[{id:'song',title:'Version family',variants:[
 {id:'slow',audio:'/fixture-slow.mp3',analysis:{bpmEstimate:76,keyEstimate:'D major',keyStatus:'estimated',tempoStatus:'estimated'}},
 {id:'fast',audio:'/fixture-fast.mp3',analysis:{bpmEstimate:152,keyEstimate:'C minor',keyStatus:'provisional',tempoStatus:'low confidence'}},
 {id:'uncertain',audio:'/fixture-uncertain.mp3',analysis:{bpmEstimate:null,keyEstimate:null,keyStatus:'uncertain',tempoStatus:'uncertain'}},
 {id:'unknown',audio:'/fixture-unknown.mp3'}]}];
const catalog=buildCatalog(songs),ids=options=>filterCatalog(catalog,options).flatMap(s=>s.visibleTracks.map(t=>t.variantId));
test('tempo/key filters stay on the exact recording and unknown values cannot pass numeric filters',()=>{
 assert.deepEqual(ids({tempo:'slow',key:'D major'}),['slow']);
 assert.deepEqual(ids({tempo:'fast',key:'C minor'}),['fast']);
 assert.deepEqual(ids({tempo:'slow',key:'C minor'}),[]);
 assert.deepEqual(ids({tempo:'uncertain'}),['fast','uncertain']);
 assert.deepEqual(ids({key:'uncertain'}),['uncertain']);
 assert.deepEqual(ids({tempo:'unmeasured',key:'unmeasured'}),['unknown']);
 assert.equal(matchesAnalysis({analysis:{bpmEstimate:90}},{tempo:'slow'}),false);
 assert.equal(matchesAnalysis({analysis:{bpmEstimate:90}},{tempo:'medium'}),true);
 const u=new URL(shareURL({tempo:'fast',key:'C minor',track:catalog[0].tracks[1]}));assert.equal(u.searchParams.get('tempo'),'fast');assert.equal(u.searchParams.get('key'),'C minor');assert.equal(u.searchParams.get('version'),'fast');
 const social=librarySocial(u,null);assert.equal(new URL(social.canonical).searchParams.get('tempo'),'fast');assert.equal(new URL(social.canonical).searchParams.get('key'),'C minor');
 assert.match(analysisSummary(catalog[0].tracks[1]),/low confidence.*provisional/);
 assert.match(analysisSummary(catalog[0].tracks[2]),/Tempo uncertain.*Key uncertain/);
 assert.match(analysisFacts(catalog[0].tracks[3])[0][1],/Not analysed/);
});
test('preview and instrumental labels never invent clean edits, WAV masters or stems',()=>{
 const track={audio:'/example.mp3',vocals:'instrumental',facts:{format:'MP3'}};
 const facts=Object.fromEntries(deliveryFacts(track));
 assert.equal(facts['Listening file'],'MP3 preview available');
 assert.match(facts.Instrumental,/This recording/);
 for(const k of ['Clean edit','Original WAV master','Stems / multitracks'])assert.match(facts[k],/Not confirmed/);
 assert.match(deliverySummary({vocals:'vocal'}),/instrumental.*ask/);
 assert.equal(Object.fromEntries(deliveryFacts({external:true,audio:'/inherited.mp3'}))['Listening file'],'External listening link');
 assert.deepEqual(requestedDeliverables(['wav','stems','invented']),['Original WAV master','Separate stems / multitracks']);
});
test('shortlist exports and enquiries carry delivery needs without implying availability',()=>{
 const track={...catalog[0].tracks[1],scenes:[],flags:[],groups:[],genres:[],provenance:'AI involvement documented'};
 const csv=shortlistCSV([track],()=> 'https://library.musicsubject.com/?song=song&version=fast');
 assert.match(csv,/Original WAV master/);assert.match(csv,/Not confirmed/);assert.match(csv,/"152"/);assert.match(csv,/"provisional"/);
 const request=inquiryText([track],'A reunion scene',()=> 'https://library.musicsubject.com/?song=song&version=fast',['clean','wav']);
 assert.match(request,/Requested delivery options \(please confirm availability\)/);assert.match(request,/Reviewed clean edit/);assert.match(request,/Original WAV master/);assert.match(request,/version=fast/);
});

test('every playable recording has its own analysis; external links receive none',()=>{
 const all=buildLibraryCatalog(loadCatalog(),STARMUFF_TRACKS).flatMap(s=>s.tracks),local=all.filter(t=>t.audio&&!t.external),external=all.filter(t=>t.external);
 assert.equal(local.length,184);assert.equal(external.length,3);assert.equal(Object.keys(RECORDING_ANALYSIS).length,174);
 const audit=JSON.parse(fs.readFileSync('content/sources/library-audio-analysis-2026-10-24.json'));
 assert.equal(audit.recordings.length,174);assert.deepEqual(audit.errors,[]);
 for(const t of local){assert.ok(t.analysis,t.audio);assert.ok(t.facts?.seconds>0,t.audio);if(RECORDING_ANALYSIS[t.audio]){assert.deepEqual(t.analysis,RECORDING_ANALYSIS[t.audio].analysis);assert.match(t.analysis.sourceSha256,/^[a-f0-9]{64}$/);assert.ok(t.analysis.sourceBytes>0);}}
 for(const t of external){assert.equal(t.analysis,null);assert.equal(matchesAnalysis(t,{tempo:'slow'}),false);}
 for(const r of audit.recordings){assert.deepEqual(RECORDING_ANALYSIS[r.audio],{analysis:r.analysis,facts:r.facts});assert.ok(local.some(t=>t.audio===r.audio));if(r.analysis.keyStatus==='uncertain')assert.equal(r.analysis.keyEstimate,null);}
});
