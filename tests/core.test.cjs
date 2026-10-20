const {test}=require('node:test');const assert=require('node:assert/strict');const {validate,monthly}=require('../core.js');
const row={id:'a',date:'2026-10-17',amount:633,category:'食費',subcategory:'',memo:'野菜'};
test('月境界と外食分類を維持して集計する',()=>{const rows=[row,{...row,id:'b',category:'QOL',subcategory:'外食',amount:2000},{...row,id:'c',date:'2026-09-30',amount:900}];const m=monthly(validate(rows),'2026-10');assert.equal(m.total,2633);assert.equal(m.entries.length,2);assert.equal(m.groups.find(c=>c.name==='食費').total,633);assert.equal(m.groups.find(c=>c.name==='QOL').total,2000);});
test('破損したバックアップを拒否する',()=>{for(const patch of [{amount:-1},{amount:1.5},{date:'2026-02-30'},{category:'未知'},{subcategory:'外食'},{memo:null}])assert.throws(()=>validate([{...row,...patch}]));assert.throws(()=>validate([row,row]));assert.deepEqual(validate([]),[]);});
test('バックアップ往復で日本語と金額を保つ',()=>{assert.deepEqual(validate(JSON.parse(JSON.stringify([row]))),[row]);});

const {yearComparison}=require('../core.js');
test('前年比は選択月の金額順で前年同月の同分類を対応させる',()=>{
 const data=yearComparison([{...row,category:'食費',amount:100},{...row,id:'b',category:'QOL',subcategory:'外食',amount:300},{...row,id:'c',date:'2025-10-01',category:'食費',amount:900},{...row,id:'d',date:'2025-09-01',amount:9999}],'2026-10');
 assert.equal(data.previousMonth,'2025-10');assert.equal(data.hasPrevious,true);assert.equal(data.groups[0].name,'QOL');assert.equal(data.groups[0].current,300);assert.equal(data.groups[0].previous,0);assert.equal(data.groups[1].name,'食費');assert.equal(data.groups[1].previous,900);
 const missing=yearComparison([row],'2026-10');assert.equal(missing.hasPrevious,false);assert.ok(missing.groups.every(g=>g.previous===null));
 const priorOnly=yearComparison([row],'2027-10');assert.equal(priorOnly.hasCurrent,false);assert.equal(priorOnly.groups[0].previous,633);
 assert.equal(yearComparison([],'2026-01').previousMonth,'2025-01');
});
