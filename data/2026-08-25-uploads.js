(()=>{
  const songAdditions=[
    {
      id:'where-the-teeth-are-kept',title:'Where the Teeth Are Kept',artist:'Call Me Daddy',year:2026,month:8,date:'2026-08-25',project:'Where the Teeth Are Kept',
      description:'Made with Google Gemini: a seductive adult fairytale reimagining built around Little Red Riding Hood and the danger hiding behind the story.',
      audio:'/media/songs/2026/08/where-the-teeth-are-kept/google-gemini.mp3',cover:'',kind:'Google Gemini · seductive fairytale',
      variants:[{id:'google-gemini',label:'Google Gemini version',audio:'/media/songs/2026/08/where-the-teeth-are-kept/google-gemini.mp3'}]
    },
    {
      id:'one-million-dollars',title:'One Million Dollars',artist:'Call Me Daddy',year:2026,month:8,date:'2026-08-25',project:'One Million Dollars',
      description:'Satirical dubstep playing with the absurd one-million-dollars villain energy associated with Dr. Evil in Austin Powers.',
      audio:'/media/songs/2026/08/one-million-dollars/dr-evil-satire.mp3',cover:'',kind:'Satirical Dubstep',
      variants:[{id:'dr-evil-satire',label:'Dr. Evil satire mix',audio:'/media/songs/2026/08/one-million-dollars/dr-evil-satire.mp3'}]
    },
    {
      id:'where-the-bad-girls-at',title:'Where the Bad Girls At?',artist:'Call Me Daddy',year:2026,month:8,date:'2026-08-25',project:'Where the Bad Girls At?',
      description:'One song with two vocal perspectives. Concrete Heels uses a female chant aimed at a younger club audience; the male-sung Bad Girls at War version makes the same writing land with a different meaning.',
      audio:'/media/songs/2026/08/where-the-bad-girls-at/concrete-heels-female.mp3',cover:'',kind:'2 versions',
      variants:[
        {id:'concrete-heels-female',label:'Concrete Heels · female chant',audio:'/media/songs/2026/08/where-the-bad-girls-at/concrete-heels-female.mp3'},
        {id:'bad-girls-at-war-male',label:'Bad Girls at War · male vocal · short EDM stutter',audio:'/media/songs/2026/08/where-the-bad-girls-at/bad-girls-at-war-male.mp3'}
      ]
    },
    {
      id:'the-loudest-one-in-my-head',title:'The Loudest One in My Head',artist:'MusicSubject',year:2026,month:8,date:'2026-08-25',project:'The Loudest One in My Head',description:'A self-questioning song about wondering whether you are difficult, whether you rub people the wrong way, and whether loneliness is evidence that the people you annoy simply do not care.',audio:'/media/songs/2026/08/the-loudest-one-in-my-head/remix.mp3',cover:'',kind:'Remix',variants:[{id:'remix',label:'Remix',audio:'/media/songs/2026/08/the-loudest-one-in-my-head/remix.mp3'}]
    },
    {
      id:'mind-at-war',title:'Mind at War',artist:'Call Me Daddy',year:2026,month:8,date:'2026-08-25',project:'Mind at War',description:'Melodic dubstep about overcoming madness, winning against the demons in your own head, and coming out of the fight still standing.',audio:'/media/songs/2026/08/mind-at-war/remix.mp3',cover:'',kind:'Melodic Dubstep Remix',variants:[{id:'melodic-dubstep-remix',label:'Melodic Dubstep Remix',audio:'/media/songs/2026/08/mind-at-war/remix.mp3'}]
    },
    {
      id:'ashes-in-eastwood',title:'Ashes in Eastwood',artist:'Call Me Daddy',year:2026,month:8,date:'2026-08-25',project:'Ashes in Eastwood',description:'A deliberately trashy fictional satire: sleeping with your meth-fuelled wife’s sister, getting caught, and having the car burned. The joke was sparked by seeing a burned car in Eastview, Red Deer; it is not presented as the real story of that car.',audio:'/media/songs/2026/08/ashes-in-eastwood/marshmallows-over-the-wreckage.mp3',cover:'',kind:'Satire · Marshmallows Over the Wreckage',variants:[{id:'marshmallows-over-the-wreckage',label:'Marshmallows Over the Wreckage',audio:'/media/songs/2026/08/ashes-in-eastwood/marshmallows-over-the-wreckage.mp3'}]
    },
    {
      id:'shooting-star',title:'Shooting Star',artist:'MusicSubject',year:2019,project:'Old Files / New Tools',description:'A heartbreak song written in Nova Scotia in 2019, shortly before leaving and moving roughly 4,000 km to Edmonton, Alberta.',lineage:'Written in 2019 before the Nova Scotia-to-Edmonton move. Exact day not recorded.',audio:'/media/songs/2019/shooting-star/shooting-star.mp3',cover:'',kind:'2019 heartbreak archive',variants:[{id:'2019-cut',label:'2019 cut',audio:'/media/songs/2019/shooting-star/shooting-star.mp3'}]
    },
    {id:'where-monsters-are',title:'Where Monsters Are',artist:'Call Me Daddy',year:2026,month:8,date:'2026-08-25',project:'Where Monsters Are',description:'The DNB Folk Tale is the newest version of this song family. Earlier versions exist and will stay under the same identity when they are added.',audio:'/media/songs/2026/08/where-monsters-are/dnb-folk-tale.mp3',cover:'',kind:'DNB Folk Tale · latest version',lineage:'Earlier versions exist; this is the newest uploaded version.',variants:[{id:'dnb-folk-tale',label:'DNB Folk Tale · latest version',audio:'/media/songs/2026/08/where-monsters-are/dnb-folk-tale.mp3'}]},
    {id:'hard-earned-light',title:'Hard-Earned Light',artist:'Call Me Daddy',year:2026,month:8,date:'2026-08-25',project:'Hard-Earned Light',description:'A hardcore epic-dubstep keep-going song about fighting through darkness and surviving every night that tried to convince you that you were worthless. The light matters because you had to earn it.',audio:'/media/songs/2026/08/hard-earned-light/epic-dubstep-mix.mp3',cover:'',kind:'Hardcore Epic Dubstep Mix',variants:[{id:'epic-dubstep-mix',label:'Hardcore Epic Dubstep Mix',audio:'/media/songs/2026/08/hard-earned-light/epic-dubstep-mix.mp3'}]},
    {id:'survival-mode',title:'Survival Mode',artist:'Call Me Daddy',year:2026,month:8,date:'2026-08-25',project:'Survival Mode',description:'A Celtic North remix that can read as a poker survival song or a love song. The double meaning is part of the idea.',audio:'/media/songs/2026/08/survival-mode/celtic-north-remix.mp3',cover:'',kind:'Celtic North Remix',variants:[{id:'celtic-north-remix',label:'Celtic North Remix',audio:'/media/songs/2026/08/survival-mode/celtic-north-remix.mp3'}]},
    {id:'the-tune-of-magical-song',title:'The Tune of Magical Song',artist:'MusicSubject × Call Me Daddy',year:2026,month:8,date:'2026-08-25',project:'Old Files / New Tools',description:'This song goes back to a recording made more than a decade ago. This upload is a remastered Deep Dark Dubstep Drop Mix, and other versions exist.',audio:'/media/songs/2026/08/the-tune-of-magical-song/deep-dark-dubstep-drop-remastered.mp3',cover:'',kind:'Deep Dark Dubstep Drop Mix · Remastered',lineage:'Recorded more than a decade before this 2026 remaster; other versions exist.',variants:[{id:'deep-dark-dubstep-drop-remastered',label:'Deep Dark Dubstep Drop Mix · Remastered',audio:'/media/songs/2026/08/the-tune-of-magical-song/deep-dark-dubstep-drop-remastered.mp3'}]},
    {id:'side-chick-finder',title:'Side Chick Finder (Community Boyfriend 😂)',artist:'Call Me Daddy',year:2026,month:8,date:'2026-08-25',project:'Side Chick Finder',description:'The community-boyfriend joke gets its own track.',audio:'/media/songs/2026/08/side-chick-finder/community-boyfriend.mp3',cover:'',kind:'song'},
    {id:'one-brick',title:'One Brick',artist:'Call Me Daddy',year:2026,month:8,date:'2026-08-25',project:'One Brick',description:'One Brick rebuilt as a Barbershop Dubstep A Cappella mix.',audio:'/media/songs/2026/08/one-brick/barbershop-dubstep-acappella.mp3',cover:'',kind:'Barbershop Dubstep A Cappella Mix',variants:[{id:'barbershop-dubstep-acappella',label:'Barbershop Dubstep A Cappella Mix',audio:'/media/songs/2026/08/one-brick/barbershop-dubstep-acappella.mp3'}]}
  ];

  const addVersion=(song,id,label,audio)=>{
    if(!song)return;
    if(!Array.isArray(song.variants))song.variants=[];
    if(!song.variants.some(version=>version.id===id))song.variants.push({id,label,audio});
    song.kind=`${song.variants.length} versions`;
  };

  if(Array.isArray(window.CMD_SONGS)){
    for(let i=songAdditions.length-1;i>=0;i-=1){const song=songAdditions[i];if(!window.CMD_SONGS.some(existing=>existing.id===song.id))window.CMD_SONGS.unshift(song);}
    addVersion(window.CMD_SONGS.find(song=>song.id==='numbness-as-a-trap'),'barbershop-wobble-edit','Barbershop Wobble Edit','/media/collections/sad-music/2026/numbness-as-a-trap/barbershop-wobble.mp3');
    addVersion(window.CMD_SONGS.find(song=>song.id==='will-to-live'),'more-original-2026','More Original 2026 Version · base status unknown','/media/collections/sad-music/2026/will-to-live/more-original-2026.mp3');
  }

  if(window.CMD_RADIO_CONFIG?.profiles){
    window.CMD_RADIO_CONFIG.profiles['where-the-teeth-are-kept']={surprise:90,laugh:34,think:58,'level-up':24,heavy:34,'old-files':18};
    window.CMD_RADIO_CONFIG.profiles['one-million-dollars']={surprise:96,laugh:100,think:30,'level-up':22,heavy:38,'old-files':12};
    window.CMD_RADIO_CONFIG.profiles['where-the-bad-girls-at']={surprise:96,laugh:78,think:42,'level-up':34,heavy:52,'old-files':16};
    window.CMD_RADIO_CONFIG.profiles['the-loudest-one-in-my-head']={surprise:90,laugh:8,think:98,'level-up':48,heavy:100,'old-files':24};
    window.CMD_RADIO_CONFIG.profiles['mind-at-war']={surprise:90,laugh:8,think:96,'level-up':100,heavy:96,'old-files':20};
    window.CMD_RADIO_CONFIG.profiles['ashes-in-eastwood']={surprise:94,laugh:100,think:42,'level-up':24,heavy:36,'old-files':12};
    window.CMD_RADIO_CONFIG.profiles['shooting-star']={surprise:82,laugh:8,think:94,'level-up':56,heavy:90,'old-files':100};
    window.CMD_RADIO_CONFIG.profiles['where-monsters-are']={surprise:90,laugh:20,think:90,'level-up':72,heavy:78,'old-files':68};
    window.CMD_RADIO_CONFIG.profiles['hard-earned-light']={surprise:92,laugh:10,think:92,'level-up':100,heavy:100,'old-files':20};
    window.CMD_RADIO_CONFIG.profiles['survival-mode']={surprise:90,laugh:34,think:86,'level-up':82,heavy:70,'old-files':30};
    window.CMD_RADIO_CONFIG.profiles['the-tune-of-magical-song']={surprise:82,laugh:24,think:88,'level-up':70,heavy:74,'old-files':100};
    window.CMD_RADIO_CONFIG.profiles['side-chick-finder']={surprise:92,laugh:100,think:48,'level-up':36,heavy:20,'old-files':14};
    window.CMD_RADIO_CONFIG.profiles['one-brick']={surprise:84,laugh:34,think:76,'level-up':94,heavy:48,'old-files':18};
  }

  if(Array.isArray(window.CMD_SAD_MUSIC)){
    const addSadVersion=(song,id,label,audio)=>{if(!song)return;if(!Array.isArray(song.versions))song.versions=[];if(!song.versions.some(version=>version.id===id))song.versions.push({id,label,audio,expectedPath:audio});};
    const numbness=window.CMD_SAD_MUSIC.find(song=>song.id==='numbness-as-a-trap');
    addSadVersion(numbness,'barbershop-wobble-edit','Barbershop Wobble Edit','/media/collections/sad-music/2026/numbness-as-a-trap/barbershop-wobble.mp3');
    if(numbness)numbness.story='Three mixes survived, so all three stay with the same song.';
    const will=window.CMD_SAD_MUSIC.find(song=>song.id==='will-to-live');
    addSadVersion(will,'more-original-2026','More Original 2026 Version · base status unknown','/media/collections/sad-music/2026/will-to-live/more-original-2026.mp3');
    if(will)will.story='Four versions are preserved together. This newly uploaded one sounds more original, but its status as the base master is still unconfirmed.';
  }
})();
