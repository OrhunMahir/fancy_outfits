// The FANCY OUTFITS mark, built as flat rects — same rule as the office scene:
// no image assets, the art is generated. This is the single source for the logo;
// scripts/build-logo.mjs writes the SVG/PNG pack from exactly these numbers, so
// the files on disk can never drift from what the game draws.
//
// Two things here look odd on purpose:
//  1. The case file is a quarter turn clockwise. A 90 degree rotation keeps every
//     rect axis-aligned, so it is baked into screen space (see turn()) instead of
//     riding on an SVG transform — that keeps the output a plain rect list.
//  2. The lettering is not a font call. Press Start 2P was sampled once into 7x7
//     ink grids on an 8-unit advance and frozen below. A live font could be
//     substituted, and a substitution slides the pocket cut off the middle of
//     the C, which is the whole idea of the mark.

export const LOGO_SIZE = 96;

const C = {
  ground:"#1a1c2c", body:"#3d4763", hi:"#525f85", lapel:"#232a3f", edge:"#6b7bb4",
  seam:"#2a3149", shirt:"#efece2", gold:"#ffcd75", goldHi:"#ffe6b0", goldLo:"#c9a227",
  goldDk:"#8a6a1f", manila:"#b7a98a", paper:"#f2e9d8", ink:"#2b2118",
};

// Press Start 2P letterforms: 7x7 ink inside an 8-unit advance.
const GLYPHS = {
  F:["1111111","1100000","1100000","1111110","1100000","1100000","1100000"],
  A:["0011100","0110110","1100011","1100011","1111111","1100011","1100011"],
  N:["1100011","1110011","1111011","1101111","1100111","1100011","1100011"],
  C:["0011110","0110011","1100000","1100000","1100000","0110011","0011110"],
  Y:["0110011","0110011","0110011","0011110","0001100","0001100","0001100"],
  O:["0111110","1100011","1100011","1100011","1100011","1100011","0111110"],
  U:["1100011","1100011","1100011","1100011","1100011","1100011","0111110"],
  T:["0111111","0001100","0001100","0001100","0001100","0001100","0001100"],
  I:["0111111","0001100","0001100","0001100","0001100","0001100","0111111"],
  S:["0111110","1100011","1100000","0111110","0000011","1100011","0111110"],
};

// file geometry, in the file's own coordinates before the quarter turn
const FS=3.4, INSET=1.6, GAP=1.8, PAD=2.6, CAP=FS*.75, U=FS/8;
const B1=INSET+.7+CAP, B2=B1+GAP+CAP;      // first line lands right of second
const HH=B2+.7+INSET, LL=PAD+7*FS+10;      // across the lines / along the type
const TXR=82, TYT=27.9, CHARS=3.6;         // right edge, top edge, letters clear of the pocket
const CUT=TYT+PAD+CHARS*FS;                // the pocket line, through the middle of the C

const n=v=>+v.toFixed(3);
const r=(x,y,w,h,f)=>({x:n(x),y:n(y),w:n(w),h:n(h),f});
// quarter turn clockwise about the file's head: local +x runs down the screen
const turn=(x,y,w,h,f)=>r(TXR-y-h,TYT+x,h,w,f);

function letters(text,baseline,out){
  const top=baseline-FS;
  [...text].forEach((ch,i)=>{
    GLYPHS[ch].forEach((row,ry)=>{
      for(let c=0,run=0;c<=row.length;c++){
        if(row[c]==="1"){ run++; continue; }
        if(run){ out.push(turn(PAD+i*FS+(c-run)*U,top+ry*U,run*U,U,C.ink)); run=0; }
      }
    });
  });
}

// jacket parts that sit IN FRONT of the file below the pocket line
function front(out){
  const clip=(x,y,w,h,f)=>{ const t=Math.max(y,CUT); if(y+h>t) out.push(r(x,t,w,y+h-t,f)); };
  clip(52,43,13,9,C.lapel); clip(51,52,16,10,C.lapel);
  clip(52,43,2,9,C.edge);   clip(51,52,2,10,C.edge);
  clip(58,72,24,2,C.lapel); clip(58,71,24,1,C.hi);
}

function torso(out,lettering){
  const p=(...a)=>out.push(r(...a));
  p(8,25,80,71,C.body); p(12,21,72,4,C.hi);
  p(39,21,18,4,C.shirt); p(41,25,14,9,C.shirt); p(43,34,10,9,C.shirt);
  p(44,43,8,9,C.shirt);  p(45,52,6,10,C.shirt);
  p(35,21,6,4,C.lapel);  p(55,21,6,4,C.lapel);
  p(35,25,6,9,C.lapel);  p(33,34,10,9,C.lapel); p(31,43,13,9,C.lapel); p(29,52,16,10,C.lapel);
  p(55,25,6,9,C.lapel);  p(53,34,10,9,C.lapel); p(52,43,13,9,C.lapel); p(51,52,16,10,C.lapel);
  p(39,25,2,9,C.edge);   p(41,34,2,9,C.edge);   p(42,43,2,9,C.edge);   p(43,52,2,10,C.edge);
  p(55,25,2,9,C.edge);   p(53,34,2,9,C.edge);   p(52,43,2,9,C.edge);   p(51,52,2,10,C.edge);
  p(8,62,80,34,C.body);  p(47.5,62,1,34,C.seam);
  p(14,72,24,2,C.lapel); p(14,71,24,1,C.hi);
  p(58,72,24,2,C.lapel); p(58,71,24,1,C.hi);
  p(43,22,10,8,C.goldDk);  p(44.5,23.5,7,5,C.gold);
  p(45.5,30,5,13,C.gold);  p(45.5,30,5,1.8,C.goldHi);
  p(45,43,6,14,C.gold);    p(46,57,4,6,C.goldLo);
  p(45,80,6,6,C.seam);
  // the file, standing in the breast pocket
  out.push(turn(4,-2.4,11,2.4,C.manila));
  out.push(turn(0,0,LL,HH,C.manila));
  out.push(turn(INSET,INSET,LL-INSET,HH-INSET*2,C.paper));
  if(lettering){ letters("FANCY",B1,out); letters("OUTFITS",B2,out); }
  // the pocket swallows the rest, then the jacket closes back over it
  p(TXR-HH-3,CUT,88-TXR+HH+3,96-CUT,C.body);
  p(TXR-HH-3,CUT,88-TXR+HH+3,1,C.edge);
  front(out);
}

// scale+shift the drawing, then trim anything outside the visible box
function place(src,k,dx,dy,box){
  const out=[];
  for(const s of src){
    const x0=Math.max(s.x*k+dx,box.x), y0=Math.max(s.y*k+dy,box.y);
    const x1=Math.min((s.x+s.w)*k+dx,box.x+box.w), y1=Math.min((s.y+s.h)*k+dy,box.y+box.h);
    if(x1>x0&&y1>y0) out.push(r(x0,y0,x1-x0,y1-y0,s.f));
  }
  return out;
}

// lettering: the name runs down the file. Below ~226px it cannot resolve, so the
//   small sizes drop it and the title gets written beside the mark instead.
// fill: crop the torso to the full square — for icons, which have no room to spare.
// frame: gold bevel, for any surface whose background we do not control.
export function buildLogo({lettering=true,fill=false,frame=false}={}){
  const art=[]; torso(art,lettering);
  if(frame){
    return [
      r(0,0,96,96,C.goldDk), r(3,3,90,90,C.goldLo), r(3,3,90,2,C.goldHi),
      r(6,6,84,84,C.ground),
      ...place(art,1.05,-2.4,-13.45,{x:6,y:6,w:84,h:84}),
    ];
  }
  if(fill) return [r(0,0,96,96,C.ground),...place(art,1.2,-9.6,-22.2,{x:0,y:0,w:96,h:96})];
  return [r(0,0,96,96,C.ground),...art];
}
