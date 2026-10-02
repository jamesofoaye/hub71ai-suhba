import assert from 'node:assert/strict';
import ts from 'typescript';
import {readFile} from 'node:fs/promises';
const js=ts.transpileModule(await readFile('lib/embeds.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const module={exports:{}};new Function('module','exports',js)(module,module.exports);
const {nativeEmbed}=module.exports;
const url='https://www.tiktok.com/@umutdxb/video/7450801276549565703';
assert.equal(nativeEmbed(url,false),null);
const player=new URL(nativeEmbed(url,true).src);assert.equal(player.origin,'https://www.tiktok.com');assert.equal(player.searchParams.get('autoplay'),'0');assert.equal(player.searchParams.get('description'),'1');
for(const unsafe of ['http://www.tiktok.com/@umutdxb/video/7450801276549565703','https://www.tiktok.com.evil.example/@umutdxb/video/7450801276549565703','https://www.tiktok.com/@umutdxb/video/7450801276549565703/extra','javascript:alert(1)','https://www.youtube.com/watch?v=invalid'])assert.equal(nativeEmbed(unsafe,true),null);
assert.equal(nativeEmbed('https://www.instagram.com/p/Dd81ibgkZqE/',false),null);
console.log('PASS native embed approval, exact provider hosts, safe IDs and explicit no-autoplay configuration');

const instagram=nativeEmbed('https://www.instagram.com/abudhabi.finds/p/Dd81ibgkZqE/',true);assert.equal(instagram.src,undefined);assert.ok(instagram.srcDoc.includes('https://www.instagram.com/p/Dd81ibgkZqE/'));assert.ok(instagram.srcDoc.includes('https://www.instagram.com/embed.js'));assert.equal(nativeEmbed('https://www.instagram.com.evil.example/p/Dd81ibgkZqE/',true),null);assert.equal(nativeEmbed('https://www.instagram.com/p/unsafe%22script/',true),null);console.log('PASS manual Instagram embed canonicalization without arbitrary HTML or copied media');
