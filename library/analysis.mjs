// Analysis belongs to an exact uploaded recording, never to its alternate takes.
export function analysisSummary(track){
 const a=track?.analysis;if(!a)return '';
 const tempo=Number.isFinite(a.bpmEstimate)?`≈${a.bpmEstimate} BPM${a.tempoStatus==='low confidence'?' (low confidence)':''}`:a.tempoStatus==='uncertain'?'Tempo uncertain':'';
 const key=a.keyStatus==='uncertain'?'Key uncertain':a.keyEstimate?`${a.keyEstimate} (${a.keyStatus==='provisional'?'provisional':'estimated'})`:'';
 return [tempo,key].filter(Boolean).join(' · ');
}
const time=s=>`${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,'0')}`;
export function analysisFacts(track){
 const a=track?.analysis;if(!a)return [['Tempo / key','Not analysed — external recording or unavailable audio']];
 const facts=[];
 if(!Number.isFinite(a.bpmEstimate))facts.push(['Tempo estimate',a.tempoNote||'Uncertain']);
 if(Number.isFinite(a.bpmEstimate))facts.push(['Tempo estimate',`${a.bpmRange||a.bpmEstimate} BPM · ${a.tempoStatus||'estimated'}. ${a.tempoNote||''}`.trim()]);
 facts.push(['Key estimate',`${a.keyStatus==='uncertain'?'Uncertain':a.keyEstimate||'Not established'}${a.keyStatus==='provisional'?' (provisional)':''}. ${a.keyNote||''}`.trim()]);
 if(Number.isFinite(a.integratedLufs))facts.push(['Measured loudness',`${a.integratedLufs} LUFS integrated${Number.isFinite(a.loudnessRangeLu)?` · ${a.loudnessRangeLu} LU loudness range`:''}`]);
 if(Number.isFinite(a.strongestSectionStart)&&Number.isFinite(a.strongestSectionEnd))facts.push(['Strongest measured section',`${time(a.strongestSectionStart)}–${time(a.strongestSectionEnd)} · highest ten-second average level`]);
 facts.push(['Analysis basis',a.method||'Automated estimates; confirm by musical review.']);
 return facts;
}

// Filter the published estimate only; do not silently substitute half/double time.
export function matchesAnalysis(track,{tempo='',key=''}={}){
 const a=track.analysis,bpm=a?.bpmEstimate;
 if(tempo==='unmeasured'&&a)return false;
 if(tempo==='uncertain'&&(!a||Number.isFinite(bpm)&&a.tempoStatus!=='low confidence'&&a.tempoStatus!=='uncertain'))return false;
 const bands={slow:[0,90],medium:[90,120],brisk:[120,150],fast:[150,Infinity]};
 if(bands[tempo]&&(!Number.isFinite(bpm)||bpm<bands[tempo][0]||bpm>=bands[tempo][1]))return false;
 if(key==='unmeasured'&&a)return false;
 if(key==='uncertain'&&(!a||a.keyStatus!=='uncertain'))return false;
 if(key&&key!=='unmeasured'&&key!=='uncertain'&&a?.keyEstimate!==key)return false;
 return true;
}
