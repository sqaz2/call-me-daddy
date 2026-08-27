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

  const concreteSong={
    id:'concrete-under-evergreens',
    title:'Concrete Under Evergreens',
    artist:'Call Me Daddy',
    year:2026,
    month:8,
    date:'2026-08-26',
    project:'Lacombe Civic Emergency',
    description:'Two small wheelbarrows of leftover concrete beneath the trees at Big Dipper Park became one extremely necessary satirical community ballad. The dumping is not celebrated; the scale of the online emergency is.',
    audio:'/media/songs/2026/08/concrete-under-evergreens/audio.mp3',
    cover:'/media/songs/2026/08/concrete-under-evergreens/cover.jpg',
    video:'/media/songs/2026/08/concrete-under-evergreens/dramatic-reconstruction.mp4',
    experience:'/concrete-under-evergreens/',
    sourceUrl:'https://www.facebook.com/groups/2281023172270130/posts/2869734633398978/',
    kind:'Satirical community ballad',
    variants:[{id:'main',label:'Main version',audio:'/media/songs/2026/08/concrete-under-evergreens/audio.mp3'}]
  };
  if(Array.isArray(window.CMD_SONGS)&&!window.CMD_SONGS.some(existing=>existing.id===concreteSong.id))window.CMD_SONGS.unshift(concreteSong);
  if(window.CMD_RADIO_CONFIG?.profiles)window.CMD_RADIO_CONFIG.profiles['concrete-under-evergreens']={surprise:96,laugh:100,think:68,'level-up':52,heavy:28,'old-files':8};
  if(window.CMD_BRIEFING?.entries){
    const concreteId='release-concrete-under-evergreens';
    if(!window.CMD_BRIEFING.entries.some(entry=>entry.id===concreteId)){
      window.CMD_BRIEFING.entries.forEach(entry=>{if(entry.featured&&Number.isInteger(entry.featuredOrder))entry.featuredOrder+=1;});
      window.CMD_BRIEFING.entries.unshift({
        id:concreteId,
        published:'2026-08-26T23:25:00-06:00',
        type:'New release · civic satire',
        songId:'concrete-under-evergreens',
        featured:true,
        featuredOrder:1,
        cardLines:['CONCRETE UNDER','EVERGREENS'],
        cardTag:'Lacombe · thoughts, care & sub-bass',
        cardSummary:'Two small wheelbarrows beneath the trees became one notified city, one dramatic reconstruction and a completely proportionate 5:44 musical response.',
        badge:'The city was notified',
        cover:'/media/songs/2026/08/concrete-under-evergreens/cover.jpg'
      });
    }
    window.CMD_BRIEFING.updated='2026-08-26T23:25:00-06:00';
  }
})();
