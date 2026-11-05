import { t } from './i18n.js';
export function initWidgetSettings(){
  const form=document.querySelector('.site-booking-widget-settings');if(!form)return;
  let frame;
  const image=form.querySelector('[data-widget-image-preview]');const empty=form.querySelector('[data-widget-image-empty]');
  const setImage=(id,url)=>{form.elements.image_id.value=id;image.src=url || '';image.hidden=!url;empty.hidden=Boolean(url);};
  form.querySelector('[data-widget-image-select]').addEventListener('click',()=>{
    if(!window.wp?.media)return;
    if(!frame){frame=window.wp.media({title:t('Зображення форми бронювання'),button:{text:t('Використати зображення')},library:{type:'image'},multiple:false});frame.on('select',()=>{const item=frame.state().get('selection').first().toJSON();setImage(item.id,item.sizes?.large?.url || item.url);});frame.on('open',()=>{const id=Number(form.elements.image_id.value);if(id){const attachment=window.wp.media.attachment(id);attachment.fetch();frame.state().get('selection').add(attachment);}});}
    frame.open();
  });
  form.querySelector('[data-widget-image-clear]').addEventListener('click',()=>setImage('0',''));
}
