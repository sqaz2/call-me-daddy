(()=>{
  const root=document.getElementById('homeMusicFinder');
  const discovery=window.CMDMusicDiscovery;
  const songs=(Array.isArray(window.CMD_SONGS)?window.CMD_SONGS:[]).filter(song=>discovery?.playable(song)||song?.youtubeUrl);
  if(!root||!discovery||!songs.length)return;

  const safe=(value='')=>String(value).replace(/[&<>\"]/g,character=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[character]));
  const categories=discovery.categories();
  let category='all';
  let query='';

  root.innerHTML=`
    <div class="home-finder-head"><div><div class="eyebrow">Know the title—or only the feeling?</div><h2>FIND A<br>SONG.</h2></div><p>Search the words you remember, browse by what you want the music to do, or separate finished stories from pages I still owe you.</p></div>
    <div class="home-finder-tools">
      <label class="home-song-search"><span>Search title, project, year or idea</span><input type="search" inputmode="search" autocomplete="off" placeholder="Try: hamster, heartbreak, funny, 2019…"><button type="button" aria-label="Clear search" hidden>×</button></label>
      <div class="home-finder-chips" role="group" aria-label="Browse music categories">${categories.map(item=>`<button type="button" data-category="${safe(item.id)}" aria-pressed="${item.id==='all'}">${safe(item.label)}</button>`).join('')}</div>
    </div>
    <p class="home-finder-summary" aria-live="polite"></p>
    <div class="home-finder-results"></div>
    <div class="home-finder-foot"><a class="btn primary" href="/music/">Open the full searchable catalog →</a><a class="btn" href="/music/?intent=surprise">Just play the site</a></div>`;

  const input=root.querySelector('input');
  const clear=root.querySelector('.home-song-search button');
  const summary=root.querySelector('.home-finder-summary');
  const results=root.querySelector('.home-finder-results');

  function render(){
    const matches=discovery.filter(songs,{query,category});
    const shown=matches.slice(0,query?8:6);
    const selected=categories.find(item=>item.id===category);
    root.querySelectorAll('[data-category]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.category===category)));
    clear.hidden=!query;
    summary.textContent=query?`${matches.length} ${matches.length===1?'match':'matches'} for “${query}”`:`${matches.length} ${matches.length===1?'song':'songs'} · ${selected?.description||'Browse the catalog.'}`;
    if(!shown.length){results.innerHTML='<div class="home-finder-empty"><strong>Nothing matched that yet.</strong><span>Try fewer words or open Everything.</span></div>';return;}
    results.innerHTML=shown.map(song=>{
      const story=discovery.storyState(song);
      const lane=discovery.primaryCategory(song);
      const canPlayHere=discovery.playable(song);
      const cover=song.cover||window.CMD_ARTWORK?.fallbackCover||'/media/site/image-coming-soon.jpg';
      const storyAction=!canPlayHere&&story.id==='ready'
        ? ''
        : story.id==='ready'
        ? `<a href="${safe(story.href)}">Open story →</a>`
        : `<a class="is-coming" href="${safe(story.href)}" target="_blank" rel="noopener">Ask me about this song ↗</a>`;
      return `<article class="home-song-result">
        <img src="${safe(cover)}" alt="" loading="lazy" decoding="async">
        <div><small>${safe(lane?.label||song.project||'Call Me Daddy')} · ${safe(story.label)}</small><strong>${safe(song.title)}</strong><span>${safe(song.project||song.artist||'MusicSubject × Call Me Daddy')}</span><div class="home-song-actions"><a class="play" href="${safe(discovery.exactSongUrl(song))}">${canPlayHere?'▶ Play this song':'↗ Open this song'}</a>${storyAction}</div></div>
      </article>`;
    }).join('');
  }

  root.addEventListener('click',event=>{
    const button=event.target.closest('[data-category]');
    if(!button)return;
    category=button.dataset.category||'all';
    render();
  });
  input.addEventListener('input',()=>{query=input.value.trim();render()});
  clear.addEventListener('click',()=>{input.value='';query='';input.focus();render()});
  render();
})();
