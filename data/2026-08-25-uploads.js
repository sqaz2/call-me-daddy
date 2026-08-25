(()=>{
  const songAdditions=[
    {
      id:'where-monsters-are',
      title:'Where Monsters Are',
      artist:'Call Me Daddy',
      year:2026,
      month:8,
      date:'2026-08-25',
      project:'Where Monsters Are',
      description:'The DNB Folk Tale is the newest version of this song family. Earlier versions exist and will stay under the same identity when they are added.',
      audio:'/media/songs/2026/08/where-monsters-are/dnb-folk-tale.mp3',
      cover:'',
      kind:'DNB Folk Tale · latest version',
      lineage:'Earlier versions exist; this is the newest uploaded version.',
      variants:[
        {id:'dnb-folk-tale',label:'DNB Folk Tale · latest version',audio:'/media/songs/2026/08/where-monsters-are/dnb-folk-tale.mp3'}
      ]
    },
    {
      id:'hard-earned-light',
      title:'Hard-Earned Light',
      artist:'Call Me Daddy',
      year:2026,
      month:8,
      date:'2026-08-25',
      project:'Hard-Earned Light',
      description:'Epic dubstep built around keeping going until the light feels earned instead of handed to you.',
      audio:'/media/songs/2026/08/hard-earned-light/epic-dubstep-mix.mp3',
      cover:'',
      kind:'Epic Dubstep Mix',
      variants:[
        {id:'epic-dubstep-mix',label:'Epic Dubstep Mix',audio:'/media/songs/2026/08/hard-earned-light/epic-dubstep-mix.mp3'}
      ]
    },
    {
      id:'survival-mode',
      title:'Survival Mode',
      artist:'Call Me Daddy',
      year:2026,
      month:8,
      date:'2026-08-25',
      project:'Survival Mode',
      description:'A Celtic North remix that can read as a poker survival song or a love song. The double meaning is part of the idea.',
      audio:'/media/songs/2026/08/survival-mode/celtic-north-remix.mp3',
      cover:'',
      kind:'Celtic North Remix',
      variants:[
        {id:'celtic-north-remix',label:'Celtic North Remix',audio:'/media/songs/2026/08/survival-mode/celtic-north-remix.mp3'}
      ]
    },
    {
      id:'the-tune-of-magical-song',
      title:'The Tune of Magical Song',
      artist:'MusicSubject × Call Me Daddy',
      year:2026,
      month:8,
      date:'2026-08-25',
      project:'Old Files / New Tools',
      description:'This song goes back to a recording made more than a decade ago. This upload is a remastered Deep Dark Dubstep Drop Mix, and other versions exist.',
      audio:'/media/songs/2026/08/the-tune-of-magical-song/deep-dark-dubstep-drop-remastered.mp3',
      cover:'',
      kind:'Deep Dark Dubstep Drop Mix · Remastered',
      lineage:'Recorded more than a decade before this 2026 remaster; other versions exist.',
      variants:[
        {id:'deep-dark-dubstep-drop-remastered',label:'Deep Dark Dubstep Drop Mix · Remastered',audio:'/media/songs/2026/08/the-tune-of-magical-song/deep-dark-dubstep-drop-remastered.mp3'}
      ]
    },
    {
      id:'side-chick-finder',
      title:'Side Chick Finder (Community Boyfriend 😂)',
      artist:'Call Me Daddy',
      year:2026,
      month:8,
      date:'2026-08-25',
      project:'Side Chick Finder',
      description:'The community-boyfriend joke gets its own track.',
      audio:'/media/songs/2026/08/side-chick-finder/community-boyfriend.mp3',
      cover:'',
      kind:'song'
    },
    {
      id:'one-brick',
      title:'One Brick',
      artist:'Call Me Daddy',
      year:2026,
      month:8,
      date:'2026-08-25',
      project:'One Brick',
      description:'One Brick rebuilt as a Barbershop Dubstep A Cappella mix.',
      audio:'/media/songs/2026/08/one-brick/barbershop-dubstep-acappella.mp3',
      cover:'',
      kind:'Barbershop Dubstep A Cappella Mix',
      variants:[
        {id:'barbershop-dubstep-acappella',label:'Barbershop Dubstep A Cappella Mix',audio:'/media/songs/2026/08/one-brick/barbershop-dubstep-acappella.mp3'}
      ]
    }
  ];

  if(Array.isArray(window.CMD_SONGS)){
    for(let i=songAdditions.length-1;i>=0;i-=1){
      const song=songAdditions[i];
      if(!window.CMD_SONGS.some(existing=>existing.id===song.id))window.CMD_SONGS.unshift(song);
    }
    const numbness=window.CMD_SONGS.find(song=>song.id==='numbness-as-a-trap');
    if(numbness){
      if(!Array.isArray(numbness.variants))numbness.variants=[];
      if(!numbness.variants.some(version=>version.id==='barbershop-wobble-edit')){
        numbness.variants.push({id:'barbershop-wobble-edit',label:'Barbershop Wobble Edit',audio:'/media/collections/sad-music/2026/numbness-as-a-trap/barbershop-wobble.mp3'});
      }
      numbness.kind=`${numbness.variants.length} versions`;
    }
  }

  if(window.CMD_RADIO_CONFIG?.profiles){
    window.CMD_RADIO_CONFIG.profiles['where-monsters-are']={surprise:90,laugh:20,think:90,'level-up':72,heavy:78,'old-files':68};
    window.CMD_RADIO_CONFIG.profiles['hard-earned-light']={surprise:88,laugh:20,think:82,'level-up':100,heavy:72,'old-files':20};
    window.CMD_RADIO_CONFIG.profiles['survival-mode']={surprise:90,laugh:34,think:86,'level-up':82,heavy:70,'old-files':30};
    window.CMD_RADIO_CONFIG.profiles['the-tune-of-magical-song']={surprise:82,laugh:24,think:88,'level-up':70,heavy:74,'old-files':100};
    window.CMD_RADIO_CONFIG.profiles['side-chick-finder']={surprise:92,laugh:100,think:48,'level-up':36,heavy:20,'old-files':14};
    window.CMD_RADIO_CONFIG.profiles['one-brick']={surprise:84,laugh:34,think:76,'level-up':94,heavy:48,'old-files':18};
  }

  if(Array.isArray(window.CMD_SAD_MUSIC)){
    const numbness=window.CMD_SAD_MUSIC.find(song=>song.id==='numbness-as-a-trap');
    if(numbness){
      if(!Array.isArray(numbness.versions))numbness.versions=[];
      if(!numbness.versions.some(version=>version.id==='barbershop-wobble-edit')){
        numbness.versions.push({
          id:'barbershop-wobble-edit',
          label:'Barbershop Wobble Edit',
          audio:'/media/collections/sad-music/2026/numbness-as-a-trap/barbershop-wobble.mp3',
          expectedPath:'/media/collections/sad-music/2026/numbness-as-a-trap/barbershop-wobble.mp3'
        });
      }
      numbness.story='Three mixes survived, so all three stay with the same song.';
    }
  }
})();
