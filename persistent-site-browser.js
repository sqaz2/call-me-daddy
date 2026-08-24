(()=>{
  if(window.top!==window.self || window.CMDPersistentSite)return;

  const originUrl=location.href;
  let overlay=null,frame=null,session=false,internalNav=false,clearanceRaf=0,clearanceObserver=null;

  const playingAudio=()=>[...document.querySelectorAll('audio')].find(a=>!a.paused&&!a.ended);
  const hasSession=()=>session||Boolean(playingAudio());
  const playerSelectors=[
    '.catalog-player:not([hidden])',
    '.sad-player:not([hidden])',
    '.sad-song-player:not([hidden])',
    '.trilogy-player-shell:not([hidden])',
    '#pickPlayer:not([hidden])',
    '#oftPlayer:not([hidden])',
    '#armandoPlayer:not([hidden])',
    '#wifiPlayer:not([hidden])',
    '.player:not([hidden])'
  ];

  const visibleBottomClearance=(doc,view)=>{
    if(!doc||!view)return 0;
    const vh=view.innerHeight||document.documentElement.clientHeight||0;
    let clearance=0;
    const seen=new Set();
    playerSelectors.forEach(selector=>{
      doc.querySelectorAll(selector).forEach(el=>{
        if(seen.has(el))return;
        seen.add(el);
        const cs=view.getComputedStyle(el);
        if(cs.display==='none'||cs.visibility==='hidden'||Number(cs.opacity)===0)return;
        const r=el.getBoundingClientRect();
        if(r.width<40||r.height<24||r.bottom<vh-36||r.top>=vh)return;
        clearance=Math.max(clearance,Math.max(0,vh-r.top)+10);
      });
    });
    return clearance;
  };

  const updatePillClearance=()=>{
    clearanceRaf=0;
    if(!overlay?.classList.contains('is-open'))return;
    const pill=overlay.querySelector('.cmd-site-session-pill');
    if(!pill)return;
    let clearance=0;
    try{clearance=Math.max(clearance,visibleBottomClearance(frame?.contentDocument,frame?.contentWindow));}catch{}
    const cap=Math.max(0,(window.innerHeight||0)-100);
    pill.style.setProperty('--cmd-player-clearance',`${Math.min(clearance,cap)}px`);
  };

  const scheduleClearance=()=>{
    if(clearanceRaf)return;
    clearanceRaf=requestAnimationFrame(updatePillClearance);
  };

  const watchFrameLayout=()=>{
    clearanceObserver?.disconnect();
    clearanceObserver=null;
    try{
      const body=frame?.contentDocument?.body;
      if(!body)return;
      clearanceObserver=new MutationObserver(scheduleClearance);
      clearanceObserver.observe(body,{subtree:true,attributes:true,attributeFilter:['class','hidden','style']});
    }catch{}
    scheduleClearance();
  };

  const ensureOverlay=()=>{
    if(overlay)return;
    const style=document.createElement('style');
    style.textContent=`
      .cmd-site-view{position:fixed;inset:0;z-index:2147482000;background:#070707;display:none}
      .cmd-site-view.is-open{display:block}
      .cmd-site-frame{position:absolute;inset:0;width:100%;height:100%;border:0;background:#080808}
      .cmd-site-session-pill{position:absolute;z-index:3;right:max(12px,env(safe-area-inset-right));bottom:calc(max(12px,env(safe-area-inset-bottom)) + var(--cmd-player-clearance,0px));display:flex;align-items:center;gap:8px;min-height:40px;padding:0 12px;border:1px solid rgba(255,255,255,.18);border-radius:999px;background:rgba(8,8,8,.86);backdrop-filter:blur(14px);box-shadow:0 10px 35px rgba(0,0,0,.38);color:#f4f0e8;font:800 12px/1 system-ui,sans-serif;letter-spacing:.04em;transition:bottom .18s ease}
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
    frame.addEventListener('load',()=>{bindFrame();watchFrameLayout();});
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
    scheduleClearance();
  };

  function closeView({historyBack=false}={}){
    if(!overlay)return;
    overlay.classList.remove('is-open');
    document.documentElement.style.overflow='';
    clearanceObserver?.disconnect();
    clearanceObserver=null;
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

  addEventListener('resize',scheduleClearance,{passive:true});
  addEventListener('orientationchange',scheduleClearance,{passive:true});
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
    refreshClearance:scheduleClearance,
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