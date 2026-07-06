// WebAudio synth SFX — no audio files, everything generated at runtime.
// New effect = map a frequency array like SFX.promo. AudioContext opens
// lazily on first user gesture (autoplay policy).
let AC=null, muted=false;
function ac(){ if(!AC) AC=new (window.AudioContext||window.webkitAudioContext)(); if(AC.state==="suspended")AC.resume(); return AC; }
function tone(freq,dur,type,vol,when){
  if(muted) return;
  try{
    const a=ac(), o=a.createOscillator(), g=a.createGain(), t=a.currentTime+(when||0);
    o.type=type||"square"; o.frequency.value=freq;
    g.gain.setValueAtTime(vol||.08,t); g.gain.exponentialRampToValueAtTime(.001,t+dur);
    o.connect(g); g.connect(a.destination); o.start(t); o.stop(t+dur);
  }catch(e){}
}
export const SFX={
  click:()=>tone(700,.05,"square",.05),
  open:()=>{tone(400,.06,"square",.05);tone(600,.06,"square",.05,.06);},
  win:()=>{[523,659,784].forEach((f,i)=>tone(f,.12,"square",.07,i*.09));},
  lose:()=>{[330,247,196].forEach((f,i)=>tone(f,.15,"sawtooth",.07,i*.11));},
  promo:()=>{[523,659,784,1047,1319].forEach((f,i)=>tone(f,.14,"square",.08,i*.1));},
  fired:()=>{[392,330,262,196,131].forEach((f,i)=>tone(f,.2,"sawtooth",.09,i*.13));},
  bell:()=>{tone(880,.4,"triangle",.07);tone(1108,.4,"triangle",.05,.02);},
  tick:()=>tone(1200,.03,"square",.04),
  send:()=>{tone(500,.05,"square",.05);tone(900,.08,"square",.05,.06);},
  crisis:()=>{[220,220,180].forEach((f,i)=>tone(f,.18,"sawtooth",.09,i*.14));},
};
export const isMuted=()=>muted;
export function toggleMute(){ muted=!muted; if(!muted)SFX.click(); }
