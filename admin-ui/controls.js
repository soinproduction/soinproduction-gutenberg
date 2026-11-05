/** Progressive, dependency-free controls for our custom admin pages only. */
export function enhanceControls(root) {
  root.querySelectorAll('input[type="checkbox"]').forEach(input => input.classList.add('sp-ui-checkbox'));
  root.querySelectorAll('input[type="date"]:not([data-sp-enhanced])').forEach(enhanceDate);
  root.querySelectorAll('select:not([data-sp-enhanced]),input[type="time"]:not([data-sp-enhanced])').forEach(source => {
    source.dataset.spEnhanced = 'true';
    const isTime = source.tagName === 'INPUT';
    const withMinutes = isTime && Number(source.step) !== 3600;
    const wrap = document.createElement('div'); wrap.className = 'sp-ui-select';
    const trigger = document.createElement('button'); trigger.type = 'button'; trigger.className = 'sp-ui-select-trigger';
    const label = source.closest('label')?.querySelector('span')?.textContent || source.getAttribute('aria-label') || 'Выбор значения';
    const list = document.createElement('div'); list.className = 'sp-ui-select-options'; list.setAttribute('popover','auto'); list.setAttribute('role','listbox'); list.setAttribute('aria-label',label);
    list.id = `site-control-${++enhanceControls.counter}`;
    trigger.setAttribute('aria-haspopup','listbox'); trigger.setAttribute('aria-expanded','false'); trigger.setAttribute('aria-controls',list.id);
    source.before(wrap); wrap.append(source,trigger,list);
    let editor;
    if (isTime) {
      // Preserve typed HH:MM input; minute-enabled fields also expose separate hour/minute columns.
      source.type = 'text'; source.inputMode = 'numeric'; source.placeholder = 'ЧЧ:ММ'; source.maxLength = 5;
      source.pattern = Number(source.step) === 3600 ? '(?:[01][0-9]|2[0-3]):00' : '(?:[01][0-9]|2[0-3]):[0-5][0-9]';
      wrap.classList.add('sp-ui-time'); editor = source;
      trigger.setAttribute('aria-label',`${label}: выбрать время`);
    } else {
      source.hidden = true;
      // The trigger receives the original label association, while the named select submits data.
      if (source.id) { trigger.id = source.id; source.removeAttribute('id'); }
      trigger.setAttribute('aria-label',label);
    }
    const values = () => isTime ? Array.from({length:24},(_,hour)=>({value:`${String(hour).padStart(2,'0')}:00`,label:`${String(hour).padStart(2,'0')}:00`,disabled:false})) : Array.from(source.options,option=>({value:option.value,label:option.text,disabled:option.disabled}));
    const place = trackPopover(list,wrap,withMinutes?280:null,withMinutes?340:(isTime?300:260));
    const sync = () => {
      if (!isTime) trigger.textContent = source.selectedOptions[0]?.text || 'Выберите';
      else trigger.textContent = '◷';
      trigger.disabled = source.disabled;
      list.querySelectorAll('[role=option]').forEach(option=>{
        const value=option.dataset.part ? source.value.split(':')[option.dataset.part==='hours'?0:1] : source.value;
        option.setAttribute('aria-selected',String(option.dataset.value===value));
        if (isTime) option.tabIndex=option.dataset.value===value?0:-1;
      });
    };
    const close = () => { if (list.matches(':popover-open')) list.hidePopover(); };
    const open = (last=false) => {
      list.replaceChildren();
      if (withMinutes) {
        list.classList.add('sp-ui-time-options');list.setAttribute('role','dialog');
        const columns=document.createElement('div');columns.className='sp-ui-time-columns';
        [['hours','Часы',24],['minutes','Минуты',60]].forEach(([part,title,count])=>{
          const column=document.createElement('div');column.className='sp-ui-time-column';
          const heading=document.createElement('span');heading.textContent=title;column.append(heading);
          const options=document.createElement('div');options.setAttribute('role','listbox');options.setAttribute('aria-label',title);
          for(let i=0;i<count;i++){
            const option=document.createElement('button');option.type='button';option.setAttribute('role','option');option.tabIndex=-1;option.dataset.part=part;option.dataset.value=String(i).padStart(2,'0');option.textContent=option.dataset.value;
            option.addEventListener('click',()=>{const parts=/^\d{2}:\d{2}$/.test(source.value)?source.value.split(':'):['09','00'];parts[part==='hours'?0:1]=option.dataset.value;source.value=parts.join(':');source.dispatchEvent(new Event('input',{bubbles:true}));source.dispatchEvent(new Event('change',{bubbles:true}));});options.append(option);
          }
          column.append(options);columns.append(column);
        });
        const done=document.createElement('button');done.type='button';done.className='sp-ui-time-done';done.textContent='Готово';done.addEventListener('click',()=>{close();source.focus();});
        list.append(columns,done);sync();
      } else values().forEach(value=>{
        const option=document.createElement('button'); option.type='button'; option.setAttribute('role','option'); option.tabIndex=-1; option.textContent=value.label; option.dataset.value=value.value; option.disabled=value.disabled;
        option.setAttribute('aria-selected',String(value.value===source.value));
        option.addEventListener('click',()=>{ source.value=value.value; source.dispatchEvent(new Event('input',{bubbles:true})); source.dispatchEvent(new Event('change',{bubbles:true})); if (!isTime) {close();trigger.focus();}else sync(); });
        list.append(option);
      });
      if(isTime && !withMinutes) {
        const options=document.createElement('div');options.className='sp-ui-hour-values';options.setAttribute('role','listbox');options.setAttribute('aria-label',label);
        options.append(...list.childNodes);list.append(options);list.setAttribute('role','dialog');list.classList.add('sp-ui-hour-options');
        const done=document.createElement('button');done.type='button';done.className='sp-ui-time-done';done.textContent='Готово';done.addEventListener('click',()=>{close();source.focus();});list.append(done);sync();
      }
      place();
      list.showPopover();
      place();
      const options=Array.from(list.querySelectorAll('[role=option]:not(:disabled)'));
      const selected=options.filter(option=>option.getAttribute('aria-selected')==='true');
      selected.forEach(option=>{const parent=option.closest('[role=listbox]');if(parent)parent.scrollTop+=option.getBoundingClientRect().top-parent.getBoundingClientRect().top-parent.clientHeight/2+option.offsetHeight/2;});
      (selected[0] || (last?options.at(-1):options[0]))?.focus({preventScroll:true});

    };
    trigger.addEventListener('click',()=>list.matches(':popover-open')?close():open());
    trigger.addEventListener('keydown',event=>{if(['ArrowDown','ArrowUp'].includes(event.key)){event.preventDefault();open(event.key==='ArrowUp');}});
    list.addEventListener('keydown',event=>{
      const group=document.activeElement.closest('[role=listbox]') || list;
      const options=Array.from(group.querySelectorAll('[role=option]:not(:disabled)')); const index=options.indexOf(document.activeElement);
      if (['ArrowDown','ArrowUp','Home','End'].includes(event.key)) {
        event.preventDefault(); const next=event.key==='Home'?0:event.key==='End'?options.length-1:(index+(event.key==='ArrowDown'?1:-1)+options.length)%options.length; options[next]?.focus({preventScroll:true});
        if(options[next])group.scrollTop+=options[next].getBoundingClientRect().top-group.getBoundingClientRect().top-group.clientHeight/2+options[next].offsetHeight/2;
      } else if (event.key==='Escape') {event.preventDefault();event.stopPropagation();close();trigger.focus();}
      else if (event.key==='Tab' && !isTime) close();
      else if (event.key.length===1 && !event.ctrlKey && !event.metaKey) options.find(option=>option.textContent.toLocaleLowerCase().startsWith(event.key.toLocaleLowerCase()))?.focus();
    });
    list.addEventListener('toggle',()=>trigger.setAttribute('aria-expanded',String(list.matches(':popover-open'))));
    source.addEventListener('change',sync); source.addEventListener('input',sync);
    new MutationObserver(sync).observe(source,{attributes:true,attributeFilter:['disabled']});
    source.form?.addEventListener('reset',()=>queueMicrotask(sync));
    sync();
  });
}
enhanceControls.counter = 0;

function enhanceDate(source) {
  source.dataset.spEnhanced='true';
  const label=source.closest('label')?.querySelector('span')?.textContent || 'Дата';
  const required=source.required;
  const wrap=document.createElement('div');wrap.className='sp-ui-select sp-ui-date';
  const trigger=document.createElement('button');trigger.type='button';trigger.className='sp-ui-select-trigger';trigger.setAttribute('aria-haspopup','dialog');trigger.setAttribute('aria-expanded','false');trigger.setAttribute('aria-label',label);
  const popup=document.createElement('div');popup.className='sp-ui-date-popup';popup.setAttribute('popover','auto');popup.setAttribute('role','dialog');popup.setAttribute('aria-label',label);popup.id=`site-control-${++enhanceControls.counter}`;trigger.setAttribute('aria-controls',popup.id);
  if(source.id){trigger.id=source.id;source.removeAttribute('id');}
  source.type='hidden';source.before(wrap);wrap.append(source,trigger,popup);
  const todayParts=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Kyiv',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
  const today=Object.fromEntries(todayParts.filter(part=>part.type!=='literal').map(part=>[part.type,part.value]));
  const todayIso=`${today.year}-${today.month}-${today.day}`;
  const parse=value=>{const [y,m,d]=value.split('-').map(Number);return new Date(Date.UTC(y,m-1,d));};
  const iso=date=>date.toISOString().slice(0,10);
  let visible=parse(source.value || todayIso);
  const sync=()=>{trigger.textContent=source.value?source.value.split('-').reverse().join('.'):'Выберите дату';trigger.disabled=source.disabled;};
  const place=trackPopover(popup,wrap,304,380);
  const close=()=>{if(popup.matches(':popover-open'))popup.hidePopover();};
  const choose=value=>{source.value=value;source.dispatchEvent(new Event('input',{bubbles:true}));source.dispatchEvent(new Event('change',{bubbles:true}));close();trigger.focus();};
  const button=(title,text,fn)=>{const el=document.createElement('button');el.type='button';el.textContent=text;el.setAttribute('aria-label',title);el.addEventListener('click',fn);return el;};
  const render=(focusDate=null)=>{
    popup.replaceChildren();
    const header=document.createElement('div');header.className='sp-ui-date-header';
    const title=document.createElement('strong');title.textContent=new Intl.DateTimeFormat('ru',{month:'long',year:'numeric',timeZone:'UTC'}).format(visible);title.setAttribute('aria-live','polite');
    const changeMonth=delta=>{visible=new Date(Date.UTC(visible.getUTCFullYear(),visible.getUTCMonth()+delta,1));render(true);};
    header.append(button('Предыдущий месяц','‹',()=>changeMonth(-1)),title,button('Следующий месяц','›',()=>changeMonth(1)));popup.append(header);
    const weekdays=document.createElement('div');weekdays.className='sp-ui-date-grid sp-ui-date-weekdays';['Пн','Вт','Ср','Чт','Пт','Сб','Вс'].forEach(day=>{const el=document.createElement('span');el.textContent=day;weekdays.append(el);});popup.append(weekdays);
    const grid=document.createElement('div');grid.className='sp-ui-date-grid';grid.setAttribute('role','group');grid.setAttribute('aria-label','Дни месяца');
    const first=new Date(Date.UTC(visible.getUTCFullYear(),visible.getUTCMonth(),1));const offset=(first.getUTCDay()+6)%7;
    for(let i=0;i<42;i++) {
      const date=new Date(first);date.setUTCDate(1-offset+i);const value=iso(date);
      const day=button(new Intl.DateTimeFormat('ru',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(date),String(date.getUTCDate()),()=>choose(value));day.dataset.date=value;
      if(date.getUTCMonth()!==visible.getUTCMonth())day.classList.add('sp-ui-date-outside');
      if(value===source.value){day.classList.add('is-selected');day.setAttribute('aria-pressed','true');}
      if(value===todayIso)day.setAttribute('aria-current','date');
      day.disabled=Boolean((source.min && value<source.min)||(source.max && value>source.max));
      day.tabIndex=-1;
      day.addEventListener('keydown',event=>{
        const deltas={ArrowLeft:-1,ArrowRight:1,ArrowUp:-7,ArrowDown:7};
        if(event.key in deltas){event.preventDefault();date.setUTCDate(date.getUTCDate()+deltas[event.key]);visible=date;render(iso(date));}
        else if(['Home','End'].includes(event.key)){event.preventDefault();date.setUTCDate(date.getUTCDate()+(event.key==='Home'?-(date.getUTCDay()+6)%7:6-(date.getUTCDay()+6)%7));visible=date;render(iso(date));}
      });grid.append(day);
    }
    popup.append(grid);
    const footer=document.createElement('div');footer.className='sp-ui-date-footer';footer.append(button('Выбрать сегодня','Сегодня',()=>choose(todayIso)));if(!required)footer.append(button('Очистить дату','Очистить',()=>choose('')));popup.append(footer);
    const focused=focusDate===true?iso(first):(focusDate || source.value || todayIso);
    const target=Array.from(grid.querySelectorAll('button')).find(el=>el.dataset.date===focused && !el.disabled) || grid.querySelector('button:not(:disabled)');
    if(target){target.tabIndex=0;if(popup.matches(':popover-open'))target.focus({preventScroll:true});}
  };
  trigger.addEventListener('click',()=>{
    if(popup.matches(':popover-open')){close();return;}
    visible=parse(source.value || todayIso);render();
    place();
    popup.showPopover();place();popup.querySelector('button[tabindex="0"]')?.focus({preventScroll:true});
  });
  popup.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();event.stopPropagation();close();trigger.focus();}});
  popup.addEventListener('toggle',()=>trigger.setAttribute('aria-expanded',String(popup.matches(':popover-open'))));
  source.addEventListener('change',sync);source.addEventListener('input',sync);new MutationObserver(sync).observe(source,{attributes:true,attributeFilter:['disabled']});source.form?.addEventListener('reset',()=>queueMicrotask(sync));sync();
}


/** Follow the anchor on document, nested-container and dialog scrolling. */
function trackPopover(popup,anchor,preferredWidth,maxHeight) {
  let controller;
  let frame=0;
  const place=()=>{
    const bounds=anchor.getBoundingClientRect();
    let top=8,bottom=window.innerHeight-8;
    for(let parent=anchor.parentElement;parent && parent!==document.body;parent=parent.parentElement){
      const style=getComputedStyle(parent);
      if (/(auto|scroll|hidden|clip)/.test(style.overflowY)) {const rect=parent.getBoundingClientRect();top=Math.max(top,rect.top);bottom=Math.min(bottom,rect.bottom);}
    }
    if (!anchor.isConnected || bounds.bottom<=top || bounds.top>=bottom) {if(popup.matches(':popover-open'))popup.hidePopover();return;}
    const width=Math.min(preferredWidth || bounds.width,window.innerWidth-16);
    const below=window.innerHeight-bounds.bottom-14;
    const above=bounds.top-14;
    const naturalHeight=popup.matches(':popover-open')?Math.min(maxHeight,popup.scrollHeight):maxHeight;
    const up=below<naturalHeight && above>below;
    popup.style.width=`${width}px`;
    popup.style.maxHeight=`${Math.max(40,Math.min(maxHeight,up?above:below))}px`;
    popup.style.left=`${Math.max(8,Math.min(bounds.left,window.innerWidth-width-8))}px`;
    popup.style.top=up?'auto':`${bounds.bottom+6}px`;
    popup.style.bottom=up?`${window.innerHeight-bounds.top+6}px`:'auto';
  };
  popup.addEventListener('toggle',()=>{
    controller?.abort();cancelAnimationFrame(frame);
    if(!popup.matches(':popover-open'))return;
    controller=new AbortController();
    const update=event=>{if(event.target instanceof Node && popup.contains(event.target))return;cancelAnimationFrame(frame);frame=requestAnimationFrame(place);};
    document.addEventListener('scroll',update,{capture:true,passive:true,signal:controller.signal});
    window.addEventListener('resize',update,{passive:true,signal:controller.signal});
    window.visualViewport?.addEventListener('resize',update,{passive:true,signal:controller.signal});
    place();
  });
  return place;
}
