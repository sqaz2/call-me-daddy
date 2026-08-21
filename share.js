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

  window.CMDShare={mount,nativeShare};
  document.querySelectorAll('[data-share]').forEach(mount);
})();
