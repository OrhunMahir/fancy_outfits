// Zips dist/ for itch.io's HTML5 upload: index.html must sit at the zip root.
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { resolve } from "node:path";

const root=resolve(import.meta.dirname,"..");
const { productName, version }=JSON.parse(readFileSync(resolve(root,"package.json"),"utf8"));
const dist=resolve(root,"dist");
if(!existsSync(resolve(dist,"index.html"))) throw new Error("dist/index.html missing — run the build first");
mkdirSync(resolve(root,"release"),{recursive:true});
const out=resolve(root,"release",`${productName}-${version}-web.zip`);
rmSync(out,{force:true});
execFileSync("zip",["-rq9X",out,".","-x",".*"],{cwd:dist,stdio:"inherit"});
const list=execFileSync("unzip",["-Z1",out],{encoding:"utf8"}).trim().split("\n");
if(!list.includes("index.html")) throw new Error("index.html is not at the zip root");
console.log(`${out}\n${list.length} files: ${list.join(", ")}`);
