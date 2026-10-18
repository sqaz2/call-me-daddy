(()=>{
  'use strict';
  const button=document.getElementById('sqazRotation');
  const status=document.getElementById('sqazRotationStatus');
  const api=window.CMDCatalogCycle;
  const songId=document.body.dataset.songId;
  if(!button||!status)return;
  if(!api?.setRotationEnabled||!(window.CMD_SONGS||[]).some(song=>song.id===songId&&song.rotation==='opt-in')){status.textContent='The rotation setting could not load. Refresh to try again.';return;}
  let persistent=true;
  function draw(){
    const enabled=api.isRotationAllowed(songId);
    button.disabled=false;
    button.setAttribute('aria-pressed',String(enabled));
    button.textContent=enabled?'Remove from my rotation':'Add to my rotation';
    status.textContent=enabled
      ?`Added. This song can now play with the rest of your music. ${persistent?'Saved in this browser.':'This browser could not save the choice; it lasts for this visit only.'}`
      :`Off by default. Playing it once does not add it to your rotation.${persistent?'':' This browser could not save the change permanently.'}`;
  }
  button.addEventListener('click',()=>{const result=api.setRotationEnabled(songId,!api.isRotationAllowed(songId));persistent=result.persistent;draw();});
  window.addEventListener('storage',event=>{if(!event.key||event.key===api.rotationStorageKey)draw();});
  window.addEventListener('cmd:rotation-change',draw);
  window.addEventListener('pageshow',draw);
  draw();
})();
