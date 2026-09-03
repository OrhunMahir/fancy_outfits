// Thin wrapper: the drawing lives in src/game/logo.js, this only maps it to SVG.
import { buildLogo, LOGO_SIZE } from "../game/logo.js";

export default function Logo({size=96,lettering=true,fill=false,frame=false,className}){
  const el=buildLogo({lettering,fill,frame});
  return (
    <svg className={className} width={size} height={size} viewBox={`0 0 ${LOGO_SIZE} ${LOGO_SIZE}`}
         role="img" aria-label="FANCY OUTFITS" xmlns="http://www.w3.org/2000/svg">
      {el.map((s,i)=><rect key={i} x={s.x} y={s.y} width={s.w} height={s.h} fill={s.f}/>)}
    </svg>
  );
}
