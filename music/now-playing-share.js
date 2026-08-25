(()=>{
  const audio=document.getElementById('catalogAudio');
  const controls=document.querySelector('.catalog-controls');
  const songs=Array.isArray(window.CMD_SONGS)?window.CMD_SONGS:[];
  const cycle=window.CMDCatalogCycle;
  if(!audio||!controls||!songs.length||!cycle)return;

  const love=songs.find(song=>song.id==='i-need-love');
  if(love){
    love.description='Older recording → 2024 AI reimagining → 2026 busker, ska-punk and dubstep branches.';
    const card=[...document.querySelectorAll('.song-card')].find(el=>el.dataset.song==='i-need-love');
    const copy=card?.querySelector('.song-card-body p');
    if(copy)copy.textContent=love.description;
  }

  const abs=value=>{try{return new URL(value,location.href).href}catch{return value||''}};
  const variantsFor=song=>cycle.variants(song);
  const playableSongs=songs.filter(song=>variantsFor(song).length);
  const playableVersionCount=cycle.count(playableSongs);
  const safe=(value='')=>{const node=document.createElement('span');node.textContent=String(value);return node.innerHTML;};
  const shareUrl=(songId,variantId)=>{
    const url=new URL('/music/',location.origin);
    url.searchParams.set('song',songId);
    if(variantId)url.searchParams.set('version',variantId);
    const radio=window.CMDRadio?.getState?.();
    if(radio?.intent)url.searchParams.set('intent',radio.intent);
    if(radio?.seed)url.searchParams.set('seed',radio.seed);
    url.searchParams.set('share','1');
    return url.href;
  };
  const sharedRequest=(()=>{
    try{
      const q=new URLSearchParams(location.search);
      const songId=q.get('song')||'';
      return songId?{songId,variantId:q.get('version')||'',intent:q.get('intent')||''}:null;
    }catch{return null;}
  })();

  const findCurrent=()=>{
    const src=abs(audio.currentSrc||audio.src||'');
    if(!src)return null;
    for(const song of songs){
      const variants=variantsFor(song);
      for(const variant of variants){
        if(abs(variant.audio)===src){
          return {
            song,
            variant,
            songId:song.id,
            variantId:variant.id||'main',
            variantLabel:variant.label||song.kind||'Version',
            variantCount:variants.length
          };
        }
      }
    }
    return null;
  };

  const share=document.createElement('button');
  share.id='catalogShare';
  share.className='catalog-skip catalog-share';
  share.type='button';
  share.setAttribute('aria-label','Share now playing');
  share.title='Share now playing';
  share.textContent='↗';
  controls.appendChild(share);

  share.addEventListener('click',async()=>{
    const current=findCurrent();
    if(!current)return;
    const detail=current.variantCount>1?` — ${current.variantLabel}`:'';
    const data={
      title:`${current.song.title}${detail}`,
      text:`Listen to ${current.song.title}${detail}.`,
      url:shareUrl(current.songId,current.variantId)
    };
    if(window.CMDShare?.nativeShare){await window.CMDShare.nativeShare(data);return;}
    try{
      if(navigator.share){await navigator.share(data);return;}
      await navigator.clipboard?.writeText(`${data.text}\n${data.url}`);
    }catch{}
  });

  function mountSharedRadio(){
    if(!sharedRequest)return;
    const song=songs.find(item=>item.id===sharedRequest.songId);
    if(!song)return;
    const variants=variantsFor(song);
    if(!variants.length)return;
    const variant=(sharedRequest.variantId&&variants.find(v=>String(v.id||'')===sharedRequest.variantId))||variants[0];
    const card=[...document.querySelectorAll('.song-card')].find(el=>el.dataset.song===song.id);
    const artButton=card?.querySelector('button.song-art-hit');
    if(!card||!artButton)return;

    const variantLabel=variant.label||song.kind||'Version';
    const hasAlternates=variants.length>1;
    const sentLabel=hasAlternates?`${song.title} — ${variantLabel}`:song.title;
    const radioState=window.CMDRadio?.getState?.();
    const intentLabel=radioState?.label||'Play the site';
    card.classList.add('shared-radio-target');
    requestAnimationFrame(()=>card.scrollIntoView({block:'center',behavior:'auto'}));
    document.body.classList.add('cmd-radio-gated');

    const gate=document.createElement('div');
    gate.className='cmd-radio-gate';
    gate.id='cmdRadioGate';
    gate.innerHTML=`
      <section class="cmd-radio-intro" role="dialog" aria-modal="true" aria-labelledby="cmdRadioTitle">
        <button class="cmd-radio-close" type="button" aria-label="Close radio introduction">×</button>
        <div class="cmd-radio-kicker">CALL ME DADDY × MUSICSUBJECT</div>
        <h2 id="cmdRadioTitle">RADIO.</h2>
        <div class="cmd-radio-stats">${playableSongs.length} songs · ${playableVersionCount} playable versions · ${safe(intentLabel)}</div>
        <div class="cmd-radio-sent"><small>You were sent</small><strong>${safe(sentLabel)}</strong></div>
        <p>Starts with this exact version. Then the <strong>${safe(intentLabel)}</strong> route keeps moving.</p>
        <button class="cmd-radio-enter" type="button">Cue my song →</button>
      </section>
      <section class="cmd-radio-cue" hidden aria-label="Start shared song">
        <button class="cmd-radio-big-play" type="button" aria-label="Play ${safe(sentLabel)}">
          <span>▶</span><small>PLAY</small>
        </button>
        <div class="cmd-radio-cue-copy"><strong>${safe(song.title)}</strong><span>${safe(variantLabel)}</span><small>After it starts, tap the song artwork to pause or resume.</small></div>
      </section>`;
    document.body.appendChild(gate);

    const intro=gate.querySelector('.cmd-radio-intro');
    const cue=gate.querySelector('.cmd-radio-cue');
    const revealCue=()=>{
      intro.hidden=true;
      cue.hidden=false;
      gate.classList.add('is-cue');
      gate.querySelector('.cmd-radio-big-play')?.focus({preventScroll:true});
    };
    gate.querySelector('.cmd-radio-close')?.addEventListener('click',revealCue);
    gate.querySelector('.cmd-radio-enter')?.addEventListener('click',revealCue);
    gate.querySelector('.cmd-radio-big-play')?.addEventListener('click',()=>{
      artButton.click();
      gate.classList.add('is-leaving');
      document.body.classList.remove('cmd-radio-gated');
      document.body.classList.add('cmd-radio-entered');
      window.setTimeout(()=>gate.remove(),280);
      window.setTimeout(()=>card.scrollIntoView({block:'center',behavior:'smooth'}),320);
    });
  }

  mountSharedRadio();
})();
