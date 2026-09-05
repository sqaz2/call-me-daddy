import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const mediaRoot=path.join(root,'media');
const hardLimit=95*1024*1024;
const warningLimit=20*1024*1024;

function walk(directory){
  return fs.readdirSync(directory,{withFileTypes:true}).flatMap(entry=>{
    const absolute=path.join(directory,entry.name);
    return entry.isDirectory()?walk(absolute):[absolute];
  });
}

const files=walk(mediaRoot).map(absolute=>({
  path:path.relative(root,absolute).split(path.sep).join('/'),
  bytes:fs.statSync(absolute).size,
  type:path.extname(absolute).slice(1).toLowerCase()||'other'
})).sort((a,b)=>b.bytes-a.bytes);

const byType={};
for(const file of files){
  const group=byType[file.type]||(byType[file.type]={files:0,bytes:0});
  group.files+=1;
  group.bytes+=file.bytes;
}

const report={
  files:files.length,
  bytes:files.reduce((total,file)=>total+file.bytes,0),
  warningLimit,
  hardLimit,
  aboveWarning:files.filter(file=>file.bytes>=warningLimit),
  aboveHardLimit:files.filter(file=>file.bytes>=hardLimit),
  largest:files.slice(0,20),
  byType
};

if(process.argv.includes('--json'))console.log(JSON.stringify(report,null,2));
else{
  const mb=bytes=>(bytes/1024/1024).toFixed(1);
  console.log(`${report.files} media files · ${mb(report.bytes)} MB total`);
  console.log(`Largest: ${report.largest[0]?.path||'none'} · ${mb(report.largest[0]?.bytes||0)} MB`);
  console.log(`${report.aboveWarning.length} files at or above ${mb(warningLimit)} MB; ${report.aboveHardLimit.length} at or above the ${mb(hardLimit)} MB safety limit.`);
}

if(process.argv.includes('--check')&&report.aboveHardLimit.length){
  for(const file of report.aboveHardLimit)console.error(`Too large for Git safety margin: ${file.path} (${file.bytes} bytes)`);
  process.exit(1);
}

