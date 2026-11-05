export function BookingSkeleton({ failure = '' }: { failure?: string }) {
  return (
    <div className="site-booking-widget-skeleton" role={failure ? 'alert' : 'status'} aria-busy={!failure} aria-label={failure || 'Завантажуємо бронювання…'}>
      {failure && <p>{failure}</p>}
      <div className="grid gap-8 for-tablet:grid-cols-[minmax(0,1fr)_28rem]" aria-hidden="true">
        <div className="min-w-0">
          <div className="site-booking-skeleton-bar site-booking-skeleton-status" />
          <div className="site-booking-skeleton-tabs"><span /><span /></div>
          <div className="site-booking-skeleton-bar site-booking-skeleton-heading" />
          <div className="site-booking-skeleton-tariffs"><span /><span /><span /></div>
          <div className="site-booking-skeleton-bar site-booking-skeleton-heading" />
          <div className="site-booking-skeleton-grid">{Array.from({ length: 49 }, (_, i) => <span key={i} />)}</div>
          <div className="site-booking-skeleton-bar site-booking-skeleton-heading" />
          <div className="site-booking-skeleton-tariffs"><span /><span /><span /></div>
        </div>
        <aside className="site-booking-skeleton-summary">
          <div className="site-booking-skeleton-photo" />
          <div className="site-booking-skeleton-bar site-booking-skeleton-heading" />
          <div className="site-booking-skeleton-bar" /><div className="site-booking-skeleton-bar" />
          <div className="site-booking-skeleton-bar site-booking-skeleton-heading" />
        </aside>
      </div>
    </div>
  );
}
