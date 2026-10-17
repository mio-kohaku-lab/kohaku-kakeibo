const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const dist=path.join(__dirname,'..');
test('ホーム画面の起動先はサブディレクトリ配信にも対応する',()=>{
  const manifest=JSON.parse(fs.readFileSync(path.join(dist,'manifest.webmanifest'),'utf8'));
  const base='https://example.com/kohaku-kakeibo/manifest.webmanifest';
  assert.equal(new URL(manifest.start_url,base).pathname,'/kohaku-kakeibo/');
  assert.equal(new URL(manifest.scope,base).pathname,'/kohaku-kakeibo/');
  assert.equal(manifest.display,'standalone');
  for(const icon of manifest.icons){const bytes=fs.readFileSync(path.join(dist,icon.src));const size=Number(icon.sizes.split('x')[0]);assert.equal(bytes.subarray(1,4).toString(),'PNG');assert.equal(bytes.readUInt32BE(16),size);assert.equal(bytes.readUInt32BE(20),size);}
});

