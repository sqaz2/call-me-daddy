(()=>{
  const additions=[
    {
      id:'cloudlife',
      title:'Cloudlife',
      artist:'Call Me Daddy',
      year:2026,
      month:8,
      date:'2026-08-29',
      project:'Cloudlife',
      description:'A rain-soaked Red Deer song idea from a stretch when the city was getting a lot of rain. Two versions are preserved together: the R&B Mix and The Life of a Cloud.',
      lineage:'Created around a particularly rainy stretch in Red Deer, Alberta. Exact original day not recorded.',
      audio:'/media/songs/2026/08/cloudlife/life-of-a-cloud.mp3',
      cover:'',
      experience:'/updates/release-cloudlife/',
      shareUrl:'/updates/release-cloudlife/',
      kind:'2 versions',
      variants:[
        {id:'life-of-a-cloud',label:'The Life of a Cloud',audio:'/media/songs/2026/08/cloudlife/life-of-a-cloud.mp3'},
        {id:'r-and-b-mix',label:'R&B Mix',audio:'/media/songs/2026/08/cloudlife/r-and-b-mix.mp3'}
      ]
    },
    {
      id:'her-perfume-rides-shotgun',
      title:'Her Perfume Rides Shotgun',
      artist:'Call Me Daddy',
      year:2026,
      month:8,
      date:'2026-08-29',
      project:'Her Perfume Rides Shotgun',
      description:'Her Perfume Rides Shotgun arrives here as a Power Ballad Dubstep Drop Mix. Any additional versions that surface stay under this same song identity.',
      audio:'/media/songs/2026/08/her-perfume-rides-shotgun/power-ballad-dubstep-drop.mp3',
      cover:'',
      experience:'/updates/release-her-perfume-rides-shotgun/',
      shareUrl:'/updates/release-her-perfume-rides-shotgun/',
      kind:'Power Ballad Dubstep Drop Mix',
      variants:[{id:'power-ballad-dubstep-drop',label:'Power Ballad Dubstep Drop Mix',audio:'/media/songs/2026/08/her-perfume-rides-shotgun/power-ballad-dubstep-drop.mp3'}]
    },
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

    const monsters=window.CMD_SONGS.find(song=>song.id==='where-monsters-are');
    if(monsters){
      monsters.description='Where Monsters Are now has the latest DNB Folk Tale beside Monster and Maiden, which appears to be from the earlier/original side of the song family. Its exact base-master status is not confirmed.';
      monsters.lineage='Monster and Maiden appears to be an earlier/original-family version; DNB Folk Tale remains the newest uploaded version. Exact base-master status is unconfirmed.';
      addVersion(monsters,'monster-and-maiden','Monster and Maiden · likely earlier/original-family version','/media/songs/2026/08/where-monsters-are/monster-and-maiden.mp3');
    }
  }

  if(window.CMD_RADIO_CONFIG?.profiles){
    window.CMD_RADIO_CONFIG.profiles['cloudlife']={surprise:92,laugh:12,think:90,'level-up':72,heavy:68,'old-files':22};
    window.CMD_RADIO_CONFIG.profiles['her-perfume-rides-shotgun']={surprise:94,laugh:14,think:84,'level-up':64,heavy:88,'old-files':12};
    window.CMD_RADIO_CONFIG.profiles['keep-moving']={surprise:90,laugh:18,think:82,'level-up':100,heavy:72,'old-files':16};
    window.CMD_RADIO_CONFIG.profiles['thirty-six']={surprise:88,laugh:8,think:100,'level-up':90,heavy:82,'old-files':28};
  }

  if(window.CMD_BRIEFING?.entries){
    const entries=[
      {
        id:'release-cloudlife',
        published:'2026-08-29T03:56:58-06:00',
        type:'New release · two versions',
        songId:'cloudlife',
        href:'/music/?song=cloudlife&version=life-of-a-cloud&intent=think&share=1',
        cta:'Play Cloudlife',
        featured:true,
        featuredOrder:1,
        cardLines:['CLOUD','LIFE'],
        cardTag:'Red Deer rain · 2 versions',
        cardSummary:'A rain-soaked Red Deer idea preserved as The Life of a Cloud and an R&B Mix.',
        badge:'2 versions'
      },
      {
        id:'release-her-perfume-rides-shotgun',
        published:'2026-08-29T03:56:28-06:00',
        type:'New release · dubstep ballad',
        songId:'her-perfume-rides-shotgun',
        href:'/music/?song=her-perfume-rides-shotgun&version=power-ballad-dubstep-drop&intent=heavy&share=1',
        cta:'Play Her Perfume Rides Shotgun',
        featured:true,
        featuredOrder:2,
        cardLines:['HER PERFUME','RIDES SHOTGUN'],
        cardTag:'Power ballad · dubstep drop',
        cardSummary:'The first uploaded version is a Power Ballad Dubstep Drop Mix.',
        badge:'New song family'
      },
      {
        id:'release-keep-moving',
        published:'2026-08-29T03:37:15-06:00',
        type:'New release · two versions',
        songId:'keep-moving',
        href:'/music/?song=keep-moving&version=v2&intent=level-up&share=1',
        cta:'Play Keep Moving',
        featured:true,
        featuredOrder:3,
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
        featuredOrder:4,
        cardLines:['THIRTY','SIX'],
        cardTag:'Age 36 · versions of yourself',
        cardSummary:'Not just running out of time—realizing you cannot live every possible version of yourself at once.',
        badge:'Age-36 reflection'
      },
      {
        id:'where-monsters-are-monster-and-maiden',
        published:'2026-08-29T03:55:58-06:00',
        type:'Earlier version found',
        songId:'where-monsters-are',
        href:'/music/?song=where-monsters-are&version=monster-and-maiden&intent=think&share=1',
        cta:'Play Monster and Maiden',
        cardTag:'Where Monsters Are · earlier lineage',
        cardSummary:'Monster and Maiden appears to belong to the earlier/original side of the Where Monsters Are family; exact base-master status is still unconfirmed.',
        badge:'Version added'
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
    window.CMD_BRIEFING.updated='2026-08-29T03:56:58-06:00';
  }
})();
