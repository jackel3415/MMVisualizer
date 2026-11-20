// Run: npm test. Optionally set MMV_CONFIG and MMV_CSS for a private local acceptance case.
const {test,before,after}=require('node:test');
const assert=require('node:assert/strict');
const {chromium}=require('playwright-core');
const {pathToFileURL}=require('node:url');
const path=require('node:path');
const fs=require('node:fs');
const root=path.resolve(__dirname,'..');
let browser;
const source=`let config={language:'en',locale:'en-US',timeFormat:12,units:'imperial',extra:false,modules:[
 {module:'MMM-LogExt',config:{beforeContext:function(msg){return '['+msg.method+']'},afterContext:function(msg){return 'at ('+msg.location+')'}}},
 {module:'clock',position:'top_bar',config:{displaySeconds:false}},
 {module:'calendar',position:'top_bar',classes:'invisible',config:{calendars:[{name:'Home',url:'https://example.test/home.ics',color:'#4fd1c5'},{name:'School',url:'https://calendar.google.com/calendar/ical/basic.ics',color:'#ffcb50'}]}},
 {module:'weather',position:'top_left',classes:'page1',config:{weatherProvider:'openmeteo',type:'current',lat:27.95,lon:-82.45,showHumidity:true}},
 {module:'weather',position:'top_left',classes:'page2',config:{weatherProvider:'openmeteo',type:'hourly',lat:27.95,lon:-82.45,maxEntries:8}},
 {module:'MMM-HomeAssistantDisplay',position:'top_left',config:{title:'Sensors',class:'porch',sections:[{displayTemplate:'Temp: {{ states("sensor.temperature") }}&deg;F',class:'temperature'}]}},
 {module:'MMM-HomeAssistantDisplay',position:'top_bar',config:{title:'Mail',useModuleTigger:true,sections:[{displayTemplate:'{% if true %}MAIL HAS ARRIVED{% endif %}'}]}},
 {module:'MMM-CalendarExt3',position:'lower_third',classes:'SceneFamily',header:'Family',config:{mode:'day',dayIndex:-1,calendarSet:['Home'],displayLegend:true,useWeather:true}},
 {module:'MMM-CalendarExt3',position:'lower_third',classes:'SceneKid',header:'School',config:{mode:'week',weeksInView:1,firstDayOfWeek:1,calendarSet:['School']}},
 {module:'MMM-CalendarExt3Agenda',position:'top_right',classes:'SceneFamily',config:{startDayIndex:0,endDayIndex:3,calendarSet:['Home']}},
 {module:'MMM-Pollen',position:'top_left',config:{zip_code:'33601'}},
 {module:'MMM-RAIN-MAP',position:'top_left',config:{mapPositions:[{lat:27.95,lng:-82.45,zoom:7}],mapWidth:'350px',mapHeight:'350px'}},
 {module:'MMM-ImagesPhotos',position:'fullscreen_below',config:{updateInterval:100}},
 {module:'newsfeed',position:'bottom_left',config:{feeds:[{title:'Demo News',url:'https://example.test/news.rss'}]}},
 {module:'MMM-News-QR',position:'bottom_right',config:{imageSize:100}},
 {module:'MMM-BMW-PW',position:'top_bar',config:{apiKey:''}},
 {module:'MMM-GPIO-Notifications',config:{'24':{notifications_high:[{payload:{callback:(response)=>console.log(response.ok)}}]},'25':{notifications_high:[{payload:{callback:(response)=>console.log(response.ok)}}]}}},
 {module:'MMM-Scenes2',config:{scenario:[{name:'Family',enter:['SceneFamily'],exit:['SceneKid','SceneWeather'],next:'Kid',life:100},{name:'Kid',enter:['SceneKid'],exit:['SceneFamily','SceneWeather'],next:'Family',life:100},{name:'Weather',enter:['SceneWeather'],exit:['SceneKid','SceneFamily']}]}},
 {module:'MMM-Carousel',config:{mode:'positional',transitionInterval:100,top_left:{enabled:true,ignoreModules:['MMM-HomeAssistantDisplay']}}}
]};`;
const css=`body{margin:10px;width:calc(100% - 30px);height:calc(100% - 20px)}
.region.top.left{top:120%;min-width:calc(100%/3 - 30px)}
.invisible{display:none}.clock .date{color:rgb(255,0,0)}
.CX3 .cell{background:rgb(12,34,56)}
/* Simulate the extra brace in the supplied stylesheet. */ }
.MMM-CalendarExt3 .module-header{border-radius:20px}
@media(min-width:10px){#status{color:rgb(1,2,3)}.CX3 .event{border-radius:8px}}
`;
const weather=()=>{
 const hours=Array.from({length:48},(_,i)=>new Date(Date.now()+i*3600000));
 return {current:{temperature_2m:78,apparent_temperature:80,relative_humidity_2m:62,weather_code:2,wind_speed_10m:7},
   hourly:{time:hours.map(d=>d.toISOString()),temperature_2m:hours.map(()=>78),weather_code:hours.map(()=>2)},
   daily:{time:hours.filter((_,i)=>i%24===0).map(d=>d.toISOString().slice(0,10)),temperature_2m_max:[82,83],temperature_2m_min:[68,69],weather_code:[2,0]}};
};
const iso=d=>d.toISOString().replace(/[-:]/g,'').replace(/\.\d+Z/,'Z');
const ics=()=>{const start=new Date();start.setHours(16,0,0,0);return `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nBEGIN:VEVENT\r\nUID:test\r\nDTSTART:${iso(start)}\r\nDTEND:${iso(new Date(+start+3600000))}\r\nSUMMARY:Feed event\r\nEND:VEVENT\r\nEND:VCALENDAR`;};
async function pageFor(config=source,style=css){
 const context=await browser.newContext({viewport:{width:1600,height:1100}}),errors=[],requests=[];
 await context.route(/^https?:/,async r=>{
   const url=r.request().url();requests.push(url);
   if(url.includes('api.open-meteo.com'))return r.fulfill({json:weather()});
   if(url.includes('rss2json'))return r.fulfill({json:{items:[{title:'Fixture headline',link:'https://example.test/article'}]}});
   if(url.includes('.ics'))return r.fulfill({contentType:'text/calendar',body:ics()});
   if(url.includes('rainviewer.com'))return r.fulfill({json:{host:'https://example.test',radar:{past:[{path:'/radar',time:Math.floor(Date.now()/1000)}]}}});
   return r.abort();
 });
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.stack));
 await page.goto(pathToFileURL(path.join(root,'MMVisualizer.html')).href);
 await page.locator('#fi').setInputFiles({name:'config.js',mimeType:'application/javascript',buffer:Buffer.from(config)});
 await page.waitForFunction(()=>document.getElementById('status').textContent.startsWith('Loaded: config.js'));
 if(style){await page.locator('#vi').setInputFiles({name:'custom.css',mimeType:'text/css',buffer:Buffer.from(style)});await page.waitForFunction(()=>document.getElementById('status').textContent.startsWith('custom.css loaded'));}
 return {page,errors,requests,close:async()=>{assert.deepEqual(errors,[]);await context.close();}};
}
before(async()=>{browser=await chromium.launch(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{channel:'chrome'});});
after(async()=>{await browser?.close();});

test('config callbacks, arrays, false, regex and dates survive export and real drag/undo/redo',async()=>{
 const {page,close}=await pageFor();
 const funcs=()=>page.evaluate(()=>{
   const out=parseConfig(serializeConfig(cfg));
   return [out.modules[0].config.beforeContext({method:'log'}),out.modules[0].config.afterContext({location:'x'}),typeof out.modules.find(m=>m.module==='MMM-GPIO-Notifications').config['24'].notifications_high[0].payload.callback,out.extra];
 });
 assert.deepEqual(await funcs(),['[log]','at (x)','function',false]);
 const start=await page.evaluate(()=>cfg.modules[1].position);
 const data=await page.evaluateHandle(()=>{const d=new DataTransfer();d.setData('text/plain',JSON.stringify({type:'move',idx:1}));return d;});
 await page.locator('#region-top_right').dispatchEvent('drop',{dataTransfer:data});
 assert.equal(await page.evaluate(()=>cfg.modules[1].position),'top_right');
 await page.keyboard.press('Control+z');assert.equal(await page.evaluate(()=>cfg.modules[1].position),start);assert.deepEqual(await funcs(),['[log]','at (x)','function',false]);
 await page.keyboard.press('Control+Shift+z');assert.equal(await page.evaluate(()=>cfg.modules[1].position),'top_right');assert.deepEqual(await funcs(),['[log]','at (x)','function',false]);
 assert.equal(await page.evaluate(()=>serializeConfig(cfg).includes('_mmvId')),false);
 assert.equal(await page.evaluate(()=>{const x={modules:[],a:[()=>42,/a+/gi,new Date('2025-01-01'),undefined,false]};const y=parseConfig(serializeConfig(x));return y.a[0]()===42&&y.a[1].test('aaa')&&y.a[2] instanceof Date&&y.a[3]===undefined&&y.a[4]===false;}),true);
 await close();
});
test('CSS fixes the stray brace, matches native markup, and cannot restyle editor controls',async()=>{
 const {page,close}=await pageFor();
 const x=await page.evaluate(()=>({
   repaired:!document.getElementById('vc-area').value.includes('*/ }'),
   status:getComputedStyle(document.getElementById('status')).color,
   cell:getComputedStyle(document.querySelector('.CX3 .cell')).backgroundColor,
   regions:document.querySelectorAll('#mirror .region.top.left').length,
   header:document.querySelector('#mirror .MMM-CalendarExt3 .module-header')?.className,
   css:document.getElementById('vc-raw').textContent,
 }));
 assert.equal(x.repaired,true);assert.notEqual(x.status,'rgb(1, 2, 3)');assert.equal(x.cell,'rgb(12, 34, 56)');assert.equal(x.regions,1);assert.ok(x.header);assert.match(x.css,/#mirror #status/);
 const body=await page.locator('#mirror-body').evaluate(e=>({margin:getComputedStyle(e).margin,width:e.clientWidth}));assert.equal(body.margin,'10px');assert.ok(body.width>1800);
 await close();
});
test('Open-Meteo current and hourly render without an API key',async()=>{
 const {page,requests,close}=await pageFor();
 await page.waitForFunction(()=>document.querySelector('.weather-temp')?.textContent.includes('78'));
 await page.selectOption('[data-carousel="top_left"]','1');
 await page.waitForFunction(()=>document.querySelectorAll('.mmv-hourly tr').length===8);
 assert.equal(await page.locator('.weather-err').count(),0);
 assert.ok(requests.some(u=>u.includes('api.open-meteo.com')&&u.includes('temperature_unit=fahrenheit')));
 await close();
});
test('repeated clock instances both tick with their own formatting',async()=>{
 const {page,close}=await pageFor();
 const times=await page.evaluate(()=>{
   cfg.modules.push({module:'clock',position:'top_bar',config:{timeFormat:24,displaySeconds:true}});ensureIds(cfg);render();
   return [...document.querySelectorAll('.mm-clock .time')].map(e=>e.textContent);
 });
 assert.equal(times.length,2);assert.match(times[0],/AM|PM/);assert.match(times[1],/^\d+:\d{2}:\d{2}$/);await close();
});
test('scene and carousel controls select the correct modules and leave ignored sensors visible',async()=>{
 const {page,close}=await pageFor();
 const visible=selector=>page.locator(selector).evaluateAll(es=>es.length>0&&es.every(e=>getComputedStyle(e).display!=='none'));
 assert.equal(await visible('.module.SceneFamily'),true);assert.equal(await visible('.module.SceneKid'),false);
 await page.selectOption('#preview-scene','1');assert.equal(await visible('.module.SceneFamily'),false);assert.equal(await visible('.module.SceneKid'),true);
 await page.selectOption('[data-carousel="top_left"]','2');assert.equal(await visible('.module.MMM-Pollen'),true);assert.equal(await visible('.module.weather'),false);
 assert.equal(await visible('.module.MMM-HomeAssistantDisplay:has(.porch)'),true);
 await page.selectOption('#preview-scene','2');assert.match(await page.locator('#preview-notes').textContent(),/no modules/);
 await page.selectOption('#preview-scene','-1');assert.equal(await visible('.module.SceneFamily'),true);assert.equal(await visible('.module.SceneKid'),true);
 await close();
});
test('rotation play/pause respects intervals and next scene overrides',async()=>{
 const {page,close}=await pageFor();await page.clock.install();
 await page.locator('#preview-play').check();await page.clock.runFor(110);
 assert.equal(await page.evaluate(()=>MMV.state.scene),1);assert.equal(await page.evaluate(()=>MMV.state.carousel.top_left),1);
 await page.locator('#preview-play').uncheck();await page.clock.runFor(500);
 assert.equal(await page.evaluate(()=>MMV.state.scene),1);
 await close();
});
test('calendars use named shared feeds; day mode starts at dayIndex and agenda receives events',async()=>{
 const {page,requests,close}=await pageFor();
 await page.waitForFunction(()=>document.querySelector('.SceneFamily .event .title')?.textContent==='Feed event');
 assert.equal(await page.evaluate(()=>MMV.calendarFeeds(cfg.modules[7]).map(x=>x.name).join(',')),'Home');
 const actual=await page.locator('.SceneFamily.CX3, .SceneFamily .CX3 .cell').first().getAttribute('data-date');
 const expected=await page.evaluate(()=>{const d=new Date();d.setDate(d.getDate()-1);return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');});
 assert.equal(actual,expected);
 assert.ok(await page.locator('.CX3A .event').count()>0);assert.ok(requests.some(x=>x.endsWith('home.ics')));
 assert.equal(requests.some(x=>x.includes('ical/basic.ics')),false);
 await close();
});
test('iCal recurrence, exceptions, all-day and VTIMEZONE data are expanded',async()=>{
 const {page,close}=await pageFor();
 const result=await page.evaluate(()=>{
   const text='BEGIN:VCALENDAR\r\nVERSION:2.0\r\nBEGIN:VTIMEZONE\r\nTZID:Test/Eastern\r\nBEGIN:STANDARD\r\nDTSTART:19701101T020000\r\nTZOFFSETFROM:-0400\r\nTZOFFSETTO:-0500\r\nEND:STANDARD\r\nEND:VTIMEZONE\r\nBEGIN:VEVENT\r\nUID:recurring\r\nDTSTART;TZID=Test/Eastern:20261118T090000\r\nDTEND;TZID=Test/Eastern:20261118T100000\r\nRRULE:FREQ=DAILY;COUNT=3\r\nEXDATE;TZID=Test/Eastern:20261119T090000\r\nSUMMARY:Recurring\r\nEND:VEVENT\r\nBEGIN:VEVENT\r\nUID:all-day\r\nDTSTART;VALUE=DATE:20261119\r\nDTEND;VALUE=DATE:20261120\r\nSUMMARY:All day\r\nEND:VEVENT\r\nEND:VCALENDAR';
   return MMV.parseCalendar(text,{name:'Test'},new Date('2026-11-17'),new Date('2026-11-22')).map(x=>({title:x.title,allDay:x.allDay,start:x.start.toISOString()}));
 });
 assert.equal(result.filter(x=>x.title==='Recurring').length,2);assert.ok(result.some(x=>x.title==='Recurring'&&x.start==='2026-11-18T14:00:00.000Z'));assert.equal(result.find(x=>x.title==='All day').allDay,true);
 await close();
});
test('sample modules render content and QR; local photo upload stays out of exported config',async()=>{
 const {page,close}=await pageFor();await page.locator('#preview-sample').check();await page.locator('#preview-trigger').check();
 await page.waitForFunction(()=>document.querySelectorAll('.event').length>5);
 assert.equal(await page.locator('#mirror .mm-placeholder').count(),0);
 assert.ok(await page.locator('.mmv-qr canvas').count());assert.match(await page.locator('.mmv-qr canvas').getAttribute('aria-label'),/example.com/);
 assert.match(await page.locator('.porch').textContent(),/78/);assert.ok(await page.locator('.mmv-pollen-row').count());assert.ok(await page.locator('.mmv-radar-sample').count());
 const data=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=c.height=2;return c.toDataURL().split(',')[1];});
 await page.locator('#preview-photos').setInputFiles({name:'preview.png',mimeType:'image/png',buffer:Buffer.from(data,'base64')});
 assert.equal(await page.locator('.mmv-photos img').getAttribute('alt'),'preview.png');assert.equal(await page.evaluate(()=>serializeConfig(cfg).includes('blob:')),false);
 await close();
});
test('repeated modules keep independent widths through move, undo and redo',async()=>{
 const {page,close}=await pageFor();
 assert.equal(await page.evaluate(()=>{const a=cfg.modules[3],b=cfg.modules[4];setModuleWidth(a,'310px');const key=widthKey(a);a.position='top_right';updateConfigArea();render();return previewWidths[key]==='310px'&&!previewWidths[widthKey(b)];}),true);
 await page.evaluate(()=>undo());assert.equal(await page.evaluate(()=>cfg.modules[3].position),'top_left');await page.evaluate(()=>redo());
 assert.equal(await page.evaluate(()=>previewWidths[widthKey(cfg.modules[3])]),'310px');
 await close();
});
test('save downloads preserve callbacks, and saving config does not clear unsaved CSS',async()=>{
 const {page,close}=await pageFor();
 await page.evaluate(()=>{window.showSaveFilePicker=undefined;updateConfigArea();markDirty('css');});
 const pending=page.waitForEvent('download');await page.keyboard.press('Control+s');const download=await pending;
 assert.equal(download.suggestedFilename(),'Config.js');const saved=fs.readFileSync(await download.path(),'utf8');
 assert.match(saved,/beforeContext: function/);assert.match(saved,/callback:/);assert.equal(saved.includes('_mmvId'),false);
 assert.equal(await page.evaluate(()=>dirty&&cssDirty&&!configDirty),true);
 const pendingCSS=page.waitForEvent('download');await page.evaluate(()=>saveVisualConfigFile());const cssDownload=await pendingCSS;
 assert.equal(cssDownload.suggestedFilename(),'custom.css');assert.match(fs.readFileSync(await cssDownload.path(),'utf8'),/\.CX3 \.cell/);
 assert.equal(await page.evaluate(()=>dirty),false);await close();
});
test('global and slides carousels respect ignored modules and object scene roles',async()=>{
 const {page,close}=await pageFor();
 assert.equal(await page.evaluate(()=>{
   const carousel=cfg.modules.find(m=>m.module==='MMM-Carousel');carousel.config={mode:'global',ignoreModules:['clock']};MMV.state.carousel={};render();
   return MMV.isVisible(cfg.modules[1])&&!MMV.isVisible(cfg.modules[3]);
 }),true);
 assert.equal(await page.evaluate(()=>{
   cfg.modules.find(m=>m.module==='MMM-Carousel').config={mode:'slides',ignoreModules:['clock'],slides:[['weather'],['MMM-Pollen']]};MMV.state.carousel={slides:1};render();
   return MMV.isVisible(cfg.modules[1])&&MMV.isVisible(cfg.modules[10])&&!MMV.isVisible(cfg.modules[3]);
 }),true);
 assert.equal(await page.evaluate(()=>{
   const scenes=cfg.modules.find(m=>m.module==='MMM-Scenes2').config.scenario;scenes[0].enter=[{role:'SceneFamily',animation:'fadeIn'}];MMV.state.scene=0;
   cfg.modules.find(m=>m.module==='MMM-Carousel').disabled=true;render();return MMV.isVisible(cfg.modules[7])&&!MMV.isVisible(cfg.modules[8]);
 }),true);await close();
});
test('private supplied ZIP config acceptance', {skip:!process.env.MMV_CONFIG}, async()=>{
 const {page,close}=await pageFor(fs.readFileSync(process.env.MMV_CONFIG,'utf8'),fs.readFileSync(process.env.MMV_CSS,'utf8'));
 assert.equal(await page.evaluate(()=>cfg.modules.length),24);await page.locator('#preview-sample').check();await page.waitForFunction(()=>document.querySelectorAll('.CX3 .event').length>0);
 assert.equal(await page.locator('.mm-placeholder').count(),0);
 const callbacks=await page.evaluate(()=>{const clone=parseConfig(serializeConfig(cfg));return [typeof clone.modules[0].config.beforeContext,typeof clone.modules[0].config.afterContext,...['24','25'].map(k=>typeof clone.modules.find(m=>m.module==='MMM-GPIO-Notifications').config[k].notifications_high[0].payload.callback)];});
 assert.deepEqual(callbacks,['function','function','function','function']);
 const dir=process.env.MMV_SCREENSHOTS||path.join(root,'test-output');fs.mkdirSync(dir,{recursive:true});
 await page.selectOption('#res','1080x1920');await page.selectOption('#zoom','.45');
 await page.screenshot({path:path.join(dir,'supplied-family.png'),fullPage:true});
 await page.selectOption('#preview-scene','1');await page.screenshot({path:path.join(dir,'supplied-kid.png'),fullPage:true});
 await page.selectOption('[data-carousel="top_left"]','3');await page.screenshot({path:path.join(dir,'supplied-radar.png'),fullPage:true});
 await close();
});
