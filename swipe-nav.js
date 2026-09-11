(()=>{
  /**
   * Attach horizontal swipe navigation that works on live phones.
   * Prefer attaching to cover / player-inner (not the scrubber shell).
   * Does NOT ignore img — cover art is a primary swipe surface.
   */
  function attachSwipeNav(options={}){
    const {
      target,
      onPrev,
      onNext,
      threshold=40,
      restraint=72,
      ignore='.tactile-scrubber-shell, .tactile-scrubber, [data-no-swipe], button, a, input, textarea, select, #catalogProgress, #archiveProgress, .catalog-progress, .archive-progress',
      axisBias=1.15,
      nudge=true
    }=options;
    if(!target||typeof onPrev!=='function'||typeof onNext!=='function')return ()=>{};

    try{
      if(target.style&&!target.style.touchAction){
        target.style.touchAction='pan-y';
      }
      if(target.setAttribute&&!String(target.getAttribute?.('style')||'').includes('touch-action')){
        // keep CSS keyword discoverable for audits / tests
        target.style.setProperty('touch-action','pan-y');
      }
      target.classList?.add('cmd-swipe-target');
    }catch{}

    let startX=0;
    let startY=0;
    let tracking=false;
    let ignored=false;
    let pointerId=null;
    let suppressClickUntil=0;
    const usePointer=typeof window.PointerEvent==='function';

    const inIgnore=el=>{
      try{return Boolean(el?.closest?.(ignore))}catch{return false}
    };

    const flashNudge=direction=>{
      if(!nudge||!target?.classList)return;
      const cls=direction==='next'?'is-swipe-next':'is-swipe-prev';
      target.classList.remove('is-swipe-next','is-swipe-prev');
      // force reflow so repeated swipes re-trigger animation
      void target.offsetWidth;
      target.classList.add(cls);
      window.setTimeout(()=>target.classList.remove(cls),220);
    };

    const onStart=event=>{
      if(event.touches?.length>1){onCancel();return;}
      if(event.isPrimary===false){onCancel();return;}
      const point=event.touches?event.touches[0]:event;
      if(!point)return;
      ignored=inIgnore(event.target);
      if(ignored){tracking=false;return;}
      tracking=true;
      startX=point.clientX;
      startY=point.clientY;
      if(event.pointerId!=null)pointerId=event.pointerId;
    };

    const onEnd=event=>{
      if(!tracking||ignored){tracking=false;ignored=false;pointerId=null;return;}
      if(pointerId!=null&&event.pointerId!=null&&event.pointerId!==pointerId)return;
      tracking=false;
      ignored=false;
      pointerId=null;
      const point=event.changedTouches?event.changedTouches[0]:event;
      if(!point)return;
      const dx=point.clientX-startX;
      const dy=point.clientY-startY;
      const absX=Math.abs(dx);
      const absY=Math.abs(dy);
      if(absX<threshold)return;
      // Require clear horizontal dominance
      if(absX<absY*axisBias)return;
      if(absY>restraint&&absX<absY*1.5)return;
      suppressClickUntil=Date.now()+500;
      if(dx<0){
        flashNudge('next');
        onNext();
      }else{
        flashNudge('prev');
        onPrev();
      }
    };

    const onCancel=()=>{tracking=false;ignored=false;pointerId=null};
    const onMove=event=>{
      if(!tracking||ignored||event.pointerId==null||event.pointerId!==pointerId)return;
      const dx=Math.abs(event.clientX-startX),dy=Math.abs(event.clientY-startY);
      if(dx>12&&dx>dy*axisBias)try{target.setPointerCapture?.(pointerId)}catch{}
    };
    const onClick=event=>{
      if(Date.now()>=suppressClickUntil)return;
      suppressClickUntil=0;event.preventDefault();event.stopImmediatePropagation();
    };

    const onPointerDown=event=>{
      if(event.pointerType==='mouse')return;
      onStart(event);
    };
    const onPointerUp=event=>{
      if(event.pointerType==='mouse')return;
      onEnd(event);
    };

    if(usePointer){
      target.addEventListener('pointerdown',onPointerDown,{passive:true});
      target.addEventListener('pointermove',onMove,{passive:true});
      target.addEventListener('pointerup',onPointerUp,{passive:true});
      target.addEventListener('pointercancel',onCancel,{passive:true});
    }else{
      target.addEventListener('touchstart',onStart,{passive:true});
      target.addEventListener('touchend',onEnd,{passive:true});
      target.addEventListener('touchcancel',onCancel,{passive:true});
    }
    target.addEventListener('click',onClick,true);

    return ()=>{
      target.removeEventListener('touchstart',onStart);
      target.removeEventListener('touchend',onEnd);
      target.removeEventListener('touchcancel',onCancel);
      target.removeEventListener('pointerdown',onPointerDown);
      target.removeEventListener('pointermove',onMove);
      target.removeEventListener('pointerup',onPointerUp);
      target.removeEventListener('pointercancel',onCancel);
      target.removeEventListener('click',onClick,true);
    };
  }

  /** Attach to one or many targets with the same handlers. */
  function attachMany(targets,options={}){
    const list=[].concat(targets||[]).filter(Boolean);
    const cleanups=list.map(target=>attachSwipeNav({...options,target}));
    return ()=>cleanups.forEach(fn=>fn());
  }

  window.CMDSwipeNav={attach:attachSwipeNav,attachMany};
})();
