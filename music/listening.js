(() => {
  const params=new URLSearchParams(location.search),id=params.get('song');
  const catalog=window.CMDMusicCatalog,engine=window.CMDCatalogCycle,player=window.CMDUniversalPlayer;
  const audio=document.getElementById('catalogAudio'),el=id=>document.getElementById(id);
  if(!catalog||!player||!audio)return;
  const song=(window.CMD_SONGS||[]).find(s=>s.id===id);
  const variants=song?engine.variants(song):[];
  const requested=params.get('version');
  const variant=requested?variants.find(v=>v.id===requested):variants[0];
  const picked=song&&variant?{...song,...variant,songId:song.id,title:song.title,variantId:variant.id,variantLabel:variant.label,variantCount:variants.length,cover:variant.cover||song.cover}:null;
  const intent=engine.intents.find(i=>i.id===engine.normalizeIntent(params.get('intent')));
  const owner=()=>{try{return window.top.CMDUniversalPlayer||player}catch{return player}};
  const safe=text=>String(text||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const route=()=>location.pathname+location.search;
  const getTrack=()=>{
    const track=catalog.getCurrent()||picked;
    // Keep the selected recording's listening screen in view. Further songs
    // follow their story pages through the existing universal owner.
    return track&&picked&&track.songId===picked.songId&&track.variantId===picked.variantId?{...track,experience:route()}:track;
  };
  const handle=player.connect({id:'focused-catalog',audio,getTrack,getUpcoming:()=>catalog.peekNext?.(),
    getContext:track=>track?.variantLabel||intent?.label||'Radio',play:()=>audio.play(),pause:()=>audio.pause(),
    toggle:()=>audio.paused?audio.play():audio.pause(),next:catalog.next,previous:catalog.previous,
    replaceElement:el('catalogPlayer')});
  let painted='';
  const paint=()=>{
    const track=catalog.getCurrent()||picked;
    const live=owner()?.getTrack?.(),media=owner()?.getMedia?.();
    const matches=track?.audio&&live?.audio&&new URL(track.audio,location.origin).href===new URL(live.audio,location.origin).href;
    const playing=matches&&media&&!media.paused;
    if(track){
      el('listenTitle').textContent=track.title;
      el('listenContext').textContent=playing?'Now playing':'Selected recording';
      el('listenDetail').textContent=[track.artist,track.variantLabel].filter(Boolean).join(' · ');
      el('listenArt').hidden=false;el('listenCover').src=track.cover||'/media/site/image-coming-soon.jpg';
      el('listenArt').setAttribute('aria-label',`${playing?'Pause':'Play'} ${track.title}`);
      el('listenPlay').textContent=playing?'❚❚ Pause':'▶ Play';
      el('listenStatus').textContent=matches?(playing?'Playing · controls below':'Paused · tap play to continue'):'Tap play. More music follows.';
      const currentSong=(window.CMD_SONGS||[]).find(s=>s.id===(track.songId||track.id))||song;
      const key=track.songId||track.id;
      if(key!==painted){
        painted=key;
        const list=engine.variants(currentSong);
        el('listenVersions').hidden=list.length<2;
        el('listenVersionLinks').innerHTML=list.map(v=>`<a href="/music/?song=${encodeURIComponent(key)}&amp;version=${encodeURIComponent(v.id)}">${safe(v.label||v.id)}</a>`).join('');
        const lyrics=window.CMDSongLyrics?.lyrics(key)||'';
        el('listenLyricText').textContent=lyrics;el('listenLyrics').hidden=!lyrics;
        el('listenStory').hidden=!currentSong?.experience;el('listenStory').href=currentSong?.experience||'/';
        document.title=`${track.title} — MusicSubject × Call Me Daddy`;
      }
    }else{
      el('listenTitle').textContent=id?'Recording unavailable':intent?.label||'Surprise me';
      el('listenDetail').textContent=id?'Find this song on Home to see its available recordings.':'A fresh mix. One song at a time.';
      el('listenPlay').disabled=Boolean(id);el('listenPlay').textContent='▶ Play this mix';
      el('listenStatus').textContent=id?'Choose another song or version.':'Tap play to begin. Nothing starts automatically.';
    }
  };
  const play=()=>{
    const live=owner()?.getTrack?.(),media=owner()?.getMedia?.();
    if(media&&(media===audio||(picked?.audio&&live?.audio&&new URL(picked.audio,location.origin).href===new URL(live.audio,location.origin).href))){owner().control('toggle');paint();return;}
    if(media)owner().control('pause');
    if(picked)catalog.playRecording(picked.songId,picked.variantId);else if(!id)catalog.next();
    handle.activate();paint();
  };
  el('listenPlay').addEventListener('click',play);el('listenArt').addEventListener('click',play);
  ['playing','pause','loadedmetadata','ended'].forEach(type=>audio.addEventListener(type,paint));
  el('listenMoodLinks').innerHTML=engine.intents.map(i=>`<a href="/music/?intent=${encodeURIComponent(i.id)}">${safe(i.label)}</a>`).join('');
  el('listenMoods').hidden=Boolean(id);
  paint();
})();
