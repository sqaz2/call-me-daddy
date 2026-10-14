(()=>{
  if(window.CMDInstall)return;
  // The persistent browser may display the install page inside a same-origin frame.
  const host=()=>{try{return window.top?.CMDInstall||null}catch{return null}};
  let promptEvent=null,installed=false;
  const ua=navigator.userAgent||'',platform=navigator.userAgentData?.platform||navigator.platform||'';
  const embedded=/FBAN|FBAV|Instagram|; wv\)/i.test(ua);
  // Suggestions only: feature detection controls the real install prompt.
  // Tablets can report a desktop Mac user agent, so check touch before macOS.
  const device=/SmartTV|Smart-TV|Android TV|GoogleTV|FireTV|\bAFT\w+|AppleTV|HbbTV|Tizen|webOS|PlayStation|Xbox|Silk\/|Kindle|HarmonyOS/i.test(ua)?'other':
    /iPad|iPhone|iPod/.test(ua)||(platform==='MacIntel'&&navigator.maxTouchPoints>1)?'ios':
    /Android/i.test(ua+' '+platform)?'android':/CrOS|Chrome OS/i.test(ua+' '+platform)?'chromeos':
    /Windows|Win32|Win64/i.test(ua+' '+platform)?'windows':/Mac/i.test(ua+' '+platform)?'mac':
    /Linux/i.test(ua+' '+platform)?'linux':'other';
  const labels={ios:'iPhone / iPad',windows:'Windows',mac:'Mac',chromeos:'Chromebook',linux:'Linux'};
  const routes={ios:'Safari',windows:'Edge or Chrome',mac:'Safari or Chrome',chromeos:'Chrome',linux:'Chrome'};
  const standalone=()=>installed||Boolean(window.matchMedia?.('(display-mode: standalone)')?.matches)||navigator.standalone===true;
  const status=text=>{const node=document.querySelector('[data-install-status]');if(node)node.textContent=text};
  const refresh=()=>{
    const api=window.top===window.self?window.CMDInstall:host();
    const button=document.querySelector('[data-install-app]');
    if(!button)return;
    const ready=api?.available(),done=api?.installed();
    button.hidden=device==='android'||Boolean(done);
    button.textContent=ready?'Add website to this device':labels[device]?`Show ${labels[device]} steps`:'Choose your device';
    if(done)status('This browser shortcut is already installed.');
  };
  const instructions=()=>{
    const options=document.getElementById('browser-options');
    if(options)options.open=true;
    const help=document.getElementById('install-help');
    const guide=document.getElementById(device);
    if(guide){guide.open=true;guide.focus();}else if(help){help.hidden=false;help.focus();}
    status(embedded?'Open this page in your device’s browser first. See the steps below.':labels[device]?`Follow the ${labels[device]} steps below. If installation is unavailable, you can still listen on the website.`:'Choose your device below, or use Start listening to play in your browser.');
  };
  if(window.top===window.self){
    window.CMDInstall={available:()=>device!=='android'&&Boolean(promptEvent),installed:standalone,async install(){
      if(device==='android'||!promptEvent)return false;
      const event=promptEvent;promptEvent=null;refresh();
      try{await event.prompt();await event.userChoice;return true}catch{return false}
    }};
    window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();promptEvent=device==='android'?null:event;refresh()});
    window.addEventListener('appinstalled',()=>{installed=true;promptEvent=null;refresh();status('Website shortcut added. Open it from your home screen or app list.');});
    if('serviceWorker'in navigator&&window.isSecureContext){
      navigator.serviceWorker.register('/sw.js',{scope:'/',updateViaCache:'none'}).catch(()=>{});
    }
  }else{
    window.CMDInstall={available:()=>host()?.available()||false,installed:()=>host()?.installed()||false,install:()=>host()?.install()||Promise.resolve(false)};
  }
  const bind=()=>{
    const androidStatus=document.querySelector('[data-android-status]');
    if(androidStatus&&embedded&&device==='android')androidStatus.textContent='You’re inside another app. Open this page in your phone’s browser, then tap Download Android app.';
    const recommendation=document.querySelector('[data-device-recommendation]');
    if(recommendation)recommendation.textContent=device==='android'?'For Android, use the Download Android app button above.':embedded?'You appear to be inside another app. Open this page in your device’s browser to install.':labels[device]?`Suggested for this device: ${labels[device]} · ${routes[device]}.`:'Choose your device below to find your installation options.';
    refresh();
    document.querySelector('[data-install-app]')?.addEventListener('click',async()=>{
      if(!await window.CMDInstall.install())instructions();
      refresh();
    });
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
})();
