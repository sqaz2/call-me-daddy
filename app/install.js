(()=>{
  if(window.CMDInstall)return;
  // The persistent browser may display the install page inside a same-origin frame.
  const host=()=>{try{return window.top?.CMDInstall||null}catch{return null}};
  let promptEvent=null,installed=false;
  const standalone=()=>installed||window.matchMedia?.('(display-mode: standalone)').matches||navigator.standalone===true;
  const status=text=>{const node=document.querySelector('[data-install-status]');if(node)node.textContent=text};
  const refresh=()=>{
    const api=window.top===window.self?window.CMDInstall:host();
    const button=document.querySelector('[data-install-app]');
    if(!button)return;
    const ready=api?.available(),done=api?.installed();
    button.hidden=Boolean(done);
    button.textContent=ready?'Install MusicSubject':'How to install';
    if(done)status('You’re using the installed app. Pick a song and press play.');
  };
  const instructions=()=>{
    const help=document.getElementById('install-help');
    if(help){help.hidden=false;help.focus();}
    const embedded=/FBAN|FBAV|Instagram/i.test(navigator.userAgent);
    const ios=/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
    status(embedded?'Open this page in Chrome or Safari using the browser menu, then install it.':ios?'In Safari, tap Share, then Add to Home Screen.':'In Chrome, open the ⋮ menu, then Add to Home screen → Install. If Install is unavailable, use the site normally and try again later.');
  };
  if(window.top===window.self){
    window.CMDInstall={available:()=>Boolean(promptEvent),installed:standalone,async install(){
      if(!promptEvent)return false;
      const event=promptEvent;promptEvent=null;refresh();
      try{await event.prompt();await event.userChoice;return true}catch{return false}
    }};
    window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();promptEvent=event;refresh()});
    window.addEventListener('appinstalled',()=>{installed=true;promptEvent=null;refresh();status('Installed. Open MusicSubject from your home screen.');});
    if('serviceWorker'in navigator&&window.isSecureContext){
      navigator.serviceWorker.register('/sw.js',{scope:'/',updateViaCache:'none'}).catch(()=>{});
    }
  }else{
    window.CMDInstall={available:()=>host()?.available()||false,installed:()=>host()?.installed()||false,install:()=>host()?.install()||Promise.resolve(false)};
  }
  const bind=()=>{
    refresh();
    document.querySelector('[data-install-app]')?.addEventListener('click',async()=>{
      if(!await window.CMDInstall.install())instructions();
      refresh();
    });
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
})();
