import {expect,test} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const fi={
 search:'Hae kylmäainetta',
 refrigerants:'Kylmäaineet',
 properties:'Ominaisuudet',
 sources:'Lähteet',
 overview:'Yleiskuva',
 addFavourite:(name:string)=>`Lisää ${name} suosikkeihin`,
 removeFavourite:(name:string)=>`Poista ${name} suosikeista`,
 addCompare:'Lisää vertailuun',
 compare:'Vertaa',
 check:'Vuototarkastusväli',
 calculate:'Laske tarkastusväli',
 save:'Tallenna laskelma',
 settings:'Asetukset',
 language:'Kieli',
 theme:'Teema',
 undo:'Peru',
 drag:(name:string)=>`Raahaa järjestääksesi ${name}`,
 };

async function goHome(page:import('@playwright/test').Page){
 await page.getByRole('navigation',{name:'PhaseKit'}).getByRole('link',{name:fi.refrigerants}).click();
 await expect(page.getByRole('heading',{level:1,name:fi.refrigerants})).toBeVisible();
}

async function findResult(page:import('@playwright/test').Page,query:string,designation:string){
 const search=page.getByRole('searchbox',{name:fi.search});
 await search.fill(query);
 const result=page.locator('.refrigerant-link').filter({hasText:designation}).first();
 await expect(result).toBeVisible();
 return result;
}

async function openDetail(page:import('@playwright/test').Page,query:string,designation:string){
 await goHome(page);
 await (await findResult(page,query,designation)).click();
 await expect(page.getByRole('heading',{level:1,name:designation})).toBeVisible();
}

async function addFavourite(page:import('@playwright/test').Page,query:string,designation:string){
 const result=await findResult(page,query,designation);
 const row=result.locator('..');
 await row.getByRole('button',{name:fi.addFavourite(designation)}).click();
 await page.getByRole('searchbox',{name:fi.search}).fill('');
}

async function addToComparison(page:import('@playwright/test').Page,query:string,designation:string){
 await openDetail(page,query,designation);
 await page.getByRole('button',{name:fi.addCompare}).click();
 await goHome(page);
}

async function expectAccessible(page:import('@playwright/test').Page){
 const report=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa']).analyze();
 expect(report.violations.map(({id,impact,description,nodes})=>({id,impact,description,nodes:nodes.map(node=>node.target)}))).toEqual([]);
}

test('searches by number and supports keyboard navigation across detail tabs',async({page})=>{
 await page.goto('/');
 await (await findResult(page,'134','R134a')).click();
 await expect(page.getByRole('heading',{level:1,name:'R134a'})).toBeVisible();

 const overview=page.getByRole('tab',{name:fi.overview});
 await overview.focus();
 await page.keyboard.press('ArrowRight');
 await expect(page.getByRole('tab',{name:fi.properties})).toHaveAttribute('aria-selected','true');
 await page.keyboard.press('ArrowRight');
 await expect(page.getByRole('tab',{name:'Rajoitukset',exact:true})).toHaveAttribute('aria-selected','true');
 await page.keyboard.press('ArrowRight');
 await expect(page.getByRole('tab',{name:fi.sources})).toHaveAttribute('aria-selected','true');
 await page.keyboard.press('Home');
 await expect(overview).toHaveAttribute('aria-selected','true');
 await expect(page.getByRole('tabpanel',{name:fi.overview})).toBeVisible();
});

test('adds, reorders, removes, and restores favourites',async({page})=>{
 await page.goto('/');
 await addFavourite(page,'134','R134a');
 await addFavourite(page,'404','R404A');

 const favourites=page.locator('.section').filter({has:page.getByRole('heading',{name:'Suosikit'})}).first();
 const order=()=>favourites.locator('.refrigerant-link strong').allTextContents();
 await expect.poll(order).toEqual(['R134a','R404A']);
 await favourites.getByRole('button',{name:'Muokkaa'}).click();
 await favourites.getByRole('button',{name:'Siirrä R404A aiemmaksi'}).click();
 await expect.poll(order).toEqual(['R404A','R134a']);

 const dragSource=favourites.getByRole('button',{name:fi.drag('R404A')});
 const dragTarget=favourites.getByRole('button',{name:fi.drag('R134a')});
 const sourceBox=await dragSource.boundingBox();
 const targetBox=await dragTarget.boundingBox();
 expect(sourceBox).toBeTruthy();
 expect(targetBox).toBeTruthy();
 await page.mouse.move(sourceBox!.x+sourceBox!.width/2,sourceBox!.y+sourceBox!.height/2);
 await page.mouse.down();
 await page.mouse.move(targetBox!.x+targetBox!.width/2,targetBox!.y+targetBox!.height/2,{steps:4});
 await page.mouse.up();
 await expect.poll(order).toEqual(['R134a','R404A']);

 await favourites.getByRole('button',{name:fi.removeFavourite('R404A')}).click();
 await expect(page.getByText('Suosikki poistettu.')).toBeVisible();
 await page.getByRole('button',{name:fi.undo}).click();
 await expect.poll(order).toEqual(['R134a','R404A']);
});

test('compares three refrigerants and enforces the selection limit',async({page})=>{
 await page.goto('/');
 await addToComparison(page,'134','R134a');
 await addToComparison(page,'404','R404A');
 await addToComparison(page,'513','R513A');
 await page.getByRole('button',{name:'Vertailussa 3/3'}).click();

 const comparison=page.getByRole('region',{name:fi.compare});
 await expect(comparison.getByRole('columnheader',{name:/R134a/})).toBeVisible();
 await expect(comparison.getByRole('columnheader',{name:/R404A/})).toBeVisible();
 await expect(comparison.getByRole('columnheader',{name:/R513A/})).toBeVisible();

 await openDetail(page,'1234yf','R1234yf');
 await page.getByRole('button',{name:fi.addCompare}).click();
 await expect(page.getByRole('status')).toContainText('Vertailuun mahtuu enintään kolme ainetta.');
 await goHome(page);
 await page.getByRole('button',{name:'Vertailussa 3/3'}).click();
 await expect(comparison.getByRole('columnheader')).toHaveCount(4);
});

test('calculates and saves the R513A 50 kg component result',async({page})=>{
 await page.goto('/');
 await openDetail(page,'513','R513A');
 await page.getByRole('button',{name:fi.check}).click();
 await page.getByLabel('Täytös').fill('50');
 await page.getByRole('button',{name:fi.calculate}).click();

 const result=page.locator('.result-section');
 const resultCard=result.locator('.result-card');
 await expect(resultCard).toContainText('Tarkastus vaaditaan');
 await expect(resultCard).toContainText('6 kuukauden välein');
 await page.getByText('Laskenta ja lähteet',{exact:true}).click();
 const calculation=result.locator('.calculation-details');
 await expect(calculation).toContainText('R1234yf');
 await expect(calculation).toContainText('R134a');
 await expect(calculation).toContainText('28 kg');
 await expect(calculation).toContainText('22 kg');
 await expect(calculation).toContainText('6 kuukauden välein');
 await expect(calculation).toContainText('12 kuukauden välein');
 const resultVersion=await result.locator('.fact-row').filter({hasText:'Dataversio'}).textContent();
 expect(resultVersion).toBeTruthy();

 await page.getByRole('button',{name:fi.save}).click();
 await page.getByRole('navigation',{name:'PhaseKit'}).getByRole('link',{name:'Raportit'}).click();
 const saved=page.locator('.saved-entry').first();
 await expect(saved).toContainText('R513A');
 await expect(saved).toContainText('50 kg');
 await saved.locator(':scope > summary').click();
 await expect(saved).toContainText('Tallennettu alkuperäinen tulos. Nykyinen data ei muuta tätä laskelmaa.');
 await expect(saved.locator('.fact-row').filter({hasText:'Dataversio'})).toHaveText(resultVersion!.trim());

 await openDetail(page,'513','R513A');
 await page.getByRole('button',{name:fi.check}).click();
 await page.getByLabel('Täytös').fill('50');
 await page.getByLabel('Vuodonilmaisujärjestelmä käytössä').check();
 await page.getByRole('button',{name:fi.calculate}).click();
 await expect(page.locator('.result-card')).toContainText('12 kuukauden välein');
});

test('switches between Finnish and English and applies both themes',async({page})=>{
 await page.goto('/');
 await page.getByRole('navigation',{name:'PhaseKit'}).getByRole('link',{name:fi.settings}).click();
 await page.getByLabel(fi.language).selectOption('en');
 await expect(page.getByRole('heading',{level:1,name:'Settings'})).toBeVisible();
 await expect(page.locator('html')).toHaveAttribute('lang','en');

 const theme=page.getByLabel('Theme');
 await theme.selectOption('light');
 const lightBackground=await page.locator('html').evaluate(element=>getComputedStyle(element).backgroundColor);
 await theme.selectOption('dark');
 const darkBackground=await page.locator('html').evaluate(element=>getComputedStyle(element).backgroundColor);
 expect(darkBackground).not.toBe(lightBackground);
 await expect(page.locator('html')).toHaveAttribute('data-theme','dark');

 await page.getByLabel('Language').selectOption('fi');
 await expect(page.getByRole('heading',{level:1,name:'Asetukset'})).toBeVisible();
 await expect(page.locator('html')).toHaveAttribute('lang','fi');
});

test('keeps text and content usable when the root text size is 200%',async({page})=>{
 await page.goto('/');
 await (await findResult(page,'134','R134a')).click();
 await expect(page.getByRole('heading',{level:1,name:'R134a'})).toBeVisible();
 await page.addStyleTag({content:':root{font-size:200% !important}'});

 const layout=await page.evaluate(()=>{
  const main=document.querySelector('main');
  const overflowing=[...document.querySelectorAll('body *')].map(element=>{
   const rect=element.getBoundingClientRect();
   const style=getComputedStyle(element);
   return {
    tag:element.tagName,
    id:element.id,
    className:typeof element.className==='string'?element.className:'',
    text:element.textContent?.trim().slice(0,50),
    left:Math.round(rect.left),
    right:Math.round(rect.right),
    width:Math.round(rect.width),
    clientWidth:element.clientWidth,
    scrollWidth:element.scrollWidth,
    overflowX:style.overflowX,
   };
  }).filter(element=>element.width>0&&element.right>document.documentElement.clientWidth+1).slice(0,12);
  return {
   viewportWidth:document.documentElement.clientWidth,
   documentWidth:document.documentElement.scrollWidth,
   mainWidth:main?.clientWidth??0,
   mainScrollWidth:main?.scrollWidth??0,
   computedRootSize:getComputedStyle(document.documentElement).fontSize,
   overflowing,
  };
 });
 const clippedText=await page.evaluate(()=>[...document.querySelectorAll('main h1,main h2,main h3,main p,main button,main a,main label,main dt,main dd,main summary,main small')].filter(element=>{
  const style=getComputedStyle(element);
  const verticalClip=['hidden','clip'].includes(style.overflowY)&&element.scrollHeight>element.clientHeight+1;
  const horizontalClip=['hidden','clip'].includes(style.overflowX)&&element.scrollWidth>element.clientWidth+1;
  return verticalClip||horizontalClip||style.textOverflow==='ellipsis'&&element.scrollWidth>element.clientWidth+1;
 }).map(element=>({tag:element.tagName,text:element.textContent?.trim().slice(0,60)})));
 expect(layout.computedRootSize).toBe('32px');
 expect(layout.documentWidth,JSON.stringify(layout.overflowing)).toBeLessThanOrEqual(layout.viewportWidth);
 expect(layout.mainScrollWidth,JSON.stringify(layout.overflowing)).toBeLessThanOrEqual(layout.mainWidth);
 expect(clippedText).toEqual([]);
 await expect(page.locator('.caption').first()).toHaveCSS('font-size','26px');
 await expect(page.getByRole('tab',{name:fi.sources})).toBeVisible();
 await page.getByRole('tab',{name:fi.sources}).click();
 await expect(page.getByRole('tabpanel',{name:fi.sources})).toBeVisible();
});

test('passes axe WCAG checks on the main view in light and dark themes',async({page})=>{
 await page.goto('/');
 for(const theme of ['light','dark'] as const){
  await page.getByRole('navigation',{name:'PhaseKit'}).getByRole('link',{name:fi.settings}).click();
  await page.getByLabel(fi.theme).selectOption(theme);
  await goHome(page);
  await expectAccessible(page);

  await openDetail(page,'513','R513A');
  await expectAccessible(page);

  await page.getByRole('button',{name:fi.check}).click();
  await page.getByLabel('Täytös').fill('50');
  await page.getByRole('button',{name:fi.calculate}).click();
  await expect(page.locator('.result-section')).toBeVisible();
  await expectAccessible(page);
 }
});

test('serves the app shell offline after first online load and exposes PWA metadata',async({page,context})=>{
 await page.goto('/');
 await expect(page.getByRole('heading',{level:1,name:fi.refrigerants})).toBeVisible();
 const manifestHref=await page.locator('link[rel="manifest"]').getAttribute('href');
 expect(manifestHref).toBeTruthy();
 const manifest=await page.evaluate(async href=>{
  const response=await fetch(href!);
  return {status:response.status,body:await response.json()};
 },manifestHref);
 expect(manifest.status).toBe(200);
 expect(manifest.body.name).toBe('PhaseKit');
 expect(manifest.body.display).toBe('standalone');
 expect(manifest.body.scope).toBe('/');
 expect(manifest.body.icons).toEqual(expect.arrayContaining([
  expect.objectContaining({src:'/icons/icon-192.png',sizes:'192x192',type:'image/png'}),
  expect.objectContaining({src:'/icons/icon-512.png',sizes:'512x512',type:'image/png'}),
 ]));
 for(const path of ['/icons/icon-192.png','/icons/icon-512.png']){
  const response=await page.request.get(new URL(path,page.url()).toString());
  expect(response.ok()).toBeTruthy();
  expect(response.headers()['content-type']).toContain('image/png');
 }

 await page.evaluate(()=>navigator.serviceWorker.ready.then(()=>true));
 const cdp=await context.newCDPSession(page);
 let installabilityErrors:unknown[]|null=null;
 try{
  const result=await cdp.send('Page.getInstallabilityErrors');
  installabilityErrors=result.installabilityErrors;
 }catch(error){
  if(!String(error).includes('wasn\'t found'))throw error;
 }
 if(installabilityErrors!==null)expect(installabilityErrors).toEqual([]);
 await cdp.detach();
 await page.reload();
 await expect.poll(()=>page.evaluate(()=>Boolean(navigator.serviceWorker.controller))).toBe(true);
 await context.setOffline(true);
 const freshPage=await context.newPage();
 await freshPage.goto('/');
 await expect(freshPage.getByRole('heading',{level:1,name:fi.refrigerants})).toBeVisible();
 await expect(freshPage.locator('.offline-indicator')).toContainText('Offline');
 await freshPage.reload();
 await expect(freshPage.getByRole('heading',{level:1,name:fi.refrigerants})).toBeVisible();

 await (await findResult(freshPage,'513','R513A')).click();
 await expect(freshPage.getByRole('heading',{level:1,name:'R513A'})).toBeVisible();
 await freshPage.getByRole('button',{name:fi.addFavourite('R513A')}).click();
 await freshPage.getByRole('button',{name:fi.addCompare}).click();
 await freshPage.getByRole('button',{name:fi.check}).click();
 await freshPage.getByLabel('Täytös').fill('50');
 await freshPage.getByRole('button',{name:fi.calculate}).click();
 await expect(freshPage.locator('.result-card')).toContainText('6 kuukauden välein');
 await freshPage.getByRole('button',{name:fi.save}).click();

 await goHome(freshPage);
 await (await findResult(freshPage,'134','R134a')).click();
 await freshPage.getByRole('button',{name:fi.addCompare}).click();
 await freshPage.getByRole('button',{name:'Vertailussa 2/3'}).click();
 const offlineComparison=freshPage.getByRole('region',{name:fi.compare});
 await expect(offlineComparison.getByRole('columnheader',{name:/R513A/})).toBeVisible();
 await expect(offlineComparison.getByRole('columnheader',{name:/R134a/})).toBeVisible();
 await freshPage.getByRole('navigation',{name:'PhaseKit'}).getByRole('link',{name:'Raportit'}).click();
 await expect(freshPage.locator('.saved-entry').first()).toContainText('R513A');
 await expect(freshPage.locator('.saved-entry').first()).toContainText('50 kg');
 await freshPage.close();
 await context.setOffline(false);
});
