const $=id=>document.getElementById(id), KEY='kohaku-ledger-v1', {categories,validate,monthly,yearComparison}=Ledger;
const yen=n=>'¥ '+n.toLocaleString('ja-JP');
const localDate=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
let month=localDate().slice(0,7),view='list',statsView='totals',rows=[],editing=null,selected='食費',sub='',storageFailed=false;
const VIEW_KEY='kohaku-ledger-view-v1';
try{
  const saved=JSON.parse(sessionStorage.getItem(VIEW_KEY)||'null');
  if(saved&&/^(19\d{2}|[2-9]\d{3})-(0[1-9]|1[0-2])$/.test(saved.month))month=saved.month;
  if(saved&&['list','stats'].includes(saved.view))view=saved.view;
  if(saved&&['totals','chart','year'].includes(saved.statsView))statsView=saved.statsView;
}catch{/* Viewing preferences must never prevent access to ledger records. */}
function rememberView(){try{sessionStorage.setItem(VIEW_KEY,JSON.stringify({month,view,statsView}));}catch{}}
try{const raw=localStorage.getItem(KEY);rows=raw?validate(JSON.parse(raw)):[];}catch(e){storageFailed=true;}
function el(tag,text,cls){const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;}
function toast(text){$('toast').textContent=text;$('toast').classList.add('visible');clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('toast').classList.remove('visible'),2600);}
function persist(next){if(storageFailed)throw Error('保存データを読み込めませんでした。上書きを防ぐため保存を止めています。バックアップから復元してください。');localStorage.setItem(KEY,JSON.stringify(next));rows=next;}
function render(){rememberView();const data=monthly(rows,month);$('monthTitle').textContent=`${month.slice(0,4)}年 ${Number(month.slice(5))}月`;$('total').textContent=yen(data.total);$('count').textContent=`${data.entries.length}件`;$('listTab').setAttribute('aria-selected',view==='list');$('statsTab').setAttribute('aria-selected',view==='stats');$('statsSwitch').hidden=view!=='stats';$('totalsTab').setAttribute('aria-pressed',statsView==='totals');$('chartTab').setAttribute('aria-pressed',statsView==='chart');$('yearTab').setAttribute('aria-pressed',statsView==='year');const target=$('content');target.replaceChildren();
if(storageFailed)target.append(el('p','保存データを読み込めません。バックアップから復元してください。','error'));
if(view==='stats'&&statsView==='year'){target.append(yearChart(yearComparison(rows,month)));return;}
if(!data.entries.length){const empty=el('div',undefined,'empty');empty.append(el('div','✎','empty-icon'),el('h3','この月の記録はまだありません'),el('p','最初のひとつを、気軽に記録してみよう。'));target.append(empty);return;}
if(view==='list'){
  for(const r of data.entries){
    const d=new Date(r.date+'T12:00:00'),weekday='日月火水木金土'[d.getDay()];
    const item=r.subcategory||r.category,b=el('button',undefined,'entry compact-entry');
    b.setAttribute('aria-label',`${r.date} ${weekday}曜日 ${r.category}${r.subcategory?' ／ '+r.subcategory:''} ${r.amount}円を編集`);
    const label=el('span',item,'entry-item');label.title=r.category+(r.subcategory?' ／ '+r.subcategory:'');
    b.append(el('span',`${d.getMonth()+1}/${d.getDate()}`,'entry-date'),el('span',`(${weekday})`,'entry-weekday'),label,el('strong',yen(r.amount),'entry-amount'));
    b.onclick=()=>openEditor(r);target.append(b);
  }
}
else{if(statsView==='chart'){target.append(spendingChart(data));return;}for(const c of data.groups.filter(c=>c.total).sort((a,b)=>b.total-a.total)){const details=el('details',undefined,'stat-row'),summary=el('summary');const dot=el('span','●');dot.style.color=c.color;summary.append(dot,el('strong',`${c.icon} ${c.name}`),el('span',`${(c.total/data.total*100).toFixed(1)}%`,'percent'),el('strong',yen(c.total)));details.append(summary);const subs=[...new Set(data.entries.filter(r=>r.category===c.name).map(r=>r.subcategory))];for(const s of subs){const line=el('div',undefined,'sub-row');line.append(el('span',s||'内訳なし'),el('span',yen(data.entries.filter(r=>r.category===c.name&&r.subcategory===s).reduce((a,r)=>a+r.amount,0))));details.append(line);}target.append(details);}}}
function yearChart(data){
 const wrap=el('section',undefined,'year-chart');
 const legend=el('div',undefined,'year-legend');
 legend.append(el('span',`左・濃：${data.month.replace('-','年')}月`,'year-current'),el('span',`右・薄：${data.previousMonth.replace('-','年')}月`,'year-previous'));wrap.append(legend);
 if(!data.hasCurrent||!data.hasPrevious)wrap.append(el('p',(!data.hasCurrent?'選択月':'')+(!data.hasCurrent&&!data.hasPrevious?'・':'')+(!data.hasPrevious?'前年同月':'')+'の記録はありません（—）。','year-note'));
 if(!data.hasCurrent&&!data.hasPrevious)return wrap;
 const svg=(tag,attrs,text)=>{const n=document.createElementNS('http://www.w3.org/2000/svg',tag);for(const [k,v] of Object.entries(attrs))n.setAttribute(k,v);if(text!==undefined)n.textContent=text;return n;};
 const max=Math.max(1,...data.groups.flatMap(g=>[g.current||0,g.previous||0]));
 const unit=10**Math.floor(Math.log10(max)),limit=Math.ceil(max/unit)*unit;
 const groupWidth=59,width=400;
 const chart=svg('svg',{viewBox:'0 0 400 258',role:'img','aria-label':'6分類の前年比。金額は各分類の上段が選択月、下段が前年同月。棒は左が選択月、右が前年同月。'});
 const axis=n=>n>=100000000?(n/100000000).toLocaleString('ja-JP',{maximumFractionDigits:1})+'億':n>=10000?(n/10000).toLocaleString('ja-JP',{maximumFractionDigits:1})+'万':n.toLocaleString('ja-JP',{maximumFractionDigits:0});
 for(let i=0;i<=4;i++){const y=214-i*38;chart.append(svg('line',{x1:40,x2:396,y1:y,y2:y,stroke:'#e1e4d8'}));chart.append(svg('text',{x:35,y:y+3,'text-anchor':'end',class:'bar-axis'},axis(limit*i/4)));}
 chart.append(svg('text',{x:35,y:49,'text-anchor':'end',class:'bar-axis'},'円'));
 data.groups.forEach((g,i)=>{
  const center=40+(i+0.5)*groupWidth;
  for(const [j,value] of [g.current,g.previous].entries()){
   const h=value===null?0:value/limit*152;
   const bar=svg('rect',{x:center+(j?3:-15),y:214-h,width:12,height:h,rx:2,fill:g.color,'fill-opacity':j?0.5:1,class:j?'previous-bar':'current-bar'});
   bar.append(svg('title',{},`${g.name} ${j?data.previousMonth:data.month} ${value===null?'データなし':yen(value)}`));chart.append(bar);
   const text=value===null?'—':value.toLocaleString('ja-JP');
   chart.append(svg('text',{x:center,y:j?34:19,'text-anchor':'middle',class:'bar-value',style:`font-size:${Math.min(10,52/(text.length*0.6))}px;fill:${j?'#777f6e':'#373b33'}`},text));
  }
  const lines=g.name==='定期購入品'?['定期','購入品']:[g.name];
  lines.forEach((line,j)=>chart.append(svg('text',{x:center,y:233+j*14,'text-anchor':'middle',class:'bar-category'},line)));
 });
 const frame=el('div',undefined,'bar-frame');frame.append(chart);wrap.append(frame);
 return wrap;
}
function spendingChart(data){
  const wrap=el('div',undefined,'annotated-chart');
  const svg=(tag,attrs,text)=>{const n=document.createElementNS('http://www.w3.org/2000/svg',tag);for(const [k,v] of Object.entries(attrs))n.setAttribute(k,v);if(text!==undefined)n.textContent=text;return n;};
  const chart=svg('svg',{viewBox:'0 0 400 320',role:'img','aria-label':'分類別の支出割合。分類名と割合を円の周囲に表示しています。'});
  const groups=data.groups.filter(c=>c.total).sort((a,b)=>b.total-a.total),labels=[];
  let angle=-Math.PI/2;
  const point=(a,r=82)=>[200+Math.cos(a)*r,160+Math.sin(a)*r];
  for(const c of groups){
    const sweep=c.total/data.total*Math.PI*2,end=angle+sweep,mid=angle+sweep/2;
    const startPoint=point(angle),endPoint=point(end);
    const shape=groups.length===1?svg('circle',{cx:200,cy:160,r:82,fill:c.color}):svg('path',{d:`M 200 160 L ${startPoint.join(' ')} A 82 82 0 ${sweep>Math.PI?1:0} 1 ${endPoint.join(' ')} Z`,fill:c.color,stroke:'#faf7f1','stroke-width':1.5});
    const percent=(c.total/data.total*100).toFixed(1)+'%';shape.append(svg('title',{},`${c.name} ${percent} ${yen(c.total)}`));chart.append(shape);
    labels.push({c,percent,side:Math.cos(mid)>=0?1:-1,anchor:point(mid),elbow:point(mid,94),y:160+Math.sin(mid)*100});angle=end;
  }
  for(const side of [-1,1]){
    const items=labels.filter(l=>l.side===side).sort((a,b)=>a.y-b.y);
    for(let i=0;i<items.length;i++)items[i].y=Math.max(30,items[i].y,i?items[i-1].y+43:30);
    if(items.length&&items.at(-1).y>278){items.at(-1).y=278;for(let i=items.length-2;i>=0;i--)items[i].y=Math.min(items[i].y,items[i+1].y-43);}
    for(const l of items){
      const x=side===1?298:102,edge=side===1?292:108;
      chart.append(svg('polyline',{points:`${l.anchor.join(',')} ${l.elbow.join(',')} ${edge},${l.y}`,fill:'none',stroke:l.c.color,'stroke-width':1.5}));
      chart.append(svg('text',{x,y:l.y-5,'text-anchor':side===1?'start':'end',class:'chart-label'},l.c.icon+' '+l.c.name));
      chart.append(svg('text',{x,y:l.y+13,'text-anchor':side===1?'start':'end',class:'chart-percent'},l.percent));
    }
  }
  // Fit the viewport to the pie, leader lines and labels, keeping a small gutter.
  const top=Math.floor(Math.min(66,...labels.map(l=>l.y-24))-6);
  const bottom=Math.ceil(Math.max(254,...labels.map(l=>l.y+18))+6);
  chart.setAttribute('viewBox',`0 ${top} 400 ${bottom-top}`);
  wrap.append(chart);return wrap;
}
function shift(n){const d=new Date(Number(month.slice(0,4)),Number(month.slice(5))-1+n,1);month=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;render();}
$('prev').onclick=()=>shift(-1);$('next').onclick=()=>shift(1);$('today').onclick=()=>{month=localDate().slice(0,7);render();};$('listTab').onclick=()=>{view='list';render();};$('statsTab').onclick=()=>{view='stats';render();};

$('totalsTab').onclick=()=>{statsView='totals';render();};
$('chartTab').onclick=()=>{statsView='chart';render();};
$('yearTab').onclick=()=>{statsView='year';render();};

let browsingCategory = selected;
function categoryLabel(){
  const c=categories.find(c=>c.name===selected);
  $('chosenCategory').textContent=c.icon+' '+c.name+(sub?' ／ '+sub:'');
}
function commitCategory(category,child=''){
  selected=category;sub=child;categoryLabel();
  setPanel('category');
  const c=categories.find(c=>c.name===category);
  if(child)$('children').querySelectorAll('button')[c.children.indexOf(child)].focus();
  else $('categories').querySelectorAll('button')[categories.indexOf(c)].focus();
}
function renderCategories(){
  $('categories').replaceChildren();
  for(const c of categories){
    const b=el('button',undefined,browsingCategory===c.name?'selected':'');
    b.type='button';b.setAttribute('aria-pressed',browsingCategory===c.name);
    b.append(el('span',c.icon+' '+c.name));
    if(c.children.length)b.append(el('span','›','category-arrow'));
    b.onclick=()=>{
      if(!c.children.length){commitCategory(c.name);return;}
      browsingCategory=c.name;renderCategories();
      $('categories').querySelectorAll('button')[categories.indexOf(c)].focus();
    };
    $('categories').append(b);
  }
  const c=categories.find(c=>c.name===browsingCategory);
  $('children').replaceChildren();
  for(const name of c.children){
    const active=selected===c.name&&sub===name;
    const b=el('button',name,active?'selected':'');
    b.type='button';b.setAttribute('aria-pressed',active);
    b.onclick=()=>commitCategory(c.name,name);$('children').append(b);
  }
  $('pickerHelp').textContent=c.children.length?c.name+'の小分類を右側から選んでください':'大分類を押すと確定します';
}
let activePanel='amount',calendarYear,calendarMonth;
function refreshFields(){
  $('chosenAmount').textContent=$('amount').value?yen(Number($('amount').value)):'¥ 0';
  const d=new Date($('date').value+'T12:00:00');
  $('chosenDate').textContent=`${d.getFullYear()}/${d.getMonth()+1}/${d.getDate()}（${'日月火水木金土'[d.getDay()]}）`;
}
function setPanel(name){
  document.activeElement?.blur();activePanel=name;
  for(const key of ['amount','date','category','idle'])$(key+'Panel').hidden=key!==name;
  for(const [key,id] of [['amount','chooseAmount'],['date','chooseDate'],['category','chooseCategory']])$(id).setAttribute('aria-expanded',key===name);
  $('panelTitle').textContent=({amount:'金額',date:'日付',category:'分類',idle:'入力'})[name];
  $('closePanel').hidden=name==='idle';
  if(name==='category'){browsingCategory=selected;renderCategories();}
  if(name==='date'){const d=new Date($('date').value+'T12:00:00');calendarYear=d.getFullYear();calendarMonth=d.getMonth();renderCalendar();}
  refreshFields();
}
$('chooseCategory').onclick=()=>setPanel('category');
$('chooseAmount').onclick=()=>setPanel('amount');
$('chooseDate').onclick=()=>setPanel('date');
$('closePanel').onclick=()=>setPanel('idle');
function amountKey(key){
  let value=$('amount').value;
  if(key==='完了'){setPanel('idle');$('chooseAmount').focus();return;}
  if(key==='⌫')value=value.slice(0,-1);
  else if(key==='クリア')value='';
  else if(/^\d{1,2}$/.test(key)){const next=(value+key).replace(/^0+(?=\d)/,'');if(next.length>9)return;value=next;}
  else return;
  $('amount').value=value;refreshFields();$('formError').textContent='';
}
for(const key of ['7','8','9','⌫','4','5','6','クリア','1','2','3','完了','0','00']){
  const b=el('button',key);b.type='button';if(key==='⌫')b.setAttribute('aria-label','1桁消す');if(key==='完了')b.className='key-done';if(key==='0')b.className='key-zero';b.onclick=()=>amountKey(key);$('keypad').append(b);
}
$('editor').addEventListener('keydown',e=>{
  if(activePanel!=='amount'||e.ctrlKey||e.metaKey||e.altKey)return;
  if(/^\d$/.test(e.key)||e.key==='Backspace'||e.key==='Delete'){e.preventDefault();amountKey(e.key==='Backspace'?'⌫':e.key==='Delete'?'クリア':e.key);}
});
function selectDate(value){$('date').value=value;setPanel('idle');$('chooseDate').focus();}
function renderCalendar(){
  $('calendarMonth').textContent=`${calendarYear}年 ${calendarMonth+1}月`;
  $('calendarPrev').disabled=calendarYear===1900&&calendarMonth===0;
  $('calendarNext').disabled=calendarYear===9999&&calendarMonth===11;
  const first=new Date(calendarYear,calendarMonth,1).getDay(),count=new Date(calendarYear,calendarMonth+1,0).getDate();
  $('calendarDays').replaceChildren();
  for(let i=0;i<42;i++){
    const day=i-first+1;
    if(day<1||day>count){$('calendarDays').append(el('span'));continue;}
    const value=`${calendarYear}-${String(calendarMonth+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    const b=el('button',String(day),value===$('date').value?'selected':'');b.type='button';b.setAttribute('aria-label',value);b.setAttribute('aria-pressed',value===$('date').value);b.onclick=()=>selectDate(value);$('calendarDays').append(b);
  }
}
function moveCalendar(n){const d=new Date(calendarYear,calendarMonth+n,1);if(d.getFullYear()<1900||d.getFullYear()>9999)return;calendarYear=d.getFullYear();calendarMonth=d.getMonth();renderCalendar();}
$('calendarPrev').onclick=()=>moveCalendar(-1);$('calendarNext').onclick=()=>moveCalendar(1);$('calendarToday').onclick=()=>selectDate(localDate());
function formSnapshot(){return JSON.stringify([$('amount').value,$('date').value,selected,sub]);}
let savedForm='';
window.addEventListener('beforeunload',e=>{
  if($('editor').open&&formSnapshot()!==savedForm){e.preventDefault();e.returnValue='';}
});

function openEditor(r){editing=r?.id||null;selected=r?.category||'食費';sub=r?.subcategory||'';$('editorTitle').textContent=r?'記録を編集':'支出を記録';$('amount').value=r?.amount||'';$('date').value=r?.date||localDate();$('formError').textContent='';$('delete').hidden=!r;$('continue').hidden=!!r;categoryLabel();savedForm=formSnapshot();$('editor').showModal();setPanel('amount');$('chooseAmount').focus();}
$('add').onclick=()=>openEditor();$('closeEditor').onclick=()=>$('editor').close();
$('entryForm').onsubmit=e=>{e.preventDefault();const amount=Number($('amount').value.replace(/[０-９]/g,c=>String.fromCharCode(c.charCodeAt(0)-65248)).replace(/[,，]/g,''));if(!Number.isSafeInteger(amount)||amount<=0||amount>999999999){$('formError').textContent='金額は1〜999,999,999円の整数で入力してください。';return;}if(categories.find(c=>c.name===selected).children.length&&!sub&&!(selected==='その他'&&editing&&rows.some(x=>x.id===editing&&x.category==='その他'&&x.subcategory===''))){$('formError').textContent='分類の内訳を選んでください。';return;}const r={id:editing||crypto.randomUUID(),date:$('date').value,amount,category:selected,subcategory:sub,memo:editing?(rows.find(x=>x.id===editing)?.memo||''):''};try{validate([r]);persist(editing?rows.map(x=>x.id===editing?r:x):[...rows,r]);}catch(err){$('formError').textContent='保存できませんでした。'+err.message;return;}month=r.date.slice(0,7);render();toast('記録しました');if(e.submitter?.id==='continue'){$('amount').value='';$('formError').textContent='';setPanel('amount');$('chooseAmount').focus();savedForm=formSnapshot();}else $('editor').close();};
$('delete').onclick=()=>{if(!confirm('この記録を削除しますか？'))return;try{persist(rows.filter(r=>r.id!==editing));$('editor').close();render();toast('削除しました');}catch(e){$('formError').textContent='削除できませんでした。'+e.message;}};
let installPrompt=null,installBusy=false,installConfirmed=false;
const standalone=()=>!!(window.matchMedia?.('(display-mode: standalone)').matches||window.navigator?.standalone);
function installUI(message){
 const running=standalone(),button=$('installApp');
 button.disabled=running||installConfirmed||installBusy;
 button.textContent=running?'アプリで起動中':installConfirmed?'インストールを受け付けました':installBusy?'確認中…':'インストール';
 $('installStatus').textContent=message||(running?'ホーム画面からアプリとして開いています。':installPrompt?'このボタンからChromeのインストール画面を開けます。':'Chromeでこのページを開いて、少し待ってから押してください。');
}
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installPrompt=e;installConfirmed=false;installUI();});
window.addEventListener('appinstalled',()=>{installPrompt=null;installBusy=false;installConfirmed=true;installUI('Chromeがインストールを受け付けました。ホーム画面への反映をお待ちください。');});
$('installApp').onclick=async()=>{
 if(installBusy||installConfirmed||standalone())return;
 if(!installPrompt){installUI('Chromeからインストールの許可がまだ届いていません。このページを30秒ほど開いてから、もう一度押してください。「インストール済み」なのに開けない場合、このボタンでは解除できません。家計簿のデータは削除せず、この表示を伝えてください。');return;}
 const event=installPrompt;installPrompt=null;installBusy=true;installUI();
 try{
  await event.prompt();const choice=await event.userChoice;
  if(installConfirmed)return;
  installUI(choice.outcome==='accepted'?'Chromeでインストールが承認されました。ホーム画面への反映をお待ちください。':'インストールをキャンセルしました。再び準備ができると、このボタンから試せます。');
 }catch{installUI('インストール画面を開けませんでした。ページを読み直して、もう一度お試しください。記録はそのままです。');}
 finally{installBusy=false;$('installApp').disabled=installConfirmed||standalone();$('installApp').textContent=installConfirmed?'インストールを受け付けました':'インストール';}
};
installUI();
function openBackup(){installUI();$('backupError').textContent='';$('backup').showModal();}$('settings').onclick=openBackup;$('backupLink').onclick=openBackup;$('closeBackup').onclick=()=>$('backup').close();
$('export').onclick=()=>{if(storageFailed){$('backupError').textContent='保存データを読み込めないため、書き出しを停止しています。';return;}const blob=new Blob([JSON.stringify({format:'kohaku-ledger',version:1,exportedAt:new Date().toISOString(),entries:rows},null,2)],{type:'application/json'});const url=URL.createObjectURL(blob),a=el('a');a.href=url;a.download=`kohaku-kakeibo-${localDate()}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);toast('バックアップを書き出しました');};
$('import').onchange=async e=>{const file=e.target.files[0];if(!file)return;try{if(file.size>30*1024*1024)throw Error('ファイルが大きすぎます。');const data=JSON.parse(await file.text());if(data.format!=='kohaku-ledger'||data.version!==1)throw Error('この家計簿のバックアップではありません。');const next=validate(data.entries);if(!confirm(`${next.length}件を読み込み、現在の${rows.length}件を置き換えます。よろしいですか？`))return;localStorage.setItem(KEY,JSON.stringify(next));storageFailed=false;rows=next;render();$('backup').close();toast('バックアップを復元しました');}catch(err){$('backupError').textContent='読み込めませんでした。'+err.message;}finally{e.target.value='';}};
window.addEventListener('storage',e=>{if(e.key===KEY){try{rows=e.newValue?validate(JSON.parse(e.newValue)):[];storageFailed=false;render();}catch{storageFailed=true;render();}}});render();
