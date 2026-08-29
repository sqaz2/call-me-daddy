(()=>{
  const additions=[
    {
      id:'keep-moving',
      title:'Keep Moving',
      artist:'Call Me Daddy',
      year:2026,
      month:8,
      date:'2026-08-29',
      project:'Keep Moving',
      description:'A forward-motion song about continuing through setbacks and changing routes. Two uploaded versions stay together here: v2 and the Trap Mix.',
      audio:'/media/songs/2026/08/keep-moving/v2.mp3',
      cover:'',
      experience:'/updates/release-keep-moving/',
      shareUrl:'/updates/release-keep-moving/',
      kind:'2 versions',
      variants:[
        {id:'v2',label:'v2',audio:'/media/songs/2026/08/keep-moving/v2.mp3'},
        {id:'trap-mix',label:'Trap Mix',audio:'/media/songs/2026/08/keep-moving/trap-mix.mp3'}
      ]
    },
    {
      id:'thirty-six',
      title:'Thirty Six',
      artist:'Call Me Daddy',
      year:2026,
      month:8,
      date:'2026-08-29',
      project:'Thirty Six',
      description:'An age-36 reflection about realizing the pressure is not only time passing—it is that you cannot live every possible version of yourself at once.',
      aliases:['Running Out of Versions'],
      audio:'/media/songs/2026/08/thirty-six/main.mp3',
      cover:'',
      experience:'/updates/release-thirty-six/',
      shareUrl:'/updates/release-thirty-six/',
      kind:'Age-36 reflection',
      variants:[{id:'main',label:'Current upload',audio:'/media/songs/2026/08/thirty-six/main.mp3'}]
    }
  ];

  const addVersion=(song,id,label,audio)=>{
    if(!song)return;
    if(!Array.isArray(song.variants))song.variants=[];
    if(!song.variants.some(version=>version.id===id))song.variants.push({id,label,audio});
    song.kind=`${song.variants.length} versions`;
  };

  if(Array.isArray(window.CMD_SONGS)){
    for(let index=additions.length-1;index>=0;index-=1){
      const song=additions[index];
      if(!window.CMD_SONGS.some(existing=>existing.id===song.id))window.CMD_SONGS.unshift(song);
    }

    const oneBrick=window.CMD_SONGS.find(song=>song.id==='one-brick');
    if(oneBrick){
      if(!Array.isArray(oneBrick.aliases))oneBrick.aliases=[];
      if(!oneBrick.aliases.includes('One Brick at a Time'))oneBrick.aliases.push('One Brick at a Time');
      oneBrick.description='A rebuilding song about putting life back together one brick at a time. The Barbershop Dubstep A Cappella mix now sits beside an Extended v1.';
      addVersion(oneBrick,'extended-v1','One Brick at a Time · Extended v1','/media/songs/2026/08/one-brick/extended-v1.mp3');
    }
  }

  if(window.CMD_RADIO_CONFIG?.profiles){
    window.CMD_RADIO_CONFIG.profiles['keep-moving']={surprise:90,laugh:18,think:82,'level-up':100,heavy:72,'old-files':16};
    window.CMD_RADIO_CONFIG.profiles['thirty-six']={surprise:88,laugh:8,think:100,'level-up':90,heavy:82,'old-files':28};
  }

  if(window.CMD_BRIEFING?.entries){
    const entries=[
      {
        id:'release-keep-moving',
        published:'2026-08-29T03:37:15-06:00',
        type:'New release · two versions',
        songId:'keep-moving',
        href:'/music/?song=keep-moving&version=v2&intent=level-up&share=1',
        cta:'Play Keep Moving',
        featured:true,
        featuredOrder:1,
        cardLines:['KEEP','MOVING'],
        cardTag:'Forward motion · v2 + Trap Mix',
        cardSummary:'Two uploaded takes, one song identity: v2 and the Trap Mix.',
        badge:'2 versions'
      },
      {
        id:'release-thirty-six',
        published:'2026-08-29T03:36:45-06:00',
        type:'New release · reflection',
        songId:'thirty-six',
        href:'/music/?song=thirty-six&version=main&intent=think&share=1',
        cta:'Play Thirty Six',
        featured:true,
        featuredOrder:2,
        cardLines:['THIRTY','SIX'],
        cardTag:'Age 36 · versions of yourself',
        cardSummary:'Not just running out of time—realizing you cannot live every possible version of yourself at once.',
        badge:'Age-36 reflection'
      },
      {
        id:'one-brick-extended-v1',
        published:'2026-08-29T03:36:15-06:00',
        type:'New version',
        songId:'one-brick',
        href:'/music/?song=one-brick&version=extended-v1&intent=level-up&share=1',
        cta:'Play the Extended v1',
        cardTag:'One Brick at a Time · Extended v1',
        cardSummary:'One Brick now has a second preserved version beside the Barbershop Dubstep A Cappella mix.',
        badge:'Version added'
      }
    ];

    const missingFeatured=entries.filter(entry=>entry.featured&&!window.CMD_BRIEFING.entries.some(existing=>existing.id===entry.id));
    if(missingFeatured.length){
      window.CMD_BRIEFING.entries.forEach(entry=>{
        if(entry.featured&&Number.isInteger(entry.featuredOrder))entry.featuredOrder+=missingFeatured.length;
      });
    }

    for(let index=entries.length-1;index>=0;index-=1){
      const entry=entries[index];
      if(!window.CMD_BRIEFING.entries.some(existing=>existing.id===entry.id))window.CMD_BRIEFING.entries.unshift(entry);
    }
    window.CMD_BRIEFING.updated='2026-08-29T03:37:15-06:00';
  }
})();
