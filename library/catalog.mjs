import {LIBRARY_LYRICS} from './lyric-sheets.mjs';
import {EDITORIAL} from './editorial.mjs';
import {LIBRARY_IDENTITIES,LIBRARY_REDIRECTS} from './identities.mjs';
import {buildCatalog} from './model.mjs';
import {ARCHIVE_SONGS,ARCHIVE_VARIANTS} from './archive.mjs';
import {LIBRARY_RELEASES} from './releases.mjs';
export function buildLibraryCatalog(songs,star,context={}){
 const lyrics={...(context.lyrics||{}),...LIBRARY_LYRICS};
 const identified=songs.filter(s=>!LIBRARY_REDIRECTS[s.id]).map(s=>LIBRARY_IDENTITIES[s.id]?{...s,...LIBRARY_IDENTITIES[s.id],aliases:[...(s.aliases||[]),...LIBRARY_IDENTITIES[s.id].aliases]}:s);
 const expanded=identified.map(s=>ARCHIVE_VARIANTS[s.id]?{...s,variants:[...(s.variants||[]),...ARCHIVE_VARIANTS[s.id]]}:s);
 return buildCatalog([...expanded,...ARCHIVE_SONGS,...LIBRARY_RELEASES].map(s=>({...s,searchLyrics:EDITORIAL[s.id]?.lyricsReview?'':lyrics[s.id]?.search||''})),star,{...context,lyrics});
}
