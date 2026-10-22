import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {loadCatalog} from './sync-song-links.mjs';
import {ARCHIVE_SONGS} from '../library/archive.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const paths=new Set([...loadCatalog(),...ARCHIVE_SONGS].flatMap(s=>s.variants?.some(v=>v.audio)?s.variants.map(v=>v.audio):[s.audio]).filter(Boolean));
const facts={};
for(const url of [...paths].sort()){
 const file=path.join(root,decodeURIComponent(url));
 const data=JSON.parse(execFileSync('ffprobe',['-v','error','-show_entries','format=duration:stream=codec_type,codec_name,sample_rate,channels','-of','json',file],{encoding:'utf8'}));
 const stream=data.streams.find(s=>s.codec_type==='audio');
 facts[url]={seconds:Math.round(Number(data.format.duration)*100)/100,format:stream.codec_name.toUpperCase(),sampleRate:Number(stream.sample_rate),channels:stream.channels,bytes:fs.statSync(file).size};
}
fs.writeFileSync(path.join(root,'library/audio-facts.mjs'),'// Measured from existing recording files with scripts/measure-library-audio.mjs.\n// Remote StarMuff recordings remain unknown; no tempo or key is inferred.\nexport const AUDIO_FACTS = '+JSON.stringify(facts,null,2)+';\n');
console.log(`Measured ${Object.keys(facts).length} exact recordings.`);
