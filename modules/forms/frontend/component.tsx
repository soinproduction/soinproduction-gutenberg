'use client';
import { Select } from '../../../ui/select.js';
import { Input, Textarea } from '../../../ui/input.js';
import { Checkbox } from '../../../ui/checkbox.js';
import { RadioGroup, RadioItem } from '../../../ui/radio-group.js';
import { metricValue } from './metrics.js';
import { Turnstile } from '../../../ui/turnstile.js';
import { columnCount, formFields, fieldTracks } from './schema.js';
import { useEffect, useId, useMemo, useState } from 'react';
// Serialize initial challenge requests so several forms share the first session cookie.
let challengeQueue: Promise<unknown> = Promise.resolve();
function requestChallenge(url: string) {
  const next = challengeQueue
    .catch(() => {})
    .then(() => fetch(url, { cache: 'no-store', credentials: 'same-origin' }));
  challengeQueue = next;
  return next;
}
export function Form({
  data,
  formId = 0,
  editor = false,
  renderHeading,
  fieldsEditor,
  renderSubmit,
  renderSuccess,
  onModal,
  endpoint = '/api/forms/',
}: {
  data: any;
  formId?: number;
  editor?: boolean;
  fieldsEditor?: React.ReactNode;
  renderHeading?: () => React.ReactNode;
  renderSubmit?: () => React.ReactNode;
  renderSuccess?: () => React.ReactNode;
  onModal?: (id: number) => void;
  endpoint?: string;
}) {
  const uid = useId();
  const fields = useMemo(() => formFields(data), [data.fields]);
  const [hiddenValues, setHiddenValues] = useState<Record<string, string>>({});
  useEffect(() => {
    if (editor) return;
    let storage: Storage | undefined;
    try {
      storage = window.sessionStorage;
    } catch {}
    const context = {
      url: window.location.href,
      referrer: document.referrer,
      title: document.title,
      language: navigator.language,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    };
    setHiddenValues(
      Object.fromEntries(
        fields
          .filter((field: any) => field.type === 'metric')
          .map((field: any) => [field.id, metricValue(field, context, storage)])
      )
    );
  }, [fields, editor]);
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [challenge, setChallenge] = useState('');
  const [challengeEpoch, setChallengeEpoch] = useState(0);
  const [ready, setReady] = useState(false);
  const [captcha, setCaptcha] = useState<any>(null);
  const [captchaToken, setCaptchaToken] = useState('');
  const [captchaEpoch, setCaptchaEpoch] = useState(0);
  useEffect(() => {
    if (editor || !formId) return;
    let active = true;
    let timer: ReturnType<typeof setTimeout>;
    requestChallenge(endpoint + formId)
      .then((r) => {
        if (!r.ok) throw new Error('Unavailable');
        return r.json();
      })
      .then((v) => {
        if (!active) return;
        setChallenge(v.challenge);
        setCaptcha(v.turnstile);
        timer = setTimeout(() => {
          if (active) setReady(true);
        }, 2100);
      })
      .catch(() => {
        if (active) setStatus('error');
      });
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [editor, formId, endpoint, challengeEpoch]);
  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (editor || !ready || status === 'sending') return;
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const values = Object.fromEntries(
      fields.map((field: any) => [
        field.id,
        field.type === 'checkbox' ? form.has(field.id) : String(form.get(field.id) ?? ''),
      ])
    );
    setStatus('sending');
    try {
      const response = await fetch(endpoint + formId, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          values,
          website: String(form.get('_website') ?? ''),
          challenge,
          turnstile: captchaToken,
        }),
      });
      if (!response.ok) throw new Error('Submission failed');
      const result = await response.json();
      if (
        result.action?.type === 'redirect' &&
        typeof result.action.url === 'string' &&
        /^(?:\/(?!\/)|https:\/\/)/.test(result.action.url)
      ) {
        // Keep the pending form visible until navigation replaces the page.
        window.location.assign(result.action.url);
        return;
      }
      if (result.action?.type === 'modal' && Number(result.action.id) > 0) {
        if (!onModal) throw new Error('Modal handler unavailable');
        formElement.reset();
        setStatus('idle');
        setReady(false);
        setChallenge('');
        setCaptchaToken('');
        setCaptchaEpoch((v) => v + 1);
        setChallengeEpoch((v) => v + 1);
        onModal(Number(result.action.id));
        return;
      }
      setStatus('sent');
    } catch {
      setStatus('error');
      setCaptchaToken('');
      setCaptchaEpoch((v) => v + 1);
    }
  };
  if (editor && data.successAction === 'message' && data.previewSuccess && fieldsEditor)
    return <div className="fe-success-editor">{fieldsEditor}</div>;
  if (status === 'sent' || (editor && data.successAction === 'message' && data.previewSuccess))
    return (
      <div
        role="status"
        className="self-center bg-background p-10 text-foreground shadow-lift for-small-tablet:p-12"
      >
        {renderSuccess ? (
          renderSuccess()
        ) : (
          <>
            <p className="eyebrow">{data.successEyebrow}</p>
            <p className="mt-6 font-display text-3xl font-light">{data.successTitle}</p>
            <p className="mt-3 leading-relaxed text-muted-foreground">{data.successMessage}</p>
          </>
        )}
      </div>
    );
  return (
    <form
      className="fe-form grid self-center bg-background p-10 text-foreground shadow-lift for-small-tablet:p-12"
      style={
        {
          '--fe-columns': columnCount(data.columns),
        } as React.CSSProperties
      }
      onSubmit={submit}
      aria-label={data.heading || 'Contact form'}
    >
      <p className="eyebrow">{renderHeading ? renderHeading() : data.heading}</p>
      {fieldsEditor ??
        fields.map((field: any) => {
          if (['hidden', 'metric'].includes(field.type))
            return (
              <input
                key={field.id}
                type="hidden"
                name={field.id}
                value={
                  field.type === 'hidden'
                    ? String(field.defaultValue ?? '')
                    : hiddenValues[field.id] ?? ''
                }
                readOnly
              />
            );
          const id = uid + '-' + field.id;
          const label = field.label ?? '';
          const common = {
            id,
            name: field.id,
            required: Boolean(field.required),
            disabled: editor || status === 'sending',
            'aria-label': label,
            placeholder: field.placeholder ?? '',
            className: 'field',
            defaultValue: field.defaultValue ?? '',
            min: field.type === 'number' ? field.min : undefined,
            max: field.type === 'number' ? field.max : undefined,
          };
          return (
            <div
              key={field.id}
              className="fe-field"
              style={
                {
                  '--fe-span': fieldTracks(field, data.columns),
                } as React.CSSProperties
              }
            >
              {!['checkbox', 'radio'].includes(field.type) && field.showLabel && (
                <label htmlFor={id} className="mb-2 block text-sm">
                  {label}
                  {field.required ? ' *' : ''}
                </label>
              )}
              {field.type === 'textarea' ? (
                <Textarea {...common} maxLength={4000} rows={4} />
              ) : field.type === 'select' ? (
                <Select id={id} name={field.id} required={Boolean(field.required)}
                  disabled={editor || status === 'sending'} defaultValue={field.defaultValue ?? ''}
                  aria-label={label} placeholder={field.placeholder || label || 'Choose…'}
                  className="field" options={field.options.filter(Boolean).map((option: string) => ({value:option,label:option}))} />
              ) : field.type === 'checkbox' ? (
                <label className="flex items-start gap-3 text-sm">
                  <Checkbox
                    id={id}
                    name={field.id}
                    required={Boolean(field.required)}
                    disabled={editor || status === 'sending'}
                  />
                  <span>
                    {label}
                    {field.required ? ' *' : ''}
                  </span>
                </label>
              ) : field.type === 'radio' ? (
                <fieldset>
                  <legend className="mb-3 text-sm">
                    {label}
                    {field.required ? ' *' : ''}
                  </legend>
                  <RadioGroup name={field.id} required={Boolean(field.required)} disabled={editor || status === 'sending'} defaultValue={field.defaultValue} aria-label={label}>
                  {field.options.map((option: string) => (
                    <label key={option} className="mb-2 flex gap-3 text-sm">
                      <RadioItem
                        value={option}
                        required={Boolean(field.required)}
                        disabled={editor || status === 'sending'}
                      />
                      {option}
                    </label>
                  ))}
                  </RadioGroup>
                </fieldset>
              ) : (
                <Input
                  {...common}
                  type={field.type}
                  maxLength={field.type === 'tel' ? 40 : field.type === 'email' ? 254 : 500}
                />
              )}
            </div>
          );
        })}
      {captcha && !editor && (
        <Turnstile key={captchaEpoch} siteKey={captcha.siteKey} onToken={setCaptchaToken} />
      )}
      <div className="fe-honeypot" aria-hidden="true">
        <label>
          Website
          <input name="_website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      {status === 'error' && (
        <p role="alert" className="text-sm text-red-700">
          {data.errorMessage}
        </p>
      )}
      <button
        type="submit"
        disabled={
          editor ||
          status === 'sending' ||
          !fields.length ||
          !ready ||
          (Boolean(captcha) && !captchaToken) ||
          (!formId && !editor)
        }
        className="btn-ghost mt-2 !border-flame !bg-flame !text-flame-foreground hover:!opacity-90"
      >
        {status === 'sending' ? 'Sending…' : renderSubmit ? renderSubmit() : data.submitLabel}
      </button>
    </form>
  );
}
