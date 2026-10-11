(()=>{'use strict';
const video=document.getElementById('futureVisual'),toggle=document.getElementById('visualToggle'),status=document.getElementById('visualStatus');
if(!video||!toggle)return;
video.muted=true;video.defaultMuted=true;
const motion=window.matchMedia('(prefers-reduced-motion: reduce)');
let wanted=false,manual=false,visible=true;
const eligible=()=>!document.hidden&&visible;
const draw=()=>{const playing=!video.paused&&!video.ended;toggle.textContent=playing?'Pause visual':'Play visual';toggle.setAttribute('aria-pressed',String(playing));};
const start=async()=>{if(!eligible())return;try{video.muted=true;await video.play();status.textContent='Visual looping silently. Use the music dock for the full song.';}catch{status.textContent='Tap Play visual to start the loop.';}draw();};
toggle.addEventListener('click',()=>{manual=true;wanted=video.paused;if(wanted)start();else video.pause();draw();});
video.addEventListener('play',draw);video.addEventListener('pause',draw);
video.addEventListener('error',()=>{status.textContent='The visual could not load. You can still listen to the full song or open the video directly.';draw();});
video.addEventListener('volumechange',()=>{if(!video.muted)video.muted=true;});
document.addEventListener('visibilitychange',()=>{if(!eligible())video.pause();else if(wanted)start();});
if('IntersectionObserver' in window){const observer=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(!visible)video.pause();else if(wanted)start();},{threshold:.15});observer.observe(video);window.addEventListener('pagehide',()=>observer.disconnect(),{once:true});}
document.addEventListener('play',event=>{if(event.target?.tagName==='AUDIO'&&!manual&&!motion.matches&&!navigator.connection?.saveData){wanted=true;start();}},true);
window.addEventListener('pagehide',()=>video.pause());
draw();
})();