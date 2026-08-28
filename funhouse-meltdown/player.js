(()=>{
  const audio=document.getElementById('funhouseAudio'),wrap=audio?.closest('.audio-wrap'),label=wrap?.querySelector('.audio-label span'),title=wrap?.querySelector('.audio-label strong'),cover=document.querySelector('.machine-cover');
  if(!audio||!wrap||!window.CMDContinuousPlayback)return;
  const status=document.createElement('span');status.className='audio-status';status.textContent='Ready';wrap.appendChild(status);
  const share=document.createElement('button');share.type='button';share.className='btn';share.textContent='↗ Share this song';wrap.appendChild(share);
  const self={id:'funhouse-meltdown',songId:'funhouse-meltdown',title:'Funhouse Meltdown',artist:'Call Me Daddy × MusicSubject',project:'Funhouse Meltdown',audio:'/media/songs/2026/08/funhouse-meltdown/audio.mp3',cover:'/media/songs/2026/08/funhouse-meltdown/cover-v2.jpg',experience:'/funhouse-meltdown/'};
  let active=self,activeIndex=0;
  window.CMDContinuousPlayback.create({
    id:'funhouse-endless-player',audio,tracks:[self],localCount:1,excludeIds:[self.id],lastSongId:self.id,route:'/funhouse-meltdown/',
    onTrack:(track,state={})=>{active=track;activeIndex=state.index??activeIndex;if(label)label.textContent=activeIndex===0?'Call Me Daddy':'Play the site';if(title)title.textContent=track.title;if(cover&&track.cover){cover.src=track.cover;cover.alt=`${track.title} artwork`}status.textContent=state.reason==='ready'?'Ready':'Loading next…'},
    onPlayState:playing=>{status.textContent=playing?'Playing':(!audio.ended?'Paused':status.textContent)},
    onStatus:kind=>{if(kind==='waiting'||kind==='stalled')status.textContent='Buffering…';else if(kind==='blocked')status.textContent='Tap play to continue';else if(kind==='error')status.textContent='Skipping unavailable track…';else if(kind==='failed')status.textContent='Playback needs a tap'}
  });
  share.addEventListener('click',()=>window.CMDPlaylistRadio?.share(active));
})();
