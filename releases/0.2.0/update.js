/* Updates only fetch program files. They never clear or replace ledger storage. */
(function(){
  const $=id=>document.getElementById(id);
  const base=new URL('./',location.href);
  const from=new URLSearchParams(location.search).get('from');
  const button=$('prepareUpdate'),status=$('updateStatus');
  $('installedVersion').textContent=from&&/^\d+\.\d+\.\d+$/.test(from)?'Ver.'+from:'家計簿の設定で確認';
  let release=null;
  async function get(url){
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);
    try{
      const response=await fetch(url,{cache:'no-store',signal:controller.signal});
      if(!response.ok)throw Error('HTTP '+response.status);
      return await response.text();
    }finally{clearTimeout(timer);}
  }
  function assetURL(path){
    const url=new URL(path,base);
    if(url.origin!==base.origin||!url.pathname.startsWith(base.pathname+'releases/'))throw Error('更新ファイルの場所が不正です。');
    return url;
  }
  async function check(){
    const data=JSON.parse(await get(new URL('version.json',base)));
    if(!/^\d+\.\d+\.\d+$/.test(data.version)||!Array.isArray(data.notes)||!Array.isArray(data.assets)||data.assets.length!==4)throw Error('更新情報を読み込めません。');
    for(const asset of data.assets){assetURL(asset.path);if(!/^[a-f0-9]{64}$/.test(asset.sha256))throw Error('更新情報が不正です。');}
    release=data;$('latestVersion').textContent='Ver.'+data.version;
    $('releaseNotes').replaceChildren();
    for(const note of data.notes){const li=document.createElement('li');li.textContent=note;$('releaseNotes').append(li);}
    button.disabled=false;button.textContent=from===data.version?'最新版を読み直す':'最新版を準備する';
    status.textContent=from===data.version?'最新版を使用しています。表示がおかしい場合は読み直せます。':'準備ができたら、家計簿を開いて更新を反映できます。';
  }
  button.onclick=async()=>{
    if(!release){button.disabled=true;try{await check();}catch{fail();}return;}
    button.disabled=true;button.textContent='最新版を準備中…';status.textContent='必要なファイルを確認しています…';
    try{
      // Refresh metadata as a newer release may have shipped while this page was open.
      await check();button.disabled=true;button.textContent='最新版を準備中…';
      for(const asset of release.assets){
        const text=await get(assetURL(asset.path));
        const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text)))).map(n=>n.toString(16).padStart(2,'0')).join('');
        if(hash!==asset.sha256)throw Error('公開処理中です。しばらくしてからやり直してください。');
      }
      const url=new URL('./',base);url.searchParams.set('release',release.version);url.searchParams.set('refresh',String(Date.now()));
      const html=await get(url);
      const doc=new DOMParser().parseFromString(html,'text/html');
      if(doc.querySelector('meta[name="app-version"]')?.content!==release.version)throw Error('公開処理中です。しばらくしてからやり直してください。');
      const link=$('openUpdated');link.href=url.href;link.hidden=false;button.hidden=true;
      status.textContent='Ver.'+release.version+'の準備ができました。下のボタンから開いてください。';
    }catch(error){fail(error);}
  };
  function fail(error){
    status.textContent='更新できませんでした。通信状態を確認して、もう一度お試しください。'+(error?.message?.startsWith('公開処理中')?' '+error.message:'');
    button.disabled=false;button.hidden=false;button.textContent='もう一度確認する';
    $('openUpdated').hidden=true;
  }
  check().catch(()=>fail());
})();
