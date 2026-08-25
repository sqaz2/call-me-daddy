(()=>{
  if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;

  const cards=[...document.querySelectorAll('.archive-card.highlight')];
  const proofs=[...document.querySelectorAll('.lineage-proof,.lineage-video-proof')];
  let ticking=false;

  const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));

  function paint(){
    ticking=false;
    const vh=innerHeight||1;

    cards.forEach((card,i)=>{
      const r=card.getBoundingClientRect();
      const center=r.top+r.height/2;
      const normalized=clamp((vh/2-center)/(vh/2),-1,1);
      card.style.setProperty('--archive-lift',`${(normalized*4).toFixed(2)}px`);
      card.style.setProperty('--archive-breathe',String(1+Math.max(0,1-Math.abs(normalized))*.006));
      card.style.setProperty('--archive-delay',`${i*1.8}s`);
    });

    proofs.forEach(proof=>{
      const r=proof.getBoundingClientRect();
      const normalized=clamp((vh/2-(r.top+r.height/2))/(vh/2),-1,1);
      proof.style.setProperty('--archive-parallax',`${(normalized*5).toFixed(2)}px`);
    });
  }

  const schedule=()=>{
    if(ticking)return;
    ticking=true;
    requestAnimationFrame(paint);
  };

  addEventListener('scroll',schedule,{passive:true});
  addEventListener('resize',schedule,{passive:true});
  schedule();
})();