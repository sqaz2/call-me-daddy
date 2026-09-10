(()=>{
  'use strict';
  const audio=document.getElementById('buildingAudio'),status=document.getElementById('buildingStatus'),buttons=[...document.querySelectorAll('[data-play]')];
  if(!audio||!buttons.length)return;
  const catalog=window.CMD_SONGS||[],specs=[{songId:'stomp-clamp',variantId:'suno-v6-remix',title:'I Need That Sound',intent:'level-up'},{songId:'survival-mode',variantId:'suno-v6-remix',title:'Survival Mode',intent:'think'}];
  const tracks=specs.map(spec=>{const song=catalog.find(item=>item.id===spec.songId),variant=song?.variants?.find(item=>item.id===spec.variantId);if(!song||!variant?.audio)return null;return {...song,...variant,id:`${spec.songId}:${spec.variantId}`,songId:spec.songId,variantId:spec.variantId,title:spec.title,artist:'MusicSubject × Call Me Daddy',variantLabel:variant.label,cover:variant.cover||song.cover,experience:`/still-building/?song=${spec.songId}&version=${spec.variantId}`,radioIntent:spec.intent}}).filter(Boolean);
  if(tracks.length!==2){buttons.forEach(button=>button.disabled=true);if(status)status.textContent='The recordings did not load. Use the Suno links while the page reconnects.';return}
  const absolute=value=>{try{return new URL(value,location.href).href}catch{return String(value||'')}};
  const shared=()=>{try{if(window.top!==window.self&&window.top.location.origin===location.origin)return window.top.CMDUniversalPlayer||window.CMDUniversalPlayer}catch{}return window.CMDUniversalPlayer};
  let controller=null;
  const current=()=>{const owner=shared(),media=owner?.getMedia?.(),source=media?.getAttribute?.('src')||media?.src||media?.currentSrc||'',index=tracks.findIndex(track=>absolute(track.audio)===absolute(source));return {owner,media,index,playing:Boolean(media&&!media.paused&&!media.ended)}};
  const paint=()=>{const state=current();buttons.forEach(button=>{const index=tracks.findIndex(track=>track.songId===button.dataset.play),active=index===state.index&&state.playing;button.setAttribute('aria-pressed',String(active));const badge=button.querySelector?.('.building-play');if(badge)badge.textContent=active?'❚❚ Pause V6 remix':'▶ Play V6 remix';if(button.tagName==='BUTTON'&&!badge)button.textContent=active?'❚❚ Pause here':'▶ Play here'});if(status&&state.index>=0)status.textContent=`${state.playing?'Playing':'Paused'} · ${tracks[state.index].title} · use the bottom player to seek or skip.`};
  const ensure=()=>controller||(controller=window.CMDContinuousPlayback?.create({id:'still-building',audio,tracks,localCount:2,intent:'think',pageFollowSeconds:0,onTrack:paint,onPlayState:paint,onStatus:kind=>{if(status&&['waiting','stalled'].includes(kind))status.textContent='Buffering…';paint()}}));
  const play=songId=>{const index=tracks.findIndex(track=>track.songId===songId);if(index<0)return;const state=current();if(state.index===index&&state.media){state.owner.control('toggle');paint();return}if(state.media&&state.media!==audio)state.owner.control('pause');const core=ensure();if(!core)return;core.load(index,{autoplay:true,reason:'song-artwork'});paint()};
  buttons.forEach(button=>button.addEventListener('click',()=>play(button.dataset.play)));
  document.querySelectorAll('[data-external-listen]').forEach(link=>link.addEventListener('click',()=>{const state=current();if(state.media)state.owner.control('pause');if(!audio.paused)audio.pause();paint()}));
  window.CMDContinuousPlayback?.subscribe?.(paint);paint();
})();
