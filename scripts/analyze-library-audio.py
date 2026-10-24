#!/usr/bin/env python3
"""Offline recording analysis. Requires ffmpeg, Essentia, librosa, numpy, scipy.

Input: JSON recording inventory (audio, songId, variantId, existingAnalysis).
Uses complete audio for rhythm/tonal analysis; three local tonal windows flag
possible changes. All results are estimates, never certified keys or beat grids.
Existing reviewed cue analysis is left intact. Cache/progress enable resuming.
"""
import os
for name in ['OMP_NUM_THREADS','OPENBLAS_NUM_THREADS','MKL_NUM_THREADS','NUMBA_NUM_THREADS']:
    os.environ[name]='1'
import argparse, concurrent.futures, hashlib, json, pathlib, subprocess, time
import numpy as np
import essentia.standard as es
import librosa
from scipy.signal import resample_poly
from collections import Counter
ROOT=pathlib.Path(__file__).resolve().parents[1]
NOTES=['C','D-flat','D','E-flat','E','F','G-flat','G','A-flat','A','B-flat','B']
PITCH={'C':0,'C#':1,'Db':1,'D':2,'D#':3,'Eb':3,'E':4,'F':5,'F#':6,'Gb':6,'G':7,'G#':8,'Ab':8,'A':9,'A#':10,'Bb':10,'B':11}
MAJOR=np.array([6.35,2.23,3.48,2.33,4.38,4.09,2.52,5.19,2.39,3.66,2.29,2.88])
MINOR=np.array([6.33,2.68,3.52,5.38,2.60,3.53,2.54,4.75,3.98,2.69,3.34,3.17])
def key_name(note,mode):return NOTES[PITCH[note]]+' '+mode

def analyze(job,cache):
    started=time.time();audio=job['audio'];token=hashlib.sha256(audio.encode()).hexdigest()[:24]
    result_path=pathlib.Path(cache)/(token+'.json')
    local=ROOT/audio.lstrip('/')
    if not local.exists():
        local=pathlib.Path(cache)/(token+'.mp3')
        if not local.exists():
            temp=local.with_suffix('.part')
            subprocess.run(['curl','-fLsS','--retry','2','--max-time','90','https://library.musicsubject.com'+audio,'-o',str(temp)],check=True,capture_output=True)
            temp.replace(local)
    digest=hashlib.sha256(local.read_bytes()).hexdigest()
    if result_path.exists():
        old=json.loads(result_path.read_text())
        if old['analysis']['sourceSha256']==digest:return old
    probe=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration:stream=codec_type,codec_name,sample_rate,channels','-of','json',str(local)]))
    stream=next(s for s in probe['streams'] if s['codec_type']=='audio')
    y=es.MonoLoader(filename=str(local),sampleRate=44100)();duration=len(y)/44100
    raw_bpm=0.;confidence=0.;second_bpm=0.;intervals=[];key_votes=[];local_keys=[];evidence={}
    a={'bpmEstimate':None,'tempoStatus':'uncertain','keyEstimate':None,'keyStatus':'uncertain','analyzedAt':'2026-10-24','sourceSha256':digest,'sourceBytes':local.stat().st_size,'method':'Complete-file automated analysis: Essentia multifeature beat tracking cross-checked against librosa onset autocorrelation; three HPCP key profiles cross-checked against STFT chroma and three local windows. Estimates only; no listening verification or certified beat grid.'}
    facts={'seconds':round(float(probe['format']['duration']),2),'format':stream['codec_name'].upper(),'sampleRate':int(stream['sample_rate']),'channels':stream['channels'],'bytes':local.stat().st_size}
    if duration>=8 and np.sqrt(np.mean(y*y))>1e-5:
        bpm,ticks,confidence,estimates,intervals=es.RhythmExtractor2013(method='multifeature')(y)
        raw_bpm=float(bpm);confidence=float(confidence)
        z=resample_poly(y,1,2).astype(np.float32)
        onset=librosa.onset.onset_strength(y=z,sr=22050,hop_length=512)
        second_bpm=float(librosa.feature.tempo(onset_envelope=onset,sr=22050,hop_length=512)[0])
        ratio=min(abs(second_bpm*scale-raw_bpm)/max(raw_bpm,1) for scale in [.5,1,2])
        if confidence>=.5 and 40<=raw_bpm<=208:
            a['bpmEstimate']=round(raw_bpm,1);a['bpmRange']=str(round(raw_bpm,1))
            a['tempoStatus']='estimated' if confidence>=2 and ratio<=.04 else 'low confidence'
            alternatives=sorted(set(round(x,1) for x in [raw_bpm/2,raw_bpm*2] if 40<=x<=220))
            a['tempoAlternatives']=alternatives
            a['tempoNote']=f'Primary tracker: {raw_bpm:.1f} BPM; onset estimate: {second_bpm:.1f} BPM. '+('Trackers agree within 4%, allowing half/double time. ' if ratio<=.04 else 'Trackers disagree; check the pulse before editing. ')+('Half/double-time readings: '+', '.join(map(str,alternatives))+' BPM. ' if alternatives else '')+'Tempo may vary; this is not a fixed beat-grid measurement.'
        else:a['tempoNote']='Rhythmic evidence is too weak for a dependable tempo. No numeric BPM is published.'
        profiles=[]
        for p in ['bgate','krumhansl','edma']:
            note,mode,strength=es.KeyExtractor(profileType=p,hpcpSize=36)(y)
            name=key_name(note,mode);profiles.append({'profile':p,'key':name,'strength':round(float(strength),4)});key_votes.append(name)
        chroma=librosa.feature.chroma_stft(y=z,sr=22050,n_fft=4096,hop_length=2048).mean(axis=1)
        scores=sorted([(float(np.corrcoef(chroma,np.roll(template,i))[0,1]),NOTES[i]+' '+mode) for mode,template in [('major',MAJOR),('minor',MINOR)] for i in range(12)],reverse=True)
        key_votes.append(scores[0][1])
        for fraction in [.2,.5,.8]:
            start=max(0,min(duration-20,duration*fraction-10));segment=y[int(start*44100):int(min(duration,start+20)*44100)]
            note,mode,strength=es.KeyExtractor(profileType='bgate',hpcpSize=36)(segment)
            local_keys.append({'start':round(start,2),'key':key_name(note,mode),'strength':round(float(strength),4)})
        winner,count=Counter(key_votes).most_common(1)[0]
        support=[p['strength'] for p in profiles if p['key']==winner]
        local_agreement=sum(k['key']==winner for k in local_keys)
        mean_strength=float(np.mean(support)) if support else 0
        if count>=2 and mean_strength>=.55:
            a['keyEstimate']=winner
            a['keyStatus']='estimated' if count>=3 and local_agreement>=2 and mean_strength>=.65 else 'provisional'
        choices=', '.join(dict.fromkeys(key_votes))
        a['keyNote']=f'Global candidates: {choices}. '+(f'{count}/4 profile/method votes support {winner}; {local_agreement}/3 local windows agree. ' if a['keyEstimate'] else 'Methods do not agree strongly enough to publish a single key. ')+('Local tonal estimates differ; possible key/mode changes need musical review.' if len(set(k['key'] for k in local_keys))>1 else 'Local windows give the same tonal estimate.')
        evidence={'essentiaBpm':round(raw_bpm,4),'essentiaConfidence':round(confidence,4),'librosaBpm':round(second_bpm,4),'harmonicRelativeDifference':round(ratio,5),'hpcpProfiles':profiles,'stftTopKeys':[{'key':name,'correlation':round(score,4)} for score,name in scores[:3]],'localKeys':local_keys}
    else:
        a['tempoNote']='Recording is too short or quiet for reliable tempo estimation.'
        a['keyNote']='Recording is too short or quiet for reliable key estimation.'
    result={'songId':job['songId'],'variantId':job['variantId'],'audio':audio,'analysis':a,'facts':facts,'evidence':evidence,'processingSeconds':round(time.time()-started,2)}
    result_path.write_text(json.dumps(result,indent=2)+'\n');return result

def main():
    p=argparse.ArgumentParser();p.add_argument('--input',required=True);p.add_argument('--cache',required=True);p.add_argument('--workers',type=int,default=3);args=p.parse_args()
    pathlib.Path(args.cache).mkdir(parents=True,exist_ok=True)
    jobs=[j for j in json.loads(pathlib.Path(args.input).read_text()) if not j.get('existingAnalysis')]
    results=[];errors=[]
    with concurrent.futures.ProcessPoolExecutor(max_workers=args.workers) as pool:
        pending={pool.submit(analyze,j,args.cache):j for j in jobs}
        for future in concurrent.futures.as_completed(pending):
            j=pending[future]
            try:
                result=future.result();results.append(result);a=result['analysis'];print(f'{len(results)}/{len(jobs)} {j["songId"]}:{j["variantId"]} BPM={a["bpmEstimate"]} ({a["tempoStatus"]}) key={a["keyEstimate"]} ({a["keyStatus"]})',flush=True)
            except Exception as e:
                errors.append({'audio':j['audio'],'error':str(e)});print('ERROR '+j['audio']+' '+str(e),flush=True)
    results.sort(key=lambda r:r['audio'])
    data={r['audio']:{'analysis':r['analysis'],'facts':r['facts']} for r in results}
    (ROOT/'library/recording-analysis.mjs').write_text('// Generated by scripts/analyze-library-audio.py. Exact recording paths; estimates, not verified musical facts.\nexport const RECORDING_ANALYSIS = '+json.dumps(data,indent=2,ensure_ascii=False)+';\n')
    audit={'date':'2026-10-24','scope':'174 recordings without prior cue analysis; existing 10 cue analyses preserved','versions':{'essentia':__import__('essentia').__version__,'librosa':librosa.__version__,'numpy':np.__version__},'recordings':results,'errors':errors}
    (ROOT/'content/sources/library-audio-analysis-2026-10-24.json').write_text(json.dumps(audit,indent=2,ensure_ascii=False)+'\n')
    print(json.dumps({'completed':len(results),'errors':errors}),flush=True)
    if errors:raise SystemExit(1)
if __name__=='__main__':main()
