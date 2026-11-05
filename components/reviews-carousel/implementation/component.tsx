'use client';
import { useContext, useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { ContentContext, ContentProvider } from '../../../core/content/context.js';
import { EditorRecordLink, useValues } from '../../../core/fields/render.js';
import type { CarouselApi } from '../../../core/ui/carousel.js';
import { Carousel, CarouselContent, CarouselItem } from '../../../core/ui/carousel.js';
import { cn } from '../../../core/utils/classnames.js';
import { ReviewCard } from '../card.js';
import { selectedReviews } from './selection.js';

export type ReviewsCarouselLabels = { previous?: string; next?: string; carousel?: string; pages?: string };

const controlButton =
  'flex size-11 items-center justify-center border border-background/40 text-background transition-colors hover:border-flame hover:bg-flame hover:text-flame-foreground disabled:pointer-events-none disabled:opacity-40';

/** Linked review records in a carousel with arrows and page dots; reviews are edited as records. */
export function ReviewsCarouselView({ name, className, labels = {} }: { name: string; className?: string; labels?: ReviewsCarouselLabels }) {
  const { site, editor } = useContext(ContentContext);
  const items = selectedReviews(useValues()[name], site.reviews ?? []);
  const [api, setApi] = useState<CarouselApi | null>(null);
  const [current, setCurrent] = useState(0);
  const [count, setCount] = useState(0);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);
  useEffect(() => {
    if (!api) return;
    const sync = () => {
      setCount(items.length ? api.scrollSnapList().length : 0);
      setCurrent(api.selectedScrollSnap());
      setCanPrev(api.canScrollPrev());
      setCanNext(api.canScrollNext());
    };
    sync();
    api.on('select', sync);
    api.on('reInit', sync);
    return () => {
      api.off('select', sync);
      api.off('reInit', sync);
    };
  }, [api, items.length]);
  if (!items.length) return editor ? <p className={cn(className, 'text-background/60')}>No reviews selected. Choose reviews in the sidebar.</p> : null;
  return (
    <div className={className}>
      <div className="mb-6 flex justify-end gap-3">
        <button type="button" onClick={() => api?.scrollPrev()} disabled={!canPrev} aria-label={labels.previous} className={controlButton}>
          <ArrowLeft className="size-4" />
        </button>
        <button type="button" onClick={() => api?.scrollNext()} disabled={!canNext} aria-label={labels.next} className={controlButton}>
          <ArrowRight className="size-4" />
        </button>
      </div>
      <Carousel setApi={setApi} opts={{ align: 'start', loop: false }} className="motion-stagger" aria-label={labels.carousel}>
        <CarouselContent className="-ml-5">
          {items.map((review: any) => (
            <CarouselItem key={review.id} className="relative basis-full pl-5 for-mobile:basis-1/2 for-tablet:basis-1/3">
              {editor && <EditorRecordLink id={review.id} label="Edit review" />}
              <ContentProvider data={review} site={site}>
                <ReviewCard />
              </ContentProvider>
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>
      <div className="mt-8 flex items-center gap-3" role="tablist" aria-label={labels.pages}>
        {Array.from({ length: count }).map((_, index) => (
          <button
            key={index}
            type="button"
            role="tab"
            aria-selected={current === index}
            aria-label={`${labels.pages ?? 'Page'} ${index + 1}`}
            onClick={() => api?.scrollTo(index)}
            className={cn('h-1 transition-all duration-300', current === index ? 'w-10 bg-flame' : 'w-5 bg-background/30 hover:bg-background/60')}
          />
        ))}
      </div>
    </div>
  );
}
