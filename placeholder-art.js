(()=>{
  const fallback=window.CMD_ARTWORK?.fallbackCover||'/media/site/image-coming-soon.jpg';
  const fallbackPath=(()=>{try{return new URL(fallback,location.href).pathname}catch{return fallback}})();

  const isFallback=img=>{
    if(!img)return false;
    const raw=img.getAttribute('src')||'';
    if(!raw)return false;
    try{return new URL(raw,location.href).pathname===fallbackPath}catch{return raw===fallback}
  };

  const ensureLabel=(container,on)=>{
    if(!container)return;
    let label=container.querySelector(':scope > .placeholder-cover-label');
    if(on&&!label){
      label=document.createElement('span');
      label.className='placeholder-cover-label';
      label.textContent='Cover coming soon';
      container.appendChild(label);
    }else if(!on&&label){
      label.remove();
    }
  };

  const markImage=img=>{
    if(!(img instanceof HTMLImageElement))return;
    const on=isFallback(img);
    const songCard=img.closest('.song-card');
    if(songCard){
      songCard.classList.toggle('is-placeholder-cover',on);
      ensureLabel(songCard,on);
    }
    const releaseCard=img.closest('.release-card');
    if(releaseCard){
      releaseCard.classList.toggle('is-placeholder-cover',on);
      ensureLabel(releaseCard,on);
    }
    if(img.id==='playerCover'){
      document.getElementById('catalogPlayer')?.classList.toggle('is-placeholder-cover',on);
    }
  };

  const scan=root=>{
    if(root instanceof HTMLImageElement)markImage(root);
    root?.querySelectorAll?.('img').forEach(markImage);
  };

  const observer=new MutationObserver(mutations=>{
    mutations.forEach(mutation=>{
      if(mutation.type==='attributes'&&mutation.target instanceof HTMLImageElement){
        markImage(mutation.target);
      }
      mutation.addedNodes.forEach(node=>{
        if(node instanceof Element)scan(node);
      });
    });
  });

  const start=()=>{
    scan(document);
    observer.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['src']});
  };

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();
