(()=>{
  const order=['sticks','police','level'];
  const tracks={
    sticks:{
      title:'Back to Sticks (Soothing Mix)',
      shortTitle:'Back to Sticks',
      tone:'The mean one',
      artist:'Call Me Daddy',
      src:'/media/songs/2026/08/back-to-sticks/audio.mp3',
      cover:'/media/songs/2026/08/back-to-sticks/cover.jpg',
      page:'/back-to-sticks/'
    },
    police:{
      title:'The Musician Police',
      shortTitle:'The Musician Police',
      tone:'The funniest one',
      artist:'MusicSubject feat. Call Me Daddy',
      youtubeId:'7rI2MtnRsaA',
      cover:'/media/songs/2026/07/the-musician-police/cover.jpg',
      page:'/the-musician-police/'
    },
    level:{
      title:'Level Up (Primal Dubstep Mix)',
      shortTitle:'Level Up',
      tone:'The inspiring one',
      artist:'MusicSubject × Call Me Daddy',
      src:'/media/songs/2026/08/level-up/audio.mp3',
      cover:'/media/songs/2026/08/level-up/cover.jpg',
      page:'/level-up/'
    }
  };

  const dock=document.createElement('div');
  dock.className='trilogy-player-shell';
  dock.id='trilogyPlayer';
  dock.hidden=true;
  dock.innerHTML=`
    <div class="shell trilogy-player-inner">
      <audio id="trilogyAudio" preload="metadata"></audio>
      <div class="trilogy-now">
        <div class="trilogy-player-cover" aria-hidden="true">
          <img id="trilogyNowCover" alt="">
          <iframe id="trilogyYoutube" title="The Musician Police audio source" allow="autoplay; encrypted-media" referrerpolicy="strict-origin-when-cross-origin" tabindex="-1"></iframe>
        </div>
        <div class="trilogy-player-meta">
          <small id="trilogyNowLabel">Tap a song image</small>
          <a id="trilogyNowTitle" href="#">New Tools Trilogy</a>
          <span id="trilogyStatus">Ready</span>
        </div>
        <div class="trilogy-controls">
          <button id="trilogyPrev" type="button" aria-label="Previous song">↶</button>
          <button id="trilogyPlay" type="button" aria-label="Play">▶</button>
          <button id="trilogyNext" type="button" aria-label="Next song">↷</button>
        </div>
      </div>
      <button class="trilogy-timeline" id="trilogyTimeline" type="button" aria-label="Seek through the current song"><span id="trilogyProgress"></span></button>
    </div>`;
  document.body.appendChild(dock);

  const audio=document.getElementById('trilogyAudio');
  const frame=document.getElementById('trilogyYoutube');
  const cover=document.getElementById('trilogyNowCover');
  const label=document.getElementById('trilogyNowLabel');
  const title=document.getElementById('trilogyNowTitle');
  const status=document.getElementById('trilogyStatus');
  const play=document.getElementById('trilogyPlay');
  const prev=document.getElementById('trilogyPrev');
  const next=document.getElementById('trilogyNext');
  const timeline=document.getElementById('trilogyTimeline');
  const progress=document.getElementById('trilogyProgress');

  let currentKey='';
  let wantsPlay=false;
  let youtubeLoaded=false;
  let youtubeState=-1;
  let youtubeTime=0;
  let youtubeDuration=0;

  const emitState=(playing)=>document.dispatchEvent(new CustomEvent('trilogy:playback',{detail:{playing,key:currentKey}}));

  function setPlaying(playing,message=''){
    dock.classList.toggle('is-playing',playing);
    play.textContent=playing?'❚❚':'▶';
    play.setAttribute('aria-label',playing?'Pause':'Play');
    status.textContent=message||(playing?'Playing':'Paused');
    emitState(playing);
  }

  function ytCommand(func,args=[]){
    if(!frame.contentWindow)return;
    frame.contentWindow.postMessage(JSON.stringify({event:'command',func,args}),'*');
  }

  function pauseYoutube(){
    wantsPlay=false;
    ytCommand('pauseVideo');
  }

  function showDock(){
    dock.hidden=false;
    document.body.classList.add('trilogy-player-open');
  }

  function markSelected(key){
    document.querySelectorAll('[data-trilogy-track]').forEach(control=>{
      const selected=control.dataset.trilogyTrack===key;
      control.classList.toggle('is-selected',selected);
      control.setAttribute('aria-pressed',selected?'true':'false');
      const card=control.closest('.trilogy-card,.stone-player,.police-cover');
      if(card)card.classList.toggle('is-selected',selected);
    });
  }

  function updateDock(key){
    const track=tracks[key];
    const index=order.indexOf(key);
    cover.src=track.cover;
    cover.alt=`${track.shortTitle} cover`;
    label.textContent=`Track ${index+1} of 3 · ${track.tone}`;
    title.textContent=track.title;
    title.href=track.page;
    progress.style.width='0%';
    showDock();
    markSelected(key);
  }

  function playLocal(){
    wantsPlay=true;
    const result=audio.play();
    if(result&&typeof result.catch==='function')result.catch(()=>{
      wantsPlay=false;
      setPlaying(false,'Tap play to start');
    });
  }

  function playYoutube(){
    wantsPlay=true;
    status.textContent=youtubeLoaded?'Starting official release…':'Loading official release…';
    if(youtubeLoaded)ytCommand('playVideo');
  }

  function selectTrack(key,autoplay=true){
    const track=tracks[key];
    if(!track)return;

    audio.pause();
    pauseYoutube();
    currentKey=key;
    youtubeState=-1;
    youtubeTime=0;
    youtubeDuration=0;
    updateDock(key);

    if(track.src){
      if(audio.src!==new URL(track.src,location.href).href){
        audio.src=track.src;
        audio.load();
      }else{
        try{audio.currentTime=0}catch(_){ }
      }
      status.textContent=autoplay?'Starting…':'Ready';
      if(autoplay)playLocal();
      else setPlaying(false);
    }else{
      status.textContent=autoplay?'Loading official release…':'Official YouTube release';
      if(autoplay)playYoutube();
      else setPlaying(false);
    }
  }

  function toggle(){
    if(!currentKey){selectTrack('sticks',true);return;}
    const track=tracks[currentKey];
    if(track.src){
      if(audio.paused)playLocal();
      else{wantsPlay=false;audio.pause();}
    }else if(youtubeState===1){
      pauseYoutube();
      setPlaying(false);
    }else{
      playYoutube();
    }
  }

  function step(delta,autoplay=true){
    const index=currentKey?order.indexOf(currentKey):0;
    const nextIndex=(index+delta+order.length)%order.length;
    selectTrack(order[nextIndex],autoplay);
  }

  function advance(){
    const index=order.indexOf(currentKey);
    if(index>=0&&index<order.length-1){
      selectTrack(order[index+1],true);
    }else{
      wantsPlay=false;
      setPlaying(false,'Trilogy finished');
      progress.style.width='100%';
    }
  }

  document.querySelectorAll('[data-trilogy-track]').forEach(control=>{
    control.addEventListener('click',event=>{
      event.preventDefault();
      selectTrack(control.dataset.trilogyTrack,true);
    });
  });

  play.addEventListener('click',toggle);
  prev.addEventListener('click',()=>step(-1,true));
  next.addEventListener('click',()=>step(1,true));

  audio.addEventListener('play',()=>{
    if(tracks[currentKey]?.src){wantsPlay=true;setPlaying(true);}
  });
  audio.addEventListener('playing',()=>{
    if(tracks[currentKey]?.src)setPlaying(true);
  });
  audio.addEventListener('pause',()=>{
    if(tracks[currentKey]?.src&&!audio.ended)setPlaying(false);
  });
  audio.addEventListener('waiting',()=>{if(tracks[currentKey]?.src)status.textContent='Buffering…';});
  audio.addEventListener('ended',advance);
  audio.addEventListener('timeupdate',()=>{
    if(tracks[currentKey]?.src&&Number.isFinite(audio.duration)&&audio.duration>0){
      progress.style.width=`${audio.currentTime/audio.duration*100}%`;
    }
  });
  audio.addEventListener('error',()=>{
    if(!audio.src)return;
    wantsPlay=false;
    setPlaying(false,'Audio could not load');
  });

  timeline.addEventListener('click',event=>{
    if(!currentKey)return;
    const rect=timeline.getBoundingClientRect();
    const ratio=Math.max(0,Math.min(1,(event.clientX-rect.left)/rect.width));
    if(tracks[currentKey].src&&Number.isFinite(audio.duration))audio.currentTime=ratio*audio.duration;
    else if(youtubeDuration)ytCommand('seekTo',[ratio*youtubeDuration,true]);
  });

  frame.addEventListener('load',()=>{
    youtubeLoaded=true;
    frame.contentWindow?.postMessage(JSON.stringify({event:'listening',id:'newToolsTrilogy'}),'*');
    ytCommand('addEventListener',['onStateChange']);
    if(currentKey==='police'&&wantsPlay)ytCommand('playVideo');
  });

  window.addEventListener('message',event=>{
    let host='';
    try{host=new URL(event.origin).hostname;}catch(_){return;}
    if(!/youtube(?:-nocookie)?\.com$/.test(host))return;
    let data=event.data;
    if(typeof data==='string'){
      try{data=JSON.parse(data);}catch(_){return;}
    }
    if(!data||typeof data!=='object')return;

    if(data.event==='onReady'){
      youtubeLoaded=true;
      if(currentKey==='police'&&wantsPlay)ytCommand('playVideo');
    }

    if(data.event==='onStateChange')youtubeState=Number(data.info);
    if(data.event==='infoDelivery'&&data.info){
      if(Number.isFinite(data.info.currentTime))youtubeTime=data.info.currentTime;
      if(Number.isFinite(data.info.duration))youtubeDuration=data.info.duration;
      if(Number.isFinite(data.info.playerState))youtubeState=data.info.playerState;
      if(currentKey==='police'&&youtubeDuration)progress.style.width=`${youtubeTime/youtubeDuration*100}%`;
    }

    if(currentKey!=='police')return;
    if(youtubeState===1){setPlaying(true);}
    else if(youtubeState===2){setPlaying(false);}
    else if(youtubeState===0){advance();}
  });

  document.addEventListener('visibilitychange',()=>{
    if(document.hidden&&currentKey==='police'&&youtubeState===1)pauseYoutube();
  });

  const origin=encodeURIComponent(location.origin);
  frame.src=`https://www.youtube-nocookie.com/embed/${tracks.police.youtubeId}?enablejsapi=1&origin=${origin}&playsinline=1&controls=0&rel=0`;
})();
