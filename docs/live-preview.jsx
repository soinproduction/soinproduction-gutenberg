import {useEffect,useRef,useState} from 'react';
import {Monitor,Smartphone,RotateCcw,Play,PackageOpen,ChevronDown} from 'lucide-react';
import {CodeBlock} from './components';
import {controls,initialOptions} from './previews/options';
import {componentModule,moduleInfo} from './module-info';

export function LivePreview({name}) {
  const frame=useRef(null);
  const [options,setOptions]=useState(()=>initialOptions(name));
  const [output,setOutput]=useState(null);
  const [mobile,setMobile]=useState(false);
  const [revision,setRevision]=useState(0);
  const [tab,setTab]=useState('jsx');
  const module=componentModule[name];
  const sendOptions=()=>frame.current?.contentWindow?.postMessage({kind:'kit-preview-options',name,options},location.origin);
  useEffect(()=>{const receive=event=>{if(event.source===frame.current?.contentWindow && event.origin===location.origin && event.data?.kind==='kit-preview'&&event.data.name===name)setOutput(event.data);};window.addEventListener('message',receive);return()=>window.removeEventListener('message',receive);},[name]);
  useEffect(sendOptions,[options,revision]);
  useEffect(()=>{const timer=setTimeout(()=>setOutput(current=>current??{error:'timeout'}),15000);return()=>clearTimeout(timer);},[name,revision]);
  function reset(){setOptions(initialOptions(name));setOutput(null);setRevision(value=>value+1);}
  return <div className="live-example">
    {module && <div className="module-context"><PackageOpen size={24} aria-hidden="true"/><div><strong>{moduleInfo[module].title} — дополнительный модуль</strong><p>{moduleInfo[module].description}</p><details><summary>Как подключить <ChevronDown size={16}/></summary><p>Добавьте <code>"{module}"</code> в существующий массив <code>modules</code> в <code>kit.config.json</code>, затем выполните <code>npm run kit:prepare</code> и пересоберите проект.</p><CodeBlock code={JSON.stringify({modules:[module]},null,2)} title="kit.config.json · фрагмент" /></details></div></div>}
    <div className="live-toolbar"><div className="live-title"><Play size={16} aria-hidden="true"/><strong>Живой пример</strong></div><div className="live-tools"><button type="button" className="icon-button" onClick={()=>setMobile(false)} aria-label="Превью на всю ширину" aria-pressed={!mobile}><Monitor size={18}/></button><button type="button" className="icon-button" onClick={()=>setMobile(true)} aria-label="Узкое превью" aria-pressed={mobile}><Smartphone size={18}/></button><button type="button" className="icon-button" onClick={reset} aria-label="Сбросить превью"><RotateCcw size={18}/></button></div></div>
    {(controls[name]?.length??0)>0 && <div className="live-options" role="group" aria-label="Настройки примера">{controls[name].map(control=><label key={control.key} className={`live-option live-option-${control.type}`}><span>{control.label}</span>{control.type==='select'?<select aria-label={control.label} value={options[control.key]} onChange={event=>setOptions({...options,[control.key]:event.target.value})}>{control.values.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select>:control.type==='checkbox'?<input type="checkbox" checked={options[control.key]} onChange={event=>setOptions({...options,[control.key]:event.target.checked})}/>:<input type="text" value={options[control.key]} maxLength={180} onChange={event=>setOptions({...options,[control.key]:event.target.value})}/>}</label>)}</div>}
    <div className="live-columns"><div className="live-stage"><div className="live-stage-label"><span>Результат</span><span>React · Kit</span></div><div className={`live-viewport ${mobile?'is-narrow':''}`}>
      {!output && <p className="preview-loading" role="status">Загружаем компонент…</p>}
      <iframe key={revision} ref={frame} src={`./preview.html#${name}`} title={`Живое превью ${name}`} onLoad={sendOptions} style={{height:Math.max(280,Math.min(1800,Number(output?.height)||320))}} />
      {output?.error && <div role="alert" className="preview-failure">Превью не загрузилось.<button type="button" onClick={reset}>Попробовать ещё раз</button></div>}
    </div></div><div className="live-source"><div className="live-code-tabs" role="tablist" aria-label="Исходные данные примера">{[['jsx','JSX'],['data','Данные']].map(([value,label],index)=><button key={value} id={`${name}-code-${value}`} type="button" role="tab" tabIndex={tab===value?0:-1} aria-selected={tab===value} aria-controls={`${name}-source`} onClick={()=>setTab(value)} onKeyDown={event=>{if(['ArrowRight','ArrowLeft','Home','End'].includes(event.key)){event.preventDefault();const next=event.key==='Home'?'jsx':event.key==='End'?'data':index?'jsx':'data';setTab(next);document.getElementById(`${name}-code-${next}`).focus();}}}>{label}</button>)}</div><div id={`${name}-source`} role="tabpanel" aria-labelledby={`${name}-code-${tab}`}>{output?.code?<CodeBlock code={tab==='jsx'?output.code:output.data} title={tab==='jsx'?'example.tsx':'fixture.json'} tone="dark"/>:<div className="source-loading" aria-hidden="true">Загрузка примера…</div>}</div></div></div>
    <div className="live-caption"><p>{output?.note??'Компонент Kit с демонстрационными данными.'}</p><span>Оформление — тема SoinLAB. Классы demo-* относятся к этому примеру.</span></div>
  </div>;
}
