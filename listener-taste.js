(()=>{
  if(window.CMDListenerTaste)return;

  const STORAGE='cmd-listener-taste-v1';

  function readMap(){
    try{
      const raw=JSON.parse(localStorage.getItem(STORAGE)||'{}');
      return raw&&typeof raw==='object'&&!Array.isArray(raw)?raw:{};
    }catch{return {};}
  }

  function writeMap(map){
    try{localStorage.setItem(STORAGE,JSON.stringify(map||{}))}catch{}
  }

  function get(songId){
    if(!songId)return null;
    const value=readMap()[songId];
    return value==='like'||value==='dislike'?value:null;
  }

  function set(songId,value){
    if(!songId)return null;
    const map=readMap();
    if(value!=='like'&&value!=='dislike'){
      delete map[songId];
    }else{
      map[songId]=value;
    }
    writeMap(map);
    return map[songId]||null;
  }

  function toggle(songId,value){
    if(!songId)return null;
    const current=get(songId);
    if(current===value)return set(songId,null);
    return set(songId,value);
  }

  function like(songId){return toggle(songId,'like')}
  function dislike(songId){return toggle(songId,'dislike')}
  function clear(songId){return set(songId,null)}

  /** Multiplier for weighted radio scoring. */
  function weightMultiplier(songId){
    const value=get(songId);
    if(value==='like')return 1.85;
    if(value==='dislike')return 0.08;
    return 1;
  }

  function likes(){
    return Object.keys(readMap()).filter(id=>readMap()[id]==='like');
  }

  function dislikes(){
    return Object.keys(readMap()).filter(id=>readMap()[id]==='dislike');
  }

  window.CMDListenerTaste={
    STORAGE,
    readMap,
    get,
    set,
    toggle,
    like,
    dislike,
    clear,
    weightMultiplier,
    likes,
    dislikes
  };
})();
