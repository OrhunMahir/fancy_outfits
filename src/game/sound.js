// WebAudio synth SFX — no audio files, everything generated at runtime.
// New effect = map a frequency array like SFX.promo. AudioContext opens
// lazily on first user gesture (autoplay policy). Volumes come from settings.
import { settings } from "./settings.js";

let AC=null;
function ac(){ if(!AC) AC=new (window.AudioContext||window.webkitAudioContext)(); if(AC.state==="suspended")AC.resume(); return AC; }
function tone(freq,dur,type,vol,when){
  if(settings.sfx<=0) return;
  vol=(vol||.08)*settings.sfx;
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
/* ---------- lo-fi office ambience (procedural, no audio files) ----------
   A slow 4-chord loop (detuned triangles through a lowpass) over a bed of
   filtered noise — vinyl hiss meets HVAC. Volume lives in settings.bgm. */
let amb=null, chordStep=0;
const CHORDS=[ // Am7 → Fmaj7 → Cmaj7 → G, the four chords of quiet despair
  [220,261.63,329.63,392],[174.61,220,261.63,329.63],
  [130.81,164.81,196,246.94],[196,246.94,293.66,349.23]];
function playChord(a){
  const t=a.currentTime+0.05, notes=CHORDS[chordStep++%CHORDS.length];
  notes.forEach((f,i)=>{
    const o=a.createOscillator(), g=a.createGain(), fl=a.createBiquadFilter();
    o.type="triangle"; o.frequency.value=i===0?f/2:f; o.detune.value=Math.random()*10-5;
    fl.type="lowpass"; fl.frequency.value=750;
    g.gain.setValueAtTime(0.0001,t); g.gain.linearRampToValueAtTime(0.035,t+1.2);
    g.gain.exponentialRampToValueAtTime(0.001,t+4.4);
    o.connect(fl); fl.connect(g); g.connect(amb.master);
    o.start(t); o.stop(t+4.5);
  });
}
export function startAmbience(){
  if(settings.bgm<=0||amb) return;
  try{
    const a=ac(), master=a.createGain();
    master.gain.value=0.6*settings.bgm; master.connect(a.destination);
    const buf=a.createBuffer(1,a.sampleRate*2,a.sampleRate), d=buf.getChannelData(0);
    for(let i=0;i<d.length;i++) d[i]=Math.random()*2-1;
    const noise=a.createBufferSource(); noise.buffer=buf; noise.loop=true;
    const nf=a.createBiquadFilter(); nf.type="lowpass"; nf.frequency.value=300;
    const ng=a.createGain(); ng.gain.value=0.010;
    noise.connect(nf); nf.connect(ng); ng.connect(master); noise.start();
    amb={master,noise,timer:null};
    playChord(a);
    amb.timer=setInterval(()=>{ if(amb) playChord(a); },4000);
  }catch(e){}
}
export function stopAmbience(){
  if(!amb) return;
  clearInterval(amb.timer);
  try{ amb.noise.stop(); amb.master.disconnect(); }catch(e){}
  amb=null;
}
/* call after settings.bgm changes: live-adjusts or starts/stops the bed */
export function applyBgmVolume(){
  if(settings.bgm<=0){ stopAmbience(); return; }
  if(amb) amb.master.gain.value=0.6*settings.bgm; else startAmbience();
}
