(()=>{
'use strict';
const frame=document.getElementById('willy-video-window');
const links=[...document.querySelectorAll('[data-willy-video]')];
if(!frame||!links.length)return;
function load(link){
  try{const owner=window.top.CMDUniversalPlayer||window.CMDUniversalPlayer;owner?.control('pause')}catch{window.CMDUniversalPlayer?.control('pause')}
  links.forEach(item=>{if(item===link)item.setAttribute('aria-current','true');else item.removeAttribute('aria-current')});
  document.getElementById('willy-video-title').textContent=link.dataset.title;
  document.getElementById('willy-video-note').textContent=link.dataset.note;
  document.getElementById('willy-video-link').href=link.href;
  const video=document.createElement('iframe');
  const href='https://www.facebook.com/reel/'+link.dataset.willyVideo+'/';
  video.src='https://www.facebook.com/plugins/video.php?href='+encodeURIComponent(href)+'&show_text=false&width=360&autoplay=false';
  video.title=link.dataset.title;video.allow='autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share';video.allowFullscreen=true;
  frame.replaceChildren(video);
}
document.getElementById('load-willy-video')?.addEventListener('click',()=>load(links[0]));
links.forEach(link=>link.addEventListener('click',event=>{if(event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;event.preventDefault();load(link)}));
})();
