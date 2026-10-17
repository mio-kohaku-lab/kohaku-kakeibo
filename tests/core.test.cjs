const {test}=require('node:test');const assert=require('node:assert/strict');const {validate,monthly}=require('../core.js');
const row={id:'a',date:'2026-10-17',amount:633,category:'食費',subcategory:'',memo:'野菜'};
test('月境界と外食分類を維持して集計する',()=>{const rows=[row,{...row,id:'b',category:'QOL',subcategory:'外食',amount:2000},{...row,id:'c',date:'2026-09-30',amount:900}];const m=monthly(validate(rows),'2026-10');assert.equal(m.total,2633);assert.equal(m.entries.length,2);assert.equal(m.groups.find(c=>c.name==='食費').total,633);assert.equal(m.groups.find(c=>c.name==='QOL').total,2000);});
test('破損したバックアップを拒否する',()=>{for(const patch of [{amount:-1},{amount:1.5},{date:'2026-02-30'},{category:'未知'},{subcategory:'外食'},{memo:null}])assert.throws(()=>validate([{...row,...patch}]));assert.throws(()=>validate([row,row]));assert.deepEqual(validate([]),[]);});
test('バックアップ往復で日本語と金額を保つ',()=>{assert.deepEqual(validate(JSON.parse(JSON.stringify([row]))),[row]);});

