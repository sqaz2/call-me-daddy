(()=>{
  if(window.CMDPlaylistRadio)return;

  const engine=window.CMDCatalogCycle;
  const fallbackCover=window.CMD_ARTWORK?.fallbackCover||'/media/site/image-coming-soon.jpg';
  const songs=Array.isArray(window.CMD_SONGS)?window.CMD_SONGS:[];
  songs.forEach(song=>{
    if(!song||song.cover)return;
    song.cover=fallbackCover;
    song.coverIsFallback=true;
  });
  const playable=songs.filter(song=>engine?.variants(song).length);
  const cleanIds=ids=>[...new Set((ids||[]).filter(Boolean).map(String))];

  function create(options={}){
    const intent=engine?.normalizeIntent(options.intent)||'surprise';
    const seed=engine?.cleanSeed(options.seed)||engine?.createSeed?.()||Date.now().toString(36);
    const firstCycleExclusions=cleanIds(options.excludeIds);
    let cycle=[];
    let index=-1;
    let cycleNumber=0;
    let current=null;

    function build(){
      if(!engine||!playable.length)return false;
      cycleNumber+=1;
      cycle=engine.build(playable,{
        intent,
        seed,
        cycleNumber,
        lastSongId:current?.songId||current?.id||options.lastSongId||'',
        excludeIds:cycleNumber===1?firstCycleExclusions:[]
      });
      index=-1;
      if(!cycle.length&&cycleNumber===1&&firstCycleExclusions.length)return build();
      return Boolean(cycle.length);
    }

    function next(){
      if(!cycle.length||index>=cycle.length-1){
        if(!build())return null;
      }
      current=cycle[++index]||null;
      return current;
    }

    function previous(){
      if(index<=0)return current;
      current=cycle[--index]||current;
      return current;
    }

    return {
      next,
      previous,
      remember:track=>engine?.remember?.(track),
      getState:()=>({intent,seed,cycle:cycleNumber,index,current,length:cycle.length})
    };
  }

  function shareUrl(track){
    const dedicated=track?.shareUrl||track?.experience;
    if(dedicated){
      const url=new URL(dedicated,location.origin);
      if(track?.variantId&&track?.variantCount>1)url.searchParams.set('version',track.variantId);
      return url.href;
    }
    const url=new URL('/music/',location.origin);
    url.searchParams.set('song',track?.songId||track?.id||'');
    if(track?.variantId)url.searchParams.set('version',track.variantId);
    url.searchParams.set('intent',track?.radioIntent||'surprise');
    if(track?.radioSeed)url.searchParams.set('seed',track.radioSeed);
    url.searchParams.set('share','1');
    return url.href;
  }

  async function share(track){
    if(!track)return false;
    const detail=track.variantCount>1&&track.variantLabel?` — ${track.variantLabel}`:'';
    const data={
      title:`${track.title||'Call Me Daddy'}${detail}`,
      text:`Listen to ${track.title||'this song'}${detail}.`,
      url:shareUrl(track)
    };
    if(window.CMDShare?.nativeShare)return window.CMDShare.nativeShare(data);
    try{
      if(navigator.share){await navigator.share(data);return true;}
      await navigator.clipboard?.writeText(`${data.text}\n${data.url}`);
      return true;
    }catch{return false;}
  }

  window.CMDPlaylistRadio={create,share,shareUrl};
})();
