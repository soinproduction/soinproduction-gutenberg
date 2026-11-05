
'use client';
import type { ButtonAppearance } from '../../core/ui/button-appearance.js';
import { useId, type ReactNode } from 'react';
import { FieldScope, Repeater, useField, useFieldScope } from '../../core/fields/render.js';
import { LoadedCollection, type ListLoading } from '../../core/ui/loaded-collection.js';
import { GalleryPhoto, GalleryViewer } from './gallery.js';
export { listWindow, listPageFromUrl, listPageUrl, type ListLoading } from '../../core/ui/loaded-collection.js';
export function LoadedList({ name, perPage, loading, loadMoreButton, gallery, className, children }: {
 name: string; perPage?: number; loading?: ListLoading; loadMoreButton?: ButtonAppearance; gallery?: boolean; className?: string; children: ReactNode;
}) {
 const {value,field}=useField(name),scope=useFieldScope();
 const id=useId().replace(/[^a-zA-Z0-9_-]/g,'');
 const pageKey=`list-${String(scope.value.sectionId||id).replace(/^#/,'')}-${name}`;
 const imageField=field.fields?.find(item=>item.type==='image')?.name??'image';
 const items=(Array.isArray(value)?value:[]).filter(row=>!gallery||Boolean(row[imageField]?.url?.trim()));
 return <FieldScope {...scope} resolvedValue={undefined} value={{...scope.value,[name]:items}}>
   <LoadedCollection pageKey={pageKey} total={items.length} perPage={perPage} loading={loading} loadMoreButton={loadMoreButton}>{({offset,limit})=>{
    const rows=<Repeater name={name} className={className} offset={offset} limit={limit} renderRow={gallery?row=><GalleryPhoto>{row}</GalleryPhoto>:undefined}>{children}</Repeater>;
    return gallery?<GalleryViewer name={name} offset={offset} limit={limit}>{rows}</GalleryViewer>:rows;
   }}</LoadedCollection>
 </FieldScope>;
}
