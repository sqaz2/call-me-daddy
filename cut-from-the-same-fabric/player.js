const tracks={up:{title:'Find Your People',src:'/find-your-people.mp3'},beat:{title:'Cut From the Same Fabric — Instrumental',src:'/cut-from-the-same-fabric-instrumental.mp3'},down:{title:'HELL HAS PEOPLE TOO',src:'/hell-has-people-too.mp3'}};
const audio=document.getElementById('audio'),playBtn=document.getElementById('play'),prevBtn=document.getElementById('prev'),nextBtn=document.getElementById('next'),nowTitle=document.getElementById('nowTitle'),nowLabel=document.getElementById('nowLabel'),progress=document.getElementById('progress'),timeline=document.getElementById('timeline'),seq1=document.getElementById('seq1'),seq3=document.getElementById('seq3');

const crossAudio=document.createElement('audio');
crossAudio.preload='auto';
crossAudio.src=tracks.beat.src;
crossAudio.volume=0;
crossAudio.style.display='none';
document.body.appendChild(crossAudio);

// Only used for Find Your People -> instrumental.
// The first song gets out of the way quickly while the instrumental stays
// deliberately tucked underneath it, then rises after the first song is gone.
const CROSSFADE_LEAD=18;
const FIRST_FADE_SECONDS=6.5;
const SECOND_RISE_SECONDS=5.5;
const SECOND_UNDER_VOLUME=.12;
let order=[],index=0;
let activeAudio=audio;
let crossfadeActive=false;
let crossfadeRaf=0;

function clamp01(n){return Math.max(0,Math.min(1,n));}
function smoothstep(n){n=clamp01(n);return n*n*(3-2*n);}

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
  const initialElapsed=Math.max(0,audio.currentTime-fadeStart);
  crossAudio.src=tracks.beat.src;
  crossAudio.volume=0;
  try{crossAudio.currentTime=Math.min(initialElapsed,CROSSFADE_LEAD)}catch(_){ }

  const startBeat=()=>{
    const beatStartPosition=crossAudio.currentTime;
    let firstStopped=false;

    const switchToInstrumental=()=>{
      if(firstStopped)return;
      firstStopped=true;
      audio.pause();
      audio.volume=1;
      activeAudio=crossAudio;
      index=1;
      nowTitle.textContent=tracks.beat.title;
      nowLabel.textContent='Track 2 of 3 · blended in';
      updateProgress(crossAudio);
    };

    const tick=()=>{
      if(!crossfadeActive)return;

      const elapsed=initialElapsed+Math.max(0,crossAudio.currentTime-beatStartPosition);
      const firstP=clamp01(elapsed/FIRST_FADE_SECONDS);

      if(firstP<1){
        // Fade Find Your People faster than a normal equal-power crossfade.
        audio.volume=Math.pow(1-firstP,2.15);

        // Keep the instrumental very quiet while both tracks overlap.
        crossAudio.volume=SECOND_UNDER_VOLUME*Math.pow(firstP,1.7);
      }else{
        switchToInstrumental();

        // Only after the first song is effectively gone do we let the
        // instrumental come forward to full volume.
        const riseP=clamp01((elapsed-FIRST_FADE_SECONDS)/SECOND_RISE_SECONDS);
        crossAudio.volume=SECOND_UNDER_VOLUME+(1-SECOND_UNDER_VOLUME)*smoothstep(riseP);

        if(riseP>=1){
          cancelAnimationFrame(crossfadeRaf);
          crossfadeRaf=0;
          crossAudio.volume=1;
          crossfadeActive=false;
          updateProgress(crossAudio);
          return;
        }
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