(()=>{
  if(window.CMDCatalogCycle)return;
  const STORAGE='cmd-catalog-version-rotation-v1';
  const read=()=>{try{return JSON.parse(localStorage.getItem(STORAGE)||'{}')||{}}catch{return {}}};
  const write=state=>{try{localStorage.setItem(STORAGE,JSON.stringify(state))}catch{}};
  const shuffle=list=>{
    const a=[...list];
    for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}
    return a;
  };
  const variants=song=>{
    const list=Array.isArray(song?.variants)?song.variants.filter(v=>v?.audio):[];
    if(list.length)return list;
    return song?.audio?[{id:'main',label:song.kind||'Main version',audio:song.audio,cover:song.cover||''}]:[];
  };
  const count=songs=>(songs||[]).reduce((n,s)=>n+variants(s).length,0);
  const sharedRequest=(()=>{
    try{
      const q=new URLSearchParams(location.search);
      const songId=q.get('song')||'';
      if(!songId)return null;
      return {songId,variantId:q.get('version')||''};
    }catch{return null;}
  })();
  let sharedConsumed=false;

  function build(songs,{lastSongId=null,excludeIds=[]}={}){
    const excluded=new Set(excludeIds);
    const state=read();
    const selected=[];
    const shared=!sharedConsumed?sharedRequest:null;
    (songs||[]).forEach(song=>{
      if(!song||excluded.has(song.id))return;
      const list=variants(song);
      if(!list.length)return;
      let cursor=Number(state[song.id]);
      if(!Number.isInteger(cursor)||cursor<0||cursor>=list.length)cursor=Math.floor(Math.random()*list.length);
      if(shared&&song.id===shared.songId&&shared.variantId){
        const forced=list.findIndex(v=>String(v.id||'')===shared.variantId);
        if(forced>=0)cursor=forced;
      }
      const variant=list[cursor];
      if(list.length>1)state[song.id]=(cursor+1)%list.length;
      selected.push({
        ...song,
        audio:variant.audio,
        cover:variant.cover||song.cover||'',
        variantId:variant.id||String(cursor),
        variantLabel:variant.label||song.kind||'Version',
        variantCount:list.length,
        songId:song.id
      });
    });
    write(state);
    const cycle=shuffle(selected);
    if(shared){
      const sharedIndex=cycle.findIndex(track=>track.songId===shared.songId);
      if(sharedIndex>0)[cycle[0],cycle[sharedIndex]]=[cycle[sharedIndex],cycle[0]];
      sharedConsumed=true;
    }
    if(lastSongId&&cycle.length>1&&cycle[0]?.songId===lastSongId){
      const swap=cycle.findIndex((track,i)=>i>0&&track.songId!==lastSongId);
      if(swap>0)[cycle[0],cycle[swap]]=[cycle[swap],cycle[0]];
    }
    return cycle;
  }

  window.CMDCatalogCycle={build,variants,count};
})();