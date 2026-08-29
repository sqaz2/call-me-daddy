(()=>{
  const additions=[
    {
      id:'fractured-face',title:'Fractured Face',artist:'Call Me Daddy',year:2026,month:5,date:'2026-05',project:'Fractured Face',
      description:'A May 2026 remaster preserved in the catalog. The song story/context has not been recorded yet, so the site does not invent one.',
      audio:'/media/songs/2026/08/fractured-face/may-2026-remastered.mp3',cover:'',experience:'/updates/release-fractured-face/',shareUrl:'/updates/release-fractured-face/',kind:'May 2026 Remastered',
      variants:[{id:'may-2026-remastered',label:'May 2026 Remastered',audio:'/media/songs/2026/08/fractured-face/may-2026-remastered.mp3'}]
    },
    {
      id:'cloudlife',title:'Cloudlife',artist:'Call Me Daddy',year:2026,month:8,date:'2026-08-29',project:'Cloudlife',
      description:'A rain-soaked Red Deer song idea from a stretch when the city was getting a lot of rain. Two versions are preserved together: the R&B Mix and The Life of a Cloud.',
      lineage:'Created around a particularly rainy stretch in Red Deer, Alberta. Exact original day not recorded.',
      audio:'/media/songs/2026/08/cloudlife/life-of-a-cloud.mp3',cover:'',experience:'/updates/release-cloudlife/',shareUrl:'/updates/release-cloudlife/',kind:'2 versions',
      variants:[{id:'life-of-a-cloud',label:'The Life of a Cloud',audio:'/media/songs/2026/08/cloudlife/life-of-a-cloud.mp3'},{id:'r-and-b-mix',label:'R&B Mix',audio:'/media/songs/2026/08/cloudlife/r-and-b-mix.mp3'}]
    },
    {
      id:'her-perfume-rides-shotgun',title:'Her Perfume Rides Shotgun',artist:'Call Me Daddy',year:2026,month:8,date:'2026-08-29',project:'Her Perfume Rides Shotgun',
      description:'Her Perfume Rides Shotgun now has two uploaded versions: the Power Ballad Dubstep Drop Mix and v2 Remastered.',
      audio:'/media/songs/2026/08/her-perfume-rides-shotgun/power-ballad-dubstep-drop.mp3',cover:'',experience:'/updates/release-her-perfume-rides-shotgun/',shareUrl:'/updates/release-her-perfume-rides-shotgun/',kind:'2 versions',
      variants:[{id:'power-ballad-dubstep-drop',label:'Power Ballad Dubstep Drop Mix',audio:'/media/songs/2026/08/her-perfume-rides-shotgun/power-ballad-dubstep-drop.mp3'},{id:'v2-remastered',label:'v2 Remastered',audio:'/media/songs/2026/08/her-perfume-rides-shotgun/v2-remastered.mp3'}]
    },
    {
      id:'keep-moving',title:'Keep Moving',artist:'Call Me Daddy',year:2026,month:8,date:'2026-08-29',project:'Keep Moving',
      description:'A forward-motion song about continuing through setbacks and changing routes. Two uploaded versions stay together here: v2 and the Trap Mix.',
      audio:'/media/songs/2026/08/keep-moving/v2.mp3',cover:'',experience:'/updates/release-keep-moving/',shareUrl:'/updates/release-keep-moving/',kind:'2 versions',
      variants:[{id:'v2',label:'v2',audio:'/media/songs/2026/08/keep-moving/v2.mp3'},{id:'trap-mix',label:'Trap Mix',audio:'/media/songs/2026/08/keep-moving/trap-mix.mp3'}]
    },
    {
      id:'thirty-six',title:'Thirty Six',artist:'Call Me Daddy',year:2026,month:8,date:'2026-08-29',project:'Thirty Six',
      description:'An age-36 reflection about realizing the pressure is not only time passing—it is that you cannot live every possible version of yourself at once.',aliases:['Running Out of Versions'],
      audio:'/media/songs/2026/08/thirty-six/main.mp3',cover:'',experience:'/updates/release-thirty-six/',shareUrl:'/updates/release-thirty-six/',kind:'Age-36 reflection',
      variants:[{id:'main',label:'Current upload',audio:'/media/songs/2026/08/thirty-six/main.mp3'}]
    }
  ];

  const addVersion=(song,id,label,audio)=>{if(!song)return;if(!Array.isArray(song.variants))song.variants=[];if(!song.variants.some(v=>v.id===id))song.variants.push({id,label,audio});song.kind=`${song.variants.length} versions`;};

  if(Array.isArray(window.CMD_SONGS)){
    for(let i=additions.length-1;i>=0;i-=1){const song=additions[i];if(!window.CMD_SONGS.some(existing=>existing.id===song.id))window.CMD_SONGS.unshift(song);}
    const oneBrick=window.CMD_SONGS.find(song=>song.id==='one-brick');
    if(oneBrick){if(!Array.isArray(oneBrick.aliases))oneBrick.aliases=[];if(!oneBrick.aliases.includes('One Brick at a Time'))oneBrick.aliases.push('One Brick at a Time');oneBrick.description='A rebuilding song about putting life back together one brick at a time. The Barbershop Dubstep A Cappella mix now sits beside an Extended v1.';addVersion(oneBrick,'extended-v1','One Brick at a Time · Extended v1','/media/songs/2026/08/one-brick/extended-v1.mp3');}
    const monsters=window.CMD_SONGS.find(song=>song.id==='where-monsters-are');
    if(monsters){monsters.description='Where Monsters Are now has the DNB Folk Tale plus two distinct Monster and Maiden-family uploads. Both earlier files are preserved because their exact base-master relationship is still unconfirmed.';monsters.lineage='DNB Folk Tale is the newest uploaded version. Two distinct Monster and Maiden-family files appear to come from the earlier/original side of the song family; exact base-master status remains unconfirmed.';addVersion(monsters,'monster-and-maiden','Monster and Maiden · earlier/original-family candidate','/media/songs/2026/08/where-monsters-are/monster-and-maiden.mp3');addVersion(monsters,'monster-and-maiden-alt','Monster & Maiden · alternate earlier-family file','/media/songs/2026/08/where-monsters-are/monster-and-maiden-alt.mp3');}
    const animal=window.CMD_SONGS.find(song=>song.id==='make-me-an-animal');
    if(animal){animal.description='Make Me an Animal—also known as Animal Day—now has the EDM Switch-Up Mix plus a remastered Late Night Warehouse Mix.';addVersion(animal,'late-night-warehouse-remastered','Animal Day · Late Night Warehouse Mix · Remastered','/media/songs/2026/08/make-me-an-animal/late-night-warehouse-remastered.mp3');}
  }

  if(window.CMD_RADIO_CONFIG?.profiles){
    window.CMD_RADIO_CONFIG.profiles['fractured-face']={surprise:90,laugh:18,think:80,'level-up':70,heavy:80,'old-files':18};
    window.CMD_RADIO_CONFIG.profiles['cloudlife']={surprise:92,laugh:12,think:90,'level-up':72,heavy:68,'old-files':22};
    window.CMD_RADIO_CONFIG.profiles['her-perfume-rides-shotgun']={surprise:94,laugh:14,think:84,'level-up':64,heavy:88,'old-files':12};
    window.CMD_RADIO_CONFIG.profiles['keep-moving']={surprise:90,laugh:18,think:82,'level-up':100,heavy:72,'old-files':16};
    window.CMD_RADIO_CONFIG.profiles['thirty-six']={surprise:88,laugh:8,think:100,'level-up':90,heavy:82,'old-files':28};
  }

  if(window.CMD_BRIEFING?.entries){
    const entries=[
      {id:'release-fractured-face',published:'2026-08-29T05:44:48-06:00',type:'New catalog entry · remaster',songId:'fractured-face',href:'/music/?song=fractured-face&version=may-2026-remastered&intent=surprise&share=1',cta:'Play Fractured Face',featured:true,featuredOrder:1,cardLines:['FRACTURED','FACE'],cardTag:'May 2026 · remastered',cardSummary:'A May 2026 remaster surfaced. The story context is still intentionally left unfilled rather than guessed.',badge:'Remaster added'},
      {id:'make-me-an-animal-late-night-warehouse',published:'2026-08-29T05:44:47-06:00',type:'New version',songId:'make-me-an-animal',href:'/music/?song=make-me-an-animal&version=late-night-warehouse-remastered&intent=surprise&share=1',cta:'Play the Warehouse Mix',cardTag:'Animal Day · late-night warehouse',cardSummary:'A remastered Late Night Warehouse Mix joins the EDM Switch-Up Mix under Make Me an Animal.',badge:'Version added'},
      {id:'her-perfume-v2-remastered',published:'2026-08-29T05:44:46-06:00',type:'New version',songId:'her-perfume-rides-shotgun',href:'/music/?song=her-perfume-rides-shotgun&version=v2-remastered&intent=heavy&share=1',cta:'Play v2 Remastered',cardTag:'Her Perfume Rides Shotgun · v2',cardSummary:'v2 Remastered joins the Power Ballad Dubstep Drop Mix.',badge:'2 versions'},
      {id:'where-monsters-are-monster-and-maiden-alt',published:'2026-08-29T05:44:45-06:00',type:'Earlier version found',songId:'where-monsters-are',href:'/music/?song=where-monsters-are&version=monster-and-maiden-alt&intent=think&share=1',cta:'Play this Monster & Maiden',cardTag:'Where Monsters Are · alternate earlier file',cardSummary:'A second distinct Monster & Maiden-family file surfaced. Its exact base-master relationship remains unconfirmed.',badge:'Third version'},
      {id:'release-cloudlife',published:'2026-08-29T03:56:58-06:00',type:'New release · two versions',songId:'cloudlife',href:'/music/?song=cloudlife&version=life-of-a-cloud&intent=think&share=1',cta:'Play Cloudlife',featured:true,featuredOrder:2,cardLines:['CLOUD','LIFE'],cardTag:'Red Deer rain · 2 versions',cardSummary:'A rain-soaked Red Deer idea preserved as The Life of a Cloud and an R&B Mix.',badge:'2 versions'},
      {id:'release-her-perfume-rides-shotgun',published:'2026-08-29T03:56:28-06:00',type:'New release · dubstep ballad',songId:'her-perfume-rides-shotgun',href:'/music/?song=her-perfume-rides-shotgun&version=power-ballad-dubstep-drop&intent=heavy&share=1',cta:'Play Her Perfume Rides Shotgun',featured:true,featuredOrder:3,cardLines:['HER PERFUME','RIDES SHOTGUN'],cardTag:'Power ballad · dubstep drop',cardSummary:'The Power Ballad Dubstep Drop Mix opened the song family; v2 Remastered is now preserved beside it.',badge:'2 versions'},
      {id:'where-monsters-are-monster-and-maiden',published:'2026-08-29T03:55:58-06:00',type:'Earlier version found',songId:'where-monsters-are',href:'/music/?song=where-monsters-are&version=monster-and-maiden&intent=think&share=1',cta:'Play Monster and Maiden',cardTag:'Where Monsters Are · earlier lineage',cardSummary:'Monster and Maiden appears to belong to the earlier/original side of the Where Monsters Are family; exact base-master status is still unconfirmed.',badge:'Version added'},
      {id:'release-keep-moving',published:'2026-08-29T03:37:15-06:00',type:'New release · two versions',songId:'keep-moving',href:'/music/?song=keep-moving&version=v2&intent=level-up&share=1',cta:'Play Keep Moving',featured:true,featuredOrder:4,cardLines:['KEEP','MOVING'],cardTag:'Forward motion · v2 + Trap Mix',cardSummary:'Two uploaded takes, one song identity: v2 and the Trap Mix.',badge:'2 versions'},
      {id:'release-thirty-six',published:'2026-08-29T03:36:45-06:00',type:'New release · reflection',songId:'thirty-six',href:'/music/?song=thirty-six&version=main&intent=think&share=1',cta:'Play Thirty Six',featured:true,featuredOrder:5,cardLines:['THIRTY','SIX'],cardTag:'Age 36 · versions of yourself',cardSummary:'Not just running out of time—realizing you cannot live every possible version of yourself at once.',badge:'Age-36 reflection'},
      {id:'one-brick-extended-v1',published:'2026-08-29T03:36:15-06:00',type:'New version',songId:'one-brick',href:'/music/?song=one-brick&version=extended-v1&intent=level-up&share=1',cta:'Play the Extended v1',cardTag:'One Brick at a Time · Extended v1',cardSummary:'One Brick now has a second preserved version beside the Barbershop Dubstep A Cappella mix.',badge:'Version added'}
    ];
    const missingFeatured=entries.filter(entry=>entry.featured&&!window.CMD_BRIEFING.entries.some(existing=>existing.id===entry.id));
    if(missingFeatured.length)window.CMD_BRIEFING.entries.forEach(entry=>{if(entry.featured&&Number.isInteger(entry.featuredOrder))entry.featuredOrder+=missingFeatured.length;});
    for(let i=entries.length-1;i>=0;i-=1){const entry=entries[i];if(!window.CMD_BRIEFING.entries.some(existing=>existing.id===entry.id))window.CMD_BRIEFING.entries.unshift(entry);}
    window.CMD_BRIEFING.updated='2026-08-29T05:44:48-06:00';
  }
})();
