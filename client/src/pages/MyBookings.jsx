import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { api } from '../lib/api.js';
import {
  BookingPageFrame,
  ErrorMessage,
  LoadingState,
  Panel,
  StatusBadge,
} from './BookingUI.jsx';
import {
  formatEventDate,
  formatMoney,
  primaryButtonClass,
} from './bookingUtils.js';

function MyBookings() {
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedPage = Number(searchParams.get('page') ?? '1');
  const page =
    Number.isSafeInteger(requestedPage) && requestedPage > 0
      ? requestedPage
      : 1;
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let active = true;
    api(`/bookings?page=${page}`)
      .then((response) => {
        if (active) setResult(response);
      })
      .catch((requestError) => {
        if (active) setError(requestError);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [page, retry]);

  const bookings = result?.data ?? [];
  const pagination = result?.pagination;
  const currentPage = pagination?.page ?? page;
  const hasPrevious = currentPage > 1;
  const hasNext =
    pagination && currentPage * pagination.limit < pagination.total;

  function changePage(nextPage) {
    setLoading(true);
    setError(null);
    setSearchParams(nextPage > 1 ? { page: String(nextPage) } : {});
  }

  function retryBookings() {
    setLoading(true);
    setError(null);
    setRetry((value) => value + 1);
  }

  return (
    <BookingPageFrame
      subtitle="Your bookings and tickets, all in one place."
      title="My bookings"
    >
      {loading ? (
        <Panel>
          <LoadingState label="Loading your bookings…" />
        </Panel>
      ) : error ? (
        <div className="space-y-4">
          <ErrorMessage error={error} />
          <button
            className={primaryButtonClass}
            onClick={retryBookings}
            type="button"
          >
            Try again
          </button>
        </div>
      ) : bookings.length === 0 ? (
        <Panel className="text-center">
          <h2 className="text-lg font-semibold">No bookings yet</h2>
          <p className="mt-2 text-sm text-gray-400">
            When you book an event, it will appear here.
          </p>
          <Link className={`${primaryButtonClass} mt-5`} to="/events">
            Browse events
          </Link>
        </Panel>
      ) : (
        <>
          <div className="space-y-4">
            {bookings.map((booking) => {
              const eventName =
                booking.eventSnapshot?.title ?? booking.event?.title ?? 'Event';
              const eventDate =
                booking.eventSnapshot?.startAt ?? booking.event?.startAt;

              return (
                <Panel
                  className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center"
                  key={booking.id}
                >
                  <div className="min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="text-lg font-semibold text-white">
                        {eventName}
                      </h2>
                      <StatusBadge status={booking.status} />
                    </div>
                    <p className="text-sm text-gray-400">
                      {formatEventDate(
                        eventDate,
                        booking.eventSnapshot?.timezone ??
                          booking.event?.timezone
                      )}
                    </p>
                    <p className="text-sm font-medium text-gray-200">
                      {formatMoney(booking.amountMinor, booking.currency)}
                    </p>
                  </div>
                  <Link
                    className={`${primaryButtonClass} shrink-0`}
                    to={`/bookings/${encodeURIComponent(booking.id)}`}
                  >
                    View booking
                  </Link>
                </Panel>
              );
            })}
          </div>
          {pagination && (
            <nav
              aria-label="Booking pages"
              className="mt-6 flex items-center justify-between gap-4"
            >
              <button
                className="rounded-lg border border-gray-700 px-4 py-2 text-sm text-gray-200 hover:border-purple-500 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={!hasPrevious}
                onClick={() => changePage(currentPage - 1)}
                type="button"
              >
                Previous
              </button>
              <p aria-live="polite" className="text-sm text-gray-400">
                Page {currentPage}
                {pagination.total != null
                  ? ` · ${pagination.total} bookings`
                  : ''}
              </p>
              <button
                className="rounded-lg border border-gray-700 px-4 py-2 text-sm text-gray-200 hover:border-purple-500 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={!hasNext}
                onClick={() => changePage(currentPage + 1)}
                type="button"
              >
                Next
              </button>
            </nav>
          )}
        </>
      )}
    </BookingPageFrame>
  );
}

export default MyBookings;
