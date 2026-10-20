import { Link } from 'react-router';
import { statusLabel } from './bookingUtils.js';

export function BookingPageFrame({ children, subtitle, title }) {
  return (
    <div className="min-h-screen bg-[#09090b] text-white">
      <header className="border-b border-gray-800 bg-black/80">
        <nav
          aria-label="Main navigation"
          className="mx-auto flex min-h-[68px] max-w-5xl items-center justify-between gap-4 px-4 sm:px-6"
        >
          <Link className="text-xl font-bold tracking-tight" to="/">
            Event<span className="text-purple-400">Hub</span>
          </Link>
          <div className="flex items-center gap-4 text-sm">
            <Link
              className="text-gray-300 transition-colors hover:text-white focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-purple-300"
              to="/events"
            >
              Browse events
            </Link>
            <Link
              className="text-purple-300 transition-colors hover:text-white focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-purple-300"
              to="/my-bookings"
            >
              My bookings
            </Link>
          </div>
        </nav>
      </header>
      <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
        <div className="mb-7">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-400 sm:text-base">
              {subtitle}
            </p>
          )}
        </div>
        {children}
      </main>
    </div>
  );
}

export function Panel({ children, className = '' }) {
  return (
    <section
      className={`rounded-2xl border border-gray-800 bg-gray-950/70 p-5 shadow-xl shadow-black/20 sm:p-6 ${className}`}
    >
      {children}
    </section>
  );
}

export function Alert({ children, tone = 'error' }) {
  const toneClass =
    tone === 'success'
      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
      : tone === 'info'
        ? 'border-purple-500/30 bg-purple-500/10 text-purple-100'
        : 'border-red-500/30 bg-red-500/10 text-red-200';

  return (
    <div
      className={`rounded-xl border px-4 py-3 text-sm leading-6 ${toneClass}`}
      role={tone === 'error' ? 'alert' : 'status'}
    >
      {children}
    </div>
  );
}

export function LoadingState({ label = 'Loading booking information…' }) {
  return (
    <p aria-live="polite" className="py-10 text-center text-sm text-gray-400">
      {label}
    </p>
  );
}

export function ErrorMessage({ error }) {
  if (error?.status === 401 || error?.code === 'UNAUTHENTICATED') {
    return (
      <Alert>
        Your session has expired or you are not signed in.{' '}
        <Link
          className="font-semibold underline underline-offset-4"
          to="/login"
        >
          Sign in
        </Link>{' '}
        to view your bookings.
      </Alert>
    );
  }

  if (error?.status === 404) {
    return <Alert>This booking could not be found.</Alert>;
  }

  return (
    <Alert>{error?.message ?? 'Something went wrong. Please try again.'}</Alert>
  );
}

export function StatusBadge({ status }) {
  const className =
    {
      PENDING_PAYMENT: 'border-amber-400/30 bg-amber-400/10 text-amber-200',
      CONFIRMED: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200',
      CANCELLED: 'border-gray-600 bg-gray-800 text-gray-300',
      EXPIRED: 'border-gray-600 bg-gray-800 text-gray-300',
      REFUND_REQUIRED: 'border-orange-400/30 bg-orange-400/10 text-orange-200',
      REFUNDED: 'border-blue-400/30 bg-blue-400/10 text-blue-200',
    }[status] ?? 'border-gray-700 bg-gray-900 text-gray-300';

  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${className}`}
    >
      {statusLabel(status)}
    </span>
  );
}
