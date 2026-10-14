(function(root){
  const SITE='https://callmedaddy.musicsubject.com';
  const url=value=>{try{const u=new URL(value||'',SITE);return u.protocol==='https:'&&u.hostname==='callmedaddy.musicsubject.com'&&!u.username&&!u.password?u.href:''}catch{return''}};
  const variants=song=>song.variants?.filter(v=>v.audio)?.length?song.variants.filter(v=>v.audio):song.audio?[{id:'main',label:song.kind||'Original',audio:song.audio}]:[];
  function track(song,variant){
    const v=variant||variants(song).find(v=>v.audio===song.audio)||variants(song)[0]; if(!v || !url(v.audio)) return null;
    const version=v.id||'main';
    const fallback=`/now-playing/?song=${encodeURIComponent(song.id)}&version=${encodeURIComponent(version)}`;
    let page=url(v.experience||song.experience||fallback);if(!page)page=url(fallback);
    const share=new URL(url(v.shareUrl||song.shareUrl)||page);share.searchParams.set('version',version);
    return {id:`${song.id}:${version}`,songId:song.id,variantId:version,title:song.title||'Untitled',artist:song.artist||'MusicSubject × Call Me Daddy',
      label:v.label||song.kind||'',audio:url(v.audio),cover:url(v.cover||song.cover||'/app/icon-512.png'),experience:page,shareUrl:share.href};
  }
  const playable=songs=>songs.filter(s=>variants(s).some(v=>url(v.audio)));
  function latest(songs){return [...playable(songs)].sort((a,b)=>String(b.date||`${b.year||0}-01-01`).localeCompare(String(a.date||`${a.year||0}-01-01`))).map(s=>track(s)).filter(Boolean)}
  function selectedQueue(songs,songId,variantId){
    const song=songs.find(s=>s.id===songId);if(!song)return[];
    const first=track(song,variants(song).find(v=>v.id===variantId));
    return first?[first,...latest(songs).filter(t=>t.songId!==songId)]:[];
  }
  function radio(songs,cycle){
    return (cycle?.build?.(songs,{intent:'surprise',seed:cycle.createSeed(),ignoreHistory:false})||[])
      .map(t=>({ ...t,audio:url(t.audio),cover:url(t.cover||'/app/icon-512.png'),experience:url(t.experience||`/now-playing/?song=${encodeURIComponent(t.songId||t.id)}&version=${encodeURIComponent(t.variantId||'main')}`),shareUrl:url(t.shareUrl||t.experience||'/music/') }))
      .filter(t=>t.audio).slice(0,500);
  }
  const api={SITE,url,variants,track,playable,latest,selectedQueue,radio};root.CatalogModel=api;
  if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
