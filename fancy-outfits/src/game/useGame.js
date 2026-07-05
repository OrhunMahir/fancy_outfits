// React bridge: subscribe to the store, return the (mutable) game state.
// Components re-render on every notify(); the whole UI is cheap to redraw.
import { useSyncExternalStore } from "react";
import { S, subscribe, getVersion } from "./state.js";

export function useGame(){
  useSyncExternalStore(subscribe, getVersion);
  return S;
}
