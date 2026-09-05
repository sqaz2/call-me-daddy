(()=>{
  if(window.CMDContinuousPlayback)return;

  const STORAGE_KEY='cmd:playback-session:v1';
  const MAX_SNAPSHOT_AGE=12*60*60*1000;
  const observers=new Set();
  let activeSession=null;
  const absolute=value=>{try{return new URL(value,location.href).href}catch{return String(value||'')}};
  const cleanRoute=value=>{try{const url=new URL(value,location.href);url.searchParams.delete('cmdResume');return `${url.pathname}${url.search}${url.hash}`}catch{return location.pathname}};
  const readSnapshot=()=>{try{const value=JSON.parse(sessionStorage.getItem(STORAGE_KEY)||'null');return value&&Date.now()-value.updatedAt<MAX_SNAPSHOT_AGE?value:null}catch{return null}};
  const writeSnapshot=value=>{try{sessionStorage.setItem(STORAGE_KEY,JSON.stringify(value))}catch{}};
  const navigationWasReload=()=>{try{return performance.getEntriesByType('navigation')[0]?.type==='reload'}catch{return false}};
  const serializeTrack=track=>{
    if(!track)return null;
    return ['id','songId','variantId','variantCount','title','artist','project','album','label','variantLabel','audio','cover','experience','shareUrl','radioIntent','radioSeed'].reduce((copy,key)=>{
      if(track[key]!==undefined)copy[key]=track[key];
      return copy;
    },{});
  };
  const publish=payload=>{
    activeSession=payload;
    observers.forEach(observer=>{try{observer(payload)}catch{}});
  };
  const subscribe=observer=>{
    if(typeof observer!=='function')return()=>{};
    observers.add(observer);
    if(activeSession){try{observer(activeSession)}catch{}}
    return()=>observers.delete(observer);
  };

  function create(options={}){
    const audio=options.audio;
    if(!audio)throw new Error('CMDContinuousPlayback requires an audio element');
    audio.__cmdContinuousPlayback=true;

    const id=String(options.id||audio.id||location.pathname);
    const queue=(options.tracks||[]).filter(track=>track?.audio).slice();
    const radio=options.radio||window.CMDPlaylistRadio?.create?.({
      intent:options.intent||'surprise',
      seed:options.seed,
      excludeIds:options.excludeIds||queue.map(track=>track.songId||track.id),
      lastSongId:options.lastSongId||queue.at(-1)?.songId||queue.at(-1)?.id||''
    });
    let index=Math.max(0,Math.min(queue.length-1,Number(options.startIndex)||0));
    let preparedIndex=-1;
    let current=null;
    let wantsPlayback=false;
    let hasPlayed=false;
    let pendingPosition=null;
    let pendingAutoplay=false;
    let lastSnapshotAt=0;
    let consecutiveErrors=0;
    let sourceTransition=false;
    let pendingPageFollow=null;
    let destroyed=false;
    let controller=null;
    let preloadLink=null;

    const status=(kind,detail)=>options.onStatus?.(kind,detail,current);
    const currentTrack=()=>queue[index]||current;
    const announce=(type,detail={})=>publish({
      type,id,audio,controller,track:currentTrack(),options,
      state:{
        index,wantsPlayback,hasPlayed,length:queue.length,
        nextTrack:preparedIndex>=0?queue[preparedIndex]||null:null,
        secondsRemaining:Number.isFinite(audio.duration)?Math.max(0,audio.duration-audio.currentTime):null,
        ...detail
      }
    });
    const persist=(force=false)=>{
      if(!hasPlayed)return;
      const existing=readSnapshot();
      if(!wantsPlayback&&existing?.playerId&&existing.playerId!==id)return;
      const now=Date.now();
      if(!force&&now-lastSnapshotAt<4000)return;
      lastSnapshotAt=now;
      const track=currentTrack();
      if(!track)return;
      writeSnapshot({
        version:1,
        playerId:id,
        page:cleanRoute(options.route||location.href),
        track:serializeTrack(track),
        currentTime:Number.isFinite(audio.currentTime)?audio.currentTime:0,
        wantsPlayback,
        updatedAt:now
      });
    };
    const setMediaSession=track=>{
      if('audioSession'in navigator){try{navigator.audioSession.type='playback'}catch{}}
      if(!('mediaSession'in navigator)||typeof MediaMetadata==='undefined')return;
      try{
        navigator.mediaSession.metadata=new MediaMetadata({
          title:track.title||'Call Me Daddy',
          artist:track.artist||'MusicSubject × Call Me Daddy',
          album:track.album||track.project||'Play the site',
          artwork:track.cover?[{src:absolute(track.cover)}]:[]
        });
      }catch{}
    };
    const setPositionState=()=>{
      if(!('mediaSession'in navigator)||!Number.isFinite(audio.duration)||audio.duration<=0)return;
      try{navigator.mediaSession.setPositionState({duration:audio.duration,playbackRate:audio.playbackRate||1,position:Math.min(audio.currentTime,audio.duration)})}catch{}
    };
    const primeNext=track=>{
      if(!track?.audio||!document?.createElement||!document?.head?.appendChild)return;
      const href=absolute(track.audio);
      if(preloadLink?.href===href)return;
      if(!preloadLink){preloadLink=document.createElement('link');preloadLink.rel='preload';preloadLink.as='audio';preloadLink.dataset.cmdNextAudio='';document.head.appendChild(preloadLink)}
      preloadLink.href=href;
    };
    const ensureNext=()=>{
      if(preparedIndex>=0){primeNext(queue[preparedIndex]);return preparedIndex;}
      if(index<queue.length-1){preparedIndex=index+1;primeNext(queue[preparedIndex]);return preparedIndex;}
      const track=radio?.next?.();
      if(track?.audio){queue.push(track);preparedIndex=queue.length-1;primeNext(track);return preparedIndex;}
      if(options.loopLocal&&queue.length){preparedIndex=0;primeNext(queue[0]);return preparedIndex;}
      return -1;
    };
    const play=()=>{
      hasPlayed=true;
      wantsPlayback=true;
      persist(true);
      const result=audio.play();
      if(result&&typeof result.catch==='function')result.catch(error=>{
        status('blocked',error);
        options.onNeedsTap?.(currentTrack(),error);
        persist(true);
      });
      return result;
    };
    const pause=()=>{
      wantsPlayback=false;
      sourceTransition=false;
      pendingPageFollow=null;
      window.CMDPersistentSite?.cancelFollow?.();
      audio.pause();
      persist(true);
    };
    const load=(nextIndex,{autoplay=true,position=0,reason='manual'}={})=>{
      if(!queue.length)return false;
      index=((nextIndex%queue.length)+queue.length)%queue.length;
      current=queue[index];
      preparedIndex=-1;
      pendingPosition=position>0?position:null;
      pendingAutoplay=Boolean(autoplay&&pendingPosition!==null);
      sourceTransition=true;
      pendingPageFollow=options.followPages===false||reason==='restore'||!current.experience?null:{track:current,reason};
      options.onTrack?.(current,{index,reason,radio:index>=Number(options.localCount??options.tracks?.length??queue.length)});
      announce('track',{reason,radio:index>=Number(options.localCount??options.tracks?.length??queue.length)});
      setMediaSession(current);
      audio.src=current.audio;
      audio.load();
      persist(true);
      ensureNext();
      if(autoplay&&pendingPosition===null)play();
      else if(!autoplay)sourceTransition=false;
      return true;
    };
    const next=(reason='next')=>{
      const target=ensureNext();
      if(target<0){wantsPlayback=false;status('unavailable');persist(true);return false;}
      preparedIndex=-1;
      return load(target,{autoplay:true,reason});
    };
    const previous=()=>{
      const restartAfter=Math.max(0,Number(options.restartThreshold??5));
      if(Number(audio.currentTime)>restartAfter){
        audio.currentTime=0;
        if(audio.paused)play();
        announce('restart',{reason:'previous-restart'});
        return true;
      }
      if(index>0)return load(index-1,{autoplay:true,reason:'previous'});
      try{audio.currentTime=0}catch{}
      return false;
    };
    const toggle=()=>audio.paused?play():(pause(),false);
    const recover=()=>{
      if(destroyed||!wantsPlayback)return;
      if(audio.ended){next('resume-ended');return;}
      if(audio.paused)play();
    };

    audio.addEventListener('play',()=>{
      sourceTransition=false;
      hasPlayed=true;
      wantsPlayback=true;
      consecutiveErrors=0;
      setMediaSession(currentTrack());
      if('mediaSession'in navigator){try{navigator.mediaSession.playbackState='playing'}catch{}}
      options.onPlayState?.(true,currentTrack());
      announce('play');
      window.CMDPersistentSite?.setSession?.(true);
      window.CMDPersistentSite?.refreshClearance?.();
      if(pendingPageFollow){
        const request=pendingPageFollow;
        pendingPageFollow=null;
        window.CMDPersistentSite?.followTrack?.(request.track,{reason:request.reason,seconds:Number(options.pageFollowSeconds)||5});
      }
      persist(true);
    });
    audio.addEventListener('pause',()=>{
      if(!sourceTransition&&!audio.ended&&document.visibilityState!=='hidden'){
        wantsPlayback=false;
        pendingPageFollow=null;
        window.CMDPersistentSite?.cancelFollow?.();
      }
      if('mediaSession'in navigator){try{navigator.mediaSession.playbackState='paused'}catch{}}
      options.onPlayState?.(false,currentTrack());
      announce('pause');
      persist(true);
    });
    audio.addEventListener('ended',()=>{
      wantsPlayback=true;
      persist(true);
      next('ended');
    });
    audio.addEventListener('loadedmetadata',()=>{
      if(pendingPosition!==null){
        const seek=Math.max(0,Math.min(pendingPosition,Math.max(0,(audio.duration||pendingPosition)-.25)));
        pendingPosition=null;
        try{audio.currentTime=seek}catch{}
        if(pendingAutoplay){pendingAutoplay=false;play();}
      }
      setPositionState();
      options.onReady?.(currentTrack());
    });
    audio.addEventListener('timeupdate',()=>{persist();setPositionState();options.onTime?.(audio.currentTime,audio.duration,currentTrack());announce('time')});
    audio.addEventListener('waiting',()=>{status('waiting');announce('status',{status:'waiting'})});
    audio.addEventListener('stalled',()=>{status('stalled');announce('status',{status:'stalled'})});
    audio.addEventListener('error',()=>{
      sourceTransition=false;
      if(!wantsPlayback)return;
      consecutiveErrors+=1;
      status('error',audio.error);
      announce('status',{status:'error'});
      if(consecutiveErrors>6){wantsPlayback=false;status('failed');persist(true);return;}
      next('error');
    });

    const lifecycleSave=()=>persist(true);
    document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')lifecycleSave();else recover()});
    document.addEventListener('freeze',lifecycleSave);
    document.addEventListener('resume',recover);
    addEventListener('pagehide',lifecycleSave);
    addEventListener('pageshow',recover);
    addEventListener('online',recover);

    if('mediaSession'in navigator){
      const handlers={
        play,
        pause,
        nexttrack:()=>next('media-next'),
        previoustrack:previous,
        seekbackward:details=>{audio.currentTime=Math.max(0,audio.currentTime-(details.seekOffset||10))},
        seekforward:details=>{audio.currentTime=Math.min(audio.duration||Infinity,audio.currentTime+(details.seekOffset||10))},
        seekto:details=>{if(typeof details.seekTime==='number')audio.currentTime=Math.max(0,Math.min(audio.duration||Infinity,details.seekTime))}
      };
      Object.entries(handlers).forEach(([action,handler])=>{try{navigator.mediaSession.setActionHandler(action,handler)}catch{}});
    }

    controller={
      play,pause,toggle,next,previous,load,
      current:currentTrack,
      peekNext:()=>preparedIndex>=0?queue[preparedIndex]||null:null,
      getState:()=>({id,index,wantsPlayback,hasPlayed,current:currentTrack(),length:queue.length}),
      destroy:()=>{destroyed=true;audio.__cmdContinuousPlayback=false;audio.__cmdContinuousPlaybackController=null;pendingPageFollow=null;window.CMDPersistentSite?.cancelFollow?.();if(preloadLink){preloadLink.remove?.();preloadLink=null}}
    };
    audio.__cmdContinuousPlaybackController=controller;

    const snapshot=readSnapshot();
    const wantsRestore=snapshot?.playerId===id&&snapshot.wantsPlayback&&(
      document.wasDiscarded||navigationWasReload()||new URLSearchParams(location.search).get('cmdResume')==='1'
    );
    if(wantsRestore&&snapshot.track?.audio){
      let restoredIndex=queue.findIndex(track=>absolute(track.audio)===absolute(snapshot.track.audio));
      if(restoredIndex<0){queue.push(snapshot.track);restoredIndex=queue.length-1;}
      hasPlayed=true;
      wantsPlayback=true;
      load(restoredIndex,{autoplay:true,position:Number(snapshot.currentTime)||0,reason:'restore'});
    }else if(queue.length){
      current=queue[index];
      options.onTrack?.(current,{index,reason:'ready',radio:false});
      announce('track',{reason:'ready',radio:false});
      const declaredSource=typeof audio.getAttribute==='function'?audio.getAttribute('src'):audio.src;
      if(!declaredSource&&current.audio){audio.src=current.audio;audio.load();}
      ensureNext();
    }

    return controller;
  }

  window.CMDContinuousPlayback={create,readSnapshot,subscribe,getActive:()=>activeSession,storageKey:STORAGE_KEY};
  window.CMDUniversalPlayer?.observeContinuous?.(window.CMDContinuousPlayback);
  if(document?.createElement&&document?.head?.appendChild&&!window.CMDUniversalPlayer&&!document.querySelector?.('script[data-cmd-universal-player]')){
    const script=document.createElement('script');
    script.src='/universal-player.js?v=20260904-1';
    script.dataset.cmdUniversalPlayer='';
    document.head.appendChild(script);
  }
})();
