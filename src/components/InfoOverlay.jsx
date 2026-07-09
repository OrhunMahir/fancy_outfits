// The "i" panel. Deliberate rule: never name the game's inspirations here.
import { closeInfo } from "../game/engine.js";

export default function InfoOverlay(){
  return (
    <div className="overlay">
      <div className="box panel">
        <h2>HOW THIS WORKS</h2>
        <div style={{fontSize:9,marginBottom:12,lineHeight:2}}>
          You're a lawyer at PARSON HENDERSON LLP. Case files land in your INBOX — read them carefully; the winning argument is usually hiding in the text.<br/><br/>
          Every option has success odds — how much of them you SEE depends on the difficulty you picked: a range on EASY, a wider one on MEDIUM and HARD, nothing at all on REALISTIC. The dice are always exact; only your information blurs. GREEN options never fail but drain your BOLDNESS. RED options are bluffs — their odds scale with Boldness, and failing them burns REPUTATION.<br/><br/>
          REPUTATION below 20: you're fired. INFLUENCE climbs the career ladder: Junior Associate to NAME PARTNER (that's the win). Low reputation also means less respect — risky plays get harder and your office gets sadder.<br/><br/>
          Each day has a timer. Cases have deadlines — miss one and it costs you. Some moves get a reply days later. Court cases have judges with tempers: check their stats before you perform.<br/><br/>
          Reputation decays a little every day. This firm forgets fast. Stay visible.<br/><br/>
          Every fifth day is FRIDAY: the partners review your week — influence gained, reputation kept, deadlines missed. A strong week earns a nod (+REP, +INFLUENCE); a weak one gets measured out loud (−REP).<br/><br/>
          Money is for spending: a TAILORED SUIT buys respect, MARV knows who your colleagues really are, and a DETECTIVE can tilt a single case file. Climbing the ladder raises the STAKES — wins pay more, failures cost much more.<br/><br/>
          Your run saves itself (except in IRONMAN — there, closing the game ends the career). ENDLESS keeps the clock running after you make Name Partner; DAILY deals everyone the same date-seeded run. Achievements live on the start screen.<br/><br/>
          Keyboard: 1-4 picks an option, Space defers a file or advances the day summary, Esc closes panels.
        </div>
        <div className="opts"><button className="btn" onClick={closeInfo}>BACK TO BILLING</button></div>
      </div>
    </div>
  );
}
