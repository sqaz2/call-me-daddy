import {canonicalRecording} from '../data/song-identities.mjs';
// Artist-confirmed identities. Keep historical links/search names working while
// presenting each song only once in the library.
export const LIBRARY_REDIRECTS={'youtube-W47ebCMfrBI':'the-musician-police',armando:'did-armando-die-after-you-held-his-beer'};
export const canonicalLibrarySongId=id=>Object.hasOwn(LIBRARY_REDIRECTS,id)?LIBRARY_REDIRECTS[id]:id;
export const canonicalLibraryTrackKey=key=>{
 const [id,...version]=String(key).split(':');
 const recording=canonicalRecording(id,version.join(':')||'main');
 return [canonicalLibrarySongId(recording.songId),recording.variantId].join(':');
};
export function canonicalLibraryURL(input){
 const url=new URL(input);
 if(url.searchParams.has('song')){const old=url.searchParams.get('song'),recording=canonicalRecording(old,url.searchParams.get('version')||'main');url.searchParams.set('song',canonicalLibrarySongId(recording.songId));if(old!==recording.songId)url.searchParams.set('version',recording.variantId);}
 const picks=url.searchParams.getAll('pick');
 if(picks.length){url.searchParams.delete('pick');for(const pick of new Set(picks.map(canonicalLibraryTrackKey)))url.searchParams.append('pick',pick);}
 return url;
}
export const LIBRARY_IDENTITIES={
 'the-musician-police':{
  title:'The Musician Police (feat. Call Me Daddy)',aliases:['@Dubstep','YouTube Release'],
  source:'Artist confirmed on 2026-10-23 that YouTube W47ebCMfrBI (@Dubstep) is The Musician Police, not a separate song.',
  alternateListeningUrls:['https://youtu.be/W47ebCMfrBI','https://suno.com/s/a1pry4Jzqjks2MoH']
 }
};
