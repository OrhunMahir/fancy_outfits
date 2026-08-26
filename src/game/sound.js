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
/* How big the result FELT. The engine passes 0..1 built from rank and the
   stake multiplier, so a junior's win is a chirp and a Name Partner's win on a
   scaled file gets the extra octave. Everything stays synthesised. */
const clampScale=v=>Number.isFinite(v)?Math.max(0,Math.min(1,v)):0;
export const SFX={
  click:()=>tone(700,.05,"square",.05),
  open:()=>{tone(400,.06,"square",.05);tone(600,.06,"square",.05,.06);},
  win:(scale=0)=>{
    const k=clampScale(scale);
    [523,659,784].forEach((f,i)=>tone(f,.12+.05*k,"square",.07+.03*k,i*(.09-.015*k)));
    if(k>=.34) tone(1047,.16+.06*k,"square",.05+.03*k,.28);
    if(k>=.67){ tone(1319,.2,"square",.05,.4); tone(1568,.24,"triangle",.04,.5); }
  },
  lose:(scale=0)=>{
    const k=clampScale(scale);
    [330,247,196].forEach((f,i)=>tone(f,.15+.07*k,"sawtooth",.07+.03*k,i*.11));
    if(k>=.34) tone(147,.3+.15*k,"sawtooth",.05+.04*k,.34);
    if(k>=.67) tone(98,.5,"sawtooth",.06,.46); // the floor drops out
  },
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
let amb=null, chordStep=0, room="office";
/* One bed, four rooms. Nothing here is a new sound — it is the same loop heard
   from somewhere else, which is the point: the office should stop sounding like
   the office the moment you are standing in a hearing or alone after seven. */
const ROOMS={
  office:    {cut:750, hiss:0.010, gain:1,   beat:4000, detune:5},
  court:     {cut:430, hiss:0.004, gain:.72, beat:6200, detune:2},  // a room that hushes when you stand up
  afterhours:{cut:560, hiss:0.016, gain:.62, beat:5200, detune:7},  // empty building, louder air handling
  spent:     {cut:300, hiss:0.013, gain:.55, beat:5600, detune:14}, // exhaustion: everything goes dull and slightly out of tune
};
const roomOf=name=>ROOMS[name]||ROOMS.office;
const CHORDS=[ // Am7 → Fmaj7 → Cmaj7 → G, the four chords of quiet despair
  [220,261.63,329.63,392],[174.61,220,261.63,329.63],
  [130.81,164.81,196,246.94],[196,246.94,293.66,349.23]];
function playChord(a){
  const r=roomOf(room), t=a.currentTime+0.05, notes=CHORDS[chordStep++%CHORDS.length];
  const len=r.beat/1000+0.5;
  notes.forEach((f,i)=>{
    const o=a.createOscillator(), g=a.createGain(), fl=a.createBiquadFilter();
    o.type="triangle"; o.frequency.value=i===0?f/2:f;
    o.detune.value=Math.random()*r.detune*2-r.detune;
    fl.type="lowpass"; fl.frequency.value=r.cut;
    g.gain.setValueAtTime(0.0001,t); g.gain.linearRampToValueAtTime(0.035*r.gain,t+1.2);
    g.gain.exponentialRampToValueAtTime(0.001,t+len-0.1);
    o.connect(fl); fl.connect(g); g.connect(amb.master);
    o.start(t); o.stop(t+len);
  });
}
/* The engine calls this whenever the situation changes. Re-timing the loop only
   when the room actually changes keeps a re-render from restarting the bed. */
export function setRoomTone(next){
  const name=ROOMS[next]?next:"office";
  if(name===room) return;
  room=name;
  if(!amb) return;
  const r=roomOf(room), a=AC;
  try{
    amb.hiss.gain.setTargetAtTime(r.hiss,a.currentTime,0.6);
    clearInterval(amb.timer);
    amb.timer=setInterval(()=>{ if(amb) playChord(a); },r.beat);
  }catch(e){}
}
export const currentRoom=()=>room;
export function startAmbience(){
  if(settings.bgm<=0||amb) return;
  try{
    const a=ac(), master=a.createGain();
    master.gain.value=0.6*settings.bgm; master.connect(a.destination);
    const buf=a.createBuffer(1,a.sampleRate*2,a.sampleRate), d=buf.getChannelData(0);
    for(let i=0;i<d.length;i++) d[i]=Math.random()*2-1;
    const noise=a.createBufferSource(); noise.buffer=buf; noise.loop=true;
    const nf=a.createBiquadFilter(); nf.type="lowpass"; nf.frequency.value=300;
    const r=roomOf(room);
    const ng=a.createGain(); ng.gain.value=r.hiss;
    noise.connect(nf); nf.connect(ng); ng.connect(master); noise.start();
    amb={master,noise,hiss:ng,timer:null};
    playChord(a);
    amb.timer=setInterval(()=>{ if(amb) playChord(a); },r.beat);
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
