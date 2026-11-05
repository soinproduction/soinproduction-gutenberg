import {SelectControl} from '../../ui/select.js';
import {editorEnvironment} from '../../core/editor/environment.js';
declare const wp: any;
export function FormControl({field,value,setValue,site}: any) {
 const {Button} = wp.components;
 const admin = editorEnvironment().adminUrl;
 return <><SelectControl label={field.label ?? 'Form'} value={value ?? 0} options={[{label:'Choose a form…',value:0},...(site.forms??[]).map((form:any)=>({label:form.title,value:form.id}))]} onChange={(id:string)=>setValue(Number(id))}/>{value>0&&<Button variant="secondary" href={admin+'?post='+value+'&action=edit'} target="_blank">Edit form</Button>}</>;
}
