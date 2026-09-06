(()=>{
  if(window.CMDHomePlayback||!window.CMDContinuousPlayback?.create)return;
  const songs=Array.isArray(window.CMD_SONGS)?window.CMD_SONGS:[];
  const tracks=songs.map(song=>{
    const variants=Array.isArray(song.variants)?song.variants:[];
    const variant=variants.find(item=>item.audio===song.audio)||variants.find(item=>item.audio)||{};
    return {...song,songId:song.id,variantId:variant.id||'main',variantLabel:variant.label||'',audio:song.audio||variant.audio};
  }).filter(track=>track.id&&track.audio);
  if(!tracks.length)return;
  let controller=null;
  let audio=null;
  const path=value=>{try{return new URL(value,location.href).pathname.replace(/\/$/,'')||'/';}catch{return '';}};
  const findTrack=link=>{
    let url;
    try{url=new URL(link.getAttribute('href'),location.href);}catch{return -1;}
    if(url.origin!==location.origin||link.hasAttribute('download')||(link.target&&link.target!=='_self'))return -1;
    const songId=url.searchParams.get('song');
    if(songId){
      const index=tracks.findIndex(track=>track.songId===songId);
      const version=url.searchParams.get('version');
      return index>=0&&(!version||version===tracks[index].variantId)?index:-1;
    }
    // A multi-song experience must retain its choice screen, not pick a song arbitrarily.
    const matches=tracks.map((track,index)=>({track,index})).filter(({track})=>track.experience&&path(track.experience)===path(url.href));
    return matches.length===1?matches[0].index:-1;
  };
  document.addEventListener('click',event=>{
    if(event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
    const link=event.target?.closest?.('a.release-card,a.home-continue,a.home-recent-card');
    if(!link)return;
    const index=findTrack(link);
    if(index<0)return;
    event.preventDefault();
    // Register before the persistent browser's navigation interceptor.
    event.stopImmediatePropagation();
    if(!controller){
      audio=document.createElement('audio');
      audio.id='cmd-home-audio';
      audio.preload='metadata';
      audio.hidden=true;
      document.body.appendChild(audio);
      controller=window.CMDContinuousPlayback.create({
        id:'homepage',route:'/',audio,tracks,startIndex:index,loopLocal:true,pageFollowSeconds:5,
        onNeedsTap:(_track,error)=>{if(error?.name!=='AbortError'&&audio.paused)window.CMDUniversalPlayer?.getActive?.()?.update?.({status:'Tap Play to start this song.',show:true});}
      });
      audio.muted=false;
      // No async navigation or metadata wait between the first tap and play().
      controller.load(index,{autoplay:true,reason:'home-card'});
    }else if(controller.current()?.songId===tracks[index].songId){
      controller.toggle();
    }else{
      controller.load(index,{autoplay:true,reason:'home-card'});
    }
  },true);
  window.CMDHomePlayback={findTrack};
})();
