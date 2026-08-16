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
    let clipStart=0;

    const setClip=()=>{
      if(!Number.isFinite(endLoop.duration)||!endLoop.duration)return;
      clipStart=Math.max(0,endLoop.duration-8.5);
      if(endLoop.currentTime<clipStart||endLoop.currentTime>endLoop.duration-.12){
        endLoop.currentTime=clipStart;
      }
    };

    endLoop.addEventListener('loadedmetadata',setClip,{once:true});
    endLoop.addEventListener('timeupdate',()=>{
      if(clipStart&&endLoop.currentTime>=endLoop.duration-.10){
        endLoop.currentTime=clipStart;
        endLoop.play().catch(()=>{});
      }
    });
    endLoop.addEventListener('ended',()=>{
      endLoop.currentTime=clipStart;
      endLoop.play().catch(()=>{});
    });

    const observer=new IntersectionObserver(entries=>{
      entries.forEach(entry=>{
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
        endLoop.muted=!endLoop.muted;
        soundButton.textContent=endLoop.muted?'sound on':'sound off';
        if(endLoop.paused)endLoop.play().catch(()=>{});
      });
    }
  }
})();