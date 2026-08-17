(()=>{
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const root=document.documentElement;

  const endLoop=document.getElementById('endLoop');
  if(endLoop&&!document.querySelector('link[href*="/cut-from-the-same-fabric/echo.css"]')){
    const link=document.createElement('link');
    link.rel='stylesheet';
    link.href='/cut-from-the-same-fabric/echo.css';
    link.dataset.echoStyle='1';
    document.head.appendChild(link);
  }

  if(!reduced){
    let raf=0;
    const updateGlobal=(x,y)=>{
      cancelAnimationFrame(raf);
      raf=requestAnimationFrame(()=>{
        root.style.setProperty('--cursor-x',`${(x/window.innerWidth-.5)*10}px`);
        root.style.setProperty('--cursor-y',`${(y/window.innerHeight-.5)*10}px`);
      });
    };

    window.addEventListener('pointermove',e=>{
      if(e.pointerType==='touch')return;
      updateGlobal(e.clientX,e.clientY);
    },{passive:true});

    document.querySelectorAll('.hero-art,.card,.choice,.seq').forEach(el=>{
      el.addEventListener('pointermove',e=>{
        if(e.pointerType==='touch')return;
        const r=el.getBoundingClientRect();
        const px=(e.clientX-r.left)/r.width-.5;
        const py=(e.clientY-r.top)/r.height-.5;
        el.style.setProperty('--ry',`${px*2.8}deg`);
        el.style.setProperty('--rx',`${py*-2.8}deg`);
      },{passive:true});
      el.addEventListener('pointerleave',()=>{
        el.style.setProperty('--ry','0deg');
        el.style.setProperty('--rx','0deg');
      });
    });

    const onScroll=()=>{
      const y=window.scrollY;
      root.style.setProperty('--scroll-drift',`${Math.min(y*.01,10)}px`);
      const echo=document.querySelector('.echo-film');
      if(echo){
        const d=(window.innerHeight*.5-echo.getBoundingClientRect().top)*.018;
        root.style.setProperty('--echo-drift',`${Math.max(-12,Math.min(12,d))}px`);
      }
    };
    window.addEventListener('scroll',onScroll,{passive:true});
    onScroll();
  }

  const soundButton=document.getElementById('echoSound');
  if(!endLoop)return;

  const echoFilm=endLoop.closest('.echo-film');
  const echoWrap=endLoop.closest('.echo-film-wrap');
  const echoCopy=echoFilm?.querySelector('.echo-film-copy');
  const echoShade=echoFilm?.querySelector('.echo-film-shade');
  const music=document.getElementById('audio');
  const crossfadeMusic=document.getElementById('crossfadeAudio');
  const heroVideo=document.querySelector('.project-poster');
  const cinemaKey='cftsf-ending-cinema-used';

  let clipStart=0;
  let shortStart=0;
  let shortEnd=0;
  let cinematicActive=false;
  let transitioning=false;
  let cinematicUsed=false;
  let returnRect=null;

  let endLoopLoadRequested=false;
  let heroInView=true;

  try{
    cinematicUsed=sessionStorage.getItem(cinemaKey)==='1';
  }catch(_){ }

  const ensureEndLoopLoaded=()=>{
    if(endLoopLoadRequested)return;
    const src=endLoop.dataset.src;
    if(!src)return;
    endLoopLoadRequested=true;
    endLoop.src=src;
    endLoop.removeAttribute('data-src');
    endLoop.load();
  };

  const setClip=()=>{
    if(!Number.isFinite(endLoop.duration)||!endLoop.duration)return false;
    clipStart=Math.max(0,endLoop.duration-8.5);
    shortEnd=Math.max(.2,endLoop.duration-.16);
    shortStart=Math.max(clipStart,shortEnd-3.6);
    if(endLoop.currentTime<clipStart||endLoop.currentTime>endLoop.duration-.08){
      endLoop.currentTime=shortStart;
    }
    return true;
  };

  const inView=()=>{
    if(!echoWrap)return true;
    const r=echoWrap.getBoundingClientRect();
    return r.bottom>0&&r.top<window.innerHeight;
  };

  const stopDance=()=>{
    endLoop.pause();
  };

  const startDance=()=>{
    if(cinematicActive||transitioning||!endLoop.muted||!inView())return;
    if(!setClip())return;
    endLoop.playbackRate=.92;
    if(endLoop.currentTime<shortStart||endLoop.currentTime>=shortEnd){
      endLoop.currentTime=shortStart;
    }
    if(reduced){
      endLoop.pause();
      return;
    }
    endLoop.play().catch(()=>{});
  };

  const startSoundLoop=()=>{
    stopDance();
    if(!setClip())return;
    endLoop.playbackRate=1;
    if(endLoop.currentTime<shortStart||endLoop.currentTime>=shortEnd){
      endLoop.currentTime=shortStart;
    }
    endLoop.play().catch(()=>{});
  };

  const syncHeroVideo=()=>{
    if(!heroVideo)return;
    const musicPlaying=(music&&!music.paused&&!music.ended)||(crossfadeMusic&&!crossfadeMusic.paused&&!crossfadeMusic.ended);
    if(document.hidden||!heroInView||musicPlaying){
      heroVideo.pause();
      return;
    }
    heroVideo.play().catch(()=>{});
  };

  if(heroVideo){
    const heroObserver=new IntersectionObserver(entries=>{
      const entry=entries[0];
      heroInView=!!entry?.isIntersecting;
      syncHeroVideo();
    },{threshold:.08});
    heroObserver.observe(heroVideo);
    music?.addEventListener('play',syncHeroVideo);
    music?.addEventListener('pause',syncHeroVideo);
    music?.addEventListener('ended',syncHeroVideo);
    crossfadeMusic?.addEventListener('play',syncHeroVideo);
    crossfadeMusic?.addEventListener('pause',syncHeroVideo);
    crossfadeMusic?.addEventListener('ended',syncHeroVideo);
    document.addEventListener('visibilitychange',()=>{
      syncHeroVideo();
      if(document.hidden){
        stopDance();
        endLoop.pause();
      }else if(inView()&&endLoop.readyState>=1){
        if(endLoop.muted)startDance();
        else startSoundLoop();
      }
    });
  }

  const clearCinemaStyles=()=>{
    if(!echoFilm)return;
    echoFilm.style.cssText='';
    endLoop.style.cssText='';
    if(echoCopy)echoCopy.style.cssText='';
    if(echoShade)echoShade.style.cssText='';
    if(soundButton)soundButton.style.cssText='';
    document.body.style.overflow='';
  };

  const finishCinema=()=>{
    if(!cinematicActive||transitioning||!echoFilm)return;
    transitioning=true;
    cinematicActive=false;
    endLoop.pause();

    const vv=window.visualViewport;
    const vw=vv?.width||window.innerWidth;
    const vh=vv?.height||window.innerHeight;
    const target=returnRect||{left:0,top:vh*.15,width:vw,height:vh*.70};
    const sx=Math.max(.05,target.width/vw);
    const sy=Math.max(.05,target.height/vh);

    const done=()=>{
      clearCinemaStyles();
      transitioning=false;
      returnRect=null;
      if(endLoop.muted)startDance();
      else startSoundLoop();
    };

    if(reduced){
      done();
      return;
    }

    const anim=echoFilm.animate([
      {transform:'translate(0,0) scale(1)',borderRadius:'0px'},
      {transform:`translate(${target.left}px,${target.top}px) scale(${sx},${sy})`,borderRadius:'0px'}
    ],{
      duration:620,
      easing:'cubic-bezier(.22,.82,.24,1)',
      fill:'forwards'
    });

    if(echoCopy)echoCopy.animate([{opacity:.025},{opacity:.16}],{duration:520,easing:'ease-out',fill:'forwards'});
    if(echoShade)echoShade.animate([{opacity:.10},{opacity:1}],{duration:520,easing:'ease-out',fill:'forwards'});
    if(soundButton)soundButton.animate([{opacity:.20},{opacity:1}],{duration:420,easing:'ease-out',fill:'forwards'});

    anim.addEventListener('finish',done,{once:true});
    anim.addEventListener('cancel',done,{once:true});
  };

  const startCinema=()=>{
    if(cinematicUsed||cinematicActive||transitioning||!echoFilm||!echoWrap)return false;
    if(!setClip())return false;

    stopDance();
    cinematicUsed=true;
    cinematicActive=true;
    try{sessionStorage.setItem(cinemaKey,'1');}catch(_){ }

    returnRect=echoFilm.getBoundingClientRect();
    const from=returnRect;
    const vv=window.visualViewport;
    const vw=vv?.width||window.innerWidth;
    const vh=vv?.height||window.innerHeight;
    const sx=Math.max(.05,from.width/vw);
    const sy=Math.max(.05,from.height/vh);

    document.body.style.overflow='hidden';

    Object.assign(echoFilm.style,{
      position:'fixed',
      left:'0',
      top:'0',
      width:`${vw}px`,
      height:`${vh}px`,
      margin:'0',
      zIndex:'9999',
      border:'0',
      borderRadius:'0',
      WebkitMaskImage:'none',
      maskImage:'none',
      transformOrigin:'top left',
      boxShadow:'0 0 0 100vmax rgba(0,0,0,.94)'
    });
    Object.assign(endLoop.style,{
      inset:'0',
      width:'100%',
      height:'100%',
      opacity:'.99',
      filter:'saturate(.94) contrast(1.05) brightness(.92)',
      transform:'none',
      objectFit:'cover'
    });
    if(echoCopy){
      echoCopy.style.opacity='.025';
      echoCopy.style.transition='opacity .45s ease';
    }
    if(echoShade){
      echoShade.style.opacity='.10';
      echoShade.style.transition='opacity .45s ease';
    }
    if(soundButton){
      soundButton.style.opacity='.20';
      soundButton.style.transition='opacity .35s ease';
    }

    if(!reduced){
      echoFilm.animate([
        {transform:`translate(${from.left}px,${from.top}px) scale(${sx},${sy})`,borderRadius:'0px'},
        {transform:'translate(0,0) scale(1)',borderRadius:'0px'}
      ],{
        duration:700,
        easing:'cubic-bezier(.18,.88,.22,1)',
        fill:'none'
      });
    }

    endLoop.playbackRate=1;
    endLoop.currentTime=clipStart;
    endLoop.play().catch(()=>{});
    return true;
  };

  endLoop.addEventListener('loadedmetadata',()=>{
    setClip();
    if(endLoop.muted&&inView())startDance();
  },{once:true});

  endLoop.addEventListener('timeupdate',()=>{
    if(!setClip())return;
    if(cinematicActive&&endLoop.currentTime>=endLoop.duration-.10){
      finishCinema();
      return;
    }
    if(!cinematicActive&&!transitioning&&endLoop.currentTime>=shortEnd){
      endLoop.currentTime=shortStart;
      if(inView()&&!document.hidden)endLoop.play().catch(()=>{});
    }
  });

  endLoop.addEventListener('ended',()=>{
    if(cinematicActive)finishCinema();
    else if(!transitioning&&inView()){
      if(endLoop.muted)startDance();
      else startSoundLoop();
    }
  });

  const observer=new IntersectionObserver(entries=>{
    entries.forEach(entry=>{
      if(cinematicActive||transitioning)return;
      if(entry.isIntersecting){
        ensureEndLoopLoaded();
        if(endLoop.readyState>=1){
          if(endLoop.muted)startDance();
          else startSoundLoop();
        }
      }else{
        stopDance();
        endLoop.pause();
      }
    });
  },{threshold:.08});
  observer.observe(echoWrap||endLoop);

  if(soundButton){
    soundButton.addEventListener('click',()=>{
      if(endLoop.muted){
        stopDance();
        endLoop.muted=false;
        soundButton.textContent='sound off';
        if(!startCinema())startSoundLoop();
      }else{
        endLoop.muted=true;
        soundButton.textContent='sound on';
        if(cinematicActive)finishCinema();
        else startDance();
      }
    });
  }
})();
