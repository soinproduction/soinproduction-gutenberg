'use client';
import { BREAKPOINTS } from '../../generated/responsive.js';
import { SliderViewport } from '../../core/ui/slider.js';
import { useField } from '../../core/fields/render.js';
import { useFieldScope } from '../../core/fields/render.js';
import { Field } from '../../core/fields/render.js';
import { LibraryImage } from '../../core/media/image.js';
import { Carousel } from '../../core/ui/carousel.js';
import { CarouselContent } from '../../core/ui/carousel.js';
import { CarouselItem } from '../../core/ui/carousel.js';
import { Children } from 'react';
import { cloneElement } from 'react';
import { isValidElement } from 'react';
import type { ReactElement } from 'react';
import type { ReactNode } from 'react';
import { Props } from '../../shared/index.js';
import { kit } from '../../shared/index.js';
import { useClasses } from '../../shared/index.js';

export function SliderView({ name, className, slideClassName }: Props & { name: string; slideClassName?: string }) {
  const scope = useField(name);
  if (scope.edit) return <Field name={name} className={className} />;
  const images = Array.isArray(scope.value) ? scope.value : [];
  return (
    <Carousel opts={{ align: 'start', loop: images.length > 1 }} className={className}>
      <CarouselContent>
        {images.map((image: any, index: number) => (
          <CarouselItem key={image.id ?? index} className={slideClassName}>
            <LibraryImage src={image.url} alt={image.alt ?? ''} className="w-full object-cover" />
          </CarouselItem>
        ))}
      </CarouselContent>
    </Carousel>
  );
}

export const ImageSlider = kit<Props & { slideClassName?: string; max?: number }>(
  'slider',
  ({ label, max }) => ({ type: 'gallery', label: label ?? 'Slider', max }),
  (props) => <SliderView {...props} />
);

/** Children are slides; List/Records expand into individual slides. Controls target `name`. */
export const Slider = Object.assign(function Slider(props: Props & {children?:ReactNode;trackClassName?:string;slideClassName?:string;max?:number;loop?:boolean;activeBelow?:keyof typeof BREAKPOINTS}) {
 const editor=!!useFieldScope().edit;
 const className=useClasses(props);
 if(!props.children)return <ImageSlider {...props} />;
 const children=Children.map(props.children,child=>isValidElement<any>(child)&&['records','list'].includes((child.type as any).kind)?cloneElement(child as ReactElement<any>,{className:[(child.props as any).className,'site-slider-items',props.trackClassName].filter(Boolean).join(' ')}):child);
 return <SliderViewport activeBelow={props.activeBelow} name={props.name??'slider'} className={className} trackClassName={props.trackClassName} loop={props.loop} label={props.label} editor={editor}>{children}</SliderViewport>;
},{kind:'slider',field:ImageSlider.field});
