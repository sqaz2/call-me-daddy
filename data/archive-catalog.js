(()=>{
  if(!Array.isArray(window.CMD_SONGS))return;
  const songs=window.CMD_SONGS;
  const love=songs.find(s=>s.id==='i-need-love');
  if(love){
    Object.assign(love,{
      project:'Archive',
      description:'Older writing carried from an earlier recording into a 2024 AI reimagining, then into 2026 busker, ska-punk and dubstep versions.',
      experience:'/archive/i-need-love/',
      kind:'4 archive interpretations',
      skaPunkSunoUrl:'https://suno.com/s/UvNslBjOSmZlYvMM',
      dubstepSunoUrl:'https://suno.com/s/KRMqFJ8HBgSB4lPL'
    });
  }
  if(!songs.some(s=>s.id==='2010-wows')){
    songs.push({
      id:'2010-wows',
      title:'2010 WOWS',
      artist:'MusicSubject × Call Me Daddy',
      year:2026,
      project:'Archive',
      description:'A negative song resurfaced from long-term memory, became a 2026 special remix, then got rewritten in a positive direction.',
      audio:'/media/archive/2010-wows/2026/special-remix.mp3',
      cover:'https://i.ytimg.com/vi/Vay_RvzdeGs/hqdefault.jpg',
      experience:'/archive/2010-wows/',
      youtubeId:'Vay_RvzdeGs',
      youtubeUrl:'https://youtube.com/shorts/Vay_RvzdeGs?feature=share',
      positiveSunoUrl:'https://suno.com/s/Zooqq8Q9KsTbnAjw',
      kind:'2026 special remix',
      variants:[{id:'special-2026-remix',label:'Special 2026 Remix',audio:'/media/archive/2010-wows/2026/special-remix.mp3'}]
    });
  }
})();