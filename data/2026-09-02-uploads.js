(()=>{
  const additions=[
    {
      id:'twas-the-tism-mlord',
      title:'’Twas the Tism, M’Lord',
      artist:'MusicSubject × Call Me Daddy',
      year:2026,
      month:9,
      date:'2026-09-02',
      project:'’Twas the Tism, M’Lord',
      description:'A medieval meme turned into dark cinematic R&B and dubstep, then tightened with micro-stutters before the shorter final edit glitches itself apart.',
      lineage:'Meme seed → multiple Suno cuts → chosen dark R&B/dubstep direction → shortened final arrangement → surgical micro-stutter edits → continuous glitch-out final.',
      aliases:['Twas the Tism M’Lord'],
      audio:'/Twas_the_Tism_full_glitch_tweakout_final.mp3',
      cover:'/28475.jpeg',
      experience:'/twas-the-tism-mlord/',
      shareUrl:'/twas-the-tism-mlord/',
      kind:'dark R&B / dubstep · final glitch edit',
      variants:[
        {
          id:'final-glitch-edit',
          label:'Final Glitch Edit',
          audio:'/Twas_the_Tism_full_glitch_tweakout_final.mp3'
        }
      ]
    }
  ];

  if(Array.isArray(window.CMD_SONGS)){
    for(let index=additions.length-1;index>=0;index-=1){
      const song=additions[index];
      if(!window.CMD_SONGS.some(existing=>existing.id===song.id))window.CMD_SONGS.unshift(song);
    }
  }

  if(window.CMD_RADIO_CONFIG?.profiles){
    window.CMD_RADIO_CONFIG.profiles['twas-the-tism-mlord']={surprise:100,laugh:94,think:68,'level-up':54,heavy:88,'old-files':4};
  }
})();
