(()=>{
  let persistentScript=document.querySelector('script[data-cmd-persistent]');
  if(!window.CMDPersistentSite&&!persistentScript){
    persistentScript=document.createElement('script');
    persistentScript.src='/persistent-site-browser.js?v=20260824-5';
    persistentScript.dataset.cmdPersistent='';
    document.head.appendChild(persistentScript);
  }
  const markListeningSession=()=>{
    if(window.CMDPersistentSite){window.CMDPersistentSite.setSession(true);window.CMDPersistentSite.refreshClearance?.();return;}
    persistentScript?.addEventListener('load',()=>{window.CMDPersistentSite?.setSession(true);window.CMDPersistentSite?.refreshClearance?.()},{once:true});
  };

  const order=['sticks','police','level','diss'];
  const tracks={
    sticks:{title:'Back to Sticks (Soothing Mix)',shortTitle:'Back to Sticks',tone:'The mean one',artist:'Call Me Daddy',src:'/media/songs/2026/08/back-to-sticks/audio.mp3',cover:'/media/songs/2026/08/back-to-sticks/cover.jpg',page:'/back-to-sticks/'},
    police:{title:'The Musician Police',shortTitle:'The Musician Police',tone:'The funniest one',artist:'MusicSubject feat. Call Me Daddy',youtubeId:'7rI2MtnRsaA',cover:'/media/songs/2026/07/the-musician-police/cover.jpg',page:'/the-musician-police/'},
    level:{title:'Level Up (Primal Dubstep Mix)',shortTitle:'Level Up',tone:'The inspiring one',artist:'MusicSubject × Call Me Daddy',src:'/media/songs/2026/08/level-up/audio.mp3',cover:'/media/songs/2026/08/level-up/cover.jpg',page:'/level-up/'},
    diss:{title:'Anti Generative AI Diss',shortTitle:'Anti Generative AI Diss',tone:'The direct diss',artist:'Call Me Daddy',src:'/media/songs/2026/08/anti-generative-ai-diss/audio.mp3',cover:'/media/songs/2026/08/anti-generative-ai-diss/cover.jpg',page:'/anti-generative-ai-diss/'}
  };

  function loadTactileAssets(onReady){
    if(!document.querySelector('link[data-tactile-scrubber]')){const link=document.createElement('link');link.rel='stylesheet';link.href='/tactile-scrubber.css?v=20260820-1';link.dataset.tactileScrubber='';document.head.appendChild(link)}
    if(window.CMDTactileScrubber){onReady();return}
    const existing=document.querySelector('script[data-tactile-scrubber]');if(existing){existing.addEventListener('load',onReady,{once:true});return}
    const script=document.createElement('script');script.src='/tactile-scrubber.js?v=20260820-1';script.dataset.tactileScrubber='';script.addEventListener('load',onReady,{once:true});document.head.appendChild(script);
  }

  const dock=document.createElement('div');dock.className='trilogy-player-shell';dock.id='trilogyPlayer';dock.hidden=true;dock.innerHTML=`
    <div id="trilogyTactile" class="tactile-scrubber-shell" aria-label="Large tactile song scrubber"></div>
    <div class="shell trilogy-player-inner"><audio id="trilogyAudio" preload="metadata"></audio><div class="trilogy-now"><div class="trilogy-player-cover" aria-hidden="true"><img id="trilogyNowCover" alt=""><div id="trilogyYoutube"></div></div><div class="trilogy-player-meta"><small id="trilogyNowLabel">Tap a song image</small><a id="trilogyNowTitle" href="#">New Tools · four-track run</a><span id="trilogyStatus">Ready</span></div><div class="trilogy-controls"><button id="trilogyPrev" type="button" aria-label="Previous song">↶</button><button id="trilogyPlay" type="button" aria-label="Play">▶</button><button id="trilogyNext" type="button" aria-label="Next song">↷</button></div></div><button class="trilogy-timeline" id="trilogyTimeline" type="button" aria-label="Seek through the current song"><span id="trilogyProgress"></span></button></div>`;document.body.appendChild(dock);

  const audio=document.getElementById('trilogyAudio'),youtubeMount=document.getElementById('trilogyYoutube'),cover=document.getElementById('trilogyNowCover'),label=document.getElementById('trilogyNowLabel'),title=document.getElementById('trilogyNowTitle'),status=document.getElementById('trilogyStatus'),play=document.getElementById('trilogyPlay'),prev=document.getElementById('trilogyPrev'),next=document.getElementById('trilogyNext'),timeline=document.getElementById('trilogyTimeline'),progress=document.getElementById('trilogyProgress'),tactileMount=document.getElementById('trilogyTactile');
  let currentKey='',wantsPlay=false,youtubePlayer=null,youtubeReady=false,youtubeRequested=false,youtubeState=-1,youtubeTime=0,youtubeDuration=0,tactile=null;
  const currentDuration=()=>currentKey==='police'?youtubeDuration:(Number(audio.duration)||0),currentTime=()=>currentKey==='police'?youtubeTime:(Number(audio.currentTime)||0);
  const seekCurrent=time=>{const duration=currentDuration();if(!duration)return;const target=Math.max(0,Math.min(duration,time));if(currentKey==='police'){if(youtubeReady){try{youtubePlayer.seekTo(target,true);youtubeTime=target}catch{}}}else try{audio.currentTime=target}catch{}};

  loadTactileAssets(()=>{if(tactile||!window.CMDTactileScrubber)return;tactile=window.CMDTactileScrubber.create({mount:tactileMount,getDuration:currentDuration,getTime:currentTime,seek:seekCurrent,label:'DRAG TO SCAN',detail:'ONE TURN = WHOLE SONG',haptics:true})});
  const emitState=playing=>document.dispatchEvent(new CustomEvent('trilogy:playback',{detail:{playing,key:currentKey}}));
  function setPlaying(playing,message=''){dock.classList.toggle('is-playing',playing);play.textContent=playing?'❚❚':'▶';play.setAttribute('aria-label',playing?'Pause':'Play');status.textContent=message||(playing?'Playing':'Paused');if(playing)markListeningSession();emitState(playing)}
  function handleYoutubeState(state){youtubeState=Number(state);if(currentKey!=='police')return;if(youtubeState===1)setPlaying(true);else if(youtubeState===2)setPlaying(false);else if(youtubeState===0)advance()}
  function createYoutubePlayer(){if(youtubePlayer||!window.YT?.Player)return;youtubePlayer=new window.YT.Player(youtubeMount,{width:'200',height:'200',videoId:tracks.police.youtubeId,playerVars:{autoplay:0,controls:0,playsinline:1,rel:0,origin:location.origin},events:{onReady:event=>{youtubeReady=true;youtubeDuration=Number(event.target.getDuration())||0;if(currentKey==='police'&&wantsPlay){status.textContent='Starting official release…';event.target.playVideo()}},onStateChange:event=>handleYoutubeState(event.data),onError:()=>{if(currentKey!=='police')return;wantsPlay=false;setPlaying(false,'Official player unavailable · open song page')}}})}
  function ensureYoutube(){if(youtubePlayer)return;if(window.YT?.Player){createYoutubePlayer();return}if(youtubeRequested)return;youtubeRequested=true;const previousReady=window.onYouTubeIframeAPIReady;window.onYouTubeIframeAPIReady=()=>{if(typeof previousReady==='function')previousReady();createYoutubePlayer()};const script=document.createElement('script');script.src='https://www.youtube.com/iframe_api';script.async=true;script.addEventListener('error',()=>{if(currentKey==='police')setPlaying(false,'Official player unavailable · open song page')});document.head.appendChild(script)}
  function pauseYoutube(){wantsPlay=false;if(youtubeReady)try{youtubePlayer.pauseVideo()}catch{}}
  function showDock(){dock.hidden=false;document.body.classList.add('trilogy-player-open');window.CMDPersistentSite?.refreshClearance?.()}
  function markSelected(key){document.querySelectorAll('[data-trilogy-track]').forEach(control=>{const selected=control.dataset.trilogyTrack===key;control.classList.toggle('is-selected',selected);control.setAttribute('aria-pressed',selected?'true':'false');const card=control.closest('.trilogy-card,.stone-player,.police-cover,.anti-track,.anti-release-panel');if(card)card.classList.toggle('is-selected',selected)})}
  function updateDock(key){const track=tracks[key],i=order.indexOf(key);cover.src=track.cover;cover.alt=`${track.shortTitle} cover`;label.textContent=`Track ${i+1} of ${order.length} · ${track.tone}`;title.textContent=track.title;title.href=track.page;progress.style.width='0%';showDock();markSelected(key)}
  function playLocal(){wantsPlay=true;const result=audio.play();if(result&&typeof result.catch==='function')result.catch(()=>{wantsPlay=false;setPlaying(false,'Tap play to start')})}
  function playYoutube(){wantsPlay=true;ensureYoutube();status.textContent=youtubeReady?'Starting official release…':'Loading official release…';if(youtubeReady)try{youtubePlayer.playVideo()}catch{}}
  function selectTrack(key,autoplay=true){const track=tracks[key];if(!track)return;audio.pause();pauseYoutube();currentKey=key;youtubeState=-1;youtubeTime=0;youtubeDuration=0;updateDock(key);if(track.src){if(audio.src!==new URL(track.src,location.href).href){audio.src=track.src;audio.load()}else try{audio.currentTime=0}catch{}status.textContent=autoplay?'Starting…':'Ready';if(autoplay)playLocal();else setPlaying(false)}else{status.textContent=autoplay?'Loading official release…':'Official YouTube release';if(autoplay)playYoutube();else setPlaying(false)}}
  function toggle(){if(!currentKey){selectTrack('sticks',true);return}const track=tracks[currentKey];if(track.src){if(audio.paused)playLocal();else{wantsPlay=false;audio.pause()}}else if(youtubeState===1){pauseYoutube();setPlaying(false)}else playYoutube()}
  function step(delta,autoplay=true){const i=currentKey?order.indexOf(currentKey):0;selectTrack(order[(i+delta+order.length)%order.length],autoplay)}
  function advance(){const i=order.indexOf(currentKey);if(i>=0&&i<order.length-1)selectTrack(order[i+1],true);else{wantsPlay=false;setPlaying(false,'Four-track run finished');progress.style.width='100%'}}

  document.querySelectorAll('[data-trilogy-track]').forEach(control=>control.addEventListener('click',event=>{event.preventDefault();selectTrack(control.dataset.trilogyTrack,true)}));
  play.addEventListener('click',toggle);prev.addEventListener('click',()=>step(-1,true));next.addEventListener('click',()=>step(1,true));
  audio.addEventListener('play',()=>{if(tracks[currentKey]?.src){wantsPlay=true;setPlaying(true)}});audio.addEventListener('playing',()=>{if(tracks[currentKey]?.src)setPlaying(true)});audio.addEventListener('pause',()=>{if(tracks[currentKey]?.src&&!audio.ended)setPlaying(false)});audio.addEventListener('waiting',()=>{if(tracks[currentKey]?.src)status.textContent='Buffering…'});audio.addEventListener('ended',advance);audio.addEventListener('timeupdate',()=>{if(tracks[currentKey]?.src&&Number.isFinite(audio.duration)&&audio.duration>0)progress.style.width=`${audio.currentTime/audio.duration*100}%`});audio.addEventListener('error',()=>{if(!audio.src)return;wantsPlay=false;setPlaying(false,'Audio could not load')});
  timeline.addEventListener('click',event=>{if(!currentKey)return;const rect=timeline.getBoundingClientRect(),ratio=Math.max(0,Math.min(1,(event.clientX-rect.left)/rect.width));if(tracks[currentKey].src&&Number.isFinite(audio.duration))audio.currentTime=ratio*audio.duration;else if(youtubeDuration&&youtubeReady)try{youtubePlayer.seekTo(ratio*youtubeDuration,true)}catch{}});
  window.setInterval(()=>{if(currentKey!=='police'||!youtubeReady)return;try{youtubeTime=Number(youtubePlayer.getCurrentTime())||0;youtubeDuration=Number(youtubePlayer.getDuration())||youtubeDuration;if(youtubeDuration)progress.style.width=`${youtubeTime/youtubeDuration*100}%`}catch{}},500);
  document.addEventListener('cmd:persistent-pause',()=>{audio.pause();pauseYoutube();if(currentKey)setPlaying(false,'Paused')});
  ensureYoutube();
})();
