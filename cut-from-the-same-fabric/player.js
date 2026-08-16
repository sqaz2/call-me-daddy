const tracks={up:{title:'Find Your People',src:'/find-your-people.mp3'},beat:{title:'Cut From the Same Fabric — Instrumental',src:'/cut-from-the-same-fabric-instrumental.mp3'},down:{title:'HELL HAS PEOPLE TOO',src:'/hell-has-people-too.mp3'}};
const audio=document.getElementById('audio'),playBtn=document.getElementById('play'),prevBtn=document.getElementById('prev'),nextBtn=document.getElementById('next'),nowTitle=document.getElementById('nowTitle'),nowLabel=document.getElementById('nowLabel'),progress=document.getElementById('progress'),timeline=document.getElementById('timeline'),seq1=document.getElementById('seq1'),seq3=document.getElementById('seq3');

const crossAudio=document.createElement('audio');
crossAudio.preload='auto';
crossAudio.src=tracks.beat.src;
crossAudio.volume=0;
crossAudio.style.display='none';
document.body.appendChild(crossAudio);

const CROSSFADE_LEAD=30;
const CROSSFADE_SECONDS=22;
let order=[],index=0;
let activeAudio=audio;
let crossfadeActive=false;
let crossfadeRaf=0;

function stopCrossfade(){
  cancelAnimationFrame(crossfadeRaf);
  crossfadeRaf=0;
  crossfadeActive=false;
  crossAudio.pause();
  crossAudio.volume=0;
  try{crossAudio.currentTime=0}catch(_){ }
  audio.volume=1;
}

function primeBeat(){
  if(order[0]!=='up')return;
  crossAudio.src=tracks.beat.src;
  crossAudio.volume=0;
  const p=crossAudio.play();
  if(p&&typeof p.then==='function'){
    p.then(()=>{crossAudio.pause();try{crossAudio.currentTime=0}catch(_){ }}).catch(()=>{});
  }
}

function choose(path){
  stopCrossfade();
  activeAudio=audio;
  order=path==='up'?['up','beat','down']:['down','beat','up'];
  index=0;
  document.querySelectorAll('.choice').forEach(b=>b.classList.toggle('active',b.dataset.path===path));
  seq1.innerHTML=`<span class="num">01 · START</span><strong>${tracks[order[0]].title}</strong>`;
  seq3.innerHTML=`<span class="num">03 · OTHER SIDE</span><strong>${tracks[order[2]].title}</strong>`;
  load(true);
  if(path==='up')primeBeat();
}

function load(autoplay=false){
  if(!order.length)return;
  stopCrossfade();
  if(activeAudio!==audio){activeAudio.pause();activeAudio=audio;}
  const key=order[index],t=tracks[key];
  audio.src=t.src;
  audio.volume=1;
  nowTitle.textContent=t.title;
  nowLabel.textContent=`Track ${index+1} of 3`;
  progress.style.width='0%';
  if(autoplay)audio.play().then(()=>playBtn.textContent='❚❚').catch(()=>playBtn.textContent='▶');
}

function toggle(){
  if(!order.length){choose('up');return;}
  if(activeAudio.paused)activeAudio.play();else activeAudio.pause();
}

function step(delta){
  if(!order.length)return;
  stopCrossfade();
  activeAudio=audio;
  index=(index+delta+order.length)%order.length;
  load(true);
}

function updateProgress(el){
  if(el!==activeAudio||!el.duration)return;
  progress.style.width=`${el.currentTime/el.duration*100}%`;
}

function shouldCrossfade(){
  return order.length===3&&order[0]==='up'&&index===0&&order[index]==='up'&&activeAudio===audio&&!crossfadeActive&&Number.isFinite(audio.duration)&&audio.duration>CROSSFADE_LEAD+2;
}

function beginPositiveCrossfade(){
  if(!shouldCrossfade())return;
  const fadeStart=audio.duration-CROSSFADE_LEAD;
  if(audio.currentTime<fadeStart)return;

  crossfadeActive=true;
  const elapsed=Math.max(0,audio.currentTime-fadeStart);
  crossAudio.src=tracks.beat.src;
  crossAudio.volume=0;
  try{crossAudio.currentTime=Math.min(elapsed,CROSSFADE_SECONDS)}catch(_){ }

  const startBeat=()=>{
    const tick=()=>{
      if(!crossfadeActive)return;
      const p=Math.max(0,Math.min(1,(audio.currentTime-fadeStart)/CROSSFADE_SECONDS));
      audio.volume=Math.cos(p*Math.PI/2);
      crossAudio.volume=Math.sin(p*Math.PI/2);

      if(p>=1){
        cancelAnimationFrame(crossfadeRaf);
        crossfadeRaf=0;
        audio.pause();
        audio.volume=1;
        crossAudio.volume=1;
        activeAudio=crossAudio;
        crossfadeActive=false;
        index=1;
        nowTitle.textContent=tracks.beat.title;
        nowLabel.textContent='Track 2 of 3 · crossfaded';
        updateProgress(crossAudio);
        return;
      }
      crossfadeRaf=requestAnimationFrame(tick);
    };
    cancelAnimationFrame(crossfadeRaf);
    crossfadeRaf=requestAnimationFrame(tick);
  };

  const p=crossAudio.play();
  if(p&&typeof p.then==='function')p.then(startBeat).catch(()=>{crossfadeActive=false;audio.volume=1;});
  else startBeat();
}

function handleEnded(el){
  if(el!==activeAudio)return;
  if(index<order.length-1){
    index++;
    load(true);
  }else{
    playBtn.textContent='▶';
  }
}

document.querySelectorAll('.choice').forEach(b=>b.addEventListener('click',()=>choose(b.dataset.path)));
playBtn.addEventListener('click',toggle);
prevBtn.addEventListener('click',()=>step(-1));
nextBtn.addEventListener('click',()=>step(1));

audio.addEventListener('play',()=>{if(activeAudio===audio)playBtn.textContent='❚❚'});
audio.addEventListener('pause',()=>{if(activeAudio===audio&&!crossfadeActive)playBtn.textContent='▶'});
audio.addEventListener('ended',()=>handleEnded(audio));
audio.addEventListener('timeupdate',()=>{
  updateProgress(audio);
  if(shouldCrossfade()&&audio.duration-audio.currentTime<=CROSSFADE_LEAD)beginPositiveCrossfade();
});

crossAudio.addEventListener('play',()=>{if(activeAudio===crossAudio)playBtn.textContent='❚❚'});
crossAudio.addEventListener('pause',()=>{if(activeAudio===crossAudio)playBtn.textContent='▶'});
crossAudio.addEventListener('ended',()=>handleEnded(crossAudio));
crossAudio.addEventListener('timeupdate',()=>updateProgress(crossAudio));

timeline.addEventListener('click',e=>{
  if(!activeAudio.duration)return;
  const r=timeline.getBoundingClientRect();
  activeAudio.currentTime=((e.clientX-r.left)/r.width)*activeAudio.duration;
});