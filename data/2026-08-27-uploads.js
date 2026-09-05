(()=>{
  const additions=[
    {
      id:'wild-ways',
      title:'Wild Ways',
      artist:'MusicSubject × Call Me Daddy',
      year:2019,
      project:'Wild Ways · Old Files / New Tools',
      description:'Wild Ways began as keyboard-and-voice practice in Nova Scotia in 2019. The main playable version was built with AI using my voice; two dance-focused remixes take the same song into EDM and crowd-drop territory.',
      lineage:'2019 Nova Scotia keyboard-and-vocal practice → 2026 AI-built voice version → 2026 EDM and crowd-drop remixes.',
      aliases:['Wild Ways 2019'],
      audio:'/media/archive/wild-ways/2026/ai-voice-version.mp3',
      cover:'/media/archive/wild-ways/2026/cover.jpg',
      experience:'/archive/wild-ways/',
      shareUrl:'/updates/archive-wild-ways/',
      kind:'2019 voice source → 3 AI-era versions',
      variants:[
        {
          id:'ai-voice-version',
          label:'AI Voice Version from the 2019 Source',
          audio:'/media/archive/wild-ways/2026/ai-voice-version.mp3'
        },
        {
          id:'edm-remix',
          label:'EDM Remix',
          audio:'/media/archive/wild-ways/2026/edm-remix.mp3'
        },
        {
          id:'crowd-drop-remix',
          label:'2026 Crowd Drop Remix',
          audio:'/media/archive/wild-ways/2026/crowd-drop-remix.mp3'
        }
      ]
    },
    {
      id:'make-me-an-animal',
      title:'Make Me an Animal',
      artist:'Call Me Daddy',
      year:2026,
      month:8,
      date:'2026-08-27',
      project:'Make Me an Animal',
      description:'Make Me an Animal—also known in the files as Animal Day—arrives here as an EDM Switch-Up Mix. Any other Animal versions that surface belong to this same song family.',
      aliases:['Animal Day','Make Me Animal'],
      audio:'/media/songs/2026/08/make-me-an-animal/edm-switch-up-mix.mp3',
      cover:'/media/songs/2026/08/make-me-an-animal/cover.jpg',
      experience:'/updates/release-make-me-an-animal/',
      shareUrl:'/updates/release-make-me-an-animal/',
      kind:'EDM Switch-Up Mix',
      variants:[{
        id:'edm-switch-up-mix',
        label:'EDM Switch-Up Mix',
        audio:'/media/songs/2026/08/make-me-an-animal/edm-switch-up-mix.mp3'
      }]
    },
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
      cover:'/media/songs/2026/08/what-is-my-opponent-threatening-right-now/cover.jpg',
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
      cover:'/media/archive/2019-heartbreak-rehearsals/september-26th-heartbreak/cover.jpg',
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
      cover:'/media/archive/2019-heartbreak-rehearsals/heartbreak-you-water-me/cover.jpg',
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
    window.CMD_RADIO_CONFIG.profiles['wild-ways']={surprise:92,laugh:18,think:86,'level-up':76,heavy:48,'old-files':100};
    window.CMD_RADIO_CONFIG.profiles['make-me-an-animal']={surprise:100,laugh:64,think:42,'level-up':84,heavy:76,'old-files':6};
    window.CMD_RADIO_CONFIG.profiles['what-is-my-opponent-threatening-right-now']={surprise:94,laugh:84,think:100,'level-up':92,heavy:34,'old-files':10};
    window.CMD_RADIO_CONFIG.profiles['september-26th-heartbreak']={surprise:78,laugh:4,think:92,'level-up':62,heavy:88,'old-files':100};
    window.CMD_RADIO_CONFIG.profiles['heartbreak-you-water-me']={surprise:80,laugh:4,think:94,'level-up':60,heavy:90,'old-files':100};
  }

  if(window.CMD_BRIEFING?.entries){
    const entries=[
      {
        id:'archive-wild-ways',
        published:'2026-08-27T23:36:40-06:00',
        type:'Old file · three-version lineage',
        songId:'wild-ways',
        cover:'/media/archive/wild-ways/2026/cover.jpg',
        href:'/archive/wild-ways/',
        cta:'Hear all 3 versions',
        featured:true,
        featuredOrder:1,
        cardLines:['WILD','WAYS'],
        cardTag:'Nova Scotia 2019 → AI voice → dance remixes',
        cardSummary:'Keyboard-and-voice practice from Nova Scotia became an AI-built version using my voice, then split into EDM and crowd-drop remixes.',
        badge:'3 versions · one song'
      },
      {
        id:'release-make-me-an-animal',
        published:'2026-08-27T23:36:40-06:00',
        type:'New release · EDM',
        songId:'make-me-an-animal',
        cover:'/media/songs/2026/08/make-me-an-animal/cover.jpg',
        href:'/music/?song=make-me-an-animal&version=edm-switch-up-mix&intent=surprise&share=1',
        cta:'Play the EDM Switch-Up Mix',
        featured:true,
        featuredOrder:2,
        cardLines:['MAKE ME AN','ANIMAL'],
        cardTag:'Animal Day · EDM Switch-Up Mix',
        cardSummary:'Make Me an Animal and Animal Day are one song family. This is the EDM Switch-Up Mix—the only uploaded version so far.',
        badge:'One song · one uploaded version'
      },
      {
        id:'release-what-is-my-opponent-threatening-right-now',
        published:'2026-08-27T23:11:40-06:00',
        type:'New release · chess',
        songId:'what-is-my-opponent-threatening-right-now',
        cover:'/media/songs/2026/08/what-is-my-opponent-threatening-right-now/cover.jpg',
        href:'/music/?song=what-is-my-opponent-threatening-right-now&version=can-i-get-mated&intent=think&share=1',
        cta:'Play the chess song',
        featured:true,
        featuredOrder:3,
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
        cover:'/media/archive/2019-heartbreak-rehearsals/september-26th-heartbreak/cover.jpg',
        href:'/archive/2019-heartbreak-rehearsals/#september-26th-heartbreak',
        cta:'Hear the 2019 → 2026 lineage',
        badge:'Old file · new remix'
      },
      {
        id:'archive-heartbreak-you-water-me',
        published:'2026-08-27T23:11:40-06:00',
        type:'Archive rework',
        songId:'heartbreak-you-water-me',
        cover:'/media/archive/2019-heartbreak-rehearsals/heartbreak-you-water-me/cover.jpg',
        href:'/archive/2019-heartbreak-rehearsals/#heartbreak-you-water-me',
        cta:'Hear the 2019 → 2026 lineage',
        badge:'Nova Scotia rehearsal'
      }
    ];
    const missingFeatured=entries.filter(entry=>entry.featured&&!window.CMD_BRIEFING.entries.some(existing=>existing.id===entry.id));
    if(missingFeatured.length){
      window.CMD_BRIEFING.entries.forEach(entry=>{if(entry.featured&&Number.isInteger(entry.featuredOrder))entry.featuredOrder+=missingFeatured.length;});
    }
    for(let index=entries.length-1;index>=0;index-=1){
      const entry=entries[index];
      if(!window.CMD_BRIEFING.entries.some(existing=>existing.id===entry.id))window.CMD_BRIEFING.entries.unshift(entry);
    }
    window.CMD_BRIEFING.updated='2026-08-27T23:36:40-06:00';
  }
})();
