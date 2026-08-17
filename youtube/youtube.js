(()=>{
  const id=document.body.dataset.youtubeId;
  const url=document.body.dataset.youtubeUrl||`https://youtu.be/${id}`;
  const titleEl=document.getElementById('youtubeTitle');
  const channelEl=document.getElementById('youtubeChannel');
  const thumb=document.getElementById('youtubeThumb');
  const watch=document.getElementById('youtubeWatch');
  const setMeta=(selector,value)=>{const el=document.querySelector(selector);if(el&&value)el.setAttribute('content',value);};
  const loadShare=()=>{
    const s=document.createElement('script');
    s.src='/share.js';
    document.body.appendChild(s);
  };
  if(watch)watch.href=url;
  if(thumb&&id)thumb.src=`https://i.ytimg.com/vi/${id}/hqdefault.jpg`;

  if(!id){loadShare();return;}
  const endpoint=`https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
  fetch(endpoint,{mode:'cors'})
    .then(r=>{if(!r.ok)throw new Error('metadata unavailable');return r.json();})
    .then(data=>{
      const title=data.title||'YouTube Release';
      const author=data.author_name||'Call Me Daddy';
      if(titleEl)titleEl.textContent=title;
      if(channelEl)channelEl.textContent=author;
      if(thumb&&data.thumbnail_url)thumb.src=data.thumbnail_url;
      document.title=`${title} — Call Me Daddy × MusicSubject`;
      setMeta('meta[name="description"]',`${title} — watch on Call Me Daddy × MusicSubject.`);
      setMeta('meta[property="og:title"]',`${title} — Call Me Daddy`);
      setMeta('meta[property="og:description"]',`Watch ${title} on Call Me Daddy × MusicSubject.`);
      setMeta('meta[name="twitter:title"]',`${title} — Call Me Daddy`);
      const share=document.querySelector('[data-share]');
      if(share){share.dataset.shareTitle=`${title} — Call Me Daddy`;share.dataset.shareText=`Check out ${title} on Call Me Daddy.`;}
    })
    .catch(()=>{})
    .finally(loadShare);
})();
