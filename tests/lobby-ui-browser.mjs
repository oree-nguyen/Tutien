import {auditGeometry} from './lobby-reference-geometry.mjs';
import {chromium} from 'playwright-core';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
const execFileAsync=promisify(execFile);

const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH??'/usr/bin/chromium',headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const evidence='docs/ui-lobby-v25';await mkdir(evidence,{recursive:true});
const errors=[];const results=[];const geometry=[];
try {
  for(const viewport of [{width:1376,height:768},{width:844,height:390},{width:667,height:375}]) {
    const page=await browser.newPage({viewport,hasTouch:true});
    if(viewport.width!==844)await page.emulateMedia({reducedMotion:'reduce'});
    page.on('pageerror',error=>errors.push(error.message));
    await page.goto(process.env.GAME_URL??'http://127.0.0.1:5173');
    await page.waitForFunction(()=>window.__HON_GIOI__?.world,null,{timeout:120000});
    await page.waitForFunction(()=>window.__HON_GIOI__.world.previewAsset?.status==='loaded',null,{timeout:120000});
    await page.waitForFunction(()=>window.__HON_GIOI__.world.previewAsset?.entrance?.complete,null,{timeout:120000});
    if(viewport.width===844){
      const count=await page.evaluate(()=>window.__HON_GIOI__.lobby.entranceReplays);
      await page.waitForFunction(count=>window.__HON_GIOI__.lobby.entranceReplays>count,count,{timeout:20000});
      assert.equal(await page.evaluate(()=>window.__HON_GIOI__.match),null,'Automatic replay never launches a match');
      await page.waitForFunction(()=>window.__HON_GIOI__.world.previewAsset?.entrance?.complete,null,{timeout:20000});
    }
    const suffix=`${viewport.width}x${viewport.height}`;
    const capture=async name=>{
      const path=`${evidence}/${name}-${suffix}.png`;
      // Preserve the last fully rendered frame while reading the canvas. SwiftShader
      // otherwise queues continuous 3D work ahead of the screenshot readback.
      await page.evaluate(()=>{const w=window.__HON_GIOI__.world;w.auditOriginalRender=w.render;w.render=()=>{};});
      try{await page.waitForFunction(()=>!window.__HON_GIOI__.world.busy,null,{timeout:120000});await page.screenshot({path,timeout:120000});}
      finally{await page.evaluate(()=>{const w=window.__HON_GIOI__.world;w.render=w.auditOriginalRender;delete w.auditOriginalRender;});}
      await execFileAsync('python3',['scripts/update-picture-gallery.py','--task','11','--image',path]);
      console.log('Captured',name,suffix);
    };
    assert.equal(await page.locator('select').count(),0);
    assert.equal(await page.locator('.character-panel').isVisible(),false);
    assert.equal(await page.locator('.loadout-panel').isVisible(),false);
    assert.equal(await page.evaluate(()=>window.__HON_GIOI__.match),null);
    geometry.push({viewport,view:'home',checks:await auditGeometry(page,'home',viewport)});
    await capture('H1-home');
    const bounds=async selector=>page.locator(selector).boundingBox();
    const start=await bounds('#start');
    assert(start.x>=0&&start.y>=0&&start.x+start.width<=viewport.width&&start.y+start.height<=viewport.height,'Start fits screen');
    await page.locator('#quickCharacter').click();
    await page.waitForSelector('.character-panel:visible');
    assert.equal(await page.locator('.hero-stats .stat').count(),8);
    assert.equal(await page.locator('.quick-slot-row button').count(),3);
    assert.equal(await page.locator('.branches button').count(),3);
    const panel=await bounds('.character-panel');
    assert.equal(await page.locator('.battle-dock').isVisible(),false,'Full-height character panel replaces match controls');
    assert(panel.y>=0&&panel.y+panel.height<=viewport.height,'Character panel fits screen');
    geometry.push({viewport,view:'character',checks:await auditGeometry(page,'character',viewport)});
    await capture('H2-character');
    await page.locator('.character-panel').evaluate(el=>el.scrollTop=el.scrollHeight);
    const lastSlot=await page.locator('.quick-slot-row button').last().boundingBox();
    assert(lastSlot.y+lastSlot.height<=panel.y+panel.height,'Support slots remain reachable by scrolling');
    await capture('H2-branches-supports');
    await page.locator('.character-panel').evaluate(el=>el.scrollTop=0);
    await page.locator('#editHero').click();
    assert.equal(await page.locator('.hero-grid [data-hero]').count(),12);
    await page.locator('[data-hero="3"]').click();
    assert.equal(await page.locator('.hero-heading').textContent(),'Kỳ Vân');
    assert.equal(await page.locator('.lobby-skills article').count(),4);
    await page.waitForFunction(()=>window.__HON_GIOI__.world.lobbyPresentation?.hero===3&&window.__HON_GIOI__.world.lobbyPresentation?.complete,null,{timeout:120000});
    if(viewport.width===844){const count=await page.evaluate(()=>window.__HON_GIOI__.lobby.entranceReplays);await page.waitForFunction(count=>window.__HON_GIOI__.lobby.entranceReplays>count,count,{timeout:20000});await page.waitForFunction(()=>window.__HON_GIOI__.world.lobbyPresentation?.complete,null,{timeout:20000});}
    geometry.push({viewport,view:'heroes',checks:await auditGeometry(page,'heroes',viewport)});
    await capture('H3-legacy-hero');
    await page.locator('[data-hero="0"]').click();
    await page.waitForFunction(()=>window.__HON_GIOI__.loadout.hero===0&&window.__HON_GIOI__.world.previewAsset?.status==='loaded'&&window.__HON_GIOI__.world.previewAsset?.entrance?.complete,null,{timeout:120000});
    await page.waitForFunction(async()=>{const w=window.__HON_GIOI__.world;const s=w.inspect?(await w.inspect()).showcase:w.inspectShowcase();return s.heroId==='H01-C0'&&s.visibleTriangles>0;},null,{timeout:120000});
    await page.waitForTimeout(500);
    await capture('H3-heroes');
    await page.locator('[data-branch="1"]').click();
    assert.equal(await page.evaluate(()=>window.__HON_GIOI__.loadout.branch),1);
    await page.locator('.hero-confirm').click();
    await page.locator('[aria-label="Đóng Nhân vật"]').click();
    await page.locator('.lobby-bottom-nav [data-lobby-view="inventory"]').click();
    await page.locator('[data-ring="1"]').click();
    await page.getByRole('dialog',{name:'Hồn hoàn khe 1'}).waitFor();
    await page.locator('[data-choice="0"]').click();
    assert.equal(await page.evaluate(()=>window.__HON_GIOI__.loadout.rings[0]),0);
    await page.locator('[data-ring="1"]').click();
    const compatible=page.locator('.gear-option:not([data-choice="0"])').first();
    const ring=+(await compatible.getAttribute('data-choice'));await compatible.click();
    assert.equal(await page.evaluate(()=>window.__HON_GIOI__.loadout.rings[0]),ring);
    await page.locator('#skin').click();
    await page.locator('[data-choice="1"]').click();
    await page.waitForFunction(()=>window.__HON_GIOI__.loadout.skin===1);
    assert.equal(await page.evaluate(()=>window.__HON_GIOI__.profile.tb),2200,'Cosmetics retain their actual price');
    await page.locator('#skin').click();await page.locator('[data-choice="0"]').click();
    await capture('inventory');
    await page.locator('#openSupports').click();
    assert.equal(await page.locator('select').count(),0,'Supports also use card drawers');
    await page.locator('[data-support="5"]').click();
    await page.locator('[data-support="18"]').click();
    await page.locator('[data-support="1"]').click();
    assert(await page.locator('[data-support="4"]').isDisabled(),'Conflicting supports stay blocked');
    await page.locator('#closeModal').click();
    await page.locator('[aria-label="Đóng Hành trang"]').click();
    await page.locator('[data-lobby-action="friends"]').click();
    assert.equal(await page.locator('[data-social-tab]').count(),3);
    await page.locator('[data-social-tab="Bang Hội"]').click();await page.locator('#friendReload').click();
    await page.locator('#openFriendSearch').click();assert(await page.locator('#friendSearch').isVisible());
    await page.locator('#openFriendSearch').click();assert.equal(await page.locator('#friendSearch').isVisible(),false);
    await capture('H4-friends');await page.locator('#closeModal').click();
    await page.locator('[data-lobby-action="profile"]').click();
    assert.equal(await page.locator('[data-profile-tab]').count(),5);
    assert.equal(await page.locator('.lobby-screen').evaluate(el=>getComputedStyle(el).visibility),'hidden','Full-screen profile hides the lobby UI');
    await capture('H5-profile');await page.locator('#closeModal').click();
    await page.locator('[data-lobby-action="pass"]').click();
    assert.equal(await page.locator('.pass-track>section').count(),2);
    await capture('H6-pass');await page.locator('#closeModal').click();
    await page.locator('[data-lobby-action="quests"]').click();
    await page.locator('[data-quest-period="weekly"]').click();
    assert.equal(await page.locator('[data-quest-week]').count(),4);
    await page.locator('[data-quest-week="4"]').click();
    await capture('H7-quests');await page.locator('#closeModal').click();
    await page.locator('#openModes').click();await page.locator('[data-mode="duo"]').click();
    assert.equal(await page.evaluate(()=>window.__HON_GIOI__.loadout.mode),'duo');
    assert.equal(await page.evaluate(()=>window.__HON_GIOI__.match),null,'Navigating all screens never enters a match');
    // The actual Start button remains the only authorized path into a match.
    if(viewport.width===844) {
      await page.locator('#start').click();
      await page.waitForFunction(()=>window.__HON_GIOI__.match?.time>0,null,{timeout:120000});
      assert.equal(await page.evaluate(()=>window.__HON_GIOI__.lifecycle.phase),'IN_MATCH');
      await capture('battle');
    }
    assert(geometry.filter(s=>s.viewport.width===viewport.width).every(s=>s.checks.every(c=>c.maxErrorPx<=2)),`Reference geometry failed at ${suffix}`);
    results.push({viewport,passed:true});console.log('PASS viewport',suffix);await page.close();
  }
  assert.deepEqual(errors,[]);
  console.log('Reference geometry:',JSON.stringify(geometry));
  await writeFile(`${evidence}/browser-results.json`,JSON.stringify({results,errors,geometry},null,2)+'\n');
  assert(geometry.every(screen=>screen.checks.every(c=>c.maxErrorPx<=2)), 'Reference element geometry stays within 2 CSS pixels');
  console.log('Lobby H1–H7, gear, supports, modes and explicit match launch: PASS',results);
}catch(error){await writeFile(`${evidence}/browser-failure.json`,JSON.stringify({error:error.message,errors,results,geometry},null,2)+'\n');throw error;}finally{await browser.close();}
