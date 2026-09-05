(()=>{
  const additions=[
    {
      id:'twas-the-tism-mlord',
      title:'’Twas the Tism, M’Lord',
      artist:'MusicSubject × Call Me Daddy',
      year:2026,
      month:9,
      date:'2026-09-02',
      project:'’Twas the Tism, M’Lord',
      description:'A medieval meme turned into dark cinematic R&B and dubstep, then tightened with micro-stutters before the shorter final edit glitches itself apart.',
      lineage:'Meme seed → multiple Suno cuts → chosen dark R&B/dubstep direction → shortened final arrangement → surgical micro-stutter edits → continuous glitch-out final.',
      aliases:['Twas the Tism M’Lord'],
      audio:'/media/songs/2026/09/twas-the-tism-mlord/audio.mp3',
      cover:'/media/songs/2026/09/twas-the-tism-mlord/cover.jpg',
      experience:'/twas-the-tism-mlord/',
      shareUrl:'/twas-the-tism-mlord/',
      kind:'dark R&B / dubstep · final glitch edit',
      variants:[
        {
          id:'final-glitch-edit',
          label:'Final Glitch Edit',
          audio:'/media/songs/2026/09/twas-the-tism-mlord/audio.mp3'
        }
      ]
    }
  ];

  if(Array.isArray(window.CMD_SONGS)){
    for(let index=additions.length-1;index>=0;index-=1){
      const song=additions[index];
      if(!window.CMD_SONGS.some(existing=>existing.id===song.id))window.CMD_SONGS.unshift(song);
    }
  }

  if(window.CMD_RADIO_CONFIG?.profiles){
    window.CMD_RADIO_CONFIG.profiles['twas-the-tism-mlord']={surprise:100,laugh:94,think:68,'level-up':54,heavy:88,'old-files':4};
  }

  if(window.CMD_BRIEFING?.entries&&!window.CMD_BRIEFING.entries.some(entry=>entry.id==='release-twas-the-tism-mlord')){
    const entry={
      id:'release-twas-the-tism-mlord',
      published:'2026-09-02T07:05:00-06:00',
      type:'New release · final edit',
      title:'’Twas the Tism, M’Lord',
      summary:'The medieval meme song is live in its shorter final form: multiple Suno cuts narrowed into dark R&B and dubstep, then the weak stretches were cut out and the ending was rebuilt with micro-stutters and a full glitch-out.',
      href:'/twas-the-tism-mlord/',
      sharePath:'/twas-the-tism-mlord/',
      cta:'Open the song page',
      featured:true,
      featuredOrder:.5,
      cover:'/media/songs/2026/09/twas-the-tism-mlord/cover.jpg',
      cardLines:['’TWAS THE TISM','M’LORD'],
      cardTag:'Medieval meme · dark R&B / dubstep',
      cardSummary:'The lyrics stayed medieval; the Halloween treatment is visual. The final release is the shorter hand-edited cut with micro-stutters and a glitching outro.',
      badge:'New today'
    };
    window.CMD_BRIEFING.entries.unshift(entry);
    window.CMD_BRIEFING.updated='2026-09-02T07:05:00-06:00';
  }

  const isTismPage=/^\/twas-the-tism-mlord\/?$/.test(location.pathname);
  if(!isTismPage||window.CMD_TISM_ENDLESS_BOOTING||window.CMD_TISM_ENDLESS)return;
  window.CMD_TISM_ENDLESS_BOOTING=true;

  const loadScript=(src,test)=>new Promise((resolve,reject)=>{
    if(test?.()){resolve();return;}
    const existing=[...document.scripts].find(script=>script.src&&new URL(script.src,location.href).pathname===src);
    if(existing){existing.addEventListener('load',()=>resolve(),{once:true});existing.addEventListener('error',reject,{once:true});if(test?.())resolve();return;}
    const script=document.createElement('script');
    script.src=src;
    script.async=false;
    script.addEventListener('load',()=>resolve(),{once:true});
    script.addEventListener('error',reject,{once:true});
    document.head.appendChild(script);
  });

  const boot=async()=>{
    try{
      await loadScript('/catalog-cycle.js',()=>Boolean(window.CMDCatalogCycle));
      await loadScript('/playlist-radio.js',()=>Boolean(window.CMDPlaylistRadio));
      await loadScript('/persistent-site-browser.js',()=>Boolean(window.CMDPersistentSite));
      await loadScript('/continuous-playback.js',()=>Boolean(window.CMDContinuousPlayback));

      const audio=document.getElementById('songAudio');
      if(!audio||!window.CMDContinuousPlayback)return;
      const self={id:'twas-the-tism-mlord',songId:'twas-the-tism-mlord',title:'’Twas the Tism, M’Lord',artist:'MusicSubject × Call Me Daddy',project:'’Twas the Tism, M’Lord',audio:'/media/songs/2026/09/twas-the-tism-mlord/audio.mp3',cover:'/media/songs/2026/09/twas-the-tism-mlord/cover.jpg',experience:'/twas-the-tism-mlord/'};
      const player=document.getElementById('tismPlayer');
      const mini=player?.querySelector('.tism-mini');
      const copy=player?.querySelector('.tism-player-copy');
      const label=copy?.querySelector('small');
      const title=copy?.querySelector('strong');
      const status=document.getElementById('playerStatus');

      const controller=window.CMDContinuousPlayback.create({
        id:'twas-the-tism-endless-player',
        audio,
        tracks:[self],
        localCount:1,
        excludeIds:[self.id],
        lastSongId:self.id,
        route:'/twas-the-tism-mlord/',
        onTrack:(track,state={})=>{
          if(state.reason!=='ready'&&player)player.hidden=false;
          if(label)label.textContent=(state.index||0)===0?'Final glitch edit':'Play the site';
          if(title)title.textContent=track.title||'Call Me Daddy';
          if(mini&&track.cover){mini.src=track.cover;mini.alt=`${track.title||'Song'} artwork`;}
          if(status)status.textContent=state.reason==='ready'?'Ready':'Loading next…';
        },
        onPlayState:playing=>{if(status)status.textContent=playing?'Playing':(!audio.ended?'Paused':status.textContent);},
        onStatus:kind=>{
          if(!status)return;
          if(kind==='waiting'||kind==='stalled')status.textContent='Buffering…';
          else if(kind==='blocked')status.textContent='Tap play to continue';
          else if(kind==='error')status.textContent='Skipping unavailable track…';
          else if(kind==='failed')status.textContent='Playback needs a tap';
        }
      });
      window.CMD_TISM_ENDLESS=controller;
    }finally{
      window.CMD_TISM_ENDLESS_BOOTING=false;
    }
  };

  boot();
})();
