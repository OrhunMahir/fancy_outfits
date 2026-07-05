import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./styles.css";

// dev-only debug hook: inspect state / poke the engine from the console
if(import.meta.env.DEV){
  Promise.all([import("./game/state.js"), import("./game/engine.js")]).then(([st,eng])=>{
    window.game={ get S(){ return st.S; }, notify:st.notify, ...eng };
  });
}

createRoot(document.getElementById("root")).render(<App />);
