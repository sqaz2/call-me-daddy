(async()=>{
  const files=['data/songs.js','data/archive-catalog.js','data/radio-intents.js','data/2026-08-25-uploads.js','data/2026-08-26-uploads.js','data/2026-08-27-uploads.js','data/2026-08-29-uploads.js','catalog-cycle.js'];
  try {
    const revision=Date.now();
    for(const file of files) await new Promise((resolve,reject)=>{
      const script=document.createElement('script');
      const timer=setTimeout(()=>reject(new Error('Catalogue timed out')),15000);
      script.src=`https://callmedaddy.musicsubject.com/${file}?android=${revision}`;
      script.onload=()=>{clearTimeout(timer);resolve()}; script.onerror=()=>{clearTimeout(timer);reject(new Error('Catalogue unavailable'))};
      document.head.append(script);
    });
    if(!Array.isArray(window.CMD_SONGS)||!window.CMD_SONGS.length) throw new Error('Empty catalogue');
    parent.postMessage({type:'catalog-ready',songs:window.CMD_SONGS},location.origin);
  }catch(error){parent.postMessage({type:'catalog-error'},location.origin)}
})();
