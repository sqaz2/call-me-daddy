// Analysis belongs to an exact uploaded recording, never to its alternate takes.
export function analysisSummary(track){
 const a=track?.analysis;if(!a)return '';
 const tempo=Number.isFinite(a.bpmEstimate)?`≈${a.bpmEstimate} BPM${a.tempoStatus==='low confidence'?' (low confidence)':''}`:'';
 const key=a.keyStatus==='uncertain'?'Key uncertain':a.keyEstimate?`${a.keyEstimate} (${a.keyStatus==='provisional'?'provisional':'estimated'})`:'';
 return [tempo,key].filter(Boolean).join(' · ');
}
const time=s=>`${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,'0')}`;
export function analysisFacts(track){
 const a=track?.analysis;if(!a)return [];
 const facts=[];
 if(Number.isFinite(a.bpmEstimate))facts.push(['Tempo estimate',`${a.bpmRange||a.bpmEstimate} BPM · ${a.tempoStatus||'estimated'}. ${a.tempoNote||''}`.trim()]);
 facts.push(['Key estimate',`${a.keyStatus==='uncertain'?'Uncertain':a.keyEstimate||'Not established'}${a.keyStatus==='provisional'?' (provisional)':''}. ${a.keyNote||''}`.trim()]);
 if(Number.isFinite(a.integratedLufs))facts.push(['Measured loudness',`${a.integratedLufs} LUFS integrated${Number.isFinite(a.loudnessRangeLu)?` · ${a.loudnessRangeLu} LU loudness range`:''}`]);
 if(Number.isFinite(a.strongestSectionStart)&&Number.isFinite(a.strongestSectionEnd))facts.push(['Strongest measured section',`${time(a.strongestSectionStart)}–${time(a.strongestSectionEnd)} · highest ten-second average level`]);
 facts.push(['Analysis basis',a.method||'Automated estimates; confirm by musical review.']);
 return facts;
}
