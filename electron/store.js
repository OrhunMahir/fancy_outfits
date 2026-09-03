"use strict";
// File-backed persistence for the desktop build. Kept out of main.js so it can
// be tested against a temp directory without booting Electron.
//
// One file per key, because Steam Cloud syncs files by path: it cannot sync
// Chromium's LevelDB, and one file per key means a cloud conflict can cost you
// a single slot rather than the whole profile.
const fs = require("fs");
const path = require("path");

const SAFE_KEY = /^[A-Za-z0-9_.-]{1,120}$/;   // keys are ours; anything else is a bug or an attack

function createFileStore(dir){
  const file = key => path.join(dir, key + ".json");

  // {ok:true, data} or {ok:false, error}. A missing directory is a first launch,
  // not a failure; anything else must reach the player as "storage unavailable"
  // rather than as an empty slot they are invited to overwrite.
  function readAll(){
    const data = {};
    let names;
    try{ names = fs.readdirSync(dir); }
    catch(e){
      if(e && e.code === "ENOENT") return { ok: true, data };
      return { ok: false, error: "Save folder could not be read: " + msg(e) };
    }
    for(const name of names){
      if(!name.endsWith(".json")) continue;
      const key = name.slice(0, -5);
      if(!SAFE_KEY.test(key)) continue;
      try{ data[key] = fs.readFileSync(path.join(dir, name), "utf8"); }
      catch(e){ return { ok: false, error: "Save file could not be read: " + msg(e) }; }
    }
    return { ok: true, data };
  }

  // null on success, else a message the renderer turns into a throw.
  function write(key, value){
    if(!SAFE_KEY.test(key)) return "Refusing to write an unrecognised save key.";
    const target = file(key), tmp = target + ".tmp";
    try{
      fs.mkdirSync(dir, { recursive: true });
      // tmp + rename: a crash mid-write leaves the previous save intact rather
      // than a truncated file the loader would have to reject as corrupt.
      fs.writeFileSync(tmp, value, "utf8");
      fs.renameSync(tmp, target);
      return null;
    }catch(e){
      try{ fs.rmSync(tmp, { force: true }); }catch(_){}
      return "Save file could not be written: " + msg(e);
    }
  }

  function remove(key){
    if(!SAFE_KEY.test(key)) return "Refusing to remove an unrecognised save key.";
    try{ fs.rmSync(file(key), { force: true }); return null; }
    catch(e){ return "Save file could not be removed: " + msg(e); }
  }

  return { readAll, write, remove };
}

const msg = e => (e && e.message ? e.message : String(e));

module.exports = { createFileStore, SAFE_KEY };
