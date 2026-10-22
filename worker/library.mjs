import {GROUPS,LIBRARY_ORIGIN,shareURL} from '../library/model.mjs';
import {STARMUFF_TRACKS} from '../data/starmuff-playlist.mjs';
import {resolveSocial,rewriteHead} from '../song-social.mjs';
import {handleRequest} from './index.mjs';

const HOST=new URL(LIBRARY_ORIGIN).hostname;
const sharedScripts=new Set(['/continuous-playback.js','/data/songs.js','/data/archive-catalog.js','/data/2026-08-25-uploads.js','/data/2026-08-26-uploads.js','/data/2026-08-27-uploads.js','/data/2026-08-29-uploads.js','/data/song-lyrics.js','/data/starmuff-playlist.mjs','/data/song-social.json']);
export function librarySocial(url,index){
  const group=GROUPS.find(g=>g.id===url.searchParams.get('group'))||GROUPS[0];
  let record={title:group.id==='all'?'MusicSubject Library':`${group.label} — MusicSubject Library`,description:group.description,image:`${LIBRARY_ORIGIN}/library/share.png`,imageAlt:'MusicSubject Library',type:'music.playlist'};
  const id=url.searchParams.get('song'),version=url.searchParams.get('version');
  const star=STARMUFF_TRACKS.find(t=>t.id===id);
  if(star&&(!version||version==='main'))record={...record,title:`${star.title} — MusicSubject Library`,description:'From the original StarMuff soundtrack. Play this recording in MusicSubject Library.',image:`${LIBRARY_ORIGIN}/library/starmuff-cover`,type:'music.song'};
  else if(id){const selected=resolveSocial(new URL('/?'+url.searchParams,LIBRARY_ORIGIN),index);if(selected){const image=new URL(selected.image);if(image.hostname==='callmedaddy.musicsubject.com')image.hostname=HOST;record={...selected,title:`${selected.title} · MusicSubject Library`,description:`${selected.title}. Open this recording in MusicSubject Library.`,image:image.href};}}
  record.canonical=shareURL({group:group.id,q:url.searchParams.get('q')||'',track:id?{songId:id,variantId:version||index?.songs?.[id]?.defaultVersion||'main'}:null});
  return record;
}
export async function handleLibrary(request,env){
  const url=new URL(request.url);
  if(url.hostname!==HOST){if(/^\/library(?:\/|\/index\.html)?$/.test(url.pathname))return Response.redirect(LIBRARY_ORIGIN+'/'+url.search,302);return null;}
  if(!['GET','HEAD'].includes(request.method))return new Response('Method not allowed',{status:405,headers:{allow:'GET, HEAD'}});
  if(url.pathname==='/robots.txt')return new Response(`User-agent: *\nAllow: /\nSitemap: ${LIBRARY_ORIGIN}/sitemap.xml\n`,{headers:{'content-type':'text/plain'}});
  if(url.pathname==='/sitemap.xml')return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${GROUPS.map(g=>`<url><loc>${shareURL({group:g.id})}</loc></url>`).join('')}</urlset>`,{headers:{'content-type':'application/xml'}});
  if(['/library','/library/','/index.html'].includes(url.pathname))return Response.redirect(LIBRARY_ORIGIN+'/'+url.search,302);
  if(url.pathname==='/'){
    if(url.searchParams.get('song')==='unwritten-skies-ambience'||['unwritten-skies','calming'].includes(url.searchParams.get('group')))return Response.redirect(LIBRARY_ORIGIN+'/',302);
    const page=await env.ASSETS.fetch(new Request(new URL('/library/',url),{method:'GET'}));
    if(!page.ok)return new Response('The library is temporarily unavailable.',{status:503});
    let index=null;
    if(url.searchParams.has('song')&&!STARMUFF_TRACKS.some(t=>t.id===url.searchParams.get('song'))){
      try{const data=await env.ASSETS.fetch(new Request(new URL('/data/song-social.json',url)));if(data.ok)index=await data.json();}catch{}
    }
    const social=librarySocial(url,index);
    const html=rewriteHead(await page.text(),social,{client:false}).replace('content="MusicSubject × Call Me Daddy"','content="MusicSubject Library"');
    return new Response(request.method==='HEAD'?null:html,{headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-cache','x-musicsubject-library':'1'}});
  }
  if(url.pathname==='/library/starmuff-cover'){
    if(!env.STARMUFF?.fetch)return new Response(null,{status:503});
    const result=await env.STARMUFF.fetch(new Request('https://starmuff.com/og-image.png',{method:request.method}));
    if(!result.ok||!result.headers.get('content-type')?.startsWith('image/'))return new Response(null,{status:502});
    const headers=new Headers({'content-type':result.headers.get('content-type'),'cache-control':'public, max-age=3600'});
    return new Response(request.method==='HEAD'?null:result.body,{status:result.status,headers});
  }
  const asset=url.pathname.startsWith('/library/')&&/\.(?:mjs|js|css|svg|png)$/.test(url.pathname)||sharedScripts.has(url.pathname);
  const media=/\.(?:mp3|mp4|m4a|wav|ogg|aac|flac|webm|png|jpe?g|webp|gif|svg)$/i.test(url.pathname);
  if(asset||media){const result=await handleRequest(request,env);if(asset){const headers=new Headers(result.headers);headers.set('cache-control','no-cache');return new Response(result.body,{status:result.status,headers});}return result;}
  return new Response('This page is not part of MusicSubject Library.',{status:404,headers:{'content-type':'text/plain; charset=utf-8'}});
}
