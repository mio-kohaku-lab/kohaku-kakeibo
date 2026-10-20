const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.join(__dirname,'..');
const version=require('../package.json').version;
const names=['app.js','core.js','style.css','update.js'];
const target=path.join(root,'releases',version);
fs.mkdirSync(target,{recursive:true});
const assets=names.map(name=>{
  // Normalize line endings so hashes survive GitHub's transport and Windows checkouts.
  const content=fs.readFileSync(path.join(root,name),'utf8').replace(/\r\n/g,'\n');
  fs.writeFileSync(path.join(target,name),content);
  return {path:`releases/${version}/${name}`,sha256:crypto.createHash('sha256').update(content).digest('hex')};
});
fs.writeFileSync(path.join(root,'version.json'),JSON.stringify({
  version,
  notes:['タイトル・月選択・支出欄・タブの間隔を詰めました。','円グラフの上下の余白を注釈に合わせて縮めました。'],
  assets
},null,2)+'\n');
