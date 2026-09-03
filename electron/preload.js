"use strict";
// Bridges the game's persistence to files on disk. Runs sandboxed: no fs here,
// every read and write is handed to the main process. Synchronous on purpose —
// src/game/store.js needs localStorage's semantics, including a write that can
// fail loudly. Reads cost one round trip at startup and none afterwards.
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("foStore", {
  readAll: () => ipcRenderer.sendSync("fo-store:read-all"),
  // Both return null on success, or a message the store turns into a throw.
  write: (key, value) => ipcRenderer.sendSync("fo-store:write", String(key), String(value)),
  remove: (key) => ipcRenderer.sendSync("fo-store:remove", String(key)),
});
