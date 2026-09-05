(()=>{
  if(window.CMDListenerTaste)return;

  const STORAGE='cmd-listener-taste-v2';
  const LEGACY_STORAGE='cmd-listener-taste-v1';

  function now(){return Date.now()}

  function isRecord(value){
    return value&&typeof value==='object'&&!Array.isArray(value)
      &&(value.status==='like'||value.status==='dislike'||value.status==='killed');
  }

  function normalizeRecord(value){
    if(isRecord(value)){
      const dislikes=Math.max(0,Number(value.dislikes)||0);
      let status=value.status;
      if(status==='dislike'&&dislikes>=2)status='killed';
      if(status==='killed'&&dislikes<2)return {status:'killed',dislikes:Math.max(2,dislikes),updatedAt:Number(value.updatedAt)||now()};
      return {status,dislikes:status==='like'?0:Math.max(status==='killed'?2:1,dislikes),updatedAt:Number(value.updatedAt)||now()};
    }
    if(value==='like')return {status:'like',dislikes:0,updatedAt:now()};
    if(value==='dislike')return {status:'dislike',dislikes:1,updatedAt:now()};
    if(value==='killed')return {status:'killed',dislikes:2,updatedAt:now()};
    return null;
  }

  function migrateLegacy(){
    try{
      if(localStorage.getItem(STORAGE))return;
      const raw=JSON.parse(localStorage.getItem(LEGACY_STORAGE)||'{}');
      if(!raw||typeof raw!=='object'||Array.isArray(raw))return;
      const map={};
      Object.keys(raw).forEach(key=>{
        const record=normalizeRecord(raw[key]);
        if(record)map[key]=record;
      });
      if(Object.keys(map).length)localStorage.setItem(STORAGE,JSON.stringify(map));
    }catch{}
  }

  function readMap(){
    migrateLegacy();
    try{
      const raw=JSON.parse(localStorage.getItem(STORAGE)||'{}');
      if(!raw||typeof raw!=='object'||Array.isArray(raw))return {};
      const map={};
      Object.keys(raw).forEach(key=>{
        const record=normalizeRecord(raw[key]);
        if(record)map[key]=record;
      });
      return map;
    }catch{return {};}
  }

  function writeMap(map){
    try{localStorage.setItem(STORAGE,JSON.stringify(map||{}))}catch{}
  }

  /**
   * songId when variant is absent/empty/main; songId::variantId when variant is meaningful.
   */
  function tasteKey(songId,variantId){
    if(!songId)return '';
    const variant=String(variantId??'').trim();
    if(!variant||variant==='main')return String(songId);
    return `${songId}::${variant}`;
  }

  function parseKey(key){
    const text=String(key||'');
    const split=text.indexOf('::');
    if(split<0)return {songId:text,variantId:''};
    return {songId:text.slice(0,split),variantId:text.slice(split+2)};
  }

  function statusOf(record){
    return record?.status==='like'||record?.status==='dislike'||record?.status==='killed'?record.status:null;
  }

  function getRecord(songId,variantId){
    if(!songId)return null;
    const map=readMap();
    const key=tasteKey(songId,variantId);
    if(map[key])return map[key];
    // Exact key only — sibling variants never inherit each other's records.
    return null;
  }

  /**
   * Status for a version key. When variant omitted: prefer song-level key.
   * Does not treat sibling dislikes as a song kill; if any variant is killed,
   * callers can soft-hide via anyVariantKilled / isKilled.
   */
  function get(songId,variantId){
    if(!songId)return null;
    if(arguments.length>=2||variantId!==undefined){
      return statusOf(getRecord(songId,variantId));
    }
    const songLevel=statusOf(getRecord(songId));
    if(songLevel)return songLevel;
    return null;
  }

  function anyVariantKilled(songId){
    if(!songId)return false;
    const map=readMap();
    const prefix=`${songId}::`;
    if(statusOf(map[songId])==='killed')return true;
    return Object.keys(map).some(key=>key.startsWith(prefix)&&statusOf(map[key])==='killed');
  }

  function songLevelSignal(songId){
    if(!songId)return null;
    const map=readMap();
    const prefix=`${songId}::`;
    let liked=false;
    let disliked=false;
    let killed=false;
    const consider=record=>{
      const status=statusOf(record);
      if(status==='like')liked=true;
      if(status==='dislike')disliked=true;
      if(status==='killed')killed=true;
    };
    consider(map[songId]);
    Object.keys(map).forEach(key=>{
      if(key.startsWith(prefix))consider(map[key]);
    });
    if(killed)return 'killed';
    if(disliked)return 'dislike';
    if(liked)return 'like';
    return null;
  }

  function setRecord(songId,variantId,record){
    if(!songId)return null;
    const map=readMap();
    const key=tasteKey(songId,variantId);
    if(!record){
      delete map[key];
    }else{
      map[key]=normalizeRecord(record);
    }
    writeMap(map);
    return statusOf(map[key]||null);
  }

  function like(songId,variantId){
    if(!songId)return null;
    const current=getRecord(songId,variantId);
    if(statusOf(current)==='like')return setRecord(songId,variantId,null);
    return setRecord(songId,variantId,{status:'like',dislikes:0,updatedAt:now()});
  }

  function dislike(songId,variantId){
    if(!songId)return null;
    const current=getRecord(songId,variantId);
    const status=statusOf(current);
    if(status==='killed')return setRecord(songId,variantId,null);
    if(status==='dislike'){
      const next=Math.max(2,(Number(current.dislikes)||1)+1);
      return setRecord(songId,variantId,{status:'killed',dislikes:next,updatedAt:now()});
    }
    return setRecord(songId,variantId,{status:'dislike',dislikes:1,updatedAt:now()});
  }

  function clear(songId,variantId){
    return setRecord(songId,variantId,null);
  }

  function isKilled(songId,variantId){
    if(!songId)return false;
    // Without a variant argument, only the song-level key counts as killed.
    // Sibling versions stay alive; use anyVariantKilled / songFullyKilled for card-wide checks.
    return statusOf(getRecord(songId,variantId))==='killed';
  }

  function signalCount(){
    return Object.keys(readMap()).length;
  }

  /** ~1.0 with few signals → ~0.2 after ~10–14 signals. */
  function explorationFactor(){
    const count=signalCount();
    const span=12;
    const floor=0.2;
    return Math.max(floor,1-(1-floor)*Math.min(1,count/span));
  }

  function weightMultiplier(songId,variantId){
    const tasteApi={
      get,
      getRecord,
      readMap,
      songLevelSignal,
      isKilled,
      explorationFactor,
      tasteKey
    };
    const factor=explorationFactor();
    try{
      if(window.CMDTasteClusters?.applyTasteToWeight){
        return window.CMDTasteClusters.applyTasteToWeight({
          songId,
          variantId,
          baseWeight:1,
          taste:tasteApi,
          explorationFactor:factor
        });
      }
    }catch{}
    if(isKilled(songId,variantId))return 0.000001;
    const value=get(songId,variantId);
    if(value==='like')return 1.85;
    if(value==='dislike')return 0.08;
    return 1;
  }

  function likes(){
    const map=readMap();
    return Object.keys(map).filter(key=>statusOf(map[key])==='like').map(key=>parseKey(key).songId);
  }

  function dislikes(){
    const map=readMap();
    return Object.keys(map).filter(key=>{
      const status=statusOf(map[key]);
      return status==='dislike'||status==='killed';
    }).map(key=>parseKey(key).songId);
  }

  // Backward-compatible set/toggle for song-level keys.
  function set(songId,value){
    if(!songId)return null;
    if(value!=='like'&&value!=='dislike'&&value!=='killed')return clear(songId);
    if(value==='like')return setRecord(songId,undefined,{status:'like',dislikes:0,updatedAt:now()});
    if(value==='killed')return setRecord(songId,undefined,{status:'killed',dislikes:2,updatedAt:now()});
    return setRecord(songId,undefined,{status:'dislike',dislikes:1,updatedAt:now()});
  }

  function toggle(songId,value){
    if(!songId)return null;
    const current=get(songId);
    if(current===value)return clear(songId);
    return set(songId,value);
  }

  window.CMDListenerTaste={
    STORAGE,
    LEGACY_STORAGE,
    readMap,
    tasteKey,
    get,
    getRecord,
    set,
    toggle,
    like,
    dislike,
    clear,
    isKilled,
    anyVariantKilled,
    songLevelSignal,
    signalCount,
    explorationFactor,
    weightMultiplier,
    likes,
    dislikes
  };
})();
