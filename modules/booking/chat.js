import { t } from './i18n.js';
export function renderBookingChat(data,request,config){
  const section=document.createElement('section');section.className='site-booking-chat';
  const title=document.createElement('h3');title.textContent=t('Чат із клієнтом');
  const hint=document.createElement('p');hint.className='site-booking-chat-hint';hint.textContent=data.telegram_linked?t('Повідомлення синхронізуються з Telegram клієнта.'):'Клієнт ще не підключив Telegram. Історію збережено; надсилання стане доступним після підключення.';
  const older=document.createElement('button');older.type='button';older.className='button';older.textContent=t('Завантажити попередні');older.hidden=true;
  const log=document.createElement('div');log.className='site-booking-chat-log';log.setAttribute('role','log');log.setAttribute('aria-label',t('Листування за бронюванням'));log.setAttribute('aria-live','polite');
  const notice=document.createElement('p');notice.className='site-booking-chat-notice';notice.setAttribute('role','status');
  const form=document.createElement('form');form.className='site-booking-chat-compose';
  const label=document.createElement('label');label.textContent=t('Повідомлення клієнту');label.className='site-booking-field';
  const input=document.createElement('textarea');input.name='message';input.rows=3;input.maxLength=3000;input.placeholder=t('Напишіть повідомлення…');input.disabled=!data.telegram_linked;label.append(input);
  const file=document.createElement('input');file.type='file';file.name='files[]';file.multiple=true;file.accept='.jpg,.jpeg,.png,.webp,.pdf,.txt,.csv,.zip,.docx,.xlsx';file.id='site-booking-chat-file-'+data.id;file.className='site-booking-chat-file';file.disabled=!data.telegram_linked;
  const attach=document.createElement('label');attach.htmlFor=file.id;attach.className='button site-booking-chat-attach';attach.textContent=t('Додати файли');
  const selected=document.createElement('div');selected.className='site-booking-chat-previews';
  const remove=document.createElement('button');remove.type='button';remove.className='button';remove.textContent=t('Очистити файли');remove.hidden=true;
  const send=document.createElement('button');send.type='submit';send.className='button button-primary';send.textContent=t('Надіслати');send.disabled=!data.telegram_linked;
  const controls=document.createElement('div');controls.className='site-booking-chat-controls';controls.append(attach,file,remove,send);
  const limits=document.createElement('p');limits.className='site-booking-chat-hint';limits.textContent=t('До 10 файлів за раз, кожен до 10 МБ, разом — до 100 МБ. Зображення можна перетягнути сюди. З файлами — до 800 символів.');
  form.append(label,selected,controls,limits);section.append(title,hint,older,log,notice,form);
  const messages=new Map();let fingerprint='',loading=false,first=true,requestKey='';let selectedFiles=[];
  log.innerHTML=t('<p class="site-booking-chat-empty" role="status">Завантажуємо листування…</p>');
  section.addEventListener('site:booking-profile',event=>{data=event.detail;hint.textContent=data.telegram_linked?t('Повідомлення синхронізуються з Telegram клієнта.'):'Клієнт ще не підключив Telegram. Історію збережено; надсилання стане доступним після підключення.';if(form.dataset.sending!=='true'){input.disabled=!data.telegram_linked;file.disabled=!data.telegram_linked;send.disabled=!data.telegram_linked;}});
  const key=()=>Array.from(crypto.getRandomValues(new Uint8Array(16)),n=>n.toString(16).padStart(2,'0')).join('');
  const render=(prepending=false)=>{
    const rows=[...messages.values()].sort((a,b)=>a.id-b.id);const next=JSON.stringify(rows);if(next===fingerprint)return;fingerprint=next;
    const bottom=first || log.scrollHeight-log.scrollTop-log.clientHeight<80;const previous=log.scrollHeight;const previousTop=log.scrollTop;const fragment=document.createDocumentFragment();
    if(!rows.length){const empty=document.createElement('p');empty.className='site-booking-chat-empty';empty.textContent=t('Повідомлень поки немає. Напишіть клієнту першим.');fragment.append(empty);}
    rows.forEach(message=>{
      const bubble=document.createElement('article');bubble.className='site-booking-chat-bubble is-'+message.direction;
      const meta=document.createElement('div');meta.className='site-booking-chat-meta';meta.textContent=(message.direction==='client'?(data.name || t('Клієнт')):t('Студія'))+' · '+message.time;
      const body=document.createElement('p');body.textContent=message.body;bubble.append(meta,body);
      const attachments=message.files?.length?message.files:message.file?[message.file]:[];
      const gallery=document.createElement('div');gallery.className='site-booking-chat-media'+(attachments.length===1?' is-single':'');
      attachments.forEach(attachment=>{
        const base=config.api+'/'+data.id+'/files/'+attachment.id+'?_wpnonce='+encodeURIComponent(config.nonce);
        if(['image/jpeg','image/png','image/webp'].includes(attachment.mime)){
          const link=document.createElement('a');link.className='site-booking-chat-image is-loading';link.href=base+'&view=image';link.target='_blank';link.rel='noopener';link.setAttribute('aria-label',t('Відкрити ')+attachment.name);
          const image=document.createElement('img');image.src=base+'&view=preview';image.alt=attachment.name;image.loading='lazy';image.decoding='async';image.addEventListener('load',()=>link.classList.remove('is-loading'));image.addEventListener('error',()=>{link.classList.remove('is-loading');link.classList.add('is-error');image.hidden=true;link.textContent=t('Відкрити ')+attachment.name;});link.append(image);gallery.append(link);
        }else{const link=document.createElement('a');link.className='site-booking-chat-download';link.href=base;link.textContent='📎 '+attachment.name+' · '+Math.max(1,Math.round(attachment.size/1024))+t(' КБ');link.target='_blank';link.rel='noopener';bubble.append(link);}
      });
      if(gallery.children.length)bubble.append(gallery);
      const status=document.createElement('span');status.className='site-booking-chat-status';status.textContent=({received:t('Отримано'),pending:t('У черзі'),sending:t('Надсилається…'),sent:t('Надіслано'),failed:t('Помилка надсилання'),cancelled:t('Надсилання вимкнено')})[message.status] || message.status;if(message.error)status.title=message.error;bubble.append(status);fragment.append(bubble);
    });
    log.replaceChildren(fragment);if(bottom)log.scrollTop=log.scrollHeight;else log.scrollTop=previousTop+(prepending?log.scrollHeight-previous:0);first=false;
  };
  const load=async(before=0)=>{
    if(loading)return;loading=true;
    try{const result=await request('/'+data.id+'/messages'+(before?'?before='+before:''));if(!section.isConnected)return;result.messages.forEach(item=>messages.set(item.id,item));if(first || before)older.hidden=!result.more;render(Boolean(before));}
    catch(error){if(section.isConnected)notice.textContent=error.message;}
    finally{loading=false;}
  };
  older.addEventListener('click',()=>{const ids=[...messages.keys()];if(ids.length)void load(Math.min(...ids));});
  input.addEventListener('input',()=>{requestKey='';notice.textContent='';});
  const updateFiles=()=>{
    requestKey='';file.value='';selected.replaceChildren();remove.hidden=!selectedFiles.length;input.maxLength=selectedFiles.length?800:3000;form.dataset.hasAttachments=selectedFiles.length?'true':'';
    selectedFiles.forEach((item,index)=>{
      const tile=document.createElement('div');tile.className='site-booking-chat-preview';
      if(item.url){const image=document.createElement('img');image.src=item.url;image.alt=item.file.name;tile.append(image);}
      const name=document.createElement('span');name.textContent=item.file.name;tile.append(name);
      const button=document.createElement('button');button.type='button';button.textContent='×';button.className='site-booking-chat-preview-remove';button.setAttribute('aria-label',t('Прибрати ')+item.file.name);button.addEventListener('click',()=>{if(item.url)URL.revokeObjectURL(item.url);discardUpload(item);selectedFiles.splice(index,1);updateFiles();});tile.append(button);selected.append(tile);
    });
    send.textContent=selectedFiles.length?t('Надіслати (')+selectedFiles.length+')':t('Надіслати');
  };
  const discardUpload=item=>{if(item.uploadedId)void request('/'+data.id+'/uploads/'+item.uploadedId,{method:'DELETE'}).catch(()=>{});};
  const clearFiles=(sent=false)=>{selectedFiles.forEach(item=>{if(item.url)URL.revokeObjectURL(item.url);if(!sent)discardUpload(item);});selectedFiles=[];updateFiles();};
  const addFiles=files=>{
    if(form.dataset.sending==='true' || !data.telegram_linked)return;
    const unique=new Map(selectedFiles.map(item=>[item.file.name+':'+item.file.size+':'+item.file.lastModified,item.file]));
    for(const item of files)unique.set(item.name+':'+item.size+':'+item.lastModified,item);
    const next=[...unique.values()];
    if(next.some(item=>item.size>10*1024*1024)){notice.textContent=t('Кожен файл має бути не більше 10 МБ.');file.value='';return;}
    if(next.length>10 || next.reduce((sum,item)=>sum+item.size,0)>100*1024*1024){notice.textContent=t('Оберіть до 10 файлів загальним розміром до 100 МБ.');file.value='';return;}
    const previous=selectedFiles;selectedFiles=next.map(item=>previous.find(old=>old.file===item) || {file:item,url:/^image\/(jpeg|png|webp)$/.test(item.type)?URL.createObjectURL(item):null});notice.textContent='';updateFiles();
  };
  file.addEventListener('change',()=>addFiles([...file.files]));remove.addEventListener('click',()=>clearFiles());
  form.addEventListener('dragover',event=>{if([...event.dataTransfer.types].includes('Files')){event.preventDefault();form.classList.add('is-dragging');}});
  form.addEventListener('dragleave',event=>{if(!form.contains(event.relatedTarget))form.classList.remove('is-dragging');});
  form.addEventListener('drop',event=>{if(event.dataTransfer.files.length){event.preventDefault();form.classList.remove('is-dragging');addFiles([...event.dataTransfer.files]);}});
  form.addEventListener('submit',async event=>{
    event.preventDefault();if(form.dataset.sending==='true')return;const chosen=selectedFiles.length;
    if(!input.value.trim() && !chosen){notice.textContent=t('Введіть повідомлення або прикріпіть файл.');input.focus();return;}
    if(chosen && input.value.length>800){notice.textContent=t('З файлом можна надіслати до 800 символів.');return;}
    requestKey ||= key();const messageText=input.value;
    form.dataset.sending='true';input.disabled=true;file.disabled=true;send.disabled=true;remove.disabled=true;selected.querySelectorAll('button').forEach(button=>{button.disabled=true;});send.style.width=send.getBoundingClientRect().width+'px';send.textContent=t('Надсилаємо…');notice.textContent='';
    try{
      for(let index=0;index<selectedFiles.length;index++){const item=selectedFiles[index];if(item.uploadedId)continue;send.textContent=t('Завантаження ')+(index+1)+'/'+selectedFiles.length;const upload=new FormData();upload.set('file',item.file);const result=await request('/'+data.id+'/uploads',{method:'POST',body:upload});item.uploadedId=result.id;}
      send.textContent=t('Надсилаємо…');await request('/'+data.id+'/message',{method:'POST',body:JSON.stringify({message:messageText,request_id:requestKey,attachment_ids:selectedFiles.map(item=>item.uploadedId)})});input.value='';clearFiles(true);notice.textContent=t('Повідомлення збережено й надсилається в Telegram.');await load();}
    catch(error){notice.textContent=error.message;}
    finally{delete form.dataset.sending;input.disabled=!data.telegram_linked;file.disabled=!data.telegram_linked;send.disabled=!data.telegram_linked;remove.disabled=false;selected.querySelectorAll('button').forEach(button=>{button.disabled=false;});send.style.width='';send.textContent=selectedFiles.length?t('Надіслати (')+selectedFiles.length+')':t('Надіслати');}
  });
  const timer=window.setInterval(()=>{if(!section.isConnected){window.clearInterval(timer);window.removeEventListener('focus',focus);selectedFiles.forEach(item=>{if(item.url)URL.revokeObjectURL(item.url);if(form.dataset.sending!=='true')discardUpload(item);});return;}if(!document.hidden && section.closest('dialog')?.open)void load();},4000);
  const focus=()=>{if(section.isConnected && section.closest('dialog')?.open)void load();};window.addEventListener('focus',focus);queueMicrotask(()=>void load());
  return section;
}
