(()=>{
  const songAdditions=[
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
      description:'Two uploads from the One Brick idea stay together as one song identity while the exact label for the thirty-six_bricks version is still being identified.',
      audio:'/media/songs/2026/08/one-brick/barbershop-dubstep-acappella.mp3',
      cover:'',
      kind:'2 versions',
      variants:[
        {id:'barbershop-dubstep-acappella',label:'Barbershop Dubstep A Cappella Mix',audio:'/media/songs/2026/08/one-brick/barbershop-dubstep-acappella.mp3'},
        {id:'thirty-six-bricks',label:'Thirty-Six Bricks · exact mix label pending',audio:'/media/songs/2026/08/one-brick/thirty-six-bricks.mp3'}
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
