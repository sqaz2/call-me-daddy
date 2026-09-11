(() => {
  const data = window.CMD_BRIEFING;
  const songs = Array.isArray(window.CMD_SONGS) ? window.CMD_SONGS : [];
  const feed = document.getElementById('updatesFeed');
  if (!data || !Array.isArray(data.entries) || !feed) return;

  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[char]));
  const zone = data.timezone || 'America/Edmonton';
  const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const monthOnly = value => /^\d{4}-\d{2}$/.test(String(value || ''));
  const dateOnly = value => /^\d{4}-\d{2}-\d{2}$/.test(String(value || ''));
  const bySongId = new Map(songs.map(song => [song.id, song]));

  const dayKey = value => {
    const text = String(value || '');
    if (monthOnly(text) || dateOnly(text)) return text;
    try {
      return new Intl.DateTimeFormat('en-CA', {
        timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit'
      }).format(new Date(text));
    } catch {
      return text.slice(0, 10);
    }
  };

  const prettyDate = value => {
    const text = String(value || '');
    if (monthOnly(text)) {
      const [year, month] = text.split('-').map(Number);
      return `${months[month - 1] || month} ${year}`;
    }
    if (dateOnly(text)) {
      const [year, month, day] = text.split('-').map(Number);
      return `${months[month - 1] || month} ${day}, ${year}`;
    }
    try {
      return new Intl.DateTimeFormat('en', {
        timeZone: zone, month: 'long', day: 'numeric', year: 'numeric'
      }).format(new Date(text));
    } catch {
      return text.slice(0, 10);
    }
  };

  const score = value => {
    const text = String(value || '');
    if (monthOnly(text)) {
      const [year, month] = text.split('-').map(Number);
      return Date.UTC(year, month - 1, 1);
    }
    if (dateOnly(text)) {
      const [year, month, day] = text.split('-').map(Number);
      return Date.UTC(year, month - 1, day);
    }
    const parsed = Date.parse(text);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const resolved = data.entries.map(entry => {
    const song = entry.songId ? bySongId.get(entry.songId) : null;
    return {
      ...entry,
      song,
      title: entry.title || song?.title || entry.id,
      summary: entry.summary || entry.cardSummary || song?.description || '',
      href: entry.href || song?.experience || (entry.songId ? `/music/?song=${encodeURIComponent(entry.songId)}` : ''),
      updateHref: entry.sharePath || `/updates/${encodeURIComponent(entry.id)}/`
    };
  }).sort((a, b) => score(b.published) - score(a.published));

  const search=document.getElementById('updatesSearch');
  const more=document.getElementById('updatesMore');
  const count=document.getElementById('updatesResultCount');
  const buttons=[...document.querySelectorAll('[data-feed-filter]')];
  const normalize=value=>String(value||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  const isSite=entry=>/^(site update|sharing|listening path)$/i.test(entry.type||'')||!entry.song;
  let filter='music',limit=12;
  function render(){
    const query=normalize(search.value).trim();
    const matching=resolved.filter(entry=>(filter==='site'?isSite(entry):!isSite(entry))&&normalize(`${entry.title} ${entry.summary} ${entry.song?.title||''}`).includes(query));
    const visible=matching.slice(0,limit);
    count.textContent=`${matching.length} ${filter==='site'?'site notes':'releases'}${query?' found':''}`;
    buttons.forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.feedFilter===filter)));
    feed.innerHTML=visible.map(entry=>{
      const cover=entry.song?.cover||entry.cardImage||'';
      return `<article class="update-card" id="${escapeHtml(entry.id)}">
        <a class="update-open" href="${escapeHtml(entry.href||entry.updateHref)}">
          ${cover?`<img src="${escapeHtml(cover)}" alt="" width="72" height="72" loading="lazy">`:''}
          <div><time>${escapeHtml(prettyDate(entry.published))}</time><h2>${escapeHtml(entry.title)}</h2><p>${escapeHtml(entry.summary)}</p><span class="update-open-label">${entry.song?'Open release':'Read note'} →</span></div>
        </a>
        <button class="update-share" type="button" data-share="${escapeHtml(entry.updateHref)}" data-title="${escapeHtml(entry.title)}" aria-label="Share ${escapeHtml(entry.title)}">Share</button>
      </article>`;
    }).join('')||'<p class="updates-empty">Nothing found. Try a song title or fewer words.</p>';
    more.hidden=visible.length>=matching.length;
    more.textContent=filter==='site'?'Show older notes':'Show older releases';
  }
  search.addEventListener('input',()=>{limit=12;render()});
  buttons.forEach(button=>button.addEventListener('click',()=>{filter=button.dataset.feedFilter;limit=12;render()}));
  more.addEventListener('click',()=>{limit+=12;render()});
  feed.addEventListener('click',async event=>{
    const button=event.target.closest('button[data-share]');if(!button)return;
    const title=button.dataset.title,url=new URL(button.dataset.share,location.origin).href;
    if(window.CMDShare?.nativeShare){
      const done=await window.CMDShare.nativeShare({title,text:title,url});
      if(done&&!navigator.share)button.textContent='Copied';
      return;
    }
    try{await navigator.clipboard.writeText(`${title}\n${url}`);button.textContent='Copied'}catch{button.textContent='Try again'}
  });
  if(location.hash.length>1){
    let id='';try{id=decodeURIComponent(location.hash.slice(1))}catch{}
    const target=resolved.find(entry=>entry.id===id);
    if(target){filter=isSite(target)?'site':'music';limit=resolved.length;}
    render();requestAnimationFrame(()=>document.getElementById(id)?.scrollIntoView({block:'start'}));
  }else render();
})();
