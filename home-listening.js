(()=>{
  const HISTORY_KEY='cmd-radio-history-v1';
  const LAST_KEY='cmd-radio-last-track-v1';

  const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,char=>({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[char]));

  function readHistory(){
    try{
      const history=JSON.parse(localStorage.getItem(HISTORY_KEY)||'[]');
      return Array.isArray(history)?history.filter(Boolean):[];
    }catch{return [];}
  }

  function readLast(){
    try{
      const raw=JSON.parse(localStorage.getItem(LAST_KEY)||'null');
      return raw&&typeof raw==='object'?raw:null;
    }catch{return null;}
  }

  function songUrl(id){
    return `/music/?song=${encodeURIComponent(id)}&intent=surprise`;
  }

  function tasteSource(){
    try{if(window.top!==window&&window.top.CMDListenerTaste)return window.top;}catch{}
    return window;
  }

  function renderLikes(){
    const songs=Array.isArray(window.CMD_SONGS)?window.CMD_SONGS:[];
    const byId=new Map(songs.map(song=>[song.id,song]));
    const recordings=(tasteSource().CMDListenerTaste?.likedRecordings?.()||[]).flatMap(saved=>{
      const song=byId.get(saved.songId);if(!song)return [];
      const variant=saved.variantId&&saved.variantId!=='main'?(song.variants||[]).find(v=>v.id===saved.variantId):song;
      if(!variant||!(variant.audio||variant.src||variant.expectedPath||variant.youtubeId))return [];
      const url=new URL('/music/',location.origin);url.searchParams.set('song',song.id);
      if(saved.variantId&&saved.variantId!=='main')url.searchParams.set('version',saved.variantId);
      return [{song,variant,href:url.pathname+url.search}];
    });
    let section=document.getElementById('liked-songs');
    if(!recordings.length){section?.remove();return;}
    if(!section){
      section=document.createElement('section');section.id='liked-songs';section.className='shell home-likes';
      section.setAttribute('aria-labelledby','homeLikedTitle');
      const discovery=document.getElementById('home-discovery');
      if(discovery)discovery.insertAdjacentElement('afterend',section);
      else document.querySelector('main')?.prepend(section);
    }
    const fingerprint=recordings.map(r=>r.href).join('|');
    if(section.dataset.recordings===fingerprint)return;
    const expanded=Boolean(section.querySelector('details')?.open);
    section.dataset.recordings=fingerprint;
    const cards=items=>`<ul class="home-song-results home-liked-results">${items.map(({song,variant,href})=>`
      <li class="home-song"><a class="home-song-open" href="${escapeHtml(href)}">
        <span class="home-song-art">${variant.cover||song.cover?`<img src="${escapeHtml(variant.cover||song.cover)}" alt="" loading="lazy" width="62" height="62">`:'♪'}</span>
        <span class="home-song-copy"><strong>${escapeHtml(song.title)}</strong><small>${escapeHtml(variant.label||song.kind||song.artist||'Call Me Daddy')}</small></span>
        <span class="home-song-arrow" aria-hidden="true">→</span>
      </a></li>`).join('')}</ul>`;
    section.innerHTML=`<div class="home-likes-head"><h2 id="homeLikedTitle">Liked songs</h2><p>Saved on this browser</p></div>${cards(recordings.slice(0,6))}${recordings.length>6?`<details class="home-liked-more"${expanded?' open':''}><summary>Show all ${recordings.length} liked recordings</summary>${cards(recordings.slice(6))}</details>`:''}`;
  }

  function mount(){
    if(document.getElementById('continue-listening'))return;
    const songs=Array.isArray(window.CMD_SONGS)?window.CMD_SONGS:[];
    const byId=new Map(songs.map(song=>[song.id,song]));
    const history=readHistory();
    const last=readLast();
    const continueId=last?.songId||history[0]||'';
    const continueSong=continueId?byId.get(continueId):null;
    const recentIds=history.filter(id=>byId.has(id)).slice(0,8);
    if(!continueSong&&!recentIds.length)return;

    const section=document.createElement('section');
    section.className='shell home-listening';
    section.id='continue-listening';
    section.setAttribute('aria-label','Continue listening');

    const continueBlock=continueSong?`
      <a class="home-continue" href="${escapeHtml(songUrl(continueSong.id))}">
        <span class="home-continue-art">${continueSong.cover?`<img src="${escapeHtml(continueSong.cover)}" alt="" loading="lazy">`:''}</span>
        <span class="home-continue-copy">
          <small>Continue listening</small>
          <strong>${escapeHtml(continueSong.title)}</strong>
          <span>${escapeHtml([continueSong.project,continueSong.kind].filter(Boolean).join(' · ')||'Pick up where the radio left you')}</span>
        </span>
        <b aria-hidden="true">▶</b>
      </a>`:'';

    const recents=recentIds.length?`
      <div class="home-recents">
        <div class="home-recents-head">
          <div class="kicker">Your recent spins</div>
          <h3>BACK ON THE DIAL.</h3>
        </div>
        <div class="home-recents-rail" role="list">
          ${recentIds.map(id=>{
            const song=byId.get(id);
            return `<a class="home-recent-card" role="listitem" href="${escapeHtml(songUrl(song.id))}">
              ${song.cover?`<img src="${escapeHtml(song.cover)}" alt="" loading="lazy">`:`<span class="home-recent-fallback" aria-hidden="true"></span>`}
              <strong>${escapeHtml(song.title)}</strong>
              <small>${escapeHtml(song.project||song.artist||'Call Me Daddy')}</small>
            </a>`;
          }).join('')}
        </div>
      </div>`:'';

    section.innerHTML=`
      <div class="home-listening-head">
        <div class="eyebrow">Listener memory · this browser only</div>
        <h2>PICK UP<br>THE THREAD.</h2>
      </div>
      ${continueBlock}
      ${recents}
    `;

    const briefing=document.getElementById('briefing');
    const latest=document.querySelector('.latest-section');
    const hero=document.querySelector('.hero');
    const discovery=document.getElementById('home-discovery');
    const likes=document.getElementById('liked-songs');
    if(likes)likes.insertAdjacentElement('afterend',section);
    else if(discovery)discovery.insertAdjacentElement('afterend',section);
    else if(briefing)briefing.insertAdjacentElement('afterend',section);
    else if(latest)latest.insertAdjacentElement('beforebegin',section);
    else if(hero)hero.insertAdjacentElement('afterend',section);
    else document.querySelector('main')?.prepend(section);
  }

  let attempts=0;
  const tick=()=>{
    attempts+=1;
    renderLikes();
    mount();
    if(!document.getElementById('continue-listening')&&attempts<8){
      window.setTimeout(tick,120);
    }
  };

  window.addEventListener('cmd:taste-change',renderLikes);
  window.addEventListener('storage',event=>{if(!event.key||event.key==='cmd-listener-taste-v2')renderLikes();});
  let sharedWindow=null;
  window.addEventListener('pageshow',()=>{
    renderLikes();
    const source=tasteSource();
    if(source!==window&&source!==sharedWindow){sharedWindow=source;source.addEventListener('cmd:taste-change',renderLikes);}
  });
  window.addEventListener('pagehide',()=>{sharedWindow?.removeEventListener('cmd:taste-change',renderLikes);sharedWindow=null;});

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',()=>window.setTimeout(tick,40),{once:true});
  }else{
    window.setTimeout(tick,40);
  }
})();
