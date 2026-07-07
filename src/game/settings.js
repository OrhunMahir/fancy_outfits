// Global player preferences — NOT part of a run's save. Persisted separately.
const KEY="fo_settings_v1";
export const settings={dayLen:75, sfx:1, bgm:1, shake:true};
try{ Object.assign(settings, JSON.parse(localStorage.getItem(KEY))||{}); }catch(e){}
export function setSetting(k,v){
  settings[k]=v;
  try{ localStorage.setItem(KEY,JSON.stringify(settings)); }catch(e){}
}
