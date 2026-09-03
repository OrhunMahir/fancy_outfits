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
// the desktop backend writes through synchronous IPC instead of fire-and-forget:
// payloads are tens of kilobytes on a local disk, and honest failure reporting
// is worth more than the microseconds.

const bridge = typeof window !== "undefined" && window.foStore ? window.foStore : null;

// One round trip at startup; after that the mirror answers every read.
const boot = bridge ? bridge.readAll() : null;
const mirror = boot && boot.ok ? new Map(Object.entries(boot.data || {})) : null;
// The store exists but could not be read (permissions, unreadable disk). Reads
// must throw here, exactly as a blocked localStorage would, or a fresh-looking
// "empty" slot invites the player to overwrite saves that are merely unreachable.
const unreadable = bridge && !(boot && boot.ok)
  ? new Error((boot && boot.error) || "Save folder could not be read.")
  : null;

export const isDesktopStore = () => !!bridge;

export function getItem(key){
  if(unreadable) throw unreadable;
  if(mirror) return mirror.has(key) ? mirror.get(key) : null;
  return globalThis.localStorage.getItem(key);
}

export function setItem(key,value){
  const v=String(value);
  if(mirror){
    const err=bridge.write(key,v);
    if(err) throw new Error(err);
    mirror.set(key,v);
    return;
  }
  if(unreadable) throw unreadable;
  globalThis.localStorage.setItem(key,v);
}

export function removeItem(key){
  if(mirror){
    const err=bridge.remove(key);
    if(err) throw new Error(err);
    mirror.delete(key);
    return;
  }
  if(unreadable) throw unreadable;
  globalThis.localStorage.removeItem(key);
}
