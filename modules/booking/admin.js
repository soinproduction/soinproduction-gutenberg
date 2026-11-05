import { t } from './i18n.js';
import { renderBookingChat } from './chat.js';
import { initWidgetSettings } from './widget-settings.js';
import { Calendar } from '@fullcalendar/core';
import { calendarHours } from './calendar-hours.js';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import luxonPlugin from '@fullcalendar/luxon3';
import ukLocale from '@fullcalendar/core/locales/uk';
import { initDuration } from './duration.js';
import { initBookingForm } from './form.js';
import './admin.css';
import { enhanceControls } from '../../admin-ui/controls.js';
import '../../admin-ui/controls.css';

const adminRoot = document.querySelector('.site-booking-admin');
if (adminRoot) enhanceControls(adminRoot);

initBookingForm();
initWidgetSettings();
const root = document.getElementById('site-booking-calendar');
if (document.getElementById('site-booking-dialog')) {
  const config = window.SITE_BOOKING_ADMIN;
  const message = document.getElementById('site-booking-calendar-message') || document.createElement('p');
  const detailDialog = document.getElementById('site-booking-dialog');
  const createDialog = document.getElementById('site-booking-create-dialog');
  const form = createDialog.querySelector('form');
  const createError = document.getElementById('site-booking-create-error');
  const content = document.getElementById('site-booking-dialog-content');
  const cancelled = document.getElementById('site-booking-show-cancelled');
  let detailRequest = 0, activeDetailId=null, loadedDetailId=null, detailSnapshot='';
  const detailStatus=document.createElement('span');detailStatus.className='site-booking-detail-status';detailStatus.setAttribute('role','status');detailDialog.querySelector('.site-booking-dialog-header').append(detailStatus);
  const request = async (path = '', options = {}) => {
    const headers={'X-WP-Nonce':config.nonce,...(options.body instanceof FormData?{}:{'Content-Type':'application/json'}),...options.headers};
    const response = await fetch(config.api + path, { ...options, cache: 'no-store', headers });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || t('Не вдалося завантажити дані бронювання.'));
    return data;
  };
  const text = (tag, value, className) => {
    const el = document.createElement(tag); el.textContent = value; if (className) el.className = className; return el;
  };
  const renderActions = data => {
    const section=text('section','','site-booking-manage');
    const notice=text('p','','site-booking-action-notice'); notice.setAttribute('role','alert');
    const toolbar=text('div','','site-booking-actions');
    const editor=text('div','','site-booking-action-editor');
    section.append(toolbar,notice,editor);
    let editorAnimation,editorRevision=0;
    const setEditor=child=>{
      const revision=++editorRevision;const before=editor.getBoundingClientRect().height;editorAnimation?.cancel();
      if(child){const surface=text('div','','site-booking-editor-surface');surface.append(child);editor.replaceChildren(surface);}else editor.replaceChildren();
      if(window.matchMedia('(prefers-reduced-motion: reduce)').matches){editor.style.height='';return;}
      editor.style.height=before+'px';
      requestAnimationFrame(()=>{
        if(revision!==editorRevision)return;
        const target=editor.firstElementChild?editor.firstElementChild.getBoundingClientRect().height+24:0;
        editor.style.height=target+'px';editorAnimation=editor.animate([{height:before+'px',opacity:before?1:0},{height:target+'px',opacity:1}],{duration:180,easing:'ease-out'});
        const animation=editorAnimation;animation.onfinish=()=>{if(editorAnimation===animation)editor.style.height='';};
      });
    };
    const button=(label,fn,danger=false)=>{const el=text('button',label,'button'+(danger?' site-booking-danger':''));el.type='button';el.addEventListener('click',fn);return el;};
    const field=(form,label,name,value,type='text',attrs={})=>{
      const wrap=text('label','','site-booking-field'); const input=document.createElement('input');input.type=type;input.name=name;input.value=value;input.required=true; Object.entries(attrs).forEach(([key,val])=>input.setAttribute(key,val));wrap.append(text('span',label),input);form.append(wrap);return input;
    };
    const select=(form,label,name,options)=>{
      const wrap=text('label','','site-booking-field');const input=document.createElement('select');input.name=name;options.forEach(([value,title])=>{const option=text('option',title);option.value=value;input.append(option);});wrap.append(text('span',label),input);form.append(wrap);return input;
    };
    const submitForm=(form,path,values,success)=>{
      form.addEventListener('submit',async event=>{
        event.preventDefault();if(form.getAttribute('aria-busy')==='true')return;notice.textContent='';
        const payload={version:Number(data.version),...values(new FormData(form))};
        const controls=[...section.querySelectorAll('button,input,select,textarea')].map(el=>[el,el.disabled]);controls.forEach(([el])=>{el.disabled=true;});
        const save=form.querySelector('[type=submit]');const originalLabel=save.textContent;save.style.width=save.getBoundingClientRect().width+'px';save.textContent=t('Зберігаємо…');form.setAttribute('aria-busy','true');
        try {
          await request(`/${data.id}/${path}`,{method:'POST',body:JSON.stringify(payload)});
          if (path==='reschedule') calendar?.gotoDate(payload.date);
          calendar?.refetchEvents(); await showDetail(data.id,false,true); message.textContent=success;
        } catch(error) {notice.textContent=error.message;}
        finally{controls.forEach(([el,disabled])=>{el.disabled=disabled;});form.removeAttribute('aria-busy');save.textContent=originalLabel;save.style.width='';}
      });
    };
    const footer=(form,label)=>{
      const actions=text('div','','site-booking-actions');const save=text('button',label,'button button-primary');save.type='submit';actions.append(save,button(t('Назад'),()=>{setEditor(null);notice.textContent='';}));form.append(actions);
    };
    const block=data.type==='block';
    if (!data.cancelled_at && (block || data.status==='confirmed')) {
      toolbar.append(button(block?t('Змінити час'):'Перенести бронювання',()=>{
        notice.textContent='';const form=document.createElement('form');form.className='site-booking-action-form';
        form.append(text('h3',block?t('Змінити час блокування'):'Перенесення бронювання'));
        const grid=text('div','','site-booking-grid');form.append(grid);
        field(grid,t('Нова дата'),'date',data.date_local,'date');
        field(grid,t('Початок'),'time',data.time_local,'time',{step:'3600'});
        const duration=field(grid,t('Тривалість (години)'),'hours',data.hours,'number',{min:'1',max:'24',step:'1'});
        if(data.payment_mode==='online'){duration.readOnly=true;form.append(text('p',t('Тривалість онлайн-бронювання зберігається.')));}
        select(grid,t('Причина'),'reason',[['studio',t('З ініціативи студії')],['client',t('На прохання клієнта')]]);
        if (!block && data.payment_mode==='offline') field(grid,t('Врахована оплата поза сайтом (грн)'),'amount',(Number(data.amount)/100).toFixed(2),'number',{min:'0',max:'9999999.99',step:'0.01'});
        form.append(text('p',block?t('Новий час перевіряється на перетини.'):'Перенесення на прохання клієнта збільшує лічильник перенесень. Сума — облік оплати поза сайтом; зміна не списує й не повертає кошти.'));
        footer(form,t('Зберегти перенесення'));setEditor(form);enhanceControls(editor);initDuration(form,{excludeId:data.id,entryType:data.type,fixedHours:data.payment_mode==='online'?Number(data.hours):0});
        submitForm(form,'reschedule',values=>Object.fromEntries(values),t('Час запису змінено.'));
      }));
      toolbar.append(button(block?t('Зняти блокування'):'Скасувати бронювання',()=>{
        notice.textContent='';const form=document.createElement('form');form.append(text('h3',block?t('Зняти блокування часу?'):'Скасування бронювання'));
        if(!block && data.payment_mode!=='unpaid') select(form,t('Умови скасування'),'refund',[['false',t('Без повернення коштів')],['true',t('З повним поверненням коштів')]]);
        form.append(text('p',block?t('Час звільниться, запис залишиться в історії.'):'Під час скасування час звільниться. Для оплати поза сайтом повернення виконується вручну й потім підтверджується в картці.'));
        footer(form,block?t('Зняти блокування'):'Підтвердити скасування');setEditor(form);enhanceControls(editor);
        submitForm(form,'cancel',values=>({refund:!block && values.get('refund')==='true'}),block?t('Блокування знято.'):'Бронювання скасовано.');
      },true));
    }
    if(data.can_mark_no_show){toolbar.append(button(t('Позначити неявку'),()=>{notice.textContent='';const form=document.createElement('form');form.append(text('h3',t('Клієнт не прийшов?')),text('p',t('Статус зміниться на «Неявка», лічильник неявок клієнта збільшиться. Оплата й листування збережуться.')));footer(form,t('Підтвердити неявку'));setEditor(form);submitForm(form,'no-show',()=>({}),t('Неявку позначено.'));},true));}
    if(data.refund) {
      const refundText=data.refund.status==='manual_done'?t('Ручне повернення підтверджено'):'Очікує ручного повернення';
      section.prepend(text('p',`${refundText}: ${(Number(data.refund.amount)/100).toFixed(2)} грн`,'site-booking-refund-status'));
      if(data.refund.status==='pending' && data.payment_mode==='offline') toolbar.append(button(t('Підтвердити повернення'),()=>{
        const form=document.createElement('form');form.append(text('h3',t('Підтвердження ручного повернення')));
        const label=document.createElement('label');const checkbox=document.createElement('input');checkbox.type='checkbox';checkbox.required=true;label.append(checkbox,document.createTextNode(t('Я вернул(а) клієнту полную сумму поза сайтом.')));form.append(label);
        footer(form,t('Кошти повернено'));setEditor(form);enhanceControls(editor);
        submitForm(form,'refund-done',()=>({}),t('Ручне повернення підтверджено.'));
      }));
    }
    if(data.telegram_profile?.url){const link=text('a',t('Відкрити Telegram клієнта'),'button');link.href=data.telegram_profile.url;link.target='_blank';link.rel='noopener noreferrer';toolbar.append(link);}
    toolbar.append(button(t('Оновити картку'),()=>showDetail(data.id)));
    return section;
  };

  const openCreate = (date, hours = 1) => {
    createError.textContent = '';
    if (date) {
      form.elements.date.value = date.slice(0,10);
      form.elements.date.dispatchEvent(new Event('change'));
      form.elements.time.value = date.includes('T') ? date.slice(11,16) : '10:00';
      form.elements.time.dispatchEvent(new Event('change'));
      form.elements.hours.value = hours;
      form.elements.hours.dispatchEvent(new Event('input'));
    }
    createDialog.showModal();
    form.dispatchEvent(new Event('site:duration-refresh'));
  };
  const showDetail = async (id,silent=false,finished=false) => {
    const editing=()=>content.querySelector('.site-booking-action-editor form') || [...content.querySelectorAll('.site-booking-chat-compose')].some(form=>form.contains(document.activeElement) || form.dataset.sending==='true' || form.dataset.hasAttachments==='true' || form.querySelector('textarea')?.value || form.querySelector('[type=file]')?.files.length);
    if(silent && editing())return;
    activeDetailId=id;
    const current = ++detailRequest;
    const same=String(loadedDetailId)===String(id) && Boolean(content.querySelector('.site-booking-details'));
    if(!same){const skeleton=text('div','','site-booking-detail-skeleton');skeleton.setAttribute('aria-label',t('Завантажуємо бронювання'));skeleton.innerHTML='<div></div><div></div><div></div><div></div><div></div><div></div>';content.replaceChildren(skeleton);detailDialog.scrollTop=0;}
    detailStatus.textContent=silent?'':t('Оновлюємо…');content.setAttribute('aria-busy','true');
    document.getElementById('site-booking-dialog-title').textContent = `Запис №${id}`;
    if (!detailDialog.open) detailDialog.showModal();
    try {
      const data = await request('/' + encodeURIComponent(id));
      if (current !== detailRequest || !detailDialog.open) return;
      if(silent && (editing() || detailSnapshot===JSON.stringify(data)))return;
      detailSnapshot=JSON.stringify(data);
      const listRow=document.querySelector(`[data-booking-row="${Number(data.id)}"]`);
      if(listRow){const first=listRow.cells[0];first.querySelector('strong').textContent=data.starts_local;first.querySelector('.description').textContent=`${data.hours} год · до ${data.ends_local.slice(-5)}`;const status=listRow.querySelector('.site-booking-status');const key=data.type==='block'?(data.cancelled_at?'block_removed':'block'):data.status;status.className='site-booking-status site-booking-status--'+key;status.textContent=data.status_label;}
      if (!same && data.date_local) calendar?.gotoDate(data.date_local);
      const block = data.type === 'block';
      const grid = document.createElement('dl'); grid.className = 'site-booking-details';
      const fields = {
        [t('Статус')]: data.status_label,
        [t('Дата й час')]: `${data.starts_local} — ${data.ends_local}`,
        [t('Тривалість')]: `${data.hours} ч`,
        ...(!block ? {
          [t('Клієнт')]: data.name || data.phone, [t('Телефон')]: data.phone, [t('Контакт із форми')]: data.handle,
          [t('Telegram клієнта')]: data.telegram_profile?.username ? '@'+data.telegram_profile.username : data.telegram_profile?.name || '—',
          [t('Сповіщення в Telegram')]: data.telegram_linked ? t('Підключено до цього бронювання') : t('Не підключено'),
          [t('Тип зйомки')]: data.shoot_type, [t('Кількість людей')]: data.people_count,
          [t('Сповіщення')]: [...new Map([...(data.notifications || [])].reverse().map(job=>[job.channel+job.audience,`${job.channel==='telegram'?'Telegram':'Email'} ${job.audience==='group'?'групі':'клієнту'}: ${{pending:'у черзі',sending:'надсилається',sent:job.channel==='email'?'передано пошті':'надіслано',failed:'помилка',cancelled:'вимкнено'}[job.status] || job.status}`])).values()].join(' · ') || t('Надсилань немає'),
          [t('Оплата')]: `${(Number(data.amount)/100).toFixed(2)} грн · ${data.payment_mode === 'unpaid' ? 'без оплати' : data.payment_mode === 'offline' ? 'поза сайтом' : 'онлайн'}`,
          [t('Попередні неявки')]: data.no_show_count || '0',
          [t('Кількість перенесень')]: data.reschedule_count,
        } : {}),
        [block ? t('Причина') : t('Нотатка адміністратора')]: data.note,
      };
      Object.entries(fields).forEach(([label,value]) => {
        const wrap = document.createElement('div'); wrap.append(text('dt',label),text('dd',value === null || value === '' ? '—' : String(value))); grid.append(wrap);
      });
      const history = document.createElement('ul'); history.className = 'site-booking-history';
      data.events.forEach(event => {
        const item=text('li',`${event.time_local} · ${event.action_label} · ${event.actor_label}`);
        if(event.description) item.append(text('p',event.description));
        history.append(item);
      });
      const scrollTop=detailDialog.scrollTop;
      if(same){
        content.querySelector('.site-booking-details').replaceWith(grid);
        if(finished || !content.querySelector('.site-booking-action-editor form')){const previous=content.querySelector('.site-booking-manage');const before=previous.getBoundingClientRect().height;const actions=renderActions(data);previous.replaceWith(actions);const target=actions.getBoundingClientRect().height;if(finished && Math.abs(before-target)>2 && !window.matchMedia('(prefers-reduced-motion: reduce)').matches){actions.style.overflow='hidden';actions.style.height=target+'px';const animation=actions.animate([{height:before+'px'},{height:target+'px'}],{duration:180,easing:'ease-out'});animation.onfinish=()=>{actions.style.height='';actions.style.overflow='';};}}
        content.querySelector('.site-booking-history').replaceWith(history);
        content.querySelector('.site-booking-chat')?.dispatchEvent(new CustomEvent('site:booking-profile',{detail:data}));
        detailDialog.scrollTop=scrollTop;
      }else{content.replaceChildren(grid,renderActions(data),...(!block?[renderBookingChat(data,request,config)]:[]),text('h3',t('Історія змін')),history);loadedDetailId=id;}

      if (!same && !silent && !detailDialog.contains(document.activeElement)) detailDialog.querySelector('[data-booking-close]').focus({preventScroll:true});
    } catch (error) {if(current===detailRequest){if(!same)content.replaceChildren(text('p',error.message));else detailStatus.textContent=error.message;}}
    finally{if(current===detailRequest){content.removeAttribute('aria-busy');if(detailStatus.textContent===t('Оновлюємо…'))detailStatus.textContent='';}}
  };
  const initialHours=calendarHours(config.weekly);
  const closedNotice=text('p',t('Цього дня студія зачинена.'),'site-booking-closed-notice');
  closedNotice.hidden=true;root?.after(closedNotice);
  const calendar = root ? new Calendar(root, {
    plugins: [dayGridPlugin,timeGridPlugin,interactionPlugin,luxonPlugin],
    locale: ukLocale, timeZone: window.SITE_BOOKING_ADMIN.timezone, initialView: 'timeGridWeek', firstDay: 1,
    headerToolbar: { left: 'prev,next today', center: 'title', right: 'timeGridWeek,dayGridMonth,timeGridDay' },
    buttonText: { today: t('Сьогодні'), week: t('Тиждень'), month: t('Місяць'), day: t('День') },
    height: Math.max(700, window.innerHeight - 260), scrollTime: initialHours.open+':00', allDaySlot: false, slotMinTime: initialHours.open+':00', slotMaxTime: initialHours.close+':00',
    slotDuration: '01:00:00', snapDuration: '01:00:00', expandRows: true, nowIndicator: true,
    dayHeaderFormat: { weekday: 'short', day: 'numeric', month: 'short' },
    views: { dayGridMonth: { dayHeaderFormat: { weekday: 'short' } } },
    slotLabelFormat: { hour: '2-digit', minute:'2-digit', hour12:false },
    eventTimeFormat: { hour: '2-digit', minute:'2-digit', hour12:false },
    displayEventEnd: true, eventDisplay: 'block', eventInteractive: true,
    businessHours: Object.entries(config.weekly).filter(([,row]) => row).map(([day,row]) => ({ daysOfWeek:[Number(day)%7],startTime:row.open,endTime:row.close })),
    events: async (range, success, failure) => {
      try {
        const params = new URLSearchParams({from:range.startStr.slice(0,10),to:range.endStr.slice(0,10),include_cancelled:cancelled.checked?'1':'0'});
        success(await request('?' + params)); message.textContent = '';
      } catch (error) { message.textContent = error.message; failure(error); }
    },
    loading: active => { root.setAttribute('aria-busy', String(active)); },
    eventContent: info => {
      const wrap = document.createElement('div'); wrap.className = 'site-booking-event-content';
      wrap.append(text('span',info.timeText,'site-booking-event-time'),text('strong',info.event.title));
      if(info.event.extendedProps.phone)wrap.append(text('span',info.event.extendedProps.phone,'site-booking-event-meta'));
      if (info.event.extendedProps.manual) wrap.append(text('span',t('Ручне бронювання'),'site-booking-event-meta'));
      if (info.event.extendedProps.status === 'block') wrap.append(text('span',t('Блокування часу'),'site-booking-event-meta'));
      return {domNodes:[wrap]};
    },
    eventClick: info => { info.jsEvent.preventDefault(); showDetail(info.event.id); },
    datesSet: info => {
      const hours=calendarHours(config.weekly,info.startStr,info.endStr);
      const closed=hours.closed && info.view.type.startsWith('timeGrid');
      root.classList.toggle('site-booking-calendar-closed',closed);closedNotice.hidden=!closed;
      closedNotice.textContent=info.view.type==='timeGridDay'?t('Цього дня студія зачинена.'):'У ці дні студія зачинена.';
      calendar.batchRendering(()=>{
        if(calendar.getOption('slotMinTime')!==hours.open+':00')calendar.setOption('slotMinTime',hours.open+':00');
        if(calendar.getOption('slotMaxTime')!==hours.close+':00')calendar.setOption('slotMaxTime',hours.close+':00');
        if(calendar.getOption('scrollTime')!==hours.open+':00')calendar.setOption('scrollTime',hours.open+':00');
      });
    },
    dateClick: info => {
      const day=new Date(info.dateStr.slice(0,10)+'T12:00:00Z').getUTCDay() || 7;
      const working=config.weekly[day];
      if(!working)return;
      if(info.allDay){
        const [hour,minute]=working.open.split(':').map(Number);
        openCreate(info.dateStr.slice(0,10)+'T'+String(hour+(minute?1:0)).padStart(2,'0')+':00');
      } else {
        const time=info.dateStr.slice(11,16);
        if(time>=working.open && time<working.close)openCreate(info.dateStr);
      }
    },
  }) : null;
  calendar?.render();
  document.querySelectorAll('[data-booking-open]').forEach(link=>link.addEventListener('click',event=>{event.preventDefault();void showDetail(link.dataset.bookingOpen);}));
  const initialId = new URLSearchParams(window.location.search).get('id');
  if (/^\d+$/.test(initialId || '')) showDetail(initialId);
  cancelled?.addEventListener('change', () => calendar?.refetchEvents());
  document.getElementById('site-booking-add')?.addEventListener('click', () => openCreate());
  document.querySelectorAll('[data-booking-close]').forEach(button => button.addEventListener('click', () => button.closest('dialog').close()));
  [detailDialog,createDialog].forEach(dialog => dialog.addEventListener('click', event => { if (event.target === dialog) { const bounds=dialog.getBoundingClientRect(); if (event.clientX<bounds.left || event.clientX>bounds.right || event.clientY<bounds.top || event.clientY>bounds.bottom) dialog.close(); } }));
  form.querySelector('a.button').addEventListener('click', event => { event.preventDefault(); createDialog.close(); });
  form.addEventListener('submit', async event => {
    event.preventDefault();
    const submit = form.querySelector('[type=submit]'); submit.disabled = true; createError.textContent = '';
    try {
      const values = Object.fromEntries(new FormData(form));
      const result = await request('',{method:'POST',body:JSON.stringify(values)});
      createDialog.close(); calendar?.gotoDate(values.date); calendar?.refetchEvents(); showDetail(result.id);
    } catch (error) { createError.textContent = error.message; }
    finally { submit.disabled = form.dataset.durationReady !== 'true'; }
  });
  const refreshDetail=()=>{if(detailDialog.open && activeDetailId && !document.hidden)void showDetail(activeDetailId,true);};
  window.setInterval(refreshDetail,10000);
  window.addEventListener('focus', () => {calendar?.refetchEvents();refreshDetail();});
}

const cleanupButton=document.querySelector('[data-booking-history-cleanup]');
if(cleanupButton){
  const dialog=document.getElementById('site-booking-cleanup-dialog'),body=dialog.querySelector('[data-cleanup-body]');
  const request=async(path,payload)=>{const r=await fetch(window.SITE_BOOKING_ADMIN.api+'/history/'+path,{method:'POST',cache:'no-store',headers:{'X-WP-Nonce':window.SITE_BOOKING_ADMIN.nonce,'Content-Type':'application/json'},body:JSON.stringify(payload || {})});const data=await r.json();if(!r.ok)throw new Error(data.message || t('Не вдалося очистити історію.'));return data;};
  cleanupButton.addEventListener('click',async()=>{
    body.replaceChildren();const status=document.createElement('p');status.setAttribute('role','status');status.textContent=t('Підраховуємо записи…');body.append(status);dialog.showModal();
    try{
      const preview=await request('preview');if(!dialog.open)return;
      if(!preview.counts.bookings){status.textContent=t('Немає скасованих або завершених записів для видалення.');return;}
      status.textContent=`Буде видалено: записів — ${preview.counts.bookings}, повідомлень — ${preview.counts.messages}, файлів — ${preview.counts.files}, подій — ${preview.counts.events}.`;
      const info=document.createElement('p');info.textContent=t('Чинні бронювання й записи з незавершеним поверненням зберігаються. Повідомлення й теми в Telegram залишаться. Видалення на сайті незворотне.');
      const form=document.createElement('form');form.className='site-booking-cleanup-form';const label=document.createElement('label');label.className='site-booking-field';const caption=document.createElement('span');caption.textContent=t('Для підтвердження введіть ВИДАЛИТИ');const input=document.createElement('input');input.type='text';input.autocomplete='off';input.required=true;label.append(caption,input);
      const actions=document.createElement('div');actions.className='site-booking-actions';const back=document.createElement('button');back.type='button';back.className='button';back.textContent=t('Скасування');back.onclick=()=>dialog.close();const submit=document.createElement('button');submit.type='submit';submit.className='button site-booking-danger';submit.textContent=t('Видалити історію');submit.disabled=true;input.addEventListener('input',()=>{submit.disabled=input.value!=='ВИДАЛИТИ';});actions.append(back,submit);form.append(label,actions);body.append(info,form);
      form.addEventListener('submit',async event=>{event.preventDefault();if(input.value!=='ВИДАЛИТИ' || submit.disabled)return;submit.disabled=true;input.disabled=true;back.disabled=true;submit.textContent=t('Видаляємо…');
        try{const result=await request('delete',{token:preview.token,confirmation:input.value});body.replaceChildren();const done=document.createElement('p');done.setAttribute('role','status');done.textContent=`Видалено записів: ${result.deleted}.`+(result.file_cleanup_pending?t(' Деякі файли не вдалося видалити з диска — перевірте права на папку завантажень.'):'');const refresh=document.createElement('button');refresh.type='button';refresh.className='button';refresh.textContent=t('Оновити список');refresh.onclick=()=>{const url=new URL(window.location.href);url.searchParams.delete('id');url.searchParams.delete('paged');window.location.assign(url);};body.append(done,refresh);}catch(error){status.textContent=error.message;submit.textContent=t('Видалити історію');submit.disabled=false;input.disabled=false;back.disabled=false;}
      });
    }catch(error){status.textContent=error.message;}
  });
}

const tariffForm=document.querySelector('.site-booking-tariff-form');
if(tariffForm){
  const update=()=>{const hourly=tariffForm.elements.billingMode.value==='hourly';tariffForm.querySelector('[data-tariff-duration]').hidden=hourly;tariffForm.elements.durationHours.disabled=hourly;tariffForm.querySelector('[data-tariff-minimum]').hidden=!hourly;tariffForm.elements.minimumHours.disabled=!hourly;tariffForm.querySelector('[data-tariff-unit]').textContent=hourly?t('грн / год'):'грн';};
  tariffForm.elements.billingMode.addEventListener('change',update);update();
  const rows=tariffForm.querySelector('[data-tariff-features]');
  const describe=()=>rows.querySelectorAll('input').forEach((input,index)=>input.setAttribute('aria-label',`Перевага ${index+1}`));
  rows.addEventListener('click',event=>{const button=event.target.closest('[data-feature-remove]');if(button){const row=button.closest('.site-booking-feature-row');const next=row.nextElementSibling?.querySelector('input') || row.previousElementSibling?.querySelector('input');row.remove();describe();(next || tariffForm.querySelector('[data-feature-add]')).focus();}});
  tariffForm.querySelector('[data-feature-add]').addEventListener('click',()=>{
    const row=document.createElement('div');row.className='site-booking-feature-row';
    const handle=document.createElement('button');handle.type='button';handle.className='site-booking-feature-handle';handle.setAttribute('aria-label',t('Перемістити перевагу'));handle.title=t('Перетягніть або скористайтеся стрілками вгору й униз');handle.textContent='⠿';
    const input=document.createElement('input');input.type='text';input.name='features[]';input.placeholder=t('Нова перевага');
    const remove=document.createElement('button');remove.type='button';remove.className='button site-booking-danger';remove.dataset.featureRemove='';remove.setAttribute('aria-label',t('Видалити перевагу'));remove.textContent='×';
    row.append(handle,input,remove);rows.append(row);describe();input.focus();
  });describe();
  let dragged=null;
  rows.addEventListener('pointerdown',event=>{
    const handle=event.target.closest('.site-booking-feature-handle');
    if(!handle || event.button!==0)return;
    event.preventDefault();handle.focus();
    dragged={row:handle.closest('.site-booking-feature-row'),handle,id:event.pointerId};
    rows.setPointerCapture(event.pointerId);dragged.row.classList.add('is-dragging');
  });
  rows.addEventListener('pointermove',event=>{
    if(!dragged || event.pointerId!==dragged.id)return;
    event.preventDefault();
    const siblings=[...rows.children].filter(row=>row!==dragged.row);
    const next=siblings.find(row=>{const rect=row.getBoundingClientRect();return event.clientY<rect.top+rect.height/2;});
    rows.insertBefore(dragged.row,next || null);
    if(event.clientY<80)window.scrollBy(0,-12);
    else if(event.clientY>window.innerHeight-80)window.scrollBy(0,12);
  });
  const finishDrag=()=>{if(!dragged)return;dragged.row.classList.remove('is-dragging');dragged=null;describe();};
  rows.addEventListener('pointerup',finishDrag);rows.addEventListener('pointercancel',finishDrag);rows.addEventListener('lostpointercapture',finishDrag);
  rows.addEventListener('keydown',event=>{
    const handle=event.target.closest('.site-booking-feature-handle');
    if(!handle || !['ArrowUp','ArrowDown'].includes(event.key))return;
    event.preventDefault();const row=handle.closest('.site-booking-feature-row');
    if(event.key==='ArrowUp' && row.previousElementSibling)rows.insertBefore(row,row.previousElementSibling);
    if(event.key==='ArrowDown' && row.nextElementSibling)rows.insertBefore(row.nextElementSibling,row);
    handle.focus();describe();
  });
}

document.querySelectorAll('[data-tariff-toggle]').forEach(input=>input.addEventListener('change',async()=>{
  const desired=input.checked;const label=input.closest('label');const status=label.querySelector('[data-tariff-status]');
  input.disabled=true;label.setAttribute('aria-busy','true');
  let notice=label.parentElement.querySelector('[role=alert]');if(notice)notice.remove();
  try{
    const response=await fetch(input.dataset.endpoint,{method:'POST',headers:{'Content-Type':'application/json','X-WP-Nonce':input.dataset.nonce},body:JSON.stringify({active:desired})});
    const data=await response.json();if(!response.ok)throw new Error(data.message || t('Не вдалося змінити статус.'));
    input.checked=data.active;status.textContent=data.active?t('Активний'):'Неактивний';
  }catch(error){input.checked=!desired;notice=document.createElement('p');notice.setAttribute('role','alert');notice.textContent=error.message;label.after(notice);}
  finally{input.disabled=false;label.removeAttribute('aria-busy');}
}));
