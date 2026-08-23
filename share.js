(()=>{
  const meta=(selector,attr='content')=>document.querySelector(selector)?.getAttribute(attr)||'';
  const canonical=()=>document.querySelector('link[rel="canonical"]')?.href||location.href;
  const pageTitle=()=>meta('meta[property="og:title"]')||document.title;
  const pageText=()=>meta('meta[property="og:description"]')||meta('meta[name="description"]')||'';
  const enc=encodeURIComponent;

  const copyText=async text=>{
    if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(text);return;}
    const area=document.createElement('textarea');area.value=text;area.style.position='fixed';area.style.opacity='0';document.body.appendChild(area);area.select();document.execCommand('copy');area.remove();
  };

  const popup=url=>window.open(url,'_blank','noopener,noreferrer,width=760,height=680');

  const links=({title,text,url})=>({
    facebook:`https://www.facebook.com/sharer/sharer.php?u=${enc(url)}`,
    x:`https://twitter.com/intent/tweet?text=${enc(text||title)}&url=${enc(url)}`,
    whatsapp:`https://wa.me/?text=${enc(`${text||title} ${url}`)}`,
    bluesky:`https://bsky.app/intent/compose?text=${enc(`${text||title} ${url}`)}`,
    reddit:`https://www.reddit.com/submit?url=${enc(url)}&title=${enc(title)}`,
    telegram:`https://t.me/share/url?url=${enc(url)}&text=${enc(text||title)}`
  });

  const variants=el=>(el.dataset.shareLines||'').split('||').map(line=>line.trim()).filter(Boolean);
  const randomFrom=list=>list.length?list[Math.floor(Math.random()*list.length)]:'';
  const shareData=el=>{
    const choices=variants(el);
    return {
      title:el.dataset.shareTitle||pageTitle(),
      text:randomFrom(choices)||el.dataset.shareText||pageText(),
      url:el.dataset.shareUrl||canonical()
    };
  };

  async function nativeShare(data,status){
    try{
      if(navigator.share){await navigator.share(data);if(status)status.textContent='Share sheet opened.';return true;}
      await copyText(`${data.text?`${data.text}\n`:''}${data.url}`);if(status)status.textContent='Share text + link copied.';return true;
    }catch(err){if(err?.name!=='AbortError'&&status)status.textContent='Could not open sharing.';return false;}
  }

  function mountCompact(el){
    el.classList.add('share-block','share-compact');
    const statusId=`share-status-${Math.random().toString(36).slice(2)}`;
    const label=el.dataset.shareButton||'↗ Share';
    el.innerHTML=`<button class="share-btn share-primary" type="button" data-action="more">${label}</button><span class="share-status" id="${statusId}" aria-live="polite"></span>`;
    const status=el.querySelector('.share-status');
    el.querySelector('.share-btn')?.addEventListener('click',()=>nativeShare(shareData(el),status));
  }

  function mountFull(el){
    el.classList.add('share-block');
    const statusId=`share-status-${Math.random().toString(36).slice(2)}`;
    el.innerHTML=`<div class="share-label">${el.dataset.shareLabel||'Share this'}</div><div class="share-buttons">
      <button class="share-btn" type="button" data-network="facebook">Facebook</button>
      <button class="share-btn" type="button" data-network="x">X</button>
      <button class="share-btn" type="button" data-network="whatsapp">WhatsApp</button>
      <button class="share-btn" type="button" data-network="bluesky">Bluesky</button>
      <button class="share-btn" type="button" data-network="reddit">Reddit</button>
      <button class="share-btn" type="button" data-network="telegram">Telegram</button>
      <button class="share-btn" type="button" data-action="copy">Copy link</button>
      <button class="share-btn" type="button" data-action="more">More…</button>
    </div><div class="share-status" id="${statusId}" aria-live="polite"></div>`;
    const status=el.querySelector('.share-status');
    el.addEventListener('click',async e=>{
      const button=e.target.closest('.share-btn');if(!button)return;
      const data=shareData(el);
      const network=button.dataset.network;
      if(network){popup(links(data)[network]);return;}
      if(button.dataset.action==='copy'){
        try{await copyText(`${data.text?`${data.text}\n`:''}${data.url}`);status.textContent='Share text + link copied.';}catch{status.textContent='Could not copy link.';}
      }
      if(button.dataset.action==='more')await nativeShare(data,status);
    });
  }

  function mount(el){
    if(!el||el.dataset.shareReady==='1')return;
    el.dataset.shareReady='1';
    if(el.dataset.shareCompact==='1')mountCompact(el);else mountFull(el);
  }

  function mountArmandoHistory(){
    if(location.pathname!=='/power-pulse-uprising/'||document.getElementById('armandoHistory'))return;
    const anchor=document.querySelector('.pulse-quote');
    if(!anchor)return;

    const section=document.createElement('section');
    section.className='armando-history shell';
    section.id='armandoHistory';
    section.innerHTML=`
      <div class="armando-history-intro">
        <div class="eyebrow">Making-of archive</div>
        <h2>THE VERSIONS<br>THAT GOT IT HERE.</h2>
        <p>This page is also a historical record of making the music. The versions that lost still matter because they show how the winner happened.</p>
      </div>
      <details class="armando-history-drawer">
        <summary><span>Expand making-of history</span><b>+</b></summary>
        <div class="armando-history-list">
          <article class="armando-history-item">
            <span class="history-step">01 · Earlier site mix</span>
            <h3>Armando</h3>
            <p>The laugh-driven version before the question became the hook.</p>
            <button class="btn history-audio" type="button" data-process-src="/media/songs/2026/08/armando/audio.mp3">▶ Play earlier mix</button>
          </article>
          <article class="armando-history-item">
            <span class="history-step">02 · Suno direction</span>
            <h3>Laugh remix sketch 1</h3>
            <p>One branch of the idea while the song was still looking for its shape.</p>
            <a class="btn" href="https://suno.com/s/V9VmdoMo5sJWff5O" target="_blank" rel="noopener">Open sketch 1 ↗</a>
          </article>
          <article class="armando-history-item">
            <span class="history-step">03 · Suno direction</span>
            <h3>Laugh remix sketch 2</h3>
            <p>Another branch. Useful pieces survived even though the whole version did not.</p>
            <a class="btn" href="https://suno.com/s/ZaGMEk1sART3vKhc" target="_blank" rel="noopener">Open sketch 2 ↗</a>
          </article>
          <article class="armando-history-item chosen">
            <span class="history-step">04 · Chosen version</span>
            <h3>Did Armando Die After You Held His Beer?</h3>
            <p>The question gave the running “hold my beer” joke its payoff. This is the version that stayed.</p>
            <a class="btn primary" href="https://suno.com/s/UGp7Ky1VDub3Munu" target="_blank" rel="noopener">Chosen version on Suno ↗</a>
          </article>
        </div>
        <audio id="armandoHistoryAudio" preload="metadata"></audio>
      </details>`;
    anchor.before(section);

    const drawer=section.querySelector('.armando-history-drawer');
    drawer?.addEventListener('toggle',()=>{
      const b=drawer.querySelector('summary b');
      if(b)b.textContent=drawer.open?'−':'+';
    });

    const historyAudio=section.querySelector('#armandoHistoryAudio');
    let activeButton=null;
    section.querySelectorAll('.history-audio').forEach(button=>button.addEventListener('click',()=>{
      const src=button.dataset.processSrc;
      if(!src||!historyAudio)return;
      const same=historyAudio.dataset.src===src;
      if(same&&!historyAudio.paused){historyAudio.pause();return;}
      document.getElementById('pulseAudio')?.pause();
      if(!same){historyAudio.src=src;historyAudio.dataset.src=src;}
      activeButton=button;
      historyAudio.play().catch(()=>{});
    }));
    historyAudio?.addEventListener('play',()=>{if(activeButton)activeButton.textContent='❚❚ Pause earlier mix'});
    historyAudio?.addEventListener('pause',()=>{if(activeButton)activeButton.textContent='▶ Play earlier mix'});
    historyAudio?.addEventListener('ended',()=>{if(activeButton)activeButton.textContent='▶ Play earlier mix'});
  }

  window.CMDShare={mount,nativeShare};
  document.querySelectorAll('[data-share]').forEach(mount);
  mountArmandoHistory();
})();
