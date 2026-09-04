(()=>{
  if(window.CMDMusicDiscovery)return;

  const profiles=()=>window.CMD_RADIO_CONFIG?.profiles||{};
  const intents=()=>window.CMD_RADIO_CONFIG?.intents||[];
  const INTENT_TERMS={
    laugh:'funny comedy joke jokes meme playful weird',
    think:'thoughtful reflect reflection meaning curious idea ideas',
    'level-up':'motivation motivational hopeful confidence energy better',
    heavy:'sad grief angry anger loss hard intense emotional',
    'old-files':'archive old older history nostalgic memory memories early'
  };
  const playable=song=>Boolean(song?.audio||(song?.variants||[]).some(variant=>variant?.audio||variant?.src||variant?.expectedPath));
  const storyState=song=>{
    if(song?.experience)return {id:'ready',label:'Story ready',cta:'Open song story',href:song.experience};
    if(playable(song))return {id:'coming-soon',label:'Story coming soon',cta:'Ask me about this song',href:'https://facebook.com/callmedaddy',external:true};
    return {id:'audio-coming-soon',label:'Audio coming soon',cta:'Ask me about this song',href:'https://facebook.com/callmedaddy',external:true};
  };
  const dateScore=song=>{
    const value=song?.date||[song?.year,String(song?.month||1).padStart(2,'0'),'01'].filter(Boolean).join('-');
    const parsed=Date.parse(value||'');
    return Number.isFinite(parsed)?parsed:0;
  };
  const searchText=song=>[
    song?.title,song?.artist,song?.project,song?.description,song?.kind,song?.lineage,
    song?.year,...(song?.aliases||[]),...(song?.variants||[]).flatMap(variant=>[variant?.label,variant?.id]),
    ...intents().filter(intent=>intent.id!=='surprise'&&scoreFor(song,intent.id)>=70).flatMap(intent=>[intent.label,intent.kicker,intent.description,INTENT_TERMS[intent.id]])
  ].filter(Boolean).join(' ').toLocaleLowerCase();
  const normalize=value=>String(value||'').trim().toLocaleLowerCase();
  const terms=value=>normalize(value).split(/\s+/).filter(Boolean);
  const matchesSearch=(song,query)=>terms(query).every(term=>searchText(song).includes(term));
  const scoreFor=(song,intent)=>Number(profiles()?.[song?.id]?.[intent])||0;
  const categories=()=>[
    {id:'all',label:'Everything',description:'Every song and version in one searchable place.'},
    ...intents().filter(intent=>intent.id!=='surprise').map(intent=>({id:intent.id,label:intent.label,description:intent.description,intent:true})),
    {id:'story-ready',label:'Stories ready',description:'Songs with a finished page, artwork and the story attached.'},
    {id:'coming-soon',label:'Stories coming',description:'Playable songs whose information page has not been built yet.'}
  ];
  const matchesCategory=(song,category)=>{
    if(!category||category==='all')return true;
    if(category==='story-ready')return storyState(song).id==='ready';
    if(category==='coming-soon')return storyState(song).id==='coming-soon';
    return scoreFor(song,category)>=70;
  };
  const searchRank=(song,query)=>{
    const needle=normalize(query);
    if(!needle)return 0;
    const title=normalize(song?.title),project=normalize(song?.project);
    if(title===needle)return 1000;
    if(title.startsWith(needle))return 800;
    if(title.includes(needle))return 650;
    if(project.startsWith(needle))return 450;
    return searchText(song).includes(needle)?250:0;
  };
  const filter=(songs,{query='',category='all'}={})=>{
    const needle=normalize(query);
    return (songs||[]).filter(song=>matchesCategory(song,category)&&(!needle||matchesSearch(song,needle))).sort((left,right)=>{
      const bySearch=searchRank(right,needle)-searchRank(left,needle);
      if(bySearch)return bySearch;
      if(!['all','story-ready','coming-soon'].includes(category)){
        const byIntent=scoreFor(right,category)-scoreFor(left,category);
        if(byIntent)return byIntent;
      }
      return dateScore(right)-dateScore(left)||String(left.title||'').localeCompare(String(right.title||''));
    });
  };
  const primaryCategory=song=>{
    const options=intents().filter(intent=>intent.id!=='surprise');
    return options.sort((left,right)=>scoreFor(song,right.id)-scoreFor(song,left.id))[0]||null;
  };
  const exactSongUrl=song=>{
    if(!playable(song)&&(song?.experience||song?.youtubeUrl))return new URL(song.experience||song.youtubeUrl,location.origin).href;
    const url=new URL('/music/',location.origin);
    url.searchParams.set('song',song.id);
    const version=(song.variants||[]).find(item=>item?.audio||item?.src||item?.expectedPath);
    if(version?.id)url.searchParams.set('version',version.id);
    url.searchParams.set('intent',primaryCategory(song)?.id||'surprise');
    url.searchParams.set('share','1');
    return url.href;
  };

  window.CMDMusicDiscovery={categories,filter,playable,storyState,scoreFor,primaryCategory,exactSongUrl,searchText,matchesSearch};
})();
