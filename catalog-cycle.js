(()=>{
  if(window.CMDCatalogCycle)return;

  const HISTORY_STORAGE='cmd-radio-history-v1';
  const config=window.CMD_RADIO_CONFIG||{};
  const settings=config.settings||{};
  const profiles=config.profiles||{};
  const intentList=Array.isArray(config.intents)?config.intents:[];
  const intentIds=new Set(intentList.map(intent=>intent.id));
  const defaultIntent=intentIds.has(config.defaultIntent)?config.defaultIntent:(intentList[0]?.id||'surprise');

  const variants=song=>{
    const list=Array.isArray(song?.variants)?song.variants.filter(variant=>variant?.audio):[];
    if(list.length)return list;
    return song?.audio?[{id:'main',label:song.kind||'Main version',audio:song.audio,cover:song.cover||''}]:[];
  };
  const count=songs=>(songs||[]).reduce((total,song)=>total+variants(song).length,0);
  const normalizeIntent=value=>intentIds.has(value)?value:defaultIntent;
  const cleanSeed=value=>String(value||'').replace(/[^a-zA-Z0-9_-]/g,'').slice(0,48);

  function hash(value){
    let result=2166136261;
    const text=String(value);
    for(let index=0;index<text.length;index+=1){
      result^=text.charCodeAt(index);
      result=Math.imul(result,16777619);
    }
    return result>>>0;
  }

  function randomFrom(seed){
    let state=hash(seed)||0x6d2b79f5;
    return ()=>{
      state+=0x6d2b79f5;
      let value=state;
      value=Math.imul(value^(value>>>15),value|1);
      value^=value+Math.imul(value^(value>>>7),value|61);
      return ((value^(value>>>14))>>>0)/4294967296;
    };
  }

  function createSeed(){
    try{
      const values=new Uint32Array(2);
      crypto.getRandomValues(values);
      return `${values[0].toString(36)}${values[1].toString(36)}`;
    }catch{
      return `${Date.now().toString(36)}${Math.floor(Math.random()*0xffffffff).toString(36)}`;
    }
  }

  const sharedRequest=(()=>{
    try{
      const query=new URLSearchParams(location.search);
      const songId=query.get('song')||'';
      if(!songId)return null;
      return {songId,variantId:query.get('version')||''};
    }catch{return null;}
  })();
  let sharedConsumed=false;

  function readHistory(){
    try{
      const history=JSON.parse(localStorage.getItem(HISTORY_STORAGE)||'[]');
      return Array.isArray(history)?history.filter(Boolean):[];
    }catch{return [];}
  }

  function remember(track){
    const songId=typeof track==='string'?track:(track?.songId||track?.id||'');
    if(!songId)return;
    const limit=Math.max(8,Number(settings.recentWindow)||8)*2;
    const history=readHistory().filter(id=>id!==songId);
    history.unshift(songId);
    try{localStorage.setItem(HISTORY_STORAGE,JSON.stringify(history.slice(0,limit)))}catch{}
  }

  function timestamp(song){
    if(song?.date){
      const exact=Date.parse(song.date);
      if(Number.isFinite(exact))return exact;
    }
    const year=Number(song?.year);
    const month=Math.min(12,Math.max(1,Number(song?.month)||1));
    return Number.isFinite(year)?Date.UTC(year,month-1,1):0;
  }

  function weightFor(song,{intent,selected,lastSongId,history,newestTimestamp,rng}){
    const fit=Math.max(0,Math.min(100,Number(profiles[song.id]?.[intent])||50))/100;
    let weight=0.08+Math.pow(fit,2)*0.92;
    const recencyBias=Number(settings.recencyBoost?.[intent])||0;
    const windowDays=Math.max(1,Number(settings.recencyWindowDays)||730);
    const ageDays=Math.max(0,(newestTimestamp-timestamp(song))/86400000);
    const freshness=Math.max(0,1-ageDays/windowDays);
    weight*=recencyBias>=0?1+recencyBias*freshness:1+Math.abs(recencyBias)*(1-freshness);

    const previous=selected[selected.length-1];
    if(previous?.project&&song.project&&previous.project===song.project){
      weight*=Math.max(0.05,Number(settings.sameProjectPenalty)||0.34);
    }
    if(lastSongId&&song.id===lastSongId){
      weight*=Math.max(0.001,Number(settings.immediateRepeatPenalty)||0.025);
    }
    const historyIndex=history.indexOf(song.id);
    if(historyIndex>=0){
      const window=Math.max(1,Number(settings.recentWindow)||8);
      const floor=Math.max(0.01,Math.min(1,Number(settings.historyFloor)||0.16));
      const recovery=Math.min(1,historyIndex/window);
      weight*=floor+(1-floor)*recovery;
    }
    return Math.max(0.000001,weight*(0.82+rng()*0.36));
  }

  function weightedOrder(songs,context){
    const pool=[...songs];
    const selected=[];
    while(pool.length){
      const weights=pool.map(song=>weightFor(song,{...context,selected}));
      const total=weights.reduce((sum,value)=>sum+value,0);
      let target=context.rng()*total;
      let chosen=pool.length-1;
      for(let index=0;index<pool.length;index+=1){
        target-=weights[index];
        if(target<=0){chosen=index;break;}
      }
      selected.push(pool.splice(chosen,1)[0]);
    }
    return selected;
  }

  function protectedTracks(songs,intent,rng){
    const byId=new Map(songs.map(song=>[song.id,song]));
    const protectedList=[];
    const used=new Set();
    (config.sequences||[]).forEach(sequence=>{
      if(sequence?.placement!=='start'||!sequence.intents?.includes(intent))return;
      const chance=Number.isFinite(Number(sequence.chance))?Number(sequence.chance):1;
      if(rng()>chance)return;
      (sequence.tracks||[]).forEach(songId=>{
        const song=byId.get(songId);
        if(!song||used.has(songId))return;
        protectedList.push({...song,radioSequence:sequence.id});
        used.add(songId);
      });
    });
    return {protectedList,used};
  }

  function selectVariant(song,{seed,cycleNumber,forcedVariantId=''}){
    const list=variants(song);
    if(!list.length)return null;
    let index=(hash(`${seed}|${song.id}`)+Math.max(0,cycleNumber-1))%list.length;
    if(forcedVariantId){
      const forcedIndex=list.findIndex(variant=>String(variant.id||'')===forcedVariantId);
      if(forcedIndex>=0)index=forcedIndex;
    }
    const variant=list[index];
    return {
      ...song,
      audio:variant.audio,
      cover:variant.cover||song.cover||'',
      variantId:variant.id||String(index),
      variantLabel:variant.label||song.kind||'Version',
      variantCount:list.length,
      songId:song.id
    };
  }

  function build(songs,options={}){
    const intent=normalizeIntent(options.intent);
    const seed=cleanSeed(options.seed)||createSeed();
    const cycleNumber=Math.max(1,Number(options.cycleNumber)||1);
    const excluded=new Set(options.excludeIds||[]);
    const playable=(songs||[]).filter(song=>song&&!excluded.has(song.id)&&variants(song).length);
    const rng=randomFrom(`${seed}|${intent}|${cycleNumber}`);
    const history=options.ignoreHistory?[]:readHistory();
    const newestTimestamp=Math.max(0,...playable.map(timestamp));
    const {protectedList,used}=protectedTracks(playable,intent,rng);
    const remainder=weightedOrder(playable.filter(song=>!used.has(song.id)),{
      intent,
      lastSongId:options.lastSongId||null,
      history,
      newestTimestamp,
      rng
    });
    let ordered=[...protectedList,...remainder];
    const shared=!sharedConsumed?sharedRequest:null;
    if(shared){
      const sharedIndex=ordered.findIndex(song=>song.id===shared.songId);
      if(sharedIndex>0)ordered=[ordered[sharedIndex],...ordered.slice(0,sharedIndex),...ordered.slice(sharedIndex+1)];
      sharedConsumed=true;
    }
    if(!shared&&options.lastSongId&&ordered.length>1&&ordered[0]?.id===options.lastSongId){
      const swapIndex=ordered.findIndex((song,index)=>index>0&&song.id!==options.lastSongId);
      if(swapIndex>0)[ordered[0],ordered[swapIndex]]=[ordered[swapIndex],ordered[0]];
    }
    return ordered.map(song=>{
      const forcedVariantId=shared&&song.id===shared.songId?shared.variantId:'';
      const track=selectVariant(song,{seed,cycleNumber,forcedVariantId});
      return track?{...track,radioIntent:intent,radioSeed:seed,radioCycle:cycleNumber}:null;
    }).filter(Boolean);
  }

  window.CMDCatalogCycle={
    build,
    variants,
    count,
    remember,
    createSeed,
    cleanSeed,
    normalizeIntent,
    intents:intentList.map(intent=>({...intent}))
  };
})();
