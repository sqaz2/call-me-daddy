(()=>{
  const additions=[
    {
      id:'what-is-my-opponent-threatening-right-now',
      title:'What Is My Opponent Threatening Right Now? (Can I Get Mated?)',
      artist:'Call Me Daddy',
      year:2026,
      month:8,
      date:'2026-08-27',
      project:'Chess Songs',
      description:'A chess song built around the question that has to happen before every move: what is my opponent threatening right now—and can I get mated?',
      audio:'/media/songs/2026/08/what-is-my-opponent-threatening-right-now/can-i-get-mated.mp3',
      cover:'',
      experience:'/updates/release-what-is-my-opponent-threatening-right-now/',
      shareUrl:'/updates/release-what-is-my-opponent-threatening-right-now/',
      kind:'Chess song',
      variants:[{
        id:'can-i-get-mated',
        label:'Can I Get Mated?',
        audio:'/media/songs/2026/08/what-is-my-opponent-threatening-right-now/can-i-get-mated.mp3'
      }]
    },
    {
      id:'september-26th-heartbreak',
      title:'September 26th Heartbreak',
      artist:'MusicSubject × Call Me Daddy',
      year:2019,
      date:'2019-09-26',
      project:'2019 Heartbreak Rehearsals · Old Files / New Tools',
      description:'A piano-and-voice rehearsal recorded in Nova Scotia on September 26, 2019, before the move to Alberta, rebuilt as a 2026 remix.',
      lineage:'2019 Nova Scotia piano-and-vocal rehearsal → 2026 remix.',
      audio:'/media/archive/2019-heartbreak-rehearsals/september-26th-heartbreak-2026-remix.mp3',
      cover:'',
      experience:'/archive/2019-heartbreak-rehearsals/#september-26th-heartbreak',
      shareUrl:'/updates/archive-september-26th-heartbreak/',
      kind:'2019 rehearsal → 2026 remix',
      variants:[{
        id:'2026-remix',
        label:'2026 Remix from 2019 Rehearsal',
        audio:'/media/archive/2019-heartbreak-rehearsals/september-26th-heartbreak-2026-remix.mp3'
      }]
    },
    {
      id:'heartbreak-you-water-me',
      title:'Heartbreak, Heartbreak, You Water Me',
      artist:'MusicSubject × Call Me Daddy',
      year:2019,
      project:'2019 Heartbreak Rehearsals · Old Files / New Tools',
      description:'A piano-and-voice heartbreak rehearsal recorded in Nova Scotia in 2019 before the move to Alberta, rebuilt as a 2026 remix.',
      lineage:'2019 Nova Scotia piano-and-vocal rehearsal → 2026 remix. Exact rehearsal day not recorded.',
      audio:'/media/archive/2019-heartbreak-rehearsals/heartbreak-you-water-me-2026-remix.mp3',
      cover:'',
      experience:'/archive/2019-heartbreak-rehearsals/#heartbreak-you-water-me',
      shareUrl:'/updates/archive-heartbreak-you-water-me/',
      kind:'2019 rehearsal → 2026 remix',
      variants:[{
        id:'2026-remix',
        label:'2026 Remix from 2019 Rehearsal',
        audio:'/media/archive/2019-heartbreak-rehearsals/heartbreak-you-water-me-2026-remix.mp3'
      }]
    }
  ];

  if(Array.isArray(window.CMD_SONGS)){
    for(let index=additions.length-1;index>=0;index-=1){
      const song=additions[index];
      if(!window.CMD_SONGS.some(existing=>existing.id===song.id))window.CMD_SONGS.unshift(song);
    }
  }

  if(window.CMD_RADIO_CONFIG?.profiles){
    window.CMD_RADIO_CONFIG.profiles['what-is-my-opponent-threatening-right-now']={surprise:94,laugh:84,think:100,'level-up':92,heavy:34,'old-files':10};
    window.CMD_RADIO_CONFIG.profiles['september-26th-heartbreak']={surprise:78,laugh:4,think:92,'level-up':62,heavy:88,'old-files':100};
    window.CMD_RADIO_CONFIG.profiles['heartbreak-you-water-me']={surprise:80,laugh:4,think:94,'level-up':60,heavy:90,'old-files':100};
  }

  if(window.CMD_BRIEFING?.entries){
    const entries=[
      {
        id:'release-what-is-my-opponent-threatening-right-now',
        published:'2026-08-27T23:11:40-06:00',
        type:'New release · chess',
        songId:'what-is-my-opponent-threatening-right-now',
        href:'/music/?song=what-is-my-opponent-threatening-right-now&version=can-i-get-mated&intent=think&share=1',
        cta:'Play the chess song',
        featured:true,
        featuredOrder:1,
        cardLines:['WHAT IS MY OPPONENT','THREATENING RIGHT NOW?'],
        cardTag:'Chess anxiety · tactical survival',
        cardSummary:'Before every move: what are they threatening, and can I get mated? The blunder check finally has a soundtrack.',
        badge:'New chess song'
      },
      {
        id:'archive-september-26th-heartbreak',
        published:'2026-08-27T23:11:40-06:00',
        type:'Archive rework',
        songId:'september-26th-heartbreak',
        href:'/archive/2019-heartbreak-rehearsals/#september-26th-heartbreak',
        cta:'Hear the 2019 → 2026 lineage',
        badge:'Old file · new remix'
      },
      {
        id:'archive-heartbreak-you-water-me',
        published:'2026-08-27T23:11:40-06:00',
        type:'Archive rework',
        songId:'heartbreak-you-water-me',
        href:'/archive/2019-heartbreak-rehearsals/#heartbreak-you-water-me',
        cta:'Hear the 2019 → 2026 lineage',
        badge:'Nova Scotia rehearsal'
      }
    ];
    if(entries.some(entry=>entry.featured&&!window.CMD_BRIEFING.entries.some(existing=>existing.id===entry.id))){
      window.CMD_BRIEFING.entries.forEach(entry=>{if(entry.featured&&Number.isInteger(entry.featuredOrder))entry.featuredOrder+=1;});
    }
    for(let index=entries.length-1;index>=0;index-=1){
      const entry=entries[index];
      if(!window.CMD_BRIEFING.entries.some(existing=>existing.id===entry.id))window.CMD_BRIEFING.entries.unshift(entry);
    }
    window.CMD_BRIEFING.updated='2026-08-27T23:11:40-06:00';
  }
})();
