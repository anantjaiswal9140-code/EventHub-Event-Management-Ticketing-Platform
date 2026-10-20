export const primaryButtonClass =
  'inline-flex min-h-11 items-center justify-center rounded-lg bg-purple-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-purple-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-300 disabled:cursor-not-allowed disabled:opacity-60';

export const secondaryButtonClass =
  'inline-flex min-h-11 items-center justify-center rounded-lg border border-gray-700 bg-gray-900 px-4 py-2.5 text-sm font-semibold text-gray-100 transition-colors hover:border-purple-500/60 hover:bg-gray-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-300 disabled:cursor-not-allowed disabled:opacity-60';

export function formatEventDate(value, timezone) {
  if (!value) return 'Date unavailable';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Date unavailable';

  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
      ...(timezone ? { timeZone: timezone } : {}),
    }).format(date);
  } catch {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(date);
  }
}

export function formatMoney(amountMinor, currency) {
  if (!Number.isFinite(amountMinor) || !currency) return 'Price unavailable';
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
    }).format(amountMinor / 100);
  } catch {
    return `${currency} ${(amountMinor / 100).toFixed(2)}`;
  }
}

export function getEventDetails(booking) {
  return {
    ...(booking?.eventSnapshot ?? {}),
    ...(booking?.event ?? {}),
    ...(booking?.eventSnapshot ?? {}),
  };
}

export function statusLabel(status) {
  return (
    {
      PENDING_PAYMENT: 'Payment pending',
      CONFIRMED: 'Confirmed',
      CANCELLED: 'Cancelled',
      EXPIRED: 'Expired',
      REFUND_REQUIRED: 'Review required',
      REFUNDED: 'Refunded',
    }[status] ?? 'Unknown status'
  );
}

export function paymentStateLabel(booking) {
  if (booking.amountMinor === 0) return 'Not required (free booking)';
  return (
    {
      PENDING_PAYMENT: 'Awaiting provider confirmation',
      CONFIRMED: 'Paid and verified',
      CANCELLED: 'Not available',
      EXPIRED: 'Expired',
      REFUND_REQUIRED: 'Review/refund required',
      REFUNDED: 'Refunded',
    }[booking.status] ?? 'Unavailable'
  );
}
