export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const hash=s=>{ let h=5381; for(let i=0;i<s.length;i++) h=(h*33+s.charCodeAt(i))>>>0; return h; };

/* Seedable RNG (mulberry32). DAILY mode seeds it so everyone gets the same
   case stream that day; other modes use Math.random. ALL game logic must draw
   randomness through rand()/rnd() — never Math.random directly (sound.js is
   the one exception: audio jitter must not consume the deterministic stream). */
let _rand=Math.random, _t=null; // _t: mulberry cursor (null when using Math.random)
export const rand=()=>_rand();
export const rnd=a=>a[Math.floor(rand()*a.length)];
// Deterministic Fisher-Yates. Return a copy so templates/constants stay immutable.
export function shuffle(a){
  const out=[...a];
  for(let i=out.length-1;i>0;i--){
    const j=Math.floor(rand()*(i+1));
    [out[i],out[j]]=[out[j],out[i]];
  }
  return out;
}
const mulberry=()=>()=>{ _t=(_t+0x6D2B79F5)>>>0; let r=Math.imul(_t^_t>>>15,1|_t);
  r^=r+Math.imul(r^r>>>7,61|_t); return ((r^r>>>14)>>>0)/4294967296; };
export function setSeed(n){ _t=n>>>0; _rand=mulberry(); }
export function clearSeed(){ _rand=Math.random; _t=null; }
// persist/restore the seeded cursor so DAILY stays deterministic across reloads
export const getRngState=()=>_t;
export function setRngState(t){ if(t==null) return; _t=t>>>0; _rand=mulberry(); }

/* `hash` is fine for picking a number, but its output moves by about one when
   the input's last character moves by one — so indexing a short list with
   consecutive identities lands on the same entry over and over. Avalanche the
   bits before using them to choose. (The boards learned this the hard way.) */
export function mixKey(text){
  let x=hash(String(text))>>>0;
  x^=x>>>16; x=Math.imul(x,0x7feb352d)>>>0;
  x^=x>>>15; x=Math.imul(x,0x846ca68b)>>>0;
  x^=x>>>16;
  return x>>>0;
}
