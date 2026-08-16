(()=>{
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const root=document.documentElement;

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
        const d=(window.innerHeight*.5-echo.getBoundingClientRect().top)*.022;
        root.style.setProperty('--echo-drift',`${Math.max(-16,Math.min(16,d))}px`);
      }
    };
    window.addEventListener('scroll',onScroll,{passive:true});
    onScroll();
  }

  const endLoop=document.getElementById('endLoop');
  const soundButton=document.getElementById('echoSound');

  if(endLoop){
    const echoFilm=endLoop.closest('.echo-film');
    const echoWrap=endLoop.closest('.echo-film-wrap');
    const echoCopy=echoFilm?.querySelector('.echo-film-copy');
    const echoShade=echoFilm?.querySelector('.echo-film-shade');
    const cinemaKey='cftsf-ending-cinema-used';

    let clipStart=0;
    let cinematicActive=false;
    let transitioning=false;
    let cinematicUsed=false;

    try{
      cinematicUsed=sessionStorage.getItem(cinemaKey)==='1';
    }catch(_){ }

    const setClip=()=>{
      if(!Number.isFinite(endLoop.duration)||!endLoop.duration)return false;
      clipStart=Math.max(0,endLoop.duration-8.5);
      if(endLoop.currentTime<clipStart||endLoop.currentTime>endLoop.duration-.12){
        endLoop.currentTime=clipStart;
      }
      return true;
    };

    const inView=()=>{
      if(!echoWrap)return true;
      const r=echoWrap.getBoundingClientRect();
      return r.bottom>0&&r.top<window.innerHeight;
    };

    const clearCinemaStyles=()=>{
      if(!echoFilm)return;
      echoFilm.style.cssText='';
      endLoop.style.cssText='';
      if(echoCopy)echoCopy.style.cssText='';
      if(echoShade)echoShade.style.cssText='';
      if(soundButton)soundButton.style.cssText='';
      if(echoWrap)echoWrap.style.height='';
      document.body.style.overflow='';
    };

    const finishCinema=(cancelled=false)=>{
      if(!cinematicActive||transitioning||!echoFilm)return;
      transitioning=true;
      cinematicActive=false;
      endLoop.pause();

      const vv=window.visualViewport;
      const vw=vv?.width||window.innerWidth;
      const vh=vv?.height||window.innerHeight;
      const target=echoWrap?.getBoundingClientRect()||{left:0,top:0,width:vw,height:vh};
      const sx=Math.max(.05,target.width/vw);
      const sy=Math.max(.05,target.height/vh);
      const radius=window.innerWidth<=820?24:32;

      const done=()=>{
        clearCinemaStyles();
        transitioning=false;
        if(setClip())endLoop.currentTime=clipStart;
        if(inView())endLoop.play().catch(()=>{});
      };

      if(reduced){
        done();
        return;
      }

      const anim=echoFilm.animate([
        {transform:'translate(0,0) scale(1)',borderRadius:'0px'},
        {transform:`translate(${target.left}px,${target.top}px) scale(${sx},${sy})`,borderRadius:`${radius}px`}
      ],{
        duration:620,
        easing:'cubic-bezier(.22,.82,.24,1)',
        fill:'forwards'
      });

      if(echoCopy)echoCopy.animate([{opacity:.055},{opacity:1}],{duration:520,easing:'ease-out',fill:'forwards'});
      if(echoShade)echoShade.animate([{opacity:.16},{opacity:1}],{duration:520,easing:'ease-out',fill:'forwards'});
      if(soundButton)soundButton.animate([{opacity:.22},{opacity:1}],{duration:420,easing:'ease-out',fill:'forwards'});

      anim.addEventListener('finish',done,{once:true});
      anim.addEventListener('cancel',done,{once:true});
    };

    const startCinema=()=>{
      if(cinematicUsed||cinematicActive||transitioning||!echoFilm||!echoWrap)return false;
      if(!setClip())return false;

      cinematicUsed=true;
      cinematicActive=true;
      try{sessionStorage.setItem(cinemaKey,'1');}catch(_){ }

      const from=echoFilm.getBoundingClientRect();
      const vv=window.visualViewport;
      const vw=vv?.width||window.innerWidth;
      const vh=vv?.height||window.innerHeight;
      const sx=Math.max(.05,from.width/vw);
      const sy=Math.max(.05,from.height/vh);
      const oldRadius=getComputedStyle(echoFilm).borderRadius||'32px';

      echoWrap.style.height=`${from.height}px`;
      document.body.style.overflow='hidden';

      Object.assign(echoFilm.style,{
        position:'fixed',
        left:'0',
        top:'0',
        width:`${vw}px`,
        height:`${vh}px`,
        margin:'0',
        zIndex:'9999',
        borderRadius:'0px',
        transformOrigin:'top left',
        boxShadow:'0 0 0 100vmax rgba(0,0,0,.92)'
      });
      Object.assign(endLoop.style,{
        inset:'0',
        width:'100%',
        height:'100%',
        opacity:'.98',
        filter:'saturate(.92) contrast(1.05) brightness(.92)',
        transform:'none',
        objectFit:'cover'
      });
      if(echoCopy){
        echoCopy.style.opacity='.055';
        echoCopy.style.transition='opacity .45s ease';
      }
      if(echoShade){
        echoShade.style.opacity='.16';
        echoShade.style.transition='opacity .45s ease';
      }
      if(soundButton){
        soundButton.style.opacity='.22';
        soundButton.style.transition='opacity .35s ease';
      }

      if(!reduced){
        echoFilm.animate([
          {transform:`translate(${from.left}px,${from.top}px) scale(${sx},${sy})`,borderRadius:oldRadius},
          {transform:'translate(0,0) scale(1)',borderRadius:'0px'}
        ],{
          duration:700,
          easing:'cubic-bezier(.18,.88,.22,1)',
          fill:'none'
        });
      }

      endLoop.currentTime=clipStart;
      endLoop.play().catch(()=>{});
      return true;
    };

    endLoop.addEventListener('loadedmetadata',setClip,{once:true});

    endLoop.addEventListener('timeupdate',()=>{
      if(!clipStart||endLoop.currentTime<endLoop.duration-.10)return;
      if(cinematicActive){
        finishCinema(false);
      }else if(!transitioning){
        endLoop.currentTime=clipStart;
        endLoop.play().catch(()=>{});
      }
    });

    endLoop.addEventListener('ended',()=>{
      if(cinematicActive){
        finishCinema(false);
      }else if(!transitioning){
        endLoop.currentTime=clipStart;
        endLoop.play().catch(()=>{});
      }
    });

    const observer=new IntersectionObserver(entries=>{
      entries.forEach(entry=>{
        if(cinematicActive||transitioning)return;
        if(entry.isIntersecting){
          setClip();
          endLoop.play().catch(()=>{});
        }else{
          endLoop.pause();
        }
      });
    },{threshold:.18});
    observer.observe(endLoop);

    if(soundButton){
      soundButton.addEventListener('click',()=>{
        if(endLoop.muted){
          endLoop.muted=false;
          soundButton.textContent='sound off';
          if(!startCinema()&&endLoop.paused)endLoop.play().catch(()=>{});
        }else{
          endLoop.muted=true;
          soundButton.textContent='sound on';
          if(cinematicActive)finishCinema(true);
        }
      });
    }
  }
})();