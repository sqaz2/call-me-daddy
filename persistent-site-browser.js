(()=>{
  if(window.top!==window.self || window.CMDPersistentSite)return;

  const originUrl=location.href;
  let overlay=null,frame=null,session=false,internalNav=false;

  const playingAudio=()=>[...document.querySelectorAll('audio')].find(a=>!a.paused&&!a.ended);
  const hasSession=()=>session||Boolean(playingAudio());

  const ensureOverlay=()=>{
    if(overlay)return;
    const style=document.createElement('style');
    style.textContent=`
      .cmd-site-view{position:fixed;inset:0;z-index:2147482000;background:#070707;display:none}
      .cmd-site-view.is-open{display:block}
      .cmd-site-frame{position:absolute;inset:0;width:100%;height:100%;border:0;background:#080808}
      .cmd-site-session-pill{position:absolute;z-index:3;right:max(12px,env(safe-area-inset-right));bottom:max(12px,env(safe-area-inset-bottom));display:flex;align-items:center;gap:8px;min-height:40px;padding:0 12px;border:1px solid rgba(255,255,255,.18);border-radius:999px;background:rgba(8,8,8,.86);backdrop-filter:blur(14px);box-shadow:0 10px 35px rgba(0,0,0,.38);color:#f4f0e8;font:800 12px/1 system-ui,sans-serif;letter-spacing:.04em}
      .cmd-site-session-pill button{width:28px;height:28px;border:0;border-radius:50%;background:rgba(255,255,255,.1);color:#fff;font:700 16px/1 system-ui;cursor:pointer}
      .cmd-now-song-link{display:inline-flex;align-items:center;justify-content:center;margin-top:10px;min-height:34px;padding:0 12px;border:1px solid rgba(255,255,255,.16);border-radius:999px;background:rgba(255,255,255,.045);color:#f4f0e8;text-decoration:none;font:850 11px/1 system-ui,sans-serif;letter-spacing:.06em;text-transform:uppercase}
      .cmd-now-song-link[hidden]{display:none!important}
    `;
    document.head.appendChild(style);

    overlay=document.createElement('div');
    overlay.className='cmd-site-view';
    overlay.innerHTML='<iframe class="cmd-site-frame" title="Call Me Daddy site"></iframe><div class="cmd-site-session-pill"><span>♪ music continues</span><button type="button" aria-label="Return to player">×</button></div>';
    document.body.appendChild(overlay);
    frame=overlay.querySelector('iframe');
    overlay.querySelector('button').addEventListener('click',closeView);
    frame.addEventListener('load',bindFrame);
  };

  const sameOriginUrl=value=>{
    try{const u=new URL(value,location.href);return u.origin===location.origin?u:null}catch{return null}
  };

  const openView=(url,{push=true}={})=>{
    ensureOverlay();
    session=true;
    overlay.classList.add('is-open');
    document.documentElement.style.overflow='hidden';
    if(push&&!internalNav)history.pushState({cmdView:url.href},'',url.href);
    internalNav=false;
    frame.src=url.href;
  };

  function closeView({historyBack=false}={}){
    if(!overlay)return;
    overlay.classList.remove('is-open');
    document.documentElement.style.overflow='';
    if(!historyBack){
      internalNav=true;
      history.pushState({cmdHome:true},'',originUrl);
      internalNav=false;
    }
  }

  const navigateInside=url=>{
    if(!frame)return;
    history.pushState({cmdView:url.href},'',url.href);
    frame.src=url.href;
  };

  const bindFrame=()=>{
    try{
      const doc=frame.contentDocument;
      if(!doc)return;
      doc.addEventListener('click',e=>{
        const a=e.target.closest('a[href]');
        if(!a||a.target||a.hasAttribute('download'))return;
        const url=sameOriginUrl(a.href);
        if(!url)return;
        const frameUrl=new URL(frame.contentWindow.location.href);
        if(url.pathname===frameUrl.pathname&&url.search===frameUrl.search&&url.hash)return;
        e.preventDefault();
        navigateInside(url);
      },true);
    }catch{}
  };

  document.addEventListener('play',e=>{
    if(e.target instanceof HTMLAudioElement)session=true;
  },true);

  document.addEventListener('click',e=>{
    if(!hasSession())return;
    const a=e.target.closest('a[href]');
    if(!a||a.target||a.hasAttribute('download'))return;
    const url=sameOriginUrl(a.href);
    if(!url)return;
    const here=new URL(originUrl);
    if(url.pathname===here.pathname&&url.search===here.search&&url.hash)return;
    e.preventDefault();
    openView(url);
  },true);

  addEventListener('popstate',e=>{
    if(!overlay?.classList.contains('is-open'))return;
    const target=e.state?.cmdView;
    if(target){
      internalNav=true;
      frame.src=target;
      internalNav=false;
    }else closeView({historyBack:true});
  });

  window.CMDPersistentSite={
    open:url=>{const u=sameOriginUrl(url);if(u)openView(u)},
    setSession:value=>{session=Boolean(value)},
    makeSongLink(container,track,{show=false}={}){
      if(!container)return null;
      let link=container.querySelector('.cmd-now-song-link');
      if(!link){link=document.createElement('a');link.className='cmd-now-song-link';link.textContent='Open this song →';container.appendChild(link)}
      const href=track?.experience||'';
      link.hidden=!(show&&href);
      if(href)link.href=href;
      return link;
    }
  };
})();