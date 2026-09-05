(()=>{
  if(window.CMDCatalogSearch)return;

  const BASE_HINTS=[
    'When Things Got Heavy','Old files','Armando','Wild Ways','Cut From the Same Fabric',
    'I Need Love','Will to Live','Numbness','Never Come Back Down','dubstep','heartbreak',
    'Make Me an Animal','Level Up','Play the site','Make me laugh','Give me heavy',
    'Show old files','Level me up','Make me think','warehouse','busker','Cloudlife',
    'Thirty Six','Keep Moving','Sqaz','Funhouse','Musician Police','Back to Sticks'
  ];

  function normalize(value){
    return String(value||'').toLowerCase().replace(/\s+/g,' ').trim();
  }

  function songHaystack(song){
    if(!song)return '';
    const parts=[
      song.id,song.title,song.artist,song.project,song.kind,song.description,
      song.lineage,song.aliases
    ];
    if(Array.isArray(song.variants)){
      song.variants.forEach(v=>{parts.push(v?.id,v?.label)});
    }
    if(Array.isArray(song.aliases))parts.push(...song.aliases);
    return normalize(parts.filter(Boolean).join(' '));
  }

  function matchesSong(song,query){
    const q=normalize(query);
    if(!q)return true;
    const hay=songHaystack(song);
    return q.split(/\s+/).every(token=>hay.includes(token));
  }

  function filterSongs(songs,query){
    return (songs||[]).filter(song=>matchesSong(song,query));
  }

  function tokenizeCatalog(songs){
    const tokens=new Set();
    (songs||[]).forEach(song=>{
      [song.title,song.project,song.kind,song.artist].forEach(value=>{
        String(value||'').split(/[^a-zA-Z0-9'+-]+/).forEach(part=>{
          if(part.length>=3)tokens.add(part);
        });
      });
      if(Array.isArray(song.aliases))song.aliases.forEach(a=>{if(String(a).length>=3)tokens.add(String(a))});
    });
    return Array.from(tokens).sort((a,b)=>a.localeCompare(b));
  }

  function buildHints(songs,intents=[]){
    const hints=[];
    const seen=new Set();
    const push=value=>{
      const text=String(value||'').trim();
      if(!text)return;
      const key=normalize(text);
      if(seen.has(key))return;
      seen.add(key);
      hints.push(text);
    };
    BASE_HINTS.forEach(push);
    (intents||[]).forEach(intent=>push(intent.label||intent.id));
    (songs||[]).slice(0,40).forEach(song=>{
      push(song.title);
      push(song.project);
    });
    tokenizeCatalog(songs).slice(0,60).forEach(push);
    return hints.slice(0,120);
  }

  window.CMDCatalogSearch={
    BASE_HINTS,
    normalize,
    songHaystack,
    matchesSong,
    filterSongs,
    tokenizeCatalog,
    buildHints
  };
})();
