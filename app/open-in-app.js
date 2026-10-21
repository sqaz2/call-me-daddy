(function(root){
  const SITE='https://callmedaddy.musicsubject.com';
  const PACKAGE='com.musicsubject.player';
  const safeId=value=>typeof value==='string'&&/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,199}$/.test(value)?value:'';
  const seconds=value=>Number.isFinite(Number(value))?Math.max(0,Math.min(86400,Number(value))):0;
  function target({track,media,url,pageSongId,catalog=[]}){
    const page=new URL(url,SITE);
    if(track){
      const song=safeId(track.songId||String(track.id||'').split(':')[0]);
      return {song,version:safeId(track.variantId)||'main',t:media?.ended?0:seconds(media?.currentTime)};
    }
    const song=safeId(page.searchParams.get('song'))||safeId(pageSongId)||safeId(catalog.find(s=>{
      try{return s.experience&&new URL(s.experience,SITE).pathname.replace(/\/$/,'')===page.pathname.replace(/\/$/,'')}catch{return false}
    })?.id);
    const record=catalog.find(s=>s.id===song),variants=record?.variants||[];
    const primary=variants.find(v=>v.audio===record?.audio)||variants.find(v=>v.audio);
    return {song,version:safeId(page.searchParams.get('version'))||safeId(primary?.id)||'main',t:seconds(page.searchParams.get('t'))};
  }
  function intent(request){
    const params=new URLSearchParams();
    if(safeId(request.song)){params.set('song',request.song);params.set('version',safeId(request.version)||'main');params.set('t',String(Math.round(seconds(request.t)*10)/10));}
    const fallback=new URL('/app/',SITE);fallback.search=params.toString();fallback.searchParams.set('from','open-app');
    return `intent://play/?${params}#Intent;scheme=musicsubject;package=${PACKAGE};S.browser_fallback_url=${encodeURIComponent(fallback.href)};end`;
  }
  const api={target,intent,seconds};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(!root.document||root.CMDNativeApp)return;
  root.CMDNativeApp=api;
  const doc=root.document,ua=root.navigator.userAgent||'';
  const android=/Android/i.test(ua+' '+(root.navigator.userAgentData?.platform||''));
  if(!android||root.MusicSubjectNative||/MusicSubjectAndroid\//.test(ua))return;
  function player(){try{return root.top.location.origin===root.location.origin?(root.top.CMDUniversalPlayer||root.CMDUniversalPlayer):root.CMDUniversalPlayer}catch{return root.CMDUniversalPlayer}}
  function current(){const p=player();return target({track:p?.getTrack?.(),media:p?.getMedia?.(),url:root.location.href,pageSongId:doc.body?.dataset?.songId,catalog:[root.CMD_SONGS,root.CMD_ARCHIVE_CATALOG].filter(Array.isArray).flat()})}
  function refresh(){
    const request=current();
    doc.querySelectorAll('[data-play-in-app]').forEach(link=>{
      link.hidden=false;link.href=intent(request);link.target='_top';
      const label=request.song?'Play in app ↗':'Open app ↗';if(link.textContent!==label)link.textContent=label;
    });
  }
  function mount(){
    const style=doc.createElement('style');
    style.textContent='.cmd-android-actions{display:flex;align-items:center;gap:12px;flex-wrap:wrap;padding:10px 16px;background:#111719;color:#f4f0e8;font:700 13px/1.3 system-ui,sans-serif}.cmd-play-in-app{display:inline-flex;align-items:center;justify-content:center;min-height:44px;padding:0 16px;border:1px solid #b69a62;border-radius:999px;background:#d7b266;color:#101010!important;text-decoration:none!important;font:800 13px/1.2 system-ui,sans-serif;white-space:nowrap;box-sizing:border-box}.cmd-play-in-app[hidden]{display:none!important}.cmd-play-in-app:focus-visible{outline:2px solid white;outline-offset:3px}.cmd-android-download{color:#f4f0e8;text-decoration:underline;min-height:44px;display:inline-flex;align-items:center}.cmd-universal-copy .cmd-play-in-app{margin-top:6px;min-height:36px;padding:0 12px;font-size:12px}';
    doc.head.appendChild(style);
    if(!root.location.pathname.startsWith('/app/')){
      const bar=doc.createElement('nav');bar.className='cmd-android-actions';bar.setAttribute('aria-label','Android app');
      bar.innerHTML='<a class="cmd-play-in-app" data-play-in-app target="_top" href="/app/">Play in app ↗</a><a class="cmd-android-download" href="/app/">Get Android app</a>';
      const header=doc.querySelector('header');if(header)header.insertAdjacentElement('afterend',bar);else doc.body.prepend(bar);
    }
    doc.addEventListener('click',event=>{
      const link=event.target.closest?.('[data-play-in-app]');if(!link)return;
      // Resolve at the tap, including an audio owner retained in another frame.
      // No asynchronous work may consume Chrome's app-launch user gesture.
      link.href=intent(current());link.target='_top';player()?.control?.('pause');
    },true);
    refresh();
    new MutationObserver(records=>{if(records.some(r=>[...r.addedNodes].some(n=>n.nodeType===1&&(n.matches?.('[data-play-in-app]')||n.querySelector?.('[data-play-in-app]')))))refresh()}).observe(doc.body,{childList:true,subtree:true});
    root.addEventListener('pageshow',refresh);doc.addEventListener('visibilitychange',()=>{if(doc.visibilityState==='visible')refresh()});
  }
  if(doc.readyState==='loading')doc.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})(typeof window!=='undefined'?window:globalThis);
