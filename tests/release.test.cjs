const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.join(__dirname,'..');
test('更新用ファイルのハッシュと読み込むバージョンが一致する',()=>{
  const release=JSON.parse(fs.readFileSync(path.join(root,'version.json'),'utf8'));
  assert.equal(release.version,require('../package.json').version);
  for(const asset of release.assets){
    assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(root,asset.path))).digest('hex'),asset.sha256);
    assert.equal(fs.readFileSync(path.join(root,asset.path),'utf8'),fs.readFileSync(path.join(root,path.basename(asset.path)),'utf8').replace(/\r\n/g,'\n'));
  }
  const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
  assert.ok(html.includes(`name="app-version" content="${release.version}"`));
  for(const name of ['app.js','core.js','style.css'])assert.ok(html.includes(`releases/${release.version}/${name}`));
});
