(()=>{'use strict';
const video=document.getElementById('futureVisual'),toggle=document.getElementById('visualToggle');
if(!video||!toggle)return;
// This decorative loop never joins the shared audio player.
video.muted=true;video.defaultMuted=true;
const motion=window.matchMedia('(prefers-reduced-motion: reduce)');
let wanted=!motion.matches,manuallyPaused=false,visible=true;
const eligible=()=>!document.hidden&&visible;
const draw=()=>{const playing=!video.paused&&!video.ended;toggle.textContent=playing?'Pause background':'Resume background';toggle.setAttribute('aria-pressed',String(playing));};
const start=async()=>{if(!wanted||!eligible())return;try{video.muted=true;await video.play();}catch{/* Some mobile power-saving modes require a gesture. */}draw();};
const sync=()=>{if(wanted&&eligible())start();else video.pause();draw();};
toggle.addEventListener('click',()=>{wanted=video.paused;manuallyPaused=!wanted;sync();});
video.addEventListener('play',draw);video.addEventListener('pause',draw);
video.addEventListener('volumechange',()=>{if(!video.muted)video.muted=true;});
video.addEventListener('error',()=>{toggle.textContent='Background unavailable';toggle.disabled=true;});
document.addEventListener('visibilitychange',sync);
document.addEventListener('pointerdown',event=>{if(!event.target.closest('#visualToggle')&&wanted&&video.paused)start();},{passive:true});
if('IntersectionObserver' in window){const observer=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;sync();},{threshold:0});observer.observe(video);}
motion.addEventListener('change',()=>{wanted=!motion.matches&&!manuallyPaused;sync();});
window.addEventListener('pagehide',()=>video.pause());
window.addEventListener('pageshow',sync);
sync();
})();
