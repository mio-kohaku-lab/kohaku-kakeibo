const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.join(__dirname,'..');
async function fixture(mode){
  const elements=new Map();const get=id=>{if(!elements.has(id))elements.set(id,{hidden:id==='openUpdated',textContent:'',children:[],append(n){this.children.push(n);},replaceChildren(){this.children=[];}});return elements.get(id);};
  const release=JSON.parse(fs.readFileSync(path.join(root,'version.json'),'utf8'));
  const context=vm.createContext({
    document:{getElementById:get,createElement:()=>({textContent:''})},
    location:{href:'https://example.com/kohaku-kakeibo/update.html?from=0.1.0',search:'?from=0.1.0'},
    URL,URLSearchParams,AbortController,setTimeout,clearTimeout,TextEncoder,crypto:require('node:crypto').webcrypto,
    localStorage:{getItem(){throw Error('更新で記録に触れてはいけない');},setItem(){throw Error('更新で記録に触れてはいけない');},clear(){throw Error('更新で記録に触れてはいけない');}},
    DOMParser:class{parseFromString(){return {querySelector:()=>({content:mode==='mismatch'?'0.1.0':release.version})};}},
    fetch:async url=>{
      if(mode==='offline')throw Error('offline');
      const name=new URL(url).pathname.replace('/kohaku-kakeibo/','');
      return {ok:true,text:async()=>name==='version.json'?JSON.stringify(release):name.startsWith('releases/')?(mode==='corrupt'?'broken':fs.readFileSync(path.join(root,name),'utf8')):'<html></html>'};
    }
  });
  vm.runInContext(fs.readFileSync(path.join(root,'update.js'),'utf8'),context);
  await new Promise(setImmediate);
  return get;
}
test('更新準備は正しいファイルを検証して同じURL領域へ戻す',async()=>{
  const $=await fixture('ok');await $('prepareUpdate').onclick();
  assert.equal($('openUpdated').hidden,false);
  const url=new URL($('openUpdated').href);
  assert.equal(url.pathname,'/kohaku-kakeibo/');assert.equal(url.searchParams.get('release'),'0.2.0');
});
test('オフライン・壊れたファイル・公開途中では成功表示せず再試行できる',async()=>{
  for(const mode of ['offline','corrupt','mismatch']){
    const $=await fixture(mode);if(mode!=='offline')await $('prepareUpdate').onclick();
    assert.equal($('openUpdated').hidden,true,mode);
    assert.equal($('prepareUpdate').disabled,false,mode);
    assert.match($('updateStatus').textContent,/更新できませんでした/,mode);
  }
});
