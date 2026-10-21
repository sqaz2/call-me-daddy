(()=>{
  'use strict';
  // Page-local UI only: once the cover has started the song, the ▶ badge stays hidden,
  // including after the persistent site browser re-hosts this page in its frame.
  const body=document.body;
  const SONG_ID=body.dataset.songId;
  const KEY=`cmd-cover-played:${SONG_ID}`;
  const cover=document.getElementById('releasePlay');
  if(!cover)return;
  const remembered=()=>{try{return sessionStorage.getItem(KEY)==='1'}catch{return false}};
  const mark=()=>{
    if(body.classList.contains('has-played'))return;
    body.classList.add('has-played');
    try{sessionStorage.setItem(KEY,'1')}catch{}
  };
  const sharedTrack=()=>{
    try{if(window.top!==window.self&&window.top.location.origin===location.origin)return window.top.CMDUniversalPlayer?.getTrack?.()}catch{}
    return window.CMDUniversalPlayer?.getTrack?.();
  };
  const check=()=>{if(sharedTrack()?.songId===SONG_ID)mark()};
  if(remembered())mark();
  cover.addEventListener('click',mark,{once:true});
  document.getElementById('releaseAudio')?.addEventListener('playing',mark,{once:true});
  check();
  window.CMDContinuousPlayback?.subscribe?.(check);
  const timer=window.setInterval(()=>{check();if(body.classList.contains('has-played'))window.clearInterval(timer)},500);
})();
