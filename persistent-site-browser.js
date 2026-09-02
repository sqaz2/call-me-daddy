(()=>{
  const VERSION='20260902-1';
  const CLAIM='cmd:claim-playback';
  const PAUSE='cmd:pause-playback';
  const REFRESH='cmd:refresh-clearance';
  const OPEN='cmd:open-site';
  const FOLLOW='cmd:follow-track-page';
  const CANCEL_FOLLOW='cmd:cancel-track-page-follow';
  const isAudibleMedia=el=>el instanceof HTMLAudioElement||(el instanceof HTMLVideoElement&&!el.muted);
  const portableTrack=track=>track?['title','artist','cover','experience'].reduce((copy,key)=>{if(track[key]!==undefined)copy[key]=track[key];return copy},{}):null;
  const absoluteMedia=value=>{if(!value)return'';try{return new URL(value,location.href).href}catch{return String(value)}};
  const followedMediaSources=new WeakMap();
  const catalogTrackForMedia=media=>{
    const source=absoluteMedia(media?.currentSrc||media?.src);
    if(!source||followedMediaSources.get(media)===source)return null;
    followedMediaSources.set(media,source);
    const catalogs=[window.CMD_SONGS,window.CMD_ARCHIVE_CATALOG].filter(Array.isArray);
    for(const song of catalogs.flat()){
      const versions=[song,...(Array.isArray(song?.variants)?song.variants:[])];
      const version=versions.find(item=>absoluteMedia(item?.audio||item?.src||item?.expectedPath)===source);
      if(version&&song?.experience)return portableTrack({...song,...version,title:song.title,artist:song.artist,cover:version.cover||song.cover,experience:song.experience});
    }
    return null;
  };

  if(window.top!==window.self){
    if(window.CMDPersistentSite?.version===VERSION)return;

    const pauseLocal=()=>{
      document.querySelectorAll('audio,video').forEach(el=>{
        if(!isAudibleMedia(el))return;
        try{el.pause()}catch{}
      });
      document.dispatchEvent(new CustomEvent('cmd:persistent-pause'));
    };
    const claimPlayback=()=>{
      try{window.parent.postMessage({type:CLAIM},location.origin)}catch{}
    };
    const refresh=()=>{
      try{window.parent.postMessage({type:REFRESH},location.origin)}catch{}
    };
    const open=url=>{
      try{window.parent.postMessage({type:OPEN,url:String(url||'')},location.origin)}catch{location.href=url}
    };
    const followTrack=(track,{seconds=5,reason='next'}={})=>{
      try{window.parent.postMessage({type:FOLLOW,track:portableTrack(track),seconds,reason},location.origin)}catch{}
    };
    const cancelFollow=()=>{try{window.parent.postMessage({type:CANCEL_FOLLOW},location.origin)}catch{}};

    addEventListener('message',event=>{
      if(event.origin!==location.origin)return;
      if(event.data?.type===PAUSE)pauseLocal();
    });
    document.addEventListener('play',event=>{
      if(!isAudibleMedia(event.target))return;
      claimPlayback();
      if(!event.target.__cmdContinuousPlayback){const track=catalogTrackForMedia(event.target);if(track)followTrack(track)}
    },true);

    window.CMDPersistentSite={
      version:VERSION,
      setSession:value=>{if(value)claimPlayback()},
      claimPlayback,
      refreshClearance:refresh,
      open,
      followTrack,
      cancelFollow,
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
    return;
  }

  if(window.CMDPersistentSite?.version===VERSION)return;

  const originUrl=location.href;
  const initialReferrer=(()=>{try{const u=new URL(document.referrer);return u.origin===location.origin?u.href:''}catch{return''}})();
  let overlay=null,viewFrame=null,ownerWindow=window,session=false,internalNav=false,clearanceRaf=0,clearanceObserver=null,resumePrompt=null;
  let followPrompt=null,followTimer=0,followTarget=null,followSourceFrame=null,followDeadline=0;
  let backGuardArmed=false;
  const frames=new Set();
  const PLAYBACK_KEY='cmd:playback-session:v1';

  const readPlaybackSnapshot=()=>{try{const snapshot=JSON.parse(sessionStorage.getItem(PLAYBACK_KEY)||'null');return snapshot&&snapshot.wantsPlayback&&Date.now()-snapshot.updatedAt<12*60*60*1000?snapshot:null}catch{return null}};
  const removeResumePrompt=()=>{resumePrompt?.remove();resumePrompt=null};
  const offerPlaybackResume=()=>{
    const snapshot=readPlaybackSnapshot();
    if(!snapshot?.page||new URLSearchParams(location.search).get('cmdResume')==='1')return;
    let target;try{target=new URL(snapshot.page,location.origin)}catch{return}
    if(target.pathname===location.pathname&&target.search===location.search)return;
    const mount=()=>{
      if(resumePrompt||playingMediaIn(window))return;
      const style=document.createElement('style');
      style.textContent='.cmd-resume-music{position:fixed;z-index:2147483600;left:max(12px,env(safe-area-inset-left));right:max(12px,env(safe-area-inset-right));bottom:max(12px,env(safe-area-inset-bottom));display:flex;align-items:center;gap:10px;max-width:520px;margin:auto;padding:10px;border:1px solid rgba(255,255,255,.2);border-radius:18px;background:rgba(8,8,8,.94);backdrop-filter:blur(16px);box-shadow:0 12px 38px rgba(0,0,0,.5);color:#f4f0e8;font:800 12px/1.25 system-ui,sans-serif}.cmd-resume-music strong{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.cmd-resume-music button{min-height:38px;border:0;border-radius:999px;padding:0 15px;background:#f4f0e8;color:#080808;font:900 12px/1 system-ui,sans-serif;cursor:pointer}.cmd-resume-music .cmd-resume-dismiss{width:34px;padding:0;background:rgba(255,255,255,.1);color:#fff}';
      document.head.appendChild(style);
      resumePrompt=document.createElement('div');resumePrompt.className='cmd-resume-music';resumePrompt.setAttribute('role','region');resumePrompt.setAttribute('aria-label','Resume music');
      const title=document.createElement('strong');title.textContent=`♪ ${snapshot.track?.title||'Your music'}`;
      const resume=document.createElement('button');resume.type='button';resume.textContent='Resume music';resume.addEventListener('click',()=>{target.searchParams.set('cmdResume','1');location.href=target.href});
      const dismiss=document.createElement('button');dismiss.type='button';dismiss.className='cmd-resume-dismiss';dismiss.setAttribute('aria-label','Dismiss resume music');dismiss.textContent='×';dismiss.addEventListener('click',()=>{try{sessionStorage.setItem(PLAYBACK_KEY,JSON.stringify({...snapshot,wantsPlayback:false,updatedAt:Date.now()}))}catch{}removeResumePrompt()});
      resumePrompt.append(title,resume,dismiss);document.body.appendChild(resumePrompt);
    };
    if(document.body)mount();else addEventListener('DOMContentLoaded',mount,{once:true});
  };

  const playerSelectors=[
    '.catalog-player:not([hidden])','.sad-player:not([hidden])','.sad-song-player:not([hidden])',
    '.trilogy-player-shell:not([hidden])','#pickPlayer:not([hidden])','#oftPlayer:not([hidden])',
    '#armandoPlayer:not([hidden])','#wifiPlayer:not([hidden])','#tismPlayer:not([hidden])','.archive-player:not([hidden])','.player:not([hidden])'
  ];

  const sameOriginUrl=value=>{
    try{const u=new URL(value,location.href);return u.origin===location.origin?u:null}catch{return null}
  };

  const visibleUrl=()=>{
    if(overlay?.classList.contains('is-open')&&viewFrame){try{return new URL(viewFrame.contentWindow.location.href)}catch{}}
    return new URL(location.href);
  };
  const samePage=(left,right)=>left.pathname===right.pathname&&left.search===right.search;
  const clearFollowTimer=()=>{if(followTimer){clearInterval(followTimer);followTimer=0}};
  const removeFollowPrompt=()=>{
    clearFollowTimer();
    followPrompt?.remove();
    followPrompt=null;followTarget=null;followSourceFrame=null;followDeadline=0;
  };
  const ensureFollowStyle=()=>{
    if(document.getElementById('cmd-follow-music-style'))return;
    const style=document.createElement('style');style.id='cmd-follow-music-style';
    style.textContent=`
      .cmd-follow-music{position:fixed;z-index:2147483700;top:calc(max(12px,env(safe-area-inset-top)) + 62px);right:max(12px,env(safe-area-inset-right));width:min(420px,calc(100% - 24px));overflow:hidden;border:1px solid rgba(255,255,255,.2);border-radius:20px;background:rgba(8,8,8,.95);backdrop-filter:blur(18px);box-shadow:0 18px 55px rgba(0,0,0,.58);color:#f4f0e8;font-family:system-ui,sans-serif}
      .cmd-follow-music-main{display:grid;grid-template-columns:58px minmax(0,1fr);gap:12px;padding:12px 12px 10px}
      .cmd-follow-music img{width:58px;height:58px;border-radius:11px;object-fit:cover;background:#191919}
      .cmd-follow-music-copy{min-width:0;align-self:center}.cmd-follow-music-copy small{display:block;color:#d7b266;font:900 10px/1.15 system-ui,sans-serif;letter-spacing:.16em;text-transform:uppercase}.cmd-follow-music-copy strong{display:block;margin-top:5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font:900 15px/1.2 system-ui,sans-serif}.cmd-follow-music-copy span{display:block;margin-top:5px;color:#c9c3ba;font:700 12px/1.25 system-ui,sans-serif}
      .cmd-follow-music-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:0 12px 12px}.cmd-follow-music button{min-height:40px;border:1px solid rgba(255,255,255,.16);border-radius:999px;background:rgba(255,255,255,.08);color:#fff;font:900 12px/1 system-ui,sans-serif;cursor:pointer}.cmd-follow-music .cmd-follow-now{border-color:#f4f0e8;background:#f4f0e8;color:#080808}
      .cmd-follow-music-progress{height:3px;background:rgba(255,255,255,.12)}.cmd-follow-music-progress span{display:block;width:100%;height:100%;background:linear-gradient(90deg,#d7b266,#fff);transform-origin:left center}
      @media(max-width:520px){.cmd-follow-music{top:calc(max(12px,env(safe-area-inset-top)) + 52px);right:12px}}
      @media(prefers-reduced-motion:reduce){.cmd-follow-music-progress span{transition:none}}
    `;
    document.head.appendChild(style);
  };
  const openFollowTarget=()=>{
    const target=followTarget,sourceFrame=followSourceFrame;
    if(!target)return;
    removeFollowPrompt();
    if(samePage(visibleUrl(),target))return;
    if(sourceFrame&&frames.has(sourceFrame))navigateInside(sourceFrame,target);
    else openView(target);
  };
  const scheduleFollow=(track,{seconds=5,sourceFrame=null}={})=>{
    const target=sameOriginUrl(track?.experience);
    if(target&&followTarget&&samePage(followTarget,target))return true;
    removeFollowPrompt();
    if(!target||samePage(visibleUrl(),target))return false;
    ensureFollowStyle();
    const delay=Math.max(3,Math.min(15,Number(seconds)||5));
    followTarget=target;followSourceFrame=sourceFrame;followDeadline=Date.now()+delay*1000;
    followPrompt=document.createElement('section');followPrompt.className='cmd-follow-music';followPrompt.setAttribute('role','region');followPrompt.setAttribute('aria-label','Follow the music to its song page');
    const main=document.createElement('div');main.className='cmd-follow-music-main';
    if(track.cover){const cover=document.createElement('img');cover.src=track.cover;cover.alt='';main.appendChild(cover)}
    const copy=document.createElement('div');copy.className='cmd-follow-music-copy';
    const label=document.createElement('small');label.textContent='Up next';
    const title=document.createElement('strong');title.textContent=track.title||'This song';
    const countdown=document.createElement('span');countdown.setAttribute('aria-live','polite');
    copy.append(label,title,countdown);main.appendChild(copy);
    const actions=document.createElement('div');actions.className='cmd-follow-music-actions';
    const stay=document.createElement('button');stay.type='button';stay.textContent='Stay here';stay.addEventListener('click',removeFollowPrompt);
    const now=document.createElement('button');now.type='button';now.className='cmd-follow-now';now.textContent='Open now';now.addEventListener('click',openFollowTarget);
    actions.append(stay,now);
    const progress=document.createElement('div');progress.className='cmd-follow-music-progress';const fill=document.createElement('span');progress.appendChild(fill);
    followPrompt.append(main,actions,progress);document.body.appendChild(followPrompt);
    let lastSecond=-1;
    const update=()=>{
      const remaining=Math.max(0,followDeadline-Date.now());
      const second=Math.max(1,Math.ceil(remaining/1000));
      if(second!==lastSecond){lastSecond=second;countdown.textContent=`Following the music in ${second}`}
      fill.style.transform=`scaleX(${remaining/(delay*1000)})`;
      if(remaining<=0)openFollowTarget();
    };
    update();followTimer=setInterval(update,200);
    return true;
  };

  const armBackGuard=()=>{
    if(backGuardArmed||!initialReferrer)return;
    const target=sameOriginUrl(initialReferrer);
    if(!target)return;
    backGuardArmed=true;
    try{
      const current=history.state&&typeof history.state==='object'?history.state:{};
      history.replaceState({...current,cmdOwnerBase:true,cmdBackTarget:target.href},'',location.href);
      history.pushState({cmdOwnerGuard:true,cmdBackTarget:target.href},'',location.href);
    }catch{}
  };

  const playingMediaIn=win=>{
    try{return [...win.document.querySelectorAll('audio,video')].find(el=>isAudibleMedia(el)&&!el.paused&&!el.ended)||null}catch{return null}
  };
  const ownerIsActive=()=>ownerWindow!==window?session:Boolean(playingMediaIn(window)||session);

  const pauseWindow=win=>{
    if(!win)return;
    if(win===window){
      document.querySelectorAll('audio,video').forEach(el=>{
        if(!isAudibleMedia(el))return;
        try{el.pause()}catch{}
      });
      document.dispatchEvent(new CustomEvent('cmd:persistent-pause'));
      return;
    }
    try{win.postMessage({type:PAUSE},location.origin)}catch{}
    try{
      win.document.querySelectorAll('audio,video').forEach(el=>{
        if(!isAudibleMedia(el))return;
        try{el.pause()}catch{}
      });
      win.document.dispatchEvent(new CustomEvent('cmd:persistent-pause'));
    }catch{}
  };

  const frameForWindow=win=>[...frames].find(f=>f.contentWindow===win)||null;

  const cleanupFrames=()=>{
    const ownerFrame=frameForWindow(ownerWindow);
    [...frames].forEach(frame=>{
      if(frame===viewFrame||frame===ownerFrame)return;
      frame.remove();
      frames.delete(frame);
    });
  };

  const updatePillState=()=>{
    if(!overlay)return;
    const pill=overlay.querySelector('.cmd-site-session-pill');
    if(!pill)return;
    const viewOwns=viewFrame&&viewFrame.contentWindow===ownerWindow;
    pill.hidden=!overlay.classList.contains('is-open')||!session||Boolean(viewOwns);
  };

  const claimOwner=win=>{
    if(!win)return;
    removeResumePrompt();
    if(ownerWindow!==win)pauseWindow(ownerWindow);
    ownerWindow=win;
    session=true;
    if(win===window)armBackGuard();
    cleanupFrames();
    updatePillState();
    scheduleClearance();
  };

  const visibleBottomClearance=(doc,view)=>{
    if(!doc||!view)return 0;
    const vh=view.innerHeight||document.documentElement.clientHeight||0;
    let clearance=0;
    const seen=new Set();
    playerSelectors.forEach(selector=>{
      doc.querySelectorAll(selector).forEach(el=>{
        if(seen.has(el))return;seen.add(el);
        const cs=view.getComputedStyle(el),r=el.getBoundingClientRect();
        if(cs.display==='none'||cs.visibility==='hidden'||Number(cs.opacity)===0)return;
        if(r.width<40||r.height<24||r.bottom<vh-36||r.top>=vh)return;
        clearance=Math.max(clearance,Math.max(0,vh-r.top)+10);
      });
    });
    return clearance;
  };

  const updatePillClearance=()=>{
    clearanceRaf=0;
    if(!overlay?.classList.contains('is-open'))return;
    const pill=overlay.querySelector('.cmd-site-session-pill');if(!pill)return;
    let clearance=0;
    try{clearance=Math.max(clearance,visibleBottomClearance(viewFrame?.contentDocument,viewFrame?.contentWindow))}catch{}
    const cap=Math.max(0,(window.innerHeight||0)-100);
    pill.style.setProperty('--cmd-player-clearance',`${Math.min(clearance,cap)}px`);
    updatePillState();
  };
  function scheduleClearance(){if(clearanceRaf)return;clearanceRaf=requestAnimationFrame(updatePillClearance)}

  const watchFrameLayout=()=>{
    clearanceObserver?.disconnect();clearanceObserver=null;
    try{
      const body=viewFrame?.contentDocument?.body;if(!body)return;
      clearanceObserver=new MutationObserver(scheduleClearance);
      clearanceObserver.observe(body,{subtree:true,attributes:true,attributeFilter:['class','hidden','style']});
    }catch{}
    scheduleClearance();
  };

  const bindFrame=frame=>{
    try{
      const doc=frame.contentDocument;if(!doc)return;
      doc.addEventListener('play',event=>{if(isAudibleMedia(event.target))claimOwner(frame.contentWindow)},true);
      doc.addEventListener('click',event=>{
        const a=event.target.closest('a[href]');
        if(!a||a.target||a.hasAttribute('download'))return;
        const url=sameOriginUrl(a.href);if(!url)return;
        const frameUrl=new URL(frame.contentWindow.location.href);
        if(url.pathname===frameUrl.pathname&&url.search===frameUrl.search&&url.hash)return;
        event.preventDefault();
        navigateInside(frame,url);
      },true);
    }catch{}
  };

  const makeFrame=url=>{
    ensureOverlay();
    const frame=document.createElement('iframe');
    frame.className='cmd-site-frame';
    frame.title='Call Me Daddy site';
    frame.style.zIndex=String(1+frames.size);
    overlay.insertBefore(frame,overlay.querySelector('.cmd-site-session-pill'));
    frames.add(frame);viewFrame=frame;
    frame.addEventListener('load',()=>{bindFrame(frame);watchFrameLayout();updatePillState()});
    frame.src=url.href;
    cleanupFrames();
    return frame;
  };

  const ensureOverlay=()=>{
    if(overlay)return;
    const style=document.createElement('style');
    style.textContent=`
      .cmd-site-view{position:fixed;inset:0;z-index:2147482000;background:#070707;display:none}
      .cmd-site-view.is-open{display:block}
      .cmd-site-frame{position:absolute;inset:0;width:100%;height:100%;border:0;background:#080808}
      .cmd-site-session-pill{position:absolute;z-index:2147483000;right:max(12px,env(safe-area-inset-right));bottom:calc(max(12px,env(safe-area-inset-bottom)) + var(--cmd-player-clearance,0px));display:flex;align-items:center;gap:8px;min-height:40px;padding:0 12px;border:1px solid rgba(255,255,255,.18);border-radius:999px;background:rgba(8,8,8,.86);backdrop-filter:blur(14px);box-shadow:0 10px 35px rgba(0,0,0,.38);color:#f4f0e8;font:800 12px/1 system-ui,sans-serif;letter-spacing:.04em;transition:bottom .18s ease}
      .cmd-site-session-pill[hidden]{display:none!important}
      .cmd-site-session-pill button{width:28px;height:28px;border:0;border-radius:50%;background:rgba(255,255,255,.1);color:#fff;font:700 16px/1 system-ui;cursor:pointer}
      .cmd-now-song-link{display:inline-flex;align-items:center;justify-content:center;margin-top:10px;min-height:34px;padding:0 12px;border:1px solid rgba(255,255,255,.16);border-radius:999px;background:rgba(255,255,255,.045);color:#f4f0e8;text-decoration:none;font:850 11px/1 system-ui,sans-serif;letter-spacing:.06em;text-transform:uppercase}
      .cmd-now-song-link[hidden]{display:none!important}
    `;
    document.head.appendChild(style);
    overlay=document.createElement('div');overlay.className='cmd-site-view';
    overlay.innerHTML='<div class="cmd-site-session-pill" hidden><span>♪ music continues</span><button type="button" aria-label="Return to player">×</button></div>';
    document.body.appendChild(overlay);
    overlay.querySelector('button').addEventListener('click',returnToOwner);
  };

  const openView=(url,{push=true}={})=>{
    ensureOverlay();session=true;overlay.classList.add('is-open');document.documentElement.style.overflow='hidden';
    if(push&&!internalNav)history.pushState({cmdView:url.href},'',url.href);
    internalNav=false;
    if(viewFrame&&viewFrame.contentWindow!==ownerWindow){viewFrame.src=url.href}else makeFrame(url);
    updatePillState();scheduleClearance();
  };

  function openBackTarget(url){
    ensureOverlay();session=true;overlay.classList.add('is-open');document.documentElement.style.overflow='hidden';
    try{history.pushState({cmdView:url.href,cmdBackView:true},'',url.href)}catch{}
    makeFrame(url);
    updatePillState();scheduleClearance();
  }

  function returnToOwner(){
    if(ownerWindow===window){closeView();return}
    const ownerFrame=frameForWindow(ownerWindow);if(!ownerFrame)return;
    [...frames].forEach(frame=>{if(frame!==ownerFrame){frame.remove();frames.delete(frame)}});
    viewFrame=ownerFrame;ownerFrame.style.zIndex='1';
    updatePillState();watchFrameLayout();
  }

  function closeView({historyBack=false}={}){
    if(!overlay)return;
    if(ownerWindow!==window){returnToOwner();return}
    overlay.classList.remove('is-open');document.documentElement.style.overflow='';
    clearanceObserver?.disconnect();clearanceObserver=null;
    [...frames].forEach(f=>f.remove());frames.clear();viewFrame=null;
    if(!historyBack){internalNav=true;history.pushState({cmdHome:true},'',originUrl);internalNav=false}
  }

  function navigateInside(fromFrame,url){
    history.pushState({cmdView:url.href},'',url.href);
    if(fromFrame.contentWindow===ownerWindow){makeFrame(url)}
    else{viewFrame=fromFrame;fromFrame.src=url.href}
    updatePillState();
  }

  document.addEventListener('play',event=>{
    if(!isAudibleMedia(event.target))return;
    claimOwner(window);
    if(!event.target.__cmdContinuousPlayback){const track=catalogTrackForMedia(event.target);if(track)scheduleFollow(track)}
  },true);
  document.addEventListener('click',event=>{
    if(!ownerIsActive())return;
    const a=event.target.closest('a[href]');if(!a||a.target||a.hasAttribute('download'))return;
    const url=sameOriginUrl(a.href);if(!url)return;
    const here=new URL(originUrl);if(url.pathname===here.pathname&&url.search===here.search&&url.hash)return;
    event.preventDefault();openView(url);
  },true);

  addEventListener('message',event=>{
    if(event.origin!==location.origin)return;
    if(event.data?.type===CLAIM){
      const frame=[...frames].find(f=>f.contentWindow===event.source);
      if(frame)claimOwner(frame.contentWindow);
    }else if(event.data?.type===REFRESH)scheduleClearance();
    else if(event.data?.type===OPEN){
      const frame=[...frames].find(f=>f.contentWindow===event.source),url=sameOriginUrl(event.data.url);
      if(frame&&url)navigateInside(frame,url);
    }else if(event.data?.type===FOLLOW){
      const frame=[...frames].find(f=>f.contentWindow===event.source);
      if(frame)scheduleFollow(event.data.track,{seconds:event.data.seconds,sourceFrame:frame});
    }else if(event.data?.type===CANCEL_FOLLOW)removeFollowPrompt();
  });
  addEventListener('resize',scheduleClearance,{passive:true});
  addEventListener('orientationchange',scheduleClearance,{passive:true});
  addEventListener('popstate',event=>{
    const overlayOpen=Boolean(overlay?.classList.contains('is-open'));
    if(!overlayOpen){
      if(session&&ownerWindow===window&&event.state?.cmdOwnerBase){
        const url=sameOriginUrl(event.state.cmdBackTarget||initialReferrer);
        if(url){openBackTarget(url);return}
      }
      return;
    }
    const target=event.state?.cmdView;
    if(target){const url=sameOriginUrl(target);if(url)openView(url,{push:false})}
    else if(ownerWindow===window)closeView({historyBack:true});
    else returnToOwner();
  });

  window.CMDPersistentSite={
    version:VERSION,
    open:url=>{const u=sameOriginUrl(url);if(u)openView(u)},
    followTrack:(track,options={})=>scheduleFollow(portableTrack(track),options),
    cancelFollow:removeFollowPrompt,
    setSession:value=>{session=Boolean(value);if(value)claimOwner(window);updatePillState()},
    claimPlayback:()=>claimOwner(window),
    refreshClearance:scheduleClearance,
    makeSongLink(container,track,{show=false}={}){
      if(!container)return null;
      let link=container.querySelector('.cmd-now-song-link');
      if(!link){link=document.createElement('a');link.className='cmd-now-song-link';link.textContent='Open this song →';container.appendChild(link)}
      const href=track?.experience||'';link.hidden=!(show&&href);if(href)link.href=href;return link;
    }
  };
  offerPlaybackResume();
})();
