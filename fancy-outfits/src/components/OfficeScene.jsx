// Dynamic pixel office, drawn as inline SVG rects (no image assets — ever).
// The room upgrades with rank; low reputation swaps props for sad ones.
// New prop = push another rect here, don't go looking for asset files.
import { useGame } from "../game/useGame.js";

const W=320, H=64;

function buildScene(r,rep){
  const el=[];
  const rect=(x,y,w,h,f)=>el.push({t:"r",x,y,w,h,f});
  const text=(x,y,size,fill,str)=>el.push({t:"t",x,y,size,fill,str});
  // wall + floor (nicer materials as you rise)
  const walls=["#3d4152","#44526b","#4b5b7a","#55486b","#3d3550"];
  const floors=["#6b6455","#75694f","#7d6f52","#6e5a44","#8a7550"];
  rect(0,0,W,44,walls[r]); rect(0,44,W,20,floors[r]);
  // windows: more + bigger as rank rises
  const winN=[0,1,2,3,4][r];
  for(let i=0;i<winN;i++){
    const wx=30+i*74, ww=r>=3?54:36;
    rect(wx,6,ww,26,"#0f0f1b"); rect(wx+2,8,ww-4,22,r>=2?"#1a2b4a":"#26334d");
    if(r>=2){ // skyline in the glass
      rect(wx+5,20,6,10,"#0f0f1b"); rect(wx+14,15,7,15,"#141b33"); rect(wx+24,22,6,8,"#0f0f1b");
      rect(wx+15,17,2,2,"#ffcd75"); rect(wx+7,23,2,2,"#ffcd75");
    }
  }
  if(r===0){ // bullpen: fluorescent bar + neighbor cubicles
    rect(60,2,200,4,"#d8d8c0");
    rect(4,26,70,18,"#565b70"); rect(246,26,70,18,"#565b70"); // cubicle walls
    rect(14,30,20,8,"#8a8fa5"); rect(256,30,20,8,"#8a8fa5"); // neighbors' monitors
  }
  // your desk grows with rank
  const dw=[60,84,110,140,170][r], dx=(W-dw)/2;
  rect(dx,38,dw,6,["#7a5c3e","#7a5c3e","#8a6a48","#4a3828","#2e2318"][r]); // desktop (mahogany by the end)
  rect(dx+4,44,4,12,"#5a4430"); rect(dx+dw-8,44,4,12,"#5a4430");
  rect(dx+dw/2-6,30,12,8,"#0f0f1b"); rect(dx+dw/2-5,31,10,6,"#3b5dc9"); // monitor
  // chair: broken stool if disrespected, throne if name partner
  if(rep<30&&r<2){ rect(dx-14,46,10,4,"#565b70"); rect(dx-11,50,4,8,"#565b70"); }
  else { rect(dx-18,40,12,14,r>=3?"#6b1f2e":"#2a2f45"); rect(dx-15,54,6,4,"#0f0f1b"); }
  if(r>=1){ rect(12,34,8,10,"#2e5e3a"); rect(14,28,4,8,"#38b764"); } // plant
  if(r>=2){ rect(dx+8,32,10,6,"#ffcd75"); } // gold nameplate on desk
  if(r>=2){ rect(W-40,12,22,16,"#5a4430"); rect(W-38,14,18,12,"#f2e9d8"); } // framed diploma (ahem)
  if(r>=3){ rect(W-84,42,44,8,"#6b1f2e"); rect(W-80,50,6,6,"#0f0f1b"); rect(W-50,50,6,6,"#0f0f1b"); } // leather couch
  if(r>=3){ rect(16,46,14,4,"#8a7550"); rect(18,40,3,6,"#c9a227"); rect(23,41,3,5,"#c9a227"); } // whiskey cart
  if(r===4){ text(W/2,16,9,"#ffcd75","PARSON HENDERSON & YOU"); }
  // disrespect props
  if(rep<30){ rect(dx+dw-24,32,16,6,"#b0b0b0"); text(dx+dw-16,30,6,"#94b0c2","someone's lunch"); }
  return el;
}

const CAPS=[
  "THE BULLPEN — a desk, technically. The elevator is for partners.",
  "SHARED OFFICE — a door you share with a guy who eats tuna at 9am.",
  "YOUR OFFICE — a door. YOUR door. The plant is plastic but it's yours.",
  "CORNER OFFICE — two walls of glass. The whiskey cart is billable.",
  "THE NAME IS ON THE WALL."];

export default function OfficeScene(){
  const S=useGame();
  const shapes=buildScene(S.rank,S.rep);
  let cap=CAPS[S.rank];
  if(S.rep<30) cap+=" · People 'forget' your name in meetings. (-12% on risky plays)";
  else if(S.rep>70) cap+=" · Associates fetch YOUR coffee now. (+5% on risky plays)";
  return (
    <div id="scenewrap">
      <div id="scene">
        <svg viewBox={`0 0 ${W} ${H}`} shapeRendering="crispEdges" xmlns="http://www.w3.org/2000/svg">
          {shapes.map((s,i)=>s.t==="r"
            ? <rect key={i} x={s.x} y={s.y} width={s.w} height={s.h} fill={s.f}/>
            : <text key={i} x={s.x} y={s.y} textAnchor="middle" fontFamily="monospace" fontSize={s.size} fill={s.fill}>{s.str}</text>)}
        </svg>
      </div>
      <div id="scenecap">{cap}</div>
    </div>
  );
}
