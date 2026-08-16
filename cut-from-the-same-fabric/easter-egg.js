(()=>{
  const trap=document.getElementById('echoTrap');
  const endLoop=document.getElementById('endLoop');
  const echoFilm=trap?.closest('.echo-film');
  if(!trap||!echoFilm)return;

  if(endLoop){
    endLoop.muted=true;
    endLoop.volume=0;
    endLoop.setAttribute('muted','');
    endLoop.addEventListener('volumechange',()=>{
      if(!endLoop.muted||endLoop.volume!==0){
        endLoop.muted=true;
        endLoop.volume=0;
      }
    });
  }

  const overlay=document.createElement('div');
  overlay.className='wtf-modal';
  overlay.setAttribute('role','dialog');
  overlay.setAttribute('aria-modal','true');
  overlay.setAttribute('aria-label','You clicked it');
  overlay.innerHTML=`
    <div class="wtf-modal-inner">
      <div class="wtf-modal-label">you were specifically told not to</div>
      <h2>WHAT THE<br>FUCK, WILL?</h2>
      <button class="wtf-close" type="button">okay, keep scrolling</button>
    </div>`;
  echoFilm.appendChild(overlay);

  const close=overlay.querySelector('.wtf-close');
  let viewed=false;
  let savedFilmStyle='';
  let savedVideoStyle='';

  const speak=()=>{
    if(!('speechSynthesis' in window))return;
    try{
      window.speechSynthesis.cancel();
      const line=new SpeechSynthesisUtterance('What the fuck, Will?');
      line.rate=.88;
      line.pitch=.82;
      line.volume=.92;
      window.speechSynthesis.speak(line);
    }catch(_){ }
  };

  const expandPhoto=()=>{
    savedFilmStyle=echoFilm.getAttribute('style')||'';
    savedVideoStyle=endLoop?.getAttribute('style')||'';

    const vv=window.visualViewport;
    const vw=vv?.width||window.innerWidth;
    const vh=vv?.height||window.innerHeight;

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
      transform:'none',
      boxShadow:'0 0 0 100vmax #080808'
    });

    if(endLoop){
      Object.assign(endLoop.style,{
        inset:'-15%',
        width:'130%',
        height:'130%',
        objectFit:'cover',
        objectPosition:'50% 34%',
        opacity:'.96',
        filter:'saturate(.90) contrast(1.07) brightness(.82)',
        transform:'none'
      });
    }
  };

  const restorePhoto=()=>{
    document.body.style.overflow='';
    if(savedFilmStyle)echoFilm.setAttribute('style',savedFilmStyle);else echoFilm.removeAttribute('style');
    if(endLoop){
      if(savedVideoStyle)endLoop.setAttribute('style',savedVideoStyle);else endLoop.removeAttribute('style');
    }
  };

  const open=()=>{
    if(viewed)return;
    viewed=true;
    trap.hidden=true;
    trap.disabled=true;
    trap.setAttribute('aria-expanded','true');
    expandPhoto();
    echoFilm.classList.add('wtf-open');
    overlay.classList.add('open');
    close.focus({preventScroll:true});
    speak();
  };

  const shut=()=>{
    if(!overlay.classList.contains('open'))return;
    overlay.classList.remove('open');
    echoFilm.classList.remove('wtf-open');
    trap.setAttribute('aria-expanded','false');
    if('speechSynthesis' in window)window.speechSynthesis.cancel();
    restorePhoto();
  };

  trap.setAttribute('aria-expanded','false');
  trap.addEventListener('click',open,{once:true});
  close.addEventListener('click',shut);
  overlay.addEventListener('click',e=>{if(e.target===overlay)shut();});
  document.addEventListener('keydown',e=>{if(e.key==='Escape')shut();});
})();