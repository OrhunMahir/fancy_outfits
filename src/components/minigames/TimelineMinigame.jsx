import { useEffect, useRef } from "react";
import { moveTimelineEvent, submitTimelineOrder, declineTimelineChallenge } from "../../game/engine.js";
import { TIMELINE_EDGE_DECLINE } from "../../game/constants.js";

/* Ordering board: every card is a real focusable button pair, so the puzzle is
   playable with a mouse, a thumb (48px targets) or the keyboard alone. No drag
   and drop — dragging is the one input that excludes all three. */
export default function TimelineMinigame({challenge,demo=false}){
  const firstRef=useRef(null);
  const cards=Array.isArray(challenge.cards)?challenge.cards:[];
  const order=Array.isArray(challenge.order)?challenge.order:[];
  const byId=new Map(cards.map(card=>[card.id,card]));

  useEffect(()=>{
    if(!demo) firstRef.current?.focus();
  },[demo]);

  return (
    <div className="action-game timeline-game">
      <div className="lock-instructions">
        Earliest at the top. Every date you need is in the case file — not on the cards.
      </div>

      <ol className="timeline-list">
        {order.map((id,index)=>{
          const card=byId.get(id);
          if(!card) return null;
          return (
            <li key={id} className="timeline-card">
              <span className="timeline-rank" aria-hidden="true">{index+1}</span>
              <span className="timeline-text">{card.text}</span>
              <span className="timeline-moves">
                <button
                  ref={index===0?firstRef:null}
                  className="btn small timeline-move"
                  type="button"
                  onClick={demo?undefined:()=>moveTimelineEvent(id,-1)}
                  disabled={demo||index===0}
                  aria-label={`Move "${card.text}" earlier (currently position ${index+1} of ${order.length})`}
                >▲</button>
                <button
                  className="btn small timeline-move"
                  type="button"
                  onClick={demo?undefined:()=>moveTimelineEvent(id,1)}
                  disabled={demo||index===order.length-1}
                  aria-label={`Move "${card.text}" later (currently position ${index+1} of ${order.length})`}
                >▼</button>
              </span>
            </li>
          );
        })}
      </ol>

      <div className="timeline-actions">
        <button className="btn safe action-primary" type="button" onClick={demo?undefined:submitTimelineOrder} disabled={demo}>
          SUBMIT CHRONOLOGY
        </button>
        <button className="btn small timeline-decline" type="button" onClick={demo?undefined:declineTimelineChallenge} disabled={demo}>
          GO IN COLD (no hour spent · {TIMELINE_EDGE_DECLINE}% on this play)
        </button>
      </div>
    </div>
  );
}
