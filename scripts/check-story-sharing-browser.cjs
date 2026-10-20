const assert=require('node:assert/strict'),fs=require('node:fs');
const {chromium}=require('playwright');
const registry=require('../data/song-links.json');
const base=process.env.BASE_URL||'http://127.0.0.1:8765';
const out='/tmp/replay-qa/story-sharing';fs.mkdirSync(out,{recursive:true});
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  for(const facebook of [false,true]){
   const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,...(facebook?{userAgent:'Android [FBAN/FB4A;FBAV/535.0]'}:{})});
   await context.route(url=>Object.values(registry.domains).includes(url.hostname),route=>route.fulfill({status:200,headers:{'access-control-allow-origin':'*','content-type':'application/json'},body:JSON.stringify({service:'musicsubject-song-links',revision:registry.revision})}));
   await context.addInitScript(()=>{
    window.shares=[];window.copies=[];
    Object.defineProperty(navigator,'share',{value:data=>{window.shares.push({...data,gesture:navigator.userActivation.isActive});return Promise.resolve()}});
    Object.defineProperty(navigator,'clipboard',{value:{writeText:text=>{window.copies.push(text);return Promise.resolve()}}});
   });
   const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
   for(const id of ['big-dick-willy','her-story','this-is-my-story']){
    const row=registry.rows.find(row=>row.songId===id&&row.version==='main');
    const expected=`https://${registry.domains[row.shareCategory==='jokes'?'jokes':row.genre]}/${row.number}`;
    const response=await page.goto(base+row.target,{waitUntil:'load'});
    const html=await response.text();assert(html.includes(row.share.description.replace(/&/g,'&amp;').replace(/"/g,'&quot;')));
    await page.evaluate(()=>window.CMDShortLinks.ready);
    await page.locator('#releaseShare [data-action="more"]').click();
    if(facebook){
     assert.equal(await page.evaluate(()=>window.copies.at(-1)),row.share.text+'\n'+expected);
     assert.equal(await page.locator('.cmd-share-post').inputValue(),row.share.text+'\n'+expected);
     assert.equal(await page.locator('.cmd-share-link').inputValue(),expected);
     assert.match(await page.locator('.cmd-share-copy-status').innerText(),/Post copied/);
     assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
     if(id==='big-dick-willy')await page.screenshot({path:out+'/facebook-copy-post-390.png'});
     await page.getByRole('button',{name:'Copy link',exact:true}).last().click();
     assert.equal(await page.evaluate(()=>window.copies.at(-1)),expected);
     await page.getByRole('button',{name:'Done',exact:true}).click();
    }else{
     const sent=await page.evaluate(()=>window.shares.at(-1));
     assert.equal(sent.text,row.share.text+'\n'+expected);assert.equal(sent.title,row.share.title);assert.equal(sent.gesture,true);assert.equal(sent.url,undefined);
    }
   }
   assert.deepEqual(errors,[]);await context.close();
  }
  fs.writeFileSync(out+'/report.json',JSON.stringify({passed:true,cases:['native post from actual page buttons','Facebook full post','explicit URL-only copy','server-rendered story preview','390px layout','user gesture retained'],songs:['big-dick-willy','her-story','this-is-my-story']},null,2));
 }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exit(1)});
