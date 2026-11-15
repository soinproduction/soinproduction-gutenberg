import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
import {preview} from 'vite';
import {entries} from '../catalog.js';

// Test the built site, including the iframe boundary and actual Kit runtime.
const root=fileURLToPath(new URL('../',import.meta.url));
const server=await preview({root,preview:{host:'127.0.0.1',port:0}});
const base=`http://127.0.0.1:${server.httpServer.address().port}/`;
let browser;
try {
 browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH}:{})});
const page=await browser.newPage({viewport:{width:1920,height:1080}});const errors=[],network=[],checks=[];
page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(r.method()==='POST'||/\/api\/forms|__preview\/forms|turnstile|\/booking/.test(r.url()))network.push(r.url());});
const f=page.frameLocator('.live-viewport iframe');
const wait=async fn=>{for(let i=0;i<80;i++){if(await fn())return;await page.waitForTimeout(100);}throw new Error('Condition timeout');};
async function open(n){await page.goto(base+'#'+n);await f.locator('.preview-for-'+n).waitFor();await page.locator('.live-source pre').waitFor();}
await open('Heading');await page.getByLabel('Текст',{exact:true}).fill('Проверка текста');await wait(async()=>await f.locator('h2').innerText()==='Проверка текста');await page.getByLabel('Уровень').selectOption('4');await f.locator('h4').waitFor();assert.match(await page.locator('.live-source pre').innerText(),/level=\{4\}/);await page.getByRole('tab',{name:'Данные',exact:true}).click();await wait(async()=>(await page.locator('.live-source pre').innerText()).includes('Проверка текста'));await page.getByLabel('Сбросить превью').click();await f.getByText('Место для хороших идей.').waitFor();checks.push('Heading controls, JSX, fixture, reset');
for(const n of ['Section','Toggle','Show']){await open(n);await page.locator('.live-options input').uncheck();await f.locator('.demo-empty').waitFor();await page.locator('.live-options input').check();await wait(async()=>await f.locator('.demo-empty').count()===0);checks.push(n+' conditional');}
await open('Choice');await page.getByLabel('Значение в инспекторе').selectOption('project');await f.getByText('Затем — проект.').waitFor();checks.push('Choice + Show');
await open('Accordion');let summaries=f.locator('summary');await summaries.nth(1).click();await wait(async()=>await f.locator('details[open]').count()===1 && await f.locator('details').nth(1).getAttribute('open')!==null);await page.getByLabel('Несколько открытых').check();await summaries.nth(0).click();await summaries.nth(2).click();await wait(async()=>await f.locator('details[open]').count()>=2);await page.getByLabel('Режим',{exact:true}).selectOption('tabs');await f.getByRole('tab').nth(1).click();assert.equal(await f.getByRole('tab').nth(1).getAttribute('aria-selected'),'true');await f.getByRole('tab').nth(1).press('ArrowRight');assert.equal(await f.getByRole('tab').nth(2).getAttribute('aria-selected'),'true');checks.push('Accordion single/multiple/tabs/keyboard');
await open('Slider');await wait(async()=>await f.locator('[data-slider-pagination] button').count()===3);await f.getByLabel('Следующий слайд',{exact:true}).click();await wait(async()=>await f.locator('[data-slider-pagination] button').nth(1).getAttribute('aria-current')==='true');await f.getByLabel('Слайд 3',{exact:true}).click();await wait(async()=>await f.locator('[data-slider-pagination] button').nth(2).getAttribute('aria-current')==='true');assert.equal(await f.getByLabel('Следующий слайд',{exact:true}).isDisabled(),true);await page.getByLabel('Цикл',{exact:true}).check();await wait(async()=>!await f.getByLabel('Следующий слайд',{exact:true}).isDisabled());checks.push('Slider arrows/dots/disabled/loop');
await open('List');assert.equal(await f.locator('.demo-list-card').count(),2);await f.getByText('Показать ещё',{exact:true}).click();assert.equal(await f.locator('.demo-list-card').count(),4);await page.getByLabel('Вывод',{exact:true}).selectOption('pagination');await f.getByLabel('Page 2',{exact:true}).click();await f.getByText('На любом экране',{exact:true}).waitFor();assert.equal(await f.locator('.demo-list-card').count(),2);await page.getByLabel('Вывод',{exact:true}).selectOption('all');await wait(async()=>await f.locator('.demo-list-card').count()===4);checks.push('List load more/pagination/all');
await open('Media');await f.locator('.sp-media-trigger').click();await f.locator('dialog[open]').waitFor();await f.locator('dialog').press('Escape');await wait(async()=>await f.locator('dialog[open]').count()===0);await page.getByLabel('Показ',{exact:true}).selectOption('inline');await f.locator('.sp-media--inline img').waitFor();checks.push('Media open/Escape/inline');
await open('Button');for(const style of ['outline','primary','accent']){await page.getByLabel('Стиль',{exact:true}).selectOption(style);await wait(async()=>(await page.locator('.live-source pre').innerText()).includes('style="'+style+'"'));}await f.getByText('Обсудить проект',{exact:true}).click();await f.getByRole('status').waitFor();checks.push('Button variants/local action');
await open('Drag');let widths=await f.locator('.site-flow-column').evaluateAll(els=>els.map(e=>e.getBoundingClientRect().width));assert(widths[0]>widths[1]*1.5);await page.getByLabel('Колонки',{exact:true}).selectOption('6');await wait(async()=>{const w=await f.locator('.site-flow-column').evaluateAll(es=>es.map(e=>e.getBoundingClientRect().width));return Math.abs(w[0]-w[1])<1;});await page.getByLabel('Узкое превью',{exact:true}).click();await wait(async()=>await f.locator('body').evaluate(e=>innerWidth<=320));let pos=await f.locator('.site-flow-column').evaluateAll(es=>es.map(e=>e.getBoundingClientRect().top));assert(pos[1]>pos[0]);checks.push('Drag proportions/narrow stack');
await open('RecordEdit');await f.getByText('Редактировать запись',{exact:true}).click();await f.getByRole('status').waitFor();await page.getByLabel('Режим редактора').uncheck();await f.locator('.demo-empty').waitFor();checks.push('RecordEdit editor-only');
await open('ReviewsCarousel');await wait(async()=>await f.getByRole('tab').count()===3);await f.getByLabel('Следующий отзыв',{exact:true}).click();await wait(async()=>await f.getByRole('tab').nth(1).getAttribute('aria-selected')==='true');checks.push('Reviews carousel');
await open('PricingPlans');await page.getByLabel('Модуль booking подключён').uncheck();await f.locator('.demo-unavailable').waitFor();assert.equal(await f.locator('.site-tariff-preview').count(),0);await page.getByLabel('Модуль booking подключён').check();await f.locator('.site-tariff-preview').waitFor();checks.push('Booking availability');
await open('Form');await page.getByLabel('Модуль forms подключён').uncheck();await f.locator('.demo-unavailable').waitFor();assert.equal(await f.locator('form').count(),0);await page.getByLabel('Модуль forms подключён').check();await f.locator('form').waitFor();await wait(async()=>!await f.locator('button[type=submit]').isDisabled());await f.locator('button[type=submit]').click();assert.equal(await f.locator('form').evaluate(form=>form.checkValidity()),false);await f.getByLabel('Имя',{exact:false}).fill('Демо');await f.getByLabel('Email',{exact:false}).fill('demo@example.com');await f.getByRole('combobox').click();await f.getByRole('option',{name:'Новый сайт',exact:true}).click();await page.getByLabel('Ответ демо').selectOption('error');await f.locator('button[type=submit]').click();await f.getByRole('alert').waitFor();assert.match(await f.getByRole('alert').innerText(),/Демонстрационная ошибка/);await page.getByLabel('Ответ демо').selectOption('success');await f.locator('button[type=submit]').click();await f.getByText('Всё получилось.',{exact:true}).waitFor();assert.equal(network.length,0);checks.push('Forms availability/validation/select/error/success/no network');

// Every documented component must have a non-empty runtime example at each size.
const coverage=[];
for(const width of [1920,400,320]) {
 await page.setViewportSize({width,height:1000});
 for(const [,name] of entries) {
  await open(name);
  const state=await f.locator('body').evaluate(async body=>{
   await document.fonts.ready;
   const images=[...body.querySelectorAll('img')];
   await Promise.all(images.map(async image=>{image.loading='eager';try{await image.decode();}catch{}}));
   return {children:body.querySelector('.demo-render')?.childElementCount,overflow:body.scrollWidth>innerWidth+1,brokenImages:images.filter(i=>!i.naturalWidth).length};
  });
  assert(state.children>0,`${name} has no example at ${width}px`);
  assert.equal(state.overflow,false,`${name} preview overflows at ${width}px`);
  assert.equal(state.brokenImages,0,`${name} has broken images at ${width}px`);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,`${name} page overflows at ${width}px`);
  coverage.push(`${name}/${width}`);
 }
}
assert.deepEqual(errors,[],'No browser exceptions');
assert.deepEqual(network,[],'Preview must never submit to a real endpoint');
console.log(JSON.stringify({interactions:checks.length,coverage:coverage.length,errors,network},null,2));
} finally {
 await browser?.close();
 await new Promise(resolve=>server.httpServer.close(resolve));
}
