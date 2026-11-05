'use client';
import { htmlNodes } from '../../../core/content/html.js';
import { richNodes } from '../../../core/content/rich-text.js';
import { Form } from '../../../modules/forms/frontend/component.js';
import { Field, useFieldScope } from '../../../core/fields/render.js';
import { ModalContext } from '../../../modules/modals/context.js';
import {useSite} from '../../../core/content/context.js';
import { useContext } from 'react';
/** The theme supplies typography/editing and modal integration; submission belongs to the module. */
export function StudioForm({
  data,
  formId = 0,
  editor = false,
  fieldsEditor,
}: {
  data: any;
  formId?: number;
  editor?: boolean;
  fieldsEditor?: React.ReactNode;
}) {
  const scope = useFieldScope();
  const site=useSite();
  const onModal = useContext(ModalContext);
  const inline = editor && scope.blockName === 'site/form-builder';
  return (
    <Form
      data={data}
      endpoint={site.runtime?.formsEndpoint}
      formId={formId}
      editor={editor}
      onModal={onModal}
      fieldsEditor={fieldsEditor}
      renderSuccess={data.successHtml ? () => htmlNodes(data.successHtml) : undefined}
      renderHeading={() =>
        inline ? <Field name="heading" inline value={data.heading} /> : richNodes(data.heading)
      }
      renderSubmit={() =>
        inline ? (
          <Field name="submitLabel" inline value={data.submitLabel} />
        ) : (
          richNodes(data.submitLabel)
        )
      }
    />
  );
}
