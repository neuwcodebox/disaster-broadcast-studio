import {test} from 'node:test';
import assert from 'node:assert/strict';
import {encodeWav,seededRandom} from '../src/audio/wav.js';
test('PCM16 WAV preserves stereo order, length and reports clipping',()=>{
 const {wav,peak,clippedSamples,frames}=encodeWav([new Float32Array([-.5,2]),new Float32Array([.25,-1])],48000);
 const v=new DataView(wav.buffer);
 assert.equal(new TextDecoder().decode(wav.subarray(0,4)),'RIFF');
 assert.equal(v.getUint32(4,true),wav.length-8);
 assert.equal(v.getUint16(22,true),2);assert.equal(v.getUint32(24,true),48000);
 assert.equal(v.getUint32(40,true),8);assert.equal(frames,2);
 assert.deepEqual([44,46,48,50].map(i=>v.getInt16(i,true)),[-16384,8192,32767,-32768]);
 assert.equal(peak,2);assert.equal(clippedSamples,1);
});
test('invalid PCM is rejected and procedural seed is repeatable',()=>{
 assert.throws(()=>encodeWav([new Float32Array([NaN])],48000),/non-finite/);
 assert.throws(()=>encodeWav([new Float32Array([1]),new Float32Array(2)],48000),/equal length/);
 const a=seededRandom(731),b=seededRandom(731),c=seededRandom(732);
 const series=Array.from({length:6},a);assert.deepEqual(series,Array.from({length:6},b));assert.notDeepEqual(series,Array.from({length:6},c));
});
