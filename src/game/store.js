// The one place that knows WHERE persistence lives.
//
// In a browser it is localStorage, as it always was. Inside the Electron shell
// it is one small file per key under the app's user-data directory, because
// Steam Cloud syncs FILES: it cannot sync a Chromium LevelDB, and pointing it at
// one would corrupt saves across machines. One file per key also bounds the
// blast radius of a cloud conflict to a single slot rather than the profile.
//
// The API keeps localStorage's exact semantics, and that includes throwing.
// The save layer distinguishes "no save here" from "storage is unavailable" by
// whether a read throws, and turns a failed write into the AUTO-SAVE FAILED
// banner — so this layer must never quietly swallow either. That is also why
// the desktop backend writes through synchronous IPC rather than fire-and-forget:
// payloads are tens of kilobytes on a local disk, and honest failure reporting
// is worth more than the microseconds.

const LEGACY_PREFIX="fo_";

// Exported for tests: the whole backend is built from its two dependencies so a
// fake bridge and a fake localStorage can be handed to it. `web` may be a getter,
// because globalThis.localStorage does not necessarily exist yet when this module
// is evaluated — ES imports run before the importing file's own top-level code.
export function createStore(bridge,webSource){
  const web=()=>typeof webSource==="function"?webSource():webSource;
  const boot=bridge?bridge.readAll():null;
  const mirror=boot&&boot.ok?new Map(Object.entries(boot.data||{})):null;
  // The store exists but could not be read (permissions, unreadable disk). Reads
  // must throw here, exactly as a blocked localStorage would, or a fresh-looking
  // "empty" slot invites the player to overwrite saves that are merely unreachable.
  const unreadable=bridge&&!(boot&&boot.ok)
    ? new Error((boot&&boot.error)||"Save folder could not be read.") : null;

  // Builds before the file store kept saves in localStorage. If the file store is
  // empty and the old storage still holds keys, hand them over before anything
  // reads — otherwise an updating player opens the game to empty slots with their
  // career sitting unreachable one layer below. The originals are NEVER deleted:
  // if this hand-over is wrong, the data is still where it was.
  let handedOver=[];
  if(mirror&&mirror.size===0&&web()){
    try{
      const found=[], src=web();
      for(let i=0;i<src.length;i++){
        const key=src.key(i);
        if(!key||!key.startsWith(LEGACY_PREFIX)) continue;
        const value=src.getItem(key);
        if(value!=null) found.push([key,String(value)]);
      }
      for(const [key,value] of found){
        if(bridge.write(key,value)) break;   // a failing disk stops the hand-over rather than half-doing it
        mirror.set(key,value); handedOver.push(key);
      }
    }catch(e){ /* no old storage to read; nothing to hand over */ }
  }

  return {
    isDesktop:()=>!!bridge,
    handedOver:()=>handedOver.slice(),
    getItem(key){
      if(unreadable) throw unreadable;
      if(mirror) return mirror.has(key)?mirror.get(key):null;
      return web().getItem(key);
    },
    setItem(key,value){
      const v=String(value);
      if(mirror){ const err=bridge.write(key,v); if(err) throw new Error(err); mirror.set(key,v); return; }
      if(unreadable) throw unreadable;
      web().setItem(key,v);
    },
    removeItem(key){
      if(mirror){ const err=bridge.remove(key); if(err) throw new Error(err); mirror.delete(key); return; }
      if(unreadable) throw unreadable;
      web().removeItem(key);
    },
  };
}

const impl=createStore(
  typeof window!=="undefined"&&window.foStore?window.foStore:null,
  ()=>globalThis.localStorage
);

export const isDesktopStore=()=>impl.isDesktop();
export const legacyHandover=()=>impl.handedOver();
export const getItem=key=>impl.getItem(key);
export const setItem=(key,value)=>impl.setItem(key,value);
export const removeItem=key=>impl.removeItem(key);
