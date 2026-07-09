export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const hash=s=>{ let h=5381; for(let i=0;i<s.length;i++) h=(h*33+s.charCodeAt(i))>>>0; return h; };

/* Seedable RNG (mulberry32). DAILY mode seeds it so everyone gets the same
   case stream that day; other modes use Math.random. ALL game logic must draw
   randomness through rand()/rnd() — never Math.random directly (sound.js is
   the one exception: audio jitter must not consume the deterministic stream). */
let _rand=Math.random;
export const rand=()=>_rand();
export const rnd=a=>a[Math.floor(rand()*a.length)];
export function setSeed(n){
  let t=n>>>0;
  _rand=()=>{ t+=0x6D2B79F5; let r=Math.imul(t^t>>>15,1|t);
    r^=r+Math.imul(r^r>>>7,61|r); return ((r^r>>>14)>>>0)/4294967296; };
}
export function clearSeed(){ _rand=Math.random; }
