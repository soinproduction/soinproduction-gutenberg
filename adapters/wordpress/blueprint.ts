import {Children, Fragment, isValidElement, type ReactNode} from 'react';

const marker = (name: string) => Object.assign((_props: any) => null, {kitName: name});
export const Section = marker('Section'), Text = marker('Text'), Heading = marker('Heading'),
    Paragraphs = marker('Paragraphs'), Image = marker('Image'), Icon = marker('Icon'),
    Background = marker('Background'), Buttons = marker('Buttons'), Button = marker('Button'), List = marker('List'),
    PricingPlans = marker('PricingPlans'), ReviewsCarousel = marker('ReviewsCarousel'), Form = marker('Form'), Records = marker('Records'), RecordEdit = marker('RecordEdit'), RecordImage = marker('RecordImage'),
    RecordDate = marker('RecordDate'), RecordTitle = marker('RecordTitle'), RecordExcerpt = marker('RecordExcerpt'), RecordLink = marker('RecordLink'),
    RecordIndex = marker('RecordIndex'), Drag = marker('Drag'), Cols = marker('Cols'), Toggle = marker('Toggle'),
    Choice = marker('Choice'), Show = marker('Show'), Area = marker('Area'), Gallery = marker('Gallery'),
    Accordion = marker('Accordion'), AccordionItem = marker('AccordionItem'), AccordionTrigger = marker('AccordionTrigger'), AccordionContent = marker('AccordionContent'),
    Slider = marker('Slider'), SliderButton = marker('SliderButton'), SliderPagination = marker('SliderPagination'), RecordText = marker('RecordText'), RecordContent = marker('RecordContent'), Media = marker('Media');

function describe(node: ReactNode): any[] {
    return Children.toArray(node).flatMap(child => {
        if (!isValidElement(child)) return [{type: '#text', value: String(child)}];
        if (child.type === Fragment) return describe((child.props as any).children);
        const props = {...child.props as any};
        delete props.children;
        const type = typeof child.type === 'string' ? child.type : (child.type as any).kitName;
        if (!type) throw new Error('WordPress compiler: unsupported React component. Supply an adapter before using it in a portable section.');
        for (const [key, value] of Object.entries(props)) if (typeof value === 'function') throw new Error(`WordPress compiler: callback ${key} cannot be serialized`);
        return [{type, props, children: describe((child.props as any).children)}];
    });
}

export function section(meta: any, View: () => ReactNode) {
    const template = describe(View());
    const staticTypes = new Set(['#text','Section','Text','Heading','Paragraphs','Image','Icon','Background','Buttons','Button','Show','Toggle','Choice']);
    const isStatic = (nodes:any[]):boolean => nodes.every(node => (staticTypes.has(node.type) || /^[a-z]/.test(node.type)) && isStatic(node.children ?? []));
    return {name: 'site/' + meta.slug, title: meta.title, template, static: isStatic(template)};
}
