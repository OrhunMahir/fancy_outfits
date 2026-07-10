// Global player preferences — NOT part of a run's save. Persisted separately.
const KEY="fo_settings_v1";
export const settings={dayLen:8, sfx:1, bgm:1, shake:true}; // dayLen is fictional HOURS now
try{ Object.assign(settings, JSON.parse(localStorage.getItem(KEY))||{}); }catch(e){}
if(settings.dayLen>12) settings.dayLen=8; // migrate old real-time seconds (60/75/90) to hours
export function setSetting(k,v){
  settings[k]=v;
  try{ localStorage.setItem(KEY,JSON.stringify(settings)); }catch(e){}
}
