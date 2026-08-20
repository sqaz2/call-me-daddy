(()=>{
  if(window.CMDTactileScrubber)return;

  const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
  const fmt=value=>{
    const sec=Math.max(0,Number(value)||0);
    const mins=Math.floor(sec/60);
    const secs=Math.floor(sec%60).toString().padStart(2,'0');
    return `${mins}:${secs}`;
  };
  const normalizedDelta=(a,b)=>{
    let d=a-b;
    while(d>Math.PI)d-=Math.PI*2;
    while(d<-Math.PI)d+=Math.PI*2;
    return d;
  };

  function create(options={}){
    const mount=typeof options.mount==='string'?document.querySelector(options.mount):options.mount;
    if(!mount)return null;
    const getDuration=typeof options.getDuration==='function'?options.getDuration:()=>0;
    const getTime=typeof options.getTime==='function'?options.getTime:()=>0;
    const seek=typeof options.seek==='function'?options.seek:()=>{};
    const label=options.label||'DRAG TO SCRUB';
    const detail=options.detail||'ONE TURN = WHOLE SONG';
    const haptics=options.haptics!==false;

    mount.innerHTML=`<div class="tactile-wheel" role="slider" tabindex="0" aria-label="${label}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" aria-disabled="true"><div class="tactile-wheel-face"><span class="tactile-wheel-kicker">${label}</span><strong class="tactile-wheel-time">0:00 / --:--</strong><span class="tactile-wheel-detail">${detail}</span></div></div>`;
    const wheel=mount.querySelector('.tactile-wheel');
    const timeText=mount.querySelector('.tactile-wheel-time');
    let dragging=false;
    let pointerId=null;
    let lastAngle=0;
    let accumulated=0;
    let startTime=0;
    let lastHaptic=-1;
    let destroyed=false;

    const state=()=>{
      const duration=Number(getDuration())||0;
      const time=Number(getTime())||0;
      return {duration:Number.isFinite(duration)?Math.max(0,duration):0,time:Number.isFinite(time)?Math.max(0,time):0};
    };

    const render=()=>{
      if(destroyed)return;
      const {duration,time}=state();
      const ratio=duration>0?clamp(time/duration,0,1):0;
      wheel.style.setProperty('--scrub-angle',`${ratio*360}deg`);
      wheel.setAttribute('aria-valuenow',String(Math.round(ratio*100)));
      wheel.setAttribute('aria-valuetext',duration>0?`${fmt(time)} of ${fmt(duration)}`:'Loading duration');
      wheel.setAttribute('aria-disabled',duration>0?'false':'true');
      timeText.textContent=duration>0?`${fmt(time)} / ${fmt(duration)}`:'0:00 / --:--';
      requestAnimationFrame(render);
    };

    const angle=e=>{
      const r=wheel.getBoundingClientRect();
      return Math.atan2(e.clientY-(r.top+r.height/2),e.clientX-(r.left+r.width/2));
    };

    const haptic=ratio=>{
      if(!haptics||typeof navigator.vibrate!=='function')return;
      const tick=Math.round(ratio*10);
      if(tick===lastHaptic)return;
      lastHaptic=tick;
      try{navigator.vibrate(5)}catch{}
    };

    wheel.addEventListener('pointerdown',e=>{
      const {duration,time}=state();
      if(!duration)return;
      dragging=true;
      pointerId=e.pointerId;
      lastAngle=angle(e);
      accumulated=0;
      startTime=clamp(time,0,duration);
      lastHaptic=Math.round((startTime/duration)*10);
      wheel.classList.add('is-dragging');
      try{wheel.setPointerCapture(pointerId)}catch{}
      e.preventDefault();
    });

    wheel.addEventListener('pointermove',e=>{
      if(!dragging||e.pointerId!==pointerId)return;
      const {duration}=state();
      if(!duration)return;
      const nextAngle=angle(e);
      accumulated+=normalizedDelta(nextAngle,lastAngle);
      lastAngle=nextAngle;
      const target=clamp(startTime+(accumulated/(Math.PI*2))*duration,0,duration);
      seek(target);
      haptic(target/duration);
      e.preventDefault();
    });

    const finish=e=>{
      if(!dragging||(e&&pointerId!==null&&e.pointerId!==pointerId))return;
      dragging=false;
      wheel.classList.remove('is-dragging');
      try{if(pointerId!==null)wheel.releasePointerCapture(pointerId)}catch{}
      pointerId=null;
      accumulated=0;
    };
    wheel.addEventListener('pointerup',finish);
    wheel.addEventListener('pointercancel',finish);
    wheel.addEventListener('lostpointercapture',()=>finish());

    wheel.addEventListener('keydown',e=>{
      const {duration,time}=state();
      if(!duration)return;
      let target=time;
      const fine=Math.max(2,duration*.02);
      if(e.key==='ArrowRight'||e.key==='ArrowUp')target+=fine;
      else if(e.key==='ArrowLeft'||e.key==='ArrowDown')target-=fine;
      else if(e.key==='PageUp')target+=duration*.1;
      else if(e.key==='PageDown')target-=duration*.1;
      else if(e.key==='Home')target=0;
      else if(e.key==='End')target=duration;
      else return;
      e.preventDefault();
      seek(clamp(target,0,duration));
    });

    requestAnimationFrame(render);
    return {wheel,destroy(){destroyed=true;mount.innerHTML='';}};
  }

  window.CMDTactileScrubber={create};
})();
