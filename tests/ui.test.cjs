const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.join(__dirname,'..');
function fixture(session=new Map()){
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
  const document={getElementById(id){if(!elements.has(id))elements.set(id,new Element());return elements.get(id);},createElement(tag){return new Element(tag);},createElementNS(ns,tag){return new Element(tag);}};
  const old={id:'old',date:'2026-10-17',amount:1200,category:'QOL',subcategory:'外食',memo:'以前の記録'};
  const storage=new Map([['kohaku-ledger-v1',JSON.stringify([old])]]);
  const context=vm.createContext({document,sessionStorage:{getItem:k=>session.get(k)||null,setItem:(k,v)=>session.set(k,v)},Ledger:require('../core.js'),localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},window:{addEventListener:(k,v)=>handlers[k]=v},crypto:require('node:crypto').webcrypto,setTimeout:()=>0,clearTimeout(){},confirm:()=>true,console});
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
  $('closePanel').onclick();
  assert.equal($('chosenCategory').textContent,'🖼️ QOL ／ 外食');
  $('chooseCategory').onclick();$('categories').children[1].onclick();$('children').children[2].onclick();
  assert.equal($('chosenCategory').textContent,'💡 光熱費 ／ 水道代');
  assert.equal($('categoryPanel').hidden,false);assert.equal($('children').children[2].attrs['aria-pressed'],true);
  $('entryForm').onsubmit({preventDefault(){},submitter:{id:'save'}});
  const rows=JSON.parse(f.storage.get('kohaku-ledger-v1'));
  assert.equal(rows.length,1);assert.equal(rows[0].id,'old');assert.equal(rows[0].amount,1200);assert.equal(rows[0].subcategory,'水道代');assert.equal(rows[0].memo,f.old.memo);
});
test('小分類なしの大分類は即確定し、連続入力で保存データを失わない',()=>{
  const f=fixture(),$=f.$;
  $('add').onclick();$('amount').value='650';
  $('chooseCategory').onclick();$('categories').children[1].onclick();$('categories').children[0].onclick();
  assert.equal($('categoryPanel').hidden,false);
  assert.equal($('idlePanel').hidden,true);
  assert.equal($('children').children.length,0);
  assert.equal($('categories').children[0].attrs['aria-pressed'],true);
  assert.equal($('chosenCategory').textContent,'🍜 食費');
  $('entryForm').onsubmit({preventDefault(){},submitter:{id:'continue'}});
  assert.equal($('editor').open,true);assert.equal($('amount').value,'');
  const rows=JSON.parse(f.storage.get('kohaku-ledger-v1'));
  assert.equal(rows.length,2);assert.deepEqual(rows[0],f.old);assert.equal(rows[1].category,'食費');assert.equal(rows[1].subcategory,'');
  let warned=false;
  f.handlers.beforeunload({preventDefault(){warned=true;}});assert.equal(warned,false);
  $('amount').value='123';f.handlers.beforeunload({preventDefault(){warned=true;}});assert.equal(warned,true);
});
test('入力パネルの切り替えとテンキーは未保存の入力を保持する',()=>{
 const f=fixture(),$=f.$;$('add').onclick();
 for(const k of ['6','3','3'])vm.runInContext(`amountKey('${k}')`,f.context);
 assert.equal($('amount').value,'633');assert.equal($('chosenAmount').textContent,'¥ 633');
 const originalDate=$('date').value;
 $('chooseDate').onclick();assert.equal($('datePanel').hidden,false);assert.equal($('amountPanel').hidden,true);
 $('chooseCategory').onclick();assert.equal($('amount').value,'633');assert.equal($('date').value,originalDate);
 $('chooseAmount').onclick();vm.runInContext("amountKey('⌫');amountKey('00')",f.context);assert.equal($('amount').value,'6300');
 vm.runInContext("amountKey('クリア');amountKey('0');amountKey('0');amountKey('1')",f.context);assert.equal($('amount').value,'1');
 vm.runInContext("for(let i=0;i<12;i++)amountKey('9')",f.context);assert.equal($('amount').value,'199999999');
 vm.runInContext("amountKey('完了')",f.context);assert.equal($('idlePanel').hidden,false);assert.equal($('chosenAmount').textContent,'¥ 199,999,999');
});
test('カレンダーはうるう日・年越し・月末を正しく選択する',()=>{
 const f=fixture(),$=f.$;$('add').onclick();$('date').value='2024-02-29';$('chooseDate').onclick();
 let days=$('calendarDays').children.filter(b=>b.tag==='button');assert.equal(days.length,29);assert.equal(days[28].attrs['aria-pressed'],true);
 $('calendarNext').onclick();assert.equal($('calendarMonth').textContent,'2024年 3月');
 days=$('calendarDays').children.filter(b=>b.tag==='button');assert.equal(days.length,31);days[30].onclick();assert.equal($('date').value,'2024-03-31');
 $('date').value='2025-12-31';$('chooseDate').onclick();$('calendarNext').onclick();assert.equal($('calendarMonth').textContent,'2026年 1月');
 $('calendarPrev').onclick();assert.equal($('calendarMonth').textContent,'2025年 12月');
 $('date').value='2025-02-01';$('chooseDate').onclick();assert.equal($('calendarDays').children.filter(b=>b.tag==='button').length,28);
});
test('ゼロ円を保存せず、編集・連続入力後にも専用パネルを使える',()=>{
 const f=fixture(),$=f.$;$('add').onclick();vm.runInContext("amountKey('0')",f.context);
 $('entryForm').onsubmit({preventDefault(){}});assert.equal(JSON.parse(f.storage.get('kohaku-ledger-v1')).length,1);assert.match($('formError').textContent,/金額/);
 vm.runInContext("amountKey('5')",f.context);$('entryForm').onsubmit({preventDefault(){},submitter:{id:'continue'}});
 assert.equal($('chosenAmount').textContent,'¥ 0');assert.equal($('amountPanel').hidden,false);
});
test('その他の4つの小分類を選択・保存でき、一覧を開いたまま切り替えられる',()=>{
 const f=fixture(),$=f.$;$('add').onclick();$('amount').value='500';$('chooseCategory').onclick();$('categories').children[5].onclick();
 assert.deepEqual($('children').children.map(b=>b.textContent),['病院','交通費','車関係','その他']);
 for(let i=0;i<4;i++){$('children').children[i].onclick();assert.equal($('categoryPanel').hidden,false);assert.equal($('children').children[i].attrs['aria-pressed'],true);assert.equal($('children').children.filter(b=>b.attrs['aria-pressed']).length,1);}
 $('entryForm').onsubmit({preventDefault(){},submitter:{id:'save'}});
 const rows=JSON.parse(f.storage.get('kohaku-ledger-v1'));assert.equal(rows[1].category,'その他');assert.equal(rows[1].subcategory,'その他');
});
test('以前の小分類なしのその他は編集してもそのまま保存できる',()=>{
 const f=fixture(),$=f.$;vm.runInContext("rows[0].category='その他';rows[0].subcategory='';openEditor(rows[0])",f.context);
 $('amount').value='1500';$('entryForm').onsubmit({preventDefault(){},submitter:{id:'save'}});
 const rows=JSON.parse(f.storage.get('kohaku-ledger-v1'));assert.equal(rows[0].amount,1500);assert.equal(rows[0].subcategory,'');assert.equal(rows[0].category,'その他');
});
test('記録一覧は新しい日付順の1行表示で、同日は追加の新しい順になる',()=>{
 const f=fixture(),$=f.$;
 vm.runInContext("rows=[{...rows[0],id:'late',date:'2026-10-20',category:'定期購入品',subcategory:'薬',amount:900},{...rows[0],id:'early',date:'2026-10-16',category:'食費',subcategory:'',amount:2480},{...rows[0],id:'same',date:'2026-10-16',amount:100}];month='2026-10';render()",f.context);
 const entries=$('content').children;assert.equal(entries.length,3);
 assert.deepEqual(entries.map(b=>b.children.map(c=>c.textContent)),[['10/20','(火)','薬','¥ 900'],['10/16','(金)','外食','¥ 100'],['10/16','(金)','食費','¥ 2,480']]);
 entries[0].onclick();assert.equal($('amount').value,'900');assert.equal($('chosenCategory').textContent,'💊 定期購入品 ／ 薬');
});
test('円グラフは6分類の名前・割合・引き出し線を表示し、単一分類も描画できる',()=>{
 const f=fixture(),$=f.$;
 vm.runInContext("rows=categories.map((c,i)=>({id:String(i),date:'2026-10-20',amount:i?1:95,category:c.name,subcategory:'',memo:''}));month='2026-10';view='stats';statsView='chart';render()",f.context);
 let chart=$('content').children[0].children[0];
 assert.equal(chart.children.filter(n=>n.tag==='polyline').length,6);
 const names=chart.children.filter(n=>n.attrs.class==='chart-label');assert.equal(names.length,6);
 for(const side of ['start','end']){const ys=names.filter(n=>n.attrs['text-anchor']===side).map(n=>Number(n.attrs.y)).sort((a,b)=>a-b);for(let i=1;i<ys.length;i++)assert.ok(ys[i]-ys[i-1]>=43);}
 assert.ok(chart.children.some(n=>n.textContent==='95.0%'));
 vm.runInContext("rows=rows.slice(0,1);render()",f.context);chart=$('content').children[0].children[0];assert.equal(chart.children.filter(n=>n.tag==='circle').length,1);assert.ok(chart.children.some(n=>n.textContent==='100.0%'));
});
test('統計の合計とグラフを別表示にし、月移動と空の月でも選択を維持する',()=>{
 const f=fixture(),$=f.$;vm.runInContext("month='2026-10';render()",f.context);
 assert.equal($('statsSwitch').hidden,true);$('statsTab').onclick();assert.equal($('statsSwitch').hidden,false);
 assert.equal($('totalsTab').attrs['aria-pressed'],true);assert.equal($('content').children[0].tag,'details');
 $('chartTab').onclick();assert.equal($('content').children.length,1);assert.equal($('content').children[0].className,'annotated-chart');assert.equal($('total').textContent,'¥ 1,200');
 $('prev').onclick();assert.equal($('chartTab').attrs['aria-pressed'],true);assert.equal($('content').children[0].className,'empty');
 $('next').onclick();assert.equal($('content').children[0].className,'annotated-chart');
 $('totalsTab').onclick();assert.equal($('content').children[0].tag,'details');assert.equal($('total').textContent,'¥ 1,200');
 $('listTab').onclick();assert.equal($('statsSwitch').hidden,true);assert.equal($('content').children[0].tag,'button');
});
test('再読み込み後も過去の月と統計タブを維持し、今月ボタンでは今月へ戻る',()=>{
 const session=new Map(),f=fixture(session);
 vm.runInContext("month='2026-04';view='stats';statsView='chart';render()",f.context);
 const reloaded=fixture(session),$=reloaded.$;
 assert.equal($('monthTitle').textContent,'2026年 4月');assert.equal($('statsTab').attrs['aria-selected'],true);assert.equal($('chartTab').attrs['aria-pressed'],true);
 $('today').onclick();assert.equal(vm.runInContext('month===localDate().slice(0,7)',reloaded.context),true);
 const again=fixture(session);assert.equal(vm.runInContext('month===localDate().slice(0,7)',again.context),true);
});
test('壊れた表示設定や保存不可でも記録を表示できる',()=>{
 for(const value of ['{broken',JSON.stringify({month:'2026-99',view:'unknown',statsView:'unknown'})]){
  const f=fixture(new Map([['kohaku-ledger-view-v1',value]]));assert.equal(vm.runInContext('month===localDate().slice(0,7)',f.context),true);assert.equal(f.$('listTab').attrs['aria-selected'],true);
 }
 const f=fixture({get(){throw Error('blocked');},set(){throw Error('blocked');}});
 assert.equal(vm.runInContext('rows.length',f.context),1);f.$('prev').onclick();assert.equal(vm.runInContext('storageFailed',f.context),false);
});
