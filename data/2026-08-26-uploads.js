(()=>{
  const song={
    id:'anti-generative-ai-diss',
    title:'Anti Generative AI Diss',
    artist:'Call Me Daddy',
    year:2026,
    month:8,
    date:'2026-08-26',
    project:'New Tools · Bonus Case',
    description:'A dubstep roast of anti-generative-AI gatekeeping, sparked by reading a post asking for business flyer and collage tools specifically because they avoid AI. The joke escalated into Artists Against Artists Against Generative AI — a parody counter-group.',
    audio:'/media/songs/2026/08/anti-generative-ai-diss/audio.mp3',
    cover:'/media/songs/2026/08/anti-generative-ai-diss/cover.jpg',
    experience:'/anti-generative-ai-diss/',
    sunoUrl:'https://suno.com/s/HYl40BSYbApyRNiA',
    youtubeUrl:'https://youtu.be/wxeKN1Z88Pc',
    groupUrl:'https://www.facebook.com/share/g/1GKgK3NoYT/',
    related:['back-to-sticks','the-musician-police','level-up'],
    kind:'Dubstep satire · New Tools bonus case',
    variants:[{id:'main',label:'Main version',audio:'/media/songs/2026/08/anti-generative-ai-diss/audio.mp3'}]
  };
  if(Array.isArray(window.CMD_SONGS)&&!window.CMD_SONGS.some(existing=>existing.id===song.id))window.CMD_SONGS.unshift(song);
  if(window.CMD_RADIO_CONFIG?.profiles)window.CMD_RADIO_CONFIG.profiles['anti-generative-ai-diss']={surprise:100,laugh:100,think:84,'level-up':94,heavy:70,'old-files':8};
  if(window.CMD_BRIEFING?.entries){
    const id='release-anti-generative-ai-diss';
    if(!window.CMD_BRIEFING.entries.some(entry=>entry.id===id)){
      window.CMD_BRIEFING.entries.forEach(entry=>{if(entry.featured&&Number.isInteger(entry.featuredOrder))entry.featuredOrder+=1;});
      window.CMD_BRIEFING.entries.unshift({id,published:'2026-08-26T02:46:00-06:00',type:'New release · satire',songId:'anti-generative-ai-diss',featured:true,featuredOrder:1,cardLines:['ANTI GENERATIVE','AI DISS'],cardTag:'New Tools bonus case · resistance to the resistance',cardSummary:'A Facebook anti-AI post became a screen recording, then a dubstep diss, then somehow a parody counter-group.',badge:'Join the troll group',cover:'/media/songs/2026/08/anti-generative-ai-diss/cover.jpg'});
    }
    window.CMD_BRIEFING.updated='2026-08-26T02:46:00-06:00';
  }
})();
