
'use client';
import { useContext } from 'react';
import { ContentContext, ContentProvider } from '../../../core/content/context.js';
import { EditorRecordLink, useValues } from '../../../core/fields/render.js';
import { selectedTariffs } from './selection.js';
import { richNodes } from '../../../core/content/rich-text.js';
import { ContentButton } from '../../buttons/implementation/content.js';
import { BookingPlanContext } from '../../buttons/implementation/booking.js';

export function PricingPlansView({ name, className }: { name: string; className?: string }) {
  const { site, editor } = useContext(ContentContext);
  const data = useValues();
  const library = site.tariffs ?? [];
  const tariffs = selectedTariffs(data[name], library);
  if (!tariffs.length) return editor ? <p>No pricing plans selected. Choose plans in the sidebar.</p> : null;
  return <div className={className}>
    {tariffs.map((tariff: any) => <div key={tariff.id} className="site-tariff-preview">
      {editor && <EditorRecordLink id={tariff.id} label="Edit pricing plan" />}
      <ContentProvider site={site} data={tariff.data} innerBlocks={tariff.buttons}>
        <PricingCard card={tariff.data} buttons={tariff.buttons ?? []} />
      </ContentProvider>
    </div>)}
  </div>;
}

function PricingCard({ card, buttons }: { card: any; buttons: any[] }) {
  const featured = Boolean(card.featured);
  const actions = buttons.filter(block => block.name === 'core/buttons').flatMap(block => block.innerBlocks ?? []).filter(block => block.name === 'core/button');
  return <div data-motion data-booking-plan={card.id || 'hour'} className={`flex flex-col p-10 transition-transform duration-500 hover:-translate-y-2 ${featured ? 'bg-foreground py-14 text-background shadow-lift' : 'border bg-background shadow-soft'}`}>
    <div className="flex items-center justify-between">
      {card.note && <p className={`eyebrow ${featured ? '!text-background/60' : ''}`}>{richNodes(card.note)}</p>}
      {featured && <span className="bg-flame px-2 py-1 text-[0.96rem] uppercase tracking-[0.2em] text-flame-foreground">Популярний</span>}
    </div>
    <h3 className="mt-6 text-2xl">{richNodes(card.name)}</h3>
    <p className="mt-8"><span className="font-display text-5xl font-light">{Number(card.price || 0).toLocaleString('uk-UA')}</span>{' '}<span className="text-sm opacity-60">{richNodes(card.unit)}</span></p>
    <ul className="mt-8 flex-1 space-y-3 text-sm">{(card.features ?? []).map((feature: string, index: number) => <li key={index} className={`flex gap-3 border-b pb-3 ${featured ? 'border-background/15' : ''}`}><span className="opacity-40">—</span>{richNodes(feature)}</li>)}</ul>
    {actions.length > 0 && <BookingPlanContext.Provider value={card.id || 'hour'}><div className="site-actions mt-10">{actions.map((action, index) => <ContentButton key={index} attributes={action.attrs} />)}</div></BookingPlanContext.Provider>}
  </div>;
}
