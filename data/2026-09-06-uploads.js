(()=>{
  const song={
    id:'superstore-effect',
    title:'the superstore effect',
    artist:'MusicSubject × Call Me Daddy',
    year:2026,
    month:9,
    date:'2026-09-06',
    project:'Red Deer Civic Emergency',
    description:'A Red Deer Superstore rant claimed only eighty carts were left — allegedly stolen faster than they can be replaced. Punch buggy energy. The Superstore Effect.',
    audio:'/media/songs/2026/09/superstore-effect/audio.mp3',
    cover:'/media/songs/2026/09/superstore-effect/cover.jpg',
    backgroundVideo:'/media/songs/2026/09/superstore-effect/background-loop.mp4',
    experience:'/superstore-effect/',
    sourceUrl:'https://www.facebook.com/share/p/1DYME1imxQ/',
    kind:'Satirical civic ballad · 140 BPM switch-up',
    aliases:['Superstore Effect','The Superstore Effect','Eighty Shopping Carts','80 Shopping Carts','Punch Buggy Red Deer'],
    variants:[{id:'main',label:'140 BPM Switch-Up Remaster',audio:'/media/songs/2026/09/superstore-effect/audio.mp3'}]
  };
  if(Array.isArray(window.CMD_SONGS)){
    window.CMD_SONGS=window.CMD_SONGS.filter(existing=>existing.id!=='eighty-shopping-carts'&&existing.id!==song.id);
    window.CMD_SONGS.unshift(song);
  }
  if(window.CMD_RADIO_CONFIG?.profiles){
    delete window.CMD_RADIO_CONFIG.profiles['eighty-shopping-carts'];
    window.CMD_RADIO_CONFIG.profiles['superstore-effect']={surprise:98,laugh:100,think:72,'level-up':48,heavy:24,'old-files':6};
  }
  if(window.CMD_BRIEFING?.entries){
    window.CMD_BRIEFING.entries=window.CMD_BRIEFING.entries.filter(entry=>entry.id!=='release-eighty-shopping-carts'&&entry.id!=='release-superstore-effect');
    window.CMD_BRIEFING.entries.forEach(entry=>{if(entry.featured&&typeof entry.featuredOrder==='number')entry.featuredOrder+=1;});
    window.CMD_BRIEFING.entries.unshift({
      id:'release-superstore-effect',
      published:'2026-09-06T06:30:00-06:00',
      type:'New release · civic satire',
      songId:'superstore-effect',
      featured:true,
      featuredOrder:0.4,
      href:'/superstore-effect/',
      sharePath:'/superstore-effect/',
      cta:'Open the song page',
      cardLines:['THE SUPERSTORE','EFFECT'],
      cardTag:'Red Deer · punch buggy satire',
      cardSummary:'Eighty carts remaining. A Superstore rant became the superstore effect — MusicSubject & Call Me Daddy.',
      badge:'New today',
      cover:'/media/songs/2026/09/superstore-effect/cover.jpg'
    });
    window.CMD_BRIEFING.updated='2026-09-06T06:35:00-06:00';
  }
})();
