(()=>{
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(reduced)return;

  const root=document.documentElement;
  let raf=0;
  const updateGlobal=(x,y)=>{
    cancelAnimationFrame(raf);
    raf=requestAnimationFrame(()=>{
      root.style.setProperty('--cursor-x',`${(x/window.innerWidth-.5)*18}px`);
      root.style.setProperty('--cursor-y',`${(y/window.innerHeight-.5)*18}px`);
    });
  };
  window.addEventListener('pointermove',e=>{
    if(e.pointerType==='touch')return;
    updateGlobal(e.clientX,e.clientY);
  },{passive:true});

  const tiltTargets=document.querySelectorAll('.hero-art,.card,.choice,.seq');
  tiltTargets.forEach(el=>{
    el.addEventListener('pointermove',e=>{
      if(e.pointerType==='touch')return;
      const r=el.getBoundingClientRect();
      const px=(e.clientX-r.left)/r.width-.5;
      const py=(e.clientY-r.top)/r.height-.5;
      el.style.setProperty('--ry',`${px*4.5}deg`);
      el.style.setProperty('--rx',`${py*-4.5}deg`);
    },{passive:true});
    el.addEventListener('pointerleave',()=>{
      el.style.setProperty('--ry','0deg');
      el.style.setProperty('--rx','0deg');
    });
  });

  const onScroll=()=>{
    const y=window.scrollY;
    root.style.setProperty('--scroll-drift',`${Math.min(y*.018,18)}px`);
    root.style.setProperty('--video-drift',`${Math.min(y*.035,28)}px`);
  };
  window.addEventListener('scroll',onScroll,{passive:true});
  onScroll();
})();