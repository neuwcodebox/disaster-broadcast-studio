import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,readFile,stat,readdir,rm,mkdir,symlink} from 'node:fs/promises';
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
  assert.ok((await stat(path.join(root,'src/audio'))).isDirectory());
  assert.ok((await stat(path.join(root,'src/maps'))).isDirectory());
  assert.ok((await stat(path.join(root,'output/audio'))).isDirectory());
  assert.ok((await stat(path.join(root,'output/maps'))).isDirectory());
  assert.ok((await stat(path.join(root,'output'))).isDirectory());
  assert.equal(await readFile(path.join(root,'package.json'),'utf8'),'{}');
  assert.ok(!(await readdir(root)).includes('.agents'));
  assert.ok(!(await readdir(root)).includes('.gitignore'));
  assert.match(result.skillSource,/github.com/);
  await assert.rejects(initializeWorkspace(root),/already exists/);
 } finally {await rm(root,{recursive:true,force:true});}
});
test('existing user paths are preserved and collisions fail before creating files',async()=>{
 for(const conflict of ['scenario.yaml','README.md']){
  const root=await mkdtemp(path.join(os.tmpdir(),'dbs-conflict-'));
  try {
   await mkdir(path.dirname(path.join(root,conflict)),{recursive:true});
   await writeFile(path.join(root,conflict),'user content');
   await assert.rejects(initializeWorkspace(root),/already exists/);
   assert.equal(await readFile(path.join(root,conflict),'utf8'),'user content');
   if(conflict!=='README.md')assert.ok(!(await readdir(root)).includes('README.md'));
   assert.ok(!(await readdir(root)).includes('src'));
   assert.ok(!(await readdir(root)).includes('output'));
  }finally{await rm(root,{recursive:true,force:true});}
 }
});
test('source and output path conflicts fail before creating workspace files',async()=>{
 for(const conflict of ['src','src/audio','src/maps','output','output/audio','output/maps']){
 for(const kind of ['file','symlink']){
  const root=await mkdtemp(path.join(os.tmpdir(),'dbs-output-conflict-'));
  try {
   await mkdir(path.dirname(path.join(root,conflict)),{recursive:true});
   if(kind==='file')await writeFile(path.join(root,conflict),'user content');
   else {
    await mkdir(path.join(root,'existing'));
    await symlink(path.join(root,'existing'),path.join(root,conflict),'dir');
   }
   const before=(await readdir(root)).sort();
   const parent=path.dirname(path.join(root,conflict));
   const beforeParent=(await readdir(parent)).sort();
   await assert.rejects(initializeWorkspace(root),/expected directory/);
   assert.deepEqual((await readdir(root)).sort(),before);
   assert.deepEqual((await readdir(parent)).sort(),beforeParent);
   if(kind==='file')assert.equal(await readFile(path.join(root,conflict),'utf8'),'user content');
   else assert.deepEqual(await readdir(path.join(root,'existing')),[]);
  }finally{await rm(root,{recursive:true,force:true});}
 }
 }
});
test('initialization preserves artifacts in an existing output directory',async()=>{
 const root=await mkdtemp(path.join(os.tmpdir(),'dbs-existing-output-'));
 try {
  await mkdir(path.join(root,'output'));
  await writeFile(path.join(root,'output','film.mp4'),'existing render');
  await writeFile(path.join(root,'.gitignore'),'user ignore rules\n');
  const result=await initializeWorkspace(root);
  assert.equal((await loadScenario(result.scenario)).timeline.durationInFrames,1800);
  assert.equal(await readFile(path.join(root,'output','film.mp4'),'utf8'),'existing render');
  assert.deepEqual((await readdir(path.join(root,'output'))).sort(),['audio','film.mp4','maps']);
  assert.equal(await readFile(path.join(root,'.gitignore'),'utf8'),'user ignore rules\n');
 }finally{await rm(root,{recursive:true,force:true});}
});
