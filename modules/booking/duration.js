import { t } from './i18n.js';
/** Duration choices always come from the same WordPress slot ledger as mutations. */
export function initDuration(form,{excludeId=0,fixedHours=0,entryType='booking'}={}) {
  const source=form.elements.hours;
  if(!source || source.dataset.durationEnhanced)return;
  source.dataset.durationEnhanced='true';source.type='hidden';
  const wrapper=source.closest('label');wrapper.classList.add('site-booking-duration');
  const choices=document.createElement('div');choices.className='site-booking-duration-choices';choices.setAttribute('role','radiogroup');choices.setAttribute('aria-label',t('Тривалість бронювання'));
  const note=document.createElement('span');note.className='site-booking-duration-note';note.setAttribute('role','status');note.setAttribute('aria-live','polite');wrapper.append(choices,note);
  const submit=form.querySelector('[type=submit]');
  let controller;let timer;let revision=0;
  const choose=hours=>{
    source.value=String(hours);source.dispatchEvent(new Event('input',{bubbles:true}));source.dispatchEvent(new Event('change',{bubbles:true}));
    choices.querySelectorAll('button').forEach(button=>{const selected=Number(button.dataset.hours)===hours;button.setAttribute('aria-checked',String(selected));button.tabIndex=selected?0:-1;});
  };
  const refresh=async()=>{
    const current=++revision;controller?.abort();controller=new AbortController();
    choices.replaceChildren();note.textContent=t('Перевіряємо вільний час…');submit.disabled=true;form.dataset.durationReady='false';
    try {
      const params=new URLSearchParams({date:form.elements.date.value,time:form.elements.time.value,type:form.elements.type?.value || entryType,exclude_id:String(excludeId)});
      const config=window.SITE_BOOKING_ADMIN;
      const response=await fetch(config.api+'/availability?'+params,{cache:'no-store',signal:controller.signal,headers:{'X-WP-Nonce':config.nonce}});
      const data=await response.json();if(current!==revision)return;
      if(!response.ok)throw new Error(data.message || t('Не вдалося перевірити доступність.'));
      const max=Number(data.max_hours);
      if(!max || (fixedHours && max<fixedHours)) {
        source.value='';source.dispatchEvent(new Event('input',{bubbles:true}));note.textContent=fixedHours?t('Для цієї тривалості тут немає вільного часу. Оберіть інший початок.'):'На цей час немає вільних годин. Оберіть іншу дату або початок.';return;
      }
      const values=fixedHours?[fixedHours]:Array.from({length:max},(_,i)=>i+1);
      values.forEach(hours=>{
        const button=document.createElement('button');button.type='button';button.className='button';button.dataset.hours=String(hours);button.setAttribute('role','radio');
        const tail=hours%100;button.textContent=`${hours} ${tail>=11 && tail<=14?'годин':hours%10===1?'година':hours%10>=2 && hours%10<=4?'години':'годин'}`;
        button.addEventListener('click',()=>choose(hours));
        button.addEventListener('keydown',event=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].includes(event.key))return;event.preventDefault();const index=values.indexOf(Number(source.value));const next=event.key==='Home'?0:event.key==='End'?values.length-1:(index+(['ArrowRight','ArrowDown'].includes(event.key)?1:-1)+values.length)%values.length;choose(values[next]);choices.children[next].focus();});choices.append(button);
      });
      choose(fixedHours || Math.max(1,Math.min(Number(source.value)||1,max)));
      note.textContent=fixedHours?t('Тривалість онлайн-бронювання зберігається.'):`Доступно поспіль: ${max} год. До найближчого зайнятого запису або кінця доступного часу.`;
      form.dataset.durationReady='true';submit.disabled=false;
    } catch(error) {if(error.name!=='AbortError' && current===revision)note.textContent=error.message;}
  };
  const schedule=()=>{submit.disabled=true;form.dataset.durationReady='false';++revision;controller?.abort();clearTimeout(timer);timer=setTimeout(refresh,120);};
  ['date','time','type'].forEach(name=>{const input=form.elements[name];input?.addEventListener('change',schedule);input?.addEventListener('input',schedule);});
  form.addEventListener('site:duration-refresh',schedule);
  form.addEventListener('submit',event=>{if(form.dataset.durationReady!=='true'){event.preventDefault();event.stopImmediatePropagation();}},true);
  refresh();
}

window.addEventListener('focus',()=>document.querySelectorAll('form[data-duration-ready]').forEach(form=>{if(form.getClientRects().length)form.dispatchEvent(new Event('site:duration-refresh'));}));
