(()=>{
  const trap=document.getElementById('echoTrap');
  const endLoop=document.getElementById('endLoop');
  if(!trap)return;

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

  const modal=document.createElement('div');
  modal.className='wtf-modal';
  modal.setAttribute('role','dialog');
  modal.setAttribute('aria-modal','true');
  modal.setAttribute('aria-label','You clicked it');
  modal.innerHTML=`
    <div class="wtf-modal-inner">
      <div class="wtf-modal-label">you were specifically told not to</div>
      <h2>WHAT THE FUCK, WILL?</h2>
      <button class="wtf-close" type="button">okay, keep scrolling</button>
    </div>`;
  document.body.appendChild(modal);

  const close=modal.querySelector('.wtf-close');
  let previousFocus=null;

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
    previousFocus=document.activeElement;
    modal.classList.add('open');
    document.body.style.overflow='hidden';
    trap.setAttribute('aria-expanded','true');
    close.focus({preventScroll:true});
    speak();
  };

  const shut=()=>{
    modal.classList.remove('open');
    document.body.style.overflow='';
    trap.setAttribute('aria-expanded','false');
    if('speechSynthesis' in window)window.speechSynthesis.cancel();
    if(previousFocus&&typeof previousFocus.focus==='function')previousFocus.focus({preventScroll:true});
  };

  trap.setAttribute('aria-expanded','false');
  trap.addEventListener('click',open);
  close.addEventListener('click',shut);
  modal.addEventListener('click',e=>{if(e.target===modal)shut();});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&modal.classList.contains('open'))shut();});
})();