(()=>{
  const song={
    id:'eighty-shopping-carts',
    title:'Eighty Shopping Carts',
    artist:'Call Me Daddy',
    year:2026,
    month:9,
    date:'2026-09-06',
    project:'Red Deer Civic Emergency',
    description:'A Red Deer Superstore rant claimed only eighty carts were left — allegedly stolen faster than they can be replaced. The Facebook post left. The song stayed.',
    audio:'/media/songs/2026/09/eighty-shopping-carts/audio.mp3',
    cover:'/media/songs/2026/09/eighty-shopping-carts/cover.jpg',
    experience:'/eighty-shopping-carts/',
    sourceUrl:'https://www.facebook.com/share/p/1DYME1imxQ/',
    kind:'Satirical civic ballad',
    aliases:['80 Shopping Carts','Eighty Carts Remaining','Superstore Carts'],
    variants:[{id:'main',label:'Main version',audio:'/media/songs/2026/09/eighty-shopping-carts/audio.mp3'}]
  };
  if(Array.isArray(window.CMD_SONGS)&&!window.CMD_SONGS.some(existing=>existing.id===song.id))window.CMD_SONGS.unshift(song);
  if(window.CMD_RADIO_CONFIG?.profiles)window.CMD_RADIO_CONFIG.profiles['eighty-shopping-carts']={surprise:98,laugh:100,think:72,'level-up':48,heavy:24,'old-files':6};
  if(window.CMD_BRIEFING?.entries){
    const id='release-eighty-shopping-carts';
    if(!window.CMD_BRIEFING.entries.some(entry=>entry.id===id)){
      window.CMD_BRIEFING.entries.forEach(entry=>{if(entry.featured&&typeof entry.featuredOrder==='number')entry.featuredOrder+=1;});
      window.CMD_BRIEFING.entries.unshift({
        id,
        published:'2026-09-06T06:30:00-06:00',
        type:'New release · civic satire',
        songId:'eighty-shopping-carts',
        featured:true,
        featuredOrder:0.4,
        href:'/eighty-shopping-carts/',
        sharePath:'/eighty-shopping-carts/',
        cta:'Open the song page',
        cardLines:['EIGHTY','SHOPPING CARTS'],
        cardTag:'Red Deer · Superstore rant → song',
        cardSummary:'Eighty carts remaining. Stolen faster than they can replace them. A Rants & Raves post became a Call Me Daddy release.',
        badge:'New today',
        cover:'/media/songs/2026/09/eighty-shopping-carts/cover.jpg'
      });
    }
    window.CMD_BRIEFING.updated='2026-09-06T06:30:00-06:00';
  }
})();
