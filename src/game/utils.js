export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const rnd=a=>a[Math.floor(Math.random()*a.length)];
export const hash=s=>{ let h=5381; for(let i=0;i<s.length;i++) h=(h*33+s.charCodeAt(i))>>>0; return h; };
