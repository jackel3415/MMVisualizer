/* MMVisualizer compatibility runtime. MIT; third-party library licenses in vendor/. */
'use strict';
const MMV = (() => {
  const state = { config: null, scene: 0, carousel: {}, timers: [], sample: false, photos: [], photoIndex:0,
    cache: new Map(), news: null, generation: 0, issues: [] };
  const el = (tag, cls, text) => { const e=document.createElement(tag); if(cls)e.className=cls; if(text!=null)e.textContent=text; return e; };
  const esc = value => String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const classes = m => String(m.classes||'').split(/\s+/).filter(Boolean);
  const active = name => state.config?.modules?.find(m=>m.module===name&&!m.disabled);
  const controls = new Set(['MMM-Scenes2','MMM-Carousel']);
  const sampleNotice = e => { e.append(el('div','mmv-sample','Sample data')); return e; };
  const note = (e,text) => e.append(el('div','mmv-note',text));
  const dateKey = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  const addDays = (d,n) => { const x=new Date(d); x.setDate(x.getDate()+n); return x; };
  const midnight = d => { const x=new Date(d); x.setHours(0,0,0,0);return x; };
  const time = (d,config={}) => d.toLocaleTimeString(state.config?.locale||'en-US',{hour:'numeric',minute:'2-digit',hour12:(config.timeFormat??state.config?.timeFormat)!==24});
  const limit = (value, fallback, max=100) => Number.isFinite(+value)?Math.min(max,Math.max(1,+value)):fallback;

  // JS, rather than JSON: config callbacks, undefined, false and nested arrays survive exports.
  function stringify(value, depth=0, seen=new Set()) {
    if(typeof value==='function') {
      let source=Function.prototype.toString.call(value);
      if(source.includes('[native code]'))throw new Error('Cannot export a native function');
      if(!/^(?:async\s+)?function\b|^(?:async\s*)?\(?[\w\s,{}[\].=]*\)?\s*=>/.test(source) && !source.startsWith('('))
        source=source.replace(/^(async\s+)?(?=[\w$]+\s*\()/,(_,a)=>(a||'')+'function ');
      return source;
    }
    if(value===undefined)return 'undefined';
    if(typeof value==='bigint')return value+'n';
    if(typeof value==='number'&&!Number.isFinite(value))return String(value);
    if(value instanceof Date)return `new Date(${JSON.stringify(value.toISOString())})`;
    if(value instanceof RegExp)return value.toString();
    if(value===null||typeof value!=='object')return JSON.stringify(value);
    if(seen.has(value))throw new Error('Cannot export a circular config');
    seen.add(value);
    const pad='  '.repeat(depth),next='  '.repeat(depth+1);
    const entries=Array.isArray(value)?value.map(v=>stringify(v,depth+1,seen)):
      Object.keys(value).filter(k=>!k.startsWith('_mmv')).map(k=>`${/^[A-Za-z_$][\w$]*$/.test(k)?k:JSON.stringify(k)}: ${stringify(value[k],depth+1,seen)}`);
    seen.delete(value);
    return (Array.isArray(value)?'[':'{')+(entries.length?'\n'+entries.map(x=>next+x).join(',\n')+'\n'+pad:'')+(Array.isArray(value)?']':'}');
  }

  // Parse with the browser's CSS parser, then scope each rule independently. An unmatched
  // brace cannot terminate a wrapping #mirror block and leak subsequent rules into the UI.
  function cleanCSS(text) {
    let depth=0, quote='',comment=false,escape=false,out='',removed=0;
    for(let i=0;i<text.length;i++) {
      const c=text[i],n=text[i+1];
      if(comment){out+=c;if(c==='*'&&n==='/'){out+=n;i++;comment=false;}continue;}
      if(quote){out+=c;if(escape)escape=false;else if(c==='\\')escape=true;else if(c===quote)quote='';continue;}
      if(c==='/'&&n==='*'){out+=c+n;i++;comment=true;continue;}
      if(c==='"'||c==="'"){quote=c;out+=c;continue;}
      if(c==='{')depth++;
      if(c==='}') {if(!depth){removed++;continue;}depth--;}
      out+=c;
    }
    return {text:out,removed};
  }
  function splitSelectors(s) {
    const parts=[];let from=0,depth=0,quote='',escape=false;
    for(let i=0;i<s.length;i++) { const c=s[i];
      if(quote){if(escape)escape=false;else if(c==='\\')escape=true;else if(c===quote)quote='';continue;}
      if(c==='"'||c==="'")quote=c;
      else if(c==='('||c==='[')depth++;
      else if(c===')'||c===']')depth--;
      else if(c===','&&!depth){parts.push(s.slice(from,i));from=i+1;}
    }parts.push(s.slice(from));return parts;
  }
  function scopeCSS(text) {
    const parser=document.createElement('style');parser.media='not all';parser.textContent=cleanCSS(text).text;
    document.head.append(parser);
    function selector(s) {
      s=s.trim().replace(/(^|[\s>+~])(?:html|:root)(?=$|[\s>+~.#[:])/g,'$1#mirror')
        .replace(/(^|[\s>+~])body(?=$|[\s>+~.#[:])/g,'$1#mirror-body')
        .replace(/#mirror\s+#mirror/g,'#mirror');
      return s.startsWith('#mirror')?s:'#mirror '+s;
    }
    function compile(rules) { return [...rules].map(r=>{
      if(r.type===CSSRule.STYLE_RULE)return splitSelectors(r.selectorText).map(selector).join(', ')+' {'+r.style.cssText+'}';
      if(r.type===CSSRule.IMPORT_RULE){state.issues.push('External @import skipped; use a local @font-face rule for fonts.');return '';}
      if(r.type===CSSRule.KEYFRAMES_RULE||r.type===CSSRule.FONT_FACE_RULE)return r.cssText;
      if(r.cssRules) {const at=r.cssText.slice(0,r.cssText.indexOf('{'));return at+'{'+compile(r.cssRules)+'}';}
      return '';
    }).join('\n'); }
    try{return compile(parser.sheet.cssRules);}finally{parser.remove();}
  }

  function initLayout() {
    const mirror=document.getElementById('mirror');mirror.replaceChildren();
    const body=el('div');body.id='mirror-body';mirror.append(body);
    const region=(name,parent)=>{const e=el('div','region '+name+' '+name.replaceAll('_',' '));e.id='region-'+name;e.append(el('div','rlabel',name));parent.append(e);return e;};
    const top=region('top_bar',body),bottom=region('bottom_bar',body);
    ['left','center','right'].forEach(p=>{region('top_'+p,top);region('bottom_'+p,bottom);});
    ['upper_third','middle_center','lower_third'].forEach(p=>region(p,body));
    for(const [name,row] of [['fullscreen_below','row-fsb'],['fullscreen_above','row-fsa']]) {
      const holder=el('div','mmv-fullscreen');holder.id=row;mirror.append(holder);region(name,holder);
    }
    const free=el('div');free.id='free-layer';mirror.append(free);
    document.getElementById('preview-sample').onchange=e=>{state.sample=e.target.checked;state.generation++;state.cache.clear();state.news=null;render();};
    document.getElementById('preview-trigger').onchange=()=>render();
    document.getElementById('preview-play').onchange=()=>schedule();
    document.getElementById('preview-scene').onchange=e=>{state.scene=+e.target.value;render();schedule();};
    document.getElementById('preview-photos').onchange=e=>{
      state.photos.forEach(p=>URL.revokeObjectURL(p.url));
      state.photos=[...e.target.files].filter(f=>f.type.startsWith('image/')).map(f=>({url:URL.createObjectURL(f),name:f.name}));state.photoIndex=0;render();schedule();
    };
  }
  function reset(config) {
    state.config=config;state.scene=0;state.carousel={};state.generation++;state.cache.clear();state.news=null;
    state.timers.forEach(clearInterval);state.timers=[];syncControls();schedule();
  }
  function rolesFor(scene,field) {
    return (scene?.[field]||[]).flatMap(r=>typeof r==='string'?[r]:r?.role?[r.role]:[]);
  }
  function sceneList(){return active('MMM-Scenes2')?.config?.scenario||[];}
  function sceneVisible(m) {
    if(state.scene===-1)return true;
    const scenarios=sceneList(), roles=new Set(scenarios.flatMap(s=>[...rolesFor(s,'enter'),...rolesFor(s,'exit')]));
    const mine=classes(m).filter(c=>roles.has(c));
    if(!mine.length)return true;
    // Reconstruct role state by playing the scenario up to the selected scene.
    const admitted=new Set();
    for(const s of scenarios.slice(0,state.scene+1)){rolesFor(s,'exit').forEach(x=>admitted.delete(x));rolesFor(s,'enter').forEach(x=>admitted.add(x));}
    return mine.some(c=>admitted.has(c));
  }
  function carouselGroups() {
    const carousel=active('MMM-Carousel'),c=carousel?.config||{},groups=[];
    if(!carousel)return groups;
    const all=(state.config.modules||[]).filter(m=>!m.disabled&&m.position&&!controls.has(m.module));
    if(c.mode==='positional') {
      for(const pos of ALL_REGIONS) if(c[pos]?.enabled) {
        const ignored=c[pos].ignoreModules||[];
        groups.push({key:pos,items:all.filter(m=>m.position===pos&&!ignored.includes(m.module)),interval:c[pos].overrideTransitionInterval||c.transitionInterval||10000});
      }
    }else if(c.mode==='slides')groups.push({key:'slides',items:c.slides||[],slides:true,ignored:c.ignoreModules||[],interval:c.transitionInterval||10000});
    else groups.push({key:'global',items:all.filter(m=>!(c.ignoreModules||[]).includes(m.module)),interval:c.transitionInterval||10000});
    return groups.filter(g=>g.items.length);
  }
  function isVisible(m) {
    if(!sceneVisible(m))return false;
    if(state.scene===-1||controls.has(m.module))return true;
    for(const g of carouselGroups()) {
      const index=(state.carousel[g.key]||0)%g.items.length;
      if(g.slides) {if(!g.ignored.includes(m.module)&&!g.items[index].includes(m.module))return false;}
      else if(g.items.includes(m)&&g.items[index]!==m)return false;
    }
    return true;
  }
  function syncControls() {
    const scenes=sceneList(),select=document.getElementById('preview-scene');
    select.replaceChildren();
    if(!scenes.length)select.add(new Option('Default view','0'));
    scenes.forEach((s,i)=>select.add(new Option(s.name||'Scene '+(i+1),String(i))));
    select.add(new Option('All modules (edit layout)','-1'));select.value=String(state.scene);
    const box=document.getElementById('preview-carousels');box.replaceChildren();
    for(const g of carouselGroups()) {
      const label=el('label','ctl-label',g.key.replace('_',' ')+': '),s=el('select','ctl');s.dataset.carousel=g.key;
      g.items.forEach((m,i)=>s.add(new Option(g.slides?'Slide '+(i+1):(m.header||m.module)+(m.config?.type?' · '+m.config.type:''),String(i))));
      s.value=String((state.carousel[g.key]||0)%g.items.length);
      s.onchange=()=>{state.carousel[g.key]=+s.value;render();schedule();};label.append(s);box.append(label);
    }
    const messages=[];
    for(const s of scenes)for(const r of rolesFor(s,'enter'))if(!state.config.modules.some(m=>classes(m).includes(r)))messages.push(`${s.name}: no modules have the class “${r}”.`);
    document.getElementById('preview-notes').textContent=messages.join(' ');
  }
  function schedule() {
    state.timers.forEach(clearInterval);state.timers=[];
    if(!document.getElementById('preview-play').checked||state.scene===-1)return;
    for(const g of carouselGroups())state.timers.push(setInterval(()=>{state.carousel[g.key]=((state.carousel[g.key]||0)+1)%g.items.length;render();},Math.max(100,g.interval)));
    if(state.photos.length>1)state.timers.push(setInterval(()=>{state.photoIndex=(state.photoIndex+1)%state.photos.length;render();},Math.max(100,active('MMM-ImagesPhotos')?.config?.updateInterval||120000)));
    const scene=sceneList()[state.scene],c=active('MMM-Scenes2')?.config||{},life=scene?.life??c.life??60000;
    if(scene&&life>0)state.timers.push(setInterval(()=>{
      const next=sceneList()[state.scene]?.next;if(next===false){document.getElementById('preview-play').checked=false;schedule();return;}
      if(typeof next==='function'){document.getElementById('preview-play').checked=false;note(document.getElementById('preview-notes'),'Choose a scene manually when next is a callback.');schedule();return;}
      const target=typeof next==='string'?sceneList().findIndex(s=>s.name===next):typeof next==='number'?next:(state.scene+1)%sceneList().length;
      state.scene=target>=0&&target<sceneList().length?target:0;render();schedule();
    },Math.max(100,life)));
  }
  function onRender(config) {state.config=config;syncControls();}

  async function json(url) {
    const response=await fetch(url,{signal:AbortSignal.timeout(12000)});
    if(!response.ok)throw new Error('HTTP '+response.status);return response.json();
  }
  function cached(key,job) {
    if(!state.cache.has(key))state.cache.set(key,Promise.resolve().then(job).catch(e=>{state.cache.delete(key);throw e;}));
    return state.cache.get(key);
  }
  function weatherLabel(code) {
    if(code===0)return ['☀','Clear sky'];if(code<=3)return ['☁','Partly cloudy'];if(code<=48)return ['≋','Fog'];
    if(code<=67)return ['☂','Rain'];if(code<=77)return ['❄','Snow'];if(code<=86)return ['☂','Showers'];return ['ϟ','Thunderstorm'];
  }
  async function openMeteo(c) {
    const lat=Number(c.lat??c.latitude),lon=Number(c.lon??c.lng??c.longitude);
    if(!Number.isFinite(lat)||!Number.isFinite(lon)||Math.abs(lat)>90||Math.abs(lon)>180)throw new Error('Set a valid latitude and longitude');
    const params=new URLSearchParams({latitude:lat,longitude:lon,current:'temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m',hourly:'temperature_2m,apparent_temperature,weather_code',daily:'weather_code,temperature_2m_max,temperature_2m_min',temperature_unit:(c.units||state.config.units)==='imperial'?'fahrenheit':'celsius',wind_speed_unit:(c.units||state.config.units)==='imperial'?'mph':'kmh',timezone:'auto',forecast_days:String(limit(c.maxNumberOfDays,5,16))});
    if(state.sample) {
      const now=new Date(),hours=Array.from({length:24},(_,i)=>new Date(+now+i*3600000));
      const f=(c.units||state.config.units)==='imperial',temp=f?78:26;
      return {current:{temperature_2m:temp,apparent_temperature:temp+2,relative_humidity_2m:62,weather_code:2,wind_speed_10m:7},hourly:{time:hours.map(d=>d.toISOString().slice(0,16)),temperature_2m:hours.map((_,i)=>temp+(i%4)),apparent_temperature:hours.map(()=>temp+2),weather_code:hours.map(()=>2)},daily:{time:Array.from({length:5},(_,i)=>dateKey(addDays(now,i))),temperature_2m_max:[temp+4,temp+2,temp+1,temp+3,temp+4],temperature_2m_min:[temp-6,temp-5,temp-4,temp-5,temp-6],weather_code:[0,2,61,2,0]}};
    }
    return cached('weather:'+params,()=>json('https://api.open-meteo.com/v1/forecast?'+params));
  }
  async function renderOpenMeteo(e,mod) {
    const c=mod.config||{};e.textContent='Loading Open-Meteo…';
    try{
      const d=await openMeteo(c);e.replaceChildren();const symbol=(c.units||state.config.units)==='imperial'?'°F':'°C';
      if(c.type==='hourly') {
        const table=el('table','mmv-hourly small'),now=new Date();let shown=0;
        (d.hourly?.time||[]).forEach((t,i)=>{if(new Date(t)<now||shown>=limit(c.maxEntries,8,48))return;shown++;
          const row=el('tr');[time(new Date(t),c),weatherLabel(d.hourly.weather_code[i])[0],Math.round(d.hourly.temperature_2m[i])+symbol].forEach(x=>row.append(el('td','',x)));table.append(row);
        });e.append(table);
      }else if(c.type==='forecast') {
        (d.daily?.time||[]).slice(0,limit(c.maxNumberOfDays,5,16)).forEach((t,i)=>e.append(el('div','forecast-row',new Date(t+'T12:00:00').toLocaleDateString(state.config.locale,{weekday:'short'})+' '+weatherLabel(d.daily.weather_code[i])[0]+' '+Math.round(d.daily.temperature_2m_max[i])+'° / '+Math.round(d.daily.temperature_2m_min[i])+'°')));
      }else{
        const v=d.current,[icon,description]=weatherLabel(v.weather_code);
        e.append(el('div','weather-temp bright',icon+' '+Math.round(v.temperature_2m)+symbol),el('div','weather-desc',description));
        if(c.showFeelsLike!==false)e.append(el('div','weather-sub small','Feels like '+Math.round(v.apparent_temperature)+symbol));
        if(c.showHumidity)e.append(el('div','weather-sub small','Humidity '+v.relative_humidity_2m+'%'));
      }
      e.append(el('small','mmv-attribution','Weather: Open-Meteo'));if(state.sample)sampleNotice(e);
    }catch(error){e.replaceChildren(el('div','weather-err','Open-Meteo: '+error.message));}
  }

  function calendarFeeds(mod) {
    const own=mod.config?.calendars;
    if(Array.isArray(own)&&own.length)return own;
    const names=mod.config?.calendarSet;
    return (state.config?.modules||[]).filter(m=>m.module==='calendar'&&!m.disabled).flatMap(m=>m.config?.calendars||[])
      .filter(c=>!names?.length||names.includes(c.name));
  }
  function usableURL(value) {
    const url=String(value||'').replace(/^webcal:/,'https:');
    return /^https?:\/\//.test(url)&&!(/\/calendar\/ical\/basic\.ics(?:$|\?)/.test(url)||/YOUR_|PLACEHOLDER|x\.x\.x\.x|\/calendar\/embed/i.test(url))?url:null;
  }
  function sampleEvents(feeds,start,end) {
    const labels=['Family dinner','School project','Practice','Appointment','All-day event','Dishes'];
    return feeds.flatMap((feed,i)=>Array.from({length:Math.min(4,Math.ceil((end-start)/86400000))},(_,j)=>{
      const day=addDays(start,j+(i%2));day.setHours(9+(i%5)*2,0,0,0);
      return {title:labels[(i+j)%labels.length],start:day,end:new Date(+day+3600000),allDay:i%5===4,calendar:feed.name,color:feed.color||'#4fc3f7',symbol:feed.symbol||'',url:feed.url};
    }));
  }
  async function calendarEvents(mod,start,end) {
    const feeds=calendarFeeds(mod),generation=state.generation;
    if(state.sample)return {events:sampleEvents(feeds,start,end),warnings:[],sample:true};
    const warnings=[];
    const results=await Promise.all(feeds.map(async feed=>{
      const url=usableURL(feed.url);if(!url){warnings.push(`${feed.name||'Calendar'}: sanitized or missing feed URL`);return [];}
      try{
        const text=await cached('ical:'+url,async()=>{
          // Calendar URLs can contain secrets. Fetch directly; never send them to a public CORS proxy.
          const local=/^https?:$/.test(location.protocol)&&['localhost','127.0.0.1'].includes(location.hostname);
          const response=await fetch(local?'/api/feed?url='+encodeURIComponent(url):url,{signal:AbortSignal.timeout(10000),headers:local?{'X-MMV-Preview':'1'}:{}});if(!response.ok)throw new Error('HTTP '+response.status);return response.text();
        });
        if(generation!==state.generation)return [];
        return parseCalendar(text,feed,start,end);
      }catch(error){warnings.push(`${feed.name||'Calendar'}: unavailable (${error.message}); use sample data for layout`);return [];}
    }));
    return {events:results.flat().sort((a,b)=>a.start-b.start),warnings,sample:false};
  }
  function parseCalendar(text,feed,start,end) {
    if(typeof ICAL==='undefined')throw new Error('Calendar library missing');
    const root=new ICAL.Component(ICAL.parse(text)),components=root.getAllSubcomponents('vevent'),out=[];
    // ICAL.js does not ship a timezone database; use VTIMEZONE definitions supplied by the feed.
    for(const component of root.getAllSubcomponents('vtimezone')) {
      const id=component.getFirstPropertyValue('tzid');if(id)ICAL.TimezoneService.register(new ICAL.Timezone({component,tzid:id}));
    }
    for(const component of components) {
      const event=new ICAL.Event(component,{strictExceptions:false});
      if(String(component.getFirstPropertyValue('status')).toUpperCase()==='CANCELLED')continue;
      if(event.isRecurrenceException())continue;
      for(const exception of components)if(exception.hasProperty('recurrence-id')&&exception.getFirstPropertyValue('uid')===event.uid)event.relateException(new ICAL.Event(exception));
      const push=(a,b,item=event)=>{if(String(item.component?.getFirstPropertyValue('status')).toUpperCase()==='CANCELLED')return;const s=a.toJSDate(),e=b.toJSDate();if(e>start&&s<end)out.push({title:item.summary||'(Untitled)',start:s,end:e,allDay:a.isDate,calendar:feed.name,color:feed.color||'#4fc3f7',symbol:feed.symbol||'',url:feed.url});};
      if(event.isRecurring()) {
        const iterator=event.iterator();let occurrence,count=0;
        while((occurrence=iterator.next())&&count++<50000){if(occurrence.toJSDate()>=end)break;const details=event.getOccurrenceDetails(occurrence);push(details.startDate,details.endDate,details.item);}
      }else push(event.startDate,event.endDate);
    }
    return out;
  }
  function eventElement(event,config={}) {
    const e=el('div','event '+(event.allDay?'fullday ':'')+(event.end<new Date()?'passed ':'')+'calendar_'+String(event.calendar||'').replace(/\s/g,'_'));
    e.style.setProperty('--calendarColor',event.color);e.style.setProperty('--oppositeColor','#10131b');
    const h=el('div','headline'+(config.useSymbol?' useSymbol':''));
    if(config.useSymbol)h.append(el('span','symbol',event.symbol||'●'));
    if(!event.allDay)h.append(el('span','time',time(event.start,config)+(config.displayEndTime?' – '+time(event.end,config):'')));
    h.append(el('span','title',event.title));e.append(h);e.title=event.calendar+': '+event.title;return e;
  }
  function calendar(mod,agenda=false) {
    const c=mod.config||{},feeds=calendarFeeds(mod),root=el('div',agenda?'CX3A':'CX3');
    root.dataset.instanceId=c.instanceId||'';root.style.setProperty('--fontsize',c.fontSize||'16px');root.style.setProperty('--maxeventlines',c.maxEventLines||5);
    root.style.setProperty('--eventheight','38px');root.style.setProperty('--cellheaderheight','32px');
    const today=midnight(new Date());let start,end,days;
    if(agenda){start=addDays(today,Number(c.startDayIndex)||0);end=addDays(today,(Number(c.endDayIndex)||0)+1);days=Math.max(1,Math.ceil((end-start)/86400000));}
    else if(c.mode==='day'){start=addDays(today,Number(c.dayIndex)||0);days=limit(c.dayCount,7,31);end=addDays(start,days);}
    else if(c.mode==='month'){start=new Date(today.getFullYear(),today.getMonth(),1);start=addDays(start,-((start.getDay()-(c.firstDayOfWeek??0)+7)%7));days=42;end=addDays(start,days);}
    else{start=addDays(today,-((today.getDay()-(c.firstDayOfWeek??0)+7)%7)+(Number(c.weekIndex)||0)*7);days=7*limit(c.weeksInView,2,12);end=addDays(start,days);}
    root.textContent='Loading calendar…';
    const weather=c.useWeather?state.config.modules.find(m=>m.module==='weather'&&!m.disabled&&/open-?meteo/i.test(m.config?.weatherProvider||'')):null;
    Promise.all([calendarEvents(mod,start,end),weather?openMeteo({...weather.config,maxNumberOfDays:16}).catch(()=>null):null]).then(([{events,warnings,sample},forecast])=>{
      root.replaceChildren();
      if(c.displayLegend){const legend=el('div','legends');feeds.forEach(f=>{const item=el('div','legend useSymbol');item.style.setProperty('--calendarColor',f.color||'#4fc3f7');item.append(el('span','symbol',f.symbol||'●'),el('span','name',f.name||'Calendar'));legend.append(item);});root.append(legend);}
      const container=el('div',agenda?'agenda':'calendar');root.append(container);
      for(let w=0;w<days;w+=agenda?1:7){
        const week=el('div',agenda?'agenda-day':'week'),head=el('div','headerContainer weekGrid'),cells=el('div','cellContainer weekGrid');
        if(!agenda){head.style.gridTemplateColumns=cells.style.gridTemplateColumns=`repeat(${Math.min(7,days-w)},minmax(0,1fr))`;week.append(head,cells);}
        for(let n=w;n<Math.min(days,w+(agenda?1:7));n++){
          const day=addDays(start,n),next=addDays(day,1),items=events.filter(e=>e.start<next&&e.end>day);
          if(agenda&&c.onlyEventDays&&!items.length)continue;
          if(!agenda)head.append(el('div','weekday weekday_'+day.getDay(),day.toLocaleDateString(state.config.locale,{weekday:'short'})));
          const cell=el('div','cell weekday_'+day.getDay()+(dateKey(day)===dateKey(today)?' today':''));cell.dataset.date=dateKey(day);
          const header=el('div','cellHeader'),cellDate=el('div','cellDate');cellDate.append(el('span','day',day.toLocaleDateString(state.config.locale,c.cellDateOptions||{day:'numeric'})));header.append(cellDate);
          if(agenda)header.append(el('span','agenda-header',day.toLocaleDateString(state.config.locale,{weekday:'long',month:'short',day:'numeric'})));
          if(forecast&&c.displayWeatherTemp!==false){const index=forecast.daily?.time.indexOf(dateKey(day));if(index>=0){const w=el('div','cellWeather');w.append(el('span','minTemp',Math.round(forecast.daily.temperature_2m_min[index])+'° '),el('span','maxTemp',Math.round(forecast.daily.temperature_2m_max[index])+'°'));header.append(w);}}
          const body=el('div','cellBody'),eventBox=el('div','eventContainer');
          items.filter(e=>!c.skipPassedEventToday||e.end>new Date()).slice(0,limit(c.maxEventLines,agenda?20:5,100)).forEach(e=>{
            if(agenda&&e.allDay){const full=el('div','fullday');full.append(eventElement(e,c));eventBox.append(full);}else eventBox.append(eventElement(e,c));
          });
          if(!items.length)eventBox.append(el('div','mmv-empty','No events'));
          body.append(eventBox);cell.append(header,body);(agenda?week:cells).append(cell);
        }container.append(week);
      }
      if(sample)sampleNotice(root);
      if(warnings.length)note(root,warnings.join(' · '));
      if(!feeds.length)note(root,'No matching calendar feeds. Check calendarSet names.');
    }).catch(error=>{root.replaceChildren(el('div','mmv-note','Calendar: '+error.message));});
    return root;
  }
  function basicCalendar(mod) {
    const root=el('div','mm-calendar');calendarEvents(mod,midnight(new Date()),addDays(new Date(),365)).then(({events,warnings,sample})=>{
      events.slice(0,limit(mod.config?.maximumEntries,10)).forEach(e=>root.append(el('div','cal-event',e.title+' · '+e.start.toLocaleDateString())));
      if(!events.length)note(root,'No upcoming events');if(warnings.length)note(root,warnings.join(' · '));if(sample)sampleNotice(root);
    });return root;
  }

  function homeAssistant(mod) {
    const c=mod.config||{},root=el('div',c.class||'');root.append(el('div','module-header',c.title||'Home Assistant'));
    if((c.useModuleTigger||c.useModuleTrigger)&&!document.getElementById('preview-trigger').checked){root.classList.add('mmv-trigger-inactive');return root;}
    for(const section of c.sections||[]) {
      const row=el('div',section.class||'');
      // Render template structure without executing template code or transmitting HA tokens.
      const template=document.createElement('template');
      template.innerHTML=String(section.displayTemplate||'').replace(/{%[\s\S]*?%}/g,'').replace(/{{([\s\S]*?)}}/g,(_,expr)=>{
        if(!state.sample)return '—';if(/humidity/.test(expr))return '62';if(/feels_like/.test(expr))return '80';return '78';
      });
      for(const dangerous of template.content.querySelectorAll('script,style,iframe,object,embed,link,img,svg,math'))dangerous.remove();
      for(const node of template.content.querySelectorAll('*'))for(const attr of [...node.attributes])if(!['class'].includes(attr.name))node.removeAttribute(attr.name);
      row.append(template.content);root.append(row);
    }
    if(state.sample)sampleNotice(root);else note(root,'Home Assistant template preview · live entities are not connected');
    return root;
  }
  function photos(mod) {
    const root=el('div','mmv-photos');root.style.opacity=mod.config?.opacity??1;
    if(state.photos.length){const photo=state.photos[state.photoIndex%state.photos.length],img=el('img');img.src=photo.url;img.alt=photo.name;root.append(img);}
    else if(state.sample){root.append(el('div','mmv-photo-sample','Sample photo background'));sampleNotice(root);}
    else note(root,'Choose local preview photos above. The Pi photo directory is not available in this browser.');
    return root;
  }
  function pollen(mod) {
    const root=el('div','mmv-pollen');
    if(state.sample){[['Tree','Moderate'],['Grass','Low'],['Ragweed','Low']].forEach(([name,value])=>root.append(el('div','mmv-pollen-row',name+' · '+value)));sampleNotice(root);}
    else note(root,'Pollen forecast · ZIP '+(mod.config?.zip_code||'not configured')+' · enable sample data to preview levels');return root;
  }
  function bmw(mod) {
    const root=el('div','mmv-bmw');if(state.sample){root.append(el('div','current','☀ 78°F'),el('div','summary','Warm with a light breeze'),el('div','daily','Tomorrow 82° / 69°'));sampleNotice(root);}
    else note(root,'BMW-PW weather panel · API data not connected in this browser');return root;
  }
  function news(mod) {
    const root=el('div','mm-newsfeed'),c=mod.config||{},generation=state.generation;root.append(el('div','news-source',c.feeds?.[0]?.title||'News'));
    const headline=el('div','newsfeed-title light','Loading headlines…');root.append(headline);
    const sample={title:'Community garden opens this weekend',link:'https://example.com/news'};
    if(state.sample){headline.textContent=sample.title;state.news=sample;sampleNotice(root);updateQR();}
    else {
      const url=c.feeds?.[0]?.url;
      if(!url)headline.textContent='No news feed configured';
      else cached('news:'+url,()=>json('https://api.rss2json.com/v1/api.json?rss_url='+encodeURIComponent(url))).then(d=>{
        if(generation!==state.generation)return;if(!d.items?.length)throw new Error('No headlines');const item=d.items[0];headline.textContent=item.title;state.news=item;updateQR();
      }).catch(()=>{headline.textContent='Headlines unavailable · enable sample data to preview';});
    }return root;
  }
  function qr(mod) {const root=el('div','mmv-qr');root.dataset.size=limit(mod.config?.imageSize,100,1000);root.dataset.dark=mod.config?.colorDark||'#fff';root.dataset.light=mod.config?.colorLight||'#000';drawQR(root);return root;}
  function drawQR(root) {
    root.replaceChildren();if(!state.news?.link){note(root,'QR appears when a news article is available');return;}
    try{const code=qrcode(0,'M');code.addData(state.news.link);code.make();const canvas=el('canvas');const count=code.getModuleCount(),quiet=4,scale=Math.max(1,Math.ceil(Number(root.dataset.size)/(count+quiet*2)));canvas.width=canvas.height=(count+quiet*2)*scale;
      const ctx=canvas.getContext('2d');ctx.fillStyle=root.dataset.light;ctx.fillRect(0,0,canvas.width,canvas.height);ctx.fillStyle=root.dataset.dark;
      for(let r=0;r<count;r++)for(let c=0;c<count;c++)if(code.isDark(r,c))ctx.fillRect((c+quiet)*scale,(r+quiet)*scale,scale,scale);
      canvas.style.width=canvas.style.height=root.dataset.size+'px';canvas.setAttribute('aria-label','QR code for '+state.news.link);root.append(canvas);if(state.sample)sampleNotice(root);
    }catch(error){note(root,'QR: '+error.message);}
  }
  function updateQR(){document.querySelectorAll('#mirror .mmv-qr').forEach(drawQR);}
  function radar(mod) {
    const c=mod.config||{},root=el('div','mmv-radar');root.style.width=/^\d+px$/.test(c.mapWidth)?c.mapWidth:'350px';root.style.height=/^\d+px$/.test(c.mapHeight)?c.mapHeight:'350px';
    if(state.sample){root.append(el('div','mmv-radar-sample','Sample radar'),el('div','mmv-radar-marker','●'));sampleNotice(root);return root;}
    const p=c.mapPositions?.[0]||c.markers?.[0];if(!p){note(root,'Set mapPositions latitude and longitude');return root;}
    const z=Math.round(Math.max(1,Math.min(14,p.zoom??c.defaultZoomLevel??7))),n=2**z,lat=Math.max(-85,Math.min(85,+p.lat)),lng=+p.lng;
    const x=(lng+180)/360*n,y=(1-Math.asinh(Math.tan(lat*Math.PI/180))/Math.PI)/2*n;
    if(!Number.isFinite(x+y)){note(root,'Invalid map coordinates');return root;}
    const tiles=el('div','mmv-radar-tiles');root.append(tiles);
    for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++){
      const tx=((Math.floor(x)+dx)%n+n)%n,ty=Math.floor(y)+dy;if(ty<0||ty>=n)continue;
      const img=el('img');img.alt='';img.src=`https://tile.openstreetmap.org/${z}/${tx}/${ty}.png`;
      img.style.left=`calc(50% + ${(Math.floor(x)+dx-x)*256}px)`;img.style.top=`calc(50% + ${(Math.floor(y)+dy-y)*256}px)`;tiles.append(img);
    }
    root.append(el('div','mmv-radar-marker','●'));const stamp=el('div','mmv-radar-time','Loading radar…');root.append(stamp);
    cached('rainviewer',()=>json('https://api.rainviewer.com/public/weather-maps.json')).then(data=>{
      const frames=data.radar?.past||[];const frame=frames.at(-1);if(!frame)throw new Error('No radar frames');
      for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++){
        const tx=((Math.floor(x)+dx)%n+n)%n,ty=Math.floor(y)+dy;if(ty<0||ty>=n)continue;
        const image=el('img');image.alt='Radar precipitation';image.src=`${data.host}${frame.path}/256/${z}/${tx}/${ty}/2/1_1.png`;
        image.style.left=`calc(50% + ${(Math.floor(x)+dx-x)*256}px)`;image.style.top=`calc(50% + ${(Math.floor(y)+dy-y)*256}px)`;tiles.append(image);
      }stamp.textContent='Radar '+time(new Date(frame.time*1000));
    }).catch(()=>stamp.textContent='Radar unavailable');
    root.append(el('small','mmv-map-attribution','© OpenStreetMap contributors · RainViewer'));return root;
  }
  function content(mod) {
    switch(mod.module) {
      case 'MMM-CalendarExt3':return calendar(mod);
      case 'MMM-CalendarExt3Agenda':return calendar(mod,true);
      case 'calendar':return basicCalendar(mod);
      case 'MMM-HomeAssistantDisplay':return homeAssistant(mod);
      case 'MMM-ImagesPhotos':return photos(mod);
      case 'MMM-Pollen':return pollen(mod);
      case 'MMM-BMW-PW':return bmw(mod);
      case 'MMM-RAIN-MAP':return radar(mod);
      case 'MMM-News-QR':return qr(mod);
      case 'newsfeed':return news(mod);
      case 'MMM-Scenes2':return el('div','scenes_indicator',sceneList().map((s,i)=>(i===state.scene?'●':'○')).join(' '));
      case 'MMM-Carousel':{const d=el('div','mmv-carousel-indicator');if(!mod.config?.showPageIndicators&&!mod.config?.showPageControls)d.hidden=true;else d.textContent='Carousel preview';return d;}
      default:return null;
    }
  }
  function refresh(){state.cache.clear();state.news=null;}
  return {state, stringify,cleanCSS,scopeCSS,initLayout,reset,onRender,isVisible,content,renderOpenMeteo,calendarFeeds,parseCalendar,refresh,calendarEvents};
})();
