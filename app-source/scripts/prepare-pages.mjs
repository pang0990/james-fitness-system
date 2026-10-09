import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const source=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const root=path.dirname(source);
if(path.basename(source)!=='app-source'||!fs.existsSync(path.join(root,'.git')))throw new Error('Run this only in repository/app-source');
execFileSync('npm',['run','build'],{cwd:source,env:{...process.env,NEXT_PUBLIC_BASE_PATH:'/summergym.github.io'},stdio:'inherit'});
const manifest=path.join(root,'.pages-files.json');
const old=fs.existsSync(manifest)?JSON.parse(fs.readFileSync(manifest,'utf8')):[];
for(const name of old){if(name.startsWith('.')||name.includes('/')||['app-source','README.md'].includes(name))throw Error('Invalid old export entry');fs.rmSync(path.join(root,name),{recursive:true,force:true});}
const names=fs.readdirSync(path.join(source,'out'));
for(const name of names)fs.cpSync(path.join(source,'out',name),path.join(root,name),{recursive:true});
fs.writeFileSync(path.join(root,'.nojekyll'),'');
fs.writeFileSync(manifest,JSON.stringify(names,null,2)+'\n');
console.log('Pages output updated. Review, commit and push repository.');
