'use client';
import { BookingSkeleton } from './skeleton.js';
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  LoaderCircle,
} from 'lucide-react';
import { useEffect, useState, type ButtonHTMLAttributes, type InputHTMLAttributes } from 'react';
import { Turnstile } from '../../../ui/turnstile.js';
import type { Availability, BookingConfig, BookingVariant } from './types.js';
import { validateContacts, type ContactErrors } from './validation.js';
import { dateKey, dayHours, availableStart, tariffDuration, tariffTotal } from './types.js';

function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} />;
}
function Button({
  variant = 'default',
  size,
  className = '',
  type = 'button',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: string; size?: string }) {
  const style =
    variant === 'outline'
      ? 'border border-input bg-background'
      : variant === 'ghost'
        ? ''
        : 'bg-primary text-primary-foreground';
  return (
    <button
      {...props}
      type={type}
      className={`inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${style} ${
        size === 'icon' ? 'size-10' : 'px-4 py-2'
      } ${className}`}
    />
  );
}

export function BookingWidget({
  endpoint = '/api/booking',
  initialPlan = 'hour',
  variant = 'inline',
  preview = false,
}: {
  endpoint?: string;
  initialPlan?: string;
  variant?: BookingVariant;
  preview?: boolean;
}) {
  const [config, setConfig] = useState<BookingConfig | null>(null);
  const [failure, setFailure] = useState('');
  useEffect(() => {
    let active = true;
    let controller: AbortController;
    let generation = 0;
    const load = async () => {
      const requestId = ++generation;
      controller?.abort();
      const requestController = new AbortController();
      controller = requestController;
      try {
        const response = await fetch(endpoint + '/config', {
          cache: 'no-store',
          signal: requestController.signal,
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Не вдалося завантажити форму.');
        if (active && requestId === generation) {
          setConfig(data);
          setFailure('');
        }
      } catch (error) {
        if (active && requestId === generation && (error as Error).name !== 'AbortError')
          setFailure((error as Error).message);
      }
    };
    void load();
    window.addEventListener('focus', load);
    return () => {
      active = false;
      controller?.abort();
      window.removeEventListener('focus', load);
    };
  }, [endpoint]);
  if (!config) return <BookingSkeleton failure={failure} />;
  return (
    <>
      <div className="site-booking-config-status" role="status">
        {failure}
      </div>
      <BookingFormContent key={initialPlan} config={config} endpoint={endpoint} initialPlan={initialPlan} variant={variant} preview={preview} />
    </>
  );
}

function BookingFormContent({
  config,
  endpoint,
  initialPlan,
  variant,
  preview,
}: {
  config: BookingConfig;
  endpoint: string;
  initialPlan: string;
  variant: BookingVariant;
  preview: boolean;
}) {
  const contentFields = config.widget;
  const text = contentFields.formCopy;
  const days: string[] = text.weekdays;
  const fmt = (d: Date) => d.toLocaleDateString(text.locale, { day: 'numeric', month: 'long', timeZone: 'UTC' });
  const today = new Date(config.today + 'T12:00:00Z');
  const [tariffId, setTariffId] = useState(initialPlan);
  const plan = config.tariffs.find((tariff) => tariff.id === tariffId) ?? config.tariffs[0];
  const [hours, setHours] = useState(1);
  const duration = tariffDuration(plan, hours);
  const total = tariffTotal(plan, hours) / 100;
  const [step, setStep] = useState(0);
  const [view, setView] = useState(
    new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1))
  );
  const [date, setDate] = useState<Date | null>(null);
  const [hour, setHour] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [review, setReview] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<ContactErrors>({});
  const [captchaToken, setCaptchaToken] = useState('');
  const [captchaEpoch, setCaptchaEpoch] = useState(0);
  const [website, setWebsite] = useState('');
  const [bookingState, setBookingState] = useState<{status:string;date_label:string;time_label:string;telegram:{linked:boolean;username:string;name:string}} | null>(null);
  const [telegramUrl, setTelegramUrl] = useState('');
  const [bookingId, setBookingId] = useState<number | null>(null);
  const [requestId, setRequestId] = useState('');
  const [availability, setAvailability] = useState<Availability | null>(null);
  const [loading, setLoading] = useState(true);
  const [failure, setFailure] = useState('');
  useEffect(() => { setRequestId(''); }, [tariffId, date, hour, duration, name, phone, email]);
  const from = dateKey(view);
  const to = dateKey(new Date(Date.UTC(view.getUTCFullYear(), view.getUTCMonth() + 1, 0)));
  useEffect(() => {
    let current = true;
    let controller: AbortController;
    let generation = 0;
    const load = async () => {
      const requestId = ++generation;
      controller?.abort();
      const requestController = new AbortController();
      controller = requestController;
      setLoading(true);
      setFailure('');
      try {
        const response = await fetch(
          `${endpoint}/availability?${new URLSearchParams({ from, to })}`,
          { cache: 'no-store', signal: requestController.signal }
        );
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || text.scheduleFailed);
        if (!current || requestId !== generation || requestController.signal.aborted) return;
        setAvailability(data);
      } catch (error) {
        if (current && requestId === generation && (error as Error).name !== 'AbortError') {
          setFailure((error as Error).message);
          setAvailability(null);
          setHour(null);
          setReview(false);
        }
      } finally {
        if (current && requestId === generation && !requestController.signal.aborted)
          setLoading(false);
      }
    };
    void load();
    window.addEventListener('focus', load);
    return () => {
      current = false;
      controller?.abort();
      window.removeEventListener('focus', load);
    };
  }, [endpoint, from, to]);
  useEffect(() => {
    if(!review || !bookingId || !requestId)return;
    let active=true;let controller:AbortController;
    const load=async()=>{
      controller?.abort();controller=new AbortController();
      try{
        const response=await fetch(endpoint+'/status',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({request_id:requestId}),cache:'no-store',signal:controller.signal});
        const data=await response.json();if(active && response.ok && data.id===bookingId)setBookingState(data);
      }catch{}
    };
    void load();const timer=window.setInterval(()=>{if(!document.hidden)void load();},5000);window.addEventListener('focus',load);
    return()=>{active=false;controller?.abort();window.clearInterval(timer);window.removeEventListener('focus',load);};
  },[review,bookingId,requestId,endpoint]);
  const selectedDay = availability?.days.find((day) => date && day.date === dateKey(date));
  useEffect(() => {
    if (!review && !submitting && !loading && hour !== null && !availableStart(selectedDay, hour, duration)) {
      setHour(null);
      setReview(false);
      setStep((value) => (value === 1 ? 0 : value));
    }
  }, [selectedDay, loading, hour, duration, review, submitting]);
  const validSelection = !loading && hour !== null && availableStart(selectedDay, hour, duration);
  const lastDate = new Date(config.today + 'T12:00:00Z');
  lastDate.setUTCDate(lastDate.getUTCDate() + config.horizon_days);
  if (!plan)
    return (
      <p>
        <>{text.noTariffs}</>
      </p>
    );
  const offset = (view.getUTCDay() + 6) % 7;
  const count = new Date(Date.UTC(view.getUTCFullYear(), view.getUTCMonth() + 1, 0)).getUTCDate();
  const time =
    hour === null
      ? text.pickTime
      : `${String(hour).padStart(2, '0')}:00–${String(hour + duration).padStart(2, '0')}:00`;
  return (
    <div className={`site-booking site-booking--${variant} grid gap-8 for-tablet:grid-cols-[minmax(0,1fr)_28rem]`}>
      <div className="min-w-0">
        <div className="site-booking-update-status" role="status" aria-live="polite">
          {loading && <LoaderCircle className="site-booking-spinner" />}
          <span>{failure || (loading ? text.scheduleUpdating : text.scheduleUpdated)}</span>
        </div>
        <nav aria-label={text.stepsLabel} className="mb-8 grid grid-cols-2 border-b">
          {text.steps.map((label: string, i: number) => (
            <Button
              key={label}
              variant="ghost"
              disabled={submitting || review || (i === 1 && !validSelection)}
              onClick={() => {
                setStep(i);
                setReview(false);
              }}
              className={`h-auto justify-start gap-2 border-b-2 px-2 py-4 text-xs for-mobile:text-sm ${
                step === i
                  ? 'border-flame text-foreground'
                  : 'border-transparent text-muted-foreground'
              }`}
            >
              <span
                className={`flex size-6 shrink-0 items-center justify-center rounded-full ${
                  step === i ? 'bg-flame text-flame-foreground' : 'bg-secondary'
                }`}
              >
                {i < step ? <Check className="size-3" /> : i + 1}
              </span>
              {label}
            </Button>
          ))}
        </nav>
        <div key={`${step}-${review}`} className="lightbox-photo">
          {step === 0 && (
            <>
              <div className="mb-6">
                <h3 className="mb-3 text-base">{text.tariffTitle}</h3>
                <div className="grid gap-2 for-mobile:grid-cols-3" role="group" aria-label={text.tariffTitle}>
                  {config.tariffs.map((tariff) => (
                    <Button
                      key={tariff.id}
                      variant="outline"
                      disabled={loading}
                      aria-pressed={plan.id === tariff.id}
                      onClick={() => {
                        setTariffId(tariff.id);
                        setHours(1);
                        setHour(null);
                      }}
                      className={`h-auto flex-col items-start whitespace-normal p-4 text-left ${
                        plan.id === tariff.id ? '!border-flame !bg-flame !text-flame-foreground hover:!bg-flame/90' : 'hover:bg-secondary'
                      }`}
                    >
                      <strong className="text-sm">{tariff.name}</strong>
                      <span className={`text-xs ${plan.id === tariff.id ? 'text-flame-foreground/80' : 'text-muted-foreground'}`}>
                        {(tariff.price / 100).toLocaleString(text.locale)}{' '}
                        {tariff.billing_mode === 'hourly'
                          ? text.perHour
                          : `${text.currency} · ${tariff.duration_hours}${text.hoursUnit}`}
                      </span>
                    </Button>
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-xl">
                  <>{text.dateTitle}</>
                </h2>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={text.prevMonth}
                    disabled={
                      view <= new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1))
                    }
                    onClick={() =>
                      setView(new Date(Date.UTC(view.getUTCFullYear(), view.getUTCMonth() - 1, 1)))
                    }
                  >
                    <ChevronLeft />
                  </Button>
                  <span className="min-w-28 text-center text-sm capitalize">
                    {view.toLocaleDateString(text.locale, {
                      month: 'long',
                      year: 'numeric',
                      timeZone: 'UTC',
                    })}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={text.nextMonth}
                    disabled={
                      new Date(Date.UTC(view.getUTCFullYear(), view.getUTCMonth() + 1, 1)) >
                      lastDate
                    }
                    onClick={() =>
                      setView(new Date(Date.UTC(view.getUTCFullYear(), view.getUTCMonth() + 1, 1)))
                    }
                  >
                    <ChevronRight />
                  </Button>
                </div>
              </div>
              <div
                aria-busy={loading}
                className={`mt-5 grid grid-cols-7 gap-1 text-center site-booking-calendar-grid ${
                  loading ? 'is-updating' : ''
                }`}
              >
                {days.map((d) => (
                  <span key={d} className="py-2 text-xs text-muted-foreground">
                    {d}
                  </span>
                ))}
                {Array.from(
                  {
                    length: offset,
                  },
                  (_, i) => (
                    <span key={`empty-${i}`} />
                  )
                )}
                {Array.from(
                  {
                    length: count,
                  },
                  (_, i) => {
                    const d = new Date(Date.UTC(view.getUTCFullYear(), view.getUTCMonth(), i + 1));
                    const selected = d.getTime() === date?.getTime();
                    return (
                      <Button
                        key={i}
                        variant="ghost"
                        aria-label={fmt(d)}
                        aria-pressed={selected}
                        disabled={
                          loading ||
                          !availability?.days
                            .find((day) => day.date === dateKey(d))
                            ?.starts.some(
                              (start) =>
                                start.max_hours >= (plan.billing_mode === 'fixed' ? duration : (plan.minimum_hours ?? 1))
                            )
                        }
                        onClick={() => {
                          setDate(d);
                          setHour(null);
                        }}
                        className={`h-11 p-0 ${
                          selected
                            ? 'bg-flame text-flame-foreground hover:bg-flame/90 hover:text-flame-foreground'
                            : 'hover:bg-secondary hover:text-foreground'
                        }`}
                      >
                        {i + 1}
                      </Button>
                    );
                  }
                )}
                {Array.from({ length: 42 - offset - count }, (_, i) => (
                  <span key={`tail-${i}`} className="h-11" aria-hidden="true" />
                ))}
              </div>
              <h3 className="mt-7 flex items-center gap-2 text-base">
                <Clock3 className="size-4 text-flame" />
                <>{text.timeTitle}</>
                {date ? `· ${fmt(date)}` : ''}
              </h3>
              {date ? (
                <div
                  aria-busy={loading}
                  className={`mt-4 grid grid-cols-4 gap-2 for-mobile:grid-cols-5 site-booking-time-grid ${
                    loading ? 'is-updating' : ''
                  }`}
                >
                  {dayHours(selectedDay).map((h) => (
                    <Button
                      key={h}
                      variant="outline"
                      disabled={
                        loading ||
                        !availableStart(
                          selectedDay,
                          h,
                          plan.billing_mode === 'fixed' ? duration : (plan.minimum_hours ?? 1)
                        )
                      }
                      aria-pressed={hour === h}
                      onClick={() => {
                        setHour(h);
                        setHours(1);
                      }}
                      className={`h-10 px-1 ${
                        hour === h
                          ? 'border-flame bg-flame text-flame-foreground hover:bg-flame/90'
                          : 'hover:bg-secondary hover:text-foreground'
                      }`}
                    >
                      {String(h).padStart(2, '0')}
                      <>{text.timeSuffix}</>
                    </Button>
                  ))}
                </div>
              ) : (
                <p className="site-booking-time-placeholder mt-4 border border-dashed p-5 text-sm text-muted-foreground">
                  <>{text.pickDayFirst}</>
                </p>
              )}
              <div className="site-booking-duration-area">
                <h3 className="mt-6 text-base">{text.durationTitle}</h3>
                <div
                  className="mt-3 flex flex-wrap gap-2"
                  role="group"
                  aria-label={text.durationTitle}
                >
                  {hour === null ? (
                    <p className="text-sm text-muted-foreground">{text.pickStartFirst}</p>
                  ) : (
                    (plan.billing_mode === 'fixed'
                      ? [duration]
                      : Array.from(
                          {
                            length:
                              selectedDay?.starts.find(
                                (start) => start.time === String(hour).padStart(2, '0') + ':00'
                              )?.max_hours ?? 0,
                          },
                          (_, i) => i + 1
                        )
                    ).filter((value) => value >= (plan.minimum_hours ?? 1) || plan.billing_mode === 'fixed').map((value) => (
                      <Button
                        key={value}
                        variant="outline"
                        disabled={loading}
                        aria-pressed={duration === value}
                        onClick={() => setHours(value)}
                        className={`h-10 ${
                          duration === value
                            ? 'border-flame bg-flame text-flame-foreground hover:bg-flame/90'
                            : 'hover:bg-secondary'
                        }`}
                      >
                        {value}{text.hoursUnit}
                      </Button>
                    ))
                  )}
                </div>
              </div>
              <div className="mt-8 flex gap-3">
                <Button
                  disabled={!date || !validSelection}
                  className="h-12 flex-1 bg-flame text-flame-foreground hover:bg-flame/90"
                  onClick={() => setStep(1)}
                >
                  <>{text.nextContacts}</>
                  <ArrowRight />
                </Button>
              </div>
            </>
          )}
          {step === 1 &&
            (review ? (
              <div role="status" className="py-6">
                <span className="flex size-12 items-center justify-center bg-flame/10 text-flame">
                  <Check />
                </span>
                <h2 className="mt-6 text-2xl">
                  {bookingState?.status==='completed' ? text.titleCompleted : bookingState?.status==='no_show' ? text.titleNoShow : bookingState && bookingState.status!=='confirmed' ? text.titleCancelled : text.titleConfirmed} №{bookingId}
                </h2>
                <p className="mt-5 leading-relaxed">
                  {name}
                  <>{text.reviewAfterName}</>
                  {plan.name.toLowerCase()}
                  <>{text.reviewBeforeDate}</>
                  {bookingState ? bookingState.date_label : date && fmt(date)}, {bookingState?.time_label || time}.
                </p>
                <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                  {bookingState?.status==='completed' ? text.noteCompleted : bookingState?.status==='no_show' ? text.noteNoShow : bookingState && bookingState.status!=='confirmed' ? text.noteCancelled : text.noteConfirmed}
                </p>
                {bookingState?.telegram.linked && <p role="status" className="mt-6 text-sm text-flame">{text.telegramConnected}{bookingState.telegram.username ? ` · @${bookingState.telegram.username}` : bookingState.telegram.name ? ` · ${bookingState.telegram.name}` : ''}</p>}
                {telegramUrl && <div className="mt-6 space-y-3"><a className="btn-primary inline-flex bg-flame text-flame-foreground" href={telegramUrl} target="_blank" rel="noopener noreferrer">{bookingState?.telegram.linked ? text.openBot : text.connectTelegram}</a><p className="text-sm text-muted-foreground">{bookingState?.telegram.linked ? text.botHelp : text.botInstruction}</p></div>}

              </div>
            ) : (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!date || !validSelection || submitting) return;
                  const problems = validateContacts({ name, phone, email }, config.phone);
                  setFieldErrors(problems);
                  if (Object.keys(problems).length) return;
                  if (config.turnstile_site_key && !captchaToken) {
                    setSubmitError(text.error_challenge_failed);
                    return;
                  }
                  setSubmitting(true);setSubmitError('');
                  const key=requestId || crypto.randomUUID();setRequestId(key);
                  try {
                    const response=await fetch(endpoint+'/reservations',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({request_id:key,tariff:plan.id,date:dateKey(date),time:String(hour).padStart(2,'0')+':00',hours:duration,name,phone,email,website,turnstile:captchaToken}),signal:AbortSignal.timeout(20000)});
                    const data=await response.json();
                    if(!response.ok)throw new Error(text['error_'+data.code] || data.message || text.createFailed);
                    setBookingId(data.id);setTelegramUrl(data.telegram_url || '');setReview(true);
                  }catch(error){setSubmitError((error as Error).message);setCaptchaToken('');setCaptchaEpoch(value=>value+1);}
                  finally{setSubmitting(false);}
                }}
                className="space-y-5" aria-busy={submitting} noValidate
              >
                {submitError && <p role="alert" className="text-destructive">{submitError}</p>}
                <input type="text" name="website" value={website} onChange={(e)=>setWebsite(e.target.value)} tabIndex={-1} autoComplete="off" aria-hidden="true" style={{position:'absolute',left:'-999rem'}} />
                {config.turnstile_site_key && !preview && <Turnstile key={captchaEpoch} siteKey={config.turnstile_site_key} onToken={setCaptchaToken} />}
                <fieldset disabled={submitting} className="space-y-5">
                <h2 className="text-2xl">
                  <>{text.contactsTitle}</>
                </h2>
                <label className="block text-sm">
                  <>{text.nameLabel}</>
                  <Input
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      setFieldErrors(({ name: _, ...rest }) => rest);
                    }}
                    required
                    aria-invalid={Boolean(fieldErrors.name)}
                    autoComplete="name"
                    maxLength={80}
                    placeholder={text.namePlaceholder}
                    className="field mt-1"
                  />
                  {fieldErrors.name && <span role="alert" className="mt-1 block text-destructive">{text['error_'+fieldErrors.name]}</span>}
                </label>
                <label className="block text-sm">
                  <>{text.phoneLabel}</>
                  <Input
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value);
                      setFieldErrors(({ phone: _, ...rest }) => rest);
                    }}
                    required
                    aria-invalid={Boolean(fieldErrors.phone)}
                    type="tel"
                    autoComplete="tel"
                    maxLength={20}
                    placeholder={text.phonePlaceholder}
                    className="field mt-1"
                  />
                  {fieldErrors.phone && <span role="alert" className="mt-1 block text-destructive">{text['error_'+fieldErrors.phone]}</span>}
                </label>
                <label className="block text-sm">
                  <>{text.emailLabel}</>
                  <Input
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setFieldErrors(({ email: _, ...rest }) => rest);
                    }}
                    required
                    aria-invalid={Boolean(fieldErrors.email)}
                    type="email"
                    autoComplete="email"
                    maxLength={120}
                    placeholder={text.emailPlaceholder}
                    className="field mt-1"
                  />
                  {fieldErrors.email && <span role="alert" className="mt-1 block text-destructive">{text['error_'+fieldErrors.email]}</span>}
                </label>
                <div className="flex gap-3 pt-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-12"
                    onClick={() => setStep(0)}
                    aria-label={text.backToCalendar}
                  >
                    <ArrowLeft />
                  </Button>
                  <Button
                    type="submit"
                    className="h-12 flex-1 bg-flame text-flame-foreground hover:bg-flame/90"
                  >
                    {submitting ? text.submitting : text.submit}
                    <ArrowRight />
                  </Button>
                </div>
                </fieldset>
              </form>
            ))}
        </div>
      </div>
      <aside className="border-t pt-6 for-tablet:border-t-0 for-tablet:border-l for-tablet:pl-8 for-tablet:pt-0">
        {contentFields.formImage && (
          <img
            src={contentFields.formImage}
            alt={text.imageAlt}
            className="hidden aspect-[4/3] w-full object-cover for-tablet:block"
          />
        )}
        <p className="eyebrow mt-5">
          <>{text.summaryTitle}</>
        </p>
        <h3 className="mt-3 text-xl">{contentFields.name}</h3><p className="mt-2 text-sm text-muted-foreground">{plan.name}</p>
        <div className="mt-5 space-y-3 text-sm">
          <p className="flex items-center gap-2">
            <CalendarDays className="size-4 text-flame" />
            {date ? fmt(date) : text.pickDate}
          </p>
          <p className="flex items-center gap-2">
            <Clock3 className="size-4 text-flame" />
            {time} · {duration}
            <>{text.hoursUnit}</>
          </p>
        </div>
        <div className="mt-6 border-t pt-5">
          <p className="text-xs text-muted-foreground">
            <>{text.totalLabel}</>
          </p>
          <p
            className="mt-2 font-display text-3xl font-light"
            aria-label={text.totalLabel}
          >
            {total.toLocaleString(text.locale)}{' '}
            <span className="text-sm">
              <>{text.currency}</>
            </span>
          </p>
        </div>
        <p className="mt-5 text-xs leading-relaxed text-muted-foreground">
          {text.summaryNote}
        </p>
      </aside>
    </div>
  );
}
