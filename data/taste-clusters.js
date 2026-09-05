(()=>{
  if(window.CMDTasteClusters)return;

  /**
   * Taste clusters — editorial lanes for radio weighting.
   * bleed: full = dislike crushes the lane; none = dislike isolates to that song;
   *        light = mild cluster penalty on dislike.
   * Like always gently boosts the cluster (including comedy). Asymmetry is intentional.
   */
  const CLUSTERS=[
    {
      id:'melancholy-heavy',
      label:'Melancholy/Heavy',
      bleed:'full',
      keywords:['heavy','melancholy','sad','numb','locked','heartbreak','grunge'],
      songIds:[
        'will-to-live','locked-in-these-walls','seven-days-locked','under-watch',
        'never-come-back-down','numbness-as-a-trap','i-need-love','everybody-else-less',
        'couple-friends-couple-calls','the-loudest-one-in-my-head','mind-at-war',
        'shooting-star','september-26th-heartbreak','heartbreak-you-water-me','cloudlife',
        'thirty-six','broke-my-mug-not-my-song','fractured-face','her-perfume-rides-shotgun',
        '2010-wows'
      ]
    },
    {
      id:'comedy-satire',
      label:'Comedy/Satire',
      bleed:'none',
      keywords:['comedy','satire','funny','diss','armando','anti-ai','cheeky'],
      songIds:[
        'anti-generative-ai-diss','back-to-sticks','the-musician-police','one-million-dollars',
        'ashes-in-eastwood','side-chick-finder','concrete-under-evergreens','namaste-hamster',
        'funhouse-meltdown','armando','did-armando-die-after-you-held-his-beer','id-pick-you-first',
        'twas-the-tism-mlord','where-the-bad-girls-at','youtube-W47ebCMfrBI'
      ]
    },
    {
      id:'primal-animal',
      label:'Primal/Animal',
      bleed:'full',
      keywords:['animal','primal','teeth','stomp','survival','friction'],
      songIds:[
        'make-me-an-animal','pull-me-like-that','where-the-teeth-are-kept','hard-earned-light',
        'survival-mode','friction-the-what','stomp-clamp'
      ]
    },
    {
      id:'level-up-anthem',
      label:'Level-Up Anthem',
      bleed:'light',
      keywords:['level-up','anthem','keep-moving','brick','power'],
      songIds:[
        'level-up','keep-moving','one-brick','find-your-people','hard-earned-light',
        'power-moves-only','stomp-clamp'
      ]
    },
    {
      id:'heartbreak-archive',
      label:'Heartbreak Archive',
      bleed:'full',
      keywords:['heartbreak','wild-ways','wifi','magical','perfume','archive'],
      songIds:[
        'shooting-star','september-26th-heartbreak','heartbreak-you-water-me','wild-ways',
        'the-tune-of-magical-song','i-wont-let-the-wifi-go','her-perfume-rides-shotgun','2010-wows'
      ]
    },
    {
      id:'fairytale-story',
      label:'Fairytale/Story',
      bleed:'light',
      keywords:['monster','fairytale','teeth','magical','story'],
      songIds:[
        'where-monsters-are','where-the-teeth-are-kept','the-tune-of-magical-song'
      ]
    },
    {
      id:'chess-brain',
      label:'Chess/Brain',
      bleed:'none',
      keywords:['chess','opponent','think','strategy'],
      songIds:[
        'what-is-my-opponent-threatening-right-now'
      ]
    },
    {
      id:'fabric-duality',
      label:'Fabric Duality',
      bleed:'light',
      keywords:['fabric','people','hell','duality'],
      songIds:[
        'hell-has-people-too','find-your-people','cut-from-the-same-fabric-instrumental'
      ]
    }
  ];

  const byId=new Map(CLUSTERS.map(cluster=>[cluster.id,cluster]));
  const songIndex=new Map();
  CLUSTERS.forEach(cluster=>{
    (cluster.songIds||[]).forEach(songId=>{
      if(!songIndex.has(songId))songIndex.set(songId,[]);
      songIndex.get(songId).push(cluster);
    });
  });

  function clustersFor(songId){
    if(!songId)return [];
    return (songIndex.get(songId)||[]).slice();
  }

  function clusterFor(songId){
    return clustersFor(songId)[0]||null;
  }

  function readTasteValue(taste,songId){
    if(!songId)return null;
    try{
      if(taste&&typeof taste.get==='function'){
        const value=taste.get(songId);
        return value==='like'||value==='dislike'?value:null;
      }
    }catch{}
    if(taste&&typeof taste==='object'&&!Array.isArray(taste)){
      const value=taste[songId];
      return value==='like'||value==='dislike'?value:null;
    }
    return null;
  }

  function tasteMap(taste){
    try{
      if(taste&&typeof taste.readMap==='function')return taste.readMap()||{};
    }catch{}
    if(taste&&typeof taste==='object'&&!Array.isArray(taste))return taste;
    try{
      if(window.CMDListenerTaste?.readMap)return window.CMDListenerTaste.readMap()||{};
    }catch{}
    return {};
  }

  /**
   * Apply per-song + cluster bleed/boost to a base radio weight.
   * Dislike: full → strong cluster crush; none → song only; light → mild cluster penalty.
   * Like: boosts cluster peers even for comedy (downvote isolation only).
   */
  function applyTasteToWeight({songId,baseWeight=1,taste}={}){
    let weight=Math.max(0,Number(baseWeight)||0)||1;
    const own=readTasteValue(taste,songId);
    if(own==='like')weight*=1.85;
    else if(own==='dislike')weight*=0.08;

    const clusters=clustersFor(songId);
    clusters.forEach(cluster=>{
      const peers=(cluster.songIds||[]).filter(id=>id!==songId);
      let likedPeer=false;
      let dislikedPeer=false;
      peers.forEach(id=>{
        const value=readTasteValue(taste,id);
        if(value==='like')likedPeer=true;
        if(value==='dislike')dislikedPeer=true;
      });

      if(dislikedPeer&&own!=='dislike'){
        if(cluster.bleed==='full')weight*=0.12;
        else if(cluster.bleed==='light')weight*=0.55;
      }

      if(likedPeer&&own!=='dislike'){
        if(cluster.bleed==='full')weight*=1.4;
        else if(cluster.bleed==='light')weight*=1.22;
        else weight*=1.15;
      }
    });

    return Math.max(0.000001,weight);
  }

  function clusterDislikeState(cluster,taste){
    const ids=cluster?.songIds||[];
    let likes=0;
    let dislikes=0;
    ids.forEach(id=>{
      const value=readTasteValue(taste,id);
      if(value==='like')likes+=1;
      if(value==='dislike')dislikes+=1;
    });
    return {likes,dislikes};
  }

  function explainClusterWhy(songId,taste,intent){
    const reasons=[];
    const clusters=clustersFor(songId);
    if(!clusters.length)return reasons;
    const primary=clusters[0];
    const own=readTasteValue(taste,songId);

    for(const cluster of clusters){
      const {likes,dislikes}=clusterDislikeState(cluster,taste);
      if(likes>0&&own!=='dislike'){
        reasons.push(`Because you liked ${cluster.label}`);
        break;
      }
    }

    if(own!=='dislike'){
      for(const cluster of clusters){
        const {dislikes}=clusterDislikeState(cluster,taste);
        if(!dislikes)continue;
        if(cluster.bleed==='full'){
          reasons.push(`In ${cluster.label} — you skipped this lane`);
          break;
        }
        if(cluster.bleed==='none'){
          reasons.push(`${cluster.label} kept separate — this one's still in play`);
          break;
        }
      }
    }

    if(!reasons.length&&primary&&own==='like'){
      reasons.push(`Because you liked ${primary.label}`);
    }

    if(intent&&primary&&!reasons.length){
      /* intentional no-op: intent-specific copy lives in catalog-cycle */
    }

    return reasons;
  }

  function clusterAffinity(songId,taste){
    const clusters=clustersFor(songId);
    if(!clusters.length)return 0;
    let score=0;
    const own=readTasteValue(taste,songId);
    if(own==='like')score+=8;
    if(own==='dislike')score-=20;

    clusters.forEach(cluster=>{
      const {likes,dislikes}=clusterDislikeState(cluster,taste);
      score+=likes*3;
      if(cluster.bleed==='full')score-=dislikes*6;
      else if(cluster.bleed==='light')score-=dislikes*2;
      else score-=dislikes*0.15;
    });
    return score;
  }

  function isSoftHidden(songId,taste){
    const own=readTasteValue(taste,songId);
    if(own==='like')return false;
    if(own==='dislike')return true;
    return clustersFor(songId).some(cluster=>{
      if(cluster.bleed!=='full')return false;
      return (cluster.songIds||[]).some(id=>id!==songId&&readTasteValue(taste,id)==='dislike');
    });
  }

  /** Rank catalog songs for the "Most likely for you" rail. */
  function rankMostLikely(songs,taste,limit=12){
    const list=Array.isArray(songs)?songs:[];
    const scored=list
      .filter(song=>song?.id&&!isSoftHidden(song.id,taste))
      .map(song=>({song,score:clusterAffinity(song.id,taste)}))
      .filter(entry=>entry.score>0)
      .sort((a,b)=>b.score-a.score||String(a.song.title||'').localeCompare(String(b.song.title||'')));
    return scored.slice(0,Math.max(1,Number(limit)||12)).map(entry=>entry.song);
  }

  function uncoveredSongIds(allSongIds){
    return (allSongIds||[]).filter(id=>!songIndex.has(id));
  }

  window.CMDTasteClusters={
    clusters:CLUSTERS.map(cluster=>({...cluster,songIds:cluster.songIds.slice(),keywords:(cluster.keywords||[]).slice()})),
    byId,
    clusterFor,
    clustersFor,
    applyTasteToWeight,
    explainClusterWhy,
    clusterAffinity,
    isSoftHidden,
    rankMostLikely,
    uncoveredSongIds,
    tasteMap
  };
})();
