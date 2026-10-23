import {buildCatalog} from './model.mjs';
import {ARCHIVE_SONGS,ARCHIVE_VARIANTS} from './archive.mjs';
import {LIBRARY_RELEASES} from './releases.mjs';
export function buildLibraryCatalog(songs,star,context={}){
 const expanded=songs.map(s=>ARCHIVE_VARIANTS[s.id]?{...s,variants:[...(s.variants||[]),...ARCHIVE_VARIANTS[s.id]]}:s);
 return buildCatalog([...expanded,...ARCHIVE_SONGS,...LIBRARY_RELEASES],star,context);
}
