// Adapted from StarMuff client/public/unwritten-skies.html, SFX.startAmbient.
// Original pitches, waveform families and filter motion; no game loop or combat SFX.
export class SkiesAmbience {
  constructor(Context=globalThis.AudioContext||globalThis.webkitAudioContext){this.Context=Context;this.context=null;this.running=false;this.revision=0;this.levels={drone:45,pad:65,volume:65};}
  init(){
    if(this.context)return;
    if(!this.Context)throw Error('This browser does not support the soundscape.');
    const c=this.context=new this.Context({latencyHint:'playback'});
    const master=this.master=c.createGain();master.gain.value=0;
    const comp=c.createDynamicsCompressor();Object.assign(comp.threshold,{value:-18});comp.knee.value=6;comp.ratio.value=4;comp.attack.value=.015;comp.release.value=.4;
    master.connect(comp);comp.connect(c.destination);
    const drone=this.drone=c.createGain(),pad=this.pad=c.createGain();drone.connect(master);pad.connect(master);
    const oscillator=(type,f,target,gain=1)=>{const o=c.createOscillator();o.type=type;o.frequency.value=f;const g=c.createGain();g.gain.value=gain;o.connect(g);g.connect(target);o.start();return o;};
    const d=c.createBiquadFilter();d.type='lowpass';d.frequency.value=420;d.Q.value=2.5;d.connect(drone);
    oscillator('sawtooth',55,d);oscillator('sawtooth',55*2**(9/1200),d);oscillator('sine',55*2.93,d,.3);
    oscillator('sine',.08,d.frequency,80);
    const p=c.createBiquadFilter();p.type='lowpass';p.frequency.value=1100;p.Q.value=.8;
    const swell=c.createGain();swell.gain.value=.8;p.connect(swell);swell.connect(pad);oscillator('sine',.12,swell.gain,.2);
    [65.41,82.41,98,123.47].forEach((f,i)=>oscillator('triangle',f*(1+i*.0018),p,.28));
    // One short stereo tail keeps this standalone graph light on phones.
    const verb=c.createConvolver(),len=Math.ceil(c.sampleRate*.6),ir=c.createBuffer(2,len,c.sampleRate);
    for(let ch=0;ch<2;ch++){const data=ir.getChannelData(ch);for(let i=0;i<len;i++)data[i]=(Math.random()*2-1)*(1-i/len)**2.2;}
    verb.buffer=ir;const wet=c.createGain();wet.gain.value=.12;pad.connect(verb);verb.connect(wet);wet.connect(master);
    this.set(this.levels);
  }
  set(levels){Object.assign(this.levels,levels);if(!this.context)return;const c=this.context;const smooth=(node,v)=>{node.gain.cancelScheduledValues(c.currentTime);node.gain.setTargetAtTime(v,c.currentTime,.16);};smooth(this.drone,.14*this.levels.drone/100);smooth(this.pad,.11*this.levels.pad/100);if(this.running)smooth(this.master,.38*this.levels.volume/100);}
  async play(){this.init();const rev=++this.revision;clearTimeout(this.pauseTimer);await this.context.resume();if(rev!==this.revision)return false;this.running=true;this.set(this.levels);return true;}
  pause(){this.running=false;const rev=++this.revision;clearTimeout(this.pauseTimer);if(!this.context)return;const c=this.context;this.master.gain.cancelScheduledValues(c.currentTime);this.master.gain.setTargetAtTime(0,c.currentTime,.1);this.pauseTimer=setTimeout(()=>{if(rev===this.revision)void c.suspend().catch(()=>{});},450);}
  destroy(){this.pause();clearTimeout(this.pauseTimer);if(this.context)void this.context.close().catch(()=>{});this.context=null;}
}
