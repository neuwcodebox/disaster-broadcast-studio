import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,readFile,stat,readdir,rm,mkdir} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {initializeWorkspace} from '../src/workspace.js';
import {loadScenario} from '../src/load.js';

test('workspace initialization creates a usable YAML without installing per-project skills',async()=>{
 const root=await mkdtemp(path.join(os.tmpdir(),'dbs-init-'));
 try {
  await writeFile(path.join(root,'package.json'),'{}');
  const result=await initializeWorkspace(root);
  assert.equal((await loadScenario(result.scenario)).timeline.durationInFrames,1800);
  for(const file of ['audio-code/receipt.mjs'])assert.ok((await stat(path.join(root,file))).isFile());
  assert.ok((await stat(path.join(root,'audio'))).isDirectory());
  assert.equal(await readFile(path.join(root,'package.json'),'utf8'),'{}');
  assert.ok(!(await readdir(root)).includes('.agents'));
  assert.match(result.skillSource,/github.com/);
  await assert.rejects(initializeWorkspace(root),/already exists/);
 } finally {await rm(root,{recursive:true,force:true});}
});
test('existing user paths are preserved and collisions fail before creating files',async()=>{
 for(const conflict of ['scenario.yaml','README.md','audio-code/receipt.mjs']){
  const root=await mkdtemp(path.join(os.tmpdir(),'dbs-conflict-'));
  try {
   await mkdir(path.dirname(path.join(root,conflict)),{recursive:true});
   await writeFile(path.join(root,conflict),'user content');
   await assert.rejects(initializeWorkspace(root),/already exists/);
   assert.equal(await readFile(path.join(root,conflict),'utf8'),'user content');
   if(conflict!=='README.md')assert.ok(!(await readdir(root)).includes('README.md'));
   assert.ok(!(await readdir(root)).includes('audio'));
  }finally{await rm(root,{recursive:true,force:true});}
 }
});
