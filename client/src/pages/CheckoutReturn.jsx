import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { api } from '../lib/api.js';
import {
  Alert,
  BookingPageFrame,
  ErrorMessage,
  LoadingState,
  Panel,
} from './BookingUI.jsx';
import {
  formatMoney,
  getEventDetails,
  primaryButtonClass,
} from './bookingUtils.js';
import { StatusBadge } from './BookingUI.jsx';

function CheckoutReturn() {
  const [searchParams] = useSearchParams();
  const bookingId = searchParams.get('bookingId')?.trim() ?? '';
  const [booking, setBooking] = useState(null);
  const [payment, setPayment] = useState(null);
  const [loading, setLoading] = useState(Boolean(bookingId));
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const [needsCheckoutSession, setNeedsCheckoutSession] = useState(false);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    if (!bookingId) return undefined;
    let active = true;
    async function fetchAndReconcile() {
      try {
        const response = await api(
          `/bookings/${encodeURIComponent(bookingId)}`
        );
        if (!active) return;
        setBooking(response.data);

        if (response.data.amountMinor > 0) {
          try {
            const reconciliation = await api(
              `/bookings/${encodeURIComponent(bookingId)}/reconcile`,
              { method: 'POST' }
            );
            if (!active) return;
            setBooking(reconciliation.data.booking);
            setPayment(reconciliation.data.payment);
            setNeedsCheckoutSession(false);
          } catch (reconcileError) {
            if (!active) return;
            if (reconcileError.code === 'CHECKOUT_NOT_CREATED') {
              setNeedsCheckoutSession(true);
              setMessage(
                'No checkout session exists yet. Open booking details to resume checkout before payment can be verified.'
              );
            } else {
              setError(reconcileError);
            }
          }
        }
      } catch (requestError) {
        if (active) setError(requestError);
      } finally {
        if (active) setLoading(false);
      }
    }
    fetchAndReconcile();

    return () => {
      active = false;
    };
  }, [bookingId, retry]);

  function retryBooking() {
    setLoading(true);
    setError(null);
    setMessage(null);
    setNeedsCheckoutSession(false);
    setRetry((value) => value + 1);
  }

  async function refreshStatus() {
    if (refreshing || !bookingId) return;
    setRefreshing(true);
    setError(null);
    setMessage(null);
    setNeedsCheckoutSession(false);
    try {
      const response = await api(
        `/bookings/${encodeURIComponent(bookingId)}/reconcile`,
        { method: 'POST' }
      );
      setBooking(response.data.booking);
      setPayment(response.data.payment);
      setMessage('Status checked against the payment provider.');
    } catch (requestError) {
      if (requestError.code === 'CHECKOUT_NOT_CREATED') {
        setNeedsCheckoutSession(true);
        setMessage(
          'No checkout session exists yet. Open booking details to resume checkout before checking payment status.'
        );
      } else {
        setError(requestError);
      }
    } finally {
      setRefreshing(false);
    }
  }

  const event = getEventDetails(booking);
  const paymentVerified =
    booking?.amountMinor === 0
      ? booking.status === 'CONFIRMED'
      : booking?.status === 'CONFIRMED' && payment?.status === 'PAID';

  return (
    <BookingPageFrame
      subtitle="A return from checkout does not prove payment. Status is confirmed only by the server."
      title="Checkout status"
    >
      {!bookingId ? (
        <Panel>
          <Alert tone="info">
            No booking reference was provided. This test checkout provider does
            not define a return URL or query parameters. Open the relevant
            booking from your bookings list to check its status.
          </Alert>
          <Link className={`${primaryButtonClass} mt-5`} to="/my-bookings">
            Go to my bookings
          </Link>
        </Panel>
      ) : loading ? (
        <Panel>
          <LoadingState label="Loading booking status…" />
        </Panel>
      ) : error && !booking ? (
        <div className="space-y-4">
          <ErrorMessage error={error} />
          {error.status !== 401 && error.status !== 404 && (
            <button
              className={primaryButtonClass}
              onClick={retryBooking}
              type="button"
            >
              Try again
            </button>
          )}
        </div>
      ) : booking ? (
        <div className="space-y-5">
          {message && (
            <Alert tone={error || needsCheckoutSession ? 'info' : 'success'}>
              {message}
            </Alert>
          )}
          {error && <ErrorMessage error={error} />}
          <Panel>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold">
                  {event.title ?? 'Booking'}
                </h2>
                <p className="mt-1 break-all text-xs text-gray-500">
                  Booking {booking.id}
                </p>
              </div>
              {booking.status === 'CONFIRMED' &&
              booking.amountMinor > 0 &&
              !paymentVerified ? (
                <span className="inline-flex items-center rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-xs font-semibold text-amber-200">
                  Verification needed
                </span>
              ) : (
                <StatusBadge status={booking.status} />
              )}
            </div>
            <p className="mt-4 text-sm text-gray-300">
              Amount: {formatMoney(booking.amountMinor, booking.currency)}
            </p>
            {booking.status === 'PENDING_PAYMENT' && (
              <p className="mt-3 text-sm leading-6 text-amber-200">
                Payment is still pending. Refresh to ask the server to reconcile
                provider status.
              </p>
            )}
            {booking.status === 'EXPIRED' && (
              <p className="mt-3 text-sm leading-6 text-gray-300">
                This booking expired. No ticket is available.
              </p>
            )}
            {booking.status === 'REFUND_REQUIRED' && (
              <p className="mt-3 text-sm leading-6 text-orange-200">
                Payment requires review. No ticket has been issued.
              </p>
            )}
            {booking.status === 'CONFIRMED' && paymentVerified && (
              <p className="mt-3 text-sm leading-6 text-emerald-200">
                Reconciliation confirmed payment and the booking.
              </p>
            )}
            {booking.status === 'CONFIRMED' &&
              booking.amountMinor > 0 &&
              !paymentVerified && (
                <p className="mt-3 text-sm leading-6 text-amber-200">
                  The booking is confirmed, but payment has not yet been
                  verified by reconciliation.
                </p>
              )}
            {payment && (
              <p className="mt-3 text-xs text-gray-500">
                Provider payment state: {payment.status}
              </p>
            )}
          </Panel>
          <div className="flex flex-wrap gap-3">
            {booking.amountMinor > 0 && !paymentVerified && (
              <button
                className={primaryButtonClass}
                disabled={refreshing}
                onClick={refreshStatus}
                type="button"
              >
                {refreshing ? 'Checking…' : 'Refresh payment status'}
              </button>
            )}
            {booking.amountMinor > 0 && needsCheckoutSession && (
              <Link
                className="inline-flex min-h-11 items-center justify-center rounded-lg border border-gray-700 bg-gray-900 px-4 py-2.5 text-sm font-semibold text-gray-100 hover:border-purple-500/60"
                to={`/bookings/${encodeURIComponent(booking.id)}`}
              >
                Resume checkout
              </Link>
            )}
            {booking.status === 'CONFIRMED' && paymentVerified && (
              <Link
                className={primaryButtonClass}
                to={`/bookings/${encodeURIComponent(booking.id)}/ticket`}
              >
                View ticket
              </Link>
            )}
            <Link
              className="inline-flex min-h-11 items-center rounded-lg border border-gray-700 px-4 py-2.5 text-sm font-semibold text-gray-200 hover:border-purple-500/60"
              to={`/bookings/${encodeURIComponent(booking.id)}`}
            >
              Booking details
            </Link>
          </div>
        </div>
      ) : null}
    </BookingPageFrame>
  );
}

export default CheckoutReturn;
