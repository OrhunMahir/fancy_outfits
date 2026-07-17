// Dynamic pixel office, drawn as inline SVG rects (no image assets — ever).
// The room upgrades with rank; low reputation swaps props for sad ones.
// New prop = push another rect here, don't go looking for asset files.
// The player character sits at the desk while working, walks out the door at
// day's end and walks back in each morning (S.charAnim, driven by engine.js).
import { useGame } from "../game/useGame.js";

const W=320, H=64;
const DOOR_X=4; // exit is on the left edge

function buildScene(r,rep,decor){
  const el=[];
  const rect=(x,y,w,h,f)=>el.push({t:"r",x,y,w,h,f});
  const text=(x,y,size,fill,str)=>el.push({t:"t",x,y,size,fill,str});
  // wall + floor (nicer materials as you rise)
  const walls=["#3d4152","#44526b","#4b5b7a","#55486b","#3d3550"];
  const floors=["#6b6455","#75694f","#7d6f52","#6e5a44","#8a7550"];
  rect(0,0,W,44,walls[r]); rect(0,44,W,20,floors[r]);
  // the door you arrive through every morning
  rect(DOOR_X,14,17,32,"#241a10"); rect(DOOR_X+2,16,13,30,["#5a4430","#5a4430","#6b5138","#3a2c1e","#2e2318"][r]);
  rect(DOOR_X+12,29,2,3,"#ffcd75"); // knob
  // wall clock (always ticking, never billing)
  rect(150,6,10,10,"#0f0f1b"); rect(151,7,8,8,"#e8e4da"); rect(154,9,2,3,"#0f0f1b"); rect(156,10,2,2,"#0f0f1b");
  // windows: more + bigger as rank rises
  const winN=[0,1,2,3,4][r];
  for(let i=0;i<winN;i++){
    const wx=30+i*74, ww=r>=3?54:36;
    rect(wx,6,ww,26,"#0f0f1b"); rect(wx+2,8,ww-4,22,r>=2?"#1a2b4a":"#26334d");
    if(r>=1){ rect(wx+2,12,ww-4,1,"#3d4152"); rect(wx+2,18,ww-4,1,"#3d4152"); } // blinds
    if(r>=2){ // skyline in the glass
      rect(wx+5,20,6,10,"#0f0f1b"); rect(wx+14,15,7,15,"#141b33"); rect(wx+24,22,6,8,"#0f0f1b");
      rect(wx+15,17,2,2,"#ffcd75"); rect(wx+7,23,2,2,"#ffcd75");
    }
  }
  if(r===0){ // bullpen: fluorescent bar + neighbor cubicles
    rect(60,2,200,4,"#d8d8c0");
    rect(26,26,54,18,"#565b70"); rect(246,26,70,18,"#565b70"); // cubicle walls
    rect(36,30,20,8,"#8a8fa5"); rect(256,30,20,8,"#8a8fa5"); // neighbors' monitors
  }
  if(r<=2){ rect(226,30,18,14,"#6a7080"); rect(228,33,14,1,"#3d4152"); rect(228,37,14,1,"#3d4152"); rect(234,31,4,1,"#0f0f1b"); } // filing cabinet
  if(r>=2&&r<4){ // bookshelf full of books nobody opened twice
    rect(250,10,26,22,"#4a3828");
    rect(252,12,4,8,"#b13e53"); rect(257,12,4,8,"#38b764"); rect(262,12,3,8,"#ffcd75"); rect(266,13,4,7,"#3b5dc9");
    rect(252,22,5,8,"#94b0c2"); rect(258,23,4,7,"#b13e53"); rect(263,22,3,8,"#e8e4da"); rect(267,24,4,6,"#38b764");
  }
  // rug under the desk once you matter
  if(r>=2){ const rw=[0,0,150,180,210][r]; rect((W-rw)/2,52,rw,7,["","","#5b3648","#4a2a3a","#6b3d52"][r]); }
  // your desk grows with rank
  const dw=[60,84,110,140,170][r], dx=(W-dw)/2;
  rect(dx,38,dw,6,["#7a5c3e","#7a5c3e","#8a6a48","#4a3828","#2e2318"][r]); // desktop (mahogany by the end)
  rect(dx+4,44,4,12,"#5a4430"); rect(dx+dw-8,44,4,12,"#5a4430");
  rect(dx+dw/2-6,30,12,8,"#0f0f1b"); rect(dx+dw/2-5,31,10,6,"#3b5dc9"); // monitor
  rect(dx+dw/2+9,35,7,3,"#e8e4da"); rect(dx+dw/2+9,34,7,1,"#d8d0c0"); // case files, stacked
  rect(dx+dw/2-14,34,4,4,"#b13e53"); rect(dx+dw/2-13,33,2,1,"#b13e53"); // coffee, always cold
  rect(dx+dw+6,46,8,9,"#2a2f45"); rect(dx+dw+7,45,6,1,"#565b70"); // waste bin (full of first drafts)
  // chair: broken stool if disrespected, throne if name partner
  const chairX=dx-18;
  if(rep<30&&r<2){ rect(chairX+4,46,10,4,"#565b70"); rect(chairX+7,50,4,8,"#565b70"); }
  else { rect(chairX,40,12,14,r>=3?"#6b1f2e":"#2a2f45"); rect(chairX+3,54,6,4,"#0f0f1b"); }
  if(r>=1){ rect(12,34,8,10,"#2e5e3a"); rect(14,28,4,8,"#38b764"); } // plant (near the door now)
  if(r>=2){ rect(dx+8,32,10,6,"#ffcd75"); } // gold nameplate on desk
  if(r>=2){ rect(W-40,12,22,16,"#5a4430"); rect(W-38,14,18,12,"#f2e9d8"); } // framed diploma (ahem)
  if(r>=3){ rect(W-84,42,44,8,"#6b1f2e"); rect(W-80,50,6,6,"#0f0f1b"); rect(W-50,50,6,6,"#0f0f1b"); } // leather couch
  if(r>=3){ rect(28,46,14,4,"#8a7550"); rect(30,40,3,6,"#c9a227"); rect(35,41,3,5,"#c9a227"); } // whiskey cart
  if(r===4){ text(W/2,16,9,"#ffcd75","PARSON HENDERSON & YOU"); }
  // purchased decor (see DECOR in constants) — your money, visibly spent
  if(decor.fish){ // aquarium on a stand, two salaried fish
    rect(46,50,16,6,"#4a3828"); rect(47,42,14,8,"#0f0f1b"); rect(48,43,12,6,"#1a3a5c");
    rect(49,44,10,1,"#2c5f8a"); rect(50,46,2,2,"#ffcd75"); rect(55,47,2,2,"#e8734a");
  }
  if(decor.art){ // real art, in the gap between windows (every rank has this gap)
    rect(87,9,14,12,"#5a4430"); rect(88,10,12,10,"#2c4870");
    rect(90,12,4,3,"#e8a33d"); rect(94,15,4,3,"#b13e53"); rect(89,17,3,2,"#38b764");
  }
  if(decor.espresso){ // the personal machine, hissing like opposing counsel
    rect(68,50,12,6,"#565b70"); rect(70,44,8,6,"#2a2a34"); rect(72,45,2,1,"#b13e53"); rect(76,46,1,3,"#8a8fa5");
  }
  if(decor.monitor){ // second monitor: twice the screens, twice the ignored email
    rect(dx+dw/2+10,29,10,7,"#0f0f1b"); rect(dx+dw/2+11,30,8,5,"#38b764");
  }
  // disrespect props
  if(rep<30){ rect(dx+dw-24,32,16,6,"#b0b0b0"); text(dx+dw-16,30,6,"#94b0c2","someone's lunch"); }
  return {el,chairX};
}

/* --- the associate (that's you) — suit upgrades with rank, obviously --- */
const SUITS=["#6b4f2e","#22306b","#2a2a34","#101018","#e8e4da"];
const SKIN="#e0b088", HAIR="#2b2118";

function SittingChar({x,r}){
  const suit=SUITS[r];
  return (<g>
    <rect x={x} y={25} width={5} height={2} fill={HAIR}/><rect x={x} y={27} width={5} height={4} fill={SKIN}/>
    <rect x={x-1} y={31} width={7} height={9} fill={suit}/>
    {r>=2&&<rect x={x+2} y={31} width={2} height={5} fill={r>=3?"#ffcd75":"#b13e53"}/>}
    <rect x={x+5} y={34} width={7} height={2} fill={suit}/>{/* arms on the keyboard */}
    <rect x={x+1} y={40} width={8} height={3} fill="#1a1c2c"/><rect x={x+7} y={43} width={3} height={9} fill="#1a1c2c"/>
  </g>);
}
function StandingChar({x,r}){
  const suit=SUITS[r];
  return (<g className="charbob">
    <rect x={x} y={22} width={5} height={2} fill={HAIR}/><rect x={x} y={24} width={5} height={4} fill={SKIN}/>
    <rect x={x-1} y={28} width={7} height={11} fill={suit}/>
    {r>=2&&<rect x={x+2} y={28} width={2} height={5} fill={r>=3?"#ffcd75":"#b13e53"}/>}
    <rect x={x} y={39} width={3} height={11} fill="#1a1c2c"/><rect x={x+4} y={39} width={3} height={11} fill="#1a1c2c"/>
  </g>);
}

const CAPS=[
  "THE BULLPEN — a desk, technically. The elevator is for partners.",
  "SHARED OFFICE — a door you share with a guy who eats tuna at 9am.",
  "YOUR OFFICE — a door. YOUR door. The plant is plastic but it's yours.",
  "CORNER OFFICE — two walls of glass. The whiskey cart is billable.",
  "THE NAME IS ON THE WALL."];

export default function OfficeScene(){
  const S=useGame();
  // during a promotion walk the room keeps the OLD rank until you're back at the desk
  const shownRank=S.sceneRank!=null?S.sceneRank:S.rank;
  const {el:shapes,chairX}=buildScene(shownRank,S.rep,S.decor||{});
  const walkDist=DOOR_X+6-chairX; // negative: door is to the left
  let cap=S.sceneRank!=null?"PROMOTED — packing up the old desk…":CAPS[shownRank];
  if(S.sceneRank==null&&S.rep<30) cap+=" · People 'forget' your name in meetings. (-12% on risky plays)";
  else if(S.sceneRank==null&&S.rep>70) cap+=" · Associates fetch YOUR coffee now. (+5% on risky plays)";
  return (
    <div id="scenewrap">
      <div id="scene">
        <svg viewBox={`0 0 ${W} ${H}`} shapeRendering="crispEdges" xmlns="http://www.w3.org/2000/svg">
          {shapes.map((s,i)=>s.t==="r"
            ? <rect key={i} x={s.x} y={s.y} width={s.w} height={s.h} fill={s.f}/>
            : <text key={i} x={s.x} y={s.y} textAnchor="middle" fontFamily="monospace" fontSize={s.size} fill={s.fill}>{s.str}</text>)}
          {S.charAnim==="working"
            ? <SittingChar x={chairX+3} r={shownRank}/>
            : <g className={S.charAnim==="leaving"?"char-leave":"char-arrive"} style={{"--wd":walkDist+"px"}}>
                <StandingChar x={chairX+2} r={shownRank}/>
              </g>}
        </svg>
      </div>
      <div id="scenecap">{cap}</div>
    </div>
  );
}
