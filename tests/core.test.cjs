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
const {sortEntries}=require('../core.js');
test('金額は数値順、項目別は小分類ごとに日付／金額の昇降順で並ぶ',()=>{
 const source=[
 {...row,id:'f1',date:'2026-11-01',amount:20},
 {...row,id:'g1',category:'光熱費',subcategory:'ガス代',date:'2026-11-02',amount:2},
 {...row,id:'e1',category:'光熱費',subcategory:'電気代',date:'2026-11-03',amount:100},
 {...row,id:'f2',date:'2026-11-04',amount:3},
 {...row,id:'e2',category:'光熱費',subcategory:'電気代',date:'2026-11-01',amount:900},
 ];
 const original=JSON.stringify(source),ids=(mode,dir)=>sortEntries(source,mode,dir).map(r=>r.id);
 assert.deepEqual(ids('amount','asc'),['g1','f2','f1','e1','e2']);assert.deepEqual(ids('amount','desc'),['e2','e1','f1','f2','g1']);
 assert.deepEqual(ids('date','asc'),['f1','e2','g1','e1','f2']);assert.deepEqual(ids('date','desc'),['f2','e1','g1','f1','e2']);
 assert.deepEqual(ids('category-date','asc'),['f1','f2','e2','e1','g1']);assert.deepEqual(ids('category-date','desc'),['f2','f1','e1','e2','g1']);
 assert.deepEqual(ids('category-amount','asc'),['f2','f1','e1','e2','g1']);assert.deepEqual(ids('category-amount','desc'),['f1','f2','e2','e1','g1']);
 assert.equal(JSON.stringify(source),original);
 const totals=monthly(source,'2026-11');assert.equal(monthly(sortEntries(source,'amount','asc'),'2026-11').total,totals.total);
 assert.deepEqual(sortEntries([], 'category-amount','desc'),[]);
});
test('同額は新しい日付優先、同日同額は元の順序を保ち、過去の内訳なしも並べられる',()=>{
 const source=[{...row,id:'older',date:'2026-11-01'}, {...row,id:'newer',date:'2026-11-02'}, {...row,id:'tie',date:'2026-11-02'}];
 for(const direction of ['asc','desc'])assert.deepEqual(sortEntries(source,'amount',direction).map(r=>r.id),['newer','tie','older']);
 const grouped=[{...row,id:'child',category:'その他',subcategory:'病院'},{...row,id:'legacy',category:'その他',subcategory:''}];
 assert.deepEqual(sortEntries(grouped,'category-amount','desc').map(r=>r.id),['legacy','child']);
});
