(()=>{
  /**
   * Attach horizontal swipe navigation.
   * onPrev / onNext fire after a clear horizontal flick.
   * Ignores swipes that start on ignored selectors (scrubbers, progress, buttons).
   */
  function attachSwipeNav(options={}){
    const {
      target,
      onPrev,
      onNext,
      threshold=56,
      restraint=48,
      ignore='.tactile-scrubber-shell, .tactile-scrubber, [data-no-swipe], button, a, input, textarea, select',
      axisBias=1.25
    }=options;
    if(!target||typeof onPrev!=='function'||typeof onNext!=='function')return ()=>{};

    let startX=0;
    let startY=0;
    let tracking=false;
    let ignored=false;

    const inIgnore=el=>{
      try{return Boolean(el?.closest?.(ignore))}catch{return false}
    };

    const onStart=event=>{
      const point=event.touches?event.touches[0]:event;
      if(!point)return;
      ignored=inIgnore(event.target);
      if(ignored){tracking=false;return;}
      tracking=true;
      startX=point.clientX;
      startY=point.clientY;
    };

    const onEnd=event=>{
      if(!tracking||ignored){tracking=false;ignored=false;return;}
      tracking=false;
      const point=event.changedTouches?event.changedTouches[0]:event;
      if(!point)return;
      const dx=point.clientX-startX;
      const dy=point.clientY-startY;
      if(Math.abs(dx)<threshold)return;
      if(Math.abs(dx)<Math.abs(dy)*axisBias)return;
      if(Math.abs(dy)>restraint&&Math.abs(dx)<Math.abs(dy)*axisBias)return;
      if(dx<0)onNext();else onPrev();
    };

    const onCancel=()=>{tracking=false;ignored=false};

    target.addEventListener('touchstart',onStart,{passive:true});
    target.addEventListener('touchend',onEnd,{passive:true});
    target.addEventListener('touchcancel',onCancel,{passive:true});
    // Pointer for trackpads / pen where useful, but avoid mouse drag fights with click
    target.addEventListener('pointerdown',event=>{
      if(event.pointerType==='mouse')return;
      onStart(event);
    });
    target.addEventListener('pointerup',event=>{
      if(event.pointerType==='mouse')return;
      onEnd(event);
    });
    target.addEventListener('pointercancel',onCancel);

    return ()=>{
      target.removeEventListener('touchstart',onStart);
      target.removeEventListener('touchend',onEnd);
      target.removeEventListener('touchcancel',onCancel);
    };
  }

  window.CMDSwipeNav={attach:attachSwipeNav};
})();
