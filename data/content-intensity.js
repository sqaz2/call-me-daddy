(()=>{
  if(window.CMDContentIntensity)return;

  const STORAGE='cmd-vibe-guard-v1';
  const LEVELS=new Set(['light','deep','raw']);

  /**
   * Editorial intensity — vibe-guard layer.
   * raw: crisis-adjacent / van-life locked-in despair core (hospital / self-harm / extreme despair energy).
   * deep: melancholy & heavy emotion without ambushing the listener.
   * light: comedy, satire, fun, forward-motion anthems.
   * When unsure between deep/raw, prefer deep.
   */
  const INTENSITY={
    // --- raw (minimum + clearly crisis / locked-in despair) ---
    'will-to-live':'raw',
    'locked-in-these-walls':'raw',
    'seven-days-locked':'raw',
    'under-watch':'raw',
    'never-come-back-down':'raw',
    'numbness-as-a-trap':'raw',

    // --- deep (melancholy / heartbreak / heavy but not ambush) ---
    'the-loudest-one-in-my-head':'deep',
    'mind-at-war':'deep',
    'shooting-star':'deep',
    'september-26th-heartbreak':'deep',
    'heartbreak-you-water-me':'deep',
    'cloudlife':'deep',
    'her-perfume-rides-shotgun':'deep',
    'thirty-six':'deep',
    'wild-ways':'deep',
    'i-wont-let-the-wifi-go':'deep',
    'hell-has-people-too':'deep',
    'cut-from-the-same-fabric-instrumental':'deep',
    'couple-friends-couple-calls':'deep',
    'i-need-love':'deep',
    'everybody-else-less':'deep',
    '2010-wows':'deep',
    'the-tune-of-magical-song':'deep',
    'fractured-face':'deep',
    'hard-earned-light':'deep',
    'friction-the-what':'deep',
    'broke-my-mug-not-my-song':'deep',

    // --- light (comedy / satire / fun / forward motion) ---
    'armando':'light',
    'id-pick-you-first':'light',
    'did-armando-die-after-you-held-his-beer':'light',
    'level-up':'light',
    'back-to-sticks':'light',
    'the-musician-police':'light',
    'funhouse-meltdown':'light',
    'youtube-W47ebCMfrBI':'light',
    'namaste-hamster':'light',
    'concrete-under-evergreens':'light',
    'anti-generative-ai-diss':'light',
    'one-million-dollars':'light',
    'where-the-bad-girls-at':'light',
    'ashes-in-eastwood':'light',
    'side-chick-finder':'light',
    'twas-the-tism-mlord':'light',
    'power-moves-only':'light',
    'what-is-my-opponent-threatening-right-now':'light',
    'keep-moving':'light',
    'one-brick':'light',
    'stomp-clamp':'light',
    'make-me-an-animal':'light',
    'pull-me-like-that':'light',
    'where-the-teeth-are-kept':'light',
    'where-monsters-are':'light',
    'survival-mode':'light',
    'find-your-people':'light'
  };

  const RAW_COPY='Keeping it lighter until you ask for the heavy lane.';
  const HEAVY_LANE_COPY='You opened the heavy lane.';

  function intensityFor(songId){
    const level=INTENSITY[songId];
    return LEVELS.has(level)?level:'deep';
  }

  function isRaw(songId){
    return intensityFor(songId)==='raw';
  }

  function readStored(){
    try{
      const raw=JSON.parse(localStorage.getItem(STORAGE)||'null');
      if(raw&&typeof raw==='object'&&!Array.isArray(raw)){
        return {
          includeHeavy:!!raw.includeHeavy,
          unlockedByTaste:!!raw.unlockedByTaste
        };
      }
    }catch{}
    return {includeHeavy:false,unlockedByTaste:false};
  }

  function writeStored(state){
    try{
      localStorage.setItem(STORAGE,JSON.stringify({
        version:1,
        includeHeavy:!!state.includeHeavy,
        unlockedByTaste:!!state.unlockedByTaste
      }));
    }catch{}
  }

  function likedHeavySignal(){
    try{
      const taste=window.CMDListenerTaste;
      if(!taste?.likes)return false;
      const likes=taste.likes()||[];
      return likes.some(songId=>{
        if(isRaw(songId))return true;
        try{
          const cluster=window.CMDTasteClusters?.clusterFor?.(songId);
          if(cluster?.id==='melancholy-heavy')return true;
        }catch{}
        return false;
      });
    }catch{return false;}
  }

  function syncTasteUnlock(){
    if(!likedHeavySignal())return readPolicy();
    const stored=readStored();
    if(!stored.unlockedByTaste){
      stored.unlockedByTaste=true;
      writeStored(stored);
    }
    return readPolicy();
  }

  /**
   * Unlock raw when:
   * - toggle "Include the heavy stuff" is on, OR
   * - listener liked a melancholy-heavy / raw track, OR
   * - current intent is explicitly heavy (or think, which invites depth)
   */
  function isUnlocked(policy={}){
    const stored=readStored();
    if(policy.includeHeavy===true||stored.includeHeavy)return true;
    if(policy.unlockedByTaste===true||stored.unlockedByTaste)return true;
    if(likedHeavySignal())return true;
    const intent=String(policy.intent||'');
    if(intent==='heavy')return true;
    return false;
  }

  function readPolicy(overrides={}){
    const stored=readStored();
    const intent=overrides.intent||'surprise';
    const includeHeavy=overrides.includeHeavy!==undefined?!!overrides.includeHeavy:!!stored.includeHeavy;
    const unlockedByTaste=overrides.unlockedByTaste!==undefined?!!overrides.unlockedByTaste:!!(stored.unlockedByTaste||likedHeavySignal());
    const unlocked=isUnlocked({intent,includeHeavy,unlockedByTaste});
    const safeMode=!includeHeavy&&!unlockedByTaste&&intent!=='heavy'&&intent!=='think';
    return {
      intent,
      includeHeavy,
      unlockedByTaste,
      unlocked,
      safeMode,
      storageKey:STORAGE
    };
  }

  /**
   * Gate raw tracks for radio builds.
   * surprise / laugh: exclude raw unless unlocked
   * level-up / old-files: exclude raw unless unlocked
   * heavy / think: allow raw
   * Search / intentional card play are not gated here.
   */
  function isAllowed(songId,policy={}){
    if(!isRaw(songId))return true;
    const resolved=readPolicy(policy);
    const intent=resolved.intent;
    if(intent==='heavy'||intent==='think')return true;
    return resolved.unlocked;
  }

  function shouldSoftHideRaw(songId,policy={}){
    if(!isRaw(songId))return false;
    const resolved=readPolicy(policy);
    // Soft-hide raw from "Most likely for you" while safe and not unlocked.
    if(resolved.unlocked)return false;
    if(resolved.intent==='heavy'||resolved.intent==='think')return false;
    return true;
  }

  function setIncludeHeavy(value){
    const stored=readStored();
    stored.includeHeavy=!!value;
    writeStored(stored);
    return readPolicy();
  }

  function toggleIncludeHeavy(){
    const stored=readStored();
    return setIncludeHeavy(!stored.includeHeavy);
  }

  function whyGuardCopy(policy={}){
    const resolved=readPolicy(policy);
    if(resolved.unlocked||resolved.intent==='heavy'||resolved.intent==='think'){
      return HEAVY_LANE_COPY;
    }
    return RAW_COPY;
  }

  function filterSongs(songs,policy={}){
    const list=Array.isArray(songs)?songs:[];
    return list.filter(song=>song&&isAllowed(song.id||song.songId,policy));
  }

  function rawSongIds(){
    return Object.keys(INTENSITY).filter(id=>INTENSITY[id]==='raw').sort();
  }

  function uncoveredSongIds(allSongIds){
    return (allSongIds||[]).filter(id=>!INTENSITY[id]);
  }

  function noteTasteChange(){
    return syncTasteUnlock();
  }

  window.CMDContentIntensity={
    STORAGE,
    INTENSITY:{...INTENSITY},
    RAW_COPY,
    HEAVY_LANE_COPY,
    intensityFor,
    isRaw,
    isAllowed,
    isUnlocked,
    shouldSoftHideRaw,
    readPolicy,
    setIncludeHeavy,
    toggleIncludeHeavy,
    whyGuardCopy,
    filterSongs,
    rawSongIds,
    uncoveredSongIds,
    noteTasteChange,
    syncTasteUnlock
  };
})();
