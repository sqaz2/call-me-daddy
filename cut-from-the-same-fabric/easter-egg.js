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

  const open=()=>{
    if(viewed)return;
    viewed=true;
    trap.hidden=true;
    trap.disabled=true;
    trap.setAttribute('aria-expanded','true');
    echoFilm.classList.add('wtf-open');
    overlay.classList.add('open');
    close.focus({preventScroll:true});
    speak();
  };

  const shut=()=>{
    overlay.classList.remove('open');
    echoFilm.classList.remove('wtf-open');
    trap.setAttribute('aria-expanded','false');
    if('speechSynthesis' in window)window.speechSynthesis.cancel();
  };

  trap.setAttribute('aria-expanded','false');
  trap.addEventListener('click',open,{once:true});
  close.addEventListener('click',shut);
  overlay.addEventListener('click',e=>{if(e.target===overlay)shut();});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&overlay.classList.contains('open'))shut();});
})();