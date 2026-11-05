'use client';
import {Field, RecordScope, useValues, useFieldScope} from '../../core/fields/render.js';
import {NativeAreaContent} from '../../core/content/areas/render.js';
import {Quote} from 'lucide-react';
import {fields} from '../../core/fields/schema.js';
const widgetSchema=fields().addImage('image').addRichText('category').addRichText('text').addRichText('author').addRichText('note').build();
function ReviewCardContent() {
  const d = useValues();
  const Content=useFieldScope().Content ?? NativeAreaContent;
  return (
    <>
      <article className="flex h-full min-w-0 flex-col bg-background text-foreground shadow-soft">
        {d.image && (
          <div className="img-zoom relative aspect-[16/9] overflow-hidden">
            <Field
              name={['image']}
              imageProps={{
                src: d.image,
                alt: d.alt,
                loading: 'lazy',
                className: 'h-full w-full object-cover',
              }}
            />
            {d.category && (
              <span className="absolute bottom-4 left-4 bg-background px-3 py-2 text-xs">
                <Field name={['category']} inline value={d.category} />
              </span>
            )}
          </div>
        )}
        <div className="flex flex-1 flex-col p-6 for-small-tablet:p-8">
          <Quote aria-hidden className="mb-5 size-7 text-flame" />
          <blockquote className="flex-1 text-base leading-relaxed">
            «<Field name={['text']} inline value={d.text} />»
          </blockquote>
          {d.extraBlocks?.length > 0 && <Content blocks={d.extraBlocks} />}
          <div className="mt-7 border-t pt-5">
            <p className="text-sm font-semibold">
              <Field name={['author']} inline value={d.author} />
            </p>
            {(d.note || d.example) && (
              <p className="mt-2 text-xs text-muted-foreground">
                <Field
                  name={['note']}
                  inline
                  value={d.note || 'Приклад відгуку · не реальний клієнт'}
                />
              </p>
            )}
          </div>
        </div>
      </article>
    </>
  );
}

export function ReviewCard() {
  return (
    <RecordScope schema={widgetSchema}>
      <ReviewCardContent />
    </RecordScope>
  );
}
