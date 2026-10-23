// Install development dependencies before running the optional browser checks.
const path=require('node:path');
const fs=require('node:fs/promises');
const assert=require('node:assert/strict');
if (!process.env.PLAYWRIGHT_BROWSERS_PATH && require('node:fs').existsSync(path.join(process.cwd(),'.cache/playwright'))) process.env.PLAYWRIGHT_BROWSERS_PATH=path.join(process.cwd(),'.cache/playwright');
const playwright=require('playwright');
const resultsDir=process.env.TEST_RESULTS_DIR || 'test-results';
const resultFile=name=>path.join(resultsDir,name);

async function auditContrast(page) {
  return page.evaluate(()=>{
    const elements=[];
    function collect(root) { for(const el of root.querySelectorAll('*')) { elements.push(el); if(el.shadowRoot) collect(el.shadowRoot); } }
    collect(document);
    const rgb=value=>value.match(/[\d.]+/g)?.map(Number);
    const luminance=channels=>channels.slice(0,3).map(x=>x/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4).reduce((sum,x,index)=>sum+x*[.2126,.7152,.0722][index],0);
    const pairs=[];
    for(const el of elements) {
      if(!el.getClientRects().length || !([...el.childNodes].some(n=>n.nodeType===3 && n.textContent.trim()) || el.tagName==='TEXTAREA')) continue;
      const color=rgb(getComputedStyle(el).color); let parent=el; let background;
      while(parent) {
        const candidate=rgb(getComputedStyle(parent).backgroundColor);
        if(candidate && (candidate.length===3 || candidate[3]===1)) { background=candidate; break; }
        parent=parent.parentElement || parent.getRootNode().host;
      }
      if(!background || !color) continue;
      const a=luminance(color),b=luminance(background); const ratio=(Math.max(a,b)+.05)/(Math.min(a,b)+.05);
      pairs.push({element:el.tagName+'.'+el.className,ratio:Number(ratio.toFixed(3)),color:color.slice(0,3),background:background.slice(0,3)});
    }
    return {minimum:Math.min(...pairs.map(p=>p.ratio)),failures:pairs.filter(p=>p.ratio<4.5),pairsChecked:pairs.length};
  });
}

(async()=>{
  const {makeServer}=await import('../tools/serve.js');
  const server=makeServer(); await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base=`http://127.0.0.1:${server.address().port}`;
  const results={date:new Date().toISOString(),platform:process.platform,playwright:require('playwright/package.json').version,browsers:[]};
  await fs.mkdir(resultsDir,{recursive:true});
  for (const [name,engine,options] of [['chrome','chromium',{channel:'chrome'}],['edge','chromium',{channel:'msedge'}],['chromium','chromium',{}],['firefox','firefox',{}],['webkit','webkit',{}]]) {
    const record={name,engine,checks:[]}; results.browsers.push(record);
    let browser;
    try { browser=await playwright[engine].launch({...options,headless:true}); record.version=browser.version(); }
    catch(error) { record.status='unavailable'; record.reason=error.message.split('\n')[0]; console.log(`${name}: unavailable — ${record.reason}`); continue; }
    try {
      const context=await browser.newContext({viewport:{width:1280,height:1000},reducedMotion:'reduce'});
      const page=await context.newPage(); const errors=[]; const external=[];
      page.on('pageerror',error=>errors.push(error.message));
      page.on('request',request=>{if (!request.url().startsWith(base) && !request.url().startsWith('blob:') && !request.url().startsWith('data:')) external.push(request.url());});
      await page.goto(base); await page.locator('#reviewer #suggestion').waitFor();
      const reviewer=page.locator('#reviewer');
      const suggestion=reviewer.locator('#suggestion'); const comment=reviewer.locator('#comment');
      const prepare=reviewer.getByRole('button',{name:'Prepare review',exact:true});
      const status=reviewer.locator('.status');
      assert.equal(await page.evaluate(()=>document.activeElement.tagName),'BODY');
      await prepare.click(); assert.equal(await suggestion.getAttribute('aria-invalid'),'true');
      assert.equal(await suggestion.evaluate(el=>el.getRootNode().activeElement===el),true);
      record.checks.push('empty validation and focus');
      if(name==='chrome') await page.screenshot({path:resultFile('validation.png'),fullPage:true});
      await suggestion.fill('Un espacio para sentirte en casa.'); await comment.fill('A warmer, shorter invitation.');
      await page.evaluate(()=>{window.payloads=[];document.querySelector('#reviewer').addEventListener('review-submit',e=>window.payloads.push(e.detail));});
      await prepare.click(); assert.equal(await reviewer.locator('#output').isVisible(),true);
      assert.match(await status.textContent(),/nothing has been sent/);
      assert.equal(await page.evaluate(()=>window.payloads[0].passage.passageId),'welcome.intro');
      record.checks.push('immutable review event and local export');
      if(name==='chrome') await page.screenshot({path:resultFile('prepared-review.png'),fullPage:true});
      const downloadPromise=page.waitForEvent('download'); await reviewer.getByRole('button',{name:'Download review (.txt)'}).click();
      const download=await downloadPromise; assert.equal(download.suggestedFilename(),'translation-review.txt');
      const saved=await download.path(); assert.match(await fs.readFile(saved,'utf8'),/A warmer, shorter invitation/);
      record.checks.push('actual text download');
      await page.evaluate(()=>{URL.createObjectURL=undefined;});
      await reviewer.getByRole('button',{name:'Download review (.txt)'}).click(); assert.match(await status.textContent(),/Downloading is unavailable/);
      record.checks.push('unsupported-download manual copy fallback');
      await page.evaluate(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async value=>{window.copied=value;}}}));
      await reviewer.getByRole('button',{name:'Copy review',exact:true}).click(); assert.match(await page.evaluate(()=>window.copied),/welcome.intro/);
      await page.evaluate(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async()=>{throw new Error('denied');}}}));
      await reviewer.getByRole('button',{name:'Copy review',exact:true}).click(); assert.match(await status.textContent(),/Copy command/);
      assert.equal(await reviewer.locator('#output').evaluate(el=>el.selectionEnd-el.selectionStart), (await reviewer.locator('#output').inputValue()).length);
      record.checks.push('clipboard adapter success and denied-clipboard manual selection');
      await page.getByRole('button',{name:/Make room for a question/}).click(); await comment.fill('Second passage note');
      await page.getByRole('button',{name:/A warmer welcome/}).click(); assert.equal(await suggestion.inputValue(),'Un espacio para sentirte en casa.');
      assert.equal(await reviewer.locator('#output').isVisible(),false);
      await suggestion.press('Escape'); assert.equal(await reviewer.getByRole('button',{name:'Review translation',exact:true}).isVisible(),true);
      assert.equal(await page.getByRole('button',{name:/A warmer welcome/}).evaluate(el=>document.activeElement===el),true);
      await page.keyboard.press('Enter'); assert.equal(await suggestion.evaluate(el=>el.getRootNode().activeElement===el),true);
      assert.notEqual(await suggestion.evaluate(el=>getComputedStyle(el).outlineStyle),'none');
      record.checks.push('per-passage drafts; Escape restores host focus; keyboard reopens');
      await page.evaluate(()=>{const el=document.querySelector('#reviewer');el.passage={...el.passage,revision:'r2'};});
      assert.equal(await suggestion.inputValue(),'');
      await page.evaluate(()=>{const el=document.querySelector('#reviewer');el.passage={...el.passage,sourceText:'<img src=x onerror="window.injected=true">',pageReference:'https://name:secret@example.org/a?token=hidden#private'};});
      assert.equal(await reviewer.locator('img').count(),0); assert.equal(await page.evaluate(()=>Boolean(window.injected)),false);
      await comment.fill('Keep this safe.');
      await page.evaluate(()=>{document.querySelector('#reviewer').adapter=()=>{throw new Error('secret url');};});
      await prepare.click(); await page.waitForFunction(()=>document.querySelector('#reviewer').shadowRoot.querySelector('.state').textContent==='Use a fallback');
      assert.match(await status.textContent(),/No delivery is confirmed/); assert.doesNotMatch(await status.textContent(),/secret/);
      assert.match(await reviewer.locator('#output').inputValue(),/https:\/\/example.org\/a/); assert.doesNotMatch(await reviewer.locator('#output').inputValue(),/token=|name:secret/);
      record.checks.push('revision isolation; literal untrusted text; private URL stripping; adapter error fallback');
      await page.evaluate(()=>{const el=document.querySelector('#reviewer');el.adapter=()=>{window.adapterCalls=(window.adapterCalls||0)+1;};el.addEventListener('review-submit',e=>e.preventDefault(),{once:true});});
      await prepare.click(); assert.equal(await page.evaluate(()=>window.adapterCalls||0),0);
      await page.evaluate(()=>{const el=document.querySelector('#reviewer');el.adapter=()=>new Promise(resolve=>{window.resolveAdapter=resolve;});});
      await prepare.click(); assert.equal(await reviewer.getByRole('button',{name:'Preparing…'}).isDisabled(),true);
      await page.getByRole('button',{name:/Make room for a question/}).click();
      await page.evaluate(()=>window.resolveAdapter({message:'STALE RESULT'}));
      assert.doesNotMatch(await status.textContent(),/STALE/);
      record.checks.push('cancelable adapter event; pending state; stale completion isolation');
      await page.evaluate(async()=>{const {createMailtoAdapter}=await import('/src/adapters.js');const el=document.querySelector('#reviewer');el.adapter=createMailtoAdapter({to:'review@example.org',openDraft:url=>window.draftUrl=url,maxUrlLength:12000});});
      await comment.fill('Email draft test'); await prepare.click(); await page.waitForFunction(()=>Boolean(window.draftUrl));
      assert.match(await page.evaluate(()=>window.draftUrl),/^mailto:/); assert.match(await status.textContent(),/choose whether to send/);
      record.checks.push('mailto draft intercepted; no real email app or sending');
      await page.evaluate(()=>{document.querySelector('#reviewer').adapter=null; document.querySelector('#reviewer').clearDrafts();});
      await page.getByRole('button',{name:/A warmer welcome/}).click();
      record.darkContrast=await auditContrast(page); assert.deepEqual(record.darkContrast.failures,[],'dark contrast');
      if(name==='chrome') await page.screenshot({path:resultFile('desktop-dark.png'),fullPage:true});
      await page.getByRole('button',{name:'Light theme',exact:true}).click();
      assert.equal(await reviewer.getAttribute('theme'),'light');
      record.lightContrast=await auditContrast(page); assert.deepEqual(record.lightContrast.failures,[],'light contrast');
      record.checks.push('default dark/light visible text contrast at least 4.5:1');
      if(name==='chrome') await page.screenshot({path:resultFile('desktop-light.png'),fullPage:true});
      for (const width of [390,320]) {
        await page.setViewportSize({width,height:844});
        assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${width}px page overflow`);
        assert.ok(await reviewer.evaluate(el=>el.shadowRoot.querySelector('section').scrollWidth<=el.getBoundingClientRect().width),`${width}px component overflow`);
      }
      if(name==='chrome') await page.screenshot({path:resultFile('mobile-light.png'),fullPage:true});
      await page.evaluate(()=>document.documentElement.style.fontSize='200%');
      const overflow=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,offenders:[...document.querySelectorAll('*')].filter(el=>el.getBoundingClientRect().right>innerWidth+1).map(el=>el.tagName+'.'+el.className)}));
      if(name==='chrome') await page.screenshot({path:resultFile('large-text-320.png'),fullPage:true});
      assert.ok(overflow.scroll<=overflow.width,`200% text overflow at 320px: ${JSON.stringify(overflow)}`);
      assert.equal(await reviewer.locator('section').evaluate(el=>getComputedStyle(el).animationName),'none');
      record.checks.push('dark/light themes; 390/320px mobile; 200% text at 320px; reduced motion');
      assert.deepEqual(errors,[]); assert.deepEqual(external,[]); record.checks.push('no page errors or external requests');
      const touchContext=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,reducedMotion:'reduce'});
      const touchPage=await touchContext.newPage(); await touchPage.goto(base);
      await touchPage.getByRole('button',{name:/An invitation to connect/}).tap();
      assert.match(await touchPage.locator('#reviewer .meta').textContent(),/en → fr/);
      await touchPage.locator('#reviewer #comment').fill('Touch review');
      await touchPage.locator('#reviewer').getByRole('button',{name:'Prepare review',exact:true}).tap();
      assert.equal(await touchPage.locator('#reviewer #output').isVisible(),true); await touchContext.close();
      record.checks.push('emulated touch selection and review preparation at 390px');
      const noScript=await browser.newContext({javaScriptEnabled:false}); const fallbackPage=await noScript.newPage(); await fallbackPage.goto(base);
      assert.equal(await fallbackPage.getByRole('heading',{name:'Review a sample passage'}).isVisible(),true);
      assert.equal(await fallbackPage.locator('.fallback [lang=es]').isVisible(),true); await noScript.close();
      record.checks.push('JavaScript-disabled static comparison fallback');
      record.status='passed'; await context.close();
    } catch(error) {record.status='failed';record.reason=error.stack;process.exitCode=1;}
    finally {await browser.close();}
    console.log(`${name}: ${record.status} (${record.checks.length} groups)${record.reason?' '+record.reason:''}`);
  }
  await fs.writeFile(resultFile('browser-results.json'),JSON.stringify(results,null,2)+'\n');
  await new Promise(resolve=>server.close(resolve));
  console.log(`Evidence: ${resultFile('browser-results.json')}`);
})().catch(error=>{console.error(error);process.exitCode=1;});
