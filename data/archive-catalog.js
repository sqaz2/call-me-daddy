(()=>{
  if(!Array.isArray(window.CMD_SONGS))return;
  const songs=window.CMD_SONGS;
  const love=songs.find(s=>s.id==='i-need-love');
  if(love){
    const fullSka={
      id:'ska-punk-street-corner-7m12',
      label:'Ska-Punk Street Corner Mix · 7:12',
      audio:'/media/archive/i-need-love/2026/ska-punk-street-corner-7m12.mp3'
    };
    const dubstep={
      id:'dubstep-cinematic-terror',
      label:'Cinematic Terror Dubstep Score',
      audio:'/media/archive/i-need-love/2026/dubstep-cinematic-terror.mp3'
    };
    const variants=Array.isArray(love.variants)?love.variants.slice():[];
    if(!variants.some(v=>v.id===fullSka.id))variants.push(fullSka);
    if(!variants.some(v=>v.id===dubstep.id))variants.push(dubstep);
    Object.assign(love,{
      project:'Archive',
      description:'Older writing carried from an earlier recording into a 2024 AI reimagining, then into 2026 busker, ska-punk and dubstep versions.',
      experience:'/archive/i-need-love/',
      kind:'5 archive interpretations · 4 local versions',
      variants,
      skaPunkSunoUrl:'https://suno.com/s/UvNslBjOSmZlYvMM',
      fullSkaPunkSunoUrl:'https://suno.com/s/UYd1sMawQK5ZKPHz',
      dubstepSunoUrl:'https://suno.com/s/KRMqFJ8HBgSB4lPL'
    });
  }
})();