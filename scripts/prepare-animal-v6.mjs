// One-time manifest migration; run only on the Animal v6 release branch.
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { loadCatalog } from './sync-song-links.mjs';
const id = 'make-me-an-animal';
const base = '/media/songs/2026/09/make-me-an-animal-v6/';
const manifestPath = 'content/releases/2026-09-12-make-me-an-animal-v6.json';
const sourcePath = 'content/sources/make-me-an-animal-v6.json';
const read = file => fs.readFileSync(file, 'utf8');
const writeJSON = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n');
const supplied = [
  {file:'audio.mp3', uploaded:'Make Me an Animal (Remix).mp3', gitBlob:'0958e851b9a56e44c7be14b923639938d024bd74'},
  {file:'cover.png', uploaded:'file_00000000c7fc8230b8598e88805b74c9.png', gitBlob:'541c502069eaa0e0ca7b55e43e73bdab1f0b6a42'},
  {file:'background.mp4', uploaded:'grok_video_2026-09-12-10-35-35.mp4', gitBlob:'aa12db7296c7d849edce76cc6901dd5b882f5d52'}
];
for (const asset of supplied) {
  const bytes = fs.readFileSync('.' + base + asset.file);
  const hash = createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
  if (hash !== asset.gitBlob) throw new Error(`Supplied media changed: ${asset.file}`);
}
if (!fs.existsSync(manifestPath)) {
  const original = loadCatalog().find(song => song.id === id);
  if (!original || original.variants.length !== 3) throw new Error('Expected the three existing Animal recordings before migration');
  const older = original.variants.map(variant => ({...variant, cover: variant.cover || original.cover, video: variant.video || original.video,
    experience: `/make-me-an-animal-v6/?song=${id}&version=${variant.id}`}));
  const newest = {id:'suno-v6', label:'Suno v6', audio:base+'audio.mp3', cover:base+'cover.png', video:base+'background.mp4',
    date:'2026-09-12', sunoUrl:'https://suno.com/s/SAkaHGkSiHPbGl0Q', experience:`/make-me-an-animal-v6/?song=${id}&version=suno-v6`};
  const song = {...original, artist:'MusicSubject × Call Me Daddy', year:2026, month:9, date:'2026-09-12', originalYear:original.year,
    releaseManaged:true, description:'Make Me an Animal returns in Suno v6, with new lion artwork and a short background video. The three earlier Animal recordings remain available.',
    lineage:'Created in 2025. The EDM Switch-Up Mix, Late Night Warehouse Mix and May 2026 Remaster are preserved alongside the new September 2026 Suno v6 recording.',
    audio:newest.audio, cover:newest.cover, video:newest.video, catalogVideo:true, experience:'/make-me-an-animal-v6/',
    shareUrl:`/make-me-an-animal-v6/?song=${id}&version=suno-v6`, kind:'Suno v6 · 4 versions', sunoUrl:newest.sunoUrl,
    variants:[newest,...older]};
  writeJSON(manifestPath, {schemaVersion:1, song,
    radio:{surprise:100,laugh:64,think:58,'level-up':84,heavy:76,'old-files':76},
    update:{id:'release-make-me-an-animal-v6',published:'2026-09-12T16:37:47Z',type:'New version',songId:id,versionId:'suno-v6',
      title:'Make Me an Animal v6',summary:'A new Suno v6 recording, lion artwork and background video. All three earlier Animal versions are still here.',
      href:`/make-me-an-animal-v6/?song=${id}&version=suno-v6`,sharePath:'/updates/release-make-me-an-animal-v6/',
      cta:'Play Animal v6',featured:true,cardLines:['MAKE ME AN','ANIMAL v6'],cardTag:'New version · Suno v6',
      cardSummary:'The new v6 recording. One Animal family, with the three earlier recordings preserved.',badge:'NEW · v6'}
  });
  writeJSON(sourcePath, {sourceCommit:'e533591ef1c88c5db7744c34b8475983ff369dde',sunoUrl:newest.sunoUrl,
    assets:supplied.map(asset=>({...asset,path:base+asset.file})),originalSong:original,
    notes:'Supplied media is moved without re-encoding or image edits. No unverified lyrics or song story have been added.'});
}
const legacyPath = 'data/2026-08-29-uploads.js';
let legacy = read(legacyPath);
const oldGuard = "const animal=window.CMD_SONGS.find(s=>s.id==='make-me-an-animal');if(animal){";
const newGuard = "const animal=window.CMD_SONGS.find(s=>s.id==='make-me-an-animal');if(animal&&!animal.releaseManaged){";
if (legacy.includes(oldGuard)) fs.writeFileSync(legacyPath, legacy.replace(oldGuard,newGuard));
else if (!legacy.includes(newGuard)) throw new Error('Animal legacy guard changed; review before migration');
const testPath='tests/aug29-uploads.test.js';
let tests=read(testPath);
tests=tests.replace("Array.from(by['make-me-an-animal'].variants,v=>v.id)","Array.from(by['make-me-an-animal'].variants,v=>v.id).filter(id=>id!=='suno-v6')")
  .replace("assert.equal(by['make-me-an-animal'].year,2025)","assert.equal(by['make-me-an-animal'].originalYear||by['make-me-an-animal'].year,2025)")
  .replace("assert.equal(by['make-me-an-animal'].video,by['pull-me-like-that'].video)","assert.equal(by['make-me-an-animal'].variants.find(v=>v.id==='edm-switch-up-mix').video||by['make-me-an-animal'].video,by['pull-me-like-that'].video)");
fs.writeFileSync(testPath,tests);
execFileSync(process.execPath,['scripts/sync-releases.mjs'],{stdio:'inherit'});
const registry=JSON.parse(read('content/song-links.json')).songs.find(song=>song.songId===id);
console.log('Animal permanent links:', JSON.stringify(registry));
