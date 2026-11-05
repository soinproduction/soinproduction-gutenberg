import {BackgroundCanvas, BackgroundSettings} from './editor/canvas.js';
export function BackgroundControl({controls,value,setValue,options = {}}: any) {
 return controls ? <BackgroundSettings value={value} onChange={setValue}/> : <BackgroundCanvas value={value} onChange={setValue} selected className={options.mediaClassName}/>;
}
