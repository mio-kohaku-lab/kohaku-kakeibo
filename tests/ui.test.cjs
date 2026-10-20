const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.join(__dirname,'..');
function fixture(){
  const elements=new Map(),handlers={};
  class Element{
    set value(value){this._value=String(value);}
    get value(){return this._value;}
    constructor(tag='div'){this.tag=tag;this.children=[];this.value='';this.style={};this.open=false;this.classList={add(){},remove(){}};this.attrs={};}
    append(...children){this.children.push(...children);}
    replaceChildren(...children){this.children=children;}
    setAttribute(k,v){this.attrs[k]=v;}
    querySelectorAll(){return this.children;}
    showModal(){this.open=true;}
    close(){this.open=false;}
    focus(){document.activeElement=this;}
    blur(){document.activeElement=null;}
    addEventListener(name,fn){this[name]=fn;}
  }
  const document={getElementById(id){if(!elements.has(id))elements.set(id,new Element());return elements.get(id);},createElement(tag){return new Element(tag);}};
  const old={id:'old',date:'2026-10-17',amount:1200,category:'QOL',subcategory:'外食',memo:'以前の記録'};
  const storage=new Map([['kohaku-ledger-v1',JSON.stringify([old])]]);
  const context=vm.createContext({document,Ledger:require('../core.js'),localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},window:{addEventListener:(k,v)=>handlers[k]=v},crypto:require('node:crypto').webcrypto,setTimeout:()=>0,clearTimeout(){},confirm:()=>true,console});
  vm.runInContext(fs.readFileSync(path.join(root,'app.js'),'utf8'),context);
  return {$:document.getElementById.bind(document),context,storage,old,handlers};
}
test('分類のキャンセルは元の内訳を保持し、確定後の保存も過去の記録を保持する',()=>{
  const f=fixture(),$=f.$;
  vm.runInContext("openEditor(rows[0])",f.context);
  assert.equal($('chosenCategory').textContent,'🖼️ QOL ／ 外食');
  $('chooseCategory').onclick();
  $('categories').children[1].onclick();
  assert.equal($('children').children.length,5);
  $('closeCategory').onclick();
  assert.equal($('chosenCategory').textContent,'🖼️ QOL ／ 外食');
  $('chooseCategory').onclick();$('categories').children[1].onclick();$('children').children[2].onclick();
  assert.equal($('chosenCategory').textContent,'💡 光熱費 ／ 水道代');
  assert.equal($('categoryPicker').open,false);
  $('entryForm').onsubmit({preventDefault(){},submitter:{id:'save'}});
  const rows=JSON.parse(f.storage.get('kohaku-ledger-v1'));
  assert.equal(rows.length,1);assert.equal(rows[0].id,'old');assert.equal(rows[0].amount,1200);assert.equal(rows[0].subcategory,'水道代');
});
test('小分類なしの大分類は即確定し、連続入力で保存データを失わない',()=>{
  const f=fixture(),$=f.$;
  $('add').onclick();$('amount').value='650';
  $('chooseCategory').onclick();$('categories').children[0].onclick();
  assert.equal($('categoryPicker').open,false);
  $('entryForm').onsubmit({preventDefault(){},submitter:{id:'continue'}});
  assert.equal($('editor').open,true);assert.equal($('amount').value,'');
  const rows=JSON.parse(f.storage.get('kohaku-ledger-v1'));
  assert.equal(rows.length,2);assert.deepEqual(rows[0],f.old);assert.equal(rows[1].category,'食費');assert.equal(rows[1].subcategory,'');
  let warned=false;
  f.handlers.beforeunload({preventDefault(){warned=true;}});assert.equal(warned,false);
  $('memo').value='編集中';f.handlers.beforeunload({preventDefault(){warned=true;}});assert.equal(warned,true);
});
