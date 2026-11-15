import {Component, useEffect, useState} from 'react';
import {createRoot} from 'react-dom/client';
import {ContentProvider} from '../../core/content/context.tsx';
import {FieldScope} from '../../core/fields/render.tsx';
import {buildExample} from './examples';
import {initialOptions} from './options';
import {entries} from '../catalog';
import {PackageOpen,X} from 'lucide-react';
import './runtime.css';

const candidate=location.hash.slice(1);
const name=entries.some(([,item])=>item===candidate)?candidate:'Section';
const send=payload=>{if(parent!==window)parent.postMessage({kind:'kit-preview',name,...payload},location.origin);};
let formResult='success';
const nativeFetch=window.fetch.bind(window);
// Isolated to this preview document. No production form endpoint is contacted.
window.fetch=async(input,init)=>{
  const url=new URL(typeof input==='string'?input:input.url,location.href);
  const prefix=new URL('./__preview/forms/',location.href);
  if(url.origin!==prefix.origin || !url.pathname.startsWith(prefix.pathname))return nativeFetch(input,init);
  await new Promise(resolve=>setTimeout(resolve,240));
  const post=(init?.method??'GET').toUpperCase()==='POST';
  return new Response(JSON.stringify(post?{action:{type:'message'}}:{challenge:'local-demo',turnstile:null}),{status:post&&formResult==='error'?422:200,headers:{'Content-Type':'application/json'}});
};

class PreviewError extends Component {
  state={error:false};
  static getDerivedStateFromError(){return {error:true};}
  componentDidCatch(error){send({error:error.message});}
  render(){return this.state.error?<p role="alert">Не удалось открыть превью. Нажмите «Сбросить».</p>:this.props.children;}
}
function Runtime(){
  const [options,setOptions]=useState(()=>initialOptions(name));
  const [message,setMessage]=useState('');
  const example=buildExample(name,options);
  formResult=options.result??'success';
  useEffect(()=>{const receive=event=>{if(event.source===parent && event.origin===location.origin && event.data?.kind==='kit-preview-options' && event.data.name===name){setOptions(event.data.options);setMessage('');}};window.addEventListener('message',receive);return()=>window.removeEventListener('message',receive);},[]);
  useEffect(()=>{
    const publish=()=>send({height:Math.ceil(document.getElementById('preview-content').getBoundingClientRect().height),code:example.code,data:JSON.stringify({data:example.values,...(Object.keys(example.site).length?{site:example.site}:{}),...(example.innerBlocks.length?{innerBlocks:example.innerBlocks}:{})},null,2),note:example.note,ready:true});
    const observer=new ResizeObserver(publish);observer.observe(document.getElementById('preview-content'));document.fonts.ready.then(publish);publish();return()=>observer.disconnect();
  },[JSON.stringify(options)]);
  const edit=props=>props.field.control==='edit-record'?<button type="button" className="demo-editor-link" onClick={()=>setMessage('В WordPress эта ссылка открывает редактор выбранной записи.')}>{props.options?.label??'Редактировать запись'}</button>:null;
  const captureLink=event=>{const link=event.target.closest('a');if(!link)return;event.preventDefault();setMessage(`Демо-переход: ${link.getAttribute('href')}`);};
  return <div id="preview-content" className={`preview-frame preview-for-${name}`}>
    {example.module && !example.enabled ? <div className="demo-unavailable"><span className="demo-module-icon" aria-hidden="true"><PackageOpen /></span><h3>Модуль {example.module} не подключён</h3><p>Виджет появится после подключения модуля в проекте. Включите переключатель над превью, чтобы посмотреть пример.</p></div> : <div className="demo-render" onClickCapture={captureLink}>
      <ContentProvider data={example.values} site={example.site} innerBlocks={example.innerBlocks} editor={example.editor}><FieldScope schema={example.schema} value={example.values} site={example.site} edit={example.editor?edit:undefined}>{example.element}</FieldScope></ContentProvider>
      {(name==='Section' && !options.visible || ['Show','Toggle'].includes(name) && !options.visible || name==='RecordEdit'&&!options.editor) && <div className="demo-empty">Компонент ничего не выводит в этом состоянии.</div>}
    </div>}
    {message && <div className="demo-feedback" role="status"><span>{message}</span><button type="button" aria-label="Закрыть сообщение" onClick={()=>setMessage('')}><X size={16}/></button></div>}
  </div>;
}
createRoot(document.getElementById('preview-root')).render(<PreviewError><Runtime /></PreviewError>);
