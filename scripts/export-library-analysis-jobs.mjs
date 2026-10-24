// Export exact recording inventory for the offline audio-analysis script.
import {loadCatalog} from './sync-song-links.mjs';
import {buildLibraryCatalog} from '../library/catalog.mjs';
import {STARMUFF_TRACKS} from '../data/starmuff-playlist.mjs';
const jobs=buildLibraryCatalog(loadCatalog(),STARMUFF_TRACKS).flatMap(s=>s.tracks).filter(t=>t.audio&&!t.external).map(t=>({songId:t.songId,variantId:t.variantId,title:t.title,variantLabel:t.variantLabel,audio:t.audio,existingAnalysis:t.analysis&&!t.analysis.sourceSha256?t.analysis:null}));
process.stdout.write(JSON.stringify(jobs,null,2)+'\n');
